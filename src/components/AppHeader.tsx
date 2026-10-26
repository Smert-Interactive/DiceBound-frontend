import type { Ref } from "react";
import { generatePath, Link, useLocation, useMatch } from "react-router-dom";

import "./AppHeader.css";

import logo from "../assets/logo.svg";
import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import AppBreadcrumbs from "./AppBreadcrumbs";
import { getMockCharacterList } from "../mocks/characters";
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
  const state: unknown = location.state;
  const activeTab =
    state &&
    typeof state === "object" &&
    "activeTab" in state &&
    typeof state.activeTab === "string"
      ? state.activeTab
      : undefined;
  // Имя берём только из доступного пользователю списка, в том числе на странице версии.
  const characterId = versionMatch?.params.id ?? characterMatch?.params.id;
  const list = user && getMockCharacterList(user.email);
  const character =
    list &&
    [...list.owned, ...list.shared_view].find(
      (item) => item.id === characterId,
    );
  const historyPath =
    versionMatch &&
    generatePath(ROUTES.character, {
      id: versionMatch.params.id!,
    });
  // Лист и его история возвращают к списку; снимок — к истории этого персонажа.
  // /characters/new тоже совпадает с :id, но не является страницей существующего листа.
  const backPath =
    historyPath ??
    (characterMatch && characterMatch.params.id !== "new"
      ? ROUTES.characters
      : undefined);
  // Без почты подпись остаётся осмысленной: «Профиль», а не «Профиль: undefined».
  const profileLabel = user?.email ? `Профиль: ${user.email}` : "Профиль";

  return (
    <>
      {/* В разметке две шапки; какая из них видна, решает CSS по ширине экрана. */}
      <header className="desktop-header">
        <AppBreadcrumbs characterName={character?.name} activeTab={activeTab} />
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
                aria-label={historyPath ? "К истории" : "К персонажам"}
              >
                <ChevronLeftIcon />
              </Link>
              <span className="mobile-header__title">
                {historyPath ? "История" : "Персонажи"}
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
