import { confirmOpeningCheck } from "./opening-check-fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  arrangementAssignments,
  allocationIssues,
  assertAllocation,
  reconcileAssignments,
  changePreparation,
  preparationActions,
  addAbsentParticipants,
  reportSession,
  sessionReportPath,
} from "../src/arrangementPreparationRules.js";
import {
  migratePreparationDemoData,
  PREPARATION_DEMO_PACKAGE,
} from "../src/arrangementDemoData.js";
import {
  createStudentRuntimeStore,
  studentRuntimeFixture,
} from "./student-e2e-fixture.mjs";
import { getStudentCurrentSessions } from "../src/studentIdentityRules.js";
import { getStudentSessionAccess } from "../src/studentPracticeRules.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";

function fixture(type = "practice") {
  const input = studentRuntimeFixture();
  input.students.push({
    ...input.students[0],
    id: "second",
    no: "20260002",
    name: "第二名学生",
  });
  const first = input.workstations[0];
  input.workstations.push({
    ...first,
    id: "second-station",
    name: "第二工位",
    aiBaseConfig: {
      primaryCameraId: "second-camera",
      edgeDeviceId: "second-edge",
    },
  });
  input.devices.push(
    {
      id: "second-camera",
      type: "全景摄像头",
      workstationId: "second-station",
      status: "在线",
      streamStatus: "可用",
    },
    {
      id: "second-edge",
      type: "边缘工作站",
      workstationId: "second-station",
      status: "在线",
    },
  );
  const { store, clock } = createStudentRuntimeStore(input);
  const config = {
    name: "分配验证",
    type,
    teacherId: "teacher-e2e",
    scheduleStart: "2026-09-28T14:00:00",
    sopId: input.sops[0].id,
    studentIds: input.students.map((s) => s.id),
    workstationIds: input.workstations.map((w) => w.id),
    stationAssignments: [
      { workstationId: first.id, studentId: "second" },
      { workstationId: "second-station", studentId: "student-e2e" },
    ],
    ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
  };
  return {
    store,
    clock,
    config,
    open: (id, station) =>
      store.openArrangementWorkstation(
        id,
        station,
        confirmOpeningCheck(store, id, station),
      ),
  };
}

