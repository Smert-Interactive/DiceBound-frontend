import { apiRequest } from "./client";
import type {
  CharacterList,
  CreateCharacterRequest,
  SaveCharacterRequest,
} from "./characterTypes";
import type { Character, CharacterDetails } from "../sheet/sheetTypes";

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

// Читает актуальный лист; проверка доступа остаётся на сервере.
export function getCharacter(id: string, signal?: AbortSignal) {
  return apiRequest<CharacterDetails>(`/characters/${encodeURIComponent(id)}`, {
    signal,
  });
}

// Полностью заменяет пользовательские поля; calculated и номер версии возвращает сервер.
export function saveCharacter(
  id: string,
  body: SaveCharacterRequest,
  signal?: AbortSignal,
) {
  return apiRequest<CharacterDetails>(`/characters/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
    signal,
  });
}
