import type { NumberField } from "./sheetTypes";

type NumberBounds = Pick<NumberField, "min" | "max">;

// Поле ввода хранит строку: пока человек печатает, она бывает пустой или «-».
// Оставляем цифры, не больше одного разделителя («.» или «,») и минус в начале, минус только
// если схема допускает отрицательные. Разделитель без цифр перед ним получает «0» («.» → «0.»).
export function sanitizeNumberInput(raw: string, bounds: NumberBounds): string {
  const allowNegative = bounds.min === undefined || bounds.min < 0;
  const sign = allowNegative && raw.startsWith("-") ? "-" : "";
  const body = raw.replace(/[^\d.,]/g, "");
  const separatorAt = body.search(/[.,]/);

  if (separatorAt === -1) return `${sign}${body}`;

  const integer = body.slice(0, separatorAt) || "0";
  const fraction = body.slice(separatorAt + 1).replace(/\D/g, "");

  return `${sign}${integer}${body[separatorAt]}${fraction}`;
}

// Число из строки ввода: «16», «-1.5», «1,5»; undefined для пустой строки и одинокого минуса.
// «1.» во время набора читается как 1, чтобы ошибка не мигала на каждом разделителе.
export function parseNumber(raw: string): number | undefined {
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(raw))
    return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

// Разворачивает экспоненту серверного числа, чтобы обычное редактирование не меняло его порядок.
export function formatNumberInput(value: number): string {
  const text = String(value);
  if (!text.includes("e")) return text;
  const [mantissa, exponent] = text.split("e");
  const sign = mantissa.startsWith("-") ? "-" : "";
  const [integer, fraction = ""] = mantissa.replace("-", "").split(".");
  const digits = integer + fraction;
  const point = integer.length + Number(exponent);
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length)
    return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

// Шаг кнопок − и +: на 1, результат зажат в min…max. Из пустого поля счёт идёт от min (или 0).
// Значение за границей кнопка возвращает внутрь, как на холсте (STR 31 → 30).
export function stepNumber(
  raw: string,
  direction: 1 | -1,
  bounds: NumberBounds,
): string {
  const current = parseNumber(raw);
  // Дробное значение сохраняет число знаков: без округления сумма получила бы хвост
  // двоичной арифметики. Границы схемы возвращаются как есть.
  const decimals = raw.match(/[.,](\d*)$/)?.[1].length ?? 0;
  const next =
    current === undefined
      ? (bounds.min ?? 0)
      : Number((current + direction).toFixed(Math.min(decimals, 100)));
  const aboveMin = Math.max(bounds.min ?? -Infinity, next);

  return formatNumberInput(Math.min(bounds.max ?? Infinity, aboveMin));
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
