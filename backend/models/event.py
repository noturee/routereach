"""
OutreachRoute Pro — Event Model

Tracks events for users with support for recurring events.
Events can be one-time or recurring (daily, weekly, monthly, yearly).
"""

from datetime import datetime, timezone
from extensions import db


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    oa_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )

    event_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Date and time tracking
    event_date = db.Column(db.Date, nullable=False)
    event_time = db.Column(db.Time, nullable=True)
    timezone = db.Column(db.String(50), nullable=True, default="UTC")

    # Recurring event fields
    is_recurring = db.Column(db.Boolean, default=False, nullable=False)
    
    # Recurrence frequency: daily | weekly | biweekly | monthly | yearly
    recurrence_frequency = db.Column(db.String(50), nullable=True)
    
    # Days of week for weekly/biweekly recurrence (comma-separated: Monday, Tuesday, etc.)
    recurrence_days = db.Column(db.String(255), nullable=True)
    
    # End date for recurring event (null means no end date)
    recurrence_end_date = db.Column(db.Date, nullable=True)
    
    # Max occurrences (null means unlimited)
    max_occurrences = db.Column(db.Integer, nullable=True)
    
    # Track how many times this recurring event has occurred
    occurrences_count = db.Column(db.Integer, default=1, nullable=False)

    # Event status: scheduled | completed | cancelled
    status = db.Column(db.String(50), default="scheduled", nullable=False)
    
    # Event type/category for filtering
    event_type = db.Column(db.String(100), nullable=True)
    
    # Location or virtual meeting details
    location = db.Column(db.String(255), nullable=True)
    event_link = db.Column(db.String(500), nullable=True)

    # Notes or additional details
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    oa_user = db.relationship("User", back_populates="events")

    # ── Serialization ────────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "oa_user_id": self.oa_user_id,
            "oa_user": self.oa_user.to_dict(include_sensitive=False) if self.oa_user else None,
            "event_name": self.event_name,
            "description": self.description,
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "event_time": self.event_time.isoformat() if self.event_time else None,
            "timezone": self.timezone,
            "is_recurring": self.is_recurring,
            "recurrence_frequency": self.recurrence_frequency,
            "recurrence_days": self.recurrence_days,
            "recurrence_end_date": self.recurrence_end_date.isoformat() if self.recurrence_end_date else None,
            "max_occurrences": self.max_occurrences,
            "occurrences_count": self.occurrences_count,
            "status": self.status,
            "event_type": self.event_type,
            "location": self.location,
            "event_link": self.event_link,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
