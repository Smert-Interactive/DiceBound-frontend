import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShareAddModal from "../components/ShareAddModal";
import {
  createMemoryRouter,
  generatePath,
  RouterProvider,
} from "react-router-dom";
import { routes } from "../app/router";
import AuthProvider from "../auth/AuthProvider";
import { MOCK_USER } from "../auth/authContext";
import { ROUTES } from "../constants/routes";
import { MOCK_CHARACTERS } from "../mocks/characters";

// jsdom не открывает dialog самостоятельно; поведение формы проверяется с открытым окном.
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
  characterName: "Aldric",
  systemName: "D&D 5e",
};

describe("sharing form", () => {
  test.each([false, true])(
    "VIEW submits history visibility %s",
    async (history) => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <ShareAddModal {...props} onCancel={vi.fn()} onSubmit={onSubmit} />,
      );
      await user.type(screen.getByRole("textbox"), "friend@example.com");
      const checkbox = screen.getByRole("checkbox", {
        name: "Показывать историю версий",
      });
      expect(checkbox).not.toBeChecked();
      if (history) await user.click(checkbox);
      await user.click(
        screen.getByRole("button", { name: "Выдать доступ VIEW" }),
      );
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
        recipient_email: "friend@example.com",
        permission: "VIEW",
        history_visible: history,
      });
    },
  );

  test("EDIT omits the VIEW history flag even after it was enabled", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ShareAddModal {...props} onCancel={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox"), "friend@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("radio", { name: /Редактирование · EDIT/u }),
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Создать копию и выдать EDIT" }),
    );
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      recipient_email: "friend@example.com",
      permission: "EDIT",
    });
    await user.click(screen.getByRole("radio", { name: /Просмотр · VIEW/u }));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  test.each(["", "bad-address"])(
    "invalid email %s cannot be submitted",
    (email) => {
      const onSubmit = vi.fn();
      render(
        <ShareAddModal {...props} onCancel={vi.fn()} onSubmit={onSubmit} />,
      );
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: email } });
      fireEvent.submit(input.closest("form")!);
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  test("pending prevents submission, field changes and dismissal", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <ShareAddModal
        {...props}
        pending
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: /Просмотр · VIEW/u }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
    fireEvent.submit(input.closest("form")!);
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("without a connected service the form does not pretend to grant access", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ShareAddModal {...props} onCancel={onCancel} />);
    expect(
      screen.getByRole("button", { name: "Выдать доступ VIEW" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test("the owner can cancel and reopen a fresh form without changing grants", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: [
        generatePath(ROUTES.character, { id: MOCK_CHARACTERS.owned[0].id }),
      ],
    });
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={MOCK_USER}>
        <RouterProvider router={router} />
      </AuthProvider>,
    );
    await user.click(screen.getByRole("tab", { name: "Доступ" }));
    const add = screen.getByRole("button", {
      name: "Выдать доступ",
    });
    await user.click(add);
    await user.type(screen.getByRole("textbox"), "friend@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("radio", { name: /Редактирование · EDIT/u }),
    );
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await screen.findByRole("button", { name: "Выдать доступ" });
    await user.click(add);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.getByRole("radio", { name: /Просмотр · VIEW/u }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByText("friend@example.com")).not.toBeInTheDocument();
  });
});
