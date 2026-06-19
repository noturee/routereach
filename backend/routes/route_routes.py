"""
OutreachRoute Pro — Route Planner Routes

Full CRUD for outreach routes and their ordered stops.
"""

from datetime import datetime, timezone, date as date_type, time as time_type
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models.route import Route, RouteStop
from models.outreach_location import OutreachLocation
from models.audit_log import AuditLog

route_bp = Blueprint("routes", __name__)

ROUTE_STATUSES = {"planned", "in_progress", "completed", "cancelled"}


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


@route_bp.route("", methods=["GET"])
@jwt_required()
def get_routes():
    """List routes. OA users see their own; admins see all."""
    claims = get_jwt()
    role = claims.get("role", "")
    user_id = int(get_jwt_identity())

    q = Route.query
    if role == "oa_user":
        q = q.filter_by(oa_user_id=user_id)

    status = request.args.get("status")
    if status:
        q = q.filter(Route.status == status)

    routes = q.order_by(Route.route_date.desc()).all()
    return jsonify({"routes": [r.to_dict() for r in routes], "total": len(routes)}), 200


@route_bp.route("/<int:route_id>", methods=["GET"])
@jwt_required()
def get_route(route_id):
    route = Route.query.get_or_404(route_id)
    return jsonify({"route": route.to_dict()}), 200


@route_bp.route("", methods=["POST"])
@jwt_required()
def create_route():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    required = ["route_name", "route_date"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Required fields missing: {', '.join(missing)}"}), 400

    status = data.get("status", "planned")
    if status not in ROUTE_STATUSES:
        return jsonify({"error": f"Invalid status."}), 400

    route = Route(
        route_name=data["route_name"],
        oa_user_id=data.get("oa_user_id", user_id),
        route_date=_parse_date(data["route_date"]),
        starting_address=data.get("starting_address"),
        state=data.get("state"),
        county=data.get("county"),
        city=data.get("city"),
        zip_code=data.get("zip_code"),
        status=status,
        notes=data.get("notes"),
    )
    db.session.add(route)
    db.session.flush()

    # Add stops if provided
    for idx, stop_data in enumerate(data.get("stops", []), start=1):
        loc_id = stop_data.get("outreach_location_id")
        if loc_id and OutreachLocation.query.get(loc_id):
            stop = RouteStop(
                route_id=route.id,
                outreach_location_id=loc_id,
                stop_order=stop_data.get("stop_order", idx),
                estimated_arrival_time=_parse_time(stop_data.get("estimated_arrival_time")),
                notes=stop_data.get("notes"),
            )
            db.session.add(stop)

    db.session.add(AuditLog(
        user_id=user_id, action_type="CREATE", entity_type="route",
        entity_id=route.id, description=f"Created route '{route.route_name}'"
    ))
    db.session.commit()
    return jsonify({"message": "Route created.", "route": route.to_dict()}), 201


@route_bp.route("/<int:route_id>", methods=["PUT"])
@jwt_required()
def update_route(route_id):
    user_id = int(get_jwt_identity())
    route = Route.query.get_or_404(route_id)
    data = request.get_json() or {}

    for field in ("route_name", "starting_address", "state", "county", "city", "zip_code", "notes"):
        if field in data:
            setattr(route, field, data[field])
    if "route_date" in data:
        route.route_date = _parse_date(data["route_date"])
    if "status" in data:
        if data["status"] not in ROUTE_STATUSES:
            return jsonify({"error": "Invalid status."}), 400
        route.status = data["status"]

    db.session.add(AuditLog(
        user_id=user_id, action_type="UPDATE", entity_type="route",
        entity_id=route.id, description=f"Updated route '{route.route_name}'"
    ))
    db.session.commit()
    return jsonify({"message": "Route updated.", "route": route.to_dict()}), 200


@route_bp.route("/<int:route_id>", methods=["DELETE"])
@jwt_required()
def delete_route(route_id):
    user_id = int(get_jwt_identity())
    route = Route.query.get_or_404(route_id)
    db.session.add(AuditLog(
        user_id=user_id, action_type="DELETE", entity_type="route",
        entity_id=route.id, description=f"Deleted route '{route.route_name}'"
    ))
    db.session.delete(route)
    db.session.commit()
    return jsonify({"message": "Route deleted."}), 200


@route_bp.route("/<int:route_id>/stops", methods=["POST"])
@jwt_required()
def add_stop(route_id):
    user_id = int(get_jwt_identity())
    route = Route.query.get_or_404(route_id)
    data = request.get_json() or {}

    loc_id = data.get("outreach_location_id")
    if not loc_id:
        return jsonify({"error": "outreach_location_id is required."}), 400
    if not OutreachLocation.query.get(loc_id):
        return jsonify({"error": "Location not found."}), 404

    max_order = db.session.query(db.func.max(RouteStop.stop_order)).filter_by(route_id=route.id).scalar() or 0
    stop = RouteStop(
        route_id=route.id,
        outreach_location_id=loc_id,
        stop_order=data.get("stop_order", max_order + 1),
        estimated_arrival_time=_parse_time(data.get("estimated_arrival_time")),
        notes=data.get("notes"),
    )
    db.session.add(stop)
    db.session.commit()
    return jsonify({"message": "Stop added.", "stop": stop.to_dict()}), 201


@route_bp.route("/<int:route_id>/stops/<int:stop_id>", methods=["DELETE"])
@jwt_required()
def remove_stop(route_id, stop_id):
    stop = RouteStop.query.filter_by(id=stop_id, route_id=route_id).first_or_404()
    db.session.delete(stop)
    db.session.commit()
    return jsonify({"message": "Stop removed."}), 200


@route_bp.route("/<int:route_id>/stops/reorder", methods=["PUT"])
@jwt_required()
def reorder_stops(route_id):
    """Body: {"order": [{"stop_id": 1, "stop_order": 1}, ...]}"""
    Route.query.get_or_404(route_id)
    data = request.get_json() or {}
    for item in data.get("order", []):
        stop = RouteStop.query.filter_by(id=item["stop_id"], route_id=route_id).first()
        if stop:
            stop.stop_order = item["stop_order"]
    db.session.commit()
    route = Route.query.get(route_id)
    return jsonify({"message": "Stops reordered.", "route": route.to_dict()}), 200


@route_bp.route("/<int:route_id>/stops/<int:stop_id>/complete", methods=["PUT"])
@jwt_required()
def complete_stop(route_id, stop_id):
    stop = RouteStop.query.filter_by(id=stop_id, route_id=route_id).first_or_404()
    stop.completed = True
    stop.completed_at = datetime.now(timezone.utc)
    data = request.get_json() or {}
    if data.get("notes"):
        stop.notes = data["notes"]
    db.session.commit()
    return jsonify({"message": "Stop marked complete.", "stop": stop.to_dict()}), 200


@route_bp.route("/<int:route_id>/complete", methods=["PUT"])
@jwt_required()
def complete_route(route_id):
    user_id = int(get_jwt_identity())
    route = Route.query.get_or_404(route_id)
    route.status = "completed"
    db.session.add(AuditLog(
        user_id=user_id, action_type="UPDATE", entity_type="route",
        entity_id=route.id, description=f"Completed route '{route.route_name}'"
    ))
    db.session.commit()
    return jsonify({"message": "Route completed.", "route": route.to_dict()}), 200
