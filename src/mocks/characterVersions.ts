import type { CharacterData } from "../sheet/sheetTypes";
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
for (const summary of MOCK_CHARACTERS.owned) {
  const character = getMockCharacterDetails(summary.id);
  if (!character) continue;

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
      id: crypto.randomUUID(),
      version_number: version,
      created_at: new Date(timestamp).toISOString(),
      is_current: version === count,
    };
  });
  versionsByCharacter.set(summary.id, versions.reverse());
  snapshotsByCharacter.set(
    summary.id,
    versions.map(({ id, version_number, created_at }) => ({
      id,
      character_id: summary.id,
      version_number,
      created_at,
      // Разворачиваем полный снимок и копируем вложенные ресурсы, отделяя его от текущего листа.
      data: structuredClone({
        ...character.data,
        ...VERSION_CHANGES[summary.id]?.[version_number],
      }),
    })),
  );
}

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
  const character = summary && getMockCharacterDetails(characterId);
  if (!character?.can_view_history) return undefined;

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
