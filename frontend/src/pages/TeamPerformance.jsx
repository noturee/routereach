/**
 * TeamPerformance — Admin-only OA comparison dashboard.
 */

import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import apiClient from "../api/apiClient.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLUMNS = [
  { key: "name", label: "OA User" },
  { key: "new_applications", label: "New Apps" },
  { key: "contact_rate", label: "Contact Rate" },
  { key: "complete_applications", label: "Complete" },
  { key: "arrivals", label: "Arrivals" },
  { key: "outreach_visits", label: "Visits" },
  { key: "messages_sent", label: "Messages" },
  { key: "meetings_completed", label: "Meetings" },
  { key: "routes_completed", label: "Routes" },
];

function pct(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

export default function TeamPerformance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rowsRaw, setRowsRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiClient
      .get(`/performance/team?month=${month}&year=${year}`)
      .then((r) => setRowsRaw(r.data.team || []))
      .catch((err) => {
        setRowsRaw([]);
        setError(err.response?.data?.error || "Failed to load team performance.");
      })
      .finally(() => setLoading(false));
  }, [month, year]);

  const rows = useMemo(
    () => rowsRaw.map((row) => ({
      ...row,
      new_applications: row.total_applicants ?? 0,
      contact_rate: pct(row.conversion_rates?.application_to_contact),
      complete_applications: row.applicants_by_status?.["Complete Application"] || 0,
      arrivals: row.arrivals || 0,
      outreach_visits: row.outreach_visits || 0,
      messages_sent: row.messages_sent || 0,
      meetings_completed: row.meetings_completed || 0,
      routes_completed: row.routes_completed || 0,
    })),
    [rowsRaw]
  );

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <PageLayout title="Team Performance">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">OA Performance</h2>
          <div className="section-filters">
            <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
            </select>
            <select className="form-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <DataTable
          columns={COLUMNS}
          rows={rows}
          loading={loading}
          emptyMessage={loading ? "Loading performance data..." : "No team performance data found."}
        />
      </section>
    </PageLayout>
  );
}
