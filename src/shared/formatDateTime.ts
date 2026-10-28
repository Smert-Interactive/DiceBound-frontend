// Показываем дату и время в часовом поясе пользователя, как и даты выдачи доступа.
// hourCycle "h23" даёт 00:05 вместо 24:05 после полуночи.
const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const NO_BREAK_SPACE = " ";

// ISO-время → локальные дата и время. Неразрывный пробел не даёт времени
// уехать на новую строку отдельно от даты. Запятую русского формата не используем.
export function formatDateTime(iso: string) {
  const parts = new Map(
    dateTimeFormat
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.get("day")}.${parts.get("month")}.${parts.get("year")}`;

  return `${date}${NO_BREAK_SPACE}${parts.get("hour")}:${parts.get("minute")}`;
}
