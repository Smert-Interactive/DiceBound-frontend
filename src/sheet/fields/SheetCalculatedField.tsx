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
  // Модификатор внутри пары «значение | модификатор»: плашка ниже, формула стоит под ней.
  inPair?: boolean;
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
  inPair = false,
}: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const noteId = `${id}-note`;
  const formulaId = `${id}-formula`;
  // Формула показывается и в режиме чтения (решение дизайнера, 27 окт.).
  const formulaText = field.formula;
  // В паре подсказка «пересчитывается при изменении…» не нужна: формула видна под плашкой.
  const note =
    error ?? (readOnly || inPair ? undefined : getCalculatedHint(dependsOn));
  const describedBy = note ? noteId : inPair ? formulaId : undefined;

  // В режиме чтения число и формула пары стоят в одной плашке (решает CSS по ширине секции).
  const isInline = inPair && readOnly;

  return (
    <div
      className={`ui-field sheet-calculated${inPair ? " sheet-calculated--pair" : ""}${isInline ? " sheet-calculated--inline" : ""}`}
    >
      <span className="ui-field__label sheet-calculated__label" id={labelId}>
        <FunctionIcon />
        {field.label}
      </span>
      <div
        role="group"
        className="sheet-calculated__box"
        data-error={error ? true : undefined}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
      >
        <span className="sheet-calculated__value">
          {formatCalculatedValue(error ? undefined : value, signed)}
        </span>
        {!inPair && (
          <span className="sheet-calculated__formula">{formulaText}</span>
        )}
      </div>
      {inPair && (
        <span className="sheet-calculated__pair-formula" id={formulaId}>
          {formulaText}
        </span>
      )}
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
