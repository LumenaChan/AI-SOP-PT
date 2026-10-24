import { historicalStandardBasis } from "./trainingStandardRules.js";
import {
  statisticsTime,
  trustedResultTime,
  classAttribution,
} from "./statisticsCommonRules.js";
import {
  strictMetricNumber,
  maxForStep,
  stepScore,
  gradeScoreValidity,
} from "./gradeScoreValidityRules.js";
export { strictMetricNumber } from "./gradeScoreValidityRules.js";
// B15/B16: a single, read-only cohort powers dashboard values, drill-downs and
// support-task eligibility. No calendar default, inferred score or fabricated row.
const array = (value) => (Array.isArray(value) ? value : []);
const ALL = new Set([undefined, null, "", "all", "全部"]);
const OPEN_TASK = new Set(["pending", "handling", "awaiting_confirmation"]);
const PENDING_REVIEW = new Set([
  "待复核",
  "待补充证据",
  "pending",
  "pending_review",
  "awaiting_confirmation",
]);
const PENDING_DISPOSITION = new Set([
  "pending",
  "retest_required",
  "awaiting_confirmation",
]);
const CLOSED_SESSION = new Set([
  "已完成",
  "待复位",
  "已复位",
  "已结束",
  "submitted",
  "completed",
]);
const OPEN_SESSION = new Set([
  "进行中",
  "已暂停",
  "故障",
  "待开始",
  "可入场",
  "准备中",
  "未入场",
  "等待入场",
  "待确认",
  "未开始",
  "active",
  "paused",
  "fault",
  "waiting",
  "ready",
]);
const INVALID_STATUS = new Set([
  "未参加",
  "缺考",
  "已取消",
  "已作废",
  "作废",
  "cancelled",
  "void",
  "absent",
]);
const EXCLUSIONS = {
  cancelled: "已取消或作废",
  unopened: "安排尚未开放或仍为草稿",
  absent: "未参加",
  unfinished: "尚未结束或提交",
  unofficial: "尚未形成正式成绩",
  review_pending: "成绩或步骤待复核",
  disposition_pending: "成绩处置未完成",
  safety_pending: "安全候选待确认",
  evidence_task_pending: "补证补测任务未完成",
  invalid_score: "分数为空、非数值或超出满分范围",
  invalid_maximum: "缺少有效满分依据",
};

const dateValue = statisticsTime;

export function teacherDashboardMetricFilters(filters = {}) {
  return {
    teacherId: filters.teacherId || "t1",
    classId: ALL.has(filters.classId) ? "" : String(filters.classId),
    courseId: ALL.has(filters.courseId) ? "" : String(filters.courseId),
    sopId: ALL.has(filters.sopId) ? "" : String(filters.sopId),
    standardBasisKey: filters.standardBasisKey || "",
    basisArrangementId: filters.basisArrangementId || "",
    basisSessionId: filters.basisSessionId || "",
    type: ALL.has(filters.type) ? "" : String(filters.type),
    studentId: ALL.has(filters.studentId) ? "" : String(filters.studentId),
    from: filters.from || "",
    to: filters.to || "",
  };
}

function frozenSop(data, arrangement, session) {
  return (
    historicalStandardBasis(arrangement, session).sop ||
    array(data.sops).find((sop) => sop.id === arrangement.sopId) ||
    {}
  );
}

function recordedSopVersion(arrangement, session) {
  // A current SOP is only a fallback for descriptive/maximum-score fields.
  // Its version cannot establish which standard a historical result used.
  const candidates = [
    session.evaluationSnapshot?.sopVersion,
    session.evaluationSnapshot?.sopSnapshot?.version,
    session.snapshot?.sopVersion,
    session.snapshot?.sopSnapshot?.version,
    session.sopVersion,
    session.version,
    arrangement.snapshot?.sopVersion,
    arrangement.snapshot?.sopSnapshot?.version,
    arrangement.sopVersion,
  ];
  const recorded = candidates.find(
    (value) =>
      (typeof value === "string" && value.trim()) ||
      (typeof value === "number" && Number.isFinite(value)),
  );
  return recorded === undefined ? "版本未记录" : String(recorded).trim();
}

