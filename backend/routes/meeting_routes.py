"""
OutreachRoute Pro — Meeting Routes

Full CRUD for scheduling and managing virtual meetings with applicants.
"""

from datetime import datetime, timezone, date as date_type, time as time_type
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models.meeting import Meeting
from models.applicant import Applicant
from models.audit_log import AuditLog
from services.meeting_service import send_meeting_confirmation, send_meeting_reminder

meeting_bp = Blueprint("meetings", __name__)

MEETING_STATUSES = {"scheduled", "completed", "no_show", "cancelled", "rescheduled"}
MEETING_PLATFORMS = {"zoom", "teams", "google_meet", "phone", "in_person", "other"}


def _parse_date(val):
    if not val:
        return None
    if isinstance(val, date_type):
        return val
    return datetime.strptime(val, "%Y-%m-%d").date()


def _parse_time(val):
    if not val:
        return None
    if isinstance(val, time_type):
        return val
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(val, fmt).time()
        except ValueError:
            continue
    return None


def _split_name(full_name):
    text = (full_name or "").strip()
    if not text:
        return (None, None)
    parts = text.split()
    if len(parts) == 1:
        return (parts[0], "Partner")
    return (parts[0], " ".join(parts[1:]))


def _resolve_applicant_for_meeting(data, oa_user_id):
    applicant_id = data.get("applicant_id")
    if applicant_id:
        applicant = Applicant.query.get(applicant_id)
        if not applicant:
            return (None, "Applicant not found.")
        return (applicant, None)

    partner_name = (data.get("partner_contact_name") or data.get("external_contact_name") or "").strip()
    organization = (data.get("partner_organization") or data.get("organization_name") or "").strip()
    contact_email = (data.get("contact_email") or "").strip() or None
    contact_phone = (data.get("contact_phone") or "").strip() or None

    if not partner_name and not organization:
        return (None, "Either applicant_id or partner details are required.")

    display_name = partner_name or organization
    first_name, last_name = _split_name(display_name)
    if not first_name:
        return (None, "Unable to determine partner name.")

    applicant = Applicant(
        first_name=first_name,
        last_name=last_name or "Partner",
        full_name_original=display_name,
        email=contact_email,
        phone=contact_phone,
        source="Partner Meeting",
        referral_source=organization or None,
        application_status="New Application",
        assigned_oa_id=oa_user_id,
        notes=(f"Auto-created from partner/community meeting. Organization: {organization}." if organization else "Auto-created from partner/community meeting."),
    )
    db.session.add(applicant)
    db.session.flush()
    return (applicant, None)


@meeting_bp.route("", methods=["GET"])
@jwt_required()
def get_meetings():
    """List meetings. Admins see all; OA users see only their own."""
    claims = get_jwt()
    role = claims.get("role", "")
    user_id = int(get_jwt_identity())

    q = Meeting.query
    if role == "oa_user":
        q = q.filter_by(oa_user_id=user_id)

    status = request.args.get("status")
    if status:
        q = q.filter(Meeting.status == status)

    meetings = q.order_by(Meeting.meeting_date.desc(), Meeting.meeting_time.desc()).all()
    return jsonify({"meetings": [m.to_dict() for m in meetings], "total": len(meetings)}), 200


@meeting_bp.route("/applicant/<int:applicant_id>", methods=["GET"])
@jwt_required()
def get_applicant_meetings(applicant_id):
    applicant = Applicant.query.get_or_404(applicant_id)
    meetings = (
        Meeting.query
        .filter_by(applicant_id=applicant.id)
        .order_by(Meeting.meeting_date.desc())
        .all()
    )
    return jsonify({"meetings": [m.to_dict() for m in meetings], "total": len(meetings)}), 200


