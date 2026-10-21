import { MOCK_USER } from "../auth/authContext";
import {
  COC_SYSTEM_ID as COC_ID,
  CUSTOM_SYSTEM_ID as CUSTOM_ID,
  DND_SYSTEM_ID as DND_ID,
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

// Числа версий для окна удаления. В CharacterSummary поля нет (см. открытые вопросы в плане),
// поэтому пока это демонстрационные значения; у Aldric 7, как на холсте.
const MOCK_VERSION_COUNTS: Record<string, number> = {
  "c1a00000-0000-4000-8000-000000000001": 7,
  "c1a00000-0000-4000-8000-000000000002": 4,
  "c1a00000-0000-4000-8000-000000000003": 2,
};

// У любого персонажа есть минимум версия 1, она создаётся вместе с ним.
export function getMockVersionCount(characterId: string): number {
  return MOCK_VERSION_COUNTS[characterId] ?? 1;
}

// Данные принадлежат только демонстрационному пользователю. Свежий аккаунт получает
// пустой список (так он совпадает со счётчиками профиля), как отдаст настоящий backend.
export function getMockCharacterList(email: string): CharacterList {
  if (email === MOCK_USER.email) return MOCK_CHARACTERS;

  return { owned: [], shared_view: [] };
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
