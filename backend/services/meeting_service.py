"""Meeting service helpers."""

from datetime import datetime
from extensions import db
from models.meeting import Meeting
from models.applicant import Applicant
from services.email_service import send_email


def _parse_date(val):
    if not val:
        return None
    if hasattr(val, "year") and hasattr(val, "month") and hasattr(val, "day") and not isinstance(val, str):
        return val
    return datetime.strptime(val, "%Y-%m-%d").date()


def _parse_time(val):
    if not val:
        return None
    if hasattr(val, "hour") and hasattr(val, "minute") and not isinstance(val, str):
        return val
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(val, fmt).time()
        except ValueError:
            continue
    return None


def create_meeting(data: dict, oa_user_id: int):
    """Create a meeting record and optionally send confirmation."""
    applicant = Applicant.query.get(data.get("applicant_id"))
    if not applicant:
        raise ValueError("Applicant not found")

    meeting = Meeting(
        applicant_id=applicant.id,
        oa_user_id=data.get("oa_user_id") or oa_user_id,
        meeting_title=data.get("meeting_title") or "Meeting",
        meeting_type=data.get("meeting_type"),
        meeting_date=_parse_date(data.get("meeting_date")),
        meeting_time=_parse_time(data.get("meeting_time")),
        timezone=data.get("timezone"),
        meeting_link=data.get("meeting_link"),
        platform=data.get("platform"),
        status=data.get("status") or "scheduled",
        notes=data.get("notes"),
    )
    db.session.add(meeting)
    db.session.commit()

    try:
        send_meeting_confirmation(meeting.id)
    except Exception:
        # Do not fail create flow if notifications are not configured.
        pass

    return meeting


def send_meeting_confirmation(meeting_id: int):
    """Send meeting confirmation to the applicant."""
    meeting = Meeting.query.get(meeting_id)
    if not meeting:
        return {"success": False, "error": "Meeting not found"}
    applicant = meeting.applicant
    if not applicant or not applicant.email:
        return {"success": False, "error": "Applicant email is missing"}

    subject = f"Meeting Confirmation: {meeting.meeting_title}"
    date_str = meeting.meeting_date.isoformat() if meeting.meeting_date else "TBD"
    time_str = meeting.meeting_time.strftime("%H:%M") if meeting.meeting_time else "TBD"
    body = (
        f"Hello {applicant.first_name},\n\n"
        f"Your meeting is scheduled for {date_str} at {time_str}"
        f" ({meeting.timezone or 'UTC'}).\n"
        f"Link: {meeting.meeting_link or 'N/A'}\n\n"
        "Thank you."
    )
    return send_email(applicant.email, subject, body)


def send_meeting_reminder(meeting_id: int):
    """Send meeting reminder to the applicant."""
    meeting = Meeting.query.get(meeting_id)
    if not meeting:
        return {"success": False, "error": "Meeting not found"}
    applicant = meeting.applicant
    if not applicant or not applicant.email:
        return {"success": False, "error": "Applicant email is missing"}

    subject = f"Reminder: {meeting.meeting_title}"
    date_str = meeting.meeting_date.isoformat() if meeting.meeting_date else "TBD"
    time_str = meeting.meeting_time.strftime("%H:%M") if meeting.meeting_time else "TBD"
    body = (
        f"Hello {applicant.first_name},\n\n"
        f"Reminder for your upcoming meeting on {date_str} at {time_str}"
        f" ({meeting.timezone or 'UTC'}).\n"
        f"Link: {meeting.meeting_link or 'N/A'}\n\n"
        "See you then."
    )
    return send_email(applicant.email, subject, body)
