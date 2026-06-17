/**
 * Reports — Standard reports with export options.
 * Full implementation in Phase 16.
 */
import React from "react";
import PageLayout from "../components/PageLayout.jsx";
import ReportExportButtons from "../components/ReportExportButtons.jsx";

const REPORT_LIST = [
  "Applicants by County",
  "Applicants by Status",
  "Missing Documents",
  "Complete Applications",
  "Withdrawals",
  "No Response",
  "Outreach Visits by OA",
  "Marketing Activity by County",
  "Locations Not Visited (30/60/90 Days)",
  "Messages Sent by OA",
  "Meetings Scheduled",
  "Routes Completed",
  "Applicant Clusters by ZIP",
  "Outreach Impact Report",
];

export default function Reports() {
  return (
    <PageLayout title="Reports">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Available Reports</h2>
          <ReportExportButtons
            onExportPdf={() => alert("PDF export coming in Phase 16.")}
            onExportExcel={() => alert("Excel export coming in Phase 16.")}
            onExportCsv={() => alert("CSV export coming in Phase 16.")}
          />
        </div>
        <div className="report-list">
          {REPORT_LIST.map((report) => (
            <div key={report} className="report-list-item">
              <span className="report-icon">📋</span>
              <span className="report-name">{report}</span>
              <button className="btn btn-sm btn-secondary" disabled>Run (Phase 16)</button>
            </div>
          ))}
        </div>
      </section>
      <p className="section-coming-soon">All reports with live data and export coming in Phase 16.</p>
    </PageLayout>
  );
}
