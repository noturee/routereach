/**
 * Register Page — New user self-registration.
 * Creates an oa_user account, then redirects to login.
 *
 * Admin-created accounts (with elevated roles) are created via
 * User Management → Create User.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient.js";
import { validate_email_format, validate_password_strength } from "../utils/formValidators.js";
import logo from "../assets/outreachroute_pro_logo.svg";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    organization_name: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { first_name, last_name, email, password, confirm_password } = form;

    if (!first_name.trim() || !last_name.trim() || !email.trim() || !password) {
      return setError("First name, last name, email, and password are required.");
    }
    if (!validate_email_format(email)) {
      return setError("Please enter a valid email address.");
    }
    if (!validate_password_strength(password)) {
      return setError(
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
      );
    }
    if (password !== confirm_password) {
      return setError("Passwords do not match.");
    }

    setLoading(true);

    try {
      await apiClient.post("/auth/register", {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        organization_name: form.organization_name.trim() || undefined,
        password,
        role: "oa_user",
      });

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">✅</div>
            <h1 className="login-title">Account Created!</h1>
            <p className="login-subtitle">Your account is ready. Sign in to get started.</p>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => navigate("/login")}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="login-header">
          <img src={logo} alt="OutreachRoute Pro" className="login-logo-img" />
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Register as an Outreach Associate</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                className="form-input"
                type="text"
                value={form.first_name}
                onChange={set("first_name")}
                autoComplete="given-name"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                className="form-input"
                type="text"
                value={form.last_name}
                onChange={set("last_name")}
                autoComplete="family-name"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              autoComplete="tel"
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input
              className="form-input"
              type="text"
              value={form.organization_name}
              onChange={set("organization_name")}
              placeholder="e.g. ABC Workforce Center"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              placeholder="Min 8 chars, upper + lower + number"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input
              className="form-input"
              type="password"
              value={form.confirm_password}
              onChange={set("confirm_password")}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <div className="login-footer">
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--color-navy)", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
