import { apiRequest } from "./client";
import type {
  CharacterVersion,
  CharacterVersionSummary,
  RestoreResult,
} from "../history/historyTypes";

// Читает серверную историю от новых версий к старым, без полных снимков данных.
export function getCharacterVersions(id: string, signal?: AbortSignal) {
  return apiRequest<CharacterVersionSummary[]>(
    `/characters/${encodeURIComponent(id)}/versions`,
    { signal },
  );
}

// Восстанавливает сохранённый снимок; backend сам удаляет поздние версии в одной транзакции.
export function restoreCharacterVersion(
  id: string,
  version: number,
  signal?: AbortSignal,
) {
  return apiRequest<RestoreResult>(
    `/characters/${encodeURIComponent(id)}/versions/${version}/restore`,
    { method: "POST", signal },
  );
}

// Получает сохранённый снимок вместе с calculated; пересчёт на клиенте не нужен.
export function getCharacterVersion(
  id: string,
  version: number,
  signal?: AbortSignal,
) {
  return apiRequest<CharacterVersion>(
    `/characters/${encodeURIComponent(id)}/versions/${version}`,
    { signal },
  );
}
