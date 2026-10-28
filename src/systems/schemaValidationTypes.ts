import type { SheetSchemaBody } from "../sheet/sheetTypes";

// DTO проверки из technical-contracts: отправляется исходный текст, не объект схемы.
export interface SchemaValidationRequest {
  schema_text: string;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  line: number | null;
}

export type SchemaValidationResult =
  | {
      valid: true;
      errors: [];
      summary: { sections_count: number; fields_count: number };
      schema: SheetSchemaBody;
    }
  | {
      valid: false;
      errors: SchemaValidationError[];
      summary: null;
      schema: null;
    };
