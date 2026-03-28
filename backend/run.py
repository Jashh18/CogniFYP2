import sys
import os

from app import create_app

app = create_app()

# Cleanup old sessions on startup
with app.app_context():
    from app.models import ChatHistoryModel
    try:
        deleted_count = ChatHistoryModel.cleanup_old_chats()
        print(f"Cleanup: Deleted {deleted_count} old chats.")
    except Exception as e:
        print(f"Cleanup failed: {e}")

if __name__ == "__main__":
    print("-" * 50)
    print(f"Python version: {sys.version.split()[0]}")
    try:
        import flask
        print(f"Flask version: {flask.__version__}")
    except ImportError:
        print("Flask NOT FOUND")
        
    try:
        import pinecone
        print("Pinecone installed")
    except ImportError:
        print("Pinecone NOT FOUND")

    try:
        import groq
        print("Groq installed")
    except ImportError:
        print("Groq NOT FOUND")
        
    print("-" * 50)
    
    # IMPORTANT:
    # Flask's debug auto-reloader watches the filesystem. During uploads we write PDFs into
    # the project folder, which can trigger a reload mid-request and cause the frontend
    # to "hang" even though processing already happened.
    app.run(debug=True, port=5000, use_reloader=False)
