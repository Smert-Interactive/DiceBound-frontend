import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useSheetDraft } from "../sheet/useSheetDraft";

describe("useSheetDraft", () => {
  test("works before the character is known", () => {
    const { result } = renderHook(() =>
      useSheetDraft(undefined, undefined, "none"),
    );
    expect(result.current.draft).toEqual({});
    expect(result.current.changed.size).toBe(0);
  });
});
