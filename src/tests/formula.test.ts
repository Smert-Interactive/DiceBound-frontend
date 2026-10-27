import { describe, expect, test } from "vitest";

import { calculate, getFormulaFieldIds } from "../sheet/formula/evaluate";
import { parseFormula } from "../sheet/formula/parse";
import { FormulaError } from "../sheet/formula/types";
import type { CharacterData } from "../sheet/sheetTypes";

// Значение формулы или код ошибки: так таблицы случаев короче.
function run(source: string, values: CharacterData = {}) {
  const result = calculate(source, values);
  return result.ok ? result.value : result.error.code;
}

describe("formula arithmetic", () => {
  test.each([
    ["1 + 2 * 3", 7],
    ["(1 + 2) * 3", 9],
    ["10 - 3 - 2", 5],
    ["100 / 10 / 2", 5],
    ["2 * 3 + 4 * 5", 26],
    ["((2))", 2],
    ["1.5 + 1.5", 3],
    ["  7\t- 2 ", 5],
  ])("%s = %s", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  test.each([
    ["-2", -2],
    ["-2 * -3", 6],
    ["--2", 2],
    ["3 - -2", 5],
    ["-(1 + 2)", -3],
  ])("unary minus: %s = %s", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  test("reads field values by id", () => {
    expect(run("str / 2 + bonus", { str: 16, bonus: 1 })).toBe(9);
  });
});

describe("formula functions", () => {
  test.each([
    ["floor(2.9)", 2],
    ["floor(-0.5)", -1],
    ["ceil(2.1)", 3],
    ["ceil(-2.9)", -2],
    ["round(2.4)", 2],
    ["round(2.5)", 3],
    ["min(3, 1, 2)", 1],
    ["max(3, 1, 2)", 3],
    ["min(5)", 5],
    ["max(1, floor(7 / 2))", 3],
    ["floor(min(10, 7) / 2)", 3],
  ])("%s = %s", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  // Пример из sheet-schema.md: STR 10 → 16 меняет модификатор с +0 на +3.
  test("strength modifier follows the contract example", () => {
    const formula = "floor((strength - 10) / 2)";
    expect(run(formula, { strength: 10 })).toBe(0);
    expect(run(formula, { strength: 16 })).toBe(3);
    expect(run(formula, { strength: 9 })).toBe(-1);
    expect(run(formula, { strength: 1 })).toBe(-5);
  });
});

describe("formula errors", () => {
  test.each([
    ["x + 1", "unknown_field"],
    ["1 / 0", "division_by_zero"],
    ["1 / (2 - 2)", "division_by_zero"],
    ["abs(1)", "unknown_function"],
    ["constructor(1)", "unknown_function"],
    ["toString(1)", "unknown_function"],
    ["floor()", "wrong_arguments"],
    ["floor(1, 2)", "wrong_arguments"],
    ["min()", "wrong_arguments"],
    ["", "syntax"],
    ["1 +", "syntax"],
    ["* 2", "syntax"],
    ["(1 + 2", "syntax"],
    ["1 + 2)", "syntax"],
    ["1 2", "syntax"],
    ["1 $ 2", "syntax"],
    ["1.2.3", "syntax"],
    ["min(1,)", "syntax"],
    ["floor(1 / 0)", "division_by_zero"],
    ["floor(missing)", "unknown_field"],
  ])("%j gives %s", (source, code) => {
    expect(run(source)).toBe(code);
  });

  test("a field without a number is not a number", () => {
    expect(run("name + 1", { name: "Aldric" })).toBe("not_a_number");
    expect(calculate("hp + 1", { hp: { current: 1, max: 2 } })).toMatchObject({
      ok: false,
      error: { code: "not_a_number", fieldId: "hp" },
    });
    expect(run("flag + 1", { flag: true })).toBe("not_a_number");
  });

  test("names the missing field", () => {
    const result = calculate("str + dex", { str: 10 });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "unknown_field", fieldId: "dex" },
    });
  });

  test("never executes code from the formula", () => {
    const globals = globalThis as { hacked?: boolean };
    expect(run("globalThis.hacked = true")).toBe("syntax");
    expect(run("(() => 1)()")).toBe("syntax");
    expect(run("process")).toBe("unknown_field");
    expect(globals.hacked).toBeUndefined();
  });

  test("parseFormula throws a FormulaError with a code", () => {
    expect(() => parseFormula("1 +")).toThrow(FormulaError);
  });
});

describe("getFormulaFieldIds", () => {
  test("lists each field once in order of appearance", () => {
    expect(getFormulaFieldIds("floor((str - 10) / 2) + str + dex")).toEqual([
      "str",
      "dex",
    ]);
  });

  test("finds fields inside functions and negation", () => {
    expect(getFormulaFieldIds("max(-a, min(b, c))")).toEqual(["a", "b", "c"]);
  });

  test("returns an empty list for constants and broken formulas", () => {
    expect(getFormulaFieldIds("1 + 2")).toEqual([]);
    expect(getFormulaFieldIds("1 +")).toEqual([]);
  });

  test("does not take function names for fields", () => {
    expect(getFormulaFieldIds("floor(str)")).toEqual(["str"]);
  });
});
