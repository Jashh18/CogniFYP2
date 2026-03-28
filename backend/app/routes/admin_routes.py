from flask import Blueprint, jsonify, current_app
from app.auth import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/metrics", methods=["GET"])
@admin_required
def get_metrics():
    """
    Get live system-wide metrics from Supabase tables.
    """
    try:
        response = current_app.supabase.table("systemanalytics").select("*").eq("id", 1).single().execute()
        if not response.data:
            return jsonify({"metrics": {
                "total_users": 0,
                "total_students": 0,
                "total_admins": 0,
                "total_pdfs_uploaded": 0,
            }}), 200

        metrics = response.data
        # Ensure keys match what frontend expects
        formatted_metrics = {
            "total_users": metrics.get("total_users", 0),
            "total_students": metrics.get("total_students", 0),
            "total_admins": metrics.get("total_admins", 0),
            "total_pdfs_uploaded": metrics.get("total_pdfs_uploaded", 0),
        }

        return jsonify({"metrics": formatted_metrics}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch metrics: {str(e)}"}), 500
