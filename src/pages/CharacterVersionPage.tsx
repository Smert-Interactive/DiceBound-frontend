import { useCallback } from "react";
import { generatePath, Link, useNavigate, useParams } from "react-router-dom";
import { getCharacterVersion } from "../api/characterHistory";
import { getCharacterSheet } from "../api/characterSheet";
import { ApiError } from "../api/client";
import { useApiQuery } from "../api/useApiQuery";
import { useAuth } from "../auth/authContext";
import CharacterHeader from "../components/CharacterHeader";
import RestoreConfirmModal from "../components/RestoreConfirmModal";
import { useCharacterRestore } from "../history/useCharacterRestore";
import { formatRestoreNotice } from "../history/restoreNotice";
import { useCharacterLabel } from "../components/useCharacterName";
import { ROUTES } from "../constants/routes";
import DynamicSheetRenderer from "../sheet/DynamicSheetRenderer";
import { getStoredCalculated, toDraft } from "../sheet/sheetDraft";
import { formatDateTime } from "../shared/formatDateTime";
import { ChevronLeftIcon, RestoreIcon } from "../shared/icons";
import {
  LoadingSkeleton,
  LoadErrorState,
  NotFoundOrForbidden,
} from "../shared/states";
import { useMediaQuery } from "../shared/states/useMediaQuery";
import { getSystemKind } from "../shared/systemKind";
import { Banner, Button, getButtonClassName } from "../shared/ui";
import "./CharacterVersionPage.css";

// Проверяет номер до запроса; отдельный экземпляр не принимает ответ от предыдущего адреса.
export default function CharacterVersionPage() {
  const { id = "", version = "" } = useParams();
  const { user } = useAuth();
  if (!/^[1-9]\d*$/u.test(version) || Number(version) > 2147483647)
    return <NotFoundOrForbidden />;
  return (
    <VersionSnapshot
      key={`${user?.id}:${id}:${version}`}
      id={id}
      version={Number(version)}
    />
  );
}

// Показывает серверный снимок без пересчёта формул и без редактирования текущего листа.
function VersionSnapshot({ id, version }: { id: string; version: number }) {
  const navigate = useNavigate();
  const restore = useCharacterRestore(id, (result) => {
    navigate(generatePath(ROUTES.character, { id }), {
      replace: true,
      state: { restoreNotice: formatRestoreNotice(result) },
    });
  });
  const request = useCallback(
    async (signal: AbortSignal) => {
      const snapshot = await getCharacterVersion(id, version, signal);
      const sheet = await getCharacterSheet(id, signal);
      return { snapshot, ...sheet };
    },
    [id, version],
  );
  const query = useApiQuery(request, `${id}:${version}`);
  const { character, schema, summary, snapshot } = query.data ?? {};
  useCharacterLabel(
    id,
    character?.can_view_history ? character.name : undefined,
  );
  const isMobile = useMediaQuery("(max-width: 639px)");
  if (query.loading)
    return <LoadingSkeleton variant="sheet" label="Версия загружается" />;
  if (query.error) {
    if (
      query.error instanceof ApiError &&
      [400, 403, 404].includes(query.error.status)
    )
      return <NotFoundOrForbidden />;
    return <LoadErrorState onRetry={query.retry} />;
  }
  if (!character?.can_view_history || !schema || !snapshot)
    return <NotFoundOrForbidden />;
  const back = (
    <>
      <Link
        to={generatePath(ROUTES.character, { id })}
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
      {character.access === "OWNER" &&
        snapshot.version_number !== character.current_version_number && (
          <Button
            variant="primary"
            size="sm"
            icon={<RestoreIcon />}
            loading={restore.preparing}
            loadingText="Загрузка истории…"
            onClick={() => void restore.begin(snapshot.version_number)}
          >
            {isMobile ? "Восстановить" : "Восстановить эту версию"}
          </Button>
        )}
    </>
  );
  return (
    <div className="character-version-page" data-system={getSystemKind()}>
      {restore.preparationError && (
        <Banner variant="error" title={restore.preparationError}>
          <Button onClick={query.retry}>Обновить данные</Button>
        </Banner>
      )}
      <Banner
        className="character-version-page__notice"
        icon="clock"
        title={`Версия ${snapshot.version_number} · ${formatDateTime(snapshot.created_at)}`}
        actions={isMobile ? undefined : back}
      >
        Только просмотр. Текущая версия персонажа —{" "}
        {character.current_version_number}.
      </Banner>
      {isMobile && (
        <div className="character-version-page__actions">{back}</div>
      )}
      <CharacterHeader
        name={character.name}
        systemName={summary?.game_system_name ?? "Игровая система"}
        schemaName={schema.name}
        updatedAt={snapshot.created_at}
        ownerName={
          character.access === "VIEW" ? character.owner_username : undefined
        }
        isCopy={Boolean(summary?.copy_source_owner_name)}
        showDateOnMobile
      />
      <DynamicSheetRenderer
        schema={schema.schema}
        draft={toDraft(schema.schema, snapshot.data)}
        calculated={getStoredCalculated(schema.schema, snapshot.data)}
        readOnly
      />
      {character.access === "OWNER" && restore.target && (
        <RestoreConfirmModal
          key={restore.target.session}
          open={restore.open}
          version={restore.target.version}
          versions={restore.target.versions}
          onCancel={restore.cancel}
          onConfirm={restore.confirm}
          onRefresh={query.retry}
        />
      )}
    </div>
  );
}
