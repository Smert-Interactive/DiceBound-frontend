import { afterEach, expect, test, vi } from "vitest";
import { getFormulaFunction } from "../sheet/formula/functions";
import { validateSchema } from "../systems/validateSchema";

// Минимальная схема позволяет менять только условие проверяемого сценария.
function schemaWith(...fields: unknown[]) {
  return { sections: [{ id: "main", label: "Основное", fields }] };
}

function number(id = "strength") {
  return { id, type: "number", label: id };
}

function calculated(id: string, formula: string) {
  return { id, type: "calculated", label: id, formula };
}

function errorsFor(value: unknown) {
  const result = validateSchema(JSON.stringify(value, null, 2));
  expect(result.valid).toBe(false);
  expect(result.schema).toBeNull();
  expect(result.summary).toBeNull();
  if (result.valid) throw new Error("Expected an invalid schema");
  expect(result.errors.length).toBeGreaterThan(0);
  return result.errors;
}

afterEach(() => vi.restoreAllMocks());

test("accepts all six field types with optional constraints omitted", () => {
  const schema = schemaWith(
    { id: "name", type: "text", label: "Имя" },
    number(),
    {
      id: "class",
      type: "select",
      label: "Класс",
      options: [{ value: "mage", label: "Маг" }],
    },
    { id: "ready", type: "checkbox", label: "Готов" },
    { id: "hp", type: "resource", label: "Здоровье" },
    calculated("bonus", "floor((strength - 10) / 2)"),
  );
  expect(validateSchema(JSON.stringify(schema))).toMatchObject({
    valid: true,
    schema,
  });
});

test.each([
  null,
  [],
  42,
  "schema",
  true,
  {},
  { sections: null },
  { sections: {} },
])("rejects a root without usable sections: %j", (value) => {
  expect(errorsFor(value)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path:
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? "sections"
            : "$",
      }),
    ]),
  );
});

test.each([null, [], 3, "section"])(
  "rejects a non-object section: %j",
  (section) => {
    expect(errorsFor({ sections: [section] })[0].path).toBe("sections[0]");
  },
);

test.each([undefined, null, {}, "fields"])(
  "rejects missing or empty fields: %j",
  (fields) => {
    expect(
      errorsFor({ sections: [{ id: "main", label: "Основное", fields }] }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "sections[0].fields" }),
      ]),
    );
  },
);

test.each([null, [], false, "field"])(
  "rejects a non-object field: %j",
  (field) => {
    expect(errorsFor(schemaWith(field))[0].path).toBe("sections[0].fields[0]");
  },
);

test.each(["id", "label"])("rejects a blank section %s", (key) => {
  const schema = schemaWith(number());
  Object.assign(schema.sections[0], { [key]: "  " });
  expect(errorsFor(schema)[0].path).toBe(`sections[0].${key}`);
});

test.each(["id", "label"])("rejects a blank field %s", (key) => {
  expect(errorsFor(schemaWith({ ...number(), [key]: "  " }))[0].path).toBe(
    `sections[0].fields[0].${key}`,
  );
});

test("rejects duplicate section IDs and field IDs across sections", () => {
  const first = schemaWith(number()).sections[0];
  const errors = errorsFor({ sections: [first, { ...first }] });
  expect(errors.map((error) => error.path)).toEqual([
    "sections[1].id",
    "sections[1].fields[0].id",
  ]);
});

test("allows identical labels when IDs differ", () => {
  const schema = schemaWith(
    { ...number("a"), label: "Значение" },
    { ...number("b"), label: "Значение" },
  );
  expect(validateSchema(JSON.stringify(schema)).valid).toBe(true);
});

test.each([undefined, "slider", "Number", 7, null])(
  "rejects an unknown field type: %j",
  (type) => {
    expect(errorsFor(schemaWith({ ...number(), type }))[0].path).toBe(
      "sections[0].fields[0].type",
    );
  },
);

test.each([
  { type: "text", required: "true" },
  { type: "text", maxLength: -1 },
  { type: "text", maxLength: 1.5 },
  { type: "text", maxLength: "10" },
  { type: "number", min: "0" },
  { type: "number", max: null },
  { type: "number", min: 10, max: 1 },
  { type: "resource", min: false },
])("rejects invalid field constraints: %j", (properties) => {
  errorsFor(schemaWith({ ...number(), ...properties }));
});

test("accepts zero, fractional and equal numeric boundaries", () => {
  const schema = schemaWith(
    { ...number("score"), min: -1.5, max: -1.5 },
    { id: "name", label: "Имя", type: "text", required: false, maxLength: 1 },
    { id: "hp", label: "HP", type: "resource", min: 0 },
  );
  expect(validateSchema(JSON.stringify(schema)).valid).toBe(true);
});

test.each([
  undefined,
  [],
  "option",
  [null],
  [{ value: "mage" }],
  [{ value: "", label: "Маг" }],
  [
    { value: "mage", label: "Маг" },
    { value: "mage", label: "Волшебник" },
  ],
])("rejects invalid select options: %j", (options) => {
  errorsFor(
    schemaWith({ id: "class", label: "Класс", type: "select", options }),
  );
});

