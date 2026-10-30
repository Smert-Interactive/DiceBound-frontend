import { ApiError } from "../api/client";
import { validateField } from "../sheet/validateField";
import { recalculateSheet } from "../sheet/recalculate";
import { toDraft } from "../sheet/sheetDraft";
import type { CharacterDetails, CharacterData } from "../sheet/sheetTypes";
import type {
  CharacterVersion,
  CharacterVersionSummary,
  RestoreResult,
} from "../history/historyTypes";
import {
  applyMockCharacterVersion,
  getMockCharacterDetails,
} from "./characterDetails";
import { getMockCharacterList, MOCK_CHARACTERS } from "./characters";
import { getMockSheetSchema } from "./sheetSchemas";

// Демонстрационные правки ранних версий. Ни одна формула при чтении истории не исполняется:
// str_modifier уже записан в снимок, как в ответе backend. Текущая версия берётся без правок.
const VERSION_CHANGES: Record<string, Record<number, CharacterData>> = {
  [MOCK_CHARACTERS.owned[0].id]: {
    1: {
      level: 1,
      str: 12,
      str_modifier: 1,
      hp: { current: 12, max: 12 },
      ac: 14,
    },
    2: {
      level: 1,
      str: 13,
      str_modifier: 1,
      hp: { current: 9, max: 12 },
      ac: 14,
    },
    3: {
      level: 2,
      str: 14,
      str_modifier: 2,
      hp: { current: 15, max: 20 },
      ac: 15,
    },
    // Значения v4 соответствуют примеру страницы версии в макете.
    4: {
      level: 2,
      str: 15,
      str_modifier: 2,
      hp: { current: 20, max: 20 },
      ac: 16,
    },
    5: {
      level: 3,
      str: 16,
      str_modifier: 3,
      hp: { current: 21, max: 28 },
      ac: 17,
    },
    6: {
      level: 3,
      str: 16,
      str_modifier: 3,
      hp: { current: 16, max: 28 },
      ac: 17,
    },
  },
  [MOCK_CHARACTERS.owned[1].id]: {
    1: {
      age: 33,
      hp: { current: 11, max: 11 },
      sanity: { current: 55, max: 55 },
    },
    2: { hp: { current: 10, max: 11 }, sanity: { current: 53, max: 55 } },
    3: { hp: { current: 8, max: 11 }, sanity: { current: 50, max: 55 } },
  },
};

// Списки и снимки создаются один раз, чтобы переходы между страницами не меняли историю.
const snapshotsByCharacter = new Map<string, CharacterVersion[]>();
// Используем число версий и даты самого персонажа, чтобы список не расходился с его шапкой.
const versionsByCharacter = new Map<string, CharacterVersionSummary[]>();
// История создаётся один раз, в том числе для копий, появившихся после запуска приложения.
function ensureMockCharacterVersions(characterId: string) {
  if (versionsByCharacter.has(characterId)) return;
  const character = getMockCharacterDetails(characterId);
  if (!character) return;

  const count = character.current_version_number;
  const createdAt = Date.parse(character.created_at);
  const updatedAt = Date.parse(character.updated_at);
  const versions = Array.from({ length: count }, (_, index) => {
    const version = index + 1;
    // Промежуточные даты демонстрационные; v1 совпадает с созданием, текущая — с изменением.
    const timestamp =
      count === 1
        ? updatedAt
        : createdAt + ((updatedAt - createdAt) * index) / (count - 1);
    return {
      // UUID mock-версии: номер в первой группе, остальные группы — из ID персонажа.
      // Не требует HTTPS, в отличие от crypto.randomUUID(), и не меняется при перезагрузке.
      id: `${version.toString(16).padStart(8, "0")}${characterId.slice(8)}`,
      version_number: version,
      created_at: new Date(timestamp).toISOString(),
      is_current: version === count,
    };
  });
  versionsByCharacter.set(characterId, versions.reverse());
  snapshotsByCharacter.set(
    characterId,
    versions.map(({ id, version_number, created_at }) => ({
      id,
      character_id: characterId,
      version_number,
      created_at,
      // Разворачиваем полный снимок и копируем вложенные ресурсы, отделяя его от текущего листа.
      data: structuredClone({
        ...character.data,
        ...VERSION_CHANGES[characterId]?.[version_number],
      }),
    })),
  );
}

