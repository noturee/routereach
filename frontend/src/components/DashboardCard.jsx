/**
 * DashboardCard — Stat card for displaying a metric on dashboards.
 *
 * Props:
 *   title: string
 *   value: string | number
 *   subtitle: string (optional)
 *   color: "navy" | "gold" | "green" | "red" | "yellow" | "purple" (optional)
 *   icon: string (emoji or text, optional)
 *   onClick: function (optional)
 */

import React from "react";

export default function DashboardCard({ title, value, subtitle, color = "navy", icon, onClick }) {
  return (
    <div
      className={`dashboard-card dashboard-card-${color} ${onClick ? "dashboard-card-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="dashboard-card-header">
        {icon && <span className="dashboard-card-icon">{icon}</span>}
        <span className="dashboard-card-title">{title}</span>
      </div>
      <div className="dashboard-card-value">{value ?? "—"}</div>
      {subtitle && <div className="dashboard-card-subtitle">{subtitle}</div>}
    </div>
  );
}
