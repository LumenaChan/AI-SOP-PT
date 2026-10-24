import test from "node:test";
import assert from "node:assert/strict";
import {
  changeEvidenceTask,
  evidenceTaskGradeContext,
  evidenceTasksForSession,
  openEvidenceTasks,
  studentEvidenceTasks,
  normalizeEvidenceTasksData,
  validateEvidenceReferences,
} from "../src/evidenceTaskRules.js";
import {
  gradeStateToken,
  reviseSessionGrade,
} from "../src/gradeRevisionRules.js";
import { getExamPublishGate } from "../src/domainRules.js";

const at = "2026-10-22T10:00:00Z";
function fixture(type = "practice") {
  return {
    teachers: [{ id: "t1", name: "王老师" }],
    notifications: [],
    auditLogs: [],
    evidenceTasks: [],
    arrangements: [
      {
        id: "arr",
        name: "办理验证",
        teacherId: "t1",
        type,
        status: type === "exam" ? "待发布" : "已结束",
        sessions: [
          {
            id: "session",
            studentId: "student",
            workstationId: "w",
            status: "已复位",
            resultStatus: "正式成绩",
            score: 90,
            scoreVersion: 1,
            reviewHistory: [],
            runtime: { safetyCandidates: [] },
            recording: { status: "不可用", fullVideoAvailable: false },
            steps: [
              {
                id: "step",
                name: "操作检测",
                state: "pass",
                judgementMode: "default_pass_manual_deduction",
                rawScore: 30,
                score: 20,
                effectiveScore: 20,
                maxScore: 30,
                result: "未自动确认（独立规则扣分）",
                reviewStatus: "无需复核",
                aiEvidenceState: "unknown",
                completionSource: "manual_flow",
                scoreDisposition: { status: "normal", reason: "独立有效扣分" },
              },
              {
                id: "other",
                name: "其他步骤",
                state: "pass",
                rawScore: 70,
                score: 70,
                effectiveScore: 70,
                maxScore: 70,
                reviewStatus: "无需复核",
                scoreDisposition: { status: "normal" },
              },
            ],
          },
        ],
      },
    ],
  };
}
function context(initial = fixture()) {
  let data = initial,
    seq = 0;
  const session = () => data.arrangements[0].sessions[0];
  const act = (action, fields = {}) => {
    const task = data.evidenceTasks[0];
    const input = {
      action,
      at,
      makeId: (p) => `${p}-${++seq}`,
      actorId: "t1",
      actorName: "王老师",
      operationId: `operation-${++seq}`,
      arrangementId: "arr",
      sessionId: "session",
      stepId: "step",
      ...(task
        ? { taskId: task.id, ...evidenceTaskGradeContext(data, task) }
        : {
            expectedState: gradeStateToken(session()),
          }),
      ...fields,
    };
    const result = changeEvidenceTask(data, input);
    data = result.data;
    return { input, ...result };
  };
  return { get: () => data, set: (next) => (data = next), session, act };
}
const create = {
  kind: "retest",
  reason: "现场动作需要教师补充核验",
  studentInstruction: "请于课后到本工位联系王老师完成线下补测。",
};
const registration = {
  performedAt: "2026-10-22T09:30:00Z",
  performer: "王老师",
  process: "教师现场观察学生再次操作",
  outcome: "实际操作已完成",
  basis: "教师现场连续观察并核对操作位置",
  verificationMode: "manual",
  evidenceRefs: [],
};
function awaiting(c) {
  c.act("create", create);
  c.act("accept");
  c.act("register", registration);
}

