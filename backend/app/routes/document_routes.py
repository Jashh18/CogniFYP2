import os
import uuid
from flask import Blueprint, request, jsonify, g, current_app
from app.auth import login_required
from app.models import PDFModel
from app.services.pdf_service import extract_text_with_pages, chunk_text_with_pages
from app.services.embedding_service import embed_chunks
from app.services.vector_store import upsert_vectors

document_bp = Blueprint("documents", __name__)

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@document_bp.route("/upload", methods=["POST"])
@login_required
def upload_document():
    """Upload a PDF, extract text, chunk, embed, and store in Pinecone."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are allowed"}), 400

    try:
        # Save the file temporarily
        unique_name = f"{uuid.uuid4()}_{file.filename}"
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        filepath = os.path.join(upload_folder, unique_name)
        file.save(filepath)

        # Extract text with page tracking
        pages = extract_text_with_pages(filepath)
        if not pages:
            os.remove(filepath)
            return jsonify({"error": "Could not extract text from PDF"}), 400

        # Chunk with page-awareness (512-token windows, 128-token overlap)
        chunks = chunk_text_with_pages(pages)

        # Generate embeddings from chunk text only
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embed_chunks(chunk_texts)

        # Store document metadata in Supabase (PDFs table)
        file_url = f"local://{unique_name}"

        doc = PDFModel.create(
            student_id=g.user.id,
            filename=file.filename,
            file_url=file_url,
            chunk_count=len(chunks),
        )

        # Store vectors in Pinecone with page-aware metadata
        upsert_vectors(doc["id"], chunks, embeddings)

        # Clean up the temp file
        os.remove(filepath)

        return jsonify(
            {
                "message": "Document uploaded and processed successfully",
                "document": doc,
            }
        ), 201

    except Exception as e:
        # Clean up on error
        if "filepath" in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@document_bp.route("/", methods=["GET"])
@login_required
def list_documents():
    """List all documents uploaded by the current user (Student)."""
    docs = PDFModel.get_by_student(g.user.id)
    return jsonify({"documents": docs}), 200
