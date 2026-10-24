import {
  teacherDashboardMetrics,
  teacherDashboardScopeRows,
  confirmedDeductionSources,
} from "./teacherDashboardMetrics.js";
import { stepScore, maxForStep } from "./gradeScoreValidityRules.js";
import { teacherDashboardTasks } from "./teacherDashboardTasks.js";
import { normalizeSessionClosure } from "./sessionClosureRules.js";
import {
  arrangementAssignments,
  sessionReportPath,
} from "./arrangementPreparationRules.js";
import { statisticsTime } from "./statisticsCommonRules.js";
export const STATISTICS_TABS = {
  classes: "班级成绩",
  progress: "学生进步",
  steps: "步骤分析",
  followup: "教学跟进",
};
export const HISTORY_KINDS = {
  all: "全部",
  help: "学生求助",
  evidence: "补证/线下补测",
  support: "学生辅导",
};
export const HISTORY_STATUS = {
  pending: "待办理",
  handling: "办理中",
  coaching: "辅导中",
  awaiting_confirmation: "待教师确认",
  awaiting_review: "待复查",
  completed: "已完成",
  cancelled: "已取消/撤销",
  closed: "随会话关闭",
};
const arr = (v) => (Array.isArray(v) ? v : []);
export const statisticsKey = (r) => `${r.arrangementId}/${r.sessionId}`;
export function validateStatisticsFilters(f) {
  for (const k of ["from", "to"])
    if (
      f[k] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(f[k]) ||
        statisticsTime(f[k]) === null ||
        new Date(`${f[k]}T00:00:00Z`).toISOString().slice(0, 10) !== f[k])
    )
      return "请选择有效日期。";
  if (f.from && f.to && f.from > f.to) return "开始日期不能晚于结束日期。";
  return "";
}
export function comparableStatistics(filters, rows) {
  if (!filters.sopId || !["practice", "exam"].includes(filters.type))
    return false;
  if (!rows) return true;
  return (
    rows.length > 0 &&
    rows.every((r) => r.standardBasisComplete) &&
    new Set(rows.map((r) => r.standardBasisKey)).size === 1
  );
}
export function teachingStatistics(data, filters = {}) {
  const scoped = { ...filters, teacherId: "t1" };
  delete scoped.sopVersion;
  const error = validateStatisticsFilters(scoped);
  if (error) throw new Error(error);
  const metrics = teacherDashboardMetrics(data, scoped);
  const base = teacherDashboardScopeRows(data, { ...scoped, from: "", to: "" });
  const classes = new Map();
  for (const r of metrics.rows) {
    const key = r.classId || "unknown";
    if (!classes.has(key))
      classes.set(key, {
        id: key,
        name:
          (data.classes || []).find((c) => c.id === r.classId)?.name ||
          r.classId ||
          "班级未记录",
        rows: [],
        sources: new Set(),
      });
    classes.get(key).rows.push(r);
    classes.get(key).sources.add(r.classSource);
  }
  const summarize = (rows) => {
    const valid = rows.filter((r) => r.valid);
    return {
      valid,
      students: new Set(valid.map((r) => r.studentId)).size,
      count: valid.length,
      average: valid.length
        ? valid.reduce((t, r) => t + r.normalizedScore, 0) / valid.length
        : null,
      pass: valid.filter((r) => r.normalizedScore >= 60).length,
      excluded: rows.length - valid.length,
    };
  };
  const summary = summarize(metrics.rows);
  const distribution = [
    { label: "不足60分", min: 0, max: 60 },
    { label: "60至不足80分", min: 60, max: 80 },
    { label: "80至不足90分", min: 80, max: 90 },
    { label: "90至100分", min: 90, max: 101 },
  ].map((g) => ({
    ...g,
    rows: summary.valid.filter(
      (r) => r.normalizedScore >= g.min && r.normalizedScore < g.max,
    ),
  }));
  const history = [];
  for (const row of base) {
    const s = normalizeSessionClosure(row.session, row.arrangement);
    for (const t of s.helpRequests || [])
      history.push({
        ...row,
        id: `help:${row.id}:${t.id}`,
        kind: "help",
        taskId: t.id,
        createdAt: t.createdAt,
        status: t.status,
        instruction: t.note || t.reasonLabel,
        conclusion: t.receipt || t.closeReason || "",
        updatedAt: t.closedAt || t.acceptedAt || t.createdAt,
        path: `/teacher/${row.type === "exam" ? "exams" : "practices"}/${row.arrangementId}/stations/${row.workstationId || row.session.workstationId}?sessionId=${encodeURIComponent(row.sessionId)}#help-${encodeURIComponent(t.id)}`,
      });
  }
  for (const kind of ["evidence", "support"])
    for (const t of arr(
      data[kind === "support" ? "supportTasks" : "evidenceTasks"],
    )) {
      if (t.teacherId !== "t1") continue;
      const row = base.find(
        (r) =>
          r.arrangementId === t.arrangementId &&
          r.sessionId === t.sessionId &&
          r.studentId === t.studentId,
      );
      if (!row) continue;
      history.push({
        ...row,
        id: `${kind}:${t.id}`,
        kind,
        taskId: t.id,
        createdAt: t.createdAt,
        status: t.status,
        instruction: t.studentInstruction,
        conclusion: t.studentConclusion || t.cancelReason || "",
        updatedAt: t.updatedAt,
        path: `/teacher/${kind === "support" ? "support" : "evidence"}-tasks/${encodeURIComponent(t.id)}`,
      });
    }
  const matchesDate = (r) => {
    const n = statisticsTime(r.createdAt);
    return (
      (!scoped.from || (n !== null && n >= statisticsTime(scoped.from))) &&
      (!scoped.to || (n !== null && n <= statisticsTime(scoped.to, true)))
    );
  };
  const historyRows = history
    .filter(matchesDate)
    .sort(
      (a, b) =>
        (statisticsTime(b.createdAt) ?? -Infinity) -
          (statisticsTime(a.createdAt) ?? -Infinity) ||
        a.id.localeCompare(b.id),
    );
  const current = teacherDashboardTasks(data)
    .filter(
      (t) =>
        ["review", "step", "publish"].includes(t.type) &&
        base.some(
          (r) =>
            r.arrangementId === t.sourceIds.arrangementId &&
            (!t.sourceIds.sessionId || r.sessionId === t.sourceIds.sessionId),
        ),
    )
    .map((t) => ({
      ...t,
      kind: t.type,
      studentName:
        t.type === "publish"
          ? ""
          : base.find(
              (r) =>
                r.arrangementId === t.sourceIds.arrangementId &&
                r.sessionId === t.sourceIds.sessionId,
            )?.studentName || "学生信息缺失",
      arrangementName:
        data.arrangements.find((a) => a.id === t.sourceIds.arrangementId)
          ?.name || "",
      arrangementId: t.sourceIds.arrangementId,
      sessionId: t.sourceIds.sessionId || "",
      stepId: t.sourceIds.stepId || "",
      instruction: t.detail,
    }));
  return {
    metrics,
    summary,
    distribution,
    base,
    classes: [...classes.values()]
      .map((c) => ({
        ...c,
        ...summarize(c.rows),
        source: [...c.sources].join("；"),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    history: historyRows,
    unknownTaskDates: history.filter(
      (r) => statisticsTime(r.createdAt) === null,
    ).length,
    current,
    unknownDates: base.filter((r) => r.timestamp === null).length,
    comparable: comparableStatistics(scoped, summary.valid),
  };
}
export function statisticsProgress(model, studentId, filters) {
  const rows = model.metrics.rows.filter((r) => r.studentId === studentId);
  const valid = rows.filter((r) => r.valid);
  const timed = valid
    .filter((r) => r.timestamp !== null)
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const ambiguous =
    new Set(timed.map((r) => r.timestamp)).size !== timed.length;
  const ready =
    comparableStatistics(filters, valid) && timed.length >= 2 && !ambiguous;
  return {
    rows,
    valid,
    timed,
    ready,
    first: ready ? timed[0] : null,
    last: ready ? timed.at(-1) : null,
    delta: ready
      ? timed.at(-1).normalizedScore - timed[0].normalizedScore
      : null,
    reason: !comparableStatistics(filters, valid)
      ? "请选择同一实训标准和结果类型；比较结果需有完整且一致的历史评分依据。"
      : ambiguous
        ? "多次结果时间相同，无法可靠确定先后。"
        : timed.length < 2
          ? "尚不足两次有可信时间的有效结果。"
          : "",
  };
}
export function statisticsSteps(model, filters) {
  if (!comparableStatistics(filters, model.summary.valid)) return [];
  const groups = new Map();
  for (const r of model.summary.valid)
    for (const step of r.session.steps || []) {
      if (
        ["pending", "waiting", "active"].includes(step.state) ||
        /未进行|待开始|进行中/.test(step.result || "")
      )
        continue;
      const score = stepScore(step),
        max = maxForStep(step, r.sop);
      if (score === null || max === null || max <= 0) continue;
      if (!groups.has(step.id))
        groups.set(step.id, {
          id: step.id,
          name: step.name || step.id,
          rows: [],
          errors: [],
        });
      const g = groups.get(step.id),
        sources = confirmedDeductionSources(r, step);
      const row = {
        ...r,
        stepId: step.id,
        stepName: step.name,
        stepScore: score,
        stepMaxScore: max,
        sources,
        reportPath: `${r.reportPath}&stepId=${encodeURIComponent(step.id)}`,
      };
      g.rows.push(row);
      if (sources.length) g.errors.push(row);
    }
  return [...groups.values()].map((g) => ({
    ...g,
    average: g.rows.reduce((a, r) => a + r.stepScore, 0) / g.rows.length,
    rate:
      g.rows.reduce((a, r) => a + (r.stepScore / r.stepMaxScore) * 100, 0) /
      g.rows.length,
    max: g.rows[0]?.stepMaxScore,
    count: g.rows.length,
    errorCount: g.errors.length,
    students: new Set(g.errors.map((r) => r.studentId)).size,
  }));
}
// Groups are derived from actual historical scoring content, not version labels.
export function statisticsStandardOptions(model) {
  const groups = new Map();
  for (const row of model.metrics.rows) {
    const id = JSON.stringify([
      row.sopId,
      row.standardBasisKey || row.id,
      row.type,
    ]);
    if (!groups.has(id))
      groups.set(id, {
        id,
        sopId: row.sopId,
        sopName: row.sopName,
        type: row.type,
        standardBasisKey: row.standardBasisKey,
        standardBasisLabel: row.standardBasisLabel,
        basisArrangementId: row.arrangementId,
        basisSessionId: row.sessionId,
        rows: [],
      });
    groups.get(id).rows.push(row);
  }
  return [...groups.values()].map((group) => {
    const valid = group.rows.filter((row) => row.valid);
    const comparable = comparableStatistics(group, valid);
    const stepCount = statisticsSteps({ summary: { valid } }, group).length;
    return {
      ...group,
      count: valid.length,
      total: group.rows.length,
      stepCount,
      ready: comparable && stepCount > 0,
      reason: !group.standardBasisKey
        ? "历史标准信息不完整，仅查看原始记录"
        : !valid.length
          ? "尚无有效正式结果"
          : !stepCount
            ? "尚无已完成且分数有效的步骤"
            : "按当时标准快照分析，相同评分口径合并统计",
    };
  });
}
export function taskStatistics(rows) {
  const open = rows.filter((r) =>
    [
      "pending",
      "handling",
      "coaching",
      "awaiting_review",
      "awaiting_confirmation",
    ].includes(r.status),
  );
  const completed = rows.filter((r) => r.status === "completed");
  const cancelled = rows.filter((r) => r.status === "cancelled");
  const closed = rows.filter((r) => r.status === "closed");
  const unknown = rows.filter(
    (r) => ![...open, ...completed, ...cancelled, ...closed].includes(r),
  );
  const denominator = open.length + completed.length;
  return {
    total: rows.length,
    open,
    completed,
    cancelled,
    closed,
    unknown,
    denominator,
    rate: denominator ? (completed.length / denominator) * 100 : null,
  };
}
export { arrangementAttendance as statisticsAttendance } from "./arrangementAttendanceRules.js";
