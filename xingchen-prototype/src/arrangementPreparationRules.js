import { normalizeSessionClosure } from "./sessionClosureRules.js";
import { createSessionStepsFromSop } from "./domainRules.js";

const PREPARING = ["待开始", "准备中"];
const WAITING = ["待开始", "可入场"];
const TERMINAL = ["草稿", "已取消", "已结束", "待发布", "已发布", "已归档"];

// Existing sessions take precedence when reading legacy allocations; no history is rewritten.
export function arrangementAssignments(arrangement = {}) {
  if (Array.isArray(arrangement.stationAssignments))
    return arrangement.stationAssignments;
  const pairs = (arrangement.workstationIds || []).map((workstationId) => {
    const sessions = (arrangement.sessions || []).filter(
      (s) => s.workstationId === workstationId,
    );
    return {
      workstationId,
      studentId: sessions.length === 1 ? sessions[0].studentId : "",
    };
  });
  return reconcileAssignments(
    arrangement.studentIds || [],
    arrangement.workstationIds || [],
    pairs,
  );
}

export function reconcileAssignments(
  studentIds = [],
  workstationIds = [],
  previous = [],
) {
  const used = new Set();
  const pairs = workstationIds.map((workstationId) => {
    const old = previous.find((p) => p.workstationId === workstationId);
    const studentId =
      studentIds.includes(old?.studentId) && !used.has(old.studentId)
        ? old.studentId
        : "";
    if (studentId) used.add(studentId);
    return { workstationId, studentId };
  });
  return pairs.map((pair) => {
    if (pair.studentId) return pair;
    const studentId = studentIds.find((id) => !used.has(id)) || "";
    if (studentId) used.add(studentId);
    return { ...pair, studentId };
  });
}

export function allocationIssues(arrangement = {}) {
  const students = arrangement.studentIds || [],
    stations = arrangement.workstationIds || [];
  const pairs = arrangementAssignments(arrangement),
    issues = [];
  if (!students.length || !stations.length)
    issues.push("请至少选择一名学生和一个工位。");
  if (students.length !== stations.length)
    issues.push(
      `本次采用一人一工位：已选 ${students.length} 名学生、${stations.length} 个工位，请调整为数量一致。`,
    );
  if (
    new Set(students).size !== students.length ||
    new Set(stations).size !== stations.length
  )
    issues.push("学生或工位不能重复选择。");
  if (
    pairs.length !== stations.length ||
    new Set(pairs.map((p) => p.workstationId)).size !== stations.length ||
    pairs.some(
      (p) =>
        !stations.includes(p.workstationId) || !students.includes(p.studentId),
    ) ||
    new Set(pairs.map((p) => p.studentId)).size !== students.length
  )
    issues.push("请为每个工位分配一名不同的参与学生。");
  const sessions = arrangement.sessions || [];
  if (
    sessions.some(
      (s) =>
        !pairs.some(
          (p) =>
            p.workstationId === s.workstationId && p.studentId === s.studentId,
        ),
    ) ||
    new Set(sessions.map((s) => s.workstationId)).size !== sessions.length ||
    new Set(sessions.map((s) => s.studentId)).size !== sessions.length
  )
    issues.push(
      "历史会话与一人一工位分配不一致；保留已有记录，未开始安排请撤销准备后重新配置。",
    );
  return [...new Set(issues)];
}

export function assertAllocation(arrangement) {
  const issues = allocationIssues(arrangement);
  if (issues.length) throw new Error(issues.join("；"));
  return arrangementAssignments(arrangement);
}

export function studentAssignedToStation(arrangement, workstationId) {
  const pairs = assertAllocation(arrangement);
  const pair = pairs.find((p) => p.workstationId === workstationId);
  if (!pair) throw new Error("该工位没有有效的学生分配。");
  return pair.studentId;
}