const TEACHER_GRADE_ACTIONS = new Set([
  "review",
  "adjust",
  "disposition",
  "task_confirm",
]);
const LEGACY_TEACHER_GRADE_ACTIONS = new Set([
  "步骤复核",
  "人工调整步骤分",
  "成绩处置",
  "补证补测确认",
]);
function teacherGradeAudit(audit) {
  // Submission/end audits preserve grade history but do not confirm a student's
  // mistake or constitute a teacher review of every score in their snapshot.
  if (
    audit.source === "session_lifecycle" ||
    ["system", "系统"].includes(audit.actorId) ||
    ["系统", "system"].includes(audit.actor)
  )
    return false;
  return (
    TEACHER_GRADE_ACTIONS.has(audit.source) ||
    (!audit.source && LEGACY_TEACHER_GRADE_ACTIONS.has(audit.action))
  );
}
function teacherReviewHistory(history) {
  return (
    history.source !== "session_lifecycle" &&
    !["system", "系统"].includes(history.actorId) &&
    !["系统", "system"].includes(history.operator)
  );
}

function sourceLabels(session) {
  const labels = new Set();
  const steps = array(session.steps);
  if (
    array(session.reviewHistory).some(teacherReviewHistory) ||
    [
      ...array(session.gradeAuditHistory),
      ...array(session.scoreRevisions),
    ].some(teacherGradeAudit) ||
    steps.some((step) => step.reviewedAt || step.completionSource === "teacher")
  )
    labels.add("教师复核／人工确认");
  if (
    steps.some(
      (step) =>
        step.aiEvidenceState === "unknown" ||
        step.defaultPassReason ||
        /默认通过|未自动确认|按规则保分/.test(step.result || ""),
    )
  )
    labels.add("按规则保分（证据未自动确认）");
  if (
    steps.some(
      (step) =>
        step.aiEvidenceState === "confirmed" && step.resultSource === "real",
    )
  )
    labels.add("AI证据支持");
  if (
    steps.some(
      (step) =>
        step.aiEvidenceState === "confirmed" && step.resultSource !== "real",
    )
  )
    labels.add("AI演示证据");
  if (!labels.size) labels.add("历史依据未记录");
  return [...labels];
}

