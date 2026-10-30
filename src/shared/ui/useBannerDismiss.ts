import { useCallback, useEffect, useRef, useState } from "react";

// Закрывает уведомление с плавным сворачиванием; таймер и анимация отменяются при уходе.
export function useBannerDismiss(
  onClose: (() => void) | undefined,
  delay: number | undefined,
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onClose);
  const animationRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    callbackRef.current = onClose;
  }, [onClose]);

  // Ручное и автоматическое закрытие проходят один путь и вызывают родителя только один раз.
  const dismiss = useCallback(() => {
    const element = elementRef.current;
    if (!element || !callbackRef.current || closingRef.current) return;
    closingRef.current = true;
    setClosing(true);

    // Автозакрытие не уводит фокус с поля, в котором пользователь продолжает работать.
    function finish() {
      const active = document.activeElement;
      const preserveFocus =
        active instanceof HTMLElement &&
        active !== document.body &&
        !element!.contains(active);
      callbackRef.current?.();
      if (preserveFocus && active.isConnected)
        active.focus({ preventScroll: true });
    }

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion || typeof element.animate !== "function") {
      finish();
      return;
    }
    const styles = getComputedStyle(element);
    const parent = element.parentElement;
    const parentStyles = parent && getComputedStyle(parent);
    const column =
      parentStyles?.display === "flex" &&
      parentStyles.flexDirection.startsWith("column");
    const gap =
      column && parent!.children.length > 1
        ? Number.parseFloat(parentStyles.rowGap) || 0
        : 0;
    // Убираем и высоту, и один промежуток flex-контейнера: соседний блок не прыгает в конце.
    const animation = element.animate(
      [
        {
          boxSizing: "border-box",
          overflow: "hidden",
          height: `${element.getBoundingClientRect().height}px`,
          opacity: 1,
          transform: "translateY(0)",
          paddingTop: styles.paddingTop,
          paddingBottom: styles.paddingBottom,
          borderTopWidth: styles.borderTopWidth,
          borderBottomWidth: styles.borderBottomWidth,
          marginBottom: styles.marginBottom,
        },
        {
          boxSizing: "border-box",
          overflow: "hidden",
          height: "0px",
          opacity: 0,
          transform: "translateY(-6px)",
          paddingTop: "0px",
          paddingBottom: "0px",
          borderTopWidth: "0px",
          borderBottomWidth: "0px",
          marginBottom: `${-gap}px`,
        },
      ],
      {
        duration: 240,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    animationRef.current = animation;
    animation.onfinish = finish;
  }, []);

  const hasClose = onClose !== undefined;
  useEffect(() => {
    if (delay === undefined || delay <= 0 || !hasClose) return;
    const timer = window.setTimeout(dismiss, delay);
    return () => window.clearTimeout(timer);
  }, [delay, hasClose, dismiss]);

  useEffect(
    () => () => {
      if (animationRef.current) {
        animationRef.current.onfinish = null;
        animationRef.current.cancel();
      }
    },
    [],
  );
  return { elementRef, closing, dismiss };
}
