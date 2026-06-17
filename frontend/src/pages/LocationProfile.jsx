/**
 * LocationProfile — Full detail view for an outreach location.
 * Tabs: Overview | Visit Logs (Phase 9) | Notes
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import LocationFormModal from "../components/LocationFormModal.jsx";
import VisitLogFormModal from "../components/VisitLogFormModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate, formatDateTime, isOverdue } from "../utils/dateUtils.js";
import { formatPhone } from "../utils/formatters.js";

const TABS = ["Overview", "Visit Logs", "Notes"];

const STATUS_STYLES = {
  active:           { background: "#d4edda", color: "#155724" },
  inactive:         { background: "#fff3cd", color: "#856404" },
  do_not_visit:     { background: "#f8d7da", color: "#721c24" },
  pending_approval: { background: "#d1ecf1", color: "#0c5460" },
};
function statusLabel(s) {
  return { active: "Active", inactive: "Inactive", do_not_visit: "Do Not Visit", pending_approval: "Pending Approval" }[s] || s;
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default function LocationProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const [location, setLocation]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [showEdit, setShowEdit]   = useState(false);
  const [users, setUsers]         = useState([]);
  const [deleting, setDeleting]   = useState(false);

  // Visit log state
  const [visitLogs, setVisitLogs]   = useState([]);
  const [visitTotal, setVisitTotal] = useState(0);
  const [visitPage, setVisitPage]   = useState(1);
  const [visitPages, setVisitPages] = useState(1);
  const [visitLoading, setVisitLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog]     = useState(null);

  useEffect(() => {
    apiClient.get(`/locations/${id}`)
      .then((r) => setLocation(r.data.location))
      .catch(() => setError("Location not found."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (isAdmin) {
      apiClient.get("/users?per_page=200")
        .then((r) => setUsers(r.data.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleEdit = async (payload) => {
    const res = await apiClient.put(`/locations/${id}`, payload);
    setLocation(res.data.location);
    setShowEdit(false);
  };

  const loadVisitLogs = useCallback(() => {
    if (!id) return;
    setVisitLoading(true);
    apiClient.get(`/visit-logs/location/${id}?page=${visitPage}&per_page=25`)
      .then((r) => {
        setVisitLogs(r.data.visit_logs || []);
        setVisitTotal(r.data.total || 0);
        setVisitPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setVisitLoading(false));
  }, [id, visitPage]);

  useEffect(() => {
    if (activeTab === "Visit Logs") loadVisitLogs();
  }, [activeTab, loadVisitLogs]);

  const handleLogVisit = async (payload) => {
    if (editingLog) {
      await apiClient.put(`/visit-logs/${editingLog.id}`, payload);
    } else {
      await apiClient.post("/visit-logs", payload);
    }
    setShowLogModal(false);
    setEditingLog(null);
    // Refresh location data (updates last_visit_date counter)
    apiClient.get(`/locations/${id}`)
      .then((r) => setLocation(r.data.location))
      .catch(() => {});
    if (activeTab === "Visit Logs") loadVisitLogs();
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Delete this visit log?")) return;
    await apiClient.delete(`/visit-logs/${logId}`);
    loadVisitLogs();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${location.location_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/locations/${id}?force=true`);
      navigate("/locations");
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed.");
      setDeleting(false);
    }
  };

  if (loading) return <PageLayout title="Location Profile"><div className="loading-screen">Loading...</div></PageLayout>;
  if (error || !location) return <PageLayout title="Location Profile"><div className="alert alert-error">{error || "Not found."}</div></PageLayout>;

  const followUpOverdue = location.next_follow_up_date && isOverdue(location.next_follow_up_date);
  const statusStyle = STATUS_STYLES[location.status] || {};

  return (
    <PageLayout title={location.location_name}>

      {/* Action bar */}
      <div className="profile-actions">
        <button className="btn btn-primary" onClick={() => setShowEdit(true)}>✏️ Edit Location</button>
        <button className="btn btn-success" onClick={() => { setEditingLog(null); setShowLogModal(true); }}>📋 Log Visit</button>
        <button className="btn btn-secondary" disabled title="Coming in Phase 11">✉️ Send Email</button>
        {isAdmin && (
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "🗑 Delete"}
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => navigate("/locations")}>← Back to Locations</button>
      </div>

      {/* Banner */}
      <div className="location-banner">
        <div className="location-banner-icon">📍</div>
        <div className="location-banner-info">
          <h2 className="location-banner-name">{location.location_name}</h2>
          <div className="location-banner-meta">
            {location.location_type && <span className="location-type-chip">{location.location_type}</span>}
            {location.city && location.state && (
              <span className="location-banner-addr">{location.city}, {location.state}{location.county ? ` · ${location.county} County` : ""}</span>
            )}
          </div>
        </div>
        <div className="location-banner-stats">
          <div className="location-stat">
            <span className="location-stat-num">{location.visit_count || 0}</span>
            <span className="location-stat-label">Visits</span>
          </div>
          <div className="location-stat">
            <span className="location-stat-num">{location.last_visit_date ? formatDate(location.last_visit_date) : "—"}</span>
            <span className="location-stat-label">Last Visit</span>
          </div>
          <div className="location-stat">
            <span className={`location-stat-num${followUpOverdue ? " overdue-date" : ""}`}>
              {location.next_follow_up_date ? formatDate(location.next_follow_up_date) : "—"}
              {followUpOverdue && " ⚠"}
            </span>
            <span className="location-stat-label">Next Follow-up</span>
          </div>
          <div className="location-stat">
            <span
              className="location-stat-num"
              style={{ ...statusStyle, padding: "2px 8px", borderRadius: 4, fontSize: "0.8rem", fontWeight: 600 }}
            >
              {statusLabel(location.status)}
            </span>
            <span className="location-stat-label">Status</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button key={tab} className={`tab-btn${activeTab === tab ? " tab-btn-active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-content">

        {/* ── Overview tab ─────────────────────────────────────────────── */}
        {activeTab === "Overview" && (
          <div className="profile-grid">

            <div className="form-card">
              <div className="form-section-label">Location Details</div>
              <InfoRow label="Name"    value={location.location_name} />
              <InfoRow label="Type"    value={location.location_type} />
              <InfoRow label="Status"  value={statusLabel(location.status)} />
              <InfoRow label="Marketing Allowed" value={location.marketing_allowed ? "Yes" : "No"} />
            </div>

            <div className="form-card">
              <div className="form-section-label">Address</div>
              <InfoRow label="Street"  value={location.address} />
              <InfoRow label="City"    value={location.city} />
              <InfoRow label="County"  value={location.county} />
              <InfoRow label="State"   value={location.state} />
              <InfoRow label="ZIP"     value={location.zip_code} />
            </div>

            <div className="form-card">
              <div className="form-section-label">Contact</div>
              <InfoRow label="Name"    value={location.contact_person} />
              <InfoRow label="Title"   value={location.contact_title} />
              <InfoRow label="Phone"   value={location.contact_phone ? formatPhone(location.contact_phone) : null} />
              <InfoRow label="Email"   value={location.contact_email} />
            </div>

            <div className="form-card">
              <div className="form-section-label">Assignment</div>
              <InfoRow
                label="Assigned OA"
                value={location.assigned_oa
                  ? `${location.assigned_oa.first_name} ${location.assigned_oa.last_name}`
                  : "Unassigned"}
              />
              <InfoRow label="Created By"  value={location.created_by ? `${location.created_by.first_name} ${location.created_by.last_name}` : "—"} />
              <InfoRow label="Last Visit"  value={location.last_visit_date ? formatDate(location.last_visit_date) : "None"} />
              <InfoRow label="Follow-up"   value={location.next_follow_up_date ? formatDate(location.next_follow_up_date) : "Not set"} />
            </div>

          </div>
        )}

        {/* ── Visit Logs tab ────────────────────────────────────────────── */}
        {activeTab === "Visit Logs" && (
          <div>
            <div className="page-header-row" style={{ marginBottom: 12 }}>
              <span className="list-stats-row">
                {visitLoading ? "Loading..." : `${visitTotal} visit log${visitTotal !== 1 ? "s" : ""}`}
              </span>
              <button className="btn btn-success" onClick={() => { setEditingLog(null); setShowLogModal(true); }}>
                + Log Visit
              </button>
            </div>

            {visitLogs.length === 0 && !visitLoading && (
              <div className="empty-state">
                <span className="empty-state-icon">📋</span>
                <p>No visits logged yet for this location.</p>
                <button className="btn btn-success" onClick={() => setShowLogModal(true)}>Log First Visit</button>
              </div>
            )}

            {visitLogs.map((log) => (
              <div key={log.id} className="visit-log-card">
                <div className="visit-log-header">
                  <div className="visit-log-date">📅 {formatDate(log.visit_date)}</div>
                  <div className="visit-log-oa">
                    {log.oa_user ? `${log.oa_user.first_name} ${log.oa_user.last_name}` : "—"}
                  </div>
                  {log.follow_up_needed && (
                    <span className="status-badge status-badge-pending">Follow-up Needed</span>
                  )}
                  <div className="visit-log-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditingLog(log); setShowLogModal(true); }}>Edit</button>
                    {isAdmin && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteLog(log.id)}>Delete</button>
                    )}
                  </div>
                </div>

                <div className="visit-log-body">
                  {log.marketing_type && (
                    <div className="visit-log-row">
                      <span className="visit-log-label">Marketing:</span>
                      <span>{log.marketing_type}</span>
                      {log.materials_left && <span>· {log.materials_left}</span>}
                      {log.quantity_left  && <span>· Qty: {log.quantity_left}</span>}
                    </div>
                  )}
                  {log.contact_person_met && (
                    <div className="visit-log-row">
                      <span className="visit-log-label">Contact Met:</span>
                      <span>{log.contact_person_met}</span>
                      {log.partner_contact_made && <span className="tag tag-green">Partner Contact</span>}
                    </div>
                  )}
                  {log.follow_up_needed && log.next_follow_up_date && (
                    <div className="visit-log-row">
                      <span className="visit-log-label">Follow-up By:</span>
                      <span className={isOverdue(log.next_follow_up_date) ? "overdue-date" : ""}>{formatDate(log.next_follow_up_date)}</span>
                    </div>
                  )}
                  {log.visit_notes && (
                    <div className="visit-log-notes">{log.visit_notes}</div>
                  )}
                </div>
              </div>
            ))}

            {visitPages > 1 && (
              <div className="pagination-row">
                <button className="btn btn-secondary" disabled={visitPage <= 1} onClick={() => setVisitPage((p) => p - 1)}>← Prev</button>
                <span className="page-label">Page {visitPage} of {visitPages}</span>
                <button className="btn btn-secondary" disabled={visitPage >= visitPages} onClick={() => setVisitPage((p) => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Notes tab ─────────────────────────────────────────────────── */}
        {activeTab === "Notes" && (
          <div className="form-card">
            <div className="form-section-label">Notes</div>
            {location.notes
              ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{location.notes}</p>
              : <p className="text-muted">No notes for this location.</p>
            }
          </div>
        )}

      </div>

      {showEdit && (
        <LocationFormModal
          location={location}
          users={users}
          isAdmin={isAdmin}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showLogModal && (
        <VisitLogFormModal
          log={editingLog}
          locationId={parseInt(id, 10)}
          locationName={location.location_name}
          locations={[]}
          users={users}
          isAdmin={isAdmin}
          onSave={handleLogVisit}
          onClose={() => { setShowLogModal(false); setEditingLog(null); }}
        />
      )}
    </PageLayout>
  );
}
