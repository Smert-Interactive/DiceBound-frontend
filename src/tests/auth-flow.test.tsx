import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import type { User } from "../auth/authContext";
import { MOCK_PASSWORD } from "../auth/mockAuth";
import { ROUTES } from "../constants/routes";

function renderAt(path: string, initialUser: User | null = null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={initialUser}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  email = MOCK_USER.email,
  password = MOCK_PASSWORD,
) {
  await user.type(screen.getByLabelText("Почта"), email);
  await user.type(screen.getByLabelText("Пароль", { exact: true }), password);
  await user.click(screen.getByRole("button", { name: "Войти" }));
}

afterEach(cleanup);

describe("authentication redirects with the real mock service", () => {
  test("signs in and replaces the login page with the character list", async () => {
    const { user, router } = renderAt(ROUTES.login);
    await signIn(user);

    await screen.findByRole("heading", { name: "Персонажи" });
    expect(router.state.location.pathname).toBe(ROUTES.characters);
    expect(router.state.historyAction).toBe("REPLACE");
    expect(
      screen.getByRole("link", { name: `Профиль: ${MOCK_USER.email}` }),
    ).toBeInTheDocument();
  });

  test("returns to the protected page including its search and hash", async () => {
    const { user, router } = renderAt(`${ROUTES.profile}?source=test#details`);
    expect(router.state.location.pathname).toBe(ROUTES.login);
    await signIn(user);

    await screen.findByRole("heading", { name: "Профиль" });
    const profile = screen.getByRole("region", { name: "Данные аккаунта" });
    expect(within(profile).getByText(MOCK_USER.email)).toBeInTheDocument();
    const [year, month, day] = MOCK_USER.created_at.slice(0, 10).split("-");
    expect(
      within(profile).getByText(`${day}.${month}.${year}`),
    ).toHaveAttribute("datetime", MOCK_USER.created_at);
    expect(router.state.location).toMatchObject({
      pathname: ROUTES.profile,
      search: "?source=test",
      hash: "#details",
    });
  });

  test.each([
    { email: MOCK_USER.email, password: "wrong-password" },
    { email: "missing@example.com", password: MOCK_PASSWORD },
  ])(
    "does not create a session for rejected credentials: $email",
    async (credentials) => {
      const { user, router } = renderAt(ROUTES.login);
      await signIn(user, credentials.email, credentials.password);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Неверная почта или пароль",
      );
      expect(router.state.location.pathname).toBe(ROUTES.login);
      expect(
        screen.queryByRole("link", { name: /Профиль:/u }),
      ).not.toBeInTheDocument();
    },
  );

  test("sends a signed-in visitor away from /login", async () => {
    const { router } = renderAt(ROUTES.login, MOCK_USER);
    await screen.findByRole("heading", { name: "Персонажи" });
    expect(router.state.location.pathname).toBe(ROUTES.characters);
    expect(router.state.historyAction).toBe("REPLACE");
    expect(
      screen.queryByRole("form", { name: "Вход" }),
    ).not.toBeInTheDocument();
  });

  test("signs out from the profile and prevents history from restoring the session", async () => {
    const { user, router } = renderAt(ROUTES.characters, MOCK_USER);
    await user.click(
      screen.getByRole("link", { name: `Профиль: ${MOCK_USER.email}` }),
    );
    await user.click(screen.getByRole("button", { name: "Выйти" }));

    expect(router.state.location.pathname).toBe(ROUTES.login);
    expect(router.state.location.state).toBeNull();
    expect(router.state.historyAction).toBe("REPLACE");
    expect(screen.getByRole("form", { name: "Вход" })).toBeInTheDocument();
    expect(screen.getByLabelText("Почта")).toHaveValue("");
    expect(screen.getByLabelText("Пароль", { exact: true })).toHaveValue("");
    expect(
      screen.queryByRole("region", { name: "Данные аккаунта" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Основная навигация" }),
    ).not.toBeInTheDocument();

    // В истории остался список персонажей, но без сессии он тоже недоступен.
    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe(ROUTES.login);
    expect(screen.getByRole("form", { name: "Вход" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Профиль:/u }),
    ).not.toBeInTheDocument();
  });

  test("registers into an empty list and allows signing in with the new account", async () => {
    const { user, router } = renderAt(ROUTES.profile);
    // Каждый запуск получает отдельную почту: аккаунты mock-сервиса живут до перезагрузки модуля.
    const email = `new-${crypto.randomUUID()}@example.com`;
    const password = "12345678";
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await user.type(screen.getByLabelText("Почта"), email);
    await user.type(screen.getByLabelText("Пароль", { exact: true }), password);
    await user.type(screen.getByLabelText("Повторите пароль"), password);
    const registeredAfter = Date.now();
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    await screen.findByRole("heading", { name: "Персонажей пока нет" });
    expect(router.state.location.pathname).toBe(ROUTES.characters);
    expect(
      screen.getByRole("link", { name: `Профиль: ${email}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Создать персонажа" }),
    ).toHaveAttribute("href", ROUTES.newCharacter);

    await user.click(screen.getByRole("link", { name: `Профиль: ${email}` }));
    const createdAt = screen
      .getByRole("region", { name: "Данные аккаунта" })
      .querySelector("time")!.dateTime;
    // Дата создаётся при регистрации, а оба счётчика нового аккаунта равны нулю.
    expect(Date.parse(createdAt)).not.toBeNaN();
    expect(new Date(createdAt).getTime()).toBeGreaterThanOrEqual(
      registeredAfter,
    );
    expect(new Date(createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(
      screen.getAllByRole("definition").map((item) => item.textContent),
    ).toEqual(["0", "0"]);

    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(router.state.location.pathname).toBe(ROUTES.login);
    await signIn(user, email, password);
    // После явного выхода новый вход открывает список; дата в профиле остаётся прежней.
    await screen.findByRole("heading", { name: "Персонажей пока нет" });
    expect(router.state.location.pathname).toBe(ROUTES.characters);
    await user.click(screen.getByRole("link", { name: `Профиль: ${email}` }));
    expect(
      screen
        .getByRole("region", { name: "Данные аккаунта" })
        .querySelector("time"),
    ).toHaveAttribute("datetime", createdAt);
    expect(
      screen.getByRole("link", { name: `Профиль: ${email}` }),
    ).toBeInTheDocument();
  });

  test("shows a neutral email error for an existing account without creating a session", async () => {
    const { user, router } = renderAt(ROUTES.login);
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await user.type(screen.getByLabelText("Почта"), MOCK_USER.email);
    await user.type(
      screen.getByLabelText("Пароль", { exact: true }),
      "safe-password-123",
    );
    await user.type(
      screen.getByLabelText("Повторите пароль"),
      "safe-password-123",
    );
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    const message =
      "Не удалось создать аккаунт с этой почтой. Если он у вас уже есть — войдите";
    await screen.findByText(message);
    expect(screen.getByLabelText("Почта")).toHaveAccessibleDescription(message);
    expect(router.state.location.pathname).toBe(ROUTES.login);
  });
});
