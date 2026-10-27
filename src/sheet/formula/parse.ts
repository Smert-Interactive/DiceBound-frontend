import { tokenize } from "./tokenize";
import { FormulaError, type FormulaNode, type Token } from "./types";

// Грамматика (приоритет растёт сверху вниз):
//   expression = term (("+" | "-") term)*
//   term       = unary (("*" | "/") unary)*
//   unary      = "-" unary | primary
//   primary    = number | name "(" [expression ("," expression)*] ")" | name | "(" expression ")"
export function parseFormula(source: string): FormulaNode {
  const tokens = tokenize(source);
  let index = 0;

  function peek(): Token | undefined {
    return tokens[index];
  }

  function next(): Token {
    const token = tokens[index];
    if (!token) throw new FormulaError("syntax", "Формула оборвана");
    index += 1;
    return token;
  }

  function isOperator(token: Token | undefined, values: string[]): boolean {
    return token?.type === "operator" && values.includes(token.value);
  }

  function expect(value: ")" | ","): void {
    const token = next();
    const matches =
      value === ","
        ? token.type === "comma"
        : token.type === "paren" && token.value === ")";
    if (!matches) {
      throw new FormulaError(
        "syntax",
        `Ожидалось «${value}» в позиции ${token.pos + 1}`,
      );
    }
  }

  function expression(): FormulaNode {
    let left = term();
    while (isOperator(peek(), ["+", "-"])) {
      const operator = next();
      if (operator.type !== "operator") break;
      left = { type: "binary", operator: operator.value, left, right: term() };
    }
    return left;
  }

  function term(): FormulaNode {
    let left = unary();
    while (isOperator(peek(), ["*", "/"])) {
      const operator = next();
      if (operator.type !== "operator") break;
      left = { type: "binary", operator: operator.value, left, right: unary() };
    }
    return left;
  }

  function unary(): FormulaNode {
    if (isOperator(peek(), ["-"])) {
      next();
      return { type: "negate", operand: unary() };
    }
    return primary();
  }

  function primary(): FormulaNode {
    const token = next();

    if (token.type === "number") return { type: "number", value: token.value };

    if (token.type === "name") {
      const after = peek();
      if (after?.type !== "paren" || after.value !== "(") {
        return { type: "field", id: token.value };
      }
      next();
      const args: FormulaNode[] = [];
      const close = peek();
      if (close?.type === "paren" && close.value === ")") {
        next();
      } else {
        args.push(expression());
        while (peek()?.type === "comma") {
          next();
          args.push(expression());
        }
        expect(")");
      }
      return { type: "call", name: token.value, args };
    }

    if (token.type === "paren" && token.value === "(") {
      const inner = expression();
      expect(")");
      return inner;
    }

    throw new FormulaError(
      "syntax",
      `Неожиданный элемент в позиции ${token.pos + 1}`,
    );
  }

  const tree = expression();
  const rest = peek();
  if (rest) {
    throw new FormulaError(
      "syntax",
      `Лишний элемент в позиции ${rest.pos + 1}`,
    );
  }
  return tree;
}
