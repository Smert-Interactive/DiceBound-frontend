export type CharacterTab = "sheet" | "history" | "access";

const TABS: readonly string[] = ["sheet", "history", "access"];

// У вкладок страницы персонажа нет своего адреса, поэтому активная вкладка и уведомление
// после восстановления едут в location.state. React Router отдаёт его как unknown:
// здесь он сужается до нужных полей, остальное игнорируется.

// Вкладка из состояния перехода; неизвестное значение считается отсутствующим.
export function getActiveTab(state: unknown): CharacterTab | undefined {
  if (!state || typeof state !== "object" || !("activeTab" in state))
    return undefined;
  const { activeTab } = state;
  return typeof activeTab === "string" && TABS.includes(activeTab)
    ? (activeTab as CharacterTab)
    : undefined;
}

// Текст уведомления «Восстановлена версия N…», переданный со страницы версии.
export function getRestoreNotice(state: unknown): string | null {
  if (!state || typeof state !== "object" || !("restoreNotice" in state))
    return null;
  const { restoreNotice } = state;
  return typeof restoreNotice === "string" ? restoreNotice : null;
}
