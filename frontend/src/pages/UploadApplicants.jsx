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
  { key: "first_name",         label: "First Name",         required: true  },
  { key: "last_name",          label: "Last Name",          required: true  },
  { key: "phone",              label: "Phone",              required: false },
  { key: "email",              label: "Email",              required: false },
  { key: "age",                label: "Age",                required: false },
  { key: "date_of_birth",      label: "Date of Birth",      required: false },
  { key: "address",            label: "Street Address",     required: false },
  { key: "city",               label: "City",               required: false },
  { key: "state",              label: "State",              required: false },
  { key: "zip_code",           label: "ZIP Code",           required: false },
  { key: "county",             label: "County",             required: false },
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
  const [totalRows, setTotal]   = useState(0);
  const [mapping, setMapping]   = useState({});   // { system_field: column_header }

  // Import options
  const [skipDups, setSkipDups] = useState(true);
  const [oaId, setOaId]         = useState("");
  const [users, setUsers]       = useState([]);

  // Results
  const [result, setResult]     = useState(null);   // { imported, skipped, errors }
  const [error, setError]       = useState("");

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
    if (!mapping.first_name || !mapping.last_name) {
      setError("First Name and Last Name columns must be mapped.");
      return;
    }
    setError("");
    setStep("importing");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("column_mapping", JSON.stringify(mapping));
      fd.append("skip_duplicates", skipDups ? "true" : "false");
      if (oaId) fd.append("assigned_oa_id", oaId);

      const res = await apiClient.post("/uploads/applicants/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.error || "Import failed.");
      setStep("mapping");
    }
  };

  const reset = () => {
    setStep("select"); setFile(null); setHeaders([]); setRows([]);
    setTotal(0); setMapping({}); setResult(null); setError("");
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
              * Required. Column headers don't need to match exactly — the system auto-detects common variations.
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
                    className={`form-select ${required && !mapping[key] ? "form-select-error" : ""}`}
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
              Preview (first {Math.min(previewRows.length, 25)} rows)
            </div>
            <div className="data-table-wrapper" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="data-table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="data-table-row">
                      {headers.map((h) => (
                        <td key={h} className="data-table-td">
                          {row[h] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-secondary" onClick={reset}>
              ← Start Over
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={step === "importing" || !mapping.first_name || !mapping.last_name}
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
