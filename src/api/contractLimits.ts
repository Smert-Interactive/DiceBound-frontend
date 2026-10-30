// Ограничения HTTP API общие для форм, mock-сервисов и проверки схемы.
export const CONTRACT_LIMITS = {
  name: 255,
  email: 254,
  password: 1024,
  identifier: 128,
  schemaBytes: 64 * 1024,
  sections: 64,
  fieldsPerSection: 256,
  fields: 1024,
  options: 1024,
  formulaLength: 2048,
  formulaTokens: 512,
  formulaDepth: 64,
  errors: 50,
} as const;

// Размер считается в UTF-8: русские буквы занимают больше одного байта.
export function isSchemaTextWithinLimit(text: string): boolean {
  return new TextEncoder().encode(text).length <= CONTRACT_LIMITS.schemaBytes;
}
