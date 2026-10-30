import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ShareAddModal from "../components/ShareAddModal";

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
    expect(
      screen.getByText(/У получателя появится «Aldric \(копия\)»/u),
    ).toHaveTextContent(
      "Выдачу нельзя отменить: копия остаётся у получателя и не синхронизируется с оригиналом.",
    );
    await user.click(
      screen.getByRole("button", { name: "Создать копию и выдать EDIT" }),
    );
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      recipient_email: "friend@example.com",
      permission: "EDIT",
    });
    await user.click(screen.getByRole("radio", { name: /Просмотр · VIEW/u }));
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(
      screen.queryByText(/У получателя появится/u),
    ).not.toBeInTheDocument();
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
      expect(input).toHaveAccessibleDescription(
        email
          ? "Введите почту в формате name@example.com"
          : "Введите почту пользователя",
      );
      expect(
        screen.getByRole("button", { name: "Выдать доступ VIEW" }),
      ).toBeDisabled();
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
});

describe("sharing errors", () => {
  test("leaving an invalid email shows its error before any request", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ShareAddModal {...props} onCancel={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox"), "bad-address");
    await user.tab();
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
      "Введите почту в формате name@example.com",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("a network error can be retried with the same parameters without exposing server text", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error("private SQL detail"))
      .mockResolvedValue(undefined);
    render(<ShareAddModal {...props} onCancel={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox"), "friend@example.com");
    const submit = screen.getByRole("button", { name: "Выдать доступ VIEW" });
    await user.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось выполнить действие. Попробуйте ещё раз.",
    );
    expect(screen.queryByText("private SQL detail")).not.toBeInTheDocument();
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit.mock.calls[1]).toEqual(onSubmit.mock.calls[0]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("an async submission immediately blocks duplicate requests and dismissal", async () => {
    let finish!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const onCancel = vi.fn();
    render(
      <ShareAddModal {...props} onCancel={onCancel} onSubmit={onSubmit} />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "friend@example.com" } });
    fireEvent.submit(input.closest("form")!);
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(input).toBeDisabled();
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(input).toBeEnabled();
  });
});
