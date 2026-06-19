"""Map and target area service queries."""

from datetime import datetime, timedelta
from sqlalchemy import func, case
from extensions import db
from models.applicant import Applicant
from models.outreach_location import OutreachLocation
from models.visit_log import VisitLog


def get_applicant_clusters(filters=None):
    """Return applicant density clusters by ZIP/county for map display."""
    q = db.session.query(
        Applicant.zip_code,
        Applicant.county,
        Applicant.state,
        func.count(Applicant.id).label("applicant_count"),
    )

    if filters:
        if filters.get("state"):
            q = q.filter(Applicant.state == filters["state"])
        if filters.get("county"):
            q = q.filter(Applicant.county == filters["county"])

    rows = (
        q.group_by(Applicant.zip_code, Applicant.county, Applicant.state)
        .order_by(func.count(Applicant.id).desc())
        .all()
    )

    return [
        {
            "zip_code": zip_code,
            "county": county,
            "state": state,
            "applicant_count": count,
        }
        for zip_code, county, state, count in rows
    ]


def find_target_areas(state=None, county=None):
    """
    Identify counties with high applicant load and low recent outreach visits.
    """
    applicant_q = db.session.query(
        Applicant.county,
        Applicant.state,
        func.count(Applicant.id).label("applicants"),
        func.sum(case((Applicant.application_status == "Missing Documents", 1), else_=0)).label("missing_docs"),
    )

    if state:
        applicant_q = applicant_q.filter(Applicant.state == state)
    if county:
        applicant_q = applicant_q.filter(Applicant.county == county)

    applicant_rows = applicant_q.group_by(Applicant.county, Applicant.state).all()

    since = datetime.utcnow() - timedelta(days=30)
    visit_q = db.session.query(
        OutreachLocation.county,
        OutreachLocation.state,
        func.count(VisitLog.id).label("visits_30d"),
    ).join(VisitLog, VisitLog.outreach_location_id == OutreachLocation.id).filter(VisitLog.created_at >= since)

    if state:
        visit_q = visit_q.filter(OutreachLocation.state == state)
    if county:
        visit_q = visit_q.filter(OutreachLocation.county == county)

    visit_rows = visit_q.group_by(OutreachLocation.county, OutreachLocation.state).all()
    visit_map = {(c, s): v for c, s, v in visit_rows}

    targets = []
    for c, s, applicants, missing_docs in applicant_rows:
        visits = visit_map.get((c, s), 0)
        targets.append({
            "county": c,
            "state": s,
            "applicants": applicants,
            "missing_docs": int(missing_docs or 0),
            "visits_30d": visits,
            "gap_score": max(0, applicants - visits),
        })

    return sorted(targets, key=lambda t: (t["gap_score"], t["missing_docs"]), reverse=True)
