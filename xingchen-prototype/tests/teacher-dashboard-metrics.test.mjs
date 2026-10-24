import test from "node:test";
import assert from "node:assert/strict";
import {
  teacherDashboardMetrics,
  teacherDashboardScopeRows,
  formalResultRows,
  latestStudentResultRows,
  strictMetricNumber,
} from "../src/teacherDashboardMetrics.js";

function arrangement(id, options = {}) {
  const max = options.max ?? 100;
  const score = Object.hasOwn(options, "score") ? options.score : 90;
  const step = {
    id: "step1",
    name: "检查手套",
    maxScore: max,
    score,
    effectiveScore: score,
    state: "pass",
    result: score < max ? "通过（扣分）" : "通过",
    reviewStatus: "无需复核",
    executionState: "closed",
    ...options.step,
  };
  const sop = {
    id: options.sopId || "sop1",
    name: "手套检查SOP",
    version: options.version || "V1",
    courseId: "course1",
    course: "安全实训",
    steps: [
      {
        id: "step1",
        name: "检查手套",
        completionCondition: "确认手套完整无破损",
        score: max,
      },
    ],
  };
  return {
    id,
    name: id,
    type: options.type || "practice",
    teacherId: options.teacherId || "t1",
    sopId: sop.id,
    status: options.type === "exam" ? "待发布" : "已结束",
    scheduleStart: "2020-01-01T09:00:00Z",
    snapshot: { sopSnapshot: sop },
    sessions: [
      {
        id: `session-${id}`,
        studentId: options.studentId || "student1",
        status: "已完成",
        endedAt: options.at || "2020-01-01T10:00:00Z",
        resultStatus: options.published ? "已发布" : "正式成绩",
        score,
        scoreVersion: options.scoreVersion || 1,
        steps: [step],
        runtime: { safetyCandidates: [] },
        ...options.session,
      },
    ],
    ...options.arrangement,
  };
}

function fixture(arrangements = []) {
  return {
    arrangements,
    students: [
      { id: "student1", name: "学生甲", classId: "class1" },
      { id: "student2", name: "学生乙", classId: "class2" },
      { id: "student3", name: "学生丙", classId: "class1" },
    ],
    classes: [
      { id: "class1", name: "一班" },
      { id: "class2", name: "二班" },
    ],
    teachers: [
      { id: "t1", name: "王老师" },
      { id: "t2", name: "李老师" },
    ],
    evidenceTasks: [],
  };
}

test("default scope includes old demo dates, uses completed Session person-times and percentage scores", () => {
  const data = fixture([
    arrangement("old", { score: 40, max: 50 }),
    arrangement("new", { score: 100 }),
    arrangement("another", { score: 20, max: 50, studentId: "student2" }),
  ]);
  const before = structuredClone(data);
  const metric = teacherDashboardMetrics(data);
  assert.equal(metric.average.count, 3);
  assert.equal(metric.average.value, (80 + 100 + 40) / 3);
  assert.equal(metric.scope.label, "学生表现 · 全部演示记录");
  assert.equal(metric.lowStudentCount, 1);
  assert.deepEqual(
    data,
    before,
    "selector cannot rewrite business scores or dates",
  );
});

test("invalid final and step scores are excluded rather than coerced into zeros", () => {
  for (const score of [
    null,
    "",
    "  ",
    true,
    false,
    "计分中",
    "0x40",
    "0b10",
    Infinity,
    NaN,
    -1,
    101,
  ]) {
    const metric = teacherDashboardMetrics(
      fixture([arrangement("invalid", { score })]),
    );
    assert.equal(metric.average.count, 0, String(score));
    assert.equal(metric.average.value, null);
    assert.equal(
      metric.rows[0].exclusionReasons.includes("invalid_score"),
      true,
    );
  }
  const invalidStep = arrangement("invalidStep", {
    score: 90,
    step: { effectiveScore: null },
  });
  assert.equal(formalResultRows(fixture([invalidStep])).length, 0);
  assert.equal(strictMetricNumber("0"), 0);
  assert.equal(strictMetricNumber("90.5"), 90.5);
  assert.equal(
    formalResultRows(fixture([arrangement("zero", { score: 0 })])).length,
    1,
    "a recorded numeric zero is valid",
  );
});

