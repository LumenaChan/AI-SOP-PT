import { teacherDashboardScopeRows } from "./teacherDashboardMetrics.js";
import {
  classAttribution,
  statisticsTime,
  statisticsCsv,
} from "./statisticsCommonRules.js";
import { validateStatisticsFilters } from "./teachingStatisticsRules.js";

export const DATA_STATISTICS_PATH = "/teacher/data-statistics";
export const DATA_RANGE_LABELS = {
  "7d": "近7天",
  "30d": "近30天",
  month: "本月",
  term: "本学期",
  custom: "自定义",
  all: "全部日期",
};
const CLOSED = new Set([
  "已结束",
  "待发布",
  "已发布",
  "已归档",
  "completed",
  "published",
  "archived",
]);
const UNOPENED = new Set([
  "草稿",
  "待开始",
  "准备中",
  "未开放",
  "draft",
  "preparing",
  "waiting",
]);
const INVALID = new Set([
  "已取消",
  "已作废",
  "作废",
  "未参加",
  "缺考",
  "cancelled",
  "void",
  "absent",
]);
const RUNNING = new Set([
  "进行中",
  "已暂停",
  "故障",
  "active",
  "paused",
  "fault",
]);
const FINISHED = new Set([
  "已完成",
  "待复位",
  "已复位",
  "已结束",
  "completed",
  "submitted",
]);
const day = (time) => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
const firstTime = (...values) =>
  values.find((value) => statisticsTime(value) !== null) || "";
const unique = (rows, key) =>
  new Set(rows.map((row) => row[key]).filter(Boolean)).size;
const validSession = (session) =>
  ![session.status, session.resultStatus].some((status) => INVALID.has(status));
