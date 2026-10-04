import assert from "node:assert/strict";
import test from "node:test";
import {
  createLoginCaptcha,
  matchesLoginCaptcha,
  readRememberedLogin,
  saveRememberedLogin,
} from "../src/loginRules.js";

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
