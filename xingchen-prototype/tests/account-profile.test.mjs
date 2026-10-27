import test from "node:test";
import assert from "node:assert/strict";
import {
  createOwnProfileActions,
  ownProfileModel,
  ownProfileToken,
  validateOwnProfileInput,
  systemAdminProfile,
} from "../src/accountProfileRules.js";
import {
  teacherPasswordCredential,
  authenticatePrototypeAccount,
} from "../src/teacherAccountRules.js";
import {
  adminSessionValid,
  adminPathAllowed,
  guardAdminActions,
  assertAdminWriteSession,
} from "../src/adminAccessRules.js";
import { saveRememberedLogin, readRememberedLogin } from "../src/loginRules.js";
async function fixture(kind) {
  const credential = await teacherPasswordCredential("Original123!");
  let data = {
    teachers: [
      {
        id: "t1",
        account: "teacher01",
        name: "教师甲",
        employeeNo: "T001",
        department: "院系",
        major: "专业",
        phone: "13812345678",
        notes: "管理员的教师备注",
        status: "启用",
        passwordCredential: credential,
      },
    ],
    adminUsers: [
      {
        id: "u1",
        account: "engineer01",
        name: "工程师甲",
        identity: "AI实施工程师",
        permissions: ["ai-config"],
        accessId: "access",
        status: "启用",
        phone: "",
        notes: "管理员的账号备注",
        passwordCredential: credential,
      },
    ],
    arrangements: [{ id: "frozen", sessions: [{ score: 80 }] }],
    auditLogs: [],
  };
  let source = "browser",
    session =
      kind === "teacher"
        ? {
            role: "teacher",
            teacherId: "t1",
            account: "teacher01",
            credentialId: credential.id,
            source,
          }
        : kind === "admin"
          ? {
              role: "admin",
              adminUserId: "u1",
              account: "engineer01",
              credentialId: credential.id,
              accessId: "access",
              source,
            }
          : { role: "admin", account: "admin", source };
  let fail = false;
  const options = {
    getData: () => data,
    getSession: () => session,
    getSource: () => source,
    source: "browser",
    now: () => "2026-10-27 14:00:00",
    makeId: () => crypto.randomUUID(),
    setData: (fn) => {
      const next = fn(data);
      if (fail) throw new Error("保存失败");
      data = next;
    },
  };
  return {
    get data() {
      return data;
    },
    get session() {
      return session;
    },
    actions: createOwnProfileActions(options),
    options,
    setSession: (v) => (session = v),
    setSource: (v) => (source = v),
    setData: (v) => (data = v),
    setFail: (v) => (fail = v),
  };
}
test("teacher and administrator profiles expose their own basic information without credential or management-note disclosure", async () => {
  for (const kind of ["teacher", "admin", "root"]) {
    const h = await fixture(kind),
      m = ownProfileModel(h.data, h.session, "browser");
    assert.ok(m);
    assert.ok(!JSON.stringify(m).includes("PBKDF2"));
    assert.ok(!JSON.stringify(m).includes("管理员的"));
    if (kind === "teacher") {
      assert.equal(m.identity, "教师");
      assert.equal(m.employeeNo, "T001");
      assert.equal(m.department, "院系");
      assert.deepEqual(m.permissions, []);
    } else {
      assert.equal(m.employeeNo, "");
      assert.ok(m.permissions.length);
      assert.equal(m.identity, kind === "root" ? "系统管理员" : "AI实施工程师");
    }
  }
  const h = await fixture("teacher");
  assert.equal(
    ownProfileModel(h.data, { role: "student", studentId: "s" }, "browser"),
    null,
  );
  assert.equal(ownProfileModel(h.data, h.session, "cpd"), null);
});
test("all staff can edit allowed fields only; teacher credentials and administrator identity/menu grants are preserved", async () => {
  for (const kind of ["teacher", "admin", "root"]) {
    const h = await fixture(kind),
      before = structuredClone(h.data),
      m = ownProfileModel(h.data, h.session, "browser");
    h.actions.saveOwnProfile(
      {
        name: "新的姓名",
        phone: "010-12345678",
        personalNotes: "本人填写的备注",
      },
      m.token,
    );
    const after = ownProfileModel(h.data, h.session, "browser");
    assert.equal(after.name, "新的姓名");
    assert.equal(after.personalNotes, "本人填写的备注");
    assert.equal(after.phone, "010-12345678");
    assert.equal(after.identity, m.identity);
    assert.equal(after.account, m.account);
    assert.deepEqual(after.permissions, m.permissions);
    assert.deepEqual(h.data.arrangements, before.arrangements);
    if (kind === "teacher") {
      assert.deepEqual(
        h.data.teachers[0].passwordCredential,
        before.teachers[0].passwordCredential,
      );
      assert.equal(h.data.teachers[0].notes, "管理员的教师备注");
      assert.equal(h.data.teachers[0].employeeNo, "T001");
      assert.deepEqual(h.data.adminUsers, before.adminUsers);
    }
    if (kind === "admin") {
      assert.equal(h.data.adminUsers[0].accessId, "access");
      assert.equal(h.data.adminUsers[0].notes, "管理员的账号备注");
      assert.deepEqual(h.data.teachers, before.teachers);
      assert.equal(adminSessionValid(h.data, h.session, "browser"), true);
    }
    assert.equal(h.data.auditLogs[0].action, "修改本人个人资料");
  }
});
test("profile editing cannot accept owner IDs, accounts, identity or menu changes", async () => {
  const h = await fixture("admin"),
    before = structuredClone(h.data),
    m = ownProfileModel(h.data, h.session, "browser");
  for (const [key, value] of Object.entries({
    id: "someone-else",
    account: "admin",
    teacherId: "t1",
    identity: "系统管理员",
    permissions: ["backups"],
    status: "启用",
  }))
    assert.throws(
      () =>
        h.actions.saveOwnProfile(
          { name: "用户", phone: "", personalNotes: "", [key]: value },
          m.token,
        ),
      /只能修改/,
    );
  assert.deepEqual(h.data, before);
  assert.throws(
    () => validateOwnProfileInput({ name: " ", phone: "", personalNotes: "" }),
    /姓名/,
  );
  assert.throws(
    () =>
      validateOwnProfileInput({
        name: "用户",
        phone: "电话abc",
        personalNotes: "",
      }),
    /电话/,
  );
});
test("stale profile drafts, source switches, disabled accounts and storage failure cannot silently overwrite data", async () => {
  const h = await fixture("admin"),
    m = ownProfileModel(h.data, h.session, "browser"),
    patch = { name: "工程师乙", phone: "", personalNotes: "" };
  h.setFail(true);
  assert.throws(() => h.actions.saveOwnProfile(patch, m.token), /保存失败/);
  assert.equal(ownProfileModel(h.data, h.session, "browser").token, m.token);
  h.setFail(false);
  h.actions.saveOwnProfile(patch, m.token);
  assert.throws(
    () => h.actions.saveOwnProfile({ ...patch, name: "过期草稿" }, m.token),
    /资料已发生变化/,
  );
  const fresh = ownProfileModel(h.data, h.session, "browser");
  h.setSource("cpd");
  assert.throws(
    () => h.actions.saveOwnProfile(patch, fresh.token),
    /来源已变化/,
  );
  h.setSource("browser");
  h.setData({
    ...h.data,
    adminUsers: h.data.adminUsers.map((u) => ({ ...u, status: "停用" })),
  });
  assert.equal(ownProfileModel(h.data, h.session, "browser"), null);
  assert.throws(() => h.actions.saveOwnProfile(patch, fresh.token), /重新登录/);
});
test("own profile needs no additional business menu permission, while first-login password setup remains mandatory", async () => {
  const h = await fixture("admin"),
    model = ownProfileModel(h.data, h.session, "browser");
  assert.equal(adminPathAllowed(h.data, h.session, "/account/profile"), true);
  assert.equal(adminPathAllowed(h.data, h.session, "/admin/users"), false);
  const wrapped = guardAdminActions(
    { saveOwnProfile: h.actions.saveOwnProfile },
    h.options,
  );
  wrapped.saveOwnProfile(
    { name: "本人", phone: "", personalNotes: "" },
    model.token,
  );
  h.setData({
    ...h.data,
    adminUsers: h.data.adminUsers.map((u) => ({
      ...u,
      passwordCredential: { ...u.passwordCredential, mustChange: true },
    })),
  });
  const m = ownProfileModel(h.data, h.session, "browser");
  assert.throws(
    () =>
      wrapped.saveOwnProfile(
        { name: "本人", phone: "", personalNotes: "" },
        m.token,
      ),
    /先修改临时密码/,
  );
});
test("built-in admin can replace the original password; old password, sessions and retained callbacks lose access", async () => {
  const h = await fixture("root"),
    original = h.session,
    old = structuredClone(h.data);
  const oldActions = guardAdminActions(
    { exportWorkingData: () => "data" },
    h.options,
  );
  await assert.rejects(
    h.actions.changeSystemAdminPassword({
      currentPassword: "wrong",
      newPassword: "RootNew123!",
      confirmPassword: "RootNew123!",
    }),
    /账号或密码/,
  );
  await h.actions.changeSystemAdminPassword({
    currentPassword: "12345678",
    newPassword: "RootNew123!",
    confirmPassword: "RootNew123!",
  });
  assert.ok(!JSON.stringify(h.data).includes("RootNew123!"));
  assert.equal(adminSessionValid(h.data, original, "browser"), false);
  await assert.rejects(
    authenticatePrototypeAccount(h.data, "admin", "12345678"),
    /账号或密码/,
  );
  assert.throws(() => oldActions.exportWorkingData(), /重新登录/);
  assert.throws(
    () => assertAdminWriteSession(h.data, original, original, "browser"),
    /重新登录/,
  );
  const login = {
    ...(await authenticatePrototypeAccount(h.data, "admin", "RootNew123!")),
    source: "browser",
  };
  assert.equal(adminSessionValid(h.data, login, "browser"), true);
  assert.ok(login.credentialId);
  assert.deepEqual(h.data.arrangements, old.arrangements);
  assert.deepEqual(h.data.teachers, old.teachers);
  assert.deepEqual(h.data.adminUsers, old.adminUsers);
  assert.equal(systemAdminProfile(h.data).identity, "系统管理员");
});
test("system-admin password changes are atomic on storage failure and cannot be invoked by an ordinary administrator", async () => {
  const root = await fixture("root"),
    before = structuredClone(root.data);
  root.setFail(true);
  await assert.rejects(
    root.actions.changeSystemAdminPassword({
      currentPassword: "12345678",
      newPassword: "RootNew123!",
      confirmPassword: "RootNew123!",
    }),
    /保存失败/,
  );
  assert.deepEqual(root.data, before);
  assert.ok(await authenticatePrototypeAccount(root.data, "admin", "12345678"));
  const limited = await fixture("admin");
  await assert.rejects(
    limited.actions.changeSystemAdminPassword({
      currentPassword: "12345678",
      newPassword: "RootNew123!",
      confirmPassword: "RootNew123!",
    }),
    /本人账号/,
  );
});
test("profile writes must belong to the same logged-in person even when a different valid account takes over", async () => {
  const h = await fixture("teacher"),
    m = ownProfileModel(h.data, h.session, "browser");
  h.setSession({ role: "admin", account: "admin", source: "browser" });
  assert.throws(
    () =>
      h.actions.saveOwnProfile(
        { name: "错误账号", phone: "", personalNotes: "" },
        m.token,
      ),
    /资料已发生变化/,
  );
});
test("root private passwords remember only the account", () => {
  const map = new Map(),
    storage = {
      getItem: (k) => map.get(k),
      setItem: (k, v) => map.set(k, v),
      removeItem: (k) => map.delete(k),
    };
  saveRememberedLogin(storage, {
    account: "admin",
    password: "RootNew123!",
    remember: true,
    accountOnly: true,
  });
  assert.deepEqual(readRememberedLogin(storage), {
    account: "admin",
    accountOnly: true,
  });
  assert.ok(!JSON.stringify([...map.values()]).includes("RootNew123!"));
});
