import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arrangementStatusOptions } from "../src/arrangementStatusRules.js";
import {
  ARRANGEMENT_STATUS_DEMO_PACKAGE as PACKAGE,
  ARRANGEMENT_STATUS_DEMO_CASES as CASES,
  migrateArrangementStatusDemoData as migrate,
} from "../src/arrangementStatusDemoData.js";
import {
  allocationIssues,
  preparationActions,
} from "../src/arrangementPreparationRules.js";
import { arrangementDestination } from "../src/domainRules.js";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";
import { examRemainingSeconds } from "../src/studentExamRules.js";
import {
  selectCpdWorkingData,
  prototypeDataFingerprint,
} from "../src/storageMigrationRules.js";

const cpd = () =>
  JSON.parse(
    readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
      "utf8",
    ),
  );
function oldWorkingCopy() {
  const data = cpd();
  for (const key of ["arrangements", "workstations", "devices", "students"])
    data[key] = data[key].filter((item) => item.demoPackageId !== PACKAGE);
  data.enhancementMigrations = data.enhancementMigrations.filter(
    (id) => id !== PACKAGE,
  );
  return data;
}

test("两类列表始终提供完整业务状态，考试结束为待发布而非新增已结束", () => {
  assert.deepEqual(arrangementStatusOptions("practice"), [
    "全部状态",
    "草稿",
    "待开始",
    "准备中",
    "进行中",
    "已暂停",
    "已结束",
    "已取消",
  ]);
  assert.deepEqual(arrangementStatusOptions("exam"), [
    "全部状态",
    "草稿",
    "待开始",
    "准备中",
    "进行中",
    "已暂停",
    "待发布",
    "已发布",
    "已取消",
  ]);
  assert.ok(
    arrangementStatusOptions("exam", [
      { type: "exam", status: "历史自定义" },
    ]).includes("历史自定义"),
  );
  assert.ok(
    !arrangementStatusOptions("exam", [
      { type: "practice", status: "其他" },
      { type: "exam", status: "归档自定义", archivedRecord: true },
    ]).includes("归档自定义"),
  );
});

test("CPD源文件已持久化五个新增场景，练习／考试每种业务状态均有数据", () => {
  const data = cpd();
  for (const type of ["practice", "exam"])
    for (const status of arrangementStatusOptions(type).slice(1))
      assert.ok(
        data.arrangements.some(
          (a) => a.type === type && a.status === status && !a.archivedRecord,
        ),
        `${type}/${status}`,
      );
  const rows = data.arrangements.filter((a) => a.demoPackageId === PACKAGE);
  assert.equal(rows.length, 5);
  for (const spec of CASES)
    assert.equal(
      rows.find((a) => a.id === `${spec.key}-status-20261024`)?.status,
      spec.status,
    );
  const regenerated = migrate(oldWorkingCopy());
  assert.deepEqual(
    rows,
    JSON.parse(
      JSON.stringify(
        regenerated.arrangements.filter((a) => a.demoPackageId === PACKAGE),
      ),
    ),
  );
});

test("已有浏览器工作副本只追加一次，不覆盖原安排、成绩、快照、身份和占用", () => {
  const input = oldWorkingCopy(),
    before = structuredClone(input);
  input.arrangements[0].name = "教师当前修改的安排";
  before.arrangements[0].name = input.arrangements[0].name;
  const next = migrate(input);
  for (const key of ["arrangements", "workstations", "devices", "students"])
    assert.deepEqual(next[key].slice(0, before[key].length), before[key]);
  assert.deepEqual(input, before);
  assert.equal(migrate(next), next);
  const draft = next.arrangements.find(
    (a) => a.id === "exam-draft-status-20261024",
  );
  draft.name = "教师已编辑的草稿";
  next.arrangements = next.arrangements.filter(
    (a) => a.id !== "practice-cancelled-status-20261024",
  );
  const refreshed = migrate(JSON.parse(JSON.stringify(next)));
  assert.equal(
    refreshed.arrangements.find((a) => a.id === draft.id).name,
    draft.name,
  );
  assert.ok(
    !refreshed.arrangements.some(
      (a) => a.id === "practice-cancelled-status-20261024",
    ),
    "不复活用户删除的演示",
  );
});

