from flask import Blueprint, request, jsonify, g
from app.auth import get_supabase_anon_client, login_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new student account."""
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password, and full name are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        supabase = get_supabase_anon_client()
        result = supabase.auth.sign_up(
            {
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": full_name,
                        "role": "student",
                    }
                },
            }
        )

        if result.user:
            return jsonify(
                {
                    "message": "Account created successfully",
                    "user": {
                        "id": result.user.id,
                        "email": result.user.email,
                        "full_name": full_name,
                    },
                }
            ), 201
        else:
            return jsonify({"error": "Signup failed"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login with email and password."""
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        supabase = get_supabase_anon_client()
        result = supabase.auth.sign_in_with_password(
            {"email": email, "password": password}
        )

        if result.user and result.session:
            metadata = result.user.user_metadata or {}
            return jsonify(
                {
                    "token": result.session.access_token,
                    "refresh_token": result.session.refresh_token,
                    "user": {
                        "id": result.user.id,
                        "email": result.user.email,
                        "full_name": metadata.get("full_name", ""),
                        "role": metadata.get("role", "student"),
                    },
                }
            ), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """Logout the current user."""
    try:
        supabase = get_supabase_anon_client()
        supabase.auth.sign_out()
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception:
        return jsonify({"message": "Logged out"}), 200


@auth_bp.route("/profile", methods=["GET"])
@login_required
def profile():
    """Get the current user's profile."""
    user = g.user
    metadata = user.user_metadata or {}
    return jsonify(
        {
            "id": user.id,
            "email": user.email,
            "full_name": metadata.get("full_name", ""),
            "role": metadata.get("role", "student"),
        }
    ), 200
