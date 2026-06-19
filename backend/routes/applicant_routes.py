"""
OutreachRoute Pro — Applicant Tracking Routes

Core CRUD for applicants, status management, document checklist, and history.
Role-based access: OA users see only their assigned applicants; admins see all.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, date
from sqlalchemy import func
from extensions import db
from models.applicant import Applicant
from models.applicant_document import ApplicantDocument
from models.application_status_history import ApplicationStatusHistory
from models.case_note import CaseNote
from models.user import User
from models.audit_log import AuditLog
from utils.decorators import admin_required
from utils.permissions import can_view_applicant, can_edit_applicant, is_admin
from utils.constants import APPLICATION_STATUSES, WITHDRAWAL_REASONS, DOCUMENT_CHECKLIST

applicant_bp = Blueprint("applicants", __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_current_user():
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def _clean_text(data, key):
    return (data.get(key) or "").strip()


def _record_status_change(applicant, old_status, new_status, reason, user_id, notes=None):
    """Write to status history and create an auto case note."""
    history = ApplicationStatusHistory(
        applicant_id=applicant.id,
        old_status=old_status,
        new_status=new_status,
        status_reason=reason,
        changed_by_user_id=user_id,
        notes=notes,
    )
    db.session.add(history)

    # Auto case note
    auto_note = CaseNote(
        applicant_id=applicant.id,
        user_id=user_id,
        note_type="Status Change",
        reason=f"Status changed from '{old_status}' to '{new_status}'.",
        action=reason or "Status updated.",
        plan="Continue follow-up per program timeline.",
        auto_generated=True,
    )
    db.session.add(auto_note)


def _init_document_checklist(applicant_id):
    """Create the standard required document checklist for a new applicant."""
    required_docs = [
        "Photo ID",
        "Social Security Card",
        "Birth Certificate",
        "High School Diploma",
        "Health Questionnaire",
        "Signed Consent Forms",
    ]
    for doc_name in required_docs:
        doc = ApplicantDocument(
            applicant_id=applicant_id,
            document_name=doc_name,
            is_required=True,
            is_received=False,
        )
        db.session.add(doc)


# ── GET /api/applicants ───────────────────────────────────────────────────────

@applicant_bp.route("", methods=["GET"])
@jwt_required()
def get_applicants():
    """
    List applicants. OA users see only their assigned applicants.
    Admins see all (optionally filtered by assigned_oa).
    GET /api/applicants
    Query params: status, state, county, assigned_oa_id, search,
                  is_complete, is_withdrawn, import_filter, sequence_by_user,
                  page, per_page
    """
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Unauthorized."}), 401

    query = Applicant.query

    # Role-based scope
    if not is_admin(current_user):
        query = query.filter_by(assigned_oa_id=current_user.id)
    elif request.args.get("assigned_oa_id"):
        query = query.filter_by(assigned_oa_id=int(request.args["assigned_oa_id"]))

    # Filters
    status = request.args.get("status")
    if status:
        query = query.filter_by(application_status=status)

    state = request.args.get("state")
    if state:
        query = query.filter_by(state=state)

    county = request.args.get("county")
    if county:
        query = query.filter(Applicant.county.ilike(f"%{county}%"))

    is_complete = request.args.get("is_complete")
    if is_complete is not None:
        query = query.filter_by(is_complete=is_complete.lower() == "true")

    is_withdrawn = request.args.get("is_withdrawn")
    if is_withdrawn is not None:
        query = query.filter_by(is_withdrawn=is_withdrawn.lower() == "true")

    import_filter = request.args.get("import_filter", "").strip().lower()
    if import_filter == "needs_zip_code":
        query = query.filter_by(needs_zip_code=True)
    elif import_filter == "open":
        query = query.filter(func.lower(Applicant.case_status) == "open")
    elif import_filter == "withdrawn":
        query = query.filter(
            db.or_(Applicant.is_withdrawn.is_(True), func.lower(Applicant.case_status) == "withdrawn")
        )
    elif import_filter == "application_started":
        query = query.filter(func.lower(Applicant.workflow_milestone) == "application started")
    elif import_filter == "application_submitted":
        query = query.filter(func.lower(Applicant.workflow_milestone) == "application submitted")
    elif import_filter == "application_verified":
        query = query.filter(func.lower(Applicant.workflow_milestone) == "application verified")
    elif import_filter == "expedited":
        query = query.filter(func.lower(Applicant.urgency) == "expedited")
    elif import_filter == "standard":
        query = query.filter(func.lower(Applicant.urgency) == "standard")

    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(
            db.or_(
                Applicant.first_name.ilike(f"%{search}%"),
                Applicant.last_name.ilike(f"%{search}%"),
                Applicant.phone.ilike(f"%{search}%"),
                Applicant.email.ilike(f"%{search}%"),
                Applicant.tracking_number.ilike(f"%{search}%"),
                Applicant.full_name_original.ilike(f"%{search}%"),
            )
        )

    # Pagination
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, int(request.args.get("per_page", 50)))

    total = query.count()
    sequence_by_user = request.args.get("sequence_by_user", "").strip().lower() == "true"

    if is_admin(current_user) and sequence_by_user:
        query = query.outerjoin(User, Applicant.assigned_oa_id == User.id).order_by(
            User.last_name.asc().nullslast(),
            User.first_name.asc().nullslast(),
            Applicant.last_name.asc(),
            Applicant.first_name.asc(),
        )
    else:
        query = query.order_by(Applicant.next_follow_up_date.asc().nullslast(), Applicant.last_name)

    applicants = (
        query.offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({
        "applicants": [a.to_dict() for a in applicants],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, -(-total // per_page)),
    }), 200


# ── GET /api/applicants/:id ───────────────────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>", methods=["GET"])
@jwt_required()
def get_applicant(applicant_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403
    return jsonify({"applicant": applicant.to_dict()}), 200


# ── POST /api/applicants ──────────────────────────────────────────────────────

@applicant_bp.route("", methods=["POST"])
@jwt_required()
def create_applicant():
    current_user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    first_name = _clean_text(data, "first_name")
    last_name = _clean_text(data, "last_name")
    if not first_name or not last_name:
        return jsonify({"error": "First name and last name are required."}), 400

    # OA users can only create applicants assigned to themselves
    assigned_oa_id = data.get("assigned_oa_id")
    if not is_admin(current_user):
        assigned_oa_id = current_user.id
    elif not assigned_oa_id:
        assigned_oa_id = current_user.id

    def parse_date(val):
        if not val:
            return None
        try:
            return date.fromisoformat(val)
        except (ValueError, TypeError):
            return None

    applicant = Applicant(
        first_name=first_name,
        last_name=last_name,
        phone=_clean_text(data, "phone") or None,
        email=_clean_text(data, "email").lower() or None,
        age=data.get("age") or None,
        date_of_birth=parse_date(data.get("date_of_birth")),
        address=_clean_text(data, "address") or None,
        city=_clean_text(data, "city") or None,
        state=_clean_text(data, "state") or None,
        county=_clean_text(data, "county") or None,
        zip_code=_clean_text(data, "zip_code") or None,
        timezone=_clean_text(data, "timezone") or None,
        center_of_interest=_clean_text(data, "center_of_interest") or None,
        trade_interest=_clean_text(data, "trade_interest") or None,
        campus=_clean_text(data, "campus") or None,
        academic_status=_clean_text(data, "academic_status") or None,
        education_status=_clean_text(data, "education_status") or None,
        interview_date=parse_date(data.get("interview_date")),
        interview_location=_clean_text(data, "interview_location") or None,
        form_104_applicant_history=_clean_text(data, "form_104_applicant_history") or None,
        form_104_short_term_goals=_clean_text(data, "form_104_short_term_goals") or None,
        form_104_long_term_goals=_clean_text(data, "form_104_long_term_goals") or None,
        form_104_action_plan=_clean_text(data, "form_104_action_plan") or None,
        form_104_recommended_length=_clean_text(data, "form_104_recommended_length") or None,
        form_104_trade_interest_summary=_clean_text(data, "form_104_trade_interest_summary") or None,
        form_104_willingness_to_relocate=_clean_text(data, "form_104_willingness_to_relocate") or None,
        form_104_labor_market_discussion=_clean_text(data, "form_104_labor_market_discussion") or None,
        application_status=data.get("application_status", "New Application"),
        assigned_oa_id=assigned_oa_id,
        source=_clean_text(data, "source") or None,
        referral_source=_clean_text(data, "referral_source") or None,
        date_applied=parse_date(data.get("date_applied")) or date.today(),
        notes=_clean_text(data, "notes") or None,
    )
    db.session.add(applicant)
    db.session.flush()

    # Initialize document checklist
    _init_document_checklist(applicant.id)

    # Record initial status in history
    _record_status_change(
        applicant,
        old_status=None,
        new_status=applicant.application_status,
        reason="Application created.",
        user_id=current_user.id,
    )

    log = AuditLog(
        user_id=current_user.id,
        action_type="CREATE",
        entity_type="applicant",
        entity_id=applicant.id,
        description=f"Created applicant {first_name} {last_name}.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Applicant created.", "applicant": applicant.to_dict()}), 201


# ── PUT /api/applicants/:id ───────────────────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>", methods=["PUT"])
@jwt_required()
def update_applicant(applicant_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    data = request.get_json() or {}
    old_status = applicant.application_status

    def parse_date(val):
        if val is None:
            return None
        try:
            return date.fromisoformat(val) if val else None
        except (ValueError, TypeError):
            return None

    # Updatable fields
    str_fields = [
        "first_name", "last_name", "phone", "email", "address", "city",
        "state", "county", "zip_code", "timezone", "center_of_interest", "trade_interest",
        "campus", "academic_status", "education_status", "interview_location",
        "form_104_applicant_history", "form_104_short_term_goals", "form_104_long_term_goals",
        "form_104_action_plan", "form_104_recommended_length", "form_104_trade_interest_summary",
        "form_104_willingness_to_relocate", "form_104_labor_market_discussion",
        "source", "referral_source", "notes",
        "application_status_reason",
        "middle_name", "full_name_original", "tracking_number", "case_status",
        "workflow_milestone", "urgency", "center_status",
        "submitted_application_questionnaire", "submitted_health_questionnaire",
        "assigned_oa_name", "import_source", "import_batch_id",
    ]
    for field in str_fields:
        if field in data:
            setattr(applicant, field, data[field].strip() if data[field] else None)

    if "age" in data:
        applicant.age = data["age"] or None
    if "days_in_queue" in data:
        applicant.days_in_queue = data["days_in_queue"] or None
    if "needs_zip_code" in data:
        applicant.needs_zip_code = bool(data["needs_zip_code"])
    if "date_of_birth" in data:
        applicant.date_of_birth = parse_date(data["date_of_birth"])
    if "date_applied" in data:
        applicant.date_applied = parse_date(data["date_applied"])
    if "interview_date" in data:
        applicant.interview_date = parse_date(data["interview_date"])
    if "case_creation_date" in data:
        applicant.case_creation_date = parse_date(data["case_creation_date"])
    if "last_contact_date" in data:
        applicant.last_contact_date = parse_date(data["last_contact_date"])
    if "next_follow_up_date" in data:
        applicant.next_follow_up_date = parse_date(data["next_follow_up_date"])

    # Admin-only fields
    if is_admin(current_user) and "assigned_oa_id" in data:
        applicant.assigned_oa_id = data["assigned_oa_id"]

    # Allow status changes through the edit form save flow.
    if "application_status" in data:
        requested_status = _clean_text(data, "application_status")
        if not requested_status:
            return jsonify({"error": "application_status cannot be empty."}), 400
        if requested_status not in APPLICATION_STATUSES:
            return jsonify({"error": "Invalid status."}), 400

        applicant.application_status = requested_status
        if old_status != requested_status:
            _record_status_change(
                applicant,
                old_status=old_status,
                new_status=requested_status,
                reason=_clean_text(data, "application_status_reason") or "Status updated from applicant edit.",
                user_id=current_user.id,
            )
    elif "applicant_status" in data:
        requested_status = _clean_text(data, "applicant_status")
        if not requested_status:
            return jsonify({"error": "applicant_status cannot be empty."}), 400
        if requested_status not in APPLICATION_STATUSES:
            return jsonify({"error": "Invalid status."}), 400

        applicant.application_status = requested_status
        if old_status != requested_status:
            _record_status_change(
                applicant,
                old_status=old_status,
                new_status=requested_status,
                reason=_clean_text(data, "application_status_reason") or "Status updated from applicant edit.",
                user_id=current_user.id,
            )

    db.session.commit()
    return jsonify({"message": "Applicant updated.", "applicant": applicant.to_dict()}), 200


# ── DELETE /api/applicants/:id ────────────────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_applicant(applicant_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404

    name = f"{applicant.first_name} {applicant.last_name}"
    db.session.delete(applicant)
    log = AuditLog(
        user_id=current_user.id,
        action_type="DELETE",
        entity_type="applicant",
        entity_id=applicant_id,
        description=f"Deleted applicant {name}.",
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"message": f"Applicant {name} deleted."}), 200


# ── PUT /api/applicants/:id/status ────────────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/status", methods=["PUT"])
@jwt_required()
def update_status(applicant_id):
    """
    Update application status. Requires reason for tracking.
    PUT /api/applicants/:id/status
    Body: { new_status, reason?, notes? }
    """
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    data = request.get_json() or {}
    new_status = _clean_text(data, "new_status")

    if not new_status:
        return jsonify({"error": "new_status is required."}), 400
    if new_status not in APPLICATION_STATUSES:
        return jsonify({"error": f"Invalid status."}), 400

    old_status = applicant.application_status
    if old_status == new_status:
        return jsonify({"error": "Applicant already has this status."}), 400

    applicant.application_status = new_status
    applicant.application_status_reason = _clean_text(data, "reason") or None

    # Auto-update last_contact_date for active statuses
    contact_statuses = {"Contact Made", "Interview Scheduled", "Interview Completed"}
    if new_status in contact_statuses:
        applicant.last_contact_date = date.today()

    _record_status_change(
        applicant, old_status, new_status,
        reason=_clean_text(data, "reason") or None,
        user_id=current_user.id,
        notes=_clean_text(data, "notes") or None,
    )
    db.session.commit()

    return jsonify({"message": "Status updated.", "applicant": applicant.to_dict()}), 200


# ── PUT /api/applicants/:id/mark-complete ────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/mark-complete", methods=["PUT"])
@jwt_required()
def mark_complete(applicant_id):
    """
    Mark an applicant's file as complete (all documents received).
    PUT /api/applicants/:id/mark-complete
    """
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    if applicant.is_complete:
        return jsonify({"error": "Applicant is already marked complete."}), 400

    old_status = applicant.application_status
    applicant.is_complete = True

    # Auto-advance status to Complete Application if in an earlier stage
    pre_complete_statuses = {
        "New Application", "Contact Attempted", "Contact Made",
        "Interview Scheduled", "Interview Completed", "Application Incomplete",
        "Missing Documents",
    }
    if applicant.application_status in pre_complete_statuses:
        applicant.application_status = "Complete Application"
        _record_status_change(
            applicant, old_status, "Complete Application",
            reason="Application marked complete.",
            user_id=current_user.id,
        )

    db.session.commit()
    return jsonify({"message": "Applicant marked complete.", "applicant": applicant.to_dict()}), 200


# ── PUT /api/applicants/:id/withdraw ─────────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/withdraw", methods=["PUT"])
@jwt_required()
def withdraw(applicant_id):
    """
    Withdraw an applicant.
    PUT /api/applicants/:id/withdraw
    Body: { withdrawal_reason, withdrawn_by? }
    """
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    if applicant.is_withdrawn:
        return jsonify({"error": "Applicant is already withdrawn."}), 400

    data = request.get_json() or {}
    withdrawal_reason = _clean_text(data, "withdrawal_reason")
    if not withdrawal_reason:
        return jsonify({"error": "withdrawal_reason is required."}), 400

    old_status = applicant.application_status
    withdrawn_by = data.get("withdrawn_by", "Applicant")
    new_status = "Withdrawn by Applicant" if withdrawn_by == "Applicant" else "Withdrawn by OA / Program"

    applicant.is_withdrawn = True
    applicant.withdrawal_reason = withdrawal_reason
    applicant.withdrawal_date = date.today()
    applicant.application_status = new_status

    _record_status_change(
        applicant, old_status, new_status,
        reason=withdrawal_reason,
        user_id=current_user.id,
    )
    db.session.commit()

    return jsonify({"message": "Applicant withdrawn.", "applicant": applicant.to_dict()}), 200


# ── GET /api/applicants/:id/status-history ────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/status-history", methods=["GET"])
@jwt_required()
def get_status_history(applicant_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    history = (
        ApplicationStatusHistory.query
        .filter_by(applicant_id=applicant_id)
        .order_by(ApplicationStatusHistory.changed_at.desc())
        .all()
    )
    return jsonify({"history": [h.to_dict() for h in history]}), 200


# ── GET /api/applicants/:id/documents ────────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/documents", methods=["GET"])
@jwt_required()
def get_documents(applicant_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    docs = ApplicantDocument.query.filter_by(applicant_id=applicant_id).order_by(
        ApplicantDocument.is_required.desc(), ApplicantDocument.document_name
    ).all()
    return jsonify({"documents": [d.to_dict() for d in docs]}), 200


# ── POST /api/applicants/:id/documents ───────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/documents", methods=["POST"])
@jwt_required()
def add_document(applicant_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    data = request.get_json() or {}
    doc_name = _clean_text(data, "document_name")
    if not doc_name:
        return jsonify({"error": "document_name is required."}), 400

    doc = ApplicantDocument(
        applicant_id=applicant_id,
        document_name=doc_name,
        is_required=data.get("is_required", True),
        is_received=data.get("is_received", False),
        notes=_clean_text(data, "notes") or None,
        updated_by_user_id=current_user.id,
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({"message": "Document added.", "document": doc.to_dict()}), 201


# ── PUT /api/applicants/:id/documents/:doc_id ────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/documents/<int:doc_id>", methods=["PUT"])
@jwt_required()
def update_document(applicant_id, doc_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    doc = ApplicantDocument.query.filter_by(id=doc_id, applicant_id=applicant_id).first()
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    data = request.get_json() or {}

    if "is_received" in data:
        doc.is_received = bool(data["is_received"])
        if doc.is_received and not doc.date_received:
            doc.date_received = date.today()
        elif not doc.is_received:
            doc.date_received = None

    if "is_required" in data:
        doc.is_required = bool(data["is_required"])
    if "notes" in data:
        doc.notes = data["notes"].strip() or None
    if "document_name" in data and data["document_name"].strip():
        doc.document_name = data["document_name"].strip()

    doc.updated_by_user_id = current_user.id
    db.session.commit()

    return jsonify({"message": "Document updated.", "document": doc.to_dict()}), 200


# ── DELETE /api/applicants/:id/documents/:doc_id ─────────────────────────────

@applicant_bp.route("/<int:applicant_id>/documents/<int:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(applicant_id, doc_id):
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    doc = ApplicantDocument.query.filter_by(id=doc_id, applicant_id=applicant_id).first()
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    db.session.delete(doc)
    db.session.commit()
    return jsonify({"message": "Document removed."}), 200


# ── GET /api/applicants/:id/case-notes ───────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/case-notes", methods=["GET"])
@jwt_required()
def get_applicant_case_notes(applicant_id):
    """
    List all case notes for a specific applicant.
    GET /api/applicants/:id/case-notes?auto_generated=&note_type=&page=&per_page=
    """
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    from models.case_note import CaseNote

    query = CaseNote.query.filter_by(applicant_id=applicant_id)

    auto_generated = request.args.get("auto_generated")
    if auto_generated is not None:
        query = query.filter(CaseNote.auto_generated == (auto_generated.lower() == "true"))

    note_type = request.args.get("note_type")
    if note_type:
        query = query.filter(CaseNote.note_type == note_type)

    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, int(request.args.get("per_page", 50)))
    total = query.count()

    notes = (
        query.order_by(CaseNote.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({
        "case_notes": [n.to_dict() for n in notes],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


# ── POST /api/applicants/:id/case-notes ──────────────────────────────────────

@applicant_bp.route("/<int:applicant_id>/case-notes", methods=["POST"])
@jwt_required()
def add_applicant_case_note(applicant_id):
    """
    Create a manual case note for a specific applicant (convenience route).
    POST /api/applicants/:id/case-notes
    Body: { note_type?, reason?, action?, plan?, note_body? }
    """
    current_user = get_current_user()
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    from models.case_note import CaseNote
    from utils.constants import CASE_NOTE_TYPES

    data = request.get_json() or {}

    reason    = (data.get("reason")    or "").strip() or None
    action    = (data.get("action")    or "").strip() or None
    plan      = (data.get("plan")      or "").strip() or None
    note_body = (data.get("note_body") or "").strip() or None

    if not any([reason, action, plan, note_body]):
        return jsonify({"error": "At least one of reason, action, plan, or note_body must be provided."}), 400

    note_type = (data.get("note_type") or "General Note").strip()
    if note_type not in CASE_NOTE_TYPES:
        note_type = "General Note"

    note = CaseNote(
        applicant_id=applicant_id,
        user_id=current_user.id,
        note_type=note_type,
        reason=reason,
        action=action,
        plan=plan,
        note_body=note_body,
        auto_generated=False,
    )
    db.session.add(note)
    db.session.commit()

    return jsonify({"message": "Case note added.", "case_note": note.to_dict()}), 201

