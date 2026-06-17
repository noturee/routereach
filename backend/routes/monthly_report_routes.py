"""Monthly report routes — Phase 17."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

monthly_report_bp = Blueprint("monthly_reports", __name__)


@monthly_report_bp.route("", methods=["GET"])
@jwt_required()
def get_monthly_reports():
    return jsonify({"message": "Monthly report routes coming in Phase 17.", "reports": []}), 200


@monthly_report_bp.route("/<int:report_id>", methods=["GET"])
@jwt_required()
def get_monthly_report(report_id):
    return jsonify({"message": "Coming in Phase 17."}), 501


@monthly_report_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate():
    return jsonify({"message": "Coming in Phase 17."}), 501


@monthly_report_bp.route("/<int:report_id>", methods=["PUT"])
@jwt_required()
def update_monthly_report(report_id):
    return jsonify({"message": "Coming in Phase 17."}), 501


@monthly_report_bp.route("/<int:report_id>/export-pdf", methods=["GET"])
@jwt_required()
def export_pdf(report_id):
    return jsonify({"message": "Coming in Phase 17."}), 501


@monthly_report_bp.route("/<int:report_id>/export-excel", methods=["GET"])
@jwt_required()
def export_excel(report_id):
    return jsonify({"message": "Coming in Phase 17."}), 501
