/**
 * TerritoryManagement — Admin page for managing geographic territories
 * and assigning users to them.
 *
 * Layout:
 *   Left panel  — territory list with filters
 *   Right panel — selected territory detail + user assignment
 */
import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import TerritoryFormModal from "../components/TerritoryFormModal.jsx";
import Modal from "../components/Modal.jsx";
import apiClient from "../api/apiClient.js";
import { formatRole } from "../utils/formatters.js";

const TYPE_LABELS = {
  national: "🌐 National",
  regional: "🗺️ Regional",
  state: "🏛️ State",
  county: "📍 County",
  city: "🏙️ City",
  zip: "📮 ZIP",
};

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
  { value: "county", label: "County" },
  { value: "city", label: "City" },
  { value: "zip", label: "ZIP Code" },
];

const TERRITORY_COLUMNS = [
  {
    key: "territory_name",
    label: "Territory",
    sortable: true,
    render: (r) => (
      <span style={{ fontWeight: 600 }}>{r.territory_name}</span>
    ),
  },
  {
    key: "territory_type",
    label: "Type",
    sortable: true,
    render: (r) => (
      <span className="territory-type-chip">
        {TYPE_LABELS[r.territory_type] || r.territory_type}
      </span>
    ),
  },
  { key: "state", label: "State", render: (r) => r.state || "—" },
  { key: "county", label: "County", render: (r) => r.county || "—" },
  { key: "city", label: "City", render: (r) => r.city || "—" },
  {
    key: "assigned_user_count",
    label: "Users",
    sortable: true,
    render: (r) => (
      <span className={`status-badge ${r.assigned_user_count > 0 ? "badge-blue" : "badge-gray"}`}>
        {r.assigned_user_count} assigned
      </span>
    ),
  },
];

