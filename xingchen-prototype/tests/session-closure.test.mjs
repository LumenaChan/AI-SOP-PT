import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  changeSessionClosure,
  normalizeClosureData,
  openHelpRequests,
  sessionHelpRequests,
  progressionBlocker,
} from "../src/sessionClosureRules.js";
import {
  studentResult,
  studentRecentResults,
} from "../src/studentResultRules.js";
import { getStudentSessionAccess } from "../src/studentPracticeRules.js";
import { getStudentCurrentSessions } from "../src/studentIdentityRules.js";
import { teacherSessionEvents } from "../src/studentTeacherLinkRules.js";
import { finalizeSubmittedStep } from "../src/visualEvaluationRules.js";
import { createSessionStepsFromSop } from "../src/domainRules.js";
import {
  migrateSessionClosureDemoData,
  SESSION_CLOSURE_DEMO_PACKAGE,
} from "../src/sessionClosureDemoData.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";
import {
  createOpenArrangement,
  createStudentRuntimeStore,
  studentRuntimeFixture,
} from "./student-e2e-fixture.mjs";
const when = "2026-10-22T02:00:00Z";
function fixture(type = "practice", policy = "student_submit") {
  const standards = [1, 2, 3].map((n) => ({
    id: `step-${n}`,
    name: `操作${n}`,
    maxScore: n === 3 ? 40 : 30,
    score: n === 3 ? 40 : 30,
    manualProgressionPolicy: policy,
  }));
  const steps = createSessionStepsFromSop(standards);
  Object.assign(steps[0], { state: "active", executionState: "active" });
  return {
    arrangements: [
      {
        id: "a",
        type,
        teacherId: "t1",
        name: "测试安排",
        status: "进行中",
        snapshot: { sopSnapshot: { steps: standards } },
        sessions: [
          {
            id: "s",
            studentId: "student",
            workstationId: "w",
            status: "进行中",
            currentStepId: "step-1",
            steps,
            score: 0,
            events: [],
            runtime: {
              aiScoringApplications: [],
              technicalIncidents: [],
              safetyCandidates: [],
            },
          },
        ],
      },
    ],
    notifications: [],
    auditLogs: [],
  };
}
function context(data) {
  let state = data,
    seq = 0;
  return {
    get: () => state,
    session: () => state.arrangements[0].sessions[0],
    act: (action, payload = {}) => {
      const teacher = ["accept_help", "complete_help", "confirm_step"].includes(
        action,
      );
      const changed = changeSessionClosure(state, {
        arrangementId: "a",
        sessionId: "s",
        action,
        at: when,
        actor: teacher ? "teacher" : "student",
        actorId: teacher ? "t1" : "student",
        makeId: (p) => `${p}-${++seq}`,
        ...payload,
      });
      state = changed.data;
      return changed.result;
    },
  };
}
const help = { reasonCode: "operation_help", reasonLabel: "操作不会" };
test("B01 三步无AI均可正式推进，人工流程、AI未知与保分保持独立且最后不跳回第一步", () => {
  const c = context(fixture());
  for (let n = 1; n <= 3; n++) {
    const step = c.act("submit_step", { stepId: `step-${n}` });
    assert.equal(step.flowCompletion.role, "student");
    assert.equal(step.aiEvidenceState, "unknown");
    assert.equal(step.completionSource, "manual_flow");
    assert.equal(step.completionResult, "uncertain");
  }
  assert.equal(c.session().currentStepId, "");
  assert.equal(c.session().score, 100);
  assert.equal(c.get().auditLogs.length, 3);
  const before = structuredClone(c.get());
  c.act("submit_step", { stepId: "step-1" });
  assert.deepEqual(c.get(), before);
  assert.equal(
    finalizeSubmittedStep(c.session().steps[0], when),
    c.session().steps[0],
  );
});
test("B01 按冻结政策等待教师，学生重复提交不建重任务；教师说明必填且保留人工来源", () => {
  const c = context(fixture("practice", "teacher_confirmation"));
  const r = c.act("submit_step", { stepId: "step-1" });
  assert.equal(c.session().currentStepId, "step-1");
  assert.equal(c.act("submit_step", { stepId: "step-1" }).id, r.id);
  assert.equal(c.get().notifications.length, 1);
  assert.throws(() => c.act("confirm_step", { stepId: "step-1" }), /说明/);
  c.act("confirm_step", { stepId: "step-1", note: "现场确认操作已完成" });
  assert.equal(c.session().currentStepId, "step-2");
  assert.equal(c.session().stepConfirmation.status, "confirmed");
  assert.equal(c.session().steps[0].flowCompletion.actor, "t1");
  assert.equal(
    teacherSessionEvents(c.session()).find(
      (e) => e.type === "step_confirmation_requested",
    ).requiresAttention,
    false,
  );
});
test("B01 考试学生不能人工跳步，教师只能确认流程不能伪造AI合格", () => {
  const c = context(fixture("exam"));
  assert.throws(() => c.act("submit_step", { stepId: "step-1" }), /考试/);
  c.act("confirm_step", { stepId: "step-1", note: "学生已完成现场操作" });
  assert.equal(c.session().currentStepId, "step-2");
  assert.equal(c.session().steps[0].aiEvidenceState, "unknown");
});
for (const blocker of ["paused", "ended", "fault", "safety", "technical"])
  test(`B01 ${blocker} 阻止人工推进`, () => {
    const d = fixture(),
      a = d.arrangements[0],
      s = a.sessions[0];
    if (blocker === "paused") s.status = "已暂停";
    if (blocker === "ended") a.status = "已结束";
    if (blocker === "fault") s.status = "故障";
    if (blocker === "safety")
      s.runtime.safetyCandidates = [{ status: "pending" }];
    if (blocker === "technical")
      s.runtime.technicalIncidents = [
        { status: "open", affectsContinuation: true },
      ];
    assert.ok(progressionBlocker(a, s));
    assert.throws(() => context(d).act("submit_step", { stepId: "step-1" }));
  });
