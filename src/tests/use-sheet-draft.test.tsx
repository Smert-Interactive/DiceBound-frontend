import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { getMockCharacterDetails } from "../mocks/characterDetails";
import { DND_SCHEMA } from "../mocks/sheetSchemas";
import { MOCK_CHARACTERS } from "../mocks/characters";
import { useSheetDraft } from "../sheet/useSheetDraft";

const aldric = getMockCharacterDetails(MOCK_CHARACTERS.owned[0].id)!;
const schema = DND_SCHEMA.schema;

describe("useSheetDraft", () => {
  test("starts from the saved data with nothing changed", () => {
    const { result } = renderHook(() =>
      useSheetDraft(schema, aldric.data, "v7"),
    );
    expect(result.current.draft.name).toBe("Aldric");
    expect(result.current.changed.size).toBe(0);
  });

  test("an edit changes the draft and marks only that field", () => {
    const { result } = renderHook(() =>
      useSheetDraft(schema, aldric.data, "v7"),
    );
    act(() => result.current.setValue("name", "Merlin"));
    expect(result.current.draft.name).toBe("Merlin");
    expect([...result.current.changed]).toEqual(["name"]);
  });

  test("typing the saved value back clears the mark", () => {
    const { result } = renderHook(() =>
      useSheetDraft(schema, aldric.data, "v7"),
    );
    act(() => result.current.setValue("name", "Merlin"));
    act(() => result.current.setValue("name", "Aldric"));
    expect(result.current.changed.size).toBe(0);
  });

  test("a new reset key drops the edits and takes the new saved data", () => {
    const { result, rerender } = renderHook(
      ({ data, key }) => useSheetDraft(schema, data, key),
      { initialProps: { data: aldric.data, key: "v7" } },
    );
    act(() => result.current.setValue("name", "Merlin"));

    rerender({ data: { ...aldric.data, name: "Restored" }, key: "v4" });
    expect(result.current.draft.name).toBe("Restored");
    expect(result.current.changed.size).toBe(0);
  });

  test("the same key keeps the edits when the page renders again", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useSheetDraft(schema, data, "v7"),
      { initialProps: { data: aldric.data } },
    );
    act(() => result.current.setValue("name", "Merlin"));
    // Страница каждый раз получает свежую копию данных: правки от этого не теряются.
    rerender({ data: structuredClone(aldric.data) });
    expect(result.current.draft.name).toBe("Merlin");
  });

  test("works before the character is known", () => {
    const { result } = renderHook(() =>
      useSheetDraft(undefined, undefined, "none"),
    );
    expect(result.current.draft).toEqual({});
    expect(result.current.changed.size).toBe(0);
  });
});
