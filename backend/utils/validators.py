"""
OutreachRoute Pro — Input Validators

Validation functions for user-submitted data.
Used in route handlers to reject bad input early.
"""

import re


def validate_email(email: str) -> bool:
    """Return True if email matches a basic valid format."""
    if not email or len(email) > 255:
        return False
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email.strip()))


def validate_password(password: str) -> str | None:
    """
    Return an error message string if the password is invalid,
    or None if the password is acceptable.

    Rules:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if not password:
        return "Password is required."
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    return None


def validate_phone(phone: str) -> bool:
    """Return True if phone number contains 10–15 digits (allows +, -, spaces, parens)."""
    if not phone:
        return True  # Phone is optional
    digits = re.sub(r"[^\d]", "", phone)
    return 10 <= len(digits) <= 15


def validate_zip_code(zip_code: str) -> bool:
    """Return True if ZIP code is 5 digits (US) or 5+4 format."""
    if not zip_code:
        return True
    return bool(re.match(r"^\d{5}(-\d{4})?$", zip_code.strip()))


def validate_date_string(date_str: str) -> bool:
    """Return True if the string is a valid ISO date (YYYY-MM-DD)."""
    if not date_str:
        return True
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", date_str.strip()))
