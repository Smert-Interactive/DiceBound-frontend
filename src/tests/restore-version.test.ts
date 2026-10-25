import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const characterId = "c1a00000-0000-4000-8000-000000000001";
const email = "alex@example.com";

beforeEach(() => {
  // Каждому сценарию нужна исходная история: сервис хранит изменения в памяти модуля.
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("mock character restoration", () => {
  test("restores stored data without recalculating or creating a new version", async () => {
    const {
      getMockCharacterVersion,
      getMockCharacterVersions,
      restoreMockCharacterVersion,
    } = await import("../mocks/characterVersions");
    const { getMockCharacterDetails } =
      await import("../mocks/characterDetails");
    const { getMockCharacterList, getMockVersionCount } =
      await import("../mocks/characters");
    const target = getMockCharacterVersion(characterId, 4, email)!;
    const request = restoreMockCharacterVersion(characterId, 4, email);
    await vi.runAllTimersAsync();
    const result = await request;

    expect(result.deleted_versions_count).toBe(3);
    expect(result.character.current_version_number).toBe(4);
    expect(result.character.data).toEqual(target.data);
    expect(result.character.data.str_modifier).toBe(2);
    expect(getMockCharacterDetails(characterId)).toEqual(result.character);
    expect(getMockVersionCount(characterId)).toBe(4);
    expect(
      getMockCharacterList(email).owned.find((item) => item.id === characterId)
        ?.updated_at,
    ).toBe(result.character.updated_at);
    expect(
      getMockCharacterVersions(characterId, email)?.map((item) => [
        item.version_number,
        item.is_current,
      ]),
    ).toEqual([
      [4, true],
      [3, false],
      [2, false],
      [1, false],
    ]);
    expect(getMockCharacterVersion(characterId, 5, email)).toBeUndefined();
    expect(getMockCharacterVersion(characterId, 4, email)).toEqual(target);

    // Ответ не даёт вызывающему коду случайно изменить ни текущий лист, ни сохранённую версию.
    result.character.data.str = 30;
    expect(getMockCharacterDetails(characterId)?.data.str).toBe(15);
    expect(getMockCharacterVersion(characterId, 4, email)?.data.str).toBe(15);
  });

  test.each([
    [7, email, "RESTORE_NOT_ALLOWED"],
    [8, email, "NOT_FOUND_OR_FORBIDDEN"],
    [4, "new@example.com", "NOT_FOUND_OR_FORBIDDEN"],
  ])(
    "rejects version %s for %s without changing history",
    async (version, account, error) => {
      const { getMockCharacterVersions, restoreMockCharacterVersion } =
        await import("../mocks/characterVersions");
      const before = getMockCharacterVersions(characterId, email);
      const request = expect(
        restoreMockCharacterVersion(characterId, version, account),
      ).rejects.toThrow(error);
      await vi.runAllTimersAsync();
      await request;
      expect(getMockCharacterVersions(characterId, email)).toEqual(before);
    },
  );
});
