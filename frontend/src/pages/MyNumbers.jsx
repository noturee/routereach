/**
 * MyNumbers — Personal performance dashboard for each OA user.
 */

import React, { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import apiClient from "../api/apiClient.js";

function pct(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

export default function MyNumbers() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/performance/my-numbers")
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = stats?.applicants_by_status || {};
  const conversion = stats?.conversion_rates || {};

  return (
    <PageLayout title="My Numbers">
      <section className="section">
        <h2 className="section-title">This Month — Applicant Activity</h2>
        <div className="cards-grid">
          <DashboardCard title="New Applications" value={loading ? "..." : (stats?.total_applicants ?? 0)} icon="📋" color="navy" />
          <DashboardCard title="Applicants Contacted" value={loading ? "..." : ((byStatus["Contact Made"] || 0) + (byStatus["Contact Attempted"] || 0))} icon="📞" color="blue" />
          <DashboardCard title="Interviews Scheduled" value={loading ? "..." : (byStatus["Interview Scheduled"] || 0)} icon="📅" color="blue" />
          <DashboardCard title="Interviews Completed" value={loading ? "..." : (byStatus["Interview Completed"] || 0)} icon="✅" color="green" />
          <DashboardCard title="Complete Applications" value={loading ? "..." : (byStatus["Complete Application"] || 0)} icon="🎯" color="green" />
          <DashboardCard title="Campus Referrals" value={loading ? "..." : (byStatus["Sent to Campus"] || 0)} icon="🏫" color="green" />
          <DashboardCard title="Arrivals" value={loading ? "..." : (stats?.arrivals || 0)} icon="🎓" color="green" />
          <DashboardCard title="Withdrawals" value={loading ? "..." : (stats?.withdrawals || 0)} icon="❌" color="red" />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Conversion Rates</h2>
        <div className="cards-grid">
          <DashboardCard title="Application → Contact" value={loading ? "..." : pct(conversion.application_to_contact)} icon="📊" color="navy" />
          <DashboardCard title="Contact → Interview" value={loading ? "..." : pct(conversion.contact_to_interview)} icon="📊" color="blue" />
          <DashboardCard title="Interview → Complete" value={loading ? "..." : pct(conversion.interview_to_complete)} icon="📊" color="green" />
          <DashboardCard title="Complete → Arrival" value={loading ? "..." : pct(conversion.complete_to_arrival)} icon="📊" color="green" />
          <DashboardCard title="Overall Conversion" value={loading ? "..." : pct(conversion.application_to_arrival)} icon="🏆" color="gold" />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Outreach Activity</h2>
        <div className="cards-grid">
          <DashboardCard title="Outreach Visits" value={loading ? "..." : (stats?.outreach_visits || 0)} icon="📍" color="blue" />
          <DashboardCard title="Routes Completed" value={loading ? "..." : (stats?.routes_completed || 0)} icon="🚗" color="green" />
          <DashboardCard title="Messages Sent" value={loading ? "..." : (stats?.messages_sent || 0)} icon="💬" color="purple" />
          <DashboardCard title="Meetings Scheduled" value={loading ? "..." : (stats?.meetings_scheduled || 0)} icon="📅" color="blue" />
          <DashboardCard title="Meetings Completed" value={loading ? "..." : (stats?.meetings_completed || 0)} icon="🤝" color="green" />
        </div>
      </section>
    </PageLayout>
  );
}
