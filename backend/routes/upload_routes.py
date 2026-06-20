"""
OutreachRoute Pro — Upload Routes

Two-step bulk applicant import from Excel (.xlsx) or CSV.

Step 1 — POST /api/uploads/applicants/preview
  Accepts a multipart file, parses it with pandas, auto-detects column
  mappings, and returns a preview (up to 25 rows) + the full row count.
  No database writes occur.

Step 2 — POST /api/uploads/applicants/import
  Accepts the original file again + the confirmed column_mapping dict
  + an optional assigned_oa_id. Writes valid rows to the DB, initialises
  each applicant's document checklist, records an initial status-history
  entry, and returns per-row results (imported / skipped / errors).
"""

import io
import re
from datetime import date, datetime, timezone

import pandas as pd
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from extensions import db
from models.applicant import Applicant
from models.applicant_document import ApplicantDocument
from models.application_status_history import ApplicationStatusHistory
from models.case_note import CaseNote
from models.user import User
from models.audit_log import AuditLog
from utils.permissions import is_admin
from utils.constants import APPLICATION_STATUSES

upload_bp = Blueprint("uploads", __name__)

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}
MAX_ROWS = 500

# ── Column auto-detection map ─────────────────────────────────────────────────
# Maps each system field to a list of recognised header variations (lower-case).
COLUMN_ALIASES: dict[str, list[str]] = {
    "tracking_number":   ["application tracking number", "tracking number", "tracking_number", "application id", "application number"],
    "full_name_original": ["applicant name", "full name", "applicant_name", "name"],
    "first_name":        ["first name", "first_name", "firstname", "fname", "first"],
    "middle_name":       ["middle name", "middle_name", "middlename", "mname", "middle initial"],
    "last_name":         ["last name", "last_name", "lastname", "lname", "last"],
    "phone":             ["phone", "phone number", "cell", "mobile", "telephone", "cell phone"],
    "email":             ["email", "e-mail", "email address"],
    "age":               ["age"],
    "urgency":           ["urgency", "priority"],
    "case_status":       ["case status", "case_status", "status"],
    "workflow_milestone": ["workflow milestone", "workflow_milestone", "milestone"],
    "case_creation_date": ["case creation date", "case_creation_date", "created date", "case created"],
    "submitted_application_questionnaire": ["submitted application questionnaire", "application questionnaire", "submitted_application_questionnaire"],
    "submitted_health_questionnaire": ["submitted health questionnaire", "health questionnaire", "submitted_health_questionnaire"],
    "date_of_birth":     ["date of birth", "dob", "birth date", "birthdate", "birth_date"],
    "address":           ["address", "street", "street address", "street_address"],
    "city":              ["city", "city/town", "city town", "town"],
    "state":             ["state", "st"],
    "zip_code":          ["zip", "zip code", "zip_code", "postal code", "postal_code"],
    "county":            ["county"],
    "assigned_oa_name":  ["assigned to", "assigned oa", "assigned_oa", "assigned_oa_name", "oa", "outreach advisor", "outreach_advisor", "advisor"],
    "import_source":     ["import source", "import_source"],
    "import_batch_id":   ["import batch id", "import_batch_id", "batch id", "batch_id"],
    "center_status":     ["center status", "center_status"],
    "days_in_queue":     ["days in queue", "days_in_queue", "queue days"],
    "trade_interest":    ["trade", "trade interest", "trade_interest", "program", "program interest"],
    "education_status":  ["education", "education status", "education_status", "education level"],
    "application_status":["status", "application status", "application_status", "app status"],
    "assigned_oa":       ["assigned oa", "assigned_oa", "oa", "outreach advisor", "outreach_advisor", "advisor", "assigned to"],
    "date_applied":      ["date applied", "date_applied", "application date", "applied date", "applied"],
    "referral_source":   ["referral source", "referral_source", "referral", "source", "how did you hear"],
    "notes":             ["notes", "note", "comments", "comment", "additional notes"],
}

KNOWN_CASE_STATUSES = {"Open", "Withdrawn"}
KNOWN_WORKFLOW_MILESTONES = {
    "Application Started",
    "Application Submitted",
    "Application Verified",
}
KNOWN_URGENCY = {"Expedited", "Standard"}
DISALLOWED_ASSIGNEE_NAMES = {"system admin", "test user"}

REQUIRED_DOCUMENT_CHECKLIST = [
    "Photo ID",
    "Social Security Card",
    "Birth Certificate",
    "High School Diploma",
    "Health Questionnaire",
    "Signed Consent Forms",
]


