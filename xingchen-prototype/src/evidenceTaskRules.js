import {
  calculateScoreEngine,
  requiresMandatoryReview,
} from "./domainRules.js";
import { reviseSessionGrade, gradeStateToken } from "./gradeRevisionRules.js";

export const EVIDENCE_TASK_STATUSES = {
  pending: "待办理",
  handling: "办理中",
  awaiting_confirmation: "待教师确认",
  completed: "已完成",
  cancelled: "已取消",
};
export const EVIDENCE_TASK_KINDS = { evidence: "补充证据", retest: "线下补测" };
export const OPEN_EVIDENCE_TASK_STATUSES = [
  "pending",
  "handling",
  "awaiting_confirmation",
];
const clone = (value) =>
  value == null ? value : JSON.parse(JSON.stringify(value));
const text = (value) => String(value || "").trim();
const isOpen = (task) => OPEN_EVIDENCE_TASK_STATUSES.includes(task.status);
const frozen = (arrangement, session) =>
  arrangement.status === "已发布" ||
  session.resultStatus === "已发布" ||
  session.scoreFrozen === true ||
  session.scoreFrozen === "true";
const stable = (value) =>
  value && typeof value === "object"
    ? Array.isArray(value)
      ? value.map(stable)
      : Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, stable(value[k])]),
        )
    : value;
const signature = (input) =>
  JSON.stringify(
    stable(
      Object.fromEntries(
        Object.entries(input).filter(
          ([key]) =>
            ![
              "at",
              "makeId",
              "expectedTaskRevision",
              "expectedVersion",
              "expectedState",
              "operationId",
            ].includes(key),
        ),
      ),
    ),
  );
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

