import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";
import AppHeader from "../components/AppHeader";

import "./AppLayout.css";

// Время анимации выхода меню. Должно совпадать с --motion-exit в index.css (140ms).
const SIDEBAR_EXIT_MS = 140;

export default function AppLayout() {
  // sidebarOpen — меню есть на странице, sidebarClosing — оно уже закрывается и играет анимация.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const openSidebar = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    setSidebarClosing(false);
    setSidebarOpen(true);
  }, []);

  // Закрывает мобильное меню и возвращает фокус на кнопку, которая его открыла.
  // Меню остаётся в DOM, пока играет анимация выхода, потом убирается.
  const closeSidebar = useCallback(() => {
    if (sidebarClosing) return;

    setSidebarClosing(true);
    menuButtonRef.current?.focus();

    closeTimerRef.current = window.setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, SIDEBAR_EXIT_MS);
  }, [sidebarClosing]);

  // Таймер не должен сработать после ухода со страницы.
  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

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
          onMenuClick={openSidebar}
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

          <AppSidebar mobile closing={sidebarClosing} onClose={closeSidebar} />
        </>
      )}
    </div>
  );
}
