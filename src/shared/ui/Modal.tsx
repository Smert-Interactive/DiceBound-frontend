import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent, ReactNode, RefObject, SyntheticEvent } from "react";

import { getFocusableElements, trapTab } from "./focusTrap";

import "./animations.css";
import "./Modal.css";

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

// Закрываемое окно требует onClose. Незакрываемое (dismissible: false) не реагирует на Esc и клик
// по затемнению, поэтому onClose ему не нужен: окно убирает только родитель, меняя open.
type CloseProps =
  | { dismissible?: true; onClose: () => void }
  | { dismissible: false; onClose?: undefined };

type ModalProps = CloseProps & {
  open: boolean;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
};

export function Modal({
  open,
  dismissible = true,
  onClose,
  title,
  children,
  actions,
  initialFocusRef,
  className = "",
}: ModalProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const originalOverflowRef = useRef<string | null>(null);

  // Esc: браузер сам закрыл бы окно, поэтому отмена всегда блокируется,
  // а закрывает окно родитель через onClose (если окно закрываемое).
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (dismissible) onClose?.();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (!dismissible || event.target !== event.currentTarget) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const outsideHorizontal =
      event.clientX < bounds.left || event.clientX > bounds.right;
    const outsideVertical =
      event.clientY < bounds.top || event.clientY > bounds.bottom;

    if (outsideHorizontal || outsideVertical) onClose?.();
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

    // Стрелочные функции, а не function: так TypeScript помнит, что dialog не null.
    const finishClosing = () => {
      if (finished) return;
      finished = true;
      dialog.close();
      dialog.classList.remove("ui-modal--closing");
      restorePage();
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.target === dialog) finishClosing();
    };

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
      className={`ui-modal ${className}`}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onCancel={handleCancel}
      onKeyDown={trapTab}
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
