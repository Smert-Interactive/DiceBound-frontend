import type { Ref } from "react";
import { Link } from "react-router-dom";

import "./AppHeader.css";

import logo from "../assets/logo.svg";
import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import AppBreadcrumbs from "./AppBreadcrumbs";
import { MenuIcon, UserIcon } from "../shared/icons";

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
  // Без почты подпись остаётся осмысленной: «Профиль», а не «Профиль: undefined».
  const profileLabel = user?.email ? `Профиль: ${user.email}` : "Профиль";

  return (
    <>
      {/* В разметке две шапки; какая из них видна, решает CSS по ширине экрана. */}
      <header className="desktop-header">
        <AppBreadcrumbs />
        <Link
          to={ROUTES.profile}
          className="desktop-header__profile"
          aria-label={profileLabel}
        >
          <UserIcon width={20} height={20} />
          <span>{user?.email}</span>
        </Link>
      </header>

      <header className="mobile-header">
        <div className="mobile-header__start">
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-header__button"
            aria-label="Открыть меню"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={onMenuClick}
          >
            <MenuIcon />
          </button>

          <img src={logo} alt="DiceBound" className="mobile-header__logo" />
        </div>

        <Link
          to={ROUTES.profile}
          className="mobile-header__button"
          aria-label="Профиль"
        >
          <UserIcon />
        </Link>
      </header>
    </>
  );
}
