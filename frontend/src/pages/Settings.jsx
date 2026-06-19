/**
 * Settings — User profile editor and password change.
 * Fully implemented in Phase 2.
 */
import React, { useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";
import { validate_password_strength } from "../utils/formValidators.js";
import { formatRole } from "../utils/formatters.js";

export default function Settings() {
  const { user, refreshUser } = useAuth();

  // ── Profile section ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
    organization_name: user?.organization_name || "",
    assigned_region: user?.assigned_region || "",
    assigned_states: user?.assigned_states || "",
    assigned_counties: user?.assigned_counties || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });

  const setProfileField = (field) => (e) =>
    setProfile((p) => ({ ...p, [field]: e.target.value }));

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: "", text: "" });

    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      return setProfileMessage({ type: "error", text: "First and last name are required." });
    }

    setProfileLoading(true);
    try {
      await apiClient.put(`/users/${user.id}`, {
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        phone: profile.phone.trim() || null,
        organization_name: profile.organization_name.trim() || null,
        assigned_region: profile.assigned_region.trim() || null,
        assigned_states: profile.assigned_states.trim() || null,
        assigned_counties: profile.assigned_counties.trim() || null,
      });
      await refreshUser();
      setProfileMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMessage({ type: "error", text: err.response?.data?.error || "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Password section ───────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  const setPwField = (field) => (e) =>
    setPasswords((p) => ({ ...p, [field]: e.target.value }));

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    const { current_password, new_password, confirm_password } = passwords;

    if (!current_password || !new_password || !confirm_password) {
      return setPasswordMessage({ type: "error", text: "All password fields are required." });
    }
    if (!validate_password_strength(new_password)) {
      return setPasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }
    if (new_password !== confirm_password) {
      return setPasswordMessage({ type: "error", text: "New passwords do not match." });
    }

    setPasswordLoading(true);
    try {
      await apiClient.post("/auth/change-password", { current_password, new_password });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      setPasswordMessage({ type: "success", text: "Password changed successfully." });
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.response?.data?.error || "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PageLayout title="Settings">
      {/* ── My Profile ──────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">My Profile</h2>
        <form className="form-card" onSubmit={handleProfileSave} noValidate>
          {/* Read-only identity fields */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ""} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-input" value={formatRole(user?.role)} disabled />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                className="form-input"
                value={profile.first_name}
                onChange={setProfileField("first_name")}
                disabled={profileLoading}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                className="form-input"
                value={profile.last_name}
                onChange={setProfileField("last_name")}
                disabled={profileLoading}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                type="tel"
                value={profile.phone}
                onChange={setProfileField("phone")}
                placeholder="(555) 123-4567"
                disabled={profileLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Organization</label>
              <input
                className="form-input"
                value={profile.organization_name}
                onChange={setProfileField("organization_name")}
                placeholder="e.g. ABC Workforce Center"
                disabled={profileLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned Region</label>
              <input
                className="form-input"
                value={profile.assigned_region}
                onChange={setProfileField("assigned_region")}
                placeholder="e.g. Southeast"
                disabled={profileLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned States</label>
              <input
                className="form-input"
                value={profile.assigned_states}
                onChange={setProfileField("assigned_states")}
                placeholder="Comma-separated, e.g. GA,FL,AL"
                disabled={profileLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned Counties</label>
              <input
                className="form-input"
                value={profile.assigned_counties}
                onChange={setProfileField("assigned_counties")}
                placeholder="Comma-separated counties"
                disabled={profileLoading}
              />
            </div>
          </div>

          {profileMessage.text && (
            <div className={`alert alert-${profileMessage.type}`}>{profileMessage.text}</div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Change Password ──────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Change Password</h2>
        <form className="form-card" onSubmit={handlePasswordChange} noValidate style={{ maxWidth: 480 }}>
          <div className="form-group">
            <label className="form-label">Current Password *</label>
            <input
              className="form-input"
              type="password"
              value={passwords.current_password}
              onChange={setPwField("current_password")}
              autoComplete="current-password"
              disabled={passwordLoading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input
              className="form-input"
              type="password"
              value={passwords.new_password}
              onChange={setPwField("new_password")}
              autoComplete="new-password"
              placeholder="Min 8 chars, upper + lower + number"
              disabled={passwordLoading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password *</label>
            <input
              className="form-input"
              type="password"
              value={passwords.confirm_password}
              onChange={setPwField("confirm_password")}
              autoComplete="new-password"
              disabled={passwordLoading}
              required
            />
          </div>

          {passwordMessage.text && (
            <div className={`alert alert-${passwordMessage.type}`}>{passwordMessage.text}</div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
              {passwordLoading ? "Changing…" : "Change Password"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Account Info ─────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Account Information</h2>
        <div className="form-card" style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-gray-500)" }}>User ID</span>
              <span style={{ fontWeight: 500 }}>#{user?.id}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-gray-500)" }}>Role</span>
              <span style={{ fontWeight: 500 }}>{formatRole(user?.role)}</span>
            </div>
            {user?.assigned_states && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-gray-500)" }}>Assigned States</span>
                <span style={{ fontWeight: 500 }}>{user.assigned_states}</span>
              </div>
            )}
            {user?.assigned_region && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-gray-500)" }}>Region</span>
                <span style={{ fontWeight: 500 }}>{user.assigned_region}</span>
              </div>
            )}
            {user?.assigned_counties && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-gray-500)" }}>Assigned Counties</span>
                <span style={{ fontWeight: 500 }}>{user.assigned_counties}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
