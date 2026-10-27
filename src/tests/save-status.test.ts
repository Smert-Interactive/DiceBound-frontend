import { describe, expect, test } from "vitest";

import { getSaveStatus } from "../sheet/saveStatus";

const base = { changedCount: 0, hasErrors: false, phase: "idle" } as const;

describe("getSaveStatus", () => {
  test("no changes is clean, changes are dirty", () => {
    expect(getSaveStatus(base)).toBe("clean");
    expect(getSaveStatus({ ...base, changedCount: 2 })).toBe("dirty");
  });

  test("errors in fields make the bar invalid", () => {
    expect(getSaveStatus({ ...base, changedCount: 1, hasErrors: true })).toBe(
      "invalid",
    );
  });

  test("a request wins over everything else", () => {
    expect(
      getSaveStatus({ changedCount: 3, hasErrors: true, phase: "saving" }),
    ).toBe("saving");
  });

  test("saved holds until the next change", () => {
    expect(getSaveStatus({ ...base, phase: "saved" })).toBe("saved");
    expect(getSaveStatus({ ...base, phase: "saved", changedCount: 1 })).toBe(
      "dirty",
    );
  });

  test("a network error keeps the error status", () => {
    expect(getSaveStatus({ ...base, changedCount: 1, phase: "error" })).toBe(
      "error",
    );
  });
});