export function sessionHasStarted(session = {}) {
  return Boolean(
    session.startedAt ||
      session.submittedAt ||
      session.endedAt ||
      ["正式成绩", "已发布", "待复核"].includes(session.resultStatus) ||
      (session.reviewHistory || []).length ||
      (session.runtime?.aiScoringApplications || []).length ||
      !WAITING.includes(session.status) ||
      Number(session.runtime?.evaluationClock?.elapsedSeconds || 0) > 0 ||
      (session.runtime?.aiObservations || []).length ||
      (session.runtime?.aiJudgementResults || []).length ||
      (session.runtime?.safetyCandidates || []).length ||
      (session.runtime?.technicalIncidents || []).length ||
      (session.steps || []).some(
        (s) =>
          !["pending", "waiting"].includes(s.state) ||
          ["active", "completed", "terminated", "paused"].includes(
            s.executionState,
          ),
      ),
  );
}

export function preparationActions(arrangement = {}) {
  const untouched = !(arrangement.sessions || []).some(sessionHasStarted);
  return {
    deleteDraft:
      arrangement.status === "草稿" &&
      !(arrangement.sessions || []).length &&
      !(arrangement.withdrawnSessions || []).length &&
      !hasLockedPreparationSnapshot(arrangement) &&
      !(arrangement.openWorkstationIds || []).length &&
      !arrangement.startedAt,
    cancel:
      PREPARING.includes(arrangement.status) &&
      !arrangement.startedAt &&
      untouched,
    withdraw:
      PREPARING.includes(arrangement.status) &&
      !arrangement.startedAt &&
      untouched &&
      (arrangement.openWorkstationIds || []).length > 0,
    edit:
      ["草稿", "待开始"].includes(arrangement.status) &&
      !(arrangement.sessions || []).length &&
      !(arrangement.openWorkstationIds || []).length,
    copy: arrangement.status === "已取消",
  };
}

export function hasLockedPreparationSnapshot(arrangement = {}) {
  return Boolean(
    arrangement.snapshot &&
      (arrangement.snapshot.lockedAt !== "历史记录" ||
        (arrangement.sessions || []).length ||
        (arrangement.openWorkstationIds || []).length ||
        (arrangement.withdrawnSessions || []).length ||
        arrangement.startedAt),
  );
}

function closeWaitingSession(session, reason, at, kind) {
  return normalizeSessionClosure({
    ...session,
    status: "已取消",
    resultStatus: "已取消",
    closedAt: at,
    closedReason: reason,
    closeKind: kind,
    runtime: {
      ...session.runtime,
      evaluationClock: {
        ...session.runtime?.evaluationClock,
        status: "stopped",
        pauseReason: reason,
      },
    },
    events: (session.events || []).map((e) =>
      e.requiresAttention
        ? {
            ...e,
            requiresAttention: false,
            handlingStatus: "closed",
            closedAt: at,
            closedReason: reason,
          }
        : e,
    ),
    ...(session.helpRequestedAt ? { helpRequestStatus: "closed" } : {}),
    ...(session.examIncidentHelpRequestedAt
      ? { examIncidentStatus: "closed" }
      : {}),
  });
}

