import {
  deriveOpeningInspection,
  assertOpeningInspection,
  openingEvaluationGate,
} from "./workstationOpeningRules.js";
import { captureStudentSnapshot } from "./statisticsCommonRules.js";
import {
  changeSupportTask,
  normalizeSupportTasksData,
} from "./supportTaskRules.js";
import {
  reviseSessionGrade,
  applyGradeLifecycle,
} from "./gradeRevisionRules.js";
import {
  changeEvidenceTask,
  normalizeEvidenceTasksData,
} from "./evidenceTaskRules.js";
import { assertFrozenGradeWrite } from "./frozenGradeWriteRules.js";
import {
  resolveWorkstationRestriction,
  workstationUsageRestriction,
  workstationSessionEnded,
  preserveClosedSessionExecution,
} from "./workstationReleaseRules.js";
import {
  changeSessionClosure,
  normalizeClosureData,
} from "./sessionClosureRules.js";
import { finalizeSubmittedStep } from "./visualEvaluationRules.js";
import {
  arrangementAssignments,
  assertAllocation,
  allocationIssues,
  preparationActions,
  hasLockedPreparationSnapshot,
  studentAssignedToStation,
  changePreparation,
} from "./arrangementPreparationRules.js";
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
  calculateScoreEngine,
  isSopAvailableForNewArrangement,
  requiresMandatoryReview,
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
  return assertFrozenGradeWrite(
    data,
    normalizeSupportTasksData(
      normalizeEvidenceTasksData(
        normalizeClosureData({
          ...data,
          arrangements: data.arrangements.map((item) =>
            item.id === arrangement.id ? arrangement : item,
          ),
        }),
      ),
    ),
  );
}

/**
 * Synchronous domain Store for the new AI runtime. The React prototype Store
 * uses the same runtime commands; this adapter makes the complete public
 * business flow directly testable without mounting UI components.
 */