function locate(data, arrangementId, sessionId, stepId) {
  const arrangement = (data.arrangements || []).find(
    (a) => a.id === arrangementId,
  );
  const session = arrangement?.sessions?.find((s) => s.id === sessionId);
  const step = session?.steps?.find((s) => s.id === stepId);
  ensure(
    arrangement && session && step,
    "原安排、实训记录或步骤已失效，请刷新后核对。",
  );
  return { arrangement, session, step };
}
export function evidenceTasksForSession(data, sessionId, arrangementId = "") {
  return (data.evidenceTasks || [])
    .filter(
      (t) =>
        t.sessionId === sessionId &&
        (!arrangementId || t.arrangementId === arrangementId),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function openEvidenceTasks(data, teacherId = "t1") {
  return (data.evidenceTasks || []).filter(
    (t) => isOpen(t) && (!teacherId || t.teacherId === teacherId),
  );
}
export function evidenceTaskGradeContext(data, task) {
  const { session } = locate(
    data,
    task.arrangementId,
    task.sessionId,
    task.stepId,
  );
  return {
    expectedTaskRevision: Number(task.revision || 1),
    expectedState: gradeStateToken(session),
  };
}
export function evidenceTaskReportPath(task, role = "teacher") {
  return `/${role}/${task.arrangementType === "exam" ? "exams" : "practices"}/${task.arrangementId}/students/${task.studentId}?sessionId=${encodeURIComponent(task.sessionId)}#evidence-task-${encodeURIComponent(task.id)}`;
}
function gradeContext(session, input) {
  ensure(
    input.expectedState !== undefined,
    "成绩办理页面已失效，请刷新后重新打开办理表单。",
  );
  ensure(
    input.expectedState === gradeStateToken(session),
    "成绩已变化，请刷新后核对；已填写的办理说明可保留。",
  );
}
function teacherGuard(arrangement, input) {
  const actorId = input.actorId || "t1";
  ensure(
    (input.actorRole || "teacher") === "teacher" &&
      actorId === (arrangement.teacherId || "t1"),
    "仅本次安排的负责教师可以办理补证或补测。",
  );
  return actorId;
}
function replaceSession(data, arrangement, session, at) {
  return {
    ...data,
    arrangements: (data.arrangements || []).map((a) =>
      a.id === arrangement.id
        ? {
            ...a,
            sessions: a.sessions.map((s) =>
              s.id === session.id ? session : s,
            ),
            updatedAt: at,
          }
        : a,
    ),
  };
}
function recalculateTaskState(session, steps, priorResultStatus, operationId) {
  const scoreEngine = calculateScoreEngine({
    steps,
    manualAdjustments: session.manualAdjustments || [],
  });
  const pending =
    scoreEngine.scoreStatus === "pending" ||
    steps.some(requiresMandatoryReview) ||
    (session.runtime?.safetyCandidates || []).some(
      (c) => c.status === "pending",
    );
  return {
    ...session,
    // Keep the current operation identity so a cancelled task cannot revive an old open form.
    lastGradeOperationId: operationId,
    steps,
    scoreEngine,
    // Task bookkeeping never repairs or infers a stored grade.
    resultStatus:
      session.resultStatus === "未参加"
        ? "未参加"
        : pending
          ? "待复核"
          : priorResultStatus ||
            (["进行中", "已暂停", "故障", "待开始", "可入场"].includes(
              session.status,
            )
              ? "过程记录"
              : "正式成绩"),
  };
}
export function validateEvidenceReferences(data, studentId, refs = []) {
  ensure(Array.isArray(refs), "证据引用必须为已有记录列表。");
  const seen = new Set();
  return refs.map((ref) => {
    ensure(
      ref && typeof ref === "object" && !Array.isArray(ref),
      "请选择可定位的已有实训记录和步骤，不能只填写已补测文字。",
    );
    const { arrangement, session, step } = locate(
      data,
      ref.arrangementId,
      ref.sessionId,
      ref.stepId,
    );
    ensure(
      session.studentId === studentId,
      "引用的实训记录必须属于本次学生，不能借用他人成绩或证据。",
    );
    ensure(
      !["草稿", "已取消"].includes(arrangement.status) &&
        session.status !== "已取消",
      "已取消或尚未开放的记录不能作为办理依据。",
    );
    const normalized = {
      arrangementId: arrangement.id,
      sessionId: session.id,
      stepId: step.id,
    };
    if (text(ref.clipRange)) {
      const known = text(step.clipRange || step.timeRange);
      ensure(
        known &&
          !/尚未|未产生|未知|--/.test(known) &&
          text(ref.clipRange) === known,
        "片段范围必须与已有步骤记录一致。",
      );
      ensure(
        session.recording?.fullVideoAvailable === true &&
          session.recording?.status !== "不可用" &&
          !["不可用", "未产生", "已过期"].includes(step.evidenceStatus),
        "该记录没有可用视频片段，请改为已有步骤记录引用或教师现场核验。",
      );
      normalized.clipRange = known;
    }
    const id = JSON.stringify(normalized);
    ensure(!seen.has(id), "同一证据引用不能重复添加。");
    seen.add(id);
    return normalized;
  });
}
function registrationFor(data, task, input, at, actorId) {
  for (const [key, label] of [
    ["performedAt", "线下办理时间"],
    ["performer", "现场教师"],
    ["process", "办理过程"],
    ["outcome", "现场结果"],
    ["basis", "核验依据"],
  ])
    ensure(text(input[key]), `请填写${label}。`);
  const performed = Date.parse(String(input.performedAt).replace(" ", "T"));
  const registered = Date.parse(String(at).replace(" ", "T"));
  ensure(
    Number.isFinite(performed) &&
      (!Number.isFinite(registered) || performed <= registered + 60000),
    "线下办理时间无效或晚于登记时间。",
  );
  ensure(
    ["manual", "session_ref"].includes(input.verificationMode),
    "请选择教师现场核验或已有记录引用。",
  );
  const evidenceRefs = validateEvidenceReferences(
    data,
    task.studentId,
    input.evidenceRefs || [],
  );
  ensure(
    input.verificationMode !== "session_ref" || evidenceRefs.length > 0,
    "使用已有记录核验时，至少关联一条可定位的实训记录/步骤引用。",
  );
  return {
    performedAt: text(input.performedAt),
    performer: text(input.performer),
    process: text(input.process),
    outcome: text(input.outcome),
    basis: text(input.basis),
    verificationMode: input.verificationMode,
    evidenceRefs,
    registeredAt: at,
    registeredBy: actorId,
  };
}

/** Every state transition is a fresh, synchronous transaction. No upload, AI or new schedule is implied. */
export function changeEvidenceTask(data, input) {
  const { action, at, makeId = (p) => `${p}-${at}`, operationId } = input;
  ensure(text(at), "缺少办理时间。");
  ensure(text(operationId), "缺少本次操作标识，请重新打开表单。");
  const tasks = Array.isArray(data.evidenceTasks) ? data.evidenceTasks : [];
  const existing =
    action === "create" ? null : tasks.find((t) => t.id === input.taskId);
  ensure(action === "create" || existing, "办理任务不存在或已失效。");
  const { arrangement, session, step } = locate(
    data,
    existing?.arrangementId || input.arrangementId,
    existing?.sessionId || input.sessionId,
    existing?.stepId || input.stepId,
  );
  const actorId = teacherGuard(arrangement, input),
    fingerprint = signature(input);
  const priorOperation = tasks
    .flatMap((task) => (task.operations || []).map((op) => ({ ...op, task })))
    .find((op) => op.id === operationId);
  if (priorOperation) {
    ensure(
      priorOperation.action === action &&
        priorOperation.fingerprint === fingerprint,
      "本次操作标识已用于另一份提交，请刷新并重新填写。",
    );
    return { data, result: priorOperation.task, idempotent: true };
  }
  if (action !== "cancel")
    ensure(
      !frozen(arrangement, session),
      "已发布成绩不新建补证或补测任务；如需更正，请由负责教师在报告中修改成绩。",
    );
  ensure(
    !["草稿", "已取消"].includes(arrangement.status) &&
      !["未参加", "已取消"].includes(session.resultStatus) &&
      session.status !== "已取消",
    "原会话尚未形成可办理记录、未参加或已取消。",
  );
  let task = existing,
    updatedData = data;
  if (action === "create") {
    ensure(
      Object.keys(EVIDENCE_TASK_KINDS).includes(input.kind),
      "请选择补充证据或线下补测。",
    );
    ensure(text(input.reason), "请填写发起原因。");
    ensure(
      text(input.studentInstruction),
      "请填写学生需要完成的事项，作为学生可见办理说明。",
    );
    const duplicate = tasks.find(
      (t) =>
        isOpen(t) &&
        t.arrangementId === arrangement.id &&
        t.sessionId === session.id &&
        t.stepId === step.id,
    );
    if (duplicate) {
      ensure(
        duplicate.kind === input.kind,
        "该步骤已有未结任务，请先办理或取消，不能重复发起不同任务。",
      );
      return { data, result: duplicate, idempotent: true };
    }
    gradeContext(session, input);
    const teacherId = input.teacherId || arrangement.teacherId || "t1";
    ensure(teacherId === actorId, "当前补证/补测由本次安排负责教师办理。");
    const teacher = (data.teachers || []).find((t) => t.id === teacherId);
    task = {
      id: makeId("evidence-task"),
      kind: input.kind,
      status: "pending",
      revision: 1,
      arrangementId: arrangement.id,
      arrangementType: arrangement.type,
      arrangementName: arrangement.name,
      sessionId: session.id,
      stepId: step.id,
      stepName: step.name,
      studentId: session.studentId,
      teacherId,
      teacherName: teacher?.name || input.actorName || "负责教师",
      reason: text(input.reason),
      studentInstruction: text(input.studentInstruction),
      studentConclusion: "",
      createdAt: at,
      createdBy: actorId,
      priorSessionResultStatus: session.resultStatus || "过程记录",
      priorStepState: {
        reviewStatus: step.reviewStatus || "无需复核",
        scoreDisposition: clone(
          step.scoreDisposition || { status: "normal", reason: "" },
        ),
      },
      history: [],
    };
    const updatedStep = {
      ...step,
      reviewStatus: input.kind === "evidence" ? "待补充证据" : "待复核",
      scoreDisposition: {
        ...(step.scoreDisposition || {}),
        status: input.kind === "retest" ? "retest_required" : "pending",
        reason: `${EVIDENCE_TASK_KINDS[input.kind]}待办：${task.reason}`,
        taskId: task.id,
      },
    };
    const updatedSession = recalculateTaskState(
      session,
      session.steps.map((s) => (s.id === step.id ? updatedStep : s)),
      undefined,
      operationId,
    );
    updatedData = replaceSession(data, arrangement, updatedSession, at);
  } else {
    ensure(
      Number.isInteger(Number(input.expectedTaskRevision)) &&
        Number(input.expectedTaskRevision) === Number(task.revision || 1),
      "任务状态已变化，请刷新后重新办理；填写说明可保留。",
    );
    if (action === "accept") {
      ensure(task.status === "pending", "仅待办理任务可以接手。");
      task = {
        ...task,
        status: "handling",
        acceptedAt: at,
        acceptedBy: actorId,
      };
    } else if (action === "register") {
      ensure(task.status === "handling", "请先接手任务，再登记线下办理过程。");
      task = {
        ...task,
        status: "awaiting_confirmation",
        registration: registrationFor(data, task, input, at, actorId),
      };
    } else if (action === "confirm") {
      ensure(
        task.status === "awaiting_confirmation" && task.registration,
        "必须先登记完整办理记录，才能确认完成。",
      );
      ensure(text(input.reason), "请填写确认结论及依据。");
      ensure(text(input.studentConclusion), "请填写学生可见的最终结论。");
      validateEvidenceReferences(
        data,
        task.studentId,
        task.registration.evidenceRefs,
      );
      const revised = reviseSessionGrade(data, {
        arrangementId: task.arrangementId,
        sessionId: task.sessionId,
        stepId: task.stepId,
        action: "task_confirm",
        status: task.kind === "retest" ? "retest_resolved" : "teacher_resolved",
        score: input.score,
        reason: text(input.reason),
        evidenceRefs: task.registration.evidenceRefs,
        taskId: task.id,
        expectedState: input.expectedState,
        operationId,
        actorId,
        actorName: input.actorName || task.teacherName,
        at,
        makeId,
      });
      updatedData = revised.data;
      task = {
        ...task,
        status: "completed",
        completedAt: at,
        studentConclusion: text(input.studentConclusion),
        confirmation: {
          confirmedAt: at,
          confirmedBy: actorId,
          reason: text(input.reason),
          studentConclusion: text(input.studentConclusion),
          score:
            revised.result.step?.effectiveScore ??
            revised.result.step?.score ??
            Number(input.score),
          gradeAuditId: revised.result.audit?.id || "",
        },
      };
    } else if (action === "cancel") {
      ensure(isOpen(task), "仅未完成任务可以取消。");
      ensure(text(input.reason), "取消任务必须填写原因。");
      if (!frozen(arrangement, session)) {
        gradeContext(session, input);
        // Cancellation restores bookkeeping only. Current valid scores and later safety facts survive.
        const retainsSafety =
          step.redlineConfirmed ||
          step.result === "安全阻断" ||
          step.state === "blocked" ||
          step.scoreDisposition?.taskId !== task.id;
        const updatedStep = retainsSafety
          ? step
          : {
              ...step,
              reviewStatus: task.priorStepState?.reviewStatus || "建议抽查",
              scoreDisposition: clone(
                task.priorStepState?.scoreDisposition || {
                  status: "normal",
                  reason: "任务取消，按既定缺证保分政策保留当前有效分",
                },
              ),
            };
        updatedData = replaceSession(
          data,
          arrangement,
          recalculateTaskState(
            session,
            session.steps.map((s) => (s.id === step.id ? updatedStep : s)),
            task.priorSessionResultStatus,
            operationId,
          ),
          at,
        );
      }
      task = {
        ...task,
        status: "cancelled",
        cancelledAt: at,
        cancelledBy: actorId,
        cancelReason: text(input.reason),
        studentConclusion: "本次办理已取消，请按负责教师的现场安排执行。",
      };
    } else throw new Error("未知的补证/补测操作。");
    task = { ...task, revision: Number(task.revision || 1) + 1 };
  }
  task = {
    ...task,
    updatedAt: at,
    history: [
      ...(task.history || []),
      {
        id: makeId("evidence-task-history"),
        action,
        at,
        actorId,
        note:
          action === "create"
            ? task.reason
            : action === "register"
              ? "线下过程与核验依据已登记，等待教师确认"
              : text(input.reason) || EVIDENCE_TASK_STATUSES[task.status],
      },
    ],
    operations: [
      ...(task.operations || []),
      { id: operationId, action, fingerprint },
    ],
  };
  const nextTasks =
    action === "create"
      ? [task, ...tasks]
      : (updatedData.evidenceTasks || tasks).map((t) =>
          t.id === task.id ? task : t,
        );
  let notifications = [...(updatedData.notifications || [])];
  if (action === "create")
    notifications.unshift({
      id: makeId("notification"),
      taskId: task.id,
      arrangementId: arrangement.id,
      sessionId: session.id,
      title: `${EVIDENCE_TASK_KINDS[task.kind]}待办理`,
      detail: `${task.studentInstruction} · ${task.teacherName}`,
      path: `/teacher/evidence-tasks/${encodeURIComponent(task.id)}`,
      read: false,
      time: at,
      tone: "warning",
    });
  if (["confirm", "cancel"].includes(action))
    notifications = notifications.map((n) =>
      n.taskId === task.id ? { ...n, read: true, closedAt: at } : n,
    );
  const next = {
    ...updatedData,
    evidenceTasks: nextTasks,
    notifications,
    auditLogs: [
      {
        id: makeId("audit"),
        time: at,
        createdAt: at,
        actor: input.actorName || task.teacherName,
        role: "教师",
        action: `${EVIDENCE_TASK_KINDS[task.kind]}：${EVIDENCE_TASK_STATUSES[task.status]}`,
        target: `${arrangement.name} / ${session.id} / ${step.id}`,
        result: "成功",
        taskId: task.id,
        detail: text(input.reason) || task.studentInstruction,
      },
      ...(updatedData.auditLogs || []),
    ],
  };
  return { data: next, result: task, idempotent: false };
}

export function studentEvidenceTasks(data, studentId, options = {}) {
  if (!studentId) return [];
  return (data.evidenceTasks || [])
    .filter(
      (t) =>
        t.studentId === studentId &&
        (!options.arrangementId || t.arrangementId === options.arrangementId) &&
        (!options.sessionId || t.sessionId === options.sessionId),
    )
    .map((task) => {
      const arrangement = (data.arrangements || []).find(
        (a) => a.id === task.arrangementId,
      );
      const session = arrangement?.sessions?.find(
        (s) => s.id === task.sessionId && s.studentId === studentId,
      );
      if (!session) return null;
      const visible =
        arrangement.type !== "exam" || session.resultStatus === "已发布";
      return {
        id: task.id,
        arrangementId: task.arrangementId,
        sessionId: task.sessionId,
        kind: task.kind,
        status: task.status,
        studentInstruction: task.studentInstruction,
        teacherName: task.teacherName,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        ...(visible
          ? { studentConclusion: task.studentConclusion || "" }
          : task.status === "cancelled"
            ? { studentConclusion: "本次办理已取消，请按负责教师安排执行。" }
            : {}),
        history: (task.history || []).map((h) => ({
          action: h.action,
          at: h.at,
        })),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function normalizeEvidenceTasksData(data) {
  const evidenceTasks = (
    Array.isArray(data.evidenceTasks) ? data.evidenceTasks : []
  ).map((task) => {
    if (!isOpen(task)) return task;
    const arrangement = (data.arrangements || []).find(
      (a) => a.id === task.arrangementId,
    );
    const session = arrangement?.sessions?.find((s) => s.id === task.sessionId);
    const step = session?.steps?.find((s) => s.id === task.stepId);
    if (
      arrangement &&
      session &&
      step &&
      arrangement.status !== "已取消" &&
      session.status !== "已取消" &&
      session.resultStatus !== "未参加"
    )
      return task;
    const at = arrangement?.cancelledAt || session?.closedAt || "";
    return {
      ...task,
      status: "cancelled",
      revision: Number(task.revision || 1) + 1,
      cancelledAt: at,
      cancelReason:
        "原安排、实训记录或步骤已取消/失效；保留任务历史，不产生新的评分",
      studentConclusion: "办理关联已失效，请联系负责教师。",
      history: [
        ...(task.history || []),
        { action: "cancel", actorId: "system", at, note: "关联已取消/失效" },
      ],
    };
  });
  const closed = new Set(
    evidenceTasks.filter((t) => !isOpen(t)).map((t) => t.id),
  );
  return {
    ...data,
    evidenceTasks,
    notifications: (data.notifications || []).map((n) =>
      closed.has(n.taskId) ? { ...n, read: true } : n,
    ),
  };
}
