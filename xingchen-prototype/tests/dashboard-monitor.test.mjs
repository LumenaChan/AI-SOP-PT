import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  migrateDashboardDemoData,
  teacherPrototypeSchedule,
} from "../src/dashboardRules.js";
import { workstationCameras } from "../src/cameraRules.js";
import { arrangementDestination } from "../src/domainRules.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";
const raw = JSON.parse(
  readFileSync(
    new URL("../src/data/currentPrototypeData.json", import.meta.url),
  ),
);
const PACKAGE = "dashboard-schedule-20261015";
const isOriginalDashboardDemo = (a) =>
  a.demoPackageId === PACKAGE || a.id === "practice-demo-20261015";
function previousData() {
  const data = structuredClone(raw);
  data.arrangements = data.arrangements.filter(
    (a) => a.demoPackageId !== PACKAGE,
  );
  data.enhancementMigrations = data.enhancementMigrations.filter(
    (id) => id !== PACKAGE,
  );
  return data;
}

test("演示包补齐6条可进入安排，统计与分页使用同一集合", () => {
  const data = previousData();
  assert.equal(
    teacherPrototypeSchedule(data.arrangements).filter(isOriginalDashboardDemo)
      .length,
    1,
  );
  migrateDashboardDemoData(data);
  const today = teacherPrototypeSchedule(data.arrangements).filter(
    isOriginalDashboardDemo,
  );
  assert.equal(today.length, 6);
  assert.equal(today.filter((a) => a.type === "practice").length, 4);
  assert.equal(today.filter((a) => a.type === "exam").length, 2);
  assert.equal(today.slice(0, 3).length, 3);
  assert.equal(today.slice(3, 6).length, 3);
  assert.deepEqual(
    new Set(today.map(arrangementDestination)),
    new Set(["results", "live", "prep"]),
  );
  for (const a of today) {
    assert.equal(a.demoOnly, undefined);
    assert.ok(data.sops.some((s) => s.id === a.sopId));
    assert.ok(
      a.workstationIds.every((id) =>
        data.workstations.some((w) => w.id === id),
      ),
    );
    assert.ok(
      a.studentIds.every((id) => data.students.some((s) => s.id === id)),
    );
    if (a.sessions.length)
      assert.equal(a.sessions[0].evaluationSnapshot.sopId, a.sopId);
  }
});
test("补齐演示数据不修改任何已有安排、会话、工位和锁定快照，重复迁移不追加", () => {
  const data = previousData(),
    before = structuredClone(data);
  migrateDashboardDemoData(data);
  for (const a of before.arrangements)
    assert.deepEqual(
      data.arrangements.find((x) => x.id === a.id),
      a,
    );
  assert.deepEqual(data.workstations, before.workstations);
  assert.deepEqual(data.students, before.students);
  const once = structuredClone(data);
  migrateDashboardDemoData(data);
  assert.deepEqual(data, once);
  const changed = data.arrangements.find((a) => a.demoPackageId === PACKAGE);
  changed.name = "用户修改的示例";
  changed.status = "已取消";
  migrateDashboardDemoData(data);
  assert.equal(changed.name, "用户修改的示例");
  assert.equal(changed.status, "已取消");
});
test("原型安排不受实际日期影响，过滤草稿取消归档且保留原数据", () => {
  const data = previousData(),
    before = structuredClone(data.arrangements);
  const records = [
    ...data.arrangements,
    { id: "far-past", status: "待开始", scheduleStart: "2020-01-01T08:00" },
    { id: "far-future", status: "待开始", scheduleStart: "2099-01-01T09:00" },
    { id: "cancelled", status: "已取消", scheduleStart: "2026-10-15T08:00" },
    {
      id: "archived",
      archivedRecord: true,
      status: "已结束",
      scheduleStart: "2026-10-15T07:00",
    },
    { id: "draft", status: "草稿", scheduleStart: "2026-10-17T10:00" },
  ];
  const ids = teacherPrototypeSchedule(records).map((a) => a.id);
  assert.ok(ids.includes("p1") && ids.includes("practice-demo-20261015"));
  assert.ok(ids.includes("far-past") && ids.includes("far-future"));
  for (const id of ["cancelled", "archived", "draft", "p3"])
    assert.ok(!ids.includes(id));
  assert.deepEqual(data.arrangements, before);
});
test("换日后保留原安排及各批样例，新增3条状态安排参与展示，进行中优先且列表来源不变", () => {
  const before = structuredClone(raw.arrangements);
  const rows = teacherPrototypeSchedule(raw.arrangements);
  assert.equal(
    rows.filter(
      (a) =>
        ![
          "session-closure-20261022",
          "grade-evidence-closure-20261022",
          "dashboard-closure-20261022",
          "arrangement-status-20261024",
        ].includes(a.demoPackageId),
    ).length,
    15,
  );
  assert.deepEqual(
    rows
      .filter((a) => a.demoPackageId === "arrangement-status-20261024")
      .map((a) => a.status)
      .sort(),
    ["已暂停", "已暂停", "准备中"].sort(),
  );
  assert.equal(
    rows.filter((a) => a.demoPackageId === "session-closure-20261022").length,
    8,
  );
  const activeCount = rows.filter((a) =>
    ["进行中", "已暂停"].includes(a.status),
  ).length;
  assert.ok(
    rows
      .slice(0, activeCount)
      .every((a) => ["进行中", "已暂停"].includes(a.status)),
  );
  assert.ok(
    rows
      .slice(activeCount)
      .every((a) => !["进行中", "已暂停"].includes(a.status)),
  );
  assert.ok(rows.some((a) => a.id === "practice-demo-20261015"));
  assert.ok(rows.every((a) => raw.arrangements.includes(a)));
  assert.equal(
    rows.filter((a) => a.demoPackageId === "grade-evidence-closure-20261022")
      .length,
    6,
  );
  assert.equal(
    rows.filter((a) => a.demoPackageId === "dashboard-closure-20261022").length,
    10,
  );
  assert.deepEqual(teacherPrototypeSchedule(raw.arrangements), rows);
  assert.deepEqual(raw.arrangements, before);
});
test("新增复盘保分记录没有冒充AI完成，且示例不进入业务大屏统计", () => {
  const data = previousData(),
    before = buildDataScreenSnapshot(data, {
      now: new Date("2026-10-15T12:00:00+08:00"),
    });
  migrateDashboardDemoData(data);
  for (const a of data.arrangements.filter((a) => a.demoPackageId === PACKAGE))
    for (const s of a.sessions) {
      assert.equal(s.resultSource, "prototype_demo");
      assert.equal(s.recording.fullVideoAvailable, false);
      assert.ok(
        s.steps.every(
          (step) =>
            step.aiEvidenceState === "unknown" &&
            step.completionSource === "student",
        ),
      );
    }
  assert.deepEqual(
    buildDataScreenSnapshot(data, {
      now: new Date("2026-10-15T12:00:00+08:00"),
    }),
    before,
  );
});
test("单镜头、双镜头及五镜头会话同用相机适配，镜头数量取自锁定快照", () => {
  const cases = [
    ["p1", "w1", 2],
    ["e-demo-exam", "w5", 1],
    ["practice-demo-20261015", "ws-demo-20261015", 5],
  ];
  for (const [arrangementId, workstationId, count] of cases) {
    const session = raw.arrangements
      .find((a) => a.id === arrangementId)
      .sessions.find((s) => s.workstationId === workstationId);
    const workstation = structuredClone(
      raw.workstations.find((w) => w.id === workstationId),
    );
    const snapshot = session.evaluationSnapshot.workstationAiBaseConfigSnapshot;
    assert.equal(
      workstationCameras(workstation, raw.devices, snapshot).length,
      count,
    );
    workstation.aiBaseConfig = { cameras: [] };
    assert.equal(
      workstationCameras(workstation, raw.devices, snapshot).length,
      count,
    );
    assert.equal(
      workstationCameras(workstation, raw.devices, { cameras: [] }).length,
      0,
    );
  }
});
test("断流视角继续列出为不可用，停用视角不列出，不能添加其他工位的镜头", () => {
  const workstation = raw.workstations.find((w) => w.id === "ws-demo-20261015");
  const config = structuredClone(workstation.aiBaseConfig);
  config.cameras[1].enabled = false;
  const devices = raw.devices.map((d) =>
    d.id === config.cameras[0].deviceId ? { ...d, streamStatus: "不可用" } : d,
  );
  const views = workstationCameras(workstation, devices, config);
  assert.equal(views.length, 4);
  assert.equal(
    views.find((c) => c.id === config.cameras[0].deviceId).available,
    false,
  );
  assert.ok(!views.some((c) => c.id === config.cameras[1].deviceId));
  assert.ok(
    views.every((c) => config.cameras.some((v) => v.deviceId === c.id)),
  );
});
