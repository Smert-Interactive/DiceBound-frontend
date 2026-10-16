import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import "./AppSidebar.css";

import logo from "../assets/logo.svg";

import { CloseIcon, UploadIcon, UserIcon, UsersIcon } from "./icons";

interface Props {
  mobile?: boolean;
  onClose?: () => void;
}

const menuItems = [
  {
    title: "Персонажи",
    Icon: UsersIcon,
    path: "/characters",
  },
  {
    title: "Импорт системы",
    Icon: UploadIcon,
    path: "/systems/import",
  },
  {
    title: "Профиль",
    Icon: UserIcon,
    path: "/profile",
  },
];

export default function AppSidebar({ mobile, onClose }: Props) {
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
        {menuItems.map(({ path, title, Icon }) => (
          <NavLink key={path} to={path} className="sidebar__item">
            <Icon className="sidebar__icon" />

            <span>{title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
