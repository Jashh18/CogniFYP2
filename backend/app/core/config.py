import os


class Config:
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Pinecone
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "cogni-embeddings")

    # Groq
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

    # Gemini
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

    # Flask
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"


settings = Config()
