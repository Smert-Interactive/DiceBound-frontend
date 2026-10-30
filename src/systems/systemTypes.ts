// Метаданные системы из GameSystemSummary; UI не зависит от способа загрузки данных.
export interface GameSystemSummary {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  source: "BUILT_IN" | "IMPORTED";
  character_count: number;
  created_at: string;
}

// Краткий ответ GET /systems/{id}/schemas не содержит полей и секций.
export interface SheetSchemaSummary {
  id: string;
  game_system_id: string;
  name: string;
  created_at: string;
}
