import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
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

const owned = {
  id: "91111111-1111-4111-8111-111111111111",
  name: "Server pilot",
  game_system_id: "92222222-2222-4222-8222-222222222222",
  game_system_name: "Orbital",
  updated_at: "2026-10-30T10:00:00Z",
  access: "OWNER",
  owner_username: "captain",
  copy_source_owner_name: null,
};
const shared = {
  ...owned,
  id: "93333333-3333-4333-8333-333333333333",
  name: "Server VIEW",
  access: "VIEW",
  owner_username: "keeper",
};

// Настоящие маршруты и HTTP-клиент; подменяется только сетевой ответ сервера.
function renderList(path = "/characters") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

// Задержка позволяет проверить ожидание, отмену и защиту от повторного DELETE.
function delayed() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

test("waits for GET and displays only server-owned and VIEW characters", async () => {
  const response = delayed();
  const fetchMock = vi.fn().mockReturnValue(response.promise);
  vi.stubGlobal("fetch", fetchMock);
  renderList();
  expect(
    screen.getByRole("status", { name: "Загрузка персонажей" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Персонажей пока нет")).not.toBeInTheDocument();
  await act(async () =>
    response.resolve(Response.json({ owned: [owned], shared_view: [shared] })),
  );
  expect(
    await screen.findByRole("link", { name: owned.name }),
  ).toBeInTheDocument();
  const view = screen.getByRole("region", { name: "Доступные мне" });
  expect(view).toHaveTextContent("Владелец: keeper");
  expect(
    within(view).queryByRole("button", { name: /Удалить/u }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Aldric")).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    "/api/v1/characters",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      signal: expect.any(AbortSignal),
    }),
  );
});

test("an empty server list has the create action in its empty state", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ owned: [], shared_view: [] })),
  );
  renderList();
  const empty = await screen.findByRole("heading", {
    name: "Персонажей пока нет",
  });
  const create = screen.getAllByRole("link", { name: "Создать персонажа" });
  expect(create).toHaveLength(1);
  expect(empty.parentElement).toContainElement(create[0]);
});

test("a failed GET offers retry without treating failure as an empty list", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("Offline"))
    .mockImplementation(async () =>
      Response.json({ owned: [owned], shared_view: [] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const { user } = renderList();
  await screen.findByText("Не удалось загрузить данные");
  expect(screen.queryByText("Персонажей пока нет")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Повторить" }));
  expect(
    await screen.findByRole("link", { name: owned.name }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("DELETE keeps the row until 204, rejects double confirmation and restores focus", async () => {
  const deletion = delayed();
  const fetchMock = vi
    .fn()
    .mockImplementation(async (_url, options) =>
      options.method === "DELETE"
        ? deletion.promise
        : Response.json({ owned: [owned], shared_view: [] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const { user } = renderList();
  await user.click(
    await screen.findByRole("button", { name: `Удалить ${owned.name}` }),
  );
  const confirm = screen.getByRole("button", { name: "Удалить персонажа" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(screen.getByRole("link", { name: owned.name })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === "DELETE"),
  ).toHaveLength(1);
  await act(async () => deletion.resolve(new Response(null, { status: 204 })));
  expect(
    await screen.findByText(`Персонаж «${owned.name}» удалён`),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: owned.name }),
  ).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Персонажи", level: 1 }),
    ).toHaveFocus(),
  );
});

test("a failed DELETE preserves the row and can be retried", async () => {
  let attempts = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (_url, options) => {
      if (options.method !== "DELETE")
        return Response.json({ owned: [owned], shared_view: [] });
      if (++attempts === 1)
        return Response.json({ code: "INTERNAL_ERROR" }, { status: 500 });
      return new Response(null, { status: 204 });
    }),
  );
  const { user } = renderList();
  await user.click(
    await screen.findByRole("button", { name: `Удалить ${owned.name}` }),
  );
  await user.click(screen.getByRole("button", { name: "Удалить персонажа" }));
  await screen.findByText("Не удалось выполнить действие. Попробуйте ещё раз.");
  expect(screen.getByRole("link", { name: owned.name })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Удалить персонажа" }));
  await screen.findByText(`Персонаж «${owned.name}» удалён`);
  expect(attempts).toBe(2);
});

test("401 sends the user to login with the complete return address", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ code: "UNAUTHORIZED" }, { status: 401 }),
      ),
  );
  const { router } = renderList("/characters?filter=all#top");
  await screen.findByRole("form", { name: "Вход" });
  expect(router.state.location.state.from).toMatchObject({
    pathname: "/characters",
    search: "?filter=all",
    hash: "#top",
  });
});

test("leaving aborts an unfinished list request", async () => {
  const response = delayed();
  const fetchMock = vi.fn().mockReturnValue(response.promise);
  vi.stubGlobal("fetch", fetchMock);
  const { router } = renderList();
  const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
  await act(async () => {
    await router.navigate("/systems");
  });
  expect(signal.aborted).toBe(true);
  await act(async () =>
    response.resolve(Response.json({ owned: [owned], shared_view: [] })),
  );
  expect(router.state.location.pathname).toBe("/systems");
  expect(screen.queryByText(owned.name)).not.toBeInTheDocument();
});
