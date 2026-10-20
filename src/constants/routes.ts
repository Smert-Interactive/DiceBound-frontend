// Единый список адресов приложения. Строки с путями нигде больше не пишем.
export const ROUTES = {
  root: "/",
  login: "/login",
  characters: "/characters",
  newCharacter: "/characters/new",
  character: "/characters/:id",
  characterVersion: "/characters/:id/versions/:version",
  systems: "/systems",
  importSystem: "/systems/import",
  profile: "/profile",
} as const;

export const routeLabels: Record<string, string> = {
  characters: "Персонажи",
  new: "Новый персонаж",
  systems: "Игровые системы",
  import: "Импорт системы",
  profile: "Профиль",
};
