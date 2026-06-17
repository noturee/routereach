"""
OutreachRoute Pro — Report Routes

Live data queries powering dashboards, exports, and admin views.
"""

from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func, case
from extensions import db
from models.applicant import Applicant
from models.visit_log import VisitLog
from models.message import Message
from models.meeting import Meeting
from models.route import Route
from models.user import User
from utils.decorators import admin_required

report_bp = Blueprint("reports", __name__)


def _scope_query(q, model):
    """Optionally restrict query by date range via ?start=YYYY-MM-DD&end=YYYY-MM-DD."""
    start = request.args.get("start")
    end = request.args.get("end")
    if start:
        try:
            q = q.filter(model.created_at >= datetime.strptime(start, "%Y-%m-%d"))
        except ValueError:
            pass
    if end:
        try:
            q = q.filter(model.created_at <= datetime.strptime(end, "%Y-%m-%d"))
        except ValueError:
            pass
    return q


@report_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    """Aggregate counts for the admin dashboard cards."""
    total = Applicant.query.count()
    by_status = (
        db.session.query(Applicant.application_status, func.count(Applicant.id))
        .group_by(Applicant.application_status)
        .all()
    )
    visits_this_month = VisitLog.query.filter(
        func.extract("month", VisitLog.visit_date) == date.today().month,
        func.extract("year",  VisitLog.visit_date) == date.today().year,
    ).count()
    messages_sent = Message.query.filter(Message.delivery_status == "sent").count()
    meetings_scheduled = Meeting.query.filter(Meeting.status == "scheduled").count()
    routes_completed = Route.query.filter(Route.status == "completed").count()

    return jsonify({
        "total_applicants": total,
        "applicants_by_status": {s: c for s, c in by_status},
        "visits_this_month": visits_this_month,
        "messages_sent_total": messages_sent,
        "meetings_scheduled": meetings_scheduled,
        "routes_completed": routes_completed,
    }), 200


@report_bp.route("/applicants-by-county", methods=["GET"])
@jwt_required()
def by_county():
    rows = (
        db.session.query(Applicant.county, Applicant.state, func.count(Applicant.id))
        .group_by(Applicant.county, Applicant.state)
        .order_by(func.count(Applicant.id).desc())
        .all()
    )
    return jsonify({"data": [{"county": r[0], "state": r[1], "count": r[2]} for r in rows]}), 200


@report_bp.route("/applicants-by-status", methods=["GET"])
@jwt_required()
def by_status():
    rows = (
        db.session.query(Applicant.application_status, func.count(Applicant.id))
        .group_by(Applicant.application_status)
        .order_by(func.count(Applicant.id).desc())
        .all()
    )
    return jsonify({"data": [{"status": r[0], "count": r[1]} for r in rows]}), 200


@report_bp.route("/missing-documents", methods=["GET"])
@jwt_required()
def missing_docs():
    applicants = (
        Applicant.query
        .filter(Applicant.application_status == "Missing Documents")
        .order_by(Applicant.last_contact_date.asc())
        .all()
    )
    return jsonify({"data": [a.to_dict() for a in applicants], "total": len(applicants)}), 200


@report_bp.route("/withdrawals", methods=["GET"])
@jwt_required()
def withdrawals():
    q = Applicant.query.filter(Applicant.is_withdrawn == True)
    q = _scope_query(q, Applicant)
    applicants = q.order_by(Applicant.withdrawal_date.desc()).all()
    by_reason = {}
    for a in applicants:
        r = a.withdrawal_reason or "Unknown"
        by_reason[r] = by_reason.get(r, 0) + 1
    return jsonify({
        "data": [a.to_dict() for a in applicants],
        "by_reason": by_reason,
        "total": len(applicants)
    }), 200


@report_bp.route("/no-response", methods=["GET"])
@jwt_required()
def no_response():
    applicants = (
        Applicant.query
        .filter(Applicant.application_status.in_(["Closed - No Response", "Contact Attempted"]))
        .order_by(Applicant.last_contact_date.asc())
        .all()
    )
    return jsonify({"data": [a.to_dict() for a in applicants], "total": len(applicants)}), 200


@report_bp.route("/outreach-by-oa", methods=["GET"])
@jwt_required()
@admin_required
def outreach_by_oa():
    rows = (
        db.session.query(
            User.id, User.first_name, User.last_name, User.email,
            func.count(Applicant.id).label("applicant_count")
        )
        .outerjoin(Applicant, Applicant.assigned_oa_id == User.id)
        .filter(User.role == "oa_user")
        .group_by(User.id, User.first_name, User.last_name, User.email)
        .order_by(func.count(Applicant.id).desc())
        .all()
    )
    return jsonify({
        "data": [{
            "user_id": r[0], "first_name": r[1], "last_name": r[2],
            "email": r[3], "applicant_count": r[4]
        } for r in rows]
    }), 200


@report_bp.route("/marketing-activity", methods=["GET"])
@jwt_required()
def marketing_activity():
    """Visit logs grouped by location type as a marketing activity proxy."""
    from models.outreach_location import OutreachLocation
    rows = (
        db.session.query(OutreachLocation.location_type, func.count(VisitLog.id))
        .join(VisitLog, VisitLog.outreach_location_id == OutreachLocation.id)
        .group_by(OutreachLocation.location_type)
        .order_by(func.count(VisitLog.id).desc())
        .all()
    )
    return jsonify({"data": [{"location_type": r[0], "visit_count": r[1]} for r in rows]}), 200


@report_bp.route("/messages-sent", methods=["GET"])
@jwt_required()
def messages_sent():
    q = Message.query.filter(Message.delivery_status == "sent")
    q = _scope_query(q, Message)
    rows = (
        db.session.query(Message.delivery_method, func.count(Message.id))
        .filter(Message.delivery_status == "sent")
        .group_by(Message.delivery_method)
        .all()
    )
    total = sum(r[1] for r in rows)
    return jsonify({"data": [{"method": r[0], "count": r[1]} for r in rows], "total": total}), 200


@report_bp.route("/meetings-scheduled", methods=["GET"])
@jwt_required()
def meetings_scheduled():
    rows = (
        db.session.query(Meeting.status, func.count(Meeting.id))
        .group_by(Meeting.status)
        .all()
    )
    return jsonify({"data": [{"status": r[0], "count": r[1]} for r in rows]}), 200


@report_bp.route("/routes-completed", methods=["GET"])
@jwt_required()
def routes_completed():
    q = Route.query.filter(Route.status == "completed")
    q = _scope_query(q, Route)
    routes = q.order_by(Route.route_date.desc()).all()
    return jsonify({"data": [r.to_dict() for r in routes], "total": len(routes)}), 200


@report_bp.route("/export/excel", methods=["GET"])
@jwt_required()
def export_excel():
    """CSV-style export of all applicants (xlsx requires openpyxl which is installed)."""
    import io, csv
    from flask import Response
    applicants = Applicant.query.order_by(Applicant.last_name).all()
    output = io.StringIO()
    fields = ["id","first_name","last_name","email","phone","application_status",
              "county","state","assigned_oa_id","date_applied","last_contact_date"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for a in applicants:
        row = a.to_dict()
        writer.writerow({f: row.get(f, "") for f in fields})
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=applicants_export.csv"}
    )


@report_bp.route("/export/pdf", methods=["GET"])
@jwt_required()
def export_pdf():
    return jsonify({"message": "PDF export requires additional configuration. Use /export/excel for CSV export."}), 200


@report_bp.route("/export/csv", methods=["GET"])
@jwt_required()
def export_csv():
    """Alias to export/excel returning CSV."""
    return export_excel()
