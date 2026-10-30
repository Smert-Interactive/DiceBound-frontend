import { afterEach, expect, test, vi } from "vitest";
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
import { character, schema, summary } from "./helpers/characterApiFixtures";
import * as calculations from "../sheet/recalculate";

const historyUrl = `/api/v1/characters/${character.id}/versions`;
const versionPath = `/characters/${character.id}/versions/1`;
const versions = [
  {
    id: "server-v3",
    version_number: 3,
    is_current: true,
    created_at: character.updated_at,
  },
  {
    id: "server-v1",
    version_number: 1,
    is_current: false,
    created_at: character.created_at,
  },
];
const snapshot = {
  id: "server-v1",
  character_id: character.id,
  version_number: 1,
  created_at: character.created_at,
  data: { ...character.data, callsign: "Old pilot", power: 2, bonus: 88 },
};

// Сетевая граница общая с production: неизвестные запросы и случайный restore сразу выявляются.
function installApi(
  override?: (
    url: string,
    options?: RequestInit,
  ) => Promise<Response> | Response | undefined,
) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      const custom = override?.(url, options);
      if (custom !== undefined) return custom;
      if (options?.method !== "GET")
        throw new Error(`Unexpected mutation ${url}`);
      if (url === historyUrl) return Response.json(versions);
      if (url === `${historyUrl}/1`) return Response.json(snapshot);
      if (url === `/api/v1/characters/${character.id}`)
        return Response.json(character);
      if (url === `/api/v1/schemas/${schema.id}`) return Response.json(schema);
      if (url === "/api/v1/characters")
        return Response.json({ owned: [summary], shared_view: [] });
      throw new Error(`Unexpected request ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Открывает настоящую страницу с действующей сессией, включая прямой адрес вкладки.
function openPage(path = `/characters/${character.id}`, state?: unknown) {
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: path, state }],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

// Отложенный ответ позволяет проверить скелет, отмену и защиту от устаревших данных.
function delayed() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("history is lazy, displays server version numbers and keeps the sheet draft across tabs", async () => {
  const response = delayed();
  let attempts = 0;
  const fetchMock = installApi((url) =>
    url === historyUrl
      ? ++attempts === 1
        ? response.promise
        : Response.json(versions)
      : undefined,
  );
  const { user } = openPage();
  const name = await screen.findByRole("textbox", { name: "Позывной" });
  fireEvent.change(name, { target: { value: "Unsaved pilot" } });
  expect(fetchMock.mock.calls.some(([url]) => url === historyUrl)).toBe(false);
  await user.click(screen.getByRole("tab", { name: "История" }));
  expect(
    screen.getByRole("status", { name: "История версий загружается" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Сохранить" }),
  ).not.toBeInTheDocument();
  await act(async () => response.resolve(Response.json(versions)));
  const list = await screen.findByRole("region", { name: "История версий" });
  const rows = within(list).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Версия 3");
  expect(rows[0]).toHaveAttribute("aria-current", "true");
  expect(rows[1]).toHaveTextContent("Версия 1");
  expect(within(list).queryByText("Версия 2")).not.toBeInTheDocument();
  expect(
    within(list).getByRole("button", { name: "Восстановить версию 1" }),
  ).toBeEnabled();
  const request = fetchMock.mock.calls.find(([url]) => url === historyUrl)!;
  expect(request[1]).toMatchObject({
    method: "GET",
    credentials: "include",
    signal: expect.any(AbortSignal),
  });
  await user.click(screen.getByRole("tab", { name: "Лист" }));
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Unsaved pilot",
  );
  await user.click(screen.getByRole("tab", { name: "История" }));
  await screen.findByRole("region", { name: "История версий" });
  expect(attempts).toBe(2);
});

test("opening a server snapshot shows stored data and calculated values, then returns to history", async () => {
  const calculate = vi.spyOn(calculations, "recalculateSheet");
  installApi();
  const { user, router } = openPage(versionPath);
  expect(
    screen.getByRole("status", { name: "Версия загружается" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Old pilot")).toBeInTheDocument();
  expect(screen.getByText("+88")).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Сохранить/u }),
  ).not.toBeInTheDocument();
  expect(calculate).not.toHaveBeenCalled();
  await user.click(
    within(screen.getByRole("main")).getByRole("link", { name: "К истории" }),
  );
  expect(
    await screen.findByRole("region", { name: "История версий" }),
  ).toBeInTheDocument();
  expect(router.state.location.state).toEqual({ activeTab: "history" });
  await user.click(screen.getByRole("link", { name: "Открыть версию 1" }));
  expect(await screen.findByText("Old pilot")).toBeInTheDocument();
  expect(router.state.location.pathname).toBe(versionPath);
});

test("the history opened after PUT reads the newly created server version", async () => {
  let saved = false;
  installApi((url, options) => {
    if (options?.method === "PUT") {
      saved = true;
      return Response.json({ ...character, current_version_number: 9 });
    }
    if (url === historyUrl)
      return Response.json(
        saved
          ? [
              { ...versions[0], id: "server-v9", version_number: 9 },
              ...versions.map((item) => ({ ...item, is_current: false })),
            ]
          : versions,
      );
  });
  const { user } = openPage();
  fireEvent.change(await screen.findByRole("textbox", { name: "Позывной" }), {
    target: { value: "New name" },
  });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  await screen.findByText("Сохранено · создана версия 9");
  await user.click(screen.getByRole("tab", { name: "История" }));
  const list = await screen.findByRole("region", { name: "История версий" });
  expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent(
    "Версия 9",
  );
});

test("history failure can be retried without losing the sheet draft", async () => {
  let attempts = 0;
  installApi((url) =>
    url === historyUrl && ++attempts === 1
      ? Promise.reject(new TypeError("offline"))
      : undefined,
  );
  const { user } = openPage();
  fireEvent.change(await screen.findByRole("textbox", { name: "Позывной" }), {
    target: { value: "Keep draft" },
  });
  await user.click(screen.getByRole("tab", { name: "История" }));
  await user.click(await screen.findByRole("button", { name: "Повторить" }));
  expect(
    await screen.findByRole("region", { name: "История версий" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Лист" }));
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Keep draft",
  );
});

test.each([403, 404])(
  "history %s does not expose mock versions",
  async (status) => {
    installApi((url) =>
      url === historyUrl ? Response.json({}, { status }) : undefined,
    );
    openPage(undefined, { activeTab: "history" });
    expect(
      await screen.findByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Открыть версию/u }),
    ).not.toBeInTheDocument();
  },
);

test("history 401 expires the session and retains the return address", async () => {
  installApi((url) =>
    url === historyUrl ? Response.json({}, { status: 401 }) : undefined,
  );
  const { router } = openPage(undefined, { activeTab: "history" });
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  expect(router.state.location.state.from.pathname).toBe(
    `/characters/${character.id}`,
  );
});

test("leaving history aborts GET and ignores its late response", async () => {
  const response = delayed();
  const fetchMock = installApi((url) =>
    url === historyUrl ? response.promise : undefined,
  );
  const { user } = openPage(undefined, { activeTab: "history" });
  await screen.findByRole("status", { name: "История версий загружается" });
  await user.click(screen.getByRole("tab", { name: "Лист" }));
  expect(
    fetchMock.mock.calls.find(([url]) => url === historyUrl)![1]?.signal
      ?.aborted,
  ).toBe(true);
  await act(async () => response.resolve(Response.json(versions)));
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Raven",
  );
  expect(
    screen.queryByRole("region", { name: "История версий" }),
  ).not.toBeInTheDocument();
});

test("hidden history cannot be loaded even with a history tab in route state", async () => {
  const fetchMock = installApi((url) =>
    url === `/api/v1/characters/${character.id}`
      ? Response.json({
          ...character,
          access: "VIEW",
          can_edit: false,
          can_view_history: false,
        })
      : undefined,
  );
  openPage(undefined, { activeTab: "history" });
  await screen.findByText("Только просмотр");
  expect(
    screen.queryByRole("tab", { name: "История" }),
  ).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url]) => url === historyUrl)).toBe(false);
});

test("VIEW with visible history receives a list but no restore actions", async () => {
  installApi((url) =>
    url === `/api/v1/characters/${character.id}`
      ? Response.json({
          ...character,
          access: "VIEW",
          can_edit: false,
          owner_username: "keeper",
        })
      : undefined,
  );
  openPage(undefined, { activeTab: "history" });
  expect(
    await screen.findByRole("region", { name: "История версий" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("keeper открыл вам историю версий."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Восстановить/u }),
  ).not.toBeInTheDocument();
});

test("an empty history does not invent an initial version", async () => {
  installApi((url) => (url === historyUrl ? Response.json([]) : undefined));
  openPage(undefined, { activeTab: "history" });
  expect(await screen.findByText("Версий пока нет")).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /Открыть версию/u }),
  ).not.toBeInTheDocument();
});

test("a failed snapshot load can be retried", async () => {
  let attempts = 0;
  installApi((url) =>
    url === `${historyUrl}/1` && ++attempts === 1
      ? Response.json({}, { status: 503 })
      : undefined,
  );
  const { user } = openPage(versionPath);
  await user.click(await screen.findByRole("button", { name: "Повторить" }));
  expect(await screen.findByText("Old pilot")).toBeInTheDocument();
});

test("snapshot 401 redirects to login with the requested version", async () => {
  installApi((url) =>
    url === `${historyUrl}/1` ? Response.json({}, { status: 401 }) : undefined,
  );
  const { router } = openPage(versionPath);
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  expect(router.state.location.state.from.pathname).toBe(versionPath);
});

test.each(["0", "-1", "1.5", "2147483648"])(
  "invalid version %s never issues a request",
  (version) => {
    const fetchMock = installApi();
    openPage(`/characters/${character.id}/versions/${version}`);
    expect(
      screen.getByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

test("a previous snapshot request is aborted when switching to another version", async () => {
  const response = delayed();
  const fetchMock = installApi((url) =>
    url === `${historyUrl}/1`
      ? response.promise
      : url === `${historyUrl}/3`
        ? Response.json({
            ...snapshot,
            version_number: 3,
            data: { ...snapshot.data, callsign: "New snapshot" },
          })
        : undefined,
  );
  const { router } = openPage(versionPath);
  await act(async () => {
    await router.navigate(`/characters/${character.id}/versions/3`);
  });
  expect(await screen.findByText("New snapshot")).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.find(([url]) => url === `${historyUrl}/1`)![1]?.signal
      ?.aborted,
  ).toBe(true);
  await act(async () => response.resolve(Response.json(snapshot)));
  expect(screen.queryByText("Old pilot")).not.toBeInTheDocument();
});