for (const summary of MOCK_CHARACTERS.owned)
  ensureMockCharacterVersions(summary.id);

// Повторяет доступ к GET /characters/{id}/versions: нет доступа — тот же результат, что и у 404.
// Пользователь с пустым списком не должен получить чужую историю, зная id персонажа.
export function getMockCharacterVersions(
  characterId: string,
  email: string,
): CharacterVersionSummary[] | undefined {
  const list = getMockCharacterList(email);
  const summary = [...list.owned, ...list.shared_view].find(
    (character) => character.id === characterId,
  );
  const character = summary && getMockCharacterDetails(characterId, email);
  if (!character?.can_view_history) return undefined;

  ensureMockCharacterVersions(characterId);
  return versionsByCharacter
    .get(characterId)
    ?.map((version) => ({ ...version }));
}

export function getMockCharacterVersion(
  characterId: string,
  versionNumber: number,
  email: string,
): CharacterVersion | undefined {
  if (!Number.isSafeInteger(versionNumber) || versionNumber < 1)
    return undefined;
  // Та же проверка доступа, что у списка: чужой и отсутствующий снимки не различаются.
  const versions = getMockCharacterVersions(characterId, email);
  if (!versions?.some((version) => version.version_number === versionNumber))
    return undefined;

  const snapshot = snapshotsByCharacter
    .get(characterId)
    ?.find((version) => version.version_number === versionNumber);
  // Копия не даёт будущему renderer или восстановлению изменить сохранённый снимок.
  return snapshot && structuredClone(snapshot);
}

// Повторяет проверку и расчёт backend при PUT /characters/{id}: в запросе только
// пользовательские значения, calculated присылать нельзя, а формулы считает сервер и кладёт
// результат в снимок. Ошибка формулы (деление на ноль, цикл) — как 422 VALIDATION_ERROR.
function withCalculatedValues(
  characterId: string,
  data: CharacterData,
): CharacterData {
  const details = getMockCharacterDetails(characterId);
  const schema = details && getMockSheetSchema(details.sheet_schema_id);
  if (!schema) throw new Error("NOT_FOUND_OR_FORBIDDEN");

  const fields = schema.schema.sections.flatMap((section) => section.fields);
  const known = new Set(fields.map((field) => field.id));
  const issues: { field: string; message: string }[] = [];
  // Mock принимает те же JSON-типы, что PUT, без приведения строк и лишних ключей.
  for (const id of Object.keys(data))
    if (!known.has(id))
      issues.push({ field: `data.${id}`, message: "Неизвестное поле" });
  for (const field of fields) {
    if (field.type === "calculated") continue;
    const value = data[field.id];
    const present = Object.hasOwn(data, field.id);
    if (!present) {
      if (field.required)
        issues.push({
          field: `data.${field.id}`,
          message: "Обязательное поле",
        });
      continue;
    }
    const type =
      field.type === "text" || field.type === "select"
        ? "string"
        : field.type === "number"
          ? "number"
          : field.type === "checkbox"
            ? "boolean"
            : "object";
    const badResource =
      field.type === "resource" &&
      (value === null ||
        typeof value !== "object" ||
        Object.keys(value).length !== 2 ||
        !Object.hasOwn(value, "current") ||
        !Object.hasOwn(value, "max") ||
        typeof value.current !== "number" ||
        typeof value.max !== "number");
    const message =
      typeof value !== type ||
      badResource ||
      (field.type === "select" && value === "")
        ? "Неверный тип значения"
        : validateField(field, value);
    if (message) issues.push({ field: `data.${field.id}`, message });
  }
  if (issues.length)
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "VALIDATION_ERROR",
      issues.slice(0, 50),
    );

  const calculatedIds = schema.schema.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "calculated")
    .map((field) => field.id);
  if (calculatedIds.some((id) => id in data)) {
    throw new ApiError(422, "VALIDATION_ERROR", "VALIDATION_ERROR");
  }

  const result = recalculateSheet(schema.schema, toDraft(schema.schema, data));
  if (Object.keys(result.errors).length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "VALIDATION_ERROR");
  }

  const saved = { ...data };
  for (const id of calculatedIds) {
    const value = result.values[id];
    if (value !== undefined) saved[id] = value;
  }
  return saved;
}

