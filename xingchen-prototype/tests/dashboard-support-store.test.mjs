import { studentResult } from "../src/studentResultRules.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";
import {
  teacherDashboardMetrics,
  formalResultRows,
} from "../src/teacherDashboardMetrics.js";
import { teacherDashboardTasks } from "../src/teacherDashboardTasks.js";
import {
  changeSupportTask,
  supportTaskGradeContext,
  studentSupportTasks,
} from "../src/supportTaskRules.js";
import { gradeStateToken } from "../src/gradeRevisionRules.js";
const raw = () =>
  JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
const at = "2026-10-22T12:00:00Z";
const source = (data) =>
  data.arrangements.find((a) => a.id === "practice-dashboard-zero-20261022");
function createTask(store) {
  const data = store.getData(),
    a = source(data),
    s = a.sessions[0];
  return store.changeSupportTask({
    action: "create",
    arrangementId: a.id,
    sessionId: s.id,
    actorId: "t1",
    ...supportTaskGradeContext(data, { arrangementId: a.id, sessionId: s.id }),
    operationId: "store-create-support",
    reason: "最近有效正式练习低于80分",
    studentInstruction: "联系负责教师练习工具使用并完成复查",
  });
}

test("B15/B16公共store完整辅导回执与任务计数同步，原成绩及版本不变", () => {
  const store = createAiRuntimeStore(raw(), { now: () => at });
  const before = source(store.getData()).sessions[0],
    originalMetric = teacherDashboardMetrics(store.getData());
  let task = createTask(store);
  const act = (action, extra = {}) =>
    (task = store.changeSupportTask({
      action,
      taskId: task.id,
      actorId: "t1",
      ...supportTaskGradeContext(store.getData(), task),
      operationId: `store-support-${action}`,
      ...extra,
    }));
  assert.ok(
    teacherDashboardTasks(store.getData()).some(
      (t) => t.sourceIds.taskId === task.id,
    ),
  );
  act("start");
  act("record", {
    performedAt: "2026-10-22T10:00:00Z",
    performer: "王老师",
    process: "现场演示工具持握与接触顺序",
    outcome: "已指导练习，等待复查",
  });
  assert.equal(task.status, "awaiting_review");
  act("review", {
    verificationMode: "manual",
    performedAt: "2026-10-22T11:00:00Z",
    performer: "王老师",
    basis: "教师现场复查动作衔接",
    studentConclusion: "辅导复查完成，请继续规范练习",
  });
  assert.equal(task.status, "completed");
  assert.ok(
    !teacherDashboardTasks(store.getData()).some(
      (t) => t.sourceIds.taskId === task.id,
    ),
  );
  assert.match(
    studentSupportTasks(store.getData(), task.studentId).find(
      (t) => t.id === task.id,
    ).studentConclusion,
    /复查完成/,
  );
  assert.deepEqual(source(store.getData()).sessions[0], before);
  assert.equal(
    teacherDashboardMetrics(store.getData()).average.value,
    originalMetric.average.value,
  );
});

test("B12原成绩修订后辅导仍可办理且保留发起依据，不把旧分覆盖回去", () => {
  const store = createAiRuntimeStore(raw(), { now: () => at });
  let task = createTask(store);
  const a = source(store.getData()),
    s = a.sessions[0];
  store.reviseSessionGrade({
    action: "adjust",
    arrangementId: a.id,
    sessionId: s.id,
    stepId: s.steps[0].id,
    actorId: "t1",
    expectedState: gradeStateToken(s),
    operationId: "store-support-grade-change",
    score: 5,
    reason: "教师重新核验并修订正式结果",
  });
  const changed = source(store.getData()).sessions[0];
  assert.equal(task.sourceScore, 0);
  assert.equal(changed.score, 5);
  task = store.changeSupportTask({
    action: "cancel",
    taskId: task.id,
    actorId: "t1",
    ...supportTaskGradeContext(store.getData(), task),
    operationId: "store-support-cancel",
    reason: "已重新核定辅导计划，保留历史",
  });
  assert.equal(task.status, "cancelled");
  assert.equal(task.sourceScore, 0);
  assert.deepEqual(source(store.getData()).sessions[0], changed);
});

test("B16日期/课程/班级筛选的低分候选和任务创建采用同一范围", () => {
  let data = raw();
  data.supportTasks = [];
  const a = data.arrangements.find(
      (a) => a.id === "practice-dashboard-low-pending-20261022",
    ),
    s = a.sessions[0];
  const row = formalResultRows(data).find((r) => r.sessionId === s.id);
  const filters = {
    teacherId: "t1",
    type: "practice",
    sopId: row.sopId,
    sopVersion: row.sopVersion,
    classId: row.classId,
    courseId: row.courseId,
    from: "2026-10-22T05:00:00Z",
    to: "2026-10-22T05:06:00Z",
  };
  assert.equal(
    teacherDashboardMetrics(data, filters).lowStudents[0].sessionId,
    s.id,
  );
  assert.ok(
    !teacherDashboardMetrics(data, {
      ...filters,
      from: "",
      to: "",
    }).lowStudents.some((r) => r.sessionId === s.id),
  );
  const input = {
    action: "create",
    actorId: "t1",
    arrangementId: a.id,
    sessionId: s.id,
    ...supportTaskGradeContext(data, { arrangementId: a.id, sessionId: s.id }),
    reason: "所选日期内最近有效低分",
    studentInstruction: "按教师要求参加辅导",
    operationId: "scoped-create",
    at,
    filters,
  };
  const task = changeSupportTask(data, input).result;
  assert.equal(task.sourceScore, 60);
  assert.equal(task.sourceFilters.to, filters.to);
  assert.throws(
    () =>
      changeSupportTask(data, {
        ...input,
        operationId: "unscoped-old",
        filters: undefined,
      }),
    /最新低分/,
  );
});

test("B16空分来源在学生结果中保持待核对，不回退到缓存满分", () => {
  const data = raw(),
    a = data.arrangements.find(
      (a) => a.id === "practice-dashboard-empty-20261022",
    ),
    s = a.sessions[0];
  s.scoreEngine.effectiveScore = 100;
  const result = studentResult(data, s.studentId, a.id, s.id);
  assert.equal(result.visible, true);
  assert.equal(result.score, null);
});
