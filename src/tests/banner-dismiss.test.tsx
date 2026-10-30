import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Banner } from "../shared/ui";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Управляем завершением нативной анимации, чтобы проверить момент удаления уведомления.
function installAnimation() {
  const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() };
  const animate = vi.fn(() => animation as unknown as Animation);
  const original = HTMLElement.prototype.animate;
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  return {
    animation,
    animate,
    restore: () => {
      if (original)
        Object.defineProperty(HTMLElement.prototype, "animate", {
          configurable: true,
          value: original,
        });
      else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    },
  };
}

test("a success notification starts closing at four seconds and waits for its exit animation", () => {
  const motion = installAnimation();
  try {
    const onClose = vi.fn();
    render(
      <Banner
        variant="success"
        notification
        title="Удалено"
        onClose={onClose}
      />,
    );
    act(() => vi.advanceTimersByTime(3999));
    expect(motion.animate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(motion.animate).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeDisabled();
    expect(motion.animate.mock.calls[0]).toEqual([
      expect.arrayContaining([
        expect.objectContaining({ height: "0px", opacity: 0 }),
      ]),
      expect.objectContaining({ duration: 240 }),
    ]);
    act(() => motion.animation.onfinish?.());
    expect(onClose).toHaveBeenCalledTimes(1);
  } finally {
    motion.restore();
  }
});

test("manual close uses the same animation and cannot invoke its callback twice", () => {
  const motion = installAnimation();
  try {
    const onClose = vi.fn();
    render(
      <Banner
        variant="success"
        notification
        title="Создано"
        onClose={onClose}
      />,
    );
    const close = screen.getByRole("button", { name: "Закрыть" });
    fireEvent.click(close);
    fireEvent.click(close);
    act(() => vi.advanceTimersByTime(4000));
    expect(motion.animate).toHaveBeenCalledTimes(1);
    act(() => motion.animation.onfinish?.());
    expect(onClose).toHaveBeenCalledTimes(1);
  } finally {
    motion.restore();
  }
});

test("a replacement notification gets a fresh four-second lifetime", () => {
  const first = vi.fn(),
    second = vi.fn();
  const { rerender } = render(
    <Banner variant="success" notification title="Первое" onClose={first} />,
  );
  act(() => vi.advanceTimersByTime(3000));
  rerender(
    <Banner variant="success" notification title="Второе" onClose={second} />,
  );
  act(() => vi.advanceTimersByTime(3999));
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(second).toHaveBeenCalledTimes(1);
});

test("a new callback on rerender does not restart the existing timer", () => {
  const first = vi.fn(),
    second = vi.fn();
  const { rerender } = render(
    <Banner variant="success" notification title="Сохранено" onClose={first} />,
  );
  act(() => vi.advanceTimersByTime(3000));
  rerender(
    <Banner
      variant="success"
      notification
      title="Сохранено"
      onClose={second}
    />,
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

test("errors, ongoing loading and schema feedback do not close automatically", () => {
  const errorClose = vi.fn(),
    infoClose = vi.fn();
  render(
    <>
      <Banner
        variant="error"
        notification
        title="Ошибка"
        onClose={errorClose}
      />
      <Banner notification title="Обновление профиля…" onClose={infoClose} />
      <Banner variant="success" notification title="Схема корректна" />
    </>,
  );
  act(() => vi.advanceTimersByTime(10000));
  expect(errorClose).not.toHaveBeenCalled();
  expect(infoClose).not.toHaveBeenCalled();
  expect(screen.getByText("Схема корректна")).toBeInTheDocument();
});

test("unmount cancels both a pending timer and a running exit animation", () => {
  const first = vi.fn();
  const view = render(
    <Banner
      variant="success"
      notification
      title="Уведомление"
      onClose={first}
    />,
  );
  view.unmount();
  act(() => vi.advanceTimersByTime(5000));
  expect(first).not.toHaveBeenCalled();
  const motion = installAnimation();
  try {
    const second = vi.fn();
    const animated = render(
      <Banner variant="success" notification title="Другое" onClose={second} />,
    );
    act(() => vi.advanceTimersByTime(4000));
    animated.unmount();
    expect(motion.animation.cancel).toHaveBeenCalledTimes(1);
    expect(motion.animation.onfinish).toBeNull();
    expect(second).not.toHaveBeenCalled();
  } finally {
    motion.restore();
  }
});

test("automatic dismissal keeps keyboard focus outside the notification", () => {
  render(
    <>
      <input aria-label="Имя персонажа" />
      <button>Другое действие</button>
      <Banner
        variant="success"
        notification
        title="Импорт завершён"
        onClose={() =>
          screen.getByRole("button", { name: "Другое действие" }).focus()
        }
      />
    </>,
  );
  const input = screen.getByRole("textbox");
  input.focus();
  act(() => vi.advanceTimersByTime(4000));
  expect(input).toHaveFocus();
});

test("mobile icon close also dismisses at four seconds", () => {
  const close = vi.fn();
  render(
    <Banner
      variant="success"
      notification
      closeIconOnly
      title="Система удалена"
      onClose={close}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Закрыть уведомление" }),
  ).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(4000));
  expect(close).toHaveBeenCalledTimes(1);
});

test("reduced motion skips the exit animation while preserving the four-second delay", () => {
  const motion = installAnimation();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  try {
    const close = vi.fn();
    render(
      <Banner
        variant="success"
        notification
        title="Завершено"
        onClose={close}
      />,
    );
    act(() => vi.advanceTimersByTime(3999));
    expect(close).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(close).toHaveBeenCalledTimes(1);
    expect(motion.animate).not.toHaveBeenCalled();
  } finally {
    motion.restore();
  }
});

test("collapsing a banner also removes one surrounding column gap", () => {
  const motion = installAnimation();
  try {
    render(
      <div style={{ display: "flex", flexDirection: "column", rowGap: "22px" }}>
        <h1>Персонажи</h1>
        <Banner
          variant="success"
          notification
          title="Удалено"
          onClose={vi.fn()}
        />
        <p>Список</p>
      </div>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(motion.animate.mock.calls[0]).toEqual([
      expect.arrayContaining([
        expect.objectContaining({ height: "0px", marginBottom: "-22px" }),
      ]),
      expect.anything(),
    ]);
  } finally {
    motion.restore();
  }
});
