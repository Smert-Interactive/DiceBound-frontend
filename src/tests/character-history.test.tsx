import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
import { ROUTES } from "../constants/routes";

import { MOCK_USER } from "../auth/authContext";
import { getMockCharacterDetails } from "../mocks/characterDetails";
import { getMockCharacterVersions } from "../mocks/characterVersions";
import { MOCK_CHARACTERS } from "../mocks/characters";

const aldricId = MOCK_CHARACTERS.owned[0].id;
const sarahId = MOCK_CHARACTERS.owned[1].id;

describe("mock version history", () => {
  test.each([aldricId, sarahId])(
    "returns every version from newest to oldest for %s",
    (characterId) => {
      const character = getMockCharacterDetails(characterId)!;
      const versions = getMockCharacterVersions(characterId, MOCK_USER.email)!;
      const count = character.current_version_number;

      expect(versions.map((version) => version.version_number)).toEqual(
        Array.from({ length: count }, (_, index) => count - index),
      );
      expect(versions.filter((version) => version.is_current)).toEqual([
        versions[0],
      ]);
      expect(Date.parse(versions[0].created_at)).toBe(
        Date.parse(character.updated_at),
      );
      expect(Date.parse(versions.at(-1)!.created_at)).toBe(
        Date.parse(character.created_at),
      );
      expect(new Set(versions.map((version) => version.id)).size).toBe(count);
    },
  );

  test("does not expose another account's history or an unknown character", () => {
    expect(
      getMockCharacterVersions(aldricId, "new@example.com"),
    ).toBeUndefined();
    expect(
      getMockCharacterVersions("missing", MOCK_USER.email),
    ).toBeUndefined();
  });

  test("does not expose VIEW history when it is not shared", () => {
    const shared = MOCK_CHARACTERS.shared_view[0];
    expect(
      getMockCharacterVersions(shared.id, MOCK_USER.email),
    ).toBeUndefined();
  });

  test("returns copies so a caller cannot modify the stored list", () => {
    const first = getMockCharacterVersions(aldricId, MOCK_USER.email)!;
    first[0].version_number = 100;
    first.pop();

    const second = getMockCharacterVersions(aldricId, MOCK_USER.email)!;
    expect(second).toHaveLength(7);
    expect(second[0].version_number).toBe(7);
  });
});

// В jsdom нет методов нативного dialog; подмена такая же, как в тестах других окон.
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

function renderCharacter(email = MOCK_USER.email) {
  const router = createMemoryRouter(routes, {
    initialEntries: [generatePath(ROUTES.character, { id: aldricId })],
  });
  render(
    <AuthProvider initialUser={{ ...MOCK_USER, email }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

describe("character history tab", () => {
  test("shows ordered versions, current and creation labels after switching tabs", async () => {
    const { user } = renderCharacter();
    expect(screen.queryByRole("region", { name: "История версий" })).toBeNull();
    await user.click(screen.getByRole("tab", { name: "История" }));

    const list = screen.getByRole("region", { name: "История версий" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(7);
    expect(within(rows[0]).getByText("Версия 7")).toBeInTheDocument();
    expect(within(rows[0]).getByText("текущая")).toBeInTheDocument();
    expect(
      within(rows[0]).queryByRole("button", { name: /Восстановить/u }),
    ).toBeNull();
    expect(within(rows[6]).getByText("создание персонажа")).toBeInTheDocument();
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(
      [7, 6, 5, 4, 3, 2, 1].map((version) =>
        generatePath(ROUTES.characterVersion, {
          id: aldricId,
          version: String(version),
        }),
      ),
    );
    expect(
      screen.getByRole("complementary", { name: "Как работает история" }),
    ).toHaveTextContent("Удалённые версии вернуть нельзя");
  });

  test("returns from the character history to the character list", async () => {
    const { user, router } = renderCharacter();
    await user.click(screen.getByRole("tab", { name: "История" }));
    await user.click(screen.getByRole("link", { name: "К персонажам" }));
    expect(router.state.location.pathname).toBe(ROUTES.characters);
    expect(
      screen.getByRole("heading", { name: "Персонажи", level: 1 }),
    ).toBeInTheDocument();
  });

  test("opens restoration from history and cancels without changing versions", async () => {
    const { user } = renderCharacter();
    await user.click(screen.getByRole("tab", { name: "История" }));
    const trigger = screen.getByRole("button", {
      name: "Восстановить версию 4",
    });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", {
      name: "Восстановить версию 4?",
    });
    const timeline = within(dialog).getByRole("list", {
      name: "Последствия восстановления версий",
    });
    expect(
      within(timeline)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual([
      "Версия 1 — сохранится",
      "Версия 2 — сохранится",
      "Версия 3 — сохранится",
      "Версия 4 — станет текущей",
      "Версия 5 — будет удалена",
      "Версия 6 — будет удалена",
      "Версия 7 — будет удалена",
    ]);
    expect(
      within(dialog).getByRole("button", { name: "Отмена" }),
    ).toHaveFocus();
    // Подтверждение появилось, но обработчик изменения данных ещё не подключён.
    expect(
      within(dialog).getByRole("button", { name: /Восстановить и удалить/u }),
    ).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
    expect(
      within(
        screen.getByRole("region", { name: "История версий" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(7);

    // Повторное открытие выбирает другую цель, Escape также только отменяет действие.
    await user.click(
      screen.getByRole("button", { name: "Восстановить версию 2" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Восстановить версию 2?" }),
    ).toBeInTheDocument();
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getMockCharacterVersions(aldricId, MOCK_USER.email)).toHaveLength(7);
  });

  test("opens the selected version route", async () => {
    const { user, router } = renderCharacter();
    await user.click(screen.getByRole("tab", { name: "История" }));
    await user.click(screen.getByRole("link", { name: "Открыть версию 3" }));
    expect(router.state.location.pathname).toBe(
      generatePath(ROUTES.characterVersion, { id: aldricId, version: "3" }),
    );
  });

  test("does not show another user's character or history through a direct URL", () => {
    renderCharacter("new@example.com");
    expect(
      screen.getByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aldric" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "История" })).toBeNull();
  });
});
