import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  migrateGradeEvidenceDemoData,
  GRADE_EVIDENCE_DEMO_PACKAGE,
} from "../src/gradeEvidenceDemoData.js";
import {
  changeEvidenceTask,
  openEvidenceTasks,
  studentEvidenceTasks,
  validateEvidenceReferences,
} from "../src/evidenceTaskRules.js";
import {
  reviseSessionGrade,
  gradeStateToken,
} from "../src/gradeRevisionRules.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";
import { getExamPublishGate } from "../src/domainRules.js";

function beforeMigration() {
  const data = JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
  data.arrangements = data.arrangements.filter(
    (a) => a.demoPackageId !== GRADE_EVIDENCE_DEMO_PACKAGE,
  );
  data.evidenceTasks = (data.evidenceTasks || []).filter(
    (t) => !t.id.startsWith("task-grade-evidence-"),
  );
  data.notifications = (data.notifications || []).filter(
    (n) => !n.id.startsWith("grade-evidence-"),
  );
  data.auditLogs = (data.auditLogs || []).filter(
    (n) => !n.id.startsWith("grade-evidence-"),
  );
  data.enhancementMigrations = (data.enhancementMigrations || []).filter(
    (id) => id !== GRADE_EVIDENCE_DEMO_PACKAGE,
  );
  return data;
}
const arrangements = (data) =>
  data.arrangements.filter(
    (a) => a.demoPackageId === GRADE_EVIDENCE_DEMO_PACKAGE,
  );
const arrangement = (data, key, type = "practice") =>
  data.arrangements.find(
    (a) => a.id === `${type}-grade-evidence-${key}-20261022`,
  );
const task = (data, key) =>
  data.evidenceTasks.find(
    (t) => t.id === `task-grade-evidence-${key}-20261022`,
  );
const now = new Date("2026-10-22T03:00:00.000Z");

test("第三批演示仅追加6组真实关联对象，不修改原安排、分数、快照、身份或设备", () => {
  const data = beforeMigration(),
    original = structuredClone(data),
    next = migrateGradeEvidenceDemoData(data);
  assert.deepEqual(data, original, "工厂不会就地改变输入数据");
  assert.equal(arrangements(next).length, 6);
  for (const key of [
    "arrangements",
    "students",
    "teachers",
    "sops",
    "workstations",
    "devices",
  ])
    for (const item of original[key])
      assert.deepEqual(
        next[key].find((entry) => entry.id === item.id),
        item,
        `${key}:${item.id}`,
      );
  assert.deepEqual(
    next.workstations,
    original.workstations,
    "历史演示不抢占正在使用的工位",
  );
  assert.deepEqual(next.devices, original.devices, "不会添加虚假媒体设备");
  assert.equal(next.evidenceTasks.length, original.evidenceTasks.length + 6);
});

test("第三批工厂幂等，处理/删除演示对象后不会重置或重建", () => {
  const once = migrateGradeEvidenceDemoData(beforeMigration());
  assert.equal(migrateGradeEvidenceDemoData(once), once);
  const changed = structuredClone(once);
  task(changed, "pending").studentInstruction = "教师已修改课堂办理说明";
  task(changed, "pending").status = "cancelled";
  changed.arrangements = changed.arrangements.filter(
    (a) => a.id !== "practice-grade-evidence-handling-20261022",
  );
  const before = structuredClone(changed);
  assert.deepEqual(migrateGradeEvidenceDemoData(changed), before);
});

test("六组样例覆盖完整办理状态，有稳定Session、学生、教师、步骤和通知定位", () => {
  const next = migrateGradeEvidenceDemoData(beforeMigration());
  assert.deepEqual(
    ["pending", "handling", "awaiting", "completed", "cancelled", "frozen"].map(
      (key) => task(next, key).status,
    ),
    [
      "pending",
      "handling",
      "awaiting_confirmation",
      "completed",
      "cancelled",
      "completed",
    ],
  );
  for (const a of arrangements(next)) {
    assert.equal(a.teacherId, "t1");
    assert.equal(a.studentIds[0], "student-demo-20261015");
    assert.deepEqual(a.openWorkstationIds, []);
    const session = a.sessions[0],
      linkedTask = next.evidenceTasks.find((t) => t.sessionId === session.id);
    assert.equal(session.status, "已复位");
    assert.equal(linkedTask.arrangementId, a.id);
    assert.equal(linkedTask.studentId, session.studentId);
    assert.ok(session.steps.some((s) => s.id === linkedTask.stepId));
    assert.equal(
      next.notifications.find((n) => n.taskId === linkedTask.id).path,
      `/teacher/evidence-tasks/${linkedTask.id}`,
    );
    assert.ok(linkedTask.history.length > 0);
  }
  assert.equal(
    openEvidenceTasks(next).filter((t) =>
      t.id.startsWith("task-grade-evidence-"),
    ).length,
    3,
  );
});

