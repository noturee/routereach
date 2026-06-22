/**
 * Sidebar — Left navigation panel.
 * Admin-only menu items are hidden from OA users.
 */

import React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import logo from "../assets/outreachroute_compact_logo.png";

const ADMIN_ROLES = new Set([
  "master_admin",
  "national_admin",
  "regional_admin",
  "state_admin",
  "local_admin",
]);

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: "🏠", adminOnly: false },
  { label: "Admin Dashboard", path: "/admin-dashboard", icon: "📈", adminOnly: true },
  { label: "My Numbers", path: "/my-numbers", icon: "📊", adminOnly: false },
  { label: "Applicants", path: "/applicants", icon: "👥", adminOnly: false },
  { label: "Upload Applicants", path: "/upload-applicants", icon: "📤", adminOnly: false },
  { label: "Case Notes", path: "/case-notes", icon: "📝", adminOnly: false },
  { label: "Outreach Map", path: "/outreach-map", icon: "🗺️", adminOnly: false },
  { label: "Locations", path: "/locations", icon: "📍", adminOnly: false },
  { label: "Route Planner", path: "/route-planner", icon: "🚗", adminOnly: false },
  { label: "Visit Logs", path: "/visit-logs", icon: "✅", adminOnly: false },
  { label: "Messaging", path: "/messaging", icon: "💬", adminOnly: false },
  { label: "Meetings", path: "/meetings", icon: "📅", adminOnly: false },
  { label: "Reports", path: "/reports", icon: "📋", adminOnly: false },
  { label: "Monthly Reports", path: "/monthly-reports", icon: "📆", adminOnly: false },
  // ── Admin only ──────────────────────────────────────────────────────────────
  { label: "Team Performance", path: "/team-performance", icon: "🏆", adminOnly: true },
  { label: "Territory Management", path: "/territory-management", icon: "🗂️", adminOnly: true },
  { label: "User Management", path: "/user-management", icon: "👤", adminOnly: true },
  { label: "Settings", path: "/settings", icon: "⚙️", adminOnly: false },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && ADMIN_ROLES.has(user.role);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <nav className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img src={logo} alt="OutreachRoute Pro" className="sidebar-logo-img" />
        </div>

        {/* Nav Links */}
        <ul className="sidebar-nav">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
                }
                onClick={onClose}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User info + logout at bottom */}
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">
                  {user.first_name} {user.last_name}
                </span>
                <span className="sidebar-user-org">{user.organization_name || "—"}</span>
              </div>
            </div>
          )}
          <div className="sidebar-contact">
            <a href="mailto:info@thelincolnheritagegroup.com" className="sidebar-contact-link">
              📧 Contact Support
            </a>
            <Link to="/about" className="sidebar-contact-link">
              ℹ️ About
            </Link>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>
    </>
  );
}
