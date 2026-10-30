import { useId } from "react";
import { generatePath, Link } from "react-router-dom";

import { ROUTES } from "../constants/routes";
import type { CharacterVersionSummary } from "../history/historyTypes";
import { formatDateTime } from "../shared/formatDateTime";
import { AlertIcon, EyeIcon, RestoreIcon } from "../shared/icons";
import { Banner, Button, Chip, getButtonClassName } from "../shared/ui";

import "./CharacterHistory.css";

interface Props {
  characterId: string;
  versions: readonly CharacterVersionSummary[];
  ownerName: string;
  canRestore: boolean;
  // Окно подтверждения подключается отдельно; без обработчика восстановление недоступно.
  onRestore?: (version: CharacterVersionSummary) => void;
}

export default function CharacterHistory({
  characterId,
  versions,
  ownerName,
  canRestore,
  onRestore,
}: Props) {
  const helpId = useId();

  return (
    <div className="character-history">
      {!canRestore && (
        <Banner title={`${ownerName} открыл вам историю версий.`}>
          Открывать старые версии можно, восстанавливать — только владельцу.
        </Banner>
      )}
      <div className="character-history__layout">
        <section
          className="character-history__list-card ui-card"
          aria-label="История версий"
        >
          {/* Сервис отдаёт версии от новых к старым. Номер версии не зависит от позиции строки. */}
          <ol className="character-history__list">
            {versions.map((version) => (
              <li
                key={version.id}
                className="character-history__row"
                aria-current={version.is_current || undefined}
              >
                <span
                  className={`character-history__number${version.is_current ? " character-history__number--current" : ""}`}
                  aria-hidden="true"
                >
                  v{version.version_number}
                </span>
                <div className="character-history__metadata">
                  <div className="character-history__title">
                    <b>Версия {version.version_number}</b>
                    {version.is_current && <Chip tone="crimson">текущая</Chip>}
                    {version.version_number === 1 && (
                      <Chip>создание персонажа</Chip>
                    )}
                  </div>
                  <time dateTime={version.created_at}>
                    {formatDateTime(version.created_at)}
                  </time>
                </div>
                <div className="character-history__actions">
                  <Link
                    to={generatePath(ROUTES.characterVersion, {
                      id: characterId,
                      version: String(version.version_number),
                    })}
                    className={getButtonClassName({ size: "sm" })}
                    aria-label={`Открыть версию ${version.version_number}`}
                  >
                    <span className="ui-button__rest">
                      <EyeIcon />
                      Открыть
                    </span>
                  </Link>
                  {/* Текущую версию не восстанавливают, а VIEW не может восстанавливать вообще. */}
                  {canRestore && !version.is_current && (
                    <Button
                      size="sm"
                      icon={<RestoreIcon />}
                      disabled={!onRestore}
                      onClick={() => onRestore?.(version)}
                      aria-label={`Восстановить версию ${version.version_number}`}
                    >
                      Восстановить
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside
          className="character-history__help ui-card"
          aria-labelledby={helpId}
        >
          <h2 id={helpId}>Как работает история</h2>
          <p>
            Каждое сохранение листа создаёт новую версию — полный снимок
            персонажа.
          </p>
          <p>
            Восстановление возвращает персонажа к выбранной версии и удаляет все
            версии после неё.
          </p>
          <p className="character-history__warning">
            <AlertIcon />
            Удалённые версии вернуть нельзя
          </p>
        </aside>
      </div>
    </div>
  );
}
