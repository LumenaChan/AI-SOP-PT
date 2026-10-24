import {
  createSessionStepsFromSop,
  calculateScoreEngine,
} from "./domainRules.js";
import {
  reviseSessionGrade,
  gradeStateToken,
} from "./gradeRevisionRules.js";
import { captureStudentSnapshot } from "./statisticsCommonRules.js";
export const TEACHING_STATISTICS_DEMO_PACKAGE = "teaching-statistics-20261023";
export const TEACHING_STATISTICS_DEMO_VERSION = "教学统计演示V1";
const copy = (v) => JSON.parse(JSON.stringify(v));
export function migrateTeachingStatisticsDemoData(data) {
  if (
    (data.enhancementMigrations || []).includes(
      TEACHING_STATISTICS_DEMO_PACKAGE,
    )
  )
    return data;
  const source = (data.arrangements || []).find(
      (a) => a.id === "practice-demo-20261015",
    ),
    sop = (data.sops || []).find((s) => s.id === source?.sopId);
  const students = ["s1", "s4", "s2", "s3", "s-demo-exam"].map((id) =>
    (data.students || []).find((s) => s.id === id),
  );
  if (
    !source?.sessions?.length ||
    !sop?.steps?.length ||
    students.some((s) => !s)
  )
    return data;
  let next = {
    ...data,
    arrangements: [...(data.arrangements || [])],
    auditLogs: [...(data.auditLogs || [])],
  };
  const cases = [
    ["a1", 0, 50],
    ["a2", 0, 80],
    ["a3", 0, 90],
    ["b1", 1, 65],
    ["zero", 2, 0],
    ["empty", 3, null],
    ["pending", 2, 85],
    ["unknown-version", 3, 70],
    ["unknown-time", 3, 75],
    ["single", 4, 88],
  ];
  for (const [i, [key, person, score]] of cases.entries()) {
    const id = `practice-statistics-${key}-20261023`;
    if (next.arrangements.some((a) => a.id === id)) continue;
    const start = new Date(
        Date.parse("2026-10-19T02:00:00Z") + i * 3 * 3600000,
      ).toISOString(),
      end = new Date(Date.parse(start) + 300000).toISOString();
    const standard = {
      ...copy(sop),
      version: TEACHING_STATISTICS_DEMO_VERSION,
    };
    if (key === "unknown-version") delete standard.version;
    const steps = createSessionStepsFromSop(standard.steps).map((step) => ({
      ...step,
      state: "pass",
      executionState: "closed",
      result: "未自动确认（按规则保分）",
      reviewStatus: "无需复核",
      rawScore: step.maxScore,
      score: step.maxScore,
      effectiveScore: step.maxScore,
      aiEvidenceState: "unknown",
      completionSource: "manual_flow",
      completionResult: "uncertain",
      resultSource: "prototype_demo",
      scoreDisposition: { status: "normal", reason: "按政策保分" },
      evidenceStatus: "不可用",
      timeRange: "无录像",
      evidenceSources: [],
      evidenceMetadata: { clipStatus: "不可用", cameras: [] },
      flowCompletion: {
        actor: "t1",
        role: "teacher",
        source: "manual_flow",
        at: end,
        note: "演示：教师确认操作流程；不是AI证据",
      },
    }));
    const maximum = steps.reduce((n, s) => n + Number(s.maxScore), 0);
    const session = {
      id: `session-statistics-${key}-20261023`,
      studentId: students[person].id,
      studentSnapshot: captureStudentSnapshot(data, students[person].id, start),
      workstationId: source.sessions[0].workstationId,
      status: "已复位",
      resultStatus: "正式成绩",
      score: maximum,
      steps,
      scoreEngine: calculateScoreEngine({ steps }),
      startedAt: start,
      endedAt: end,
      currentStepId: "",
      events: [],
      reviewHistory: [],
      runtime: {
        evaluationClock: { status: "stopped", elapsedSeconds: 300 },
        aiObservations: [],
        aiJudgementResults: [],
        aiScoringApplications: [],
        safetyCandidates: [],
        technicalIncidents: [],
      },
      recording: {
        status: "不可用",
        fullVideoAvailable: false,
        note: "教学统计关联演示，无真实录像。",
      },
      evaluationSnapshot: {
        sopId: sop.id,
        sopSnapshot: copy(standard),
        lockedAt: start,
        aiEnabled: false,
        executionPurpose: "prototype_demo",
      },
      evaluationProfile: {
        automaticEvaluationEnabled: false,
        executionPurpose: "prototype_demo",
      },
      demoPackageId: TEACHING_STATISTICS_DEMO_PACKAGE,
    };
    const a = {
      id,
      type: "practice",
      teacherId: "t1",
      name: `【统计演示】${{ a1: "同学生首次50分", a2: "同学生第二次80分", a3: "同学生第三次90分", b1: "另一班级65分", zero: "合法零分", empty: "空分待核对", pending: "待复核结果", "unknown-version": "历史版本未知", "unknown-time": "结果时间未知", single: "只有一次有效结果" }[key]}`,
      sopId: sop.id,
      status: "已结束",
      studentIds: [session.studentId],
      workstationIds: [session.workstationId],
      stationAssignments: [
        { studentId: session.studentId, workstationId: session.workstationId },
      ],
      openWorkstationIds: [],
      allocationPolicy: "one_student_one_station",
      scheduleStart: start,
      startedAt: start,
      endedAt: end,
      updatedAt: end,
      sessions: [session],
      snapshot: { sopId: sop.id, sopSnapshot: copy(standard), lockedAt: start },
      demoPackageId: TEACHING_STATISTICS_DEMO_PACKAGE,
      archivedRecord: true,
    };
    next.arrangements.push(a);
    if (score !== null) {
      let deduction = (maximum * (100 - score)) / 100,
        seq = 0;
      for (const step of [...steps].reverse()) {
        if (deduction <= 0) break;
        const amount = Math.min(step.maxScore, deduction);
        deduction -= amount;
        const s = next.arrangements.find((a) => a.id === id).sessions[0];
        next = reviseSessionGrade(next, {
          action: "review",
          conclusion: "fail",
          arrangementId: id,
          sessionId: s.id,
          stepId: step.id,
          score: step.maxScore - amount,
          reason: "统计演示：教师现场核验确认操作问题；非因缺录像扣分。",
          archiveEvidence: true,
          expectedState: gradeStateToken(s),
          operationId: `statistics-${key}-${++seq}`,
          actorId: "t1",
          at: end,
          makeId: (p) => `${p}-statistics-${key}-${seq}`,
        }).data;
      }
    }
    next = {
      ...next,
      arrangements: next.arrangements.map((a) =>
        a.id !== id
          ? a
          : {
              ...a,
              ...(key === "unknown-time" ? { endedAt: "" } : {}),
              sessions: a.sessions.map((s) => ({
                ...s,
                ...(score === null ? { score: null } : {}),
                ...(key === "pending"
                  ? {
                      resultStatus: "待复核",
                      steps: s.steps.map((t, i) =>
                        i ? t : { ...t, reviewStatus: "待复核" },
                      ),
                    }
                  : {}),
                ...(key === "unknown-time"
                  ? {
                      endedAt: "",
                      submittedAt: "",
                      completedAt: "",
                      resultPreparedAt: "",
                    }
                  : {}),
              })),
            },
      ),
    };
  }
  return {
    ...next,
    enhancementMigrations: [
      ...(next.enhancementMigrations || []),
      TEACHING_STATISTICS_DEMO_PACKAGE,
    ],
  };
}
