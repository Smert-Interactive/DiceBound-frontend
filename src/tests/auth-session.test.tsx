import { StrictMode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AuthProvider from "../auth/AuthProvider";
import { routes } from "../app/router";
import { MOCK_USER } from "../mocks/authUser";

// Проверяет production-путь без готовой тестовой сессии, включая StrictMode.
function renderSession(path = "/profile") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>,
  );
  return { router, ...view };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("waits for /me without redirecting or exposing protected content", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    ),
  );
  const { router } = renderSession("/profile?source=test#details");
  expect(
    screen.getByRole("status", { name: "Проверка сессии" }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/profile");
  expect(screen.queryByRole("form", { name: "Вход" })).not.toBeInTheDocument();
  await act(async () =>
    resolve(
      Response.json({
        ...MOCK_USER,
        username: "server-name",
        owned_characters_count: 8,
        shared_characters_count: 3,
      }),
    ),
  );
  await screen.findByRole("heading", { name: "Профиль" });
  expect(
    screen.getAllByRole("definition").map((item) => item.textContent),
  ).toEqual(["8", "3"]);
  expect(router.state.location).toMatchObject({
    pathname: "/profile",
    search: "?source=test",
    hash: "#details",
  });
});

test("treats 401 as signed out and preserves the requested destination", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ code: "UNAUTHORIZED" }, { status: 401 }),
      ),
  );
  const { router } = renderSession();
  await screen.findByRole("form", { name: "Вход" });
  expect(router.state.location.state.from.pathname).toBe("/profile");
});

test("retries a failed session check without losing the URL", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("Offline"));
  vi.stubGlobal("fetch", fetchMock);
  const { router } = renderSession();
  await screen.findByRole("button", { name: "Повторить" });
  expect(router.state.location.pathname).toBe("/profile");
  fetchMock.mockImplementation(async () => Response.json(MOCK_USER));
  await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
  await screen.findByRole("heading", { name: "Профиль" });
});

test("restores the server session after remounting", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json(MOCK_USER)),
  );
  const first = renderSession();
  await screen.findByRole("heading", { name: "Профиль" });
  first.unmount();
  renderSession();
  await screen.findByRole("heading", { name: "Профиль" });
  expect(
    screen.getByRole("region", { name: "Данные аккаунта" }),
  ).toHaveTextContent(MOCK_USER.email);
});

test("aborts pending session checks on unmount", () => {
  const signals: AbortSignal[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((_url, options) => {
      signals.push(options.signal);
      return new Promise(() => {});
    }),
  );
  const view = renderSession();
  view.unmount();
  expect(signals.length).toBeGreaterThan(0);
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});

test("keeps the profile after a logout failure and allows a successful retry", async () => {
  const fetchMock = vi.fn().mockImplementation(async (_url, options) => {
    if (options.method === "POST") throw new TypeError("Offline");
    return Response.json(MOCK_USER);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { router } = renderSession();
  await screen.findByRole("heading", { name: "Профиль" });
  await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
  expect(
    await screen.findByText(
      "Не удалось связаться с сервером. Попробуйте ещё раз.",
    ),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/profile");
  fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
  await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
  await screen.findByRole("form", { name: "Вход" });
  expect(router.state.location.pathname).toBe("/login");
  expect(router.state.location.state).toBeNull();
});

test("accepts an expired session during logout", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async (_url, options) =>
        options.method === "POST"
          ? Response.json({ code: "UNAUTHORIZED" }, { status: 401 })
          : Response.json(MOCK_USER),
      ),
  );
  renderSession();
  await screen.findByRole("heading", { name: "Профиль" });
  await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
  await screen.findByRole("form", { name: "Вход" });
  expect(
    screen.queryByRole("heading", { name: "Профиль" }),
  ).not.toBeInTheDocument();
});
