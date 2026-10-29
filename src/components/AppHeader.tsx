import type { Ref } from "react";
import { generatePath, Link, useLocation, useMatch } from "react-router-dom";

import "./AppHeader.css";

import logo from "../assets/logo.svg";
import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import AppBreadcrumbs from "./AppBreadcrumbs";
import { useCharacterName } from "./useCharacterName";
import { getActiveTab } from "../shared/characterRouteState";
import { ChevronLeftIcon, MenuIcon, UserIcon } from "../shared/icons";

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
  const versionMatch = useMatch(ROUTES.characterVersion);
  const characterMatch = useMatch(ROUTES.character);
  const location = useLocation();
  const activeTab = getActiveTab(location.state);
  // Имя нужно и на странице версии, поэтому id берём из любого из двух маршрутов.
  const characterName = useCharacterName(
    versionMatch?.params.id ?? characterMatch?.params.id,
  );
  const historyPath =
    versionMatch &&
    generatePath(ROUTES.character, {
      id: versionMatch.params.id!,
    });
  // Лист и его история возвращают к списку; снимок — к истории этого персонажа.
  // /characters/new тоже совпадает с :id, но не является страницей существующего листа.
  const isSystemImport = location.pathname === ROUTES.importSystem;
  const isSystemsList = location.pathname === ROUTES.systems;
  const backPath =
    historyPath ??
    (isSystemImport ? ROUTES.systems : undefined) ??
    (isSystemsList ? ROUTES.importSystem : undefined) ??
    (characterMatch && characterMatch.params.id !== "new"
      ? ROUTES.characters
      : undefined);
  // Без почты подпись остаётся осмысленной: «Профиль», а не «Профиль: undefined».
  const profileLabel = user?.email ? `Профиль: ${user.email}` : "Профиль";

  return (
    <>
      {/* В разметке две шапки; какая из них видна, решает CSS по ширине экрана. */}
      <header className="desktop-header">
        <AppBreadcrumbs characterName={characterName} activeTab={activeTab} />
        <Link
          to={ROUTES.profile}
          className="desktop-header__profile"
          aria-label={profileLabel}
        >
          <UserIcon width={20} height={20} />
          <span>{user?.email}</span>
        </Link>
      </header>

      <header
        className={`mobile-header${backPath ? " mobile-header--back" : ""}`}
      >
        <div className="mobile-header__start">
          {backPath ? (
            <>
              {/* Назад — ссылка с явной целью, работает и при открытии страницы по прямому URL. */}
              <Link
                to={backPath}
                state={historyPath ? { activeTab: "history" } : undefined}
                className="mobile-header__button"
                aria-label={
                  isSystemImport
                    ? "К игровым системам"
                    : isSystemsList
                      ? "К импорту системы"
                      : historyPath
                        ? "К истории"
                        : "К персонажам"
                }
              >
                <ChevronLeftIcon />
              </Link>
              <span className="mobile-header__title">
                {isSystemsList || isSystemImport
                  ? "Импорт системы"
                  : historyPath
                    ? "История"
                    : "Персонажи"}
              </span>
            </>
          ) : (
            <>
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
            </>
          )}
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
