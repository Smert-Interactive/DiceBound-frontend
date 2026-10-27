import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import DynamicSheetRenderer from "../sheet/DynamicSheetRenderer";
import type { SheetDraft } from "../sheet/sheetDraft";
import type { SheetSchemaBody } from "../sheet/sheetTypes";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Схема с шестью типами полей. Игровой системы здесь нет: renderer работает по схеме.
const schema: SheetSchemaBody = {
  sections: [
    {
      id: "basic",
      label: "Основное",
      fields: [
        { id: "name", type: "text", label: "Имя" },
        {
          id: "class",
          type: "select",
          label: "Класс",
          options: [
            { value: "fighter", label: "Fighter" },
            { value: "wizard", label: "Wizard" },
          ],
        },
        { id: "inspired", type: "checkbox", label: "Вдохновение" },
      ],
    },
    {
      id: "stats",
      label: "Показатели",
      fields: [
        { id: "str", type: "number", label: "STR", min: 1, max: 30 },
        {
          id: "bonus",
          type: "calculated",
          label: "Бонус",
          formula: "floor((str - 10) / 2)",
        },
        { id: "hp", type: "resource", label: "HP", min: 0 },
      ],
    },
  ],
};

const draft: SheetDraft = {
  name: "Aldric",
  class: "fighter",
  inspired: false,
  str: "16",
  hp: { current: "21", max: "28" },
};

function renderSheet(
  props: Partial<Parameters<typeof DynamicSheetRenderer>[0]> = {},
) {
  return render(
    <DynamicSheetRenderer
      schema={schema}
      draft={draft}
      calculated={{ bonus: 3 }}
      {...props}
    />,
  );
}

describe("DynamicSheetRenderer", () => {
  test("reports the field id and the new value for each edit", () => {
    const onChange = vi.fn();
    renderSheet({ onChange });

    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), {
      target: { value: "Merlin" },
    });
    expect(onChange).toHaveBeenLastCalledWith("name", "Merlin");

    fireEvent.change(screen.getByRole("combobox", { name: "Класс" }), {
      target: { value: "wizard" },
    });
    expect(onChange).toHaveBeenLastCalledWith("class", "wizard");

    fireEvent.click(screen.getByRole("checkbox", { name: "Вдохновение" }));
    expect(onChange).toHaveBeenLastCalledWith("inspired", true);

    fireEvent.change(screen.getByRole("textbox", { name: "HP: текущее" }), {
      target: { value: "20" },
    });
    expect(onChange).toHaveBeenLastCalledWith("hp", {
      current: "20",
      max: "28",
    });
  });

  test("a standalone calculated field shows a plain number and names its dependencies", () => {
    renderSheet({
      schema: {
        sections: [
          {
            id: "s",
            label: "Секция",
            fields: [
              { id: "str", type: "number", label: "STR" },
              { id: "note", type: "text", label: "Заметка" },
              {
                id: "total",
                type: "calculated",
                label: "Итог",
                formula: "str + 1",
              },
            ],
          },
        ],
      },
      draft: { str: "16", note: "" },
      calculated: { total: 17 },
    });
    // Знак бывает только у пары «значение | модификатор»; одиночное поле — число без знака.
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(
      screen.getByText(/пересчитывается при изменении STR/u),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Увеличить/u })).toBeNull();
  });

  test("shows a dash when the calculated value cannot be computed", () => {
    renderSheet({ calculated: { bonus: undefined } });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("read-only mode leaves no editable controls", () => {
    renderSheet({ readOnly: true });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("missing draft values give empty fields instead of an error", () => {
    renderSheet({ draft: {} });
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue("");
    expect(
      screen.getByRole("checkbox", { name: "Вдохновение" }),
    ).not.toBeChecked();
    expect(screen.getByRole("textbox", { name: "HP: максимум" })).toHaveValue(
      "",
    );
  });
});

describe("pairs of a value and its modifier", () => {
  test("a number followed by the calculated field that uses it gets a counter and a signed modifier", () => {
    const onChange = vi.fn();
    renderSheet({ onChange });
    expect(screen.getByText("+3")).toBeInTheDocument();
    // Формула стоит под плашкой, подсказки «пересчитывается при изменении» в паре нет.
    expect(screen.getByText("floor((str - 10) / 2)")).toBeInTheDocument();
    expect(screen.queryByText(/пересчитывается при изменении/u)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Увеличить STR" }));
    expect(onChange).toHaveBeenLastCalledWith("str", "17");
    fireEvent.click(screen.getByRole("button", { name: "Уменьшить STR" }));
    expect(onChange).toHaveBeenLastCalledWith("str", "15");
  });

  test("negative and zero modifiers use the typographic minus and an explicit plus", () => {
    const { rerender } = renderSheet({ calculated: { bonus: -1 } });
    expect(screen.getByText("−1")).toBeInTheDocument();
    rerender(
      <DynamicSheetRenderer
        schema={schema}
        draft={draft}
        calculated={{ bonus: 0 }}
      />,
    );
    expect(screen.getByText("+0")).toBeInTheDocument();
  });

  test("an invalid value shows its error and a dash instead of the modifier", () => {
    renderSheet({
      draft: { ...draft, str: "31" },
      errors: { str: "Допустимо от 1 до 30" },
      calculated: { bonus: undefined },
    });
    expect(screen.getByRole("textbox", { name: "STR" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Допустимо от 1 до 30")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("only a section with pairs explains that modifiers are calculated", () => {
    renderSheet();
    expect(
      screen.getAllByText(/Модификаторы вычисляются автоматически/u),
    ).toHaveLength(1);
  });

  test("on a phone the section caption names the columns instead", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((media: string) => ({
        matches: media === "(max-width: 639px)",
        media,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    renderSheet();
    expect(screen.getByText("значение · модиф.")).toBeInTheDocument();
    expect(screen.queryByText(/вычисляются автоматически/u)).toBeNull();
  });

  test("in read-only mode the pair has no counter and the modifier keeps its formula", () => {
    renderSheet({ readOnly: true });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/floor/u)).toBeInTheDocument();
    expect(screen.queryByText("из snapshot")).toBeNull();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });
});
