"""
OutreachRoute Pro — User Management Routes

Admin endpoints to create, view, update, deactivate, and delete user accounts.
All routes require authentication. Most require admin role or higher.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.audit_log import AuditLog
from utils.decorators import admin_required
from utils.validators import validate_email, validate_password
from utils.constants import USER_ROLES

user_bp = Blueprint("users", __name__)


@user_bp.route("", methods=["GET"])
@jwt_required()
@admin_required
def get_users():
    """
    List all users. Admin only.
    GET /api/users
    Query params: role, is_active, state, search
    """
    role_filter = request.args.get("role")
    is_active = request.args.get("is_active")
    search = request.args.get("search", "").strip()

    query = User.query

    if role_filter:
        query = query.filter_by(role=role_filter)

    if is_active is not None:
        active_bool = is_active.lower() == "true"
        query = query.filter_by(is_active=active_bool)

    if search:
        query = query.filter(
            db.or_(
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    users = query.order_by(User.last_name, User.first_name).all()
    return jsonify({"users": [u.to_dict() for u in users], "total": len(users)}), 200


@user_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    """
    Get a single user by ID.
    GET /api/users/:id
    OA users may only view their own profile.
    """
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)

    if not current_user:
        return jsonify({"error": "Unauthorized."}), 401

    # Non-admins can only view themselves
    if current_user.role == "oa_user" and current_user_id != user_id:
        return jsonify({"error": "Access denied."}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    return jsonify({"user": user.to_dict()}), 200


@user_bp.route("", methods=["POST"])
@jwt_required()
@admin_required
def create_user():
    """
    Create a new user account. Admin only.
    POST /api/users
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "oa_user")

    if not all([first_name, last_name, email, password]):
        return jsonify({"error": "First name, last name, email, and password are required."}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid email address."}), 400

    password_error = validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    if role not in USER_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(USER_ROLES)}"}), 400

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=data.get("phone", "").strip() or None,
        role=role,
        organization_name=data.get("organization_name", "").strip() or None,
        assigned_region=data.get("assigned_region"),
        assigned_states=data.get("assigned_states"),
        assigned_counties=data.get("assigned_counties"),
        assigned_cities=data.get("assigned_cities"),
        assigned_zip_codes=data.get("assigned_zip_codes"),
    )
    user.set_password(password)

    creator_id = int(get_jwt_identity())
    db.session.add(user)
    db.session.flush()  # Get user.id before commit

    log = AuditLog(
        user_id=creator_id,
        action_type="CREATE",
        entity_type="user",
        entity_id=user.id,
        description=f"Created user account for {user.email} with role {role}.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "User created successfully.", "user": user.to_dict()}), 201


@user_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    """
    Update a user account.
    PUT /api/users/:id
    OA users may only update their own profile (limited fields).
    Admins can update any user and change roles.
    """
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)

    if not current_user:
        return jsonify({"error": "Unauthorized."}), 401

    is_admin = current_user.role not in ("oa_user",)

    if not is_admin and current_user_id != user_id:
        return jsonify({"error": "Access denied."}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json() or {}

    # Fields any user can update on their own profile
    if data.get("first_name"):
        user.first_name = data["first_name"].strip()
    if data.get("last_name"):
        user.last_name = data["last_name"].strip()
    if data.get("phone") is not None:
        user.phone = data["phone"].strip() or None

    # Admin-only fields
    if is_admin:
        if data.get("role") and data["role"] in USER_ROLES:
            user.role = data["role"]
        if data.get("organization_name") is not None:
            user.organization_name = data["organization_name"].strip() or None
        if data.get("assigned_region") is not None:
            user.assigned_region = data["assigned_region"]
        if data.get("assigned_states") is not None:
            user.assigned_states = data["assigned_states"]
        if data.get("assigned_counties") is not None:
            user.assigned_counties = data["assigned_counties"]
        if data.get("assigned_cities") is not None:
            user.assigned_cities = data["assigned_cities"]
        if data.get("assigned_zip_codes") is not None:
            user.assigned_zip_codes = data["assigned_zip_codes"]

    # Password change
    if data.get("password"):
        error = validate_password(data["password"])
        if error:
            return jsonify({"error": error}), 400
        user.set_password(data["password"])

    db.session.commit()
    return jsonify({"message": "User updated successfully.", "user": user.to_dict()}), 200


@user_bp.route("/<int:user_id>/deactivate", methods=["PUT"])
@jwt_required()
@admin_required
def deactivate_user(user_id):
    """
    Deactivate a user account. Admin only.
    PUT /api/users/:id/deactivate
    """
    current_user_id = int(get_jwt_identity())

    if current_user_id == user_id:
        return jsonify({"error": "You cannot deactivate your own account."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    user.is_active = False
    log = AuditLog(
        user_id=current_user_id,
        action_type="DEACTIVATE",
        entity_type="user",
        entity_id=user_id,
        description=f"Deactivated user account for {user.email}.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "User deactivated successfully."}), 200


@user_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_user(user_id):
    """
    Permanently delete a user account. Admin only.
    DELETE /api/users/:id
    Prefer deactivation over deletion to preserve audit history.
    """
    current_user_id = int(get_jwt_identity())

    if current_user_id == user_id:
        return jsonify({"error": "You cannot delete your own account."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    email = user.email
    db.session.delete(user)

    log = AuditLog(
        user_id=current_user_id,
        action_type="DELETE",
        entity_type="user",
        entity_id=user_id,
        description=f"Deleted user account for {email}.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "User deleted successfully."}), 200


@user_bp.route("/<int:user_id>/reactivate", methods=["PUT"])
@jwt_required()
@admin_required
def reactivate_user(user_id):
    """
    Reactivate a previously deactivated user account. Admin only.
    PUT /api/users/:id/reactivate
    """
    current_user_id = int(get_jwt_identity())

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    if user.is_active:
        return jsonify({"error": "User account is already active."}), 400

    user.is_active = True
    log = AuditLog(
        user_id=current_user_id,
        action_type="REACTIVATE",
        entity_type="user",
        entity_id=user_id,
        description=f"Reactivated user account for {user.email}.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "User reactivated successfully.", "user": user.to_dict()}), 200
