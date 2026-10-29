import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import { ROUTES } from "../constants/routes";
import { MOCK_CHARACTERS } from "../mocks/characters";

// Восстановление ниже меняет историю Sarah в памяти модуля, поэтому тесты файла берут
// разных персонажей: Aldric правится только на экране, Sarah восстанавливается.
const aldricId = MOCK_CHARACTERS.owned[0].id;
const sarahId = MOCK_CHARACTERS.owned[1].id;

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function renderCharacter(id: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [generatePath(ROUTES.character, { id })],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

describe("the sheet tab", () => {
  test("shows the character data on the sheet", () => {
    renderCharacter(aldricId);
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue("Aldric");
    expect(screen.getByRole("combobox", { name: "Класс" })).toHaveValue(
      "fighter",
    );
    expect(screen.getByRole("textbox", { name: "STR" })).toHaveValue("10");
    expect(screen.getByRole("textbox", { name: "HP: текущее" })).toHaveValue(
      "21",
    );
    // Сохранённый модификатор CHA 8 с типографским минусом.
    expect(screen.getByText("−1")).toBeInTheDocument();
  });

  test("builds a different sheet from another schema", () => {
    renderCharacter(sarahId);
    expect(screen.getByRole("textbox", { name: "Профессия" })).toHaveValue(
      "Журналист",
    );
    expect(
      screen.getByRole("textbox", { name: "Sanity: текущее" }),
    ).toHaveValue("48");
    // У CoC нет пар «значение | модификатор».
    expect(screen.queryByText(/Модификаторы вычисляются/u)).toBeNull();
  });

  test("an edit is marked as changed and survives a switch of tabs", async () => {
    const { user } = renderCharacter(aldricId);
    const name = screen.getByRole("textbox", { name: "Имя" });
    expect(name).not.toHaveAttribute("data-changed");

    fireEvent.change(name, { target: { value: "Merlin" } });
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveAttribute(
      "data-changed",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "История" }));
    expect(screen.queryByRole("textbox", { name: "Имя" })).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Лист" }));

    const again = screen.getByRole("textbox", { name: "Имя" });
    expect(again).toHaveValue("Merlin");
    expect(again).toHaveAttribute("data-changed", "true");
  });

  test("the counter of a pair edits the value", async () => {
    const { user } = renderCharacter(aldricId);
    await user.click(screen.getByRole("button", { name: "Увеличить DEX" }));
    expect(screen.getByRole("textbox", { name: "DEX" })).toHaveValue("13");
    expect(screen.getByRole("textbox", { name: "DEX" })).toHaveAttribute(
      "data-changed",
      "true",
    );
  });

  test("after a restoration the sheet shows the restored data", async () => {
    const { user } = renderCharacter(sarahId);
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), {
      target: { value: "Edited" },
    });

    await user.click(screen.getByRole("tab", { name: "История" }));
    await user.click(
      screen.getByRole("button", { name: "Восстановить версию 2" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /Восстановить и удалить/u,
      }),
    );

    // v2 хранит HP 10 / 11, правка имени до восстановления пропадает вместе с черновиком.
    expect(
      await screen.findByRole(
        "textbox",
        { name: "HP: текущее" },
        { timeout: 3000 },
      ),
    ).toHaveValue("10");
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue(
      "Sarah Connor",
    );
    expect(screen.getByRole("textbox", { name: "Имя" })).not.toHaveAttribute(
      "data-changed",
    );
  });
});
