import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  EyeIcon,
} from "../icons";
import { Button } from "./Button";

import "./animations.css";
import "./Feedback.css";

type Tone = "neutral" | "crimson" | "violet" | "ok";
type ChipProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Chip({
  tone = "neutral",
  className = "",
  ...props
}: ChipProps) {
  return (
    <span {...props} className={`ui-chip ui-tone--${tone} ${className}`} />
  );
}

interface SystemBadgeProps {
  name: string;
  system?: "dnd" | "coc" | "imported";
  size?: "list" | "sheet";
  viewOnly?: boolean;
}

export function SystemBadge({
  name,
  system = "imported",
  size = "list",
  viewOnly = false,
}: SystemBadgeProps) {
  let abbreviation: string;

  if (system === "dnd") {
    abbreviation = "D&D";
  } else if (system === "coc") {
    abbreviation = "CoC";
  } else {
    abbreviation = name
      .trim()
      .split(/\s+/u)
      .map((word) => Array.from(word)[0])
      .join("")
      .toUpperCase();
  }

  const tone = { dnd: "crimson", coc: "ok", imported: "violet" }[system];
  const accessibleName = viewOnly ? `${name}, только просмотр` : name;

  return (
    <span
      role="img"
      className={`ui-system ui-system--${size} ui-tone--${tone}`}
      data-view={viewOnly || undefined}
      aria-label={accessibleName}
    >
      {abbreviation}
    </span>
  );
}

type BannerIcon = "eye" | "check" | "alert" | "copy" | "clock";
type BannerVariant = "info" | "warning" | "success" | "error";

const bannerIcons: Record<BannerIcon, typeof EyeIcon> = {
  eye: EyeIcon,
  check: CheckIcon,
  alert: AlertIcon,
  copy: CopyIcon,
  clock: ClockIcon,
};

const bannerAppearance: Record<
  BannerVariant,
  { tone: Tone; icon: BannerIcon }
> = {
  info: { tone: "violet", icon: "eye" },
  warning: { tone: "crimson", icon: "alert" },
  error: { tone: "crimson", icon: "alert" },
  success: { tone: "ok", icon: "check" },
};

interface BannerProps {
  title: string;
  children?: ReactNode;
  variant?: BannerVariant;
  icon?: BannerIcon;
  notification?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Banner({
  title,
  children,
  variant = "info",
  icon,
  notification = false,
  onClose,
  className = "",
}: BannerProps) {
  const appearance = bannerAppearance[variant];
  const SelectedIcon = bannerIcons[icon ?? appearance.icon];
  let role: "alert" | "status" | undefined;

  if (variant === "error") {
    role = "alert";
  } else if (notification) {
    role = "status";
  }

  return (
    <div
      className={`ui-banner ui-banner--${variant} ui-tone--${appearance.tone} ${className}`}
      role={role}
    >
      <SelectedIcon />
      <div className="ui-banner__content">
        <div className="ui-banner__title">{title}</div>
        {children && <div className="ui-banner__description">{children}</div>}
      </div>
      {onClose && (
        <Button
          className="ui-banner__close"
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          Закрыть
        </Button>
      )}
    </div>
  );
}

interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "1em",
  className = "",
}: SkeletonProps) {
  return (
    <span
      className={`ui-skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, children, icon, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      {icon && (
        <span className="ui-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
