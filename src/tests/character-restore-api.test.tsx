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
import { character, schema, summary } from "./helpers/characterApiFixtures";

const historyUrl = `/api/v1/characters/${character.id}/versions`;
const restoreUrl = `${historyUrl}/1/restore`;
const versions = [
  {
    id: "v3",
    version_number: 3,
    created_at: character.updated_at,
    is_current: true,
  },
  {
    id: "v1",
    version_number: 1,
    created_at: character.created_at,
    is_current: false,
  },
];
const restored = {
  id: character.id,
  owner_id: character.owner_id,
  game_system_id: character.game_system_id,
  sheet_schema_id: character.sheet_schema_id,
  name: character.name,
  created_at: character.created_at,
  updated_at: "2026-10-30T14:00:00Z",
  current_version_number: 1,
  data: { ...character.data, callsign: "Restored pilot", power: 4, bonus: 2 },
};

// Транспорт настоящий; состояние сервера меняется только после успешного POST.
function installApi(
  override?: (
    url: string,
    options?: RequestInit,
  ) => Response | Promise<Response> | undefined,
) {
  let wasRestored = false;
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      const custom = override?.(url, options);
      if (custom !== undefined) return custom;
      if (url === restoreUrl && options?.method === "POST") {
        wasRestored = true;
        return Response.json({
          character: restored,
          deleted_versions_count: 1,
        });
      }
      if (url === historyUrl)
        return Response.json(
          wasRestored ? [{ ...versions[1], is_current: true }] : versions,
        );
      if (url === `${historyUrl}/1`)
        return Response.json({
          id: "v1",
          character_id: character.id,
          version_number: 1,
          data: restored.data,
          created_at: character.created_at,
        });
      if (url === `/api/v1/characters/${character.id}`)
        return Response.json(
          wasRestored ? { ...character, ...restored } : character,
        );
      if (url === `/api/v1/schemas/${schema.id}`) return Response.json(schema);
      if (url === "/api/v1/characters")
        return Response.json({ owned: [summary], shared_view: [] });
      throw new Error(`Unexpected ${options?.method} ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Открывает либо историю, либо прямой адрес снимка, без подмены API-функций.
function openPage(snapshot = false) {
  const path = `/characters/${character.id}${snapshot ? "/versions/1" : ""}`;
  const router = createMemoryRouter(routes, {
    initialEntries: [
      { pathname: path, state: snapshot ? null : { activeTab: "history" } },
    ],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

// Сетевая задержка нужна для проверки блокировки повторного подтверждения и отмены запроса.
function delayed() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// Возвращает только опасные запросы, отделяя их от перечитывания истории.
function posts(fetchMock: ReturnType<typeof installApi>) {
  return fetchMock.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
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

test("cancel shows the actual deletion timeline and never sends POST", async () => {
  const fetchMock = installApi();
  const { user } = openPage();
  const trigger = await screen.findByRole("button", {
    name: "Восстановить версию 1",
  });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", {
    name: "Восстановить версию 1?",
  });
  expect(
    within(dialog).getByRole("listitem", { name: "Версия 3 — будет удалена" }),
  ).toBeInTheDocument();
  expect(posts(fetchMock)).toHaveLength(0);
  await user.click(within(dialog).getByRole("button", { name: "Отмена" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
  expect(posts(fetchMock)).toHaveLength(0);
});

test("confirmation sends a single bodyless POST, locks closing and applies the full server result", async () => {
  const response = delayed();
  const fetchMock = installApi((url) =>
    url === restoreUrl ? response.promise : undefined,
  );
  const { user } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", {
    name: "Восстановить и удалить 1 версию",
  });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(posts(fetchMock)).toHaveLength(1);
  expect(posts(fetchMock)[0]).toEqual([
    restoreUrl,
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: undefined,
      signal: expect.any(AbortSignal),
    }),
  ]);
  expect(within(dialog).getByRole("button", { name: "Отмена" })).toBeDisabled();
  fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
  expect(dialog).toBeInTheDocument();
  await act(async () =>
    response.resolve(
      Response.json({ character: restored, deleted_versions_count: 1 }),
    ),
  );
  expect(await screen.findByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Restored pilot",
  );
  expect(
    screen.getByText("Восстановлена версия 1. Удалено версий: 1"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Все изменения сохранены · версия 1"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("restore from a snapshot returns to the current sheet with a one-time notice", async () => {
  installApi();
  const { user, router } = openPage(true);
  await user.click(
    await screen.findByRole("button", { name: "Восстановить эту версию" }),
  );
  const dialog = await screen.findByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", {
      name: "Восстановить и удалить 1 версию",
    }),
  );
  expect(await screen.findByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Restored pilot",
  );
  expect(
    screen.getByText("Восстановлена версия 1. Удалено версий: 1"),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe(`/characters/${character.id}`);
  expect(router.state.location.state).toBeNull();
  await user.click(screen.getByRole("tab", { name: "История" }));
  const list = await screen.findByRole("region", { name: "История версий" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  expect(within(list).queryByText("Версия 3")).not.toBeInTheDocument();
});

test("confirmation refreshes the timeline before offering to delete newer versions", async () => {
  let reads = 0;
  const fetchMock = installApi((url) =>
    url === historyUrl && ++reads > 1
      ? Response.json([
          { ...versions[0], id: "v4", version_number: 4 },
          ...versions,
        ])
      : undefined,
  );
  const { user } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByRole("button", {
      name: "Восстановить и удалить 2 версии",
    }),
  ).toBeInTheDocument();
  expect(
    within(dialog).getByRole("listitem", { name: "Версия 4 — будет удалена" }),
  ).toBeInTheDocument();
  expect(posts(fetchMock)).toHaveLength(0);
});

test("network failure keeps the modal and retries only on explicit confirmation", async () => {
  let attempts = 0;
  const fetchMock = installApi((url) =>
    url === restoreUrl && ++attempts === 1
      ? Promise.reject(new TypeError("offline"))
      : undefined,
  );
  const { user } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  const dialog = await screen.findByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", {
      name: "Восстановить и удалить 1 версию",
    }),
  );
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Не удалось выполнить действие. Попробуйте ещё раз.",
  );
  expect(posts(fetchMock)).toHaveLength(1);
  await user.click(
    within(dialog).getByRole("button", {
      name: "Восстановить и удалить 1 версию",
    }),
  );
  expect(await screen.findByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Restored pilot",
  );
  expect(posts(fetchMock)).toHaveLength(2);
});

test.each([
  [409, "Эта версия уже текущая. Обновите данные персонажа."],
  [404, "Персонаж или версия больше недоступны. Обновите данные персонажа."],
  [
    403,
    "Сервер запретил восстановление. Проверьте доступ и попробуйте ещё раз.",
  ],
] as const)(
  "POST %s shows a specific error without changing the sheet",
  async (status, message) => {
    const fetchMock = installApi((url) =>
      url === restoreUrl
        ? Response.json(
            { code: status === 409 ? "RESTORE_NOT_ALLOWED" : "FORBIDDEN" },
            { status },
          )
        : undefined,
    );
    const { user } = openPage();
    await user.click(
      await screen.findByRole("button", { name: "Восстановить версию 1" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Восстановить и удалить 1 версию",
      }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(posts(fetchMock)).toHaveLength(1);
    expect(
      screen.queryByText("Восстановлена версия 1. Удалено версий: 1"),
    ).not.toBeInTheDocument();
    if (status !== 403) {
      expect(
        within(dialog).queryByRole("button", {
          name: /Восстановить и удалить/u,
        }),
      ).not.toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", { name: "Обновить данные" }),
      );
      await screen.findByRole("region", { name: "История версий" });
      expect(posts(fetchMock)).toHaveLength(1);
    }
  },
);

test("POST 401 clears the session and retains the character return address", async () => {
  installApi((url) =>
    url === restoreUrl ? Response.json({}, { status: 401 }) : undefined,
  );
  const { user, router } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Восстановить и удалить 1 версию",
    }),
  );
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  expect(router.state.location.state.from.pathname).toBe(
    `/characters/${character.id}`,
  );
});

test("leaving during POST aborts it and ignores the late restore response", async () => {
  const response = delayed();
  const fetchMock = installApi((url) =>
    url === restoreUrl ? response.promise : undefined,
  );
  const { user, router } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Восстановить и удалить 1 версию",
    }),
  );
  await act(async () => {
    await router.navigate("/characters");
  });
  expect(posts(fetchMock)[0][1]?.signal?.aborted).toBe(true);
  await act(async () =>
    response.resolve(
      Response.json({ character: restored, deleted_versions_count: 1 }),
    ),
  );
  expect(router.state.location.pathname).toBe("/characters");
  expect(
    screen.queryByText("Восстановлена версия 1. Удалено версий: 1"),
  ).not.toBeInTheDocument();
});

test("a version that became current during preparation cannot send POST", async () => {
  let reads = 0;
  const fetchMock = installApi((url) =>
    url === historyUrl && ++reads > 1
      ? Response.json([{ ...versions[1], is_current: true }])
      : undefined,
  );
  const { user } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  expect(
    await screen.findByText(
      "Эта версия уже текущая. Обновите данные персонажа.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(posts(fetchMock)).toHaveLength(0);
});

test("a failed preparation can be retried without submitting a restore", async () => {
  let reads = 0;
  const fetchMock = installApi((url) =>
    url === historyUrl && ++reads === 2
      ? Promise.reject(new TypeError("offline"))
      : undefined,
  );
  const { user } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  expect(
    await screen.findByText(
      "Не удалось выполнить действие. Попробуйте ещё раз.",
    ),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Восстановить версию 1" }),
  );
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(posts(fetchMock)).toHaveLength(0);
});

test("VIEW cannot restore from history or snapshot", async () => {
  const fetchMock = installApi((url) =>
    url === `/api/v1/characters/${character.id}`
      ? Response.json({ ...character, access: "VIEW", can_edit: false })
      : undefined,
  );
  const { user } = openPage();
  await screen.findByRole("region", { name: "История версий" });
  expect(
    screen.queryByRole("button", { name: /Восстановить/u }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Открыть версию 1" }));
  await screen.findByText("Restored pilot");
  expect(
    screen.queryByRole("button", { name: /Восстановить/u }),
  ).not.toBeInTheDocument();
  expect(posts(fetchMock)).toHaveLength(0);
});

test("the next save uses the restored baseline and creates the next server version", async () => {
  const fetchMock = installApi((_url, options) =>
    options?.method === "PUT"
      ? Response.json({
          ...character,
          ...restored,
          current_version_number: 2,
          data: { ...restored.data, callsign: "After restore" },
        })
      : undefined,
  );
  const { user } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Восстановить и удалить 1 версию",
    }),
  );
  const name = await screen.findByRole("textbox", { name: "Позывной" });
  fireEvent.change(name, { target: { value: "After restore" } });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(
    await screen.findByText("Сохранено · создана версия 2"),
  ).toBeInTheDocument();
  const put = fetchMock.mock.calls.find(
    ([, options]) => options?.method === "PUT",
  )!;
  const body = JSON.parse(String(put[1]?.body));
  expect(body.data).toMatchObject({ callsign: "After restore", power: 4 });
  expect(body.data).not.toHaveProperty("bonus");
});

test("leaving during preparation aborts history loading and never opens a late confirmation", async () => {
  const response = delayed();
  let reads = 0;
  const fetchMock = installApi((url) =>
    url === historyUrl && ++reads === 2 ? response.promise : undefined,
  );
  const { user, router } = openPage();
  await user.click(
    await screen.findByRole("button", { name: "Восстановить версию 1" }),
  );
  await act(async () => {
    await router.navigate("/characters");
  });
  const historyCalls = fetchMock.mock.calls.filter(
    ([url]) => url === historyUrl,
  );
  expect(historyCalls[1][1]?.signal?.aborted).toBe(true);
  await act(async () => response.resolve(Response.json(versions)));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(posts(fetchMock)).toHaveLength(0);
});
