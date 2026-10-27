import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
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
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

describe("restoration confirmation", () => {
  test.each([
    [6, 1, "версию"],
    [4, 3, "версии"],
    [1, 6, "версий"],
  ])(
    "v%s confirmation names the actual deletion count: %s %s",
    async (target, count, word) => {
      const onConfirm = vi
        .fn<() => Promise<void>>()
        .mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(
        <RestoreConfirmModal
          open
          version={versions.find((item) => item.version_number === target)!}
          versions={versions}
          onCancel={vi.fn()}
          onConfirm={onConfirm}
        />,
      );
      const button = screen.getByRole("button", {
        name: `Восстановить и удалить ${count} ${word}`,
      });
      const timeline = screen.getByRole("list", {
        name: "Последствия восстановления версий",
      });
      expect(
        within(timeline).getAllByRole("listitem", { name: /будет удалена/u }),
      ).toHaveLength(count);
      await user.click(button);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    },
  );

  test.each([
    [
      4,
      "Версия 4 станет текущей. Версии 5, 6 и 7 будут удалены. Действие необратимо.",
    ],
    [
      6,
      "Версия 6 станет текущей. Версия 7 будет удалена. Действие необратимо.",
    ],
  ])(
    "phone text for v%s lists numbers without a v prefix",
    (target, expected) => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn((media: string) => ({
          matches: media === "(max-width: 639px)",
          media,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
      render(
        <RestoreConfirmModal
          open
          version={versions.find((item) => item.version_number === target)!}
          versions={versions}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.getByText(expected)).toBeInTheDocument();
      // Подписи к таймлайну есть только на desktop.
      expect(screen.queryByText("станет текущей")).toBeNull();
    },
  );

  test("desktop text names the date and the deleted versions", () => {
    render(
      <RestoreConfirmModal
        open
        version={version}
        versions={versions}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        /Персонаж получит данные версии 4 от .*Версии 5, 6 и 7 будут удалены без возможности вернуть\./u,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("станет текущей")).toBeInTheDocument();
  });

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
