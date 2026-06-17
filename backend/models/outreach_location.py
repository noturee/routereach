"""
OutreachRoute Pro — Outreach Location Model

Every library, community center, apartment complex, school, church, etc.
that OA users visit during field outreach is stored here.
"""

from datetime import datetime, timezone
from extensions import db


class OutreachLocation(db.Model):
    __tablename__ = "outreach_locations"

    id = db.Column(db.Integer, primary_key=True)
    location_name = db.Column(db.String(255), nullable=False)

    # Type from the standard list (see constants.py LOCATION_TYPES)
    location_type = db.Column(db.String(100), nullable=True)

    # ── Address ───────────────────────────────────────────────────────────────
    address = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    county = db.Column(db.String(100), nullable=True)
    zip_code = db.Column(db.String(10), nullable=True)
    country = db.Column(db.String(100), default="United States")
    timezone = db.Column(db.String(50), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # ── Contact ───────────────────────────────────────────────────────────────
    contact_person = db.Column(db.String(255), nullable=True)
    contact_title = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)

    marketing_allowed = db.Column(db.Boolean, default=True)

    assigned_oa_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )

    last_visit_date = db.Column(db.Date, nullable=True)
    next_follow_up_date = db.Column(db.Date, nullable=True)

    # Status: active | inactive | do_not_visit | pending_approval
    status = db.Column(db.String(50), default="active")
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    assigned_oa = db.relationship(
        "User", foreign_keys=[assigned_oa_id]
    )
    created_by = db.relationship(
        "User", foreign_keys=[created_by_user_id]
    )
    visit_logs = db.relationship(
        "VisitLog", back_populates="location", cascade="all, delete-orphan"
    )
    route_stops = db.relationship("RouteStop", back_populates="location")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "location_name": self.location_name,
            "location_type": self.location_type,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "county": self.county,
            "zip_code": self.zip_code,
            "country": self.country,
            "timezone": self.timezone,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "contact_person": self.contact_person,
            "contact_title": self.contact_title,
            "contact_phone": self.contact_phone,
            "contact_email": self.contact_email,
            "marketing_allowed": self.marketing_allowed,
            "assigned_oa_id": self.assigned_oa_id,
            "last_visit_date": self.last_visit_date.isoformat() if self.last_visit_date else None,
            "next_follow_up_date": self.next_follow_up_date.isoformat() if self.next_follow_up_date else None,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<OutreachLocation {self.location_name} [{self.location_type}]>"
