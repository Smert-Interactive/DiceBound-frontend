import type { ReactNode } from "react";

import { AuthContext, MOCK_USER } from "./authContext";
import type { User } from "./authContext";

interface Props {
  // Параметр нужен тестам: null — «не вошёл». Если не передан, берётся mock-пользователь.
  initialUser?: User | null;
  children: ReactNode;
}

export default function AuthProvider({
  initialUser = MOCK_USER,
  children,
}: Props) {
  return (
    <AuthContext.Provider value={{ user: initialUser }}>
      {children}
    </AuthContext.Provider>
  );
}
