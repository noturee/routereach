/**
 * OutreachMap — National map with applicant clusters and location pins.
 * Full implementation in Phase 10.
 */
import React from "react";
import PageLayout from "../components/PageLayout.jsx";
import MapView from "../components/MapView.jsx";

export default function OutreachMap() {
  return (
    <PageLayout title="Outreach Map">
      <section className="section">
        <div className="map-filters">
          <select className="form-select"><option>All States</option></select>
          <select className="form-select"><option>All Counties</option></select>
          <select className="form-select"><option>All Location Types</option></select>
          <select className="form-select"><option>All OA Users</option></select>
          <select className="form-select"><option>All Statuses</option></select>
        </div>
        <MapView height="600px" />
        <div className="map-legend">
          <span className="map-legend-item"><span className="dot dot-blue" /> Library</span>
          <span className="map-legend-item"><span className="dot dot-green" /> Workforce Office</span>
          <span className="map-legend-item"><span className="dot dot-purple" /> Community Org</span>
          <span className="map-legend-item"><span className="dot dot-orange" /> Apartment Complex</span>
          <span className="map-legend-item"><span className="dot dot-red" /> High Applicant Area</span>
          <span className="map-legend-item"><span className="dot dot-yellow" /> Follow-up Needed</span>
          <span className="map-legend-item"><span className="dot dot-gray" /> Not Visited Recently</span>
        </div>
      </section>
      <p className="section-coming-soon">Full Google Maps integration with live data coming in Phase 10.</p>
    </PageLayout>
  );
}