test("完成样例直接更新当前成绩，处理记录无版本编号并保留原始判分", () => {
  const next = migrateGradeEvidenceDemoData(beforeMigration()),
    session = arrangement(next, "completed").sessions[0],
    completed = task(next, "completed");
  assert.equal(session.originalScoreRecord, undefined);
  assert.equal(session.scoreVersion, undefined);
  assert.equal(session.score, 98);
  assert.equal(session.scoreEngine.effectiveScore, 98);
  assert.equal(session.scoreRevisions, undefined);
  assert.deepEqual(
    session.gradeAuditHistory.map((r) => r.scoreChanged),
    [true, true, false],
  );
  const statusOnly = session.gradeAuditHistory.at(-1);
  assert.equal(statusOnly.fromVersion, undefined);
  assert.equal(statusOnly.toVersion, undefined);
  assert.equal(completed.confirmation.scoreVersion, undefined);
  assert.ok(session.gradeAuditHistory.some((r) => r.taskId === completed.id));
  assert.equal(session.steps[0].rawScore, 30);
  assert.equal(session.steps[0].originalScoreRecord, undefined);
  assert.equal(session.steps[0].aiEvidenceState, "unknown");
  assert.equal(session.steps[0].completionSource, "manual_flow");
});

test("线下登记明确人工核验，已有步骤引用可定位且不捏造视频片段", () => {
  const next = migrateGradeEvidenceDemoData(beforeMigration()),
    waiting = task(next, "awaiting");
  assert.equal(waiting.registration.verificationMode, "manual");
  assert.ok(waiting.registration.basis.includes("未附加真实录像"));
  assert.equal(waiting.registration.evidenceRefs.length, 1);
  assert.deepEqual(
    validateEvidenceReferences(
      next,
      waiting.studentId,
      waiting.registration.evidenceRefs,
    ),
    waiting.registration.evidenceRefs,
  );
  for (const a of arrangements(next)) {
    const session = a.sessions[0];
    assert.equal(session.recording.fullVideoAvailable, false);
    assert.equal(session.recording.status, "不可用");
    assert.ok(session.steps.every((s) => s.aiEvidenceState === "unknown"));
    assert.deepEqual(session.runtime.aiObservations, []);
    assert.deepEqual(session.runtime.aiJudgementResults, []);
  }
});

test("每个新安排/Session保留原bench SOP冻结快照且迁移不改课程标准", () => {
  const input = beforeMigration(),
    sop = structuredClone(
      input.sops.find((s) => s.id === "sop-demo-bench-20261015"),
    ),
    next = migrateGradeEvidenceDemoData(input);
  for (const a of arrangements(next)) {
    assert.deepEqual(a.snapshot.sopSnapshot, sop);
    assert.deepEqual(a.sessions[0].evaluationSnapshot.sopSnapshot, sop);
  }
  assert.deepEqual(
    next.sops.find((s) => s.id === sop.id),
    sop,
  );
});

test("待确认考试阻断发布，学生可见办理事项和教师但看不到未发布分数/内部结论", () => {
  const next = migrateGradeEvidenceDemoData(beforeMigration()),
    exam = arrangement(next, "awaiting", "exam"),
    session = exam.sessions[0];
  assert.equal(getExamPublishGate([session]).passed, false);
  const summary = studentEvidenceTasks(next, "student-demo-20261015", {
    sessionId: session.id,
  })[0];
  assert.equal(
    summary.teacherName,
    next.teachers.find((t) => t.id === "t1").name,
  );
  assert.ok(summary.studentInstruction.includes("线下操作复核"));
  for (const field of [
    "score",
    "confirmation",
    "registration",
    "reason",
    "studentConclusion",
  ])
    assert.equal(
      Object.hasOwn(summary, field),
      false,
      `考试未发布不展示${field}`,
    );
});

test("取消样例保留原因和满分，发布冻结样例拒绝普通改分/新补测", () => {
  const next = migrateGradeEvidenceDemoData(beforeMigration()),
    cancelled = arrangement(next, "cancelled").sessions[0],
    frozenArrangement = arrangement(next, "frozen", "exam"),
    frozen = frozenArrangement.sessions[0];
  assert.equal(cancelled.score, 100);
  assert.equal(cancelled.scoreVersion, undefined);
  assert.ok(task(next, "cancelled").cancelReason.includes("原有效分不变"));
  assert.equal(frozenArrangement.status, "已发布");
  assert.equal(frozen.resultStatus, "已发布");
  assert.equal(frozen.scoreFrozen, true);
  const before = structuredClone(next);
  const corrected = reviseSessionGrade(next, {
    arrangementId: frozenArrangement.id,
    sessionId: frozen.id,
    stepId: frozen.steps[0].id,
    action: "adjust",
    score: 10,
    reason: "不允许普通改分绕过冻结",
    operationId: "try-frozen-adjust",
    expectedState: gradeStateToken(frozen),
    actorId: "t1",
    at: now.toISOString(),
  });
  assert.equal(corrected.result.session.steps[0].score, 10);
  assert.equal(corrected.result.session.resultStatus, "已发布");
  assert.throws(
    () =>
      changeEvidenceTask(next, {
        action: "create",
        arrangementId: frozenArrangement.id,
        sessionId: frozen.id,
        stepId: frozen.steps[0].id,
        kind: "retest",
        reason: "冻结后不能普通发起",
        studentInstruction: "测试",
        operationId: "try-frozen-task",
        expectedState: gradeStateToken(frozen),
        actorId: "t1",
        at: now.toISOString(),
      }),
    /冻结|发布/,
  );
  assert.deepEqual(next, before);
});

test("新演示样例不混入业务大屏统计", () => {
  const original = beforeMigration(),
    before = buildDataScreenSnapshot(original, { now }),
    next = migrateGradeEvidenceDemoData(original);
  assert.deepEqual(buildDataScreenSnapshot(next, { now }), before);
});
