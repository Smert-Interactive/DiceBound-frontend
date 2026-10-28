import { visit } from "jsonc-parser";

export type JsonTokenKind =
  | "plain"
  | "key"
  | "string"
  | "number"
  | "keyword"
  | "punctuation"
  | "formula"
  | "invalid";

export interface JsonToken {
  offset: number;
  text: string;
  kind: JsonTokenKind;
}

export interface JsonAnalysis {
  tokens: JsonToken[];
  lineCount: number;
  syntax: { valid: true } | { valid: false; errorLine: number };
}

// Проверяет только синтаксис JSON и находит диапазоны для подсветки, не изменяя исходный текст.
// Правила Sheet Schema и формулы здесь не проверяются и не исполняются.
export function analyzeJson(text: string): JsonAnalysis {
  const tokens: JsonToken[] = [];
  let cursor = 0;
  let errorLine: number | undefined;

  // Пробелы и незаконченные фрагменты тоже сохраняем; пересекающиеся сообщения не дублируют текст.
  function addToken(kind: JsonTokenKind, offset: number, length: number) {
    if (offset < cursor || length === 0) return;
    if (offset > cursor)
      tokens.push({
        offset: cursor,
        text: text.slice(cursor, offset),
        kind: "plain",
      });
    tokens.push({ offset, text: text.slice(offset, offset + length), kind });
    cursor = offset + length;
  }

  visit(
    text,
    {
      onObjectBegin: (offset, length) =>
        addToken("punctuation", offset, length),
      onObjectEnd: (offset, length) => addToken("punctuation", offset, length),
      onArrayBegin: (offset, length) => addToken("punctuation", offset, length),
      onArrayEnd: (offset, length) => addToken("punctuation", offset, length),
      onSeparator: (_character, offset, length) =>
        addToken("punctuation", offset, length),
      onObjectProperty: (_property, offset, length) =>
        addToken("key", offset, length),
      onLiteralValue: (value, offset, length, _line, _column, path) => {
        let kind: JsonTokenKind = "keyword";
        if (typeof value === "string") {
          kind = path().at(-1) === "formula" ? "formula" : "string";
        } else if (typeof value === "number") {
          kind = "number";
        }
        addToken(kind, offset, length);
      },
      onError: (_error, offset, length, line) => {
        // Парсер даёт положение независимо от текста ошибок конкретного браузера.
        errorLine ??= line + 1;
        addToken("invalid", offset, length);
      },
    },
    {
      disallowComments: true,
      allowTrailingComma: false,
      allowEmptyContent: false,
    },
  );

  if (cursor < text.length)
    tokens.push({ offset: cursor, text: text.slice(cursor), kind: "plain" });
  return {
    tokens,
    lineCount: text.split(/\r\n?|\n/u).length,
    syntax:
      errorLine === undefined ? { valid: true } : { valid: false, errorLine },
  };
}
