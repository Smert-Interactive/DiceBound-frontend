import type { CharacterShare } from "../sharing/sharingTypes";
import { createMockId } from "./mockId";

// Общие записи связывают список владельца и доступные оригиналы получателя.
// Хранилище не импортирует страницы и персонажей: это исключает циклы между mock-сервисами.
const shares: CharacterShare[] = [
  {
    id: "a1100000-0000-4000-8000-000000000001",
    character_id: "c1a00000-0000-4000-8000-000000000001",
    user_id: "a1200000-0000-4000-8000-000000000001",
    recipient_email: "user@example.com",
    permission: "VIEW",
    history_visible: true,
    created_at: "2026-09-24T12:00:00Z",
  },
  {
    id: "a1100000-0000-4000-8000-000000000002",
    character_id: "c1a00000-0000-4000-8000-000000000001",
    user_id: "a1200000-0000-4000-8000-000000000002",
    recipient_email: "player@example.com",
    permission: "VIEW",
    history_visible: false,
    created_at: "2026-09-25T12:00:00Z",
  },
  {
    id: "a1100000-0000-4000-8000-000000000003",
    character_id: "c1a00000-0000-4000-8000-000000000001",
    user_id: "a1200000-0000-4000-8000-000000000003",
    recipient_email: "editor@example.com",
    permission: "EDIT",
    history_visible: null,
    created_at: "2026-09-24T12:00:00Z",
  },
  {
    id: "a1100000-0000-4000-8000-000000000004",
    character_id: "c1a00000-0000-4000-8000-000000000004",
    user_id: "a1e0c000-0000-4000-8000-000000000001",
    recipient_email: "alex@example.com",
    permission: "VIEW",
    history_visible: false,
    created_at: "2026-09-23T12:15:00Z",
  },
];

const revokedShareIds = new Set<string>();
const recipientIds = new Map(
  shares.map((share) => [share.recipient_email, share.user_id]),
);

// Возвращаем копии активных записей; менять хранилище могут только mock-сервисы.
export function getStoredShares() {
  return shares
    .filter((share) => !revokedShareIds.has(share.id))
    .map((share) => ({ ...share }));
}

// Один пользователь имеет одинаковый user_id во всех выдачах.
export function getMockRecipientId(email: string) {
  if (!recipientIds.has(email)) recipientIds.set(email, createMockId());
  return recipientIds.get(email)!;
}

// Изменения хранятся до перезагрузки, как mock-листы и их история.
export function addStoredShare(share: CharacterShare) {
  shares.push({ ...share });
}

// Отзыв сохраняет исходные демонстрационные записи для следующей загрузки приложения.
export function revokeStoredShare(id: string) {
  revokedShareIds.add(id);
}
