"""Case note service — Phase 6."""


def create_auto_case_note(applicant_id: int, user_id: int, trigger: str, context: dict = None):
    """
    Auto-generate a case note when a system event occurs.
    
    Trigger values: status_change | message_sent | meeting_scheduled |
                    meeting_completed | meeting_no_show | document_updated |
                    application_complete | application_withdrawn | application_closed |
                    campus_referral
    Phase 6.
    """
    raise NotImplementedError("Auto case note generation coming in Phase 6.")


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
