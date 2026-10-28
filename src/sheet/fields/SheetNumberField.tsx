import { MinusIcon, PlusIcon } from "../../shared/icons";
import { Button, Input } from "../../shared/ui";
import { formatRange, sanitizeNumberInput, stepNumber } from "../numberField";
import type { NumberField } from "../sheetTypes";

import "./SheetNumberField.css";

interface Props {
  field: NumberField;
  // Строка ввода: пока человек печатает, она бывает пустой или «-».
  value: string;
  onChange: (value: string) => void;
  error?: string;
  changed?: boolean;
  readOnly?: boolean;
  // Счётчик −/+ у пары «характеристика + модификатор»; одиночное число — поле с диапазоном.
  counter?: boolean;
}

// Поле type: "number". Нативный type="number" не берём: колесо мыши и ввод «e» портят значение.
export default function SheetNumberField({
  field,
  value,
  onChange,
  error,
  changed,
  readOnly,
  counter = false,
}: Props) {
  const showCounter = counter && !readOnly;
  const range = formatRange(field);

  function step(direction: 1 | -1) {
    onChange(stepNumber(value, direction, field));
  }

  return (
    <Input
      className={`sheet-number${showCounter ? " sheet-number--counter" : ""}`}
      label={field.label}
      value={value}
      inputMode="decimal"
      onChange={(event) =>
        onChange(sanitizeNumberInput(event.target.value, field))
      }
      error={error}
      changed={changed}
      readOnly={readOnly}
      suffix={showCounter || readOnly ? undefined : range}
      before={
        showCounter ? (
          <Button
            size="sm"
            iconOnly
            icon={<MinusIcon />}
            aria-label={`Уменьшить ${field.label}`}
            onClick={() => step(-1)}
          />
        ) : undefined
      }
      after={
        showCounter ? (
          <Button
            size="sm"
            iconOnly
            icon={<PlusIcon />}
            aria-label={`Увеличить ${field.label}`}
            onClick={() => step(1)}
          />
        ) : undefined
      }
    />
  );
}
