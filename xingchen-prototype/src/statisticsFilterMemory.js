const KEYS = {
  "/teacher/statistics": [
    "classId",
    "sopId",
    "type",
    "from",
    "to",
    "tab",
    "student",
  ],
  "/teacher/data-statistics": [
    "classId",
    "sopId",
    "type",
    "from",
    "to",
    "range",
    "grain",
    "dimension",
  ],
};
const keyFor = (path, source, teacherId) =>
  `xingchen-statistics-filters-v1:${source}:${teacherId}:${path}`;
export function rememberStatisticsFilters(
  path,
  params,
  source,
  teacherId,
  storage = globalThis.window?.sessionStorage,
) {
  if (!KEYS[path] || !storage) return;
  const next = new URLSearchParams();
  for (const key of KEYS[path])
    if (params.get(key)) next.set(key, params.get(key));
  try {
    storage.setItem(keyFor(path, source, teacherId), next.toString());
  } catch {
    /* Filter memory does not affect business data. */
  }
}
export function rememberedStatisticsPath(
  path,
  source,
  teacherId,
  storage = globalThis.window?.sessionStorage,
) {
  if (!KEYS[path]) return path;
  let saved = "";
  try {
    saved = storage?.getItem(keyFor(path, source, teacherId)) || "";
  } catch {
    /* Use fresh filters when unavailable. */
  }
  const params = new URLSearchParams(saved),
    clean = new URLSearchParams();
  for (const key of KEYS[path])
    if (params.get(key)) clean.set(key, params.get(key));
  clean.set("source", source);
  return `${path}?${clean}`;
}
