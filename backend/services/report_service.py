"""Report service queries."""

from datetime import datetime, timedelta
from sqlalchemy import func
from extensions import db
from models.applicant import Applicant
from models.visit_log import VisitLog
from models.outreach_location import OutreachLocation


def get_applicants_by_county(filters=None):
    """Return applicant counts grouped by county."""
    q = db.session.query(Applicant.county, Applicant.state, func.count(Applicant.id))
    if filters and filters.get("state"):
        q = q.filter(Applicant.state == filters["state"])
    rows = q.group_by(Applicant.county, Applicant.state).order_by(func.count(Applicant.id).desc()).all()
    return [{"county": county, "state": state, "count": count} for county, state, count in rows]


def get_applicants_by_status(filters=None):
    """Return applicant counts grouped by application status."""
    q = db.session.query(Applicant.application_status, func.count(Applicant.id))
    if filters and filters.get("assigned_oa_id"):
        q = q.filter(Applicant.assigned_oa_id == filters["assigned_oa_id"])
    rows = q.group_by(Applicant.application_status).order_by(func.count(Applicant.id).desc()).all()
    return [{"status": status, "count": count} for status, count in rows]


def get_missing_documents_report(filters=None):
    """Return applicants with missing required documents."""
    q = Applicant.query.filter(Applicant.application_status == "Missing Documents")
    if filters and filters.get("assigned_oa_id"):
        q = q.filter(Applicant.assigned_oa_id == filters["assigned_oa_id"])
    return [a.to_dict() for a in q.order_by(Applicant.last_name.asc()).all()]


def get_outreach_impact(zip_code=None, county=None, days=14):
    """
    Track outreach visits grouped by location over a trailing window.
    """
    since = datetime.utcnow() - timedelta(days=days)

    q = (
        db.session.query(
            OutreachLocation.id,
            OutreachLocation.location_name,
            OutreachLocation.zip_code,
            OutreachLocation.county,
            func.count(VisitLog.id).label("visit_count"),
        )
        .join(VisitLog, VisitLog.outreach_location_id == OutreachLocation.id)
        .filter(VisitLog.created_at >= since)
    )

    if zip_code:
        q = q.filter(OutreachLocation.zip_code == zip_code)
    if county:
        q = q.filter(OutreachLocation.county == county)

    rows = (
        q.group_by(
            OutreachLocation.id,
            OutreachLocation.location_name,
            OutreachLocation.zip_code,
            OutreachLocation.county,
        )
        .order_by(func.count(VisitLog.id).desc())
        .all()
    )

    return [
        {
            "location_id": rid,
            "location_name": name,
            "zip_code": z,
            "county": c,
            "visit_count": visits,
        }
        for rid, name, z, c, visits in rows
    ]
