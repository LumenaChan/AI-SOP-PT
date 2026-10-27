import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto, pbkdf2Sync } from "node:crypto";
import { passwordKey, randomId } from "../src/browserCrypto.js";
import { teacherPasswordCredential, verifyTeacherPassword } from "../src/teacherAccountRules.js";

const httpCrypto = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };

test("HTTP UUIDs use secure random bytes and retain the RFC 4122 v4 format", () => {
  const ids = Array.from({ length: 100 }, () => randomId(httpCrypto));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(id)));
  assert.throws(() => randomId({})); // No insecure randomness fallback.
});

test("HTTP PBKDF2 matches independent Node and native WebCrypto at the existing work factor", async () => {
  const salt = new Uint8Array(16).fill(27);
  const password = "Compat123!\u00e9";
  const fallback = await passwordKey(password, salt, 210000, httpCrypto);
  const native = await passwordKey(password, salt, 210000, webcrypto);
  assert.deepEqual(fallback, native);
  assert.deepEqual(Buffer.from(fallback), pbkdf2Sync(password, salt, 210000, 32, "sha256"));
});

test("existing HTTPS credentials and newly created HTTP credentials remain interchangeable", async () => {
  const original = await teacherPasswordCredential("Original123!");
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  let changed;
  try {
    Object.defineProperty(globalThis, "crypto", { value: httpCrypto, configurable: true });
    assert.equal(await verifyTeacherPassword({ passwordCredential: original }, "Original123!"), true);
    assert.equal(await verifyTeacherPassword({ passwordCredential: original }, "Wrong123!"), false);
    changed = await teacherPasswordCredential("Changed123!");
    assert.equal(changed.algorithm, original.algorithm);
    assert.equal(changed.iterations, original.iterations);
    assert.equal(changed.salt.length, 32);
    assert.equal(changed.hash.length, 64);
    assert.ok(!JSON.stringify(changed).includes("Changed123!"));
    assert.equal(await verifyTeacherPassword({ passwordCredential: changed }, "Changed123!"), true);
  } finally {
    Object.defineProperty(globalThis, "crypto", descriptor);
  }
  assert.equal(await verifyTeacherPassword({ passwordCredential: changed }, "Changed123!"), true);
});
