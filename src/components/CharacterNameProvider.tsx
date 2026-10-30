import { useState, type ReactNode } from "react";
import { CharacterNameContext } from "./characterNameContext";

// Передаёт шапке имя уже загруженного листа без дополнительного запроса и mock-данных.
export default function CharacterNameProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [character, setCharacter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  return (
    <CharacterNameContext.Provider value={{ character, setCharacter }}>
      {children}
    </CharacterNameContext.Provider>
  );
}
