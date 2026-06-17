/**
 * PageLayout — Shared layout wrapper with Navbar + Sidebar.
 * All authenticated pages use this as their outer shell.
 */

import React, { useState } from "react";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

export default function PageLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        {title && (
          <div className="page-header">
            <h1 className="page-title">{title}</h1>
          </div>
        )}
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}
