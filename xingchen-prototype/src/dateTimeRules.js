import { notificationTime } from "./notificationRules.js";

// Presentation only: convert absolute instants to Beijing time without changing
// stored timestamps, comparison keys, form values or elapsed/video timecodes.
const DISPLAY_DATE_TIME =
  /(?<![\dA-Za-z])\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?(?![\dA-Za-z:.])/gi;

export function displayDateTime(value) {
  if (value instanceof Date)
    return Number.isNaN(value.getTime())
      ? "时间未知"
      : notificationTime(value.toISOString());
  if (typeof value !== "string") return value;
  return value.replace(DISPLAY_DATE_TIME, (timestamp) =>
    notificationTime(timestamp),
  );
}

// datetime-local controls require a local ISO-shaped value rather than a Z/offset
// timestamp. This only adapts the control value; the original record is untouched.
export function dateTimeInputValue(value) {
  const formatted = displayDateTime(value);
  return typeof formatted === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatted)
    ? formatted.replace(" ", "T")
    : "";
}

export function displayClockTime(value) {
  const formatted = notificationTime(String(value || ""));
  return /\d{2}:\d{2}:\d{2}$/.test(formatted)
    ? formatted.slice(-8)
    : "时间未知";
}

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
