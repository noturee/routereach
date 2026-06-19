"""
OutreachRoute Pro — Authentication Routes

Handles user login, registration, profile retrieval, and logout.
All routes except /login and /register require a valid JWT token.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from datetime import datetime, timezone
from extensions import db
from models.user import User
from models.audit_log import AuditLog
from utils.validators import validate_email, validate_password

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and return a JWT access token.
    POST /api/auth/login
    Body: { email, password }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    if not user.is_active:
        return jsonify({"error": "Your account has been deactivated. Contact your administrator."}), 403

    # Create JWT access + refresh tokens
    claims = {"role": user.role, "email": user.email}
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)

    # Log the login event
    log = AuditLog(
        user_id=user.id,
        action_type="LOGIN",
        entity_type="user",
        entity_id=user.id,
        description=f"User {user.email} logged in.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user account.
    POST /api/auth/register
    Body: { first_name, last_name, email, password, role?, organization_name? }

    Note: In production, registration of admin roles should be gated behind an
    existing admin invitation. This endpoint is open for the initial setup only.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "oa_user")
    organization_name = (data.get("organization_name") or "").strip()

    # Validate required fields
    if not all([first_name, last_name, email, password]):
        return jsonify({"error": "First name, last name, email, and password are required."}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid email address."}), 400

    password_error = validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    # Check for existing user
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    # Validate role
    from utils.constants import USER_ROLES
    if role not in USER_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(USER_ROLES)}"}), 400

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        role=role,
        organization_name=organization_name or None,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    return jsonify({
        "message": "Account created successfully.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 201


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """
    Return the currently authenticated user's profile.
    GET /api/auth/me
    Requires: Bearer token
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({"error": "User not found."}), 404

    if not user.is_active:
        return jsonify({"error": "Account has been deactivated."}), 403

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """
    Log the current user out and record the audit event.
    POST /api/auth/logout
    Requires: Bearer token

    Note: JWT tokens are stateless. True token revocation requires a blocklist.
    The client should discard the token on logout.
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if user:
        log = AuditLog(
            user_id=user.id,
            action_type="LOGOUT",
            entity_type="user",
            entity_id=user.id,
            description=f"User {user.email} logged out.",
        )
        db.session.add(log)
        db.session.commit()

    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Issue a new access token using a valid refresh token.
    POST /api/auth/refresh
    Requires: Bearer <refresh_token> in Authorization header
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user or not user.is_active:
        return jsonify({"error": "User not found or deactivated."}), 401

    claims = {"role": user.role, "email": user.email}
    new_access_token = create_access_token(identity=str(user.id), additional_claims=claims)

    return jsonify({"access_token": new_access_token}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """
    Change the current user's password.
    POST /api/auth/change-password
    Body: { current_password, new_password }
    Requires: Bearer token
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password are required."}), 400

    if not user.check_password(current_password):
        return jsonify({"error": "Current password is incorrect."}), 400

    password_error = validate_password(new_password)
    if password_error:
        return jsonify({"error": password_error}), 400

    if current_password == new_password:
        return jsonify({"error": "New password must be different from the current password."}), 400

    user.set_password(new_password)

    log = AuditLog(
        user_id=user.id,
        action_type="CHANGE_PASSWORD",
        entity_type="user",
        entity_id=user.id,
        description=f"User {user.email} changed their password.",
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Password changed successfully."}), 200
