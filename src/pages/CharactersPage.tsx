import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterCard from "../components/CharacterCard";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import { ROUTES } from "../constants/routes";
import { deleteCharacter, getCharacters } from "../api/characters";
import { useApiQuery } from "../api/useApiQuery";
import { LoadingSkeleton, LoadErrorState } from "../shared/states";
import type { CharacterSummary } from "../api/characterTypes";
import { EyeIcon, PlusIcon, UsersIcon } from "../shared/icons";
import { Banner, Chip, EmptyState, getButtonClassName } from "../shared/ui";

import "./CharactersPage.css";

interface SectionProps {
  title: string;
  characters: CharacterSummary[];
  // owned: свои персонажи и копии, shared: чужие по VIEW (пунктирная карточка).
  variant: "owned" | "shared";
  // Передаётся карточкам; у VIEW-персонажей кнопка удаления всё равно не рисуется.
  onDelete?: (character: CharacterSummary) => void;
}

// Блок списка: заголовок, подписи колонок и строки CharacterCard.
function CharacterSection({
  title,
  characters,
  variant,
  onDelete,
}: SectionProps) {
  const isShared = variant === "shared";

  return (
    <section
      className={`ui-card characters-page__section characters-page__section--${variant}`}
      aria-label={title}
    >
      <div className="characters-page__section-head">
        {isShared && <EyeIcon className="characters-page__section-icon" />}
        <h2>{title}</h2>
        {isShared ? (
          <>
            <Chip tone="violet" className="characters-page__badge">
              только просмотр
            </Chip>
            {/* На телефоне вместо чипа показывается число: «Доступные мне · 1». */}
            <span className="characters-page__count-text">
              {characters.length}
            </span>
          </>
        ) : (
          <Chip className="characters-page__count">{characters.length}</Chip>
        )}
      </div>
      {/* Подписи колонок только для глаз: список ниже построен как ul, а не как таблица. */}
      <div className="characters-page__columns" aria-hidden="true">
        <span className="characters-page__column-name">Имя</span>
        <span>Игровая система</span>
        <span className="characters-page__column-date">Изменён</span>
      </div>
      <ul className="characters-page__list">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  );
}

// Загружает серверный список и удаляет персонажей только после подтверждённого DELETE.
export default function CharactersPage() {
  const { user, handleUnauthorized } = useAuth();
  const query = useApiQuery(getCharacters, user?.id ?? "");
  const location = useLocation();
  const navigate = useNavigate();
  const state: unknown = location.state;
  const createdName =
    state &&
    typeof state === "object" &&
    "createdCharacterName" in state &&
    "createdCharacterId" in state &&
    typeof state.createdCharacterName === "string" &&
    typeof state.createdCharacterId === "string"
      ? state.createdCharacterName
      : null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deletion = useRef<AbortController | null>(null);
  const [deleteSession, setDeleteSession] = useState(0);
  useEffect(() => () => deletion.current?.abort(), []);
  useEffect(() => {
    if (createdName)
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        { replace: true, state: null },
      );
  }, [
    createdName,
    navigate,
    location.pathname,
    location.search,
    location.hash,
  ]);
  const [deleteTarget, setDeleteTarget] = useState<CharacterSummary | null>(
    null,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    createdName ? `Персонаж «${createdName}» создан` : null,
  );
  // Маршрут защищён ProtectedRoute; проверка сужает тип user для TypeScript.
  if (!user) return null;

  const owned = query.data?.owned ?? [];
  const shared_view = query.data?.shared_view ?? [];

  // Каждое открытие получает новое подтверждение без ошибки прошлого запроса.
  function handleDeleteRequest(character: CharacterSummary) {
    setDeleteSession((value) => value + 1);
    setDeleteTarget(character);
    setIsDeleteOpen(true);
  }

  // Сначала подтверждение сервера, затем обновление видимого списка и уведомление.
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const controller = new AbortController();
    deletion.current = controller;
    try {
      await deleteCharacter(deleteTarget.id, controller.signal);
      if (controller.signal.aborted) return;
      query.update((list) => ({
        ...list,
        owned: list.owned.filter((item) => item.id !== deleteTarget.id),
      }));
      setNotice(`Персонаж «${deleteTarget.name}» удалён`);
      setIsDeleteOpen(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!handleUnauthorized(error)) throw error;
    }
  }
  // Когда нет ни своих, ни чужих персонажей, кнопка создания живёт только в пустой карточке.
  const isEmpty = owned.length === 0 && shared_view.length === 0;

  return (
    <div className="characters-page">
      <header className="characters-page__header">
        <div className="characters-page__heading">
          <h1 ref={headingRef} tabIndex={-1}>
            Персонажи
          </h1>
          <p>Ваши персонажи и те, которыми с вами поделились</p>
        </div>
        {!query.loading && !query.error && !isEmpty && (
          <Link
            to={ROUTES.newCharacter}
            className={getButtonClassName({
              variant: "primary",
              className: "characters-page__create",
            })}
          >
            <span className="ui-button__rest">
              <PlusIcon />
              <span>
                Создать{" "}
                <span className="characters-page__label-rest">персонажа</span>
              </span>
            </span>
          </Link>
        )}
      </header>
      {/* Баннер не исчезает сам: закрывается кнопкой (ui-ux). */}
      {notice && (
        <Banner
          variant="success"
          notification
          title={notice}
          onClose={() => setNotice(null)}
        />
      )}
      {query.loading ? (
        <LoadingSkeleton variant="list" label="Загрузка персонажей" />
      ) : query.error ? (
        <LoadErrorState onRetry={query.retry} />
      ) : owned.length > 0 ? (
        <CharacterSection
          title="Мои персонажи"
          characters={owned}
          variant="owned"
          onDelete={handleDeleteRequest}
        />
      ) : (
        <EmptyState
          title="Персонажей пока нет"
          variant="characters"
          icon={<UsersIcon />}
          // Если есть доступные мне персонажи, кнопка создания уже в шапке: дубль не нужен.
          action={
            isEmpty && (
              <Link
                to={ROUTES.newCharacter}
                className={getButtonClassName({ variant: "primary" })}
              >
                <span className="ui-button__rest">
                  <PlusIcon />
                  Создать персонажа
                </span>
              </Link>
            )
          }
        >
          Выберите игровую систему, и лист соберётся автоматически. Персонажи,
          которыми с вами поделятся, появятся здесь же.
        </EmptyState>
      )}
      {/* Блок скрыт, пока нет персонажей, открытых по VIEW. */}
      {!query.loading && !query.error && shared_view.length > 0 && (
        <CharacterSection
          title="Доступные мне"
          characters={shared_view}
          variant="shared"
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          key={deleteSession}
          open={isDeleteOpen}
          fallbackFocusRef={headingRef}
          characterName={deleteTarget.name}
          onCancel={() => setIsDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
