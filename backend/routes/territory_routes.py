"""
OutreachRoute Pro — Territory Management Routes

Manages geographic territories and their user assignments.
Territories define the geographic scope for OA users.
All routes require JWT authentication. Write operations require admin role.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.territory import Territory, UserTerritory
from models.user import User
from models.audit_log import AuditLog
from utils.decorators import admin_required
from utils.constants import US_REGIONS, US_STATES

territory_bp = Blueprint("territories", __name__)

TERRITORY_TYPES = ["national", "regional", "state", "county", "city", "zip"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def territory_with_users(territory: Territory) -> dict:
    """Return territory dict with its list of assigned users."""
    data = territory.to_dict()
    assigned = UserTerritory.query.filter_by(territory_id=territory.id).all()
    data["assigned_users"] = []
    for ut in assigned:
        user = User.query.get(ut.user_id)
        if user:
            data["assigned_users"].append({
                "user_territory_id": ut.id,
                "user_id": user.id,
                "full_name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            })
    data["assigned_user_count"] = len(data["assigned_users"])
    return data


# ── GET /api/territories ──────────────────────────────────────────────────────

@territory_bp.route("", methods=["GET"])
@jwt_required()
def get_territories():
    """
    List all territories.
    GET /api/territories
    Query params: type, state, region, search
    """
    type_filter = request.args.get("type")
    state_filter = request.args.get("state")
    region_filter = request.args.get("region")
    search = request.args.get("search", "").strip()

    query = Territory.query

    if type_filter:
        query = query.filter_by(territory_type=type_filter)
    if state_filter:
        query = query.filter_by(state=state_filter)
    if region_filter:
        query = query.filter_by(region=region_filter)
    if search:
        query = query.filter(Territory.territory_name.ilike(f"%{search}%"))

    territories = query.order_by(Territory.territory_name).all()

    result = []
    for t in territories:
        data = t.to_dict()
        data["assigned_user_count"] = UserTerritory.query.filter_by(territory_id=t.id).count()
        result.append(data)

    return jsonify({"territories": result, "total": len(result)}), 200


# ── GET /api/territories/:id ──────────────────────────────────────────────────

@territory_bp.route("/<int:territory_id>", methods=["GET"])
@jwt_required()
def get_territory(territory_id):
    """
    Get a single territory with its assigned users.
    GET /api/territories/:id
    """
    territory = Territory.query.get(territory_id)
    if not territory:
        return jsonify({"error": "Territory not found."}), 404

    return jsonify({"territory": territory_with_users(territory)}), 200


# ── POST /api/territories ─────────────────────────────────────────────────────

@territory_bp.route("", methods=["POST"])
@jwt_required()
@admin_required
def create_territory():
    """
    Create a new territory. Admin only.
    POST /api/territories
    Body: { territory_name, territory_type, region?, state?, county?, city?, zip_code? }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    territory_name = (data.get("territory_name") or "").strip()
    territory_type = data.get("territory_type", "county")

    if not territory_name:
        return jsonify({"error": "Territory name is required."}), 400

    if territory_type not in TERRITORY_TYPES:
        return jsonify({"error": f"Invalid territory type. Must be one of: {', '.join(TERRITORY_TYPES)}"}), 400

    # Duplicate check
    existing = Territory.query.filter(
        Territory.territory_name.ilike(territory_name),
        Territory.territory_type == territory_type,
    ).first()
    if existing:
        return jsonify({"error": "A territory with this name and type already exists."}), 409

    current_user_id = int(get_jwt_identity())

    territory = Territory(
        territory_name=territory_name,
        territory_type=territory_type,
        country=data.get("country", "United States"),
        region=(data.get("region") or "").strip() or None,
        state=(data.get("state") or "").strip() or None,
        county=(data.get("county") or "").strip() or None,
        city=(data.get("city") or "").strip() or None,
        zip_code=(data.get("zip_code") or "").strip() or None,
        created_by_user_id=current_user_id,
    )
    db.session.add(territory)
    db.session.flush()

    log = AuditLog(
        user_id=current_user_id,
        action_type="CREATE",
        entity_type="territory",
        entity_id=territory.id,
        description=f"Created territory '{territory_name}' [{territory_type}].",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Territory created.", "territory": territory_with_users(territory)}), 201


# ── PUT /api/territories/:id ──────────────────────────────────────────────────

@territory_bp.route("/<int:territory_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_territory(territory_id):
    """
    Update a territory. Admin only.
    PUT /api/territories/:id
    """
    territory = Territory.query.get(territory_id)
    if not territory:
        return jsonify({"error": "Territory not found."}), 404

    data = request.get_json() or {}
    current_user_id = int(get_jwt_identity())

    if data.get("territory_name"):
        territory.territory_name = data["territory_name"].strip()
    if data.get("territory_type") and data["territory_type"] in TERRITORY_TYPES:
        territory.territory_type = data["territory_type"]
    if "region" in data:
        territory.region = data["region"].strip() or None
    if "state" in data:
        territory.state = data["state"].strip() or None
    if "county" in data:
        territory.county = data["county"].strip() or None
    if "city" in data:
        territory.city = data["city"].strip() or None
    if "zip_code" in data:
        territory.zip_code = data["zip_code"].strip() or None

    log = AuditLog(
        user_id=current_user_id,
        action_type="UPDATE",
        entity_type="territory",
        entity_id=territory_id,
        description=f"Updated territory '{territory.territory_name}'.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Territory updated.", "territory": territory_with_users(territory)}), 200


# ── DELETE /api/territories/:id ───────────────────────────────────────────────

@territory_bp.route("/<int:territory_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_territory(territory_id):
    """
    Delete a territory. Admin only.
    DELETE /api/territories/:id
    Fails if the territory has assigned users unless ?force=true.
    """
    territory = Territory.query.get(territory_id)
    if not territory:
        return jsonify({"error": "Territory not found."}), 404

    force = request.args.get("force", "false").lower() == "true"
    assigned_count = UserTerritory.query.filter_by(territory_id=territory_id).count()

    if assigned_count > 0 and not force:
        return jsonify({
            "error": f"Territory has {assigned_count} assigned user(s). Remove all users first, or use ?force=true.",
            "assigned_count": assigned_count,
        }), 409

    current_user_id = int(get_jwt_identity())
    name = territory.territory_name

    db.session.delete(territory)
    log = AuditLog(
        user_id=current_user_id,
        action_type="DELETE",
        entity_type="territory",
        entity_id=territory_id,
        description=f"Deleted territory '{name}'.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": f"Territory '{name}' deleted."}), 200


# ── POST /api/territories/assign-user ────────────────────────────────────────

@territory_bp.route("/assign-user", methods=["POST"])
@jwt_required()
@admin_required
def assign_user():
    """
    Assign a user to a territory. Admin only.
    POST /api/territories/assign-user
    Body: { user_id, territory_id }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    user_id = data.get("user_id")
    territory_id = data.get("territory_id")

    if not user_id or not territory_id:
        return jsonify({"error": "user_id and territory_id are required."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    territory = Territory.query.get(territory_id)
    if not territory:
        return jsonify({"error": "Territory not found."}), 404

    existing = UserTerritory.query.filter_by(
        user_id=user_id, territory_id=territory_id
    ).first()
    if existing:
        return jsonify({"error": "User is already assigned to this territory."}), 409

    current_user_id = int(get_jwt_identity())

    ut = UserTerritory(user_id=user_id, territory_id=territory_id)
    db.session.add(ut)

    log = AuditLog(
        user_id=current_user_id,
        action_type="ASSIGN_TERRITORY",
        entity_type="user_territory",
        entity_id=territory_id,
        description=f"Assigned user {user.email} to territory '{territory.territory_name}'.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "message": f"{user.first_name} {user.last_name} assigned to '{territory.territory_name}'.",
        "user_territory": ut.to_dict(),
    }), 201


# ── DELETE /api/territories/:id/users/:user_id ────────────────────────────────

@territory_bp.route("/<int:territory_id>/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def unassign_user(territory_id, user_id):
    """
    Remove a user from a territory. Admin only.
    DELETE /api/territories/:id/users/:user_id
    """
    ut = UserTerritory.query.filter_by(
        territory_id=territory_id, user_id=user_id
    ).first()
    if not ut:
        return jsonify({"error": "Assignment not found."}), 404

    current_user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    territory = Territory.query.get(territory_id)

    db.session.delete(ut)
    log = AuditLog(
        user_id=current_user_id,
        action_type="UNASSIGN_TERRITORY",
        entity_type="user_territory",
        entity_id=territory_id,
        description=f"Removed user {user.email if user else user_id} from territory '{territory.territory_name if territory else territory_id}'.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "User removed from territory."}), 200


# ── GET /api/territories/my ───────────────────────────────────────────────────

@territory_bp.route("/my", methods=["GET"])
@jwt_required()
def get_my_territories():
    """
    Return territories assigned to the current user.
    GET /api/territories/my
    """
    user_id = int(get_jwt_identity())
    assignments = UserTerritory.query.filter_by(user_id=user_id).all()
    territories = [a.territory.to_dict() for a in assignments if a.territory]
    return jsonify({"territories": territories, "total": len(territories)}), 200
