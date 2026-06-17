/**
 * UserManagement — Admin page for full user CRUD.
 * List, create, edit, deactivate, and reactivate user accounts.
 */
import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import UserFormModal from "../components/UserFormModal.jsx";
import apiClient from "../api/apiClient.js";
import { formatRole } from "../utils/formatters.js";
import { formatDate } from "../utils/dateUtils.js";

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "master_admin", label: "Master Admin" },
  { value: "national_admin", label: "National Admin" },
  { value: "regional_admin", label: "Regional Admin" },
  { value: "state_admin", label: "State Admin" },
  { value: "local_admin", label: "Local Admin" },
  { value: "oa_user", label: "OA User" },
];

const COLUMNS = [
  { key: "full_name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "role", label: "Role", sortable: true, render: (r) => <span className="role-chip">{formatRole(r.role)}</span> },
  { key: "organization_name", label: "Organization", render: (r) => r.organization_name || "—" },
  { key: "assigned_states", label: "States", render: (r) => r.assigned_states || "—" },
  {
    key: "is_active",
    label: "Status",
    sortable: true,
    render: (r) => (
      <span className={`status-badge ${r.is_active ? "badge-green" : "badge-gray"}`}>
        {r.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
  { key: "created_at", label: "Created", render: (r) => formatDate(r.created_at) },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("true"); // "true" | "false" | ""

  // Modal state
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  // Action feedback
  const [actionLoading, setActionLoading] = useState(null); // user id being acted on
  const [actionMessage, setActionMessage] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== "") params.is_active = activeFilter;
      if (search.trim()) params.search = search.trim();

      const response = await apiClient.get("/users", { params });
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activeFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleModalSave = (savedUser) => {
    if (modalMode === "create") {
      setUsers((prev) => [savedUser, ...prev]);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === savedUser.id ? savedUser : u)));
    }
    setModalMode(null);
    setSelectedUser(null);
    showMessage(modalMode === "create" ? "User created successfully." : "User updated successfully.");
  };

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.full_name}? They will not be able to log in.`)) return;
    setActionLoading(user.id);
    try {
      await apiClient.put(`/users/${user.id}/deactivate`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u)));
      showMessage(`${user.full_name} has been deactivated.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (user) => {
    setActionLoading(user.id);
    try {
      const response = await apiClient.put(`/users/${user.id}/reactivate`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? response.data.user : u)));
      showMessage(`${user.full_name} has been reactivated.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reactivate user.");
    } finally {
      setActionLoading(null);
    }
  };

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(""), 4000);
  };

  const columnsWithActions = [
    ...COLUMNS,
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (row) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={(e) => { e.stopPropagation(); setSelectedUser(row); setModalMode("edit"); }}
            disabled={actionLoading === row.id}
          >
            Edit
          </button>
          {row.is_active ? (
            <button
              className="btn btn-sm btn-danger"
              onClick={(e) => { e.stopPropagation(); handleDeactivate(row); }}
              disabled={actionLoading === row.id}
            >
              {actionLoading === row.id ? "…" : "Deactivate"}
            </button>
          ) : (
            <button
              className="btn btn-sm btn-success"
              onClick={(e) => { e.stopPropagation(); handleReactivate(row); }}
              disabled={actionLoading === row.id}
            >
              {actionLoading === row.id ? "…" : "Reactivate"}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout title="User Management">
      {actionMessage && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>{actionMessage}</div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      <section className="section">
        {/* Filters + create button */}
        <div className="section-header">
          <div className="section-filters">
            <input
              type="search"
              className="form-input search-bar"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="true">Active Users</option>
              <option value="false">Inactive Users</option>
              <option value="">All Users</option>
            </select>
          </div>
          <div className="section-actions">
            <button
              className="btn btn-primary"
              onClick={() => { setSelectedUser(null); setModalMode("create"); }}
            >
              + Create User
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: "0.85rem", color: "var(--color-gray-500)" }}>
          <span><strong style={{ color: "var(--color-navy)" }}>{users.length}</strong> users shown</span>
          <span><strong style={{ color: "var(--color-green)" }}>{users.filter((u) => u.is_active).length}</strong> active</span>
          <span><strong style={{ color: "var(--color-gray-500)" }}>{users.filter((u) => !u.is_active).length}</strong> inactive</span>
        </div>

        <DataTable
          columns={columnsWithActions}
          rows={users}
          loading={loading}
          emptyMessage="No users found. Adjust the filters or create a new user."
        />
      </section>

      {/* Create / Edit Modal */}
      {modalMode && (
        <UserFormModal
          mode={modalMode}
          user={selectedUser}
          onSave={handleModalSave}
          onClose={() => { setModalMode(null); setSelectedUser(null); }}
        />
      )}
    </PageLayout>
  );
}
