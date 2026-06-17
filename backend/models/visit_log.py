"""
OutreachRoute Pro — Visit Log Model

Records each outreach visit to a location.
Automatically updates the location's last_visit_date and the OA user's metrics.
"""

from datetime import datetime, timezone
from extensions import db


class VisitLog(db.Model):
    __tablename__ = "visit_logs"

    id = db.Column(db.Integer, primary_key=True)
    outreach_location_id = db.Column(
        db.Integer, db.ForeignKey("outreach_locations.id"), nullable=False, index=True
    )
    oa_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )

    visit_date = db.Column(db.Date, nullable=False)

    # Marketing type from constants.py MARKETING_TYPES
    marketing_type = db.Column(db.String(100), nullable=True)
    materials_left = db.Column(db.String(255), nullable=True)
    quantity_left = db.Column(db.Integer, nullable=True)

    contact_person_met = db.Column(db.String(255), nullable=True)
    partner_contact_made = db.Column(db.Boolean, default=False)

    visit_notes = db.Column(db.Text, nullable=True)
    follow_up_needed = db.Column(db.Boolean, default=False)
    next_follow_up_date = db.Column(db.Date, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────────────────────────────────────
    location = db.relationship("OutreachLocation", back_populates="visit_logs")
    oa_user = db.relationship("User", back_populates="visit_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "outreach_location_id": self.outreach_location_id,
            "location": self.location.to_dict() if self.location else None,
            "oa_user_id": self.oa_user_id,
            "oa_user": self.oa_user.to_dict() if self.oa_user else None,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None,
            "marketing_type": self.marketing_type,
            "materials_left": self.materials_left,
            "quantity_left": self.quantity_left,
            "contact_person_met": self.contact_person_met,
            "partner_contact_made": self.partner_contact_made,
            "visit_notes": self.visit_notes,
            "follow_up_needed": self.follow_up_needed,
            "next_follow_up_date": self.next_follow_up_date.isoformat() if self.next_follow_up_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<VisitLog location={self.outreach_location_id} date={self.visit_date}>"
