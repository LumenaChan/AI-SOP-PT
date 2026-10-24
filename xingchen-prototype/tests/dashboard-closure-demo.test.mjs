import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DASHBOARD_CLOSURE_DEMO_PACKAGE,
  migrateDashboardClosureDemoData,
} from "../src/dashboardClosureDemoData.js";
import { teacherDashboardMetrics } from "../src/teacherDashboardMetrics.js";
import { teacherDashboardTasks } from "../src/teacherDashboardTasks.js";
import {
  changeSupportTask,
  supportTaskGradeContext,
} from "../src/supportTaskRules.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";

function fixture() {
  const data = JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
  data.arrangements = data.arrangements.filter(
    (a) => a.demoPackageId !== DASHBOARD_CLOSURE_DEMO_PACKAGE,
  );
  data.supportTasks = (data.supportTasks || []).filter(
    (t) => !t.id.startsWith("task-dashboard-support-"),
  );
  data.notifications = (data.notifications || []).filter(
    (n) => !n.id.startsWith("dashboard-closure-"),
  );
  data.auditLogs = (data.auditLogs || []).filter(
    (n) => !n.id.startsWith("dashboard-closure-"),
  );
  data.enhancementMigrations = (data.enhancementMigrations || []).filter(
    (id) => id !== DASHBOARD_CLOSURE_DEMO_PACKAGE,
  );
  return data;
}
const demos = (data) =>
  data.arrangements.filter(
    (a) => a.demoPackageId === DASHBOARD_CLOSURE_DEMO_PACKAGE,
  );
const onlyDemos = (data) => ({ ...data, arrangements: demos(data) });
const a = (data, key) =>
  demos(data).find((a) => a.id.includes(`-dashboard-${key}-`));
const support = (data, key) =>
  data.supportTasks.find(
    (t) => t.id === `task-dashboard-support-${key}-20261022`,
  );

test("第四批只追加10组历史来源，保留全部原安排/成绩/快照/身份/设备", () => {
  const input = fixture(),
    before = structuredClone(input),
    next = migrateDashboardClosureDemoData(input);
  assert.deepEqual(input, before);
  assert.equal(demos(next).length, 10);
  for (const key of [
    "arrangements",
    "students",
    "teachers",
    "sops",
    "workstations",
    "devices",
    "evidenceTasks",
  ]) {
    for (const item of before[key] || [])
      assert.deepEqual(
        next[key].find((x) => x.id === item.id),
        item,
        `${key}/${item.id}`,
      );
  }
  assert.deepEqual(next.workstations, before.workstations);
  assert.deepEqual(next.devices, before.devices);
  for (const item of demos(next)) {
    const s = item.sessions[0];
    assert.deepEqual(item.openWorkstationIds, []);
    assert.ok(next.students.some((student) => student.id === s.studentId));
    assert.ok(next.workstations.some((w) => w.id === s.workstationId));
    assert.equal(s.recording.status, "不可用");
    assert.equal(s.recording.fullVideoAvailable, false);
    assert.deepEqual(s.runtime.safetyCandidates, []);
    assert.deepEqual(s.runtime.technicalIncidents, []);
    assert.deepEqual(s.runtime.aiObservations, []);
    assert.ok(s.steps.every((step) => step.aiEvidenceState === "unknown"));
    assert.deepEqual(s.evaluationSnapshot.sopSnapshot, {
      ...next.sops.find((sop) => sop.id === item.sopId),
      version:
        next.sops.find((sop) => sop.id === item.sopId).version ||
        "演示快照-20261022",
    });
  }
});

test("平均分按记录人次复算，重复学生、0分、空分及待复核有明确区分", () => {
  const data = migrateDashboardClosureDemoData(fixture()),
    metric = teacherDashboardMetrics(onlyDemos(data));
  assert.equal(metric.average.count, 8);
  assert.equal(
    metric.average.value,
    (60 + 70 + 65 + 72 + 75 + 88 + 82 + 0) / 8,
  );
  assert.equal(metric.average.value, 64);
  assert.equal(metric.average.excludedCount, 2);
  assert.ok(metric.average.rows.some((row) => row.score === 0));
  assert.ok(
    metric.average.rows.some(
      (row) => row.sessionId === a(data, "low-pending").sessions[0].id,
    ),
  );
  assert.ok(
    metric.average.rows.some(
      (row) => row.sessionId === a(data, "low-repeat").sessions[0].id,
    ),
  );
  assert.ok(
    metric.average.excluded
      .find((row) => row.sessionId === a(data, "empty").sessions[0].id)
      .exclusionReasons.includes("invalid_score"),
  );
  assert.equal(a(data, "empty").sessions[0].score, null);
});

test("考试发布率有已发布/待发布分子分母，待复核单列且可直达", () => {
  const data = migrateDashboardClosureDemoData(fixture()),
    metric = teacherDashboardMetrics(onlyDemos(data));
  assert.equal(metric.publishing.numerator, 1);
  assert.equal(metric.publishing.denominator, 2);
  assert.equal(metric.publishing.value, 50);
  assert.equal(metric.publishing.pendingCount, 1);
  assert.equal(
    metric.publishing.pending[0].sessionId,
    a(data, "review").sessions[0].id,
  );
  assert.equal(a(data, "published").sessions[0].scoreFrozen, true);
  const tasks = teacherDashboardTasks(onlyDemos(data));
  assert.equal(tasks.filter((t) => t.type === "publish").length, 2);
  const review = tasks.find((t) => t.type === "review");
  assert.equal(review.sourceIds.arrangementId, a(data, "review").id);
  assert.match(review.path, /sessionId=.*&stepId=/);
});

