import {
  createSessionStepsFromSop,
  calculateScoreEngine,
} from "./domainRules.js";
import {
  changeEvidenceTask,
  evidenceTaskGradeContext,
} from "./evidenceTaskRules.js";
import {
  reviseSessionGrade,
  gradeStateToken,
} from "./gradeRevisionRules.js";

export const GRADE_EVIDENCE_DEMO_PACKAGE = "grade-evidence-closure-20261022";
const copy = (value) => JSON.parse(JSON.stringify(value));
const CASES = [
  ["pending", "practice", "补充证据待办理", "evidence"],
  ["handling", "practice", "线下补测办理中", "retest"],
  ["awaiting", "exam", "补测已登记待教师确认", "retest"],
  ["completed", "practice", "补证完成与成绩连续修订", "evidence"],
  ["cancelled", "practice", "已取消补测并保留原分", "retest"],
  ["frozen", "exam", "已发布冻结与办理历史", "retest"],
];

/**
 * Append genuine linked demonstration records through the same B11/B12 commands
 * as the UI. This factory never occupies a workstation or rewrites old records.
 */
export function migrateGradeEvidenceDemoData(data) {
  if ((data.enhancementMigrations || []).includes(GRADE_EVIDENCE_DEMO_PACKAGE))
    return data;
  const sop = (data.sops || []).find((s) => s.id === "sop-demo-bench-20261015");
  const student = (data.students || []).find(
    (s) => s.id === "student-demo-20261015",
  );
  const workstation = (data.workstations || []).find(
    (w) => w.id === "ws-demo-20261015",
  );
  const sourceSession = (data.arrangements || [])
    .find((a) => a.id === "practice-demo-20261015")
    ?.sessions?.find((s) => s.studentId === student?.id);
  if (!sop || !student || !workstation || !sourceSession || !sop.steps?.length)
    return data;
  let next = {
    ...data,
    arrangements: [...(data.arrangements || [])],
    evidenceTasks: [...(data.evidenceTasks || [])],
    notifications: [...(data.notifications || [])],
    auditLogs: [...(data.auditLogs || [])],
    enhancementMigrations: [...(data.enhancementMigrations || [])],
  };
  const startedAt = "2026-10-22T00:30:00.000Z";
  const endedAt = "2026-10-22T00:35:00.000Z";
  for (const [key, type, title, kind] of CASES) {
    const arrangementId = `${type}-grade-evidence-${key}-20261022`;
    if (next.arrangements.some((a) => a.id === arrangementId)) continue;
    const sessionId = `session-grade-evidence-${key}-20261022`;
    const taskId = `task-grade-evidence-${key}-20261022`;
    let sequence = 0;
    const makeId = (prefix) =>
      prefix === "evidence-task"
        ? taskId
        : `grade-evidence-${key}-${prefix}-${++sequence}`;
    const snapshot = copy(sop);
    const steps = createSessionStepsFromSop(snapshot.steps).map((step) => ({
      ...step,
      state: "pass",
      executionState: "closed",
      completionSource: "manual_flow",
      completionResult: "uncertain",
      aiEvidenceState: "unknown",
      aiDecision: "uncertain",
      rawScore: Number(step.maxScore),
      score: Number(step.maxScore),
      effectiveScore: Number(step.maxScore),
      result: "未自动确认（按规则保分）",
      reviewStatus: "无需复核",
      resultSource: "prototype_demo",
      flowCompletion: {
        role: "teacher",
        actor: "t1",
        at: endedAt,
        source: "manual_flow",
        note: "演示：教师登记流程已操作；没有真实录像或AI完成证据。",
      },
      evidenceSources: [],
      evidenceStatus: "不可用",
      timeRange: "无可用录像片段",
      evidenceMetadata: { clipStatus: "不可用", cameras: [] },
      scoreDisposition: { status: "normal", reason: "缺证不直接扣分" },
      observationWindow: {
        status: "closed",
        openedAt: startedAt,
        closedAt: endedAt,
        closeReason: "原型线下办理演示基线",
      },
    }));
    const scoreEngine = calculateScoreEngine({ steps });
    const session = {
      id: sessionId,
      studentId: student.id,
      workstationId: workstation.id,
      status: "已复位",
      resultStatus: "正式成绩",
      score: scoreEngine.effectiveScore,
      scoreEngine,
      currentStepId: "",
      elapsed: "00:05:00",
      startedAt,
      endedAt,
      resultSource: "prototype_demo",
      steps,
      events: [],
      reviewHistory: [],
      evaluationSnapshot: {
        ...copy(sourceSession.evaluationSnapshot || {}),
        executionPurpose: "prototype_demo",
        aiEnabled: false,
        sopId: sop.id,
        workstationId: workstation.id,
        sopSnapshot: copy(snapshot),
        lockedAt: startedAt,
      },
      evaluationProfile: {
        aiRuntimeEnabled: false,
        automaticEvaluationEnabled: false,
        executionPurpose: "prototype_demo",
        fallbackPolicy: "教师线下办理登记演示；没有真实视频或AI识别结果。",
      },
      runtime: {
        evaluationClock: {
          status: "stopped",
          elapsedSeconds: 300,
          wallSeconds: 300,
          pausedSeconds: 0,
        },
        aiObservations: [],
        aiJudgementResults: [],
        aiScoringApplications: [],
        safetyCandidates: [],
        technicalIncidents: [],
      },
      recording: {
        status: "不可用",
        fullVideoAvailable: false,
        coveragePercent: 0,
        mainCamera: "未接入",
        assistCamera: "未接入",
        note: "补证/补测示例为教师线下核验登记，无真实录像附件。",
      },
      demoPackageId: GRADE_EVIDENCE_DEMO_PACKAGE,
    };
    next.arrangements.push({
      id: arrangementId,
      type,
      name: `【演示】${title}`,
      teacherId: "t1",
      sopId: sop.id,
      status: type === "exam" ? "待发布" : "已结束",
      scheduleStart: "2026-10-22T08:30:00",
      studentIds: [student.id],
      workstationIds: [workstation.id],
      stationAssignments: [
        { studentId: student.id, workstationId: workstation.id },
      ],
      allocationPolicy: "one_student_one_station",
      openWorkstationIds: [],
      snapshot: { sopId: sop.id, sopSnapshot: snapshot, lockedAt: startedAt },
      sessions: [session],
      startedAt,
      endedAt,
      updatedAt: endedAt,
      demoPackageId: GRADE_EVIDENCE_DEMO_PACKAGE,
    });
    const current = () =>
      next.arrangements
        .find((a) => a.id === arrangementId)
        .sessions.find((s) => s.id === sessionId);
    const task = () => next.evidenceTasks.find((t) => t.id === taskId);
    const at = () =>
      new Date(
        Date.parse("2026-10-22T01:00:00.000Z") + sequence * 60000,
      ).toISOString();
    const revise = (input) => {
      const result = reviseSessionGrade(next, {
        arrangementId,
        sessionId,
        stepId: steps[0].id,
        actorId: "t1",
        actorName: "王老师",
        expectedState: gradeStateToken(current()),
        operationId: `grade-evidence-${key}-revision-${++sequence}`,
        at: at(),
        makeId,
        ...input,
      });
      next = result.data;
      return result.result;
    };
    const act = (action, input = {}) => {
      const linked = task();
      const result = changeEvidenceTask(next, {
        action,
        arrangementId,
        sessionId,
        stepId: steps[0].id,
        actorId: "t1",
        actorName: "王老师",
        operationId: `grade-evidence-${key}-${action}-${++sequence}`,
        at: at(),
        makeId,
        ...(linked
          ? { taskId: linked.id, ...evidenceTaskGradeContext(next, linked) }
          : {
              expectedState: gradeStateToken(current()),
            }),
        ...input,
      });
      next = result.data;
      return result.result;
    };
    if (key === "completed")
      revise({
        action: "adjust",
        score: 25,
        reason:
          "演示：教师现场核验发现防护细节需纠正，依教师评分标准调整5分；不是因视频缺失扣分。",
        evidenceRefs: [],
      });
    act("create", {
      kind,
      reason:
        kind === "evidence"
          ? "演示：原录像未接入，需要教师补充现场核验依据。缺证本身不扣分。"
          : "演示：按教学安排登记一次线下操作补测；保留原成绩和原始判分。",
      studentInstruction:
        kind === "evidence"
          ? "请联系王老师核对原操作记录，按现场安排补充说明；由教师办理确认。"
          : "请按王老师现场安排到固定工作台完成线下操作复核；本任务不会自动创建新考试。",
    });
    if (key !== "pending") act("accept");
    if (["awaiting", "completed", "frozen"].includes(key))
      act("register", {
        performedAt: "2026-10-22T00:50:00.000Z",
        performer: "王老师",
        process: "演示：教师在固定工作台连续观察学生操作并核对过程记录。",
        outcome: "演示：线下操作已登记，最终结论等待负责教师确认。",
        basis: "教师现场核验登记。未附加真实录像，不属于模型识别或视频证据。",
        verificationMode: "manual",
        evidenceRefs:
          key === "awaiting"
            ? [
                {
                  arrangementId,
                  sessionId,
                  stepId: steps[1]?.id || steps[0].id,
                },
              ]
            : [],
      });
    if (["completed", "frozen"].includes(key))
      act("confirm", {
        score: key === "completed" ? 28 : 30,
        reason:
          "演示：教师依据已登记的线下现场核验形成最终有效分；不把人工核验当成AI证据。",
        studentConclusion:
          "线下办理已由王老师确认完成，请继续按课堂要求规范操作。",
      });
    if (key === "completed")
      revise({
        action: "disposition",
        status: "teacher_resolved",
        score: 28,
        reason:
          "演示：登记复核结论，保留当前有效分和处理说明。",
        evidenceRefs: [],
      });
    if (key === "cancelled")
      act("cancel", {
        reason:
          "演示：教学安排调整，取消本次线下补测，原有效分不变且不产生新扣分。",
      });
    if (key === "frozen") {
      // Publishing only freezes this newly built demo result; no existing result is touched.
      const arrangement = next.arrangements.find((a) => a.id === arrangementId);
      const frozenAt = "2026-10-22T02:00:00.000Z";
      next = {
        ...next,
        arrangements: next.arrangements.map((a) =>
          a.id === arrangementId
            ? {
                ...arrangement,
                status: "已发布",
                publishedAt: frozenAt,
                publishedBy: "王老师",
                sessions: arrangement.sessions.map((s) => ({
                  ...s,
                  resultStatus: "已发布",
                  scoreFrozen: true,
                  frozenAt,
                })),
              }
            : a,
        ),
      };
    }
  }
  return {
    ...next,
    enhancementMigrations: [
      ...next.enhancementMigrations,
      GRADE_EVIDENCE_DEMO_PACKAGE,
    ],
  };
}
