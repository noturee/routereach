/**
 * MyNumbers — Personal performance dashboard for each OA user.
 * Full implementation in Phase 15.
 */

import React from "react";
import PageLayout from "../components/PageLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import ChartCard from "../components/ChartCard.jsx";

export default function MyNumbers() {
  return (
    <PageLayout title="My Numbers">
      <section className="section">
        <h2 className="section-title">This Month — Applicant Activity</h2>
        <div className="cards-grid">
          <DashboardCard title="New Applications" value="—" icon="📋" color="navy" />
          <DashboardCard title="Applicants Contacted" value="—" icon="📞" color="blue" />
          <DashboardCard title="Interviews Scheduled" value="—" icon="📅" color="blue" />
          <DashboardCard title="Interviews Completed" value="—" icon="✅" color="green" />
          <DashboardCard title="Complete Applications" value="—" icon="🎯" color="green" />
          <DashboardCard title="Campus Referrals" value="—" icon="🏫" color="green" />
          <DashboardCard title="Arrivals" value="—" icon="🎓" color="green" />
          <DashboardCard title="Withdrawals" value="—" icon="❌" color="red" />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Conversion Rates</h2>
        <div className="cards-grid">
          <DashboardCard title="Application → Contact" value="—%" icon="📊" color="navy" />
          <DashboardCard title="Contact → Interview" value="—%" icon="📊" color="blue" />
          <DashboardCard title="Interview → Complete" value="—%" icon="📊" color="green" />
          <DashboardCard title="Complete → Referral" value="—%" icon="📊" color="green" />
          <DashboardCard title="Referral → Arrival" value="—%" icon="📊" color="green" />
          <DashboardCard title="Overall Conversion" value="—%" icon="🏆" color="gold" />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Averages</h2>
        <div className="cards-grid">
          <DashboardCard title="Avg Days to Contact" value="—" subtitle="days" icon="⏱️" color="navy" />
          <DashboardCard title="Avg Days to Interview" value="—" subtitle="days" icon="⏱️" color="blue" />
          <DashboardCard title="Avg Days to Complete" value="—" subtitle="days" icon="⏱️" color="green" />
          <DashboardCard title="Avg Days in Missing Docs" value="—" subtitle="days" icon="⚠️" color="yellow" />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Outreach Activity</h2>
        <div className="cards-grid">
          <DashboardCard title="Locations Visited" value="—" icon="📍" color="blue" />
          <DashboardCard title="Routes Completed" value="—" icon="🚗" color="green" />
          <DashboardCard title="Texts Sent" value="—" icon="💬" color="purple" />
          <DashboardCard title="Emails Sent" value="—" icon="📧" color="navy" />
          <DashboardCard title="Meetings Scheduled" value="—" icon="📅" color="blue" />
          <DashboardCard title="Partner Contacts" value="—" icon="🤝" color="green" />
        </div>
      </section>

      <div className="section-coming-soon section">
        Phase 15 — Live metrics and charts will populate this page from your activity data.
      </div>
    </PageLayout>
  );
}
