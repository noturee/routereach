"""
OutreachRoute Pro — Email Service

Sends emails via SendGrid or Amazon SES depending on EMAIL_PROVIDER env var.
Never hardcode API keys — all credentials come from environment variables.
"""

import os
from flask import current_app


def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> dict:
    """
    Send an email using the configured provider (SendGrid or SES).
    Returns {'success': True} or {'success': False, 'error': str}.
    Phase 13 — placeholder for now.
    """
    provider = current_app.config.get("EMAIL_PROVIDER", "sendgrid")

    if provider == "sendgrid":
        return _send_via_sendgrid(to_email, subject, body, html_body)
    elif provider == "ses":
        return _send_via_ses(to_email, subject, body, html_body)
    else:
        return {"success": False, "error": f"Unknown email provider: {provider}"}


def _send_via_sendgrid(to_email, subject, body, html_body=None):
    """Send via SendGrid. Implemented in Phase 13."""
    # TODO Phase 13: implement SendGrid integration
    return {"success": False, "error": "SendGrid integration coming in Phase 13."}


def _send_via_ses(to_email, subject, body, html_body=None):
    """Send via Amazon SES. Implemented in Phase 13."""
    # TODO Phase 13: implement Amazon SES integration
    return {"success": False, "error": "SES integration coming in Phase 13."}
