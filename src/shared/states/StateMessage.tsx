import type { ReactNode } from "react";

import "./StateMessage.css";

interface Props {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  // Заголовок страницы — h1, а блок внутри страницы с собственным h1 — h2.
  headingLevel?: 1 | 2;
  // card — блок в рамке на месте контента, без card — экран по центру.
  card?: boolean;
  role?: "alert";
}

// Общая раскладка системных экранов: иконка в квадрате, заголовок, пояснение, действие.
export default function StateMessage({
  icon,
  title,
  children,
  action,
  headingLevel = 2,
  card = false,
  role,
}: Props) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div
      className={
        card ? "ui-card state-message state-message--card" : "state-message"
      }
      role={role}
    >
      <span className="state-message__icon" aria-hidden="true">
        {icon}
      </span>
      <Heading className="state-message__title">{title}</Heading>
      {children && <p className="state-message__text">{children}</p>}
      {action}
    </div>
  );
}
