/**
 * TeamPerformance — Admin-only OA comparison dashboard.
 * Full implementation in Phase 18.
 */
import React from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";

const COLUMNS = [
  { key: "name", label: "OA User" },
  { key: "territory", label: "Territory" },
  { key: "new_applications", label: "New Apps" },
  { key: "contact_rate", label: "Contact Rate" },
  { key: "complete_applications", label: "Complete" },
  { key: "arrivals", label: "Arrivals" },
  { key: "outreach_visits", label: "Visits" },
  { key: "overdue_followups", label: "Overdue" },
];

export default function TeamPerformance() {
  return (
    <PageLayout title="Team Performance">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">OA Performance — Current Month</h2>
          <div className="section-filters">
            <select className="form-select"><option>All States</option></select>
            <select className="form-select"><option>All Counties</option></select>
            <select className="form-select"><option>Current Month</option></select>
          </div>
        </div>
        <DataTable columns={COLUMNS} rows={[]} emptyMessage="Performance data loads in Phase 18." />
      </section>
      <p className="section-coming-soon">Full team performance dashboard coming in Phase 18.</p>
    </PageLayout>
  );
}
