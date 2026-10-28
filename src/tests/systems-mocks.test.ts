import { afterEach, beforeEach, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

// Запускает задержку mock-сервиса, сохраняя возможность проверять отказ запроса.
async function respond<T>(request: Promise<T>) {
  await vi.runAllTimersAsync();
  return request;
}

test("systems are private to their importer and returned without shared mutable objects", async () => {
  const systems = await import("../mocks/systems");
  expect(systems.getMockSystems(" ALEX@example.com ")).toHaveLength(4);
  expect(
    systems.getMockSystems("editor@example.com").map((system) => system.source),
  ).toEqual(["BUILT_IN", "BUILT_IN"]);
  const list = systems.getMockSystems("alex@example.com");
  list[0].name = "Changed externally";
  expect(systems.getMockSystems("alex@example.com")[0].name).toBe("D&D 5e");
});

test.each([
  ["built-in", 403],
  ["foreign", 404],
  ["missing", 404],
])("deletion rejects a %s system with %s", async (kind, status) => {
  const systems = await import("../mocks/systems");
  const id =
    kind === "built-in"
      ? systems.DND_SYSTEM_ID
      : kind === "foreign"
        ? systems.CUSTOM_SYSTEM_ID
        : "missing";
  const rejection = expect(
    systems.deleteMockSystem(id, "editor@example.com"),
  ).rejects.toMatchObject({ status });
  await vi.runAllTimersAsync();
  await rejection;
  expect(systems.getMockSystems("alex@example.com")).toHaveLength(4);
});

test("deletion hides the system but preserves character sheets, history and editing", async () => {
  const systems = await import("../mocks/systems");
  const details = await import("../mocks/characterDetails");
  const history = await import("../mocks/characterVersions");
  const schemas = await import("../mocks/sheetSchemas");
  const drafts = await import("../sheet/sheetDraft");
  const characters = await import("../mocks/characters");
  const id = "c1a00000-0000-4000-8000-000000000003";
  const email = "alex@example.com";
  const before = details.getMockCharacterDetails(id, email)!;
  const versions = history.getMockCharacterVersions(id, email);
  const options = systems.getMockSchemas(systems.CUSTOM_SYSTEM_ID);
  await respond(systems.deleteMockSystem(systems.CUSTOM_SYSTEM_ID, email));
  expect(
    systems
      .getMockSystems(email)
      .some((system) => system.id === systems.CUSTOM_SYSTEM_ID),
  ).toBe(false);
  expect(systems.getMockSchemas(systems.CUSTOM_SYSTEM_ID)).toEqual(options);
  expect(details.getMockCharacterDetails(id, email)).toEqual(before);
  expect(history.getMockCharacterVersions(id, email)).toEqual(versions);
  const schema = schemas.getMockSheetSchema(before.sheet_schema_id)!;
  const data = drafts.toCharacterData(
    schema.schema,
    drafts.toDraft(schema.schema, before.data),
  );
  await respond(
    history.saveMockCharacterVersion(id, { ...data, rank: 5 }, email),
  );
  expect(details.getMockCharacterDetails(id, email)?.data.rank).toBe(5);
  const createRejection = expect(
    characters.createMockCharacter(
      {
        name: "Cannot create",
        game_system_id: systems.CUSTOM_SYSTEM_ID,
        sheet_schema_id: schema.id,
      },
      email,
    ),
  ).rejects.toThrow("UNKNOWN_SYSTEM");
  await vi.runAllTimersAsync();
  await createRejection;
  const secondDelete = expect(
    systems.deleteMockSystem(systems.CUSTOM_SYSTEM_ID, email),
  ).rejects.toMatchObject({ status: 404 });
  await vi.runAllTimersAsync();
  await secondDelete;
});
