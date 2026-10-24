import { getSessionResumeBlocker } from "./aiRuntimeRules.js";
import { normalizeWorkstationReleaseData } from "./workstationReleaseRules.js";
import { finalizeSubmittedStep } from "./visualEvaluationRules.js";
import { calculateScoreEngine } from "./domainRules.js";
import { buildStudentHelpPayload } from "./studentPracticeRules.js";
import { buildExamIncidentPayload } from "./studentExamRules.js";

export const OPEN_HELP = ["pending", "handling"];
export const HELP_LABELS = {
  pending: "等待教师处理",
  handling: "教师处理中",
  completed: "处理完成",
  cancelled: "学生已撤销",
  closed: "已关闭",
};
const terminal = (a, s) =>
  ["已取消", "已结束", "待发布", "已发布", "已归档"].includes(a.status) ||
  ["已完成", "待复位", "已复位", "已取消"].includes(s.status);
export function sessionHelpRequests(session = {}, arrangement = {}) {
  const requests = [...(session.helpRequests || [])];
  for (const event of session.events || []) {
    if (
      ![
        "student_help_requested",
        "practice_help_requested",
        "exam_incident_help_requested",
      ].includes(event.type)
    )
      continue;
    const id =
      event.requestId ||
      event.id ||
      `${session.id}-${event.type}-${event.createdAt || event.time || "legacy"}`;
    if (requests.some((r) => r.id === id)) continue;
    requests.push({
      id,
      sessionId: session.id,
      arrangementId: arrangement.id,
      teacherId: arrangement.teacherId,
      studentId: session.studentId,
      workstationId: session.workstationId,
      stepId: event.stepId || "",
      kind: event.type === "exam_incident_help_requested" ? "exam" : "practice",
      reasonCode: event.reasonCode || "other",
      reasonLabel: event.reasonLabel || event.reason || "历史求助",
      note: event.note || "",
      createdAt: event.createdAt || event.time || "",
      status: event.helpStatus || (event.closedAt ? "closed" : "pending"),
      history: [],
    });
  }
  for (const [kind, time] of [
    ["practice", session.helpRequestedAt],
    ["exam", session.examIncidentHelpRequestedAt],
  ]) {
    if (time && !requests.some((r) => r.kind === kind))
      requests.push({
        id: `${session.id}-legacy-${kind}-help`,
        sessionId: session.id,
        arrangementId: arrangement.id,
        teacherId: arrangement.teacherId,
        studentId: session.studentId,
        workstationId: session.workstationId,
        stepId: "",
        kind,
        reasonCode: "legacy",
        reasonLabel: "历史求助（原因未记录）",
        note: "旧数据仅保留提交时间，未推断处理结果。",
        createdAt: time,
        status: "pending",
        history: [],
      });
  }
  return requests.sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
}
export function normalizeSessionClosure(session, arrangement = {}) {
  let requests = sessionHelpRequests(session, arrangement);
  if (terminal(arrangement, session))
    requests = requests.map((r) =>
      OPEN_HELP.includes(r.status)
        ? {
            ...r,
            status: "closed",
            closedAt:
              session.endedAt ||
              session.closedAt ||
              arrangement.endedAt ||
              arrangement.cancelledAt ||
              "",
            closeReason:
              session.closedReason ||
              arrangement.cancelReason ||
              "会话或安排已结束",
            history: [
              ...(r.history || []),
              {
                action: "closed",
                actor: "system",
                at:
                  session.endedAt ||
                  session.closedAt ||
                  arrangement.endedAt ||
                  arrangement.cancelledAt ||
                  "",
                note:
                  session.closedReason ||
                  arrangement.cancelReason ||
                  "会话或安排已结束",
              },
            ],
          }
        : r,
    );
  const pending = session.stepConfirmation;
  const resolvedStep =
    pending?.status === "pending" &&
    session.steps?.find(
      (s) =>
        s.id === pending.stepId &&
        (s.flowCompletion || s.completionSource === "ai"),
    );
  const byId = new Map(requests.map((r) => [r.id, r]));
  return {
    ...session,
    helpRequests: requests,
    events: (session.events || []).map((e) => {
      if (
        e.type === "step_confirmation_requested" &&
        (terminal(arrangement, session) ||
          (e.stepId === pending?.stepId && resolvedStep))
      )
        return {
          ...e,
          requiresAttention: false,
          closedAt:
            session.endedAt || resolvedStep?.observationWindow?.closedAt || "",
        };
      const r = byId.get(e.requestId || e.id);
      return r
        ? {
            ...e,
            requestId: r.id,
            helpStatus: r.status,
            requiresAttention: OPEN_HELP.includes(r.status),
            closedAt: r.closedAt || "",
          }
        : e;
    }),
    ...(resolvedStep
      ? {
          stepConfirmation: {
            ...pending,
            status: "auto_completed",
            closedAt: resolvedStep.observationWindow?.closedAt || "",
            closeReason: "步骤已由完成证据自动推进",
          },
        }
      : {}),
    ...(terminal(arrangement, session) &&
    session.stepConfirmation?.status === "pending"
      ? {
          stepConfirmation: {
            ...session.stepConfirmation,
            status: "closed",
            closeReason: "会话或安排已结束",
          },
        }
      : {}),
  };
}
export function openHelpRequests(data, teacherId = "") {
  return (data.arrangements || []).flatMap((arrangement) =>
    !teacherId || arrangement.teacherId === teacherId
      ? (arrangement.sessions || []).flatMap((session) =>
          sessionHelpRequests(session, arrangement)
            .filter(
              (r) =>
                OPEN_HELP.includes(r.status) && !terminal(arrangement, session),
            )
            .map((request) => ({ arrangement, session, request })),
        )
      : [],
  );
}
export function progressionBlocker(arrangement, session) {
  if (arrangement.status !== "进行中" || session.status !== "进行中")
    return "安排和学生会话均须处于进行中";
  if (session.steps?.some((s) => s.state === "blocked" || s.redlineConfirmed))
    return "存在安全阻断，请等待教师按既有流程处理";
  return getSessionResumeBlocker(session)?.message || "";
}
// Every command is evaluated against the latest data inside the persistence transaction.
export function changeSessionClosure(data, input) {
  const {
    arrangementId,
    sessionId,
    action,
    stepId,
    requestId,
    at,
    makeId = (p) => `${p}-${at}`,
    actor = "teacher",
    actorId = "t1",
    note = "",
  } = input;
  const arrangement = data.arrangements.find((a) => a.id === arrangementId);
  const original = arrangement?.sessions?.find((s) => s.id === sessionId);
  if (!original) throw new Error("会话不存在或已失效。");
  let session = normalizeSessionClosure(original, arrangement);
  const studentAction = ["request_help", "cancel_help", "submit_step"].includes(
    action,
  );
  if (studentAction && actorId !== session.studentId)
    throw new Error("只能操作本人会话。");
  if (
    !studentAction &&
    (actor !== "teacher" ||
      (arrangement.teacherId && actorId !== arrangement.teacherId))
  )
    throw new Error("只能由本次安排的教师办理。");
  let event, result;
  if (action === "request_help") {
    if (
      terminal(arrangement, session) ||
      !["进行中", "已暂停", "故障"].includes(session.status)
    )
      throw new Error("当前会话状态不能请求帮助。");
    const existing = session.helpRequests.find((r) =>
      OPEN_HELP.includes(r.status),
    );
    if (existing) return { data, result: existing };
    const payload =
      arrangement.type === "exam"
        ? buildExamIncidentPayload(input.reasonCode, input.note)
        : buildStudentHelpPayload(input.reasonCode || "other", input.note);
    const request = {
      id: makeId("help-request"),
      arrangementId,
      sessionId,
      studentId: session.studentId,
      teacherId: arrangement.teacherId,
      workstationId: session.workstationId,
      stepId: session.currentStepId || "",
      kind: arrangement.type === "exam" ? "exam" : "practice",
      reasonCode: payload.reasonCode || "other",
      reasonLabel: payload.reasonLabel || "其他",
      note: String(payload.note || "").trim(),
      createdAt: at,
      status: "pending",
      history: [
        {
          action: "pending",
          actor: actorId,
          at,
          note: String(payload.note || "").trim(),
        },
      ],
    };
    session.helpRequests = [request, ...session.helpRequests];
    session[
      arrangement.type === "exam"
        ? "examIncidentHelpRequestedAt"
        : "helpRequestedAt"
    ] = at;
    event = {
      id: request.id,
      requestId: request.id,
      type:
        arrangement.type === "exam"
          ? "exam_incident_help_requested"
          : "practice_help_requested",
      title:
        arrangement.type === "exam" ? "学生提交考试异常求助" : "学生请求帮助",
      reasonCode: request.reasonCode,
      reasonLabel: request.reasonLabel,
      note: request.note,
      detail: `${request.reasonLabel}${request.note ? "：" + request.note : ""}`,
      stepId: request.stepId,
      helpStatus: "pending",
      requiresAttention: true,
    };
    result = request;
  } else if (["accept_help", "complete_help", "cancel_help"].includes(action)) {
    const request = session.helpRequests.find((r) => r.id === requestId);
    if (!request) throw new Error("求助记录不存在。");
    const nextStatus = {
      accept_help: "handling",
      complete_help: "completed",
      cancel_help: "cancelled",
    }[action];
    if (request.status === nextStatus) return { data, result: request };
    if (terminal(arrangement, session))
      throw new Error("会话已结束，求助已关闭。");
    if (
      (action === "accept_help" || action === "cancel_help") &&
      request.status !== "pending"
    )
      throw new Error("该请求已被接手或关闭，请刷新查看。");
    if (action === "complete_help" && request.status !== "handling")
      throw new Error("请先接手处理，再填写结果。");
    if (action === "complete_help" && !note.trim())
      throw new Error("请填写处理说明，作为学生可见回执。");
    result = {
      ...request,
      status: nextStatus,
      updatedAt: at,
      ...(action === "accept_help"
        ? { acceptedAt: at, acceptedBy: actorId }
        : {
            closedAt: at,
            receipt: action === "complete_help" ? note.trim() : "",
            closeReason:
              action === "cancel_help"
                ? "学生撤销尚未接手的请求"
                : "教师处理完成",
          }),
      history: [
        ...(request.history || []),
        { action: nextStatus, actor: actorId, at, note: note.trim() },
      ],
    };
    session.helpRequests = session.helpRequests.map((r) =>
      r.id === requestId ? result : r,
    );
    session.events = session.events.map((e) =>
      (e.requestId || e.id) === requestId
        ? {
            ...e,
            requestId,
            helpStatus: nextStatus,
            requiresAttention: OPEN_HELP.includes(nextStatus),
            closedAt: result.closedAt || "",
          }
        : e,
    );
    event = {
      id: makeId("help-event"),
      requestId,
      type: "help_request_updated",
      title: HELP_LABELS[nextStatus],
      detail:
        nextStatus === "completed"
          ? note.trim()
          : nextStatus === "handling"
            ? "教师已接手，请保持现场。"
            : result.closeReason,
      requiresAttention: false,
    };
  } else if (["submit_step", "confirm_step"].includes(action)) {
    const step = session.steps.find((s) => s.id === stepId);
    if (!step) throw new Error("步骤不存在。");
    if (step.flowCompletion || step.completionSource === "ai")
      return { data, result: step };
    const blocker = progressionBlocker(arrangement, session);
    if (blocker) throw new Error(blocker);
    if (session.currentStepId !== stepId)
      throw new Error("当前步骤已变化，请刷新后确认。");
    if (action === "submit_step" && arrangement.type === "exam")
      throw new Error("考试人工推进须由教师确认。");
    const frozen =
      session.evaluationSnapshot?.sopSnapshot ||
      arrangement.snapshot?.sopSnapshot;
    const standard = frozen?.steps?.find((s) => s.id === stepId) || step;
    const needsTeacher =
      standard.manualProgressionPolicy === "teacher_confirmation" ||
      step.manualProgressionPolicy === "teacher_confirmation";
    if (action === "submit_step" && needsTeacher) {
      if (
        session.stepConfirmation?.status === "pending" &&
        session.stepConfirmation.stepId === stepId
      )
        return { data, result: session.stepConfirmation };
      result = {
        id: makeId("step-confirmation"),
        stepId,
        status: "pending",
        submittedBy: actorId,
        submittedAt: at,
      };
      session.stepConfirmation = result;
      event = {
        id: result.id,
        type: "step_confirmation_requested",
        stepId,
        title: "学生提交本步完成，等待教师确认",
        detail: step.name,
        requiresAttention: true,
      };
    } else {
      if (action === "confirm_step" && !note.trim())
        throw new Error("请填写流程确认说明；此操作不代表AI确认合格。");
      const flowCompletion = {
        actor: actorId,
        role: action === "submit_step" ? "student" : "teacher",
        at,
        note: note.trim() || "学生确认本步已操作完成",
        source: "manual_flow",
      };
      const scored =
        step.reviewedAt ||
        ["人工调整", "已确认扣分", "复核通过"].includes(step.reviewStatus)
          ? step
          : finalizeSubmittedStep(
              { ...step, evidenceSemantics: "observations_v1" },
              at,
              {
                scoringApplications:
                  session.runtime?.aiScoringApplications || [],
              },
            );
      const index = session.steps.findIndex((s) => s.id === stepId);
      const next = session.steps
        .slice(index + 1)
        .find((s) => !s.flowCompletion && s.state !== "pass");
      session.steps = session.steps.map((s) =>
        s.id === stepId
          ? {
              ...scored,
              state: "pass",
              executionState: "closed",
              completionSource: "manual_flow",
              flowCompletion,
              aiEvidenceState:
                step.aiEvidenceState === "confirmed" ? "confirmed" : "unknown",
              completionResult:
                step.aiEvidenceState === "confirmed" ? "complete" : "uncertain",
              observation: "已人工确认流程完成；AI证据与得分单独记录",
            }
          : s.id === next?.id
            ? {
                ...s,
                state: "active",
                executionState: "active",
                result: "进行中",
                observationWindow: {
                  status: "open",
                  openedAt: at,
                  closedAt: "",
                  closeReason: "",
                },
              }
            : s,
      );
      session.currentStepId = next?.id || "";
      session.scoreEngine = calculateScoreEngine({
        steps: session.steps,
        manualAdjustments: session.manualAdjustments || [],
      });
      session.score =
        session.scoreEngine.scoreStatus === "pending"
          ? session.score
          : session.scoreEngine.effectiveScore;
      if (session.stepConfirmation?.stepId === stepId)
        session.stepConfirmation = {
          ...session.stepConfirmation,
          status: "confirmed",
          confirmedBy: actorId,
          confirmedAt: at,
          note: note.trim(),
        };
      session.events = session.events.map((e) =>
        e.type === "step_confirmation_requested" && e.stepId === stepId
          ? { ...e, requiresAttention: false, closedAt: at }
          : e,
      );
      event = {
        id: makeId("step-flow"),
        type: "step_flow_confirmed",
        stepId,
        title: "本步流程已人工确认",
        detail: `${flowCompletion.note}；${next ? "下一步：" + next.name : "全部步骤流程已走完"}；不代表AI确认。`,
        requiresAttention: false,
      };
      result = session.steps[index];
    }
  } else throw new Error("未知会话操作。");
  if (event)
    session.events = [
      {
        ...event,
        createdAt: at,
        time: at,
        scoreImpact: "none",
        source: actor,
        actorId,
      },
      ...(session.events || []),
    ];
  const path = `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}/${arrangementId}/stations/${session.workstationId}?sessionId=${sessionId}${result?.id && action.includes("help") ? "#help-" + result.id : ""}`;
  let notifications = [...(data.notifications || [])];
  if (
    action === "request_help" ||
    event?.type === "step_confirmation_requested"
  )
    notifications.unshift({
      id: makeId("notification"),
      requestId: action === "request_help" ? result.id : undefined,
      sessionId,
      arrangementId,
      title: event.title,
      detail: event.detail,
      path,
      time: at,
      read: false,
      tone: "warning",
    });
  if (["complete_help", "cancel_help"].includes(action))
    notifications = notifications.map((n) =>
      n.requestId === requestId ? { ...n, read: true, closedAt: at } : n,
    );
  const nextData = {
    ...data,
    arrangements: data.arrangements.map((a) =>
      a.id === arrangementId
        ? {
            ...a,
            sessions: a.sessions.map((s) => (s.id === sessionId ? session : s)),
            updatedAt: at,
          }
        : a,
    ),
    notifications,
    auditLogs: [
      {
        id: makeId("audit"),
        actor: actorId,
        role: actor === "student" ? "学生" : "教师",
        target: `${arrangement.name} / ${sessionId}`,
        result: "成功",
        action: event.title,
        detail: `${arrangement.name} / ${sessionId} / ${event.detail}`,
        createdAt: at,
        time: at,
      },
      ...(data.auditLogs || []),
    ],
  };
  return { data: nextData, result };
}
export function normalizeClosureData(data) {
  const arrangements = (data.arrangements || []).map((a) => ({
    ...a,
    sessions: (a.sessions || []).map((s) => normalizeSessionClosure(s, a)),
  }));
  const closed = new Set(
    arrangements.flatMap((a) =>
      a.sessions.flatMap((s) =>
        s.helpRequests
          .filter((r) => !OPEN_HELP.includes(r.status))
          .map((r) => r.id),
      ),
    ),
  );
  return normalizeWorkstationReleaseData({
    ...data,
    arrangements,
    notifications: (data.notifications || []).map((n) =>
      closed.has(n.requestId) ||
      (n.title === "学生提交本步完成，等待教师确认" &&
        arrangements.some(
          (a) =>
            a.id === n.arrangementId &&
            a.sessions.some(
              (s) =>
                s.id === n.sessionId &&
                s.stepConfirmation?.status !== "pending",
            ),
        ))
        ? { ...n, read: true }
        : n,
    ),
  });
}
export function stepFlowLabel(step = {}) {
  return step.flowCompletion
    ? `${step.flowCompletion.role === "teacher" ? "教师" : "学生"}确认流程完成`
    : step.completionSource === "ai"
      ? "自动确认流程完成"
      : ["active", "pending"].includes(step.state)
        ? "尚未完成流程"
        : "历史流程记录";
}