test("explicit null final score does not fallback to cached engine score", () => {
  const data = fixture([
    arrangement("null", {
      score: null,
      session: { scoreEngine: { effectiveScore: 100 } },
    }),
  ]);
  assert.equal(formalResultRows(data).length, 0);
  const noScore = arrangement("fallback");
  delete noScore.sessions[0].score;
  noScore.sessions[0].scoreEngine = { effectiveScore: 90 };
  assert.equal(formalResultRows(fixture([noScore]))[0].score, 90);
});

test("maximum is derived from frozen standard and out-of-range results are rejected", () => {
  const custom = arrangement("custom", { score: 45, max: 50 });
  delete custom.sessions[0].steps[0].maxScore;
  const metric = teacherDashboardMetrics(fixture([custom]));
  assert.equal(metric.average.rows[0].maxScore, 50);
  assert.equal(metric.average.value, 90);
  custom.sessions[0].score = 51;
  assert.equal(formalResultRows(fixture([custom])).length, 0);
  delete custom.snapshot.sopSnapshot.steps[0].score;
  assert.equal(
    teacherDashboardMetrics(fixture([custom])).average.exclusions.some(
      (reason) => reason.id === "invalid_maximum",
    ),
    true,
  );
});

test("unfinished, absence, void and nonformal results never enter official metrics", () => {
  const data = fixture([
    arrangement("active", {
      session: { status: "进行中", endedAt: "", resultStatus: "过程记录" },
    }),
    arrangement("absent", { session: { resultStatus: "未参加" } }),
    arrangement("void", { session: { resultStatus: "作废" } }),
    arrangement("cancelled", { arrangement: { status: "已取消" } }),
    arrangement("process", { session: { resultStatus: "过程记录" } }),
  ]);
  const metric = teacherDashboardMetrics(data);
  assert.equal(metric.average.count, 0);
  assert.equal(metric.average.excludedCount, 5);
  assert.ok(metric.average.exclusions.find((reason) => reason.id === "absent"));
  assert.equal(metric.lowStudents.length, 0);
  assert.equal(metric.errors.length, 0);
});

test("every unresolved review, disposition, safety candidate and evidence task blocks official metrics", () => {
  const rows = [
    arrangement("review", { step: { reviewStatus: "待复核" } }),
    arrangement("disposition", {
      step: { scoreDisposition: { status: "retest_required" } },
    }),
    arrangement("safety", {
      session: {
        runtime: { safetyCandidates: [{ id: "candidate", status: "pending" }] },
      },
    }),
    arrangement("task"),
    arrangement("engine", {
      session: { scoreEngine: { scoreStatus: "pending" } },
    }),
  ];
  const data = fixture(rows);
  data.evidenceTasks = [
    {
      arrangementId: "task",
      sessionId: "session-task",
      status: "awaiting_confirmation",
    },
  ];
  const metric = teacherDashboardMetrics(data);
  assert.equal(metric.average.count, 0);
  for (const reason of [
    "review_pending",
    "disposition_pending",
    "safety_pending",
    "evidence_task_pending",
  ])
    assert.ok(metric.average.exclusions.find((item) => item.id === reason));
  data.evidenceTasks[0].status = "completed";
  assert.deepEqual(
    formalResultRows(data).map((row) => row.arrangementId),
    ["task"],
  );
});

