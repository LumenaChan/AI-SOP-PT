import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_EXAM_DURATION_MINUTES,
  appendExamIncidentHelpRequest,
  buildExamIncidentPayload,
  createExamTiming,
  examCountdownTone,
  examEffectiveElapsedSeconds,
  examRemainingSeconds,
  formatExamRemaining,
  normalizeExamDuration,
  normalizeExamTiming,
  transitionExamTiming,
  validateExamDuration,
} from "../src/studentExamRules.js";

test("exam duration defaults old data to 30 minutes and validates teacher input", () => {
  assert.equal(normalizeExamDuration(undefined), DEFAULT_EXAM_DURATION_MINUTES);
  assert.equal(normalizeExamDuration(45), 45);
  assert.equal(validateExamDuration("60"), 60);
  assert.throws(() => validateExamDuration(0), /5～240/);
  assert.throws(() => validateExamDuration(12.5), /整数/);
  assert.throws(() => validateExamDuration(241), /5～240/);
});

test("exam countdown derives from timestamps and survives a page refresh", () => {
  const startedAt = "2026-09-28T01:00:00.000Z";
  const session = {
    status: "进行中",
    examDurationMinutes: 30,
    examTiming: createExamTiming({ durationMinutes: 30, startedAt }),
  };
  const afterRefresh = JSON.parse(JSON.stringify(session));
  const now = new Date("2026-09-28T01:07:35.000Z").getTime();
  assert.equal(examEffectiveElapsedSeconds(afterRefresh, now), 455);
  assert.equal(examRemainingSeconds(afterRefresh, now), 1345);
  assert.equal(formatExamRemaining(1345), "22:25");
});

test("exam countdown freezes while paused and resumes from the same remaining time", () => {
  const start = "2026-09-28T02:00:00.000Z";
  const running = {
    status: "进行中",
    examDurationMinutes: 30,
    examTiming: createExamTiming({ durationMinutes: 30, startedAt: start }),
  };
  const pausedAt = "2026-09-28T02:10:00.000Z";
  const paused = {
    ...running,
    status: "已暂停",
    examTiming: transitionExamTiming(running, true, pausedAt),
  };
  assert.equal(
    examRemainingSeconds(paused, new Date("2026-09-28T02:20:00.000Z").getTime()),
    1200,
  );

  const resumedAt = "2026-09-28T02:25:00.000Z";
  const resumed = {
    ...paused,
    status: "进行中",
    examTiming: transitionExamTiming(paused, false, resumedAt),
  };
  assert.equal(
    examRemainingSeconds(resumed, new Date("2026-09-28T02:26:30.000Z").getTime()),
    1110,
  );
});

test("old running exam sessions receive compatible timing without clearing elapsed time", () => {
  const timing = normalizeExamTiming(
    {
      status: "进行中",
      startedAt: "2026-09-28 10:00",
      elapsed: "00:08:15",
    },
    undefined,
    "2026-09-28T02:08:15.000Z",
  );
  assert.equal(timing.durationMinutes, 30);
  assert.equal(timing.accumulatedActiveSeconds, 495);
  assert.equal(timing.lastResumedAt, "2026-09-28T02:08:15.000Z");
});

test("countdown tone changes at five minutes and one minute", () => {
  assert.equal(examCountdownTone(301), "normal");
  assert.equal(examCountdownTone(300), "warning");
  assert.equal(examCountdownTone(61), "warning");
  assert.equal(examCountdownTone(60), "danger");
});

test("exam incident help supports only incident reasons and never changes score", () => {
  const payload = buildExamIncidentPayload("device_failure", "摄像头黑屏");
  const session = {
    id: "session-1",
    studentId: "s1",
    currentStepId: "step-2",
    score: 86,
    events: [],
  };
  const updated = appendExamIncidentHelpRequest(
    session,
    "w2",
    payload,
    { id: "event-1", createdAt: "2026-09-28 10:30" },
  );
  assert.equal(updated.score, 86);
  assert.equal(updated.events[0].type, "exam_incident_help_requested");
  assert.equal(updated.events[0].scoreImpact, "none");
  assert.equal(updated.events[0].reasonCode, "device_failure");
  assert.throws(() => buildExamIncidentPayload("operation_help"), /请选择异常类型/);
  assert.throws(() => buildExamIncidentPayload("other", ""), /异常说明/);
});

test("duplicate exam incident help requests are idempotent", () => {
  const session = {
    id: "session-1",
    studentId: "s1",
    examIncidentHelpRequestedAt: "2026-09-28 10:30",
    events: [{ id: "existing" }],
  };
  const updated = appendExamIncidentHelpRequest(
    session,
    "w2",
    buildExamIncidentPayload("site_incident"),
    { id: "event-2", createdAt: "2026-09-28 10:31" },
  );
  assert.equal(updated, session);
  assert.equal(updated.events.length, 1);
});