test("B01 过期步骤和其他学生/教师操作均被拒绝", () => {
  const c = context(fixture());
  assert.throws(() => c.act("submit_step", { stepId: "step-2" }), /已变化/);
  assert.throws(
    () => c.act("submit_step", { stepId: "step-1", actorId: "other" }),
    /本人/,
  );
  assert.throws(
    () =>
      c.act("confirm_step", {
        stepId: "step-1",
        actorId: "other",
        note: "确认",
      }),
    /教师/,
  );
});
test("B01 人工推进保留独立有效规则扣分及教师已核实的分数", () => {
  const d = fixture(),
    s = d.arrangements[0].sessions[0];
  s.runtime.aiScoringApplications = [
    { id: "deduct", stepId: "step-1", status: "applied", appliedDeduction: 5 },
  ];
  const c = context(d);
  c.act("submit_step", { stepId: "step-1" });
  assert.equal(c.session().steps[0].score, 25);
  Object.assign(c.session().steps[1], {
    reviewedAt: when,
    reviewStatus: "已确认扣分",
    effectiveScore: 20,
    score: 20,
  });
  c.act("submit_step", { stepId: "step-2" });
  assert.equal(c.session().steps[1].score, 20);
});
test("B01 AI已完成时重复人工确认不改AI来源，等待教师任务随AI推进收束", () => {
  const c = context(fixture("practice", "teacher_confirmation"));
  c.act("submit_step", { stepId: "step-1" });
  Object.assign(c.session().steps[0], {
    state: "pass",
    completionSource: "ai",
    aiEvidenceState: "confirmed",
  });
  c.session().currentStepId = "step-2";
  const d = normalizeClosureData(c.get());
  assert.equal(
    d.arrangements[0].sessions[0].stepConfirmation.status,
    "auto_completed",
  );
  assert.equal(d.notifications[0].read, true);
  const next = context(d);
  next.act("confirm_step", { stepId: "step-1", note: "重复点击" });
  assert.equal(next.session().steps[0].completionSource, "ai");
});
test("B02 请求→接手→回执→新请求：同一稳定对象，通知已读不等于结单", () => {
  const c = context(fixture());
  const first = c.act("request_help", help);
  assert.equal(openHelpRequests(c.get()).length, 1);
  assert.equal(c.act("request_help", help).id, first.id);
  assert.equal(c.get().notifications.length, 1);
  c.get().notifications[0].read = true;
  assert.equal(openHelpRequests(c.get()).length, 1);
  c.act("accept_help", { requestId: first.id });
  assert.equal(c.session().helpRequests[0].status, "handling");
  assert.throws(() => c.act("cancel_help", { requestId: first.id }), /接手/);
  assert.throws(() => c.act("complete_help", { requestId: first.id }), /说明/);
  c.act("complete_help", {
    requestId: first.id,
    note: "已到场指导学生重新握持工具",
  });
  assert.equal(openHelpRequests(c.get()).length, 0);
  assert.equal(
    c.session().helpRequests[0].receipt,
    "已到场指导学生重新握持工具",
  );
  assert.equal(c.session().score, 0);
  const second = c.act("request_help", { reasonCode: "device_issue" });
  assert.notEqual(second.id, first.id);
  assert.equal(c.session().helpRequests.length, 2);
  assert.equal(
    c.session().helpRequests.find((r) => r.id === first.id).history.length,
    3,
  );
  assert.equal(
    teacherSessionEvents(c.session()).find((e) => e.id === first.id)
      .requiresAttention,
    false,
  );
});
test("B02 尚未接手可撤销，撤销/完成重复点击幂等且已关闭不可接手", () => {
  const c = context(fixture());
  const r = c.act("request_help", help);
  assert.throws(
    () => c.act("complete_help", { requestId: r.id, note: "完成" }),
    /先接手/,
  );
  c.act("cancel_help", { requestId: r.id });
  const before = structuredClone(c.get());
  c.act("cancel_help", { requestId: r.id });
  assert.deepEqual(c.get(), before);
  assert.throws(() => c.act("accept_help", { requestId: r.id }), /关闭/);
  assert.equal(openHelpRequests(c.get()).length, 0);
});
test("B02 会话/安排结束、取消均关闭未完成求助，保留办理历史与原因并清理提醒", () => {
  for (const end of ["session", "arrangement", "cancel"]) {
    const c = context(fixture());
    const r = c.act("request_help", help);
    c.act("accept_help", { requestId: r.id });
    if (end === "session") c.session().status = "已完成";
    else
      c.get().arrangements[0].status = end === "cancel" ? "已取消" : "已结束";
    c.session().endedAt = when;
    const d = normalizeClosureData(c.get()),
      s = d.arrangements[0].sessions[0];
    assert.equal(s.helpRequests[0].status, "closed");
    assert.equal(s.helpRequests[0].history.length, 3);
    assert.match(s.helpRequests[0].closeReason, /结束/);
    assert.equal(d.notifications[0].read, true);
    assert.equal(openHelpRequests(d).length, 0);
    assert.deepEqual(normalizeClosureData(d), d);
  }
});
test("B02 旧求助事件迁移稳定不复活已结单，终态历史请求不会被计入待办", () => {
  const d = fixture(),
    s = d.arrangements[0].sessions[0];
  s.events = [
    {
      id: "legacy-help",
      type: "practice_help_requested",
      createdAt: when,
      requiresAttention: true,
    },
  ];
  let n = normalizeClosureData(d);
  assert.equal(sessionHelpRequests(n.arrangements[0].sessions[0]).length, 1);
  assert.deepEqual(normalizeClosureData(n), n);
  const c = context(n);
  c.act("accept_help", { requestId: "legacy-help" });
  c.act("complete_help", {
    requestId: "legacy-help",
    note: "历史请求现场已处理",
  });
  assert.equal(openHelpRequests(normalizeClosureData(c.get())).length, 0);
});
test("B02 考试异常独立原因且不改成绩，故障可求助但不能开始/推进", () => {
  const d = fixture("exam");
  d.arrangements[0].sessions[0].status = "故障";
  const c = context(d);
  assert.throws(() => c.act("request_help", help), /异常类型/);
  const r = c.act("request_help", { reasonCode: "device_failure" });
  assert.equal(r.kind, "exam");
  assert.equal(c.session().score, 0);
  assert.throws(() =>
    c.act("confirm_step", { stepId: "step-1", note: "推进" }),
  );
});
test("B02 真实公共store串起请求、教师办理、再次请求及交卷自动收束", () => {
  const data = studentRuntimeFixture(),
    { store } = createStudentRuntimeStore(data);
  const a = createOpenArrangement(store, data, "practice"),
    w = data.workstations[0].id;
  store.startWorkstationSession(a.id, w);
  let s = store.getData().arrangements[0].sessions[0];
  const r = store.requestTeacherHelp(a.id, w, help);
  store.changeSessionClosure({
    arrangementId: a.id,
    sessionId: s.id,
    action: "accept_help",
    requestId: r.id,
    actor: "teacher",
    actorId: "teacher-e2e",
  });
  store.changeSessionClosure({
    arrangementId: a.id,
    sessionId: s.id,
    action: "complete_help",
    requestId: r.id,
    note: "已完成现场指导",
    actor: "teacher",
    actorId: "teacher-e2e",
  });
  store.requestTeacherHelp(a.id, w, help);
  store.finishWorkstationSession(a.id, w);
  s = store.getData().arrangements[0].sessions[0];
  assert.deepEqual(
    s.helpRequests.map((r) => r.status),
    ["closed", "completed"],
  );
  assert.equal(openHelpRequests(store.getData()).length, 0);
});
test("B06 未发布考试返回白名单投影，完全不含分数、标准、内部备注和步骤", () => {
  const d = fixture("exam"),
    s = d.arrangements[0].sessions[0];
  Object.assign(s, {
    status: "已完成",
    endedAt: when,
    resultStatus: "正式成绩",
    score: 83,
    internalNote: "内部敏感信息",
  });
  s.steps[0].teachingInstruction = "标准答案";
  const r = studentResult(d, "student", "a", "s");
  assert.equal(r.visible, false);
  assert.equal(r.status, "已交卷 · 待发布");
  for (const field of [
    "score",
    "steps",
    "version",
    "internalNote",
    "evaluationSnapshot",
  ])
    assert.equal(field in r, false);
  assert.ok(!JSON.stringify(r).includes("标准答案"));
  assert.equal(studentResult(d, "other", "a", "s"), null);
});
test("B06 退出后查询本人已复位结果、精确Session和当前成绩，原工位已换人仍可查", () => {
  const d = fixture("exam"),
    s = d.arrangements[0].sessions[0];
  Object.assign(s, {
    status: "已复位",
    resultStatus: "已发布",
    score: 80,
    scoreVersion: 2,
    endedAt: when,
  });
  d.workstations = [{ id: "w", currentStudentId: "other" }];
  d.arrangements[0].sessions.unshift({
    ...structuredClone(s),
    id: "other-session",
    studentId: "other",
    score: 10,
  });
  let r = studentResult(d, "student", "a", "s");
  assert.equal(r.score, 80);
  assert.equal(r.version, undefined);
  assert.equal(r.steps.length, 3);
  assert.equal(studentResult(d, "student", "a", "other-session"), null);
  assert.equal(studentRecentResults(d, "student").length, 1);
});
test("B06 故障任务可发现和进入状态页，已结束仍保留未恢复故障入口；取消安排拒绝", () => {
  const d = fixture(),
    s = d.arrangements[0].sessions[0];
  s.status = "故障";
  assert.equal(getStudentCurrentSessions(d, "student").length, 1);
  assert.equal(
    getStudentSessionAccess(d, "student", "a", "w", "s").allowed,
    true,
  );
  d.arrangements[0].status = "已结束";
  assert.equal(getStudentCurrentSessions(d, "student").length, 1);
  d.arrangements[0].status = "已取消";
  assert.equal(getStudentCurrentSessions(d, "student").length, 0);
  assert.equal(
    getStudentSessionAccess(d, "student", "a", "w", "s").allowed,
    false,
  );
});
test("B06 活动会话不能伪装历史结果，未参加没有正式成绩，草稿和取消不显示", () => {
  const d = fixture();
  assert.equal(studentRecentResults(d, "student").length, 0);
  Object.assign(d.arrangements[0].sessions[0], {
    status: "待复位",
    resultStatus: "未参加",
  });
  const r = studentResult(d, "student", "a", "s");
  assert.equal(r.visible, false);
  assert.equal(r.status, "未参加");
  d.arrangements[0].status = "已取消";
  assert.equal(studentRecentResults(d, "student").length, 0);
});
test("第二批迁移只追加八组可追溯样例，双数据源可重复迁移且不改旧对象、分数和业务大屏", () => {
  const raw = JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
  const d = structuredClone(raw);
  for (const key of ["arrangements", "workstations", "devices", "sops"])
    d[key] = d[key].filter(
      (x) => x.demoPackageId !== SESSION_CLOSURE_DEMO_PACKAGE,
    );
  d.enhancementMigrations = d.enhancementMigrations.filter(
    (x) =>
      x !== SESSION_CLOSURE_DEMO_PACKAGE &&
      x !== "session-closure-auto-20261022",
  );
  d.auditLogs = d.auditLogs.filter((x) => !x.id.startsWith("closure-demo-"));
  d.notifications = d.notifications.filter(
    (x) => !x.id.startsWith("closure-demo-"),
  );
  const original = structuredClone(d),
    screen = buildDataScreenSnapshot(d, { now: new Date(when) });
  const next = migrateSessionClosureDemoData(d);
  for (const key of ["arrangements", "workstations", "devices", "sops"])
    for (const item of original[key])
      assert.deepEqual(
        next[key].find((x) => x.id === item.id),
        item,
      );
  assert.equal(
    next.arrangements.filter(
      (a) => a.demoPackageId === SESSION_CLOSURE_DEMO_PACKAGE,
    ).length,
    8,
  );
  assert.deepEqual(migrateSessionClosureDemoData(structuredClone(next)), next);
  assert.deepEqual(
    buildDataScreenSnapshot(next, { now: new Date(when) }),
    screen,
  );
  const sample = next.arrangements.find(
    (a) => a.id === "practice-closure-manual-20261022",
  );
  assert.equal(sample.sessions[0].steps.length, 3);
  assert.equal(sample.sessions[0].helpRequests.length, 3);
  assert.equal(sample.sessions[0].recording.fullVideoAvailable, false);
});

