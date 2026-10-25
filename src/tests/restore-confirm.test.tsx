import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RestoreConfirmModal from "../components/RestoreConfirmModal";
import { getMockCharacterVersions } from "../mocks/characterVersions";

const versions = getMockCharacterVersions(
  "c1a00000-0000-4000-8000-000000000001",
  "alex@example.com",
)!;
const version = versions.find((item) => item.version_number === 4)!;

// Поддержка dialog в jsdom по примеру тестов остальных модальных окон.
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

describe("restoration confirmation", () => {
  test("blocks repeated confirmation and cancellation while the request is pending", async () => {
    let finish!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <RestoreConfirmModal
        open
        version={version}
        versions={versions}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Восстановить и удалить 3 версии" }),
    );
    const loadingButton = screen.getByRole("button", {
      name: "Восстановление…",
    });
    expect(loadingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
    await user.click(loadingButton);
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(
      screen.getByRole("button", { name: "Восстановить и удалить 3 версии" }),
    ).toBeEnabled();
  });

  test("keeps the dialog open after failure and allows retry", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("NETWORK_ERROR"))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      <RestoreConfirmModal
        open
        version={version}
        versions={versions}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Восстановить и удалить 3 версии" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось выполнить действие. Попробуйте ещё раз.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Восстановить и удалить 3 версии" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
