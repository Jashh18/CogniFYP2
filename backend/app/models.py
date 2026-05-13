from datetime import datetime, timezone
from flask import current_app, g
import uuid

class PDFModel:
    """Helper for the 'pdfs' table in Supabase/PostgreSQL."""

    @staticmethod
    def create(student_id: str, filename: str, file_url: str, chunk_count: int) -> dict:
        """Create a new PDF record in Supabase."""
        data = {
            "studentid": student_id,
            "file_name": filename,
            "file_url": file_url,
            "chunk_count": chunk_count,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        response = current_app.supabase.table("pdfs").insert(data).execute()
        if not response.data:
            raise Exception(f"Failed to create PDF record: {response}")
        
        doc = response.data[0]
        return {
            "id": doc["pdfid"],
            "filename": doc["file_name"],
            "chunk_count": doc["chunk_count"],
            "uploaded_at": doc["uploaded_at"],
            "studentId": doc["studentid"]
        }

    @staticmethod
    def get_by_student(student_id: str) -> list:
        """List all PDFs for a student."""
        response = current_app.supabase.table("pdfs").select("*").eq("studentid", student_id).execute()
        docs = []
        for doc in response.data:
            docs.append({
                "id": doc["pdfid"],
                "filename": doc["file_name"],
                "chunk_count": doc["chunk_count"],
                "uploaded_at": doc["uploaded_at"],
                "studentId": doc["studentid"]
            })
        return docs

    @staticmethod
    def get_by_id(pdf_id: str) -> dict | None:
        """Get a specific PDF by ID."""
        response = current_app.supabase.table("pdfs").select("*").eq("pdfid", pdf_id).execute()
        if not response.data:
            return None
        
        doc = response.data[0]
        return {
            "id": doc["pdfid"],
            "filename": doc["file_name"],
            "chunk_count": doc["chunk_count"],
            "uploaded_at": doc["uploaded_at"],
            "studentId": doc["studentid"]
        }


    @staticmethod
    def cleanup_old_pdfs() -> int:
        """Delete PDFs older than 14 days and their Pinecone vectors. This cascades to ChatHistory."""
        from datetime import timedelta
        from app.services.vector_store import delete_vectors
        
        # Changed from 30 to 14 days
        retention_days = 14
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()
        
        # 1. Fetch old PDFs
        response = current_app.supabase.table("pdfs").select("pdfid, chunk_count").lt("uploaded_at", cutoff_date).execute()
        old_pdfs = response.data
        if not old_pdfs:
            return 0
            
        # 2. Delete vectors from Pinecone
        for doc in old_pdfs:
            try:
                delete_vectors(doc["pdfid"], doc.get("chunk_count", 0))
            except Exception as e:
                print(f"Failed to delete vectors for PDF {doc['pdfid']}: {e}")
                
        # 3. Delete from Supabase (cascades to chathistory)
        for doc in old_pdfs:
            current_app.supabase.table("pdfs").delete().eq("pdfid", doc["pdfid"]).execute()
            
        return len(old_pdfs)


class ChatHistoryModel:
    """Helper for the 'chathistory' table in Supabase."""

    @staticmethod
    def create(student_id: str, chat_content: list, pdf_id: str | None = None) -> dict:
        """Store a new chat session."""
        data = {
            "studentid": student_id,
            "pdfid": pdf_id,
            "chat_content": chat_content,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        response = current_app.supabase.table("chathistory").insert(data).execute()
        if not response.data:
            raise Exception(f"Failed to create chat record: {response}")
        
        chat = response.data[0]
        return {
            "id": chat["chatid"],
            "studentId": chat["studentid"],
            "pdfId": chat["pdfid"],
            "chat_content": chat["chat_content"],
            "created_at": chat["created_at"]
        }

    @staticmethod
    def get_by_id_and_student(chat_id: str, student_id: str) -> dict | None:
        """Get a specific chat session."""
        response = current_app.supabase.table("chathistory") \
            .select("*") \
            .eq("chatid", chat_id) \
            .eq("studentid", student_id) \
            .execute()
        
        if not response.data:
            return None
        return response.data[0]

    @staticmethod
    def update_session(chat_id: str, student_id: str, **kwargs) -> bool:
        """Update session fields (chat_content, summary, flashcards, etc.)."""
        # Ensure we only update valid fields
        allowed_fields = ["chat_content", "summary", "flashcards"]
        data = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not data:
            return False

        response = current_app.supabase.table("chathistory") \
            .update(data) \
            .eq("chatid", chat_id) \
            .eq("studentid", student_id) \
            .execute()
        
        return len(response.data) > 0

    @staticmethod
    def get_by_student(student_id: str) -> list:
        """Get all chat sessions for a student."""
        response = current_app.supabase.table("chathistory").select("*").eq("studentid", student_id).execute()
        return response.data

    @staticmethod
    def list_sessions_light(student_id: str) -> list:
        """List sessions with just IDs and timestamps."""
        response = current_app.supabase.table("chathistory") \
            .select("chatid, created_at, pdfid") \
            .eq("studentid", student_id) \
            .order("created_at", desc=True) \
            .execute()
        return response.data

    @staticmethod
    def get_messages_for_student(chat_id: str, student_id: str) -> list:
        """Get full content for a session."""
        response = current_app.supabase.table("chathistory") \
            .select("chat_content") \
            .eq("chatid", chat_id) \
            .eq("studentid", student_id) \
            .execute()
        
        if not response.data:
            return []
        return response.data[0].get("chat_content", [])

    @staticmethod
    def delete(chat_id: str, student_id: str) -> bool:
        """Delete a chat session."""
        response = current_app.supabase.table("chathistory") \
            .delete() \
            .eq("chatid", chat_id) \
            .eq("studentid", student_id) \
            .execute()
        return len(response.data) > 0


class SystemMetricsModel:
    """Helper for logging system performance and domain adherence."""

    @staticmethod
    def log_query(query: str, avg_score: float, was_answered: bool, faithfulness: float = 0.0, relevancy: float = 0.0) -> None:
        """Log a student query metric."""
        data = {
            "query": query[:255],
            "avg_score": avg_score,
            "was_answered": was_answered,
            "faithfulness": faithfulness,
            "relevancy": relevancy,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            current_app.supabase.table("query_metrics").insert(data).execute()
        except Exception as e:
            # Fallback to console if table doesn't exist yet
            print(f"[METRICS] Failed to log query (Make sure to add faithfulness and relevancy columns): {e}")

    @staticmethod
    def log_upload(filename: str, is_literature: bool, reason: str) -> None:
        """Log a document upload attempt."""
        data = {
            "filename": filename[:255],
            "is_literature": is_literature,
            "reason": reason,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            current_app.supabase.table("upload_logs").insert(data).execute()
        except Exception as e:
            print(f"[METRICS] Failed to log upload: {e}")

    @staticmethod
    def get_summary() -> dict:
        """Get aggregated metrics for the admin dashboard."""
        try:
            # Fetch recent queries for relevance and success rate
            queries_res = current_app.supabase.table("query_metrics") \
                .select("avg_score, was_answered") \
                .order("created_at", desc=True) \
                .limit(100) \
                .execute()
            queries = queries_res.data or []
            
            avg_relevance = (sum(q["avg_score"] for q in queries) / len(queries)) if queries else 0
            success_rate = (sum(1 for q in queries if q["was_answered"]) / len(queries) * 100) if queries else 0

            # Fetch recent uploads for scope adherence
            uploads_res = current_app.supabase.table("upload_logs") \
                .select("is_literature, filename, reason") \
                .order("created_at", desc=True) \
                .limit(100) \
                .execute()
            uploads = uploads_res.data or []
            
            acceptance_rate = (sum(1 for u in uploads if u["is_literature"]) / len(uploads) * 100) if uploads else 0
            
            # Group by reason for rejections
            rejection_stats = {}
            for u in uploads:
                if not u["is_literature"]:
                    reason = u["reason"][:50] + "..." if len(u["reason"]) > 50 else u["reason"]
                    rejection_stats[reason] = rejection_stats.get(reason, 0) + 1

            return {
                "fetching_accuracy": round(avg_relevance * 100, 1),
                "faithfulness": round((sum(q.get("faithfulness", 0) for q in queries) / len(queries)) * 100, 1) if queries else 0,
                "relevancy": round((sum(q.get("relevancy", 0) for q in queries) / len(queries)) * 100, 1) if queries else 0,
                "answering_reliability": round(success_rate, 1),
                "scope_adherence": round(acceptance_rate, 1),
                "rejection_summary": [{"reason": k, "count": v} for k, v in rejection_stats.items()][:5],
                "total_queries_logged": len(queries),
                "total_uploads_logged": len(uploads)
            }
        except Exception as e:
            print(f"[METRICS] Failed to fetch summary: {e}")
            return {
                "fetching_accuracy": 0,
                "answering_reliability": 0,
                "scope_adherence": 0,
                "rejection_summary": [],
                "error": str(e)
            }
