import test from "node:test";
import assert from "node:assert/strict";
import {
  workstationLinkedStandards,
  workstationStandardRows,
  standardWorkstationIds,
} from "../src/workstationStandardRules.js";
import { getSopAiEvaluationStatus } from "../src/domainRules.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";

function fixture() {
  return {
    sops: [
      { id: "s1", name: "已更名的标准", status: "已发布", steps: [] },
      { id: "s2", name: "另一实训标准", status: "已发布", steps: [] },
    ],
    workstations: [
      { id: "w1", name: "一号工位", supportedProject: "过时的标准名称" },
      { id: "w2", name: "二号工位", supportedProject: "已更名的标准" },
    ],
    aiCapabilityConfigs: [
      { id: "c1", sopId: "s1" },
      { id: "c2", sopId: "s2" },
      { id: "dangling", sopId: "deleted-standard" },
    ],
    sopWorkstationAiConfigs: [
      {
        id: "r1",
        sopAiConfigId: "c1",
        workstationId: "w1",
        enableStatus: "disabled",
        validationStatus: "pending_revalidation",
      },
      { id: "r2", sopAiConfigId: "c2", workstationId: "w1" },
      { id: "duplicate", sopAiConfigId: "c1", workstationId: "w1" },
      { id: "missing-config", sopAiConfigId: "missing", workstationId: "w1" },
      {
        id: "missing-standard",
        sopAiConfigId: "dangling",
        workstationId: "w1",
      },
    ],
    fieldValidations: [{ sopId: "s1", workstationId: "w2", status: "通过" }],
    arrangements: [],
    devices: [],
    students: [],
  };
}

test("工位按关联ID展示多个标准，重命名、停用AI与旧名称不改变关联", () => {
  const data = fixture(),
    before = structuredClone(data);
  assert.deepEqual(
    workstationLinkedStandards(data, "w1").map((s) => s.name),
    ["已更名的标准", "另一实训标准"],
  );
  assert.deepEqual(standardWorkstationIds(data, "s1"), ["w1"]);
  assert.deepEqual(workstationLinkedStandards(data, "w2"), []);
  assert.equal(
    workstationStandardRows(data, "w1").filter(({ sop }) => !sop).length,
    2,
  );
  assert.deepEqual(data, before);
  data.sops[0].name = "再次重命名";
  assert.equal(workstationLinkedStandards(data, "w1")[0].name, "再次重命名");
  data.sopWorkstationAiConfigs = [];
  assert.deepEqual(workstationLinkedStandards(data, "w1"), []);
  assert.deepEqual(standardWorkstationIds(data, "s1"), []);
});

test("旧AI适配汇总只选择当前关联，文本与历史验证不生成目标工位", () => {
  const data = fixture();
  const status = getSopAiEvaluationStatus({ ...data, sop: data.sops[0] });
  assert.equal(status.targetWorkstationCount, 1);
  assert.notEqual(status.status, "可用");
  assert.equal(
    getSopAiEvaluationStatus({
      ...data,
      sop: data.sops[0],
      sopWorkstationAiConfigs: [],
    }).targetWorkstationCount,
    0,
  );
  assert.equal(
    getSopAiEvaluationStatus({
      ...data,
      sop: data.sops[0],
      targetWorkstationIds: ["w1", "w2"],
    }).targetWorkstationCount,
    2,
  );
});

test("大屏空闲工位展示当前关联，当前安排优先，旧文本不泄漏为用途", () => {
  const data = fixture(),
    before = structuredClone(data);
  const snapshot = buildDataScreenSnapshot(data);
  assert.equal(
    snapshot.workstations.find((w) => w.id === "w1").project,
    "已更名的标准、另一实训标准",
  );
  assert.equal(
    snapshot.workstations.find((w) => w.id === "w2").project,
    "待命工位",
  );
  assert.deepEqual(data, before);
  data.arrangements.push({
    id: "p",
    type: "practice",
    name: "当前实训安排",
    status: "进行中",
    sessions: [
      { id: "session", workstationId: "w1", status: "进行中", steps: [] },
    ],
  });
  assert.equal(
    buildDataScreenSnapshot(data).workstations.find((w) => w.id === "w1")
      .project,
    "当前实训安排",
  );
});
