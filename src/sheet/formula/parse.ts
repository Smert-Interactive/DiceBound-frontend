import { tokenize } from "./tokenize";
import { FormulaError, type FormulaNode, type Token } from "./types";
import { CONTRACT_LIMITS } from "../../api/contractLimits";

// Грамматика (приоритет растёт сверху вниз):
//   expression = term (("+" | "-") term)*
//   term       = unary (("*" | "/") unary)*
//   unary      = ("+" | "-") unary | primary
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

  // Передаёт глубину вложенности, чтобы совпадать с пределом серверного парсера.
  function expression(depth = 0): FormulaNode {
    let left = term(depth);
    while (isOperator(peek(), ["+", "-"])) {
      const operator = next();
      if (operator.type !== "operator") break;
      left = {
        type: "binary",
        operator: operator.value,
        left,
        right: term(depth),
      };
    }
    return left;
  }

  // Умножение и деление имеют больший приоритет, чем сложение.
  function term(depth: number): FormulaNode {
    let left = unary(depth);
    while (isOperator(peek(), ["*", "/"])) {
      const operator = next();
      if (operator.type !== "operator") break;
      left = {
        type: "binary",
        operator: operator.value,
        left,
        right: unary(depth),
      };
    }
    return left;
  }

  // Унарный плюс разрешён API и не меняет значение операнда.
  function unary(depth: number): FormulaNode {
    if (depth > CONTRACT_LIMITS.formulaDepth)
      throw new FormulaError(
        "syntax",
        "В формуле больше 64 уровней вложенности",
      );
    if (isOperator(peek(), ["-", "+"])) {
      const operator = next();
      const operand = unary(depth + 1);
      return operator.type === "operator" && operator.value === "-"
        ? { type: "negate", operand }
        : operand;
    }
    return primary(depth);
  }

  // Разбирает число, ссылку, вызов функции или выражение в скобках.
  function primary(depth: number): FormulaNode {
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
        args.push(expression(depth + 1));
        while (peek()?.type === "comma") {
          next();
          args.push(expression(depth + 1));
        }
        expect(")");
      }
      return { type: "call", name: token.value, args };
    }

    if (token.type === "paren" && token.value === "(") {
      const inner = expression(depth + 1);
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
