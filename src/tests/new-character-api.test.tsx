import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../mocks/authUser";

const systemId = "94444444-4444-4444-8444-444444444444";
const schemaId = "95555555-5555-4555-8555-555555555555";
const secondId = "96666666-6666-4666-8666-666666666666";
const secondSchemaId = "97777777-7777-4777-8777-777777777777";
const characterId = "98888888-8888-4888-8888-888888888888";
const system = {
  id: systemId,
  name: "Orbital",
  owner_id: MOCK_USER.id,
  description: null,
  source: "IMPORTED",
  character_count: 0,
  created_at: "2026-10-30T00:00:00Z",
};
const summary = {
  id: schemaId,
  game_system_id: systemId,
  name: "Crew",
  created_at: system.created_at,
};
const sheet = {
  ...summary,
  schema: {
    sections: [
      {
        id: "engines",
        label: "Orbital controls",
        fields: [{ id: "engine_output", type: "number", label: "Engine" }],
      },
    ],
  },
};
const created = {
  id: characterId,
  owner_id: MOCK_USER.id,
  game_system_id: systemId,
  sheet_schema_id: schemaId,
  name: "Server created name",
  data: {},
  current_version_number: 1,
  created_at: system.created_at,
  updated_at: system.created_at,
};

// Базовый сервер не принимает неизвестные запросы и использует ID, отличные от всех mock-схем.
function server(
  overrides?: (
    url: string,
    options: RequestInit,
  ) => Response | Promise<Response> | undefined,
) {
  let saved = false;
  const fetchMock = vi.fn(async (url: string, options: RequestInit = {}) => {
    const response = overrides?.(url, options);
    if (response !== undefined) return response;
    if (url === "/api/v1/systems") return Response.json([system]);
    if (url === `/api/v1/systems/${systemId}/schemas`)
      return Response.json([summary]);
    if (url === `/api/v1/schemas/${schemaId}`) return Response.json(sheet);
    if (url === "/api/v1/characters" && options?.method === "POST") {
      saved = true;
      return Response.json(created, { status: 201 });
    }
    if (url === "/api/v1/characters")
      return Response.json({
        owned: saved
          ? [
              {
                ...created,
                access: "OWNER",
                game_system_name: system.name,
                owner_username: "captain",
                copy_source_owner_name: null,
              },
            ]
          : [],
        shared_view: [],
      });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Проверяет production-маршруты без стартового /me, чтобы отдельно видеть запросы создания.
function renderCreate(state?: unknown) {
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: "/characters/new", state }],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

// Управляемое завершение имитирует медленный сервер без таймеров.
function delayed() {
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

test("loads systems, schema summaries and full section labels from the API", async () => {
  const fetchMock = server();
  renderCreate();
  expect(
    screen.getByRole("status", { name: "Загрузка игровых систем" }),
  ).toBeInTheDocument();
  expect(await screen.findByRole("radio", { name: /^Orbital/u })).toBeChecked();
  expect(await screen.findByText("Orbital controls")).toBeInTheDocument();
  expect(screen.queryByText("D&D 5e")).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/v1/systems",
    `/api/v1/systems/${systemId}/schemas`,
    `/api/v1/schemas/${schemaId}`,
  ]);
});

test("POST sends exactly the selected DTO, blocks duplicates and returns to the server list", async () => {
  const response = delayed();
  let posted = false;
  const fetchMock = server((url, options) => {
    if (url === "/api/v1/characters" && options?.method === "POST") {
      posted = true;
      return response.promise;
    }
    if (url === "/api/v1/characters" && posted)
      return Response.json({
        owned: [
          {
            ...created,
            access: "OWNER",
            game_system_name: "Orbital",
            owner_username: "captain",
            copy_source_owner_name: null,
          },
        ],
        shared_view: [],
      });
  });
  const { router, user } = renderCreate();
  await screen.findByText("Orbital controls");
  await user.type(screen.getByLabelText("Имя персонажа"), "  Orbit  ");
  const button = screen.getByRole("button", { name: "Создать персонажа" });
  fireEvent.click(button);
  fireEvent.click(button);
  const calls = fetchMock.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
  expect(calls).toHaveLength(1);
  expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
    name: "  Orbit  ",
    game_system_id: systemId,
    sheet_schema_id: schemaId,
  });
  expect(calls[0][1]?.credentials).toBe("include");
  expect(screen.getByRole("textbox", { name: "Имя персонажа" })).toBeDisabled();
  expect(
    screen.queryByRole("link", { name: "Отмена" }),
  ).not.toBeInTheDocument();
  await act(async () =>
    response.resolve(Response.json(created, { status: 201 })),
  );
  await screen.findByText(`Персонаж «${created.name}» создан`);
  expect(router.state.location.pathname).toBe("/characters");
  expect(
    await screen.findByRole("link", { name: created.name }),
  ).toBeInTheDocument();
  await waitFor(() => expect(router.state.location.state).toBeNull());
  expect(
    fetchMock.mock.calls.some(
      ([url]) => url === `/api/v1/characters/${characterId}`,
    ),
  ).toBe(false);
});