export function dataStatisticsRange(preset = "month", now = new Date()) {
  const today = day(Number(now));
  if (preset === "all" || preset === "term" || preset === "custom")
    return { from: "", to: "" };
  return {
    from:
      preset === "month"
        ? `${today.slice(0, 7)}-01`
        : day(statisticsTime(today) - (preset === "7d" ? 6 : 29) * 86400000),
    to: today,
  };
}
export function validateDataStatisticsFilters(filters) {
  const error = validateStatisticsFilters(filters);
  if (error) return error;
  if (filters.range === "term" && (!filters.from || !filters.to))
    return "请填写学校实际学期的开始和结束日期。";
  if (filters.range === "custom" && (!filters.from || !filters.to))
    return "请选择完整的起止日期。";
  if (filters.type && !["practice", "exam"].includes(filters.type))
    return "请选择有效的实训类型。";
  return "";
}
export function dataStatisticsGradeSummary(rows) {
  const comparable =
    rows.length > 0 &&
    rows.every((row) => row.standardBasisComplete) &&
    unique(rows, "sopId") === 1 &&
    unique(rows, "type") === 1 &&
    unique(rows, "standardBasisKey") === 1;
  return {
    count: rows.length,
    comparable,
    average: comparable
      ? rows.reduce((sum, row) => sum + row.normalizedScore, 0) / rows.length
      : null,
    passRate: comparable
      ? (100 * rows.filter((row) => row.normalizedScore >= 60).length) /
        rows.length
      : null,
  };
}
export function dataStatisticsBucket(value, grain) {
  const date = day(statisticsTime(value));
  if (grain === "month") return date.slice(0, 7);
  if (grain === "week") {
    const time = statisticsTime(date);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return day(time - ((weekday + 6) % 7) * 86400000);
  }
  return date;
}
function activitySeries(rows, requestedGrain) {
  const known = rows.filter((row) => statisticsTime(row.time) !== null);
  if (!known.length) return { rows: [], grain: requestedGrain };
  const times = known.map((row) => statisticsTime(row.time));
  const span = (Math.max(...times) - Math.min(...times)) / 86400000;
  const grain =
    requestedGrain === "day" && span > 90
      ? span > 630
        ? "month"
        : "week"
      : requestedGrain === "week" && span > 630
        ? "month"
        : requestedGrain;
  const grouped = new Map();
  for (const row of known) {
    const key = dataStatisticsBucket(row.time, grain);
    if (!grouped.has(key))
      grouped.set(key, {
        id: key,
        label: grain === "week" ? `${key}起` : key,
        practice: 0,
        exam: 0,
        records: [],
      });
    const bucket = grouped.get(key);
    bucket[row.type]++;
    bucket.records.push(row);
  }
  // Fill gaps within the observed period; no invented activity outside recorded dates.
  let cursor = [...grouped.keys()].sort()[0],
    last = [...grouped.keys()].sort().at(-1);
  while (cursor < last) {
    if (!grouped.has(cursor))
      grouped.set(cursor, {
        id: cursor,
        label: grain === "week" ? `${cursor}起` : cursor,
        practice: 0,
        exam: 0,
        records: [],
      });
    cursor =
      grain === "month"
        ? (() => {
            const [year, month] = cursor.split("-").map(Number);
            return `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;
          })()
        : day(statisticsTime(cursor) + (grain === "week" ? 7 : 1) * 86400000);
  }
  return {
    rows: [...grouped.values()].sort((a, b) => a.id.localeCompare(b.id)),
    grain,
  };
}
export function teacherDataStatistics(data, filters = {}) {
  const error = validateDataStatisticsFilters(filters);
  if (error) throw new Error(error);
  const teacherId = filters.teacherId || "t1";
  const owned = (data.arrangements || []).filter(
    (a) =>
      (a.teacherId ||
        a.sessions?.find((s) => s.teacherId)?.teacherId ||
        "t1") === teacherId && ["practice", "exam"].includes(a.type),
  );
  const scope = teacherDashboardScopeRows(data, { teacherId });
  const rowById = new Map(scope.map((row) => [row.id, row]));
  const inRange = (value) => {
    const time = statisticsTime(value);
    return (
      (!filters.from ||
        (time !== null && time >= statisticsTime(filters.from))) &&
      (!filters.to ||
        (time !== null && time <= statisticsTime(filters.to, true)))
    );
  };
  const className = (id) =>
    (data.classes || []).find((c) => c.id === id)?.name || "班级未记录";
  const baseRows = [],
    activities = [],
    participants = [],
    completions = [],
    expected = [],
    missing = {
      starts: 0,
      completions: 0,
      arrangements: 0,
      cohorts: 0,
      rosters: 0,
    };
  const optionClasses = new Map(),
    optionStandards = new Map();
  for (const a of owned) {
    const allSessions = [
      ...new Map((a.sessions || []).map((s) => [s.id, s])).values(),
    ];
    for (const s of allSessions) {
      const row = rowById.get(`${a.id}/${s.id}`);
      if (row) {
        optionClasses.set(row.classId, className(row.classId));
        optionStandards.set(row.sopId, row.sopName);
      }
    }
    for (const id of a.studentIds || []) {
      const cid = classAttribution(
        data,
        a,
        allSessions.find((s) => s.studentId === id) || { studentId: id },
      ).id;
      optionClasses.set(cid, className(cid));
    }
    const sopId = a.snapshot?.sopSnapshot?.id || a.snapshot?.sopId || a.sopId;
    const sopName =
      a.snapshot?.sopSnapshot?.name ||
      (data.sops || []).find((s) => s.id === sopId)?.name ||
      "实训标准未记录";
    optionStandards.set(sopId, sopName);
    if (
      INVALID.has(a.status) ||
      UNOPENED.has(a.status) ||
      (filters.type && a.type !== filters.type) ||
      (filters.sopId && sopId !== filters.sopId)
    )
      continue;
    const attendanceRows = (a.studentIds || [])
      .map((id) => {
        const sessions = allSessions.filter((s) => s.studentId === id);
        const cid = classAttribution(
          data,
          a,
          sessions[0] || { studentId: id },
        ).id;
        return { studentId: id, classId: cid, sessions };
      })
      .filter((r) => !filters.classId || r.classId === filters.classId);
    const selected = allSessions
      .map((s) => rowById.get(`${a.id}/${s.id}`))
      .filter((r) => r && (!filters.classId || r.classId === filters.classId));
    if (filters.classId && !attendanceRows.length && !selected.length) continue;
    const startedRows = selected.filter(
      (r) =>
        validSession(r.session) &&
        !UNOPENED.has(r.session.status) &&
        (statisticsTime(r.session.startedAt) !== null ||
          RUNNING.has(r.session.status) ||
          FINISHED.has(r.session.status) ||
          r.finished),
    );
    const startAt = firstTime(
      a.startedAt,
      ...allSessions
        .filter(validSession)
        .map((s) => s.startedAt)
        .filter(Boolean)
        .sort((x, y) => statisticsTime(x) - statisticsTime(y)),
    );
    const begun =
      statisticsTime(startAt) !== null ||
      startedRows.length > 0 ||
      RUNNING.has(a.status) ||
      CLOSED.has(a.status);
    if (begun && statisticsTime(startAt) === null) missing.arrangements++;
    if (begun && inRange(startAt))
      activities.push({
        id: a.id,
        arrangementId: a.id,
        arrangementName: a.name,
        type: a.type,
        sopId,
        sopName,
        time: startAt,
        status: a.status,
        arrangement: a,
        classIds: [
          ...new Set([
            ...attendanceRows.map((r) => r.classId),
            ...selected.map((r) => r.classId),
          ]),
        ],
      });
    for (const r of startedRows) {
      const record = {
        ...r,
        className: className(r.classId),
        time: firstTime(r.session.startedAt),
      };
      if (!record.time) missing.starts++;
      if (inRange(record.time)) participants.push(record);
      if (r.finished) {
        const ended = {
          ...record,
          time: firstTime(
            r.session.completedAt,
            r.session.submittedAt,
            r.session.endedAt,
          ),
        };
        if (!ended.time) missing.completions++;
        if (inRange(ended.time)) completions.push(ended);
      }
    }
    const ended = CLOSED.has(a.status) && !RUNNING.has(a.status);
    if (ended) {
      if (statisticsTime(a.endedAt) === null) missing.cohorts++;
      if (inRange(a.endedAt)) {
        const ids = a.studentIds;
        const reliable =
          Array.isArray(ids) &&
          ids.length > 0 &&
          ids.every(Boolean) &&
          new Set(ids).size === ids.length;
        if (!reliable) missing.rosters++;
        else
          for (const row of attendanceRows) {
            const metric = selected.find((r) => r.studentId === row.studentId);
            const student = (data.students || []).find(
              (s) => s.id === row.studentId,
            );
            const complete = selected.some(
              (r) =>
                r.studentId === row.studentId &&
                startedRows.includes(r) &&
                r.finished,
            );
            expected.push({
              id: `${a.id}/${row.studentId}`,
              arrangementId: a.id,
              arrangementName: a.name,
              studentId: row.studentId,
              studentName: metric?.studentName || student?.name || "历史学生",
              studentNumber:
                metric?.studentNumber ||
                student?.no ||
                student?.number ||
                "未记录",
              classId: row.classId,
              className: className(row.classId),
              type: a.type,
              sopId,
              sopName,
              time: a.endedAt || "",
              complete,
              participated: startedRows.some(
                (r) => r.studentId === row.studentId,
              ),
              status: complete
                ? "已完成"
                : row.sessions.some((s) =>
                      [s.status, s.resultStatus].some((v) =>
                        ["未参加", "缺考", "absent"].includes(v),
                      ),
                    )
                  ? "明确未参加"
                  : "尚未完成／待核对",
              arrangement: a,
            });
          }
      }
    }
    baseRows.push(...selected);
  }
  const grades = baseRows
    .filter((r) => r.valid && inRange(r.resultAt))
    .map((r) => ({ ...r, className: className(r.classId), time: r.resultAt }));
  const completed = expected.filter((r) => r.complete).length;
  const summarize = (p, a, e, g, c) => ({
    activityCount: a.length,
    studentCount: unique(p, "studentId"),
    participationCount: p.length,
    completedCount: e.filter((r) => r.complete).length,
    expectedCount: e.length,
    expectedParticipatedCount: e.filter((r) => r.participated).length,
    completionCount: c.length,
    completionRate: e.length
      ? (100 * e.filter((r) => r.complete).length) / e.length
      : null,
    ...dataStatisticsGradeSummary(g),
  });
  const classIds = new Set(
    [
      ...participants,
      ...completions,
      ...expected,
      ...grades,
      ...activities.flatMap((r) => r.classIds.map((classId) => ({ classId }))),
    ].map((r) => r.classId),
  );
  const classes = [...classIds].map((id) => ({
    id,
    name: className(id),
    ...summarize(
      participants.filter((r) => r.classId === id),
      activities.filter((r) => r.classIds.includes(id)),
      expected.filter((r) => r.classId === id),
      grades.filter((r) => r.classId === id),
      completions.filter((r) => r.classId === id),
    ),
  }));
  const sopIds = new Set(
    [
      ...activities,
      ...participants,
      ...completions,
      ...expected,
      ...grades,
    ].map((r) => r.sopId),
  );
  const standards = [...sopIds].map((id) => ({
    id,
    name: optionStandards.get(id) || "实训标准未记录",
    ...summarize(
      participants.filter((r) => r.sopId === id),
      activities.filter((r) => r.sopId === id),
      expected.filter((r) => r.sopId === id),
      grades.filter((r) => r.sopId === id),
      completions.filter((r) => r.sopId === id),
    ),
  }));
  return {
    summary: summarize(participants, activities, expected, grades, completions),
    activities,
    participants,
    completions,
    expected,
    grades,
    classes,
    standards,
    series: activitySeries(
      participants,
      ["day", "week", "month"].includes(filters.grain) ? filters.grain : "day",
    ),
    missing,
    options: {
      classes: [...optionClasses]
        .filter(([id]) => id)
        .map(([id, name]) => ({ id, name })),
      standards: [...optionStandards]
        .filter(([id]) => id)
        .map(([id, name]) => ({ id, name })),
    },
    completed,
    excludedGrades: baseRows.filter((r) => !r.valid && inRange(r.resultAt))
      .length,
  };
}
export function dataStatisticsImprovementPath(filters, source) {
  const query = new URLSearchParams({ source, tab: "classes" });
  for (const key of ["classId", "sopId", "type", "from", "to"])
    if (filters[key]) query.set(key, filters[key]);
  return `/teacher/statistics?${query}`;
}
export function dataStatisticsCsv(rows, columns, filters, source, title) {
  return statisticsCsv(columns, rows, {
    导出内容: title,
    教师范围: filters.teacherId,
    日期范围: `${filters.from || "不限"}至${filters.to || "不限"}`,
    班级: filters.classId || "全部",
    实训标准: filters.sopId || "全部",
    实训类型:
      filters.type === "practice"
        ? "练习"
        : filters.type === "exam"
          ? "考试"
          : "全部",
    日期口径:
      "开展按实际开始、完成按完成时间、完成率按已结束安排结束时间、成绩按结果形成时间",
    数据来源: source === "cpd" ? "CPD工作数据" : "浏览器工作数据",
  });
}
