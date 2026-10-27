import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdminAccountActions,
  adminProfileInput,
} from "../src/adminAccountActions.js";
import { createTeacherAccountActions } from "../src/teacherAccountActions.js";
import {
  authenticatePrototypeAccount,
  verifyTeacherPassword,
} from "../src/teacherAccountRules.js";
import {
  ADMIN_MENUS,
  ADMIN_LIBRARY_MENUS,
  adminSessionValid,
  adminPathAllowed,
  adminLandingPath,
  adminLibraryLandingPath,
  adminAccountRedirect,
  guardAdminActions,
  assertAdminWriteSession,
} from "../src/adminAccessRules.js";
import { AI_LIBRARY_SECTIONS } from "../src/aiEntry.js";
const profile = {
  name: "工程师甲",
  account: "engineer01",
  identity: "AI实施工程师",
  permissions: ["ai-config"],
  phone: "",
  notes: "",
};
function harness() {
  let data = {
      teachers: [
        { id: "t", name: "教师", account: "teacher01", employeeNo: "T001" },
      ],
      adminUsers: [],
      auditLogs: [],
      arrangements: [
        { id: "p", type: "practice", sessions: [{ id: "ps" }] },
        { id: "e", type: "exam", sessions: [{ id: "es" }] },
      ],
    },
    session = { role: "admin", account: "admin" },
    source = "browser",
    fail = false,
    seq = 0;
  const options = {
    getData: () => data,
    getSession: () => session,
    getSource: () => source,
    source: "browser",
    setData: (fn) => {
      const next = fn(data);
      if (fail) throw new Error("storage full");
      data = next;
    },
    makeId: () => `id-${++seq}`,
    now: () => "2026-10-27 12:00:00",
  };
  return {
    options,
    actions: createAdminAccountActions(options),
    get data() {
      return data;
    },
    get session() {
      return session;
    },
    setSession: (v) => (session = v),
    setSource: (v) => (source = v),
    setFail: (v) => (fail = v),
    setData: (v) => (data = v),
  };
}
const signIn = async (h, receipt, password = receipt.temporaryPassword) => ({
  ...(await authenticatePrototypeAccount(
    h.data,
    receipt.user.account,
    password,
  )),
  source: "browser",
});
async function activate(h, receipt) {
  h.setSession(await signIn(h, receipt));
  await h.actions.changeAdminPassword({
    currentPassword: receipt.temporaryPassword,
    newPassword: "NewPass123!",
    confirmPassword: "NewPass123!",
  });
  h.setSession(await signIn(h, receipt, "NewPass123!"));
}
test("identity is mandatory text; menus are an independent explicit whitelist matching actual library sections", () => {
  assert.throws(() => adminProfileInput({ ...profile, identity: " " }), /身份/);
  assert.throws(
    () => adminProfileInput({ ...profile, permissions: [] }),
    /至少选择/,
  );
  assert.throws(
    () => adminProfileInput({ ...profile, permissions: ["users"] }),
    /有效/,
  );
  assert.equal(
    adminProfileInput({ ...profile, identity: "AI能力工程师" }).identity,
    "AI能力工程师",
  );
  assert.deepEqual(
    ADMIN_LIBRARY_MENUS.map((m) => m.path.split("/").at(-1)),
    AI_LIBRARY_SECTIONS.map((s) => s.path),
  );
  assert.equal(new Set(ADMIN_MENUS.map((m) => m.id)).size, ADMIN_MENUS.length);
});
test("create assigns a unique temporary credential, never persists plaintext, login forces personal password setup", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser(profile),
    user = h.data.adminUsers[0];
  assert.equal(user.account, profile.account);
  assert.equal(user.identity, profile.identity);
  assert.deepEqual(user.permissions, ["ai-config"]);
  assert.equal(user.passwordCredential.mustChange, true);
  assert.ok(await verifyTeacherPassword(user, receipt.temporaryPassword));
  assert.ok(!JSON.stringify(h.data).includes(receipt.temporaryPassword));
  const session = await signIn(h, receipt);
  assert.equal(session.role, "admin");
  assert.equal(session.adminUserId, user.id);
  assert.equal(adminSessionValid(h.data, session, "browser"), true);
  assert.equal(
    adminAccountRedirect(
      h.data,
      session,
      "browser",
      "/admin/ai-capability-config",
    ),
    "/account/password",
  );
  assert.equal(
    adminAccountRedirect(h.data, session, "cpd", "/admin/ai-capability-config"),
    "/login",
  );
  assert.equal(
    adminLandingPath(h.data, session),
    "/admin/ai-capability-config",
  );
});
test("created admin can change own temporary password; old credentials and sessions immediately expire", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser(profile),
    session = await signIn(h, receipt);
  h.setSession(session);
  await assert.rejects(
    h.actions.changeAdminPassword({
      currentPassword: "bad",
      newPassword: "NewPass123!",
      confirmPassword: "NewPass123!",
    }),
    /当前密码/,
  );
  await h.actions.changeAdminPassword({
    currentPassword: receipt.temporaryPassword,
    newPassword: "NewPass123!",
    confirmPassword: "NewPass123!",
  });
  assert.equal(adminSessionValid(h.data, session, "browser"), false);
  await assert.rejects(
    authenticatePrototypeAccount(
      h.data,
      profile.account,
      receipt.temporaryPassword,
    ),
    /账号或密码/,
  );
  const current = await signIn(h, receipt, "NewPass123!");
  assert.equal(current.mustChange, false);
  assert.equal(
    adminAccountRedirect(
      h.data,
      current,
      "browser",
      "/admin/ai-capability-config",
    ),
    "",
  );
  assert.equal(
    adminPathAllowed(h.data, current, "/admin/ai-capability-config/s1"),
    true,
  );
  assert.equal(adminPathAllowed(h.data, current, "/admin/teachers"), false);
  assert.equal(adminPathAllowed(h.data, current, "/teacher/dashboard"), false);
  assert.equal(adminPathAllowed(h.data, current, "/admin/users"), false);
});
test("root can update identity and permissions, disable, reset and re-enable without deleting business data", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser(profile),
    oldSession = await signIn(h, receipt),
    id = receipt.user.id;
  const originalArrangements = structuredClone(h.data.arrangements);
  let u = h.data.adminUsers[0];
  h.actions.updateAdminUser(
    id,
    {
      ...profile,
      identity: "AI能力工程师",
      permissions: ADMIN_LIBRARY_MENUS.map((m) => m.id),
    },
    u.accessId,
  );
  assert.equal(adminSessionValid(h.data, oldSession, "browser"), false);
  assert.throws(
    () => h.actions.setAdminUserStatus(id, "停用", u.accessId),
    /变化/,
  );
  u = h.data.adminUsers[0];
  h.actions.setAdminUserStatus(id, "停用", u.accessId);
  await assert.rejects(signIn(h, receipt), /停用/);
  u = h.data.adminUsers[0];
  const reset = await h.actions.resetAdminUserPassword(id, u.accessId);
  assert.equal(h.data.adminUsers[0].status, "停用");
  assert.ok(!JSON.stringify(h.data).includes(reset.temporaryPassword));
  u = h.data.adminUsers[0];
  h.actions.setAdminUserStatus(id, "启用", u.accessId);
  const session = await signIn(h, reset);
  assert.equal(
    adminLandingPath(h.data, session),
    "/admin/ai-capability-library/capabilities",
  );
  assert.equal(
    adminPathAllowed(
      h.data,
      session,
      "/admin/ai-capability-library/training-data?capabilityId=c",
    ),
    true,
  );
  assert.equal(
    adminPathAllowed(h.data, session, "/admin/ai-capability-config"),
    false,
  );
  assert.deepEqual(h.data.arrangements, originalArrangements);
});
test("ordinary administrators cannot create users, change their permissions or reset another account", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser(profile);
  h.setSession(await signIn(h, receipt));
  const before = structuredClone(h.data),
    u = h.data.adminUsers[0];
  await assert.rejects(
    h.actions.createAdminUser({ ...profile, account: "other-user" }),
    /仅系统管理员/,
  );
  assert.throws(
    () =>
      h.actions.updateAdminUser(
        u.id,
        { ...profile, permissions: ["backups"] },
        u.accessId,
      ),
    /仅系统管理员/,
  );
  await assert.rejects(
    h.actions.resetAdminUserPassword(u.id, u.accessId),
    /仅系统管理员/,
  );
  assert.deepEqual(h.data, before);
});
test("teacher and admin accounts share username uniqueness in creation, editing and teacher import", async () => {
  const h = harness();
  await assert.rejects(
    h.actions.createAdminUser({ ...profile, account: "teacher01" }),
    /已存在/,
  );
  await assert.rejects(
    h.actions.createAdminUser({ ...profile, account: "admin" }),
    /保留账号/,
  );
  const receipt = await h.actions.createAdminUser(profile);
  await assert.rejects(
    h.actions.createAdminUser({ ...profile, account: "ENGINEER01" }),
    /已存在/,
  );
  const teachers = createTeacherAccountActions(h.options);
  await assert.rejects(
    teachers.createTeacher({
      name: "教师2",
      employeeNo: "T002",
      account: receipt.user.account,
    }),
    /已存在/,
  );
  await assert.rejects(
    teachers.importTeachers([
      {
        name: "教师2",
        employeeNo: "T002",
        account: receipt.user.account,
        department: "学院",
        major: "专业",
      },
    ]),
    /已存在/,
  );
  const u = h.data.adminUsers[0];
  assert.throws(
    () =>
      h.actions.updateAdminUser(
        u.id,
        { ...profile, account: "new-account" },
        u.accessId,
      ),
    /不可修改/,
  );
});
test("credential generation races and storage failure cannot leave partial accounts or reveal receipts", async () => {
  const h = harness();
  h.setFail(true);
  await assert.rejects(h.actions.createAdminUser(profile), /storage/);
  assert.equal(h.data.adminUsers.length, 0);
  assert.equal(h.data.auditLogs.length, 0);
  h.setFail(false);
  const settled = await Promise.allSettled([
    h.actions.createAdminUser(profile),
    h.actions.createAdminUser(profile),
  ]);
  assert.equal(settled.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(h.data.adminUsers.length, 1);
  const another = harness();
  const pending = another.actions.createAdminUser(profile);
  another.setSource("cpd");
  await assert.rejects(pending, /来源已切换/);
  assert.equal(another.data.adminUsers.length, 0);
});
test("menu guards block direct operations, exports, source switches, teacher commands and stale action references", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser(profile);
  await activate(h, receipt);
  let calls = 0;
  const store = guardAdminActions(
    {
      saveAiStepConfig: () => ++calls,
      saveSystemSettings: () => ++calls,
      exportWorkingData: () => ++calls,
      switchDataSource: () => ++calls,
      reviewSessionStep: () => ++calls,
      changeAdminPassword: () => ++calls,
    },
    {
      getData: () => h.data,
      getSession: () => h.session,
      getSource: () => "browser",
    },
  );
  store.saveAiStepConfig();
  assert.equal(calls, 1);
  for (const name of [
    "saveSystemSettings",
    "exportWorkingData",
    "switchDataSource",
    "reviewSessionStep",
  ])
    assert.throws(() => store[name](), /没有此功能/);
  assert.equal(calls, 1);
  const captured = h.session;
  h.setSession(null);
  assert.throws(() => store.saveAiStepConfig(), /账号.*变化/);
  assert.throws(
    () => assertAdminWriteSession(h.data, captured, null, "browser"),
    /登录状态已变化/,
  );
  h.setSession({ role: "admin", account: "admin" });
  assert.throws(() => store.saveAiStepConfig(), /账号.*变化/);
});
test("practice/exam exports and diagnostic writes are authorized against the actual record, not either menu", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser({
      ...profile,
      permissions: ["practices"],
    });
  await activate(h, receipt);
  let calls = 0;
  const store = guardAdminActions(
    {
      createExportJob: () => ++calls,
      saveDiagnosticRootCause: () => ++calls,
      recordAuditAccess: () => ++calls,
    },
    {
      getData: () => h.data,
      getSession: () => h.session,
      getSource: () => "browser",
    },
  );
  store.createExportJob({ targetId: "p" });
  store.createExportJob({ targetId: "ps" });
  store.recordAuditAccess("查看教学记录", "练习 / p");
  store.saveDiagnosticRootCause("p");
  assert.equal(calls, 4);
  assert.equal(
    adminPathAllowed(h.data, h.session, "/admin/practices/e"),
    false,
    "不能用练习路径绕过考试权限",
  );
  assert.throws(
    () => store.createExportJob({ targetId: "admin-exams" }),
    /没有此功能/,
  );
  assert.throws(() => store.saveDiagnosticRootCause("e"), /没有此功能/);
  assert.throws(
    () => store.recordAuditAccess("查看教学记录", "考试 / e"),
    /没有此功能/,
  );
});
test("library leaves have exact route boundaries; unassigned root, siblings and legacy debug pages stay inaccessible", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser({
      ...profile,
      permissions: ["library.annotation"],
    });
  const s = await signIn(h, receipt);
  assert.equal(
    adminLandingPath(h.data, s),
    "/admin/ai-capability-library/annotation",
  );
  assert.equal(
    adminPathAllowed(
      h.data,
      s,
      "/admin/ai-capability-library/annotation?capabilityId=c",
    ),
    true,
  );
  for (const path of [
    "/admin/ai-capability-library/training",
    "/admin/ai-capability-library/annotation-extra",
    "/admin/ai-evaluation",
    "/admin/users",
  ])
    assert.equal(adminPathAllowed(h.data, s, path), false, path);
  assert.equal(
    adminAccountRedirect(h.data, null, "browser", "/admin/users"),
    "/login",
  );
  assert.equal(
    adminPathAllowed(
      h.data,
      { role: "admin", account: "admin" },
      "/admin/users",
    ),
    true,
  );
});

