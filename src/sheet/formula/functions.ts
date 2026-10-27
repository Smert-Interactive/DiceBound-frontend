// Функции формул. Список закрыт контрактом (sheet-schema.md): floor, ceil, round, min, max.
// Любое другое имя вычислитель считает неизвестной функцией.
interface FormulaFunction {
  // Допустимое число аргументов: от minArgs до maxArgs (Infinity — без верхней границы).
  minArgs: number;
  maxArgs: number;
  apply: (args: number[]) => number;
}

const FUNCTIONS: Record<string, FormulaFunction> = {
  floor: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.floor(value) },
  ceil: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.ceil(value) },
  // Math.round округляет половину вверх: round(2.5) = 3, round(-2.5) = -2.
  round: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.round(value) },
  min: { minArgs: 1, maxArgs: Infinity, apply: (args) => Math.min(...args) },
  max: { minArgs: 1, maxArgs: Infinity, apply: (args) => Math.max(...args) },
};

// Правило функции по имени или undefined. hasOwn исключает унаследованные имена
// вроде constructor и toString: их в формуле вызвать нельзя.
export function getFormulaFunction(name: string): FormulaFunction | undefined {
  return Object.hasOwn(FUNCTIONS, name) ? FUNCTIONS[name] : undefined;
}
