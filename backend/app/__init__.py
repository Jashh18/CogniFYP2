import os
import sys
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret")
    
    # Supabase Setup
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend operations
    if not supabase_url or not supabase_key:
        print("[ERROR] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment")
    
    app.supabase: Client = create_client(supabase_url, supabase_key) # type: ignore
    
    app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "uploads")
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB max

    CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

    # Ensure upload directory exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Register blueprints
    from app.routes.document_routes import document_bp
    from app.routes.ai_routes import ai_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.chat_routes import chat_bp
 
    app.register_blueprint(document_bp, url_prefix="/api/documents")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app
