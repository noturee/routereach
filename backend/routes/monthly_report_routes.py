"""
OutreachRoute Pro — Monthly Report Routes

Generate, retrieve, update, and export monthly reports.
Supports both the legacy narrative report and the new structured
Outreach & Admissions Monthly Report.
"""

from datetime import date
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import func
from extensions import db
from models.monthly_report import MonthlyReport
from models.applicant import Applicant
from models.visit_log import VisitLog
from models.message import Message
from models.meeting import Meeting
from models.route import Route
from models.user import User
from utils.decorators import admin_required
from services.monthly_report_service import (
    REPORT_TYPE_LEGACY,
    REPORT_TYPE_OUTREACH_ADMISSIONS,
    build_blank_report_data,
    derive_totals_from_applicants,
    export_legacy_report_csv,
    export_legacy_report_docx,
    export_legacy_report_excel,
    export_legacy_report_pdf,
    export_structured_report_csv,
    export_structured_report_docx,
    export_structured_report_excel,
    export_structured_report_pdf,
    month_year_label,
    normalize_report_data,
)

monthly_report_bp = Blueprint("monthly_reports", __name__)

ADMIN_ROLES = {
    "master_admin",
    "national_admin",
    "regional_admin",
    "state_admin",
    "local_admin",
}


def _is_admin_role(role):
    return role in ADMIN_ROLES


def _auto_generate_sections(user_id, month, year):
    """Pull live data and build default narrative text for each report section."""
    aq = Applicant.query.filter(
        func.extract("month", Applicant.created_at) == month,
        func.extract("year", Applicant.created_at) == year,
    )
    if user_id is not None:
        aq = aq.filter(Applicant.assigned_oa_id == user_id)
    new_apps = aq.count()

    arrivals = aq.filter(Applicant.application_status == "Arrived").count()
    withdrawals = aq.filter(Applicant.is_withdrawn == True).count()
    complete = aq.filter(Applicant.application_status == "Complete Application").count()

    visits_q = VisitLog.query.filter(
        func.extract("month", VisitLog.visit_date) == month,
        func.extract("year", VisitLog.visit_date) == year,
    )
    if user_id is not None:
        visits_q = visits_q.filter(VisitLog.oa_user_id == user_id)
    visits = visits_q.count()

    msgs_q = Message.query.filter(
        Message.delivery_status == "sent",
        func.extract("month", Message.created_at) == month,
        func.extract("year", Message.created_at) == year,
    )
    if user_id is not None:
        msgs_q = msgs_q.filter(Message.sender_user_id == user_id)
    msgs = msgs_q.count()

    meetings_q = Meeting.query.filter(
        Meeting.status == "completed",
        func.extract("month", Meeting.created_at) == month,
        func.extract("year", Meeting.created_at) == year,
    )
    if user_id is not None:
        meetings_q = meetings_q.filter(Meeting.oa_user_id == user_id)
    meetings_done = meetings_q.count()

    routes_q = Route.query.filter(
        Route.status == "completed",
        func.extract("month", Route.created_at) == month,
        func.extract("year", Route.created_at) == year,
    )
    if user_id is not None:
        routes_q = routes_q.filter(Route.oa_user_id == user_id)
    routes_done = routes_q.count()

    month_names = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"]
    month_name = month_names[month - 1]

    by_county_q = (
        db.session.query(Applicant.county, func.count(Applicant.id))
        .filter(
            func.extract("month", Applicant.created_at) == month,
            func.extract("year", Applicant.created_at) == year,
        )
    )
    if user_id is not None:
        by_county_q = by_county_q.filter(Applicant.assigned_oa_id == user_id)
    by_county = by_county_q.group_by(Applicant.county).all()
    county_lines = "; ".join(f"{c or 'Unknown'}: {n}" for c, n in by_county) or "No data"

    return {
        "summary": (
            f"During {month_name} {year}, {new_apps} new applicants were added. "
            f"{complete} reached Complete Application status, {arrivals} arrived, "
            f"and {withdrawals} withdrew."
        ),
        "applicant_activity": (
            f"New applications: {new_apps}. Complete applications: {complete}. "
            f"Arrivals: {arrivals}. Withdrawals: {withdrawals}."
        ),
        "outreach_activity": (
            f"Outreach visits logged: {visits}. Routes completed: {routes_done}."
        ),
        "communication_activity": (
            f"Messages sent: {msgs}. Meetings completed: {meetings_done}."
        ),
        "county_breakdown": county_lines,
        "barriers": "(Edit this section to describe barriers encountered this month.)",
        "performance_analysis": "(Edit this section to add performance analysis.)",
        "next_month_strategy": "(Edit this section to outline next month's strategy.)",
    }