function metricRow(data, arrangement, session) {
  const student = array(data.students).find(
    (candidate) => candidate.id === session.studentId,
  ) || { id: session.studentId, name: "历史学生" };
  const sop = frozenSop(data, arrangement, session);
  const validity = gradeScoreValidity(session, sop);
  const { score, maxScore } = validity;
  const resultAt = trustedResultTime(arrangement, session);
  const attribution = classAttribution(data, arrangement, session);
  const reportPath = `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}/${encodeURIComponent(arrangement.id)}/students/${encodeURIComponent(session.studentId)}?sessionId=${encodeURIComponent(session.id)}`;
  const reasons = new Set();
  if (
    ["草稿", "待开始", "准备中", "未开放", "draft", "preparing"].includes(
      arrangement.status,
    )
  )
    reasons.add("unopened");
  if (
    [arrangement.status, session.status, session.resultStatus].some(
      (status) =>
        INVALID_STATUS.has(status) &&
        !["未参加", "缺考", "absent"].includes(status),
    )
  )
    reasons.add("cancelled");
  if (
    [session.status, session.resultStatus].some((status) =>
      ["未参加", "缺考", "absent"].includes(status),
    )
  )
    reasons.add("absent");
  // Active states override stale timestamps left by earlier edits/imports.
  const finished =
    !OPEN_SESSION.has(session.status) &&
    (CLOSED_SESSION.has(session.status) ||
      Boolean(session.endedAt || session.submittedAt || session.completedAt));
  if (!finished) reasons.add("unfinished");
  if (!["正式成绩", "已发布"].includes(session.resultStatus))
    reasons.add("unofficial");
  const steps = array(session.steps);
  if (
    PENDING_REVIEW.has(session.resultStatus) ||
    PENDING_REVIEW.has(session.reviewStatus) ||
    session.scoreEngine?.scoreStatus === "pending" ||
    steps.some((step) => PENDING_REVIEW.has(step.reviewStatus))
  )
    reasons.add("review_pending");
  if (
    PENDING_DISPOSITION.has(session.scoreDisposition?.status) ||
    steps.some((step) => PENDING_DISPOSITION.has(step.scoreDisposition?.status))
  )
    reasons.add("disposition_pending");
  if (
    array(session.runtime?.safetyCandidates).some((candidate) =>
      ["pending", "awaiting_confirmation"].includes(candidate.status),
    )
  )
    reasons.add("safety_pending");
  if (
    array(data.evidenceTasks).some(
      (task) =>
        task.arrangementId === arrangement.id &&
        task.sessionId === session.id &&
        OPEN_TASK.has(task.status),
    )
  )
    reasons.add("evidence_task_pending");
  if (validity.invalidMaximum) reasons.add("invalid_maximum");
  if (validity.invalidTotal || validity.invalidSteps.length)
    reasons.add("invalid_score");
  const labels = sourceLabels(session);
  const sopId =
    session.evaluationSnapshot?.sopId || sop.id || arrangement.sopId || "";
  const teacherId = arrangement.teacherId || session.teacherId || "t1";
  const basis = historicalStandardBasis(arrangement, session);
  return {
    id: `${arrangement.id}/${session.id}`,
    arrangementId: arrangement.id,
    sessionId: session.id,
    studentId: session.studentId,
    teacherId,
    teacherName:
      array(data.teachers).find((teacher) => teacher.id === teacherId)?.name ||
      "当前教师",
    classId: attribution.id,
    classSource: attribution.source,
    courseId:
      session.evaluationSnapshot?.courseId ||
      sop.courseId ||
      arrangement.courseId ||
      sop.course ||
      "",
    courseName:
      sop.course || sop.courseName || arrangement.courseName || "未设置课程",
    sopId,
    sopName: sop.name || arrangement.sopName || sopId,
    sopVersion: recordedSopVersion(arrangement, session), // Legacy provenance only.
    standardBasisKey: basis.key,
    standardBasisComplete: basis.complete,
    standardBasisLabel: basis.label,
    standardBasisReason: basis.reason,
    type: arrangement.type || "practice",
    arrangementName: arrangement.name || arrangement.id,
    studentName: student.name || "历史学生",
    studentNumber:
      student.no ||
      student.number ||
      student.studentNo ||
      student.studentNumber ||
      "",
    score,
    maxScore,
    normalizedScore:
      score !== null && maxScore > 0 ? (score / maxScore) * 100 : null,
    resultStatus: session.resultStatus || "过程记录",
    resultAt,
    timestamp: dateValue(resultAt),
    finished,
    published: session.resultStatus === "已发布",
    valid: reasons.size === 0,
    exclusionReasons: [...reasons],
    exclusionLabels: [...reasons].map((reason) => EXCLUSIONS[reason]),
    reportPath,
    source: labels.join(" · "),
    sourceLabels: labels,
    arr: arrangement,
    arrangement,
    session,
    student,
    sop,
  };
}

function matchesScope(row, filters) {
  if (row.teacherId !== filters.teacherId) return false;
  for (const key of [
    "classId",
    "courseId",
    "sopId",
    "standardBasisKey",
    "type",
    "studentId",
  ])
    if (filters[key] && row[key] !== filters[key]) return false;
  const from = dateValue(filters.from);
  const to = dateValue(filters.to, true);
  if (
    filters.from &&
    (from === null || row.timestamp === null || row.timestamp < from)
  )
    return false;
  if (
    filters.to &&
    (to === null || row.timestamp === null || row.timestamp > to)
  )
    return false;
  return true;
}

function latestFirst(a, b) {
  return (
    (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity) ||
    String(a.id).localeCompare(String(b.id))
  );
}

export function teacherDashboardScopeRows(data = {}, filters = {}) {
  const normalized = teacherDashboardMetricFilters(filters);
  const rows = array(data.arrangements)
    .flatMap((arrangement) =>
      array(arrangement.sessions).map((session) =>
        metricRow(data, arrangement, session),
      ),
    )
    .filter((row) => matchesScope(row, normalized));
  if (normalized.basisArrangementId || normalized.basisSessionId) {
    const anchor = rows.find(
      (row) =>
        row.arrangementId === normalized.basisArrangementId &&
        row.sessionId === normalized.basisSessionId,
    );
    if (!anchor) return [];
    return rows
      .filter((row) =>
        anchor.standardBasisKey
          ? row.sopId === anchor.sopId &&
            row.standardBasisKey === anchor.standardBasisKey
          : row.id === anchor.id,
      )
      .sort(latestFirst);
  }
  return rows.sort(latestFirst);
}

export function formalResultRows(data = {}, filters = {}) {
  return teacherDashboardScopeRows(data, filters).filter((row) => row.valid);
}

export function latestStudentResultRows(data = {}, filters = {}) {
  const seen = new Set();
  return formalResultRows(data, filters).filter((row) => {
    if (seen.has(row.studentId)) return false;
    seen.add(row.studentId);
    return true;
  });
}

