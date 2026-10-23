import { useId } from "react";

import { FunctionIcon } from "../../shared/icons";
import { formatCalculatedValue, getCalculatedHint } from "../calculatedField";
import type { CalculatedField } from "../sheetTypes";

import "./SheetCalculatedField.css";

interface Props {
  field: CalculatedField;
  // Готовое значение: пересчёт делает renderer, undefined — посчитать нельзя.
  value: number | undefined;
  // Модификатор пары: +3, −1, +0.
  signed?: boolean;
  // Подписи полей, на которые ссылается формула, для подсказки под полем.
  dependsOn?: readonly string[];
  // Ошибка зависимости (getDependencyError); значение тогда «—».
  error?: string;
  readOnly?: boolean;
}

// Поле type: "calculated": не редактируется, значение считает формула.
// Живой областью (aria-live) значение не делаем: оно меняется при каждой правке соседнего поля.
export default function SheetCalculatedField({
  field,
  value,
  signed = false,
  dependsOn = [],
  error,
  readOnly,
}: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const noteId = `${id}-note`;
  const note = error ?? (readOnly ? undefined : getCalculatedHint(dependsOn));

  return (
    <div className="ui-field sheet-calculated">
      <span className="ui-field__label sheet-calculated__label" id={labelId}>
        <FunctionIcon />
        {field.label}
      </span>
      <div
        role="group"
        className="sheet-calculated__box"
        data-error={error ? true : undefined}
        aria-labelledby={labelId}
        aria-describedby={note ? noteId : undefined}
      >
        <span className="sheet-calculated__value">
          {formatCalculatedValue(error ? undefined : value, signed)}
        </span>
        <span className="sheet-calculated__formula">
          {readOnly ? "из snapshot" : field.formula}
        </span>
      </div>
      {note && (
        <span
          className={error ? "ui-field__error" : "ui-field__hint"}
          id={noteId}
        >
          {note}
        </span>
      )}
    </div>
  );
}