test("publication denominator contains eligible exam results only and pending review is separate", () => {
  const data = fixture([
    arrangement("published", { type: "exam", published: true }),
    arrangement("ready", { type: "exam" }),
    arrangement("pending", {
      type: "exam",
      session: { resultStatus: "待复核" },
      step: { reviewStatus: "待复核" },
    }),
    arrangement("practice"),
    arrangement("invalid", { type: "exam", score: null }),
    arrangement("absent", {
      type: "exam",
      session: { resultStatus: "未参加" },
    }),
  ]);
  const publication = teacherDashboardMetrics(data).publishing;
  assert.equal(publication.numerator, 1);
  assert.equal(publication.denominator, 2);
  assert.equal(publication.value, 50);
  assert.equal(publication.pendingCount, 1);
  assert.deepEqual(
    publication.published.map((row) => row.arrangementId),
    ["published"],
  );
  assert.deepEqual(
    publication.ready.map((row) => row.arrangementId),
    ["ready"],
  );
  data.arrangements.push(arrangement("practice2"));
  assert.equal(teacherDashboardMetrics(data).publishing.value, 50);
  assert.equal(
    teacherDashboardMetrics(data, { type: "practice" }).publishing.value,
    null,
  );
  assert.equal(teacherDashboardMetrics(fixture()).publishing.value, null);
});

test("scope filters affect numbers, details, latest students and errors through the same cohort", () => {
  const data = fixture([
    arrangement("hit", {
      score: 70,
      type: "exam",
      version: "V2",
      at: "2020-02-02T10:00:00Z",
    }),
    arrangement("otherTeacher", { score: 60, teacherId: "t2" }),
    arrangement("otherStudent", { score: 50, studentId: "student2" }),
    arrangement("oldVersion", { score: 40, version: "V1" }),
    arrangement("otherSop", { score: 30, sopId: "sop2", version: "V2" }),
  ]);
  const filters = {
    classId: "class1",
    courseId: "course1",
    sopId: "sop1",
    sopVersion: "V2",
    type: "exam",
    from: "2020-02-01",
    to: "2020-02-03",
  };
  const metric = teacherDashboardMetrics(data, filters);
  assert.deepEqual(
    metric.rows.map((row) => row.arrangementId),
    ["hit"],
  );
  assert.equal(metric.average.count, 1);
  assert.equal(metric.lowStudentCount, 1);
  assert.equal(metric.publishing.denominator, 1);
  assert.equal(metric.errors[0].count, 1);
  assert.equal(metric.scope.sessionKeys[0], "hit/session-hit");
  assert.ok(metric.scope.options.sops.find((sop) => sop.id === "sop2"));
  assert.equal(metric.scope.options.sopVersions, undefined);
  assert.equal(teacherDashboardScopeRows(data, { teacherId: "t2" }).length, 1);
});

test("latest low result selects once per student with a stable tie, excludes newer pending result", () => {
  const old = arrangement("old", { score: 50, at: "2020-01-01T10:00:00Z" });
  const recovered = arrangement("recovered", {
    score: 95,
    at: "2020-02-01T10:00:00Z",
  });
  const pending = arrangement("pending", {
    score: 40,
    at: "2020-03-01T10:00:00Z",
    session: { resultStatus: "待复核" },
  });
  const tieB = arrangement("tie-b", { score: 60, studentId: "student2" });
  const tieA = arrangement("tie-a", { score: 65, studentId: "student2" });
  const data = fixture([old, pending, tieB, recovered, tieA]);
  assert.equal(teacherDashboardMetrics(data).lowStudents.length, 1);
  assert.equal(
    teacherDashboardMetrics(data).lowStudents[0].arrangementId,
    "tie-a",
  );
  assert.deepEqual(
    latestStudentResultRows(data).map((row) => row.arrangementId),
    ["recovered", "tie-a"],
  );
  data.arrangements.reverse();
  assert.deepEqual(
    latestStudentResultRows(data).map((row) => row.arrangementId),
    ["recovered", "tie-a"],
  );
});

