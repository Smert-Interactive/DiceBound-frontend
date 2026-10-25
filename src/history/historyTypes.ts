import type { CharacterData } from "../sheet/sheetTypes";

// Ответ GET /characters/{id}/versions: список содержит метаданные, без снимков data.
// Полные снимки понадобятся странице просмотра отдельной версии.
export interface CharacterVersionSummary {
  id: string;
  version_number: number;
  created_at: string;
  is_current: boolean;
}

// Ответ GET /characters/{id}/versions/{version}: полный снимок, включая calculated.
export interface CharacterVersion {
  id: string;
  character_id: string;
  version_number: number;
  data: CharacterData;
  created_at: string;
}
