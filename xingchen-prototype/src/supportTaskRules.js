import { gradeStateToken } from "./gradeRevisionRules.js";
import {
  formalResultRows,
  latestStudentResultRows,
  teacherDashboardMetricFilters,
} from "./teacherDashboardMetrics.js";

export const SUPPORT_TASK_STATUSES = {
  pending: "待安排",
  coaching: "辅导中",
  awaiting_review: "待复查",
  completed: "已完成",
  cancelled: "已取消",
};
export const OPEN_SUPPORT_TASK_STATUSES = [
  "pending",
  "coaching",
  "awaiting_review",
];
export const SUPPORT_LOW_SCORE_THRESHOLD = 80;
const text = (value) => String(value || "").trim();
const isOpen = (task) => OPEN_SUPPORT_TASK_STATUSES.includes(task.status);
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
const stable = (value) =>
  value && typeof value === "object"
    ? Array.isArray(value)
      ? value.map(stable)
      : Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
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
const timestamp = (value) => Date.parse(text(value).replace(" ", "T"));

function locate(data, value) {
  const arrangement = (data.arrangements || []).find(
    (a) => a.id === value.arrangementId,
  );
  const session = arrangement?.sessions?.find((s) => s.id === value.sessionId);
  return { arrangement, session };
}
function validAssociation(data, task) {
  const { arrangement, session } = locate(data, task);
  return Boolean(
    arrangement &&
      session &&
      session.studentId === task.studentId &&
      (arrangement.teacherId || "t1") === task.teacherId &&
      !["草稿", "已取消"].includes(arrangement.status) &&
      session.status !== "已取消" &&
      session.resultStatus !== "未参加",
  );
}
function teacherGuard(arrangement, task, input) {
  const actorId = input.actorId || "t1";
  ensure(
    (input.actorRole || "teacher") === "teacher" &&
      actorId === "t1" &&
      actorId === (arrangement?.teacherId || task?.teacherId) &&
      (!task || task.teacherId === actorId),
    "仅原安排的负责教师可以办理辅导任务。",
  );
  return actorId;
}
function sourceRow(data, value) {
  return formalResultRows(data, { teacherId: value.teacherId || "t1" }).find(
    (row) =>
      row.arrangementId === value.arrangementId &&
      row.sessionId === value.sessionId,
  );
}
function sourceScope(row) {
  return {
    teacherId: row.teacherId,
    studentId: row.studentId,
    sopId: row.sopId,
    standardBasisKey: row.standardBasisKey,
    type: row.type,
  };
}
function sourceContext(session, input) {
  ensure(
    input.expectedState !== undefined,
    "来源成绩页面已失效，请刷新后重新打开辅导表单。",
  );
  ensure(
    input.expectedState === gradeStateToken(session),
    "来源成绩已变化，请刷新后核对最新低分结果；填写说明可保留。",
  );
}
function requiredTime(value, at, label) {
  const performed = timestamp(value),
    registered = timestamp(at);
  ensure(
    Number.isFinite(performed) &&
      Number.isFinite(registered) &&
      performed <= registered + 60000,
    `${label}无效或晚于登记时间。`,
  );
  return text(value);
}

