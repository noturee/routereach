"""
OutreachRoute Pro — Case Note Routes

Manual R.A.P. (Reason / Action / Plan) note creation and management.
Auto-generated notes are written by applicant_routes when status changes occur.
Registered at /api prefix → endpoints: /api/case-notes, /api/case-notes/:id
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.case_note import CaseNote
from models.applicant import Applicant
from models.user import User
from models.audit_log import AuditLog
from utils.permissions import can_view_applicant, can_edit_applicant, is_admin
from utils.constants import CASE_NOTE_TYPES

case_note_bp = Blueprint("case_notes", __name__)


def get_current_user():
    return User.query.get(int(get_jwt_identity()))


# ── GET /api/case-notes ───────────────────────────────────────────────────────

@case_note_bp.route("/case-notes", methods=["GET"])
@jwt_required()
def get_case_notes():
    """
    List case notes. Filter by applicant_id, note_type, auto_generated.
    OA users only see notes for their assigned applicants.
    GET /api/case-notes?applicant_id=&note_type=&auto_generated=&page=&per_page=
    """
    current_user = get_current_user()

    query = CaseNote.query

    # Scope to applicants the user can see
    if not is_admin(current_user):
        # Join to applicants and filter by assigned OA
        query = query.join(Applicant, CaseNote.applicant_id == Applicant.id).filter(
            Applicant.assigned_oa_id == current_user.id
        )

    applicant_id = request.args.get("applicant_id")
    if applicant_id:
        query = query.filter(CaseNote.applicant_id == int(applicant_id))

    note_type = request.args.get("note_type")
    if note_type:
        query = query.filter(CaseNote.note_type == note_type)

    auto_generated = request.args.get("auto_generated")
    if auto_generated is not None:
        query = query.filter(CaseNote.auto_generated == (auto_generated.lower() == "true"))

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
        "pages": max(1, -(-total // per_page)),
    }), 200


# ── POST /api/case-notes ──────────────────────────────────────────────────────

@case_note_bp.route("/case-notes", methods=["POST"])
@jwt_required()
def create_case_note():
    """
    Create a manual case note for an applicant.
    POST /api/case-notes
    Body: { applicant_id, note_type?, reason?, action?, plan?, note_body? }
    At least one of reason/action/plan/note_body must be present.
    """
    current_user = get_current_user()
    data = request.get_json() or {}

    applicant_id = data.get("applicant_id")
    if not applicant_id:
        return jsonify({"error": "applicant_id is required."}), 400

    applicant = Applicant.query.get(int(applicant_id))
    if not applicant:
        return jsonify({"error": "Applicant not found."}), 404
    if not can_edit_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403

    reason    = (data.get("reason")    or "").strip() or None
    action    = (data.get("action")    or "").strip() or None
    plan      = (data.get("plan")      or "").strip() or None
    note_body = (data.get("note_body") or "").strip() or None

    if not any([reason, action, plan, note_body]):
        return jsonify({"error": "At least one of reason, action, plan, or note_body must be provided."}), 400

    note_type = data.get("note_type", "General Note").strip()
    if note_type and note_type not in CASE_NOTE_TYPES:
        note_type = "General Note"

    note = CaseNote(
        applicant_id=applicant.id,
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

    return jsonify({"message": "Case note created.", "case_note": note.to_dict()}), 201


# ── GET /api/case-notes/:id ───────────────────────────────────────────────────

@case_note_bp.route("/case-notes/<int:note_id>", methods=["GET"])
@jwt_required()
def get_case_note(note_id):
    current_user = get_current_user()
    note = CaseNote.query.get(note_id)
    if not note:
        return jsonify({"error": "Case note not found."}), 404
    applicant = Applicant.query.get(note.applicant_id)
    if not can_view_applicant(current_user, applicant):
        return jsonify({"error": "Access denied."}), 403
    return jsonify({"case_note": note.to_dict()}), 200


# ── PUT /api/case-notes/:id ───────────────────────────────────────────────────

@case_note_bp.route("/case-notes/<int:note_id>", methods=["PUT"])
@jwt_required()
def update_case_note(note_id):
    """
    Edit a manual case note. Auto-generated notes cannot be edited.
    Users can only edit their own notes; admins can edit any.
    """
    current_user = get_current_user()
    note = CaseNote.query.get(note_id)
    if not note:
        return jsonify({"error": "Case note not found."}), 404

    if note.auto_generated:
        return jsonify({"error": "Auto-generated notes cannot be edited."}), 403

    if note.user_id != current_user.id and not is_admin(current_user):
        return jsonify({"error": "You can only edit your own notes."}), 403

    data = request.get_json() or {}

    if "note_type" in data:
        nt = data["note_type"].strip()
        note.note_type = nt if nt in CASE_NOTE_TYPES else "General Note"
    if "reason" in data:
        note.reason = data["reason"].strip() or None
    if "action" in data:
        note.action = data["action"].strip() or None
    if "plan" in data:
        note.plan = data["plan"].strip() or None
    if "note_body" in data:
        note.note_body = data["note_body"].strip() or None

    db.session.commit()
    return jsonify({"message": "Case note updated.", "case_note": note.to_dict()}), 200


# ── DELETE /api/case-notes/:id ────────────────────────────────────────────────

@case_note_bp.route("/case-notes/<int:note_id>", methods=["DELETE"])
@jwt_required()
def delete_case_note(note_id):
    """
    Delete a case note. Auto-generated notes require admin. Manual notes can be deleted by owner or admin.
    """
    current_user = get_current_user()
    note = CaseNote.query.get(note_id)
    if not note:
        return jsonify({"error": "Case note not found."}), 404

    if note.auto_generated and not is_admin(current_user):
        return jsonify({"error": "Only admins can delete auto-generated notes."}), 403

    if note.user_id != current_user.id and not is_admin(current_user):
        return jsonify({"error": "You can only delete your own notes."}), 403

    log = AuditLog(
        user_id=current_user.id,
        action_type="DELETE",
        entity_type="case_note",
        entity_id=note_id,
        description=f"Deleted case note #{note_id} for applicant {note.applicant_id}.",
    )
    db.session.delete(note)
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Case note deleted."}), 200
