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
import { ROUTES } from "../constants/routes";
import DeleteSystemModal from "../components/DeleteSystemModal";
import { MOCK_SYSTEMS, SPACE_FRONTIER_SYSTEM_ID } from "../mocks/systems";

// Подменяем только нативный dialog, чтобы сценарий работал в jsdom.
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
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

test("cancel preserves the system; deletion removes it from creation and preserves existing sheets", async () => {
  const user = userEvent.setup();
  const router = createMemoryRouter(routes, {
    initialEntries: [ROUTES.systems],
  });
  render(
    <AuthProvider initialUser={MOCK_USER}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  const remove = screen.getByRole("button", {
    name: "Удалить систему Space Frontier",
  });
  await user.click(remove);
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Система будет удалена.",
  );
  await user.click(screen.getByRole("button", { name: "Отмена" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(remove).toHaveFocus();
  await user.click(remove);
  await user.click(screen.getByRole("button", { name: "Удалить систему" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Система «Space Frontier» удалена из списка игровых систем.",
  );
  expect(
    screen.getByRole("link", { name: "Импортировать из JSON" }),
  ).toHaveFocus();
  expect(
    screen.queryByRole("button", { name: "Удалить систему Space Frontier" }),
  ).not.toBeInTheDocument();
  await act(() => router.navigate(ROUTES.newCharacter));
  expect(
    screen.queryByRole("radio", { name: /Space Frontier/u }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("radio", { name: /Custom System/u }),
  ).toBeInTheDocument();
  await act(() => router.navigate(ROUTES.systems));
  await user.click(
    screen.getByRole("button", { name: "Удалить систему Custom System" }),
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "На системе есть 1 персонаж, включая чужих.",
  );
  await user.click(screen.getByRole("button", { name: "Удалить систему" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await act(() =>
    router.navigate("/characters/c1a00000-0000-4000-8000-000000000003"),
  );
  expect(
    screen.getByRole("heading", { name: "Viktor (копия)" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Ранг" })).toBeInTheDocument();
});

test("a failed deletion keeps the dialog and allows retry while preventing duplicate requests", async () => {
  const user = userEvent.setup();
  let resolve!: () => void;
  const request = new Promise<void>((done) => {
    resolve = done;
  });
  const onConfirm = vi
    .fn()
    .mockRejectedValueOnce(new Error("private backend text"))
    .mockReturnValue(request);
  const onCancel = vi.fn();
  render(
    <DeleteSystemModal
      open
      system={MOCK_SYSTEMS.find(
        (system) => system.id === SPACE_FRONTIER_SYSTEM_ID,
      )!}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Удалить систему" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Не удалось выполнить действие. Попробуйте ещё раз.",
  );
  expect(screen.queryByText("private backend text")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Удалить систему" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Отмена" })).toBeDisabled();
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  fireEvent.click(screen.getByRole("button", { name: "Удаление…" }));
  expect(onCancel).not.toHaveBeenCalled();
  expect(onConfirm).toHaveBeenCalledTimes(2);
  resolve();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Удалить систему" }),
    ).toBeEnabled(),
  );
});
