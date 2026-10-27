import assert from "node:assert/strict";
import test from "node:test";
import {
  createLoginCaptcha,
  matchesLoginCaptcha,
  readRememberedLogin,
  saveRememberedLogin,
  recordLoginFailure,
  loginRecoveryHint,
} from "../src/loginRules.js";
import {
  authenticatePrototypeAccount,
  teacherPasswordCredential,
} from "../src/teacherAccountRules.js";

test("密码找回提示只在同账号三次认证失败后出现，并区分管理入口", async () => {
  const data = {
    teachers: [{ id: "t1", account: "wangwei", status: "启用" }],
    adminUsers: [
      {
        id: "a1",
        account: "admin1",
        status: "启用",
        passwordCredential: await teacherPasswordCredential("ValidPassword123"),
      },
    ],
  };
  for (const [account, expected] of [
    ["wangwei", "教师管理"],
    ["wanglaoshi", "教师管理"],
    ["admin1", "用户管理"],
    ["admin", "系统负责人"],
    ["unknown", "确认账号"],
  ]) {
    let failures = null;
    assert.equal(loginRecoveryHint(data, account, failures), "");
    for (let count = 1; count <= 3; count++) {
      let failure;
      try {
        await authenticatePrototypeAccount(data, account, "WrongPassword123");
      } catch (error) {
        failure = error;
      }
      assert.equal(failure?.code, "INVALID_CREDENTIALS");
      failures = recordLoginFailure(failures, account, failure);
      assert.equal(failures.count, count);
      if (count < 3)
        assert.equal(loginRecoveryHint(data, account, failures), "");
    }
    assert.ok(
      loginRecoveryHint(data, ` ${account.toUpperCase()} `, failures).includes(
        expected,
      ),
    );
    assert.equal(loginRecoveryHint(data, "different-account", failures), "");
    const next = recordLoginFailure(failures, "different-account", {
      code: "INVALID_CREDENTIALS",
    });
    assert.equal(next.count, 1);
  }
});

test("验证码、存储和来源切换错误不计为密码错误，不持久化错误次数", () => {
  for (const message of [
    "验证码错误，请重新输入。",
    "存储失败",
    "数据来源已切换，请重新登录。",
  ])
    assert.equal(recordLoginFailure(null, "admin1", new Error(message)), null);
  const failures = { account: "admin1", count: 2 };
  assert.equal(
    recordLoginFailure(failures, "admin1", new Error("存储失败")),
    failures,
  );
  assert.equal(loginRecoveryHint({}, "admin1", null), "");
});

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  };
}

test("captcha uses four readable characters and rejects blank or incorrect answers", () => {
  for (let i = 0; i < 100; i++) {
    assert.match(createLoginCaptcha(), /^[2-9A-HJ-NP-Z]{4}$/);
  }
  assert.equal(matchesLoginCaptcha("", "AB23"), false);
  assert.equal(matchesLoginCaptcha("AB24", "AB23"), false);
  assert.equal(matchesLoginCaptcha(" ab23 ", "AB23"), true);
  assert.equal(matchesLoginCaptcha("AB23", "CD45"), false);
  assert.equal(matchesLoginCaptcha("", ""), false);
});

test("remembered public demo credentials restore and are removed when unchecked", () => {
  const storage = memoryStorage();
  assert.equal(readRememberedLogin(storage), null);
  for (const account of ["wanglaoshi", "admin"]) {
    assert.equal(
      saveRememberedLogin(storage, {
        account,
        password: "12345678",
        remember: true,
      }),
      true,
    );
    assert.deepEqual(readRememberedLogin(storage), {
      account,
      password: "12345678",
    });
  }
  saveRememberedLogin(storage, { remember: false });
  assert.equal(readRememberedLogin(storage), null);
});

test("invalid accounts and passwords are never remembered", () => {
  const storage = memoryStorage();
  for (const credentials of [
    { account: "disabled-demo", password: "12345678" },
    { account: "wanglaoshi", password: "incorrect" },
    { account: "another-account", password: "another-password" },
  ]) {
    saveRememberedLogin(storage, { ...credentials, remember: true });
    assert.equal(readRememberedLogin(storage), null);
  }
});

test("corrupted or unavailable storage does not break the login flow", () => {
  for (const value of [
    "not-json",
    "null",
    "[]",
    "{}",
    '{"account":"admin","password":"incorrect"}',
  ]) {
    assert.equal(readRememberedLogin({ getItem: () => value }), null);
  }
  const blockedStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
    removeItem() {
      throw new Error("storage unavailable");
    },
  };
  assert.equal(readRememberedLogin(blockedStorage), null);
  assert.equal(
    saveRememberedLogin(blockedStorage, {
      account: "admin",
      password: "12345678",
      remember: true,
    }),
    false,
  );
  assert.equal(saveRememberedLogin(blockedStorage, { remember: false }), false);
});

test("新教师仅记住已验证账号，不将私人密码持久化", () => {
  const storage = memoryStorage();
  saveRememberedLogin(storage, {
    account: "newteacher",
    password: "PrivatePassword889",
    remember: true,
    accountOnly: true,
  });
  assert.deepEqual(readRememberedLogin(storage), {
    account: "newteacher",
    accountOnly: true,
  });
  assert.ok(
    !storage
      .getItem("aisop-prototype-remembered-login-v1")
      .includes("PrivatePassword889"),
  );
  saveRememberedLogin(storage, { remember: false });
  assert.equal(readRememberedLogin(storage), null);
});
