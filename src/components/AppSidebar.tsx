import "./AppSidebar.css";

import logo from "../assets/logo.svg";

import charactersIcon from "../assets/icons/characters.svg";
import importIcon from "../assets/icons/import.svg";
import profileIcon from "../assets/icons/profile.svg";
import closeIcon from "../assets/icons/close.svg";

interface Props {
  mobile?: boolean;
  onClose?: () => void;
}

const menuItems = [
  {
    title: "Персонажи",
    icon: charactersIcon,
    path: "/characters",
  },
  {
    title: "Импорт системы",
    icon: importIcon,
    path: "/systems/import",
  },
  {
    title: "Профиль",
    icon: profileIcon,
    path: "/profile",
  },
];

export default function AppSidebar({ mobile, onClose }: Props) {
  return (
    <aside className={mobile ? "sidebar sidebar--mobile" : "sidebar"}>
      <div className="sidebar__top">
        <img src={logo} className="sidebar__logo" alt="DiceBound" />

        {mobile && (
          <button className="sidebar__close" onClick={onClose}>
            <img src={closeIcon} alt="DiceBound" />
          </button>
        )}
      </div>

      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <a key={item.path} href={item.path} className="sidebar__item">
            <img src={item.icon} className="sidebar__icon" alt="" />

            <span>{item.title}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
