import type { RouteObject } from "react-router-dom";
import { routes as productionRoutes } from "../../app/router";
import MockCharacterPage from "../../mocks/pages/MockCharacterPage";
import CharacterVersionPage from "../../pages/CharacterVersionPage";
import { ROUTES } from "../../constants/routes";

// Старые сценарии истории и sharing проверяют отдельную демонстрацию, а не реальные листы.
function withMockSheet(route: RouteObject): RouteObject {
  return {
    ...route,
    ...(route.path === ROUTES.character
      ? { element: <MockCharacterPage /> }
      : {}),
    ...(route.path === ROUTES.characterVersion
      ? { element: <CharacterVersionPage /> }
      : {}),
    ...(route.children ? { children: route.children.map(withMockSheet) } : {}),
  } as RouteObject;
}
export const routes = productionRoutes.map(withMockSheet);
