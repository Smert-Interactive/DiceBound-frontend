import { useId } from "react";

import { sanitizeNumberInput } from "../numberField";
import { getResourceError, getResourceRatio } from "../resourceField";
import type { ResourceDraft } from "../resourceField";
import type { ResourceField } from "../sheetTypes";

import "./SheetResourceField.css";

interface Props {
  field: ResourceField;
  value: ResourceDraft;
  onChange: (value: ResourceDraft) => void;
  error?: string;
  changed?: boolean;
  readOnly?: boolean;
}

// Поле type: "resource": текущее и максимальное значение, под ними полоса.
// Цвет полосы задаёт CSS по data-system предка (метка системы), в коде ветвлений нет.
export default function SheetResourceField({
  field,
  value,
  onChange,
  error,
  changed,
  readOnly,
}: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  // Текст ошибки приходит сверху, а к какому из двух полей он относится, знает только ресурс.
  const errorTarget = error
    ? getResourceError(field, value)?.target
    : undefined;
  const ratio = getResourceRatio(value);

  function renderInput(part: "current" | "max", name: string) {
    const isInvalid = errorTarget === part;

    return (
      <input
        className="ui-control"
        value={value[part]}
        inputMode="numeric"
        aria-label={`${field.label}: ${name}`}
        aria-invalid={isInvalid || undefined}
        aria-describedby={isInvalid ? errorId : undefined}
        data-changed={changed || undefined}
        onChange={(event) =>
          onChange({
            ...value,
            [part]: sanitizeNumberInput(event.target.value, field),
          })
        }
      />
    );
  }

  return (
    <div
      className="ui-field sheet-resource"
      data-readonly={readOnly || undefined}
    >
      <div className="sheet-resource__head">
        <span className="ui-field__label" id={labelId}>
          {field.label}
        </span>
        <span className="sheet-resource__caption" aria-hidden="true">
          текущее / макс.
        </span>
      </div>

      {readOnly ? (
        <div role="group" className="ui-readonly" aria-labelledby={labelId}>
          {value.current} / {value.max}
        </div>
      ) : (
        <div
          role="group"
          className="sheet-resource__inputs"
          aria-labelledby={labelId}
        >
          {renderInput("current", "текущее")}
          <span className="sheet-resource__slash" aria-hidden="true">
            /
          </span>
          {renderInput("max", "максимум")}
        </div>
      )}

      {/* При ошибке полосы нет: значение неверное, а на FieldKit под полями только текст. */}
      {!error && (
        <div className="sheet-resource__bar" aria-hidden="true">
          <i style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
      {error && (
        <span className="ui-field__error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}
