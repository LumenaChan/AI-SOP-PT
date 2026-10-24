import {
  calculateScoreEngine,
  createSessionStepsFromSop,
} from "./domainRules.js";
import {
  reviseSessionGrade,
  gradeStateToken,
} from "./gradeRevisionRules.js";
import {
  changeSupportTask,
  supportTaskGradeContext,
} from "./supportTaskRules.js";
import { latestStudentResultRows } from "./teacherDashboardMetrics.js";

export const DASHBOARD_CLOSURE_DEMO_PACKAGE = "dashboard-closure-20261022";
const copy = (value) => JSON.parse(JSON.stringify(value));
const CASES = [
  {
    key: "low-pending",
    title: "低分结果与待安排辅导",
    student: 0,
    score: 60,
    support: "pending",
  },
  { key: "low-repeat", title: "同一学生第二次正式练习", student: 0, score: 70 },
  {
    key: "coaching",
    title: "低分结果与辅导进行中",
    student: 1,
    score: 65,
    support: "coaching",
  },
  {
    key: "awaiting-review",
    title: "指导已登记等待复查",
    student: 2,
    score: 72,
    support: "awaiting_review",
  },
  {
    key: "completed",
    title: "辅导复查完成与原分保留",
    student: 3,
    score: 75,
    support: "completed",
  },
  {
    key: "published",
    title: "已发布考试纳入发布分子",
    student: 0,
    score: 88,
    type: "exam",
    published: true,
  },
  {
    key: "unpublished",
    title: "正式考试成绩等待发布",
    student: 1,
    score: 82,
    type: "exam",
  },
  {
    key: "review",
    title: "考试待复核独立列示",
    student: 2,
    score: 85,
    type: "exam",
    review: true,
  },
  { key: "empty", title: "空分记录不作为零分统计", student: 3, score: null },
  { key: "zero", title: "真实登记零分计入正式结果", student: 3, score: 0 },
];

/**
 * Shared once-only append migration. Grades and support histories use the same
 * formal commands as the UI. All objects remain marked prototype demonstrations;
 * no workstation occupancy, existing score, snapshot, identity or device changes.
 */
