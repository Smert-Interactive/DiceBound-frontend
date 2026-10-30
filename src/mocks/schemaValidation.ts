import { isSchemaTextWithinLimit } from "../api/contractLimits";
import { ApiError } from "../api/client";
import { validateSchema } from "../systems/validateSchema";
import type {
  SchemaValidationRequest,
  SchemaValidationResult,
} from "../systems/schemaValidationTypes";

// Имитирует POST проверки: позже здесь будет запрос с schema_text, UI менять не потребуется.
export async function validateMockSchema(
  request: SchemaValidationRequest,
): Promise<SchemaValidationResult> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  if (!isSchemaTextWithinLimit(request.schema_text))
    throw new ApiError(400, "BAD_REQUEST", "JSON превышает 64 KiB UTF-8.");
  return validateSchema(request.schema_text);
}
