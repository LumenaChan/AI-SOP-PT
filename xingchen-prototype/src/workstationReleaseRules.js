const ENDED_ARRANGEMENTS = ["已结束", "待发布", "已发布", "已归档", "已取消"];
const ENDED_SESSIONS = ["已完成", "待复位", "已复位", "已取消"];

export function workstationSessionEnded(arrangement, session) {
  return (
    ENDED_ARRANGEMENTS.includes(arrangement.status) ||
    ENDED_SESSIONS.includes(session.status)
  );
}

// Post-finish review may update a finding, but cannot restart a released station.
export function preserveClosedSessionExecution(arrangement, original, updated) {
  if (!workstationSessionEnded(arrangement, original)) return updated;
  return {
    ...updated,
    status: original.status,
    currentStepId: original.currentStepId,
    examTiming: original.examTiming,
    steps: (updated.steps || []).map((step) => {
      const before = original.steps?.find((s) => s.id === step.id);
      return before
        ? {
            ...step,
            state: before.state,
            executionState: before.executionState,
            observationWindow: before.observationWindow,
            flowCompletion: before.flowCompletion,
            completionResult: before.completionResult,
          }
        : step;
    }),
    runtime: {
      ...updated.runtime,
      evaluationClock: {
        ...original.runtime?.evaluationClock,
        status: "stopped",
      },
    },
  };
}

export function workstationUsageRestriction(workstation) {
  if (workstation?.releaseHold)
    return workstation.releaseHold.reasons.join("；");
  return ["故障", "维护中", "停用"].includes(workstation?.status)
    ? `工位当前${workstation.status}`
    : "";
}

function sessionRestrictions(session, arrangement) {
  if (session.workstationRelease?.resolution) return [];
  const reasons = [];
  const rules =
    session.evaluationSnapshot?.sopSnapshot?.safetyRules ||
    arrangement.snapshot?.sopSnapshot?.safetyRules ||
    [];
  if (
    (session.steps || []).some(
      (step) =>
        step.state === "blocked" ||
        step.redlineConfirmed ||
        step.executionState === "terminated" ||
        (step.result === "安全违规已确认" && step.executionState === "paused"),
    )
  )
    reasons.push("安全阻断尚未解除");
  if (
    (session.runtime?.safetyCandidates || []).some(
      (candidate) =>
        candidate.status === "pending" ||
        (candidate.status === "confirmed" &&
          rules.find((r) => r.id === candidate.safetyRuleId)
            ?.sessionTreatment !== "continue_after_review"),
    )
  )
    reasons.push("存在待处理的安全事件");
  if (
    session.status === "故障" ||
    (session.runtime?.technicalIncidents || []).some(
      (incident) =>
        incident.status !== "resolved" && incident.affectsContinuation === true,
    )
  )
    reasons.push("存在未恢复的设备或技术异常");
  return reasons;
}

function owns(workstation, arrangement) {
  return workstation.currentArrangementId
    ? workstation.currentArrangementId === arrangement.id
    : workstation.currentArrangement &&
        workstation.currentArrangement !== "无" &&
        workstation.currentArrangement === arrangement.name;
}

export function activeWorkstationUse(data, workstationId) {
  const workstation = (data.workstations || []).find(
    (w) => w.id === workstationId,
  );
  return (data.arrangements || []).some(
    (a) =>
      !ENDED_ARRANGEMENTS.includes(a.status) &&
      ((a.sessions || []).some(
        (s) =>
          s.workstationId === workstationId &&
          !ENDED_SESSIONS.includes(s.status),
      ) ||
        (workstation &&
          owns(workstation, a) &&
          !(a.sessions || []).some((s) => s.workstationId === workstationId))),
  );
}

