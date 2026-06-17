"""
OutreachRoute Pro — Performance Metric Model

Monthly snapshot of every OA user's activity and conversion rates.
Calculated by the performance_service and used by My Numbers and Team Performance.
"""

from datetime import datetime, timezone
from extensions import db


class PerformanceMetric(db.Model):
    __tablename__ = "performance_metrics"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    month = db.Column(db.Integer, nullable=False)   # 1–12
    year = db.Column(db.Integer, nullable=False)

    # ── Applicant Activity ────────────────────────────────────────────────────
    new_applications = db.Column(db.Integer, default=0)
    contacted_applicants = db.Column(db.Integer, default=0)
    interviews_scheduled = db.Column(db.Integer, default=0)
    interviews_completed = db.Column(db.Integer, default=0)
    complete_applications = db.Column(db.Integer, default=0)
    campus_referrals = db.Column(db.Integer, default=0)
    accepted_applicants = db.Column(db.Integer, default=0)
    arrivals = db.Column(db.Integer, default=0)
    withdrawals = db.Column(db.Integer, default=0)
    closed_applications = db.Column(db.Integer, default=0)

    # ── Communication Activity ────────────────────────────────────────────────
    texts_sent = db.Column(db.Integer, default=0)
    emails_sent = db.Column(db.Integer, default=0)
    calls_logged = db.Column(db.Integer, default=0)
    meetings_scheduled = db.Column(db.Integer, default=0)
    meetings_completed = db.Column(db.Integer, default=0)

    # ── Outreach Activity ─────────────────────────────────────────────────────
    outreach_visits = db.Column(db.Integer, default=0)
    routes_completed = db.Column(db.Integer, default=0)
    partner_contacts = db.Column(db.Integer, default=0)
    materials_distributed = db.Column(db.Integer, default=0)

    # ── Averages (in days) ────────────────────────────────────────────────────
    average_days_to_contact = db.Column(db.Float, nullable=True)
    average_days_to_interview = db.Column(db.Float, nullable=True)
    average_days_to_complete = db.Column(db.Float, nullable=True)
    average_days_in_missing_document_status = db.Column(db.Float, nullable=True)

    # ── Conversion Rates (stored as decimals 0.0–1.0) ─────────────────────────
    application_to_contact_rate = db.Column(db.Float, nullable=True)
    contact_to_interview_rate = db.Column(db.Float, nullable=True)
    interview_to_complete_rate = db.Column(db.Float, nullable=True)
    complete_to_referral_rate = db.Column(db.Float, nullable=True)
    referral_to_arrival_rate = db.Column(db.Float, nullable=True)
    application_to_arrival_rate = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Constraints ───────────────────────────────────────────────────────────
    __table_args__ = (
        db.UniqueConstraint("user_id", "month", "year", name="uq_user_month_year"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "month": self.month,
            "year": self.year,
            "new_applications": self.new_applications,
            "contacted_applicants": self.contacted_applicants,
            "interviews_scheduled": self.interviews_scheduled,
            "interviews_completed": self.interviews_completed,
            "complete_applications": self.complete_applications,
            "campus_referrals": self.campus_referrals,
            "accepted_applicants": self.accepted_applicants,
            "arrivals": self.arrivals,
            "withdrawals": self.withdrawals,
            "closed_applications": self.closed_applications,
            "texts_sent": self.texts_sent,
            "emails_sent": self.emails_sent,
            "calls_logged": self.calls_logged,
            "meetings_scheduled": self.meetings_scheduled,
            "meetings_completed": self.meetings_completed,
            "outreach_visits": self.outreach_visits,
            "routes_completed": self.routes_completed,
            "partner_contacts": self.partner_contacts,
            "materials_distributed": self.materials_distributed,
            "average_days_to_contact": self.average_days_to_contact,
            "average_days_to_interview": self.average_days_to_interview,
            "average_days_to_complete": self.average_days_to_complete,
            "application_to_contact_rate": self.application_to_contact_rate,
            "contact_to_interview_rate": self.contact_to_interview_rate,
            "interview_to_complete_rate": self.interview_to_complete_rate,
            "complete_to_referral_rate": self.complete_to_referral_rate,
            "referral_to_arrival_rate": self.referral_to_arrival_rate,
            "application_to_arrival_rate": self.application_to_arrival_rate,
        }

    def __repr__(self):
        return f"<PerformanceMetric user={self.user_id} {self.month}/{self.year}>"
