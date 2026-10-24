import test from "node:test";
import assert from "node:assert/strict";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";
import {
  gradeStateToken,
  reviseSessionGrade,
  applyGradeLifecycle,
} from "../src/gradeRevisionRules.js";
import { assertFrozenGradeWrite } from "../src/frozenGradeWriteRules.js";
import { studentResult } from "../src/studentResultRules.js";
import { teachingStatistics } from "../src/teachingStatisticsRules.js";
const now = "2026-10-24T10:00:00Z";
function fixture(published = false) {
  const sop = {
    id: "standard",
    name: "教师操作标准",
    status: "已发布",
    steps: [
      {
        id: "Step 01",
        name: "工具操作",
        score: 100,
        completionCondition: "按规范检查工具",
        judgementMode: "default_pass_manual_deduction",
      },
    ],
    scoreRules: [],
    safetyRules: [],
  };
  return {
    sops: [sop],
    students: [{ id: "student", name: "同学", no: "123" }],
    teachers: [{ id: "t1", name: "负责教师" }],
    arrangements: [
      {
        id: "arr",
        name: "练习或考试",
        sopId: sop.id,
        type: published ? "exam" : "practice",
        teacherId: "t1",
        status: published ? "已发布" : "已结束",
        snapshot: { sopSnapshot: sop },
        sessions: [
          {
            id: "session",
            studentId: "student",
            status: "已完成",
            endedAt: "2026-10-23T10:00:00Z",
            score: 85,
            resultStatus: published ? "已发布" : "正式成绩",
            steps: [
              {
                id: "Step 01",
                name: "工具操作",
                rawScore: 85,
                score: 85,
                effectiveScore: 85,
                maxScore: 100,
                state: "pass",
                result: "通过（扣分）",
                reviewStatus: "无需复核",
                scoreDisposition: { status: "normal" },
                aiEvidenceState: "unknown",
              },
            ],
          },
        ],
      },
    ],
    auditLogs: [],
    evidenceTasks: [],
  };
}
function request(session, score = 90, op = "edit") {
  return {
    arrangementId: "arr",
    sessionId: session.id,
    stepId: "Step 01",
    action: "adjust",
    actorId: "t1",
    actorName: "负责教师",
    reason: "核实操作情况后更正分数",
    score,
    expectedState: gradeStateToken(session),
    operationId: op,
    at: now,
  };
}
function assertNoGradeVersion(value) {
  for (const [key, item] of Object.entries(value || {})) {
    assert.ok(
      ![
        "scoreVersion",
        "sourceScoreVersion",
        "fromVersion",
        "toVersion",
        "gradeRevisionSeq",
        "scoreRevisions",
      ].includes(key),
      `不应产生${key}`,
    );
    if (item && typeof item === "object") assertNoGradeVersion(item);
  }
}
for (const published of [false, true])
  test(`${published ? "已发布考试" : "练习"}直接修改当前成绩，学生和统计同步，无版本记录`, () => {
    const store = createAiRuntimeStore(fixture(published), { now: () => now });
    const initial = store.getData().arrangements[0].sessions[0];
    const result = store.reviseSessionGrade(request(initial));
    assert.equal(result.session.score, 90);
    const data = store.getData(),
      current = data.arrangements[0].sessions[0];
    assertNoGradeVersion(current);
    assert.equal(data.arrangements.length, 1);
    assert.equal(data.arrangements[0].sessions.length, 1);
    assert.equal(studentResult(data, "student", "arr", "session").score, 90);
    assert.equal(
      studentResult(data, "student", "arr", "session").version,
      undefined,
    );
    const statistics = teachingStatistics(data, { teacherId: "t1" });
    assert.equal(statistics.summary.count, 1);
    assert.equal(statistics.summary.average, 90);
    assert.equal(current.reviewHistory.length, 1);
    assert.equal(current.reviewHistory[0].before, 85);
    assert.equal(current.reviewHistory[0].after, 90);
    assert.equal(current.steps[0].rawScore, 85);
    assert.equal(current.steps[0].aiEvidenceState, "unknown");
    if (published) {
      assert.equal(current.resultStatus, "已发布");
      assert.equal(data.arrangements[0].status, "已发布");
    }
    const reloaded = createAiRuntimeStore(data, { now: () => now });
    reloaded.reviseSessionGrade(request(current, 92, "edit-after-reload"));
    assert.equal(reloaded.getData().arrangements[0].sessions[0].score, 92);
    assertNoGradeVersion(reloaded.getData().arrangements[0].sessions[0]);
  });
test("旧数字编号不参与校验或递增，旧记录保留，当前成绩正常更正", () => {
  const data = fixture(),
    old = data.arrangements[0].sessions[0];
  old.scoreVersion = 99;
  old.scoreRevisions = [
    { id: "legacy-grade-record", fromVersion: 98, toVersion: 99 },
  ];
  const before = structuredClone(old.scoreRevisions),
    token = gradeStateToken(old);
  old.scoreVersion = 1234;
  assert.equal(gradeStateToken(old), token);
  const changed = reviseSessionGrade(data, {
    ...request(old),
    expectedVersion: -100,
  }).data.arrangements[0].sessions[0];
  assert.equal(changed.score, 90);
  assert.equal(changed.scoreVersion, 1234);
  assert.deepEqual(changed.scoreRevisions, before);
  assert.ok(
    changed.gradeAuditHistory.every(
      (r) => !Object.hasOwn(r, "fromVersion") && !Object.hasOwn(r, "toVersion"),
    ),
  );
});
test("提交当前结果不生成版本或多份成绩；旧表单和重复操作不能误覆盖", () => {
  const previous = fixture().arrangements[0].sessions[0];
  const submitted = applyGradeLifecycle(
    previous,
    { ...structuredClone(previous), score: 90, scoreVersion: 999 },
    { at: now, operationId: "submit" },
  );
  assert.equal(submitted.score, 90);
  assertNoGradeVersion(submitted);
  const data = fixture(),
    initial = data.arrangements[0].sessions[0],
    input = request(initial);
  const changed = reviseSessionGrade(data, input);
  assert.equal(reviseSessionGrade(changed.data, input).data, changed.data);
  assert.throws(
    () =>
      reviseSessionGrade(changed.data, {
        ...input,
        operationId: "stale",
        score: 95,
      }),
    /状态已变化/,
  );
});
test("已发布成绩更正不开放给管理员、其他教师或自动运行覆盖", () => {
  const data = fixture(true),
    s = data.arrangements[0].sessions[0];
  for (const actorId of ["admin", "t2", "student"])
    assert.throws(
      () => reviseSessionGrade(data, { ...request(s), actorId }),
      /负责教师/,
    );
  const next = structuredClone(data);
  next.arrangements[0].sessions[0].score = 1;
  assert.throws(() => assertFrozenGradeWrite(data, next), /自动运行不能覆盖/);
});
