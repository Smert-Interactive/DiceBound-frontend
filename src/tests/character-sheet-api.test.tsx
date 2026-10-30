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
import { character, schema, summary } from "./helpers/characterApiFixtures";
import * as calculations from "../sheet/recalculate";

// Проверяем настоящие маршруты и HTTP-клиент с управляемыми ответами сервера.
function openSheet(path = `/characters/${character.id}`) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, user: userEvent.setup() };
}

// Неизвестные запросы запрещены: история, sharing и список активных систем здесь не нужны.
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
      if (
        url === `/api/v1/characters/${character.id}` &&
        options?.method === "GET"
      )
        return Response.json(character);
      if (url === `/api/v1/schemas/${schema.id}`) return Response.json(schema);
      if (url === "/api/v1/characters")
        return Response.json({ owned: [summary], shared_view: [] });
      throw new Error(`Unexpected request ${options?.method} ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Задержка моделирует медленную сеть и ответы после ухода со страницы.
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

test("loads the real schema without requesting history or active systems", async () => {
  const response = delayed();
  const fetchMock = installApi((url) =>
    url.endsWith(character.id) ? response.promise : undefined,
  );
  openSheet();
  expect(
    screen.getByRole("status", { name: "Лист загружается" }),
  ).toBeInTheDocument();
  await act(async () => response.resolve(Response.json(character)));
  expect(await screen.findByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Raven",
  );
  expect(screen.getByText("Orbital")).toBeInTheDocument();
  expect(screen.getByText("Лист: Flight sheet")).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Хлебные крошки" }),
  ).toHaveTextContent("Server pilot");
  expect(screen.getByRole("tab", { name: "История" })).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Доступ" })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test("PUT sends the complete editable data once and accepts the server version and normalized values", async () => {
  const response = delayed();
  const fetchMock = installApi((_url, options) =>
    options?.method === "PUT" ? response.promise : undefined,
  );
  const { user } = openSheet();
  fireEvent.change(await screen.findByRole("textbox", { name: "Мощность" }), {
    target: { value: "12" },
  });
  const save = screen.getByRole("button", { name: "Сохранить" });
  fireEvent.click(save);
  fireEvent.click(save);
  const calls = fetchMock.mock.calls.filter(
    ([, options]) => options?.method === "PUT",
  );
  expect(calls).toHaveLength(1);
  expect(calls[0][0]).toBe(`/api/v1/characters/${character.id}`);
  expect(calls[0][1]).toMatchObject({
    credentials: "include",
    signal: expect.any(AbortSignal),
  });
  expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
    data: {
      callsign: "Raven",
      power: 12,
      ready: false,
      fuel: { current: 0, max: 10 },
      role: "scout",
    },
  });
  expect(screen.getByRole("tabpanel").firstChild).toHaveAttribute("inert");
  await act(async () =>
    response.resolve(
      Response.json({
        ...character,
        data: { ...character.data, power: 14, bonus: 7 },
        current_version_number: 9,
        updated_at: "2026-10-30T12:00:00Z",
      }),
    ),
  );
  expect(
    await screen.findByText("Сохранено · создана версия 9"),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Мощность" })).toHaveValue("14");
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Мощность" }), {
    target: { value: "18" },
  });
  await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
  expect(screen.getByRole("textbox", { name: "Мощность" })).toHaveValue("14");
});

test("a failed save keeps the draft and retry sends the same complete data", async () => {
  let attempts = 0;
  const fetchMock = installApi((_url, options) => {
    if (options?.method !== "PUT") return;
    attempts++;
    return attempts === 1
      ? Promise.reject(new TypeError("offline"))
      : Response.json({ ...character, current_version_number: 4 });
  });
  const { user } = openSheet();
  fireEvent.change(await screen.findByRole("textbox", { name: "Позывной" }), {
    target: { value: "Falcon" },
  });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByText("Не удалось сохранить")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Позывной" })).toHaveValue(
    "Falcon",
  );
  await user.click(screen.getByRole("button", { name: "Повторить" }));
  expect(
    await screen.findByText("Сохранено · создана версия 4"),
  ).toBeInTheDocument();
  const bodies = fetchMock.mock.calls
    .filter(([, options]) => options?.method === "PUT")
    .map(([, options]) => options?.body);
  expect(bodies[0]).toBe(bodies[1]);
});

test("422 details mark the server field and preserve the draft until correction", async () => {
  installApi((_url, options) =>
    options?.method === "PUT"
      ? Response.json(
          {
            code: "VALIDATION_ERROR",
            message: "Invalid",
            details: [{ field: "data.power", message: "Server limit" }],
          },
          { status: 422 },
        )
      : undefined,
  );
  const { user } = openSheet();
  fireEvent.change(await screen.findByRole("textbox", { name: "Мощность" }), {
    target: { value: "12" },
  });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByText("Server limit")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Мощность" })).toHaveValue("12");
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Мощность" }), {
    target: { value: "10" },
  });
  expect(screen.queryByText("Server limit")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
});

test.each(["character", "schema"])(
  "a failed %s GET offers retry",
  async (stage) => {
    let failed = false;
    installApi((url, options) => {
      if (
        !failed &&
        options?.method === "GET" &&
        url ===
          (stage === "schema"
            ? `/api/v1/schemas/${schema.id}`
            : `/api/v1/characters/${character.id}`)
      ) {
        failed = true;
        return Response.json({}, { status: 503 });
      }
    });
    const { user } = openSheet();
    await user.click(await screen.findByRole("button", { name: "Повторить" }));
    expect(
      await screen.findByRole("textbox", { name: "Позывной" }),
    ).toHaveValue("Raven");
  },
);

test.each([403, 404])(
  "GET %s never falls back to mock data",
  async (status) => {
    installApi((url) =>
      url.endsWith(character.id) ? Response.json({}, { status }) : undefined,
    );
    openSheet();
    expect(
      await screen.findByRole("heading", {
        name: "Персонаж не найден или доступ закрыт",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  },
);

test.each(["GET", "PUT"])(
  "%s 401 clears the session and preserves the return address",
  async (method) => {
    installApi((url, options) =>
      url.endsWith(character.id) && options?.method === method
        ? Response.json({}, { status: 401 })
        : undefined,
    );
    const { router, user } = openSheet(
      `/characters/${character.id}?source=list#sheet`,
    );
    if (method === "PUT") {
      fireEvent.change(
        await screen.findByRole("textbox", { name: "Позывной" }),
        { target: { value: "Falcon" } },
      );
      await user.click(screen.getByRole("button", { name: "Сохранить" }));
    }
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.state.from).toMatchObject({
      pathname: `/characters/${character.id}`,
      search: "?source=list",
      hash: "#sheet",
    });
  },
);

