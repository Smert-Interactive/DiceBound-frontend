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
  // VIEW показывает владельца вместо номера версии; EDIT-копия помечается отдельным чипом.
  ownerEmail?: string;
  isCopy?: boolean;
  // На мобильной странице версии дата остаётся под именем, как в MVersion.
  showDateOnMobile?: boolean;
}

// Шапка страницы персонажа: метка системы, имя, чип системы и строка подписей.
export default function CharacterHeader({
  name,
  systemName,
  schemaName,
  updatedAt,
  version,
  ownerEmail,
  isCopy = false,
  showDateOnMobile = false,
}: Props) {
  const systemKind = getSystemKind(systemName);

  return (
    <header
      className={`character-header${showDateOnMobile ? " character-header--with-mobile-date" : ""}`}
    >
      <SystemBadge
        name={systemName}
        system={systemKind}
        size="sheet"
        viewOnly={Boolean(ownerEmail)}
      />
      <div className="character-header__main">
        <div className="character-header__title">
          <h1 className="character-header__name">{name}</h1>
          <Chip tone={SYSTEM_TONES[systemKind]}>{systemName}</Chip>
          {isCopy && <Chip>копия</Chip>}
        </div>
        <p className="character-header__meta">
          <span>Лист: {schemaName}</span>
          <span className="character-header__date">
            Изменён{" "}
            <time dateTime={updatedAt}>{formatDateTime(updatedAt)}</time>
          </span>
          {ownerEmail ? (
            <span className="character-header__owner">
              Владелец: {ownerEmail}
            </span>
          ) : (
            version !== undefined && (
              <span className="character-header__version">
                Версия&nbsp;{version}
              </span>
            )
          )}
        </p>
      </div>
    </header>
  );
}
