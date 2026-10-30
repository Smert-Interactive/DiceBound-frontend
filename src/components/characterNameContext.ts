import { createContext } from "react";

export const CharacterNameContext = createContext<{
  character: { id: string; name: string } | null;
  setCharacter: (value: { id: string; name: string } | null) => void;
} | null>(null);
