import { useEffect, useRef } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";

import "./AppSidebar.css";

import logo from "../assets/logo.svg";
import logoMark from "../assets/logo-mark.svg";

import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import { CloseIcon, UploadIcon, UserIcon, UsersIcon } from "./icons";

interface Props {
  mobile?: boolean;
  // Мобильное меню уже закрывается: играет анимация выхода.
  closing?: boolean;
  onClose?: () => void;
}

// path — куда ведёт ссылка, activePath — на каких адресах пункт считается активным
// (совпадение по началу пути: «/systems» включает и «/systems/import»).
const menuItems = [
  {
    title: "Персонажи",
    Icon: UsersIcon,
    path: ROUTES.characters,
    activePath: ROUTES.characters,
  },
  {
    title: "Импорт системы",
    Icon: UploadIcon,
    path: ROUTES.importSystem,
    // По холсту на странице /systems в меню активен «Импорт системы».
    activePath: ROUTES.systems,
  },
  {
    title: "Профиль",
    Icon: UserIcon,
    path: ROUTES.profile,
    activePath: ROUTES.profile,
  },
];

export default function AppSidebar({ mobile, closing, onClose }: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // После перехода по ссылке мобильное меню закрывается, а на desktop обработчика нет.
  const handleNavigate = mobile ? onClose : undefined;

  // При открытии мобильного меню фокус переходит внутрь него.
  useEffect(() => {
    if (mobile) {
      closeButtonRef.current?.focus();
    }
  }, [mobile]);

  return (
    <aside
      className={
        mobile
          ? `sidebar sidebar--mobile${closing ? " sidebar--closing" : ""}`
          : "sidebar"
      }
      {...(mobile && {
        role: "dialog",
        "aria-modal": true,
        "aria-label": "Меню",
      })}
    >
      <div className="sidebar__top">
        {/* Имя ссылки задаёт aria-label: картинки декоративные, потому что на планшете
            вордмарк скрыт и вместо него показывается знак. */}
        <Link
          to={ROUTES.characters}
          className="sidebar__logo-link"
          aria-label="DiceBound"
          onClick={handleNavigate}
        >
          <img src={logo} className="sidebar__logo" alt="" />
          <img src={logoMark} className="sidebar__mark" alt="" />
        </Link>

        {mobile && (
          <button
            ref={closeButtonRef}
            type="button"
            className="sidebar__close"
            aria-label="Закрыть меню"
            onClick={onClose}
          >
            <CloseIcon width={20} height={20} />
          </button>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Основная навигация">
        {menuItems.map(({ path, activePath, title, Icon }) => {
          const isActive = matchPath({ path: activePath, end: false }, pathname);

          return (
            <Link
              key={path}
              to={path}
              className="sidebar__item"
              data-tooltip={title}
              aria-current={isActive ? "page" : undefined}
              onClick={handleNavigate}
            >
              <Icon className="sidebar__icon" />

              <span className="sidebar__label">{title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Внизу мобильного меню почта аккаунта. */}
      {mobile && <div className="sidebar__account">{user?.email}</div>}
    </aside>
  );
}
