from flask import Blueprint, request, jsonify, g
from app.auth import login_required
from app.models import ChatHistoryModel

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/sessions", methods=["GET"])
@login_required
def list_sessions():
    """List all chat history for the current user (Student)."""
    # IMPORTANT: keep this "light" to avoid sending huge chat_content blobs
    chats = ChatHistoryModel.list_sessions_light(g.user.id)
    return jsonify({"sessions": chats}), 200


@chat_bp.route("/sessions", methods=["POST"])
@login_required
def create_session():
    """Create a new chat history record."""
    data = request.get_json()
    pdf_id = data.get("document_id", "") # keep document_id for frontend compatibility
    
    chat = ChatHistoryModel.create(
        student_id=g.user.id,
        pdf_id=pdf_id if pdf_id else None,
        chat_content=[] # Start with empty content
    )
    return jsonify({"session": chat}), 201


@chat_bp.route("/sessions/<chat_id>/messages", methods=["GET"])
@login_required
def get_messages(chat_id: str):
    """Get content for a chat history record."""
    messages = ChatHistoryModel.get_messages_for_student(chat_id, g.user.id)
    if not messages:
        # could be empty chat or not found; distinguish via quick existence check
        # but keep it simple and secure
        return jsonify({"messages": []}), 200

    return jsonify({"messages": messages}), 200


@chat_bp.route("/sessions/<chat_id>", methods=["DELETE"])
@login_required
def delete_session(chat_id: str):
    """Deletion of chat history is disabled; chats expire automatically."""
    return jsonify({"error": "Chat deletion is disabled. Chats are auto-removed after 30 days."}), 403
