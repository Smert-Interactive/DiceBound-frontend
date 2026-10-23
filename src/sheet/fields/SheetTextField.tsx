import { Input } from "../../shared/ui";
import type { TextField } from "../sheetTypes";

interface Props {
  field: TextField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  changed?: boolean;
  readOnly?: boolean;
}

// Поле type: "text". Подпись и правила берутся из схемы, значение приходит сверху.
// Нативный maxLength не ставим: он молча обрезал бы ввод вместо ошибки по ui-ux.
export default function SheetTextField({
  field,
  value,
  onChange,
  error,
  changed,
  readOnly,
}: Props) {
  return (
    <Input
      label={field.label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      changed={changed}
      readOnly={readOnly}
      aria-required={field.required || undefined}
    />
  );
}
