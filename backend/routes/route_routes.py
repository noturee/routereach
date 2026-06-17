"""Route planner routes — Phase 11."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

route_bp = Blueprint("routes", __name__)


@route_bp.route("", methods=["GET"])
@jwt_required()
def get_routes():
    return jsonify({"message": "Route planner coming in Phase 11.", "routes": []}), 200


@route_bp.route("/<int:route_id>", methods=["GET"])
@jwt_required()
def get_route(route_id):
    return jsonify({"message": "Coming in Phase 11."}), 501


@route_bp.route("", methods=["POST"])
@jwt_required()
def create_route():
    return jsonify({"message": "Coming in Phase 11."}), 501


@route_bp.route("/<int:route_id>", methods=["PUT"])
@jwt_required()
def update_route(route_id):
    return jsonify({"message": "Coming in Phase 11."}), 501


@route_bp.route("/<int:route_id>", methods=["DELETE"])
@jwt_required()
def delete_route(route_id):
    return jsonify({"message": "Coming in Phase 11."}), 501


@route_bp.route("/<int:route_id>/stops", methods=["POST"])
@jwt_required()
def add_stop(route_id):
    return jsonify({"message": "Coming in Phase 11."}), 501


@route_bp.route("/<int:route_id>/stops/reorder", methods=["PUT"])
@jwt_required()
def reorder_stops(route_id):
    return jsonify({"message": "Coming in Phase 11."}), 501


@route_bp.route("/<int:route_id>/stops/<int:stop_id>/complete", methods=["PUT"])
@jwt_required()
def complete_stop(route_id, stop_id):
    return jsonify({"message": "Coming in Phase 11."}), 501
