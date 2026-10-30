import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AuthProvider from "../auth/AuthProvider";
import { routes } from "../app/router";
import { MOCK_USER } from "../mocks/authUser";

const cached = {
  ...MOCK_USER,
  owned_characters_count: 99,
  shared_characters_count: 88,
};

// Начальная сессия позволяет проверять запрос страницы отдельно от стартовой проверки /me.
function renderProfile(path = "/profile") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <AuthProvider initialUser={cached}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, ...view };
}

// Управляемый ответ позволяет проверить отмену и порядок завершения HTTP-запросов.
function delayedResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("loads a fresh profile with cookie and replaces all cached account data", async () => {
  const response = delayedResponse();
  const fetchMock = vi.fn().mockReturnValue(response.promise);
  vi.stubGlobal("fetch", fetchMock);
  renderProfile();
  expect(
    screen.getByRole("region", { name: "Данные аккаунта" }),
  ).toHaveAttribute("aria-busy", "true");
  expect(
    screen.getAllByRole("definition").map((item) => item.textContent),
  ).toEqual(["99", "88"]);
  const fresh = {
    ...cached,
    email: "fresh@example.com",
    username: "fresh",
    created_at: "2026-10-29T12:00:00Z",
    owned_characters_count: 0,
    shared_characters_count: 7,
  };
  await act(async () => response.resolve(Response.json(fresh)));
  await waitFor(() =>
    expect(
      screen.getByRole("region", { name: "Данные аккаунта" }),
    ).not.toHaveAttribute("aria-busy"),
  );
  expect(
    screen.getAllByRole("definition").map((item) => item.textContent),
  ).toEqual(["0", "7"]);
  expect(
    screen.getByRole("region", { name: "Данные аккаунта" }),
  ).toHaveTextContent(fresh.email);
  expect(screen.getByText("29.10.2026")).toHaveAttribute(
    "datetime",
    fresh.created_at,
  );
  expect(
    screen.getByRole("link", { name: `Профиль: ${fresh.email}` }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    "/api/v1/auth/me",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      signal: expect.any(AbortSignal),
    }),
  );
});

test("refreshes counters again when returning to the profile", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ ...cached, owned_characters_count: 2 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const { router } = renderProfile();
  await waitFor(() =>
    expect(screen.getAllByRole("definition")[0]).toHaveTextContent("2"),
  );
  await act(async () => {
    await router.navigate("/characters");
  });
  fetchMock.mockImplementation(async () =>
    Response.json({ ...cached, owned_characters_count: 5 }),
  );
  await act(async () => {
    await router.navigate("/profile");
  });
  await waitFor(() =>
    expect(screen.getAllByRole("definition")[0]).toHaveTextContent("5"),
  );
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/v1/auth/me"),
  ).toHaveLength(2);
});

test.each([new TypeError("Offline"), "500"])(
  "preserves cached data on a failure and retries: %s",
  async (failure) => {
    const fetchMock = vi.fn();
    if (failure === "500")
      fetchMock.mockResolvedValueOnce(
        Response.json({ code: "INTERNAL_ERROR" }, { status: 500 }),
      );
    else fetchMock.mockRejectedValueOnce(failure);
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...cached,
        owned_characters_count: 6,
        shared_characters_count: 0,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderProfile();
    await screen.findByText("Не удалось обновить профиль");
    expect(
      screen.getAllByRole("definition").map((item) => item.textContent),
    ).toEqual(["99", "88"]);
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() =>
      expect(
        screen.getAllByRole("definition").map((item) => item.textContent),
      ).toEqual(["6", "0"]),
    );
    expect(
      screen.queryByText("Не удалось обновить профиль"),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  },
);

test("401 clears the expired session and preserves the full return address", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ code: "UNAUTHORIZED" }, { status: 401 }),
      ),
  );
  const { router } = renderProfile("/profile?source=test#details");
  await screen.findByRole("form", { name: "Вход" });
  expect(router.state.location.pathname).toBe("/login");
  expect(router.state.location.state.from).toMatchObject({
    pathname: "/profile",
    search: "?source=test",
    hash: "#details",
  });
  expect(
    screen.queryByRole("region", { name: "Данные аккаунта" }),
  ).not.toBeInTheDocument();
});

test("leaving the page aborts the request and ignores a response that arrives later", async () => {
  const response = delayedResponse();
  const fetchMock = vi.fn().mockReturnValue(response.promise);
  vi.stubGlobal("fetch", fetchMock);
  const { router } = renderProfile();
  const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
  await act(async () => {
    await router.navigate("/characters");
  });
  expect(signal.aborted).toBe(true);
  await act(async () =>
    response.resolve(Response.json({ ...cached, email: "stale@example.com" })),
  );
  expect(router.state.location.pathname).toBe("/characters");
  expect(
    screen.getByRole("link", { name: `Профиль: ${cached.email}` }),
  ).toBeInTheDocument();
});

test("a pending profile response cannot restore the session after logout", async () => {
  const response = delayedResponse();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((_url, options) =>
        options.method === "POST"
          ? Promise.resolve(new Response(null, { status: 204 }))
          : response.promise,
      ),
  );
  const { router } = renderProfile();
  await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
  await screen.findByRole("form", { name: "Вход" });
  await act(async () => response.resolve(Response.json(cached)));
  expect(router.state.location.pathname).toBe("/login");
  expect(
    screen.queryByRole("link", { name: /Профиль:/u }),
  ).not.toBeInTheDocument();
});
