/**
 * OutreachLocations — Searchable, filterable list of all outreach locations.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import LocationFormModal from "../components/LocationFormModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate, isOverdue } from "../utils/dateUtils.js";
import { formatPhone } from "../utils/formatters.js";

const LOCATION_TYPES = [
  "Library","Workforce Office","Community Center","Apartment Complex",
  "School","High School","College","Trade School","Shelter","Food Pantry",
  "Church / Faith-Based Organization","Community Store","Barbershop / Salon",
  "Laundromat","Youth Program","Reentry Program","Housing Organization",
  "Health Clinic","Government Office","Nonprofit Organization",
  "Public Housing Site","Event Location","Employer","Other",
];

const STATUS_OPTIONS = [
  { value: "",                label: "All Statuses" },
  { value: "active",          label: "Active" },
  { value: "inactive",        label: "Inactive" },
  { value: "do_not_visit",    label: "Do Not Visit" },
  { value: "pending_approval",label: "Pending Approval" },
];

const COLUMNS = [
  { key: "location_name",     label: "Location Name" },
  { key: "location_type",     label: "Type" },
  { key: "city",              label: "City" },
  { key: "state",             label: "State" },
  { key: "county",            label: "County" },
  { key: "contact_person",    label: "Contact" },
  { key: "last_visit_date",   label: "Last Visit" },
  { key: "next_follow_up",    label: "Next Follow-up" },
  { key: "status_badge",      label: "Status" },
];

const STATUS_CLASS = {
  active:           "status-badge-enrolled",
  inactive:         "status-badge-pending",
  do_not_visit:     "status-badge-withdrawn",
  pending_approval: "status-badge-applied",
};

function statusLabel(s) {
  const map = {
    active: "Active", inactive: "Inactive",
    do_not_visit: "Do Not Visit", pending_approval: "Pending Approval",
  };
  return map[s] || s;
}

export default function OutreachLocations() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const [locations, setLocations]   = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(false);

  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [users, setUsers]           = useState([]);
  const [showModal, setShowModal]   = useState(false);

  // Load OA list (admin only)
  useEffect(() => {
    if (isAdmin) {
      apiClient.get("/users?role=outreach_associate&per_page=200")
        .then((r) => setUsers(r.data.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 50 });
    if (search)       params.set("search",  search);
    if (typeFilter)   params.set("type",    typeFilter);
    if (statusFilter) params.set("status",  statusFilter);

    apiClient.get(`/locations?${params}`)
      .then((r) => {
        setLocations(r.data.locations || []);
        setTotal(r.data.total || 0);
        setPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (payload) => {
    await apiClient.post("/locations", payload);
    setShowModal(false);
    load();
  };

  // Build display rows
  const rows = locations.map((loc) => {
    const overdue = loc.next_follow_up_date && isOverdue(loc.next_follow_up_date);
    return {
      ...loc,
      location_name:  <strong>{loc.location_name}</strong>,
      contact_person: loc.contact_person || "—",
      last_visit_date: loc.last_visit_date ? formatDate(loc.last_visit_date) : <span className="text-muted">None</span>,
      next_follow_up: loc.next_follow_up_date
        ? <span className={overdue ? "overdue-date" : ""}>{formatDate(loc.next_follow_up_date)}{overdue && " ⚠"}</span>
        : <span className="text-muted">Not set</span>,
      status_badge: (
        <span className={`status-badge ${STATUS_CLASS[loc.status] || "status-badge-applied"}`}>
          {statusLabel(loc.status)}
        </span>
      ),
    };
  });

  return (
    <PageLayout title="Outreach Locations">
      {/* Toolbar */}
      <div className="page-header-row">
        <div className="filter-bar">
          <input
            type="search"
            className="form-input filter-input"
            placeholder="Search by name, city, county, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {LOCATION_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="form-select filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Location</button>
      </div>

      {/* Stats row */}
      <div className="list-stats-row">
        {loading ? "Loading..." : `${total} location${total !== 1 ? "s" : ""}`}
        {(typeFilter || statusFilter || search) && (
          <button className="btn-link clear-filters" onClick={() => { setSearch(""); setTypeFilter(""); setStatusFilter("active"); }}>
            Clear filters
          </button>
        )}
      </div>

      <section className="section">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          onRowClick={(row) => navigate(`/locations/${row.id}`)}
          emptyMessage={loading ? "Loading locations..." : "No locations found. Add your first outreach location."}
        />
      </section>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination-row">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="page-label">Page {page} of {pages}</span>
          <button className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <LocationFormModal
          location={null}
          users={users}
          isAdmin={isAdmin}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </PageLayout>
  );
}
