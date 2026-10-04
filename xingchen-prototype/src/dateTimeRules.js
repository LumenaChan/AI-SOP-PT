const DATE_TIME_WITHOUT_SECONDS =
  /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2})(?!:\d{2})(?=$|[^\d:])/g;

export function ensureDateTimeSeconds(value) {
  if (typeof value !== "string") return value;
  return value.replace(DATE_TIME_WITHOUT_SECONDS, "$1:00");
}

export function normalizeDateTimeSeconds(value) {
  if (typeof value === "string") return ensureDateTimeSeconds(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = normalizeDateTimeSeconds(item);
    });
    return value;
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = normalizeDateTimeSeconds(value[key]);
    });
  }
  return value;
}
