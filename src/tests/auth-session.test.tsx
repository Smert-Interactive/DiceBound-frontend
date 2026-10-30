import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";

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