test("report drilldowns retain exact Session, raw denominator, version and independent provenance", () => {
  const unknown = arrangement("protected", {
    score: 100,
    session: { scoreVersion: 3 },
    step: {
      aiEvidenceState: "unknown",
      result: "未自动确认（按规则保分）",
      reviewStatus: "建议抽查",
    },
  });
  const ai = arrangement("demo-ai", {
    studentId: "student2",
    step: { aiEvidenceState: "confirmed", resultSource: "prototype_demo" },
  });
  const metric = teacherDashboardMetrics(fixture([unknown, ai]));
  const row = metric.average.rows.find(
    (item) => item.arrangementId === "protected",
  );
  assert.equal(
    row.reportPath,
    "/teacher/practices/protected/students/student1?sessionId=session-protected",
  );
  assert.equal(row.scoreVersion, undefined);
  assert.equal(row.maxScore, 100);
  assert.ok(row.source.includes("证据未自动确认"));
  assert.equal(
    metric.average.rows.find((item) => item.arrangementId === "demo-ai").source,
    "AI演示证据",
  );
  assert.equal(
    metric.errors.length,
    1,
    "AI demo deducted result has recorded error, protected full mark is not an error",
  );
});

test("error groups separate standard, captured scoring content and step ID and retain exact source reports", () => {
  const data = fixture([
    arrangement("v1-a", { score: 70 }),
    arrangement("v1-b", { score: 60, studentId: "student2" }),
    arrangement("v2", { score: 50, version: "V2", max: 80 }),
    arrangement("another-sop", { score: 40, sopId: "sop2" }),
    arrangement("another-step", {
      score: 30,
      step: { id: "step2", name: "检查手套" },
    }),
  ]);
  const errors = teacherDashboardMetrics(data).errors;
  assert.equal(errors.length, 4);
  assert.equal(errors[0].count, 2);
  assert.equal(errors[0].studentCount, 2);
  assert.equal(errors[0].rows[0].sources[0].kind, "recorded_error");
  assert.ok(
    errors[0].rows.every(
      (row) =>
        row.reportPath.includes("?sessionId=") &&
        row.reportPath.endsWith("&stepId=step1"),
    ),
  );
});

test("uncertainty, unexplained partial scores and unstarted steps are not student errors", () => {
  const data = fixture([
    arrangement("unknown", {
      score: 70,
      step: { result: "未自动确认（按规则保分）", aiEvidenceState: "unknown" },
    }),
    arrangement("unexplained", { score: 60, step: { result: "历史记录" } }),
    arrangement("unstarted", {
      score: 0,
      step: { state: "pending", result: "未进行" },
    }),
  ]);
  assert.equal(teacherDashboardMetrics(data).errors.length, 0);
});

test("current teacher deductions remain attributable even if AI evidence stays unknown", () => {
  const data = fixture([
    arrangement("review", {
      score: 70,
      step: { result: "教师已处置", aiEvidenceState: "unknown" },
      session: {
        reviewHistory: [
          {
            id: "review1",
            stepId: "step1",
            action: "人工调整步骤分",
            before: 100,
            after: 70,
            reason: "现场确认遗漏检查",
          },
        ],
      },
    }),
    arrangement("audit", {
      score: 80,
      step: { result: "教师已处置", aiEvidenceState: "unknown" },
      session: {
        gradeAuditHistory: [
          {
            id: "audit1",
            source: "review",
            actorId: "t1",
            stepIds: ["step1"],
            after: { steps: [{ id: "step1", score: 80 }] },
            reason: "线下确认动作不完整",
          },
        ],
      },
    }),
    arrangement("rule", {
      score: 90,
      step: { result: "通过" },
      session: {
        runtime: {
          aiScoringApplications: [
            {
              id: "application1",
              stepId: "step1",
              status: "applied",
              appliedDeduction: 10,
              ruleName: "确认错误扣10分",
            },
          ],
        },
      },
    }),
  ]);
  const group = teacherDashboardMetrics(data).errors[0];
  assert.equal(group.count, 3);
  assert.deepEqual(
    new Set(
      group.rows.flatMap((row) => row.sources.map((source) => source.kind)),
    ),
    new Set(["teacher_review", "grade_audit", "confirmed_scoring_rule"]),
  );
  data.arrangements[0].sessions[0].reviewHistory[0].after = 50;
  assert.equal(
    teacherDashboardMetrics(data).errors[0].count,
    2,
    "obsolete audit score cannot substantiate current deduction",
  );
});