test("temporary-password accounts cannot bypass first-login setup by invoking a business action", async () => {
  const h = harness(),
    receipt = await h.actions.createAdminUser(profile);
  h.setSession(await signIn(h, receipt));
  let calls = 0;
  const store = guardAdminActions(
    { saveAiStepConfig: () => ++calls },
    {
      getData: () => h.data,
      getSession: () => h.session,
      getSource: () => "browser",
    },
  );
  assert.throws(() => store.saveAiStepConfig(), /先修改临时密码/);
  assert.equal(calls, 0);
});

test("AI library entry uses its own first permitted submenu instead of the account's global homepage", () => {
  for (const source of ["browser", "cpd"]) {
    const user = {
      id: "admin1-user",
      account: "admin1",
      status: "启用",
      permissions: [
        "overview",
        "ai-config",
        "library.videos",
        "library.annotation",
      ],
      accessId: "access",
      passwordCredential: { id: "credential", mustChange: false },
    };
    const data = { adminUsers: [user] },
      session = {
        role: "admin",
        adminUserId: user.id,
        account: user.account,
        credentialId: "credential",
        accessId: "access",
        source,
      };
    assert.equal(adminLandingPath(data, session), "/admin/overview");
    assert.equal(
      adminLibraryLandingPath(data, session),
      "/admin/ai-capability-library/videos",
    );
    assert.equal(
      adminAccountRedirect(
        data,
        session,
        source,
        "/admin/ai-capability-library",
      ),
      "/admin/ai-capability-library/videos",
    );
    assert.equal(
      adminPathAllowed(data, session, adminLibraryLandingPath(data, session)),
      true,
    );
    user.permissions = ["ai-config", "library.annotation"];
    assert.equal(
      adminLandingPath(data, session),
      "/admin/ai-capability-config",
    );
    assert.equal(
      adminAccountRedirect(
        data,
        session,
        source,
        "/admin/ai-capability-library",
      ),
      "/admin/ai-capability-library/annotation",
    );
    user.permissions = ["ai-config"];
    assert.equal(adminLibraryLandingPath(data, session), "");
    assert.equal(
      adminAccountRedirect(
        data,
        session,
        source,
        "/admin/ai-capability-library",
      ),
      "/admin/ai-capability-config",
    );
  }
  assert.equal(
    adminLibraryLandingPath({}, { role: "admin", account: "admin" }),
    "/admin/ai-capability-library/capabilities",
  );
});
