/**
 * Dashboard — OA User home page with quick actions and today's summary.
 */

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";

const QUICK_ACTIONS = [
  { label: "Upload Applicants", path: "/upload-applicants", icon: "📤" },
  { label: "Add Location", path: "/locations/add", icon: "📍" },
  { label: "Plan Route", path: "/route-planner", icon: "🚗" },
  { label: "Send Message", path: "/messaging", icon: "💬" },
  { label: "Schedule Meeting", path: "/meetings", icon: "📅" },
  { label: "Create Case Note", path: "/case-notes", icon: "📝" },
  { label: "Log Visit", path: "/visit-logs", icon: "✅" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    apiClient.get("/reports/dashboard").then((r) => setDashboard(r.data)).catch(() => setDashboard(null));
    apiClient.get("/locations?status=active&per_page=200").then((r) => setLocations(r.data.locations || [])).catch(() => setLocations([]));
  }, []);

  const overdueLocations = useMemo(
    () => locations.filter((l) => l.next_follow_up_date && new Date(l.next_follow_up_date) < new Date()),
    [locations]
  );

  const byStatus = dashboard?.applicants_by_status || {};
  const assignedApplicants = Object.values(byStatus).reduce((sum, n) => sum + (Number(n) || 0), 0);

  return (
    <PageLayout title={`Welcome, ${user?.first_name || ""}!`}>
      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.path}
              className="quick-action-btn"
              onClick={() => navigate(action.path)}
            >
              <span className="quick-action-icon">{action.icon}</span>
              <span className="quick-action-label">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Today's Summary ───────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Today's Overview</h2>
        <div className="cards-grid">
          <DashboardCard title="Assigned Applicants" value={assignedApplicants || 0} icon="👥" color="navy" onClick={() => navigate("/applicants")} />
          <DashboardCard title="Follow-ups Due" value={overdueLocations.length} icon="⏰" color="yellow" onClick={() => navigate("/locations")} />
          <DashboardCard title="Missing Documents" value={byStatus["Missing Documents"] || 0} icon="📋" color="red" onClick={() => navigate("/applicants")} />
          <DashboardCard title="Meetings Scheduled" value={dashboard?.meetings_scheduled ?? "—"} icon="📅" color="blue" onClick={() => navigate("/meetings")} />
          <DashboardCard title="Routes Completed" value={dashboard?.routes_completed ?? "—"} icon="🚗" color="green" onClick={() => navigate("/route-planner")} />
          <DashboardCard title="Messages Sent" value={dashboard?.messages_sent_total ?? "—"} icon="💬" color="purple" onClick={() => navigate("/messaging")} />
        </div>
      </section>

      {/* ── Locations Not Recently Visited ────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Locations Not Visited Recently</h2>
        <div className="empty-state">
          <span className="empty-state-icon">📍</span>
          {overdueLocations.length === 0 ? (
            <p>No overdue location follow-ups right now.</p>
          ) : (
            <>
              <p>{overdueLocations.length} location follow-up{overdueLocations.length === 1 ? " is" : "s are"} overdue.</p>
              <button className="btn btn-primary" onClick={() => navigate("/locations")}>View Locations</button>
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
