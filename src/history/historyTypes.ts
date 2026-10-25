// Ответ GET /characters/{id}/versions: список содержит метаданные, без снимков data.
// Полные снимки понадобятся странице просмотра отдельной версии.
export interface CharacterVersionSummary {
  id: string;
  version_number: number;
  created_at: string;
  is_current: boolean;
}
