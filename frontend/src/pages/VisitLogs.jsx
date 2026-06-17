/**
 * VisitLogs — Global list of all outreach visit logs.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import VisitLogFormModal from "../components/VisitLogFormModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate } from "../utils/dateUtils.js";

const COLUMNS = [
  { key: "location_link",       label: "Location" },
  { key: "visit_date_fmt",      label: "Visit Date" },
  { key: "oa_name",             label: "OA" },
  { key: "marketing_type",      label: "Marketing Type" },
  { key: "materials_left",      label: "Materials" },
  { key: "quantity_left_fmt",   label: "Qty" },
  { key: "contact_person_met",  label: "Contact Met" },
  { key: "follow_up_badge",     label: "Follow-up?" },
];

export default function VisitLogs() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(false);

  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [followUp, setFollowUp]   = useState("");
  const [oaFilter, setOaFilter]   = useState("");

  const [locations, setLocations] = useState([]);
  const [users, setUsers]         = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Load supporting data
  useEffect(() => {
    apiClient.get("/locations?status=active&per_page=200")
      .then((r) => setLocations(r.data.locations || []))
      .catch(() => {});
    if (isAdmin) {
      apiClient.get("/users?per_page=200")
        .then((r) => setUsers(r.data.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 50 });
    if (dateFrom)  params.set("date_from", dateFrom);
    if (dateTo)    params.set("date_to",   dateTo);
    if (followUp)  params.set("follow_up_needed", followUp);
    if (oaFilter && isAdmin) params.set("oa_user_id", oaFilter);

    apiClient.get(`/visit-logs?${params}`)
      .then((r) => {
        setLogs(r.data.visit_logs || []);
        setTotal(r.data.total || 0);
        setPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, dateFrom, dateTo, followUp, oaFilter, isAdmin]);

  useEffect(() => { setPage(1); }, [dateFrom, dateTo, followUp, oaFilter]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (payload) => {
    await apiClient.post("/visit-logs", payload);
    setShowModal(false);
    load();
  };

  const handleDelete = async (logId) => {
    if (!window.confirm("Delete this visit log?")) return;
    await apiClient.delete(`/visit-logs/${logId}`);
    load();
  };

  const rows = logs.map((log) => ({
    ...log,
    location_link: (
      <button
        className="btn-link"
        onClick={(e) => { e.stopPropagation(); navigate(`/locations/${log.outreach_location_id}`); }}
      >
        {log.location?.location_name || `#${log.outreach_location_id}`}
      </button>
    ),
    visit_date_fmt:    formatDate(log.visit_date),
    oa_name:           log.oa_user ? `${log.oa_user.first_name} ${log.oa_user.last_name}` : "—",
    marketing_type:    log.marketing_type || "—",
    materials_left:    log.materials_left || "—",
    quantity_left_fmt: log.quantity_left ?? "—",
    contact_person_met: log.contact_person_met || "—",
    follow_up_badge:   log.follow_up_needed
      ? <span className="status-badge status-badge-pending">Follow-up</span>
      : <span className="text-muted">—</span>,
  }));

  return (
    <PageLayout title="Visit Logs">

      {/* Toolbar */}
      <div className="page-header-row">
        <div className="filter-bar">
          <input type="date" className="form-input filter-input" style={{ maxWidth: 160 }}
            value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
          />
          <input type="date" className="form-input filter-input" style={{ maxWidth: 160 }}
            value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            title="To date"
          />
          <select className="form-select filter-select" value={followUp} onChange={(e) => setFollowUp(e.target.value)}>
            <option value="">All Visits</option>
            <option value="true">Follow-up Needed</option>
            <option value="false">No Follow-up</option>
          </select>
          {isAdmin && users.length > 0 && (
            <select className="form-select filter-select" value={oaFilter} onChange={(e) => setOaFilter(e.target.value)}>
              <option value="">All OAs</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Visit</button>
      </div>

      {/* Stats */}
      <div className="list-stats-row">
        {loading ? "Loading..." : `${total} visit log${total !== 1 ? "s" : ""}`}
        {(dateFrom || dateTo || followUp || oaFilter) && (
          <button className="clear-filters" onClick={() => { setDateFrom(""); setDateTo(""); setFollowUp(""); setOaFilter(""); }}>
            Clear filters
          </button>
        )}
      </div>

      <section className="section">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          emptyMessage={loading ? "Loading..." : "No visit logs found."}
          actions={isAdmin ? (row) => (
            <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}>
              Delete
            </button>
          ) : null}
        />
      </section>

      {pages > 1 && (
        <div className="pagination-row">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="page-label">Page {page} of {pages}</span>
          <button className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {showModal && (
        <VisitLogFormModal
          log={null}
          locationId={null}
          locations={locations}
          users={users}
          isAdmin={isAdmin}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </PageLayout>
  );
}
