import "./AppHeader.css";

import logo from "../assets/logo.svg";
import profileIcon from "../assets/icons/profile.svg";
import AppBreadcrumbs from "./AppBreadcrumbs";

interface Props {
  onMenuClick?: () => void;
}

export default function AppHeader({ onMenuClick }: Props) {
  return (
    <>
      {/* =====================
      DESKTOP HEADER
        ===================== */}
      <header className="desktop-header">
        <AppBreadcrumbs />
        <div className="header__profile">
          <img src={profileIcon} alt="" />
          <span>alex@example.com</span>
        </div>
      </header>

      {/* =====================
      MOBILE HEADER
        ===================== */}

      <header className="mobile-header">
        <div className="flex-cont">
          <button className="burger" onClick={onMenuClick}>
            <span />
            <span />
            <span />
          </button>

          <img src={logo} alt="DiceBound" className="mobile-header__logo" />
        </div>

        <button className="mobile-profile">
          <img src={profileIcon} alt="" />
        </button>
      </header>
    </>
  );
}
