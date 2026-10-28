import { useId, useMemo, useRef, type ReactNode, type UIEvent } from "react";
import { analyzeJson } from "../systems/jsonSyntax";
import { pluralize } from "../shared/pluralize";

import "./JsonSchemaEditor.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  actions?: ReactNode;
}

// Подсветка и статус дополняют обычное поле ввода; незаконченная схема остаётся в черновике.
export default function JsonSchemaEditor({ value, onChange, actions }: Props) {
  const inputId = useId();
  const statusId = `${inputId}-syntax`;
  const highlightRef = useRef<HTMLElement>(null);
  const { tokens, lineCount, syntax } = useMemo(
    () => analyzeJson(value),
    [value],
  );
  const numbersRef = useRef<HTMLPreElement>(null);
  // Пустой документ и пустая строка после последнего переноса тоже имеют номер.
  const numbers = Array.from(
    { length: lineCount },
    (_, index) => index + 1,
  ).join("\n");

  // Текст подсветки повторяет обе оси прокрутки; колонка номеров остаётся слева.
  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    const { scrollTop, scrollLeft } = event.currentTarget;
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
        <div className="json-editor__numbers" aria-hidden="true">
          <pre ref={numbersRef}>{numbers}</pre>
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
            aria-invalid={!syntax.valid || undefined}
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
        data-invalid={!syntax.valid || undefined}
        role="status"
        aria-atomic="true"
      >
        <span className="json-editor__status-dot" aria-hidden="true" />
        {syntax.valid
          ? `JSON корректен · ${lineCount} ${pluralize(lineCount, { one: "строка", few: "строки", many: "строк" })}`
          : `Ошибка синтаксиса JSON · строка ${syntax.errorLine}`}
      </p>
    </div>
  );
}
