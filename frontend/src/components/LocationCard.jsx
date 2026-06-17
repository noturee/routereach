/**
 * LocationCard — Summary card for an outreach location.
 *
 * Props:
 *   location: object
 *   onClick: function (optional)
 */

import React from "react";
import { formatDate } from "../utils/dateUtils.js";

const TYPE_COLORS = {
  "Library": "location-blue",
  "Workforce Office": "location-green",
  "Community Center": "location-purple",
  "Apartment Complex": "location-orange",
  "default": "location-gray",
};

export default function LocationCard({ location, onClick }) {
  const colorClass = TYPE_COLORS[location.location_type] || TYPE_COLORS.default;

  return (
    <div
      className={`location-card ${colorClass} ${onClick ? "location-card-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="location-card-header">
        <span className="location-card-name">{location.location_name}</span>
        <span className="location-card-type">{location.location_type}</span>
      </div>
      <div className="location-card-address">
        {location.address && <div>{location.address}</div>}
        {location.city && location.state && (
          <div>{location.city}, {location.state} {location.zip_code}</div>
        )}
      </div>
      <div className="location-card-footer">
        {location.last_visit_date ? (
          <span className="location-card-visit">
            Last visit: {formatDate(location.last_visit_date)}
          </span>
        ) : (
          <span className="location-card-no-visit">Never visited</span>
        )}
        {location.contact_person && (
          <span className="location-card-contact">{location.contact_person}</span>
        )}
      </div>
    </div>
  );
}
