import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import CharactersPage from "../pages/CharactersPage";
import NewCharacterPage from "../pages/NewCharacterPage";
import CharacterPage from "../pages/CharacterPage";
import CharacterVersionPage from "../pages/CharacterVersionPage";
import SystemsPage from "../pages/SystemsPage";
import ImportSystemPage from "../pages/ImportSystemPage";
import ProfilePage from "../pages/ProfilePage";
import NotFoundPage from "../pages/NotFoundPage";
import AppLayout from "../layouts/AppLayout";
import { ROUTES } from "../constants/routes";

export const routes: RouteObject[] = [
  {
    path: ROUTES.root,
    element: <Navigate to={ROUTES.characters} replace />,
  },

  {
    path: ROUTES.login,
    element: <LoginPage />,
  },

  {
    element: <AppLayout />,
    children: [
      {
        path: ROUTES.characters,
        element: <CharactersPage />,
      },

      {
        path: ROUTES.newCharacter,
        element: <NewCharacterPage />,
      },

      {
        path: ROUTES.character,
        element: <CharacterPage />,
      },

      {
        path: ROUTES.characterVersion,
        element: <CharacterVersionPage />,
      },

      {
        path: ROUTES.systems,
        element: <SystemsPage />,
      },

      {
        path: ROUTES.importSystem,
        element: <ImportSystemPage />,
      },

      {
        path: ROUTES.profile,
        element: <ProfilePage />,
      },
    ],
  },

  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);