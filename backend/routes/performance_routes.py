"""
OutreachRoute Pro — Performance Routes

My Numbers (per-user stats), Team Performance (admin), and conversion rates.
All metrics are computed live from the database.
"""

from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import func
from extensions import db
from models.applicant import Applicant
from models.visit_log import VisitLog
from models.message import Message
from models.meeting import Meeting
from models.route import Route
from models.user import User
from utils.decorators import admin_required

performance_bp = Blueprint("performance", __name__)


def _user_stats(user_id, month=None, year=None):
    """Compute live stats for a single user, optionally filtered by month/year."""
    aq = Applicant.query.filter(Applicant.assigned_oa_id == user_id)
    if month and year:
        aq = aq.filter(
            func.extract("month", Applicant.created_at) == month,
            func.extract("year",  Applicant.created_at) == year,
        )

    applicants = aq.all()
    total = len(applicants)

    status_counts = {}
    for a in applicants:
        status_counts[a.application_status] = status_counts.get(a.application_status, 0) + 1

    # Visit logs
    vq = VisitLog.query.filter(VisitLog.oa_user_id == user_id)
    if month and year:
        vq = vq.filter(
            func.extract("month", VisitLog.visit_date) == month,
            func.extract("year",  VisitLog.visit_date) == year,
        )
    visits = vq.count()

    # Messages
    mq = Message.query.filter(
        Message.sender_user_id == user_id,
        Message.delivery_status == "sent"
    )
    if month and year:
        mq = mq.filter(
            func.extract("month", Message.created_at) == month,
            func.extract("year",  Message.created_at) == year,
        )
    messages = mq.count()

    # Meetings
    mtq = Meeting.query.filter(Meeting.oa_user_id == user_id)
    if month and year:
        mtq = mtq.filter(
            func.extract("month", Meeting.created_at) == month,
            func.extract("year",  Meeting.created_at) == year,
        )
    meetings_sched = mtq.filter(Meeting.status == "scheduled").count()
    meetings_done  = mtq.filter(Meeting.status == "completed").count()

    # Routes
    rq = Route.query.filter(Route.oa_user_id == user_id)
    if month and year:
        rq = rq.filter(
            func.extract("month", Route.created_at) == month,
            func.extract("year",  Route.created_at) == year,
        )
    routes_done = rq.filter(Route.status == "completed").count()

    # Conversion helpers
    contacted = status_counts.get("Contact Made", 0) + status_counts.get("Contact Attempted", 0)
    interviews_sched = status_counts.get("Interview Scheduled", 0)
    complete = status_counts.get("Complete Application", 0)
    arrivals = status_counts.get("Arrived", 0)
    withdrawals = sum(v for k, v in status_counts.items() if "Withdrawn" in k or "Closed" in k)

    def rate(num, den):
        return round(num / den, 4) if den else None

    return {
        "total_applicants": total,
        "applicants_by_status": status_counts,
        "outreach_visits": visits,
        "messages_sent": messages,
        "meetings_scheduled": meetings_sched,
        "meetings_completed": meetings_done,
        "routes_completed": routes_done,
        "withdrawals": withdrawals,
        "arrivals": arrivals,
        "conversion_rates": {
            "application_to_contact": rate(contacted, total),
            "contact_to_interview": rate(interviews_sched, contacted),
            "interview_to_complete": rate(complete, interviews_sched),
            "complete_to_arrival": rate(arrivals, complete),
            "application_to_arrival": rate(arrivals, total),
        },
    }


@performance_bp.route("/my-numbers", methods=["GET"])
@jwt_required()
def my_numbers():
    user_id = int(get_jwt_identity())
    month = request.args.get("month", type=int)
    year  = request.args.get("year",  type=int)
    if not month or not year:
        today = date.today()
        month, year = today.month, today.year
    stats = _user_stats(user_id, month, year)
    stats["month"] = month
    stats["year"]  = year
    return jsonify(stats), 200


@performance_bp.route("/team", methods=["GET"])
@jwt_required()
@admin_required
def team():
    month = request.args.get("month", type=int)
    year  = request.args.get("year",  type=int)
    if not month or not year:
        today = date.today()
        month, year = today.month, today.year

    oa_users = User.query.filter(User.role == "oa_user", User.is_active == True).all()
    team_data = []
    for u in oa_users:
        stats = _user_stats(u.id, month, year)
        team_data.append({
            "user_id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "month": month,
            "year": year,
            **stats,
        })
    return jsonify({"team": team_data, "total_users": len(team_data), "month": month, "year": year}), 200


@performance_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
@admin_required
def user_performance(user_id):
    user = User.query.get_or_404(user_id)
    month = request.args.get("month", type=int)
    year  = request.args.get("year",  type=int)
    if not month or not year:
        today = date.today()
        month, year = today.month, today.year
    stats = _user_stats(user_id, month, year)
    return jsonify({"user": user.to_dict(), "month": month, "year": year, **stats}), 200


@performance_bp.route("/conversion-rates", methods=["GET"])
@jwt_required()
def conversion_rates():
    """Org-wide conversion funnel."""
    total = Applicant.query.count()
    contacted = Applicant.query.filter(
        Applicant.application_status.in_(["Contact Made", "Contact Attempted"])
    ).count()
    interviewed = Applicant.query.filter(
        Applicant.application_status == "Interview Scheduled"
    ).count()
    complete = Applicant.query.filter(
        Applicant.application_status == "Complete Application"
    ).count()
    arrived = Applicant.query.filter(
        Applicant.application_status == "Arrived"
    ).count()

    def rate(num, den):
        return round(num / den, 4) if den else None

    return jsonify({
        "total_applicants": total,
        "contacted": contacted,
        "interviewed": interviewed,
        "complete": complete,
        "arrived": arrived,
        "application_to_contact_rate": rate(contacted, total),
        "contact_to_interview_rate": rate(interviewed, contacted),
        "interview_to_complete_rate": rate(complete, interviewed),
        "complete_to_arrival_rate": rate(arrived, complete),
        "application_to_arrival_rate": rate(arrived, total),
    }), 200


@performance_bp.route("/outreach-impact", methods=["GET"])
@jwt_required()
def outreach_impact():
    """Visits per location type and applicant outcomes linked to visits."""
    from models.outreach_location import OutreachLocation
    rows = (
        db.session.query(OutreachLocation.location_type, func.count(VisitLog.id))
        .join(VisitLog, VisitLog.outreach_location_id == OutreachLocation.id)
        .group_by(OutreachLocation.location_type)
        .order_by(func.count(VisitLog.id).desc())
        .all()
    )
    total_visits = VisitLog.query.count()
    return jsonify({
        "total_visits": total_visits,
        "by_location_type": [{"location_type": r[0], "visits": r[1]} for r in rows],
    }), 200
