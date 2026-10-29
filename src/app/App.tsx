import { RouterProvider } from "react-router-dom";

import AuthProvider from "../auth/AuthProvider";
import { router } from "./router";

// Открывает маршруты только после восстановления серверной сессии.
export default function App() {
  return (
    // Провайдер проверяет /me до первого открытия защищённой страницы.
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
