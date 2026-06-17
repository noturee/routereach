/**
 * StatusBadge — Color-coded badge for application statuses.
 *
 * Props:
 *   status: string — application status string
 */

import React from "react";

const STATUS_COLORS = {
  "New Application": "badge-blue",
  "Contact Attempted": "badge-yellow",
  "Contact Made": "badge-blue",
  "Interview Scheduled": "badge-blue",
  "Interview Completed": "badge-blue",
  "Application Incomplete": "badge-yellow",
  "Missing Documents": "badge-yellow",
  "Health Questionnaire Pending": "badge-yellow",
  "Background Check Pending": "badge-yellow",
  "Background Check Cleared": "badge-green",
  "Complete Application": "badge-green",
  "Ready for Campus Review": "badge-green",
  "Sent to Campus": "badge-green",
  "Accepted": "badge-green",
  "Arrival Scheduled": "badge-green",
  "Arrived": "badge-green",
  "Withdrawn by Applicant": "badge-red",
  "Withdrawn by OA / Program": "badge-red",
  "Closed - No Response": "badge-red",
  "Closed - Incomplete": "badge-red",
  "Closed - Not Eligible": "badge-red",
  "Closed - Court / Legal Pending": "badge-red",
  "Paused / Holding": "badge-gray",
  "Reapply Later": "badge-gray",
};

export default function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || "badge-gray";
  return (
    <span className={`status-badge ${colorClass}`}>
      {status || "—"}
    </span>
  );
}
