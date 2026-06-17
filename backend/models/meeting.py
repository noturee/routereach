"""
OutreachRoute Pro — Meeting Model

Virtual meetings scheduled between OA users and applicants.
Supports Zoom, Teams, Google Meet, or any link-based platform.
"""

from datetime import datetime, timezone
from extensions import db


class Meeting(db.Model):
    __tablename__ = "meetings"

    id = db.Column(db.Integer, primary_key=True)
    applicant_id = db.Column(
        db.Integer, db.ForeignKey("applicants.id"), nullable=False, index=True
    )
    oa_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )

    meeting_title = db.Column(db.String(255), nullable=False)

    # Type from constants.py MEETING_TYPES
    meeting_type = db.Column(db.String(100), nullable=True)

    meeting_date = db.Column(db.Date, nullable=False)
    meeting_time = db.Column(db.Time, nullable=True)
    timezone = db.Column(db.String(50), nullable=True)
    meeting_link = db.Column(db.String(500), nullable=True)

    # Platform: zoom | teams | google_meet | phone | other
    platform = db.Column(db.String(50), nullable=True)

    # Status: scheduled | completed | no_show | cancelled | rescheduled
    status = db.Column(db.String(50), default="scheduled")
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    applicant = db.relationship("Applicant", back_populates="meetings")
    oa_user = db.relationship(
        "User", foreign_keys=[oa_user_id], back_populates="meetings"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "oa_user_id": self.oa_user_id,
            "meeting_title": self.meeting_title,
            "meeting_type": self.meeting_type,
            "meeting_date": self.meeting_date.isoformat() if self.meeting_date else None,
            "meeting_time": self.meeting_time.isoformat() if self.meeting_time else None,
            "timezone": self.timezone,
            "meeting_link": self.meeting_link,
            "platform": self.platform,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Meeting {self.meeting_title} [{self.status}]>"
