import type { Ref } from "react";
import { Link } from "react-router-dom";

import "./AppHeader.css";

import logo from "../assets/logo.svg";
import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
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
  // Берём вошедшего пользователя из AuthProvider, а не пишем email в коде.
  const { user } = useAuth();

  return (
    <>
      {/* =====================
      DESKTOP HEADER
        ===================== */}
      <header className="desktop-header">
        <AppBreadcrumbs />
        <div className="header__profile">
          <UserIcon width={20} height={20} />
          <span>{user?.email}</span>
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

        <Link to={ROUTES.profile} className="mobile-profile" aria-label="Профиль">
          <UserIcon />
        </Link>
      </header>
    </>
  );
}