test("辅导待安排/辅导中/待复查/完成由正式命令生成，原分与版本保持不变", () => {
  const data = migrateDashboardClosureDemoData(fixture());
  assert.deepEqual(
    ["low-pending", "coaching", "awaiting-review", "completed"].map(
      (key) => support(data, key).status,
    ),
    ["pending", "coaching", "awaiting_review", "completed"],
  );
  for (const key of [
    "low-pending",
    "coaching",
    "awaiting-review",
    "completed",
  ]) {
    const task = support(data, key),
      arrangement = a(data, key),
      s = arrangement.sessions[0];
    assert.equal(task.arrangementId, arrangement.id);
    assert.equal(task.sessionId, s.id);
    assert.equal(task.studentId, s.studentId);
    assert.equal(task.sourceScore, s.score);
    assert.equal(task.sourceScoreVersion, s.scoreVersion);
    assert.ok(task.history.some((h) => h.action === "create"));
    assert.ok(
      data.notifications.some(
        (n) =>
          n.taskId === task.id &&
          n.path === `/teacher/support-tasks/${task.id}`,
      ),
    );
  }
  const completed = support(data, "completed");
  assert.equal(completed.verification.verificationMode, "manual");
  assert.match(completed.studentConclusion, /原正式成绩未修改/);
  assert.equal(completed.history.length, 4);
  assert.equal(
    teacherDashboardTasks(onlyDemos(data)).filter((t) => t.type === "support")
      .length,
    3,
  );
});

test("高频错误均有真实Session/Step和教师扣分审计，不依赖缺证或页面假条目", () => {
  const data = migrateDashboardClosureDemoData(fixture()),
    metric = teacherDashboardMetrics(onlyDemos(data));
  assert.equal(metric.errors.length, 2);
  assert.equal(metric.errors.find((g) => g.stepId === "Step 02").count, 8);
  assert.equal(metric.errors.find((g) => g.stepId === "Step 01").count, 1);
  for (const group of metric.errors)
    for (const row of group.rows) {
      assert.ok(row.sources.length);
      assert.ok(
        row.session.gradeAuditHistory.some((h) =>
          h.reason.includes("不是因录像缺失扣分"),
        ),
      );
      assert.match(row.reportPath, /sessionId=.*&stepId=/);
      const step = row.session.steps.find((step) => step.id === group.stepId);
      assert.equal(step.reviewStatus, "已确认扣分");
      assert.equal(step.rawScore, step.maxScore);
    }
});

test("复查完成同步退出首页待办而保留辅导历史，不改变平均得分", () => {
  const before = migrateDashboardClosureDemoData(fixture()),
    task = support(before, "awaiting-review");
  const metricBefore = teacherDashboardMetrics(onlyDemos(before));
  const changed = changeSupportTask(before, {
    action: "review",
    taskId: task.id,
    actorId: "t1",
    actorName: "王老师",
    ...supportTaskGradeContext(before, task),
    operationId: "test-complete-awaiting",
    at: "2026-10-22T10:00:00.000Z",
    verificationMode: "manual",
    performedAt: "2026-10-22T09:30:00.000Z",
    performer: "王老师",
    basis: "教师到场复查动作流程已掌握",
    studentConclusion: "辅导复查已完成",
  });
  const after = changed.data;
  assert.equal(
    teacherDashboardTasks(onlyDemos(after)).filter((t) => t.type === "support")
      .length,
    2,
  );
  assert.equal(support(after, "awaiting-review").status, "completed");
  assert.equal(
    support(after, "awaiting-review").history.at(-1).action,
    "review",
  );
  assert.equal(
    teacherDashboardMetrics(onlyDemos(after)).average.value,
    metricBefore.average.value,
  );
  assert.deepEqual(
    a(after, "awaiting-review").sessions[0],
    a(before, "awaiting-review").sessions[0],
  );
});

test("迁移只运行一次，用户办理/删除的演示不会刷新复活", () => {
  const once = migrateDashboardClosureDemoData(fixture());
  assert.equal(migrateDashboardClosureDemoData(once), once);
  const changed = structuredClone(once);
  changed.arrangements = changed.arrangements.filter(
    (a) => a.id !== "practice-dashboard-low-repeat-20261022",
  );
  support(changed, "low-pending").status = "cancelled";
  const before = structuredClone(changed);
  assert.deepEqual(migrateDashboardClosureDemoData(changed), before);
});

test("已有更新的本人正式成绩时，不通过演示种子覆盖或办理用户原有辅导", () => {
  const original = migrateDashboardClosureDemoData(fixture());
  const input = fixture(),
    future = structuredClone(a(original, "low-pending"));
  future.id = "user-future-result";
  future.demoPackageId = undefined;
  future.sessions[0].id = "user-future-session";
  future.sessions[0].endedAt = "2099-01-01T00:00:00.000Z";
  input.arrangements.push(future);
  const next = migrateDashboardClosureDemoData(input);
  assert.deepEqual(
    next.arrangements.find((a) => a.id === future.id),
    future,
  );
  assert.equal(support(next, "low-pending"), undefined);
  assert.equal(demos(next).length, 10);
});

test("缺少必要来源时不生成孤立演示，演示记录不进入业务大屏", () => {
  const empty = { arrangements: [], students: [], sops: [] };
  assert.equal(migrateDashboardClosureDemoData(empty), empty);
  const input = fixture(),
    next = migrateDashboardClosureDemoData(input),
    now = new Date("2026-10-22T08:00:00Z");
  assert.deepEqual(
    buildDataScreenSnapshot(next, { now }),
    buildDataScreenSnapshot(input, { now }),
  );
});
