"""
OutreachRoute Pro — Applicant Report Model

Stores generated or submitted report payloads associated with an applicant.
"""

from datetime import datetime, timezone
from extensions import db


class ApplicantReport(db.Model):
    __tablename__ = "applicant_reports"

    id = db.Column(db.Integer, primary_key=True)
    applicant_id = db.Column(db.Integer, db.ForeignKey("applicants.id"), nullable=False)
    report_type = db.Column(db.String(100), nullable=False)  # e.g. FORM_1_04
    title = db.Column(db.String(255), nullable=False)

    content_json = db.Column(db.JSON, nullable=False)
    created_by = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    applicant = db.relationship("Applicant", back_populates="reports")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "report_type": self.report_type,
            "title": self.title,
            "content_json": self.content_json,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<ApplicantReport {self.report_type} applicant={self.applicant_id}>"
