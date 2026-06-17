"""
OutreachRoute Pro — SMS Service

Sends SMS messages via Twilio.
Always includes opt-out language per compliance requirements.
Never hardcode Twilio credentials — use environment variables only.
"""

from flask import current_app

# Required opt-out footer for all SMS messages (compliance)
SMS_OPT_OUT_FOOTER = " Reply STOP to opt out."


def send_sms(to_phone: str, message_body: str) -> dict:
    """
    Send an SMS via Twilio.
    Automatically appends opt-out language.
    Returns {'success': True, 'sid': str} or {'success': False, 'error': str}.
    Phase 13 — placeholder for now.
    """
    if not to_phone:
        return {"success": False, "error": "Phone number is required."}

    # Always append opt-out language
    full_body = message_body.strip() + SMS_OPT_OUT_FOOTER

    # TODO Phase 13: implement Twilio integration
    return {"success": False, "error": "Twilio SMS integration coming in Phase 13."}
