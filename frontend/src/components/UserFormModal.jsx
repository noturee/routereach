/**
 * UserFormModal — Create or Edit a user account.
 *
 * Props:
 *   mode: 'create' | 'edit'
 *   user: existing user object (required for edit mode)
 *   onSave: (updatedUser) => void   — called after successful API response
 *   onClose: () => void
 */

import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";
import apiClient from "../api/apiClient.js";
import { validate_email_format, validate_password_strength } from "../utils/formValidators.js";
import { formatRole } from "../utils/formatters.js";

const ROLES = [
  "oa_user",
  "local_admin",
  "state_admin",
  "regional_admin",
  "national_admin",
  "master_admin",
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "oa_user",
  organization_name: "",
  assigned_region: "",
  assigned_states: "",
  assigned_counties: "",
  assigned_cities: "",
  assigned_zip_codes: "",
  password: "",
  confirm_password: "",
};

export default function UserFormModal({ mode, user, onSave, onClose }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isEdit && user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "oa_user",
        organization_name: user.organization_name || "",
        assigned_region: user.assigned_region || "",
        assigned_states: user.assigned_states || "",
        assigned_counties: user.assigned_counties || "",
        assigned_cities: user.assigned_cities || "",
        assigned_zip_codes: user.assigned_zip_codes || "",
        password: "",
        confirm_password: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [mode, user, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const { first_name, last_name, email, password, confirm_password } = form;

    if (!first_name.trim() || !last_name.trim()) return "First and last name are required.";
    if (!email.trim()) return "Email is required.";
    if (!validate_email_format(email)) return "Please enter a valid email address.";

    if (!isEdit) {
      // Password required on create
      if (!password) return "Password is required.";
      if (!validate_password_strength(password))
        return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
      if (password !== confirm_password) return "Passwords do not match.";
    } else if (password) {
      // Optional password change on edit
      if (!validate_password_strength(password))
        return "New password must be at least 8 characters and include uppercase, lowercase, and a number.";
      if (password !== confirm_password) return "Passwords do not match.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      role: form.role,
      organization_name: form.organization_name.trim() || null,
      assigned_region: form.assigned_region.trim() || null,
      assigned_states: form.assigned_states.trim() || null,
      assigned_counties: form.assigned_counties.trim() || null,
      assigned_cities: form.assigned_cities.trim() || null,
      assigned_zip_codes: form.assigned_zip_codes.trim() || null,
    };

    if (form.password) payload.password = form.password;

    try {
      let response;
      if (isEdit) {
        response = await apiClient.put(`/users/${user.id}`, payload);
      } else {
        response = await apiClient.post("/users", payload);
      }
      onSave(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit User — ${user?.full_name}` : "Create New User"}
      size="lg"
    >
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Basic info */}
        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input className="form-input" value={form.first_name} onChange={set("first_name")} disabled={loading} required />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input className="form-input" value={form.last_name} onChange={set("last_name")} disabled={loading} required />
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" value={form.email} onChange={set("email")} disabled={loading || isEdit} required />
            {isEdit && <small style={{ color: "var(--color-gray-400)", fontSize: "0.75rem" }}>Email cannot be changed.</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 123-4567" disabled={loading} />
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-select" value={form.role} onChange={set("role")} disabled={loading}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{formatRole(r)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Organization</label>
            <input className="form-input" value={form.organization_name} onChange={set("organization_name")} placeholder="e.g. ABC Workforce Center" disabled={loading} />
          </div>
        </div>

        {/* Geographic scope */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-gray-500)", textTransform: "uppercase", marginBottom: 10 }}>
            Geographic Scope (comma-separated)
          </p>
        </div>

        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Region</label>
            <input className="form-input" value={form.assigned_region} onChange={set("assigned_region")} placeholder="e.g. South" disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label">States</label>
            <input className="form-input" value={form.assigned_states} onChange={set("assigned_states")} placeholder="e.g. TX,LA,MS" disabled={loading} />
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Counties</label>
            <input className="form-input" value={form.assigned_counties} onChange={set("assigned_counties")} placeholder="e.g. Harris,Dallas" disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label">Cities</label>
            <input className="form-input" value={form.assigned_cities} onChange={set("assigned_cities")} placeholder="e.g. Houston,Dallas" disabled={loading} />
          </div>
        </div>

        {/* Password */}
        <div style={{ borderTop: "1px solid var(--color-gray-200)", paddingTop: 14, marginBottom: 14 }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-gray-500)", textTransform: "uppercase", marginBottom: 10 }}>
            {isEdit ? "Change Password (leave blank to keep current)" : "Set Password *"}
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{isEdit ? "New Password" : "Password *"}</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder={isEdit ? "Leave blank to keep current" : "Min 8 chars"}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isEdit ? "Confirm New Password" : "Confirm Password *"}</label>
              <input
                className="form-input"
                type="password"
                value={form.confirm_password}
                onChange={set("confirm_password")}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
