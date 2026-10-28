// Календарная дата в часовом поясе браузера; используется у выдачи доступа и EDIT-копии.
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Исходная ISO-запись остаётся в атрибуте time, пользователю показывается короткая дата.
export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}
