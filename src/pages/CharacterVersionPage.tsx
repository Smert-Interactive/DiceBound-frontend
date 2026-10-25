import { useState } from "react";
import { generatePath, Link, useParams } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterHeader from "../components/CharacterHeader";
import RestoreConfirmModal from "../components/RestoreConfirmModal";
import { ROUTES } from "../constants/routes";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import {
  getMockCharacterVersion,
  getMockCharacterVersions,
} from "../mocks/characterVersions";
import { getMockSheetSchema } from "../mocks/sheetSchemas";
import { MOCK_SYSTEMS } from "../mocks/systems";
import { formatDateTime } from "../shared/formatDateTime";
import { ChevronLeftIcon, RestoreIcon } from "../shared/icons";
import { NotFoundOrForbidden } from "../shared/states";
import { getSystemKind } from "../shared/systemKind";
import { Banner, Button, getButtonClassName } from "../shared/ui";

import "./CharacterVersionPage.css";

export default function CharacterVersionPage() {
  const { id = "", version = "" } = useParams();
  const { user } = useAuth();
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  // Принимаем только положительный целый номер. Неизвестный снимок и запрет выглядят как 404.
  const snapshot =
    user && /^[1-9]\d*$/u.test(version)
      ? getMockCharacterVersion(id, Number(version), user.email)
      : undefined;
  const character = snapshot && getMockCharacterDetails(id);
  const schema = character && getMockSheetSchema(character.sheet_schema_id);
  const system = MOCK_SYSTEMS.find(
    (item) => item.id === character?.game_system_id,
  );
  if (!user || !snapshot || !character || !schema || !system)
    return <NotFoundOrForbidden />;

  const versions = getMockCharacterVersions(id, user.email)!;
  const restoreTarget = versions.find(
    (item) => item.version_number === snapshot.version_number,
  )!;
  const historyPath = generatePath(ROUTES.character, { id });
  const canRestore =
    character.access === "OWNER" &&
    snapshot.version_number !== character.current_version_number;

  return (
    <div
      className="character-version-page"
      data-system={getSystemKind(system.name)}
    >
      <Banner
        className="character-version-page__notice"
        icon="clock"
        title={`Версия ${snapshot.version_number} · ${formatDateTime(snapshot.created_at)}`}
        actions={
          <>
            <Link
              to={historyPath}
              state={{ activeTab: "history" }}
              className={getButtonClassName({ size: "sm" })}
            >
              <span className="ui-button__rest">
                <ChevronLeftIcon />К истории
              </span>
            </Link>
            {canRestore && (
              // Открываем то же подтверждение, что и из списка истории.
              <Button
                variant="primary"
                size="sm"
                icon={<RestoreIcon />}
                onClick={() => setIsRestoreOpen(true)}
              >
                <span className="character-version-page__restore-desktop">
                  Восстановить эту версию
                </span>
                <span className="character-version-page__restore-mobile">
                  Восстановить
                </span>
              </Button>
            )}
          </>
        }
      >
        Только просмотр. Текущая версия персонажа —{" "}
        {character.current_version_number}.
      </Banner>
      <CharacterHeader
        name={character.name}
        systemName={system.name}
        schemaName={schema.name}
        updatedAt={snapshot.created_at}
      />
      {/* Зависимость от ветки 7: здесь должен быть общий DynamicSheetRenderer с readOnly.
          Передавать нужно schema и snapshot.data, включая сохранённые calculated.
          Пока renderer отсутствует, не создаём второй и не пересчитываем формулы снимка. */}
      {canRestore && (
        <RestoreConfirmModal
          open={isRestoreOpen}
          version={restoreTarget}
          versions={versions}
          onCancel={() => setIsRestoreOpen(false)}
        />
      )}
    </div>
  );
}
