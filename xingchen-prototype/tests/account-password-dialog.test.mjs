import test from "node:test";
import assert from "node:assert/strict";
import {
  passwordSessionToken,
  changeAccountPassword,
} from "../src/accountPasswordRules.js";
function storeFor(session) {
  const calls = [];
  return {
    dataSource: "browser",
    accountSession: session,
    accountSessionValid: true,
    calls,
    changeTeacherPassword: async (input) => {
      calls.push(["teacher", input]);
      return { account: session.account };
    },
    changeAdminPassword: async (input) => {
      calls.push(["admin-user", input]);
      return { account: session.account };
    },
    changeSystemAdminPassword: async (input) => {
      calls.push(["system-admin", input]);
      return { account: session.account };
    },
  };
}
test("password dialog dispatches teacher, ordinary admin and system admin changes to the current account's existing action", async () => {
  const input = {
    currentPassword: "Current123!",
    newPassword: "Changed123!",
    confirmPassword: "Changed123!",
  };
  for (const [session, kind] of [
    [
      {
        role: "teacher",
        teacherId: "t1",
        account: "teacher01",
        credentialId: "teacher-credential",
      },
      "teacher",
    ],
    [
      {
        role: "admin",
        adminUserId: "u1",
        account: "engineer01",
        credentialId: "admin-credential",
      },
      "admin-user",
    ],
    [
      { role: "admin", account: "admin", credentialId: "root-credential" },
      "system-admin",
    ],
  ]) {
    const store = storeFor(session);
    assert.deepEqual(
      await changeAccountPassword(store, input, passwordSessionToken(store)),
      { account: session.account },
    );
    assert.equal(store.calls.length, 1);
    assert.deepEqual(store.calls[0], [kind, input]);
  }
});
test("an opened password dialog cannot submit against a switched user, source, reset credential or changed permission session", () => {
  const original = storeFor({
    role: "teacher",
    teacherId: "t1",
    account: "teacher01",
    credentialId: "old",
  });
  const expected = passwordSessionToken(original);
  for (const change of [
    { accountSession: { role: "admin", account: "admin" } },
    { dataSource: "cpd" },
    { accountSession: { ...original.accountSession, teacherId: "t2" } },
    { accountSession: { ...original.accountSession, credentialId: "reset" } },
    { accountSessionValid: false },
  ]) {
    const current = { ...original, ...change };
    assert.throws(
      () => changeAccountPassword(current, {}, expected),
      /重新打开修改密码/,
    );
    assert.equal(original.calls.length, 0);
  }
});
test("student accounts cannot use staff password dialogs", () => {
  const store = storeFor({ role: "student", account: "student01" });
  assert.throws(
    () => changeAccountPassword(store, {}, passwordSessionToken(store)),
    /教师或管理员/,
  );
  assert.equal(store.calls.length, 0);
});
