import { expect, test } from "vitest";
import { getSystemKind } from "../shared/systemKind";

test("source and missing metadata retain their fallback tones", () => {
  expect(getSystemKind("IMPORTED")).toBe("imported");
  expect(getSystemKind("BUILT_IN")).toBe("builtin");
  expect(getSystemKind()).toBe("unknown");
});

test("published backend system IDs distinguish D&D and CoC without their names", () => {
  expect(getSystemKind(undefined, "10000000-0000-4000-8000-000000000001")).toBe(
    "dnd",
  );
  expect(getSystemKind(undefined, "10000000-0000-4000-8000-000000000002")).toBe(
    "coc",
  );
  expect(
    getSystemKind("BUILT_IN", "10000000-0000-4000-8000-000000000001"),
  ).toBe("dnd");
});

test("imported and archived character systems keep their own tone", () => {
  expect(getSystemKind(undefined, "90000000-0000-4000-8000-000000000001")).toBe(
    "imported",
  );
  expect(
    getSystemKind("IMPORTED", "10000000-0000-4000-8000-000000000001"),
  ).toBe("imported");
  expect(
    getSystemKind("BUILT_IN", "90000000-0000-4000-8000-000000000001"),
  ).toBe("builtin");
});
