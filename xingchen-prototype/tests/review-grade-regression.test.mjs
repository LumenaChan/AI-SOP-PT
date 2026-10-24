import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";
import { gradeStateToken } from "../src/gradeRevisionRules.js";
import { evidenceTaskGradeContext } from "../src/evidenceTaskRules.js";
import { getExamPublishGate, getPublishBlockers } from "../src/domainRules.js";
import { teacherDashboardMetrics } from "../src/teacherDashboardMetrics.js";
const raw = () =>
  JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
const at = "2026-10-23T01:00:00Z";
for (const value of [null, "", 0])
  test(`R01 补证完整办理状态保留总分 ${JSON.stringify(value)} 及版本`, () => {
    const data = raw(),
      a = data.arrangements.find(
        (a) => a.id === "practice-dashboard-empty-20261022",
      ),
      s = a.sessions[0];
    s.score = value;
    const original = structuredClone(s),
      store = createAiRuntimeStore(data, { now: () => at });
    let task,
      seq = 0;
    const current = () =>
      store.getData().arrangements.find((x) => x.id === a.id).sessions[0];
    const act = (action, fields = {}) =>
      (task = store.changeEvidenceTask({
        action,
        arrangementId: a.id,
        sessionId: s.id,
        stepId: s.steps[0].id,
        actorId: "t1",
        operationId: `r01-${++seq}`,
        ...(task
          ? {
              taskId: task.id,
              ...evidenceTaskGradeContext(store.getData(), task),
            }
          : {
              expectedState: gradeStateToken(s),
            }),
        ...fields,
      }));
    const check = () => {
      assert.equal(current().score, value);
      assert.equal(current().scoreVersion, original.scoreVersion);
      assert.deepEqual(current().scoreRevisions, original.scoreRevisions);
    };
    act("create", {
      kind: "evidence",
      reason: "核对原始记录",
      studentInstruction: "联系负责教师核验",
    });
    check();
    act("accept");
    check();
    act("register", {
      performedAt: "2026-10-22T23:00:00Z",
      performer: "王老师",
      process: "现场核对操作",
      outcome: "已核实，等待确认",
      verificationMode: "manual",
      basis: "教师现场操作核验",
    });
    check();
    act("cancel", { reason: "保留原分，取消办理" });
    check();
    const reload = createAiRuntimeStore(
      JSON.parse(JSON.stringify(store.getData())),
    );
    assert.equal(
      reload.getData().arrangements.find((x) => x.id === a.id).sessions[0]
        .score,
      value,
    );
    if (value === null || value === "")
      assert.ok(
        !teacherDashboardMetrics(store.getData()).average.rows.some(
          (r) => r.sessionId === s.id,
        ),
      );
  });
for (const value of [null, "", -1, 101, false, "abc", "0x10"])
  test(`R02 非法总分 ${JSON.stringify(value)} 在预检和发布侧均被拒绝`, () => {
    const data = raw(),
      a = data.arrangements.find(
        (a) => a.id === "exam-dashboard-unpublished-20261022",
      ),
      s = a.sessions[0];
    s.score = value;
    assert.equal(getExamPublishGate(a.sessions).passed, false);
    assert.equal(getPublishBlockers(a.sessions).length, 1);
    assert.ok(
      !teacherDashboardMetrics(data).publishing.ready.some(
        (r) => r.sessionId === s.id,
      ),
    );
  });
test("R02 合法零分/满分可发布；缺失有效步骤分不能回退到旧分", () => {
  for (const score of [0, 100, "0"]) {
    const d = raw(),
      a = d.arrangements.find(
        (a) => a.id === "exam-dashboard-unpublished-20261022",
      );
    a.sessions[0].score = score;
    assert.equal(getExamPublishGate(a.sessions).passed, true);
    assert.equal(getPublishBlockers(a.sessions).length, 0);
  }
  for (const value of [null, "", false, -1, 999]) {
    const d = raw(),
      a = d.arrangements.find(
        (a) => a.id === "exam-dashboard-unpublished-20261022",
      );
    a.sessions[0].steps[0].effectiveScore = value;
    assert.equal(getExamPublishGate(a.sessions).passed, false);
    assert.equal(getPublishBlockers(a.sessions).length, 1);
  }
});
test("R02 无满分依据和未核定结果拦截，未参加保留豁免", () => {
  const d = raw(),
    a = d.arrangements.find(
      (a) => a.id === "exam-dashboard-unpublished-20261022",
    ),
    s = a.sessions[0];
  s.maxScore = null;
  assert.equal(getExamPublishGate([s]).passed, false);
  delete s.maxScore;
  s.resultStatus = "待复核";
  assert.equal(getExamPublishGate([s]).passed, false);
  s.resultStatus = "未参加";
  s.score = null;
  assert.equal(getExamPublishGate([s]).passed, true);
});