for (const type of ["practice", "exam"]) {
  test(`${type}草稿允许缺项，完成配置拒绝3人1工位与1人3工位`, () => {
    const { store, config } = fixture(type);
    const oneStation = {
      ...config,
      studentIds: ["one", "two", "three"],
      workstationIds: ["one"],
      stationAssignments: [{ workstationId: "one", studentId: "one" }],
    };
    assert.equal(store.saveArrangement(oneStation, false).status, "草稿");
    assert.throws(() => store.saveArrangement(oneStation, true), /一人一工位/);
    assert.throws(
      () =>
        store.saveArrangement(
          {
            ...oneStation,
            studentIds: ["one"],
            workstationIds: ["one", "two", "three"],
          },
          true,
        ),
      /一人一工位/,
    );
  });
  test(`${type}按已保存映射开放，点击顺序不改变学生，不重复开放`, () => {
    const { store, config, open } = fixture(type);
    const a = store.saveArrangement(config, true);
    open(a.id, "second-station");
    open(a.id, config.workstationIds[0]);
    const saved = store.getData().arrangements[0];
    assert.equal(
      saved.sessions.find((s) => s.workstationId === "second-station")
        .studentId,
      "student-e2e",
    );
    assert.equal(
      saved.sessions.find((s) => s.workstationId === config.workstationIds[0])
        .studentId,
      "second",
    );
    assert.throws(() => open(a.id, "second-station"), /已开放/);
    assert.throws(
      () => store.saveArrangement({ ...config, id: a.id }, true),
      /撤销工位准备/,
    );
  });
  test(`${type}撤销一个工位保留另一会话及快照，可按原映射重新开放`, () => {
    const { store, config, open } = fixture(type);
    const a = store.saveArrangement(config, true);
    open(a.id, config.workstationIds[0]);
    open(a.id, "second-station");
    const before = store.getData().arrangements[0];
    const removed = before.sessions.find(
      (s) => s.workstationId === "second-station",
    );
    const after = store.withdrawArrangementWorkstation(
      a.id,
      "second-station",
      "重新检查拍摄范围",
    );
    assert.equal(after.status, "准备中");
    assert.equal(after.sessions.length, 1);
    assert.deepEqual(after.sessions[0], before.sessions[0]);
    assert.deepEqual(after.snapshot, before.snapshot);
    assert.deepEqual(
      after.withdrawnSessions[0].evaluationSnapshot,
      removed.evaluationSnapshot,
    );
    assert.equal(after.withdrawnSessions[0].resultStatus, "已取消");
    assert.equal(
      store.getData().workstations.find((w) => w.id === "second-station")
        .currentArrangement,
      "无",
    );
    const reopened = open(a.id, "second-station").session;
    assert.notEqual(reopened.id, removed.id);
    assert.equal(reopened.studentId, removed.studentId);
  });
  test(`${type}取消未开始安排释放自有占用，无正式成绩，学生任务与直链关闭`, () => {
    const { store, config, open } = fixture(type);
    const a = store.saveArrangement(config, true);
    open(a.id, config.workstationIds[0]);
    open(a.id, "second-station");
    const before = store.getData().arrangements[0];
    const cancelled = store.cancelArrangement(a.id, "课程临时调整");
    assert.equal(cancelled.status, "已取消");
    assert.ok(
      cancelled.sessions.every(
        (s) => s.resultStatus === "已取消" && s.status === "已取消",
      ),
    );
    assert.deepEqual(
      cancelled.sessions.map((s) => s.evaluationSnapshot),
      before.sessions.map((s) => s.evaluationSnapshot),
    );
    assert.ok(
      store.getData().workstations.every((w) => w.currentArrangement === "无"),
    );
    assert.equal(
      getStudentCurrentSessions(store.getData(), "student-e2e").length,
      0,
    );
    assert.equal(
      getStudentSessionAccess(
        store.getData(),
        "student-e2e",
        a.id,
        "second-station",
      ).allowed,
      false,
    );
    assert.throws(() => store.startArrangement(a.id), /不能重复开始/);
    assert.throws(() => open(a.id, "second-station"), /不允许开放/);
    assert.ok(
      store.getData().auditLogs.some((log) => log.reason === "课程临时调整"),
    );
  });
}

