"""
OutreachRoute Pro — Applicant Document Model

Tracks every required and received document for an applicant's file.
When all required documents are received, the applicant can be marked complete.
"""

from datetime import datetime, timezone
from extensions import db


class ApplicantDocument(db.Model):
    __tablename__ = "applicant_documents"

    id = db.Column(db.Integer, primary_key=True)
    applicant_id = db.Column(
        db.Integer, db.ForeignKey("applicants.id"), nullable=False, index=True
    )

    # Document name from the standard checklist (see constants.py)
    document_name = db.Column(db.String(255), nullable=False)

    is_required = db.Column(db.Boolean, default=True)
    is_received = db.Column(db.Boolean, default=False)
    date_received = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    updated_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    applicant = db.relationship("Applicant", back_populates="documents")
    updated_by = db.relationship("User", foreign_keys=[updated_by_user_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "document_name": self.document_name,
            "is_required": self.is_required,
            "is_received": self.is_received,
            "date_received": self.date_received.isoformat() if self.date_received else None,
            "notes": self.notes,
            "updated_by_user_id": self.updated_by_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        status = "received" if self.is_received else "missing"
        return f"<ApplicantDocument {self.document_name} [{status}]>"
