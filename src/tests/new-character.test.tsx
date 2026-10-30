import { installDataApi } from "./helpers/dataApi";
import * as systems from "../mocks/systems";
import * as characters from "../mocks/characters";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import { ROUTES } from "../constants/routes";

const NAME_HINT = "Введите имя, чтобы создать персонажа";

function renderNewCharacter() {
  installDataApi();
  const router = createMemoryRouter(routes, {
    initialEntries: [ROUTES.newCharacter],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("new character without a name", () => {
  test("the create button is unavailable, explained by the hint, and clicking does nothing", async () => {
    const { router, user } = renderNewCharacter();
    const create = await screen.findByRole("button", {
      name: "Создать персонажа",
    });

    expect(create).toHaveAttribute("aria-disabled", "true");
    expect(create).toHaveAccessibleDescription(NAME_HINT);

    await user.click(create);
    expect(router.state.location.pathname).toBe(ROUTES.newCharacter);
    expect(create).not.toHaveAttribute("aria-busy");
  });

  test("a name made of spaces still counts as empty", async () => {
    const { user } = renderNewCharacter();
    await user.type(await screen.findByLabelText("Имя персонажа"), "   ");

    expect(
      screen.getByRole("button", { name: "Создать персонажа" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

describe("creating a character", () => {
  test("system → name → create leads to the new character after a loading state", async () => {
    const { router, user } = renderNewCharacter();
    const summary = await screen.findByRole("complementary", {
      name: "Сводка",
    });
    // По умолчанию выбрана первая система с её листом.
    expect(within(summary).getByText("D&D 5e")).toBeInTheDocument();
    expect(within(summary).getByText("Базовый лист")).toBeInTheDocument();

    // Смена системы подставляет лист новой системы без ручного выбора.
    await user.click(screen.getByRole("radio", { name: /Call of Cthulhu/u }));
    expect(within(summary).getByText("Call of Cthulhu")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(summary).getByText("Сыщик")).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText("Имя персонажа"), "Aldric");
    expect(within(summary).getByText("Aldric")).toBeInTheDocument();
    const create = screen.getByRole("button", { name: "Создать персонажа" });
    expect(create).not.toHaveAttribute("aria-disabled");

    await user.click(create);
    const busy = await screen.findByRole("button", { name: "Создание…" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    // На время запроса «Отмена» перестаёт быть ссылкой (ui-ux: остальные кнопки недоступны).
    expect(
      screen.queryByRole("link", { name: "Отмена" }),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(ROUTES.characters),
    );
  });
});

describe("leaving the page", () => {
  test("cancel returns to the character list", async () => {
    const { router, user } = renderNewCharacter();
    await user.click(await screen.findByRole("link", { name: "Отмена" }));

    expect(router.state.location.pathname).toBe(ROUTES.characters);
  });
});

test("creates an openable character from the Space Frontier demo schema", async () => {
  const { router, user } = renderNewCharacter();
  await user.click(
    await screen.findByRole("radio", { name: /Space Frontier/u }),
  );
  await user.type(screen.getByLabelText("Имя персонажа"), "Nova");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  await screen.findByText("Персонаж «Nova» создан");
  expect(router.state.location.pathname).toBe(ROUTES.characters);
  expect(await screen.findByRole("link", { name: "Nova" })).toBeInTheDocument();
});

test("shows a creation failure, retains the draft and allows retry", async () => {
  const create = vi
    .spyOn(characters, "createMockCharacter")
    .mockRejectedValueOnce(new Error("offline"));
  const { user } = renderNewCharacter();
  await user.type(await screen.findByLabelText("Имя персонажа"), "Retry hero");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  const error = await screen.findByText(
    "Не удалось выполнить действие. Попробуйте ещё раз.",
  );
  expect(error.closest(".new-character__failure")).toHaveFocus();
  expect(screen.getByLabelText("Имя персонажа")).toHaveValue("Retry hero");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  await screen.findByText("Персонаж «Retry hero» создан");
  expect(create).toHaveBeenCalledTimes(2);
});

test("an empty systems response keeps creation unavailable", async () => {
  vi.spyOn(systems, "getMockSystems").mockReturnValue([]);
  const create = vi.spyOn(characters, "createMockCharacter");
  const { user } = renderNewCharacter();
  expect(
    await screen.findByText(/Доступных систем пока нет/u),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Имя персонажа"), "No system");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  expect(create).not.toHaveBeenCalled();
});

test("a system without schemas cannot create a character", async () => {
  vi.spyOn(systems, "getMockSchemas").mockReturnValue([]);
  const create = vi.spyOn(characters, "createMockCharacter");
  const { user } = renderNewCharacter();
  expect(await screen.findByText(/нет доступных листов/u)).toBeInTheDocument();
  await user.type(screen.getByLabelText("Имя персонажа"), "No sheet");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  expect(create).not.toHaveBeenCalled();
});
