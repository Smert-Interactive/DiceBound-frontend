import type { CharacterVersionSummary } from "../history/historyTypes";
import { getMockCharacterDetails } from "./characterDetails";
import { getMockCharacterList, MOCK_CHARACTERS } from "./characters";

// Список версий живёт в памяти, как остальные моки. Снимки листа здесь не создаём.
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