def _auto_generate_structured_payload(user_id, month, year, counselor_name=""):
    user = User.query.get(user_id) if user_id is not None else None
    counselor = counselor_name or (f"{user.first_name} {user.last_name}" if user else "All Outreach Associates")
    payload = build_blank_report_data(month, year, counselor)

    applicants_q = Applicant.query.filter(
        func.extract("month", Applicant.created_at) == month,
        func.extract("year", Applicant.created_at) == year,
    )
    if user_id is not None:
        applicants_q = applicants_q.filter(Applicant.assigned_oa_id == user_id)
    applicants = applicants_q.order_by(Applicant.last_name.asc(), Applicant.first_name.asc()).all()

    applicant_rows = []
    for applicant in applicants:
        applicant_rows.append({
            "id": f"applicant-{applicant.id}",
            "applicant": f"{applicant.first_name} {applicant.last_name}".strip(),
            "gender": "",
            "age": applicant.age or "",
            "trade": applicant.trade_interest or applicant.form_104_trade_interest_summary or "",
            "center": applicant.center_of_interest or applicant.campus or "",
            "status": applicant.application_status or "",
        })

    payload["applicants"] = applicant_rows or payload["applicants"]
    payload["totals"].update(derive_totals_from_applicants(applicant_rows))
    payload["totals"]["confirmedArrivals"] = sum(
        1 for row in applicant_rows if "arrived" in (row.get("status") or "").lower()
    )
    payload["totals"]["scheduledArrivals"] = sum(
        1 for row in applicant_rows if any(token in (row.get("status") or "").lower() for token in ("eta", "scheduled", "pending"))
    )
    payload["totals"]["applicantInterviews"] = len(
        [row for row in applicant_rows if (row.get("status") or "").strip()]
    )

    visits_q = VisitLog.query.filter(
        func.extract("month", VisitLog.visit_date) == month,
        func.extract("year", VisitLog.visit_date) == year,
    )
    if user_id is not None:
        visits_q = visits_q.filter(VisitLog.oa_user_id == user_id)
    visits = visits_q.count()

    meetings_q = Meeting.query.filter(
        Meeting.status == "completed",
        func.extract("month", Meeting.created_at) == month,
        func.extract("year", Meeting.created_at) == year,
    )
    if user_id is not None:
        meetings_q = meetings_q.filter(Meeting.oa_user_id == user_id)
    meetings_done = meetings_q.count()

    routes_q = Route.query.filter(
        Route.status == "completed",
        func.extract("month", Route.created_at) == month,
        func.extract("year", Route.created_at) == year,
    )
    if user_id is not None:
        routes_q = routes_q.filter(Route.oa_user_id == user_id)
    routes_done = routes_q.count()

    payload["totals"]["workforceVisitsMeetings"] = visits + meetings_done + routes_done
    payload["communityServiceVisibility"]["marketingVisibility"] = (
        f"Completed {visits} outreach visits, {meetings_done} meetings, and {routes_done} routes this month."
    )
    payload["header"]["monthYearReporting"] = month_year_label(month, year)
    return payload


@monthly_report_bp.route("", methods=["GET"])
@jwt_required()
def get_monthly_reports():
    claims = get_jwt()
    role = claims.get("role", "")
    user_id = int(get_jwt_identity())

    q = MonthlyReport.query
    if role == "oa_user":
        q = q.filter_by(user_id=user_id)

    year = request.args.get("year", type=int)
    if year:
        q = q.filter(MonthlyReport.year == year)

    reports = q.order_by(MonthlyReport.year.desc(), MonthlyReport.month.desc()).all()
    return jsonify({"reports": [r.to_dict() for r in reports], "total": len(reports)}), 200


@monthly_report_bp.route("/<int:report_id>", methods=["GET"])
@jwt_required()
def get_monthly_report(report_id):
    report = MonthlyReport.query.get_or_404(report_id)
    return jsonify({"report": report.to_dict()}), 200


