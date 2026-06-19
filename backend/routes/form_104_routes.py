"""Routes for Form 1-04 generation and persistence."""

from io import BytesIO
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from extensions import db
from models.applicant import Applicant
from models.applicant_report import ApplicantReport
from models.user import User
from services.form_104_generator import generate_form_104_content
from utils.permissions import can_view_applicant, can_edit_applicant


form_104_bp = Blueprint("form_104", __name__)


def _current_user():
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def _created_by_from_request(current_user):
    payload = request.get_json(silent=True) or {}
    created_by = (payload.get("created_by") or "").strip()
    if created_by:
        return created_by
    if current_user:
        return f"{current_user.first_name} {current_user.last_name}".strip()
    return None


@form_104_bp.route("/reports/form-104/<int:applicant_id>/generate", methods=["POST"])
@jwt_required()
def generate_form_104(applicant_id):
    applicant = Applicant.query.get(applicant_id)
    current_user = _current_user()
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    content = generate_form_104_content(applicant)
    report = ApplicantReport(
        applicant_id=applicant.id,
        report_type="FORM_1_04",
        title="FORM 1-04 - INFORMATION FOR CAREER DEVELOPMENT PLANNING",
        content_json=content,
        created_by=_created_by_from_request(current_user),
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({
        "message": "Form 1-04 generated.",
        "report_id": report.id,
        "content": report.content_json,
    }), 201


@form_104_bp.route("/reports/form-104/<int:report_id>", methods=["GET"])
@jwt_required()
def get_form_104(report_id):
    report = ApplicantReport.query.get(report_id)
    current_user = _current_user()
    if not report or report.report_type != "FORM_1_04":
        return jsonify({"error": "Form 1-04 report not found."}), 404

    applicant = Applicant.query.get(report.applicant_id)
    if not applicant or not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    return jsonify({
        "report_id": report.id,
        "applicant_id": report.applicant_id,
        "title": report.title,
        "content": report.content_json,
        "created_by": report.created_by,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }), 200


@form_104_bp.route("/reports/form-104/<int:report_id>", methods=["PUT"])
@jwt_required()
def update_form_104(report_id):
    report = ApplicantReport.query.get(report_id)
    current_user = _current_user()
    if not report or report.report_type != "FORM_1_04":
        return jsonify({"error": "Form 1-04 report not found."}), 404

    applicant = Applicant.query.get(report.applicant_id)
    if not applicant or not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    payload = request.get_json() or {}
    content = payload.get("content")
    if not isinstance(content, dict):
        return jsonify({"error": "content object is required."}), 400

    report.content_json = content
    db.session.commit()

    return jsonify({
        "message": "Form 1-04 updated.",
        "report_id": report.id,
        "content": report.content_json,
    }), 200


@form_104_bp.route("/reports/form-104/<int:report_id>/pdf", methods=["GET"])
@jwt_required()
def form_104_pdf(report_id):
    report = ApplicantReport.query.get(report_id)
    current_user = _current_user()
    if not report or report.report_type != "FORM_1_04":
        return jsonify({"error": "Form 1-04 report not found."}), 404

    applicant = Applicant.query.get(report.applicant_id)
    if not applicant or not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    content = report.content_json or {}
    header = content.get("header") or {}
    sections = content.get("sections") or {}

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 40

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, content.get("title") or "FORM 1-04")
    y -= 24

    pdf.setFont("Helvetica", 10)
    for key, value in header.items():
        pdf.drawString(40, y, f"{key}: {value}")
        y -= 14
        if y < 70:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = height - 40

    y -= 8
    for section_key, section_val in sections.items():
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y, section_key)
        y -= 14
        pdf.setFont("Helvetica", 10)

        if isinstance(section_val, dict):
            for sub_key, sub_val in section_val.items():
                pdf.drawString(50, y, f"{sub_key}: {sub_val}")
                y -= 14
                if y < 70:
                    pdf.showPage()
                    pdf.setFont("Helvetica", 10)
                    y = height - 40
        else:
            for line in str(section_val).split("\n"):
                pdf.drawString(50, y, line[:110])
                y -= 14
                if y < 70:
                    pdf.showPage()
                    pdf.setFont("Helvetica", 10)
                    y = height - 40
        y -= 6

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"form_104_report_{report_id}.pdf",
    )