test("源CPD更新时保留既有CPD副本；两来源分别补齐，不覆盖其他来源", () => {
  const source = cpd(),
    working = oldWorkingCopy();
  working.arrangements[0].name = "CPD工作副本私有修改";
  const bytes = JSON.stringify({ fingerprint: "old-source", data: working });
  const selected = selectCpdWorkingData({
    storage: { getItem: () => bytes },
    storageKey: "cpd",
    fingerprint: prototypeDataFingerprint(source),
    currentPrototypeData: source,
  });
  assert.equal(selected.kind, "cpd-storage");
  const updated = migrate(selected.data);
  assert.equal(updated.arrangements[0].name, "CPD工作副本私有修改");
  assert.equal(
    updated.arrangements.filter((a) => a.demoPackageId === PACKAGE).length,
    5,
  );
  assert.notEqual(source.arrangements[0].name, updated.arrangements[0].name);
  assert.equal(
    bytes,
    JSON.stringify({ fingerprint: "old-source", data: working }),
    "升级函数不自行写存储",
  );
});

test("新场景分配、会话、工位占用和导航匹配，使用独立演示资源且无复制人脸", () => {
  const data = cpd();
  const expected = {
    草稿: "edit",
    准备中: "prep",
    已暂停: "live",
    已取消: "prep",
  };
  for (const a of data.arrangements.filter(
    (a) => a.demoPackageId === PACKAGE,
  )) {
    assert.deepEqual(allocationIssues(a), []);
    assert.equal(arrangementDestination(a), expected[a.status]);
    const station = data.workstations.find((w) => w.id === a.workstationIds[0]);
    const student = data.students.find((s) => s.id === a.studentIds[0]);
    assert.equal(station.demoPackageId, PACKAGE);
    assert.equal(student.demoPackageId, PACKAGE);
    assert.equal(student.faceStatus, "未采集");
    assert.ok(!student.faceData && !student.faceImageUrl);
    if (["准备中", "已暂停"].includes(a.status)) {
      assert.equal(station.currentArrangementId, a.id);
      assert.equal(a.openWorkstationIds.length, 1);
      assert.equal(
        a.sessions[0].status,
        a.status === "准备中" ? "可入场" : "已暂停",
      );
      assert.deepEqual(
        a.snapshot.sopSnapshot,
        a.sessions[0].evaluationSnapshot.sopSnapshot,
      );
    } else {
      assert.equal(station.currentArrangement, "无");
      assert.equal(a.sessions.length, 0);
      assert.equal(a.snapshot, null);
    }
    assert.equal(preparationActions(a).edit, a.status === "草稿");
  }
});

for (const type of ["practice", "exam"]) {
  test(`${type}暂停演示可恢复整场，快照和学生分配不变，考试倒计时刷新不流逝`, () => {
    const data = cpd(),
      id = `${type}-paused-status-20261024`;
    const before = data.arrangements.find((a) => a.id === id);
    const session = before.sessions[0];
    assert.equal(session.runtime.evaluationClock.elapsedSeconds, 120);
    if (type === "exam")
      assert.equal(
        examRemainingSeconds(session, Date.parse("2027-10-24T02:00:00Z")),
        28 * 60,
      );
    const store = createAiRuntimeStore(data, {
      now: () => "2026-10-24T03:00:00Z",
    });
    const resumed = store.setArrangementPaused(id, false);
    assert.equal(resumed.status, "进行中");
    assert.equal(resumed.sessions[0].status, "进行中");
    assert.equal(resumed.sessions[0].runtime.evaluationClock.status, "running");
    assert.deepEqual(resumed.snapshot, before.snapshot);
    assert.deepEqual(resumed.stationAssignments, before.stationAssignments);
  });
}

test("预留ID冲突不覆盖、绑定或占用用户已有工位", () => {
  const input = oldWorkingCopy();
  input.workstations.push({
    id: "ws-status-exam-preparing-20261024",
    name: "用户现有工位",
    currentArrangementId: "user",
  });
  const before = structuredClone(input.workstations);
  const next = migrate(input);
  assert.deepEqual(next.workstations.slice(0, before.length), before);
  assert.ok(
    !next.arrangements.some((a) => a.id === "exam-preparing-status-20261024"),
  );
  assert.ok(
    !next.students.some(
      (s) => s.id === "student-status-exam-preparing-20261024",
    ),
  );
});
