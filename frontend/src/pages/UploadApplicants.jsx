/**
 * UploadApplicants — Excel/CSV bulk import with preview and column mapping.
 * Phase 6 implementation.
 *
 * Flow:
 *   select → previewing → preview → importing → result
 */
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";

// System fields the user can map to
const SYSTEM_FIELDS = [
  { key: "tracking_number",      label: "Application Tracking Number", required: false },
  { key: "applicant_name",       label: "Applicant Name",              required: false },
  { key: "first_name",         label: "First Name",         required: false },
  { key: "middle_name",        label: "Middle Name",        required: false },
  { key: "last_name",          label: "Last Name",          required: false },
  { key: "phone",              label: "Phone",              required: false },
  { key: "email",              label: "Email",              required: false },
  { key: "age",                label: "Age",                required: false },
  { key: "urgency",            label: "Urgency",            required: false },
  { key: "case_status",        label: "Case Status",        required: false },
  { key: "workflow_milestone", label: "Workflow Milestone", required: false },
  { key: "case_creation_date", label: "Case Creation Date", required: false },
  { key: "submitted_application_questionnaire", label: "Submitted Application Questionnaire", required: false },
  { key: "submitted_health_questionnaire", label: "Submitted Health Questionnaire", required: false },
  { key: "date_of_birth",      label: "Date of Birth",      required: false },
  { key: "address",            label: "Street Address",     required: false },
  { key: "city",               label: "City",               required: false },
  { key: "state",              label: "State",              required: false },
  { key: "zip_code",           label: "ZIP Code",           required: false },
  { key: "county",             label: "County",             required: false },
  { key: "assigned_oa_name",   label: "Assigned To",        required: false },
  { key: "import_source",      label: "Import Source",      required: false },
  { key: "import_batch_id",    label: "Import Batch ID",    required: false },
  { key: "center_status",      label: "Center Status",      required: false },
  { key: "days_in_queue",      label: "Days in Queue",      required: false },
  { key: "trade_interest",     label: "Trade Interest",     required: false },
  { key: "education_status",   label: "Education Status",   required: false },
  { key: "application_status", label: "Application Status", required: false },
  { key: "assigned_oa",        label: "Assigned OA",        required: false },
  { key: "date_applied",       label: "Date Applied",       required: false },
  { key: "referral_source",    label: "Referral Source",    required: false },
  { key: "notes",              label: "Notes",              required: false },
];

// Steps
const STEPS = ["Select File", "Map Columns", "Import"];

