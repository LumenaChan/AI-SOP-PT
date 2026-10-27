import { createTeacherAccountActions } from "../src/teacherAccountActions.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  switchWorkIdentitySession,
  delegatedAdminValid,
} from "../src/accountIdentityRules.js";
import {
  ownProfileModel,
  createOwnProfileActions,
} from "../src/accountProfileRules.js";
import {
  teacherLoginSessionValid,
  teacherAccountRedirect,
  teacherPasswordCredential,
  readAccountSession,
  writeAccountSession,
} from "../src/teacherAccountRules.js";
import { adminSessionValid } from "../src/adminAccessRules.js";
const root = { role: "admin", account: "admin", bootstrap: true };
function data() {
  return {
    teachers: [
      {
        id: "t1",
        account: "teacher01",
        name: "教师姓名",
        employeeNo: "T001",
        department: "院系",
        major: "专业",
        status: "启用",
      },
    ],
    adminUsers: [],
    auditLogs: [],
    arrangements: [{ id: "history", sessions: [{ score: 80 }] }],
  };
}
test("switching to teacher updates the real account context used by profile and persists across refresh", () => {
  const d = data(),
    before = structuredClone(d),
    session = switchWorkIdentitySession(d, root, "cpd", "teacher");
  assert.equal(session.role, "teacher");
  assert.equal(session.account, "teacher01");
  assert.equal(teacherLoginSessionValid(d, session, "cpd"), true);
  const profile = ownProfileModel(d, session, "cpd");
  assert.equal(profile.kind, "teacher");
  assert.equal(profile.name, "教师姓名");
  assert.equal(profile.employeeNo, "T001");
  assert.equal(profile.account, "teacher01");
  assert.equal(delegatedAdminValid(d, session, "cpd"), true);
  let saved;
  const storage = { setItem: (k, v) => (saved = v), getItem: () => saved };
  writeAccountSession(storage, session);
  assert.equal(
    ownProfileModel(d, readAccountSession(storage), "cpd").kind,
    "teacher",
  );
  assert.deepEqual(d, before);
});
test("only a valid prior system administrator can return to the original administrator identity", () => {
  const d = data(),
    teacher = switchWorkIdentitySession(d, root, "browser", "teacher"),
    admin = switchWorkIdentitySession(d, teacher, "browser", "admin");
  assert.equal(admin.role, "admin");
  assert.equal(admin.account, "admin");
  assert.equal(adminSessionValid(d, admin, "browser"), true);
  assert.equal(ownProfileModel(d, admin, "browser").kind, "system-admin");
  const ordinaryTeacher = { ...teacher };
  delete ordinaryTeacher.delegatedAdmin;
  assert.throws(
    () => switchWorkIdentitySession(d, ordinaryTeacher, "browser", "admin"),
    /不能切换/,
  );
  const ordinaryAdmin = {
    role: "admin",
    adminUserId: "u",
    account: "engineer",
  };
  assert.throws(
    () => switchWorkIdentitySession(d, ordinaryAdmin, "browser", "teacher"),
    /不能切换/,
  );
});
test("disabled or missing teachers never silently select another account", () => {
  const d = data();
  d.teachers[0].status = "停用";
  assert.throws(
    () => switchWorkIdentitySession(d, root, "browser", "teacher"),
    /停用/,
  );
  d.teachers = [];
  assert.throws(
    () => switchWorkIdentitySession(d, root, "browser", "teacher"),
    /不存在/,
  );
});
test("source changes or administrator password changes invalidate delegated teacher and return authority", async () => {
  const d = data(),
    teacher = switchWorkIdentitySession(d, root, "browser", "teacher");
  assert.equal(teacherLoginSessionValid(d, teacher, "cpd"), false);
  assert.throws(
    () => switchWorkIdentitySession(d, teacher, "cpd", "admin"),
    /不能切换/,
  );
  d.systemAdminAccount = {
    passwordCredential: await teacherPasswordCredential("NewRoot123!"),
  };
  assert.equal(teacherLoginSessionValid(d, teacher, "browser"), false);
  assert.equal(ownProfileModel(d, teacher, "browser"), null);
  assert.throws(
    () => switchWorkIdentitySession(d, teacher, "browser", "admin"),
    /不能切换/,
  );
});
test("teacher identity profile saves only teacher fields, preserves administrator profile and identifies delegation", () => {
  let d = data();
  d.systemAdminAccount = { name: "管理员姓名", phone: "010-12345678" };
  let session = switchWorkIdentitySession(d, root, "browser", "teacher");
  const before = structuredClone(d),
    model = ownProfileModel(d, session, "browser");
  const actions = createOwnProfileActions({
    getData: () => d,
    getSession: () => session,
    getSource: () => "browser",
    source: "browser",
    setData: (fn) => (d = fn(d)),
  });
  actions.saveOwnProfile(
    {
      name: "修改后的教师姓名",
      phone: "13812345678",
      personalNotes: "教师备注",
    },
    model.token,
  );
  assert.equal(d.teachers[0].name, "修改后的教师姓名");
  assert.deepEqual(d.systemAdminAccount, before.systemAdminAccount);
  assert.deepEqual(d.arrangements, before.arrangements);
  assert.equal(d.auditLogs[0].delegatedBy, "admin");
  session = switchWorkIdentitySession(d, session, "browser", "admin");
  assert.equal(ownProfileModel(d, session, "browser").name, "管理员姓名");
});
test("first-login requirements remain enforced for actual teacher login; trusted identity switching does not trap administrator on teacher setup", async () => {
  const d = data();
  d.teachers[0].passwordCredential = await teacherPasswordCredential(
    "TempTeacher123!",
    { temporary: true },
  );
  const switched = switchWorkIdentitySession(d, root, "browser", "teacher"),
    actual = { ...switched };
  delete actual.delegatedAdmin;
  assert.equal(
    teacherAccountRedirect(d, actual, "browser", "/account/profile"),
    "/account/password",
  );
  assert.equal(
    teacherAccountRedirect(d, switched, "browser", "/account/profile"),
    "",
  );
  assert.equal(
    teacherAccountRedirect(d, switched, "browser", "/admin/users"),
    "/teacher/dashboard",
  );
});

test("changing password in switched teacher identity changes teacher credentials only", async () => {
  let d = data();
  d.teachers[0].passwordCredential =
    await teacherPasswordCredential("TeacherOld123!");
  const rootCredential = await teacherPasswordCredential("RootPrivate123!");
  d.systemAdminAccount = {
    name: "原管理员",
    passwordCredential: rootCredential,
  };
  const rootSession = {
    role: "admin",
    account: "admin",
    credentialId: rootCredential.id,
    source: "browser",
  };
  const session = switchWorkIdentitySession(
      d,
      rootSession,
      "browser",
      "teacher",
    ),
    before = structuredClone(d);
  const actions = createTeacherAccountActions({
    getData: () => d,
    getSession: () => session,
    getSource: () => "browser",
    source: "browser",
    setData: (fn) => (d = fn(d)),
  });
  await actions.changeTeacherPassword({
    currentPassword: "TeacherOld123!",
    newPassword: "TeacherNew123!",
    confirmPassword: "TeacherNew123!",
  });
  assert.notEqual(
    d.teachers[0].passwordCredential.id,
    before.teachers[0].passwordCredential.id,
  );
  assert.deepEqual(d.systemAdminAccount, before.systemAdminAccount);
  assert.deepEqual(d.arrangements, before.arrangements);
  assert.equal(teacherLoginSessionValid(d, session, "browser"), false);
  assert.equal(adminSessionValid(d, rootSession, "browser"), true);
});
