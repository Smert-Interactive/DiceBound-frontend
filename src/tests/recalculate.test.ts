import { describe, expect, it } from "vitest";

import { recalculateSheet } from "../sheet/recalculate";
import type { SheetSchemaBody } from "../sheet/sheetTypes";

const schema: SheetSchemaBody = {
  sections: [
    {
      id: "main",
      label: "Основное",
      fields: [
        { id: "str", type: "number", label: "STR" },
        {
          id: "str_mod",
          type: "calculated",
          label: "STR Modifier",
          formula: "floor((str - 10) / 2)",
        },
        {
          id: "double_mod",
          type: "calculated",
          label: "Двойной",
          formula: "str_mod * 2",
        },
      ],
    },
  ],
};

describe("recalculateSheet", () => {
  it("считает модификатор по набранному числу: STR 16 даёт 3", () => {
    const { values, errors } = recalculateSheet(schema, { str: "16" });
    expect(values.str_mod).toBe(3);
    expect(errors).toEqual({});
  });

  it("считает calculated от другого calculated независимо от порядка", () => {
    const reversed = {
      sections: [
        {
          ...schema.sections[0],
          fields: [...schema.sections[0].fields].reverse(),
        },
      ],
    };
    expect(recalculateSheet(reversed, { str: "16" }).values.double_mod).toBe(6);
  });

  it("пустое число даёт «нельзя посчитать» и ошибку зависимости", () => {
    const { values, errors } = recalculateSheet(schema, { str: "" });
    expect(values.str_mod).toBeUndefined();
    expect(errors.str_mod).toBe("Зависит от STR: исправьте значение");
  });

  it("цикл между calculated не зависает, значения пустые", () => {
    const cyclic: SheetSchemaBody = {
      sections: [
        {
          id: "s",
          label: "S",
          fields: [
            { id: "a", type: "calculated", label: "A", formula: "b + 1" },
            { id: "b", type: "calculated", label: "B", formula: "a + 1" },
          ],
        },
      ],
    };
    const { values } = recalculateSheet(cyclic, {});
    expect(values.a).toBeUndefined();
    expect(values.b).toBeUndefined();
  });
});
