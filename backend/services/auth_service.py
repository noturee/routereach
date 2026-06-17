"""
OutreachRoute Pro — Auth Service

Business logic for authentication operations.
Separated from route handlers to keep routes thin and logic testable.
"""

from models.user import User
from extensions import db


def get_user_by_email(email: str):
    """Return a User by email address (case-insensitive)."""
    return User.query.filter_by(email=email.strip().lower()).first()


def get_user_by_id(user_id: int):
    """Return a User by primary key."""
    return User.query.get(user_id)
