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


export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/characters" replace />,
  },

  {
    path: "/login",
    element: <LoginPage />,
  },

  {
  element: <AppLayout />,
  children: [
    {
      path: "/characters",
      element: <CharactersPage />,
    },
 
    {
      path: "/characters/new",
      element: <NewCharacterPage />,
    },

    {
      path: "/characters/:id",
      element: <CharacterPage />,
    },

    {
      path: "/characters/:id/versions/:version",
      element: <CharacterVersionPage />,
    },

    {
      path: "/systems",
      element: <SystemsPage />,
    },

    {
      path: "/systems/import",
      element: <ImportSystemPage />,
    },

    {
      path: "/profile",
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