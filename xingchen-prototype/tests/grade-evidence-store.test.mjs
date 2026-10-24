import test from "node:test";
import assert from "node:assert/strict";
import {
  createOpenArrangement,
  createStudentRuntimeStore,
  studentRuntimeFixture,
} from "./student-e2e-fixture.mjs";
import { gradeStateToken } from "../src/gradeRevisionRules.js";
import {
  evidenceTaskGradeContext,
  studentEvidenceTasks,
  openEvidenceTasks,
} from "../src/evidenceTaskRules.js";
import { studentResult } from "../src/studentResultRules.js";
import { getExamPublishGate } from "../src/domainRules.js";
test("B11/B12公共store完成提交、人工改分、补证办理和学生回看，当前总分同步", () => {
  const fixture = studentRuntimeFixture(),
    { store, clock } = createStudentRuntimeStore(fixture);
  const a = createOpenArrangement(store, fixture, "practice"),
    w = fixture.workstations[0].id;
  // The app's current demonstration actor is t1; real account integration remains deferred.
  let data = store.getData();
  data.arrangements[0].teacherId = "t1";
  const bound = createStudentRuntimeStore(data),
    app = bound.store;
  app.startWorkstationSession(a.id, w);
  app.finishWorkstationSession(a.id, w);
  const current = () => app.getData().arrangements[0].sessions[0];
  const context = () => ({
    arrangementId: a.id,
    sessionId: current().id,
    stepId: "step-01",
    actorId: "t1",
    expectedState: gradeStateToken(current()),
  });
  assert.equal(current().score, 100);
  assert.equal(current().scoreVersion, undefined);
  app.reviseSessionGrade({
    ...context(),
    action: "adjust",
    score: 90,
    reason: "现场核实未按要求整理工具，依据教师记录扣分",
    operationId: "store-adjust",
  });
  assert.equal(current().score, 90);
  assert.equal(current().scoreEngine.effectiveScore, 90);
  assert.equal(current().scoreVersion, undefined);
  let task = app.changeEvidenceTask({
    ...context(),
    action: "create",
    kind: "evidence",
    reason: "补充现场检查记录",
    studentInstruction: "请到工位向负责教师说明工具整理过程",
    operationId: "store-task",
  });
  assert.equal(current().scoreVersion, undefined);
  assert.equal(current().score, 90);
  assert.equal(getExamPublishGate([current()]).passed, false);
  const act = (action, extra = {}) => {
    task = app.changeEvidenceTask({
      action,
      taskId: task.id,
      ...evidenceTaskGradeContext(app.getData(), task),
      actorId: "t1",
      operationId: "store-" + action,
      ...extra,
    });
  };
  act("accept");
  act("register", {
    performedAt: bound.clock.now(),
    performer: "王老师",
    process: "核查学生原始操作记录并现场说明",
    outcome: "补充依据已核实",
    basis: "教师核验记录，无视频附件",
    verificationMode: "manual",
    evidenceRefs: [],
  });
  act("confirm", {
    score: 95,
    reason: "经补充依据核实，修正此前步骤分",
    studentConclusion: "已完成补证核验，请查看本次结果",
  });
  assert.equal(current().score, 95);
  assert.equal(current().scoreEngine.effectiveScore, 95);
  assert.equal(current().scoreVersion, undefined);
  assert.equal(task.status, "completed");
  assert.equal(openEvidenceTasks(app.getData()).length, 0);
  const result = studentResult(
    app.getData(),
    "student-e2e",
    a.id,
    current().id,
  );
  assert.equal(result.score, 95);
  assert.equal(result.version, undefined);
  assert.match(
    studentEvidenceTasks(app.getData(), "student-e2e")[0].studentConclusion,
    /已完成/,
  );
  assert.equal(current().originalScoreRecord, undefined);
});
test("B12公共store仅提交状态变化不生成成绩版本，并保留原判与独立人工总分调整", () => {
  const fixture = studentRuntimeFixture(),
    { store } = createStudentRuntimeStore(fixture);
  const a = createOpenArrangement(store, fixture, "practice"),
    w = fixture.workstations[0].id;
  store.startWorkstationSession(a.id, w);
  const data = store.getData(),
    s = data.arrangements[0].sessions[0];
  Object.assign(s.steps[0], {
    state: "pass",
    completionSource: "ai",
    aiEvidenceState: "confirmed",
    rawScore: 100,
    effectiveScore: 100,
    score: 100,
  });
  s.score = 103;
  s.manualAdjustments = [
    { id: "known-adjustment", value: 3, reason: "已核实独立人工调整" },
  ];
  s.scoreVersion = 4;
  const app = createStudentRuntimeStore(data).store;
  app.finishWorkstationSession(a.id, w);
  const next = app.getData().arrangements[0].sessions[0];
  assert.equal(next.score, 103);
  assert.equal(next.scoreEngine.effectiveScore, 103);
  assert.equal(next.scoreVersion, 4);
  assert.equal(next.gradeAuditHistory[0].scoreChanged, false);
  assert.equal(next.steps[0].rawScore, 100);
});
