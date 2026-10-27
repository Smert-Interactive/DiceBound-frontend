import { FormulaError, type Token } from "./types";

const NUMBER_START = /[0-9]/;
const NUMBER_PART = /[0-9.]/;
const NAME_START = /[A-Za-z_]/;
const NAME_PART = /[A-Za-z0-9_]/;

// Режет формулу на токены. Ничего не вычисляет и не знает про поля и функции.
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < source.length) {
    const char = source[pos];

    if (/\s/.test(char)) {
      pos += 1;
    } else if (NUMBER_START.test(char)) {
      const start = pos;
      while (pos < source.length && NUMBER_PART.test(source[pos])) pos += 1;
      const text = source.slice(start, pos);
      // «1.2.3» не число: проверяем, что вся запись разобралась целиком.
      if (!/^[0-9]+(\.[0-9]+)?$/.test(text)) {
        throw new FormulaError("syntax", `Неверное число «${text}»`);
      }
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
  }

  return tokens;
}