// Transaction shared by the React provider and the isolated domain adapter.
export function changePreparation(
  data,
  {
    arrangementId,
    action,
    workstationId,
    reason = "",
    at,
    makeId,
    actor = "王老师",
  },
) {
  const arrangement = (data.arrangements || []).find(
    (a) => a.id === arrangementId,
  );
  if (!arrangement) throw new Error("安排已不存在，请刷新列表。");
  const allowed = preparationActions(arrangement);
  if (!allowed[action])
    throw new Error(
      "安排状态已变化，当前操作不允许；已开始的记录不能通过撤销准备删除。",
    );
  let updated,
    removedIds = [],
    targetStations = [],
    auditAction;
  const note = String(reason).trim();
  if (["cancel", "withdraw"].includes(action) && !note)
    throw new Error("请填写取消或撤销原因。");
  if (action === "deleteDraft") {
    const referenced = [
      data.issues || [],
      data.exportJobs || [],
      data.learningSamples || [],
    ].some((list) =>
      list.some(
        (r) =>
          r.arrangementId === arrangementId ||
          r.targetId === arrangementId ||
          r.sourceArrangementId === arrangementId,
      ),
    );
    if (referenced) throw new Error("该草稿已有业务引用，不能删除。");
    auditAction = "删除安排草稿";
  } else if (action === "copy") {
    const base = `${arrangement.name}（副本）`;
    let name = base,
      suffix = 2;
    while (
      data.arrangements.some(
        (a) => a.type === arrangement.type && a.name === name,
      )
    )
      name = `${base}${suffix++}`;
    updated = {
      id: makeId(arrangement.type),
      type: arrangement.type,
      teacherId: arrangement.teacherId,
      name,
      sopId: arrangement.sopId,
      scheduleStart: arrangement.scheduleStart,
      entryEnd: arrangement.entryEnd,
      ...(arrangement.type === "exam"
        ? { examDurationMinutes: arrangement.examDurationMinutes }
        : {}),
      studentIds: [...arrangement.studentIds],
      workstationIds: [...arrangement.workstationIds],
      stationAssignments: arrangementAssignments(arrangement).map((p) => ({
        ...p,
      })),
      allocationPolicy: "one_student_one_station",
      sessions: [],
      withdrawnSessions: [],
      openWorkstationIds: [],
      snapshot: null,
      status: "草稿",
      paused: false,
      startedAt: "",
      endedAt: "",
      copiedFrom: arrangementId,
      updatedAt: at,
      ...(arrangement.demoPackageId
        ? { demoPackageId: arrangement.demoPackageId }
        : {}),
    };
    auditAction = "复制已取消安排为草稿";
  } else {
    targetStations =
      action === "cancel"
        ? [...(arrangement.openWorkstationIds || [])]
        : [workstationId];
    if (
      action === "withdraw" &&
      !arrangement.openWorkstationIds.includes(workstationId)
    )
      throw new Error("该工位已经撤销或尚未开放。");
    const targets = (arrangement.sessions || []).filter((s) =>
      targetStations.includes(s.workstationId),
    );
    removedIds = targets.map((s) => s.id);
    const closed = targets.map((s) => closeWaitingSession(s, note, at, action));
    const history = [
      ...(arrangement.preparationHistory || []),
      {
        action,
        at,
        actor,
        reason: note,
        workstationIds: targetStations,
        sessionIds: removedIds,
      },
    ];
    if (action === "cancel") {
      updated = {
        ...arrangement,
        status: "已取消",
        cancelledAt: at,
        cancelledBy: actor,
        cancelReason: note,
        openWorkstationIds: [],
        sessions: (arrangement.sessions || []).map((s) =>
          closeWaitingSession(s, note, at, action),
        ),
        preparationHistory: history,
        updatedAt: at,
      };
      auditAction = "取消未开始安排";
    } else {
      const remaining = arrangement.openWorkstationIds.filter(
        (id) => id !== workstationId,
      );
      updated = {
        ...arrangement,
        status: remaining.length ? "准备中" : "待开始",
        openWorkstationIds: remaining,
        sessions: arrangement.sessions.filter(
          (s) => !removedIds.includes(s.id),
        ),
        withdrawnSessions: [
          ...(arrangement.withdrawnSessions || []),
          ...closed,
        ],
        preparationHistory: history,
        updatedAt: at,
      };
      auditAction = "撤销未开始工位准备";
    }
  }
  const basePath = `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}`;
  const workstations = (data.workstations || []).map((w) => {
    if (!targetStations.includes(w.id)) return w;
    const otherOwner = data.arrangements.some(
      (a) =>
        a.id !== arrangementId &&
        !TERMINAL.includes(a.status) &&
        (a.openWorkstationIds || []).includes(w.id),
    );
    const owns = w.currentArrangementId
      ? w.currentArrangementId === arrangementId
      : w.currentArrangement === arrangement.name;
    if (!owns || otherOwner) return w;
    return {
      ...w,
      currentArrangement: "无",
      currentArrangementId: "",
      status: ["故障", "维护中", "停用"].includes(w.status)
        ? w.status
        : "可入场",
      updatedAt: at,
    };
  });
  const notifications = (data.notifications || []).map((n) => {
    const related =
      n.arrangementId === arrangementId ||
      n.path?.includes(`/${arrangementId}/`) ||
      n.path?.endsWith(`/${arrangementId}`);
    const affected =
      action !== "withdraw" ||
      removedIds.includes(n.sessionId) ||
      n.path?.endsWith(`/stations/${workstationId}`) ||
      n.path?.endsWith(`/session/${arrangementId}/${workstationId}`);
    if (!related || !affected || action === "copy") return n;
    return {
      ...n,
      read: true,
      businessClosedAt: at,
      businessClosedReason: note || "草稿已删除",
      path:
        action === "deleteDraft"
          ? basePath
          : `${basePath}/${arrangementId}/prep`,
      detail: `${n.detail || ""}（${action === "withdraw" ? "工位准备已撤销" : "安排已取消或删除"}）`,
    };
  });
  const sessionIds = new Set(removedIds);
  const closeTask = (task) => {
    const related =
      task.arrangementId === arrangementId &&
      (action !== "withdraw" ||
        sessionIds.has(task.sessionId) ||
        task.workstationId === workstationId);
    return related &&
      ![
        "completed",
        "closed",
        "cancelled",
        "已完成",
        "已关闭",
        "已取消",
      ].includes(task.status)
      ? { ...task, status: "closed", closedAt: at, closeReason: note }
      : task;
  };
  const next = {
    ...data,
    arrangements:
      action === "copy"
        ? [updated, ...data.arrangements]
        : action === "deleteDraft"
          ? data.arrangements.filter((a) => a.id !== arrangementId)
          : data.arrangements.map((a) =>
              a.id === arrangementId ? updated : a,
            ),
    workstations,
    notifications,
    auditLogs: [
      {
        id: makeId("log"),
        time: at,
        actor,
        role: "教师",
        action: auditAction,
        target: `${arrangement.name} / ${workstationId || arrangementId}`,
        result: "成功",
        reason: note,
        arrangementId,
        before: arrangement.status,
        after: updated?.status || "已删除",
      },
      ...(data.auditLogs || []),
    ],
  };
  for (const key of ["helpRequests", "teacherTasks"])
    if (Array.isArray(data[key]) && action !== "copy")
      next[key] = data[key].map(closeTask);
  return { data: next, arrangement: updated || null };
}

