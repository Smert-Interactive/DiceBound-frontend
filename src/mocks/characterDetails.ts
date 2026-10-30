import { evaluateFormulaNode } from "../sheet/formula/evaluate";
import { parseFormula } from "../sheet/formula/parse";
import type {
  CharacterData,
  CharacterDetails,
  SheetSchema,
} from "../sheet/sheetTypes";
import {
  getMockVersionCount,
  setMockVersionCount,
  findMockCharacterSummary,
  getMockCharacterList,
  addMockCharacterSummary,
} from "./characters";
import { COC_SCHEMA_ID, DND_SCHEMA_ID, CUSTOM_SCHEMA_ID } from "./sheetSchemas";

import { getStoredShares, getMockRecipientId } from "./characterSharesStore";
import { createMockId } from "./mockId";

interface MockSheet {
  schemaId: string;
  data: CharacterData;
  createdAt?: string;
}

// Значения с досок SheetDnD и SheetCoC. Calculated лежат в data, как отдаёт backend.
// Merlin использует D&D-схему, Viktor — импортированную; режим задают права, а не система.
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
  "c1a00000-0000-4000-8000-000000000003": {
    schemaId: CUSTOM_SCHEMA_ID,
    createdAt: "2026-09-20T16:30:00Z",
    data: {
      callsign: "Viktor",
      role: "pilot",
      rank: 4,
      implant: true,
      reflex: 12,
      defense: 10,
      energy: { current: 6, max: 10 },
    },
  },
  "c1a00000-0000-4000-8000-000000000004": {
    schemaId: DND_SCHEMA_ID,
    data: {
      name: "Merlin",
      level: 5,
      class: "wizard",
      str: 8,
      str_modifier: -1,
      dex: 14,
      dex_modifier: 2,
      con: 12,
      con_modifier: 1,
      int: 18,
      int_modifier: 4,
      wis: 15,
      wis_modifier: 2,
      cha: 11,
      cha_modifier: 0,
      hp: { current: 22, max: 27 },
      ac: 12,
    },
  },
};

// Копия из исходной EDIT-выдачи хранит собственное состояние, а не ссылку на оригинал.
MOCK_SHEETS["c1a00000-0000-4000-8000-000000000005"] = {
  schemaId: DND_SCHEMA_ID,
  createdAt: "2026-09-24T12:00:00Z",
  data: structuredClone(
    MOCK_SHEETS["c1a00000-0000-4000-8000-000000000001"].data,
  ),
};

// Повторяет GET /characters/{id}: undefined — когда персонажа нет или лист ещё не описан.
export function getMockCharacterDetails(
  characterId: string,
  viewerEmail?: string,
): CharacterDetails | undefined {
  const summary = findMockCharacterSummary(characterId);
  const sheet = MOCK_SHEETS[characterId];
  if (!summary || !sheet) return undefined;

  // Без viewerEmail сервисы получают исходные данные, страницы всегда передают текущий аккаунт.
  const list = viewerEmail ? getMockCharacterList(viewerEmail) : undefined;
  const access = list
    ? [...list.owned, ...list.shared_view].find(
        (item) => item.id === characterId,
      )?.access
    : summary.access;
  if (!access) return undefined;
  const viewShare = getStoredShares().find(
    (share) =>
      share.character_id === characterId &&
      share.permission === "VIEW" &&
      share.recipient_email ===
        (viewerEmail ?? "alex@example.com").trim().toLowerCase(),
  );
  return {
    id: summary.id,
    owner_id: getMockRecipientId(summary.owner_username),
    game_system_id: summary.game_system_id,
    sheet_schema_id: sheet.schemaId,
    name: summary.name,
    data: structuredClone(sheet.data),
    created_at: sheet.createdAt ?? "2026-09-01T10:00:00Z",
    updated_at: summary.updated_at,
    current_version_number: getMockVersionCount(summary.id),
    access,
    can_edit: access === "OWNER",
    can_view_history: access === "OWNER" || Boolean(viewShare?.history_visible),
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
  const summary = findMockCharacterSummary(characterId);
  const sheet = MOCK_SHEETS[characterId];
  if (!summary || !sheet) throw new Error("NOT_FOUND_OR_FORBIDDEN");

  sheet.data = structuredClone(data);
  summary.updated_at = updatedAt;
  setMockVersionCount(characterId, versionNumber);
  return getMockCharacterDetails(characterId, summary.owner_username)!;
}

// EDIT фиксирует сохранённое состояние оригинала. Вложенные ресурсы не разделяются с копией.
export function createMockCharacterCopy(
  source: CharacterDetails,
  recipientEmail: string,
) {
  const id = createMockId();
  const createdAt = new Date().toISOString();
  addMockCharacterSummary({
    id,
    name: `${source.name} (копия)`,
    game_system_id: source.game_system_id,
    game_system_name: getMockCharacterList(source.owner_username).owned.find(
      (item) => item.id === source.id,
    )!.game_system_name,
    updated_at: createdAt,
    access: "OWNER",
    owner_username: recipientEmail,
    copy_source_owner_name: source.owner_username,
  });
  MOCK_SHEETS[id] = {
    schemaId: source.sheet_schema_id,
    data: structuredClone(source.data),
    createdAt,
  };
  setMockVersionCount(id, 1);
  return id;
}

// Новый персонаж получает собственный лист; значения строятся по типам полей любой схемы.
export function initializeMockCharacterSheet(
  id: string,
  schema: SheetSchema,
  createdAt: string,
) {
  const data: CharacterData = {};
  for (const field of schema.schema.sections.flatMap(
    (section) => section.fields,
  )) {
    switch (field.type) {
      case "text":
        data[field.id] = "";
        break;
      case "checkbox":
        data[field.id] = false;
        break;
      case "calculated":
        break;
    }
  }
  const formulas = new Map(
    schema.schema.sections
      .flatMap((section) => section.fields)
      .filter((field) => field.type === "calculated")
      .map((field) => [field.id, field]),
  );
  const visited = new Set<string>();
  // При создании считаются только доступные зависимости; отсутствующее число не заменяется нулём.
  function resolve(fieldId: string): number | undefined {
    if (typeof data[fieldId] === "number") return data[fieldId];
    const field = formulas.get(fieldId);
    if (!field || visited.has(fieldId)) return undefined;
    visited.add(fieldId);
    const value = evaluateFormulaNode(parseFormula(field.formula), resolve);
    if (value !== undefined) data[fieldId] = value;
    return value;
  }
  for (const fieldId of formulas.keys()) resolve(fieldId);
  MOCK_SHEETS[id] = { schemaId: schema.id, data, createdAt };
}
