import assert from "node:assert/strict";
import test from "node:test";
import {
  STUDENT_FACE_MAX_SOURCE_BYTES,
  applyStudentFaceUpload,
  approximateDataUrlBytes,
  markStudentFaceForRecapture,
  normalizeStudentFaceData,
  persistPrototypeData,
  validateStudentFaceFile,
} from "../src/studentFaceRules.js";

test("legacy face values normalize into the three supported face statuses", () => {
  assert.equal(
    normalizeStudentFaceData({ face: "已采集" }).faceStatus,
    "已采集",
  );
  assert.equal(
    normalizeStudentFaceData({ face: "未采集" }).faceStatus,
    "未采集",
  );
  assert.equal(
    normalizeStudentFaceData({ face: "待更新" }).faceStatus,
    "待重采",
  );
  assert.equal(normalizeStudentFaceData({}).faceStatus, "未采集");
  assert.equal(
    normalizeStudentFaceData({ face: "已采集", faceStatus: "未知状态" })
      .faceStatus,
    "未采集",
  );
});

test("upload marks the photo collected and recapture keeps the old reference", () => {
  const original = normalizeStudentFaceData({
    id: "s1",
    face: "未采集",
  });
  const uploaded = applyStudentFaceUpload(
    original,
    "data:image/jpeg;base64,YWJj",
    "2026-09-28 10:20",
  );
  assert.equal(uploaded.faceStatus, "已采集");
  assert.equal(uploaded.face, "已采集");
  assert.equal(uploaded.faceUpdatedAt, "2026-09-28 10:20");
  const recapture = markStudentFaceForRecapture(uploaded);
  assert.equal(recapture.faceStatus, "待重采");
  assert.equal(recapture.facePhotoDataUrl, uploaded.facePhotoDataUrl);
  assert.equal(recapture.faceUpdatedAt, uploaded.faceUpdatedAt);
});

test("face file validation accepts supported images and rejects unsafe inputs", () => {
  assert.equal(
    validateStudentFaceFile({ type: "image/jpeg", size: 120_000 }),
    true,
  );
  assert.throws(
    () => validateStudentFaceFile({ type: "text/plain", size: 100 }),
    /仅支持/,
  );
  assert.throws(
    () =>
      validateStudentFaceFile({
        type: "image/png",
        size: STUDENT_FACE_MAX_SOURCE_BYTES + 1,
      }),
    /5MB/,
  );
  assert.throws(
    () => validateStudentFaceFile({ type: "image/webp", size: 0 }),
    /内容为空/,
  );
});

test("data URL size is estimated and local storage quota failures become business errors", () => {
  assert.equal(approximateDataUrlBytes("data:image/jpeg;base64,YWJj"), 3);
  const values = new Map();
  persistPrototypeData(
    { setItem: (key, value) => values.set(key, value) },
    "prototype",
    { students: [{ id: "s1" }] },
  );
  assert.match(values.get("prototype"), /"s1"/);
  assert.throws(
    () =>
      persistPrototypeData(
        {
          setItem() {
            throw new Error("QuotaExceededError");
          },
        },
        "prototype",
        {},
      ),
    /本地存储空间不足/,
  );
});
