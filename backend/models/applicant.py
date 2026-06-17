"""
OutreachRoute Pro — Applicant Model

The core record for every person going through the outreach and admissions process.
Tracks full contact info, geographic data, application status, and assignment.
"""

from datetime import datetime, timezone
from extensions import db


class Applicant(db.Model):
    __tablename__ = "applicants"

    id = db.Column(db.Integer, primary_key=True)

    # ── Personal Information ─────────────────────────────────────────────────
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    age = db.Column(db.Integer, nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)

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

    # ── Program Interest ──────────────────────────────────────────────────────
    trade_interest = db.Column(db.String(255), nullable=True)
    education_status = db.Column(db.String(100), nullable=True)

    # ── Application Status ────────────────────────────────────────────────────
    # See constants.py for all valid status values
    application_status = db.Column(
        db.String(100), nullable=False, default="New Application"
    )
    application_status_reason = db.Column(db.Text, nullable=True)

    # ── Assignment ────────────────────────────────────────────────────────────
    assigned_oa_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    source = db.Column(db.String(100), nullable=True)
    referral_source = db.Column(db.String(255), nullable=True)

    # ── Timeline ──────────────────────────────────────────────────────────────
    date_applied = db.Column(db.Date, nullable=True)
    last_contact_date = db.Column(db.Date, nullable=True)
    next_follow_up_date = db.Column(db.Date, nullable=True)

    # ── Completion / Withdrawal ───────────────────────────────────────────────
    is_complete = db.Column(db.Boolean, default=False)
    is_withdrawn = db.Column(db.Boolean, default=False)
    withdrawal_reason = db.Column(db.String(255), nullable=True)
    withdrawal_date = db.Column(db.Date, nullable=True)

    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    assigned_oa = db.relationship(
        "User", foreign_keys=[assigned_oa_id], back_populates="applicants"
    )
    documents = db.relationship(
        "ApplicantDocument", back_populates="applicant", cascade="all, delete-orphan"
    )
    status_history = db.relationship(
        "ApplicationStatusHistory",
        back_populates="applicant",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusHistory.changed_at.desc()",
    )
    case_notes = db.relationship(
        "CaseNote",
        back_populates="applicant",
        cascade="all, delete-orphan",
        order_by="CaseNote.created_at.desc()",
    )
    messages = db.relationship(
        "Message", back_populates="applicant", cascade="all, delete-orphan"
    )
    meetings = db.relationship(
        "Meeting", back_populates="applicant", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": f"{self.first_name} {self.last_name}",
            "phone": self.phone,
            "email": self.email,
            "age": self.age,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "county": self.county,
            "zip_code": self.zip_code,
            "country": self.country,
            "timezone": self.timezone,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "trade_interest": self.trade_interest,
            "education_status": self.education_status,
            "application_status": self.application_status,
            "application_status_reason": self.application_status_reason,
            "assigned_oa_id": self.assigned_oa_id,
            "assigned_oa": self.assigned_oa.to_dict() if self.assigned_oa else None,
            "source": self.source,
            "referral_source": self.referral_source,
            "date_applied": self.date_applied.isoformat() if self.date_applied else None,
            "last_contact_date": self.last_contact_date.isoformat() if self.last_contact_date else None,
            "next_follow_up_date": self.next_follow_up_date.isoformat() if self.next_follow_up_date else None,
            "is_complete": self.is_complete,
            "is_withdrawn": self.is_withdrawn,
            "withdrawal_reason": self.withdrawal_reason,
            "withdrawal_date": self.withdrawal_date.isoformat() if self.withdrawal_date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Applicant {self.first_name} {self.last_name} [{self.application_status}]>"
