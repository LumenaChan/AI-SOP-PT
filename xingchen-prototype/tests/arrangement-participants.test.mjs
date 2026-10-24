import test from "node:test";
import assert from "node:assert/strict";
import {
  arrangementParticipantModel,
  changeArrangementParticipants,
} from "../src/arrangementParticipantRules.js";
import { allocationIssues } from "../src/arrangementPreparationRules.js";
import {
  studentRuntimeFixture,
  createStudentRuntimeStore,
} from "./student-e2e-fixture.mjs";

function fixture() {
  return {
    classes: [
      { id: "a", name: "一班", code: "C01" },
      { id: "b", name: "二班", code: "C02" },
      { id: "empty", name: "空班", code: "C03" },
    ],
    students: [
      { id: "one", name: "张浩", no: "A001", classId: "a", status: "启用" },
      { id: "two", name: "李思雨", no: "A002", classId: "a", status: "启用" },
      { id: "three", name: "陈宇", no: "B001", classId: "b", status: "启用" },
      {
        id: "disabled",
        name: "停用学生",
        no: "B002",
        classId: "b",
        status: "停用",
      },
      {
        id: "extra",
        name: "跨班学生",
        no: "X001",
        classId: "other",
        status: "启用",
      },
    ],
  };
}
const blank = () => ({
  studentIds: [],
  workstationIds: ["w1", "w2"],
  stationAssignments: [],
});
test("多个班级与额外学生取并集去重，取消班级保留其他班级和额外学生", () => {
  const data = fixture(),
    original = structuredClone(data);
  const groups = arrangementParticipantModel(data).classOptions;
  let draft = blank();
  for (const group of groups.slice(0, 2))
    draft = changeArrangementParticipants(
      draft,
      data.students,
      group.memberIds,
      true,
    );
  draft = changeArrangementParticipants(
    draft,
    data.students,
    ["one", "extra", "disabled", "unknown"],
    true,
  );
  assert.deepEqual(draft.studentIds, ["one", "two", "three", "extra"]);
  draft = changeArrangementParticipants(
    draft,
    data.students,
    groups[0].memberIds,
    false,
  );
  assert.deepEqual(draft.studentIds, ["three", "extra"]);
  assert.equal(
    new Set(draft.stationAssignments.map((pair) => pair.studentId)).size,
    2,
  );
  assert.deepEqual(data, original);
});
test("班级选择与逐人取消同步为全选/部分选择/未选，不隐式重选", () => {
  const data = fixture();
  let model = arrangementParticipantModel({
    ...data,
    selectedIds: ["one", "two"],
  });
  assert.equal(model.classOptions[0].checked, true);
  const draft = changeArrangementParticipants(
    { ...blank(), studentIds: ["one", "two"] },
    data.students,
    ["one"],
    false,
  );
  model = arrangementParticipantModel({
    ...data,
    selectedIds: draft.studentIds,
  });
  assert.equal(model.classOptions[0].checked, false);
  assert.equal(model.classOptions[0].partial, true);
  assert.equal(model.classOptions[0].selectedCount, 1);
  assert.deepEqual(draft.studentIds, ["two"]);
  assert.equal(model.classOptions[2].disabled, true);
});
test("数千学生按姓名/学号搜索，分页仅返回当前页，查询不会改选择", () => {
  const students = Array.from({ length: 2345 }, (_, index) => ({
    id: `s${index}`,
    name: `学生${index}`,
    no: `NO${String(index).padStart(5, "0")}`,
    status: "启用",
    classId: index % 2 ? "b" : "a",
  }));
  const selectedIds = ["s0", "s1000", "s2344"];
  let model = arrangementParticipantModel({
    ...fixture(),
    students,
    selectedIds,
    studentPage: 2,
    studentPageSize: 20,
  });
  assert.equal(model.studentPage.total, 2345);
  assert.equal(model.studentPage.rows.length, 20);
  assert.equal(model.studentPage.rows[0].id, "s20");
  model = arrangementParticipantModel({
    students,
    selectedIds,
    studentQuery: " no02344 ",
  });
  assert.equal(model.studentPage.total, 1);
  assert.equal(model.studentPage.rows[0].id, "s2344");
  assert.deepEqual(model.selectedIds, selectedIds);
  assert.equal(
    arrangementParticipantModel({ students, studentQuery: "学生2344" })
      .studentPage.total,
    1,
  );
  assert.equal(
    arrangementParticipantModel({ students, studentQuery: "不存在" })
      .studentPage.total,
    0,
  );
});
test("跨页勾选及本页取消不影响其他页，姓名搜索与班级及已选筛选可组合", () => {
  const data = fixture();
  const current = { ...blank(), studentIds: ["one", "three", "extra"] };
  const model = arrangementParticipantModel({
    ...data,
    selectedIds: current.studentIds,
    classId: "a",
    onlySelected: true,
    studentQuery: "A00",
  });
  assert.deepEqual(
    model.studentPage.rows.map((s) => s.id),
    ["one"],
  );
  const next = changeArrangementParticipants(
    current,
    data.students,
    model.studentPage.rows.map((s) => s.id),
    false,
  );
  assert.deepEqual(next.studentIds, ["three", "extra"]);
  assert.deepEqual(current.studentIds, ["one", "three", "extra"]);
});
test("停用及已删除的旧选择可回显和移除，批量选择不会新增失效学生", () => {
  const data = fixture();
  const current = { ...blank(), studentIds: ["disabled", "deleted"] };
  const model = arrangementParticipantModel({
    ...data,
    selectedIds: current.studentIds,
    onlySelected: true,
  });
  assert.equal(model.unavailableSelected, 2);
  assert.equal(model.studentPage.total, 2);
  assert.equal(
    model.studentPage.rows.find((s) => s.id === "deleted").status,
    "已失效",
  );
  const next = changeArrangementParticipants(
    current,
    data.students,
    ["one", "disabled", "never-existed"],
    true,
  );
  assert.deepEqual(next.studentIds, ["disabled", "deleted", "one"]);
  assert.deepEqual(
    changeArrangementParticipants(
      next,
      data.students,
      ["deleted", "disabled"],
      false,
    ).studentIds,
    ["one"],
  );
});
test("已有工位对应关系优先保留，移除已分配学生补入未分配学生，不重复占位", () => {
  const data = fixture();
  const current = {
    ...blank(),
    studentIds: ["one", "two", "three"],
    stationAssignments: [
      { workstationId: "w1", studentId: "two" },
      { workstationId: "w2", studentId: "one" },
    ],
  };
  const next = changeArrangementParticipants(
    current,
    data.students,
    ["one"],
    false,
  );
  assert.deepEqual(next.stationAssignments, [
    { workstationId: "w1", studentId: "two" },
    { workstationId: "w2", studentId: "three" },
  ]);
  assert.deepEqual(allocationIssues(next), []);
  const many = changeArrangementParticipants(
    next,
    data.students,
    ["one", "extra"],
    true,
  );
  assert.equal(many.studentIds.length, 4);
  assert.ok(allocationIssues(many).some((s) => s.includes("一人一工位")));
});
test("班级本身也支持搜索与分页，空结果和越界页不报错", () => {
  const classes = Array.from({ length: 123 }, (_, index) => ({
    id: `c${index}`,
    name: `班级${index}`,
    code: `C${index}`,
  }));
  let model = arrangementParticipantModel({
    classes,
    classPage: 3,
    classPageSize: 20,
  });
  assert.equal(model.classPage.total, 123);
  assert.equal(model.classPage.rows.length, 20);
  assert.equal(model.classPage.rows[0].id, "c40");
  model = arrangementParticipantModel({
    classes,
    classQuery: "C122",
    classPage: 50,
  });
  assert.equal(model.classPage.page, 1);
  assert.equal(model.classPage.rows[0].id, "c122");
  model = arrangementParticipantModel({ classes, classQuery: "不存在" });
  assert.deepEqual(model.classPage.rows, []);
  assert.equal(model.classPage.page, 1);
});
for (const type of ["practice", "exam"]) {
  test(`${type}复合名单可保存编辑及完成配置，后续班级成员变化不自动增减已保存名单`, () => {
    const input = studentRuntimeFixture();
    input.classes = [
      { id: "a", name: "一班" },
      { id: "b", name: "二班" },
    ];
    input.students[0].classId = "a";
    input.students.push({
      id: "other",
      name: "补选学生",
      no: "20260002",
      status: "启用",
      classId: "b",
    });
    input.workstations.push({
      ...input.workstations[0],
      id: "other-w",
      name: "第二工位",
    });
    const { store } = createStudentRuntimeStore(input);
    const config = {
      type,
      name: `复合名单${type}`,
      scheduleStart: "2026-10-23T10:00:00",
      sopId: input.sops[0].id,
      studentIds: [],
      workstationIds: input.workstations.map((w) => w.id),
      stationAssignments: [],
      ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
    };
    const group = arrangementParticipantModel(input).classOptions[0];
    let draft = changeArrangementParticipants(
      config,
      input.students,
      group.memberIds,
      true,
    );
    draft = changeArrangementParticipants(
      draft,
      input.students,
      ["other"],
      true,
    );
    const saved = store.saveArrangement(draft, false);
    assert.deepEqual(saved.studentIds, ["student-e2e", "other"]);
    assert.deepEqual(
      arrangementParticipantModel({ ...input, selectedIds: saved.studentIds })
        .selectedIds,
      saved.studentIds,
    );
    const finalized = store.saveArrangement(saved, true);
    assert.equal(finalized.status, "待开始");
    assert.deepEqual(finalized.studentIds, saved.studentIds);
    input.students.push({
      id: "later",
      name: "后转入学生",
      classId: "a",
      status: "启用",
    });
    const model = arrangementParticipantModel({
      ...input,
      selectedIds: saved.studentIds,
    });
    assert.equal(model.classOptions[0].partial, true);
    assert.equal(
      model.studentPage.rows.find((s) => s.id === "later").selected,
      false,
    );
    assert.deepEqual(
      store.getData().arrangements.find((a) => a.id === saved.id).studentIds,
      saved.studentIds,
    );
  });
}
