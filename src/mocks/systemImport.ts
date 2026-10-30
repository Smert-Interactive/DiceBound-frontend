import type {
  ImportGameSystemRequest,
  ImportedSystemResult,
} from "../systems/systemImportTypes";
import {
  CONTRACT_LIMITS,
  isSchemaTextWithinLimit,
} from "../api/contractLimits";
import { ApiError } from "../api/client";
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
  if (
    !isSchemaTextWithinLimit(request.schema_text) ||
    !request.system_name.trim() ||
    !request.sheet_schema_name.trim() ||
    request.system_name.trim().length > CONTRACT_LIMITS.name ||
    request.sheet_schema_name.trim().length > CONTRACT_LIMITS.name
  )
    throw new ApiError(400, "BAD_REQUEST", "Проверьте названия и размер JSON.");
  const checked = validateSchema(request.schema_text);
  if (!checked.valid)
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Невалидная схема листа",
      checked.errors,
    );
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
  });
  return structuredClone({ system, sheet_schema: sheetSchema });
}
