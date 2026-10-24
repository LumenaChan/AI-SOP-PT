import test from "node:test";
import assert from "node:assert/strict";
import {
  changeSupportTask,
  openSupportTasks,
  studentSupportTasks,
  normalizeSupportTasksData,
  supportTaskGradeContext,
  supportTaskSourceContext,
  supportTasksForSession,
  supportTaskReportPath,
  candidateSupportResults,
} from "../src/supportTaskRules.js";
import { gradeStateToken } from "../src/gradeRevisionRules.js";
import { teacherDashboardMetrics } from "../src/teacherDashboardMetrics.js";

const at = "2026-10-22T10:00:00Z";
const create = {
  reason: "工具使用动作需要辅导",
  studentInstruction: "请于课后联系王老师复习工具使用并完成复查。",
};
const guidance = {
  performedAt: "2026-10-22T09:10:00Z",
  performer: "王老师",
  process: "现场演示工具持握并观察学生练习",
  outcome: "学生已完成练习，等待复查",
};
const manual = {
  verificationMode: "manual",
  performedAt: "2026-10-22T09:45:00Z",
  performer: "王老师",
  basis: "现场连续核验工具持握和操作流程",
  studentConclusion: "辅导与复查已完成，请继续按要求练习。",
};

function arrangement(id, score, options = {}) {
  const sop = {
    id: options.sopId || "sop",
    name: "工具操作",
    version: options.sopVersion || "V1.0",
    steps: [
      {
        id: "step",
        name: "工具使用",
        completionCondition: options.condition || "按规范持握工具并完成操作",
        score: 100,
        maxScore: 100,
      },
    ],
  };
  const session = {
    id: `session-${id}`,
    studentId: options.studentId || "student",
    status: "待复位",
    resultStatus: "正式成绩",
    score,
    scoreVersion: 1,
    scoreEngine: { effectiveScore: score, scoreStatus: "final" },
    endedAt: options.resultAt || "2026-10-21T09:00:00Z",
    reviewHistory: [],
    steps: [
      {
        id: "step",
        name: "工具使用",
        state: "pass",
        score,
        effectiveScore: score,
        rawScore: 100,
        maxScore: 100,
        result: "通过",
        reviewStatus: "无需复核",
        scoreDisposition: { status: "normal" },
      },
    ],
    evaluationSnapshot: { sopId: sop.id, sopSnapshot: sop },
    ...options.session,
  };
  return {
    id,
    name: `工具操作-${id}`,
    type: options.type || "practice",
    teacherId: options.teacherId || "t1",
    sopId: sop.id,
    sopVersion: sop.version,
    classId: "class",
    courseId: "course",
    status: "已结束",
    scheduleStart: options.resultAt || "2026-10-21T08:00:00Z",
    endedAt: session.endedAt,
    snapshot: { sopId: sop.id, sopSnapshot: sop },
    sessions: [session],
    ...options.arrangement,
  };
}
function fixture(type = "practice") {
  return {
    teachers: [{ id: "t1", name: "王老师" }],
    students: [{ id: "student", name: "张同学", classId: "class" }],
    notifications: [],
    auditLogs: [],
    supportTasks: [],
    sops: [{ id: "sop", name: "工具操作", version: "V1.0" }],
    arrangements: [arrangement("source", 65, { type })],
  };
}
function context(initial = fixture()) {
  let data = initial,
    sequence = 0;
  const task = () => data.supportTasks[0];
  const source = () =>
    data.arrangements.find((a) => a.id === "source").sessions[0];
  const act = (action, fields = {}) => {
    const input = {
      action,
      at,
      operationId: `support-operation-${++sequence}`,
      makeId: (p) => `${p}-${++sequence}`,
      actorId: "t1",
      actorName: "王老师",
      arrangementId: "source",
      sessionId: "session-source",
      ...(task()
        ? { taskId: task().id, ...supportTaskGradeContext(data, task()) }
        : {
            expectedState: gradeStateToken(source()),
          }),
      ...fields,
    };
    const result = changeSupportTask(data, input);
    data = result.data;
    return { input, ...result };
  };
  return { get: () => data, set: (next) => (data = next), source, task, act };
}
function awaiting(c) {
  c.act("create", create);
  c.act("start");
  c.act("record", guidance);
}

