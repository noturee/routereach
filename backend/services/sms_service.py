"""
OutreachRoute Pro — SMS Service

Sends SMS messages via Twilio.
Always includes opt-out language per compliance requirements.
Never hardcode Twilio credentials — use environment variables only.
"""

from flask import current_app
import os
from twilio.rest import Client

# Required opt-out footer for all SMS messages (compliance)
SMS_OPT_OUT_FOOTER = " Reply STOP to opt out."


def send_sms(to_phone: str, message_body: str) -> dict:
    """
    Send an SMS via Twilio.
    Automatically appends opt-out language.
    Returns {'success': True, 'sid': str} or {'success': False, 'error': str}.
    Sends with Twilio when configured.
    """
    if not to_phone:
        return {"success": False, "error": "Phone number is required."}

    # Always append opt-out language
    full_body = message_body.strip() + SMS_OPT_OUT_FOOTER

    account_sid = current_app.config.get("TWILIO_ACCOUNT_SID") or os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = current_app.config.get("TWILIO_AUTH_TOKEN") or os.getenv("TWILIO_AUTH_TOKEN")
    from_phone = (
        current_app.config.get("TWILIO_PHONE_NUMBER")
        or current_app.config.get("TWILIO_FROM_PHONE")
        or os.getenv("TWILIO_PHONE_NUMBER")
        or os.getenv("TWILIO_FROM_PHONE")
    )

    if not account_sid or not auth_token or not from_phone:
        return {"success": False, "error": "Twilio credentials are not configured."}

    try:
        client = Client(account_sid, auth_token)
        msg = client.messages.create(
            to=to_phone,
            from_=from_phone,
            body=full_body,
        )
        return {"success": True, "sid": msg.sid}
    except Exception as exc:
        return {"success": False, "error": f"Twilio send failed: {exc}"}
