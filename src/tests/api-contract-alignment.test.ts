import { describe, expect, test } from "vitest";
import {
  CONTRACT_LIMITS,
  isSchemaTextWithinLimit,
} from "../api/contractLimits";
import { calculate } from "../sheet/formula/evaluate";
import {
  formatNumberInput,
  parseNumber,
  stepNumber,
} from "../sheet/numberField";
import { getResourceError, toResourceDraft } from "../sheet/resourceField";
import { recalculateSheet } from "../sheet/recalculate";
import { toCharacterData, toDraft } from "../sheet/sheetDraft";
import type { SheetField, SheetSchemaBody } from "../sheet/sheetTypes";
import { validateField } from "../sheet/validateField";
import { validateSheet } from "../sheet/validateSheet";
import { validateSchema } from "../systems/validateSchema";

// Минимальная схема позволяет проверить один контрактный случай без игровых ID.
function schema(...fields: unknown[]) {
  return {
    sections: [{ id: "core", label: "Core", fields: fields as SheetField[] }],
  };
}

const number = { id: "score", type: "number", label: "Score" } as const;

describe("SheetSchema HTTP contract", () => {
  test.each([{ sections: [] }, schema()])(
    "accepts empty arrays: %j",
    (value) => {
      expect(validateSchema(JSON.stringify(value)).valid).toBe(true);
    },
  );

  test.each([
    { ...schema(number), extra: true },
    { sections: [{ ...schema(number).sections[0], extra: true }] },
    schema({ ...number, extra: true }),
    schema({
      id: "s",
      type: "select",
      label: "S",
      options: [{ value: "a", label: "A", extra: true }],
    }),
    schema({ ...number, id: "bad-id" }),
    schema({ ...number, id: " score" }),
    schema({ ...number, id: "x".repeat(129) }),
    ...["__proto__", "prototype", "constructor"].map((id) =>
      schema({ ...number, id }),
    ),
    schema({ ...number, label: "x".repeat(256) }),
    schema({ ...number, required: "true" }),
    schema({ id: "t", type: "text", label: "T", maxLength: 0 }),
    schema({ id: "t", type: "text", label: "T", maxLength: 1e100 }),
    schema(
      { id: "c", type: "calculated", label: "C", formula: "score / 0" },
      number,
    ),
    schema({ id: "c", type: "calculated", label: "C", formula: "1 / (2 - 2)" }),
    schema({
      id: "c",
      type: "calculated",
      label: "C",
      formula: "1e308 * 1e308",
    }),
  ])("rejects server-invalid schema: %j", (value) => {
    expect(validateSchema(JSON.stringify(value)).valid).toBe(false);
  });

  test.each(["text", "number", "select", "checkbox", "resource", "calculated"])(
    "allows boolean required on %s",
    (type) => {
      const field = {
        id: "x",
        type,
        label: "X",
        required: true,
        ...(type === "select" ? { options: [{ value: "a", label: "A" }] } : {}),
        ...(type === "calculated" ? { formula: "1" } : {}),
      };
      expect(validateSchema(JSON.stringify(schema(field))).valid).toBe(true);
    },
  );

  test("section IDs are not formula identifiers", () => {
    expect(
      validateSchema(
        JSON.stringify({
          sections: [{ id: "my-section.v1", label: "S", fields: [] }],
        }),
      ).valid,
    ).toBe(true);
  });

  test("limits structure size and caps reported errors at 50", () => {
    const sections = Array.from({ length: 65 }, (_, i) => ({
      id: `s${i}`,
      label: "S",
      fields: [],
    }));
    expect(validateSchema(JSON.stringify({ sections })).valid).toBe(false);
    expect(
      validateSchema(
        JSON.stringify(
          schema(
            ...Array.from({ length: 257 }, (_, i) => ({
              ...number,
              id: `f${i}`,
            })),
          ),
        ),
      ).valid,
    ).toBe(false);
    const result = validateSchema(
      JSON.stringify(
        schema(
          ...Array.from({ length: 60 }, (_, i) => ({
            ...number,
            id: `f${i}`,
            required: 1,
          })),
        ),
      ),
    );
    expect(result.errors).toHaveLength(50);
  });

  test("limits UTF-8 bytes rather than characters", () => {
    expect(
      isSchemaTextWithinLimit("a".repeat(CONTRACT_LIMITS.schemaBytes)),
    ).toBe(true);
    expect(
      isSchemaTextWithinLimit("я".repeat(CONTRACT_LIMITS.schemaBytes / 2 + 1)),
    ).toBe(false);
    expect(
      validateSchema(" ".repeat(CONTRACT_LIMITS.schemaBytes + 1)).valid,
    ).toBe(false);
  });

  test("semantic errors have null lines; syntax errors can identify a line", () => {
    const structural = validateSchema(
      JSON.stringify(schema({ ...number, type: "slider" }), null, 2),
    );
    expect(structural.errors.every((error) => error.line === null)).toBe(true);
    expect(validateSchema('{\n"sections": [}').errors[0].line).toBe(2);
  });
});

