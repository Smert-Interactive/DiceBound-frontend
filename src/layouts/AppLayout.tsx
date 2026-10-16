import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";
import AppHeader from "../components/AppHeader";

import "./AppLayout.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Закрывает мобильное меню и возвращает фокус на кнопку, которая его открыла.
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Пока меню открыто, Escape его закрывает.
  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <AppSidebar />

      <div className="app-layout__main">
        {/* Header */}
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          menuOpen={sidebarOpen}
          menuButtonRef={menuButtonRef}
        />

        {/* Page content */}
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="sidebar-overlay" onClick={closeSidebar} />

          <AppSidebar mobile onClose={closeSidebar} />
        </>
      )}
    </div>
  );
}
