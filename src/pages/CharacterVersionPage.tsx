import { useState } from "react";
import { generatePath, Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import CharacterHeader from "../components/CharacterHeader";
import RestoreConfirmModal from "../components/RestoreConfirmModal";
import { ROUTES } from "../constants/routes";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import {
  getMockCharacterVersion,
  getMockCharacterVersions,
  restoreMockCharacterVersion,
} from "../mocks/characterVersions";
import { getMockSheetSchema } from "../mocks/sheetSchemas";
import { MOCK_SYSTEMS } from "../mocks/systems";
import { formatDateTime } from "../shared/formatDateTime";
import { ChevronLeftIcon, RestoreIcon } from "../shared/icons";
import { NotFoundOrForbidden } from "../shared/states";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { getSystemKind } from "../shared/systemKind";
import { Banner, Button, getButtonClassName } from "../shared/ui";

import "./CharacterVersionPage.css";

export default function CharacterVersionPage() {
  const { id = "", version = "" } = useParams();
  const { user } = useAuth();
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 639px)");
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

  async function handleRestoreConfirm() {
    if (!user || !snapshot) return;
    const result = await restoreMockCharacterVersion(
      id,
      snapshot.version_number,
      user.email,
    );
    // Новый адрес открывает вкладку «Лист»; баннер берёт числа из ответа сервиса.
    navigate(historyPath, {
      state: {
        restoreNotice: `Восстановлена версия ${result.character.current_version_number}. Удалено версий: ${result.deleted_versions_count}`,
      },
    });
  }

  // Одна группа действий: desktop — внутри баннера, телефон — отдельной строкой под ним.
  const versionActions = (
    <>
      <Link
        to={historyPath}
        state={{ activeTab: "history" }}
        className={getButtonClassName({
          size: "sm",
          className: "character-version-page__back",
        })}
      >
        <span className="ui-button__rest">
          <ChevronLeftIcon />К истории
        </span>
      </Link>
      {canRestore && (
        <Button
          variant="primary"
          size="sm"
          icon={<RestoreIcon />}
          onClick={() => setIsRestoreOpen(true)}
        >
          {isMobile ? "Восстановить" : "Восстановить эту версию"}
        </Button>
      )}
    </>
  );

  return (
    <div
      className="character-version-page"
      data-system={getSystemKind(system.name)}
    >
      <Banner
        className="character-version-page__notice"
        icon="clock"
        title={`Версия ${snapshot.version_number} · ${formatDateTime(snapshot.created_at)}`}
        actions={isMobile ? undefined : versionActions}
      >
        Только просмотр. Текущая версия персонажа —{" "}
        {character.current_version_number}.
      </Banner>
      {isMobile && (
        <div className="character-version-page__actions">{versionActions}</div>
      )}
      <CharacterHeader
        name={character.name}
        systemName={system.name}
        schemaName={schema.name}
        updatedAt={snapshot.created_at}
        showDateOnMobile
      />
      {/* Зависимость от ветки 7: здесь должен быть общий DynamicSheetRenderer с readOnly.
          Передавать нужно schema и snapshot.data, включая сохранённые calculated.
          Пока renderer отсутствует, не создаём второй и не пересчитываем формулы снимка. */}
      {canRestore && (
        <RestoreConfirmModal
          open={isRestoreOpen}
          version={restoreTarget}
          versions={versions}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setIsRestoreOpen(false)}
        />
      )}
    </div>
  );
}
