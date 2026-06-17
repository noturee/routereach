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
    "first_name":        ["first name", "first_name", "firstname", "fname", "first"],
    "last_name":         ["last name", "last_name", "lastname", "lname", "last"],
    "phone":             ["phone", "phone number", "cell", "mobile", "telephone", "cell phone"],
    "email":             ["email", "e-mail", "email address"],
    "age":               ["age"],
    "date_of_birth":     ["date of birth", "dob", "birth date", "birthdate", "birth_date"],
    "address":           ["address", "street", "street address", "street_address"],
    "city":              ["city"],
    "state":             ["state", "st"],
    "zip_code":          ["zip", "zip code", "zip_code", "postal code", "postal_code"],
    "county":            ["county"],
    "trade_interest":    ["trade", "trade interest", "trade_interest", "program", "program interest"],
    "education_status":  ["education", "education status", "education_status", "education level"],
    "application_status":["status", "application status", "application_status", "app status"],
    "assigned_oa":       ["assigned oa", "assigned_oa", "oa", "outreach advisor", "outreach_advisor", "advisor"],
    "date_applied":      ["date applied", "date_applied", "application date", "applied date", "applied"],
    "referral_source":   ["referral source", "referral_source", "referral", "source", "how did you hear"],
    "notes":             ["notes", "note", "comments", "comment", "additional notes"],
}

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


def _parse_date(val) -> date | None:
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(val).strip(), fmt).date()
        except ValueError:
            pass
    return None


def _get_current_user():
    return User.query.get(int(get_jwt_identity()))


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
    preview_rows      = df.head(25).to_dict(orient="records")
    total_rows        = len(df)

    return jsonify({
        "headers":           headers,
        "suggested_mapping": suggested_mapping,
        "preview_rows":      preview_rows,
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

    if not column_mapping.get("first_name") or not column_mapping.get("last_name"):
        return jsonify({"error": "column_mapping must include at least first_name and last_name."}), 400

    assigned_oa_id_override = request.form.get("assigned_oa_id")
    if assigned_oa_id_override:
        try:
            assigned_oa_id_override = int(assigned_oa_id_override)
        except ValueError:
            return jsonify({"error": "assigned_oa_id must be an integer."}), 400
    elif not is_admin(current_user):
        assigned_oa_id_override = current_user.id

    skip_duplicates = request.form.get("skip_duplicates", "true").lower() != "false"

    try:
        df = _read_file_to_df(f)
    except Exception as exc:
        return jsonify({"error": f"Could not parse file: {exc}"}), 422

    if df.empty:
        return jsonify({"error": "The file contains no data rows."}), 422

    if len(df) > MAX_ROWS:
        return jsonify({"error": f"File exceeds {MAX_ROWS} row limit."}), 422

    df.columns = [c.strip() for c in df.columns]

    def col(field: str):
        """Get raw column value header for a system field, or None."""
        return column_mapping.get(field)

    def val(row, field: str):
        header = col(field)
        if not header or header not in row:
            return None
        return _clean(row[header])

    imported = 0
    skipped  = 0
    errors   = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed with header = row 1

        first_name = val(row, "first_name")
        last_name  = val(row, "last_name")

        if not first_name or not last_name:
            errors.append({"row": row_num, "reason": "Missing first or last name."})
            skipped += 1
            continue

        phone = val(row, "phone")
        email = val(row, "email")

        # Duplicate detection — match on phone or email
        if skip_duplicates:
            dup_query = db.session.query(Applicant.id)
            conditions = []
            if phone:
                conditions.append(Applicant.phone == phone)
            if email:
                conditions.append(Applicant.email == email.lower())
            if conditions:
                existing = dup_query.filter(db.or_(*conditions)).first()
                if existing:
                    errors.append({
                        "row": row_num,
                        "reason": f"{first_name} {last_name} — duplicate phone or email, skipped.",
                    })
                    skipped += 1
                    continue

        # Status validation
        raw_status = val(row, "application_status")
        app_status = raw_status if raw_status in APPLICATION_STATUSES else "New Application"

        # Resolve assigned OA by name if provided
        oa_id = assigned_oa_id_override
        if not oa_id:
            oa_name = val(row, "assigned_oa")
            if oa_name:
                parts = oa_name.strip().split()
                if len(parts) >= 2:
                    match = User.query.filter(
                        User.first_name.ilike(parts[0]),
                        User.last_name.ilike(parts[-1]),
                    ).first()
                    if match:
                        oa_id = match.id
            if not oa_id:
                oa_id = current_user.id

        applicant = Applicant(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            email=email.lower() if email else None,
            age=int(val(row, "age")) if val(row, "age") and val(row, "age").isdigit() else None,
            date_of_birth=_parse_date(val(row, "date_of_birth")),
            address=val(row, "address"),
            city=val(row, "city"),
            state=val(row, "state"),
            zip_code=val(row, "zip_code"),
            county=val(row, "county"),
            trade_interest=val(row, "trade_interest"),
            education_status=val(row, "education_status"),
            application_status=app_status,
            assigned_oa_id=oa_id,
            referral_source=val(row, "referral_source"),
            date_applied=_parse_date(val(row, "date_applied")) or date.today(),
            notes=val(row, "notes"),
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
        description=f"Bulk import: {imported} imported, {skipped} skipped, {len(errors)} errors.",
    ))
    db.session.commit()

    return jsonify({
        "imported": imported,
        "skipped":  skipped,
        "errors":   errors,
        "message":  f"Import complete. {imported} applicant(s) added.",
    }), 200
