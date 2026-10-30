import { useContext, useEffect } from "react";
import { CharacterNameContext } from "./characterNameContext";

// Показывает имя только текущего загруженного персонажа, не раскрывая чужие данные.
export function useCharacterName(
  characterId: string | undefined,
): string | undefined {
  const context = useContext(CharacterNameContext);
  return context?.character?.id === characterId
    ? context?.character?.name
    : undefined;
}

// Обновляет крошки после загрузки листа и убирает имя при уходе со страницы.
export function useCharacterLabel(id: string, name: string | undefined) {
  const setCharacter = useContext(CharacterNameContext)?.setCharacter;
  useEffect(() => {
    if (!setCharacter || !name) return;
    setCharacter({ id, name });
    return () => setCharacter(null);
  }, [id, name, setCharacter]);
}
