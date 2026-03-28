import os
from functools import wraps
from flask import request, jsonify, g, current_app
from supabase import create_client, Client


def get_supabase_anon_client() -> Client:
    """Get a Supabase client with the anon key (for client-side auth ops)."""
    return create_client(
        os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_ANON_KEY", "")
    )


def login_required(f):
    """Decorator that validates the JWT from the Authorization header using Supabase."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Authentication required"}), 401

        try:
            # Verify the token with Supabase
            response = current_app.supabase.auth.get_user(token)
            if not response.user:
                return jsonify({"error": "Invalid or expired token"}), 401

            g.user = response.user
            g.token = token
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator that checks for admin role in the user metadata."""
    def decorator(f_inner):
        @wraps(f_inner)
        def decorated(*args, **kwargs):
            user = getattr(g, "user", None)
            if not user:
                 return jsonify({"error": "Authentication required"}), 401
            
            # Metadata is stored in user_metadata in Supabase
            metadata = user.user_metadata or {}
            if metadata.get("role") != "admin":
                 return jsonify({"error": "Admin access required"}), 403
            
            return f_inner(*args, **kwargs)
        return login_required(decorated)
    return decorator(f)