// Повторяет сохранение листа: создаёт версию N+1 и делает её текущей. Версия появляется только
// по кнопке «Сохранить» (mvp-scope), поэтому других способов её создать нет.
export async function saveMockCharacterVersion(
  characterId: string,
  data: CharacterData,
  email: string,
): Promise<CharacterDetails> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));

  // Сохранять может только владелец; проверяем в сервисе, а не видимостью кнопки.
  const owned = getMockCharacterList(email).owned.some(
    (item) => item.id === characterId,
  );
  if (owned) ensureMockCharacterVersions(characterId);
  const versions = owned ? versionsByCharacter.get(characterId) : undefined;
  if (!versions) throw new Error("NOT_FOUND_OR_FORBIDDEN");
  const saved = withCalculatedValues(characterId, data);

  const versionNumber = versions[0].version_number + 1;
  const createdAt = new Date().toISOString();
  const id = `${versionNumber.toString(16).padStart(8, "0")}${characterId.slice(8)}`;

  // После задержки всё меняется вместе, без промежуточного await.
  applyMockCharacterVersion(characterId, saved, versionNumber, createdAt);
  versionsByCharacter.set(characterId, [
    {
      id,
      version_number: versionNumber,
      created_at: createdAt,
      is_current: true,
    },
    ...versions.map((item) => ({ ...item, is_current: false })),
  ]);
  snapshotsByCharacter.get(characterId)!.push({
    id,
    character_id: characterId,
    version_number: versionNumber,
    created_at: createdAt,
    data: structuredClone(saved),
  });
  return getMockCharacterDetails(characterId, email)!;
}

// Повторяет POST restore. Как остальные mock-запросы, хранит результат только в памяти.
export async function restoreMockCharacterVersion(
  characterId: string,
  versionNumber: number,
  email: string,
): Promise<RestoreResult> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));

  // Право на восстановление проверяется в сервисе, а не только видимостью кнопки.
  const owned = getMockCharacterList(email).owned.some(
    (item) => item.id === characterId,
  );
  const snapshot =
    owned && getMockCharacterVersion(characterId, versionNumber, email);
  if (!snapshot) throw new Error("NOT_FOUND_OR_FORBIDDEN");
  const versions = versionsByCharacter.get(characterId)!;
  const deletedVersions = versions.filter(
    (item) => item.version_number > versionNumber,
  );
  if (deletedVersions.length === 0) throw new Error("RESTORE_NOT_ALLOWED");

  // После задержки все изменения выполняются вместе, без промежуточного await.
  // Копируем сохранённые calculated как обычные данные, не пересчитывая формулы.
  const character = applyMockCharacterVersion(
    characterId,
    snapshot.data,
    versionNumber,
    new Date().toISOString(),
  );
  versionsByCharacter.set(
    characterId,
    versions
      .filter((item) => item.version_number <= versionNumber)
      .map((item) => ({
        ...item,
        is_current: item.version_number === versionNumber,
      })),
  );
  snapshotsByCharacter.set(
    characterId,
    snapshotsByCharacter
      .get(characterId)!
      .filter((item) => item.version_number <= versionNumber),
  );
  return { character, deleted_versions_count: deletedVersions.length };
}