def _allowed_file(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


def _read_file_to_df(file_storage) -> pd.DataFrame:
    """Parse an uploaded FileStorage into a DataFrame."""
    filename = secure_filename(file_storage.filename)
    content  = file_storage.read()
    buf      = io.BytesIO(content)

    if filename.lower().endswith(".csv"):
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                buf.seek(0)
                return pd.read_csv(buf, encoding=enc, dtype=str, keep_default_na=False)
            except UnicodeDecodeError:
                continue
        raise ValueError("CSV file encoding not supported.")
    else:
        return pd.read_excel(buf, dtype=str, keep_default_na=False)


def _auto_map(headers: list[str]) -> dict[str, str]:
    """Return {system_field: detected_header} for each match."""
    mapping = {}
    lowered = {h.lower().strip(): h for h in headers}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lowered:
                mapping[field] = lowered[alias]
                break
    return mapping


def _clean(val) -> str | None:
    """Strip a value; return None if empty."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _raw_string(val) -> str | None:
    if val is None:
        return None
    s = str(val)
    return s if s != "" else None


def _parse_int(val) -> int | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def _parse_date(val) -> date | None:
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(val).strip(), fmt).date()
        except ValueError:
            pass
    return None


def _split_applicant_name(full_name: str | None) -> tuple[str | None, str | None, str | None]:
    if not full_name:
        return None, None, None

    text = re.sub(r"\s+", " ", str(full_name).strip())
    if not text:
        return None, None, None

    # Last, First Middle
    if "," in text:
        last_part, remainder = [p.strip() for p in text.split(",", 1)]
        tokens = remainder.split()
        first = tokens[0] if tokens else None
        middle = " ".join(tokens[1:]) if len(tokens) > 1 else None
        return first, middle, last_part or None

    parts = text.split(" ")
    if len(parts) == 1:
        return parts[0], None, None
    if len(parts) == 2:
        return parts[0], None, parts[1]
    return parts[0], " ".join(parts[1:-1]), parts[-1]


def _normalise_name_key(*parts) -> str:
    return " ".join((str(p or "").strip().lower() for p in parts if str(p or "").strip()))


def _get_current_user():
    return User.query.get(int(get_jwt_identity()))


def _is_disallowed_assignee(user: User | None) -> bool:
    if not user:
        return False
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip().lower()
    return full_name in DISALLOWED_ASSIGNEE_NAMES


def _resolve_assignable_user_by_id(raw_assigned_oa_id):
    if raw_assigned_oa_id in (None, "", 0, "0"):
        return None, None

    try:
        assigned_oa_id = int(raw_assigned_oa_id)
    except (TypeError, ValueError):
        return None, "assigned_oa_id must be an integer."

    assignee = User.query.get(assigned_oa_id)
    if not assignee:
        return None, "Assigned OA not found."
    if _is_disallowed_assignee(assignee):
        return None, "System Admin and Test User cannot be assigned to applicants."

    return assigned_oa_id, None


def _extract_row_data(row, row_num: int, column_mapping: dict[str, str], row_override: dict | None = None, city_zip_updates: dict | None = None):
    row_override = row_override or {}
    city_zip_updates = city_zip_updates or {}

    def col(field: str):
        return column_mapping.get(field)

    def val(field: str):
        header = col(field)
        if not header or header not in row:
            return None
        return _clean(row[header])

    def raw_val(field: str):
        header = col(field)
        if not header or header not in row:
            return None
        return _raw_string(row[header])

    full_name_original = row_override.get("full_name_original")
    if full_name_original is None:
        full_name_original = raw_val("full_name_original") or raw_val("applicant_name")

    first_name = row_override.get("first_name") if "first_name" in row_override else val("first_name")
    middle_name = row_override.get("middle_name") if "middle_name" in row_override else val("middle_name")
    last_name = row_override.get("last_name") if "last_name" in row_override else val("last_name")

    if full_name_original and (not first_name or not last_name):
        p_first, p_middle, p_last = _split_applicant_name(full_name_original)
        first_name = first_name or p_first
        middle_name = middle_name or p_middle
        last_name = last_name or p_last

    city = row_override.get("city") if "city" in row_override else val("city")
    state = row_override.get("state") if "state" in row_override else val("state")
    zip_code = row_override.get("zip_code") if "zip_code" in row_override else val("zip_code")

    if not zip_code and city:
        city_key = city.strip().lower()
        zip_code = _clean(city_zip_updates.get(city_key)) if city_key in city_zip_updates else None

    assigned_oa_name = row_override.get("assigned_oa_name") if "assigned_oa_name" in row_override else (val("assigned_oa_name") or val("assigned_oa"))
    case_status = row_override.get("case_status") if "case_status" in row_override else val("case_status")
    workflow_milestone = row_override.get("workflow_milestone") if "workflow_milestone" in row_override else val("workflow_milestone")
    urgency = row_override.get("urgency") if "urgency" in row_override else val("urgency")

    warnings = []
    if not zip_code:
        warnings.append("Missing ZIP Code")
    if not city:
        warnings.append("Missing city")
    if not assigned_oa_name:
        warnings.append("Missing assigned OA")
    if case_status and case_status not in KNOWN_CASE_STATUSES:
        warnings.append("Unknown case status")
    if workflow_milestone and workflow_milestone not in KNOWN_WORKFLOW_MILESTONES:
        warnings.append("Unknown workflow milestone")

    return {
        "row_num": row_num,
        "row_number": row_num,
        "tracking_number": row_override.get("tracking_number") if "tracking_number" in row_override else val("tracking_number"),
        "full_name_original": full_name_original,
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "age": _parse_int(row_override.get("age") if "age" in row_override else val("age")),
        "urgency": urgency,
        "case_status": case_status,
        "workflow_milestone": workflow_milestone,
        "case_creation_date": _parse_date(row_override.get("case_creation_date") if "case_creation_date" in row_override else val("case_creation_date")),
        "submitted_application_questionnaire": row_override.get("submitted_application_questionnaire") if "submitted_application_questionnaire" in row_override else val("submitted_application_questionnaire"),
        "submitted_health_questionnaire": row_override.get("submitted_health_questionnaire") if "submitted_health_questionnaire" in row_override else val("submitted_health_questionnaire"),
        "city": city,
        "state": state,
        "zip_code": zip_code,
        "assigned_oa_name": assigned_oa_name,
        "import_source": row_override.get("import_source") if "import_source" in row_override else val("import_source"),
        "import_batch_id": row_override.get("import_batch_id") if "import_batch_id" in row_override else val("import_batch_id"),
        "center_status": row_override.get("center_status") if "center_status" in row_override else val("center_status"),
        "days_in_queue": _parse_int(row_override.get("days_in_queue") if "days_in_queue" in row_override else val("days_in_queue")),
        "application_status": row_override.get("application_status") if "application_status" in row_override else val("application_status"),
        "warnings": warnings,
        "warning_messages": warnings,
        "needs_zip_code": not bool(zip_code),
    }


# ── POST /api/uploads/applicants/preview ─────────────────────────────────────

@upload_bp.route("/applicants/preview", methods=["POST"])
@jwt_required()
def preview_upload():
    """
    Parse an uploaded file, auto-detect column mapping, and return a preview.
    No DB writes.
    Expects multipart/form-data with field 'file'.
    Returns:
      { headers, suggested_mapping, preview_rows (≤25), total_rows }
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use field name 'file'."}), 400

    f = request.files["file"]
    if not f.filename or not _allowed_file(f.filename):
        return jsonify({"error": "Unsupported file type. Upload .xlsx, .xls, or .csv."}), 400

    try:
        df = _read_file_to_df(f)
    except Exception as exc:
        return jsonify({"error": f"Could not parse file: {exc}"}), 422

    if df.empty:
        return jsonify({"error": "The file contains no data rows."}), 422

    if len(df) > MAX_ROWS:
        return jsonify({"error": f"File contains {len(df)} rows. Maximum is {MAX_ROWS} per upload."}), 422

    # Normalise column names (strip whitespace)
    df.columns = [c.strip() for c in df.columns]
    headers    = list(df.columns)

    suggested_mapping = _auto_map(headers)
    preview_rows = df.head(25).to_dict(orient="records")
    total_rows = len(df)

    city_header = suggested_mapping.get("city")
    city_values = []
    if city_header and city_header in df.columns:
        city_values = sorted({str(v).strip() for v in df[city_header].tolist() if str(v).strip()})

    normalized_rows = []
    for idx, row in df.iterrows():
        extracted = _extract_row_data(row, int(idx) + 2, suggested_mapping)
        normalized_rows.append(extracted)

    normalized_preview_rows = normalized_rows[:25]

    return jsonify({
        "headers":           headers,
        "suggested_mapping": suggested_mapping,
        "preview_rows":      preview_rows,
        "normalized_rows": normalized_rows,
        "normalized_preview_rows": normalized_preview_rows,
        "city_values": city_values,
        "total_rows":        total_rows,
    }), 200


# ── POST /api/uploads/applicants/import ──────────────────────────────────────

@upload_bp.route("/applicants/import", methods=["POST"])
@jwt_required()
def import_applicants():
    """
    Import applicants from an uploaded file using a confirmed column mapping.
    Expects multipart/form-data:
      - file: the Excel/CSV file
      - column_mapping (JSON string): { system_field: header_in_file }
      - assigned_oa_id (optional): int — override OA assignment for all rows
      - skip_duplicates (optional): "true"/"false" (default "true")
    Returns:
      { imported, skipped, errors: [{row, reason}] }
    """
    import json

    current_user = _get_current_user()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    f = request.files["file"]
    if not f.filename or not _allowed_file(f.filename):
        return jsonify({"error": "Unsupported file type."}), 400

    mapping_raw = request.form.get("column_mapping", "{}")
    try:
        column_mapping: dict[str, str] = json.loads(mapping_raw)
    except json.JSONDecodeError:
        return jsonify({"error": "column_mapping must be valid JSON."}), 400

    if not (
        (column_mapping.get("first_name") and column_mapping.get("last_name"))
        or column_mapping.get("full_name_original")
        or column_mapping.get("applicant_name")
    ):
        return jsonify({"error": "Map either Applicant Name, or both First Name and Last Name."}), 400

    assigned_oa_id_override, assignment_error = _resolve_assignable_user_by_id(request.form.get("assigned_oa_id"))
    if assignment_error:
        return jsonify({"error": assignment_error}), 400
    if assigned_oa_id_override is None and not is_admin(current_user):
        assigned_oa_id_override = current_user.id

    skip_duplicates = request.form.get("skip_duplicates", "true").lower() != "false"
    request_import_source = _clean(request.form.get("import_source"))
    request_import_batch_id = _clean(request.form.get("import_batch_id"))
    default_import_batch_id = request_import_batch_id or f"batch-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    row_overrides_raw = request.form.get("row_overrides", "{}")
    city_zip_updates_raw = request.form.get("city_zip_updates", "{}")
    try:
        row_overrides = json.loads(row_overrides_raw)
        city_zip_updates = {
            str(k).strip().lower(): _clean(v)
            for k, v in json.loads(city_zip_updates_raw).items()
        }
    except Exception:
        return jsonify({"error": "row_overrides and city_zip_updates must be valid JSON."}), 400

    try:
        df = _read_file_to_df(f)
    except Exception as exc:
        return jsonify({"error": f"Could not parse file: {exc}"}), 422

    if df.empty:
        return jsonify({"error": "The file contains no data rows."}), 422

    if len(df) > MAX_ROWS:
        return jsonify({"error": f"File exceeds {MAX_ROWS} row limit."}), 422

    df.columns = [c.strip() for c in df.columns]

    imported = 0
    skipped  = 0
    errors   = []
    warnings = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed with header = row 1

        row_override = row_overrides.get(str(row_num), {})
        extracted = _extract_row_data(row, row_num, column_mapping, row_override, city_zip_updates)

        first_name = extracted["first_name"]
        middle_name = extracted["middle_name"]
        last_name = extracted["last_name"]
        tracking_number = extracted["tracking_number"]

        if not first_name or not last_name:
            errors.append({"row": row_num, "reason": "Missing first or last name."})
            skipped += 1
            continue

        if extracted["warnings"]:
            warnings.append({"row": row_num, "warnings": extracted["warnings"]})

        phone = _clean(row_override.get("phone")) if "phone" in row_override else _clean(row[column_mapping["phone"]]) if column_mapping.get("phone") in row else None
        email = _clean(row_override.get("email")) if "email" in row_override else _clean(row[column_mapping["email"]]) if column_mapping.get("email") in row else None

        # Duplicate detection — tracking number first
        if skip_duplicates:
            if tracking_number:
                existing_tracking = Applicant.query.filter_by(tracking_number=tracking_number).first()
                if existing_tracking:
                    warnings.append({"row": row_num, "warnings": ["Duplicate tracking number"]})
                    errors.append({"row": row_num, "reason": "Duplicate tracking number."})
                    skipped += 1
                    continue

            # Duplicate detection — full name + age + city second
            if extracted["age"] is not None and extracted["city"]:
                existing_name_city = Applicant.query.filter(
                    db.func.lower(Applicant.first_name) == first_name.strip().lower(),
                    db.func.lower(Applicant.last_name) == last_name.strip().lower(),
                    Applicant.age == extracted["age"],
                    db.func.lower(Applicant.city) == extracted["city"].strip().lower(),
                ).first()
                if existing_name_city:
                    warnings.append({"row": row_num, "warnings": ["Duplicate full name + age + city"]})
                    errors.append({"row": row_num, "reason": "Duplicate full name + age + city."})
                    skipped += 1
                    continue

        # Status validation
        raw_status = extracted["application_status"]
        app_status = raw_status if raw_status in APPLICATION_STATUSES else "New Application"

        if extracted["case_status"] and extracted["case_status"].lower() == "withdrawn":
            app_status = "Withdrawn by Applicant"

        # Admin does not assign applicants during import. OA users import to themselves.
        if is_admin(current_user):
            oa_id = None
        else:
            oa_id = assigned_oa_id_override or current_user.id

        applicant = Applicant(
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            full_name_original=extracted["full_name_original"],
            tracking_number=tracking_number,
            phone=phone,
            email=email.lower() if email else None,
            age=extracted["age"],
            urgency=extracted["urgency"],
            case_status=extracted["case_status"],
            workflow_milestone=extracted["workflow_milestone"],
            case_creation_date=extracted["case_creation_date"],
            submitted_application_questionnaire=extracted["submitted_application_questionnaire"],
            submitted_health_questionnaire=extracted["submitted_health_questionnaire"],
            center_status=extracted["center_status"],
            days_in_queue=extracted["days_in_queue"],
            date_of_birth=_parse_date(_clean(row[column_mapping["date_of_birth"]])) if column_mapping.get("date_of_birth") in row else None,
            address=_clean(row[column_mapping["address"]]) if column_mapping.get("address") in row else None,
            city=extracted["city"],
            state=extracted["state"],
            zip_code=extracted["zip_code"],
            needs_zip_code=extracted["needs_zip_code"],
            county=_clean(row[column_mapping["county"]]) if column_mapping.get("county") in row else None,
            trade_interest=_clean(row[column_mapping["trade_interest"]]) if column_mapping.get("trade_interest") in row else None,
            education_status=_clean(row[column_mapping["education_status"]]) if column_mapping.get("education_status") in row else None,
            application_status=app_status,
            assigned_oa_id=oa_id,
            assigned_oa_name=extracted["assigned_oa_name"],
            import_source=extracted.get("import_source") or request_import_source or "report_upload",
            import_batch_id=extracted.get("import_batch_id") or default_import_batch_id,
            referral_source=_clean(row[column_mapping["referral_source"]]) if column_mapping.get("referral_source") in row else None,
            date_applied=_parse_date(_clean(row[column_mapping["date_applied"]])) if column_mapping.get("date_applied") in row else date.today(),
            notes=_clean(row[column_mapping["notes"]]) if column_mapping.get("notes") in row else None,
            source="Import",
        )
        db.session.add(applicant)
        db.session.flush()

        # Document checklist
        for doc_name in REQUIRED_DOCUMENT_CHECKLIST:
            db.session.add(ApplicantDocument(
                applicant_id=applicant.id,
                document_name=doc_name,
                is_required=True,
                is_received=False,
            ))

        # Status history
        db.session.add(ApplicationStatusHistory(
            applicant_id=applicant.id,
            old_status=None,
            new_status=app_status,
            status_reason="Imported via bulk upload.",
            changed_by_user_id=current_user.id,
        ))
        # Auto case note
        db.session.add(CaseNote(
            applicant_id=applicant.id,
            user_id=current_user.id,
            note_type="Initial Contact",
            reason="Applicant record created via bulk file import.",
            action="File parsed and record created.",
            plan="Follow up to confirm contact and next steps.",
            auto_generated=True,
        ))

        imported += 1

    db.session.add(AuditLog(
        user_id=current_user.id,
        action_type="IMPORT",
        entity_type="applicant",
        description=f"Bulk import: {imported} imported, {skipped} skipped, {len(errors)} errors, {len(warnings)} warning rows.",
    ))
    db.session.commit()

    return jsonify({
        "imported": imported,
        "skipped":  skipped,
        "errors":   errors,
        "warnings": warnings,
        "message":  f"Import complete. {imported} applicant(s) added.",
    }), 200
