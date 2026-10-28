import { getMockCharacterList } from "./characters";
import {
  createMockCharacterCopy,
  getMockCharacterDetails,
} from "./characterDetails";
import { hasMockAccount } from "../auth/mockAuth";
import { createMockId } from "./mockId";
import {
  addStoredShare,
  getMockRecipientId,
  getStoredShares,
  revokeStoredShare,
} from "./characterSharesStore";
import type {
  CharacterShare,
  CreateShareRequest,
  ShareResult,
} from "../sharing/sharingTypes";

// Список выдач доступен только владельцу оригинала или своей EDIT-копии.
export function getMockCharacterShares(
  id: string,
  email: string,
): CharacterShare[] | undefined {
  if (!getMockCharacterList(email).owned.some((item) => item.id === id))
    return undefined;
  return getStoredShares().filter((share) => share.character_id === id);
}

// Ошибки имеют контрактный code, чтобы форма различала почту, конфликт и сеть.
function shareError(code: string) {
  return Object.assign(new Error(code), { code });
}

// VIEW открывает оригинал, EDIT атомарно создаёт независимую копию с историей от v1.
export async function createMockCharacterShare(
  characterId: string,
  request: CreateShareRequest,
  ownerEmail: string,
): Promise<ShareResult> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  const existing = getMockCharacterShares(characterId, ownerEmail);
  const source = existing && getMockCharacterDetails(characterId, ownerEmail);
  if (!source) throw shareError("NOT_FOUND_OR_FORBIDDEN");
  const email = request.recipient_email.trim().toLowerCase();
  if (email === ownerEmail.trim().toLowerCase() || !hasMockAccount(email))
    throw shareError("SHARE_UNAVAILABLE");
  if (existing!.some((share) => share.recipient_email === email))
    throw shareError("CONFLICT");
  const base = {
    id: createMockId(),
    character_id: characterId,
    user_id: getMockRecipientId(email),
    recipient_email: email,
    created_at: new Date().toISOString(),
  };
  const share: CharacterShare =
    request.permission === "VIEW"
      ? {
          ...base,
          permission: "VIEW",
          history_visible: request.history_visible,
        }
      : { ...base, permission: "EDIT", history_visible: null };
  const copyId =
    request.permission === "EDIT"
      ? createMockCharacterCopy(source, email)
      : null;
  addStoredShare(share);
  return { share: { ...share }, copy_character_id: copyId };
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
  revokeStoredShare(share.id);
}
