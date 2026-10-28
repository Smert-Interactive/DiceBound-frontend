import { afterEach, beforeEach, expect, test, vi } from "vitest";

const originalId = "c1a00000-0000-4000-8000-000000000001";
const owner = "alex@example.com";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

// Даём mock-запросу завершить задержку, не замедляя тест на 500 ms.
async function respond<T>(request: Promise<T>) {
  await vi.runAllTimersAsync();
  return request;
}

test("VIEW exposes the live original and revocation removes it from the recipient list", async () => {
  const shares = await import("../mocks/characterShares");
  const characters = await import("../mocks/characters");
  const details = await import("../mocks/characterDetails");
  const history = await import("../mocks/characterVersions");
  const result = await respond(
    shares.createMockCharacterShare(
      originalId,
      {
        permission: "VIEW",
        recipient_email: " gm@example.com ",
        history_visible: true,
      },
      owner,
    ),
  );
  expect(result.copy_character_id).toBeNull();
  expect(characters.getMockCharacterList("gm@example.com").shared_view).toEqual(
    [expect.objectContaining({ id: originalId, access: "VIEW" })],
  );
  expect(
    details.getMockCharacterDetails(originalId, "gm@example.com"),
  ).toMatchObject({
    can_edit: false,
    can_view_history: true,
    access: "VIEW",
    owner_username: owner,
  });
  const original = details.getMockCharacterDetails(originalId, owner)!;
  const { getMockSheetSchema } = await import("../mocks/sheetSchemas");
  const { toDraft, toCharacterData } = await import("../sheet/sheetDraft");
  const schema = getMockSheetSchema(original.sheet_schema_id)!.schema;
  // Запрос сохранения содержит только пользовательские поля; calculated возвращает mock-backend.
  const saveData = toCharacterData(schema, toDraft(schema, original.data));
  await respond(
    history.saveMockCharacterVersion(
      originalId,
      { ...saveData, level: 4 },
      owner,
    ),
  );
  expect(
    details.getMockCharacterDetails(originalId, "gm@example.com")?.data.level,
  ).toBe(4);
  await respond(
    shares.revokeMockCharacterShare(originalId, result.share.id, owner),
  );
  expect(characters.getMockCharacterList("gm@example.com").shared_view).toEqual(
    [],
  );
  expect(
    details.getMockCharacterDetails(originalId, "gm@example.com"),
  ).toBeUndefined();
});

test("EDIT starts at v1, saves independently and cannot be revoked", async () => {
  const shares = await import("../mocks/characterShares");
  const characters = await import("../mocks/characters");
  const details = await import("../mocks/characterDetails");
  const history = await import("../mocks/characterVersions");
  const original = details.getMockCharacterDetails(originalId, owner)!;
  const { getMockSheetSchema } = await import("../mocks/sheetSchemas");
  const { toDraft, toCharacterData } = await import("../sheet/sheetDraft");
  const schema = getMockSheetSchema(original.sheet_schema_id)!.schema;
  // Запрос сохранения содержит только пользовательские поля; calculated возвращает mock-backend.
  const saveData = toCharacterData(schema, toDraft(schema, original.data));
  const result = await respond(
    shares.createMockCharacterShare(
      originalId,
      {
        permission: "EDIT",
        recipient_email: "mira@example.com",
      },
      owner,
    ),
  );
  const copyId = result.copy_character_id!;
  expect(characters.getMockCharacterList("mira@example.com")).toMatchObject({
    owned: [
      expect.objectContaining({
        id: copyId,
        copy_source_owner_name: owner,
        access: "OWNER",
      }),
    ],
    shared_view: [],
  });
  expect(
    details.getMockCharacterDetails(copyId, "mira@example.com"),
  ).toMatchObject({
    current_version_number: 1,
    can_edit: true,
    can_view_history: true,
    data: original.data,
  });
  await respond(
    history.saveMockCharacterVersion(
      copyId,
      {
        ...saveData,
        level: 8,
        hp: { current: 1, max: 30 },
      },
      "mira@example.com",
    ),
  );
  expect(details.getMockCharacterDetails(originalId, owner)?.data).toEqual(
    original.data,
  );
  await respond(
    history.saveMockCharacterVersion(
      originalId,
      { ...saveData, level: 4 },
      owner,
    ),
  );
  expect(
    details.getMockCharacterDetails(copyId, "mira@example.com")?.data.level,
  ).toBe(8);
  expect(
    history
      .getMockCharacterVersions(copyId, "mira@example.com")
      ?.map((v) => v.version_number),
  ).toEqual([2, 1]);
  const rejection = expect(
    shares.revokeMockCharacterShare(originalId, result.share.id, owner),
  ).rejects.toThrow("SHARE_IRREVOCABLE");
  await vi.runAllTimersAsync();
  await rejection;
  expect(
    details.getMockCharacterDetails(copyId, "mira@example.com"),
  ).toBeDefined();
  const ids = [
    ...history.getMockCharacterVersions(originalId, owner)!,
    ...history.getMockCharacterVersions(copyId, "mira@example.com")!,
  ].map((v) => v.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each([
  ["nobody@example.com", "SHARE_UNAVAILABLE"],
  [owner, "SHARE_UNAVAILABLE"],
  ["user@example.com", "CONFLICT"],
])("rejects unavailable recipients and duplicates: %s", async (email, code) => {
  const shares = await import("../mocks/characterShares");
  const before = shares.getMockCharacterShares(originalId, owner);
  const rejection = expect(
    shares.createMockCharacterShare(
      originalId,
      {
        permission: "VIEW",
        recipient_email: email,
        history_visible: false,
      },
      owner,
    ),
  ).rejects.toMatchObject({ code });
  await vi.runAllTimersAsync();
  await rejection;
  expect(shares.getMockCharacterShares(originalId, owner)).toEqual(before);
});
