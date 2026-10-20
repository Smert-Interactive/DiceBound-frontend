import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import type { User } from "../auth/authContext";
import * as mockAuth from "../auth/mockAuth";
import { ROUTES } from "../constants/routes";

const LOGIN_ERROR = "Неверная почта или пароль";
const EMAIL_ERROR = "Введите почту в формате name@example.com";
const PASSWORD_HINT = "Не короче 8 символов";
const REGISTRATION_ERROR =
  "Не удалось создать аккаунт с этой почтой. Если он у вас уже есть — войдите";

// Проверяем формы с настоящим провайдером и маршрутами, подменяя только ответ сервиса.
function renderLogin() {
  const router = createMemoryRouter(routes, { initialEntries: [ROUTES.login] });
  render(
    <AuthProvider initialUser={null}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

async function fillLogin(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
) {
  if (email) await user.type(screen.getByLabelText("Почта"), email);
  if (password) {
    await user.type(screen.getByLabelText("Пароль", { exact: true }), password);
  }
}

async function fillRegistration(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
  confirmation: string,
) {
  await fillLogin(user, email, password);
  if (confirmation) {
    await user.type(screen.getByLabelText("Повторите пароль"), confirmation);
  }
}

beforeEach(() => {
  vi.spyOn(mockAuth, "mockSignIn").mockRejectedValue(
    new Error("INVALID_CREDENTIALS"),
  );
  vi.spyOn(mockAuth, "mockRegister").mockRejectedValue(
    new Error("REGISTRATION_FAILED"),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("login validation", () => {
  test.each([
    { email: "", password: "", emailMissing: true, passwordMissing: true },
    {
      email: "",
      password: "secret",
      emailMissing: true,
      passwordMissing: false,
    },
    {
      email: "player@example.com",
      password: "",
      emailMissing: false,
      passwordMissing: true,
    },
    {
      email: "   ",
      password: "secret",
      emailMissing: true,
      passwordMissing: false,
    },
  ])("does not submit missing fields: $email / $password", async (values) => {
    const { user, router } = renderLogin();
    await fillLogin(user, values.email, values.password);

    // До отправки пустое поле не объявляется ошибочным.
    expect(screen.getByLabelText("Почта")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));

    for (const [label, invalid] of [
      ["Почта", values.emailMissing],
      ["Пароль", values.passwordMissing],
    ] as const) {
      expect(
        screen
          .getByLabelText(label, { exact: true })
          .getAttribute("aria-invalid") === "true",
      ).toBe(invalid);
    }
    expect(mockAuth.mockSignIn).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTES.login);
  });

  test("removes a missing-field error when the field is filled", async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole("button", { name: "Войти" }));
    await user.type(screen.getByLabelText("Почта"), "player@example.com");

    expect(screen.getByLabelText("Почта")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Пароль", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mockAuth.mockSignIn).not.toHaveBeenCalled();
  });

  test("shows only the neutral sign-in error and preserves both fields", async () => {
    const { user, router } = renderLogin();
    // На входе даже ошибка формата не получает отдельного текста под почтой.
    await fillLogin(user, "not-an-email", "wrong-password");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_ERROR);
    expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Почта")).toHaveValue("not-an-email");
    expect(screen.getByLabelText("Пароль", { exact: true })).toHaveValue(
      "wrong-password",
    );
    expect(mockAuth.mockSignIn).toHaveBeenCalledWith({
      email: "not-an-email",
      password: "wrong-password",
    });
    expect(router.state.location.pathname).toBe(ROUTES.login);

    await user.type(screen.getByLabelText("Пароль", { exact: true }), "1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("registration validation", () => {
  test("marks empty fields without sending a request or adding error text", async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    for (const label of ["Почта", "Пароль", "Повторите пароль"]) {
      expect(screen.getByLabelText(label, { exact: true })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    }
    expect(mockAuth.mockRegister).not.toHaveBeenCalled();
    expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
    expect(screen.queryByText("Пароли не совпадают")).not.toBeInTheDocument();
  });

  test.each([
    {
      email: "player@",
      password: "password",
      confirmation: "password",
      label: "Почта",
      message: EMAIL_ERROR,
    },
    {
      email: "player@example.com",
      password: "1234567",
      confirmation: "1234567",
      label: "Пароль",
      message: PASSWORD_HINT,
    },
    {
      email: "player@example.com",
      password: "password",
      confirmation: "different",
      label: "Повторите пароль",
      message: "Пароли не совпадают",
    },
  ])("blocks submission and describes the error in $label", async (values) => {
    const { user } = renderLogin();
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await fillRegistration(
      user,
      values.email,
      values.password,
      values.confirmation,
    );
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    const field = screen.getByLabelText(values.label, { exact: true });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(values.message);
    expect(mockAuth.mockRegister).not.toHaveBeenCalled();
    // Подсказка короткого пароля заменяется ошибкой и не дублируется второй строкой.
    expect(screen.getAllByText(PASSWORD_HINT)).toHaveLength(1);
  });

  test("reports all invalid fields in a single submission", async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await fillRegistration(user, "invalid", "short", "different");
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    expect(screen.getByLabelText("Почта")).toHaveAccessibleDescription(
      EMAIL_ERROR,
    );
    expect(
      screen.getByLabelText("Пароль", { exact: true }),
    ).toHaveAccessibleDescription(PASSWORD_HINT);
    expect(
      screen.getByLabelText("Повторите пароль"),
    ).toHaveAccessibleDescription("Пароли не совпадают");
    expect(mockAuth.mockRegister).not.toHaveBeenCalled();
  });

  test("keeps the fields after rejection and clears only the edited email error", async () => {
    const { user, router } = renderLogin();
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await fillRegistration(user, "alex@example.com", "password", "password");
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    await screen.findByText(REGISTRATION_ERROR);
    expect(screen.getByLabelText("Почта")).toHaveAccessibleDescription(
      REGISTRATION_ERROR,
    );
    expect(screen.getByLabelText("Почта")).toHaveValue("alex@example.com");
    expect(screen.getByLabelText("Пароль", { exact: true })).toHaveValue(
      "password",
    );
    expect(screen.getByLabelText("Повторите пароль")).toHaveValue("password");
    expect(router.state.location.pathname).toBe(ROUTES.login);

    await user.type(screen.getByLabelText("Почта"), "1");
    expect(screen.queryByText(REGISTRATION_ERROR)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Пароль", { exact: true })).toHaveValue(
      "password",
    );
  });

  test("accepts an eight-character password without trimming its spaces", async () => {
    vi.mocked(mockAuth.mockRegister).mockResolvedValueOnce({
      ...MOCK_USER,
      email: "player@example.com",
    });
    const { user } = renderLogin();
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    await fillRegistration(user, "player@example.com", " 123456 ", " 123456 ");
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    await screen.findByRole("heading", { name: "Персонажей пока нет" });
    expect(mockAuth.mockRegister).toHaveBeenCalledWith({
      email: "player@example.com",
      password: " 123456 ",
      passwordConfirmation: " 123456 ",
    });
  });
});

describe("pending authentication", () => {
  test.each([
    { formName: "Вход", action: "Войти", loading: "Вход…", register: false },
    {
      formName: "Регистрация",
      action: "Создать аккаунт",
      loading: "Создание…",
      register: true,
    },
  ])(
    "blocks repeat submission and tab switching in $formName",
    async (scenario) => {
      // Завершаем ответ вручную: проверка загрузки не зависит от скорости компьютера.
      let rejectRequest!: (reason: Error) => void;
      const request = new Promise<User>((_resolve, reject) => {
        rejectRequest = reject;
      });
      const service = scenario.register
        ? mockAuth.mockRegister
        : mockAuth.mockSignIn;
      vi.mocked(service).mockReturnValueOnce(request);
      const { user } = renderLogin();
      if (scenario.register) {
        await user.click(screen.getByRole("tab", { name: "Регистрация" }));
        await fillRegistration(
          user,
          "player@example.com",
          "password",
          "password",
        );
      } else {
        await fillLogin(user, "player@example.com", "password");
      }

      const form = screen.getByRole("form", { name: scenario.formName });
      // Два submit в одном обновлении также должны давать единственный вызов сервиса.
      act(() => {
        fireEvent.submit(form);
        fireEvent.submit(form);
      });
      expect(service).toHaveBeenCalledTimes(1);
      expect(form).toHaveAttribute("aria-busy", "true");
      expect(
        screen.getByRole("button", { name: scenario.loading }),
      ).toBeDisabled();
      for (const tab of screen.getAllByRole("tab")) expect(tab).toBeDisabled();
      for (const label of ["Почта", "Пароль"]) {
        expect(screen.getByLabelText(label, { exact: true })).toBeDisabled();
      }
      if (scenario.register)
        expect(screen.getByLabelText("Повторите пароль")).toBeDisabled();

      await user.click(
        screen.getByRole("tab", {
          name: scenario.register ? "Вход" : "Регистрация",
        }),
      );
      expect(
        screen.getByRole("form", { name: scenario.formName }),
      ).toBeInTheDocument();
      await act(async () => {
        rejectRequest(new Error("REQUEST_FAILED"));
      });

      expect(form).not.toHaveAttribute("aria-busy", "true");
      expect(
        screen.getByRole("button", { name: scenario.action }),
      ).toBeEnabled();
      for (const tab of screen.getAllByRole("tab")) expect(tab).toBeEnabled();
      expect(service).toHaveBeenCalledTimes(1);
    },
  );
});
