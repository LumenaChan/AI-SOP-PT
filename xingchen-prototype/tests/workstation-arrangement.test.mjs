import test from "node:test";
import assert from "node:assert/strict";
import {
  workstationArrangementState,
  activeWorkstationUse,
  normalizeWorkstationReleaseData,
} from "../src/workstationReleaseRules.js";

function fixture({
  demo = false,
  sessionStatus = "进行中",
  arrangementStatus = "进行中",
} = {}) {
  return {
    workstations: [
      {
        id: "w",
        name: demo ? "【演示】测试工位" : "1号工位",
        status: "使用中",
        currentArrangement: "过期的简称",
      },
    ],
    arrangements: [
      {
        id: "p",
        name: "完整实训安排名称",
        type: "practice",
        status: arrangementStatus,
        workstationIds: ["w"],
        openWorkstationIds: ["w"],
        sessions: [
          {
            id: "s",
            workstationId: "w",
            status: sessionStatus,
            evaluationSnapshot: { original: true },
            steps: [],
          },
        ],
      },
    ],
    auditLogs: [],
  };
}

test("普通与演示工位按同一会话关系补全安排ID和名称，故障／暂停／准备同样可定位", () => {
  for (const demo of [false, true]) {
    for (const [sessionStatus, arrangementStatus] of [
      ["进行中", "进行中"],
      ["故障", "进行中"],
      ["已暂停", "已暂停"],
      ["待开始", "待开始"],
      ["可入场", "准备中"],
    ]) {
      const data = fixture({ demo, sessionStatus, arrangementStatus });
      const before = structuredClone(data);
      assert.equal(workstationArrangementState(data, "w").arrangement.id, "p");
      const normalized = normalizeWorkstationReleaseData(data);
      assert.equal(normalized.workstations[0].currentArrangementId, "p");
      assert.equal(
        normalized.workstations[0].currentArrangement,
        "完整实训安排名称",
      );
      assert.deepEqual(normalized.arrangements, before.arrangements);
      assert.deepEqual(normalized.auditLogs, before.auditLogs);
      assert.deepEqual(data, before);
      assert.deepEqual(normalizeWorkstationReleaseData(normalized), normalized);
    }
  }
});

test("重命名后当前安排卡片与跳转对象仍一致，唯一真实会话可纠正失效引用", () => {
  const data = fixture();
  data.workstations[0].currentArrangementId = "deleted";
  assert.equal(workstationArrangementState(data, "w").arrangement.id, "p");
  data.arrangements[0].name = "更名后的安排";
  const normalized = normalizeWorkstationReleaseData(data);
  assert.equal(normalized.workstations[0].currentArrangementId, "p");
  assert.equal(normalized.workstations[0].currentArrangement, "更名后的安排");
});

test("结束、已释放或仅被草稿选择的工位不显示当前安排，限制来源不冒充当前占用", () => {
  for (const [sessionStatus, arrangementStatus] of [
    ["已完成", "进行中"],
    ["故障", "已结束"],
    ["可入场", "已取消"],
  ]) {
    const data = fixture({ sessionStatus, arrangementStatus });
    data.workstations[0].currentArrangementId = "p";
    data.workstations[0].releaseHold = { reasons: ["待检查"] };
    assert.equal(workstationArrangementState(data, "w").status, "idle");
    assert.equal(activeWorkstationUse(data, "w"), false);
  }
  const data = fixture({ arrangementStatus: "草稿" });
  data.arrangements[0].sessions = [];
  data.arrangements[0].openWorkstationIds = [];
  data.workstations[0].currentArrangement = "无";
  assert.equal(workstationArrangementState(data, "w").status, "idle");
});

test("多条真实占用或重名记录不能任意选一条；无法解析的旧指针保持待核对", () => {
  const data = fixture();
  data.arrangements.push({
    ...structuredClone(data.arrangements[0]),
    id: "other",
  });
  assert.equal(workstationArrangementState(data, "w").status, "conflict");
  assert.equal(workstationArrangementState(data, "w").arrangement, null);
  assert.equal(
    normalizeWorkstationReleaseData(data).workstations[0].currentArrangementId,
    undefined,
  );
  for (const a of data.arrangements) {
    a.sessions = [];
    a.openWorkstationIds = [];
  }
  data.workstations[0].currentArrangement = data.arrangements[0].name;
  assert.equal(workstationArrangementState(data, "w").status, "conflict");
  data.workstations[0].currentArrangement = "未知安排";
  assert.equal(workstationArrangementState(data, "w").status, "unresolved");
});

test("开放预留及旧的唯一名称引用可定位；与真实活动会话冲突的有效ID不被覆盖", () => {
  const data = fixture({ arrangementStatus: "准备中" });
  data.arrangements[0].sessions = [];
  assert.equal(workstationArrangementState(data, "w").arrangement.id, "p");
  data.arrangements[0].openWorkstationIds = [];
  data.workstations[0].currentArrangement = data.arrangements[0].name;
  assert.equal(workstationArrangementState(data, "w").arrangement.id, "p");
  const other = fixture();
  other.workstations[0].currentArrangementId = "other";
  other.arrangements.push({
    id: "other",
    name: "其他预留",
    status: "准备中",
    sessions: [],
  });
  assert.equal(workstationArrangementState(other, "w").status, "conflict");
  assert.equal(
    normalizeWorkstationReleaseData(other).workstations[0].currentArrangementId,
    "other",
  );
});
