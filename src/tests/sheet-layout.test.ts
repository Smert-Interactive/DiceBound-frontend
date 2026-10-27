import { describe, expect, test } from "vitest";

import { COC_SCHEMA, DND_SCHEMA } from "../mocks/sheetSchemas";
import { buildSheetLayout } from "../sheet/sheetLayout";
import type { SheetField } from "../sheet/sheetTypes";

const text = (id: string): SheetField => ({ id, type: "text", label: id });
const num = (id: string): SheetField => ({ id, type: "number", label: id });
const calc = (id: string, formula: string): SheetField => ({
  id,
  type: "calculated",
  label: id,
  formula,
});

// Короткая запись раскладки для сравнения: f — обычное поле, p — пара.
function shape(fields: SheetField[]) {
  return buildSheetLayout(fields).map((block) =>
    block.type === "fields"
      ? block.fields.map((field) => field.id)
      : block.pairs.map((pair) => `${pair.number.id}+${pair.calculated.id}`),
  );
}

describe("buildSheetLayout", () => {
  test("keeps ordinary fields in one block in array order", () => {
    expect(shape([text("a"), num("b"), text("c")])).toEqual([["a", "b", "c"]]);
  });

  test("recognizes a number followed by a calculated field that uses it", () => {
    expect(shape([num("str"), calc("mod", "floor((str - 10) / 2)")])).toEqual([
      ["str+mod"],
    ]);
  });

  test("groups consecutive pairs into one block", () => {
    expect(
      shape([
        num("str"),
        calc("str_mod", "floor((str - 10) / 2)"),
        num("dex"),
        calc("dex_mod", "floor((dex - 10) / 2)"),
      ]),
    ).toEqual([["str+str_mod", "dex+dex_mod"]]);
  });

  test("splits ordinary fields around pairs without changing the order", () => {
    expect(
      shape([
        text("name"),
        num("str"),
        calc("str_mod", "str - 10"),
        text("note"),
        num("level"),
      ]),
    ).toEqual([["name"], ["str+str_mod"], ["note", "level"]]);
  });

  test("a calculated field that does not use the previous number is ordinary", () => {
    expect(shape([num("str"), calc("total", "dex + 1")])).toEqual([
      ["str", "total"],
    ]);
  });

  test("a calculated field must follow the number directly", () => {
    expect(shape([num("str"), text("note"), calc("mod", "str - 10")])).toEqual([
      ["str", "note", "mod"],
    ]);
  });

  test("a calculated field without a number before it is ordinary", () => {
    expect(shape([text("a"), calc("mod", "a + 1")])).toEqual([["a", "mod"]]);
  });

  test("a calculated field with a broken formula is not a pair", () => {
    expect(shape([num("str"), calc("mod", "str +")])).toEqual([["str", "mod"]]);
  });

  test("two numbers in a row: only the one the formula uses is paired", () => {
    expect(shape([num("a"), num("b"), calc("mod", "b - 1")])).toEqual([
      ["a"],
      ["b+mod"],
    ]);
  });

  test("an empty section has no blocks", () => {
    expect(buildSheetLayout([])).toEqual([]);
  });
});

describe("buildSheetLayout on the mock schemas", () => {
  const sections = (schema: typeof DND_SCHEMA) => schema.schema.sections;

  test("D&D abilities are six pairs", () => {
    const abilities = sections(DND_SCHEMA).find(
      (section) => section.id === "abilities",
    )!;
    const blocks = buildSheetLayout(abilities.fields);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("pairs");
    expect(blocks[0].type === "pairs" && blocks[0].pairs).toHaveLength(6);
  });

  test("CoC has no pairs", () => {
    for (const section of sections(COC_SCHEMA)) {
      const blocks = buildSheetLayout(section.fields);
      expect(blocks.every((block) => block.type === "fields")).toBe(true);
    }
  });

  test("no field is lost or repeated", () => {
    for (const schema of [DND_SCHEMA, COC_SCHEMA]) {
      for (const section of sections(schema)) {
        const ids = buildSheetLayout(section.fields).flatMap((block) =>
          block.type === "fields"
            ? block.fields.map((field) => field.id)
            : block.pairs.flatMap((pair) => [
                pair.number.id,
                pair.calculated.id,
              ]),
        );
        expect(ids).toEqual(section.fields.map((field) => field.id));
      }
    }
  });
});
