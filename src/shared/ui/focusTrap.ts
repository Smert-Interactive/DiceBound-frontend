import type { KeyboardEvent } from "react";

const FOCUSABLE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[tabindex]",
].join(", ");

// Элементы внутри container, на которые можно перейти клавишей Tab, в порядке документа.
export function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (element.tabIndex < 0 || element.matches(":disabled")) return false;
    if (element.closest("[hidden], [inert]")) return false;

    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

// Обработчик onKeyDown для окна или меню: Tab на последнем элементе возвращает фокус
// на первый, Shift+Tab на первом переводит на последний. Так фокус не уходит на страницу под окном.
export function trapTab(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;

  const container = event.currentTarget;
  const focusableElements = getFocusableElements(container);
  const first = focusableElements[0];
  const last = focusableElements.at(-1);
  const activeElement = document.activeElement;

  if (!first) {
    event.preventDefault();
    container.focus();
    return;
  }

  if (
    event.shiftKey &&
    (activeElement === first || activeElement === container)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (
    !event.shiftKey &&
    (activeElement === last || activeElement === container)
  ) {
    event.preventDefault();
    first.focus();
  }
}
