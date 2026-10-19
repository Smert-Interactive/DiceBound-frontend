import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { LoaderIcon } from "../icons";
import { getButtonClassName } from "./buttonClassName";
import type { ButtonVariant as Variant } from "./buttonClassName";

import "./Button.css";

interface Appearance {
  variant?: Variant;
  size?: "normal" | "sm";
  icon?: ReactNode;
  iconOnly?: boolean;
  children?: ReactNode;
  className?: string;
}

type AccessibleIcon =
  | { iconOnly: true; "aria-label": string }
  | { iconOnly?: false; "aria-label"?: string };

type LoadingProps =
  | { variant: "ghost"; loading?: never; loadingText?: never }
  | {
      variant?: Exclude<Variant, "ghost">;
      loading?: boolean;
      loadingText?: string;
    };

type ButtonProps = Appearance &
  AccessibleIcon &
  LoadingProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

type ButtonLinkProps = Appearance &
  AccessibleIcon &
  AnchorHTMLAttributes<HTMLAnchorElement> & { disabled?: boolean };


export function Button({
  variant = "default",
  size,
  icon,
  iconOnly,
  className,
  loading = false,
  loadingText,
  disabled,
  children,
  type = "button",
  ...buttonProps
}: ButtonProps) {
  const buttonClassName = getButtonClassName({
    variant,
    size,
    iconOnly,
    className,
  });
  const hasLoadingLabel = loadingText !== undefined || loading;

  return (
    <button
      {...buttonProps}
      type={type}
      className={buttonClassName}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
    >
      {/* Скрытая подпись загрузки резервирует ширину,
          поэтому соседние кнопки не сдвигаются. */}
      <span className="ui-button__rest" aria-hidden={loading || undefined}>
        {icon}
        {children}
      </span>
      {hasLoadingLabel && (
        <span
          className="ui-button__loading"
          aria-hidden={!loading || undefined}
        >
          <LoaderIcon />
          {!iconOnly && (loadingText ?? children)}
        </span>
      )}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconOnly,
  className,
  disabled = false,
  children,
  ...linkProps
}: ButtonLinkProps) {
  const buttonClassName = getButtonClassName({
    variant,
    size,
    iconOnly,
    className,
  });
  const content = (
    <span className="ui-button__rest">
      {icon}
      {children}
    </span>
  );

  if (disabled) {
    return (
      <span
        className={buttonClassName}
        aria-disabled="true"
        aria-label={linkProps["aria-label"]}
      >
        {content}
      </span>
    );
  }

  return (
    <a {...linkProps} className={buttonClassName}>
      {content}
    </a>
  );
}
