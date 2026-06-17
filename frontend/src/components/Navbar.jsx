/**
 * Navbar — Top navigation bar with user info and logout button.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle sidebar">
          <span className="hamburger" />
          <span className="hamburger" />
          <span className="hamburger" />
        </button>
        <span className="navbar-brand">OutreachRoute Pro</span>
      </div>

      <div className="navbar-right">
        {user && (
          <>
            <span className="navbar-user">
              {user.first_name} {user.last_name}
              <span className="navbar-role">{formatRole(user.role)}</span>
            </span>
            <button className="btn btn-outline-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function formatRole(role) {
  const labels = {
    master_admin: "Master Admin",
    national_admin: "National Admin",
    regional_admin: "Regional Admin",
    state_admin: "State Admin",
    local_admin: "Local Admin",
    oa_user: "OA User",
  };
  return labels[role] || role;
}
