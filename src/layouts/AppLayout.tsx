import { useState } from "react";
import { Outlet } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";
import AppHeader from "../components/AppHeader";

import "./AppLayout.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <AppSidebar />

      <div className="app-layout__main">
        {/* Header */}
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />

          <AppSidebar mobile onClose={() => setSidebarOpen(false)} />
        </>
      )}
    </div>
  );
}
