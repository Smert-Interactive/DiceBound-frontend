import { routeLabels } from "../constants/routes";

export interface Crumb {
  // Накопленный адрес («/characters/42»). Уникален, поэтому годится как key в списке.
  path: string;
  label: string;
  // Адрес ссылки. Если его нет, крошка выводится обычным текстом.
  to?: string;
}

// Превращает адрес страницы в список хлебных крошек.
// Например, /characters/42/versions/4 → Персонажи / Aldric / История / Версия 4.
// characterName — имя персонажа; пока оно неизвестно, вместо него показывается id.
export function getBreadcrumbs(
  pathname: string,
  characterName?: string,
): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const isCharacterPath = parts[0] === "characters";

  // По холсту крошки систем следуют сценарию, а не адресу:
  // список систем показан как шаг после импорта.
  const importCrumb: Crumb = {
    path: "/systems/import",
    label: routeLabels.import,
    to: "/systems/import",
  };

  // /systems/import → Импорт системы
  if (parts.length === 2 && parts[0] === "systems" && parts[1] === "import") {
    return [importCrumb];
  }

  // /systems → Импорт системы / Игровые системы
  if (parts.length === 1 && parts[0] === "systems") {
    return [
      importCrumb,
      { path: "/systems", label: routeLabels.systems, to: "/systems" },
    ];
  }

  let path = "";

  return parts.map((part, index) => {
    path += `/${part}`;

    if (isCharacterPath && part !== "new") {
      // /characters/:id
      if (index === 1) {
        return { path, label: characterName ?? part, to: path };
      }

      // /characters/:id/versions: вкладка «История» открывается на странице персонажа,
      // отдельного адреса у неё нет, поэтому ссылки нет.
      if (index === 2 && part === "versions") {
        return { path, label: "История" };
      }

      // /characters/:id/versions/:version
      if (index === 3) {
        return { path, label: `Версия ${part}` };
      }
    }

    // «Персонажи», «Профиль» и так далее берём из словаря, неизвестное показываем как есть.
    return { path, label: routeLabels[part] ?? part, to: path };
  });
}
