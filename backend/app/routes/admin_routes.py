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
        from app.models import SystemMetricsModel
        
        # Base counts from systemanalytics view/table
        response = current_app.supabase.table("systemanalytics").select("*").eq("id", 1).single().execute()
        base_metrics = response.data or {}
        
        # Detailed performance metrics
        performance_metrics = SystemMetricsModel.get_summary()

        formatted_metrics = {
            "total_users": base_metrics.get("total_users", 0),
            "total_students": base_metrics.get("total_students", 0),
            "total_admins": base_metrics.get("total_admins", 0),
            "total_pdfs_uploaded": base_metrics.get("total_pdfs_uploaded", 0),
            # Add new analytics
            "fetching_accuracy": performance_metrics.get("fetching_accuracy", 0),
            "answering_reliability": performance_metrics.get("answering_reliability", 0),
            "scope_adherence": performance_metrics.get("scope_adherence", 0),
            "rejection_summary": performance_metrics.get("rejection_summary", []),
            "total_queries_logged": performance_metrics.get("total_queries_logged", 0),
            "total_uploads_logged": performance_metrics.get("total_uploads_logged", 0),
        }

        return jsonify({"metrics": formatted_metrics}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch metrics: {str(e)}"}), 500
