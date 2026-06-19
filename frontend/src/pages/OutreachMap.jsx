/**
 * OutreachMap — National map with applicant clusters and location pins.
 */
import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import MapView from "../components/MapView.jsx";
import apiClient from "../api/apiClient.js";

const COLOR_BY_LOCATION_TYPE = {
  library: "#2563eb",
  "workforce office": "#16a34a",
  "community org": "#7c3aed",
  "community center": "#7c3aed",
  "apartment complex": "#ea580c",
};

export default function OutreachMap() {
  const [locations, setLocations] = useState([]);
  const [filterMeta, setFilterMeta] = useState({
    states: [],
    counties: [],
    location_types: [],
    oa_names: [],
    statuses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stateFilter, setStateFilter] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [locationTypeFilter, setLocationTypeFilter] = useState("");
  const [oaFilter, setOaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.get("/locations/map")
      .then((res) => {
        if (!cancelled) {
          setLocations(res.data.locations || []);
          setFilterMeta(res.data.filters || {
            states: [],
            counties: [],
            location_types: [],
            oa_names: [],
            statuses: [],
          });
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load outreach map details.");
          setLocations([]);
          setFilterMeta({
            states: [],
            counties: [],
            location_types: [],
            oa_names: [],
            statuses: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stateOptions = useMemo(
    () => (filterMeta.states?.length ? filterMeta.states : Array.from(new Set(locations.map((l) => l.state).filter(Boolean))).sort()),
    [filterMeta.states, locations]
  );

  const countyOptions = useMemo(
    () => {
      const source = filterMeta.counties?.length
        ? filterMeta.counties
        : Array.from(new Set(locations.map((l) => l.county).filter(Boolean))).sort();
      if (!stateFilter) return source;
      return source.filter((county) =>
        locations.some((l) => l.state === stateFilter && l.county === county)
      );
    },
    [filterMeta.counties, locations, stateFilter]
  );

  const locationTypeOptions = useMemo(
    () => (filterMeta.location_types?.length ? filterMeta.location_types : Array.from(new Set(locations.map((l) => l.location_type).filter(Boolean))).sort()),
    [filterMeta.location_types, locations]
  );

  const oaOptions = useMemo(
    () => (filterMeta.oa_names?.length ? filterMeta.oa_names : Array.from(new Set(locations.map((l) => l.assigned_oa_name).filter(Boolean))).sort()),
    [filterMeta.oa_names, locations]
  );

  const statusOptions = useMemo(
    () => (filterMeta.statuses?.length ? filterMeta.statuses : Array.from(new Set(locations.map((l) => l.status).filter(Boolean))).sort()),
    [filterMeta.statuses, locations]
  );

  const filteredLocations = useMemo(
    () => locations.filter((l) => {
      if (stateFilter && l.state !== stateFilter) return false;
      if (countyFilter && l.county !== countyFilter) return false;
      if (locationTypeFilter && l.location_type !== locationTypeFilter) return false;
      if (oaFilter && l.assigned_oa_name !== oaFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      return true;
    }),
    [locations, stateFilter, countyFilter, locationTypeFilter, oaFilter, statusFilter]
  );

  const markers = useMemo(
    () => filteredLocations
      .map((l) => {
        const lat = Number(l.latitude);
        const lng = Number(l.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          lat,
          lng,
          label: `${l.location_name || "Location"}${l.city ? ` (${l.city}${l.state ? `, ${l.state}` : ""})` : ""}`,
          color: COLOR_BY_LOCATION_TYPE[(l.location_type || "").toLowerCase()] || "#6b7280",
        };
      })
      .filter(Boolean),
    [filteredLocations]
  );

  return (
    <PageLayout title="Outreach Map">
      <section className="section">
        <div className="map-filters">
          <select className="form-select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All States</option>
            {stateOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select className="form-select" value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)}>
            <option value="">All Counties</option>
            {countyOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select className="form-select" value={locationTypeFilter} onChange={(e) => setLocationTypeFilter(e.target.value)}>
            <option value="">All Location Types</option>
            {locationTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select className="form-select" value={oaFilter} onChange={(e) => setOaFilter(e.target.value)}>
            <option value="">All OA Users</option>
            {oaOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setStateFilter("");
              setCountyFilter("");
              setLocationTypeFilter("");
              setOaFilter("");
              setStatusFilter("");
            }}
          >
            Clear Filters
          </button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
        <MapView height="600px" markers={markers} />
        <div style={{ fontSize: "0.82rem", color: "var(--color-gray-500)", marginTop: 8 }}>
          {loading
            ? "Loading map details..."
            : `Showing ${filteredLocations.length} location${filteredLocations.length !== 1 ? "s" : ""} · ${markers.length} mapped pin${markers.length !== 1 ? "s" : ""}`}
        </div>
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
    </PageLayout>
  );
}
