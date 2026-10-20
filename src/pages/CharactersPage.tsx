import { Link } from "react-router-dom";

import { ROUTES } from "../constants/routes";
import { PlusIcon, UsersIcon } from "../shared/icons";
import { EmptyState, getButtonClassName } from "../shared/ui";

import "./CharactersPage.css";

// Пока списки персонажей не подключены, после регистрации показывается пустое состояние.
export default function CharactersPage() {
  return (
    <div className="characters-page">
      <header className="characters-page__header">
        <h1>Персонажи</h1>
        <p>Ваши персонажи и те, которыми с вами поделились</p>
      </header>
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
    </div>
  );
}
