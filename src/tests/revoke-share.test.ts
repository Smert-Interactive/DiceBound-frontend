import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const characterId = "c1a00000-0000-4000-8000-000000000001";
const owner = "alex@example.com";

beforeEach(() => {
  // Каждый сценарий начинает с исходных выдач, без отзыва из предыдущего теста.
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

describe("mock VIEW revocation", () => {
  test("removes only the selected VIEW after a successful response", async () => {
    const store = await import("../mocks/characterShares");
    const before = store.getMockCharacterShares(characterId, owner)!;
    const request = store.revokeMockCharacterShare(
      characterId,
      before[0].id,
      owner,
    );
    expect(store.getMockCharacterShares(characterId, owner)).toEqual(before);
    await vi.runAllTimersAsync();
    await request;
    expect(store.getMockCharacterShares(characterId, owner)).toEqual(
      before.slice(1),
    );
    expect(
      store
        .getMockCharacterShares(characterId, owner)
        ?.map((share) => share.history_visible),
    ).toEqual([false, null]);
  });

  test.each([
    [
      characterId,
      "a1100000-0000-4000-8000-000000000001",
      "nobody@example.com",
      "NOT_FOUND_OR_FORBIDDEN",
    ],
    [
      "c1a00000-0000-4000-8000-000000000004",
      "a1100000-0000-4000-8000-000000000001",
      owner,
      "NOT_FOUND_OR_FORBIDDEN",
    ],
    [
      "c1a00000-0000-4000-8000-000000000002",
      "a1100000-0000-4000-8000-000000000001",
      owner,
      "NOT_FOUND_OR_FORBIDDEN",
    ],
    [characterId, "missing", owner, "NOT_FOUND_OR_FORBIDDEN"],
    [
      characterId,
      "a1100000-0000-4000-8000-000000000003",
      owner,
      "SHARE_IRREVOCABLE",
    ],
  ])(
    "%s / %s by %s is rejected with %s",
    async (id, shareId, email, reason) => {
      const store = await import("../mocks/characterShares");
      const before = store.getMockCharacterShares(characterId, owner);
      const request = store.revokeMockCharacterShare(id, shareId, email);
      const rejection = expect(request).rejects.toThrow(reason);
      await vi.runAllTimersAsync();
      await rejection;
      expect(store.getMockCharacterShares(characterId, owner)).toEqual(before);
    },
  );
});
