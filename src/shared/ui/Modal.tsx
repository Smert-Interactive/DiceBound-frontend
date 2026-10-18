import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode, RefObject } from "react";

// Нативный dialog блокирует фон; open управляется родителем.
// При закрытии элемент остаётся смонтированным до окончания анимации.
export function Modal({ open, onClose, title, children, actions, initialFocusRef }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
  actions?: ReactNode; initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const originalOverflow = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const restore = () => {
      if (originalOverflow.current !== null) {
        document.body.style.overflow = originalOverflow.current;
        originalOverflow.current = null;
      }
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
    if (open) {
      dialog.classList.remove("ui-modal--closing");
      if (!dialog.open) {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        originalOverflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.showModal();
        (initialFocusRef?.current ?? dialog.querySelector<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']") ?? dialog).focus();
      }
      return;
    }
    if (!dialog.open) return;
    dialog.classList.add("ui-modal--closing");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      dialog.close();
      dialog.classList.remove("ui-modal--closing");
      restore();
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target === dialog) finish();
    };
    dialog.addEventListener("animationend", onAnimationEnd);
    // Длительность приходит из CSS и motion/exit; таймер также покрывает отсутствие анимации.
    const duration = getComputedStyle(dialog).animationDuration.split(",").reduce((max, value) => {
      const milliseconds = parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
      return Math.max(max, Number.isFinite(milliseconds) ? milliseconds : 0);
    }, 0);
    const timer = window.setTimeout(finish, duration);
    return () => {
      window.clearTimeout(timer);
      dialog.removeEventListener("animationend", onAnimationEnd);
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      dialog?.close();
      if (originalOverflow.current !== null) {
        document.body.style.overflow = originalOverflow.current;
        originalOverflow.current = null;
      }
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, []);

  return createPortal(<dialog ref={dialogRef} className="ui-modal" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}
    onCancel={event => { event.preventDefault(); onCloseRef.current(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]"))
        .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[hidden], [inert]"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first) { event.preventDefault(); event.currentTarget.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
        event.preventDefault(); first.focus();
      }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCloseRef.current();
    }}>
    <div className="ui-modal__handle" aria-hidden="true" />
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="ui-modal__body">{children}</div>
    {actions && <div className="ui-modal__actions">{actions}</div>}
  </dialog>, document.body);
}
