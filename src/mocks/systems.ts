import { getMockRecipientId } from "./characterSharesStore";
import type { GameSystemSummary } from "../systems/systemTypes";

// Сохраняем прежний импорт типов для существующих компонентов.
export type { GameSystemSummary } from "../systems/systemTypes";

// sections в контракте нет: там названия секций лежат только в полной схеме (GET /schemas/{id}).
// Пока берём их из моков; у встроенных систем строка постоянная, у импортированных зависит от схемы.
export interface SheetSchemaOption {
  id: string;
  game_system_id: string;
  name: string;
  created_at: string;
  sections: string[];
}

export const DND_SYSTEM_ID = "5e0a7c1e-2d4b-4f6a-9c3e-0d5e5f000001";
export const COC_SYSTEM_ID = "5e0a7c1e-2d4b-4f6a-9c3e-0d5e5f000002";
export const SPACE_FRONTIER_SYSTEM_ID = "5e0a7c1e-2d4b-4f6a-9c3e-0d5e5f000004";
export const CUSTOM_SYSTEM_ID = "5e0a7c1e-2d4b-4f6a-9c3e-0d5e5f000003";

// Данные доски Create холста.
export const MOCK_SYSTEMS: GameSystemSummary[] = [
  {
    id: DND_SYSTEM_ID,
    owner_id: null,
    name: "D&D 5e",
    description: null,
    source: "BUILT_IN",
    character_count: 2,
    created_at: "2026-01-01T12:00:00Z",
  },
  {
    id: COC_SYSTEM_ID,
    owner_id: null,
    name: "Call of Cthulhu",
    description: null,
    source: "BUILT_IN",
    character_count: 1,
    created_at: "2026-01-01T12:00:00Z",
  },
  {
    id: CUSTOM_SYSTEM_ID,
    owner_id: "a1e0c000-0000-4000-8000-000000000001",
    name: "Custom System",
    description: null,
    source: "IMPORTED",
    character_count: 1,
    created_at: "2026-09-10T09:00:00Z",
  },
  {
    id: SPACE_FRONTIER_SYSTEM_ID,
    owner_id: "a1e0c000-0000-4000-8000-000000000001",
    name: "Space Frontier",
    description: null,
    source: "IMPORTED",
    character_count: 0,
    created_at: "2026-09-25T11:05:00Z",
  },
];

// Полные метаданные остаются в памяти даже после удаления из доступного списка.
const deletedSystemIds = new Set<string>();

// Повторяет GET /systems: встроенные и свои импортированные, кроме удалённых.
export function getMockSystems(email: string): GameSystemSummary[] {
  const ownerId = getMockRecipientId(email.trim().toLowerCase());
  return MOCK_SYSTEMS.filter(
    (system) =>
      !deletedSystemIds.has(system.id) &&
      (system.source === "BUILT_IN" || system.owner_id === ownerId),
  ).map((system) => ({ ...system }));
}

// DELETE скрывает только свою импортированную систему, сохраняя схемы и персонажей.
export async function deleteMockSystem(
  systemId: string,
  email: string,
): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  const system = MOCK_SYSTEMS.find((item) => item.id === systemId);
  if (
    !system ||
    deletedSystemIds.has(systemId) ||
    (system.source === "IMPORTED" &&
      system.owner_id !== getMockRecipientId(email.trim().toLowerCase()))
  ) {
    throw Object.assign(new Error("NOT_FOUND_OR_FORBIDDEN"), {
      status: 404,
      code: "NOT_FOUND_OR_FORBIDDEN",
    });
  }
  if (system.source === "BUILT_IN") {
    throw Object.assign(new Error("FORBIDDEN"), {
      status: 403,
      code: "FORBIDDEN",
    });
  }
  deletedSystemIds.add(systemId);
}

export const MOCK_SCHEMAS: SheetSchemaOption[] = [
  {
    id: "5c0a7c1e-0000-4000-8000-000000000001",
    game_system_id: DND_SYSTEM_ID,
    name: "Базовый лист",
    created_at: "2026-01-01T12:00:00Z",
    sections: ["Основное", "Характеристики", "Ресурсы"],
  },
  {
    id: "5c0a7c1e-0000-4000-8000-000000000002",
    game_system_id: COC_SYSTEM_ID,
    name: "Сыщик",
    created_at: "2026-01-01T12:00:00Z",
    sections: ["Основное", "Характеристики", "Ресурсы", "Навыки"],
  },
  {
    id: "5c0a7c1e-0000-4000-8000-000000000003",
    game_system_id: CUSTOM_SYSTEM_ID,
    name: "Базовый лист",
    created_at: "2026-09-10T09:00:00Z",
    sections: ["Досье", "Параметры", "Ресурсы"],
  },
  {
    id: "5c0a7c1e-0000-4000-8000-000000000004",
    game_system_id: SPACE_FRONTIER_SYSTEM_ID,
    name: "Экипаж",
    created_at: "2026-09-25T11:05:00Z",
    sections: ["Экипаж"],
  },
];

// Листы выбранной системы; у каждой системы в моках пока по одному.
export function getMockSchemas(systemId: string): SheetSchemaOption[] {
  return MOCK_SCHEMAS.filter((schema) => schema.game_system_id === systemId);
}
