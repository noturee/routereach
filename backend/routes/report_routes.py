"""Report routes — Phase 16."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

report_bp = Blueprint("reports", __name__)


@report_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    return jsonify({"message": "Report routes coming in Phase 16."}), 200


@report_bp.route("/applicants-by-county", methods=["GET"])
@jwt_required()
def by_county():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/applicants-by-status", methods=["GET"])
@jwt_required()
def by_status():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/missing-documents", methods=["GET"])
@jwt_required()
def missing_docs():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/withdrawals", methods=["GET"])
@jwt_required()
def withdrawals():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/no-response", methods=["GET"])
@jwt_required()
def no_response():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/outreach-by-oa", methods=["GET"])
@jwt_required()
def outreach_by_oa():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/marketing-activity", methods=["GET"])
@jwt_required()
def marketing():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/messages-sent", methods=["GET"])
@jwt_required()
def messages_sent():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/meetings-scheduled", methods=["GET"])
@jwt_required()
def meetings():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/routes-completed", methods=["GET"])
@jwt_required()
def routes_completed():
    return jsonify({"message": "Coming in Phase 16.", "data": []}), 200


@report_bp.route("/export/excel", methods=["GET"])
@jwt_required()
def export_excel():
    return jsonify({"message": "Coming in Phase 16."}), 501


@report_bp.route("/export/pdf", methods=["GET"])
@jwt_required()
def export_pdf():
    return jsonify({"message": "Coming in Phase 16."}), 501


@report_bp.route("/export/csv", methods=["GET"])
@jwt_required()
def export_csv():
    return jsonify({"message": "Coming in Phase 16."}), 501
