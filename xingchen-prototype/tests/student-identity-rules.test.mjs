import assert from "node:assert/strict";
import test from "node:test";
import {
  STUDENT_IDENTITY_SESSION_KEY,
  buildStudentIdentityVerification,
  clearStudentIdentitySession,
  createStudentIdentitySession,
  getStudentCurrentSessions,
  getStudentFaceStatus,
  getStudentIdentityError,
  readStudentIdentitySession,
  requestStudentCamera,
  resolveStudentIdentity,
  stopMediaStream,
  writeStudentIdentitySession,
} from "../src/studentIdentityRules.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("faceStatus takes priority and legacy face values remain compatible", () => {
  assert.equal(getStudentFaceStatus({ face: "已采集" }), "已采集");
  assert.equal(getStudentFaceStatus({ face: "待更新" }), "待重采");
  assert.equal(
    getStudentFaceStatus({ face: "已采集", faceStatus: "未采集" }),
    "未采集",
  );
  assert.equal(getStudentFaceStatus({}), "未采集");
  assert.equal(getStudentFaceStatus({ faceStatus: "未知状态" }), "未采集");
});

test("only enabled students with collected face data pass identity validation", () => {
  assert.equal(getStudentIdentityError({ status: "启用", face: "已采集" }), "");
  assert.match(
    getStudentIdentityError({ status: "启用", face: "未采集" }),
    /尚未采集/,
  );
  assert.match(
    getStudentIdentityError({ status: "启用", face: "待重采" }),
    /已失效/,
  );
  assert.match(
    getStudentIdentityError({ status: "停用", face: "已采集" }),
    /已停用/,
  );
  assert.match(
    getStudentIdentityError({ status: "待停用", face: "已采集" }),
    /不是启用状态/,
  );
  assert.match(getStudentIdentityError(null), /未识别到/);
});

test("student identity session persists for refresh and clears when invalid", () => {
  const storage = memoryStorage();
  const session = createStudentIdentitySession("s1", "2026-09-27T14:02:00Z");
  writeStudentIdentitySession(session, storage);
  assert.deepEqual(readStudentIdentitySession(storage), session);
  assert.deepEqual(buildStudentIdentityVerification(session), {
    studentId: "s1",
    method: "face",
    status: "passed",
    verifiedAt: "2026-09-27T14:02:00Z",
  });
  assert.equal(
    resolveStudentIdentity(
      [{ id: "s1", status: "停用", face: "已采集" }],
      storage,
    ),
    null,
  );
  assert.equal(storage.getItem(STUDENT_IDENTITY_SESSION_KEY), null);

  writeStudentIdentitySession(session, storage);
  clearStudentIdentitySession(storage);
  assert.equal(readStudentIdentitySession(storage), null);
});

test("current session query returns only this student's active nonhistorical sessions", () => {
  const data = {
    arrangements: [
      {
        id: "p1",
        type: "practice",
        status: "进行中",
        scheduleStart: "2026-09-20T09:00",
        sessions: [
          { id: "a", studentId: "s1", workstationId: "w1", status: "待开始" },
          { id: "g", studentId: "s1", workstationId: "w7", status: "可入场" },
          {
            id: "b",
            studentId: "s1",
            workstationId: "w2",
            status: "进行中",
            currentStepId: "step-2",
          },
          { id: "c", studentId: "s2", workstationId: "w3", status: "已暂停" },
          { id: "d", studentId: "s1", workstationId: "w4", status: "已完成" },
        ],
      },
      {
        id: "e1",
        type: "exam",
        status: "已暂停",
        scheduleStart: "2026-09-19T09:00",
        entryEnd: "2026-09-19T09:30",
        sessions: [
          { id: "e", studentId: "s1", workstationId: "w5", status: "已暂停" },
        ],
      },
      {
        id: "history",
        type: "exam",
        status: "已发布",
        sessions: [
          { id: "f", studentId: "s1", workstationId: "w6", status: "进行中" },
        ],
      },
    ],
  };
  const result = getStudentCurrentSessions(data, "s1");
  assert.deepEqual(
    result.map((item) => item.sessionId),
    ["e", "a", "g", "b"],
  );
  assert.equal(result[0].arrangementId, "e1");
  assert.equal(result[3].currentStepId, "step-2");
  assert.deepEqual(getStudentCurrentSessions({}, "s1"), []);
  assert.deepEqual(getStudentCurrentSessions(data, "missing"), []);
});

test("camera request never asks for microphone and stream cleanup stops every track", async () => {
  let constraints;
  const stream = {
    getTracks: () => [
      { stop: () => stopped.push("a") },
      { stop: () => stopped.push("b") },
    ],
  };
  const stopped = [];
  const result = await requestStudentCamera({
    getUserMedia: async (value) => {
      constraints = value;
      return stream;
    },
  });
  assert.equal(result, stream);
  assert.deepEqual(constraints, { video: true, audio: false });
  stopMediaStream(stream);
  assert.deepEqual(stopped, ["a", "b"]);
  await assert.rejects(() => requestStudentCamera(null), /不支持摄像头/);
});
