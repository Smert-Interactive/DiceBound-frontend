import { apiRequest } from "./client";
import type {
  GameSystemSummary,
  SheetSchemaSummary,
} from "../systems/systemTypes";
import type { SheetSchema } from "../sheet/sheetTypes";

// Выбор новых персонажей включает только доступные активные системы.
export function getSystems(signal?: AbortSignal) {
  return apiRequest<GameSystemSummary[]>("/systems", { signal });
}

// Краткие схемы нужны для выбора листа и количества листов в карточке системы.
export function getSystemSchemas(id: string, signal?: AbortSignal) {
  return apiRequest<SheetSchemaSummary[]>(
    `/systems/${encodeURIComponent(id)}/schemas`,
    { signal },
  );
}

// Полная схема содержит подписи секций, которых нет в кратком DTO.
export function getSheetSchema(id: string, signal?: AbortSignal) {
  return apiRequest<SheetSchema>(`/schemas/${encodeURIComponent(id)}`, {
    signal,
  });
}

// Собирает каталог из контрактных DTO: сервер не включает число листов в GameSystemSummary.
export async function getCreationCatalog(signal: AbortSignal) {
  const systems = await getSystems(signal);
  const entries = await Promise.all(
    systems.map(
      async (system) =>
        [system.id, await getSystemSchemas(system.id, signal)] as const,
    ),
  );
  return {
    systems,
    schemasBySystem: Object.fromEntries(entries) as Record<
      string,
      SheetSchemaSummary[]
    >,
  };
}
