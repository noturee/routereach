/**
 * OutreachRoute Pro — Protected Route Component
 *
 * Wraps routes that require authentication.
 * - Redirects unauthenticated users to /login
 * - Redirects non-admin users away from admin-only routes
 * - Shows a loading spinner while the auth state is being restored
 *
 * Props:
 *   adminOnly: boolean — if true, only admin-role users may access the route
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  // Show nothing while restoring session from localStorage
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated — redirect to login, preserving the intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin-only route accessed by non-admin user
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