test.each([
  "",
  " ",
  "strength +",
  "floor((strength)",
  "strength ** 2",
  "strength; alert(1)",
])("rejects an empty or unparseable formula: %j", (formula) => {
  const errors = errorsFor(schemaWith(number(), calculated("bonus", formula)));
  expect(errors).toEqual([
    expect.objectContaining({ path: "sections[0].fields[1].formula" }),
  ]);
});

test.each([
  "pow(strength, 2)",
  "constructor(strength)",
  "toString(strength)",
  "floor()",
  "floor(strength, 2)",
  "min()",
  "max()",
])("rejects unknown functions or wrong arity: %s", (formula) => {
  errorsFor(schemaWith(number(), calculated("bonus", formula)));
});

test.each([
  "floor(strength)",
  "ceil(strength)",
  "round(strength)",
  "min(strength)",
  "max(strength, 1, 2)",
  "-strength + (3 * strength) / 2",
])("accepts supported formula syntax: %s", (formula) => {
  expect(
    validateSchema(
      JSON.stringify(schemaWith(number(), calculated("bonus", formula))),
    ).valid,
  ).toBe(true);
});

test("finds unknown references in nested function arguments and arithmetic", () => {
  const errors = errorsFor(
    schemaWith(calculated("bonus", "max(-missing, floor(other + 1))")),
  );
  expect(errors.map((error) => error.message)).toEqual([
    "Поле «missing» не найдено в схеме.",
    "Поле «other» не найдено в схеме.",
  ]);
});

test.each([
  { id: "source", label: "Источник", type: "text" },
  { id: "source", label: "Источник", type: "checkbox" },
  { id: "source", label: "Источник", type: "resource" },
  {
    id: "source",
    label: "Источник",
    type: "select",
    options: [{ value: "a", label: "A" }],
  },
])("rejects a reference to a $type field", (field) => {
  const errors = errorsFor(
    schemaWith(field, calculated("bonus", "source + 1")),
  );
  expect(errors[0].message).toContain("number или calculated");
});

test("resolves forward references across sections and a shared acyclic dependency", () => {
  const schema = {
    sections: [
      {
        id: "derived",
        label: "Расчёты",
        fields: [
          calculated("total", "left + right"),
          calculated("left", "base + 1"),
          calculated("right", "base - 1"),
        ],
      },
      { id: "source", label: "Источник", fields: [number("base")] },
    ],
  };
  expect(validateSchema(JSON.stringify(schema))).toMatchObject({
    valid: true,
    summary: { sections_count: 2, fields_count: 4 },
  });
});

test.each([
  [calculated("a", "a")],
  [calculated("a", "b"), calculated("b", "a")],
  [calculated("a", "b"), calculated("b", "c"), calculated("c", "a")],
])("rejects every participant of a dependency cycle", (...fields) => {
  const errors = errorsFor(schemaWith(...fields));
  expect(errors).toHaveLength(fields.length);
  for (const field of fields) {
    expect(
      errors.filter(
        (error) =>
          error.message === `Циклическая зависимость формулы «${field.id}».`,
      ),
    ).toHaveLength(1);
  }
});

test("does not mark a dependent field as a participant of the cycle", () => {
  const errors = errorsFor(
    schemaWith(
      calculated("total", "a + 1"),
      calculated("a", "b"),
      calculated("b", "a"),
    ),
  );
  expect(errors.map((error) => error.path)).toEqual([
    "sections[0].fields[1].formula",
    "sections[0].fields[2].formula",
  ]);
});

test("does not invent values for dependent formulas or change the source JSON", () => {
  const apply = vi.spyOn(getFormulaFunction("floor")!, "apply");
  const schema = schemaWith(
    number(),
    calculated("bonus", "floor(strength / 2)"),
  );
  const text = `  ${JSON.stringify(schema, null, 2)}\n`;
  expect(validateSchema(text)).toMatchObject({ valid: true, schema });
  expect(apply).not.toHaveBeenCalled();
  expect(text).toBe(`  ${JSON.stringify(schema, null, 2)}\n`);
});

test.each(["\n", "\r\n", "\r"])(
  "reports semantic paths without source lines with %j line endings",
  (newline) => {
    const text = JSON.stringify(
      schemaWith(
        { ...number("first"), type: "slider" },
        { ...number("second"), type: "slider" },
      ),
      null,
      2,
    ).replaceAll("\n", newline);
    const result = validateSchema(text);
    if (result.valid) throw new Error("Expected type errors");
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: "sections[0].fields[0].type",
        line: null,
      }),
      expect.objectContaining({
        path: "sections[0].fields[1].type",
        line: null,
      }),
    ]);
  },
);

test("uses null instead of inventing a line for a missing property", () => {
  expect(errorsFor(schemaWith({ id: "name", type: "text" }))).toEqual([
    expect.objectContaining({
      path: "sections[0].fields[0].label",
      line: null,
    }),
  ]);
});

test.each(["", '{\n "sections": [}', '{"sections":[],}', "/* comment */ {}"])(
  "returns a syntax error without a partial schema: %j",
  (text) => {
    expect(validateSchema(text)).toMatchObject({
      valid: false,
      schema: null,
      summary: null,
      errors: [
        expect.objectContaining({
          path: "schema_text",
          line: expect.any(Number),
        }),
      ],
    });
  },
);
