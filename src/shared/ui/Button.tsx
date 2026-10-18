import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "default" | "ghost" | "danger";
interface Appearance {
  variant?: Variant;
  size?: "normal" | "sm";
  icon?: ReactNode;
  iconOnly?: boolean;
  children?: ReactNode;
  className?: string;
}
type AccessibleIcon = { iconOnly: true; "aria-label": string } | { iconOnly?: false; "aria-label"?: string };
type ButtonProps = Appearance & AccessibleIcon & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  ({ variant: "ghost"; loading?: never; loadingText?: never } |
   { variant?: Exclude<Variant, "ghost">; loading?: boolean; loadingText?: string });

function classes({ variant = "default", size = "normal", iconOnly, className = "" }: Appearance) {
  return `ui-button ui-button--${variant} ui-button--${size}${iconOnly ? " ui-button--icon" : ""} ${className}`;
}

export function Loader() {
  return <svg className="ui-loader" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-8-8" /></svg>;
}

export function Button({ variant = "default", size, icon, iconOnly, className, loading = false,
  loadingText, disabled, children, type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} className={classes({variant, size, iconOnly, className})}
    disabled={disabled || loading} aria-busy={loading || undefined} data-loading={loading || undefined}>
    {/* Оба состояния занимают одну ячейку; скрытая подпись загрузки заранее резервирует ширину. */}
    <span className="ui-button__rest" aria-hidden={loading || undefined}>{icon}{children}</span>
    {(loadingText !== undefined || loading) && <span className="ui-button__loading" aria-hidden={!loading || undefined}>
      <Loader />{!iconOnly && (loadingText ?? children)}
    </span>}
  </button>;
}

export function ButtonLink({ variant, size, icon, iconOnly, className, disabled = false,
  children, ...props }: Appearance & AccessibleIcon & AnchorHTMLAttributes<HTMLAnchorElement> & { disabled?: boolean }) {
  const content = <span className="ui-button__rest">{icon}{children}</span>;
  const style = classes({variant, size, iconOnly, className});
  return disabled
    ? <span className={style} aria-disabled="true" aria-label={props["aria-label"]}>{content}</span>
    : <a {...props} className={style}>{content}</a>;
}
