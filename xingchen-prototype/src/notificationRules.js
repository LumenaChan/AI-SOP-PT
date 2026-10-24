const formatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function notificationTime(value) {
  const text = typeof value === "string" ? value.trim() : "";
  const clock = text.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (clock)
    return Number(clock[1]) < 24 &&
      Number(clock[2]) < 60 &&
      Number(clock[3] || 0) < 60
      ? `${clock[1]}:${clock[2]}:${clock[3] || "00"}`
      : "时间未知";
  if (text === "刚刚") return text;
  const date = text.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/i,
  );
  if (
    !date ||
    Number(date[2]) > 23 ||
    Number(date[3]) > 59 ||
    Number(date[4] || 0) > 59
  )
    return "时间未知";
  const day = new Date(`${date[1]}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date[1])
    return "时间未知";
  const instant = new Date(
    `${date[1]}T${date[2]}:${date[3]}:${date[4] || "00"}${date[5] || ""}${date[6] || "+08:00"}`,
  );
  if (Number.isNaN(instant.getTime())) return "时间未知";
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function notificationPage(items, page = 0) {
  const total = items.length,
    pageSize = 10,
    pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(
    pages - 1,
    Math.max(0, Math.floor(Number(page)) || 0),
  );
  return {
    rows: items.slice(current * pageSize, (current + 1) * pageSize),
    page: current,
    pages,
    total,
  };
}
