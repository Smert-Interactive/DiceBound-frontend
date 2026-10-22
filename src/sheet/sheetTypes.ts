// Типы повторяют SheetSchema, Character и CharacterDetails из technical-contracts.md
// и data-model/sheet-schema.md. Шесть типов полей — это закрытый список (FieldKit).

export interface SelectOption {
  value: string;
  label: string;
}

interface FieldBase {
  // Уникален в пределах схемы и служит ключом в Character.data.
  id: string;
  label: string;
}

export interface TextField extends FieldBase {
  type: "text";
  required?: boolean;
  maxLength?: number;
}

export interface NumberField extends FieldBase {
  type: "number";
  min?: number;
  max?: number;
}

export interface SelectField extends FieldBase {
  type: "select";
  options: SelectOption[];
}

export interface CheckboxField extends FieldBase {
  type: "checkbox";
}

export interface ResourceField extends FieldBase {
  type: "resource";
  min?: number;
}

export interface CalculatedField extends FieldBase {
  type: "calculated";
  formula: string;
}

// Объединение с меткой type: по значению type TypeScript знает остальные свойства поля.
export type SheetField =
  | TextField
  | NumberField
  | SelectField
  | CheckboxField
  | ResourceField
  | CalculatedField;

export type SheetFieldType = SheetField["type"];

// Секция — карточка с заголовком, а не поле.
export interface SheetSection {
  id: string;
  label: string;
  fields: SheetField[];
}

export interface SheetSchemaBody {
  sections: SheetSection[];
}

export interface SheetSchema {
  id: string;
  game_system_id: string;
  name: string;
  schema: SheetSchemaBody;
  created_at: string;
}

export interface ResourceValue {
  current: number;
  max: number;
}

export type FieldValue = string | number | boolean | ResourceValue;

// Плоский объект по field.id, без вложенности по секциям.
export type CharacterData = Record<string, FieldValue>;

export interface Character {
  id: string;
  owner_id: string;
  game_system_id: string;
  sheet_schema_id: string;
  name: string;
  data: CharacterData;
  created_at: string;
  updated_at: string;
  current_version_number: number;
}

export interface CharacterDetails extends Character {
  access: "OWNER" | "VIEW";
  can_edit: boolean;
  can_view_history: boolean;
  owner_username: string;
}
