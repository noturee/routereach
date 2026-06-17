"""Meeting routes — Phase 14."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

meeting_bp = Blueprint("meetings", __name__)


@meeting_bp.route("", methods=["GET"])
@jwt_required()
def get_meetings():
    return jsonify({"message": "Meeting routes coming in Phase 14.", "meetings": []}), 200


@meeting_bp.route("/applicant/<int:applicant_id>", methods=["GET"])
@jwt_required()
def get_applicant_meetings(applicant_id):
    return jsonify({"message": "Coming in Phase 14.", "meetings": []}), 200


@meeting_bp.route("", methods=["POST"])
@jwt_required()
def create_meeting():
    return jsonify({"message": "Coming in Phase 14."}), 501


@meeting_bp.route("/<int:meeting_id>", methods=["PUT"])
@jwt_required()
def update_meeting(meeting_id):
    return jsonify({"message": "Coming in Phase 14."}), 501


@meeting_bp.route("/<int:meeting_id>", methods=["DELETE"])
@jwt_required()
def delete_meeting(meeting_id):
    return jsonify({"message": "Coming in Phase 14."}), 501


@meeting_bp.route("/<int:meeting_id>/send-confirmation", methods=["POST"])
@jwt_required()
def send_confirmation(meeting_id):
    return jsonify({"message": "Coming in Phase 14."}), 501


@meeting_bp.route("/<int:meeting_id>/send-reminder", methods=["POST"])
@jwt_required()
def send_reminder(meeting_id):
    return jsonify({"message": "Coming in Phase 14."}), 501
