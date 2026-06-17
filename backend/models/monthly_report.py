"""
OutreachRoute Pro — Monthly Report Model

Auto-generated monthly reports with editable narrative sections.
Data is pulled from the system; the OA can edit the narrative before saving.
"""

from datetime import datetime, timezone
from extensions import db


class MonthlyReport(db.Model):
    __tablename__ = "monthly_reports"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    territory = db.Column(db.String(255), nullable=True)

    # Narrative sections — editable by the user before export
    summary = db.Column(db.Text, nullable=True)
    applicant_activity = db.Column(db.Text, nullable=True)
    outreach_activity = db.Column(db.Text, nullable=True)
    communication_activity = db.Column(db.Text, nullable=True)
    county_breakdown = db.Column(db.Text, nullable=True)
    barriers = db.Column(db.Text, nullable=True)
    performance_analysis = db.Column(db.Text, nullable=True)
    next_month_strategy = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "month": self.month,
            "year": self.year,
            "territory": self.territory,
            "summary": self.summary,
            "applicant_activity": self.applicant_activity,
            "outreach_activity": self.outreach_activity,
            "communication_activity": self.communication_activity,
            "county_breakdown": self.county_breakdown,
            "barriers": self.barriers,
            "performance_analysis": self.performance_analysis,
            "next_month_strategy": self.next_month_strategy,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<MonthlyReport user={self.user_id} {self.month}/{self.year}>"
