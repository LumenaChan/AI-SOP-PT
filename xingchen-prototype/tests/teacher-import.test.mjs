import test from "node:test";
import assert from "node:assert/strict";
import {
  teacherImportPreview,
  parseAccountCsv,
  TEACHER_IMPORT_TEMPLATE,
  TEACHER_IMPORT_HEADER,
  teacherCredentialsCsv,
  assertTeacherImportBatch,
} from "../src/teacherImportRules.js";
import { createTeacherAccountActions } from "../src/teacherAccountActions.js";
import { authenticatePrototypeAccount } from "../src/teacherAccountRules.js";
import { persistWorkingData } from "../src/storageMigrationRules.js";
const existing = {
  id: "t1",
  name: "已有教师",
  employeeNo: "T-0001",
  account: "existing",
  status: "启用",
  notes: "原资料",
};
const profile = (i) => ({
  name: `教师${i}`,
  employeeNo: `T-${1000 + i}`,
  account: `teacher${i}`,
  department: "院系",
  major: "专业",
  phone: "",
  notes: "导入备注",
});
function fixture(initialSource = "browser") {
  let data = {
      teachers: [structuredClone(existing)],
      students: [{ id: "s1", face: "已采集" }],
      auditLogs: [],
      arrangements: [{ id: "p1", teacherId: "t1" }],
    },
    source = initialSource,
    role = "admin",
    fail = false;
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k),
    setItem: (k, v) => {
      if (fail) throw new Error("保存失败");
      values.set(k, v);
    },
  };
  const actions = createTeacherAccountActions({
    getData: () => data,
    getSession: () => ({ role }),
    getSource: () => source,
    source: initialSource,
    setData: (fn) => {
      const next = fn(data);
      persistWorkingData(storage, source, "test", next);
      data = next;
    },
  });
  return {
    actions,
    values,
    get data() {
      return data;
    },
    set source(v) {
      source = v;
    },
    set role(v) {
      role = v;
    },
    set fail(v) {
      fail = v;
    },
  };
}
test("教师模板与CSV兼容BOM、引号、逗号、换行和空选填字段", () => {
  const template = teacherImportPreview("\uFEFF" + TEACHER_IMPORT_TEMPLATE, [
    existing,
  ]);
  assert.equal(template.length, 1);
  assert.equal(template[0].result, "可导入");
  const raw =
    TEACHER_IMPORT_HEADER +
    '\r\n"赵,敏",t-0102,ZHAOMIN2,院系,专业,,"备注第一行\n他说""你好"""';
  const row = teacherImportPreview(raw, [existing])[0];
  assert.equal(row.name, "赵,敏");
  assert.equal(row.employeeNo, "T-0102");
  assert.equal(row.account, "zhaomin2");
  assert.equal(row.notes, '备注第一行\n他说"你好"');
  assert.equal(row.result, "可导入");
  assert.equal(teacherImportPreview("\n \n", []).length, 0);
  assert.throws(() => parseAccountCsv('"bad'), /未闭合/);
  assert.throws(() => parseAccountCsv('"ok"extra,x'), /多余/);
  assert.throws(() => teacherImportPreview("姓名,账号\n张三,abc", []), /表头/);
});
test("逐行识别数据库及批次内重复、保留账号和字段错误", () => {
  const rows = teacherImportPreview(
    [
      "甲,T-0001,newuser,院系,专业",
      "乙,T-0002,EXISTING,院系,专业",
      "丙,T-0003,admin,院系,专业",
      "丁,T-0004,wanglaoshi,院系,专业",
      "戊,T-0005,teacher5,,专业",
      "己,T-0006,teacher6,院系,专业,123",
      "庚,T-0007,teacher7,院系,专业",
      "辛,t-0007,teacher8,院系,专业",
      "壬,T-0009,DUPUSER,院系,专业",
      "癸,T-0010,dupuser,院系,专业",
      "无效行",
      "末,T-0011,gooduser,院系,专业,13800138000,备注",
    ].join("\n"),
    [existing],
  );
  for (const row of rows.slice(0, -1)) assert.notEqual(row.result, "可导入");
  assert.match(rows[0].result, /工号已存在/);
  assert.match(rows[1].result, /账号已存在/);
  assert.equal(rows[6].result, "批次内工号重复");
  assert.equal(rows[9].result, "批次内账号重复");
  assert.equal(rows.at(-1).result, "可导入");
  assert.throws(() => assertTeacherImportBatch([], []), /1—500/);
  assert.throws(
    () =>
      assertTeacherImportBatch(
        Array.from({ length: 501 }, (_, i) => profile(i)),
        [],
      ),
    /1—500/,
  );
});
test("100位教师整批导入、独立临时密码、首次改密标记、资料与学生数据保留", async () => {
  const f = fixture(),
    original = structuredClone(f.data);
  const inputs = Array.from({ length: 100 }, (_, i) => ({
    ...profile(i),
    password: "DoNotPersist889",
    passwordCredential: { hash: "injected" },
  }));
  const receipts = await f.actions.importTeachers(inputs);
  assert.equal(receipts.length, 100);
  assert.equal(f.data.teachers.length, 101);
  assert.equal(new Set(receipts.map((r) => r.temporaryPassword)).size, 100);
  assert.equal(new Set(f.data.teachers.map((r) => r.id)).size, 101);
  assert.deepEqual(f.data.teachers.at(-1), original.teachers[0]);
  assert.deepEqual(f.data.students, original.students);
  assert.deepEqual(f.data.arrangements, original.arrangements);
  assert.equal(f.data.auditLogs.length, 1);
  for (const item of f.data.teachers.slice(0, -1))
    assert.equal(item.passwordCredential.mustChange, true);
  for (const r of [receipts[0], receipts.at(-1)]) {
    const login = await authenticatePrototypeAccount(
      f.data,
      r.teacher.account,
      r.temporaryPassword,
    );
    assert.equal(login.teacherId, r.teacher.id);
    assert.equal(login.mustChange, true);
  }
  const saved = [...f.values.values()].join("");
  assert.ok(!saved.includes("DoNotPersist889") && !saved.includes("injected"));
  for (const r of receipts) assert.ok(!saved.includes(r.temporaryPassword));
  for (const r of receipts) assert.match(r.temporaryPassword, /^[A-Za-z0-9]/);
});
test("预览后数据变化、并发导入和任一行错误均不部分写入", async () => {
  const f = fixture(),
    before = structuredClone(f.data);
  await assert.rejects(
    f.actions.importTeachers([
      profile(1),
      { ...profile(2), account: "existing" },
    ]),
    /第2行/,
  );
  assert.deepEqual(f.data, before);
  const pending = f.actions.importTeachers([profile(3), profile(4)]);
  f.data.teachers.push({ ...profile(4), id: "other-operation" });
  await assert.rejects(pending, /第2行/);
  assert.equal(f.data.teachers.length, 2);
  assert.equal(f.data.auditLogs.length, 0);
  const results = await Promise.allSettled([
    f.actions.importTeachers([profile(5)]),
    f.actions.importTeachers([profile(5)]),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    f.data.teachers.filter((t) => t.account === "teacher5").length,
    1,
  );
});
test("保存失败和异步来源切换不产生成功回执，教师身份不可导入", async () => {
  const f = fixture(),
    before = structuredClone(f.data);
  f.fail = true;
  await assert.rejects(f.actions.importTeachers([profile(1)]), /保存失败/);
  assert.deepEqual(f.data, before);
  f.fail = false;
  const pending = f.actions.importTeachers([profile(2)]);
  f.source = "cpd";
  await assert.rejects(pending, /来源已切换/);
  assert.deepEqual(f.data, before);
  f.source = "browser";
  f.role = "teacher";
  await assert.rejects(f.actions.importTeachers([profile(3)]), /只有管理员/);
});
test("CPD工作数据独立保存，回执CSV保留全部账号并转义表格公式", async () => {
  const f = fixture("cpd"),
    receipts = await f.actions.importTeachers([
      { ...profile(1), name: "=风险姓名" },
      profile(2),
    ]);
  assert.ok(f.values.has("xingchen-prototype-cpd-working-data-v1"));
  assert.ok(!f.values.has("xingchen-prototype-data-v22"));
  const csv = teacherCredentialsCsv(receipts),
    rows = parseAccountCsv(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][0], "'=风险姓名");
  assert.equal(rows[2][1], receipts[1].teacher.account);
  assert.equal(rows[2][2], receipts[1].temporaryPassword);
  assert.ok(
    !JSON.stringify(f.data.auditLogs).includes(receipts[0].temporaryPassword),
  );
});
