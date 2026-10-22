import { Checkbox } from "../../shared/ui";
import type { CheckboxField } from "../sheetTypes";

interface Props {
  field: CheckboxField;
  checked: boolean;
  onChange: (checked: boolean) => void;
  changed?: boolean;
  readOnly?: boolean;
}

// Поле type: "checkbox". Ошибки у него нет: булево значение не бывает неверным (ui-ux).
export default function SheetCheckboxField({
  field,
  checked,
  onChange,
  changed,
  readOnly,
}: Props) {
  return (
    <Checkbox
      label={field.label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      changed={changed}
      readOnly={readOnly}
    />
  );
}
