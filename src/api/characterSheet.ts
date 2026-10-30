import { getCharacter, getCharacters } from "./characters";
import { getSheetSchema } from "./systems";

// Полная схема доступна и после архивации системы; название системы берём из списка персонажей.
export async function getCharacterSheet(id: string, signal: AbortSignal) {
  const character = await getCharacter(id, signal);
  const [schema, list] = await Promise.all([
    getSheetSchema(character.sheet_schema_id, signal),
    getCharacters(signal),
  ]);
  const summary = [...list.owned, ...list.shared_view].find(
    (item) => item.id === id,
  );
  return { character, schema, summary };
}
