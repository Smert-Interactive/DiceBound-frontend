import { Skeleton } from "../ui";

import "./LoadingSkeleton.css";

type Variant = "sheet" | "list";

interface Props {
  variant: Variant;
  // Подпись для читалок. По умолчанию берётся из ui-ux.
  label?: string;
}

const DEFAULT_LABELS: Record<Variant, string> = {
  sheet: "Лист загружается",
  list: "Список загружается",
};

// Ширины двух строк текста в каждой из трёх строк списка (из холста UIKit-States).
const LIST_ROWS = [
  { title: 160, subtitle: 100 },
  { title: 200, subtitle: 120 },
  { title: 140, subtitle: 90 },
] as const;

function SheetSkeleton() {
  return (
    <>
      <div className="state-skeleton__header">
        <Skeleton className="state-skeleton__avatar" width={48} height={48} />
        <div className="state-skeleton__lines">
          <Skeleton width={200} height={20} />
          <Skeleton width={280} height={12} />
        </div>
      </div>

      <div className="state-skeleton__tabs">
        <Skeleton width={40} height={12} />
        <Skeleton width={60} height={12} />
        <Skeleton width={52} height={12} />
      </div>

      {/* Число полей до ответа схемы неизвестно, поэтому скелет повторяет только сетку секций. */}
      <div className="state-skeleton__card">
        <Skeleton width={90} height={10} />
        <div className="state-skeleton__grid state-skeleton__grid--four">
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
        </div>
      </div>

      <div className="state-skeleton__card">
        <Skeleton width={120} height={10} />
        <div className="state-skeleton__grid state-skeleton__grid--three">
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </div>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="state-skeleton__card state-skeleton__card--list">
      {LIST_ROWS.map((row) => (
        <div key={row.title} className="state-skeleton__row">
          <Skeleton
            className="state-skeleton__badge"
            width={38}
            height={38}
          />
          <div className="state-skeleton__lines state-skeleton__lines--grow">
            <Skeleton width={row.title} height={12} />
            <Skeleton width={row.subtitle} height={10} />
          </div>
          <Skeleton width={72} height={32} />
        </div>
      ))}
    </div>
  );
}

// Заглушка на время загрузки данных: заголовок страницы и кнопки действий
// рисует сама страница, здесь только место под контент.
export default function LoadingSkeleton({ variant, label }: Props) {
  return (
    <div
      className="state-skeleton"
      role="status"
      aria-busy="true"
      aria-label={label ?? DEFAULT_LABELS[variant]}
    >
      {variant === "sheet" ? <SheetSkeleton /> : <ListSkeleton />}
    </div>
  );
}
