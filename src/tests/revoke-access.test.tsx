import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";
import RevokeAccessModal from "../components/RevokeAccessModal";
import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import { MOCK_CHARACTERS } from "../mocks/characters";

// jsdom заменяет только открытие dialog; запросы и действия формы проверяются настоящие.
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

const props = {
  open: true,
  recipientEmail: "user@example.com",
  characterName: "Aldric",
};

describe("VIEW revocation confirmation", () => {
  test("cancel and Escape do not confirm revocation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <RevokeAccessModal
        {...props}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("button", { name: "Отмена" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("a pending request blocks duplicate confirms and closing", async () => {
    let finish!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const onCancel = vi.fn();
    render(
      <RevokeAccessModal
        {...props}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Отозвать доступ" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(confirm).toBeDisabled();
    await act(async () => finish());
    expect(confirm).toBeEnabled();
  });

  test("failure preserves the target and allows retry without exposing server details", async () => {
    const user = userEvent.setup();
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("private backend detail"))
      .mockResolvedValue(undefined);
    render(
      <RevokeAccessModal {...props} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    const confirm = screen.getByRole("button", { name: "Отозвать доступ" });
    await user.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось выполнить действие. Попробуйте ещё раз.",
    );
    expect(
      screen.getByText(/У user@example.com пропадёт Aldric/u),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("private backend detail"),
    ).not.toBeInTheDocument();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("the owner cancels without changes, then revokes only the selected VIEW", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: [
        generatePath(ROUTES.character, { id: MOCK_CHARACTERS.owned[0].id }),
      ],
    });
    render(
      <AuthProvider initialUser={MOCK_USER}>
        <RouterProvider router={router} />
      </AuthProvider>,
    );
    await user.click(screen.getByRole("tab", { name: "Доступ" }));
    const target = screen.getByRole("row", { name: /user@example.com/u });
    expect(within(target).getByText("Открыта")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("row", { name: /player@example.com/u }),
      ).getByText("Скрыта"),
    ).toBeInTheDocument();
    const copy = screen.getByRole("row", { name: /editor@example.com/u });
    expect(within(copy).getByText("Своя у копии, с v1")).toBeInTheDocument();
    expect(within(copy).queryByRole("button")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Отозвать доступ user@example.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("row", { name: /user@example.com/u }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Отозвать доступ user@example.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Отозвать доступ" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("row", { name: /user@example.com/u }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("row", { name: /player@example.com/u }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /editor@example.com/u }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Доступ user@example.com отозван",
    );
    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Лист" }));
    await user.click(screen.getByRole("tab", { name: "Доступ" }));
    expect(screen.queryByText("user@example.com")).not.toBeInTheDocument();
  });
});
