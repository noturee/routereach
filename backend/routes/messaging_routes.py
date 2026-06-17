"""Messaging routes — Phase 12."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

messaging_bp = Blueprint("messaging", __name__)


@messaging_bp.route("/messages", methods=["GET"])
@jwt_required()
def get_messages():
    return jsonify({"message": "Messaging coming in Phase 12.", "messages": []}), 200


@messaging_bp.route("/messages/applicant/<int:applicant_id>", methods=["GET"])
@jwt_required()
def get_applicant_messages(applicant_id):
    return jsonify({"message": "Coming in Phase 12.", "messages": []}), 200


@messaging_bp.route("/messages/send-email", methods=["POST"])
@jwt_required()
def send_email():
    return jsonify({"message": "Coming in Phase 12/13."}), 501


@messaging_bp.route("/messages/send-text", methods=["POST"])
@jwt_required()
def send_text():
    return jsonify({"message": "Coming in Phase 12/13."}), 501


@messaging_bp.route("/messages/send-both", methods=["POST"])
@jwt_required()
def send_both():
    return jsonify({"message": "Coming in Phase 12/13."}), 501


@messaging_bp.route("/message-templates", methods=["GET"])
@jwt_required()
def get_templates():
    return jsonify({"message": "Coming in Phase 12.", "templates": []}), 200


@messaging_bp.route("/message-templates", methods=["POST"])
@jwt_required()
def create_template():
    return jsonify({"message": "Coming in Phase 12."}), 501


@messaging_bp.route("/message-templates/<int:template_id>", methods=["PUT"])
@jwt_required()
def update_template(template_id):
    return jsonify({"message": "Coming in Phase 12."}), 501


@messaging_bp.route("/message-templates/<int:template_id>", methods=["DELETE"])
@jwt_required()
def delete_template(template_id):
    return jsonify({"message": "Coming in Phase 12."}), 501
