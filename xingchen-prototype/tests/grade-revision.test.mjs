import test from "node:test";
import assert from "node:assert/strict";
import {
  reviseSessionGrade,
  gradeStateToken,
  assertGradeMutable,
  applyGradeLifecycle,
} from "../src/gradeRevisionRules.js";
import {
  applyDefaultPassPolicy,
  getExamPublishGate,
} from "../src/domainRules.js";

const at = "2026-10-22T06:00:00.000Z";
function fixture(type = "exam") {
  const steps = [
    {
      id: "one",
      name: "第一步",
      rawScore: 20,
      score: 30,
      effectiveScore: 30,
      maxScore: 50,
      result: "待复核",
      reviewStatus: "待复核",
      state: "pass",
      completionSource: "manual_flow",
      aiEvidenceState: "unknown",
      flowCompletion: { role: "student", at: "old" },
      scoreDisposition: { status: "normal" },
      evidenceSources: [],
    },
    {
      id: "two",
      name: "第二步",
      rawScore: 50,
      score: 50,
      effectiveScore: 50,
      maxScore: 50,
      result: "通过",
      reviewStatus: "无需复核",
      state: "pass",
      completionSource: "ai",
      aiEvidenceState: "confirmed",
      scoreDisposition: { status: "normal" },
      evidenceSources: ["原证据引用"],
    },
  ];
  return {
    arrangements: [
      {
        id: "arr",
        name: "统一成绩规则测试",
        type,
        teacherId: "t1",
        status: type === "exam" ? "待发布" : "已结束",
        sessions: [
          {
            id: "session",
            studentId: "student",
            workstationId: "station",
            status: "已完成",
            resultStatus: "待复核",
            score: 80,
            scoreVersion: 2,
            steps,
            reviewHistory: [
              {
                time: "old",
                operator: "王老师",
                stepId: "one",
                before: 20,
                after: 30,
                reason: "历史人工调整",
              },
            ],
            runtime: { safetyCandidates: [] },
          },
        ],
      },
    ],
    auditLogs: [],
    evidenceTasks: [],
  };
}
const session = (data) => data.arrangements[0].sessions[0];
function change(data, payload = {}) {
  const current = session(data);
  return reviseSessionGrade(data, {
    arrangementId: "arr",
    sessionId: "session",
    stepId: "one",
    action: "adjust",
    score: 40,
    reason: "教师现场核验依据",
    expectedState: gradeStateToken(current),
    operationId: "operation-1",
    actorId: "t1",
    at,
    ...payload,
  });
}

