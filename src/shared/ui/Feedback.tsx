import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Button } from "./Button";

type Tone = "neutral" | "crimson" | "violet" | "ok";
export function Chip({ tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span {...props} className={`ui-chip ui-tone--${tone} ${className}`} />;
}

export function SystemBadge({ name, system = "imported", size = "list", viewOnly = false }:
  { name: string; system?: "dnd" | "coc" | "imported"; size?: "list" | "sheet"; viewOnly?: boolean }) {
  const text = system === "dnd" ? "D&D" : system === "coc" ? "CoC" : name.trim().split(/\s+/u).map(word => Array.from(word)[0]).join("").toUpperCase();
  const tone = { dnd: "crimson", coc: "ok", imported: "violet" }[system];
  return <span className={`ui-system ui-system--${size} ui-tone--${tone}`} data-view={viewOnly || undefined} aria-label={`${name}${viewOnly ? ", только просмотр" : ""}`}>{text}</span>;
}

type BannerIcon = "eye" | "check" | "alert" | "copy" | "clock";
const bannerIcons: Record<BannerIcon, ReactNode> = {
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function Banner({ title, children, variant = "info", icon, notification = false, onClose, className = "" }:
  { title: string; children?: ReactNode; variant?: "info" | "warning" | "success" | "error"; icon?: BannerIcon; notification?: boolean; onClose?: () => void; className?: string }) {
  const success = variant === "success";
  const warning = variant === "warning" || variant === "error";
  return <div className={`ui-banner ui-banner--${variant} ui-tone--${success ? "ok" : warning ? "crimson" : "violet"} ${className}`}
    role={variant === "error" ? "alert" : notification ? "status" : undefined}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {bannerIcons[icon ?? (success ? "check" : warning ? "alert" : "eye")]}
    </svg><div className="ui-banner__content"><div className="ui-banner__title">{title}</div>{children && <div className="ui-banner__description">{children}</div>}</div>
    {onClose && <Button className="ui-banner__close" variant="ghost" size="sm" onClick={onClose}>Закрыть</Button>}
  </div>;
}

export function Skeleton({ width = "100%", height = "1em", className = "" }: { width?: CSSProperties["width"]; height?: CSSProperties["height"]; className?: string }) {
  return <span className={`ui-skeleton ${className}`} style={{width, height}} aria-hidden="true" />;
}

export function EmptyState({ title, children, icon, action }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return <div className="ui-empty">{icon && <span className="ui-empty__icon" aria-hidden="true">{icon}</span>}
    <h2>{title}</h2>{children && <p>{children}</p>}{action}</div>;
}
