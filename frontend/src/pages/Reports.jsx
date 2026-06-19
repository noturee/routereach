/**
 * Reports — Standard reports with export options.
 */
import React, { useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import ReportExportButtons from "../components/ReportExportButtons.jsx";
import DataTable from "../components/DataTable.jsx";
import apiClient from "../api/apiClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Form104Preview from "../components/reports/Form104Preview.tsx";
import { useNavigate } from "react-router-dom";

const REPORT_LIST = [
  { key: "applicants-by-county", label: "Applicants by County" },
  { key: "applicants-by-status", label: "Applicants by Status" },
  { key: "missing-documents", label: "Missing Documents" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "no-response", label: "No Response" },
  { key: "outreach-by-oa", label: "Outreach Visits by OA" },
  { key: "marketing-activity", label: "Marketing Activity" },
  { key: "messages-sent", label: "Messages Sent" },
  { key: "meetings-scheduled", label: "Meetings Scheduled" },
  { key: "routes-completed", label: "Routes Completed" },
  { key: "monthly-reports", label: "Outreach & Admissions Monthly Report" },
];

function downloadBlob(data, fileName, mime = "text/csv") {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeLabel, setActiveLabel] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [reportCols, setReportCols] = useState([]);
  const [error, setError] = useState("");
  const [form104ApplicantId, setForm104ApplicantId] = useState("");

  const runReport = async (report) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/reports/${report.key}`);
      const data = res.data?.data || [];
      const rows = Array.isArray(data) ? data : [];
      const cols = rows.length
        ? Object.keys(rows[0]).slice(0, 8).map((k) => ({ key: k, label: k.replaceAll("_", " ") }))
        : [];
      setActiveLabel(report.label);
      setReportRows(rows);
      setReportCols(cols);
    } catch (err) {
      setActiveLabel(report.label);
      setReportRows([]);
      setReportCols([]);
      setError(err.response?.data?.error || "Failed to run report.");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    const res = await apiClient.get("/reports/export/csv", { responseType: "text" });
    downloadBlob(res.data, "reports_export.csv", "text/csv");
  };

  const exportExcel = async () => {
    const res = await apiClient.get("/reports/export/excel", { responseType: "text" });
    downloadBlob(res.data, "reports_export.csv", "text/csv");
  };

  const exportPdf = async () => {
    const res = await apiClient.get("/reports/export/pdf");
    alert(res.data?.message || "PDF export endpoint responded.");
  };

  const exportWord = async () => {
    alert("Word export is available from the Monthly Reports page.");
  };

  const resultsSection = useMemo(() => {
    if (!activeLabel) return null;
    if (error) {
      return <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>;
    }
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <h3 className="section-title">{activeLabel} Results</h3>
        <DataTable
          columns={reportCols}
          rows={reportRows}
          loading={loading}
          emptyMessage={loading ? "Running report..." : "No rows returned for this report."}
        />
      </section>
    );
  }, [activeLabel, error, loading, reportCols, reportRows]);

  return (
    <PageLayout title="Reports">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Available Reports</h2>
          <ReportExportButtons
            onExportPdf={exportPdf}
            onExportWord={exportWord}
            onExportExcel={exportExcel}
            onExportCsv={exportCsv}
            loading={loading}
          />
        </div>
        <div className="report-list">
          {REPORT_LIST.map((report) => (
            <div key={report.key} className="report-list-item">
              <span className="report-icon">📋</span>
              <span className="report-name">{report.label}</span>
              {report.key === "monthly-reports" ? (
                <button className="btn btn-sm btn-secondary" onClick={() => navigate("/monthly-reports")} disabled={loading}>
                  Open
                </button>
              ) : (
                <button className="btn btn-sm btn-secondary" onClick={() => runReport(report)} disabled={loading}>
                  {loading && activeLabel === report.label ? "Running..." : "Run"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {resultsSection}

      <section className="section" style={{ marginTop: 16 }}>
        <h2 className="section-title">Form 1-04 Generator</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <label htmlFor="form104-applicant-id" style={{ fontWeight: 600 }}>Applicant ID</label>
          <input
            id="form104-applicant-id"
            className="form-input"
            style={{ maxWidth: 220 }}
            value={form104ApplicantId}
            onChange={(e) => setForm104ApplicantId(e.target.value)}
            placeholder="Enter applicant ID"
          />
        </div>
        {Number(form104ApplicantId) > 0 && (
          <Form104Preview
            applicantId={Number(form104ApplicantId)}
            createdBy={user ? `${user.first_name} ${user.last_name}` : undefined}
          />
        )}
      </section>
    </PageLayout>
  );
}
