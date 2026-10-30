import { afterEach, beforeEach, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

async function respond<T>(request: Promise<T>) {
  await vi.runAllTimersAsync();
  return request;
}

// Схема специально использует произвольные id: импорт не должен зависеть от демонстрационного листа.
const schemaText = JSON.stringify({
  sections: [
    {
      id: "crew",
      label: "Экипаж",
      fields: [
        { id: "alias", label: "Имя в эфире", type: "text" },
        { id: "power", label: "Мощность", type: "number", min: 2 },
        {
          id: "output",
          label: "Выход",
          type: "calculated",
          formula: "power * 3",
        },
      ],
    },
  ],
});
const request = {
  system_name: "  Star Routes  ",
  sheet_schema_name: "  Пилот  ",
  schema_text: schemaText,
};

test("imports linked system and full schema privately, without sharing mutable response objects", async () => {
  const { importMockSystem } = await import("../mocks/systemImport");
  const systems = await import("../mocks/systems");
  const { getMockSheetSchema } = await import("../mocks/sheetSchemas");
  const imported = await respond(
    importMockSystem(request, " ALEX@example.com "),
  );
  const id = imported.system.id;
  const schemaId = imported.sheet_schema.id;
  expect(imported.system).toMatchObject({
    name: "Star Routes",
    source: "IMPORTED",
    character_count: 0,
  });
  expect(imported.sheet_schema).toMatchObject({
    name: "Пилот",
    game_system_id: id,
    schema: JSON.parse(schemaText),
  });
  expect(systems.getMockSchemas(id)).toEqual([
    expect.objectContaining({ id: schemaId, game_system_id: id }),
  ]);
  expect(
    systems.getMockSystems("alex@example.com").some((s) => s.id === id),
  ).toBe(true);
  expect(
    systems.getMockSystems("editor@example.com").some((s) => s.id === id),
  ).toBe(false);
  imported.sheet_schema.schema.sections[0].label = "Changed outside";
  imported.system.name = "Changed outside";
  expect(getMockSheetSchema(schemaId)?.schema.sections[0].label).toBe("Экипаж");
  expect(
    systems.getMockSystems("alex@example.com").find((s) => s.id === id)?.name,
  ).toBe("Star Routes");
});

test.each([
  { ...request, system_name: " " },
  { ...request, sheet_schema_name: " " },
  { ...request, schema_text: "{" },
  { ...request, schema_text: '{"sections":null}' },
])("rejects invalid imports atomically: %j", async (invalid) => {
  const { importMockSystem } = await import("../mocks/systemImport");
  const { MOCK_SYSTEMS, MOCK_SCHEMAS } = await import("../mocks/systems");
  const { MOCK_SHEET_SCHEMAS } = await import("../mocks/sheetSchemas");
  const before = [
    MOCK_SYSTEMS.length,
    MOCK_SCHEMAS.length,
    MOCK_SHEET_SCHEMAS.length,
  ];
  const rejection = expect(
    importMockSystem(invalid, "alex@example.com"),
  ).rejects.toMatchObject({
    status: invalid.schema_text === request.schema_text ? 400 : 422,
  });
  await vi.runAllTimersAsync();
  await rejection;
  expect([
    MOCK_SYSTEMS.length,
    MOCK_SCHEMAS.length,
    MOCK_SHEET_SCHEMAS.length,
  ]).toEqual(before);
});

test("creates an openable character and version from an imported schema; deletion keeps its sheet", async () => {
  const { importMockSystem } = await import("../mocks/systemImport");
  const { getMockCharacterDetails } = await import("../mocks/characterDetails");
  const { createMockCharacter, getMockCharacterList } =
    await import("../mocks/characters");
  const { getMockCharacterVersions } =
    await import("../mocks/characterVersions");
  const { deleteMockSystem, getMockSystems } = await import("../mocks/systems");
  const imported = await respond(importMockSystem(request, "alex@example.com"));
  const character = await respond(
    createMockCharacter(
      {
        name: "Новый пилот",
        game_system_id: imported.system.id,
        sheet_schema_id: imported.sheet_schema.id,
      },
      "alex@example.com",
    ),
  );
  expect(
    getMockCharacterList("alex@example.com").owned.some(
      (item) => item.id === character.id,
    ),
  ).toBe(true);
  const details = getMockCharacterDetails(character.id, "alex@example.com");
  expect(details).toMatchObject({
    sheet_schema_id: imported.sheet_schema.id,
    current_version_number: 1,
    data: { alias: "" },
  });
  expect(
    getMockCharacterVersions(character.id, "alex@example.com"),
  ).toHaveLength(1);
  expect(
    getMockSystems("alex@example.com").find((s) => s.id === imported.system.id)
      ?.character_count,
  ).toBe(1);
  await respond(deleteMockSystem(imported.system.id, "alex@example.com"));
  expect(getMockCharacterDetails(character.id, "alex@example.com")).toEqual(
    details,
  );
});

test("creation returns Character with empty optional values and available constant calculations", async () => {
  const { importMockSystem } = await import("../mocks/systemImport");
  const { createMockCharacter } = await import("../mocks/characters");
  const imported = await respond(
    importMockSystem(
      {
        ...request,
        schema_text: JSON.stringify({
          sections: [
            {
              id: "s",
              label: "S",
              fields: [
                { id: "text", type: "text", label: "T", required: true },
                { id: "flag", type: "checkbox", label: "F" },
                { id: "score", type: "number", label: "N", min: 10 },
                {
                  id: "choice",
                  type: "select",
                  label: "S",
                  options: [{ value: "a", label: "A" }],
                },
                { id: "hp", type: "resource", label: "R", min: 0 },
                {
                  id: "derived",
                  type: "calculated",
                  label: "D",
                  formula: "constant + 1",
                },
                {
                  id: "constant",
                  type: "calculated",
                  label: "C",
                  formula: "2 * 3",
                },
                {
                  id: "pending",
                  type: "calculated",
                  label: "P",
                  formula: "score + derived",
                },
              ],
            },
          ],
        }),
      },
      "alex@example.com",
    ),
  );
  const created = await respond(
    createMockCharacter(
      {
        name: "Fresh",
        game_system_id: imported.system.id,
        sheet_schema_id: imported.sheet_schema.id,
      },
      "alex@example.com",
    ),
  );
  expect(created.data).toEqual({
    text: "",
    flag: false,
    constant: 6,
    derived: 7,
  });
  expect(created.current_version_number).toBe(1);
  expect(created).not.toHaveProperty("game_system_name");
  expect(created).not.toHaveProperty("access");
  expect(created.owner_id).toBeDefined();
});
