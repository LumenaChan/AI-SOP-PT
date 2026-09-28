import assert from "node:assert/strict";
import test from "node:test";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";

function pausedSession({
  safetyCandidates = [],
  technicalIncidents = [],
  pauseReason,
}) {
  return {
    id: "session-pause",
    workstationId: "w-pause",
    studentId: "student-pause",
    status: "已暂停",
    steps: [],
    events: [],
    examTiming: {
      durationMinutes: 30,
      startedAt: "2026-09-28T08:00:00.000Z",
      accumulatedActiveSeconds: 60,
      lastResumedAt: "",
      pausedAt: "2026-09-28T08:01:00.000Z",
    },
    runtime: {
      evaluationClock: {
        status: "paused",
        elapsedSeconds: 60,
        pauseReason,
      },
      safetyCandidates,
      technicalIncidents,
    },
  };
}

function pauseStore(session, arrangementStatus = "已暂停") {
  return createAiRuntimeStore(
    {
      arrangements: [
        {
          id: "exam-pause",
          type: "exam",
          status: arrangementStatus,
          paused: arrangementStatus === "已暂停",
          sessions: [session],
        },
      ],
    },
    { now: () => "2026-09-28T08:05:00.000Z" },
  );
}

test("pending 安全候选不能被整场恢复或单工位恢复绕过", () => {
  const session = pausedSession({
    pauseReason: "安全候选等待教师确认",
    safetyCandidates: [{ id: "safety-1", status: "pending" }],
  });
  const store = pauseStore(session, "进行中");
  const timingBefore = session.examTiming;

  const pausedArrangement = store.setArrangementPaused("exam-pause", true);
  assert.equal(
    pausedArrangement.sessions[0].runtime.evaluationClock.pauseReason,
    "安全候选等待教师确认",
  );
  const resumedArrangement = store.setArrangementPaused("exam-pause", false);
  assert.equal(resumedArrangement.status, "进行中");
  assert.equal(resumedArrangement.sessions[0].status, "已暂停");
  assert.deepEqual(resumedArrangement.sessions[0].examTiming, timingBefore);
  assert.throws(
    () => store.setArrangementSessionPaused("exam-pause", "w-pause", false),
    /待处理安全事件/,
  );
});

test("阻断性技术异常不能被整场恢复或单工位恢复绕过", () => {
  const session = pausedSession({
    pauseReason: "技术异常阻断继续操作",
    technicalIncidents: [
      {
        id: "incident-1",
        status: "active",
        affectsContinuation: true,
      },
    ],
  });
  const store = pauseStore(session);

  const resumedArrangement = store.setArrangementPaused("exam-pause", false);
  assert.equal(resumedArrangement.sessions[0].status, "已暂停");
  assert.equal(
    resumedArrangement.sessions[0].runtime.evaluationClock.status,
    "paused",
  );
  assert.throws(
    () => store.setArrangementSessionPaused("exam-pause", "w-pause", false),
    /未恢复技术异常/,
  );
});

test("教师整场暂停和单工位暂停都可以由对应恢复操作正常恢复", () => {
  const runningSession = {
    ...pausedSession({ pauseReason: "" }),
    status: "进行中",
    runtime: {
      ...pausedSession({ pauseReason: "" }).runtime,
      evaluationClock: { status: "running", pauseReason: "" },
    },
  };
  const arrangementStore = pauseStore(runningSession, "进行中");
  const pausedArrangement = arrangementStore.setArrangementPaused(
    "exam-pause",
    true,
  );
  assert.equal(pausedArrangement.sessions[0].status, "已暂停");
  assert.equal(
    pausedArrangement.sessions[0].runtime.evaluationClock.pauseReason,
    "教师暂停整场安排",
  );
  assert.equal(
    arrangementStore.setArrangementPaused("exam-pause", false).sessions[0]
      .status,
    "进行中",
  );

  const sessionStore = pauseStore(runningSession, "进行中");
  assert.equal(
    sessionStore.setArrangementSessionPaused("exam-pause", "w-pause", true),
    "已暂停",
  );
  assert.equal(
    sessionStore.setArrangementSessionPaused("exam-pause", "w-pause", false),
    "进行中",
  );
});