test("B11 发起产生稳定待办、通知和发布阻断，既有分数/版本/AI来源不变", () => {
  const c = context(fixture("exam")),
    before = structuredClone(c.session());
  const { result } = c.act("create", create);
  assert.equal(result.status, "pending");
  assert.equal(result.teacherName, "王老师");
  assert.equal(result.studentId, "student");
  assert.equal(result.revision, 1);
  assert.equal(c.session().score, 90);
  assert.equal(c.session().scoreVersion, 1);
  assert.equal(c.session().steps[0].score, 20);
  assert.equal(c.session().steps[0].rawScore, 30);
  assert.equal(
    c.session().steps[0].aiEvidenceState,
    before.steps[0].aiEvidenceState,
  );
  assert.equal(c.session().steps[0].scoreDisposition.status, "retest_required");
  assert.equal(openEvidenceTasks(c.get()).length, 1);
  assert.equal(c.get().notifications[0].taskId, result.id);
  assert.equal(c.get().notifications[0].read, false);
  assert.equal(getExamPublishGate([c.session()]).passed, false);
});
test("B11 补证使用pending处置，即使默认保分模式也不能提前发布", () => {
  const c = context(fixture("exam"));
  c.act("create", { ...create, kind: "evidence" });
  assert.equal(c.session().steps[0].reviewStatus, "待补充证据");
  assert.equal(c.session().steps[0].scoreDisposition.status, "pending");
  assert.equal(getExamPublishGate([c.session()]).passed, false);
});
test("B11 发起→接手→线下登记→教师确认→当前成绩与任务同步闭环", () => {
  const c = context();
  awaiting(c);
  let task = c.get().evidenceTasks[0];
  assert.equal(task.status, "awaiting_confirmation");
  assert.equal(task.registration.verificationMode, "manual");
  assert.deepEqual(task.registration.evidenceRefs, []);
  assert.equal(c.session().scoreVersion, 1);
  c.act("confirm", {
    score: 25,
    reason: "教师依据线下补测核验调整本步有效分",
    studentConclusion: "本次线下补测已确认，请继续按要求操作。",
  });
  task = c.get().evidenceTasks[0];
  assert.equal(task.status, "completed");
  assert.equal(task.revision, 4);
  assert.equal(task.confirmation.scoreVersion, undefined);
  assert.equal(c.session().score, 95);
  assert.equal(c.session().scoreVersion, 1, "旧兼容编号保持原样，不再递增");
  assert.equal(c.session().steps[0].scoreDisposition.status, "retest_resolved");
  assert.equal(c.session().steps[0].aiEvidenceState, "unknown");
  assert.equal(c.session().steps[0].rawScore, 30);
  assert.equal(openEvidenceTasks(c.get()).length, 0);
  assert.equal(c.get().notifications[0].read, true);
  assert.equal(task.history.length, 4);
});
test("B11 确认不改变有效分时只有办理审计，不无故增加成绩版本", () => {
  const c = context();
  awaiting(c);
  c.act("confirm", {
    score: 20,
    reason: "线下核验保留原有效分",
    studentConclusion: "线下核验已完成。",
  });
  assert.equal(c.session().scoreVersion, 1);
  assert.equal(c.get().evidenceTasks[0].status, "completed");
  assert.ok(c.session().reviewHistory.length > 0);
});
test("B11 未登记或尚未接手不能直接宣布补测完成", () => {
  const c = context();
  c.act("create", create);
  assert.throws(() => c.act("register", registration), /先接手/);
  assert.throws(
    () =>
      c.act("confirm", {
        score: 30,
        reason: "完成",
        studentConclusion: "完成",
      }),
    /先登记/,
  );
  c.act("accept");
  assert.throws(
    () =>
      c.act("confirm", {
        score: 30,
        reason: "完成",
        studentConclusion: "完成",
      }),
    /先登记/,
  );
});
test("B11 登记逐项校验时间、教师、过程、结果和依据，失败保持原任务", () => {
  const c = context();
  c.act("create", create);
  c.act("accept");
  const before = structuredClone(c.get());
  for (const key of ["performedAt", "performer", "process", "outcome", "basis"])
    assert.throws(
      () => c.act("register", { ...registration, [key]: "" }),
      /请填写/,
    );
  assert.throws(
    () => c.act("register", { ...registration, performedAt: "2030-01-01" }),
    /办理时间/,
  );
  assert.throws(
    () =>
      c.act("register", { ...registration, verificationMode: "session_ref" }),
    /至少关联/,
  );
  assert.deepEqual(c.get(), before);
});
test("B11 证据引用精确定位本人已有Session/步骤；不存在、他人、重复或无视频片段均拒绝", () => {
  const d = fixture();
  const ref = { arrangementId: "arr", sessionId: "session", stepId: "step" };
  assert.deepEqual(validateEvidenceReferences(d, "student", [ref]), [ref]);
  assert.throws(
    () =>
      validateEvidenceReferences(d, "student", [
        { ...ref, sessionId: "missing" },
      ]),
    /失效/,
  );
  assert.throws(
    () => validateEvidenceReferences(d, "other", [ref]),
    /属于本次学生/,
  );
  assert.throws(
    () => validateEvidenceReferences(d, "student", [ref, ref]),
    /重复/,
  );
  d.arrangements[0].sessions[0].steps[0].timeRange = "00:00—00:30";
  assert.throws(
    () =>
      validateEvidenceReferences(d, "student", [
        { ...ref, clipRange: "00:00—00:30" },
      ]),
    /没有可用视频/,
  );
  assert.throws(
    () =>
      validateEvidenceReferences(d, "student", [
        { ...ref, clipRange: "00:40—00:50" },
      ]),
    /范围/,
  );
  d.arrangements[0].sessions[0].recording = {
    status: "完整",
    fullVideoAvailable: true,
  };
  assert.equal(
    validateEvidenceReferences(d, "student", [
      { ...ref, clipRange: "00:00—00:30" },
    ])[0].clipRange,
    "00:00—00:30",
  );
});
test("B11 引用已有记录核验保留可定位依据，确认时再检查引用仍有效", () => {
  const c = context();
  c.act("create", create);
  c.act("accept");
  c.act("register", {
    ...registration,
    verificationMode: "session_ref",
    evidenceRefs: [
      { arrangementId: "arr", sessionId: "session", stepId: "other" },
    ],
  });
  c.session().steps = c.session().steps.filter((s) => s.id !== "other");
  assert.throws(
    () =>
      c.act("confirm", {
        score: 25,
        reason: "确认",
        studentConclusion: "已完成",
      }),
    /失效/,
  );
  assert.equal(c.get().evidenceTasks[0].status, "awaiting_confirmation");
});
test("B11 未关闭任务防重复，新kind不能覆盖既有任务", () => {
  const c = context();
  const first = c.act("create", create);
  const duplicate = c.act("create", create);
  assert.equal(duplicate.result.id, first.result.id);
  assert.equal(c.get().evidenceTasks.length, 1);
  assert.equal(c.get().notifications.length, 1);
  assert.throws(
    () => c.act("create", { ...create, kind: "evidence" }),
    /已有未结任务/,
  );
});
test("B11 operationId幂等且同一标识不可用于不同内容，刷新保持处理历史", () => {
  const c = context();
  awaiting(c);
  const saved = c.act("confirm", {
    score: 25,
    reason: "现场确认",
    studentConclusion: "已完成",
    operationId: "stable-confirm",
  });
  const before = structuredClone(c.get());
  const retried = changeEvidenceTask(c.get(), saved.input);
  assert.equal(retried.idempotent, true);
  assert.deepEqual(retried.data, before);
  assert.throws(
    () =>
      changeEvidenceTask(c.get(), {
        ...saved.input,
        studentConclusion: "别的内容",
      }),
    /另一份提交/,
  );
  assert.deepEqual(normalizeEvidenceTasksData(before), before);
});
test("B11 陈旧任务revision和成绩token提交均失败，不覆盖已经更新的办理记录", () => {
  const c = context();
  const created = c.act("create", create),
    contextBefore = evidenceTaskGradeContext(c.get(), created.result);
  c.act("accept");
  assert.throws(
    () =>
      c.act("register", {
        ...registration,
        expectedTaskRevision: contextBefore.expectedTaskRevision,
      }),
    /任务状态已变化/,
  );
  c.act("register", registration);
  const stale = evidenceTaskGradeContext(c.get(), c.get().evidenceTasks[0]);
  c.session().score = 12;
  assert.throws(
    () =>
      c.act("confirm", {
        ...stale,
        score: 25,
        reason: "确认",
        studentConclusion: "完成",
      }),
    /版本|变化/,
  );
  assert.equal(c.get().evidenceTasks[0].status, "awaiting_confirmation");
});
test("B11 取消恢复本任务前的处理状态，原始有效扣分和成绩版本仍保留", () => {
  const c = context();
  const original = structuredClone(c.session());
  c.act("create", create);
  c.act("cancel", { reason: "学生已在原复核流程提交依据，无需重复补测" });
  const task = c.get().evidenceTasks[0];
  assert.equal(task.status, "cancelled");
  assert.equal(c.session().score, original.score);
  assert.equal(c.session().scoreVersion, original.scoreVersion);
  assert.deepEqual(
    c.session().steps[0].scoreDisposition,
    original.steps[0].scoreDisposition,
  );
  assert.equal(
    c.session().steps[0].reviewStatus,
    original.steps[0].reviewStatus,
  );
  assert.equal(openEvidenceTasks(c.get()).length, 0);
  assert.equal(c.get().notifications[0].read, true);
  c.act("create", create);
  assert.equal(c.get().evidenceTasks.length, 2);
});
test("B11 取消不会抹除后续安全事实或另一处置的状态，也不恢复旧分数", () => {
  for (const state of ["safety", "other"]) {
    const c = context();
    c.act("create", create);
    const step = c.session().steps[0];
    step.score = step.effectiveScore = 15;
    if (state === "safety") {
      step.redlineConfirmed = true;
      step.state = "blocked";
      step.result = "安全阻断";
    } else
      step.scoreDisposition = {
        status: "pending",
        reason: "后续独立技术处置",
        taskId: "other-task",
      };
    c.act("cancel", { reason: "本次补测取消，保留后续事实" });
    assert.equal(c.session().steps[0].score, 15);
    assert.equal(c.get().evidenceTasks[0].status, "cancelled");
    if (state === "safety")
      assert.equal(c.session().steps[0].result, "安全阻断");
    else
      assert.equal(c.session().steps[0].scoreDisposition.taskId, "other-task");
  }
});
test("B11 发布冻结拒绝发起及确认，遗留任务只允许有原因的metadata取消", () => {
  const c = context(fixture("exam"));
  awaiting(c);
  c.session().scoreFrozen = true;
  c.session().resultStatus = "已发布";
  c.get().arrangements[0].status = "已发布";
  const before = structuredClone(c.session());
  assert.throws(
    () =>
      c.act("confirm", {
        score: 30,
        reason: "补测完成",
        studentConclusion: "完成",
      }),
    /已发布成绩/,
  );
  assert.throws(
    () => c.act("create", { ...create, stepId: "other" }),
    /已发布成绩/,
  );
  c.act("cancel", { reason: "已发布结果保留，关闭遗留任务" });
  assert.deepEqual(c.session(), before);
  assert.equal(c.get().evidenceTasks[0].status, "cancelled");
});
test("B11 学生投影按本人筛选；考试未发布隐藏评分、标准、教师依据和结论", () => {
  const c = context(fixture("exam"));
  awaiting(c);
  c.act("confirm", {
    score: 25,
    reason: "内部核验依据与标准答案",
    studentConclusion: "包含结论的反馈",
  });
  let tasks = studentEvidenceTasks(c.get(), "student", {
    sessionId: "session",
  });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].teacherName, "王老师");
  assert.equal(tasks[0].studentInstruction, create.studentInstruction);
  for (const key of [
    "score",
    "confirmation",
    "registration",
    "reason",
    "studentConclusion",
    "priorStepState",
  ])
    assert.equal(key in tasks[0], false);
  assert.ok(!JSON.stringify(tasks).includes("标准答案"));
  assert.equal(studentEvidenceTasks(c.get(), "other").length, 0);
  c.session().resultStatus = "已发布";
  tasks = studentEvidenceTasks(c.get(), "student");
  assert.equal(tasks[0].studentConclusion, "包含结论的反馈");
  assert.equal("score" in tasks[0], false);
});
test("B11 只允许本安排教师；管理员、学生或其他教师不能办理", () => {
  const c = context();
  for (const fields of [
    { actorId: "other" },
    { actorRole: "admin" },
    { actorRole: "student" },
  ])
    assert.throws(() => c.act("create", { ...create, ...fields }), /负责教师/);
  assert.equal(c.get().evidenceTasks.length, 0);
});
test("B11 原关联取消/丢失时收束任务、关闭通知且不制造成绩变化", () => {
  const c = context();
  c.act("create", create);
  const beforeScore = c.session().score;
  c.get().arrangements[0].status = "已取消";
  const normalized = normalizeEvidenceTasksData(c.get());
  assert.equal(normalized.evidenceTasks[0].status, "cancelled");
  assert.match(normalized.evidenceTasks[0].cancelReason, /失效/);
  assert.equal(normalized.arrangements[0].sessions[0].score, beforeScore);
  assert.equal(normalized.notifications[0].read, true);
  assert.deepEqual(normalizeEvidenceTasksData(normalized), normalized);
});

test("B11 创建后取消回到原评分状态也使旧表单失效，防止ABA覆盖", () => {
  const c = context();
  const old = {
    expectedVersion: 1,
    expectedState: gradeStateToken(c.session()),
  };
  c.act("create", create);
  c.act("cancel", { reason: "现场安排取消" });
  assert.equal(c.session().scoreVersion, 1);
  assert.notEqual(gradeStateToken(c.session()), old.expectedState);
  assert.throws(() => c.act("create", { ...create, ...old }), /成绩已变化/);
});
