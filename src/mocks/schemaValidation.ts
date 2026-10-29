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
  return validateSchema(request.schema_text);
}
