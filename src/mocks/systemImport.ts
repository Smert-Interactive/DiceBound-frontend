import type {
  ImportGameSystemRequest,
  ImportedSystemResult,
} from "../systems/systemImportTypes";
import { validateSchema } from "../systems/validateSchema";
import { createMockId } from "./mockId";
import { getMockRecipientId } from "./characterSharesStore";
import { MOCK_SYSTEMS, MOCK_SCHEMAS } from "./systems";
import { MOCK_SHEET_SCHEMAS } from "./sheetSchemas";

// Имитирует атомарный импорт: сначала повторная проверка, затем сохранение системы и листа.
export async function importMockSystem(
  request: ImportGameSystemRequest,
  email: string,
): Promise<ImportedSystemResult> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  const checked = validateSchema(request.schema_text);
  if (
    !request.system_name.trim() ||
    !request.sheet_schema_name.trim() ||
    !checked.valid
  ) {
    throw Object.assign(new Error("VALIDATION_ERROR"), {
      status: 422,
      code: "VALIDATION_ERROR",
      errors: checked.errors,
    });
  }
  if (!email.trim())
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const createdAt = new Date().toISOString();
  const system: ImportedSystemResult["system"] = {
    id: createMockId(),
    owner_id: getMockRecipientId(email.trim().toLowerCase()),
    name: request.system_name.trim(),
    description: null,
    source: "IMPORTED",
    character_count: 0,
    created_at: createdAt,
  };
  const sheetSchema: ImportedSystemResult["sheet_schema"] = {
    id: createMockId(),
    game_system_id: system.id,
    name: request.sheet_schema_name.trim(),
    schema: checked.schema,
    created_at: createdAt,
  };
  // Между записями нет ожидания: другие mock-сервисы увидят сразу обе связанные сущности.
  MOCK_SYSTEMS.push(system);
  MOCK_SHEET_SCHEMAS.push(sheetSchema);
  MOCK_SCHEMAS.push({
    id: sheetSchema.id,
    game_system_id: system.id,
    name: sheetSchema.name,
    created_at: createdAt,
    sections: checked.schema.sections.map((section) => section.label),
  });
  return structuredClone({ system, sheet_schema: sheetSchema });
}
