import test from "node:test";
import assert from "node:assert/strict";
import {
  monitorStationFilter,
  MONITOR_STATION_FILTERS,
} from "../src/monitorFilterRules.js";

function fixture(type = "practice") {
  const statuses = ["进行中", "待开始", "可入场", "已暂停", "待复位", "故障"];
  return {
    id: type,
    type,
    workstationIds: [...statuses.map((_, i) => `w${i}`), "unopened"],
    openWorkstationIds: statuses.map((_, i) => `w${i}`),
    sessions: statuses.map((status, i) => ({
      id: `s${i}`,
      workstationId: `w${i}`,
      status,
      score: 80,
      steps: [],
    })),
  };
}
for (const type of ["practice", "exam"]) {
  test(`${type}六个统计入口与实际筛选共用同一工位集合`, () => {
    const arrangement = fixture(type),
      before = structuredClone(arrangement);
    const all = monitorStationFilter(arrangement);
    assert.equal(all.rows.length, 6);
    assert.deepEqual(
      all.filters.map((f) => f.count),
      [6, 1, 2, 1, 1, 1],
    );
    for (const filter of MONITOR_STATION_FILTERS) {
      const selected = monitorStationFilter(arrangement, filter.key);
      assert.equal(
        selected.rows.length,
        all.filters.find((f) => f.key === filter.key).count,
      );
      assert.deepEqual(selected.filters, all.filters, "筛选不缩减顶部统计总量");
      assert.ok(
        selected.rows.every(
          (r) => !filter.statuses || filter.statuses.includes(r.session.status),
        ),
      );
    }
    assert.deepEqual(
      monitorStationFilter(arrangement, "waiting").rows.map(
        (r) => r.session.status,
      ),
      ["待开始", "可入场"],
    );
    assert.deepEqual(arrangement, before, "筛选不修改成绩、会话或开放范围");
  });
  test(`${type}零结果保持选中状态且可恢复全部，状态变化后自动重新匹配`, () => {
    const arrangement = fixture(type);
    arrangement.sessions.find((s) => s.status === "故障").status = "已暂停";
    const empty = monitorStationFilter(arrangement, "fault");
    assert.equal(empty.rows.length, 0);
    assert.equal(empty.selected.key, "fault");
    assert.equal(empty.selected.count, 0);
    assert.equal(monitorStationFilter(arrangement, "all").rows.length, 6);
    assert.equal(monitorStationFilter(arrangement, "paused").rows.length, 2);
    assert.equal(
      monitorStationFilter(arrangement, "unknown").selected.key,
      "all",
    );
  });
}

test("未开放工位、他人安排会话和重复引用不冒充开放工位", () => {
  const arrangement = fixture();
  arrangement.workstationIds.push("w0", "closed");
  arrangement.sessions.push(
    { id: "foreign", workstationId: "other", status: "故障" },
    { id: "closed", workstationId: "closed", status: "待开始" },
  );
  const result = monitorStationFilter(arrangement);
  assert.equal(result.rows.length, 6);
  assert.equal(result.filters.find((f) => f.key === "fault").count, 1);
  assert.ok(
    !result.rows.some((r) =>
      ["unopened", "other", "closed"].includes(r.workstationId),
    ),
  );
});

test("旧记录无开放列表时依据实际会话；明确空开放列表不复活历史会话", () => {
  const arrangement = fixture();
  delete arrangement.openWorkstationIds;
  assert.equal(monitorStationFilter(arrangement).rows.length, 6);
  arrangement.openWorkstationIds = [];
  assert.equal(monitorStationFilter(arrangement).rows.length, 0);
  assert.equal(monitorStationFilter().rows.length, 0);
});
