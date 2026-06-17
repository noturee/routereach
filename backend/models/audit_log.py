"""
OutreachRoute Pro — Audit Log Model

Immutable log of all significant system actions.
Used for compliance, troubleshooting, and admin review.
"""

from datetime import datetime, timezone
from extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True, index=True
    )

    # e.g. CREATE | UPDATE | DELETE | LOGIN | LOGOUT | STATUS_CHANGE | MESSAGE_SENT
    action_type = db.Column(db.String(100), nullable=False)

    # e.g. applicant | user | location | route | message | meeting
    entity_type = db.Column(db.String(100), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)

    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    # ── Relationships ────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="audit_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action_type": self.action_type,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<AuditLog {self.action_type} {self.entity_type}={self.entity_id}>"
