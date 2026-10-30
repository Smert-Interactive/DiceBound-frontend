import { initializeMockCharacterSheet } from "./characterDetails";
import { createMockId } from "./mockId";
import { getMockSheetSchema } from "./sheetSchemas";
import { getStoredShares } from "./characterSharesStore";
import {
  COC_SYSTEM_ID as COC_ID,
  CUSTOM_SYSTEM_ID as CUSTOM_ID,
  DND_SYSTEM_ID as DND_ID,
  getMockSystems,
  MOCK_SYSTEMS,
} from "./systems";

import type { Character } from "../sheet/sheetTypes";
import type {
  CharacterSummary,
  CharacterList,
  CreateCharacterRequest,
} from "../api/characterTypes";
import { getMockCharacterDetails } from "./characterDetails";
import { CONTRACT_LIMITS } from "../api/contractLimits";
export type {
  CharacterSummary,
  CharacterList,
  CreateCharacterRequest,
} from "../api/characterTypes";

const MOCK_REQUEST_DELAY = 500;

// Имитирует создание: ответ приходит с задержкой, чтобы была видна загрузка кнопки.
// Метаданные и лист остаются в памяти до перезагрузки приложения.
export async function createMockCharacter(
  request: CreateCharacterRequest,
  ownerEmail: string,
): Promise<Character> {
  await new Promise<void>((resolve) =>
    window.setTimeout(resolve, MOCK_REQUEST_DELAY),
  );
  if (!request.name.trim() || request.name.trim().length > CONTRACT_LIMITS.name)
    throw new Error("BAD_REQUEST");
  const system = getMockSystems(ownerEmail).find(
    (item) => item.id === request.game_system_id,
  );
  if (!system) throw new Error("UNKNOWN_SYSTEM");

  const schema = getMockSheetSchema(request.sheet_schema_id);
  if (!schema || schema.game_system_id !== system.id)
    throw new Error("UNKNOWN_SCHEMA");
  const character: CharacterSummary = {
    id: createMockId(),
    name: request.name.trim(),
    game_system_id: system.id,
    game_system_name: system.name,
    updated_at: new Date().toISOString(),
    access: "OWNER",
    owner_username: ownerEmail.trim().toLowerCase(),
    copy_source_owner_name: null,
  };
  initializeMockCharacterSheet(character.id, schema, character.updated_at);
  addMockCharacterSummary(character);
  const storedSystem = MOCK_SYSTEMS.find((item) => item.id === system.id)!;
  storedSystem.character_count += 1;
  const details = getMockCharacterDetails(character.id, ownerEmail)!;
  return {
    id: details.id,
    owner_id: details.owner_id,
    game_system_id: details.game_system_id,
    sheet_schema_id: details.sheet_schema_id,
    name: details.name,
    data: details.data,
    created_at: details.created_at,
    updated_at: details.updated_at,
    current_version_number: details.current_version_number,
  };
}

// Числа версий для окна удаления. В CharacterSummary поля нет (см. открытые вопросы в плане),
// поэтому пока это демонстрационные значения; у Aldric 7, как на холсте.
const MOCK_VERSION_COUNTS: Record<string, number> = {
  "c1a00000-0000-4000-8000-000000000001": 7,
  "c1a00000-0000-4000-8000-000000000002": 4,
  "c1a00000-0000-4000-8000-000000000003": 3,
};

// У любого персонажа есть минимум версия 1, она создаётся вместе с ним.
export function getMockVersionCount(characterId: string): number {
  return MOCK_VERSION_COUNTS[characterId] ?? 1;
}

// Обновляет число после восстановления, чтобы шапка и окно удаления не расходились с историей.
export function setMockVersionCount(characterId: string, count: number) {
  MOCK_VERSION_COUNTS[characterId] = count;
}

const copies: CharacterSummary[] = [
  {
    id: "c1a00000-0000-4000-8000-000000000005",
    name: "Aldric (копия)",
    game_system_id: DND_ID,
    game_system_name: "D&D 5e",
    updated_at: "2026-09-24T12:00:00Z",
    access: "OWNER",
    owner_username: "editor@example.com",
    copy_source_owner_name: "alex@example.com",
  },
];

// Исходные метаданные общие для владельца и VIEW: сохранение оригинала видно получателю.
export function findMockCharacterSummary(id: string) {
  return [
    ...MOCK_CHARACTERS.owned,
    ...MOCK_CHARACTERS.shared_view,
    ...copies,
  ].find((character) => character.id === id);
}

// EDIT-копия становится обычным своим персонажем другого аккаунта.
export function addMockCharacterSummary(summary: CharacterSummary) {
  copies.push({ ...summary });
}

// Список зависит от владельца и активных VIEW-выдач; EDIT в «Доступные мне» не попадает.
export function getMockCharacterList(email: string): CharacterList {
  const normalizedEmail = email.trim().toLowerCase();
  const all = [
    ...MOCK_CHARACTERS.owned,
    ...MOCK_CHARACTERS.shared_view,
    ...copies,
  ];
  const viewIds = new Set(
    getStoredShares()
      .filter(
        (share) =>
          share.permission === "VIEW" &&
          share.recipient_email === normalizedEmail,
      )
      .map((share) => share.character_id),
  );
  return {
    owned: all
      .filter((item) => item.owner_username === normalizedEmail)
      .map((item) => ({ ...item, access: "OWNER" })),
    shared_view: all
      .filter((item) => viewIds.has(item.id))
      .map((item) => ({ ...item, access: "VIEW" })),
  };
}

// Данные доски Characters холста. Владелец списка — alex@example.com (MOCK_USER).
export const MOCK_CHARACTERS: CharacterList = {
  owned: [
    {
      id: "c1a00000-0000-4000-8000-000000000001",
      name: "Aldric",
      game_system_id: DND_ID,
      game_system_name: "D&D 5e",
      updated_at: "2026-09-24T18:42:00Z",
      access: "OWNER",
      owner_username: "alex@example.com",
      copy_source_owner_name: null,
    },
    {
      id: "c1a00000-0000-4000-8000-000000000002",
      name: "Sarah Connor",
      game_system_id: COC_ID,
      game_system_name: "Call of Cthulhu",
      updated_at: "2026-09-22T21:07:00Z",
      access: "OWNER",
      owner_username: "alex@example.com",
      copy_source_owner_name: null,
    },
    {
      id: "c1a00000-0000-4000-8000-000000000003",
      name: "Viktor (копия)",
      game_system_id: CUSTOM_ID,
      game_system_name: "Custom System",
      updated_at: "2026-09-20T16:30:00Z",
      access: "OWNER",
      owner_username: "alex@example.com",
      copy_source_owner_name: "mira@example.com",
    },
  ],
  shared_view: [
    {
      id: "c1a00000-0000-4000-8000-000000000004",
      name: "Merlin",
      game_system_id: DND_ID,
      game_system_name: "D&D 5e",
      updated_at: "2026-09-23T12:15:00Z",
      access: "VIEW",
      owner_username: "gm@example.com",
      copy_source_owner_name: null,
    },
  ],
};
