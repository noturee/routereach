"""
OutreachRoute Pro — Messaging Routes

Full CRUD for messages and message templates.
Email/SMS delivery: logs the attempt; actual sending requires
SENDGRID_API_KEY or TWILIO credentials in AWS Secrets Manager.
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.message import Message
from models.message_template import MessageTemplate
from models.applicant import Applicant
from services.email_service import send_email as _send_email
from services.sms_service import send_sms as _send_sms

messaging_bp = Blueprint("messaging", __name__)


# ── Messages ──────────────────────────────────────────────────────────────────

@messaging_bp.route("/messages", methods=["GET"])
@jwt_required()
def get_messages():
    """List all messages, optionally filtered by applicant_id or delivery_status."""
    q = Message.query
    applicant_id = request.args.get("applicant_id", type=int)
    if applicant_id:
        q = q.filter_by(applicant_id=applicant_id)
    status = request.args.get("status")
    if status:
        q = q.filter(Message.delivery_status == status)
    messages = q.order_by(Message.created_at.desc()).all()
    return jsonify({"messages": [m.to_dict() for m in messages], "total": len(messages)}), 200


@messaging_bp.route("/messages/applicant/<int:applicant_id>", methods=["GET"])
@jwt_required()
def get_applicant_messages(applicant_id):
    Applicant.query.get_or_404(applicant_id)
    messages = (
        Message.query
        .filter_by(applicant_id=applicant_id)
        .order_by(Message.created_at.desc())
        .all()
    )
    return jsonify({"messages": [m.to_dict() for m in messages], "total": len(messages)}), 200


def _create_and_send(data, method: str):
    """Shared helper — record message in DB, attempt delivery."""
    user_id = int(get_jwt_identity())

    applicant_id = data.get("applicant_id")
    message_body = data.get("message_body") or data.get("body", "")
    subject = data.get("subject", "Message from OutreachRoute Pro")

    if not applicant_id or not message_body:
        return jsonify({"error": "applicant_id and message_body are required."}), 400

    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404

    msg = Message(
        applicant_id=applicant_id,
        sender_user_id=user_id,
        message_type=method,
        subject=subject if method in ("email", "both") else None,
        message_body=message_body,
        delivery_method=method,
        delivery_status="pending",
    )
    db.session.add(msg)
    db.session.flush()

    results = {}
    if method in ("email", "both") and applicant.email:
        result = _send_email(applicant.email, subject, message_body)
        results["email"] = result
        if not result.get("success"):
            msg.delivery_status = "failed"
        else:
            msg.delivery_status = "sent"
            msg.sent_at = datetime.now(timezone.utc)

    if method in ("text", "both") and applicant.phone:
        result = _send_sms(applicant.phone, message_body)
        results["sms"] = result
        if method == "both":
            pass  # status set by email result above
        else:
            msg.delivery_status = "sent" if result.get("success") else "failed"
            if result.get("success"):
                msg.sent_at = datetime.now(timezone.utc)

    if method in ("email", "both") and not applicant.email:
        results["email"] = {"success": False, "error": "Applicant has no email address."}
    if method in ("text", "both") and not applicant.phone:
        results["sms"] = {"success": False, "error": "Applicant has no phone number."}

    # If no delivery was attempted, mark as failed
    if msg.delivery_status == "pending":
        msg.delivery_status = "failed"

    db.session.commit()
    return jsonify({"message": "Message recorded.", "record": msg.to_dict(), "delivery": results}), 201


@messaging_bp.route("/messages/send-email", methods=["POST"])
@jwt_required()
def send_email_route():
    return _create_and_send(request.get_json() or {}, "email")


@messaging_bp.route("/messages/send-text", methods=["POST"])
@jwt_required()
def send_text_route():
    return _create_and_send(request.get_json() or {}, "text")


@messaging_bp.route("/messages/send-both", methods=["POST"])
@jwt_required()
def send_both_route():
    return _create_and_send(request.get_json() or {}, "both")


# ── Message Templates ─────────────────────────────────────────────────────────

@messaging_bp.route("/message-templates", methods=["GET"])
@jwt_required()
def get_templates():
    template_type = request.args.get("type")
    q = MessageTemplate.query.filter_by(is_active=True)
    if template_type:
        q = q.filter(MessageTemplate.template_type == template_type)
    templates = q.order_by(MessageTemplate.template_name).all()
    return jsonify({"templates": [t.to_dict() for t in templates], "total": len(templates)}), 200


@messaging_bp.route("/message-templates", methods=["POST"])
@jwt_required()
def create_template():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    if not data.get("template_name") or not data.get("body"):
        return jsonify({"error": "template_name and body are required."}), 400

    template = MessageTemplate(
        template_name=data["template_name"],
        template_type=data.get("template_type", "both"),
        subject=data.get("subject"),
        body=data["body"],
        created_by_user_id=user_id,
        is_active=True,
    )
    db.session.add(template)
    db.session.commit()
    return jsonify({"message": "Template created.", "template": template.to_dict()}), 201


@messaging_bp.route("/message-templates/<int:template_id>", methods=["PUT"])
@jwt_required()
def update_template(template_id):
    template = MessageTemplate.query.get_or_404(template_id)
    data = request.get_json() or {}
    for field in ("template_name", "template_type", "subject", "body", "is_active"):
        if field in data:
            setattr(template, field, data[field])
    db.session.commit()
    return jsonify({"message": "Template updated.", "template": template.to_dict()}), 200


@messaging_bp.route("/message-templates/<int:template_id>", methods=["DELETE"])
@jwt_required()
def delete_template(template_id):
    template = MessageTemplate.query.get_or_404(template_id)
    template.is_active = False   # soft delete
    db.session.commit()
    return jsonify({"message": "Template deactivated."}), 200
