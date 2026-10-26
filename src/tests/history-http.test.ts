import { afterEach, expect, test, vi } from "vitest";

// При открытии по HTTP через IP браузер не предоставляет crypto.randomUUID.
// История импортируется при запуске приложения: ошибка здесь оставит весь сайт пустым.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("loads mock history without randomUUID and keeps version IDs unique", async () => {
  vi.stubGlobal("crypto", {});
  const { getMockCharacterVersions, getMockCharacterVersion } =
    await import("../mocks/characterVersions");
  const { MOCK_CHARACTERS } = await import("../mocks/characters");
  const { MOCK_USER } = await import("../auth/authContext");
  const ids: string[] = [];

  for (const character of MOCK_CHARACTERS.owned) {
    const versions = getMockCharacterVersions(character.id, MOCK_USER.email);
    if (!versions) continue;
    for (const version of versions) {
      expect(version.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(
        getMockCharacterVersion(
          character.id,
          version.version_number,
          MOCK_USER.email,
        )?.id,
      ).toBe(version.id);
      ids.push(version.id);
    }
  }

  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
});