test("B12 统一修订步骤、总分、engine、当前成绩、原始判分及处理记录，不伪造AI来源", () => {
  const data = fixture(),
    before = structuredClone(data);
  const { data: next, result } = change(data);
  const s = session(next),
    step = s.steps[0];
  assert.equal(step.score, 40);
  assert.equal(step.effectiveScore, 40);
  assert.equal(step.rawScore, 20);
  assert.equal(s.score, 90);
  assert.equal(s.scoreEngine.effectiveScore, 90);
  assert.equal(s.scoreVersion, 2, "旧兼容编号不再递增");
  assert.equal(s.resultStatus, "正式成绩");
  assert.equal(s.scoreRevisions, undefined);
  assert.equal(s.gradeAuditHistory.length, 1);
  assert.equal(s.reviewHistory.length, 2);
  assert.equal(s.originalScoreRecord, undefined);
  assert.equal(step.originalScoreRecord, undefined);
  assert.equal(step.rawScore, 20);
  assert.equal(step.completionSource, "manual_flow");
  assert.equal(step.aiEvidenceState, "unknown");
  assert.deepEqual(
    step.flowCompletion,
    before.arrangements[0].sessions[0].steps[0].flowCompletion,
  );
  assert.equal(result.changed, true);
  assert.deepEqual(data, before);
  assert.equal(next.auditLogs[0].role, "教师");
  assert.ok(next.auditLogs[0].target.includes("session"));
});
test("B12 三个普通入口与任务确认连续覆盖当前成绩，只保留修改说明", () => {
  let data = change(fixture(), { operationId: "adjust" }).data;
  data = change(data, {
    action: "review",
    conclusion: "pass",
    score: 50,
    operationId: "review",
  }).data;
  data = change(data, {
    action: "disposition",
    status: "teacher_resolved",
    score: 45,
    operationId: "disposition",
  }).data;
  data.evidenceTasks = [
    {
      id: "task",
      arrangementId: "arr",
      sessionId: "session",
      stepId: "one",
      status: "awaiting_confirmation",
    },
  ];
  data = change(data, {
    action: "task_confirm",
    taskId: "task",
    status: "retest_resolved",
    score: 48,
    operationId: "task-confirm",
    evidenceRefs: [],
  }).data;
  assert.equal(session(data).scoreVersion, 2, "旧兼容编号不再递增");
  assert.equal(session(data).score, 98);
  assert.equal(session(data).scoreRevisions, undefined);
  assert.equal(session(data).originalScoreRecord, undefined);
  assert.equal(session(data).steps[0].rawScore, 20);
  assert.equal(session(data).gradeAuditHistory.length, 4);
  assert.ok(
    session(data).gradeAuditHistory.every(
      (r) => !Object.hasOwn(r, "fromVersion") && !Object.hasOwn(r, "toVersion"),
    ),
  );
  assert.equal(session(data).steps[0].scoreDisposition.taskId, "task");
});
test("B12 仅状态/依据变化但分数不变保留审计，不增加成绩版本", () => {
  const { data: next, result } = change(fixture(), { score: 30 });
  assert.equal(session(next).scoreVersion, 2);
  assert.equal(session(next).gradeRevisionSeq, undefined);
  assert.equal(session(next).gradeAuditHistory.length, 1);
  assert.equal(session(next).scoreRevisions, undefined);
  assert.equal(result.changed, false);
  assert.notEqual(
    gradeStateToken(session(next)),
    gradeStateToken(session(fixture())),
  );
});
test("B12 同一总分的不同步骤修改仍更新当前步骤分并记录说明", () => {
  const data = fixture();
  const next = change(data, {
    patches: [
      { stepId: "one", score: 40 },
      { stepId: "two", score: 40 },
    ],
    operationId: "redistribute",
  }).data;
  assert.equal(session(next).score, 80);
  assert.equal(session(next).scoreVersion, 2, "旧兼容编号不再递增");
  assert.equal(session(next).scoreRevisions, undefined);
  assert.deepEqual(
    session(next).gradeAuditHistory[0].before.steps.map((s) => s.score),
    [30, 50],
  );
  assert.deepEqual(
    session(next).gradeAuditHistory[0].after.steps.map((s) => s.score),
    [40, 40],
  );
});
test("B12 重复同operationId返回幂等结果，payload改变拒绝，之后再次确认也不回滚", () => {
  const data = fixture();
  const first = change(data);
  const originalPayload = {
    arrangementId: "arr",
    sessionId: "session",
    stepId: "one",
    action: "adjust",
    score: 40,
    reason: "教师现场核验依据",
    expectedVersion: 2,
    expectedState: gradeStateToken(session(data)),
    operationId: "operation-1",
    actorId: "t1",
    at,
  };
  const repeated = reviseSessionGrade(first.data, originalPayload);
  assert.equal(repeated.result.idempotent, true);
  assert.equal(repeated.data, first.data);
  assert.equal(session(repeated.data).scoreRevisions, undefined);
  assert.throws(
    () => reviseSessionGrade(first.data, { ...originalPayload, score: 41 }),
    /提交标识/,
  );
  const later = change(first.data, { score: 42, operationId: "later" }).data;
  const duplicate = reviseSessionGrade(later, originalPayload);
  assert.equal(session(duplicate.data).steps[0].score, 42);
  assert.equal(session(duplicate.data).scoreVersion, 2, "旧兼容编号不再递增");
});
test("B12 成绩或办理状态已改变的旧窗口均拒绝提交，原数据不变", () => {
  const data = fixture(),
    version = 2,
    revision = gradeStateToken(session(data));
  const fresh = change(data, { score: 30 }).data;
  assert.throws(
    () =>
      change(fresh, {
        score: 40,
        operationId: "stale-state",
        expectedVersion: version,
        expectedState: revision,
      }),
    /办理状态已变化/,
  );
  const changed = change(data).data;
  assert.throws(
    () =>
      change(changed, {
        operationId: "stale-version",
        expectedVersion: version,
        expectedState: revision,
      }),
    /成绩或办理状态已变化/,
  );
});
for (const published of ["parent", "session", "legacy-flag"])
  test(`B12 ${published}的当前成绩可由教师更正，无新增版本`, () => {
    const d = fixture();
    if (published === "parent") d.arrangements[0].status = "已发布";
    if (published === "session") session(d).resultStatus = "已发布";
    if (published === "legacy-flag") session(d).scoreFrozen = true;
    const result = change(d, { score: 42 }).data;
    assert.equal(session(result).score, 92);
    assert.equal(session(result).scoreVersion, 2);
    assert.equal(session(result).gradeAuditHistory.length, 1);
    if (published !== "legacy-flag")
      assert.equal(session(result).resultStatus, "已发布");
  });
