import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import * as characters from "../mocks/characters";

const characterId = characters.MOCK_CHARACTERS.owned[0].id;

afterEach(cleanup);

// Реальные выдачи: user@example.com видит историю Aldric, player@example.com — только лист.
function renderView(path: string, email = "user@example.com") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={{ ...MOCK_USER, email }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

describe("VIEW history permissions", () => {
  test("opens shared versions without offering restoration in either screen", async () => {
    const { user, router } = renderView(
      generatePath(ROUTES.character, { id: characterId }),
    );
    await user.click(screen.getByRole("tab", { name: "История" }));
    const history = screen.getByRole("region", { name: "История версий" });
    expect(within(history).getAllByRole("link")).toHaveLength(7);
    expect(
      screen.getByText(
        "Открывать старые версии можно, восстанавливать — только владельцу.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Доступ" })).toBeNull();

    await user.click(screen.getByRole("link", { name: "Открыть версию 4" }));
    expect(router.state.location.pathname).toBe(
      generatePath(ROUTES.characterVersion, { id: characterId, version: "4" }),
    );
    expect(
      screen.getByText("Только просмотр. Текущая версия персонажа — 7."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(
      screen.getAllByRole("link", { name: "К истории" }).at(-1)!,
    );
    expect(screen.getByRole("tab", { name: "История" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
  });

  test("a direct version URL also has no restoration action", () => {
    renderView(
      generatePath(ROUTES.characterVersion, { id: characterId, version: "4" }),
    );
    expect(screen.getByRole("heading", { name: "Aldric" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("hides the tab when the owner does not share history", () => {
    renderView(
      generatePath(ROUTES.character, { id: characterId }),
      "player@example.com",
    );
    expect(screen.getByRole("heading", { name: "Aldric" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "История" })).toBeNull();
  });

  test("a direct version URL cannot bypass a closed history", () => {
    renderView(
      generatePath(ROUTES.characterVersion, { id: characterId, version: "4" }),
      "player@example.com",
    );
    expect(
      screen.getByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aldric" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
  });

  test.each(["editor@example.com", "nobody@example.com"])(
    "%s cannot open a source version without VIEW",
    (email) => {
      renderView(
        generatePath(ROUTES.characterVersion, {
          id: characterId,
          version: "4",
        }),
        email,
      );
      expect(
        screen.getByRole("heading", {
          name: "Персонаж не найден или доступ закрыт",
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Aldric" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Восстановить/u }),
      ).not.toBeInTheDocument();
    },
  );
});