// A shared persistence rule covers individual finish, exam timeout, whole-class
// finish and legacy loading. Never infer that releasing a reservation proves
// the physical workstation has been reset.
export function normalizeWorkstationReleaseData(data) {
  let arrangements = data.arrangements || [];
  const auditLogs = [...(data.auditLogs || [])];
  const workstations = (data.workstations || []).map((workstation) => {
    const owners = arrangements.filter((a) => owns(workstation, a));
    if (owners.length !== 1) return workstation;
    const arrangement = owners[0];
    const session = (arrangement.sessions || []).find(
      (s) => s.workstationId === workstation.id,
    );
    if (
      session
        ? !workstationSessionEnded(arrangement, session)
        : !ENDED_ARRANGEMENTS.includes(arrangement.status)
    )
      return workstation;
    // Stale history must never release a station already opened by another class.
    if (
      arrangements.some(
        (a) =>
          a.id !== arrangement.id &&
          !ENDED_ARRANGEMENTS.includes(a.status) &&
          (a.sessions || []).some(
            (s) =>
              s.workstationId === workstation.id &&
              !ENDED_SESSIONS.includes(s.status),
          ),
      )
    )
      return workstation;
    const at =
      session?.endedAt ||
      session?.closedAt ||
      arrangement.endedAt ||
      arrangement.cancelledAt ||
      "";
    const reasons = [
      ...new Set([
        ...(session ? sessionRestrictions(session, arrangement) : []),
        ...(["故障", "维护中", "停用"].includes(workstation.status)
          ? [`工位当前${workstation.status}`]
          : []),
      ]),
    ];
    const hold = reasons.length
      ? {
          id: `release-hold:${arrangement.id}:${session?.id || workstation.id}:${JSON.stringify(reasons)}`,
          arrangementId: arrangement.id,
          sessionId: session?.id || "",
          reasons,
          createdAt: at,
        }
      : null;
    const record = {
      ...session?.workstationRelease,
      status: hold ? "held" : "released",
      mode: "automatic",
      at: session?.workstationRelease?.at || at,
      reasons,
    };
    if (session)
      arrangements = arrangements.map((a) =>
        a.id === arrangement.id
          ? {
              ...a,
              sessions: a.sessions.map((s) =>
                s.id === session.id
                  ? {
                      ...s,
                      // Legacy normal waiting-for-reset records no longer require a command.
                      status:
                        !hold && s.status === "待复位" ? "已完成" : s.status,
                      workstationRelease: record,
                    }
                  : s,
              ),
            }
          : a,
      );
    const auditId = `workstation-release:${arrangement.id}:${session?.id || workstation.id}:${hold ? "held" : "released"}`;
    if (!auditLogs.some((entry) => entry.id === auditId))
      auditLogs.push({
        id: auditId,
        actor: "system",
        role: "系统",
        result: "成功",
        action: hold ? "结束后保留工位使用限制" : "结束后自动释放工位占用",
        target: `${arrangement.name} / ${workstation.name}`,
        detail: reasons.join("；") || "解除安排占用；现场准备在下次开放前确认",
        time: at,
        createdAt: at,
      });
    return {
      ...workstation,
      releaseHold: hold,
      ...(hold
        ? {}
        : {
            currentArrangement: "无",
            currentArrangementId: "",
            status: "可入场",
          }),
    };
  });
  return { ...data, arrangements, workstations, auditLogs };
}

// Only an explicit administrator recovery may clear an exceptional hold.
// The token prevents a stale recovery dialog from acting on a newer incident.
export function resolveWorkstationRestriction(
  data,
  { workstationId, expectedHoldId, note, actorId, at },
) {
  const workstation = (data.workstations || []).find(
    (w) => w.id === workstationId,
  );
  if (!workstation) throw new Error("工位不存在或已失效。");
  if (activeWorkstationUse(data, workstationId))
    throw new Error(
      "工位仍有未结束会话，请先结束会话；不能解除正在使用的工位占用。",
    );
  if (
    (workstation.currentArrangementId ||
      (workstation.currentArrangement &&
        workstation.currentArrangement !== "无")) &&
    !(data.arrangements || []).some((a) => owns(workstation, a))
  )
    throw new Error("当前占用来源无法确认，请先核对占用记录。");
  if ((workstation.releaseHold?.id || "") !== (expectedHoldId || ""))
    throw new Error("工位异常已变化，请重新打开处理。");
  if (!workstationUsageRestriction(workstation))
    throw new Error("工位无需手动释放，正常结束后会自动释放。");
  if (!String(note || "").trim())
    throw new Error("请填写异常处理及现场检查结果。");
  if (["维护中", "停用"].includes(workstation.status))
    throw new Error("请先完成维护并恢复工位，再解除使用限制。");
  const heldSession = (data.arrangements || [])
    .find((a) => a.id === workstation.releaseHold?.arrangementId)
    ?.sessions?.find((s) => s.id === workstation.releaseHold?.sessionId);
  if (
    heldSession?.runtime?.safetyCandidates?.some((c) => c.status === "pending")
  )
    throw new Error("请先由教师完成待处理安全事件的确认，再解除工位使用限制。");
  const resolution = { at, actorId, note: note.trim() };
  const next = {
    ...data,
    arrangements: (data.arrangements || []).map((a) =>
      a.id === workstation.releaseHold?.arrangementId
        ? {
            ...a,
            sessions: (a.sessions || []).map((s) =>
              s.id === workstation.releaseHold.sessionId
                ? {
                    ...s,
                    workstationRelease: {
                      ...s.workstationRelease,
                      status: "released",
                      resolution,
                    },
                    runtime: {
                      ...s.runtime,
                      technicalIncidents: (
                        s.runtime?.technicalIncidents || []
                      ).map((incident) =>
                        incident.status !== "resolved" &&
                        incident.affectsContinuation === true
                          ? {
                              ...incident,
                              status: "resolved",
                              resolvedAt: at,
                              resolvedBy: actorId,
                              resolutionNote: note.trim(),
                            }
                          : incident,
                      ),
                    },
                    // Retain fault/safety evidence and grades; this is only a resource decision.
                  }
                : s,
            ),
          }
        : a,
    ),
    workstations: data.workstations.map((w) =>
      w.id === workstationId
        ? {
            ...w,
            releaseHold: null,
            status: "可入场",
            currentArrangement: "无",
            currentArrangementId: "",
            updatedAt: at,
          }
        : w,
    ),
    auditLogs: [
      ...(data.auditLogs || []),
      {
        id: `workstation-recovery:${workstationId}:${at}`,
        actor: actorId,
        role: "管理员",
        action: "处理异常并解除工位使用限制",
        target: workstation.name,
        detail: note.trim(),
        time: at,
        createdAt: at,
        result: "成功",
      },
    ],
  };
  return next;
}