export function addAbsentParticipants(arrangement, { at, makeId }) {
  const covered = new Set((arrangement.sessions || []).map((s) => s.studentId));
  const missing = [...new Set(arrangement.studentIds || [])].filter(
    (id) => !covered.has(id),
  );
  const pairs = arrangementAssignments(arrangement);
  const sop = arrangement.snapshot?.sopSnapshot;
  return [
    ...(arrangement.sessions || []),
    ...missing.map((studentId) => ({
      id: makeId("session-absent"),
      studentId,
      workstationId:
        pairs.find((p) => p.studentId === studentId)?.workstationId || "",
      status: "未参加",
      resultStatus: "未参加",
      score: 0,
      elapsed: "00:00:00",
      currentStepId: "",
      endedAt: at,
      absenceReason: "安排结束时未产生该学生的操作会话",
      steps: createSessionStepsFromSop(sop?.steps || []),
      reviewHistory: [],
      events: [],
      recording: {
        status: "不可用",
        fullVideoAvailable: false,
        note: "未参加，无操作录像",
      },
    })),
  ];
}

export function reportSession(arrangement, studentId, sessionId) {
  const candidates = (arrangement?.sessions || []).filter(
    (s) => s.studentId === studentId,
  );
  if (sessionId) return candidates.find((s) => s.id === sessionId) || null;
  return candidates.length === 1 ? candidates[0] : null;
}

export function sessionReportPath(arrangement, session, role = "teacher") {
  return `/${role}/${arrangement.type === "exam" ? "exams" : "practices"}/${arrangement.id}/students/${session.studentId}?sessionId=${encodeURIComponent(session.id)}`;
}
