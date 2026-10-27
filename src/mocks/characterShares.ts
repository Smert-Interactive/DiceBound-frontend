import { getMockCharacterList, MOCK_CHARACTERS } from "./characters";
import type { CharacterShare } from "../sharing/sharingTypes";

const characterId = MOCK_CHARACTERS.owned[0].id;

// Данные досок Access, MAccess и TAccess. Остальные свои персонажи пока без выдач.
const shares: readonly CharacterShare[] = [
  {
    id: "a1100000-0000-4000-8000-000000000001",
    character_id: characterId,
    user_id: "a1200000-0000-4000-8000-000000000001",
    recipient_email: "user@example.com",
    permission: "VIEW",
    history_visible: true,
    created_at: "2026-09-24T12:00:00Z",
  },
  {
    id: "a1100000-0000-4000-8000-000000000002",
    character_id: characterId,
    user_id: "a1200000-0000-4000-8000-000000000002",
    recipient_email: "player@example.com",
    permission: "VIEW",
    history_visible: false,
    created_at: "2026-09-25T12:00:00Z",
  },
  {
    id: "a1100000-0000-4000-8000-000000000003",
    character_id: characterId,
    user_id: "a1200000-0000-4000-8000-000000000003",
    recipient_email: "editor@example.com",
    permission: "EDIT",
    history_visible: null,
    created_at: "2026-09-24T12:00:00Z",
  },
];

// Отзывы живут в памяти до перезагрузки, как изменения листа и истории.
const revokedShareIds = new Set<string>();

// Как GET /characters/{id}/shares: список доступен только владельцу.
// undefined — нет доступа или персонажа; пустой массив — владелец ещё никому не выдал доступ.
export function getMockCharacterShares(
  id: string,
  email: string,
): CharacterShare[] | undefined {
  if (!getMockCharacterList(email).owned.some((item) => item.id === id)) {
    return undefined;
  }

  // Возвращаем копии записей, чтобы вызывающий код не изменил сохранённые mock-данные.
  return shares
    .filter(
      (share) => share.character_id === id && !revokedShareIds.has(share.id),
    )
    .map((share) => ({ ...share }));
}

// Повторяет DELETE shares: проверяет владельца и запрещает отзыв переданной EDIT-копии.
export async function revokeMockCharacterShare(
  characterId: string,
  shareId: string,
  ownerEmail: string,
): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  const share = getMockCharacterShares(characterId, ownerEmail)?.find(
    (item) => item.id === shareId,
  );
  if (!share) throw new Error("NOT_FOUND_OR_FORBIDDEN");
  if (share.permission === "EDIT") throw new Error("SHARE_IRREVOCABLE");
  revokedShareIds.add(share.id);
}