export function confirmedDeductionSources(row, step) {
  const score = stepScore(step);
  const max = maxForStep(step, row.sop);
  if (
    score === null ||
    max === null ||
    score >= max ||
    score < 0 ||
    ["pending", "waiting", "active"].includes(step.state) ||
    /未进行|待开始|进行中/.test(step.result || "")
  )
    return [];
  const sources = [];
  const currentMatches = (value) => strictMetricNumber(value) === score;
  for (const history of array(row.session.reviewHistory)) {
    if (
      teacherReviewHistory(history) &&
      history.stepId === step.id &&
      currentMatches(history.after) &&
      (history.reason || history.evidence) &&
      (history.action || strictMetricNumber(history.before) !== null)
    )
      sources.push({
        kind: "teacher_review",
        label: "教师复核",
        id: history.id || history.operationId || "",
        reason: history.reason || history.evidence,
        at: history.at || history.time || "",
      });
  }
  for (const audit of [
    ...array(row.session.gradeAuditHistory),
    ...array(row.session.scoreRevisions),
  ]) {
    const after = array(audit.after?.steps).find((item) => item.id === step.id);
    if (
      teacherGradeAudit(audit) &&
      after &&
      currentMatches(after.score) &&
      audit.reason &&
      (array(audit.stepIds).includes(step.id) || audit.stepId === step.id)
    )
      sources.push({
        kind: "grade_audit",
        label: "成绩审计",
        id: audit.id || audit.operationId || "",
        reason: audit.reason,
        at: audit.at || audit.time || "",
      });
  }
  for (const application of array(row.session.runtime?.aiScoringApplications)) {
    if (
      application.stepId === step.id &&
      ["applied", "corrected"].includes(application.status) &&
      strictMetricNumber(application.appliedDeduction) > 0
    )
      sources.push({
        kind: "confirmed_scoring_rule",
        label: "已生效评分规则",
        id: application.id || "",
        reason:
          application.ruleName || application.ruleId || "教师评分规则已生效",
        at: application.createdAt || "",
      });
  }
  // Legacy records may explicitly state a deducted result; an unexplained lower
  // score or an unavailable video alone is never a confirmed student mistake.
  const unknown =
    step.aiEvidenceState === "unknown" ||
    /缺证|证据不足|默认通过|未自动确认|无法判定|遮挡/.test(step.result || "");
  if (
    !unknown &&
    (/扣分|不通过|操作错误|确认错误|触发教师评分规则/.test(step.result || "") ||
      step.errorConfirmed === true ||
      step.confirmedError === true)
  )
    sources.push({
      kind: "recorded_error",
      label: "已记录扣分／错误",
      id: step.ruleId || "",
      reason: step.errorReason || step.observation || step.result,
      at: step.reviewedAt || "",
    });
  return sources.filter(
    (source, index, all) =>
      all.findIndex(
        (other) =>
          other.kind === source.kind &&
          other.id === source.id &&
          other.reason === source.reason,
      ) === index,
  );
}

function errorGroups(rows) {
  const groups = new Map();
  for (const row of rows)
    for (const step of array(row.session.steps)) {
      const sources = confirmedDeductionSources(row, step);
      if (!sources.length) continue;
      const key = JSON.stringify([
        row.sopId,
        row.standardBasisKey || row.id,
        step.id,
      ]);
      if (!groups.has(key))
        groups.set(key, {
          id: `${row.sopId}/${row.arrangementId}/${row.sessionId}/${step.id}`,
          sopId: row.sopId,
          sopName: row.sopName,
          standardBasisLabel: row.standardBasisLabel,
          basisArrangementId: row.arrangementId,
          basisSessionId: row.sessionId,
          stepId: step.id,
          stepName: step.name || step.id,
          count: 0,
          rows: [],
          studentIds: [],
        });
      const group = groups.get(key);
      group.count += 1;
      group.rows.push({
        ...row,
        stepId: step.id,
        stepName: step.name || step.id,
        stepScore: stepScore(step),
        stepMaxScore: maxForStep(step, row.sop),
        deduction: maxForStep(step, row.sop) - stepScore(step),
        sources,
        reportPath: `${row.reportPath}&stepId=${encodeURIComponent(step.id)}`,
      });
      if (!group.studentIds.includes(row.studentId))
        group.studentIds.push(row.studentId);
    }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      studentCount: group.studentIds.length,
      students: group.studentIds,
    }))
    .sort(
      (a, b) => b.count - a.count || String(a.id).localeCompare(String(b.id)),
    );
}

