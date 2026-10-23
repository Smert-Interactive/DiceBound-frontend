import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  formatCalculatedValue,
  getCalculatedHint,
  getDependencyError,
} from "../sheet/calculatedField";
import SheetCalculatedField from "../sheet/fields/SheetCalculatedField";
import type { CalculatedField } from "../sheet/sheetTypes";

const modifierField: CalculatedField = {
  id: "str_modifier",
  type: "calculated",
  label: "STR Modifier",
  formula: "floor((str - 10) / 2)",
};

describe("formatCalculatedValue", () => {
  test("a modifier gets a sign, a plain number does not", () => {
    expect(formatCalculatedValue(3, true)).toBe("+3");
    expect(formatCalculatedValue(0, true)).toBe("+0");
    expect(formatCalculatedValue(-1, true)).toBe("−1");
    expect(formatCalculatedValue(17, false)).toBe("17");
    expect(formatCalculatedValue(-1, false)).toBe("-1");
  });

  test("shows a dash when the value cannot be computed", () => {
    expect(formatCalculatedValue(undefined, true)).toBe("—");
    expect(formatCalculatedValue(NaN, false)).toBe("—");
    expect(formatCalculatedValue(Infinity, true)).toBe("—");
  });

  test("rounds fractions to two digits", () => {
    expect(formatCalculatedValue(1 / 3, false)).toBe("0.33");
    expect(formatCalculatedValue(2.5, false)).toBe("2.5");
    // Малое отрицательное округляется в ноль и не должно давать «−0».
    expect(formatCalculatedValue(-0.001, true)).toBe("+0");
  });
});

describe("calculated texts", () => {
  test("the hint lists the fields the formula depends on", () => {
    expect(getCalculatedHint(["STR"])).toBe(
      "Не редактируется, пересчитывается при изменении STR",
    );
    expect(getCalculatedHint(["STR", "DEX"])).toBe(
      "Не редактируется, пересчитывается при изменении STR, DEX",
    );
    expect(getCalculatedHint([])).toBe("Не редактируется");
  });

  test("the dependency error names the broken fields", () => {
    expect(getDependencyError(["STR"])).toBe(
      "Зависит от STR: исправьте значение",
    );
  });
});

describe("SheetCalculatedField", () => {
  test("a dependency error replaces the value with a dash and the hint", () => {
    render(
      <SheetCalculatedField
        field={modifierField}
        value={3}
        signed
        dependsOn={["STR"]}
        error={getDependencyError(["STR"])}
      />,
    );

    const group = screen.getByRole("group", { name: "STR Modifier" });
    expect(group).toHaveTextContent("—");
    expect(group).not.toHaveTextContent("+3");
    expect(group).toHaveAccessibleDescription(
      "Зависит от STR: исправьте значение",
    );
  });

  test("read-only shows the snapshot value instead of the formula and hint", () => {
    render(
      <SheetCalculatedField
        field={modifierField}
        value={3}
        signed
        dependsOn={["STR"]}
        readOnly
      />,
    );

    const group = screen.getByRole("group", { name: "STR Modifier" });
    expect(group).toHaveTextContent("+3");
    expect(group).toHaveTextContent("из snapshot");
    expect(group).not.toHaveTextContent("floor");
    expect(group).not.toHaveAccessibleDescription();
  });

  test("editing mode shows the formula and the hint", () => {
    render(
      <SheetCalculatedField
        field={modifierField}
        value={3}
        signed
        dependsOn={["STR"]}
      />,
    );

    const group = screen.getByRole("group", { name: "STR Modifier" });
    expect(group).toHaveTextContent("floor((str - 10) / 2)");
    expect(group).toHaveAccessibleDescription(
      "Не редактируется, пересчитывается при изменении STR",
    );
  });
});
