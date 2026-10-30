import { apiRequest } from "./client";
import type { CharacterList, CreateCharacterRequest } from "./characterTypes";
import type { Character } from "../sheet/sheetTypes";

// Получает собственных персонажей и доступные оригиналы; права определяет сервер.
export function getCharacters(signal?: AbortSignal) {
  return apiRequest<CharacterList>("/characters", { signal });
}

// Создаёт персонажа и v1 из выбранной серверной схемы.
export function createCharacter(
  body: CreateCharacterRequest,
  signal?: AbortSignal,
) {
  return apiRequest<Character>("/characters", { method: "POST", body, signal });
}

// Удаляет собственного персонажа; успешный 204 не содержит JSON.
export function deleteCharacter(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/characters/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
}
