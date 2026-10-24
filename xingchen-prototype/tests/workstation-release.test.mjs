import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWorkstationReleaseData as normalize,
  resolveWorkstationRestriction as recover,
  workstationUsageRestriction,
} from "../src/workstationReleaseRules.js";
import { allocationWorkstationAvailable } from "../src/arrangementAllocationRules.js";
import { assertFrozenGradeWrite } from "../src/frozenGradeWriteRules.js";
import { monitorStationFilter } from "../src/monitorFilterRules.js";
import {
  studentRuntimeFixture,
  createStudentRuntimeStore,
  createOpenArrangement,
} from "./student-e2e-fixture.mjs";
import { confirmOpeningCheck } from "./opening-check-fixture.mjs";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";

function fixture(type = "practice") {
  return {
    workstations: [
      {
        id: "w",
        name: "1号工位",
        status: "使用中",
        currentArrangementId: "a",
        currentArrangement: "课程A",
      },
    ],
    arrangements: [
      {
        id: "a",
        name: "课程A",
        type,
        status: type === "exam" ? "待发布" : "已结束",
        endedAt: "2026-10-24 12:00:00",
        sessions: [
          {
            id: "s",
            workstationId: "w",
            status: "已完成",
            score: 88,
            scoreVersion: 3,
            recording: { status: "完整" },
            evaluationSnapshot: { sopSnapshot: { id: "locked" } },
            steps: [{ id: "step", score: 88, maxScore: 100 }],
            reviewHistory: [{ note: "历史复核" }],
          },
        ],
      },
    ],
    auditLogs: [],
  };
}

for (const type of ["practice", "exam"]) {
  test(`${type}整场结束自动释放；待发布不阻塞释放，重载幂等且不伪造复位`, () => {
    const original = fixture(type),
      before = structuredClone(original);
    const next = normalize(original),
      w = next.workstations[0];
    assert.equal(w.status, "可入场");
    assert.equal(w.currentArrangementId, "");
    assert.equal(w.currentArrangement, "无");
    assert.equal(allocationWorkstationAvailable(w), true);
    const s = next.arrangements[0].sessions[0];
    assert.equal(s.status, "已完成");
    assert.equal(s.workstationRelease.status, "released");
    for (const key of [
      "steps",
      "score",
      "scoreVersion",
      "evaluationSnapshot",
      "recording",
      "reviewHistory",
    ])
      assert.deepEqual(s[key], before.arrangements[0].sessions[0][key]);
    assert.equal(s.openingCheck, undefined);
    assert.equal(next.auditLogs.length, 1);
    assert.deepEqual(normalize(structuredClone(next)), next);
    assert.deepEqual(original, before, "纯规则不修改输入");
  });

  for (const reason of type === "exam"
    ? ["manual_submit", "time_expired"]
    : ["student_finished"]) {
    test(`${type}/${reason}个人结束立即释放，整场继续，可再次分配并重新开放`, () => {
      const input = studentRuntimeFixture(),
        { store } = createStudentRuntimeStore(input);
      const arrangement = createOpenArrangement(store, input, type);
      const stationId = input.workstations[0].id;
      store.startWorkstationSession(arrangement.id, stationId);
      const result = store.finishWorkstationSession(arrangement.id, stationId, {
        reason,
      });
      assert.equal(result.session.workstationRelease.status, "released");
      const ended = store.getData();
      assert.equal(ended.arrangements[0].status, "进行中");
      assert.equal(ended.workstations[0].currentArrangementId, "");
      const nextArrangement = store.saveArrangement(
        {
          type,
          name: "下一批",
          teacherId: "teacher-e2e",
          sopId: input.sops[0].id,
          studentIds: [input.students[0].id],
          workstationIds: [stationId],
          ...(type === "exam" ? { examDurationMinutes: 5 } : {}),
        },
        true,
      );
      const check = confirmOpeningCheck(store, nextArrangement.id, stationId);
      assert.throws(
        () =>
          store.openArrangementWorkstation(nextArrangement.id, stationId, {
            ...check,
            siteResetConfirmed: false,
          }),
        /现场具备本次使用条件/,
      );
      const reopened = store.openArrangementWorkstation(
        nextArrangement.id,
        stationId,
        check,
      );
      assert.equal(
        reopened.session.openingCheck.siteResetConfirmation.confirmed,
        true,
      );
      assert.equal(
        store.getData().workstations[0].currentArrangementId,
        nextArrangement.id,
      );
      const endedAgain = normalize({
        ...store.getData(),
        arrangements: store
          .getData()
          .arrangements.map((a) =>
            a.id === arrangement.id
              ? { ...a, status: type === "exam" ? "待发布" : "已结束" }
              : a,
          ),
      });
      assert.equal(
        endedAgain.workstations[0].currentArrangementId,
        nextArrangement.id,
        "旧整场结束不影响新占用",
      );
    });
  }
}

