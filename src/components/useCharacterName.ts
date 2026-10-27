import { useAuth } from "../auth/authContext";
import { getMockCharacterList } from "../mocks/characters";

// Имя персонажа для хлебных крошек. Берётся только из списка, доступного пользователю,
// поэтому чужое имя по адресу не раскрывается. При подключении API заменится здесь.
export function useCharacterName(
  characterId: string | undefined,
): string | undefined {
  const { user } = useAuth();
  if (!user || !characterId) return undefined;

  const list = getMockCharacterList(user.email);
  return [...list.owned, ...list.shared_view].find(
    (character) => character.id === characterId,
  )?.name;
}
