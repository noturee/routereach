"""
OutreachRoute Pro — Outreach Location Routes

CRUD for every physical location visited during field outreach.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date

from extensions import db
from models.outreach_location import OutreachLocation
from models.user import User
from models.audit_log import AuditLog
from utils.decorators import admin_required
from utils.permissions import is_admin
from utils.constants import LOCATION_TYPES

location_bp = Blueprint("locations", __name__)

LOCATION_STATUSES = ["active", "inactive", "do_not_visit", "pending_approval"]


def get_current_user():
    return User.query.get(int(get_jwt_identity()))


# ── GET /api/locations ────────────────────────────────────────────────────────

@location_bp.route("", methods=["GET"])
@jwt_required()
def get_locations():
    """
    List locations.
    GET /api/locations?type=&state=&status=&assigned_oa_id=&search=&page=&per_page=
    """
    query = OutreachLocation.query

    loc_type = request.args.get("type")
    if loc_type:
        query = query.filter_by(location_type=loc_type)

    state = request.args.get("state")
    if state:
        query = query.filter_by(state=state)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    assigned_oa_id = request.args.get("assigned_oa_id")
    if assigned_oa_id:
        query = query.filter_by(assigned_oa_id=int(assigned_oa_id))

    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(
            db.or_(
                OutreachLocation.location_name.ilike(f"%{search}%"),
                OutreachLocation.city.ilike(f"%{search}%"),
                OutreachLocation.county.ilike(f"%{search}%"),
                OutreachLocation.contact_person.ilike(f"%{search}%"),
            )
        )

    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(100, int(request.args.get("per_page", 50)))
    total    = query.count()

    locations = (
        query.order_by(OutreachLocation.location_name)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({
        "locations": [loc.to_dict() for loc in locations],
        "total":     total,
        "page":      page,
        "per_page":  per_page,
        "pages":     max(1, -(-total // per_page)),
    }), 200


# ── GET /api/locations/map ────────────────────────────────────────────────────

@location_bp.route("/map", methods=["GET"])
@jwt_required()
def get_map_locations():
    """Return minimal location data for map pins (Phase 10)."""
    locs = OutreachLocation.query.filter_by(status="active").all()
    return jsonify({
        "locations": [
            {
                "id": l.id,
                "location_name": l.location_name,
                "location_type": l.location_type,
                "latitude":  l.latitude,
                "longitude": l.longitude,
                "city":  l.city,
                "state": l.state,
            }
            for l in locs
            if l.latitude and l.longitude
        ]
    }), 200


# ── GET /api/locations/:id ────────────────────────────────────────────────────

@location_bp.route("/<int:location_id>", methods=["GET"])
@jwt_required()
def get_location(location_id):
    loc = OutreachLocation.query.get(location_id)
    if not loc:
        return jsonify({"error": "Location not found."}), 404

    data = loc.to_dict()
    data["visit_count"]   = len(loc.visit_logs)
    data["assigned_oa"]   = loc.assigned_oa.to_dict()   if loc.assigned_oa   else None
    data["created_by"]    = loc.created_by.to_dict()    if loc.created_by    else None
    return jsonify({"location": data}), 200


# ── POST /api/locations ───────────────────────────────────────────────────────

@location_bp.route("", methods=["POST"])
@jwt_required()
def create_location():
    current_user = get_current_user()
    data = request.get_json() or {}

    name = data.get("location_name", "").strip()
    if not name:
        return jsonify({"error": "location_name is required."}), 400

    loc_type = data.get("location_type", "").strip()
    if loc_type and loc_type not in LOCATION_TYPES:
        return jsonify({"error": f"Invalid location_type."}), 400

    def d(key):
        v = data.get(key, "")
        return v.strip() if v else None

    def parse_date(val):
        if not val: return None
        try: return date.fromisoformat(val)
        except (ValueError, TypeError): return None

    loc = OutreachLocation(
        location_name       = name,
        location_type       = loc_type or None,
        address             = d("address"),
        city                = d("city"),
        state               = d("state"),
        county              = d("county"),
        zip_code            = d("zip_code"),
        timezone            = d("timezone"),
        contact_person      = d("contact_person"),
        contact_title       = d("contact_title"),
        contact_phone       = d("contact_phone"),
        contact_email       = d("contact_email"),
        marketing_allowed   = bool(data.get("marketing_allowed", True)),
        assigned_oa_id      = data.get("assigned_oa_id") or None,
        created_by_user_id  = current_user.id,
        last_visit_date     = parse_date(d("last_visit_date")),
        next_follow_up_date = parse_date(d("next_follow_up_date")),
        status              = data.get("status", "active") if data.get("status") in LOCATION_STATUSES else "active",
        notes               = d("notes"),
        latitude            = data.get("latitude") or None,
        longitude           = data.get("longitude") or None,
    )
    db.session.add(loc)
    db.session.add(AuditLog(
        user_id     = current_user.id,
        action_type = "CREATE",
        entity_type = "location",
        description = f"Created location '{name}'.",
    ))
    db.session.commit()

    data_out        = loc.to_dict()
    data_out["assigned_oa"] = loc.assigned_oa.to_dict() if loc.assigned_oa else None
    return jsonify({"message": "Location created.", "location": data_out}), 201


# ── PUT /api/locations/:id ────────────────────────────────────────────────────

@location_bp.route("/<int:location_id>", methods=["PUT"])
@jwt_required()
def update_location(location_id):
    current_user = get_current_user()
    loc = OutreachLocation.query.get(location_id)
    if not loc:
        return jsonify({"error": "Location not found."}), 404

    data = request.get_json() or {}

    def d(key):
        if key not in data: return getattr(loc, key)
        v = data[key]
        return v.strip() if isinstance(v, str) else v

    def parse_date(val):
        if not val: return None
        try: return date.fromisoformat(val)
        except (ValueError, TypeError): return None

    str_fields = [
        "location_name", "location_type", "address", "city", "state",
        "county", "zip_code", "timezone", "contact_person", "contact_title",
        "contact_phone", "contact_email", "notes",
    ]
    for f in str_fields:
        if f in data:
            v = data[f]
            setattr(loc, f, v.strip() if v else None)

    if "status" in data and data["status"] in LOCATION_STATUSES:
        loc.status = data["status"]
    if "marketing_allowed" in data:
        loc.marketing_allowed = bool(data["marketing_allowed"])
    if "assigned_oa_id" in data:
        loc.assigned_oa_id = data["assigned_oa_id"] or None
    if "last_visit_date" in data:
        loc.last_visit_date = parse_date(data.get("last_visit_date"))
    if "next_follow_up_date" in data:
        loc.next_follow_up_date = parse_date(data.get("next_follow_up_date"))
    if "latitude" in data:
        loc.latitude = data["latitude"]
    if "longitude" in data:
        loc.longitude = data["longitude"]

    db.session.commit()
    data_out = loc.to_dict()
    data_out["assigned_oa"] = loc.assigned_oa.to_dict() if loc.assigned_oa else None
    return jsonify({"message": "Location updated.", "location": data_out}), 200


# ── DELETE /api/locations/:id ─────────────────────────────────────────────────

@location_bp.route("/<int:location_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_location(location_id):
    current_user = get_current_user()
    loc = OutreachLocation.query.get(location_id)
    if not loc:
        return jsonify({"error": "Location not found."}), 404

    if loc.visit_logs:
        force = request.args.get("force", "false").lower() == "true"
        if not force:
            return jsonify({
                "error": f"Location has {len(loc.visit_logs)} visit log(s). Use ?force=true to delete with all logs.",
                "visit_count": len(loc.visit_logs),
            }), 409

    name = loc.location_name
    db.session.delete(loc)
    db.session.add(AuditLog(
        user_id     = current_user.id,
        action_type = "DELETE",
        entity_type = "location",
        entity_id   = location_id,
        description = f"Deleted location '{name}'.",
    ))
    db.session.commit()
    return jsonify({"message": f"Location '{name}' deleted."}), 200
