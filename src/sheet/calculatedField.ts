import { formatModifier } from "./formatModifier";

// Значение calculated для показа. «—», когда посчитать нельзя (ошибка зависимости, формулы).
// signed — модификатор пары «значение | модификатор»: +3, −1, +0; иначе обычное число.
// Дробные округляются до двух знаков, чтобы 1/3 не растягивало поле.
export function formatCalculatedValue(
  value: number | undefined,
  signed: boolean,
): string {
  if (value === undefined || !Number.isFinite(value)) return "—";

  const rounded = Number(value.toFixed(2));

  return signed ? formatModifier(rounded) : String(rounded);
}

// Подпись под полем. labels — подписи полей, на которые ссылается формула.
export function getCalculatedHint(labels: readonly string[]): string {
  if (labels.length === 0) return "Не редактируется";

  return `Не редактируется, пересчитывается при изменении ${labels.join(", ")}`;
}

// Остальные сбои формулы (цикл, неизвестное поле, неразбираемая формула): это дефект схемы,
// который backend отсекает при импорте, человек его не исправит, поэтому текст один и без
// обещаний (решение дизайнера, 27 окт.).
export const CALCULATION_FAILED = "Не удалось вычислить значение";

// Деление на ноль зависит от ввода (формула вроде 10 / strength), человек может его исправить:
// называем поля-числа формулы, какое из них стало нулём, движок не знает (решение дизайнера, 28 окт.).
export function getDivisionByZeroError(labels: readonly string[]): string {
  return `Деление на ноль: измените ${labels.join(", ")}`;
}

// Ошибка зависимости: labels — подписи полей с неверным значением.
export function getDependencyError(labels: readonly string[]): string {
  return `Зависит от ${labels.join(", ")}: исправьте значение`;
}
