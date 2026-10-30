import { FormulaError, type Token } from "./types";
import { CONTRACT_LIMITS } from "../../api/contractLimits";

const NAME_START = /[A-Za-z_]/;
const NAME_PART = /[A-Za-z0-9_]/;

// Режет формулу на токены. Ничего не вычисляет и не знает про поля и функции.
export function tokenize(source: string): Token[] {
  if (source.length > CONTRACT_LIMITS.formulaLength)
    throw new FormulaError("syntax", "Формула длиннее 2048 символов");
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < source.length) {
    const char = source[pos];

    if (/\s/.test(char)) {
      pos += 1;
    } else if (/[0-9.]/.test(char)) {
      const start = pos;
      const text = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(
        source.slice(pos),
      )?.[0];
      if (!text || !Number.isFinite(Number(text)))
        throw new FormulaError("syntax", "Ожидается конечное число");
      pos += text.length;
      tokens.push({ type: "number", value: Number(text), pos: start });
    } else if (NAME_START.test(char)) {
      const start = pos;
      while (pos < source.length && NAME_PART.test(source[pos])) pos += 1;
      tokens.push({
        type: "name",
        value: source.slice(start, pos),
        pos: start,
      });
    } else if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char, pos });
      pos += 1;
    } else if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char, pos });
      pos += 1;
    } else if (char === ",") {
      tokens.push({ type: "comma", pos });
      pos += 1;
    } else {
      throw new FormulaError(
        "syntax",
        `Недопустимый символ «${char}» в позиции ${pos + 1}`,
      );
    }
    if (tokens.length > CONTRACT_LIMITS.formulaTokens)
      throw new FormulaError("syntax", "В формуле больше 512 токенов");
  }

  return tokens;
}
