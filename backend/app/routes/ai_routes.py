from flask import Blueprint, request, jsonify, g
from app.auth import login_required
from app.models import PDFModel
from app.services.embedding_service import embed_query
from app.services.vector_store import query_vectors
from app.services.llm_service import (
    generate_summary,
    generate_answer,
    generate_flashcards,
    classify_question,
)

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/summary", methods=["POST"])
@login_required
def get_summary():
    """Generate a summary for a document using RAG (no chat history side effects)."""
    data = request.get_json()
    pdf_id = data.get("document_id", "")

    if not pdf_id:
        return jsonify({"error": "document_id is required"}), 400

    # Verify document belongs to student
    doc = PDFModel.get_by_id(pdf_id)
    if not doc or doc["studentId"] != g.user.id:
        return jsonify({"error": "Document not found"}), 404

    try:
        # Use a general query to retrieve the most representative chunks
        query_emb = embed_query(
            "Summarize the main themes, arguments, and key points of this text"
        )
        chunks = query_vectors(query_emb, pdf_id, top_k=8)

        if not chunks:
            return jsonify({"error": "No content found for this document"}), 404

        summary = generate_summary(chunks, temperature=0.3)
        # Return summary only; chat sessions are created from /ai/query
        return jsonify({"summary": summary}), 200

    except Exception as e:
        return jsonify({"error": f"Summary generation failed: {str(e)}"}), 500


@ai_bp.route("/query", methods=["POST"])
@login_required
def ask_question():
    """Answer a question about a document using RAG."""
    data = request.get_json() or {}
    pdf_id = data.get("document_id", "")
    query = data.get("query", "").strip()
    chat_id = data.get("session_id") # frontend calls it session_id

    if not pdf_id or not query:
        return jsonify({"error": "document_id and query are required"}), 400

    # Verify document belongs to student
    doc = PDFModel.get_by_id(pdf_id)
    if not doc or doc.get("studentId") != g.user.id:
        print(f"[AI] Document {pdf_id} not found or access denied for user {g.user.id}")
        return jsonify({"error": "Document not found"}), 404

    try:
        # Classify the question type
        query_type = classify_question(query)

        # Retrieve relevant chunks
        query_emb = embed_query(query)
        chunks = query_vectors(query_emb, pdf_id, top_k=5)

        if not chunks:
            print(f"[AI] No relevant chunks found for query: '{query}' in document {pdf_id}")
            # Instead of 404, return a 200 with a friendly message so the UI stays interactive
            return jsonify({
                "answer": "I'm sorry, I couldn't find any information in the document that directly answers your question. Could you try rephrasing or asking something else?",
                "query_type": query_type,
                "session_id": chat_id,
                "chunks_used": 0
            }), 200

        answer = generate_answer(query, chunks, query_type, temperature=0.4)

        # Get existing history or create new (MOCKED)
        chat_id = chat_id or "mock-session-123"

        return jsonify(
            {
                "answer": answer,
                "query_type": query_type,
                "session_id": chat_id,
                "chunks_used": len(chunks),
            }
        ), 200

    except Exception as e:
        print(f"[AI] Query failed for document {pdf_id}: {str(e)}")
        return jsonify({"error": f"Query failed: {str(e)}"}), 500


@ai_bp.route("/flashcards", methods=["POST"])
@login_required
def get_flashcards():
    """Generate flashcards from a document."""
    data = request.get_json()
    pdf_id = data.get("document_id", "")

    if not pdf_id:
        return jsonify({"error": "document_id is required"}), 400

    # Verify document belongs to student
    doc = PDFModel.get_by_id(pdf_id)
    if not doc or doc["studentId"] != g.user.id:
        return jsonify({"error": "Document not found"}), 404

    try:
        # Retrieve key concept chunks
        query_emb = embed_query(
            "Key concepts, definitions, literary terms, themes, characters, and important quotes"
        )
        chunks = query_vectors(query_emb, pdf_id, top_k=10)

        if not chunks:
            return jsonify({"error": "No content found for this document"}), 404

        flashcards = generate_flashcards(chunks)

        return jsonify(
            {
                "flashcards": flashcards,
                "count": len(flashcards),
            }
        ), 200

    except Exception as e:
        return jsonify({"error": f"Flashcard generation failed: {str(e)}"}), 500
