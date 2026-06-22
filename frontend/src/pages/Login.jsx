/**
 * Login Page — Authenticates user and redirects based on role.
 */

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import logo from "../assets/outreachroute_primary_logo.png";

export default function Login() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users
  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || (isAdmin ? "/admin-dashboard" : "/dashboard");
    navigate(destination, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email.trim(), password);

    if (result.success) {
      const loggedInUser = result.user;
      if (!loggedInUser) {
        setError("Signed in, but your profile could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      const isAdminUser = [
        "master_admin", "national_admin", "regional_admin", "state_admin", "local_admin",
      ].includes(loggedInUser.role);

      const destination = location.state?.from?.pathname ||
        (isAdminUser ? "/admin-dashboard" : "/dashboard");

      navigate(destination, { replace: true });
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-intro" aria-label="About RouteReach Pro">
          <p className="login-kicker">RouteReach Pro</p>
          <h1 className="login-headline">Work Smarter. Target Better. Report Faster.</h1>
          <p className="login-description">
            RouteReach Pro is a map-based outreach and performance platform that turns
            applicant, lead, and outreach data into targeted action.
          </p>
          <p className="login-description">
            Instead of guessing where to go next, teams can plan routes by real demand,
            track field activity, and build reports from information already entered.
          </p>

          <div className="login-feature-grid">
            <article className="login-feature">
              <h2>Map and Target</h2>
              <p>
                Create clusters by ZIP code, city, county, state, or territory to focus
                outreach where it is most needed.
              </p>
            </article>
            <article className="login-feature">
              <h2>Track Real Activity</h2>
              <p>
                Log visits, materials distributed, contacts made, and follow-up needs in
                one connected workflow.
              </p>
            </article>
            <article className="login-feature">
              <h2>Report With Confidence</h2>
              <p>
                Draft monthly summaries and performance updates using live operational
                data instead of memory or scattered spreadsheets.
              </p>
            </article>
          </div>
        </section>

        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <img src={logo} alt="OutreachRoute Pro" className="login-logo-img" />
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !email || !password}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Contact your administrator if you need access or have forgotten your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