export function supportTaskReportPath(task, role = "teacher") {
  return `/${role}/${task.arrangementType === "exam" || task.type === "exam" ? "exams" : "practices"}/${encodeURIComponent(task.arrangementId)}/students/${encodeURIComponent(task.studentId)}?sessionId=${encodeURIComponent(task.sessionId)}#support-task-${encodeURIComponent(task.id || "source")}`;
}
export function supportTasksForSession(data, sessionId, arrangementId = "") {
  return (data.supportTasks || [])
    .filter(
      (task) =>
        task.sessionId === sessionId &&
        (!arrangementId || task.arrangementId === arrangementId),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function openSupportTasks(data, teacherId = "t1") {
  return (data.supportTasks || []).filter(
    (task) =>
      isOpen(task) &&
      (!teacherId || task.teacherId === teacherId) &&
      validAssociation(data, task),
  );
}
export function supportTaskGradeContext(data, sourceOrTask) {
  const { session } = locate(data, sourceOrTask);
  ensure(session, "原安排或实训记录已失效，请刷新后核对。");
  return {
    ...(sourceOrTask.revision !== undefined
      ? { expectedTaskRevision: Number(sourceOrTask.revision || 1) }
      : {}),
    expectedState: gradeStateToken(session),
  };
}
export function supportTaskSourceContext(data, task) {
  const row = sourceRow(data, task);
  const { session } = locate(data, task);
  return {
    available: validAssociation(data, task),
    changed: Boolean(
      row &&
        (row.score !== task.sourceScore ||
          row.maxScore !== task.sourceMaxScore ||
          row.normalizedScore !== task.sourceNormalizedScore),
    ),
    score: row?.score ?? null,
    normalizedScore: row?.normalizedScore ?? null,
    resultAt: row?.resultAt || "",
    reportPath: supportTaskReportPath(task),
  };
}
export function candidateSupportResults(data, task) {
  const originTime = timestamp(task.sourceResultAt);
  const basis =
    task.standardBasisKey || sourceRow(data, task)?.standardBasisKey;
  if (!basis) return [];
  return formalResultRows(data, {
    teacherId: task.teacherId,
    studentId: task.studentId,
    sopId: task.sopId,
    standardBasisKey: basis,
    type: "practice",
  })
    .filter(
      (row) =>
        !(
          row.arrangementId === task.arrangementId &&
          row.sessionId === task.sessionId
        ) &&
        Number.isFinite(originTime) &&
        row.timestamp > originTime,
    )
    .map((row) => ({ ...row, gradeState: gradeStateToken(row.session) }));
}
function guidanceFor(input, at, actorId, makeId) {
  for (const [key, label] of [
    ["performedAt", "辅导时间"],
    ["performer", "辅导教师"],
    ["process", "辅导内容"],
    ["outcome", "辅导结果"],
  ])
    ensure(text(input[key]), `请填写${label}。`);
  return {
    id: makeId("support-guidance"),
    performedAt: requiredTime(input.performedAt, at, "辅导时间"),
    performer: text(input.performer),
    process: text(input.process),
    outcome: text(input.outcome),
    registeredAt: at,
    registeredBy: actorId,
  };
}
function verificationFor(data, task, input, at, actorId) {
  ensure(
    ["manual", "session_ref"].includes(input.verificationMode),
    "请选择复练结果引用或线下教师核验。",
  );
  for (const [key, label] of [
    ["performedAt", "复查时间"],
    ["performer", "复查教师"],
    ["basis", "复查依据"],
    ["studentConclusion", "学生可见的最终结论"],
  ])
    ensure(text(input[key]), `请填写${label}。`);
  const performedAt = requiredTime(input.performedAt, at, "复查时间");
  const guidance = task.guidanceRecords?.at(-1);
  ensure(
    guidance && timestamp(performedAt) >= timestamp(guidance.performedAt),
    "复查时间不能早于已登记辅导时间。",
  );
  let resultRef = null;
  if (input.verificationMode === "session_ref") {
    const ref = input.resultRef;
    ensure(
      ref && typeof ref === "object" && !Array.isArray(ref),
      "请选择可定位的后续复练正式结果。",
    );
    const row = candidateSupportResults(data, task).find(
      (r) =>
        r.arrangementId === ref.arrangementId && r.sessionId === ref.sessionId,
    );
    ensure(
      row,
      "复查必须引用本人同实训标准且历史评分依据一致的后续有效正式练习结果，不能引用原记录、他人、旧记录、考试或未结束记录。",
    );
    ensure(
      ref.expectedState && ref.expectedState === row.gradeState,
      "所选复练成绩已变化，请刷新后重新选择。",
    );
    ensure(
      row.timestamp <= timestamp(performedAt) + 60000,
      "复查时间不能早于所引用复练结果形成时间。",
    );
    resultRef = {
      arrangementId: row.arrangementId,
      sessionId: row.sessionId,
      studentId: row.studentId,
      sopId: row.sopId,
      standardBasisKey: row.standardBasisKey,
      score: row.score,
      normalizedScore: row.normalizedScore,
      resultAt: row.resultAt,
      reportPath: row.reportPath,
    };
  }
  return {
    verificationMode: input.verificationMode,
    performedAt,
    performer: text(input.performer),
    basis: text(input.basis),
    studentConclusion: text(input.studentConclusion),
    resultRef,
    registeredAt: at,
    registeredBy: actorId,
  };
}

/** A support task records teaching work only; its transactions never alter a result or create a schedule. */
export function changeSupportTask(data, input) {
  const {
    action,
    at,
    operationId,
    makeId = (prefix) => `${prefix}-${at}-${operationId}`,
  } = input;
  ensure(text(at) && Number.isFinite(timestamp(at)), "缺少有效办理时间。");
  ensure(text(operationId), "缺少本次操作标识，请重新打开表单。");
  const tasks = Array.isArray(data.supportTasks) ? data.supportTasks : [];
  const existing =
    action === "create" ? null : tasks.find((task) => task.id === input.taskId);
  ensure(action === "create" || existing, "辅导任务不存在或已失效。");
  const { arrangement, session } = locate(data, existing || input);
  const actorId = teacherGuard(arrangement, existing, input),
    fingerprint = signature(input);
  const prior = tasks
    .flatMap((task) => (task.operations || []).map((op) => ({ ...op, task })))
    .find((op) => op.id === operationId);
  if (prior) {
    ensure(
      prior.action === action && prior.fingerprint === fingerprint,
      "本次操作标识已用于另一份提交，请刷新并重新填写。",
    );
    return { data, result: prior.task, idempotent: true };
  }
  let task = existing;
  if (action === "create") {
    ensure(arrangement && session, "原安排或实训记录已失效，请刷新后核对。");
    const row = sourceRow(data, {
      arrangementId: arrangement.id,
      sessionId: session.id,
      teacherId: actorId,
    });
    ensure(
      row && text(row.studentId) && text(row.sopId),
      "仅已确定学生和实训标准的有效正式结果可以发起辅导。",
    );
    sourceContext(session, input);
    const selectedScope = input.filters
      ? {
          ...teacherDashboardMetricFilters(input.filters),
          teacherId: actorId,
          studentId: row.studentId,
        }
      : sourceScope(row);
    const latest = latestStudentResultRows(data, selectedScope).find(
      (r) => r.studentId === row.studentId,
    );
    ensure(
      latest?.arrangementId === row.arrangementId &&
        latest?.sessionId === row.sessionId &&
        row.normalizedScore < SUPPORT_LOW_SCORE_THRESHOLD,
      "该来源已不是此学生当前统计范围的最新低分正式结果，请刷新低分名单。",
    );
    ensure(text(input.reason), "请填写辅导原因。");
    ensure(text(input.studentInstruction), "请填写学生需要完成的事项。");
    const duplicate = openSupportTasks(data, actorId).find(
      (t) =>
        t.studentId === row.studentId &&
        t.sopId === row.sopId &&
        (t.standardBasisKey || sourceRow(data, t)?.standardBasisKey || "") ===
          row.standardBasisKey &&
        t.arrangementType === row.type,
    );
    if (duplicate) return { data, result: duplicate, idempotent: true };
    const teacher = (data.teachers || []).find((t) => t.id === actorId);
    task = {
      id: makeId("support-task"),
      status: "pending",
      revision: 1,
      arrangementId: row.arrangementId,
      arrangementType: row.type,
      arrangementName: arrangement.name,
      sessionId: row.sessionId,
      studentId: row.studentId,
      studentName: row.student?.name || session.studentName || row.studentId,
      sopId: row.sopId,
      standardBasisKey: row.standardBasisKey,
      sopName:
        session.evaluationSnapshot?.sopSnapshot?.name ||
        arrangement.snapshot?.sopSnapshot?.name ||
        (data.sops || []).find((s) => s.id === row.sopId)?.name ||
        row.sopId,
      teacherId: actorId,
      teacherName: teacher?.name || input.actorName || "负责教师",
      sourceScore: row.score,
      sourceMaxScore: row.maxScore,
      sourceNormalizedScore: row.normalizedScore,
      sourceResultAt: row.resultAt,
      sourceFilters: teacherDashboardMetricFilters(selectedScope),
      reason: text(input.reason),
      studentInstruction: text(input.studentInstruction),
      studentConclusion: "",
      guidanceRecords: [],
      history: [],
      createdAt: at,
      createdBy: actorId,
    };
  } else {
    ensure(
      Number.isInteger(Number(input.expectedTaskRevision)) &&
        Number(input.expectedTaskRevision) === Number(task.revision || 1),
      "任务状态已变化，请刷新后重新办理；填写说明可保留。",
    );
    ensure(isOpen(task), "已结束辅导任务不能再次办理。");
    if (action !== "cancel")
      ensure(
        validAssociation(data, task),
        "辅导来源关联已取消或失效，请先收束任务。",
      );
    if (action === "start") {
      ensure(task.status === "pending", "仅待安排任务可以开始辅导。");
      task = { ...task, status: "coaching", startedAt: at, startedBy: actorId };
    } else if (action === "record") {
      ensure(
        ["coaching", "awaiting_review"].includes(task.status),
        "请先开始辅导，再登记指导内容。",
      );
      task = {
        ...task,
        status: "awaiting_review",
        guidanceRecords: [
          ...(task.guidanceRecords || []),
          guidanceFor(input, at, actorId, makeId),
        ],
      };
    } else if (action === "review") {
      ensure(
        task.status === "awaiting_review" && task.guidanceRecords?.length,
        "必须先登记完整辅导内容，再复查确认完成。",
      );
      const verification = verificationFor(data, task, input, at, actorId);
      task = {
        ...task,
        status: "completed",
        completedAt: at,
        completedBy: actorId,
        verification,
        studentConclusion: verification.studentConclusion,
      };
    } else if (action === "cancel") {
      ensure(text(input.reason), "取消辅导任务必须填写原因。");
      task = {
        ...task,
        status: "cancelled",
        cancelledAt: at,
        cancelledBy: actorId,
        cancelReason: text(input.reason),
        studentConclusion: "本次辅导任务已取消，请按负责教师安排执行。",
      };
    } else throw new Error("未知的辅导任务操作。");
    task = { ...task, revision: Number(task.revision || 1) + 1 };
  }
  task = {
    ...task,
    updatedAt: at,
    history: [
      ...(task.history || []),
      {
        id: makeId("support-task-history"),
        action,
        at,
        actorId,
        note:
          action === "create"
            ? task.reason
            : action === "record"
              ? "辅导内容已登记，等待复查"
              : action === "review"
                ? task.verification.basis
                : text(input.reason) || SUPPORT_TASK_STATUSES[task.status],
      },
    ],
    operations: [
      ...(task.operations || []),
      { id: operationId, action, fingerprint },
    ],
  };
  let notifications = [...(data.notifications || [])];
  if (action === "create")
    notifications.unshift({
      id: makeId("notification"),
      taskId: task.id,
      taskType: "support",
      arrangementId: task.arrangementId,
      sessionId: task.sessionId,
      title: "辅导任务待安排",
      detail: `${task.studentInstruction} · ${task.teacherName}`,
      path: `/teacher/support-tasks/${encodeURIComponent(task.id)}`,
      read: false,
      time: at,
      tone: "warning",
    });
  if (["review", "cancel"].includes(action))
    notifications = notifications.map((n) =>
      n.taskId === task.id ? { ...n, read: true, closedAt: at } : n,
    );
  const next = {
    ...data,
    supportTasks:
      action === "create"
        ? [task, ...tasks]
        : tasks.map((t) => (t.id === task.id ? task : t)),
    notifications,
    auditLogs: [
      {
        id: makeId("audit"),
        time: at,
        createdAt: at,
        actor: input.actorName || task.teacherName,
        role: "教师",
        action: `辅导任务：${SUPPORT_TASK_STATUSES[task.status]}`,
        target: `${task.arrangementName} / ${task.sessionId} / ${task.studentId}`,
        result: "成功",
        taskId: task.id,
        detail: text(input.reason) || task.studentInstruction,
      },
      ...(data.auditLogs || []),
    ],
  };
  return { data: next, result: task, idempotent: false };
}

export function studentSupportTasks(data, studentId, options = {}) {
  if (!studentId) return [];
  return (data.supportTasks || [])
    .filter(
      (task) =>
        task.studentId === studentId &&
        (!options.arrangementId ||
          task.arrangementId === options.arrangementId) &&
        (!options.sessionId || task.sessionId === options.sessionId),
    )
    .map((task) => {
      const { arrangement, session } = locate(data, task);
      if (!arrangement || !session || session.studentId !== studentId)
        return null;
      const sourceResultVisible =
        arrangement.type !== "exam" || session.resultStatus === "已发布";
      return {
        id: task.id,
        arrangementId: task.arrangementId,
        sessionId: task.sessionId,
        status: task.status,
        studentInstruction: task.studentInstruction,
        teacherId: task.teacherId,
        teacherName: task.teacherName,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        sourceResultVisible,
        ...(sourceResultVisible
          ? { studentConclusion: task.studentConclusion || "" }
          : task.status === "cancelled"
            ? {
                studentConclusion: "本次辅导任务已取消，请按负责教师安排执行。",
              }
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
export function normalizeSupportTasksData(data) {
  const supportTasks = (
    Array.isArray(data.supportTasks) ? data.supportTasks : []
  ).map((task) => {
    if (!isOpen(task) || validAssociation(data, task)) return task;
    const { arrangement, session } = locate(data, task);
    const at = arrangement?.cancelledAt || session?.closedAt || "";
    return {
      ...task,
      status: "cancelled",
      revision: Number(task.revision || 1) + 1,
      cancelledAt: at,
      cancelledBy: "system",
      cancelReason:
        "原安排、实训记录、学生或负责教师关联已取消/失效；保留辅导历史，不改变成绩。",
      studentConclusion: "辅导关联已失效，请联系负责教师。",
      history: [
        ...(task.history || []),
        {
          action: "cancel",
          actorId: "system",
          at,
          note: "辅导来源关联已取消/失效",
        },
      ],
    };
  });
  const closed = new Set(
    supportTasks.filter((task) => !isOpen(task)).map((task) => task.id),
  );
  return {
    ...data,
    supportTasks,
    notifications: (data.notifications || []).map((n) =>
      closed.has(n.taskId) ? { ...n, read: true } : n,
    ),
  };
}