@monthly_report_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate():
    """Auto-generate a monthly report from live data."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    data = request.get_json() or {}

    month = data.get("month") or date.today().month
    year  = data.get("year")  or date.today().year
    report_type = data.get("report_type") or REPORT_TYPE_OUTREACH_ADMISSIONS

    is_admin = _is_admin_role(claims.get("role", ""))
    include_all_users = bool(data.get("include_all_users")) and is_admin

    # Admins can generate for other users
    target_user_id = int(data.get("user_id", user_id))
    if target_user_id != user_id and not is_admin:
        target_user_id = user_id

    source_user_id = None if include_all_users else target_user_id

    # Check for existing report
    existing = MonthlyReport.query.filter_by(
        user_id=target_user_id,
        month=month,
        year=year,
        report_type=report_type,
    ).first()
    if existing:
        return jsonify({"message": "Report already exists.", "report": existing.to_dict()}), 200

    if report_type == REPORT_TYPE_OUTREACH_ADMISSIONS:
        default_counselor = "All Outreach Associates" if include_all_users else ""
        payload = _auto_generate_structured_payload(source_user_id, month, year, data.get("oa_counselor", default_counselor))
        report = MonthlyReport(
            user_id=target_user_id,
            month=month,
            year=year,
            report_type=report_type,
            territory=data.get("territory"),
            report_data=payload,
        )
    else:
        sections = _auto_generate_sections(source_user_id, month, year)
        report = MonthlyReport(
            user_id=target_user_id,
            month=month,
            year=year,
            report_type=REPORT_TYPE_LEGACY,
            territory=data.get("territory"),
            **sections,
        )
    db.session.add(report)
    db.session.commit()
    return jsonify({"message": "Report generated.", "report": report.to_dict()}), 201


@monthly_report_bp.route("/<int:report_id>", methods=["PUT"])
@jwt_required()
def update_monthly_report(report_id):
    report = MonthlyReport.query.get_or_404(report_id)
    data = request.get_json() or {}
    if "report_type" in data:
        report.report_type = data["report_type"] or report.report_type
    if "report_data" in data:
        report.report_data = normalize_report_data(
            data["report_data"],
            report.month,
            report.year,
            (data["report_data"].get("header", {}) or {}).get("oaCounselor", "") if isinstance(data["report_data"], dict) else "",
        )

    editable = [
        "territory",
        "summary",
        "applicant_activity",
        "outreach_activity",
        "communication_activity",
        "county_breakdown",
        "barriers",
        "performance_analysis",
        "next_month_strategy",
    ]
    for field in editable:
        if field in data:
            setattr(report, field, data[field])
    db.session.commit()
    return jsonify({"message": "Report updated.", "report": report.to_dict()}), 200


@monthly_report_bp.route("/<int:report_id>/export-pdf", methods=["GET"])
@jwt_required()
def export_pdf(report_id):
    report = MonthlyReport.query.get_or_404(report_id)
    if report.report_type == REPORT_TYPE_OUTREACH_ADMISSIONS and report.report_data:
        pdf_bytes = export_structured_report_pdf(report)
    else:
        pdf_bytes = export_legacy_report_pdf(report)
    fname = f"monthly_report_{report.year}_{report.month:02d}.pdf"
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=fname,
    )


@monthly_report_bp.route("/<int:report_id>/export-csv", methods=["GET"])
@jwt_required()
def export_csv(report_id):
    report = MonthlyReport.query.get_or_404(report_id)
    if report.report_type == REPORT_TYPE_OUTREACH_ADMISSIONS and report.report_data:
        csv_text = export_structured_report_csv(report)
    else:
        csv_text = export_legacy_report_csv(report)
    fname = f"monthly_report_{report.year}_{report.month:02d}.csv"
    response = make_response(csv_text)
    response.mimetype = "text/csv"
    response.headers["Content-Disposition"] = f"attachment; filename={fname}"
    return response


@monthly_report_bp.route("/<int:report_id>/export-excel", methods=["GET"])
@jwt_required()
def export_excel(report_id):
    report = MonthlyReport.query.get_or_404(report_id)
    if report.report_type == REPORT_TYPE_OUTREACH_ADMISSIONS and report.report_data:
        excel_bytes = export_structured_report_excel(report)
    else:
        excel_bytes = export_legacy_report_excel(report)
    fname = f"monthly_report_{report.year}_{report.month:02d}.xlsx"
    return send_file(
        BytesIO(excel_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=fname,
    )


@monthly_report_bp.route("/<int:report_id>/export-word", methods=["GET"])
@jwt_required()
def export_word(report_id):
    report = MonthlyReport.query.get_or_404(report_id)
    if report.report_type == REPORT_TYPE_OUTREACH_ADMISSIONS and report.report_data:
        docx_bytes = export_structured_report_docx(report)
    else:
        docx_bytes = export_legacy_report_docx(report)
    fname = f"monthly_report_{report.year}_{report.month:02d}.docx"
    return send_file(
        BytesIO(docx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        as_attachment=True,
        download_name=fname,
    )