test("B16 有效最新低分发起稳定辅导任务，不修改任何成绩、排课或AI记录", () => {
  const c = context(),
    before = structuredClone(c.get().arrangements);
  const { result } = c.act("create", create);
  assert.equal(result.status, "pending");
  assert.equal(result.revision, 1);
  assert.equal(result.studentId, "student");
  assert.equal(result.sopId, "sop");
  assert.ok(result.standardBasisKey.includes("按规范持握工具并完成操作"));
  assert.equal(result.sopVersion, undefined);
  assert.equal(result.sourceScore, 65);
  assert.equal(result.sourceNormalizedScore, 65);
  assert.equal(result.sourceScoreVersion, undefined);
  assert.equal(result.teacherName, "王老师");
  assert.deepEqual(c.get().arrangements, before);
  assert.equal(c.get().notifications.length, 1);
  assert.equal(
    c.get().notifications[0].path,
    `/teacher/support-tasks/${result.id}`,
  );
  assert.equal(c.get().notifications[0].read, false);
  assert.equal(c.get().auditLogs[0].result, "成功");
  assert.ok(c.get().auditLogs[0].target.includes("session-source"));
  assert.equal(openSupportTasks(c.get()).length, 1);
});
test("B16 空值、布尔、非法分、待复核、过程记录及未结束结果不能发起", () => {
  for (const score of [null, "", true, false, "NaN", -1, 101]) {
    const data = fixture();
    Object.assign(data.arrangements[0].sessions[0], {
      score,
      scoreEngine: { effectiveScore: score, scoreStatus: "final" },
    });
    assert.throws(
      () => context(data).act("create", create),
      /有效正式|最新低分/,
    );
  }
  for (const field of [
    { resultStatus: "待复核" },
    { resultStatus: "过程记录" },
    { status: "进行中" },
    { scoreEngine: { effectiveScore: 65, scoreStatus: "pending" } },
  ]) {
    const data = fixture();
    Object.assign(data.arrangements[0].sessions[0], field);
    assert.throws(
      () => context(data).act("create", create),
      /有效正式|最新低分/,
    );
  }
  for (const status of ["草稿", "已取消"]) {
    const data = fixture();
    data.arrangements[0].status = status;
    assert.throws(
      () => context(data).act("create", create),
      /有效正式|最新低分/,
    );
  }
});
test("B16 百分制阈值采用归一化分数，80分边界与非百分总分正确处理", () => {
  for (const score of [80, 100])
    assert.throws(
      () =>
        context({
          ...fixture(),
          arrangements: [arrangement("source", score)],
        }).act("create", create),
      /最新低分/,
    );
  const data = fixture();
  const session = data.arrangements[0].sessions[0];
  session.score = session.steps[0].score = session.steps[0].effectiveScore = 16;
  session.scoreEngine.effectiveScore = 16;
  session.steps[0].maxScore = session.steps[0].rawScore = 20;
  session.evaluationSnapshot.sopSnapshot.steps[0].score = 20;
  session.evaluationSnapshot.sopSnapshot.steps[0].maxScore = 20;
  assert.throws(() => context(data).act("create", create), /最新低分/);
});
test("B16 新结果存在时旧低分不能发起，但同人不同标准/评分口径/类型不混用", () => {
  const data = fixture();
  data.arrangements.push(
    arrangement("later", 90, { resultAt: "2026-10-21T10:00:00Z" }),
  );
  assert.throws(() => context(data).act("create", create), /最新低分/);
  for (const options of [
    { sopId: "other" },
    { condition: "换用新工具完成另一项操作" },
    { type: "exam" },
  ]) {
    const separate = fixture();
    separate.arrangements.push(
      arrangement("later", 90, {
        ...options,
        resultAt: "2026-10-21T10:00:00Z",
      }),
    );
    assert.equal(
      context(separate).act("create", create).result.status,
      "pending",
    );
  }
});
test("B16 仅负责教师t1可发起及办理，教师不可以替别人办理", () => {
  for (const fields of [
    { actorRole: "student" },
    { actorRole: "admin" },
    { actorId: "t2" },
    { actorId: "student" },
  ])
    assert.throws(
      () => context().act("create", { ...create, ...fields }),
      /负责教师/,
    );
  const data = fixture();
  data.arrangements[0].teacherId = "t2";
  assert.throws(() => context(data).act("create", create), /负责教师/);
  const c = context();
  c.act("create", create);
  assert.throws(() => c.act("start", { actorId: "t2" }), /负责教师/);
});
test("B16 新建核对来源当前成绩，姓名和来源快照从业务记录读取", () => {
  const c = context();
  assert.throws(
    () => c.act("create", { ...create, expectedState: "stale-state" }),
    /成绩已变化/,
  );
  assert.throws(
    () => c.act("create", { ...create, expectedState: "stale" }),
    /成绩已变化/,
  );
  assert.throws(
    () => c.act("create", { ...create, expectedState: undefined }),
    /页面已失效/,
  );
  assert.equal(c.act("create", create).result.studentName, "张同学");
  assert.equal(supportTaskSourceContext(c.get(), c.task()).changed, false);
});
test("B16 相同学生同标准/评分口径/类型未结任务不重复创建或通知", () => {
  const c = context();
  const first = c.act("create", create);
  const again = c.act("create", create);
  assert.equal(again.result.id, first.result.id);
  assert.equal(again.idempotent, true);
  assert.equal(c.get().supportTasks.length, 1);
  assert.equal(c.get().notifications.length, 1);
  assert.equal(c.get().auditLogs.length, 1);
  c.act("start");
  c.act("record", guidance);
  assert.equal(c.act("create", create).result.status, "awaiting_review");
});
test("B16 同operationId重试幂等，更换内容不得复用，陈旧task revision不能提交", () => {
  const c = context();
  const first = c.act("create", create);
  const retry = changeSupportTask(c.get(), {
    ...first.input,
    at: "2026-10-22T10:01:00Z",
  });
  assert.equal(retry.data, c.get());
  assert.equal(retry.idempotent, true);
  assert.throws(
    () => changeSupportTask(c.get(), { ...first.input, reason: "另一份原因" }),
    /另一份提交/,
  );
  c.act("start");
  assert.throws(
    () => c.act("record", { ...guidance, expectedTaskRevision: 1 }),
    /任务状态已变化/,
  );
  const record = c.act("record", guidance);
  assert.equal(changeSupportTask(c.get(), record.input).idempotent, true);
});
test("B16 完整线下辅导闭环，公开结论与内部依据分离，历史成绩不变", () => {
  const c = context(),
    before = structuredClone(c.get().arrangements);
  awaiting(c);
  assert.equal(c.task().status, "awaiting_review");
  const result = c.act("review", manual).result;
  assert.equal(result.status, "completed");
  assert.equal(result.revision, 4);
  assert.equal(result.guidanceRecords.length, 1);
  assert.equal(result.verification.basis, manual.basis);
  assert.equal(result.studentConclusion, manual.studentConclusion);
  assert.equal(result.history.length, 4);
  assert.equal(openSupportTasks(c.get()).length, 0);
  assert.equal(c.get().notifications[0].read, true);
  assert.deepEqual(c.get().arrangements, before);
  assert.equal(teacherDashboardMetrics(c.get()).lowStudents.length, 1);
  assert.throws(() => c.act("review", manual), /已结束/);
});
test("B16 不允许跳过开始和完整指导登记直接完成，可继续补充指导", () => {
  const c = context();
  c.act("create", create);
  assert.throws(() => c.act("record", guidance), /先开始辅导/);
  assert.throws(() => c.act("review", manual), /先登记完整辅导/);
  c.act("start");
  assert.throws(() => c.act("start"), /仅待安排/);
  assert.throws(() => c.act("review", manual), /先登记完整辅导/);
  c.act("record", guidance);
  c.act("record", {
    ...guidance,
    process: "补充工具归位要点",
    performedAt: "2026-10-22T09:20:00Z",
  });
  assert.equal(c.task().guidanceRecords.length, 2);
  assert.equal(c.task().guidanceRecords[0].process, guidance.process);
});
test("B16 指导与复查逐项要求明确内容、教师、时间、依据，失败不改状态", () => {
  const c = context();
  c.act("create", create);
  c.act("start");
  for (const key of ["performedAt", "performer", "process", "outcome"])
    assert.throws(() => c.act("record", { ...guidance, [key]: "" }), /请填写/);
  assert.throws(
    () => c.act("record", { ...guidance, performedAt: "2030-01-01" }),
    /辅导时间/,
  );
  c.act("record", guidance);
  const before = structuredClone(c.get());
  for (const key of ["performedAt", "performer", "basis", "studentConclusion"])
    assert.throws(() => c.act("review", { ...manual, [key]: "" }), /请填写/);
  assert.throws(
    () => c.act("review", { ...manual, verificationMode: "upload" }),
    /请选择/,
  );
  assert.throws(
    () => c.act("review", { ...manual, performedAt: "invalid" }),
    /复查时间/,
  );
  assert.throws(
    () => c.act("review", { ...manual, performedAt: "2030-01-01" }),
    /复查时间/,
  );
  assert.throws(
    () => c.act("review", { ...manual, performedAt: "2026-10-20T00:00:00Z" }),
    /早于已登记/,
  );
  assert.deepEqual(c.get(), before);
});
test("B16 复查可以引用后续本人同标准评分口径有效正式练习，引用所选当前成绩", () => {
  const c = context();
  awaiting(c);
  const data = c.get();
  data.arrangements.push(
    arrangement("follow", 90, { resultAt: "2026-10-22T09:30:00Z" }),
  );
  const refs = candidateSupportResults(data, c.task());
  assert.equal(refs.length, 1);
  const follow = refs[0];
  const result = c.act("review", {
    ...manual,
    verificationMode: "session_ref",
    resultRef: {
      arrangementId: follow.arrangementId,
      sessionId: follow.sessionId,
      scoreVersion: follow.scoreVersion,
      expectedState: follow.gradeState,
    },
  }).result;
  assert.equal(result.verification.resultRef.sessionId, "session-follow");
  assert.equal(result.verification.resultRef.score, 90);
  assert.equal(result.verification.resultRef.scoreVersion, undefined);
  assert.ok(
    result.verification.resultRef.reportPath.includes("session-follow"),
  );
});
test("B16 原记录、他人、旧结果、异标准/评分口径、考试、未结束、待复核不能充作复练", () => {
  const c = context();
  awaiting(c);
  const data = c.get();
  for (const [id, options] of [
    ["other-person", { studentId: "other" }],
    ["old", { resultAt: "2026-10-20T09:00:00Z" }],
    ["other-sop", { sopId: "other" }],
    ["changed-basis", { condition: "换用新工具完成另一项操作" }],
    ["exam", { type: "exam" }],
    ["active", { session: { status: "进行中" } }],
    ["review", { session: { resultStatus: "待复核" } }],
  ]) {
    data.arrangements.push(
      arrangement(id, 90, { resultAt: "2026-10-22T09:30:00Z", ...options }),
    );
    const session = data.arrangements.at(-1).sessions[0];
    assert.throws(
      () =>
        c.act("review", {
          ...manual,
          verificationMode: "session_ref",
          resultRef: {
            arrangementId: id,
            sessionId: session.id,
            scoreVersion: 1,
            expectedState: gradeStateToken(session),
          },
        }),
      /后续有效正式练习/,
    );
  }
  assert.throws(
    () =>
      c.act("review", {
        ...manual,
        verificationMode: "session_ref",
        resultRef: {
          arrangementId: "source",
          sessionId: "session-source",
          scoreVersion: 1,
          expectedState: gradeStateToken(c.source()),
        },
      }),
    /后续有效正式练习/,
  );
  assert.throws(
    () => c.act("review", { ...manual, verificationMode: "session_ref" }),
    /可定位/,
  );
});
test("B16 所选复练成绩变化、缺少精确引用或复查早于结果不能完成", () => {
  const c = context();
  awaiting(c);
  c.get().arrangements.push(
    arrangement("follow", 90, { resultAt: "2026-10-22T09:30:00Z" }),
  );
  const follow = candidateSupportResults(c.get(), c.task())[0];
  const resultRef = {
    arrangementId: follow.arrangementId,
    sessionId: follow.sessionId,
    scoreVersion: follow.scoreVersion,
    expectedState: follow.gradeState,
  };
  assert.throws(
    () =>
      c.act("review", {
        ...manual,
        verificationMode: "session_ref",
        resultRef: { ...resultRef, expectedState: "stale-state" },
      }),
    /成绩已变化/,
  );
  assert.throws(
    () =>
      c.act("review", {
        ...manual,
        verificationMode: "session_ref",
        resultRef: { ...resultRef, expectedState: undefined },
      }),
    /成绩已变化/,
  );
  assert.throws(
    () =>
      c.act("review", {
        ...manual,
        performedAt: "2026-10-22T09:20:00Z",
        verificationMode: "session_ref",
        resultRef,
      }),
    /早于所引用/,
  );
});
test("B16 来源成绩后来被B12调高，任务保留发起依据和历史，不自动移除", () => {
  const c = context();
  c.act("create", create);
  const originalTask = structuredClone(c.task());
  const session = c.source();
  session.score = session.steps[0].score = session.steps[0].effectiveScore = 95;
  session.scoreEngine.effectiveScore = 95;
  session.scoreVersion = 2;
  c.set(normalizeSupportTasksData(c.get()));
  assert.deepEqual(c.task(), originalTask);
  assert.equal(openSupportTasks(c.get()).length, 1);
  const source = supportTaskSourceContext(c.get(), c.task());
  assert.equal(source.changed, true);
  assert.equal(source.score, 95);
  assert.equal(source.scoreVersion, undefined);
  assert.equal(c.task().sourceScore, 65);
  assert.equal(c.task().sourceScoreVersion, undefined);
  assert.throws(() => c.act("create", create), /最新低分/);
  c.act("start");
  c.act("record", guidance);
  c.act("review", manual);
  assert.equal(c.source().score, 95);
});
test("B16 同学生多个任务按学生去重，完成辅导只减少未结任务，不改低分事实", () => {
  const data = fixture();
  data.arrangements.push(arrangement("second", 55, { sopId: "other" }));
  const c = context(data);
  c.act("create", create);
  c.act("create", {
    ...create,
    arrangementId: "second",
    sessionId: "session-second",
    ...supportTaskGradeContext(c.get(), {
      arrangementId: "second",
      sessionId: "session-second",
    }),
  });
  assert.equal(openSupportTasks(c.get()).length, 2);
  assert.equal(
    new Set(openSupportTasks(c.get()).map((t) => t.studentId)).size,
    1,
  );
  c.act("start");
  c.act("record", guidance);
  c.act("review", manual);
  assert.equal(openSupportTasks(c.get()).length, 1);
  assert.equal(teacherDashboardMetrics(c.get()).lowStudents.length, 1);
});
test("B16 取消需要原因并保留历史，取消后允许人工重新发起，通知不等于办理", () => {
  const c = context();
  c.act("create", create);
  c.get().notifications[0].read = true;
  assert.equal(openSupportTasks(c.get()).length, 1);
  assert.throws(() => c.act("cancel", { reason: "" }), /必须填写原因/);
  const originalTask = c.task();
  c.act("cancel", { reason: "学生已调整辅导计划，另行安排" });
  assert.equal(c.task().cancelReason, "学生已调整辅导计划，另行安排");
  assert.equal(c.task().history[0].action, "create");
  assert.equal(c.task().history[1].action, "cancel");
  assert.equal(openSupportTasks(c.get()).length, 0);
  const next = c.act("create", create).result;
  assert.notEqual(next.id, originalTask.id);
  assert.equal(c.get().supportTasks.length, 2);
});
test("B16 无效关联自动收束且幂等，不丢历史或写分，源学生改变不串任务", () => {
  for (const change of [
    (d) => {
      d.arrangements = [];
    },
    (d) => {
      d.arrangements[0].status = "已取消";
    },
    (d) => {
      d.arrangements[0].sessions = [];
    },
    (d) => {
      d.arrangements[0].sessions[0].studentId = "other";
    },
    (d) => {
      d.arrangements[0].sessions[0].resultStatus = "未参加";
    },
    (d) => {
      d.arrangements[0].teacherId = "t2";
    },
  ]) {
    const c = context();
    c.act("create", create);
    change(c.get());
    const beforeArrangements = structuredClone(c.get().arrangements);
    const next = normalizeSupportTasksData(c.get());
    assert.equal(next.supportTasks[0].status, "cancelled");
    assert.equal(next.supportTasks[0].history.length, 2);
    assert.equal(next.supportTasks[0].history[1].actorId, "system");
    assert.equal(next.notifications[0].read, true);
    assert.equal(openSupportTasks(next).length, 0);
    assert.deepEqual(next.arrangements, beforeArrangements);
    assert.deepEqual(normalizeSupportTasksData(next), next);
  }
});
test("B16 学生只见本人任务安全投影，未发布考试不泄漏分数、错误及内部依据", () => {
  const c = context(fixture("exam"));
  awaiting(c);
  c.act("review", manual);
  const tasks = studentSupportTasks(c.get(), "student");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].sourceResultVisible, false);
  assert.equal(tasks[0].teacherName, "王老师");
  assert.equal(tasks[0].studentInstruction, create.studentInstruction);
  for (const forbidden of [
    "sourceScore",
    "sourceScoreVersion",
    "sourceNormalizedScore",
    "reason",
    "guidanceRecords",
    "verification",
    "basis",
    "studentConclusion",
    "operations",
    "scoreRevision",
    "sourceScoreRevision",
  ])
    assert.equal(Object.hasOwn(tasks[0], forbidden), false, forbidden);
  assert.ok(!JSON.stringify(tasks).includes(manual.basis));
  assert.ok(!JSON.stringify(tasks).includes(guidance.process));
  assert.deepEqual(studentSupportTasks(c.get(), "other"), []);
  c.source().resultStatus = "已发布";
  assert.equal(
    studentSupportTasks(c.get(), "student")[0].studentConclusion,
    manual.studentConclusion,
  );
});
test("B16 练习学生可读最终公开结论但不能看到内部复查、改分和指导记录", () => {
  const c = context();
  awaiting(c);
  c.act("review", manual);
  const projected = studentSupportTasks(c.get(), "student", {
    arrangementId: "source",
    sessionId: "session-source",
  })[0];
  assert.equal(projected.sourceResultVisible, true);
  assert.equal(projected.studentConclusion, manual.studentConclusion);
  assert.deepEqual(
    projected.history.map((h) => Object.keys(h).sort()),
    Array(4).fill(["action", "at"]),
  );
  assert.deepEqual(
    studentSupportTasks(c.get(), "student", { sessionId: "other" }),
    [],
  );
  assert.equal(
    supportTasksForSession(c.get(), "session-source", "source").length,
    1,
  );
  assert.ok(
    supportTaskReportPath(c.task()).includes("sessionId=session-source"),
  );
  assert.ok(
    supportTaskReportPath(c.task(), "admin").startsWith("/admin/practices/"),
  );
});

test("同一实际评分依据的复练不因旧标准版本标签不同被拒绝；历史不完整可人工复查", () => {
  const c = context();
  awaiting(c);
  c.get().arrangements.push(
    arrangement("same-content", 90, {
      sopVersion: "V99-old-label",
      resultAt: "2026-10-22T09:30:00Z",
    }),
  );
  assert.equal(candidateSupportResults(c.get(), c.task()).length, 1);
  const unknown = context();
  delete unknown.get().arrangements[0].sessions[0].evaluationSnapshot;
  delete unknown.get().arrangements[0].snapshot;
  awaiting(unknown);
  assert.equal(
    candidateSupportResults(unknown.get(), unknown.task()).length,
    0,
  );
  assert.equal(unknown.act("review", manual).result.status, "completed");
});
