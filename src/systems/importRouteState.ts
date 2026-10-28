// Состояние перехода после импорта принимаем только в известном формате.
export function getImportedSystem(state: unknown) {
  if (!state || typeof state !== "object") return null;
  if (
    !("importedSystemId" in state) ||
    !("importedSchemaId" in state) ||
    !("importedSystemName" in state)
  )
    return null;
  const { importedSystemId, importedSchemaId, importedSystemName } = state;
  return typeof importedSystemId === "string" &&
    typeof importedSchemaId === "string" &&
    typeof importedSystemName === "string"
    ? {
        systemId: importedSystemId,
        schemaId: importedSchemaId,
        name: importedSystemName,
      }
    : null;
}