test("scope can still identify an old or invalid source Session for outstanding support tasks", () => {
  const data = fixture([
    arrangement("pending", { session: { resultStatus: "待复核" } }),
  ]);
  assert.equal(teacherDashboardScopeRows(data).length, 1);
  assert.equal(formalResultRows(data).length, 0);
  assert.equal(
    teacherDashboardMetrics(data).scope.sessionIds[0],
    "session-pending",
  );
});

test("active Session states override stale timestamps and unopened arrangements cannot produce official results", () => {
  for (const status of ["进行中", "已暂停", "故障", "待开始", "可入场"]) {
    const metric = teacherDashboardMetrics(
      fixture([arrangement("stale", { session: { status } })]),
    );
    assert.equal(metric.average.count, 0, status);
    assert.equal(metric.rows[0].exclusionReasons.includes("unfinished"), true);
  }
  for (const status of ["草稿", "待开始", "准备中", "未开放"]) {
    assert.equal(
      formalResultRows(
        fixture([arrangement("stale", { arrangement: { status } })]),
      ).length,
      0,
      status,
    );
  }
});

test("completed exam Sessions enter averages but require parent publication stage for publication denominator", () => {
  const data = fixture([
    arrangement("active-parent", {
      type: "exam",
      score: 70,
      arrangement: { status: "进行中" },
    }),
    arrangement("ended-parent", {
      type: "exam",
      score: 80,
      arrangement: { status: "已结束" },
    }),
    arrangement("ready-parent", { type: "exam", score: 90 }),
    arrangement("pending-parent", {
      type: "exam",
      arrangement: { status: "进行中" },
      session: { resultStatus: "待复核" },
      step: { reviewStatus: "待复核" },
    }),
  ]);
  const metrics = teacherDashboardMetrics(data);
  assert.equal(metrics.average.count, 3);
  assert.equal(metrics.average.value, 80);
  assert.deepEqual(
    metrics.publishing.ready.map((r) => r.arrangementId),
    ["ready-parent"],
  );
  assert.equal(metrics.publishing.denominator, 1);
  assert.equal(metrics.publishing.pendingCount, 0);
  assert.equal(metrics.publishing.excluded.length, 3);
  assert.ok(
    metrics.publishing.excluded.every((r) =>
      r.publishingExclusionLabels.includes("考试尚未进入统一发布阶段"),
    ),
  );
});

test("session lifecycle audits do not transform uncertain grades into teacher-confirmed errors", () => {
  const ordinaryEnd = {
    id: "end-audit",
    source: "session_lifecycle",
    actorId: "t1",
    actor: "王老师",
    reason: "教师结束本次安排，按当前步骤事实生成结果",
    after: { steps: [{ id: "step1", score: 70 }] },
  };
  const data = fixture([
    arrangement("ordinary-end", {
      score: 70,
      step: { result: "未自动确认（按规则保分）", aiEvidenceState: "unknown" },
      session: {
        gradeAuditHistory: [ordinaryEnd],
        scoreRevisions: [ordinaryEnd],
      },
    }),
  ]);
  const metrics = teacherDashboardMetrics(data);
  assert.equal(metrics.average.count, 1);
  assert.deepEqual(metrics.errors, []);
  assert.deepEqual(metrics.average.rows[0].sourceLabels, [
    "按规则保分（证据未自动确认）",
  ]);
  data.arrangements[0].sessions[0].steps[0].result = "历史记录";
  delete data.arrangements[0].sessions[0].steps[0].aiEvidenceState;
  assert.equal(
    teacherDashboardMetrics(data).average.rows[0].source,
    "历史依据未记录",
  );
});

