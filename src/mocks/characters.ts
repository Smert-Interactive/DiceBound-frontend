import { getStoredShares } from "./characterSharesStore";
import {
  COC_SYSTEM_ID as COC_ID,
  CUSTOM_SYSTEM_ID as CUSTOM_ID,
  DND_SYSTEM_ID as DND_ID,
  getMockSystems,
} from "./systems";

// Типы повторяют CharacterSummary и CharacterList из контракта GET /characters.
// Версии в CharacterSummary нет: количество версий понадобится только в модалке удаления.
export interface CharacterSummary {
  id: string;
  name: string;
  game_system_id: string;
  game_system_name: string;
  updated_at: string;
  access: "OWNER" | "VIEW";
  // В контракте это owner_username, а в ui-ux показывается почта; в моках лежит почта.
  owner_username: string;
  // Не null только у копий, полученных через EDIT.
  copy_source_owner_name: string | null;
}

export interface CharacterList {
  owned: CharacterSummary[];
  shared_view: CharacterSummary[];
}

// Поля повторяют CreateCharacterRequest из контракта POST /characters.
export interface CreateCharacterRequest {
  name: string;
  game_system_id: string;
  sheet_schema_id: string;
}

const MOCK_REQUEST_DELAY = 500;

// Имитирует создание: ответ приходит с задержкой, чтобы была видна загрузка кнопки.
// Персонаж нигде не сохраняется (как и удаление, пока нет API).
export async function createMockCharacter(
  request: CreateCharacterRequest,
  ownerEmail: string,
): Promise<CharacterSummary> {
  await new Promise<void>((resolve) =>
    window.setTimeout(resolve, MOCK_REQUEST_DELAY),
  );
  const system = getMockSystems(ownerEmail).find(
    (item) => item.id === request.game_system_id,
  );
  if (!system) throw new Error("UNKNOWN_SYSTEM");

  return {
    id: crypto.randomUUID(),
    name: request.name.trim(),
    game_system_id: system.id,
    game_system_name: system.name,
    updated_at: new Date().toISOString(),
    access: "OWNER",
    owner_username: ownerEmail,
    copy_source_owner_name: null,
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
