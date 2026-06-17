"""Performance routes — Phase 15."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

performance_bp = Blueprint("performance", __name__)


@performance_bp.route("/my-numbers", methods=["GET"])
@jwt_required()
def my_numbers():
    return jsonify({"message": "My Numbers coming in Phase 15."}), 200


@performance_bp.route("/team", methods=["GET"])
@jwt_required()
def team():
    return jsonify({"message": "Team performance coming in Phase 18.", "team": []}), 200


@performance_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
def user_performance(user_id):
    return jsonify({"message": "Coming in Phase 15."}), 501


@performance_bp.route("/conversion-rates", methods=["GET"])
@jwt_required()
def conversion_rates():
    return jsonify({"message": "Coming in Phase 15."}), 501


@performance_bp.route("/outreach-impact", methods=["GET"])
@jwt_required()
def outreach_impact():
    return jsonify({"message": "Coming in Phase 15."}), 501
