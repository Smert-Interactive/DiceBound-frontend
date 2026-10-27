// Токены лексера. pos — смещение в строке формулы, нужно для сообщения об ошибке.
export type Token =
  | { type: "number"; value: number; pos: number }
  | { type: "name"; value: string; pos: number }
  | { type: "operator"; value: "+" | "-" | "*" | "/"; pos: number }
  | { type: "paren"; value: "(" | ")"; pos: number }
  | { type: "comma"; pos: number };

export type BinaryOperator = "+" | "-" | "*" | "/";

// Дерево разбора формулы. Вычисляется отдельно, чтобы формулу можно было разобрать один раз.
export type FormulaNode =
  | { type: "number"; value: number }
  | { type: "field"; id: string }
  | { type: "negate"; operand: FormulaNode }
  | {
      type: "binary";
      operator: BinaryOperator;
      left: FormulaNode;
      right: FormulaNode;
    }
  | { type: "call"; name: string; args: FormulaNode[] };

export type FormulaErrorCode =
  | "syntax"
  | "unknown_field"
  | "unknown_function"
  | "wrong_arguments"
  | "division_by_zero"
  | "not_a_number";

// Ошибка формулы с кодом: интерфейс решает по коду, что показать, а не по тексту.
export class FormulaError extends Error {
  code: FormulaErrorCode;
  // Для unknown_field и not_a_number: id поля, из-за которого формулу не посчитать.
  fieldId?: string;

  constructor(code: FormulaErrorCode, message: string, fieldId?: string) {
    super(message);
    this.name = "FormulaError";
    this.code = code;
    this.fieldId = fieldId;
  }
}