export function migrateDashboardClosureDemoData(data) {
  if (
    (data.enhancementMigrations || []).includes(DASHBOARD_CLOSURE_DEMO_PACKAGE)
  )
    return data;
  const sop = (data.sops || []).find((s) => s.id === "sop-demo-bench-20261015");
  const bench = (data.workstations || []).find(
    (w) => w.id === "ws-demo-20261015",
  );
  const demoStudent = (data.students || []).find(
    (s) => s.id === "student-demo-20261015",
  );
  const students = [
    demoStudent,
    ...(data.students || []).filter((s) => s.id !== demoStudent?.id),
  ]
    .filter(Boolean)
    .slice(0, 4);
  const sourceSession = (data.arrangements || []).find(
    (a) => a.id === "practice-demo-20261015",
  )?.sessions?.[0];
  if (!sop?.steps?.length || !bench || !sourceSession || students.length < 4)
    return data;
  let next = {
    ...data,
    arrangements: [...(data.arrangements || [])],
    supportTasks: [...(data.supportTasks || [])],
    notifications: [...(data.notifications || [])],
    auditLogs: [...(data.auditLogs || [])],
  };
  for (const [index, spec] of CASES.entries()) {
    const type = spec.type || "practice";
    const arrangementId = `${type}-dashboard-${spec.key}-20261022`;
    if (next.arrangements.some((a) => a.id === arrangementId)) continue;
    const sessionId = `session-dashboard-${spec.key}-20261022`;
    const taskId = `task-dashboard-support-${spec.key}-20261022`;
    const student = students[spec.student];
    let sequence = 0;
    const makeId = (prefix) =>
      prefix === "support-task"
        ? taskId
        : `dashboard-closure-${spec.key}-${prefix}-${++sequence}`;
    // Later results have later immutable Session times; duplicate-student samples
    // therefore exercise both record-count averages and latest-result deduplication.
    const baseTime =
      Date.parse("2026-10-22T05:00:00.000Z") + index * 10 * 60000;
    const startedAt = new Date(baseTime).toISOString();
    const endedAt = new Date(baseTime + 5 * 60000).toISOString();
    const at = () => new Date(baseTime + (6 + sequence) * 60000).toISOString();
    const frozenSop = {
      ...copy(sop),
      version: sop.version || "演示快照-20261022",
    };
    const steps = createSessionStepsFromSop(frozenSop.steps).map((step) => ({
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
      evidenceSources: [],
      evidenceStatus: "不可用",
      timeRange: "无可用录像片段",
      evidenceMetadata: { clipStatus: "不可用", cameras: [] },
      scoreDisposition: {
        status: "normal",
        reason: "未接入视频，缺证本身不扣分",
      },
      flowCompletion: {
        role: "teacher",
        actor: "t1",
        at: endedAt,
        source: "manual_flow",
        note: "原型演示：教师登记流程结束，无真实AI或视频完成证据。",
      },
      observationWindow: {
        status: "closed",
        openedAt: startedAt,
        closedAt: endedAt,
        closeReason: "演示结果已登记",
      },
    }));
    const engine = calculateScoreEngine({ steps });
    const session = {
      id: sessionId,
      studentId: student.id,
      workstationId: bench.id,
      status: "已复位",
      resultStatus: "正式成绩",
      currentStepId: "",
      score: engine.effectiveScore,
      scoreEngine: engine,
      steps,
      elapsed: "00:05:00",
      startedAt,
      endedAt,
      events: [],
      reviewHistory: [],
      resultSource: "prototype_demo",
      demoPackageId: DASHBOARD_CLOSURE_DEMO_PACKAGE,
      evaluationSnapshot: {
        ...copy(sourceSession.evaluationSnapshot || {}),
        sopId: sop.id,
        sopSnapshot: copy(frozenSop),
        workstationId: bench.id,
        lockedAt: startedAt,
        executionPurpose: "prototype_demo",
        aiEnabled: false,
      },
      evaluationProfile: {
        aiRuntimeEnabled: false,
        automaticEvaluationEnabled: false,
        executionPurpose: "prototype_demo",
        fallbackPolicy: "教师登记演示，无真实模型推理或录像。",
      },
      recording: {
        status: "不可用",
        fullVideoAvailable: false,
        coveragePercent: 0,
        note: "统计及辅导闭环演示，未接入真实录像。",
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
    };
    next.arrangements.push({
      id: arrangementId,
      type,
      name: `【演示】${spec.title}`,
      teacherId: "t1",
      sopId: sop.id,
      status: type === "exam" ? "待发布" : "已结束",
      studentIds: [student.id],
      workstationIds: [bench.id],
      openWorkstationIds: [],
      stationAssignments: [{ studentId: student.id, workstationId: bench.id }],
      allocationPolicy: "one_student_one_station",
      scheduleStart: startedAt,
      startedAt,
      endedAt,
      updatedAt: endedAt,
      snapshot: {
        sopId: sop.id,
        sopSnapshot: copy(frozenSop),
        lockedAt: startedAt,
      },
      sessions: [session],
      demoPackageId: DASHBOARD_CLOSURE_DEMO_PACKAGE,
    });
    const arrangement = () =>
      next.arrangements.find((a) => a.id === arrangementId);
    const current = () => arrangement().sessions[0];
    const replace = (sessionPatch, arrangementPatch = {}) => {
      next = {
        ...next,
        arrangements: next.arrangements.map((a) =>
          a.id === arrangementId
            ? {
                ...a,
                ...arrangementPatch,
                sessions: [{ ...a.sessions[0], ...sessionPatch }],
              }
            : a,
        ),
      };
    };
    if (spec.score !== null) {
      let deduction =
        steps.reduce((sum, step) => sum + Number(step.maxScore), 0) -
        spec.score;
      for (const step of [...steps].reverse()) {
        if (deduction <= 0) break;
        const amount = Math.min(Number(step.maxScore), deduction);
        deduction -= amount;
        const revised = reviseSessionGrade(next, {
          action: "review",
          conclusion: "fail",
          arrangementId,
          sessionId,
          stepId: step.id,
          actorId: "t1",
          actorName: "王老师",
          expectedState: gradeStateToken(current()),
          score: Number(step.maxScore) - amount,
          reason: `原型演示：教师现场核验确认“${step.name}”操作存在评分标准中的问题，登记扣${amount}分；不是因录像缺失扣分。`,
          evidenceRefs: [],
          archiveEvidence: true,
          operationId: `dashboard-closure-${spec.key}-grade-${++sequence}`,
          at: at(),
          makeId,
        });
        next = revised.data;
      }
    } else {
      // An incomplete imported result is intentionally retained as null. It is a
      // validation example, never an inferred zero or a formal statistical sample.
      replace({
        score: null,
        scoreEngine: { ...current().scoreEngine, effectiveScore: null },
        scoreIncompleteReason: "演示：历史导入未登记总分，须核对；不作为零分。",
      });
    }
    if (spec.review) {
      replace({
        resultStatus: "待复核",
        steps: current().steps.map((step, i) =>
          i === 0
            ? {
                ...step,
                reviewStatus: "待复核",
                reviewNote: "演示：教师尚未形成最终核验结论。",
              }
            : step,
        ),
      });
    }
    const latest = latestStudentResultRows(next, {
      teacherId: "t1",
      studentId: student.id,
      sopId: sop.id,
      sopVersion: frozenSop.version,
      type,
    });
    if (spec.support && latest[0]?.sessionId === sessionId) {
      const support = (action, input = {}) => {
        const linked = next.supportTasks.find((t) => t.id === taskId);
        const changed = changeSupportTask(next, {
          action,
          arrangementId,
          sessionId,
          taskId,
          actorId: "t1",
          actorName: "王老师",
          ...supportTaskGradeContext(
            next,
            linked || { arrangementId, sessionId },
          ),
          operationId: `dashboard-closure-${spec.key}-${action}-${++sequence}`,
          at: at(),
          makeId,
          ...input,
        });
        next = changed.data;
        return changed.result;
      };
      const created = support("create", {
        reason:
          "原型演示：最近正式结果低于80分，需要针对工具接触与动作衔接进行辅导。",
        studentInstruction:
          "请联系王老师，在固定工作台进行工具接触及动作衔接的规范练习，按教师安排完成复查。",
      });
      // A user's pre-existing open task may be returned idempotently by create;
      // never progress or overwrite that task as part of the demonstration seed.
      if (created.id === taskId) {
        if (spec.support !== "pending") support("start");
        if (["awaiting_review", "completed"].includes(spec.support))
          support("record", {
            performedAt: endedAt,
            performer: "王老师",
            process:
              "原型演示：教师讲解工具接触顺序并指导学生重新练习动作衔接。",
            outcome: "原型演示：指导内容已登记，等待教师复查；原成绩保持不变。",
          });
        if (spec.support === "completed")
          support("review", {
            verificationMode: "manual",
            performedAt: new Date(baseTime + 6 * 60000).toISOString(),
            performer: "王老师",
            basis:
              "原型演示：教师线下复查登记操作要点已掌握；未声称存在真实录像或AI识别。",
            studentConclusion:
              "辅导与复查已完成，请继续保持规范操作；原正式成绩未修改。",
          });
      }
    }
    if (spec.published) {
      replace(
        { resultStatus: "已发布", scoreFrozen: true, frozenAt: endedAt },
        { status: "已发布", publishedAt: endedAt, publishedBy: "王老师" },
      );
    }
  }
  return {
    ...next,
    enhancementMigrations: [
      ...(data.enhancementMigrations || []),
      DASHBOARD_CLOSURE_DEMO_PACKAGE,
    ],
  };
}
