import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import SheetSelectField from "../sheet/fields/SheetSelectField";
import type { SelectField, TextField } from "../sheet/sheetTypes";
import { validateField } from "../sheet/validateField";

const nameField: TextField = {
  id: "name",
  type: "text",
  label: "Имя",
  required: true,
  maxLength: 40,
};

const classField: SelectField = {
  id: "class",
  type: "select",
  label: "Класс",
  options: [
    { value: "fighter", label: "Fighter" },
    { value: "wizard", label: "Wizard" },
  ],
};

describe("validateField: text", () => {
  test("a required field rejects an empty or blank value", () => {
    expect(validateField(nameField, "")).toBe("Обязательное поле");
    expect(validateField(nameField, "   ")).toBe("Обязательное поле");
    expect(validateField(nameField, undefined)).toBe("Обязательное поле");
  });

  test("an optional field may stay empty", () => {
    const optional: TextField = { id: "note", type: "text", label: "Заметка" };

    expect(validateField(optional, "")).toBeUndefined();
  });

  test("maxLength allows exactly the limit and rejects one more", () => {
    expect(validateField(nameField, "a".repeat(40))).toBeUndefined();
    expect(validateField(nameField, "a".repeat(41))).toBe(
      "Не длиннее 40 символов",
    );
  });
});

describe("validateField: select", () => {
  test("accepts only a value from options", () => {
    expect(validateField(classField, "wizard")).toBeUndefined();
    expect(validateField(classField, "paladin")).toBe(
      "Значение не из списка options",
    );
    expect(validateField(classField, undefined)).toBe(
      "Значение не из списка options",
    );
  });
});

describe("SheetSelectField", () => {
  test("a value outside options shows the empty option with the error", () => {
    render(
      <SheetSelectField
        field={classField}
        value="paladin"
        onChange={() => undefined}
        error="Значение не из списка options"
      />,
    );

    const select = screen.getByLabelText("Класс");
    expect(select).toHaveValue("");
    expect(
      screen.getByRole("option", { name: "Не выбрано" }),
    ).toBeInTheDocument();
    expect(select).toHaveAccessibleDescription("Значение не из списка options");
  });

  test("a known value does not add the empty option", () => {
    render(
      <SheetSelectField
        field={classField}
        value="wizard"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Класс")).toHaveValue("wizard");
    expect(screen.queryByRole("option", { name: "Не выбрано" })).toBeNull();
  });
});
