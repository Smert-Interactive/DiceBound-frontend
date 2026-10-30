import * as versionsApi from "../mocks/characterVersions";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import { ApiError } from "../api/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
  vi.restoreAllMocks();
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

test("saving uses the returned details even without updating the source store", async () => {
  const before = getMockCharacterDetails(aldricId, MOCK_USER.email)!;
  const response = {
    ...before,
    current_version_number: 42,
    updated_at: "2030-01-01T00:00:00Z",
    data: { ...before.data, name: "Server result", str: 17, str_modifier: 3 },
  };
  vi.spyOn(versionsApi, "saveMockCharacterVersion").mockResolvedValue(response);
  const { user } = renderCharacter(aldricId);
  fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), {
    target: { value: "Draft" },
  });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByRole("textbox", { name: "Имя" })).toHaveValue(
    "Server result",
  );
  expect(screen.getByRole("textbox", { name: "STR" })).toHaveValue("17");
  expect(screen.getByRole("textbox", { name: "Имя" })).not.toHaveAttribute(
    "data-changed",
  );
  expect(screen.getAllByText(/Версия\s*42/u).length).toBeGreaterThan(0);
});

test("422 details attach to a field without losing its draft", async () => {
  vi.spyOn(versionsApi, "saveMockCharacterVersion").mockRejectedValue(
    new ApiError(422, "VALIDATION_ERROR", "Invalid data", [
      { field: "data.str", message: "Сервер отклонил значение" },
    ]),
  );
  const { user } = renderCharacter(aldricId);
  fireEvent.change(screen.getByRole("textbox", { name: "STR" }), {
    target: { value: "16" },
  });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(
    await screen.findByText("Сервер отклонил значение"),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "STR" })).toHaveValue("16");
  expect(screen.getByRole("textbox", { name: "STR" })).toBeInvalid();
  fireEvent.change(screen.getByRole("textbox", { name: "STR" }), {
    target: { value: "15" },
  });
  expect(
    screen.queryByText("Сервер отклонил значение"),
  ).not.toBeInTheDocument();
});
