import type { CharacterData } from "../sheetTypes";
import { getFormulaFunction } from "./functions";
import { parseFormula } from "./parse";
import { FormulaError, type FormulaNode } from "./types";

export type CalculationResult =
  { ok: true; value: number } | { ok: false; error: FormulaError };

// Значения полей, по которым считается формула. Нет ключа — поле неизвестно.
type Values = Partial<CharacterData>;

// Считает AST; undefined обозначает неизвестные данные при статической проверке схемы.
// Постоянный ноль в знаменателе и переполнение проверяются даже без значений персонажа.
export function evaluateFormulaNode(
  node: FormulaNode,
  resolve: (id: string) => number | undefined,
): number | undefined {
  switch (node.type) {
    case "number":
      return finite(node.value);
    case "field":
      return resolve(node.id);
    case "negate": {
      const value = evaluateFormulaNode(node.operand, resolve);
      return value === undefined ? undefined : finite(-value);
    }
    case "binary": {
      const left = evaluateFormulaNode(node.left, resolve);
      const right = evaluateFormulaNode(node.right, resolve);
      if (node.operator === "/" && right === 0)
        throw new FormulaError("division_by_zero", "Деление на ноль");
      if (left === undefined || right === undefined) return undefined;
      if (node.operator === "+") return finite(left + right);
      if (node.operator === "-") return finite(left - right);
      if (node.operator === "*") return finite(left * right);
      return finite(left / right);
    }
    case "call": {
      const fn = getFormulaFunction(node.name);
      if (!fn)
        throw new FormulaError(
          "unknown_function",
          `Неизвестная функция «${node.name}»`,
        );
      if (node.args.length < fn.minArgs || node.args.length > fn.maxArgs)
        throw new FormulaError(
          "wrong_arguments",
          `Неверное число аргументов у «${node.name}»`,
        );
      const args = node.args.map((arg) => evaluateFormulaNode(arg, resolve));
      if (args.some((value) => value === undefined)) return undefined;
      return finite(fn.apply(args as number[]));
    }
  }
}

// Сервер отклоняет бесконечность, включая переполнение промежуточной операции.
function finite(value: number): number {
  if (!Number.isFinite(value))
    throw new FormulaError(
      "not_a_number",
      "Результат должен быть конечным числом",
    );
  return value;
}

// Считает формулу и не бросает исключений: интерфейс получает значение или ошибку с кодом.
export function calculate(source: string, values: Values): CalculationResult {
  try {
    const value = evaluateFormulaNode(parseFormula(source), (id) => {
      if (!Object.hasOwn(values, id))
        throw new FormulaError("unknown_field", `Неизвестное поле «${id}»`, id);
      const number = values[id];
      if (typeof number !== "number" || !Number.isFinite(number))
        throw new FormulaError("not_a_number", `В поле «${id}» нет числа`, id);
      return number;
    });
    return { ok: true, value: finite(value!) };
  } catch (error) {
    if (error instanceof FormulaError) return { ok: false, error };
    throw error;
  }
}

// id полей, на которые ссылается формула, без повторов и в порядке появления.
// Для неразбираемой формулы возвращает пустой список.
export function getFormulaFieldIds(source: string): string[] {
  let tree: FormulaNode;
  try {
    tree = parseFormula(source);
  } catch (error) {
    if (error instanceof FormulaError) return [];
    throw error;
  }

  const ids: string[] = [];
  function visit(node: FormulaNode) {
    if (node.type === "field") {
      if (!ids.includes(node.id)) ids.push(node.id);
    } else if (node.type === "negate") {
      visit(node.operand);
    } else if (node.type === "binary") {
      visit(node.left);
      visit(node.right);
    } else if (node.type === "call") {
      node.args.forEach(visit);
    }
  }
  visit(tree);
  return ids;
}
