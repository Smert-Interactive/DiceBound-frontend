import type { GameSystemSummary } from "../systems/systemTypes";
import { formatDateTime } from "../shared/formatDateTime";
import { LockIcon, TrashIcon } from "../shared/icons";
import { NO_BREAK_SPACE } from "../shared/noBreakSpace";
import { pluralize } from "../shared/pluralize";
import { getSystemKind } from "../shared/systemKind";
import { Button, Chip, SystemBadge } from "../shared/ui";

import "./SystemListItem.css";

interface Props {
  system: GameSystemSummary;
  schemaNames: string[];
  isPhone: boolean;
  onDelete: (system: GameSystemSummary) => void;
  canDelete?: boolean;
}

// Одна система: строка таблицы на широком экране или самостоятельная карточка на телефоне.
export default function SystemListItem({
  system,
  schemaNames,
  isPhone,
  onDelete,
  canDelete = true,
}: Props) {
  const imported = system.source === "IMPORTED";
  const sheets = `${schemaNames.length}${NO_BREAK_SPACE}${pluralize(
    schemaNames.length,
    {
      one: "лист",
      few: "листа",
      many: "листов",
    },
  )}${schemaNames.length ? ` · ${schemaNames.join(", ")}` : ""}`;
  const characterCount = system.character_count;
  const characters =
    characterCount === 0
      ? "Не используется"
      : `${characterCount}${NO_BREAK_SPACE}${pluralize(characterCount, {
          one: "персонаж",
          few: "персонажа",
          many: "персонажей",
        })}`;
  const source = (
    <div className="system-list-item__source">
      <Chip tone={imported ? "violet" : "neutral"}>
        {imported ? "импортирована вами" : "встроенная"}
      </Chip>
      {imported && (
        <time dateTime={system.created_at}>
          Импорт {formatDateTime(system.created_at)}
        </time>
      )}
    </div>
  );
  const action =
    imported && canDelete ? (
      <Button
        {...(isPhone
          ? { variant: "default" as const }
          : { variant: "ghost" as const })}
        size="sm"
        icon={<TrashIcon />}
        aria-label={`Удалить систему ${system.name}`}
        onClick={() => onDelete(system)}
      >
        Удалить
      </Button>
    ) : (
      <span className="system-list-item__lock">
        <LockIcon aria-hidden="true" />
        {imported ? "Удаление недоступно" : "Встроенную удалить нельзя"}
      </span>
    );
  const identity = (
    <div className="system-list-item__identity">
      <SystemBadge
        name={system.name}
        system={getSystemKind(system.source, system.id)}
      />
      <div className="system-list-item__description">
        <b>{system.name}</b>
        <span>{sheets}</span>
        {isPhone && source}
      </div>
    </div>
  );
  const count = (
    <span
      className="system-list-item__count"
      data-empty={characterCount === 0 || undefined}
    >
      {characters}
    </span>
  );

  if (isPhone)
    return (
      <li className="system-list-item system-list-item--card ui-card">
        {identity}
        <dl className="system-list-item__characters">
          <dt>Персонажи</dt>
          <dd>{count}</dd>
        </dl>
        <div className="system-list-item__action">{action}</div>
      </li>
    );

  return (
    <tr className="system-list-item">
      <th scope="row">{identity}</th>
      <td>{source}</td>
      <td>{count}</td>
      <td>
        <div className="system-list-item__action">{action}</div>
      </td>
    </tr>
  );
}
