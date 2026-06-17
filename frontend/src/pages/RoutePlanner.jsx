/**
 * RoutePlanner — Build and manage outreach routes.
 * Full implementation in Phase 11.
 */
import React from "react";
import PageLayout from "../components/PageLayout.jsx";

export default function RoutePlanner() {
  return (
    <PageLayout title="Route Planner">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">My Routes</h2>
          <button className="btn btn-primary" disabled>+ New Route (Phase 11)</button>
        </div>
        <div className="empty-state">
          <span className="empty-state-icon">🚗</span>
          <p>Plan outreach routes by selecting locations, ordering stops, and setting dates.</p>
          <p>Route planner coming in Phase 11.</p>
        </div>
      </section>
    </PageLayout>
  );
}
