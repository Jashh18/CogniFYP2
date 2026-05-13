from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from app.auth import login_required
from app.models import PDFModel
from app.services.embedding_service import embed_query
from app.services.vector_store import query_vectors, get_evenly_spaced_chunks
from app.services.llm_service import (
    generate_summary,
    generate_answer,
    generate_flashcards,
    classify_question,
    evaluate_response,
)

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/summary", methods=["POST"])
@login_required
def get_summary():
    """Generate or retrieve a summary for a document."""
    data = request.get_json()
    pdf_id = data.get("document_id", "")
    session_id = data.get("session_id")

    if not pdf_id:
        return jsonify({"error": "document_id is required"}), 400

    # Verify document belongs to student
    doc = PDFModel.get_by_id(pdf_id)
    if not doc or doc["studentId"] != g.user.id:
        return jsonify({"error": "Document not found"}), 404

    # Check for existing summary if session_id is provided
    if session_id:
        from app.models import ChatHistoryModel
        session = ChatHistoryModel.get_by_id_and_student(session_id, g.user.id)
        if session and session.get("summary"):
            return jsonify({"summary": session["summary"]}), 200

    try:
        # Use evenly spaced sampling for summaries to capture the full narrative arc
        chunk_count = doc.get("chunk_count", 0)
        chunks = get_evenly_spaced_chunks(pdf_id, chunk_count, num_samples=8)

        if not chunks:
            return jsonify({"error": "No content found for this document"}), 404

        summary = generate_summary(chunks, temperature=0.3)
        
        # Save summary to session if session_id is provided
        if session_id:
            from app.models import ChatHistoryModel
            ChatHistoryModel.update_session(session_id, g.user.id, summary=summary)

        return jsonify({"summary": summary}), 200

    except Exception as e:
        return jsonify({"error": f"Summary generation failed: {str(e)}"}), 500


@ai_bp.route("/query", methods=["POST"])
@login_required
def ask_question():
    """Answer a question about a document and save to chat history."""
    data = request.get_json() or {}
    pdf_id = data.get("document_id", "")
    query = data.get("query", "").strip()
    session_id = data.get("session_id")

    if not pdf_id or not query:
        return jsonify({"error": "document_id and query are required"}), 400

    # Verify document belongs to student
    doc = PDFModel.get_by_id(pdf_id)
    if not doc or doc.get("studentId") != g.user.id:
        return jsonify({"error": "Document not found"}), 404

    try:
        # Retrieve session to get current history
        from app.models import ChatHistoryModel, SystemMetricsModel
        session = None
        current_history = []
        if session_id:
            session = ChatHistoryModel.get_by_id_and_student(session_id, g.user.id)
            if session:
                current_history = session.get("chat_content", [])

        # Classify and generate answer
        query_type = classify_question(query)
        query_emb = embed_query(query)
        chunks = query_vectors(query_emb, pdf_id, top_k=5, min_score=0.2)

        avg_score = 0
        faithfulness = 0
        relevancy = 0
        was_answered = False

        if not chunks:
            answer = "I'm sorry, I couldn't find any information in the document that directly answers your question. Could you try rephrasing or asking something else?"
        else:
            answer = generate_answer(query, chunks, query_type, temperature=0.4)
            avg_score = sum(c.get("score", 0) for c in chunks) / len(chunks)
            was_answered = True
            
            # Evaluate the response for faithfulness and relevancy
            eval_results = evaluate_response(query, answer, chunks)
            faithfulness = eval_results.get("faithfulness", 0)
            relevancy = eval_results.get("relevancy", 0)

        # Log metrics for admin analysis
        SystemMetricsModel.log_query(query, avg_score, was_answered, faithfulness, relevancy)

        # Update chat history
        new_history = current_history + [
            {"role": "user", "content": query, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"role": "assistant", "content": answer, "timestamp": datetime.now(timezone.utc).isoformat(), "query_type": query_type}
        ]

        if session_id:
            ChatHistoryModel.update_session(session_id, g.user.id, chat_content=new_history)

        return jsonify(
            {
                "answer": answer,
                "query_type": query_type,
                "session_id": session_id,
                "chunks_used": len(chunks),
            }
        ), 200

    except Exception as e:
        print(f"[AI] Query failed: {str(e)}")
        return jsonify({"error": f"Query failed: {str(e)}"}), 500


@ai_bp.route("/flashcards", methods=["POST"])
@login_required
def get_flashcards():
    """Generate or retrieve flashcards for a document."""
    data = request.get_json()
    pdf_id = data.get("document_id", "")
    session_id = data.get("session_id")

    if not pdf_id:
        return jsonify({"error": "document_id is required"}), 400

    # Verify document belongs to student
    doc = PDFModel.get_by_id(pdf_id)
    if not doc or doc["studentId"] != g.user.id:
        return jsonify({"error": "Document not found"}), 404

    # Check for existing flashcards if session_id is provided
    if session_id:
        from app.models import ChatHistoryModel
        session = ChatHistoryModel.get_by_id_and_student(session_id, g.user.id)
        if session and session.get("flashcards"):
            return jsonify({"flashcards": session["flashcards"], "count": len(session["flashcards"])}), 200

    try:
        # Use narrative-arc sampling (like summary) but with more samples (15) to cover more concepts
        chunk_count = doc.get("chunk_count", 0)
        chunks = get_evenly_spaced_chunks(pdf_id, chunk_count, num_samples=15)

        if not chunks:
            return jsonify({"error": "No content found for this document"}), 404

        flashcards = generate_flashcards(chunks)

        # Save flashcards to session if session_id is provided
        if session_id:
            from app.models import ChatHistoryModel
            ChatHistoryModel.update_session(session_id, g.user.id, flashcards=flashcards)

        return jsonify(
            {
                "flashcards": flashcards,
                "count": len(flashcards),
            }
        ), 200

    except Exception as e:
        return jsonify({"error": f"Flashcard generation failed: {str(e)}"}), 500
