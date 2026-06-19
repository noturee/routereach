"""Case note service helpers."""

from extensions import db
from models.case_note import CaseNote


_TRIGGER_TO_TYPE = {
    "status_change": "Status Update",
    "message_sent": "Communication",
    "meeting_scheduled": "Meeting",
    "meeting_completed": "Meeting",
    "meeting_no_show": "Meeting",
    "document_updated": "Documents",
    "application_complete": "Application",
    "application_withdrawn": "Application",
    "application_closed": "Application",
    "campus_referral": "Referral",
}


def create_auto_case_note(applicant_id: int, user_id: int, trigger: str, context: dict = None):
    """
    Auto-generate a case note when a system event occurs.
    
    Trigger values include status/message/meeting/document/application events.
    """
    context = context or {}
    note_type = _TRIGGER_TO_TYPE.get(trigger, "System")

    trigger_reason = context.get("reason") or trigger.replace("_", " ").title()
    action = context.get("action") or context.get("message") or "System event processed"
    plan = context.get("plan") or "Continue follow-up per workflow"

    note_body = build_rap_note(trigger_reason, action, plan)

    note = CaseNote(
        applicant_id=applicant_id,
        user_id=user_id,
        note_type=note_type,
        reason=trigger_reason,
        action=action,
        plan=plan,
        note_body=note_body,
        auto_generated=True,
    )
    db.session.add(note)
    db.session.commit()
    return note


def build_rap_note(reason: str, action: str, plan: str) -> str:
    """Compose a formatted Reason/Action/Plan note body."""
    parts = []
    if reason:
        parts.append(f"Reason: {reason}")
    if action:
        parts.append(f"\nAction: {action}")
    if plan:
        parts.append(f"\nPlan: {plan}")
    return "\n".join(parts)
