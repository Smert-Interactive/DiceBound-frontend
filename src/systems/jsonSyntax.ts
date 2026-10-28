import { visit } from "jsonc-parser";

// Категория фрагмента определяет его цвет в редакторе.
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

// Проверяет синтаксис и готовит подсветку без изменения текста и выполнения формул.
export function analyzeJson(text: string): JsonAnalysis {
  const tokens: JsonToken[] = [];
  // Всё до cursor уже добавлено в tokens.
  let cursor = 0;
  let errorLine: number | undefined;

  // Сохраняем пробелы и исходную запись, не дублируя пересекающиеся диапазоны.
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

  // Парсер вызывает обработчики найденных скобок, свойств, значений и ошибок.
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
          // Последний элемент пути — имя свойства; formula выделяем отдельным цветом.
          kind = path().at(-1) === "formula" ? "formula" : "string";
        } else if (typeof value === "number") {
          kind = "number";
        }
        addToken(kind, offset, length);
      },
      onError: (_error, offset, length, line) => {
        // Сохраняем первую ошибку и переводим номер строки из нуля в единицу.
        errorLine ??= line + 1;
        addToken("invalid", offset, length);
      },
    },
    {
      // Строгий JSON: без комментариев, завершающих запятых и пустого документа.
      disallowComments: true,
      allowTrailingComma: false,
      allowEmptyContent: false,
    },
  );

  // После ошибки необработанный остаток тоже должен остаться видимым.
  if (cursor < text.length)
    tokens.push({ offset: cursor, text: text.slice(cursor), kind: "plain" });
  return {
    tokens,
    lineCount: text.split(/\r\n?|\n/u).length,
    syntax:
      errorLine === undefined ? { valid: true } : { valid: false, errorLine },
  };
}
