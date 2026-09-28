import {
  ARRANGEMENT_MANUAL_PAUSE_REASON,
  createOpenedAiSession,
  deriveAiRuntimeGate,
  getSessionResumeBlocker,
  resolveAiSafetyCandidate,
  SESSION_MANUAL_PAUSE_REASON,
  simulateAiConditionOnSession,
  startAiRuntimeSession,
  updateAiCorrectionContext,
} from "./aiRuntimeRules.js";
import {
  createSessionStepsFromSop,
  isSopAvailableForNewArrangement,
} from "./domainRules.js";
import { normalizeWorkstationAiBaseConfig } from "./workstationAiRules.js";
import {
  appendStudentHelpRequestToSession,
  appendStudentHintRequestToSession,
  attachStudentVerificationToSession,
} from "./studentPracticeRules.js";
import {
  appendExamIncidentHelpRequest,
  buildExamIncidentPayload,
  createExamTiming,
  transitionExamTiming,
  validateExamDuration,
} from "./studentExamRules.js";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function requiredCollections(data = {}) {
  return {
    ...data,
    sops: Array.isArray(data.sops) ? data.sops : [],
    aiCapabilities: Array.isArray(data.aiCapabilities)
      ? data.aiCapabilities
      : [],
    aiCapabilityConfigs: Array.isArray(data.aiCapabilityConfigs)
      ? data.aiCapabilityConfigs
      : [],
    sopWorkstationAiConfigs: Array.isArray(data.sopWorkstationAiConfigs)
      ? data.sopWorkstationAiConfigs
      : [],
    workstations: Array.isArray(data.workstations) ? data.workstations : [],
    devices: Array.isArray(data.devices) ? data.devices : [],
    students: Array.isArray(data.students) ? data.students : [],
    teachers: Array.isArray(data.teachers) ? data.teachers : [],
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    arrangements: Array.isArray(data.arrangements) ? data.arrangements : [],
  };
}

function replaceArrangement(data, arrangement) {
  return {
    ...data,
    arrangements: data.arrangements.map((item) =>
      item.id === arrangement.id ? arrangement : item,
    ),
  };
}

/**
 * Synchronous domain Store for the new AI runtime. The React prototype Store
 * uses the same runtime commands; this adapter makes the complete public
 * business flow directly testable without mounting UI components.
 */