function exclusionSummary(rows) {
  return Object.entries(EXCLUSIONS)
    .map(([id, label]) => ({
      id,
      label,
      count: rows.filter((row) => row.exclusionReasons.includes(id)).length,
    }))
    .filter((item) => item.count);
}

function optionsFor(data, rows) {
  const unique = (items) =>
    [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "zh-CN"),
    );
  return {
    classes: unique(
      rows
        .filter((row) => row.classId)
        .map((row) => ({
          id: row.classId,
          name:
            array(data.classes).find((item) => item.id === row.classId)?.name ||
            row.classId,
        })),
    ),
    courses: unique(
      rows
        .filter((row) => row.courseId)
        .map((row) => ({ id: row.courseId, name: row.courseName })),
    ),
    sops: unique(
      rows
        .filter((row) => row.sopId)
        .map((row) => ({ id: row.sopId, name: row.sopName })),
    ),
    types: [
      { id: "practice", name: "练习" },
      { id: "exam", name: "考试" },
    ],
  };
}

export function teacherDashboardMetrics(data = {}, filters = {}) {
  const normalized = teacherDashboardMetricFilters(filters);
  const rows = teacherDashboardScopeRows(data, normalized);
  const valid = rows.filter((row) => row.valid);
  const excluded = rows.filter((row) => !row.valid);
  const published = valid.filter((row) => row.type === "exam" && row.published);
  const ready = valid.filter(
    (row) =>
      row.type === "exam" &&
      !row.published &&
      row.arrangement.status === "待发布",
  );
  const pendingKeys = new Set([
    "review_pending",
    "disposition_pending",
    "safety_pending",
    "evidence_task_pending",
  ]);
  const pending = rows.filter(
    (row) =>
      row.type === "exam" &&
      row.arrangement.status === "待发布" &&
      row.finished &&
      !row.exclusionReasons.some((reason) =>
        ["absent", "cancelled", "invalid_score", "invalid_maximum"].includes(
          reason,
        ),
      ) &&
      row.exclusionReasons.some((reason) => pendingKeys.has(reason)),
  );
  const latest = [];
  const students = new Set();
  for (const row of valid)
    if (!students.has(row.studentId)) {
      students.add(row.studentId);
      latest.push(row);
    }
  const lowStudents = latest
    .filter((row) => row.normalizedScore < 80)
    .map((row) => ({
      ...row,
      threshold: 80,
      reason: `本范围最近一次有效正式结果为${Number(row.normalizedScore.toFixed(1))}分（百分制），低于80分`,
    }));
  const denominator = published.length + ready.length;
  return {
    scope: {
      filters: normalized,
      label:
        normalized.from || normalized.to
          ? "学生表现 · 所选演示日期范围"
          : "学生表现 · 全部演示记录",
      sessionIds: rows.map((row) => row.sessionId),
      sessionKeys: rows.map((row) => row.id),
      options: optionsFor(
        data,
        teacherDashboardScopeRows(data, { teacherId: normalized.teacherId }),
      ),
    },
    rows,
    formalRows: valid,
    latestRows: latest,
    average: {
      value: valid.length
        ? valid.reduce((sum, row) => sum + row.normalizedScore, 0) /
          valid.length
        : null,
      count: valid.length,
      rows: valid,
      excludedCount: excluded.length,
      excluded,
      exclusions: exclusionSummary(excluded),
    },
    publishing: {
      value: denominator ? (published.length / denominator) * 100 : null,
      numerator: published.length,
      denominator,
      published,
      ready,
      pending,
      publishedCount: published.length,
      readyCount: ready.length,
      pendingCount: pending.length,
      excluded: rows
        .filter(
          (row) =>
            row.type === "exam" &&
            ![...published, ...ready, ...pending].includes(row),
        )
        .map((row) => {
          const stage =
            !row.published && row.arrangement.status !== "待发布"
              ? ["考试尚未进入统一发布阶段"]
              : [];
          return {
            ...row,
            publishingExclusionLabels: [...row.exclusionLabels, ...stage],
          };
        }),
    },
    lowStudents,
    lowStudentCount: lowStudents.length,
    threshold: 80,
    errors: errorGroups(valid),
  };
}
