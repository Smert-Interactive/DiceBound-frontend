import type { CurrentUser as User } from "../api/types";

// Демонстрационный пользователь для начальной сессии в тестах каркаса.
export const MOCK_USER: User = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "alex",
  email: "alex@example.com",
  created_at: "2026-01-01T12:00:00Z",
  owned_characters_count: 0,
  shared_characters_count: 0,
};
