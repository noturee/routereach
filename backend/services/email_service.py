"""
OutreachRoute Pro — Email Service

Sends emails via SendGrid or Amazon SES depending on EMAIL_PROVIDER env var.
Never hardcode API keys — all credentials come from environment variables.
"""

import os
from flask import current_app
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import boto3
from botocore.exceptions import BotoCoreError, ClientError


def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> dict:
    """
    Send an email using the configured provider (SendGrid or SES).
    Returns {'success': True} or {'success': False, 'error': str}.
    Uses configured provider and returns a consistent success/error payload.
    """
    provider = current_app.config.get("EMAIL_PROVIDER", "sendgrid")

    if provider == "sendgrid":
        return _send_via_sendgrid(to_email, subject, body, html_body)
    elif provider == "ses":
        return _send_via_ses(to_email, subject, body, html_body)
    else:
        return {"success": False, "error": f"Unknown email provider: {provider}"}


def _send_via_sendgrid(to_email, subject, body, html_body=None):
    """Send via SendGrid."""
    api_key = current_app.config.get("SENDGRID_API_KEY") or os.getenv("SENDGRID_API_KEY")
    from_email = (
        current_app.config.get("FROM_EMAIL")
        or current_app.config.get("EMAIL_FROM")
        or os.getenv("FROM_EMAIL")
        or os.getenv("EMAIL_FROM")
    )
    if not api_key:
        return {"success": False, "error": "SendGrid API key is not configured."}
    if not from_email:
        return {"success": False, "error": "EMAIL_FROM is not configured."}

    try:
        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            plain_text_content=body,
            html_content=html_body or body,
        )
        response = SendGridAPIClient(api_key).send(message)
        if 200 <= response.status_code < 300:
            return {"success": True, "provider": "sendgrid", "status_code": response.status_code}
        return {"success": False, "error": f"SendGrid returned status {response.status_code}."}
    except Exception as exc:
        return {"success": False, "error": f"SendGrid send failed: {exc}"}


def _send_via_ses(to_email, subject, body, html_body=None):
    """Send via Amazon SES."""
    from_email = (
        current_app.config.get("FROM_EMAIL")
        or current_app.config.get("EMAIL_FROM")
        or os.getenv("FROM_EMAIL")
        or os.getenv("EMAIL_FROM")
    )
    region = current_app.config.get("AWS_REGION") or os.getenv("AWS_REGION") or "us-east-1"
    if not from_email:
        return {"success": False, "error": "EMAIL_FROM is not configured."}

    try:
        ses = boto3.client("ses", region_name=region)
        response = ses.send_email(
            Source=from_email,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {
                    "Text": {"Data": body},
                    "Html": {"Data": html_body or body},
                },
            },
        )
        return {"success": True, "provider": "ses", "message_id": response.get("MessageId")}
    except (BotoCoreError, ClientError, Exception) as exc:
        return {"success": False, "error": f"SES send failed: {exc}"}
