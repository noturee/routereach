"""
OutreachRoute Pro — Visit Log Routes

Records each OA outreach visit to a location.
Auto-updates the location's last_visit_date and next_follow_up_date.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date

from extensions import db
from models.visit_log import VisitLog
from models.outreach_location import OutreachLocation
from models.user import User
from models.audit_log import AuditLog
from utils.decorators import admin_required
from utils.permissions import is_admin
from utils.constants import MARKETING_TYPES

visit_log_bp = Blueprint("visit_logs", __name__)


def get_current_user():
    return User.query.get(int(get_jwt_identity()))


def _parse_date(val):
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except (ValueError, TypeError):
        return None


# ── GET /api/visit-logs ───────────────────────────────────────────────────────

@visit_log_bp.route("", methods=["GET"])
@jwt_required()
def get_visit_logs():
    """
    List visit logs.
    Filters: location_id, oa_user_id, date_from, date_to, follow_up_needed, page, per_page
    OAs see only their own logs unless admin.
    """
    current_user = get_current_user()
    query = VisitLog.query

    # Role-scoping: non-admins see only their own logs
    if not is_admin(current_user):
        query = query.filter_by(oa_user_id=current_user.id)

    location_id = request.args.get("location_id")
    if location_id:
        query = query.filter_by(outreach_location_id=int(location_id))

    oa_user_id = request.args.get("oa_user_id")
    if oa_user_id and is_admin(current_user):
        query = query.filter_by(oa_user_id=int(oa_user_id))

    date_from = _parse_date(request.args.get("date_from"))
    if date_from:
        query = query.filter(VisitLog.visit_date >= date_from)

    date_to = _parse_date(request.args.get("date_to"))
    if date_to:
        query = query.filter(VisitLog.visit_date <= date_to)

    follow_up = request.args.get("follow_up_needed")
    if follow_up is not None:
        query = query.filter_by(follow_up_needed=(follow_up.lower() == "true"))

    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(100, int(request.args.get("per_page", 50)))
    total    = query.count()

    logs = (
        query.order_by(VisitLog.visit_date.desc(), VisitLog.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({
        "visit_logs": [log.to_dict() for log in logs],
        "total":      total,
        "page":       page,
        "per_page":   per_page,
        "pages":      max(1, -(-total // per_page)),
    }), 200


# ── GET /api/visit-logs/:id ───────────────────────────────────────────────────

@visit_log_bp.route("/<int:log_id>", methods=["GET"])
@jwt_required()
def get_visit_log(log_id):
    current_user = get_current_user()
    log = VisitLog.query.get(log_id)
    if not log:
        return jsonify({"error": "Visit log not found."}), 404
    if not is_admin(current_user) and log.oa_user_id != current_user.id:
        return jsonify({"error": "Access denied."}), 403
    return jsonify({"visit_log": log.to_dict()}), 200


# ── POST /api/visit-logs ──────────────────────────────────────────────────────

@visit_log_bp.route("", methods=["POST"])
@jwt_required()
def create_visit_log():
    current_user = get_current_user()
    data = request.get_json() or {}

    location_id = data.get("outreach_location_id")
    if not location_id:
        return jsonify({"error": "outreach_location_id is required."}), 400

    location = OutreachLocation.query.get(location_id)
    if not location:
        return jsonify({"error": "Location not found."}), 404

    visit_date_raw = data.get("visit_date")
    if not visit_date_raw:
        return jsonify({"error": "visit_date is required."}), 400
    visit_date = _parse_date(visit_date_raw)
    if not visit_date:
        return jsonify({"error": "visit_date must be YYYY-MM-DD."}), 400

    # Admins can log on behalf of another OA
    oa_user_id = data.get("oa_user_id")
    if is_admin(current_user) and oa_user_id:
        oa = User.query.get(int(oa_user_id))
        if not oa:
            return jsonify({"error": "Specified OA user not found."}), 404
        oa_user_id = oa.id
    else:
        oa_user_id = current_user.id

    marketing_type = (data.get("marketing_type") or "").strip() or None
    if marketing_type and marketing_type not in MARKETING_TYPES:
        return jsonify({"error": "Invalid marketing_type."}), 400

    follow_up_needed    = bool(data.get("follow_up_needed", False))
    next_follow_up_date = _parse_date(data.get("next_follow_up_date"))

    log = VisitLog(
        outreach_location_id = location_id,
        oa_user_id           = oa_user_id,
        visit_date           = visit_date,
        marketing_type       = marketing_type,
        materials_left       = (data.get("materials_left") or "").strip() or None,
        quantity_left        = data.get("quantity_left") or None,
        contact_person_met   = (data.get("contact_person_met") or "").strip() or None,
        partner_contact_made = bool(data.get("partner_contact_made", False)),
        visit_notes          = (data.get("visit_notes") or "").strip() or None,
        follow_up_needed     = follow_up_needed,
        next_follow_up_date  = next_follow_up_date,
    )
    db.session.add(log)

    # ── Auto-update location's last_visit_date ────────────────────────────
    if not location.last_visit_date or visit_date >= location.last_visit_date:
        location.last_visit_date = visit_date

    # ── Auto-update location's next_follow_up_date if specified ──────────
    if follow_up_needed and next_follow_up_date:
        location.next_follow_up_date = next_follow_up_date

    db.session.add(AuditLog(
        user_id     = current_user.id,
        action_type = "CREATE",
        entity_type = "visit_log",
        description = f"Logged visit to '{location.location_name}' on {visit_date.isoformat()}.",
    ))
    db.session.commit()

    return jsonify({
        "message":   "Visit logged.",
        "visit_log": log.to_dict(),
    }), 201


# ── PUT /api/visit-logs/:id ───────────────────────────────────────────────────

@visit_log_bp.route("/<int:log_id>", methods=["PUT"])
@jwt_required()
def update_visit_log(log_id):
    current_user = get_current_user()
    log = VisitLog.query.get(log_id)
    if not log:
        return jsonify({"error": "Visit log not found."}), 404

    # Owner or admin can edit
    if not is_admin(current_user) and log.oa_user_id != current_user.id:
        return jsonify({"error": "Access denied."}), 403

    data = request.get_json() or {}

    if "visit_date" in data:
        vd = _parse_date(data["visit_date"])
        if vd:
            log.visit_date = vd
    if "marketing_type" in data:
        mt = data["marketing_type"]
        log.marketing_type = mt.strip() if mt else None
    if "materials_left" in data:
        log.materials_left = data["materials_left"].strip() or None if data["materials_left"] else None
    if "quantity_left" in data:
        log.quantity_left = data["quantity_left"] or None
    if "contact_person_met" in data:
        log.contact_person_met = data["contact_person_met"].strip() or None if data["contact_person_met"] else None
    if "partner_contact_made" in data:
        log.partner_contact_made = bool(data["partner_contact_made"])
    if "visit_notes" in data:
        log.visit_notes = data["visit_notes"].strip() or None if data["visit_notes"] else None
    if "follow_up_needed" in data:
        log.follow_up_needed = bool(data["follow_up_needed"])
    if "next_follow_up_date" in data:
        log.next_follow_up_date = _parse_date(data["next_follow_up_date"])

    db.session.commit()
    return jsonify({"message": "Visit log updated.", "visit_log": log.to_dict()}), 200


# ── DELETE /api/visit-logs/:id ────────────────────────────────────────────────

@visit_log_bp.route("/<int:log_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_visit_log(log_id):
    current_user = get_current_user()
    log = VisitLog.query.get(log_id)
    if not log:
        return jsonify({"error": "Visit log not found."}), 404

    location_name = log.location.location_name if log.location else str(log.outreach_location_id)
    db.session.delete(log)
    db.session.add(AuditLog(
        user_id     = current_user.id,
        action_type = "DELETE",
        entity_type = "visit_log",
        entity_id   = log_id,
        description = f"Deleted visit log for '{location_name}' on {log.visit_date}.",
    ))
    db.session.commit()
    return jsonify({"message": "Visit log deleted."}), 200


# ── GET /api/visit-logs/location/:id ─────────────────────────────────────────

@visit_log_bp.route("/location/<int:location_id>", methods=["GET"])
@jwt_required()
def get_by_location(location_id):
    loc = OutreachLocation.query.get(location_id)
    if not loc:
        return jsonify({"error": "Location not found."}), 404

    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(100, int(request.args.get("per_page", 25)))
    query    = VisitLog.query.filter_by(outreach_location_id=location_id)
    total    = query.count()
    logs     = query.order_by(VisitLog.visit_date.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "visit_logs": [log.to_dict() for log in logs],
        "total":      total,
        "page":       page,
        "per_page":   per_page,
        "pages":      max(1, -(-total // per_page)),
    }), 200


# ── GET /api/visit-logs/user/:id ──────────────────────────────────────────────

@visit_log_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
def get_by_user(user_id):
    current_user = get_current_user()
    if not is_admin(current_user) and current_user.id != user_id:
        return jsonify({"error": "Access denied."}), 403

    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(100, int(request.args.get("per_page", 25)))
    query    = VisitLog.query.filter_by(oa_user_id=user_id)
    total    = query.count()
    logs     = query.order_by(VisitLog.visit_date.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "visit_logs": [log.to_dict() for log in logs],
        "total":      total,
        "page":       page,
        "per_page":   per_page,
        "pages":      max(1, -(-total // per_page)),
    }), 200
