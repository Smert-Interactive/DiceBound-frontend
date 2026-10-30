import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";
import CharacterNameProvider from "../components/CharacterNameProvider";
import AppHeader from "../components/AppHeader";

import "./AppLayout.css";

// Время анимации выхода меню берём из токена --motion-exit («140ms ease-in»), чтобы число
// не дублировалось в коде. Токен задан в миллисекундах; где CSS не подключён (тесты), будет 0.
function getSidebarExitDuration() {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--motion-exit",
  );
  return parseFloat(value) || 0;
}

// closed — меню нет на странице, open — открыто, closing — уже закрывается и играет анимация.
type MenuState = "closed" | "open" | "closing";

export default function AppLayout() {
  const [menu, setMenu] = useState<MenuState>("closed");
  const menuVisible = menu !== "closed";
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const openSidebar = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    setMenu("open");
  }, []);

  // Закрывает мобильное меню и возвращает фокус на кнопку, которая его открыла.
  // Меню остаётся в DOM, пока играет анимация выхода, потом убирается.
  const closeSidebar = useCallback(() => {
    if (menu !== "open") return;

    setMenu("closing");
    menuButtonRef.current?.focus();

    closeTimerRef.current = window.setTimeout(
      () => setMenu("closed"),
      getSidebarExitDuration(),
    );
  }, [menu]);

  // Таймер не должен сработать после ухода со страницы.
  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  // Пока меню открыто, Escape его закрывает.
  useEffect(() => {
    if (!menuVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuVisible, closeSidebar]);

  return (
    <CharacterNameProvider>
      <div className="app-layout">
        {/* Desktop sidebar */}
        <AppSidebar />

        <div className="app-layout__main">
          {/* Header */}
          <AppHeader
            onMenuClick={openSidebar}
            menuOpen={menuVisible}
            menuButtonRef={menuButtonRef}
          />

          {/* Page content */}
          <main className="app-layout__content">
            <Outlet />
          </main>
        </div>

        {/* Mobile sidebar */}
        {menuVisible && (
          <>
            <div className="sidebar-overlay" onClick={closeSidebar} />

            <AppSidebar
              mobile
              closing={menu === "closing"}
              onClose={closeSidebar}
            />
          </>
        )}
      </div>
    </CharacterNameProvider>
  );
}
