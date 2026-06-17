"""
OutreachRoute Pro — Route Decorators

Custom decorators for role-based access control on API endpoints.
Usage:
    @jwt_required()
    @admin_required
    def my_route():
        ...
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from models.user import User

# Roles that are considered admin-level
ADMIN_ROLES = {"master_admin", "national_admin", "regional_admin", "state_admin", "local_admin"}


def admin_required(fn):
    """Restrict endpoint to admin-level roles only."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        role = claims.get("role", "")
        if role not in ADMIN_ROLES:
            return jsonify({"error": "Admin access required."}), 403
        return fn(*args, **kwargs)
    return wrapper


def master_admin_required(fn):
    """Restrict endpoint to master_admin role only."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        role = claims.get("role", "")
        if role != "master_admin":
            return jsonify({"error": "Master admin access required."}), 403
        return fn(*args, **kwargs)
    return wrapper


def role_required(*allowed_roles):
    """
    Restrict endpoint to one or more specific roles.
    Usage: @role_required("master_admin", "national_admin")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            role = claims.get("role", "")
            if role not in allowed_roles:
                return jsonify({"error": "Access denied. Insufficient role."}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def active_user_required(fn):
    """Ensure the authenticated user account is still active."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({"error": "Your account has been deactivated."}), 403
        return fn(*args, **kwargs)
    return wrapper
