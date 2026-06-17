/**
 * ApplicantCard — Summary card for an applicant in list views.
 *
 * Props:
 *   applicant: object
 *   onClick: function (optional)
 */

import React from "react";
import StatusBadge from "./StatusBadge.jsx";
import { formatDate } from "../utils/dateUtils.js";

export default function ApplicantCard({ applicant, onClick }) {
  return (
    <div
      className={`applicant-card ${onClick ? "applicant-card-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="applicant-card-avatar">
        {applicant.first_name?.[0]}{applicant.last_name?.[0]}
      </div>
      <div className="applicant-card-info">
        <div className="applicant-card-name">
          {applicant.first_name} {applicant.last_name}
        </div>
        <div className="applicant-card-meta">
          {applicant.city && applicant.state && (
            <span>{applicant.city}, {applicant.state}</span>
          )}
          {applicant.phone && <span>{applicant.phone}</span>}
        </div>
        <StatusBadge status={applicant.application_status} />
      </div>
      <div className="applicant-card-dates">
        {applicant.date_applied && (
          <div className="applicant-card-date-label">
            Applied: <strong>{formatDate(applicant.date_applied)}</strong>
          </div>
        )}
        {applicant.next_follow_up_date && (
          <div className="applicant-card-date-label">
            Follow-up: <strong>{formatDate(applicant.next_follow_up_date)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
