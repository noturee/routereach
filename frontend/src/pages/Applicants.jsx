/**
 * Applicants — Full list view with search, filters, pagination, and create.
 * Phase 4 implementation.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ApplicantFormModal from "../components/ApplicantFormModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate } from "../utils/dateUtils.js";
import { formatPhone } from "../utils/formatters.js";

const STATUS_FILTERS = [
  "All Statuses",
  "New Application","Contact Attempted","Contact Made","Interview Scheduled",
  "Interview Completed","Application Incomplete","Missing Documents",
  "Health Questionnaire Pending","Background Check Pending",
  "Background Check Cleared","Complete Application","Ready for Campus Review",
  "Sent to Campus","Accepted","Arrival Scheduled","Arrived",
  "Withdrawn by Applicant","Withdrawn by OA / Program",
  "Closed - No Response","Closed - Incomplete","Closed - Not Eligible",
  "Closed - Court / Legal Pending","Paused / Holding","Reapply Later",
];

const COLUMNS = [
  { key: "full_name",    label: "Name",      sortable: true, render: (r) => (
    <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span>
  )},
  { key: "phone",        label: "Phone",     render: (r) => formatPhone(r.phone) || "—" },
  { key: "city",         label: "City / State", render: (r) =>
    [r.city, r.state].filter(Boolean).join(", ") || "—"
  },
  { key: "application_status", label: "Status", render: (r) =>
    <StatusBadge status={r.application_status} />
  },
  { key: "date_applied", label: "Date Applied", sortable: true, render: (r) =>
    formatDate(r.date_applied) || "—"
  },
  { key: "next_follow_up_date", label: "Follow-up", sortable: true, render: (r) => {
    if (!r.next_follow_up_date) return "—";
    const d = new Date(r.next_follow_up_date);
    const isOverdue = d < new Date() && !r.is_complete && !r.is_withdrawn;
    return (
      <span style={{ color: isOverdue ? "var(--color-red)" : undefined, fontWeight: isOverdue ? 600 : undefined }}>
        {formatDate(r.next_follow_up_date)}
        {isOverdue && " ⚠️"}
      </span>
    );
  }},
  { key: "assigned_oa",  label: "Assigned OA", render: (r) =>
    r.assigned_oa ? `${r.assigned_oa.first_name} ${r.assigned_oa.last_name}` : "—"
  },
];

export default function Applicants() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const perPage                     = 50;

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("All Statuses");
  const [stateFilter, setState]       = useState("");
  const [showWithdrawn, setWithdrawn] = useState(false);
  const [showComplete, setComplete]   = useState(false);

  const [flash, setFlash]       = useState("");
  const [flashType, setFlashType] = useState("success");
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers]       = useState([]);

  const searchRef = useRef(null);

  const flash$ = (msg, type = "success") => {
    setFlash(msg);
    setFlashType(type);
    setTimeout(() => setFlash(""), 4000);
  };

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: perPage });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All Statuses") params.set("status", statusFilter);
      if (stateFilter) params.set("state", stateFilter);
      if (showWithdrawn) params.set("is_withdrawn", "true");
      if (showComplete) params.set("is_complete", "true");

      const res = await apiClient.get(`/applicants?${params}`);
      setApplicants(res.data.applicants || []);
      setTotal(res.data.total || 0);
    } catch {
      flash$("Failed to load applicants.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, stateFilter, showWithdrawn, showComplete]);

  useEffect(() => { loadApplicants(); }, [loadApplicants]);

  // Load users for OA selector (admin only)
  useEffect(() => {
    if (isAdmin) {
      apiClient.get("/users?is_active=true&per_page=200")
        .then((r) => setUsers(r.data.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, stateFilter, showWithdrawn, showComplete]);

  const handleCreate = async (payload) => {
    const res = await apiClient.post("/applicants", payload);
    await loadApplicants();
    setShowForm(false);
    flash$(`${res.data.applicant.first_name} ${res.data.applicant.last_name} added.`);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <PageLayout title="Applicants">
      {flash && (
        <div className={`alert alert-${flashType}`} style={{ marginBottom: 16 }}>
          {flash}
        </div>
      )}

      {/* Header row */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", flex: 1 }}>
          <input
            ref={searchRef}
            type="search"
            className="form-input search-bar"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" value={statusFilter} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 180 }}>
            {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" value={stateFilter} onChange={(e) => setState(e.target.value)} style={{ minWidth: 140 }}>
            <option value="">All States</option>
            {["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
              "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
              "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
              "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
              "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
              "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
              "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
              "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
            ].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="section-actions">
          <label className="radio-label" style={{ fontSize: "0.85rem", gap: 6 }}>
            <input type="checkbox" checked={showComplete} onChange={(e) => setComplete(e.target.checked)} />
            Complete
          </label>
          <label className="radio-label" style={{ fontSize: "0.85rem", gap: 6 }}>
            <input type="checkbox" checked={showWithdrawn} onChange={(e) => setWithdrawn(e.target.checked)} />
            Withdrawn
          </label>
          <button className="btn btn-secondary" onClick={() => navigate("/upload-applicants")}>
            📤 Upload
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Applicant
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ fontSize: "0.83rem", color: "var(--color-gray-500)", marginBottom: 10 }}>
        Showing {applicants.length} of {total} applicant{total !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </div>

      <div className="data-table-wrapper">
        <DataTable
          columns={COLUMNS}
          rows={applicants}
          loading={loading}
          onRowClick={(row) => navigate(`/applicants/${row.id}`)}
          emptyMessage={
            search || statusFilter !== "All Statuses"
              ? "No applicants match your current filters."
              : "No applicants yet. Click '+ Add Applicant' or upload a list."
          }
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <span style={{ padding: "5px 12px", fontSize: "0.87rem" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {showForm && (
        <ApplicantFormModal
          applicant={null}
          users={users}
          isAdmin={isAdmin}
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </PageLayout>
  );
}
