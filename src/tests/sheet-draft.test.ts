import { describe, expect, test } from "vitest";

import { getMockCharacterDetails } from "../mocks/characterDetails";
import { COC_SCHEMA, DND_SCHEMA } from "../mocks/sheetSchemas";
import { MOCK_CHARACTERS } from "../mocks/characters";
import {
  getChangedFieldIds,
  getStoredCalculated,
  toDraft,
} from "../sheet/sheetDraft";

const aldric = getMockCharacterDetails(MOCK_CHARACTERS.owned[0].id)!;

describe("toDraft", () => {
  test("turns character data into the values the fields show", () => {
    const draft = toDraft(DND_SCHEMA.schema, aldric.data);
    expect(draft.name).toBe("Aldric");
    expect(draft.class).toBe("fighter");
    // Число хранится строкой: пока человек печатает, она бывает пустой.
    expect(draft.str).toBe("10");
    expect(draft.hp).toEqual({ current: "21", max: "28" });
  });

  test("leaves calculated fields out: the formula engine owns them", () => {
    expect(toDraft(DND_SCHEMA.schema, aldric.data)).not.toHaveProperty(
      "str_modifier",
    );
  });

  test("gives empty values for data that is missing", () => {
    const draft = toDraft(DND_SCHEMA.schema, {});
    expect(draft.name).toBe("");
    expect(draft.str).toBe("");
    expect(draft.hp).toEqual({ current: "", max: "" });
    // Все поля CoC тоже собираются без ошибок.
    expect(() => toDraft(COC_SCHEMA.schema, {})).not.toThrow();
  });

  test("ignores values of the wrong type", () => {
    const draft = toDraft(DND_SCHEMA.schema, {
      name: 5,
      str: "ten",
      hp: "full",
    });
    expect(draft.name).toBe("");
    expect(draft.str).toBe("");
    expect(draft.hp).toEqual({ current: "", max: "" });
  });
});

describe("getChangedFieldIds", () => {
  const baseline = toDraft(DND_SCHEMA.schema, aldric.data);

  test("is empty for an untouched draft", () => {
    expect(getChangedFieldIds({ ...baseline }, baseline).size).toBe(0);
  });

  test("lists the edited fields, including both parts of a resource", () => {
    const draft = {
      ...baseline,
      name: "Merlin",
      hp: { current: "20", max: "28" },
    };
    expect([...getChangedFieldIds(draft, baseline)].sort()).toEqual([
      "hp",
      "name",
    ]);
  });

  test("a value typed back to the saved one is not a change", () => {
    const edited = { ...baseline, str: "16" };
    expect(getChangedFieldIds(edited, baseline).has("str")).toBe(true);
    const typedBack = { ...edited, str: baseline.str };
    expect(getChangedFieldIds(typedBack, baseline).size).toBe(0);
  });
});

describe("getStoredCalculated", () => {
  test("reads the saved modifiers", () => {
    const stored = getStoredCalculated(DND_SCHEMA.schema, aldric.data);
    expect(stored.str_modifier).toBe(0);
    expect(stored.cha_modifier).toBe(-1);
  });

  test("a missing value is undefined", () => {
    expect(
      getStoredCalculated(DND_SCHEMA.schema, {}).str_modifier,
    ).toBeUndefined();
  });
});
