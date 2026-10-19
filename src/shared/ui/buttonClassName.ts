export type ButtonVariant = "primary" | "default" | "ghost" | "danger";

interface ButtonAppearance {
  variant?: ButtonVariant;
  size?: "normal" | "sm";
  iconOnly?: boolean;
  className?: string;
}

// Классы кнопки вынесены отдельно: ссылки роутера (Link) должны выглядеть как кнопка,
// но остаться элементом <a>. В файле с компонентами такую функцию экспортировать нельзя.
export function getButtonClassName({
  variant = "default",
  size = "normal",
  iconOnly,
  className = "",
}: ButtonAppearance) {
  return [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    iconOnly && "ui-button--icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
