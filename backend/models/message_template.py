"""
OutreachRoute Pro — Message Template Model

Reusable message templates with merge tags for personalization.
Merge tags: [Applicant First Name], [OA Name], [Missing Documents], etc.
"""

from datetime import datetime, timezone
from extensions import db


class MessageTemplate(db.Model):
    __tablename__ = "message_templates"

    id = db.Column(db.Integer, primary_key=True)
    template_name = db.Column(db.String(255), nullable=False)

    # Type: email | sms | both
    template_type = db.Column(db.String(20), nullable=False, default="both")

    subject = db.Column(db.String(255), nullable=True)
    body = db.Column(db.Text, nullable=False)

    created_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "template_name": self.template_name,
            "template_type": self.template_type,
            "subject": self.subject,
            "body": self.body,
            "created_by_user_id": self.created_by_user_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<MessageTemplate {self.template_name}>"