test("重复、非法学生映射和历史歧义被拒绝，历史输入不变", () => {
  const { config } = fixture();
  assert.throws(
    () =>
      assertAllocation({
        ...config,
        stationAssignments: config.stationAssignments.map((p) => ({
          ...p,
          studentId: "second",
        })),
      }),
    /分配/,
  );
  assert.throws(
    () =>
      assertAllocation({
        ...config,
        stationAssignments: [{ workstationId: "other", studentId: "second" }],
      }),
    /分配/,
  );
  const legacy = {
    studentIds: ["a", "b"],
    workstationIds: ["x", "y"],
    sessions: [{ id: "old", workstationId: "y", studentId: "a" }],
  };
  const before = structuredClone(legacy);
  assert.deepEqual(arrangementAssignments(legacy), [
    { workstationId: "x", studentId: "b" },
    { workstationId: "y", studentId: "a" },
  ]);
  assert.deepEqual(legacy, before);
  assert.ok(
    allocationIssues({
      ...legacy,
      sessions: [...legacy.sessions, { workstationId: "x", studentId: "a" }],
    }).some((x) => x.includes("历史会话")),
  );
});
test("选择范围变更保留有效关系，移除学生不会再次重复分配", () => {
  assert.deepEqual(
    reconcileAssignments(
      ["b", "c"],
      ["x", "y"],
      [
        { workstationId: "x", studentId: "a" },
        { workstationId: "y", studentId: "b" },
      ],
    ),
    [
      { workstationId: "x", studentId: "c" },
      { workstationId: "y", studentId: "b" },
    ],
  );
});
test("撤销全部准备后可编辑分配，但不能改锁定SOP；历史仍保存", () => {
  const { store, config, open } = fixture();
  const a = store.saveArrangement(config, true);
  open(a.id, config.workstationIds[0]);
  const after = store.withdrawArrangementWorkstation(
    a.id,
    config.workstationIds[0],
    "重新配置",
  );
  assert.equal(after.status, "待开始");
  const edited = store.saveArrangement(
    { ...after, name: "重新配置后的安排" },
    true,
  );
  assert.equal(edited.withdrawnSessions.length, 1);
  assert.deepEqual(edited.snapshot, after.snapshot);
  assert.throws(
    () => store.saveArrangement({ ...edited, sopId: "other" }, true),
    /锁定教学标准/,
  );
});
test("必须填写撤销取消原因，重复操作或状态变化不会抹掉记录", () => {
  const { store, config, open } = fixture();
  const a = store.saveArrangement(config, true);
  open(a.id, config.workstationIds[0]);
  const before = store.getData();
  assert.throws(() => store.cancelArrangement(a.id, "  "), /原因/);
  assert.deepEqual(store.getData(), before);
  store.startArrangement(a.id);
  assert.throws(() => store.cancelArrangement(a.id, "取消"), /不允许/);
  assert.throws(
    () =>
      store.withdrawArrangementWorkstation(
        a.id,
        config.workstationIds[0],
        "撤销",
      ),
    /不允许/,
  );
});
test("草稿删除检查引用，复制取消记录产生独立新草稿", () => {
  const { store, config } = fixture();
  const draft = store.saveArrangement(config, false);
  store.deleteArrangementDraft(draft.id);
  assert.ok(!store.getData().arrangements.some((a) => a.id === draft.id));
  assert.ok(
    store.getData().auditLogs.some((log) => log.action === "删除安排草稿"),
  );
  const a = store.saveArrangement(config, true);
  const cancelled = store.cancelArrangement(a.id, "改期");
  const copy = store.copyCancelledArrangement(a.id);
  assert.notEqual(copy.id, a.id);
  assert.equal(copy.status, "草稿");
  assert.equal(copy.snapshot, null);
  assert.deepEqual(copy.sessions, []);
  assert.deepEqual(copy.stationAssignments, cancelled.stationAssignments);
  assert.equal(
    store.getData().arrangements.find((x) => x.id === a.id).status,
    "已取消",
  );
  const data = {
    arrangements: [{ ...draft, status: "草稿" }],
    issues: [{ arrangementId: draft.id }],
  };
  assert.throws(
    () =>
      changePreparation(data, {
        arrangementId: draft.id,
        action: "deleteDraft",
        at: "now",
        makeId: () => "id",
      }),
    /引用/,
  );
});
test("旧兼容占位快照不锁死空草稿，实际开放快照仍受保护", () => {
  const placeholder = {
    status: "草稿",
    sessions: [],
    openWorkstationIds: [],
    snapshot: { lockedAt: "历史记录", sopSnapshot: { id: "old" } },
  };
  assert.equal(preparationActions(placeholder).deleteDraft, true);
  assert.equal(
    preparationActions({
      ...placeholder,
      snapshot: { lockedAt: "2026-10-22 09:00:00" },
    }).deleteDraft,
    false,
  );
});
test("撤销只关闭对应通知和待办，不释放其他安排占用", () => {
  const { store, config, open } = fixture();
  const a = store.saveArrangement(config, true);
  open(a.id, config.workstationIds[0]);
  open(a.id, "second-station");
  const data = store.getData();
  const second = data.arrangements[0].sessions[1];
  data.notifications = [
    {
      id: "target",
      path: `/teacher/practices/${a.id}/stations/second-station`,
      read: false,
    },
    {
      id: "keep",
      path: `/teacher/practices/${a.id}/stations/${config.workstationIds[0]}`,
      read: false,
    },
  ];
  data.teacherTasks = [
    {
      id: "task",
      arrangementId: a.id,
      sessionId: second.id,
      status: "pending",
    },
  ];
  data.workstations[1].currentArrangementId = "other";
  data.workstations[1].currentArrangement = "另一安排";
  const changed = changePreparation(data, {
    arrangementId: a.id,
    workstationId: "second-station",
    action: "withdraw",
    reason: "撤销",
    at: "now",
    makeId: () => "log",
  }).data;
  assert.equal(changed.workstations[1].currentArrangement, "另一安排");
  assert.equal(changed.notifications[0].read, true);
  assert.equal(changed.notifications[1].read, false);
  assert.equal(changed.teacherTasks[0].status, "closed");
  assert.equal(data.notifications[0].read, false);
});
test("未参加名单补齐，不生成正式成绩，不改已参加会话且可重复运行", () => {
  const { config } = fixture();
  let i = 0;
  const original = {
    id: "existing",
    workstationId: config.workstationIds[0],
    studentId: "second",
    score: 85,
  };
  const a = { ...config, sessions: [original] };
  const sessions = addAbsentParticipants(a, {
    at: "ended",
    makeId: () => `absent-${++i}`,
  });
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0], original);
  assert.equal(sessions[1].studentId, "student-e2e");
  assert.equal(sessions[1].workstationId, "second-station");
  assert.equal(sessions[1].resultStatus, "未参加");
  assert.equal(sessions[1].score, 0);
  assert.equal(
    addAbsentParticipants(
      { ...a, sessions },
      { at: "ended", makeId: () => "unexpected" },
    ).length,
    2,
  );
});
test("多会话报告必须准确选择Session，拒绝把他人会话ID用于当前学生", () => {
  const a = {
    id: "a",
    type: "practice",
    sessions: [
      { id: "one", studentId: "s" },
      { id: "two", studentId: "s" },
      { id: "other", studentId: "t" },
    ],
  };
  assert.equal(reportSession(a, "s"), null);
  assert.equal(reportSession(a, "s", "two").id, "two");
  assert.equal(reportSession(a, "s", "other"), null);
  assert.ok(sessionReportPath(a, a.sessions[1]).endsWith("?sessionId=two"));
});
test("已运行或有正式业务事实的会话不可从准备取消，无论安排字段是否过时", () => {
  const a = {
    status: "准备中",
    sessions: [{ status: "可入场", startedAt: "already" }],
    openWorkstationIds: ["x"],
  };
  assert.equal(preparationActions(a).cancel, false);
  assert.equal(preparationActions(a).withdraw, false);
  assert.equal(
    preparationActions({
      ...a,
      sessions: [{ status: "可入场", resultStatus: "正式成绩" }],
    }).cancel,
    false,
  );
});
test("演示升级幂等，保留旧记录，处理过的示例不复活且不进入业务大屏", () => {
  const raw = JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
  const data = structuredClone(raw);
  data.enhancementMigrations = data.enhancementMigrations.filter(
    (x) => x !== PREPARATION_DEMO_PACKAGE,
  );
  for (const key of ["arrangements", "workstations", "devices"])
    data[key] = data[key].filter(
      (x) => x.demoPackageId !== PREPARATION_DEMO_PACKAGE,
    );
  const before = structuredClone(data);
  const screen = buildDataScreenSnapshot(data);
  migratePreparationDemoData(data);
  for (const key of ["arrangements", "workstations", "devices"])
    for (const item of before[key])
      assert.deepEqual(
        data[key].find((x) => x.id === item.id),
        item,
      );
  assert.deepEqual(buildDataScreenSnapshot(data), screen);
  const once = structuredClone(data);
  migratePreparationDemoData(data);
  assert.deepEqual(data, once);
  data.arrangements = data.arrangements.filter(
    (a) => a.id !== "practice-allocation-draft-20261022",
  );
  migratePreparationDemoData(data);
  assert.ok(
    !data.arrangements.some(
      (a) => a.id === "practice-allocation-draft-20261022",
    ),
  );
});
