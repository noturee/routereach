/**
 * ChartCard — Wrapper around Recharts for displaying performance charts.
 * Full chart implementations built out in Phase 15/16.
 *
 * Props:
 *   title: string
 *   children: ReactNode (the chart itself)
 *   height: number (optional)
 */

import React from "react";

export default function ChartCard({ title, children, height = 300 }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">{title}</h3>
      </div>
      <div className="chart-card-body" style={{ minHeight: height }}>
        {children || (
          <div className="chart-placeholder">
            <span>Chart data loads in Phase 15/16</span>
          </div>
        )}
      </div>
    </div>
  );
}