test("B01/B02/B06 同工位历史记录存在时，所有学生命令按指定Session操作且不修改他人记录", () => {
  const fixture = studentRuntimeFixture(),
    { store } = createStudentRuntimeStore(fixture);
  const a = createOpenArrangement(store, fixture, "practice"),
    w = fixture.workstations[0].id;
  const d = store.getData(),
    target = d.arrangements[0].sessions[0];
  d.arrangements[0].sessions.unshift({
    ...structuredClone(target),
    id: "other-old",
    studentId: "another-student",
    status: "已复位",
    resultStatus: "正式成绩",
    score: 65,
  });
  const { store: exact } = createStudentRuntimeStore(d);
  const before = exact.getData().arrangements[0].sessions[0];
  exact.attachStudentIdentityVerification(
    a.id,
    w,
    {
      studentId: "student-e2e",
      method: "face",
      status: "passed",
      verifiedAt: when,
    },
    target.id,
  );
  exact.startWorkstationSession(a.id, w, target.id);
  exact.recordStudentHintRequest(a.id, w, "step-01", target.id);
  const r = exact.requestTeacherHelp(a.id, w, {
    ...help,
    sessionId: target.id,
  });
  assert.equal(r.sessionId, target.id);
  exact.finishWorkstationSession(a.id, w, { sessionId: target.id });
  const next = exact.getData();
  assert.deepEqual(
    next.arrangements[0].sessions.find((s) => s.id === "other-old"),
    { ...before, helpRequests: [] },
  );
  assert.equal(
    next.arrangements[0].sessions.find((s) => s.id === target.id).status,
    "已完成",
  );
});
test("B02 仅剩旧求助时间戳的会话也有可办理记录，关闭后刷新不会复活", () => {
  const d = fixture();
  Object.assign(d.arrangements[0].sessions[0], {
    helpRequestedAt: when,
    events: [],
  });
  const n = normalizeClosureData(d);
  const c = context(n),
    r = c.session().helpRequests[0];
  assert.match(r.reasonLabel, /历史求助/);
  c.act("accept_help", { requestId: r.id });
  c.act("complete_help", { requestId: r.id, note: "旧请求已在现场处理" });
  assert.equal(openHelpRequests(normalizeClosureData(c.get())).length, 0);
});
test("B06 结果使用当前权威有效分，回执可重查且只投影学生允许字段", () => {
  const d = fixture("exam"),
    s = d.arrangements[0].sessions[0];
  Object.assign(s, {
    status: "已复位",
    resultStatus: "已发布",
    score: 81,
    scoreEngine: { effectiveScore: 100 },
    helpRequests: [
      {
        id: "receipt",
        kind: "exam",
        status: "completed",
        reasonLabel: "设备异常",
        createdAt: when,
        receipt: "已到场处理，允许继续",
        internalNote: "内部处理依据",
        history: [{ note: "内部信息" }],
      },
    ],
  });
  const r = studentResult(d, "student", "a", "s");
  assert.equal(r.score, 81);
  assert.equal(r.helpHistory[0].receipt, "已到场处理，允许继续");
  assert.ok(!JSON.stringify(r).includes("内部"));
});
