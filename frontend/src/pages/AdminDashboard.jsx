/**
 * AdminDashboard — National overview for admin-level users.
 */

import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import ChartCard from "../components/ChartCard.jsx";
import apiClient from "../api/apiClient.js";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [impact, setImpact] = useState([]);
  const [conversion, setConversion] = useState(null);

  useEffect(() => {
    apiClient.get("/reports/dashboard").then((r) => setDashboard(r.data)).catch(() => setDashboard(null));
    apiClient.get("/performance/outreach-impact").then((r) => setImpact(r.data.by_location_type || [])).catch(() => setImpact([]));
    apiClient.get("/performance/conversion-rates").then((r) => setConversion(r.data)).catch(() => setConversion(null));
  }, []);

  const byStatus = dashboard?.applicants_by_status || {};
  const totalApplicants = dashboard?.total_applicants ?? 0;
  const completeApps = byStatus["Complete Application"] || 0;
  const arrivals = byStatus["Arrived"] || 0;
  const withdrawals = (byStatus["Withdrawn by Applicant"] || 0) + (byStatus["Withdrawn by OA / Program"] || 0);
  const missingDocs = byStatus["Missing Documents"] || 0;

  return (
    <PageLayout title="Admin Dashboard">
      {/* ── National Metrics ──────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">National Overview</h2>
        <div className="cards-grid">
          <DashboardCard title="Total Applicants" value={totalApplicants} icon="👥" color="navy" />
          <DashboardCard title="Complete Applications" value={completeApps} icon="✅" color="green" />
          <DashboardCard title="Arrivals" value={arrivals} icon="🎓" color="green" />
          <DashboardCard title="Withdrawals" value={withdrawals} icon="❌" color="red" />
          <DashboardCard title="Missing Documents" value={missingDocs} icon="📋" color="yellow" />
          <DashboardCard title="Outreach Visits" value={dashboard?.visits_this_month ?? 0} icon="📍" color="blue" />
          <DashboardCard title="Messages Sent" value={dashboard?.messages_sent_total ?? 0} icon="💬" color="purple" />
          <DashboardCard title="Meetings Scheduled" value={dashboard?.meetings_scheduled ?? 0} icon="📅" color="blue" />
        </div>
      </section>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Applicants by Status</h2>
        <div className="charts-grid">
          <ChartCard title="Application Status Distribution" height={300}>
            <div className="form-card" style={{ boxShadow: "none", border: "none" }}>
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="info-row">
                  <span className="info-row-label">{status}</span>
                  <span className="info-row-value">{count}</span>
                </div>
              ))}
              {Object.keys(byStatus).length === 0 && <div className="text-muted">No status data available.</div>}
            </div>
          </ChartCard>
          <ChartCard title="Outreach by Location Type" height={300}>
            <div className="form-card" style={{ boxShadow: "none", border: "none" }}>
              {impact.map((row) => (
                <div key={row.location_type || "Unknown"} className="info-row">
                  <span className="info-row-label">{row.location_type || "Unknown"}</span>
                  <span className="info-row-value">{row.visits}</span>
                </div>
              ))}
              {impact.length === 0 && <div className="text-muted">No outreach impact data available.</div>}
            </div>
          </ChartCard>
        </div>
      </section>

      {/* ── Team Activity ─────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Team Activity</h2>
        <div className="cards-grid">
          <DashboardCard
            title="OA Activity This Month"
            value={dashboard?.routes_completed ?? 0}
            icon="👤"
            color="navy"
            onClick={() => navigate("/team-performance")}
          />
          <DashboardCard
            title="Locations Not Visited 30+ Days"
            value={impact.length}
            icon="⚠️"
            color="yellow"
            onClick={() => navigate("/locations")}
          />
          <DashboardCard
            title="Overdue Follow-Ups"
            value={conversion?.contacted ?? 0}
            icon="⏰"
            color="red"
            onClick={() => navigate("/applicants")}
          />
        </div>
      </section>
    </PageLayout>
  );
}
