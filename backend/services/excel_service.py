"""Excel / CSV upload service helpers."""

import io
from datetime import datetime
import pandas as pd
from extensions import db
from models.applicant import Applicant


def _parse_file(file):
    filename = (getattr(file, "filename", "") or "").lower()
    content = file.read()
    if hasattr(file, "seek"):
        file.seek(0)
    buf = io.BytesIO(content)
    if filename.endswith(".csv"):
        return pd.read_csv(buf, dtype=str, keep_default_na=False)
    return pd.read_excel(buf, dtype=str, keep_default_na=False)


def _parse_date(value):
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


def preview_file(file):
    """Parse an uploaded Excel or CSV file and return a row preview."""
    df = _parse_file(file)
    rows = df.fillna("").to_dict(orient="records")
    return {
        "headers": list(df.columns),
        "row_count": len(rows),
        "preview_rows": rows[:25],
    }


def import_applicants(rows, column_map, assigned_oa_id=None):
    """Import validated applicant rows into the database."""
    imported = 0
    skipped = 0
    errors = []

    for idx, row in enumerate(rows, start=1):
        first_name = (row.get(column_map.get("first_name")) or "").strip()
        last_name = (row.get(column_map.get("last_name")) or "").strip()
        email = (row.get(column_map.get("email")) or "").strip() or None
        phone = (row.get(column_map.get("phone")) or "").strip() or None

        if not first_name or not last_name:
            skipped += 1
            errors.append({"row": idx, "error": "Missing first or last name"})
            continue

        duplicate = None
        if email:
            duplicate = Applicant.query.filter(Applicant.email == email).first()
        if not duplicate and phone:
            duplicate = Applicant.query.filter(Applicant.phone == phone).first()
        if duplicate:
            skipped += 1
            errors.append({"row": idx, "error": "Duplicate applicant detected"})
            continue

        applicant = Applicant(
            first_name=first_name,
            middle_name=(row.get(column_map.get("middle_name")) or "").strip() or None,
            last_name=last_name,
            full_name_original=(row.get(column_map.get("full_name_original")) or "").strip() or None,
            phone=phone,
            email=email,
            age=int(row.get(column_map.get("age"))) if str(row.get(column_map.get("age")) or "").strip().isdigit() else None,
            tracking_number=(row.get(column_map.get("tracking_number")) or "").strip() or None,
            address=(row.get(column_map.get("address")) or "").strip() or None,
            city=(row.get(column_map.get("city")) or "").strip() or None,
            state=(row.get(column_map.get("state")) or "").strip() or None,
            county=(row.get(column_map.get("county")) or "").strip() or None,
            zip_code=(row.get(column_map.get("zip_code")) or "").strip() or None,
            trade_interest=(row.get(column_map.get("trade_interest")) or "").strip() or None,
            education_status=(row.get(column_map.get("education_status")) or "").strip() or None,
            application_status=(row.get(column_map.get("application_status")) or "New Application").strip(),
            case_status=(row.get(column_map.get("case_status")) or "").strip() or None,
            workflow_milestone=(row.get(column_map.get("workflow_milestone")) or "").strip() or None,
            urgency=(row.get(column_map.get("urgency")) or "").strip() or None,
            center_status=(row.get(column_map.get("center_status")) or "").strip() or None,
            submitted_application_questionnaire=(row.get(column_map.get("submitted_application_questionnaire")) or "").strip() or None,
            submitted_health_questionnaire=(row.get(column_map.get("submitted_health_questionnaire")) or "").strip() or None,
            days_in_queue=int(row.get(column_map.get("days_in_queue"))) if str(row.get(column_map.get("days_in_queue")) or "").strip().isdigit() else None,
            case_creation_date=_parse_date(row.get(column_map.get("case_creation_date"))),
            assigned_oa_id=assigned_oa_id,
            assigned_oa_name=(row.get(column_map.get("assigned_oa_name")) or "").strip() or None,
            import_source=(row.get(column_map.get("import_source")) or "excel_upload").strip() or "excel_upload",
            import_batch_id=(row.get(column_map.get("import_batch_id")) or "").strip() or None,
            referral_source=(row.get(column_map.get("referral_source")) or "").strip() or None,
            date_applied=_parse_date(row.get(column_map.get("date_applied"))),
            notes=(row.get(column_map.get("notes")) or "").strip() or None,
        )

        db.session.add(applicant)
        imported += 1

    db.session.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors}


def detect_duplicates(rows):
    """Check uploaded rows against existing applicants for duplicates."""
    duplicates = []
    for idx, row in enumerate(rows, start=1):
        email = (row.get("email") or "").strip()
        phone = (row.get("phone") or "").strip()

        existing = None
        if email:
            existing = Applicant.query.filter(Applicant.email == email).first()
        if not existing and phone:
            existing = Applicant.query.filter(Applicant.phone == phone).first()

        if existing:
            duplicates.append(
                {
                    "row": idx,
                    "existing_applicant_id": existing.id,
                    "email": email or None,
                    "phone": phone or None,
                }
            )
    return duplicates
