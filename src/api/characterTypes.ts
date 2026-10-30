import type { CharacterData } from "../sheet/sheetTypes";

// Типы повторяют CharacterSummary и CharacterList из контракта GET /characters.
// Список не обещает число версий: подтверждение удаления не зависит от этого поля.
export interface CharacterSummary {
  id: string;
  name: string;
  game_system_id: string;
  game_system_name: string;
  updated_at: string;
  access: "OWNER" | "VIEW";
  // Отображаемое имя владельца из API; оно не обязано быть почтой.
  owner_username: string;
  // Не null только у копий, полученных через EDIT.
  copy_source_owner_name: string | null;
}

export interface CharacterList {
  owned: CharacterSummary[];
  shared_view: CharacterSummary[];
}

// Поля повторяют CreateCharacterRequest из контракта POST /characters.
export interface CreateCharacterRequest {
  name: string;
  game_system_id: string;
  sheet_schema_id: string;
}

export interface SaveCharacterRequest {
  data: CharacterData;
}
