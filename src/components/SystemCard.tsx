import type { GameSystemSummary } from "../mocks/systems";
import { NO_BREAK_SPACE } from "../shared/noBreakSpace";
import { pluralize } from "../shared/pluralize";
import { getSystemKind } from "../shared/systemKind";
import { SystemBadge } from "../shared/ui";

import "./SystemCard.css";

interface Props {
  system: GameSystemSummary;
  schemaCount: number;
  // Радиокнопки с одним name образуют группу: стрелки переключают систему.
  name: string;
  checked: boolean;
  onSelect: (systemId: string) => void;
}

// Карточка выбора игровой системы. Внутри настоящая радиокнопка, скрытая визуально;
// рамку и фокус рисует CSS на обёртке.
export default function SystemCard({
  system,
  schemaCount,
  name,
  checked,
  onSelect,
}: Props) {
  const sheetWord = pluralize(schemaCount, {
    one: "лист",
    few: "листа",
    many: "листов",
  });
  const sheets = `${schemaCount}${NO_BREAK_SPACE}${sheetWord}`;
  const meta =
    system.source === "IMPORTED"
      ? `Импортирована${NO_BREAK_SPACE}· ${sheets}`
      : sheets;

  return (
    <label className="system-card">
      <input
        type="radio"
        name={name}
        value={system.id}
        checked={checked}
        onChange={() => onSelect(system.id)}
      />
      <SystemBadge name={system.name} system={getSystemKind(system.name)} />
      <span className="system-card__text">
        <span className="system-card__name">{system.name}</span>
        <span className="system-card__meta">{meta}</span>
      </span>
      {/* Кружок радио виден только на телефоне, на desktop карточка просто подсвечивается. */}
      <span className="system-card__radio" aria-hidden="true" />
    </label>
  );
}
