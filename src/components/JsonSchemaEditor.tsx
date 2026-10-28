import { useId, useRef, type ReactNode, type UIEvent } from "react";

import "./JsonSchemaEditor.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  actions?: ReactNode;
}

// Редактирует исходный текст без разбора JSON: даже незаконченная схема остаётся в черновике.
export default function JsonSchemaEditor({ value, onChange, actions }: Props) {
  const inputId = useId();
  const numbersRef = useRef<HTMLPreElement>(null);
  // Пустой документ и пустая строка после последнего переноса тоже имеют номер.
  const lineCount = value.split(/\r\n?|\n/u).length;
  const numbers = Array.from(
    { length: lineCount },
    (_, index) => index + 1,
  ).join("\n");

  // Номера следуют за вертикальной прокруткой текста, но не уезжают по горизонтали.
  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (numbersRef.current)
      numbersRef.current.style.transform = `translateY(-${event.currentTarget.scrollTop}px)`;
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
        <textarea
          id={inputId}
          className="json-editor__input"
          value={value}
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
  );
}
