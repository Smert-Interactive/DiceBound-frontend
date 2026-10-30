import { vi } from "vitest";
import { MOCK_USER } from "../../mocks/authUser";
import {
  createMockCharacter,
  getMockCharacterList,
} from "../../mocks/characters";
import { getMockSystems, getMockSchemas } from "../../mocks/systems";
import { getMockSheetSchema } from "../../mocks/sheetSchemas";

// HTTP-фикстура прежних UI-сценариев; production-страницы не импортируют mock-хранилище.
export function createDataApi(getEmail: () => string = () => MOCK_USER.email) {
  const deleted = new Set<string>();
  return async (
    url: string,
    options: RequestInit = {},
  ): Promise<Response | undefined> => {
    const email = getEmail();
    if (url === "/api/v1/characters") {
      if (options.method === "POST") {
        const character = await createMockCharacter(
          JSON.parse(String(options.body)),
          email,
        );
        return Response.json(character, { status: 201 });
      }
      const list = getMockCharacterList(email);
      return Response.json({
        ...list,
        owned: list.owned.filter((item) => !deleted.has(item.id)),
      });
    }
    const character = /^\/api\/v1\/characters\/([^/]+)$/.exec(url);
    if (character && options.method === "DELETE") {
      deleted.add(character[1]);
      return new Response(null, { status: 204 });
    }
    if (url === "/api/v1/systems") return Response.json(getMockSystems(email));
    const system = /^\/api\/v1\/systems\/([^/]+)\/schemas$/.exec(url);
    if (system) return Response.json(getMockSchemas(system[1]));
    const schema = /^\/api\/v1\/schemas\/([^/]+)$/.exec(url);
    if (schema) {
      const found = getMockSheetSchema(schema[1]);
      return found
        ? Response.json(found)
        : Response.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return undefined;
  };
}

// Неизвестный маршрут отклоняется: новый API-вызов не получает случайные демонстрационные данные.
export function installDataApi(email = MOCK_USER.email) {
  const handle = createDataApi(() => email);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: RequestInit) => {
      const response = await handle(url, options);
      if (response) return response;
      throw new Error(`Unexpected test request: ${url}`);
    }),
  );
}
