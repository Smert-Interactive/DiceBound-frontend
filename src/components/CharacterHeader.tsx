import { formatDateTime } from "../shared/formatDateTime";
import { SYSTEM_TONES, getSystemKind } from "../shared/systemKind";
import { Chip, SystemBadge } from "../shared/ui";

import "./CharacterHeader.css";

interface Props {
  name: string;
  systemName: string;
  schemaName: string;
  updatedAt: string;
  // В снимке номер уже показан в баннере, поэтому повтор в метаданных не нужен.
  version?: number;
}

// Шапка страницы персонажа: метка системы, имя, чип системы и строка подписей.
export default function CharacterHeader({
  name,
  systemName,
  schemaName,
  updatedAt,
  version,
}: Props) {
  const systemKind = getSystemKind(systemName);

  return (
    <header className="character-header">
      <SystemBadge name={systemName} system={systemKind} size="sheet" />
      <div className="character-header__main">
        <div className="character-header__title">
          <h1 className="character-header__name">{name}</h1>
          <Chip tone={SYSTEM_TONES[systemKind]}>{systemName}</Chip>
        </div>
        <p className="character-header__meta">
          <span>Лист: {schemaName}</span>
          <span className="character-header__date">
            Изменён{" "}
            <time dateTime={updatedAt}>{formatDateTime(updatedAt)}</time>
          </span>
          {version !== undefined && (
            <span className="character-header__version">
              Версия&nbsp;{version}
            </span>
          )}
        </p>
      </div>
    </header>
  );
}
