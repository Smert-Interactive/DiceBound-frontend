import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";
import { ROUTES } from "../constants/routes";

// Открывает /characters с готовой сессией. Данные списка зависят от почты пользователя:
// у MOCK_USER это данные холста, у любой другой почты список пуст.
function renderCharacters(email = MOCK_USER.email) {
  const router = createMemoryRouter(routes, {
    initialEntries: [ROUTES.characters],
  });
  render(
    <AuthProvider initialUser={{ ...MOCK_USER, email }}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return userEvent.setup();
}

afterEach(cleanup);

describe("character list rules", () => {
  test("only own characters can be deleted, a VIEW character cannot", async () => {
    renderCharacters();
    const owned = await screen.findByRole("region", { name: "Мои персонажи" });
    const shared = screen.getByRole("region", { name: "Доступные мне" });

    expect(
      within(owned).getAllByRole("button", { name: /^Удалить /u }),
    ).toHaveLength(3);
    expect(within(shared).getByText("Merlin")).toBeInTheDocument();
    expect(
      within(shared).queryByRole("button", { name: /^Удалить / }),
    ).not.toBeInTheDocument();
  });

  test("a VIEW character names its owner instead of the copy source", async () => {
    renderCharacters();
    const shared = await screen.findByRole("region", {
      name: "Доступные мне",
    });

    expect(
      within(shared).getByText("Владелец: gm@example.com"),
    ).toBeInTheDocument();
  });

  test("a copy is marked as independent and shows who it came from", async () => {
    renderCharacters();
    const owned = await screen.findByRole("region", { name: "Мои персонажи" });

    expect(within(owned).getByText("Viktor (копия)")).toBeInTheDocument();
    // Подпись есть только у копии, а не у обычных персонажей.
    expect(within(owned).getAllByText(/^Копия от /u)).toHaveLength(1);
    expect(
      within(owned).getByText(
        "Копия от mira@example.com · редактируется независимо",
      ),
    ).toBeInTheDocument();
  });
});

describe("create character button", () => {
  test("an empty list has one button and it lives in the empty card", async () => {
    renderCharacters("new@example.com");
    const title = await screen.findByRole("heading", {
      name: "Персонажей пока нет",
    });

    // В шапке кнопки нет: единственная ссылка находится внутри пустой карточки.
    const links = screen.getAllByRole("link", { name: "Создать персонажа" });
    expect(links).toHaveLength(1);
    expect(title.parentElement).toContainElement(links[0]);
  });

  test("a populated list shows exactly one create button", async () => {
    renderCharacters();
    await screen.findByRole("region", { name: "Мои персонажи" });

    expect(
      screen.getAllByRole("link", { name: "Создать персонажа" }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "Персонажей пока нет" }),
    ).not.toBeInTheDocument();
  });
});

describe("deleting a character", () => {
  // В jsdom нет нативного dialog, поэтому showModal и close подменяются (как в тестах Modal).
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
    // Размонтирование вызывает close(), поэтому cleanup идёт до удаления подмены.
    cleanup();
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  test("confirming removes the character and shows a notice", async () => {
    const user = renderCharacters();
    await user.click(
      await screen.findByRole("button", { name: "Удалить Aldric" }),
    );

    // Окно называет персонажа и число версий, кнопка называет последствие, а не «ОК».
    const dialog = await screen.findByRole("dialog", {
      name: "Удалить персонажа Aldric?",
    });
    expect(dialog).toHaveTextContent("вся история версий");
    await user.click(
      within(dialog).getByRole("button", { name: "Удалить персонажа" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Персонаж «Aldric» удалён",
    );
    expect(
      screen.queryByRole("button", { name: "Удалить Aldric" }),
    ).not.toBeInTheDocument();
    const owned = screen.getByRole("region", { name: "Мои персонажи" });
    expect(within(owned).queryByText("Aldric")).not.toBeInTheDocument();
    // Счётчик в заголовке блока уменьшился с 3 до 2.
    expect(within(owned).getByText("2")).toBeInTheDocument();
  });

  test("cancelling keeps the character and shows no notice", async () => {
    const user = renderCharacters();
    await user.click(
      await screen.findByRole("button", { name: "Удалить Aldric" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Удалить персонажа Aldric?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Удалить Aldric" }),
    ).toBeInTheDocument();
  });

  test("when only shared characters remain the create button stays in the header", async () => {
    const user = renderCharacters();
    for (const name of ["Aldric", "Sarah Connor", "Viktor (копия)"]) {
      await user.click(
        await screen.findByRole("button", { name: `Удалить ${name}` }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: `Удалить персонажа ${name}?`,
      });
      await user.click(
        within(dialog).getByRole("button", { name: "Удалить персонажа" }),
      );
    }

    // «Мои» пусты и показывают пустую карточку, «Доступные мне» остаются ниже.
    const title = screen.getByRole("heading", { name: "Персонажей пока нет" });
    expect(
      screen.getByRole("region", { name: "Доступные мне" }),
    ).toBeInTheDocument();
    // Кнопка одна, и она не в пустой карточке, а в шапке.
    const links = screen.getAllByRole("link", { name: "Создать персонажа" });
    expect(links).toHaveLength(1);
    expect(title.parentElement).not.toContainElement(links[0]);
  });
});