test("teacher audit must target the specific step rather than every score in its snapshot", () => {
  const audit = {
    id: "review-audit",
    source: "review",
    actorId: "t1",
    reason: "确认其他步骤遗漏操作",
    stepIds: ["other-step"],
    after: { steps: [{ id: "step1", score: 70 }] },
  };
  const data = fixture([
    arrangement("unrelated-review", {
      score: 70,
      step: { result: "未自动确认", aiEvidenceState: "unknown" },
      session: { gradeAuditHistory: [audit] },
    }),
  ]);
  assert.equal(teacherDashboardMetrics(data).errors.length, 0);
  audit.stepIds = ["step1"];
  assert.equal(teacherDashboardMetrics(data).errors.length, 1);
  audit.actorId = "system";
  const metrics = teacherDashboardMetrics(data);
  assert.equal(metrics.errors.length, 0);
  assert.equal(
    metrics.average.rows[0].sourceLabels.includes("教师复核／人工确认"),
    false,
  );
});

test("legacy snapshot SOP versions remain separate from each other and the active SOP version", () => {
  const old = arrangement("legacy-v31", { score: 70 });
  const newer = arrangement("legacy-v32", { score: 75, studentId: "student2" });
  old.snapshot = { sopVersion: "V3.1", lockedAt: "2020-01-01" };
  newer.snapshot = { sopVersion: "V3.2", lockedAt: "2020-01-02" };
  const data = fixture([old, newer]);
  data.sops = [
    {
      id: "sop1",
      name: "现在的SOP",
      version: "V9.0",
      steps: [{ id: "step1", score: 100 }],
    },
  ];
  const before = structuredClone(data);
  const metrics = teacherDashboardMetrics(data);
  assert.equal(metrics.average.count, 2);
  assert.equal(
    metrics.errors.length,
    2,
    "缺少真实快照的来源不得按当前标准合并",
  );
  assert.ok(
    metrics.errors.every((g) => g.standardBasisLabel === "历史标准信息不完整"),
  );
  assert.equal(
    teacherDashboardMetrics(data, { sopVersion: "V3.1" }).average.count,
    2,
    "旧版本查询参数不再隐含裁剪业务范围",
  );
  assert.deepEqual(data, before, "legacy version compatibility is read-only");
});

test("Session frozen and legacy SOP versions have stable precedence without inferring the active version", () => {
  const source = arrangement("version-source");
  const session = source.sessions[0];
  source.snapshot = {
    sopVersion: "arrangement-legacy",
    sopSnapshot: { id: "sop1", version: "arrangement-copy" },
  };
  session.evaluationSnapshot = {
    sopVersion: "evaluation-legacy",
    sopSnapshot: { version: "evaluation-copy" },
  };
  session.snapshot = {
    sopVersion: "session-legacy",
    sopSnapshot: { version: "session-copy" },
  };
  session.sopVersion = "session-field";
  session.version = "old-session-field";
  const data = fixture([source]);
  data.sops = [{ id: "sop1", version: "active-current" }];
  const version = () => teacherDashboardScopeRows(data)[0].sopVersion;
  assert.equal(version(), "evaluation-legacy");
  delete session.evaluationSnapshot.sopVersion;
  assert.equal(version(), "evaluation-copy");
  delete session.evaluationSnapshot;
  assert.equal(version(), "session-legacy");
  delete session.snapshot.sopVersion;
  assert.equal(version(), "session-copy");
  delete session.snapshot;
  assert.equal(version(), "session-field");
  delete session.sopVersion;
  assert.equal(version(), "old-session-field");
  delete session.version;
  assert.equal(version(), "arrangement-legacy");
  delete source.snapshot.sopVersion;
  assert.equal(version(), "arrangement-copy");
  delete source.snapshot;
  assert.equal(version(), "版本未记录");
});
