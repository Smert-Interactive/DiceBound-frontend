import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import { ROUTES } from "../constants/routes";

// Пускает дальше только вошедшего пользователя, остальных отправляет на /login.
export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // from запоминает, куда человек шёл, чтобы после входа вернуть его туда.
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
