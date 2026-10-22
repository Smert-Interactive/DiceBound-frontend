import { useState } from "react";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SheetResourceField from "../sheet/fields/SheetResourceField";
import {
  getResourceError,
  getResourceRatio,
  toResourceDraft,
} from "../sheet/resourceField";
import type { ResourceDraft } from "../sheet/resourceField";
import type { ResourceField } from "../sheet/sheetTypes";
import { validateField } from "../sheet/validateField";

const hpField: ResourceField = {
  id: "hp",
  type: "resource",
  label: "HP",
  min: 0,
};

describe("getResourceError", () => {
  test("accepts current between min and max", () => {
    expect(getResourceError(hpField, { current: 21, max: 28 })).toBeUndefined();
    expect(getResourceError(hpField, { current: 0, max: 28 })).toBeUndefined();
    expect(getResourceError(hpField, { current: 28, max: 28 })).toBeUndefined();
  });

  test("current outside min…max points at the current field", () => {
    expect(getResourceError(hpField, { current: 29, max: 28 })).toEqual({
      message: "Допустимо от 0 до 28",
      target: "current",
    });
    expect(getResourceError(hpField, { current: -1, max: 28 })?.target).toBe(
      "current",
    );
  });

  test("a missing number says so and points at the empty field", () => {
    expect(getResourceError(hpField, { current: "", max: "28" })).toEqual({
      message: "Нужно число в current и max",
      target: "current",
    });
    expect(getResourceError(hpField, { current: "5", max: "" })?.target).toBe(
      "max",
    );
  });

  test("max below min reuses the one-bound message on the max field", () => {
    const skill: ResourceField = { ...hpField, min: 5 };

    expect(getResourceError(skill, { current: 5, max: 3 })).toEqual({
      message: "Не меньше 5",
      target: "max",
    });
  });

  test("without min only the upper bound is checked", () => {
    const free: ResourceField = { id: "x", type: "resource", label: "X" };

    expect(getResourceError(free, { current: 29, max: 28 })?.message).toBe(
      "Не больше 28",
    );
    expect(getResourceError(free, { current: 0, max: 28 })).toBeUndefined();
  });
});

describe("getResourceRatio", () => {
  test("is the share of current in max", () => {
    expect(getResourceRatio({ current: 21, max: 28 })).toBeCloseTo(0.75);
    expect(getResourceRatio({ current: "14", max: "28" })).toBeCloseTo(0.5);
  });

  test("stays inside 0…1 and is empty for broken values", () => {
    expect(getResourceRatio({ current: 30, max: 28 })).toBe(1);
    expect(getResourceRatio({ current: -3, max: 28 })).toBe(0);
    expect(getResourceRatio({ current: 5, max: 0 })).toBe(0);
    expect(getResourceRatio({ current: "", max: "28" })).toBe(0);
  });
});

describe("validateField: resource", () => {
  test("validates both saved data and the typed draft", () => {
    expect(validateField(hpField, { current: 21, max: 28 })).toBeUndefined();
    expect(validateField(hpField, { current: "30", max: "28" })).toBe(
      "Допустимо от 0 до 28",
    );
  });

  test("a missing value counts as empty current and max", () => {
    expect(validateField(hpField, undefined)).toBe(
      "Нужно число в current и max",
    );
  });
});

describe("SheetResourceField", () => {
  function Hp({ initial }: { initial: ResourceDraft }) {
    const [value, setValue] = useState(initial);
    const error = validateField(hpField, value);

    return (
      <SheetResourceField
        field={hpField}
        value={value}
        onChange={setValue}
        error={error}
      />
    );
  }

  test("the error sticks to the field it is about and hides the bar", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Hp initial={toResourceDraft({ current: 21, max: 28 })} />,
    );
    expect(container.querySelector(".sheet-resource__bar")).not.toBeNull();

    await user.clear(screen.getByLabelText("HP: текущее"));

    const current = screen.getByLabelText("HP: текущее");
    expect(current).toBeInvalid();
    expect(current).toHaveAccessibleDescription("Нужно число в current и max");
    expect(screen.getByLabelText("HP: максимум")).toBeValid();
    expect(container.querySelector(".sheet-resource__bar")).toBeNull();
  });

  test("letters are dropped and a too large current is reported", async () => {
    const user = userEvent.setup();
    render(<Hp initial={toResourceDraft({ current: 21, max: 28 })} />);

    await user.clear(screen.getByLabelText("HP: текущее"));
    await user.type(screen.getByLabelText("HP: текущее"), "3x0");

    expect(screen.getByLabelText("HP: текущее")).toHaveValue("30");
    expect(screen.getByLabelText("HP: текущее")).toHaveAccessibleDescription(
      "Допустимо от 0 до 28",
    );
  });

  test("read-only mode shows one plate and no inputs", () => {
    render(
      <SheetResourceField
        field={hpField}
        value={toResourceDraft({ current: 21, max: 28 })}
        onChange={() => undefined}
        readOnly
      />,
    );

    expect(screen.getByRole("group", { name: "HP" })).toHaveTextContent(
      "21 / 28",
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