for (const kind of [
  "fault",
  "maintenance",
  "disabled",
  "redline",
  "pending-safety",
  "technical",
]) {
  test(`${kind}结束后仍限制使用，不能选择或开放`, () => {
    const data = fixture();
    const session = data.arrangements[0].sessions[0];
    if (kind === "fault") data.workstations[0].status = "故障";
    if (kind === "maintenance") data.workstations[0].status = "维护中";
    if (kind === "disabled") data.workstations[0].status = "停用";
    if (kind === "redline") session.steps[0].redlineConfirmed = true;
    if (kind === "pending-safety")
      session.runtime = { safetyCandidates: [{ status: "pending" }] };
    if (kind === "technical")
      session.runtime = {
        technicalIncidents: [{ status: "open", affectsContinuation: true }],
      };
    const next = normalize(data),
      w = next.workstations[0];
    assert.ok(w.releaseHold);
    assert.equal(w.currentArrangementId, "a");
    assert.ok(workstationUsageRestriction(w));
    assert.equal(
      allocationWorkstationAvailable(w, next.arrangements[0]),
      false,
    );
    assert.deepEqual(normalize(structuredClone(next)), next);
    if (!["maintenance", "disabled"].includes(kind)) {
      assert.throws(
        () =>
          recover(next, {
            workstationId: "w",
            expectedHoldId: "outdated",
            note: "已排查",
          }),
        /异常已变化/,
      );
      assert.throws(
        () =>
          recover(next, {
            workstationId: "w",
            expectedHoldId: w.releaseHold.id,
          }),
        /填写异常处理/,
      );
      if (kind === "pending-safety") {
        assert.throws(
          () =>
            recover(next, {
              workstationId: "w",
              expectedHoldId: w.releaseHold.id,
              note: "已清理",
              actorId: "admin",
              at: "2026-10-24 12:10:00",
            }),
          /先由教师完成待处理安全事件/,
        );
        return;
      }
      const recovered = recover(next, {
        workstationId: "w",
        expectedHoldId: w.releaseHold.id,
        note: "已排查并恢复现场",
        actorId: "admin",
        at: "2026-10-24 12:10:00",
      });
      assert.equal(recovered.workstations[0].currentArrangementId, "");
      assert.equal(recovered.workstations[0].releaseHold, null);
      assert.deepEqual(
        recovered.arrangements[0].sessions[0].steps,
        session.steps,
        "处理使用限制不改写原判",
      );
      assert.deepEqual(
        normalize(structuredClone(recovered)),
        recovered,
        "原安全证据保留但不反复恢复已处理限制",
      );
    }
  });
}

