import { sessionHelpRequests, OPEN_HELP } from "./sessionClosureRules.js";
import { teacherSessionEvents } from "./studentTeacherLinkRules.js";
import { sessionReportPath } from "./arrangementPreparationRules.js";

const array = (value) => (Array.isArray(value) ? value : []);
const enc = (value) => encodeURIComponent(String(value));
const endedArrangement = (a) => ["已取消", "草稿"].includes(a.status);
const closedSession = (s) =>
  ["已完成", "待复位", "已复位", "已取消", "未参加"].includes(s.status);
const openStatus = (value) =>
  ![
    "resolved",
    "completed",
    "cancelled",
    "closed",
    "已关闭",
    "已完成",
    "已取消",
  ].includes(value);
const needReview = (step) =>
  ["待复核", "待补充证据"].includes(step.reviewStatus) ||
  ["pending", "retest_required"].includes(step.scoreDisposition?.status);

export function teacherStationTaskPath(arrangement, session, stepId = "") {
  const base = arrangement.type === "exam" ? "exams" : "practices";
  return `/teacher/${base}/${enc(arrangement.id)}/stations/${enc(session.workstationId)}?sessionId=${enc(session.id)}${stepId ? `&stepId=${enc(stepId)}` : ""}`;
}

// A task's unread notification is deliberately never used as its lifecycle state.
// Every dashboard count, page and target must consume this same collection.
export function teacherDashboardTasks(data = {}, teacherId = "t1") {
  const arrangements = array(data.arrangements).filter(
    (a) => a.id && a.teacherId === teacherId && !endedArrangement(a),
  );
  const contexts = arrangements.flatMap((arrangement) =>
    array(arrangement.sessions)
      .filter((s) => s.id)
      .map((session) => ({ arrangement, session })),
  );
  const result = [];
  const seen = new Set();
  const add = (task) => {
    if (!seen.has(task.id)) {
      seen.add(task.id);
      result.push(task);
    }
  };
  const name = (collection, id) =>
    array(data[collection]).find((x) => x.id === id)?.name || id || "未记录";
  const source = (a, s, extra = {}) => ({
    arrangementId: a.id,
    ...(s
      ? {
          sessionId: s.id,
          studentId: s.studentId,
          workstationId: s.workstationId,
        }
      : {}),
    ...extra,
  });
  const detail = (a, s) =>
    `${name("students", s.studentId)} · ${a.name || a.id}`;
  const taskContext = (task) => {
    if (!task.id || task.teacherId !== teacherId) return null;
    const context = contexts.find(
      ({ arrangement, session }) =>
        arrangement.id === task.arrangementId && session.id === task.sessionId,
    );
    if (
      !context ||
      task.studentId !== context.session.studentId ||
      context.session.status === "已取消" ||
      context.session.resultStatus === "未参加"
    )
      return null;
    return context;
  };
  const evidence = array(data.evidenceTasks).filter(
    (task) =>
      ["pending", "handling", "awaiting_confirmation"].includes(task.status) &&
      taskContext(task)?.session.steps?.some((s) => s.id === task.stepId),
  );
  const evidenceSteps = new Set(
    evidence.map((t) =>
      JSON.stringify([t.arrangementId, t.sessionId, t.stepId]),
    ),
  );
  for (const task of evidence) {
    const { arrangement: a, session: s } = taskContext(task);
    const statusLabel =
      task.status === "awaiting_confirmation"
        ? "待教师确认"
        : task.status === "handling"
          ? "办理中"
          : "待办理";
    add({
      id: `evidence:${enc(task.id)}`,
      type: "evidence",
      title: task.kind === "retest" ? "线下补测待办" : "补充证据待办",
      detail: `${detail(a, s)} · ${task.stepName || task.stepId} · ${statusLabel}`,
      actionLabel:
        task.status === "awaiting_confirmation" ? "确认结果" : "办理",
      path: `/teacher/evidence-tasks/${enc(task.id)}`,
      sourceIds: source(a, s, { taskId: task.id, stepId: task.stepId }),
      status: task.status,
    });
  }
  for (const task of array(data.supportTasks)) {
    if (!["pending", "coaching", "awaiting_review"].includes(task.status))
      continue;
    const context = taskContext(task);
    if (!context) continue;
    const { arrangement: a, session: s } = context;
    add({
      id: `support:${enc(task.id)}`,
      type: "support",
      title: "学生辅导待办",
      detail: `${detail(a, s)} · ${task.status === "awaiting_review" ? "待复查" : task.status === "coaching" ? "辅导中" : "待辅导"}`,
      actionLabel: task.status === "awaiting_review" ? "复查结果" : "办理辅导",
      path: `/teacher/support-tasks/${enc(task.id)}`,
      sourceIds: source(a, s, { taskId: task.id }),
      status: task.status,
    });
  }
  for (const { arrangement: a, session: s } of contexts) {
    const stationPath = s.workstationId
      ? teacherStationTaskPath(a, s)
      : sessionReportPath(a, s);
    const confirmation = s.stepConfirmation;
    if (
      !a.archivedRecord &&
      a.status === "进行中" &&
      s.status === "进行中" &&
      confirmation?.status === "pending" &&
      confirmation.stepId === s.currentStepId &&
      array(s.steps).some((step) => step.id === confirmation.stepId)
    ) {
      add({
        id: `step:${enc(a.id)}:${enc(s.id)}:${enc(confirmation.id || confirmation.stepId)}`,
        type: "step",
        title: "本步流程待教师确认",
        detail: `${detail(a, s)} · ${confirmation.stepId}`,
        actionLabel: "确认流程",
        path: `${teacherStationTaskPath(a, s, confirmation.stepId)}#step-confirmation-${enc(confirmation.id || confirmation.stepId)}`,
        sourceIds: source(a, s, {
          confirmationId: confirmation.id || "",
          stepId: confirmation.stepId,
        }),
        status: "pending",
      });
    }
    if (
      !a.archivedRecord &&
      !["已结束", "待发布", "已发布", "已归档"].includes(a.status) &&
      !closedSession(s)
    ) {
      for (const request of sessionHelpRequests(s, a)) {
        if (
          !OPEN_HELP.includes(request.status) ||
          (request.teacherId && request.teacherId !== teacherId)
        )
          continue;
        add({
          id: `help:${enc(a.id)}:${enc(s.id)}:${enc(request.id)}`,
          type: "help",
          title: request.kind === "exam" ? "考试异常求助" : "练习求助",
          detail: `${name("workstations", s.workstationId)} · ${name("students", s.studentId)} · ${request.reasonLabel || "未记录原因"}`,
          actionLabel: request.status === "handling" ? "继续办理" : "接手处理",
          path: `${stationPath}#help-${enc(request.id)}`,
          sourceIds: source(a, s, {
            requestId: request.id,
            ...(request.stepId ? { stepId: request.stepId } : {}),
          }),
          status: request.status,
        });
      }
    }
    // A dedicated evidence/retest task owns its step; do not duplicate it as a generic review.
    const reviewSteps = array(s.steps).filter(
      (step) =>
        needReview(step) &&
        !evidenceSteps.has(JSON.stringify([a.id, s.id, step.id])),
    );
    const hasEvidence = evidence.some(
      (t) => t.arrangementId === a.id && t.sessionId === s.id,
    );
    if (
      a.status !== "已发布" &&
      s.resultStatus !== "已发布" &&
      !s.scoreFrozen &&
      s.resultStatus !== "未参加"
    ) {
      for (const step of reviewSteps) {
        add({
          id: `review:${enc(a.id)}:${enc(s.id)}:${enc(step.id)}`,
          type: "review",
          title:
            step.reviewStatus === "待补充证据"
              ? "步骤待补充证据"
              : "评价待复核",
          detail: `${detail(a, s)} · ${step.name || step.id}`,
          actionLabel: "处理复核",
          path: `${sessionReportPath(a, s)}&stepId=${enc(step.id)}`,
          sourceIds: source(a, s, { stepId: step.id }),
          status: "pending",
        });
      }
      if (s.resultStatus === "待复核" && !reviewSteps.length && !hasEvidence) {
        add({
          id: `review:${enc(a.id)}:${enc(s.id)}`,
          type: "review",
          title: "评价待复核",
          detail: detail(a, s),
          actionLabel: "处理复核",
          path: sessionReportPath(a, s),
          sourceIds: source(a, s),
          status: "pending",
        });
      }
    }
    const candidates = array(s.runtime?.safetyCandidates).filter(
      (c) => c.id && c.status === "pending",
    );
    const incidents = array(s.runtime?.technicalIncidents).filter(
      (i) => i.id && openStatus(i.status),
    );
    for (const candidate of candidates) {
      add({
        id: `safety:${enc(a.id)}:${enc(s.id)}:${enc(candidate.id)}`,
        type: "safety",
        title: "安全事件待处理",
        detail: `${detail(a, s)} · ${candidate.stepId || "会话"} · 待处理`,
        actionLabel: "查看状态",
        path: stationPath,
        sourceIds: source(a, s, {
          candidateId: candidate.id,
          ...(candidate.stepId ? { stepId: candidate.stepId } : {}),
        }),
        status: "pending",
        readOnly: true,
      });
    }
    for (const incident of incidents) {
      add({
        id: `technical:${enc(a.id)}:${enc(s.id)}:${enc(incident.id)}`,
        type: "technical",
        title: "技术异常待处理",
        detail: `${detail(a, s)} · ${incident.reason || incident.type || "技术异常"} · 待处理`,
        actionLabel: "查看状态",
        path: stationPath,
        sourceIds: source(a, s, {
          incidentId: incident.id,
          ...(incident.stepId ? { stepId: incident.stepId } : {}),
        }),
        status: "pending",
        readOnly: true,
      });
    }
    for (const event of teacherSessionEvents(s)) {
      if (
        !event.requiresAttention ||
        !["safety", "technical"].includes(event.category) ||
        !openStatus(event.status)
      )
        continue;
      if (
        (event.category === "safety" && candidates.length) ||
        (event.category === "technical" && incidents.length)
      )
        continue;
      add({
        id: `${event.category}-event:${enc(a.id)}:${enc(s.id)}:${enc(event.id)}`,
        type: event.category,
        title:
          event.category === "safety" ? "安全事件待处理" : "技术异常待处理",
        detail: `${detail(a, s)} · ${event.title} · 待处理`,
        actionLabel: "查看状态",
        path: stationPath,
        sourceIds: source(a, s, {
          eventId: event.id,
          ...(event.stepId ? { stepId: event.stepId } : {}),
        }),
        status: "pending",
        readOnly: true,
      });
    }
  }
  for (const a of arrangements.filter(
    (a) => a.type === "exam" && a.status === "待发布",
  )) {
    const count = array(a.sessions).filter(
      (s) => s.resultStatus === "正式成绩",
    ).length;
    add({
      id: `publish:${enc(a.id)}`,
      type: "publish",
      title: "考试待发布",
      detail: `${a.name || a.id} · 整场考试 · ${count} 份正式成绩待发布`,
      actionLabel: "查看成绩",
      path: `/teacher/exams/${enc(a.id)}/results`,
      sourceIds: source(a),
      status: "pending",
    });
  }
  for (const issue of array(data.issues)) {
    if (!issue.id || !openStatus(issue.status)) continue;
    const a = arrangements.find((a) => a.id === issue.arrangementId);
    if (!a) continue;
    const affected = array(a.sessions).filter((s) =>
      array(issue.sessionIds).includes(s.id),
    );
    // A linked runtime incident already supplies the same source's dashboard row.
    if (
      affected.some((s) =>
        array(s.runtime?.technicalIncidents).some(
          (i) =>
            openStatus(i.status) &&
            (i.issueId === issue.id || issue.incidentId === i.id),
        ),
      )
    )
      continue;
    add({
      id: `technical-issue:${enc(issue.id)}`,
      type: "technical",
      title: "技术异常待处理",
      detail: `${a.name || a.id} · ${issue.title || issue.type || issue.id} · ${issue.handlingStatus || "待处理"}`,
      actionLabel: "查看状态",
      path: affected[0]?.workstationId
        ? teacherStationTaskPath(a, affected[0])
        : `/teacher/${a.type === "exam" ? "exams" : "practices"}/${enc(a.id)}/live`,
      sourceIds: source(a, affected[0], {
        issueId: issue.id,
        sessionIds: affected.map((s) => s.id),
      }),
      status: "pending",
      readOnly: true,
    });
  }
  const priority = {
    safety: 0,
    technical: 1,
    help: 2,
    step: 3,
    evidence: 4,
    review: 5,
    support: 6,
    publish: 7,
  };
  return result.sort(
    (a, b) => priority[a.type] - priority[b.type] || a.id.localeCompare(b.id),
  );
}

// No wall-clock filter and no page-local placeholder: only live, locatable records.
export function adminCurrentArrangements(data = {}) {
  return array(data.arrangements)
    .filter(
      (a) =>
        a.id &&
        !a.archivedRecord &&
        !["草稿", "已取消", "已结束", "待发布", "已发布", "已归档"].includes(
          a.status,
        ) &&
        (["进行中", "已暂停", "可入场"].includes(a.status) ||
          array(a.sessions).some((s) => s.status === "可入场")),
    )
    .map((a) => ({
      ...a,
      path: `/admin/${a.type === "exam" ? "exams" : "practices"}/${enc(a.id)}`,
    }))
    .sort(
      (a, b) =>
        String(a.scheduleStart || "").localeCompare(
          String(b.scheduleStart || ""),
        ) || a.id.localeCompare(b.id),
    );
}
