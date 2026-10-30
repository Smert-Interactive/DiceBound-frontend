import { Select } from "../../shared/ui";
import type { SelectField } from "../sheetTypes";

interface Props {
  field: SelectField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  changed?: boolean;
  readOnly?: boolean;
}

const EMPTY_OPTION = { value: "", label: "Не выбрано" };

// Поле type: "select". Значение — options[].value, подпись в списке — options[].label.
export default function SheetSelectField({
  field,
  value,
  onChange,
  error,
  changed,
  readOnly,
}: Props) {
  const isKnown = field.options.some((option) => option.value === value);

  return (
    <Select
      label={field.label}
      // Значение не из списка: без пункта «Не выбрано» select молча показал бы первый.
      options={
        isKnown && field.required
          ? field.options
          : [EMPTY_OPTION, ...field.options]
      }
      value={isKnown ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      changed={changed}
      readOnly={readOnly}
    />
  );
}
