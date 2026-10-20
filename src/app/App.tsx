import { RouterProvider } from "react-router-dom";

import AuthProvider from "../auth/AuthProvider";
import { router } from "./router";

export default function App() {
  return (
    // После перезагрузки начинаем без сессии: mock-авторизация не сохраняется в браузере.
    <AuthProvider initialUser={null}>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
