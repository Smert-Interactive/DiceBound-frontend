import { useCallback } from "react";
import type { RefObject } from "react";
import type { RestoreResult } from "./historyTypes";
import { useCharacterRestore } from "./useCharacterRestore";
import RestoreConfirmModal from "../components/RestoreConfirmModal";
import { getCharacterVersions } from "../api/characterHistory";
import { ApiError } from "../api/client";
import { useApiQuery } from "../api/useApiQuery";
import CharacterHistory from "../components/CharacterHistory";
import {
  LoadingSkeleton,
  LoadErrorState,
  NotFoundOrForbidden,
} from "../shared/states";
import { Banner, Button } from "../shared/ui";

interface Props {
  characterId: string;
  revision: string;
  ownerName: string;
  isOwner: boolean;
  onRestored: (result: RestoreResult) => void;
  onRefresh: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
}

// Загружает историю только при открытии вкладки; ошибки истории не удаляют черновик листа.
export default function CharacterHistoryPanel({
  characterId,
  revision,
  ownerName,
  isOwner,
  onRestored,
  onRefresh,
  fallbackFocusRef,
}: Props) {
  const restore = useCharacterRestore(characterId, onRestored);
  const request = useCallback(
    (signal: AbortSignal) => getCharacterVersions(characterId, signal),
    [characterId],
  );
  const query = useApiQuery(request, `${characterId}:${revision}`);
  if (query.loading)
    return (
      <LoadingSkeleton variant="list" label="История версий загружается" />
    );
  if (query.error) {
    if (
      query.error instanceof ApiError &&
      [403, 404].includes(query.error.status)
    )
      return <NotFoundOrForbidden />;
    return <LoadErrorState onRetry={query.retry} />;
  }
  if (!query.data?.length) return <Banner title="Версий пока нет" />;
  return (
    <>
      {restore.preparationError && (
        <Banner variant="error" title={restore.preparationError}>
          <Button onClick={onRefresh}>Обновить данные</Button>
        </Banner>
      )}
      <CharacterHistory
        characterId={characterId}
        versions={query.data}
        ownerName={ownerName}
        canRestore={isOwner}
        restoreDisabled={restore.preparing}
        onRestore={(version) => {
          if (isOwner) void restore.begin(version.version_number);
        }}
      />
      {isOwner && restore.target && (
        <RestoreConfirmModal
          key={restore.target.session}
          open={restore.open}
          version={restore.target.version}
          versions={restore.target.versions}
          onCancel={restore.cancel}
          onConfirm={restore.confirm}
          onRefresh={onRefresh}
          fallbackFocusRef={fallbackFocusRef}
        />
      )}
    </>
  );
}
