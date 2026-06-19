/**
 * RoutePlanner — Build and manage outreach routes.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate } from "../utils/dateUtils.js";

const ROUTE_COLUMNS = [
  { key: "route_name", label: "Route" },
  { key: "route_date_fmt", label: "Date" },
  { key: "status", label: "Status" },
  { key: "stop_count", label: "Stops" },
  { key: "notes", label: "Notes" },
];

export default function RoutePlanner() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [locations, setLocations] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    route_name: "",
    route_date: "",
    notes: "",
    selectedLocationIds: [],
  });

  const loadRoutes = useCallback(() => {
    setLoading(true);
    apiClient
      .get("/routes")
      .then((r) => setRoutes(r.data.routes || []))
      .catch(() => setRoutes([]))
      .finally(() => setLoading(false));
  }, []);

  const loadLocations = useCallback(() => {
    apiClient
      .get("/locations/map")
      .then((r) => {
        const active = (r.data.locations || []).filter(
          (loc) => (loc.status || "").toLowerCase() === "active"
        );
        setLocations(active);
      })
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    loadRoutes();
    loadLocations();
  }, [loadRoutes, loadLocations]);

  const rows = useMemo(
    () =>
      routes.map((route) => ({
        ...route,
        route_date_fmt: formatDate(route.route_date),
        stop_count: Array.isArray(route.stops) ? route.stops.length : 0,
        notes: route.notes || "-",
      })),
    [routes]
  );

  const toggleLocation = (id) => {
    setForm((prev) => {
      const isSelected = prev.selectedLocationIds.includes(id);
      return {
        ...prev,
        selectedLocationIds: isSelected
          ? prev.selectedLocationIds.filter((v) => v !== id)
          : [...prev.selectedLocationIds, id],
      };
    });
  };

  const resetForm = () => {
    setForm({
      route_name: "",
      route_date: "",
      notes: "",
      selectedLocationIds: [],
    });
    setError("");
  };

  const createRoute = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.route_name.trim() || !form.route_date) {
      setError("Route name and route date are required.");
      return;
    }
    if (form.selectedLocationIds.length === 0) {
      setError("Select at least one location for this route.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        route_name: form.route_name.trim(),
        route_date: form.route_date,
        notes: form.notes?.trim() || null,
        stops: form.selectedLocationIds.map((outreach_location_id, idx) => ({
          outreach_location_id,
          stop_order: idx + 1,
        })),
      };
      await apiClient.post("/routes", payload);
      setShowCreate(false);
      resetForm();
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create route.");
    } finally {
      setCreating(false);
    }
  };

  const deleteRoute = async (routeId) => {
    if (!window.confirm("Delete this route?")) return;
    await apiClient.delete(`/routes/${routeId}`);
    loadRoutes();
  };

  return (
    <PageLayout title="Route Planner">
      <div className="page-header-row">
        <div className="list-stats-row">{loading ? "Loading..." : `${routes.length} route${routes.length === 1 ? "" : "s"}`}</div>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Close" : "+ New Route"}
        </button>
      </div>

      {showCreate && (
        <section className="section" style={{ marginBottom: 16 }}>
          <form onSubmit={createRoute} className="form-card">
            <h3 style={{ marginTop: 0 }}>Create Route</h3>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Route Name</label>
                <input
                  className="form-input"
                  value={form.route_name}
                  onChange={(e) => setForm((f) => ({ ...f, route_name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Route Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.route_date}
                  onChange={(e) => setForm((f) => ({ ...f, route_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Stops</label>
              {locations.length === 0 ? (
                <div className="alert alert-error">No active locations are available to route.</div>
              ) : (
                <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--border-color, #d0d7de)", borderRadius: 8, padding: 10 }}>
                  {locations.map((loc) => {
                    const checked = form.selectedLocationIds.includes(loc.id);
                    return (
                      <label key={loc.id} className="radio-label" style={{ display: "block", padding: "6px 0" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLocation(loc.id)}
                        />
                        {loc.location_name} ({loc.city || "Unknown city"}, {loc.state || "Unknown state"})
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { resetForm(); setShowCreate(false); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating || locations.length === 0}>
                {creating ? "Creating..." : "Create Route"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section">
        <DataTable
          columns={ROUTE_COLUMNS}
          rows={rows}
          emptyMessage={loading ? "Loading routes..." : "No routes found. Create your first route."}
          actions={(row) => (
            <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); deleteRoute(row.id); }}>
              Delete
            </button>
          )}
        />
      </section>
    </PageLayout>
  );
}
