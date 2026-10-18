import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from "react";

const FOCUSABLE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[tabindex]",
].join(", ");

function getFocusableElements(dialog: HTMLDialogElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (element.tabIndex < 0 || element.matches(":disabled")) return false;
    if (element.closest("[hidden], [inert]")) return false;

    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function parseCssTime(value: string) {
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith("ms") ? number : number * 1000;
}

function getAnimationDuration(element: HTMLElement) {
  const style = getComputedStyle(element);
  const durations = style.animationDuration.split(",").map(parseCssTime);
  const delays = style.animationDelay.split(",").map(parseCssTime);

  return durations.reduce((maximum, duration, index) => {
    const delay = delays[index % delays.length] ?? 0;
    return Math.max(maximum, duration + delay);
  }, 0);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  initialFocusRef,
}: ModalProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const originalOverflowRef = useRef<string | null>(null);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;

    const dialog = event.currentTarget;
    const focusableElements = getFocusableElements(dialog);
    const first = focusableElements[0];
    const last = focusableElements.at(-1);
    const activeElement = document.activeElement;

    if (!first) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    if (
      event.shiftKey &&
      (activeElement === first || activeElement === dialog)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === last || activeElement === dialog)
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const outsideHorizontal =
      event.clientX < bounds.left || event.clientX > bounds.right;
    const outsideVertical =
      event.clientY < bounds.top || event.clientY > bounds.bottom;

    if (outsideHorizontal || outsideVertical) onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function restorePage() {
      if (originalOverflowRef.current !== null) {
        document.body.style.overflow = originalOverflowRef.current;
        originalOverflowRef.current = null;
      }
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    }

    if (open) {
      dialog.classList.remove("ui-modal--closing");

      if (!dialog.open) {
        const activeElement = document.activeElement;
        returnFocusRef.current =
          activeElement instanceof HTMLElement ? activeElement : null;
        originalOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.showModal();

        const focusTarget =
          initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog;
        focusTarget.focus();
      }
      return;
    }

    if (!dialog.open) return;
    dialog.classList.add("ui-modal--closing");
    let finished = false;

    function finishClosing() {
      if (finished) return;
      finished = true;
      dialog!.close();
      dialog!.classList.remove("ui-modal--closing");
      restorePage();
    }

    function handleAnimationEnd(event: AnimationEvent) {
      if (event.target === dialog) finishClosing();
    }

    dialog.addEventListener("animationend", handleAnimationEnd);
    // Таймер завершает закрытие даже без animationend, в том числе при reduced motion.
    const timer = window.setTimeout(
      finishClosing,
      getAnimationDuration(dialog),
    );

    return () => {
      window.clearTimeout(timer);
      dialog.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    const dialog = dialogRef.current;

    return () => {
      dialog?.close();
      if (originalOverflowRef.current !== null) {
        document.body.style.overflow = originalOverflowRef.current;
        originalOverflowRef.current = null;
      }
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="ui-modal"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div className="ui-modal__handle" aria-hidden="true" />
      <h2 id={`${id}-title`}>{title}</h2>
      <div className="ui-modal__body">{children}</div>
      {actions && <div className="ui-modal__actions">{actions}</div>}
    </dialog>,
    document.body,
  );
}
