import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeacherAccountActions,
  teacherProfileInput,
} from "../src/teacherAccountActions.js";
import {
  authenticatePrototypeAccount,
  teacherLoginSessionValid,
  verifyTeacherPassword,
  teacherPasswordCredential,
  assertTeacherAccountAvailable,
  readAccountSession,
  writeAccountSession,
  teacherAccountRedirect,
} from "../src/teacherAccountRules.js";
import { persistWorkingData } from "../src/storageMigrationRules.js";
function fixture() {
  let data = {
    teachers: [
      {
        id: "t1",
        name: "演示教师",
        account: "wangwei",
        employeeNo: "T-0001",
        status: "启用",
      },
      {
        id: "t2",
        name: "第二教师",
        account: "teacher2",
        employeeNo: "T-0002",
        status: "启用",
      },
    ],
    auditLogs: [],
  };
  let session = { role: "admin" },
    source = "browser",
    fail = false;
  const values = new Map();
  const storage = {
    setItem(k, v) {
      if (fail) throw new Error("存储失败");
      values.set(k, v);
    },
    getItem: (k) => values.get(k),
    removeItem: (k) => values.delete(k),
  };
  const actions = createTeacherAccountActions({
    getData: () => data,
    getSession: () => session,
    getSource: () => source,
    source: "browser",
    setData(fn) {
      const next = fn(data);
      persistWorkingData(storage, source, "test", next);
      data = next;
    },
    now: () => "2026-10-25 10:00:00",
  });
  return {
    actions,
    values,
    storage,
    get data() {
      return data;
    },
    set session(v) {
      session = v;
    },
    set source(v) {
      source = v;
    },
    set fail(v) {
      fail = v;
    },
  };
}
const profile = {
  name: "新教师",
  employeeNo: "T-0021",
  account: "newteacher",
  department: "院系",
  major: "专业",
};
test("创建分配可用临时密码，仅持久化加盐校验值，姓名账号与登录身份一致", async () => {
  const f = fixture(),
    receipt = await f.actions.createTeacher({
      ...profile,
      password: "DoNotStore123",
      passwordCredential: { hash: "injected" },
    });
  const teacher = f.data.teachers[0];
  assert.equal(teacher.account, "newteacher");
  assert.notEqual(teacher.id, "t1");
  assert.ok(await verifyTeacherPassword(teacher, receipt.temporaryPassword));
  assert.equal(teacher.passwordCredential.mustChange, true);
  const saved = f.values.get("xingchen-prototype-data-v22");
  assert.ok(
    !saved.includes(receipt.temporaryPassword) &&
      !saved.includes("DoNotStore123"),
  );
  assert.ok(
    !JSON.stringify(f.data.auditLogs).includes(teacher.passwordCredential.hash),
  );
  const login = await authenticatePrototypeAccount(
    f.data,
    " NEWTEACHER ",
    receipt.temporaryPassword,
  );
  assert.equal(login.teacherId, teacher.id);
  assert.equal(login.mustChange, true);
  assert.ok(
    teacherLoginSessionValid(
      f.data,
      { ...login, source: "browser" },
      "browser",
    ),
  );
  assert.equal(
    teacherLoginSessionValid(f.data, { ...login, source: "browser" }, "cpd"),
    false,
  );
  await assert.rejects(f.actions.createTeacher(profile), /已存在/);
  assert.equal(f.data.teachers.length, 3);
});
test("重置立即废止旧密码及旧登录状态，不启用停用账号，也不借用全局演示密码", async () => {
  const f = fixture(),
    demo = await authenticatePrototypeAccount(f.data, "wanglaoshi", "12345678");
  assert.equal(demo.teacherId, "t1");
  await assert.rejects(
    authenticatePrototypeAccount(f.data, "teacher2", "12345678"),
    /尚未分配/,
  );
  const r = await f.actions.resetTeacherPassword("t1", "");
  assert.equal(
    teacherLoginSessionValid(f.data, { ...demo, source: "browser" }, "browser"),
    false,
  );
  await assert.rejects(
    authenticatePrototypeAccount(f.data, "wanglaoshi", "12345678"),
    /密码错误/,
  );
  await assert.rejects(
    authenticatePrototypeAccount(f.data, "wangwei", "12345678"),
    /密码错误/,
  );
  assert.equal(
    (await authenticatePrototypeAccount(f.data, "wangwei", r.temporaryPassword))
      .mustChange,
    true,
  );
  f.data.teachers.find((t) => t.id === "t2").status = "停用";
  const disabled = await f.actions.resetTeacherPassword("t2");
  assert.equal(f.data.teachers.find((t) => t.id === "t2").status, "停用");
  await assert.rejects(
    authenticatePrototypeAccount(
      f.data,
      "teacher2",
      disabled.temporaryPassword,
    ),
    /已停用/,
  );
});
test("首次改密和自主改密验证旧密码、确认输入及强度，成功后须重新登录", async () => {
  const f = fixture(),
    r = await f.actions.resetTeacherPassword("t2");
  const login = await authenticatePrototypeAccount(
    f.data,
    "teacher2",
    r.temporaryPassword,
  );
  f.session = { ...login, source: "browser" };
  const before = structuredClone(f.data);
  for (const input of [
    {
      currentPassword: "wrong",
      newPassword: "NewPassword889",
      confirmPassword: "NewPassword889",
    },
    {
      currentPassword: r.temporaryPassword,
      newPassword: "NewPassword889",
      confirmPassword: "different",
    },
    {
      currentPassword: r.temporaryPassword,
      newPassword: r.temporaryPassword,
      confirmPassword: r.temporaryPassword,
    },
    {
      currentPassword: r.temporaryPassword,
      newPassword: "12345678",
      confirmPassword: "12345678",
    },
  ]) {
    await assert.rejects(f.actions.changeTeacherPassword(input));
    assert.deepEqual(f.data, before);
  }
  await assert.rejects(f.actions.resetTeacherPassword("t1"), /只有管理员/);
  await f.actions.changeTeacherPassword({
    currentPassword: r.temporaryPassword,
    newPassword: "NewPassword889",
    confirmPassword: "NewPassword889",
  });
  await assert.rejects(
    authenticatePrototypeAccount(f.data, "teacher2", r.temporaryPassword),
    /密码错误/,
  );
  const fresh = await authenticatePrototypeAccount(
    f.data,
    "teacher2",
    "NewPassword889",
  );
  assert.equal(fresh.mustChange, false);
  assert.equal(fresh.teacherId, "t2");
  assert.equal(
    teacherLoginSessionValid(
      f.data,
      { ...login, source: "browser" },
      "browser",
    ),
    false,
  );
  assert.ok(!JSON.stringify(f.data).includes("NewPassword889"));
  f.session = { ...fresh, source: "browser" };
  await f.actions.changeTeacherPassword({
    currentPassword: "NewPassword889",
    newPassword: "NextPassword990",
    confirmPassword: "NextPassword990",
  });
  assert.equal(
    (await authenticatePrototypeAccount(f.data, "teacher2", "NextPassword990"))
      .mustChange,
    false,
  );
});
test("重复重置、并发创建、来源切换及写入失败不覆盖已保存密码或泄露成功回执", async () => {
  const f = fixture();
  const results = await Promise.allSettled([
    f.actions.createTeacher(profile),
    f.actions.createTeacher(profile),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const first = await f.actions.resetTeacherPassword("t2", "");
  const before = structuredClone(f.data);
  await assert.rejects(f.actions.resetTeacherPassword("t2", ""), /状态已变化/);
  assert.deepEqual(f.data, before);
  f.fail = true;
  await assert.rejects(f.actions.resetTeacherPassword("t2"), /存储失败/);
  assert.deepEqual(f.data, before);
  assert.equal(
    (
      await authenticatePrototypeAccount(
        f.data,
        "teacher2",
        first.temporaryPassword,
      )
    ).teacherId,
    "t2",
  );
  f.fail = false;
  const pending = f.actions.resetTeacherPassword("t2");
  f.source = "cpd";
  await assert.rejects(pending, /来源已切换/);
  assert.deepEqual(f.data, before);
});
test("登录状态保存不含密码；畸形校验值与保留账号不能绕过校验", async () => {
  const f = fixture();
  for (const account of ["admin", "disabled-demo", "wanglaoshi"])
    assert.throws(
      () => assertTeacherAccountAvailable(f.data.teachers, account),
      /保留账号/,
    );
  assert.equal(
    await verifyTeacherPassword(
      { passwordCredential: { hash: "bad" } },
      "anything",
    ),
    false,
  );
  const a = await teacherPasswordCredential("Password889"),
    b = await teacherPasswordCredential("Password889");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  const session = {
    role: "teacher",
    teacherId: "t2",
    credentialId: a.id,
    account: "teacher2",
    source: "browser",
  };
  writeAccountSession(f.storage, session);
  assert.deepEqual(readAccountSession(f.storage), session);
  assert.ok(!JSON.stringify([...f.values]).includes("Password889"));
  writeAccountSession(f.storage, null);
  assert.equal(readAccountSession(f.storage), null);
  assert.deepEqual(
    Object.keys(
      teacherProfileInput({
        ...profile,
        password: "secret",
        passwordCredential: a,
      }),
    ).sort(),
    [
      "account",
      "department",
      "employeeNo",
      "major",
      "name",
      "notes",
      "phone",
    ].sort(),
  );
});

test("临时密码、重置失效、停用和跨来源登录均不能绕过改密流程", async () => {
  const f = fixture(),
    receipt = await f.actions.resetTeacherPassword("t2");
  const login = {
    ...(await authenticatePrototypeAccount(
      f.data,
      "teacher2",
      receipt.temporaryPassword,
    )),
    source: "browser",
  };
  assert.equal(
    teacherAccountRedirect(f.data, login, "browser", "/teacher/dashboard"),
    "/account/password",
  );
  assert.equal(
    teacherAccountRedirect(f.data, login, "browser", "/admin/teachers"),
    "/account/password",
  );
  assert.equal(
    teacherAccountRedirect(f.data, login, "cpd", "/teacher/dashboard"),
    "/login",
  );
  f.session = login;
  await f.actions.changeTeacherPassword({
    currentPassword: receipt.temporaryPassword,
    newPassword: "PrivatePass889",
    confirmPassword: "PrivatePass889",
  });
  assert.equal(
    teacherAccountRedirect(f.data, login, "browser", "/teacher/dashboard"),
    "/login",
  );
  const fresh = {
    ...(await authenticatePrototypeAccount(
      f.data,
      "teacher2",
      "PrivatePass889",
    )),
    source: "browser",
  };
  assert.equal(
    teacherAccountRedirect(f.data, fresh, "browser", "/teacher/dashboard"),
    "",
  );
  assert.equal(
    teacherAccountRedirect(f.data, fresh, "browser", "/admin/teachers"),
    "/teacher/dashboard",
  );
  f.data.teachers.find((t) => t.id === "t2").status = "停用";
  assert.equal(
    teacherAccountRedirect(f.data, fresh, "browser", "/teacher/dashboard"),
    "/login",
  );
});
