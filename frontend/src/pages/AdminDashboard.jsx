/**
 * AdminDashboard — National overview for admin-level users.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import ChartCard from "../components/ChartCard.jsx";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <PageLayout title="Admin Dashboard">
      {/* ── National Metrics ──────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">National Overview</h2>
        <div className="cards-grid">
          <DashboardCard title="Total Applicants" value="—" icon="👥" color="navy" />
          <DashboardCard title="Complete Applications" value="—" icon="✅" color="green" />
          <DashboardCard title="Arrivals" value="—" icon="🎓" color="green" />
          <DashboardCard title="Withdrawals" value="—" icon="❌" color="red" />
          <DashboardCard title="Missing Documents" value="—" icon="📋" color="yellow" />
          <DashboardCard title="Outreach Visits" value="—" icon="📍" color="blue" />
          <DashboardCard title="Messages Sent" value="—" icon="💬" color="purple" />
          <DashboardCard title="Meetings Scheduled" value="—" icon="📅" color="blue" />
        </div>
        <p className="section-coming-soon">
          Live national data populates in Phase 4+.
        </p>
      </section>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Applicants by Status</h2>
        <div className="charts-grid">
          <ChartCard title="Application Status Distribution" height={300} />
          <ChartCard title="Applicants by State" height={300} />
        </div>
      </section>

      {/* ── Team Activity ─────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Team Activity</h2>
        <div className="cards-grid">
          <DashboardCard
            title="OA Activity This Month"
            value="—"
            icon="👤"
            color="navy"
            onClick={() => navigate("/team-performance")}
          />
          <DashboardCard
            title="Locations Not Visited 30+ Days"
            value="—"
            icon="⚠️"
            color="yellow"
            onClick={() => navigate("/locations")}
          />
          <DashboardCard
            title="Overdue Follow-Ups"
            value="—"
            icon="⏰"
            color="red"
            onClick={() => navigate("/applicants")}
          />
        </div>
      </section>
    </PageLayout>
  );
}
