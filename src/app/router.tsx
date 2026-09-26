import { createBrowserRouter } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import CharactersPage from "../pages/CharactersPage";
import NewCharacterPage from "../pages/NewCharacterPage";
import CharacterPage from "../pages/CharacterPage";
import CharacterVersionPage from "../pages/CharacterVersionPage";
import ImportSystemPage from "../pages/ImportSystemPage";
import ProfilePage from "../pages/ProfilePage";
import NotFoundPage from "../pages/NotFoundPage";


export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },

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
    path: "/systems/import",
    element: <ImportSystemPage />,
  },

  {
    path: "/profile",
    element: <ProfilePage />,
  },

  {
    path: "*",
    element: <NotFoundPage />,
  },
]);