test("B12 idempotent已成功请求在后来发布后仅返回既有结果，不形成新写入", () => {
  const d = fixture(),
    oldToken = gradeStateToken(session(d));
  const next = change(d).data;
  next.arrangements[0].status = "已发布";
  session(next).scoreFrozen = true;
  const result = change(next, {
    expectedVersion: 2,
    expectedState: oldToken,
  });
  assert.equal(result.data, next);
  assert.equal(result.result.idempotent, true);
  assert.equal(session(next).scoreVersion, 2, "旧兼容编号不再递增");
});
test("B12 负责教师、缺对象、取消和未参加记录均受共享守卫保护", () => {
  const d = fixture();
  assert.throws(() => change(d, { actorId: "t2" }), /负责教师/);
  d.arrangements[0].teacherId = "t2";
  assert.throws(() => change(d), /负责教师/);
  assert.throws(() => assertGradeMutable(null, null), /不存在/);
  for (const key of ["取消", "未参加"]) {
    const x = fixture();
    if (key === "取消") x.arrangements[0].status = "已取消";
    else session(x).resultStatus = "未参加";
    assert.throws(() => change(x), /有效成绩/);
  }
});
test("B12 理由、完整token、有效数值、重复步骤和未知动作必须校验", () => {
  const d = fixture();
  for (const value of ["", null, NaN, Infinity, -1, 51, false])
    assert.throws(() => change(d, { score: value }), /步骤得分/);
  assert.throws(() => change(d, { reason: "   " }), /理由/);
  assert.throws(() => change(d, { operationId: "" }), /提交标识/);
  assert.throws(() => change(d, { expectedState: undefined }), /状态已变化/);
  assert.throws(() => change(d, { expectedState: "" }), /状态/);
  assert.throws(() => change(d, { stepId: "missing" }), /步骤不存在/);
  assert.throws(
    () =>
      change(d, {
        patches: [
          { stepId: "one", score: 30 },
          { stepId: "one", score: 30 },
        ],
      }),
    /重复/,
  );
  assert.throws(() => change(d, { action: "made-up" }), /未知/);
});
test("B12 未核实证据不允许保存复核，insufficient和直接retest_resolved必须转办理链", () => {
  const d = fixture();
  assert.throws(
    () =>
      change(d, {
        action: "review",
        conclusion: "pass",
        archiveEvidence: false,
      }),
    /依据/,
  );
  assert.throws(
    () => change(d, { action: "review", conclusion: "insufficient" }),
    /办理任务/,
  );
  assert.throws(
    () => change(d, { action: "disposition", status: "retest_resolved" }),
    /任务确认/,
  );
  assert.throws(
    () => change(d, { action: "disposition", status: "retest_required" }),
    /任务确认/,
  );
});
test("B12 无视频证据允许明确人工核验理由，引用不会虚构视频附件或AI确认", () => {
  const { data } = change(fixture(), { evidenceRefs: [] });
  const audit = session(data).gradeAuditHistory[0];
  assert.equal(audit.evidenceBasis, "teacher_statement");
  assert.deepEqual(audit.evidenceRefs, []);
  assert.equal(session(data).steps[0].aiEvidenceState, "unknown");
  const withRef = change(fixture(), {
    evidenceRefs: [
      {
        arrangementId: "evidence-arr",
        sessionId: "evidence-session",
        stepId: "one",
        clipRange: "00:01–00:03",
      },
    ],
  }).data;
  assert.equal(
    session(withRef).gradeAuditHistory[0].evidenceRefs[0].sessionId,
    "evidence-session",
  );
  assert.throws(() => change(fixture(), { evidenceRefs: "not-array" }), /列表/);
  assert.throws(() => change(fixture(), { evidenceRefs: [{}] }), /不能为空/);
});
test("B12 手工全局调整计入总分；既有pending处置和安全候选使结果继续待复核", () => {
  const d = fixture();
  session(d).manualAdjustments = [{ id: "adjust", value: 3 }];
  session(d).score = 83;
  session(d).steps[1].scoreDisposition.status = "pending";
  let next = change(d).data;
  assert.equal(session(next).score, 93);
  assert.equal(session(next).scoreEngine.manualAdjustments, 3);
  assert.equal(session(next).resultStatus, "待复核");
  assert.equal(getExamPublishGate(next.arrangements[0].sessions).passed, false);
  const safety = fixture();
  session(safety).runtime.safetyCandidates = [
    { id: "safe", status: "pending" },
  ];
  next = change(safety).data;
  assert.equal(session(next).resultStatus, "待复核");
});
test("B12 未完成补证补测禁止直接改分，只有精确且待确认任务可回写", () => {
  const d = fixture();
  d.evidenceTasks = [
    {
      id: "task",
      arrangementId: "arr",
      sessionId: "session",
      stepId: "one",
      status: "handling",
    },
  ];
  assert.throws(() => change(d), /未完成/);
  assert.throws(
    () =>
      change(d, {
        action: "task_confirm",
        taskId: "task",
        status: "retest_resolved",
      }),
    /登记完整/,
  );
  d.evidenceTasks[0].status = "awaiting_confirmation";
  assert.throws(
    () =>
      change(d, {
        action: "task_confirm",
        taskId: "wrong",
        status: "retest_resolved",
      }),
    /登记完整/,
  );
  const next = change(d, {
    action: "task_confirm",
    taskId: "task",
    status: "retest_resolved",
    score: 30,
  }).data;
  assert.equal(session(next).scoreVersion, 2);
  assert.equal(session(next).steps[0].result, "教师补测已确认");
  assert.equal(
    session(next).steps[0].scoreDisposition.status,
    "retest_resolved",
  );
  assert.equal(session(next).resultStatus, "正式成绩");
});
test("B12 任务确认忽略本任务待办，但其他任务仍阻止正式成绩", () => {
  const d = fixture();
  d.evidenceTasks = [
    {
      id: "task",
      arrangementId: "arr",
      sessionId: "session",
      stepId: "one",
      status: "awaiting_confirmation",
    },
    {
      id: "other",
      arrangementId: "arr",
      sessionId: "session",
      stepId: "two",
      status: "pending",
    },
  ];
  const next = change(d, {
    action: "task_confirm",
    taskId: "task",
    status: "teacher_resolved",
  }).data;
  assert.equal(session(next).resultStatus, "待复核");
  assert.equal(session(next).scoreVersion, 2, "旧兼容编号不再递增");
});
test("B12 active会话办理不提前形成正式成绩，已确认人工分刷新不会被默认保分覆盖", () => {
  const d = fixture("practice");
  d.arrangements[0].status = "进行中";
  session(d).status = "进行中";
  const next = change(d).data;
  assert.equal(session(next).resultStatus, "过程记录");
  const step = session(next).steps[0];
  assert.ok(step.reviewedAt);
  assert.equal(
    applyDefaultPassPolicy({
      ...step,
      aiDecision: "uncertain",
      evidenceStatus: "证据不足",
    }).effectiveScore,
    40,
  );
});
test("B12 复核fail默认保留当前有效分，显式分值才按选定的原判执行", () => {
  const d = fixture();
  const plain = reviseSessionGrade(d, {
    arrangementId: "arr",
    sessionId: "session",
    stepId: "one",
    action: "review",
    conclusion: "fail",
    reason: "确认未完成但保留已核实有效分",
    expectedVersion: 2,
    expectedState: gradeStateToken(session(d)),
    operationId: "keep",
    at,
  });
  assert.equal(session(plain.data).steps[0].score, 30);
  assert.equal(session(plain.data).scoreVersion, 2);
  const raw = change(d, {
    action: "review",
    conclusion: "fail",
    score: 20,
  }).data;
  assert.equal(session(raw).steps[0].score, 20);
  assert.equal(session(raw).scoreVersion, 2, "旧兼容编号不再递增");
  assert.equal(session(raw).steps[0].rawScore, 20);
});
test("B12 任意stepPatch不能重写AI、流程、安全和原判事实", () => {
  const d = fixture();
  const next = change(d, {
    stepPatch: {
      rawScore: 49,
      completionSource: "ai",
      aiEvidenceState: "confirmed",
      flowCompletion: { role: "teacher" },
      redlineConfirmed: false,
    },
    patches: [
      {
        stepId: "one",
        score: 40,
        rawScore: 49,
        completionSource: "ai",
        aiEvidenceState: "confirmed",
      },
    ],
  }).data;
  const step = session(next).steps[0];
  assert.equal(step.rawScore, 20);
  assert.equal(step.completionSource, "manual_flow");
  assert.equal(step.aiEvidenceState, "unknown");
  assert.equal(step.flowCompletion.role, "student");
});
test("B12 不同办理状态变化也改变并发token，帮助信息等非成绩变化不误伤token", () => {
  const d = fixture(),
    s = session(d),
    before = gradeStateToken(s);
  s.helpRequests = [{ id: "help", status: "pending" }];
  assert.equal(gradeStateToken(s), before);
  s.steps[0].scoreDisposition.status = "retest_required";
  assert.notEqual(gradeStateToken(s), before);
});
test("B12 生命周期提交直接更新当前成绩，重复结束不重复写入记录", () => {
  const previous = session(fixture());
  const candidate = {
    ...structuredClone(previous),
    scoreVersion: 99,
    status: "待复位",
    endedAt: at,
  };
  let next = applyGradeLifecycle(previous, candidate, {
    at,
    action: "教师结束安排",
    operationId: "end",
  });
  assert.equal(next.scoreVersion, 2);
  assert.equal(next.status, "待复位");
  assert.equal(next.scoreRevisions, undefined);
  assert.equal(next.gradeAuditHistory.length, 1);
  assert.equal(next.originalScoreRecord, undefined);
  const changed = {
    ...structuredClone(previous),
    score: 100,
    steps: previous.steps.map((s) => ({ ...s, score: 50, effectiveScore: 50 })),
  };
  next = applyGradeLifecycle(previous, changed, {
    at,
    action: "学生交卷",
    operationId: "submit",
  });
  assert.equal(next.scoreVersion, 2);
  assert.equal(next.scoreRevisions, undefined);
  assert.equal(next.steps[0].rawScore, 20);
  const repeated = applyGradeLifecycle(
    next,
    { ...next, scoreVersion: 88 },
    { at, action: "学生交卷", operationId: "submit" },
  );
  assert.equal(repeated.scoreVersion, 2, "旧兼容编号不再递增");
  assert.equal(repeated.scoreRevisions, undefined);
});

test("B12 无效满分和非标数值类型不能绕过分值校验", () => {
  const d = fixture();
  session(d).steps[0].maxScore = "invalid";
  assert.throws(() => change(d, { score: 40 }), /满分无效/);
  for (const score of [[30], { value: 30 }])
    assert.throws(() => change(fixture(), { score }), /步骤得分/);
});
