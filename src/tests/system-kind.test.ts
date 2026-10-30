import { expect, test } from "vitest";
import { getSystemKind } from "../shared/systemKind";

test("presentation uses only the source guaranteed by the API", () => {
  expect(getSystemKind("IMPORTED")).toBe("imported");
  expect(getSystemKind("BUILT_IN")).toBe("builtin");
  expect(getSystemKind()).toBe("unknown");
});