describe("optional user values", () => {
  const fields: SheetField[] = [
    number,
    {
      id: "choice",
      type: "select",
      label: "Choice",
      options: [{ value: "a", label: "A" }],
    },
    { id: "hp", type: "resource", label: "HP" },
  ];
  const body: SheetSchemaBody = schema(...fields);

  test("omits cleared optional values and preserves numeric zero and false", () => {
    const draft = toDraft(body, {});
    expect(validateSheet(body, draft)).toEqual({});
    expect(toCharacterData(body, draft)).toEqual({});
    expect(toCharacterData(body, { ...draft, score: "0" })).toEqual({
      score: 0,
    });
    const checkbox: SheetSchemaBody = schema({
      id: "flag",
      type: "checkbox",
      label: "Flag",
      required: true,
    });
    expect(toCharacterData(checkbox, { flag: false })).toEqual({ flag: false });
    expect(validateSheet(checkbox, { flag: false })).toEqual({});
  });

  test.each(fields)("requires $type only when required is true", (field) => {
    const value = field.type === "resource" ? { current: "", max: "" } : "";
    expect(validateField(field, value)).toBeUndefined();
    expect(validateField({ ...field, required: true }, value)).toBeDefined();
  });

  test("a partial resource and an unknown select value are never omitted silently", () => {
    expect(validateField(fields[2], { current: "1", max: "" })).toBeDefined();
    expect(validateField(fields[1], "missing")).toBeDefined();
  });

  test("a formula still requires its optional numeric dependency", () => {
    const withFormula: SheetSchemaBody = schema(number, {
      id: "bonus",
      type: "calculated",
      label: "Bonus",
      formula: "score + 1",
    });
    expect(
      recalculateSheet(withFormula, toDraft(withFormula, {})).errors.bonus,
    ).toBeDefined();
  });
});

describe("server number and formula compatibility", () => {
  test.each([1e21, -1e21, 1e-7, -1e-100, Number.MIN_VALUE, Number.MAX_VALUE])(
    "round-trips a finite server number %s through an editable draft",
    (value) => {
      const text = formatNumberInput(value);
      expect(text).not.toMatch(/e/i);
      expect(parseNumber(text)).toBe(value);
      const body: SheetSchemaBody = schema(number);
      const draft = toDraft(body, { score: value });
      expect(validateSheet(body, draft)).toEqual({});
      expect(toCharacterData(body, draft)).toEqual({ score: value });
      const resource = toResourceDraft({ current: value, max: value });
      expect(getResourceError({}, resource)).toBeUndefined();
    },
  );

  test("rejects input and intermediate arithmetic overflow", () => {
    expect(parseNumber("9".repeat(400))).toBeUndefined();
    expect(validateField(number, Infinity)).toBeDefined();
    expect(getResourceError({}, { current: 0, max: Infinity })).toBeDefined();
    expect(calculate("(1e308 * 1e308) * 0", {})).toMatchObject({ ok: false });
    expect(() => stepNumber(formatNumberInput(1e-300), 1, {})).not.toThrow();
  });

  test.each([
    ["+score", 2],
    ["1e2 + .5 + 1.", 101.5],
    ["-+score", -2],
  ])("accepts server formula syntax %s", (formula, value) => {
    expect(calculate(formula as string, { score: 2 })).toEqual({
      ok: true,
      value,
    });
  });

  test.each([
    "1".padStart(2049),
    "1+".repeat(256) + "1",
    "(".repeat(65) + "1" + ")".repeat(65),
  ])("rejects formulas beyond server complexity limits", (formula) => {
    expect(calculate(formula, {})).toMatchObject({ ok: false });
  });
});
