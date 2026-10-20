import { Link } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterCard from "../components/CharacterCard";
import { ROUTES } from "../constants/routes";
import { getMockCharacterList } from "../mocks/characters";
import { PlusIcon, UsersIcon } from "../shared/icons";
import { Chip, EmptyState, getButtonClassName } from "../shared/ui";

import "./CharactersPage.css";

// Список берётся из моков по почте пользователя; у нового аккаунта он пуст.
export default function CharactersPage() {
  const { user } = useAuth();
  // Маршрут защищён ProtectedRoute; проверка сужает тип user для TypeScript.
  if (!user) return null;

  // Из ответа берём пока только свои персонажи; «Доступные мне» добавим следующим пунктом.
  const { owned } = getMockCharacterList(user.email);

  return (
    <div className="characters-page">
      <header className="characters-page__header">
        <div className="characters-page__heading">
          <h1>Персонажи</h1>
          <p>Ваши персонажи и те, которыми с вами поделились</p>
        </div>
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
      </header>
      {owned.length > 0 ? (
        <section
          className="ui-card characters-page__section"
          aria-label="Мои персонажи"
        >
          <div className="characters-page__section-head">
            <h2>Мои персонажи</h2>
            <Chip>{owned.length}</Chip>
          </div>
          {/* Подписи колонок только для глаз: список ниже построен как ul, а не как таблица. */}
          <div className="characters-page__columns" aria-hidden="true">
            <span className="characters-page__column-name">Имя</span>
            <span>Игровая система</span>
            <span className="characters-page__column-date">Изменён</span>
          </div>
          <ul className="characters-page__list">
            {owned.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </ul>
        </section>
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
    </div>
  );
}
