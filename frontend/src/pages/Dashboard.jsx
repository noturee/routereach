/**
 * Dashboard — OA User home page with quick actions and today's summary.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

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
          <DashboardCard title="Assigned Applicants" value="—" icon="👥" color="navy" onClick={() => navigate("/applicants")} />
          <DashboardCard title="Follow-ups Due Today" value="—" icon="⏰" color="yellow" onClick={() => navigate("/applicants")} />
          <DashboardCard title="Missing Documents" value="—" icon="📋" color="red" onClick={() => navigate("/applicants")} />
          <DashboardCard title="Meetings This Week" value="—" icon="📅" color="blue" onClick={() => navigate("/meetings")} />
          <DashboardCard title="Today's Route" value="—" icon="🚗" color="green" onClick={() => navigate("/route-planner")} />
          <DashboardCard title="Unread Messages" value="—" icon="💬" color="purple" onClick={() => navigate("/messaging")} />
        </div>
        <p className="section-coming-soon">
          Live data will populate here in Phase 4+. Connect your backend to see real numbers.
        </p>
      </section>

      {/* ── Locations Not Recently Visited ────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Locations Not Visited Recently</h2>
        <div className="empty-state">
          <span className="empty-state-icon">📍</span>
          <p>Location data loads in Phase 8. Add your outreach locations to see overdue visits here.</p>
          <button className="btn btn-primary" onClick={() => navigate("/locations")}>
            View Locations
          </button>
        </div>
      </section>
    </PageLayout>
  );
}