export function createAiRuntimeStore(initialData = {}, options = {}) {
  let data = requiredCollections(clone(initialData));
  let sequence = 0;
  const now = options.now || (() => new Date().toISOString());
  const makeId =
    options.makeId ||
    ((prefix) => {
      sequence += 1;
      return `${prefix}-${sequence}`;
    });

  const gateFor = (sopId, workstationId) =>
    deriveAiRuntimeGate({
      ...data,
      sopId,
      workstationId,
    });

  const store = {
    getData() {
      return clone(data);
    },

    getWorkstationReadiness(arrangementId, workstationId) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const workstation = data.workstations.find(
        (item) => item.id === workstationId,
      );
      const errors = [];
      if (!arrangement || !workstation) errors.push("安排或工位不存在");
      if (arrangement && !arrangement.workstationIds.includes(workstationId))
        errors.push("该工位不在本次安排的已选范围内");
      if (["故障", "维护中", "停用"].includes(workstation?.status))
        errors.push(workstation.notes || `工位当前状态为${workstation.status}`);
      const gate = arrangement
        ? gateFor(arrangement.sopId, workstationId)
        : { enabled: false, reasons: ["安排不存在"] };
      const baseConfig = normalizeWorkstationAiBaseConfig(workstation || {});
      const checks = ["node", "mainCamera", "cache"];
      if (baseConfig.fallbackCameraId) checks.splice(2, 0, "assistCamera");
      return {
        ok: errors.length === 0,
        errors,
        warnings: [...new Set(gate.reasons || [])],
        gate,
        checks,
      };
    },

    saveArrangement(input, finalize = false) {
      const existing = input.id
        ? data.arrangements.find((item) => item.id === input.id)
        : null;
      if (input.id && !existing) throw new Error("安排不存在或已失效。");
      const name = input.name?.trim();
      if (!name) throw new Error("请填写安排名称。");
      const sop = data.sops.find((item) => item.id === input.sopId);
      if (!isSopAvailableForNewArrangement(sop))
        throw new Error("只能选择已发布且未停用的 SOP。");
      if (finalize && !input.studentIds?.length)
        throw new Error("至少选择一名参与学生。");
      if (finalize && !input.workstationIds?.length)
        throw new Error("至少选择一个可用工位。");
      const saved = {
        ...(existing || {}),
        ...clone(input),
        id: existing?.id || makeId(input.type === "exam" ? "exam" : "practice"),
        name,
        status: finalize ? "待开始" : "草稿",
        openWorkstationIds: existing?.openWorkstationIds || [],
        snapshot: existing?.snapshot || null,
        sessions: existing?.sessions || [],
        paused: false,
        startedAt: existing?.startedAt || "",
        endedAt: existing?.endedAt || "",
        updatedAt: now(),
        ...(input.type === "exam"
          ? {
              examDurationMinutes: validateExamDuration(
                input.examDurationMinutes,
              ),
            }
          : {}),
      };
      data = {
        ...data,
        arrangements: existing
          ? data.arrangements.map((item) =>
              item.id === saved.id ? saved : item,
            )
          : [saved, ...data.arrangements],
      };
      return clone(saved);
    },

    openArrangementWorkstation(arrangementId, workstationId, checklist) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      if (!arrangement) throw new Error("安排不存在或已失效。");
      if (arrangement.openWorkstationIds.includes(workstationId))
        throw new Error("该工位已开放，无需重复检查。");
      const readiness = store.getWorkstationReadiness(
        arrangementId,
        workstationId,
      );
      if (!readiness.ok) throw new Error(readiness.errors.join("；"));
      if (readiness.checks.some((key) => checklist?.[key] !== true))
        throw new Error("请逐项确认设备、画面和本地缓存。");
      const sop = data.sops.find((item) => item.id === arrangement.sopId);
      if (!sop) throw new Error("当前安排引用的SOP不存在或已失效。");
      const lockedAt = now();
      const snapshot = arrangement.snapshot?.sopSnapshot
        ? arrangement.snapshot
        : {
            sopId: sop.id,
            sopSnapshot: clone(sop),
            lockedAt,
          };
      const assigned = new Set(
        arrangement.sessions.map((session) => session.studentId),
      );
      const studentId =
        arrangement.studentIds.find((id) => !assigned.has(id)) ||
        arrangement.studentIds[0];
      const sessionId = makeId("session");
      const session = createOpenedAiSession({
        id: sessionId,
        workstationId,
        studentId,
        gate: readiness.gate,
        lockedAt,
        steps: createSessionStepsFromSop(sop.steps),
        recording: { status: "不可用", startedAt: "尚未开始" },
      });
      const openedSession =
        arrangement.type === "exam"
          ? {
              ...session,
              examDurationMinutes: arrangement.examDurationMinutes,
            }
          : session;
      const updated = {
        ...arrangement,
        status: arrangement.status === "待开始" ? "准备中" : arrangement.status,
        snapshot,
        openWorkstationIds: [
          ...new Set([...arrangement.openWorkstationIds, workstationId]),
        ],
        sessions: [...arrangement.sessions, openedSession],
        updatedAt: now(),
      };
      data = replaceArrangement(data, updated);
      return clone({ snapshot, session: openedSession });
    },

    startArrangement(id) {
      const arrangement = data.arrangements.find((item) => item.id === id);
      if (!arrangement) throw new Error("安排不存在或已失效。");
      if (!arrangement.snapshot || !arrangement.openWorkstationIds.length)
        throw new Error("至少检查并开放一个工位后才能开始安排。");
      const startedAt = now();
      const sessions = arrangement.sessions.map((session) =>
        session.status === "可入场"
          ? { ...session, status: "待开始" }
          : session,
      );
      const updated = {
        ...arrangement,
        status: "进行中",
        paused: false,
        startedAt: arrangement.startedAt || startedAt,
        sessions,
        updatedAt: startedAt,
      };
      data = replaceArrangement(data, updated);
      return clone(updated);
    },

    startWorkstationSession(arrangementId, workstationId) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      if (arrangement.status !== "进行中")
        throw new Error("教师尚未开始安排或当前安排已暂停，暂不能开始。");
      if (!["待开始", "可入场"].includes(session.status))
        throw new Error("当前会话已经开始或结束，不能重复开始。");
      const startedAt = now();
      const startedRuntimeSession = startAiRuntimeSession(session, startedAt);
      const updatedSession =
        arrangement.type === "exam"
          ? {
              ...startedRuntimeSession,
              examDurationMinutes: arrangement.examDurationMinutes,
              examTiming: createExamTiming({
                durationMinutes: arrangement.examDurationMinutes,
                startedAt,
                now: startedAt,
              }),
              events: [
                {
                  id: makeId("exam-event"),
                  type: "exam_started",
                  title: "考试开始",
                  detail: "考试计时已开始，时长已按本次安排锁定。",
                  createdAt: startedAt,
                  time: startedAt.slice(11, 16),
                  level: "info",
                  scoreImpact: "none",
                },
                ...(startedRuntimeSession.events || []),
              ],
            }
          : startedRuntimeSession;
      const updated = {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: startedAt,
      };
      data = replaceArrangement(data, updated);
      return clone(updatedSession);
    },

    attachStudentIdentityVerification(
      arrangementId,
      workstationId,
      verification,
    ) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      const verifiedAt = verification?.verifiedAt || now();
      const updatedSession = attachStudentVerificationToSession(
        session,
        { ...verification, verifiedAt },
        { id: makeId("student-identity"), createdAt: verifiedAt },
      );
      if (updatedSession !== session)
        data = replaceArrangement(data, {
          ...arrangement,
          sessions: arrangement.sessions.map((item) =>
            item.workstationId === workstationId ? updatedSession : item,
          ),
          updatedAt: verifiedAt,
        });
      return clone(updatedSession.identityVerification);
    },

    recordStudentHintRequest(arrangementId, workstationId, stepId) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      const createdAt = now();
      const updatedSession = appendStudentHintRequestToSession(
        session,
        stepId,
        {
          id: makeId("student-hint"),
          createdAt,
        },
      );
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: createdAt,
      });
      return clone(updatedSession.events[0]);
    },

    requestTeacherHelp(arrangementId, workstationId, payload = {}) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      if (arrangement.type === "exam")
        throw new Error("考试会话请使用考试异常求助。");
      const createdAt = now();
      const updatedSession = appendStudentHelpRequestToSession(
        session,
        payload,
        {
          id: makeId("student-help"),
          createdAt,
        },
      );
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: createdAt,
      });
      return clone(updatedSession.events[0]);
    },

    requestExamIncidentHelp(arrangementId, workstationId, input = {}) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      if (arrangement.type !== "exam")
        throw new Error("只有考试会话可以提交考试异常求助。");
      const createdAt = now();
      const payload = buildExamIncidentPayload(input.reasonCode, input.note);
      const updatedSession = appendExamIncidentHelpRequest(
        session,
        workstationId,
        payload,
        { id: makeId("exam-incident"), createdAt },
      );
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: createdAt,
      });
      return clone(updatedSession.events[0]);
    },

    setArrangementPaused(id, paused) {
      const arrangement = data.arrangements.find((item) => item.id === id);
      if (!arrangement || !["进行中", "已暂停"].includes(arrangement.status))
        throw new Error("只有进行中的安排可以暂停或恢复。");
      const changedAt = now();
      const sessions = arrangement.sessions.map((session) => {
        if (paused && session.status === "进行中")
          return {
            ...session,
            status: "已暂停",
            ...(arrangement.type === "exam"
              ? { examTiming: transitionExamTiming(session, true, changedAt) }
              : {}),
            runtime: {
              ...(session.runtime || {}),
              evaluationClock: {
                ...(session.runtime?.evaluationClock || {}),
                status: "paused",
                pauseReason: ARRANGEMENT_MANUAL_PAUSE_REASON,
              },
            },
          };
        if (
          !paused &&
          session.status === "已暂停" &&
          !getSessionResumeBlocker(session, ARRANGEMENT_MANUAL_PAUSE_REASON)
        )
          return {
            ...session,
            status: "进行中",
            ...(arrangement.type === "exam"
              ? { examTiming: transitionExamTiming(session, false, changedAt) }
              : {}),
            runtime: {
              ...(session.runtime || {}),
              evaluationClock: {
                ...(session.runtime?.evaluationClock || {}),
                status: "running",
                pauseReason: "",
              },
            },
          };
        return session;
      });
      const updated = {
        ...arrangement,
        status: paused ? "已暂停" : "进行中",
        paused,
        sessions,
        updatedAt: changedAt,
      };
      data = replaceArrangement(data, updated);
      return clone(updated);
    },

    setArrangementSessionPaused(arrangementId, workstationId, paused) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (
        !arrangement ||
        !session ||
        (paused ? session.status !== "进行中" : session.status !== "已暂停")
      )
        throw new Error("当前学生会话不能暂停或恢复。");
      if (!paused) {
        const blocker = getSessionResumeBlocker(
          session,
          SESSION_MANUAL_PAUSE_REASON,
        );
        if (blocker) throw new Error(blocker.message);
      }
      const changedAt = now();
      const updatedSession = {
        ...session,
        status: paused ? "已暂停" : "进行中",
        ...(arrangement.type === "exam"
          ? { examTiming: transitionExamTiming(session, paused, changedAt) }
          : {}),
        runtime: {
          ...(session.runtime || {}),
          evaluationClock: {
            ...(session.runtime?.evaluationClock || {}),
            status: paused ? "paused" : "running",
            pauseReason: paused ? SESSION_MANUAL_PAUSE_REASON : "",
          },
        },
      };
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: changedAt,
      });
      return updatedSession.status;
    },

    finishWorkstationSession(arrangementId, workstationId, options = {}) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      const exam = arrangement.type === "exam";
      const submitReason = exam
        ? options.reason === "time_expired"
          ? "time_expired"
          : "manual_submit"
        : "student_finished";
      if (
        exam &&
        submitReason === "time_expired" &&
        session.status === "已完成"
      )
        return clone({ session, idempotent: true });
      if (!["进行中", "已暂停"].includes(session.status))
        throw new Error("当前会话不能重复结束。");
      const endedAt = now();
      const updatedSession = {
        ...session,
        status: "已完成",
        currentStepId: "",
        endedAt,
        resultStatus: exam ? "待发布" : "正式成绩",
        ...(exam
          ? {
              submitReason,
              submittedAt: endedAt,
              ...(submitReason === "time_expired"
                ? { autoSubmittedAt: endedAt }
                : {}),
              examTiming: transitionExamTiming(session, true, endedAt),
            }
          : {}),
        runtime: {
          ...(session.runtime || {}),
          evaluationClock: {
            ...(session.runtime?.evaluationClock || {}),
            status: "stopped",
            pauseReason: "",
          },
        },
        events: [
          {
            id: makeId("session-event"),
            type: exam
              ? submitReason === "time_expired"
                ? "exam_auto_submitted"
                : "exam_manual_submitted"
              : "student_finished",
            createdAt: endedAt,
            time: endedAt.slice(11, 16),
            level: submitReason === "time_expired" ? "warning" : "green",
            title:
              submitReason === "time_expired"
                ? "考试时间到，系统自动交卷"
                : exam
                  ? "学生主动交卷"
                  : "学生主动结束会话",
            detail: "当前步骤、计时与现场记录已保存。",
            scoreImpact: "none",
          },
          ...(session.events || []),
        ],
      };
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: endedAt,
      });
      return clone({ session: updatedSession, idempotent: false });
    },

    simulateAiCondition(
      arrangementId,
      workstationId,
      judgementItemId,
      conditionId,
    ) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      const result = simulateAiConditionOnSession({
        session,
        judgementItemId,
        conditionId,
        sopSnapshot:
          session.evaluationSnapshot?.sopSnapshot ||
          data.sops.find((item) => item.id === arrangement.sopId),
        when: now(),
        makeId,
      });
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? result.updatedSession : item,
        ),
        updatedAt: now(),
      });
      return clone(result);
    },

    setCorrectionContext(arrangementId, workstationId, action, ruleId = "") {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      const updatedSession = updateAiCorrectionContext({
        session,
        action,
        ruleId,
        sopSnapshot:
          session.evaluationSnapshot?.sopSnapshot ||
          data.sops.find((item) => item.id === arrangement.sopId),
        when: now(),
      });
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: now(),
      });
      return clone(updatedSession);
    },

    resolveSafetyCandidate(
      arrangementId,
      workstationId,
      candidateId,
      resolution,
    ) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) => item.workstationId === workstationId,
      );
      if (!arrangement || !session)
        throw new Error("工位会话不存在或尚未开放。");
      const updatedSession = resolveAiSafetyCandidate({
        session,
        candidateId,
        resolution,
        sopSnapshot:
          session.evaluationSnapshot?.sopSnapshot ||
          data.sops.find((item) => item.id === arrangement.sopId),
        when: now(),
      });
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.workstationId === workstationId ? updatedSession : item,
        ),
        updatedAt: now(),
      });
      return clone(updatedSession);
    },
  };

  return store;
}