test("已发布冻结成绩的释放和异常处理不改分、不改变历史证据", () => {
  const before = fixture("exam");
  before.arrangements[0].status = "已发布";
  Object.assign(before.arrangements[0].sessions[0], {
    scoreFrozen: true,
    resultStatus: "已发布",
  });
  before.arrangements[0].sessions[0].steps[0].redlineConfirmed = true;
  const held = normalize(before);
  assertFrozenGradeWrite(before, held);
  const after = recover(held, {
    workstationId: "w",
    expectedHoldId: held.workstations[0].releaseHold.id,
    note: "已排除安全隐患",
    actorId: "admin",
    at: "2026-10-24 12:30:00",
  });
  assertFrozenGradeWrite(before, after);
});

test("旧正常待复位自动迁移；不释放进行中工位或同名但ID不同的新安排", () => {
  const before = fixture();
  before.arrangements[0].sessions[0].status = "待复位";
  assert.equal(normalize(before).arrangements[0].sessions[0].status, "已完成");
  const active = fixture();
  active.arrangements[0].status = "进行中";
  active.arrangements[0].sessions[0].status = "已暂停";
  assert.deepEqual(normalize(active), active);
  assert.throws(
    () => recover(active, { workstationId: "w", note: "清理" }),
    /未结束会话/,
  );
  const newer = fixture();
  newer.workstations[0].currentArrangementId = "new";
  newer.arrangements.push({
    id: "new",
    name: "课程A",
    status: "进行中",
    sessions: [{ id: "new-s", workstationId: "w", status: "进行中" }],
  });
  assert.deepEqual(normalize(newer), newer);
});

test("监控已结束筛选包含自动释放会话，保留本次整体记录", () => {
  const result = monitorStationFilter(
    {
      workstationIds: ["w"],
      openWorkstationIds: ["w"],
      sessions: [{ workstationId: "w", status: "已完成" }],
    },
    "reset",
  );
  assert.equal(result.selected.label, "已结束");
  assert.equal(result.rows.length, 1);
  assert.equal(result.filters[0].label, "本次工位");
});

test("结束后处理安全候选不重启会话、计时或步骤，确认误报后自动释放", () => {
  const input = studentRuntimeFixture(),
    { store } = createStudentRuntimeStore(input);
  const arrangement = createOpenArrangement(store, input, "practice"),
    stationId = input.workstations[0].id;
  store.startWorkstationSession(arrangement.id, stationId);
  store.finishWorkstationSession(arrangement.id, stationId);
  const data = store.getData(),
    a = data.arrangements[0],
    s = a.sessions[0];
  s.runtime.safetyCandidates = [
    { id: "late-review", stepId: s.steps[0].id, status: "pending" },
  ];
  Object.assign(data.workstations[0], {
    currentArrangementId: a.id,
    currentArrangement: a.name,
    status: "使用中",
  });
  const reopened = createAiRuntimeStore(data);
  assert.ok(reopened.getData().workstations[0].releaseHold);
  const before = reopened.getData().arrangements[0].sessions[0];
  reopened.resolveSafetyCandidate(
    a.id,
    stationId,
    "late-review",
    "false_positive",
  );
  const after = reopened.getData(),
    session = after.arrangements[0].sessions[0];
  assert.equal(session.status, "已完成");
  assert.equal(session.runtime.evaluationClock.status, "stopped");
  assert.deepEqual(
    session.steps.map((step) => step.executionState),
    before.steps.map((step) => step.executionState),
  );
  assert.equal(after.workstations[0].currentArrangementId, "");
});

test("普通待复核成绩、非阻断AI降级不占用工位；未开始会话不提前释放", () => {
  const data = fixture();
  Object.assign(data.arrangements[0].sessions[0], {
    resultStatus: "待复核",
    runtime: {
      technicalIncidents: [{ status: "open", affectsContinuation: false }],
    },
  });
  assert.equal(normalize(data).workstations[0].currentArrangementId, "");
  data.arrangements[0].status = "准备中";
  data.arrangements[0].sessions[0].status = "可入场";
  assert.equal(normalize(data).workstations[0].currentArrangementId, "a");
});