export function createAiRuntimeStore(initialData = {}, options = {}) {
  let data = normalizeClosureData(requiredCollections(clone(initialData)));
  let sequence = 0;
  const openingInspections = new Map();
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

  const runSessionClosureAtStation = (
    arrangementId,
    workstationId,
    payload,
    exam,
  ) => {
    const a = data.arrangements.find((a) => a.id === arrangementId);
    const session = a?.sessions.find(
      (s) =>
        s.workstationId === workstationId &&
        (!payload.sessionId || s.id === payload.sessionId),
    );
    if (!session) throw new Error("工位会话不存在或已失效。");
    if ((a.type === "exam") !== exam)
      throw new Error(
        exam
          ? "只有考试会话可以提交考试异常求助。"
          : "考试会话请使用考试异常求助。",
      );
    const changed = changeSessionClosure(data, {
      ...payload,
      arrangementId,
      sessionId: session.id,
      action: "request_help",
      actor: "student",
      actorId: session.studentId,
      at: now(),
      makeId,
    });
    data = changed.data;
    return clone(changed.result);
  };
  const store = {
    getData() {
      return clone(data);
    },
    resolveWorkstationRestriction(workstationId, input) {
      const next = resolveWorkstationRestriction(data, {
        ...input,
        workstationId,
        at: now(),
        actorId: "admin",
      });
      data = assertFrozenGradeWrite(data, normalizeClosureData(next));
      return clone(data.workstations.find((w) => w.id === workstationId));
    },
    changeSupportTask(input) {
      const changed = changeSupportTask(data, { ...input, at: now(), makeId });
      assertFrozenGradeWrite(data, changed.data);
      data = normalizeSupportTasksData(changed.data);
      return clone(changed.result);
    },
    changeEvidenceTask(input) {
      const changed = changeEvidenceTask(data, { ...input, at: now(), makeId });
      assertFrozenGradeWrite(data, changed.data);
      data = normalizeEvidenceTasksData(changed.data);
      return clone(changed.result);
    },
    reviseSessionGrade(input) {
      const changed = reviseSessionGrade(data, { ...input, at: now(), makeId });
      assertFrozenGradeWrite(data, changed.data);
      data = changed.data;
      return clone(changed.result);
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
      if (arrangement) errors.push(...allocationIssues(arrangement));
      if (["故障", "维护中", "停用"].includes(workstation?.status))
        errors.push(workstation.notes || `工位当前状态为${workstation.status}`);
      if (workstation?.releaseHold)
        errors.push(workstationUsageRestriction(workstation));
      if (
        workstation?.currentArrangementId
          ? workstation.currentArrangementId !== arrangement?.id
          : workstation?.currentArrangement &&
            workstation.currentArrangement !== "无" &&
            workstation.currentArrangement !== arrangement?.name
      )
        errors.push(`当前被“${workstation.currentArrangement}”占用`);
      const gate = arrangement
        ? deriveAiRuntimeGate({
            ...data,
            sopId: arrangement.sopId,
            workstationId,
            sops:
              hasLockedPreparationSnapshot(arrangement) &&
              arrangement.snapshot?.sopSnapshot
                ? [arrangement.snapshot.sopSnapshot]
                : data.sops,
          })
        : { enabled: false, reasons: ["安排不存在"] };
      const baseConfig = normalizeWorkstationAiBaseConfig(workstation || {});
      const checks = ["mainCamera"];
      if (baseConfig.fallbackCameraId) checks.push("assistCamera");
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
      if (existing && !preparationActions(existing).edit)
        throw new Error("请先撤销工位准备；已开始或已结束的安排不能修改。");
      if (
        hasLockedPreparationSnapshot(existing || {}) &&
        existing.sopId !== input.sopId
      )
        throw new Error("已锁定教学标准，请取消后复制为新草稿。");
      const name = input.name?.trim();
      if (!name) throw new Error("请填写安排名称。");
      const sop = data.sops.find((item) => item.id === input.sopId);
      if (!isSopAvailableForNewArrangement(sop))
        throw new Error("只能选择已发布且未停用的实训标准。");
      if (finalize && !input.studentIds?.length)
        throw new Error("至少选择一名参与学生。");
      if (finalize && !input.workstationIds?.length)
        throw new Error("至少选择一个可用工位。");
      const stationAssignments = arrangementAssignments(input);
      if (finalize)
        assertAllocation({ ...input, stationAssignments, sessions: [] });
      const saved = {
        ...(existing || {}),
        ...clone(input),
        id: existing?.id || makeId(input.type === "exam" ? "exam" : "practice"),
        name,
        stationAssignments,
        allocationPolicy: "one_student_one_station",
        status: finalize ? "待开始" : "草稿",
        openWorkstationIds: existing?.openWorkstationIds || [],
        snapshot: hasLockedPreparationSnapshot(existing || {})
          ? existing.snapshot
          : null,
        ...(existing?.snapshot && !hasLockedPreparationSnapshot(existing)
          ? {
              preparationLegacySnapshots: [
                ...(existing.preparationLegacySnapshots || []),
                existing.snapshot,
              ],
            }
          : {}),
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

    changeArrangementPreparation(arrangementId, action, input = {}) {
      const changed = changePreparation(data, {
        arrangementId,
        action,
        ...input,
        at: now(),
        makeId,
      });
      data = changed.data;
      return clone(changed.arrangement);
    },
    deleteArrangementDraft(id) {
      return store.changeArrangementPreparation(id, "deleteDraft");
    },
    cancelArrangement(id, reason) {
      return store.changeArrangementPreparation(id, "cancel", { reason });
    },
    withdrawArrangementWorkstation(id, workstationId, reason) {
      return store.changeArrangementPreparation(id, "withdraw", {
        workstationId,
        reason,
      });
    },
    copyCancelledArrangement(id) {
      return store.changeArrangementPreparation(id, "copy");
    },

    runWorkstationOpeningCheck(arrangementId, workstationId) {
      const readiness = store.getWorkstationReadiness(
        arrangementId,
        workstationId,
      );
      if (!readiness.ok) throw new Error(readiness.errors.join("；"));
      const report = deriveOpeningInspection({
        data,
        arrangementId,
        workstationId,
        gate: readiness.gate,
        id: makeId("opening-check"),
        checkedAt: now(),
      });
      openingInspections.set(`${arrangementId}:${workstationId}`, report);
      return clone(report);
    },

    openArrangementWorkstation(arrangementId, workstationId, checklist) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      if (!arrangement) throw new Error("安排不存在或已失效。");
      if (
        !["待开始", "准备中", "进行中", "已暂停"].includes(arrangement.status)
      )
        throw new Error("当前安排不允许开放工位。");
      if (arrangement.openWorkstationIds.includes(workstationId))
        throw new Error("该工位已开放，无需重复检查。");
      const readiness = store.getWorkstationReadiness(
        arrangementId,
        workstationId,
      );
      if (!readiness.ok) throw new Error(readiness.errors.join("；"));
      const report = openingInspections.get(
        `${arrangementId}:${workstationId}`,
      );
      const current = deriveOpeningInspection({
        data,
        arrangementId,
        workstationId,
        gate: readiness.gate,
        checkedAt: now(),
      });
      const openingCheck = assertOpeningInspection({
        report,
        current,
        checklist,
        at: now(),
        actorId: arrangement.teacherId,
      });
      const sop = hasLockedPreparationSnapshot(arrangement)
        ? arrangement.snapshot?.sopSnapshot
        : data.sops.find((item) => item.id === arrangement.sopId);
      if (!sop)
        throw new Error(
          "当前安排的标准快照不完整或实训标准已失效，请核对后重新安排。",
        );
      const lockedAt = now();
      const snapshot = hasLockedPreparationSnapshot(arrangement)
        ? arrangement.snapshot
        : {
            sopId: sop.id,
            sopSnapshot: clone(sop),
            lockedAt,
          };
      const studentId = studentAssignedToStation(arrangement, workstationId);
      const sessionId = makeId("session");
      const session = createOpenedAiSession({
        id: sessionId,
        workstationId,
        studentId,
        gate: openingEvaluationGate(readiness.gate, current),
        lockedAt,
        steps: createSessionStepsFromSop(sop.steps),
        recording: { status: "不可用", startedAt: "尚未开始" },
      });
      session.openingCheck = openingCheck;
      session.studentSnapshot = captureStudentSnapshot(
        data,
        studentId,
        lockedAt,
      );
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
      data = {
        ...data,
        workstations: data.workstations.map((w) =>
          w.id === workstationId
            ? {
                ...w,
                status: "可入场",
                currentArrangement: arrangement.name,
                currentArrangementId: arrangement.id,
              }
            : w,
        ),
      };
      return clone({ snapshot, session: openedSession });
    },

    startArrangement(id) {
      const arrangement = data.arrangements.find((item) => item.id === id);
      if (!arrangement) throw new Error("安排不存在或已失效。");
      if (!["待开始", "准备中"].includes(arrangement.status))
        throw new Error("当前安排不能重复开始。");
      assertAllocation(arrangement);
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

    startWorkstationSession(arrangementId, workstationId, sessionId = "") {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) =>
          item.workstationId === workstationId &&
          (!sessionId || item.id === sessionId),
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
                  time: startedAt.slice(11, 19),
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
          item.id === session.id ? updatedSession : item,
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
      sessionId = "",
    ) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) =>
          item.workstationId === workstationId &&
          (!sessionId || item.id === sessionId),
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
            item.id === session.id ? updatedSession : item,
          ),
          updatedAt: verifiedAt,
        });
      return clone(updatedSession.identityVerification);
    },

    recordStudentHintRequest(
      arrangementId,
      workstationId,
      stepId,
      sessionId = "",
    ) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) =>
          item.workstationId === workstationId &&
          (!sessionId || item.id === sessionId),
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
          item.id === session.id ? updatedSession : item,
        ),
        updatedAt: createdAt,
      });
      return clone(updatedSession.events[0]);
    },

    requestTeacherHelp(arrangementId, workstationId, payload = {}) {
      return runSessionClosureAtStation(
        arrangementId,
        workstationId,
        payload,
        false,
      );
    },
    requestExamIncidentHelp(arrangementId, workstationId, payload = {}) {
      return runSessionClosureAtStation(
        arrangementId,
        workstationId,
        payload,
        true,
      );
    },
    changeSessionClosure(input) {
      const changed = changeSessionClosure(data, {
        ...input,
        at: now(),
        makeId,
      });
      data = changed.data;
      return clone(changed.result);
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

    setArrangementSessionPaused(
      arrangementId,
      workstationId,
      paused,
      sessionId = "",
    ) {
      const arrangement = data.arrangements.find(
        (item) => item.id === arrangementId,
      );
      const session = arrangement?.sessions.find(
        (item) =>
          item.workstationId === workstationId &&
          (!sessionId || item.id === sessionId),
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
          item.id === session.id ? updatedSession : item,
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
        (item) =>
          item.workstationId === workstationId &&
          (!options.sessionId || item.id === options.sessionId),
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
      const steps = session.steps.map((step) =>
        finalizeSubmittedStep(step, endedAt, {
          scoringApplications: session.runtime?.aiScoringApplications || [],
        }),
      );
      const scoreEngine = calculateScoreEngine({
        steps,
        manualAdjustments: session.manualAdjustments || [],
      });
      let updatedSession = {
        ...session,
        steps,
        scoreEngine,
        score: scoreEngine.effectiveScore,
        status: "已完成",
        currentStepId: "",
        endedAt,
        resultStatus: exam
          ? "待发布"
          : scoreEngine.scoreStatus === "pending" ||
              steps.some(requiresMandatoryReview) ||
              (session.runtime?.safetyCandidates || []).some(
                (candidate) => candidate.status === "pending",
              )
            ? "待复核"
            : "正式成绩",
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
            time: endedAt.slice(11, 19),
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
      updatedSession = applyGradeLifecycle(session, updatedSession, {
        at: endedAt,
        actorId: session.studentId,
        action: "提交生成结果",
        operationId: `finish-${session.id}-${session.startedAt || "session"}`,
        makeId,
      });
      data = replaceArrangement(data, {
        ...arrangement,
        sessions: arrangement.sessions.map((item) =>
          item.id === session.id ? updatedSession : item,
        ),
        updatedAt: endedAt,
      });
      return clone({
        session: data.arrangements
          .find((a) => a.id === arrangementId)
          .sessions.find((s) => s.id === session.id),
        idempotent: false,
      });
    },

    simulateAiCondition(
      arrangementId,
      workstationId,
      judgementItemId,
      conditionId,
      observationPayload,
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
        observationPayload,
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
      const updatedSession = preserveClosedSessionExecution(
        arrangement,
        session,
        resolveAiSafetyCandidate({
          session,
          candidateId,
          resolution,
          sopSnapshot:
            session.evaluationSnapshot?.sopSnapshot ||
            data.sops.find((item) => item.id === arrangement.sopId),
          when: now(),
        }),
      );
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
