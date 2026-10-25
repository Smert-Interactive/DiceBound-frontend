import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
import * as characterDetails from "../mocks/characterDetails";
import * as characters from "../mocks/characters";

const characterId = characters.MOCK_CHARACTERS.owned[0].id;

beforeEach(() => {
  const character = characterDetails.getMockCharacterDetails(characterId)!;
  const summary = characters.MOCK_CHARACTERS.owned[0];
  // VIEW с открытой историей нужен только этим сценариям. Основные mock-персонажи не меняем.
  vi.spyOn(characterDetails, "getMockCharacterDetails").mockImplementation(
    (id) =>
      id === characterId
        ? {
            ...character,
            access: "VIEW",
            can_edit: false,
            can_view_history: true,
          }
        : undefined,
  );
  vi.spyOn(characters, "getMockCharacterList").mockImplementation((email) => ({
    owned: [],
    shared_view:
      email === MOCK_USER.email ? [{ ...summary, access: "VIEW" }] : [],
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderView(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={MOCK_USER}>
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
    const character = characterDetails.getMockCharacterDetails(characterId)!;
    vi.mocked(characterDetails.getMockCharacterDetails).mockReturnValue({
      ...character,
      can_view_history: false,
    });
    renderView(generatePath(ROUTES.character, { id: characterId }));
    expect(screen.getByRole("heading", { name: "Aldric" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "История" })).toBeNull();
  });

  test("a direct version URL cannot bypass a closed history", () => {
    const character = characterDetails.getMockCharacterDetails(characterId)!;
    vi.mocked(characterDetails.getMockCharacterDetails).mockReturnValue({
      ...character,
      can_view_history: false,
    });
    renderView(
      generatePath(ROUTES.characterVersion, { id: characterId, version: "4" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aldric" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Восстановить/u })).toBeNull();
  });
});