@meeting_bp.route("", methods=["POST"])
@jwt_required()
def create_meeting():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    required = ["meeting_title", "meeting_date"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Required fields missing: {', '.join(missing)}"}), 400

    applicant, applicant_error = _resolve_applicant_for_meeting(data, user_id)
    if applicant_error:
        return jsonify({"error": applicant_error}), 400

    status = data.get("status", "scheduled")
    if status not in MEETING_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(MEETING_STATUSES)}"}), 400

    meeting = Meeting(
        applicant_id=applicant.id,
        oa_user_id=data.get("oa_user_id", user_id),
        meeting_title=data["meeting_title"],
        meeting_type=data.get("meeting_type"),
        meeting_date=_parse_date(data["meeting_date"]),
        meeting_time=_parse_time(data.get("meeting_time")),
        timezone=data.get("timezone"),
        meeting_link=data.get("meeting_link"),
        platform=data.get("platform"),
        status=status,
        notes=data.get("notes"),
    )
    db.session.add(meeting)
    db.session.flush()

    db.session.add(AuditLog(
        user_id=user_id, action_type="CREATE", entity_type="meeting",
        entity_id=meeting.id,
        description=f"Scheduled meeting '{meeting.meeting_title}' for applicant {applicant.id}"
    ))
    db.session.commit()
    return jsonify({"message": "Meeting created.", "meeting": meeting.to_dict()}), 201


@meeting_bp.route("/<int:meeting_id>", methods=["GET"])
@jwt_required()
def get_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify({"meeting": meeting.to_dict()}), 200


@meeting_bp.route("/<int:meeting_id>", methods=["PUT"])
@jwt_required()
def update_meeting(meeting_id):
    user_id = int(get_jwt_identity())
    meeting = Meeting.query.get_or_404(meeting_id)
    data = request.get_json() or {}

    for field in ("meeting_title", "meeting_type", "meeting_link", "platform", "timezone", "notes"):
        if field in data:
            setattr(meeting, field, data[field])

    if "meeting_date" in data:
        meeting.meeting_date = _parse_date(data["meeting_date"])
    if "meeting_time" in data:
        meeting.meeting_time = _parse_time(data["meeting_time"])
    if "status" in data:
        if data["status"] not in MEETING_STATUSES:
            return jsonify({"error": f"Invalid status."}), 400
        meeting.status = data["status"]

    db.session.add(AuditLog(
        user_id=user_id, action_type="UPDATE", entity_type="meeting",
        entity_id=meeting.id,
        description=f"Updated meeting '{meeting.meeting_title}'"
    ))
    db.session.commit()
    return jsonify({"message": "Meeting updated.", "meeting": meeting.to_dict()}), 200


@meeting_bp.route("/<int:meeting_id>", methods=["DELETE"])
@jwt_required()
def delete_meeting(meeting_id):
    user_id = int(get_jwt_identity())
    meeting = Meeting.query.get_or_404(meeting_id)
    db.session.add(AuditLog(
        user_id=user_id, action_type="DELETE", entity_type="meeting",
        entity_id=meeting.id,
        description=f"Deleted meeting '{meeting.meeting_title}'"
    ))
    db.session.delete(meeting)
    db.session.commit()
    return jsonify({"message": "Meeting deleted."}), 200


@meeting_bp.route("/<int:meeting_id>/complete", methods=["PUT"])
@jwt_required()
def complete_meeting(meeting_id):
    user_id = int(get_jwt_identity())
    meeting = Meeting.query.get_or_404(meeting_id)
    data = request.get_json() or {}
    meeting.status = "completed"
    if data.get("notes"):
        meeting.notes = data["notes"]
    db.session.add(AuditLog(
        user_id=user_id, action_type="UPDATE", entity_type="meeting",
        entity_id=meeting.id, description="Marked meeting as completed"
    ))
    db.session.commit()
    return jsonify({"message": "Meeting marked completed.", "meeting": meeting.to_dict()}), 200


@meeting_bp.route("/<int:meeting_id>/send-confirmation", methods=["POST"])
@jwt_required()
def send_confirmation(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    result = send_meeting_confirmation(meeting.id)
    if not result.get("success"):
        return jsonify({"error": result.get("error", "Failed to send confirmation")}), 400
    return jsonify({"message": "Meeting confirmation sent.", "meeting_id": meeting.id}), 200


@meeting_bp.route("/<int:meeting_id>/send-reminder", methods=["POST"])
@jwt_required()
def send_reminder(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    result = send_meeting_reminder(meeting.id)
    if not result.get("success"):
        return jsonify({"error": result.get("error", "Failed to send reminder")}), 400
    return jsonify({"message": "Meeting reminder sent.", "meeting_id": meeting.id}), 200
