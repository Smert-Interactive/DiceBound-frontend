import type { CharacterData } from "../sheetTypes";
import { getFormulaFunction } from "./functions";
import { parseFormula } from "./parse";
import { FormulaError, type FormulaNode } from "./types";

export type CalculationResult =
  { ok: true; value: number } | { ok: false; error: FormulaError };

// Значения полей, по которым считается формула. Нет ключа — поле неизвестно.
type Values = Partial<CharacterData>;

function evaluateNode(node: FormulaNode, values: Values): number {
  switch (node.type) {
    case "number":
      return node.value;

    case "field": {
      if (!(node.id in values)) {
        throw new FormulaError(
          "unknown_field",
          `Неизвестное поле «${node.id}»`,
          node.id,
        );
      }
      const value = values[node.id];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new FormulaError(
          "not_a_number",
          `В поле «${node.id}» нет числа`,
          node.id,
        );
      }
      return value;
    }

    case "negate":
      return -evaluateNode(node.operand, values);

    case "binary": {
      const left = evaluateNode(node.left, values);
      const right = evaluateNode(node.right, values);
      if (node.operator === "+") return left + right;
      if (node.operator === "-") return left - right;
      if (node.operator === "*") return left * right;
      if (right === 0) {
        throw new FormulaError("division_by_zero", "Деление на ноль");
      }
      return left / right;
    }

    case "call": {
      const fn = getFormulaFunction(node.name);
      if (!fn) {
        throw new FormulaError(
          "unknown_function",
          `Неизвестная функция «${node.name}»`,
        );
      }
      if (node.args.length < fn.minArgs || node.args.length > fn.maxArgs) {
        throw new FormulaError(
          "wrong_arguments",
          `Неверное число аргументов у «${node.name}»: ${node.args.length}`,
        );
      }
      return fn.apply(node.args.map((arg) => evaluateNode(arg, values)));
    }
  }
}

// Считает формулу и не бросает исключений: интерфейс получает значение или ошибку с кодом.
export function calculate(source: string, values: Values): CalculationResult {
  try {
    return { ok: true, value: evaluateNode(parseFormula(source), values) };
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