const ASSIGNED_USER_COLUMNS = [
  { key: "full_name", label: "Name", sortable: true },
  { key: "email", label: "Email" },
  { key: "role", label: "Role", render: (r) => formatRole(r.role) },
  {
    key: "is_active",
    label: "Status",
    render: (r) => (
      <span className={`status-badge ${r.is_active ? "badge-green" : "badge-gray"}`}>
        {r.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function TerritoryManagement() {
  // Territory list state
  const [territories, setTerritories] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Selected territory (right panel)
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [formMode, setFormMode] = useState(null); // 'create' | 'edit'
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Assign-user modal state
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigningId, setAssigningId] = useState(null);

  // Feedback
  const [flash, setFlash] = useState({ type: "", text: "" });

  // ── Fetch territory list ───────────────────────────────────────────────────
  const fetchTerritories = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get("/territories", { params });
      setTerritories(res.data.territories || []);
    } catch (err) {
      setListError(err.response?.data?.error || "Failed to load territories.");
    } finally {
      setListLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => { fetchTerritories(); }, [fetchTerritories]);

  // ── Fetch territory detail (with assigned users) ───────────────────────────
  const fetchDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/territories/${id}`);
      setSelected(res.data.territory);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleRowClick = (row) => fetchDetail(row.id);

  // ── Fetch all users for assignment modal ───────────────────────────────────
  const openAssignModal = async () => {
    setShowAssignModal(true);
    setAssignSearch("");
    setUsersLoading(true);
    try {
      const res = await apiClient.get("/users", { params: { is_active: "true" } });
      setAllUsers(res.data.users || []);
    } catch {
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // ── Assign user ────────────────────────────────────────────────────────────
  const handleAssign = async (userId) => {
    setAssigningId(userId);
    try {
      await apiClient.post("/territories/assign-user", {
        user_id: userId,
        territory_id: selected.id,
      });
      await fetchDetail(selected.id);
      // Refresh count in list
      setTerritories((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, assigned_user_count: t.assigned_user_count + 1 }
            : t
        )
      );
      showFlash("success", "User assigned successfully.");
    } catch (err) {
      showFlash("error", err.response?.data?.error || "Failed to assign user.");
    } finally {
      setAssigningId(null);
    }
  };

  // ── Unassign user ──────────────────────────────────────────────────────────
  const handleUnassign = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from "${selected.territory_name}"?`)) return;
    try {
      await apiClient.delete(`/territories/${selected.id}/users/${userId}`);
      await fetchDetail(selected.id);
      setTerritories((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, assigned_user_count: Math.max(0, t.assigned_user_count - 1) }
            : t
        )
      );
      showFlash("success", `${userName} removed from territory.`);
    } catch (err) {
      showFlash("error", err.response?.data?.error || "Failed to remove user.");
    }
  };

  // ── Delete territory ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selected) return;
    const count = selected.assigned_user_count ?? 0;
    const msg =
      count > 0
        ? `"${selected.territory_name}" has ${count} assigned user(s). Delete anyway and remove all assignments?`
        : `Delete territory "${selected.territory_name}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;

    const forceParam = count > 0 ? "?force=true" : "";
    try {
      await apiClient.delete(`/territories/${selected.id}${forceParam}`);
      setTerritories((prev) => prev.filter((t) => t.id !== selected.id));
      setSelected(null);
      showFlash("success", `Territory deleted.`);
    } catch (err) {
      showFlash("error", err.response?.data?.error || "Failed to delete territory.");
    }
  };

  // ── Save from form modal ───────────────────────────────────────────────────
  const handleFormSave = (savedTerritory) => {
    if (formMode === "create") {
      setTerritories((prev) => [{ ...savedTerritory, assigned_user_count: 0 }, ...prev]);
      setSelected(savedTerritory);
    } else {
      setTerritories((prev) => prev.map((t) => (t.id === savedTerritory.id ? { ...savedTerritory, assigned_user_count: t.assigned_user_count } : t)));
      setSelected(savedTerritory);
    }
    setFormMode(null);
    showFlash("success", formMode === "create" ? "Territory created." : "Territory updated.");
  };

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: "", text: "" }), 4000);
  };

  // ── Assigned user IDs for the assign modal ────────────────────────────────
  const assignedUserIds = new Set((selected?.assigned_users || []).map((u) => u.user_id));
  const filteredUsers = allUsers.filter((u) => {
    if (assignSearch.trim()) {
      const q = assignSearch.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PageLayout title="Territory Management">
      {flash.text && (
        <div className={`alert alert-${flash.type}`} style={{ marginBottom: 16 }}>
          {flash.text}
        </div>
      )}

      <div className="territory-layout">
        {/* ── Left: Territory List ─────────────────────────────────────── */}
        <div className="territory-list-panel">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-navy)" }}>
              Territories
              <span style={{ marginLeft: 8, fontSize: "0.8rem", color: "var(--color-gray-400)", fontWeight: 400 }}>
                {territories.length} total
              </span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setFormMode("create"); }}
            >
              + Add
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <input
              type="search"
              className="form-input"
              placeholder="Search territories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {listError && <div className="alert alert-error">{listError}</div>}

          {/* Territory list */}
          <div className="territory-list-scroll">
            {listLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-gray-400)" }}>
                Loading…
              </div>
            ) : territories.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-gray-400)", fontSize: "0.87rem" }}>
                No territories found.
              </div>
            ) : (
              territories.map((t) => (
                <div
                  key={t.id}
                  className={`territory-list-item ${selected?.id === t.id ? "territory-list-item-active" : ""}`}
                  onClick={() => handleRowClick(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleRowClick(t)}
                >
                  <div className="territory-list-item-name">{t.territory_name}</div>
                  <div className="territory-list-item-meta">
                    <span className="territory-type-chip territory-type-chip-sm">
                      {TYPE_LABELS[t.territory_type] || t.territory_type}
                    </span>
                    {t.state && <span>{t.state}</span>}
                    <span style={{ color: t.assigned_user_count > 0 ? "var(--color-blue)" : "var(--color-gray-400)" }}>
                      {t.assigned_user_count} user{t.assigned_user_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Territory Detail ──────────────────────────────────── */}
        <div className="territory-detail-panel">
          {!selected && !detailLoading && (
            <div className="empty-state">
              <span className="empty-state-icon">🗂️</span>
              <p>Select a territory to view details and manage user assignments.</p>
            </div>
          )}

          {detailLoading && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-gray-400)" }}>
              Loading…
            </div>
          )}

          {selected && !detailLoading && (
            <>
              {/* Territory header */}
              <div className="territory-detail-header">
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-navy)" }}>
                    {selected.territory_name}
                  </h2>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", fontSize: "0.85rem", color: "var(--color-gray-500)" }}>
                    <span className="territory-type-chip">
                      {TYPE_LABELS[selected.territory_type] || selected.territory_type}
                    </span>
                    {selected.region && <span>Region: {selected.region}</span>}
                    {selected.state && <span>State: {selected.state}</span>}
                    {selected.county && <span>County: {selected.county}</span>}
                    {selected.city && <span>City: {selected.city}</span>}
                    {selected.zip_code && <span>ZIP: {selected.zip_code}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setFormMode("edit")}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Assigned users */}
              <div style={{ marginTop: 24 }}>
                <div className="section-header">
                  <h3 style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-navy)" }}>
                    Assigned Users ({selected.assigned_user_count ?? 0})
                  </h3>
                  <button className="btn btn-primary btn-sm" onClick={openAssignModal}>
                    + Assign User
                  </button>
                </div>

                {selected.assigned_users && selected.assigned_users.length > 0 ? (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="data-table-th">Name</th>
                          <th className="data-table-th">Email</th>
                          <th className="data-table-th">Role</th>
                          <th className="data-table-th">Status</th>
                          <th className="data-table-th"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.assigned_users.map((u) => (
                          <tr key={u.user_id} className="data-table-row">
                            <td className="data-table-td" style={{ fontWeight: 500 }}>{u.full_name}</td>
                            <td className="data-table-td">{u.email}</td>
                            <td className="data-table-td">{formatRole(u.role)}</td>
                            <td className="data-table-td">
                              <span className={`status-badge ${u.is_active ? "badge-green" : "badge-gray"}`}>
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="data-table-td" style={{ textAlign: "right" }}>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleUnassign(u.user_id, u.full_name)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "24px", textAlign: "center", background: "white", borderRadius: "var(--border-radius)", color: "var(--color-gray-400)", fontSize: "0.87rem" }}>
                    No users assigned yet. Click "+ Assign User" to add one.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Territory Form Modal (Create / Edit) ─────────────────────────── */}
      {formMode && (
        <TerritoryFormModal
          mode={formMode}
          territory={formMode === "edit" ? selected : null}
          onSave={handleFormSave}
          onClose={() => setFormMode(null)}
        />
      )}

      {/* ── Assign User Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign User — ${selected?.territory_name}`}
        size="md"
      >
        <div style={{ marginBottom: 14 }}>
          <input
            type="search"
            className="form-input"
            placeholder="Search users by name or email…"
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
          />
        </div>

        {usersLoading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--color-gray-400)" }}>
            Loading users…
          </div>
        ) : (
          <div className="assign-user-list">
            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--color-gray-400)", fontSize: "0.87rem" }}>
                No users found.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isAssigned = assignedUserIds.has(u.id);
                return (
                  <div key={u.id} className="assign-user-row">
                    <div className="assign-user-info">
                      <div className="assign-user-name">{u.full_name}</div>
                      <div className="assign-user-meta">
                        {u.email} · {formatRole(u.role)}
                      </div>
                    </div>
                    {isAssigned ? (
                      <span className="status-badge badge-green" style={{ marginLeft: 8 }}>Assigned</span>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleAssign(u.id)}
                        disabled={assigningId === u.id}
                        style={{ marginLeft: 8 }}
                      >
                        {assigningId === u.id ? "…" : "Assign"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
            Done
          </button>
        </div>
      </Modal>
    </PageLayout>
  );
}
