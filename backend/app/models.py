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

    @staticmethod
    def cleanup_old_chats() -> int:
        # Implementation depends on how "old" is defined
        return 0
