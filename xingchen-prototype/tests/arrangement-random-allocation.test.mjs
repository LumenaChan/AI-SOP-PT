import { confirmOpeningCheck } from "./opening-check-fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  allocationSetupReason,
  allocationWorkstationAvailable,
  randomizeArrangementAllocation,
  swapAllocationStudent,
} from "../src/arrangementAllocationRules.js";
import { allocationIssues } from "../src/arrangementPreparationRules.js";
import { changeArrangementParticipants } from "../src/arrangementParticipantRules.js";
import {
  studentRuntimeFixture,
  createStudentRuntimeStore,
} from "./student-e2e-fixture.mjs";

function fixture(count = 3) {
  const students = Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    name: `学生${i}`,
    status: "启用",
  }));
  const workstations = students.map((_, i) => ({
    id: `w${i}`,
    name: `工位${i}`,
    status: "可入场",
    currentArrangement: "无",
  }));
  return {
    data: { students, workstations, arrangements: [] },
    draft: {
      type: "practice",
      studentIds: students.map((s) => s.id),
      workstationIds: workstations.map((w) => w.id),
      stationAssignments: [],
      sessions: [],
      openWorkstationIds: [],
    },
  };
}

test("随机分配生成一人一工位的完整配对，只改当前草稿，不修改学生顺序或源数据", () => {
  const { data, draft } = fixture(),
    original = structuredClone({ data, draft });
  const result = randomizeArrangementAllocation(data, draft, {
    random: () => 0,
    at: "2026-10-23T06:00:00Z",
  });
  assert.deepEqual(
    result.stationAssignments.map((p) => p.studentId),
    ["s1", "s2", "s0"],
  );
  assert.deepEqual(result.studentIds, draft.studentIds);
  assert.deepEqual(result.workstationIds, draft.workstationIds);
  assert.equal(result.allocationRandomizedAt, "2026-10-23T06:00:00Z");
  assert.deepEqual(allocationIssues(result), []);
  assert.deepEqual({ data, draft }, original);
});
test("重复随机保留学生和工位集合，不产生遗漏、重复或额外工位", () => {
  const { data, draft } = fixture(80);
  let seed = 42;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const first = randomizeArrangementAllocation(data, draft, { random });
  const second = randomizeArrangementAllocation(data, first, { random });
  assert.notDeepEqual(first.stationAssignments, second.stationAssignments);
  for (const result of [first, second]) {
    assert.deepEqual(
      new Set(result.stationAssignments.map((p) => p.studentId)),
      new Set(draft.studentIds),
    );
    assert.deepEqual(
      result.stationAssignments.map((p) => p.workstationId),
      draft.workstationIds,
    );
    assert.deepEqual(allocationIssues(result), []);
  }
});
test("0工位、缺少学生、人数不等只给出调整提示，不截断名单或生成批次", () => {
  const { data, draft } = fixture();
  for (const input of [
    { ...draft, workstationIds: [] },
    { ...draft, studentIds: [] },
    { ...draft, workstationIds: ["w0"] },
    { ...draft, studentIds: ["s0"] },
  ]) {
    const before = structuredClone(input);
    assert.throws(
      () => randomizeArrangementAllocation(data, input),
      /请选择|请在右侧|请再选/,
    );
    assert.deepEqual(input, before);
    assert.equal(input.batches, undefined);
  }
  assert.match(
    allocationSetupReason(data, { ...draft, workstationIds: ["w0"] }),
    /另建安排分批/,
  );
});
test("故障、维护、停用、被占用、已删除工位和停用学生均拒绝随机，原对应关系保留", () => {
  for (const status of ["故障", "维护中", "停用"]) {
    const { data, draft } = fixture();
    data.workstations[0].status = status;
    assert.throws(
      () => randomizeArrangementAllocation(data, draft),
      /工位不可用/,
    );
    assert.deepEqual(draft.stationAssignments, []);
  }
  const { data, draft } = fixture();
  data.workstations[0].currentArrangement = "其他安排";
  assert.throws(
    () => randomizeArrangementAllocation(data, draft),
    /工位不可用/,
  );
  data.workstations.shift();
  assert.throws(
    () => randomizeArrangementAllocation(data, draft),
    /工位不可用/,
  );
  data.students[0].status = "停用";
  assert.throws(
    () => randomizeArrangementAllocation(data, draft),
    /停用或失效/,
  );
});
test("占用归属优先按安排ID核对，同名其他安排不能作为可用工位", () => {
  const station = {
    status: "进行中",
    currentArrangement: "同名安排",
    currentArrangementId: "other",
  };
  const existing = { id: "mine", name: "同名安排" };
  assert.equal(allocationWorkstationAvailable(station, existing), false);
  assert.equal(
    allocationWorkstationAvailable(
      { ...station, currentArrangementId: "mine" },
      existing,
    ),
    true,
  );
  assert.equal(
    allocationWorkstationAvailable(
      { ...station, currentArrangementId: "" },
      existing,
    ),
    true,
  );
  assert.equal(
    allocationWorkstationAvailable(
      { ...station, currentArrangementId: "" },
      null,
    ),
    false,
  );
});
test("草稿已失效、工位已开放、已建立会话、已开始及历史安排均不能重新随机", () => {
  const { data, draft } = fixture();
  assert.throws(
    () => randomizeArrangementAllocation(data, { ...draft, id: "deleted" }),
    /已失效/,
  );
  for (const fields of [
    { openWorkstationIds: ["w0"] },
    { sessions: [{ id: "waiting", status: "可入场" }] },
    { startedAt: "2026-10-23T01:00:00Z" },
    { status: "进行中" },
    { status: "已结束" },
    { status: "已取消" },
  ])
    assert.throws(
      () => randomizeArrangementAllocation(data, { ...draft, ...fields }),
      /不能重新分配/,
    );
  const stale = { ...draft, id: "saved", status: "草稿" };
  data.arrangements = [{ ...stale, openWorkstationIds: ["w0"] }];
  assert.throws(
    () => randomizeArrangementAllocation(data, stale),
    /不能重新分配/,
  );
});
test("随机结果允许手动交换两人或清空，不重复分配；增减名单只补空缺", () => {
  const { data, draft } = fixture();
  const randomized = randomizeArrangementAllocation(data, draft, {
    random: () => 0,
  });
  const pairs = swapAllocationStudent(randomized, "w0", "s0");
  assert.deepEqual(
    pairs.map((p) => p.studentId),
    ["s0", "s2", "s1"],
  );
  assert.deepEqual(
    allocationIssues({ ...randomized, stationAssignments: pairs }),
    [],
  );
  const changed = changeArrangementParticipants(
    { ...randomized, stationAssignments: pairs },
    data.students,
    ["s2"],
    false,
  );
  assert.equal(changed.stationAssignments[0].studentId, "s0");
  assert.equal(changed.stationAssignments[2].studentId, "s1");
  assert.equal(changed.stationAssignments[1].studentId, "");
  assert.equal(swapAllocationStudent(randomized, "w0", "")[0].studentId, "");
  assert.throws(
    () => swapAllocationStudent(randomized, "w0", "outsider"),
    /参与名单/,
  );
});
test("重复IDs和随机执行失败不改动原分配；一名学生也可正常分配", () => {
  const { data, draft } = fixture();
  assert.throws(
    () =>
      randomizeArrangementAllocation(data, {
        ...draft,
        studentIds: ["s0", "s0", "s2"],
      }),
    /重复/,
  );
  assert.throws(
    () => randomizeArrangementAllocation(data, draft, { random: () => NaN }),
    /原分配保持不变/,
  );
  assert.deepEqual(draft.stationAssignments, []);
  const single = fixture(1);
  assert.deepEqual(
    randomizeArrangementAllocation(single.data, single.draft)
      .stationAssignments,
    [{ workstationId: "w0", studentId: "s0" }],
  );
});
for (const type of ["practice", "exam"]) {
  test(`${type}随机结果通过原保存和开放流程保留，读取不会重排，开放后拒绝随机`, () => {
    const input = studentRuntimeFixture();
    input.students.push({ id: "other", name: "第二学生", status: "启用" });
    input.workstations.push({
      ...input.workstations[0],
      id: "w-other",
      name: "第二工位",
    });
    const { store } = createStudentRuntimeStore(input);
    const draft = {
      type,
      name: `随机${type}`,
      scheduleStart: "2026-10-23T10:00:00",
      sopId: input.sops[0].id,
      teacherId: "teacher-e2e",
      studentIds: input.students.map((s) => s.id),
      workstationIds: input.workstations.map((w) => w.id),
      ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
    };
    const result = randomizeArrangementAllocation(store.getData(), draft, {
      random: () => 0,
    });
    const saved = store.saveArrangement(result, false);
    assert.deepEqual(saved.stationAssignments, result.stationAssignments);
    const reopened = store
      .getData()
      .arrangements.find((a) => a.id === saved.id);
    assert.deepEqual(reopened.stationAssignments, saved.stationAssignments);
    const finalized = store.saveArrangement(reopened, true);
    assert.deepEqual(finalized.stationAssignments, saved.stationAssignments);
    store.openArrangementWorkstation(
      saved.id,
      input.workstations[0].id,
      confirmOpeningCheck(store, saved.id, input.workstations[0].id),
    );
    const opened = store.getData().arrangements.find((a) => a.id === saved.id);
    assert.equal(
      opened.sessions[0].studentId,
      saved.stationAssignments[0].studentId,
    );
    assert.throws(
      () => randomizeArrangementAllocation(store.getData(), reopened),
      /不能重新分配/,
    );
    assert.deepEqual(
      store.getData().arrangements.find((a) => a.id === saved.id)
        .stationAssignments,
      saved.stationAssignments,
    );
  });
}