export default function UploadApplicants() {
  const navigate  = useNavigate();
  const { isAdmin } = useAuth();
  const fileRef   = useRef(null);

  // Step: 'select' | 'previewing' | 'mapping' | 'importing' | 'result'
  const [step, setStep]         = useState("select");
  const [dragging, setDragging] = useState(false);

  // File + preview data
  const [file, setFile]         = useState(null);
  const [headers, setHeaders]   = useState([]);
  const [previewRows, setRows]  = useState([]);
  const [normalizedRows, setNormalizedRows] = useState([]);
  const [cityValues, setCityValues] = useState([]);
  const [totalRows, setTotal]   = useState(0);
  const [mapping, setMapping]   = useState({});   // { system_field: column_header }

  // Import options
  const [skipDups, setSkipDups] = useState(true);
  const [oaId, setOaId]         = useState("");
  const [users, setUsers]       = useState([]);

  // Results
  const [result, setResult]     = useState(null);   // { imported, skipped, errors }
  const [importWarnings, setImportWarnings] = useState([]);
  const [error, setError]       = useState("");
  const [bulkCity, setBulkCity] = useState("");
  const [bulkZip, setBulkZip] = useState("");

  const normalizePreviewRow = (row) => ({
    ...row,
    row_number: row.row_number ?? row.row_num,
    warning_messages: row.warning_messages ?? row.warnings ?? [],
  });

  useEffect(() => {
    if (isAdmin) {
      apiClient.get("/users?is_active=true&per_page=200")
        .then((r) => setUsers(r.data.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  // ── File selection ────────────────────────────────────────────────────────

  const acceptFile = (f) => {
    if (!f) return;
    const ok = f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv");
    if (!ok) { setError("Only .xlsx, .xls, or .csv files are supported."); return; }
    setError("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  // ── Step 1 → 2: Preview ───────────────────────────────────────────────────

  const handlePreview = async () => {
    if (!file) return;
    setError("");
    setStep("previewing");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiClient.post("/uploads/applicants/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHeaders(res.data.headers);
      setRows(res.data.preview_rows);
      setNormalizedRows((res.data.normalized_rows || res.data.normalized_preview_rows || []).map(normalizePreviewRow));
      setCityValues(res.data.city_values || []);
      setTotal(res.data.total_rows);
      setMapping(res.data.suggested_mapping || {});
      setStep("mapping");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse file.");
      setStep("select");
    }
  };

  const setMapField = (field, header) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (header === "") {
        delete next[field];
      } else {
        next[field] = header;
      }
      return next;
    });
  };

  // ── Step 2 → 3: Import ────────────────────────────────────────────────────

  const handleImport = async () => {
    const hasSplitName = mapping.first_name && mapping.last_name;
    const hasApplicantName = Boolean(mapping.applicant_name || mapping.full_name_original);
    if (!hasSplitName && !hasApplicantName) {
      setError("Map Applicant Name, or map both First Name and Last Name.");
      return;
    }
    setError("");
    setStep("importing");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("column_mapping", JSON.stringify(mapping));
      fd.append("skip_duplicates", skipDups ? "true" : "false");
      const rowOverrides = Object.fromEntries(
        normalizedRows.map((row) => [String(row.row_number ?? row.row_num), row])
      );
      fd.append("row_overrides", JSON.stringify(rowOverrides));
      fd.append("city_zip_updates", JSON.stringify(bulkZip && bulkCity ? { [bulkCity]: bulkZip } : {}));
      if (oaId) fd.append("assigned_oa_id", oaId);

      const res = await apiClient.post("/uploads/applicants/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setImportWarnings(res.data.warnings || []);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.error || "Import failed.");
      setStep("mapping");
    }
  };

  const reset = () => {
    setStep("select"); setFile(null); setHeaders([]); setRows([]);
    setNormalizedRows([]); setCityValues([]);
    setTotal(0); setMapping({}); setResult(null); setImportWarnings([]); setError("");
    setBulkCity(""); setBulkZip("");
  };

  const updateRowField = (rowNumber, field, value) => {
    setNormalizedRows((prev) => prev.map((row) => (
      (row.row_number ?? row.row_num) === rowNumber ? { ...row, [field]: value } : row
    )));
  };

  const applyBulkZipByCity = () => {
    const city = bulkCity.trim();
    const zip = bulkZip.trim();
    if (!city || !zip) return;
    setNormalizedRows((prev) => prev.map((row) => {
      if ((row.city || "").trim().toLowerCase() === city.toLowerCase() && !(row.zip_code || "").trim()) {
        return { ...row, zip_code: zip, needs_zip_code: false };
      }
      return row;
    }));
  };

  // ── Step indicator ────────────────────────────────────────────────────────

  const stepIndex = step === "select" || step === "previewing" ? 0
    : step === "mapping" || step === "importing" ? 1
    : 2;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout title="Upload Applicants">
      {/* Step bar */}
      <div className="upload-step-bar">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`upload-step ${i < stepIndex ? "upload-step-done" : i === stepIndex ? "upload-step-active" : ""}`}>
              <div className="upload-step-num">{i < stepIndex ? "✓" : i + 1}</div>
              <span>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`upload-step-line ${i < stepIndex ? "upload-step-line-done" : ""}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* ── Step 0: Select File ──────────────────────────────────────────── */}
      {(step === "select" || step === "previewing") && (
        <div>
          <p className="section-description">
            Upload an Excel (.xlsx/.xls) or CSV file to import applicants in bulk.
            The system will detect column headings and map them automatically.
          </p>

          <div
            className={`upload-dropzone ${dragging ? "upload-dropzone-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            <span className="upload-icon">📤</span>
            <p className="upload-text">
              {file ? file.name : "Drag and drop your Excel or CSV file here"}
            </p>
            {!file && <p className="upload-or">— or click to browse —</p>}
            {file && (
              <p style={{ fontSize: "0.82rem", color: "var(--color-gray-500)", marginTop: 4 }}>
                {(file.size / 1024).toFixed(1)} KB · Click to change
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => acceptFile(e.target.files[0])}
            />
          </div>

          {file && (
            <div className="upload-actions">
              <button
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={step === "previewing"}
              >
                {step === "previewing" ? "Parsing file…" : "Preview & Map Columns →"}
              </button>
            </div>
          )}

          {/* Supported columns reference */}
          <div className="upload-columns-reference" style={{ marginTop: 24 }}>
            <h3>Supported Column Names</h3>
            <div className="tag-cloud" style={{ marginTop: 8 }}>
              {SYSTEM_FIELDS.map(({ key, label, required }) => (
                <span key={key} className={`tag ${required ? "tag-required" : ""}`}>
                  {label}{required ? " *" : ""}
                </span>
              ))}
            </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-gray-400)", marginTop: 8 }}>
              Applicant Name is required, but it may come from either a single full-name column or separate first/last name columns. Other fields can be filled manually after import.
            </p>
            <a
              href="/sample_applicant_upload.csv"
              download
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12, display: "inline-flex" }}
            >
              ⬇ Download Sample CSV
            </a>
          </div>
        </div>
      )}

      {/* ── Step 1: Map Columns ──────────────────────────────────────────── */}
      {(step === "mapping" || step === "importing") && (
        <div>
          <div className="upload-preview-header">
            <div>
              <strong>{file?.name}</strong>
              <span style={{ marginLeft: 12, color: "var(--color-gray-500)", fontSize: "0.85rem" }}>
                {totalRows} row{totalRows !== 1 ? "s" : ""} detected
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={reset}>
              ✕ Change File
            </button>
          </div>

          {/* Column mapper */}
          <div className="form-card" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Column Mapping</div>
            <p style={{ fontSize: "0.82rem", color: "var(--color-gray-500)", marginBottom: 16 }}>
              Match each system field to the corresponding column in your file.
              Fields marked <span style={{ color: "var(--color-red)" }}>*</span> are required.
            </p>
            <div className="column-mapper-grid">
              {SYSTEM_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="column-mapper-row">
                  <label className="column-mapper-label">
                    {label}
                    {required && <span style={{ color: "var(--color-red)", marginLeft: 2 }}>*</span>}
                  </label>
                  <select
                    className={`form-select ${required && !mapping[key] && !["first_name", "last_name"].includes(key) ? "form-select-error" : ""}`}
                    value={mapping[key] || ""}
                    onChange={(e) => setMapField(key, e.target.value)}
                  >
                    <option value="">— Not mapped —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Import options */}
          <div className="form-card" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Import Options</div>
            <div className="form-row">
              <label className="radio-label" style={{ alignItems: "flex-start", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={skipDups}
                  onChange={(e) => setSkipDups(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Skip duplicates</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-gray-500)" }}>
                    Skip rows where phone or email already exists in the database
                  </div>
                </div>
              </label>
            </div>
            {isAdmin && users.length > 0 && (
              <div className="form-group" style={{ marginTop: 12, maxWidth: 360 }}>
                <label className="form-label">Assign all imported applicants to OA (optional)</label>
                <select className="form-select" value={oaId} onChange={(e) => setOaId(e.target.value)}>
                  <option value="">Use OA column from file / assign to me</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Preview table */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              Editable Import Preview ({normalizedRows.length} rows)
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <select className="form-select" value={bulkCity} onChange={(e) => setBulkCity(e.target.value)} style={{ minWidth: 220 }}>
                <option value="">Select City/Town for bulk ZIP</option>
                {cityValues.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <input
                className="form-input"
                placeholder="ZIP Code"
                value={bulkZip}
                onChange={(e) => setBulkZip(e.target.value)}
                style={{ maxWidth: 140 }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={applyBulkZipByCity}>
                Apply ZIP to City
              </button>
            </div>
            <div className="data-table-wrapper" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="data-table-th">Row</th>
                    <th className="data-table-th">First Name</th>
                    <th className="data-table-th">Middle Name</th>
                    <th className="data-table-th">Last Name</th>
                    <th className="data-table-th">City</th>
                    <th className="data-table-th">State</th>
                    <th className="data-table-th">ZIP Code</th>
                    <th className="data-table-th">Assigned OA</th>
                    <th className="data-table-th">Status</th>
                    <th className="data-table-th">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedRows.slice(0, 150).map((row) => (
                    <tr key={row.row_number ?? row.row_num} className="data-table-row">
                      <td className="data-table-td">{row.row_number ?? row.row_num}</td>
                      <td className="data-table-td"><input className="form-input" value={row.first_name || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "first_name", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.middle_name || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "middle_name", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.last_name || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "last_name", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.city || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "city", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.state || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "state", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.zip_code || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "zip_code", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.assigned_oa_name || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "assigned_oa_name", e.target.value)} /></td>
                      <td className="data-table-td"><input className="form-input" value={row.case_status || ""} onChange={(e) => updateRowField(row.row_number ?? row.row_num, "case_status", e.target.value)} /></td>
                      <td className="data-table-td" style={{ color: "var(--color-yellow)" }}>{(row.warning_messages || []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {normalizedRows.length > 150 && (
              <div style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--color-gray-500)" }}>
                Showing first 150 rows in editor. All rows are still included in import.
              </div>
            )}
          </div>

          {/* Import button */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-secondary" onClick={reset}>
              ← Start Over
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={step === "importing" || (!(mapping.first_name && mapping.last_name) && !(mapping.applicant_name || mapping.full_name_original))}
            >
              {step === "importing"
                ? `Importing ${totalRows} row${totalRows !== 1 ? "s" : ""}…`
                : `Import ${totalRows} Applicant${totalRows !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Result ───────────────────────────────────────────────── */}
      {step === "result" && result && (
        <div>
          <div className="import-result-banner">
            <div className="import-result-stat import-result-green">
              <div className="import-result-num">{result.imported}</div>
              <div className="import-result-label">Imported</div>
            </div>
            <div className="import-result-stat import-result-yellow">
              <div className="import-result-num">{result.skipped}</div>
              <div className="import-result-label">Skipped</div>
            </div>
            <div className="import-result-stat import-result-red">
              <div className="import-result-num">{result.errors?.length || 0}</div>
              <div className="import-result-label">Errors</div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Rows with Issues</div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="data-table-th">Row #</th>
                      <th className="data-table-th">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="data-table-td">{e.row}</td>
                        <td className="data-table-td" style={{ color: "var(--color-red)" }}>{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importWarnings.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Validation Warnings</div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="data-table-th">Row #</th>
                      <th className="data-table-th">Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importWarnings.map((w, i) => (
                      <tr key={i}>
                        <td className="data-table-td">{w.row}</td>
                        <td className="data-table-td" style={{ color: "var(--color-yellow)" }}>{(w.warnings || []).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate("/applicants")}>
              View Applicants →
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