test.each(["GET", "PUT"])(
  "leaving aborts %s and ignores a late response",
  async (method) => {
    const response = delayed();
    const fetchMock = installApi((url, options) =>
      url.endsWith(character.id) && options?.method === method
        ? response.promise
        : undefined,
    );
    const { router, user } = openSheet();
    if (method === "PUT") {
      fireEvent.change(
        await screen.findByRole("textbox", { name: "Позывной" }),
        { target: { value: "Falcon" } },
      );
      await user.click(screen.getByRole("button", { name: "Сохранить" }));
    }
    const call = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url).endsWith(character.id) && options?.method === method,
    )!;
    await act(async () => {
      await router.navigate("/characters");
    });
    expect(call[1]?.signal?.aborted).toBe(true);
    await act(async () =>
      response.resolve(
        Response.json({ ...character, current_version_number: 99 }),
      ),
    );
    expect(router.state.location.pathname).toBe("/characters");
    expect(screen.queryByText(/создана версия 99/u)).not.toBeInTheDocument();
  },
);

test("VIEW uses stored calculated and has no editing controls", async () => {
  const calculate = vi.spyOn(calculations, "recalculateSheet");
  installApi((url) =>
    url.endsWith(character.id)
      ? Response.json({
          ...character,
          access: "VIEW",
          can_edit: false,
          data: { ...character.data, bonus: 99 },
        })
      : undefined,
  );
  openSheet();
  expect(await screen.findByText("Только просмотр")).toBeInTheDocument();
  expect(screen.getByText("+99")).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Сохранить" }),
  ).not.toBeInTheDocument();
  expect(calculate).not.toHaveBeenCalled();
});

test("a missing server snapshot cannot fall back to mock data", async () => {
  installApi((url) =>
    url.endsWith("/versions/1")
      ? Response.json({}, { status: 404 })
      : undefined,
  );
  openSheet(`/characters/${character.id}/versions/1`);
  expect(
    await screen.findByRole("heading", {
      name: "Персонаж не найден или доступ закрыт",
    }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
