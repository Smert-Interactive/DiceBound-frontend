import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import DeleteConfirmModal from "../components/DeleteConfirmModal";

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

test.each([
  [1, "Будут удалены лист, единственная версия истории и выданные доступы."],
  [2, "Будут удалены лист, все 2 версии истории и выданные доступы."],
  [5, "Будут удалены лист, все 5 версий истории и выданные доступы."],
])("history text for %s version(s)", (count, expected) => {
  render(
    <DeleteConfirmModal
      open
      characterName="Aldric"
      versionCount={count}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />,
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(expected);
});
