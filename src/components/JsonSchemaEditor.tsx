import { useId, useMemo, useRef, type ReactNode, type UIEvent } from "react";
import { analyzeJson, type JsonAnalysis } from "../systems/jsonSyntax";
import type { SchemaValidationError } from "../systems/schemaValidationTypes";
import { pluralize } from "../shared/pluralize";

import "./JsonSchemaEditor.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  actions?: ReactNode;
  analysis?: JsonAnalysis;
  errors?: readonly SchemaValidationError[];
}

// Подсветка и статус дополняют обычное поле ввода; незаконченная схема остаётся в черновике.
export default function JsonSchemaEditor({
  value,
  onChange,
  actions,
  analysis,
  errors = [],
}: Props) {
  const inputId = useId();
  const statusId = `${inputId}-syntax`;
  const highlightRef = useRef<HTMLElement>(null);
  const lineMarksRef = useRef<HTMLElement>(null);
  const { tokens, lineCount, syntax } = useMemo(
    () => analysis ?? analyzeJson(value),
    [analysis, value],
  );
  const numbersRef = useRef<HTMLPreElement>(null);
  // Пустой документ и пустая строка после последнего переноса тоже имеют номер.
  const numbers = Array.from({ length: lineCount }, (_, index) => index + 1);
  const schemaLines = [
    ...new Set(
      errors.flatMap((error) => (error.line === null ? [] : [error.line])),
    ),
  ].sort((a, b) => a - b);
  const errorLines = new Set(schemaLines);
  if (!syntax.valid) errorLines.add(syntax.errorLine);
  const invalid = !syntax.valid || errors.length > 0;
  let statusText: string;
  if (!syntax.valid)
    statusText = `Ошибка синтаксиса JSON · строка ${syntax.errorLine}`;
  else if (errors.length) {
    const lines = new Intl.ListFormat("ru", { type: "conjunction" }).format(
      schemaLines.map(String),
    );
    statusText = schemaLines.length
      ? `JSON корректен · ошибки схемы в ${schemaLines.length === 1 ? "строке" : "строках"} ${lines}`
      : "JSON корректен · найдены ошибки схемы";
  } else
    statusText = `JSON корректен · ${lineCount} ${pluralize(lineCount, { one: "строка", few: "строки", many: "строк" })}`;

  // Текст подсветки повторяет обе оси прокрутки; колонка номеров остаётся слева.
  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (lineMarksRef.current)
      lineMarksRef.current.style.transform = `translateY(-${scrollTop}px)`;
    if (numbersRef.current)
      numbersRef.current.style.transform = `translateY(-${scrollTop}px)`;
    if (highlightRef.current)
      highlightRef.current.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
  }

  return (
    <div className="json-editor">
      <div className="json-editor__header">
        <label htmlFor={inputId}>JSON-схема</label>
        {actions}
      </div>
      <div className="json-editor__surface">
        <pre className="json-editor__line-marks" aria-hidden="true">
          <code ref={lineMarksRef}>
            {numbers.map((number) => (
              <span
                key={number}
                className="json-editor__line"
                data-error={errorLines.has(number) || undefined}
              >
                {"\u200b"}
              </span>
            ))}
          </code>
        </pre>
        <div className="json-editor__numbers" aria-hidden="true">
          <pre ref={numbersRef}>
            {numbers.map((number) => (
              <span
                key={number}
                className="json-editor__line-number"
                data-error={errorLines.has(number) || undefined}
              >
                {number}
                {number < lineCount ? "\n" : ""}
              </span>
            ))}
          </pre>
        </div>
        <div className="json-editor__code">
          <pre className="json-editor__highlight" aria-hidden="true">
            <code ref={highlightRef}>
              {tokens.map((token) => (
                <span
                  key={token.offset}
                  className={`json-editor__token--${token.kind}`}
                >
                  {token.text}
                </span>
              ))}
              {"\u200b"}
            </code>
          </pre>
          <textarea
            id={inputId}
            className="json-editor__input"
            value={value}
            aria-describedby={statusId}
            aria-invalid={invalid || undefined}
            onChange={(event) => onChange(event.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            wrap="off"
          />
        </div>
      </div>
      <p
        id={statusId}
        className="json-editor__status"
        data-invalid={invalid || undefined}
        role="status"
        aria-atomic="true"
      >
        <span className="json-editor__status-dot" aria-hidden="true" />
        {statusText}
      </p>
    </div>
  );
}
