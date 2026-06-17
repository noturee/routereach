"""
OutreachRoute Pro — Application Status History Model

Every status change is permanently recorded here.
This powers the timeline view on the applicant profile and auto-generates case notes.
"""

from datetime import datetime, timezone
from extensions import db


class ApplicationStatusHistory(db.Model):
    __tablename__ = "application_status_history"

    id = db.Column(db.Integer, primary_key=True)
    applicant_id = db.Column(
        db.Integer, db.ForeignKey("applicants.id"), nullable=False, index=True
    )

    old_status = db.Column(db.String(100), nullable=True)
    new_status = db.Column(db.String(100), nullable=False)
    status_reason = db.Column(db.Text, nullable=True)

    changed_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    changed_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    notes = db.Column(db.Text, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    applicant = db.relationship("Applicant", back_populates="status_history")
    changed_by = db.relationship("User", foreign_keys=[changed_by_user_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "status_reason": self.status_reason,
            "changed_by_user_id": self.changed_by_user_id,
            "changed_by": (
                self.changed_by.to_dict() if self.changed_by else None
            ),
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
            "notes": self.notes,
        }

    def __repr__(self):
        return f"<StatusHistory {self.old_status} → {self.new_status}>"
