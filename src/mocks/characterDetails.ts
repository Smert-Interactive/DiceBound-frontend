import type { CharacterData, CharacterDetails } from "../sheet/sheetTypes";
import {
  getMockVersionCount,
  setMockVersionCount,
  MOCK_CHARACTERS,
  type CharacterSummary,
} from "./characters";
import { COC_SCHEMA_ID, DND_SCHEMA_ID } from "./sheetSchemas";

// Тот же owner_id, что у Custom System в systems.ts; во frontend у User поля id нет.
const MOCK_OWNER_ID = "a1e0c000-0000-4000-8000-000000000001";

interface MockSheet {
  schemaId: string;
  data: CharacterData;
}

// Значения с досок SheetDnD и SheetCoC. Calculated лежат в data, как отдаёт backend.
// Остальные персонажи списка пока без листа: Merlin (VIEW) — ветка 9, Viktor — ветка 10.
const MOCK_SHEETS: Record<string, MockSheet> = {
  "c1a00000-0000-4000-8000-000000000001": {
    schemaId: DND_SCHEMA_ID,
    data: {
      name: "Aldric",
      level: 3,
      class: "fighter",
      str: 10,
      str_modifier: 0,
      dex: 12,
      dex_modifier: 1,
      con: 14,
      con_modifier: 2,
      int: 10,
      int_modifier: 0,
      wis: 13,
      wis_modifier: 1,
      cha: 8,
      cha_modifier: -1,
      hp: { current: 21, max: 28 },
      ac: 17,
    },
  },
  "c1a00000-0000-4000-8000-000000000002": {
    schemaId: COC_SCHEMA_ID,
    data: {
      name: "Sarah Connor",
      profession: "Журналист",
      age: 34,
      str: 50,
      con: 60,
      dex: 65,
      int: 75,
      pow: 55,
      app: 60,
      edu: 80,
      siz: 50,
      hp: { current: 9, max: 11 },
      sanity: { current: 48, max: 55 },
      luck: { current: 45, max: 99 },
      spot_hidden: 55,
      library_use: 40,
      listen: 60,
      psychology: 35,
      stealth: 25,
      persuade: 30,
    },
  },
};

function findSummary(characterId: string): CharacterSummary | undefined {
  return [...MOCK_CHARACTERS.owned, ...MOCK_CHARACTERS.shared_view].find(
    (character) => character.id === characterId,
  );
}

// Повторяет GET /characters/{id}: undefined — когда персонажа нет или лист ещё не описан.
export function getMockCharacterDetails(
  characterId: string,
): CharacterDetails | undefined {
  const summary = findSummary(characterId);
  const sheet = MOCK_SHEETS[characterId];
  if (!summary || !sheet) return undefined;

  return {
    id: summary.id,
    owner_id: MOCK_OWNER_ID,
    game_system_id: summary.game_system_id,
    sheet_schema_id: sheet.schemaId,
    name: summary.name,
    data: structuredClone(sheet.data),
    created_at: "2026-09-01T10:00:00Z",
    updated_at: summary.updated_at,
    current_version_number: getMockVersionCount(summary.id),
    access: summary.access,
    can_edit: summary.access === "OWNER",
    can_view_history: summary.access === "OWNER",
    owner_username: summary.owner_username,
  };
}

// Вызывается mock-сервисом после проверки доступа и наличия выбранной версии.
// Меняем и лист, и метаданные списка: переход на другую страницу не отменит восстановление.
export function applyMockCharacterVersion(
  characterId: string,
  data: CharacterData,
  versionNumber: number,
  updatedAt: string,
): CharacterDetails {
  const summary = findSummary(characterId);
  const sheet = MOCK_SHEETS[characterId];
  if (!summary || !sheet) throw new Error("NOT_FOUND_OR_FORBIDDEN");

  sheet.data = structuredClone(data);
  summary.updated_at = updatedAt;
  setMockVersionCount(characterId, versionNumber);
  return getMockCharacterDetails(characterId)!;
}
