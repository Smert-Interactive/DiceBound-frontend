import { Link } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterCard from "../components/CharacterCard";
import { ROUTES } from "../constants/routes";
import { getMockCharacterList } from "../mocks/characters";
import type { CharacterSummary } from "../mocks/characters";
import { EyeIcon, PlusIcon, UsersIcon } from "../shared/icons";
import { Chip, EmptyState, getButtonClassName } from "../shared/ui";

import "./CharactersPage.css";

interface SectionProps {
  title: string;
  characters: CharacterSummary[];
  // owned: свои персонажи и копии, shared: чужие по VIEW (пунктирная карточка).
  variant: "owned" | "shared";
}

// Блок списка: заголовок, подписи колонок и строки CharacterCard.
function CharacterSection({ title, characters, variant }: SectionProps) {
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
          <CharacterCard key={character.id} character={character} />
        ))}
      </ul>
    </section>
  );
}

// Список берётся из моков по почте пользователя; у нового аккаунта он пуст.
export default function CharactersPage() {
  const { user } = useAuth();
  // Маршрут защищён ProtectedRoute; проверка сужает тип user для TypeScript.
  if (!user) return null;

  const { owned, shared_view } = getMockCharacterList(user.email);
  // Когда нет ни своих, ни чужих персонажей, кнопка создания живёт только в пустой карточке.
  const isEmpty = owned.length === 0 && shared_view.length === 0;

  return (
    <div className="characters-page">
      <header className="characters-page__header">
        <div className="characters-page__heading">
          <h1>Персонажи</h1>
          <p>Ваши персонажи и те, которыми с вами поделились</p>
        </div>
        {!isEmpty && (
          <Link
            to={ROUTES.newCharacter}
            className={getButtonClassName({
              variant: "primary",
              className: "characters-page__create",
            })}
          >
            <span className="ui-button__rest">
              <PlusIcon />
              Создать
              <span className="characters-page__label-rest"> персонажа</span>
            </span>
          </Link>
        )}
      </header>
      {owned.length > 0 ? (
        <CharacterSection
          title="Мои персонажи"
          characters={owned}
          variant="owned"
        />
      ) : (
        <EmptyState
          title="Персонажей пока нет"
          variant="characters"
          icon={<UsersIcon />}
          action={
            <Link
              to={ROUTES.newCharacter}
              className={getButtonClassName({ variant: "primary" })}
            >
              <span className="ui-button__rest">
                <PlusIcon />
                Создать персонажа
              </span>
            </Link>
          }
        >
          Выберите игровую систему, и лист соберётся автоматически. Персонажи,
          которыми с вами поделятся, появятся здесь же.
        </EmptyState>
      )}
      {/* Блок скрыт, пока нет персонажей, открытых по VIEW. */}
      {shared_view.length > 0 && (
        <CharacterSection
          title="Доступные мне"
          characters={shared_view}
          variant="shared"
        />
      )}
    </div>
  );
}
