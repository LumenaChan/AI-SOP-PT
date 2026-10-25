import { displayBusinessText } from "./businessTextRules.js";
import {
  calculateScoreEngine,
  requiresMandatoryReview,
} from "./domainRules.js";

const TERMINAL_TASKS = new Set(["completed", "cancelled", "closed", "invalid"]);
const REVIEW_PENDING = new Set(["待复核", "待补充证据"]);
const DISPOSITION_PENDING = new Set(["pending", "retest_required"]);
const copy = (value) =>
  value == null ? value : JSON.parse(JSON.stringify(value));
const scoreOf = (step) =>
  Number(step.effectiveScore ?? step.score ?? step.maxScore ?? 0);

function gradeContent(session = {}) {
  return {
    steps: (session.steps || []).map((s) => ({ id: s.id, score: scoreOf(s) })),
    score: Number(
      session.score ??
        calculateScoreEngine({
          steps: session.steps || [],
          manualAdjustments: session.manualAdjustments || [],
        }).effectiveScore,
    ),
    manualAdjustments: (session.manualAdjustments || []).map((item) => ({
      id: item.id || "",
      value: Number(item.value || 0),
    })),
  };
}
function sameGrade(a, b) {
  return JSON.stringify(gradeContent(a)) === JSON.stringify(gradeContent(b));
}
function fingerprint(value) {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
/** Changes to review/disposition alone must also invalidate an old open form. */
export function gradeStateToken(session = {}) {
  return `grade:${fingerprint({ grade: gradeContent(session), storedScore: session.score, storedSteps: (session.steps || []).map((s) => [s.score, s.effectiveScore, s.maxScore]), lastOperation: session.lastGradeOperationId || "", resultStatus: session.resultStatus || "", operations: (session.gradeAuditHistory || []).map((r) => r.operationId || r.id), steps: (session.steps || []).map((s) => ({ id: s.id, reviewStatus: s.reviewStatus || "", reviewedAt: s.reviewedAt || "", result: s.result || "", scoreDisposition: s.scoreDisposition || null })) })}`;
}

function assertOwner(arrangement, session, actorId = "t1") {
  if (!arrangement || !session) throw new Error("对应评价记录不存在或已失效。");
  if ((arrangement.teacherId || "t1") !== actorId)
    throw new Error("只能由本次安排的负责教师办理成绩。");
}
export function assertGradeMutable(arrangement, session, actorId = "t1") {
  assertOwner(arrangement, session, actorId);
  if (
    ["草稿", "已取消"].includes(arrangement.status) ||
    ["已取消", "未参加"].includes(session.resultStatus) ||
    session.status === "已取消"
  )
    throw new Error("该记录没有可修改的有效成绩。");
}
function preserveOriginalSteps(previous, candidate, at) {
  const originals = new Map((previous.steps || []).map((s) => [s.id, s]));
  return (candidate.steps || []).map((s) => {
    const before = originals.get(s.id);
    if (!before) return s;
    return {
      ...s,
      ...(before.originalScoreRecord
        ? { originalScoreRecord: copy(before.originalScoreRecord) }
        : {}),
      ...(Object.hasOwn(before, "rawScore")
        ? { rawScore: before.rawScore }
        : {}),
    };
  });
}
/** Submit/end overwrite the current result. Existing legacy history is read-only. */
export function applyGradeLifecycle(
  previousSession,
  candidateSession,
  context = {},
) {
  // Old serialized fields remain untouched for backup compatibility; candidates
  // cannot create or advance them. New results have no grade-version fields.
  candidateSession = { ...candidateSession };
  for (const key of [
    "scoreVersion",
    "gradeRevisionSeq",
    "scoreRevisions",
    "originalScoreRecord",
  ]) {
    if (Object.hasOwn(previousSession, key))
      candidateSession[key] = copy(previousSession[key]);
    else delete candidateSession[key];
  }
  const at = context.at || new Date().toISOString();
  const changed = !sameGrade(previousSession, candidateSession);
  const operationId =
    context.operationId || `lifecycle-${context.action || "submission"}-${at}`;
  const prior = (previousSession.gradeAuditHistory || []).find(
    (r) => r.operationId === operationId,
  );
  if (prior)
    return {
      ...candidateSession,
      steps: preserveOriginalSteps(previousSession, candidateSession, at),
      gradeAuditHistory: copy(previousSession.gradeAuditHistory || []),
    };
  const audit = {
    id: context.makeId?.("grade-audit") || `grade-audit-${operationId}`,
    operationId,
    action: context.action || "会话提交",
    source: "session_lifecycle",
    actorId: context.actorId || "system",
    actor: context.actorName || context.actorId || "系统",
    at,
    time: at,
    reason: context.reason || "按当前步骤事实生成结果",
    before: gradeContent(previousSession),
    after: gradeContent(candidateSession),
    scoreChanged: changed,
    evidenceRefs: [],
  };
  return {
    ...candidateSession,
    steps: preserveOriginalSteps(previousSession, candidateSession, at),
    gradeAuditHistory: [...(previousSession.gradeAuditHistory || []), audit],
  };
}
function scoreInput(value, max) {
  if (!Number.isFinite(max) || max < 0)
    throw new Error("步骤满分无效，请核对本次标准快照。");
  if (
    value === undefined ||
    value === null ||
    !["number", "string"].includes(typeof value) ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0 ||
    Number(value) > max
  )
    throw new Error(`步骤得分必须在 0–${max} 分之间。`);
  return Number(value);
}
function refsInput(input, step) {
  const values = input.evidenceRefs ?? step.evidenceSources ?? [];
  if (!Array.isArray(values)) throw new Error("证据引用必须是列表。");
  return values.map((ref) => {
    if (typeof ref === "string" && ref.trim())
      return { kind: "recorded_reference", label: ref.trim() };
    if (ref && typeof ref === "object" && !Array.isArray(ref)) {
      const plain = copy(ref);
      if (!Object.keys(plain).length) throw new Error("证据引用不能为空对象。");
      return plain;
    }
    throw new Error("证据引用无效，请使用可定位记录或填写教师现场核验依据。");
  });
}
function taskForStep(data, arrangement, session, step, input) {
  const tasks = (data.evidenceTasks || []).filter(
    (task) =>
      task.arrangementId === arrangement.id &&
      task.sessionId === session.id &&
      task.stepId === step.id &&
      !TERMINAL_TASKS.has(task.status),
  );
  if (input.action === "task_confirm") {
    const task = tasks.find((t) => t.id === input.taskId);
    if (!task || task.status !== "awaiting_confirmation")
      throw new Error("补证或补测任务尚未登记完整依据，不能直接确认完成。");
    if (tasks.some((t) => t.id !== task.id))
      throw new Error("该步骤仍有其他未完成办理任务，请先核对任务。");
    return task;
  }
  if (tasks.length)
    throw new Error(
      "该步骤有未完成的补证或补测任务，请从对应任务办理，不能直接改分绕过。",
    );
  return null;
}
function actionName(input) {
  return (
    {
      review: "步骤复核",
      adjust: "人工调整步骤分",
      disposition: "成绩处置",
      task_confirm: "补证补测确认",
    }[input.action] || "成绩修订"
  );
}
function buildPatch(step, input, at, actorName, task) {
  const reason = String(input.reason ?? input.note ?? "").trim();
  let score, reviewStatus, result, disposition;
  if (input.action === "review") {
    if (!["pass", "fail"].includes(input.conclusion))
      throw new Error("请选择确认通过或确认未完成；补充证据请发起办理任务。");
    if (input.archiveEvidence === false)
      throw new Error("请确认本次复核采用的证据或现场核验依据后再保存。");
    score = scoreInput(
      input.score ??
        (input.conclusion === "pass" ? step.maxScore : scoreOf(step)),
      Number(step.maxScore || 0),
    );
    reviewStatus = input.conclusion === "pass" ? "复核通过" : "已确认扣分";
    result = input.conclusion === "pass" ? "人工确认通过" : "人工确认未完成";
    if (DISPOSITION_PENDING.has(step.scoreDisposition?.status))
      disposition = {
        ...step.scoreDisposition,
        status: "teacher_resolved",
        reason,
        resolvedBy: actorName,
        resolvedAt: at,
      };
  } else if (input.action === "adjust") {
    score = scoreInput(input.score, Number(step.maxScore || 0));
    reviewStatus = "人工调整";
    result = score === Number(step.maxScore || 0) ? "人工确认通过" : "人工调整";
  } else if (
    input.action === "disposition" ||
    input.action === "task_confirm"
  ) {
    const allowed =
      input.action === "task_confirm"
        ? ["teacher_resolved", "retest_resolved", "policy_protected"]
        : ["teacher_resolved", "policy_protected"];
    if (!allowed.includes(input.status))
      throw new Error("补测完成必须通过关联任务确认，或请选择有效的成绩处置。");
    score = scoreInput(input.score, Number(step.maxScore || 0));
    reviewStatus = "复核通过";
    result =
      input.action === "task_confirm"
        ? input.status === "retest_resolved"
          ? "教师补测已确认"
          : "教师补证已确认"
        : "教师已处置";
    disposition = {
      ...step.scoreDisposition,
      status: input.status,
      reason,
      resolvedBy: actorName,
      resolvedAt: at,
      ...(task ? { taskId: task.id } : {}),
    };
  } else throw new Error("未知的成绩修订入口。");
  return {
    ...step,
    score,
    effectiveScore: score,
    result,
    reviewStatus,
    reviewNote: reason,
    reviewedAt: at,
    reviewer: actorName,
    evidenceArchived:
      input.action === "review"
        ? input.archiveEvidence !== false
        : step.evidenceArchived,
    ...(disposition ? { scoreDisposition: disposition } : {}),
  };
}
function refreshResult(arrangement, session, data, taskId) {
  const scoreEngine = calculateScoreEngine({
    steps: session.steps || [],
    manualAdjustments: session.manualAdjustments || [],
  });
  const pending =
    scoreEngine.scoreStatus === "pending" ||
    (session.steps || []).some(
      (s) => REVIEW_PENDING.has(s.reviewStatus) || requiresMandatoryReview(s),
    ) ||
    (session.runtime?.safetyCandidates || []).some(
      (c) => c.status === "pending",
    ) ||
    (data.evidenceTasks || []).some(
      (t) =>
        t.sessionId === session.id &&
        t.arrangementId === arrangement.id &&
        t.id !== taskId &&
        !TERMINAL_TASKS.has(t.status),
    );
  const ended =
    ["已完成", "待复位", "已复位"].includes(session.status) ||
    ["已结束", "待发布", "已归档"].includes(arrangement.status);
  return {
    ...session,
    scoreEngine,
    score: scoreEngine.effectiveScore,
    resultStatus:
      session.resultStatus === "已发布" || arrangement.status === "已发布"
        ? "已发布"
        : pending
          ? "待复核"
          : ended
            ? "正式成绩"
            : "过程记录",
  };
}
/** One transaction for review, adjustment, disposition and a confirmed B11 task. */
export function reviseSessionGrade(data, input) {
  const arrangement = (data.arrangements || []).find(
    (a) => a.id === input.arrangementId,
  );
  const session = arrangement?.sessions?.find((s) => s.id === input.sessionId);
  const actorId = input.actorId || "t1",
    actorName = input.actorName || "王老师";
  assertOwner(arrangement, session, actorId);
  const operationId = String(input.operationId || "").trim();
  if (!operationId) throw new Error("缺少本次提交标识，请重新打开办理窗口。");
  const reason = String(input.reason ?? input.note ?? "").trim();
  if (!reason) throw new Error("修改理由或教师核验依据不能为空。");
  const entries = Array.isArray(input.patches)
    ? input.patches
    : [
        {
          stepId: input.stepId,
          ...(Object.hasOwn(input, "score") ? { score: input.score } : {}),
        },
      ];
  if (
    !entries.length ||
    new Set(entries.map((p) => p.stepId)).size !== entries.length
  )
    throw new Error("请选择不同的有效步骤，不能重复修订同一步骤。");
  if (entries.length > 1 && input.action !== "adjust")
    throw new Error("此办理入口每次只能确认一个步骤。");
  const signature = fingerprint({
    action: input.action,
    entries,
    conclusion: input.conclusion,
    status: input.status,
    reason,
    evidenceRefs: input.evidenceRefs || [],
    taskId: input.taskId || "",
    archiveEvidence: input.archiveEvidence,
  });
  const receipt = (session.gradeOperationReceipts || []).find(
    (r) => r.operationId === operationId,
  );
  if (receipt) {
    if (receipt.signature !== signature)
      throw new Error("同一提交标识的内容已经变化，请重新打开窗口。");
    return {
      data,
      result: {
        session,
        step: session.steps.find(
          (s) => s.id === input.stepId || s.id === entries[0].stepId,
        ),
        changed: false,
        audit: (session.gradeAuditHistory || []).find(
          (r) => r.operationId === operationId,
        ),
        idempotent: true,
      },
    };
  }
  assertGradeMutable(arrangement, session, actorId);
  if (!input.expectedState || input.expectedState !== gradeStateToken(session))
    throw new Error("成绩或办理状态已变化，请刷新后重新确认，保留填写的说明。");
  const at = input.at || new Date().toISOString(),
    makeId = input.makeId || ((prefix) => `${prefix}-${operationId}`);
  let steps = [...(session.steps || [])];
  const refs = [];
  for (const entry of entries) {
    const index = steps.findIndex((s) => s.id === entry.stepId);
    if (index < 0) throw new Error("要修订的步骤不存在或已失效。");
    const step = steps[index],
      specific = { ...input, ...entry, reason };
    const task = taskForStep(data, arrangement, session, step, specific);
    const evidenceRefs = refsInput(input, step);
    refs.push(...evidenceRefs);
    steps[index] = buildPatch(step, specific, at, actorName, task);
  }
  let nextSession = refreshResult(
    arrangement,
    { ...session, steps },
    data,
    input.taskId,
  );
  const changed = !sameGrade(session, nextSession);
  const audit = {
    id: makeId("grade-audit"),
    operationId,
    action: actionName(input),
    source: input.action,
    actorId,
    actor: actorName,
    operator: actorName,
    at,
    time: at,
    reason,
    evidenceRefs: copy(refs),
    evidenceBasis: refs.length ? "recorded_references" : "teacher_statement",
    taskId: input.taskId || "",
    stepIds: entries.map((p) => p.stepId),
    before: gradeContent(session),
    after: gradeContent(nextSession),
    scoreChanged: changed,
  };
  nextSession = {
    ...nextSession,
    steps: preserveOriginalSteps(session, nextSession, at),
    lastGradeOperationId: operationId,
    gradeAuditHistory: [...(session.gradeAuditHistory || []), audit],
    gradeOperationReceipts: [
      ...(session.gradeOperationReceipts || []),
      { operationId, signature, at },
    ],
    reviewHistory: [
      ...(session.reviewHistory || []),
      ...entries.map((entry) => ({
        time: at,
        operator: actorName,
        actorId,
        action: actionName(input),
        stepId: entry.stepId,
        before: scoreOf(session.steps.find((s) => s.id === entry.stepId)),
        after: scoreOf(nextSession.steps.find((s) => s.id === entry.stepId)),
        reason,
        evidence: copy(refs),
        taskId: input.taskId || "",
        operationId,
        scoreChanged: changed,
      })),
    ],
  };
  const nextData = {
    ...data,
    arrangements: (data.arrangements || []).map((a) =>
      a.id === arrangement.id
        ? {
            ...a,
            sessions: a.sessions.map((s) =>
              s.id === session.id ? nextSession : s,
            ),
            updatedAt: at,
          }
        : a,
    ),
    auditLogs: [
      {
        id: makeId("audit"),
        time: at,
        createdAt: at,
        actor: actorName,
        actorId,
        role: "教师",
        action: actionName(input),
        target: `${arrangement.name || arrangement.id} / ${session.id} / ${entries.map((e) => e.stepId).join(", ")}`,
        result: "成功",
        detail: reason,
        operationId,
        scoreChanged: changed,
        taskId: input.taskId || "",
      },
      ...(data.auditLogs || []),
    ],
  };
  return {
    data: nextData,
    result: {
      session: nextSession,
      step: nextSession.steps.find(
        (s) => s.id === input.stepId || s.id === entries[0].stepId,
      ),
      changed,
      audit,
      idempotent: false,
    },
  };
}

// Render one old, system-generated demo note with today's terminology. Keep
// the stored audit / user's own reason untouched.
export function displayGradeText(value) {
  const legacyDemoNote =
    "演示：复核办理状态，保留原有效分；仅增加办理审计，不增加成绩版本。";
  return displayBusinessText(
    value === legacyDemoNote
      ? "演示：登记复核结论，保留当前有效分和处理说明。"
      : value,
  );
}
