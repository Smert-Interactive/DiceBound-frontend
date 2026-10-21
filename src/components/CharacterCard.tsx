import { Link, generatePath } from "react-router-dom";

import { ROUTES } from "../constants/routes";
import type { CharacterSummary } from "../mocks/characters";
import { formatDateTime } from "../shared/formatDateTime";
import { EyeIcon, TrashIcon } from "../shared/icons";
import { getSystemKind } from "../shared/systemKind";
import { Button, Chip, SystemBadge, getButtonClassName } from "../shared/ui";

import "./CharacterCard.css";

const SYSTEM_TONES = { dnd: "crimson", coc: "ok", imported: "violet" } as const;

interface Props {
  character: CharacterSummary;
  // Без обработчика кнопка удаления не показывается, у VIEW её нет в любом случае.
  onDelete?: (character: CharacterSummary) => void;
}

// Одна строка списка: таблица на desktop и планшете, карточка на телефоне (см. CSS).
// Элемент li лежит в списке ul, который собирает страница.
export default function CharacterCard({ character, onDelete }: Props) {
  const isViewOnly = character.access === "VIEW";
  const systemKind = getSystemKind(character.game_system_name);
  const href = generatePath(ROUTES.character, { id: character.id });

  let note: string | null = null;
  if (isViewOnly) {
    note = `Владелец: ${character.owner_username}`;
  } else if (character.copy_source_owner_name) {
    note = `Копия от ${character.copy_source_owner_name} · редактируется независимо`;
  }

  return (
    <li className="character-card" data-view={isViewOnly || undefined}>
      <SystemBadge
        name={character.game_system_name}
        system={systemKind}
        viewOnly={isViewOnly}
      />

      <div className="character-card__main">
        <div className="character-card__title">
          {isViewOnly && <EyeIcon className="character-card__eye" />}
          {/* Ссылка на имени растягивается на всю карточку через ::after в CSS. */}
          <Link to={href} className="character-card__link">
            {character.name}
          </Link>
          {isViewOnly && (
            <Chip tone="violet" className="character-card__view-inline">
              VIEW
            </Chip>
          )}
        </div>
        {note && <span className="character-card__note">{note}</span>}
      </div>

      {/* На desktop обычный текст, на телефоне чип: различие задаёт CSS. */}
      <span
        className={`ui-chip ui-tone--${SYSTEM_TONES[systemKind]} character-card__system`}
      >
        {character.game_system_name}
      </span>

      <time className="character-card__date" dateTime={character.updated_at}>
        {formatDateTime(character.updated_at)}
      </time>

      <div className="character-card__actions">
        {isViewOnly && (
          <Chip tone="violet" className="character-card__view-action">
            VIEW
          </Chip>
        )}
        <Link
          to={href}
          className={getButtonClassName({ size: "sm" })}
          aria-label={`Открыть ${character.name}`}
        >
          <span className="ui-button__rest">Открыть</span>
        </Link>
        {!isViewOnly && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={<TrashIcon />}
            aria-label={`Удалить ${character.name}`}
            onClick={() => onDelete(character)}
          />
        )}
      </div>
    </li>
  );
}
