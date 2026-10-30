import { useState } from "react";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SheetNumberField from "../sheet/fields/SheetNumberField";
import { formatModifier } from "../sheet/formatModifier";
import {
  formatRange,
  parseNumber,
  sanitizeNumberInput,
  stepNumber,
} from "../sheet/numberField";
import type { NumberField } from "../sheet/sheetTypes";
import { validateField } from "../sheet/validateField";

const strField: NumberField = {
  id: "str",
  type: "number",
  label: "STR",
  required: true,
  min: 1,
  max: 30,
};

describe("formatModifier", () => {
  test("always shows a sign and uses the typographic minus", () => {
    expect(formatModifier(3)).toBe("+3");
    expect(formatModifier(0)).toBe("+0");
    expect(formatModifier(-1)).toBe("−1");
    expect(formatModifier(-1)).not.toBe("-1");
  });

  test("negative zero is shown as +0", () => {
    expect(formatModifier(-0)).toBe("+0");
  });
});

describe("number input helpers", () => {
  test("typing keeps only digits", () => {
    expect(sanitizeNumberInput("1a6", strField)).toBe("16");
    expect(sanitizeNumberInput("", strField)).toBe("");
    // Минус не нужен, пока схема не допускает отрицательные значения.
    expect(sanitizeNumberInput("-5", strField)).toBe("5");
  });

  test("a leading minus is kept when the schema allows negative values", () => {
    expect(sanitizeNumberInput("-5", { min: -10, max: 10 })).toBe("-5");
    expect(sanitizeNumberInput("-", {})).toBe("-");
    expect(sanitizeNumberInput("5-3", {})).toBe("53");
  });

  test("a fractional part is typed with a dot or a comma, one separator at most", () => {
    expect(sanitizeNumberInput("1.5", {})).toBe("1.5");
    expect(sanitizeNumberInput("1,5", {})).toBe("1,5");
    expect(sanitizeNumberInput("1.5.2", {})).toBe("1.52");
    expect(sanitizeNumberInput("1,5.2", {})).toBe("1,52");
    expect(sanitizeNumberInput("2.x5", {})).toBe("2.5");
    expect(sanitizeNumberInput("-1.5", { min: -10 })).toBe("-1.5");
    expect(sanitizeNumberInput("-1.5", strField)).toBe("1.5");
  });

  test("a separator without digits before it gets a zero", () => {
    expect(sanitizeNumberInput(".", {})).toBe("0.");
    expect(sanitizeNumberInput(",5", {})).toBe("0,5");
  });

  test("parses dot and comma into the same number", () => {
    expect(parseNumber("1.5")).toBe(1.5);
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("-0.25")).toBe(-0.25);
    expect(parseNumber("16")).toBe(16);
    // Пока набирают «1.5», промежуточное «1.» не должно мигать ошибкой.
    expect(parseNumber("1.")).toBe(1);
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber("-")).toBeUndefined();
    expect(parseNumber(".5")).toBe(0.5);
    expect(parseNumber("1.5.2")).toBeUndefined();
  });

  test("steps a fractional value by one without a binary tail", () => {
    expect(stepNumber("1.5", 1, {})).toBe("2.5");
    expect(stepNumber("1,5", -1, {})).toBe("0.5");
    expect(stepNumber("4.35", 1, {})).toBe("5.35");
    expect(stepNumber("0.7", 1, {})).toBe("1.7");
    expect(stepNumber("1.1", 1, { max: 1.5 })).toBe("1.5");
  });

  test("an empty field starts from a fractional min as it is", () => {
    expect(stepNumber("", 1, { min: 0.25 })).toBe("0.25");
  });

  test("steps by one and stays inside min and max", () => {
    expect(stepNumber("16", 1, strField)).toBe("17");
    expect(stepNumber("16", -1, strField)).toBe("15");
    expect(stepNumber("30", 1, strField)).toBe("30");
    expect(stepNumber("1", -1, strField)).toBe("1");
  });

  test("a value outside the range is pulled back inside by either button", () => {
    expect(stepNumber("31", -1, strField)).toBe("30");
    expect(stepNumber("31", 1, strField)).toBe("30");
    expect(stepNumber("0", 1, strField)).toBe("1");
  });

  test("an empty field starts from min, or 0 without one", () => {
    expect(stepNumber("", 1, strField)).toBe("1");
    expect(stepNumber("", -1, strField)).toBe("1");
    expect(stepNumber("-", 1, {})).toBe("0");
  });

  test("the range label needs both bounds", () => {
    expect(formatRange(strField)).toBe("1–30");
    expect(formatRange({ min: 1 })).toBeUndefined();
    expect(formatRange({})).toBeUndefined();
  });
});

describe("validateField: number", () => {
  test("rejects values outside min and max with the range message", () => {
    expect(validateField(strField, 16)).toBeUndefined();
    expect(validateField(strField, 1)).toBeUndefined();
    expect(validateField(strField, 30)).toBeUndefined();
    expect(validateField(strField, 31)).toBe("Допустимо от 1 до 30");
    expect(validateField(strField, 0)).toBe("Допустимо от 1 до 30");
  });

  test("accepts the raw string that is typed into the field", () => {
    expect(validateField(strField, "16")).toBeUndefined();
    expect(validateField(strField, "31")).toBe("Допустимо от 1 до 30");
    expect(validateField(strField, "")).toBe("Допустимо от 1 до 30");
  });

  test("accepts fractional values inside the range, with a dot or a comma", () => {
    expect(validateField(strField, 1.5)).toBeUndefined();
    expect(validateField(strField, "1.5")).toBeUndefined();
    expect(validateField(strField, "1,5")).toBeUndefined();
    expect(validateField(strField, "0.5")).toBe("Допустимо от 1 до 30");
    expect(validateField(strField, "30,5")).toBe("Допустимо от 1 до 30");
  });

  test("one bound gives a shorter message", () => {
    const level: NumberField = {
      id: "lvl",
      type: "number",
      label: "L",
      min: 1,
    };
    const cap: NumberField = { id: "cap", type: "number", label: "C", max: 9 };

    expect(validateField(level, 0)).toBe("Не меньше 1");
    expect(validateField(level, 500)).toBeUndefined();
    expect(validateField(cap, 10)).toBe("Не больше 9");
  });
});

describe("SheetNumberField counter", () => {
  function Counter({ initial }: { initial: string }) {
    const [value, setValue] = useState(initial);

    return (
      <SheetNumberField
        field={strField}
        value={value}
        onChange={setValue}
        counter
      />
    );
  }

  test("buttons change the value and never leave the range", async () => {
    const user = userEvent.setup();
    render(<Counter initial="30" />);

    await user.click(screen.getByRole("button", { name: "Увеличить STR" }));
    expect(screen.getByLabelText("STR")).toHaveValue("30");

    await user.click(screen.getByRole("button", { name: "Уменьшить STR" }));
    expect(screen.getByLabelText("STR")).toHaveValue("29");
  });

  test("typed letters are dropped", async () => {
    const user = userEvent.setup();
    render(<Counter initial="" />);

    await user.type(screen.getByLabelText("STR"), "1x6");

    expect(screen.getByLabelText("STR")).toHaveValue("16");
  });
});
