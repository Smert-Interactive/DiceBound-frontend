import { useEffect, useRef } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";

import "./AppSidebar.css";

import logo from "../assets/logo.svg";

import { ROUTES } from "../constants/routes";
import { CloseIcon, UploadIcon, UserIcon, UsersIcon } from "./icons";

interface Props {
  mobile?: boolean;
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

export default function AppSidebar({ mobile, onClose }: Props) {
  const { pathname } = useLocation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // При открытии мобильного меню фокус переходит внутрь него.
  useEffect(() => {
    if (mobile) {
      closeButtonRef.current?.focus();
    }
  }, [mobile]);

  return (
    <aside
      className={mobile ? "sidebar sidebar--mobile" : "sidebar"}
      {...(mobile && {
        role: "dialog",
        "aria-modal": true,
        "aria-label": "Меню",
      })}
    >
      <div className="sidebar__top">
        <img src={logo} className="sidebar__logo" alt="DiceBound" />

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
            >
              <Icon className="sidebar__icon" />

              <span className="sidebar__label">{title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
