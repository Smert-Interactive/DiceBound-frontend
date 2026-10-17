import type { Ref } from "react";

import "./AppHeader.css";

import logo from "../assets/logo.svg";
import AppBreadcrumbs from "./AppBreadcrumbs";
import { MenuIcon, UserIcon } from "./icons";

interface Props {
  onMenuClick?: () => void;
  menuOpen?: boolean;
  menuButtonRef?: Ref<HTMLButtonElement>;
}

export default function AppHeader({
  onMenuClick,
  menuOpen = false,
  menuButtonRef,
}: Props) {
  return (
    <>
      {/* =====================
      DESKTOP HEADER
        ===================== */}
      <header className="desktop-header">
        <AppBreadcrumbs />
        <div className="header__profile">
          <UserIcon width={20} height={20} />
          <span>alex@example.com</span>
        </div>
      </header>

      {/* =====================
      MOBILE HEADER
        ===================== */}

      <header className="mobile-header">
        <div className="flex-cont">
          <button
            ref={menuButtonRef}
            type="button"
            className="burger"
            aria-label="Открыть меню"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={onMenuClick}
          >
            <MenuIcon />
          </button>

          <img src={logo} alt="DiceBound" className="mobile-header__logo" />
        </div>

        <button type="button" className="mobile-profile" aria-label="Профиль">
          <UserIcon />
        </button>
      </header>
    </>
  );
}