test("a failed creation preserves name and selection and allows a manual retry", async () => {
  let attempts = 0;
  server((url, options) => {
    if (
      url === "/api/v1/characters" &&
      options?.method === "POST" &&
      ++attempts === 1
    )
      return Response.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  });
  const { user } = renderCreate();
  await screen.findByText("Orbital controls");
  await user.type(screen.getByLabelText("Имя персонажа"), "Retry pilot");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  const error = await screen.findByText(
    "Не удалось выполнить действие. Попробуйте ещё раз.",
  );
  expect(error.closest(".new-character__failure")).toHaveFocus();
  expect(screen.getByLabelText("Имя персонажа")).toHaveValue("Retry pilot");
  expect(screen.getByRole("radio", { name: /^Orbital/u })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  await screen.findByText(`Персонаж «${created.name}» создан`);
  expect(attempts).toBe(2);
});

test.each(["systems", "summaries", "schema"])(
  "retries a failed %s read without issuing POST",
  async (stage) => {
    let failed = false;
    const target =
      stage === "systems"
        ? "/api/v1/systems"
        : stage === "summaries"
          ? `/api/v1/systems/${systemId}/schemas`
          : `/api/v1/schemas/${schemaId}`;
    const fetchMock = server((url) => {
      if (url === target && !failed) {
        failed = true;
        return Response.json({ code: "INTERNAL_ERROR" }, { status: 500 });
      }
    });
    const { user } = renderCreate();
    await user.click(await screen.findByRole("button", { name: "Повторить" }));
    await screen.findByText("Orbital controls");
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(false);
  },
);

test("switching systems ignores the old full schema response", async () => {
  const old = delayed();
  let oldSignal: AbortSignal | undefined;
  server((url, options) => {
    if (url === "/api/v1/systems")
      return Response.json([
        system,
        { ...system, id: secondId, name: "Oceanic" },
      ]);
    if (url === `/api/v1/systems/${secondId}/schemas`)
      return Response.json([
        {
          ...summary,
          id: secondSchemaId,
          game_system_id: secondId,
          name: "Diver",
        },
      ]);
    if (url === `/api/v1/schemas/${schemaId}`) {
      oldSignal = options.signal as AbortSignal;
      return old.promise;
    }
    if (url === `/api/v1/schemas/${secondSchemaId}`)
      return Response.json({
        ...sheet,
        id: secondSchemaId,
        game_system_id: secondId,
        schema: {
          sections: [{ id: "sea", label: "Ocean controls", fields: [] }],
        },
      });
  });
  const { user } = renderCreate();
  await user.click(await screen.findByRole("radio", { name: /Oceanic/u }));
  await screen.findByText("Ocean controls");
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => old.resolve(Response.json(sheet)));
  expect(screen.queryByText("Orbital controls")).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: /Oceanic/u })).toBeChecked();
});

test("401 during creation ends the session and remembers the creation route", async () => {
  server((url, options) =>
    url === "/api/v1/characters" && options?.method === "POST"
      ? Response.json({ code: "UNAUTHORIZED" }, { status: 401 })
      : undefined,
  );
  const { router, user } = renderCreate();
  await screen.findByText("Orbital controls");
  await user.type(screen.getByLabelText("Имя персонажа"), "Pilot");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  await screen.findByRole("form", { name: "Вход" });
  expect(router.state.location.state.from.pathname).toBe("/characters/new");
});

test("leaving during POST aborts the request and prevents a late redirect", async () => {
  const response = delayed();
  let signal: AbortSignal | undefined;
  server((url, options) => {
    if (url === "/api/v1/characters" && options?.method === "POST") {
      signal = options.signal as AbortSignal;
      return response.promise;
    }
  });
  const { router, user } = renderCreate();
  await screen.findByText("Orbital controls");
  await user.type(screen.getByLabelText("Имя персонажа"), "Pilot");
  await user.click(screen.getByRole("button", { name: "Создать персонажа" }));
  await act(async () => {
    await router.navigate("/systems");
  });
  expect(signal?.aborted).toBe(true);
  await act(async () =>
    response.resolve(Response.json(created, { status: 201 })),
  );
  expect(router.state.location.pathname).toBe("/systems");
});
