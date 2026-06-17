"""
OutreachRoute Pro — Message Model

Every email, text, or combined message sent to an applicant is stored here.
This powers the communication history on the applicant profile.
"""

from datetime import datetime, timezone
from extensions import db


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    applicant_id = db.Column(
        db.Integer, db.ForeignKey("applicants.id"), nullable=False, index=True
    )
    sender_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )

    # Type: email | text | both
    message_type = db.Column(db.String(20), nullable=False, default="email")
    subject = db.Column(db.String(255), nullable=True)
    message_body = db.Column(db.Text, nullable=False)

    # Method: email | sms | both
    delivery_method = db.Column(db.String(20), nullable=True)

    # Status: pending | sent | failed | delivered
    delivery_status = db.Column(db.String(50), default="pending")

    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────────────────────────────────────
    applicant = db.relationship("Applicant", back_populates="messages")
    sender = db.relationship("User", back_populates="messages_sent")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "sender_user_id": self.sender_user_id,
            "sender": self.sender.to_dict() if self.sender else None,
            "message_type": self.message_type,
            "subject": self.subject,
            "message_body": self.message_body,
            "delivery_method": self.delivery_method,
            "delivery_status": self.delivery_status,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Message [{self.delivery_method}] to applicant={self.applicant_id}>"
