import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { getMockCharacterDetails } from "../mocks/characterDetails";
import { MOCK_CHARACTERS } from "../mocks/characters";
import {
  getMockCharacterVersions,
  saveMockCharacterVersion,
} from "../mocks/characterVersions";
import { DND_SCHEMA } from "../mocks/sheetSchemas";
import { toCharacterData, toDraft } from "../sheet/sheetDraft";
import { useSheetDraft } from "../sheet/useSheetDraft";

const schema = DND_SCHEMA.schema;
const aldric = MOCK_CHARACTERS.owned[0];

describe("reset", () => {
  test("returns the saved state without asking and clears the marks", () => {
    const data = getMockCharacterDetails(aldric.id)!.data;
    const { result } = renderHook(() => useSheetDraft(schema, data, "v1"));
    act(() => result.current.setValue("name", "Merlin"));
    act(() => result.current.setValue("str", "20"));
    expect(result.current.changed.size).toBe(2);

    act(() => result.current.reset());
    expect(result.current.draft.name).toBe(data.name);
    expect(result.current.changed.size).toBe(0);
  });
});

describe("toCharacterData", () => {
  test("turns the draft back into numbers and leaves calculated values out", () => {
    const data = getMockCharacterDetails(aldric.id)!.data;
    const draft = toDraft(schema, data);
    draft.str = "16";
    const saved = toCharacterData(schema, draft);
    expect(saved.str).toBe(16);
    expect(saved.hp).toEqual(data.hp);
    // Backend отвечает 422, если calculated пришёл в запросе: его считает сервер.
    expect(saved).not.toHaveProperty("str_modifier");
  });
});

describe("saveMockCharacterVersion", () => {
  // Запрос как у страницы: только пользовательские значения, без calculated.
  function userData(name: string, str = "16") {
    const draft = toDraft(schema, getMockCharacterDetails(aldric.id)!.data);
    draft.name = name;
    draft.str = str;
    return toCharacterData(schema, draft);
  }

  test("creates version N+1, makes it current and updates the sheet", async () => {
    const before = getMockCharacterDetails(aldric.id)!;

    const created = await saveMockCharacterVersion(
      aldric.id,
      userData("Saved"),
      "alex@example.com",
    );
    expect(created).toBe(before.current_version_number + 1);

    const after = getMockCharacterDetails(aldric.id)!;
    expect(after.current_version_number).toBe(created);
    expect(after.data.name).toBe("Saved");
    // Формулы считает сервер: результат попадает в снимок, хотя в запросе его не было.
    expect(after.data.str_modifier).toBe(3);
    const versions = getMockCharacterVersions(aldric.id, "alex@example.com")!;
    expect(versions[0]).toMatchObject({
      version_number: created,
      is_current: true,
    });
    expect(versions.filter((item) => item.is_current)).toHaveLength(1);
  });

  test("rejects a request that supplies calculated values, like the backend", async () => {
    const data = { ...userData("Saved"), str_modifier: 3 };
    await expect(
      saveMockCharacterVersion(aldric.id, data, "alex@example.com"),
    ).rejects.toThrow("VALIDATION_ERROR");
  });

  test("rejects a sheet whose formula cannot be calculated and creates no version", async () => {
    const before = getMockCharacterDetails(aldric.id)!;
    // Без str формула str_modifier не считается.
    const data = userData("Saved");
    delete data.str;
    await expect(
      saveMockCharacterVersion(aldric.id, data, "alex@example.com"),
    ).rejects.toThrow("VALIDATION_ERROR");
    expect(getMockCharacterDetails(aldric.id)!.current_version_number).toBe(
      before.current_version_number,
    );
  });

  test("a stranger cannot save", async () => {
    await expect(
      saveMockCharacterVersion(aldric.id, {}, "nobody@example.com"),
    ).rejects.toThrow("NOT_FOUND_OR_FORBIDDEN");
  });
});
