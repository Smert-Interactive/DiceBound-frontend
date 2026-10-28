import { describe, expect, test } from "vitest";

import { recalculateSheet } from "../sheet/recalculate";
import { getSaveStatus, hasSaveBlockers } from "../sheet/saveStatus";
import type { SheetSchemaBody } from "../sheet/sheetTypes";
import { validateSheet } from "../sheet/validateSheet";

const base = { changedCount: 0, hasErrors: false, phase: "idle" } as const;

// Поле «сила» без границ и формула 10 / strength: при strength = 0 backend отвечает 422.
const inverseSchema: SheetSchemaBody = {
  sections: [
    {
      id: "main",
      label: "Основное",
      fields: [
        { id: "strength", type: "number", label: "Strength" },
        {
          id: "inverse",
          type: "calculated",
          label: "Inverse",
          formula: "10 / strength",
        },
      ],
    },
  ],
};

function getBlockers(strength: string) {
  const draft = { strength };
  return hasSaveBlockers(
    validateSheet(inverseSchema, draft),
    recalculateSheet(inverseSchema, draft).errors,
  );
}

describe("hasSaveBlockers", () => {
  test("a formula failure blocks saving although the field itself is valid", () => {
    expect(getBlockers("0")).toBe(true);
    expect(getBlockers("2")).toBe(false);
  });

  test("an error in a field blocks saving", () => {
    expect(hasSaveBlockers({ strength: "Нужно число" }, {})).toBe(true);
  });
});

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
