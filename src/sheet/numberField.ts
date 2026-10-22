import type { NumberField } from "./sheetTypes";

type NumberBounds = Pick<NumberField, "min" | "max">;

// Поле ввода хранит строку: пока человек печатает, она бывает пустой или «-».
// Оставляем цифры и минус в начале, минус только если схема допускает отрицательные.
export function sanitizeNumberInput(raw: string, bounds: NumberBounds): string {
  const digits = raw.replace(/\D/g, "");
  const allowNegative = bounds.min === undefined || bounds.min < 0;

  return allowNegative && raw.startsWith("-") ? `-${digits}` : digits;
}

// Целое число из строки ввода; undefined для пустой строки и одинокого минуса.
export function parseNumber(raw: string): number | undefined {
  return /^-?\d+$/.test(raw) ? Number(raw) : undefined;
}

// Шаг кнопок − и +: на 1, результат зажат в min…max. Из пустого поля счёт идёт от min (или 0).
// Значение за границей кнопка возвращает внутрь, как на холсте (STR 31 → 30).
export function stepNumber(
  raw: string,
  direction: 1 | -1,
  bounds: NumberBounds,
): string {
  const current = parseNumber(raw);
  const next = current === undefined ? (bounds.min ?? 0) : current + direction;
  const aboveMin = Math.max(bounds.min ?? -Infinity, next);

  return String(Math.min(bounds.max ?? Infinity, aboveMin));
}

// «1–20» для подписи внутри поля; при одной границе или без границ подписи нет.
export function formatRange(bounds: NumberBounds): string | undefined {
  if (bounds.min === undefined || bounds.max === undefined) return undefined;

  return `${bounds.min}–${bounds.max}`;
}

// Текст ошибки диапазона по ui-ux: «Допустимо от {min} до {max}», при одной границе короче.
export function getRangeMessage(bounds: NumberBounds): string | undefined {
  const { min, max } = bounds;

  if (min !== undefined && max !== undefined) {
    return `Допустимо от ${min} до ${max}`;
  }
  if (min !== undefined) return `Не меньше ${min}`;
  if (max !== undefined) return `Не больше ${max}`;

  return undefined;
}
