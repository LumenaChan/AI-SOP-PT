import { displayBusinessText } from "./businessTextRules.js";
export function statisticsTime(value, endOfDay = false) {
  if (!value || value === "历史记录") return null;
  let s = String(value).trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s))
    s += endOfDay ? "T23:59:59.999" : "T00:00:00";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(s))
    s += "+08:00";
  const n = Date.parse(s);
  return Number.isFinite(n) ? n : null;
}
export function trustedResultTime(arrangement, session) {
  return (
    [
      session.submittedAt,
      session.completedAt,
      session.endedAt,
      session.resultPreparedAt,
      arrangement.endedAt,
    ].find((v) => statisticsTime(v) !== null) || ""
  );
}
export function classAttribution(data, arrangement, session) {
  if (session.studentSnapshot?.classId)
    return { id: session.studentSnapshot.classId, source: "当次学生班级记录" };
  if (session.classId) return { id: session.classId, source: "会话班级记录" };
  if (arrangement.classId)
    return { id: arrangement.classId, source: "安排班级记录" };
  const id = (data.students || []).find(
    (s) => s.id === session.studentId,
  )?.classId;
  return {
    id: id || "",
    source: id ? "按当前班级归属（历史未记录）" : "班级归属未记录",
  };
}
export function captureStudentSnapshot(data, studentId, at) {
  const s = (data.students || []).find((s) => s.id === studentId);
  return {
    id: studentId,
    name: s?.name || "",
    number: s?.no || s?.number || s?.studentNo || "",
    classId: s?.classId || "",
    capturedAt: at,
    source: "session_open",
  };
}
export function validStatisticsReturn(path) {
  if (typeof path !== "string" || path.length > 12000) return "";
  try {
    const u = new URL(path, "http://prototype.local");
    return u.origin === "http://prototype.local" &&
      ["/teacher/statistics", "/teacher/data-statistics"].includes(
        u.pathname,
      ) &&
      path.startsWith("/teacher/")
      ? u.pathname + u.search
      : "";
  } catch {
    return "";
  }
}
export function statisticsBusinessPath(path) {
  return (
    /^\/teacher\/(?:practices|exams)\/[^/?#]+\/(?:students|stations)\/[^/?#]+(?:[?#]|$)/.test(
      path,
    ) ||
    /^\/teacher\/(?:practices|exams)\/[^/?#]+\/(?:prep|live|results|edit)(?:[?#]|$)/.test(
      path,
    ) ||
    /^\/teacher\/(?:support|evidence)-tasks\/[^/?#]+(?:[?#]|$)/.test(path)
  );
}
export function withStatisticsReturn(path, back, source) {
  back = validStatisticsReturn(back);
  if (!back || typeof path !== "string" || !statisticsBusinessPath(path))
    return path;
  const u = new URL(path, "http://prototype.local");
  u.searchParams.set("statisticsReturn", back);
  u.searchParams.set("statisticsSource", source);
  return u.pathname + u.search + u.hash;
}
export function statisticsCsv(columns, rows, metadata) {
  if (!rows.length) throw new Error("当前明细没有可导出的记录。");
  const cell = (value) => {
    let s = value == null ? "" : String(displayBusinessText(value));
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const meta = Object.entries(metadata);
  const headers = [...meta.map(([k]) => k), ...columns.map((c) => c.label)];
  return (
    "\uFEFF" +
    [
      headers,
      ...rows.map((r) => [
        ...meta.map(([, v]) => v),
        ...columns.map((c) =>
          typeof c.value === "function" ? c.value(r) : r[c.key],
        ),
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export function legacyStatisticsTarget(metric) {
  const routes = {
    average: "/teacher/statistics?tab=classes&detail=all",
    publishing: "/teacher/statistics?tab=followup&work=publish",
    support: "/teacher/statistics?tab=followup&kind=support&status=open",
    errors: "/teacher/statistics?tab=steps&detail=errors",
  };
  return routes[metric] || "/teacher/statistics";
}
