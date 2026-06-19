"""Performance metric service."""

from sqlalchemy import func
from extensions import db
from models.applicant import Applicant
from models.visit_log import VisitLog
from models.message import Message
from models.meeting import Meeting
from models.route import Route
from models.performance_metric import PerformanceMetric


def _rate(num, den):
    return (num / den) if den else None


def calculate_user_metrics(user_id: int, month: int, year: int):
    """
    Calculate and upsert performance metrics for a user for a given month.
    
    Calculates and upserts monthly metrics snapshot.
    """
    aq = Applicant.query.filter(
        Applicant.assigned_oa_id == user_id,
        func.extract("month", Applicant.created_at) == month,
        func.extract("year", Applicant.created_at) == year,
    )
    applicants = aq.all()

    status_counts = {}
    for app in applicants:
        status_counts[app.application_status] = status_counts.get(app.application_status, 0) + 1

    new_apps = len(applicants)
    contacted = status_counts.get("Contact Made", 0) + status_counts.get("Contact Attempted", 0)
    interviews_scheduled = status_counts.get("Interview Scheduled", 0)
    interviews_completed = status_counts.get("Interview Completed", 0)
    complete_apps = status_counts.get("Complete Application", 0)
    referrals = status_counts.get("Sent to Campus", 0)
    arrivals = status_counts.get("Arrived", 0)
    withdrawals = status_counts.get("Withdrawn by Applicant", 0) + status_counts.get("Withdrawn by OA / Program", 0)

    visits = VisitLog.query.filter(
        VisitLog.oa_user_id == user_id,
        func.extract("month", VisitLog.visit_date) == month,
        func.extract("year", VisitLog.visit_date) == year,
    ).count()

    texts_sent = Message.query.filter(
        Message.sender_user_id == user_id,
        Message.delivery_status == "sent",
        Message.message_type.in_(["text", "both"]),
        func.extract("month", Message.created_at) == month,
        func.extract("year", Message.created_at) == year,
    ).count()

    emails_sent = Message.query.filter(
        Message.sender_user_id == user_id,
        Message.delivery_status == "sent",
        Message.message_type.in_(["email", "both"]),
        func.extract("month", Message.created_at) == month,
        func.extract("year", Message.created_at) == year,
    ).count()

    meetings_scheduled = Meeting.query.filter(
        Meeting.oa_user_id == user_id,
        Meeting.status == "scheduled",
        func.extract("month", Meeting.created_at) == month,
        func.extract("year", Meeting.created_at) == year,
    ).count()
    meetings_completed = Meeting.query.filter(
        Meeting.oa_user_id == user_id,
        Meeting.status == "completed",
        func.extract("month", Meeting.created_at) == month,
        func.extract("year", Meeting.created_at) == year,
    ).count()

    routes_completed = Route.query.filter(
        Route.oa_user_id == user_id,
        Route.status == "completed",
        func.extract("month", Route.created_at) == month,
        func.extract("year", Route.created_at) == year,
    ).count()

    metric = PerformanceMetric.query.filter_by(user_id=user_id, month=month, year=year).first()
    if not metric:
        metric = PerformanceMetric(user_id=user_id, month=month, year=year)
        db.session.add(metric)

    metric.new_applications = new_apps
    metric.contacted_applicants = contacted
    metric.interviews_scheduled = interviews_scheduled
    metric.interviews_completed = interviews_completed
    metric.complete_applications = complete_apps
    metric.campus_referrals = referrals
    metric.arrivals = arrivals
    metric.withdrawals = withdrawals
    metric.texts_sent = texts_sent
    metric.emails_sent = emails_sent
    metric.meetings_scheduled = meetings_scheduled
    metric.meetings_completed = meetings_completed
    metric.outreach_visits = visits
    metric.routes_completed = routes_completed

    metric.application_to_contact_rate = _rate(contacted, new_apps)
    metric.contact_to_interview_rate = _rate(interviews_completed, contacted)
    metric.interview_to_complete_rate = _rate(complete_apps, interviews_completed)
    metric.complete_to_referral_rate = _rate(referrals, complete_apps)
    metric.referral_to_arrival_rate = _rate(arrivals, referrals)
    metric.application_to_arrival_rate = _rate(arrivals, new_apps)

    db.session.commit()
    return metric.to_dict()


def get_conversion_rates(user_id: int, month: int, year: int) -> dict:
    """
    Return conversion rates for a user-month.
    """
    metric = PerformanceMetric.query.filter_by(user_id=user_id, month=month, year=year).first()
    if not metric:
        calculate_user_metrics(user_id, month, year)
        metric = PerformanceMetric.query.filter_by(user_id=user_id, month=month, year=year).first()

    if not metric:
        return {}

    return {
        "application_to_contact_rate": metric.application_to_contact_rate,
        "contact_to_interview_rate": metric.contact_to_interview_rate,
        "interview_to_complete_rate": metric.interview_to_complete_rate,
        "complete_to_referral_rate": metric.complete_to_referral_rate,
        "referral_to_arrival_rate": metric.referral_to_arrival_rate,
        "application_to_arrival_rate": metric.application_to_arrival_rate,
    }
