import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildDataScreenSnapshot, createDataScreenDemo } from "../src/dataScreenRules.js";

const now = new Date("2026-10-04T09:00:00+08:00");
const fixture = () => ({
  students: [{ id: "student-1", classId: "class-1" }],
  sops: [{ id: "sop-1", familyId: "family-1", status: "已发布", steps: [{ id: "Step 01", name: "操作确认" }] }],
  arrangements: [{ id: "exam-1", type: "exam", teacherId: "t1", sopId: "sop-1", status: "已发布", sessions: [{
    id: "session-1", studentId: "student-1", startedAt: "2026-10-03 09:00:00", resultStatus: "已发布", score: 0,
    steps: [{ id: "Step 01", maxScore: 20, effectiveScore: 0 }], recording: { status: "完整" },
  }] }],
});

test("demonstration aggregates reconcile with their source records without mutating them", () => {
  const data = createDataScreenDemo(now);
  const before = JSON.stringify(data);
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(JSON.stringify(data), before);
  assert.equal(screen.metrics[3], data.arrangements.reduce((n, a) => n + a.sessions.length, 0));
  assert.equal(screen.metrics[0], 18);
  assert.ok(screen.metrics[1] <= data.students.length);
  assert.equal(screen.scoreBuckets.reduce((n, b) => n + b.count, 0), screen.publishedCount);
  assert.equal(screen.trend.reduce((n, p) => n + p.count, 0), screen.periodParticipants);
  assert.equal(screen.recording.reduce((n, r) => n + r.count, 0), screen.recordingTotal);
  assert.equal(screen.modeTotal, 36);
  assert.equal(screen.running, screen.workstations.filter((w) => w.status === "实训中").length);
  assert.ok(new Set(screen.trend.map((p) => p.count)).size > 1);
  for (const arrangement of data.arrangements.filter((a) => ["已发布", "已结束"].includes(a.status))) {
    for (const session of arrangement.sessions) {
      assert.equal(session.steps.reduce((n, s) => n + s.maxScore, 0), 100);
      assert.equal(session.steps.reduce((n, s) => n + s.effectiveScore, 0), session.score);
    }
  }
});

test("zero is a valid published score and produces a real deduction rate", () => {
  const screen = buildDataScreenSnapshot(fixture(), { now });
  assert.equal(screen.publishedCount, 1);
  assert.equal(screen.averageScore, "0.0");
  assert.equal(screen.heat[0].cells[0].rate, 100);
});

test("unpublished exam results never contribute to public performance analytics", () => {
  const data = fixture(); data.arrangements[0].status = "待发布";
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(screen.publishedCount, 0);
  assert.equal(screen.averageScore, null);
  assert.equal(screen.heat[0].cells[0].rate, null);
});

test("scheduled dates cannot stand in for actual participation", () => {
  const data = fixture();
  delete data.arrangements[0].sessions[0].startedAt;
  data.arrangements[0].scheduleStart = "2026-10-03T09:00:00";
  assert.equal(buildDataScreenSnapshot(data, { now }).metrics[3], 0);
});

test("absent students, future starts, and duplicate sessions are excluded", () => {
  const data = fixture();
  const session = data.arrangements[0].sessions[0];
  data.arrangements[0].sessions.push({ ...session }, { ...session, id: "absent", resultStatus: "未参加" }, { ...session, id: "future", startedAt: "2026-10-05T09:00:00" });
  assert.equal(buildDataScreenSnapshot(data, { now }).metrics[3], 1);
});

test("teacher scope excludes other teachers' arrangements and students", () => {
  const data = fixture();
  data.arrangements.push({ ...data.arrangements[0], id: "exam-2", teacherId: "t2", sessions: [{ ...data.arrangements[0].sessions[0], id: "other-session", studentId: "student-2" }] });
  const screen = buildDataScreenSnapshot(data, { now, teacherId: "t1" });
  assert.equal(screen.metrics[1], 1);
  assert.equal(screen.metrics[3], 1);
});

test("SOP families count once and use the latest published version", () => {
  const data = fixture();
  data.sops[0].publishedAt = "2026-09-01";
  data.sops.push({ ...data.sops[0], id: "sop-new", publishedAt: "2026-10-01", steps: [{ id: "Step 01", name: "新标准" }, { id: "Step 02", name: "新增步骤" }] });
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(screen.metrics[2], 1);
  assert.equal(screen.modeTotal, 2);
});

test("public workstation snapshot omits identities and exam step details", () => {
  const data = createDataScreenDemo(now);
  const screen = buildDataScreenSnapshot(data, { now });
  assert.ok(screen.workstations.some((w) => w.isExam));
  for (const w of screen.workstations) {
    assert.equal(w.studentId, undefined);
    assert.equal(w.score, undefined);
    if (w.isExam) assert.deepEqual(w.steps, []);
    if (w.isExam) {
      assert.equal(w.preview.state, "private");
      assert.equal(w.preview.poster, undefined);
      assert.equal(w.preview.hasAuxiliary, undefined);
    }
  }
});

test("demo previews are labeled samples and unavailable stations do not show operation imagery", () => {
  const screen = buildDataScreenSnapshot(createDataScreenDemo(now), { now });
  assert.ok(screen.workstations.some((w) => w.preview.state === "demo" && w.preview.hasAuxiliary));
  for (const w of screen.workstations.filter((w) => ["故障", "维护中", "停用"].includes(w.status))) {
    assert.equal(w.preview.state, "unavailable");
    assert.equal(w.preview.poster, undefined);
  }
});

test("business camera previews follow their workstation bindings without leaking stream addresses or demo images", () => {
  const data = {
    workstations: [
      { id: "w1", name: "1号工位", aiBaseConfig: { primaryCameraId: "main", fallbackCameraId: "aux" } },
      { id: "w2", name: "2号工位", aiBaseConfig: { primaryCameraId: "unbound" } },
    ],
    devices: [
      { id: "main", workstationId: "w1", status: "在线", address: "rtsp://private/main" },
      { id: "aux", workstationId: "w1", status: "离线", address: "rtsp://private/aux" },
      { id: "unbound", workstationId: "w1", status: "在线" },
    ],
  };
  const screen = buildDataScreenSnapshot(data, { now });
  const preview = screen.workstations[0].preview;
  assert.equal(preview.message, "视频预览待接入");
  assert.equal(preview.hasAuxiliary, true);
  assert.equal(preview.auxiliaryMessage, "辅助视角离线");
  assert.equal(screen.workstations[1].preview.message, "主视角未配置");
  assert.ok(!JSON.stringify(screen.workstations).includes("rtsp://"));
  assert.ok(screen.workstations.every((w) => w.preview.poster == null));
});

test("current project data and an empty dataset both produce usable snapshots", () => {
  const data = JSON.parse(readFileSync(new URL("../src/data/currentPrototypeData.json", import.meta.url)));
  const snapshot = buildDataScreenSnapshot(data, { now });
  assert.ok(snapshot.metrics.every(Number.isFinite));
  const empty = buildDataScreenSnapshot({}, { now });
  assert.deepEqual(empty.metrics, [0, 0, 0, 0, 0, 0]);
  assert.equal(empty.recordingRate, null);
  assert.equal(empty.averageScore, null);
});

test("invalid scores do not inflate sample counts or disappear from the histogram", () => {
  const data = fixture();
  const session = data.arrangements[0].sessions[0];
  for (const score of [-1, 101, "", null, "not a score"]) {
    data.arrangements[0].sessions.push({ ...session, id: `invalid-${score}`, score });
  }
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(screen.publishedCount, 1);
  assert.equal(screen.scoreBuckets.reduce((n, b) => n + b.count, 0), screen.publishedCount);
});

test("a reused workstation displays its active session, not a previous student's finished steps", () => {
  const data = fixture();
  data.workstations = [{ id: "w1", name: "1号工位", status: "启用" }];
  data.devices = [{ id: "d1", workstationId: "w1", status: "离线" }];
  data.arrangements = [{ id: "practice", type: "practice", status: "进行中", sessions: [
    { id: "ended", workstationId: "w1", status: "已复位", steps: [{ id: "old", name: "历史步骤" }] },
    { id: "active", workstationId: "w1", status: "进行中", currentStepId: "Step 02", steps: [
      { id: "Step 01", name: "安全检查", state: "pass", completionResult: "complete", evidenceStatus: "已归档" },
      { id: "Step 02", name: "当前操作", state: "active" },
    ] },
  ] }];
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(screen.running, 1);
  assert.equal(screen.workstations[0].currentStep, "当前操作");
  assert.equal(screen.workstations[0].steps[0].complete, true);
  assert.equal(screen.healthy, 0);
});

test("a confirmed safety candidate is not a closed safety incident", () => {
  const data = fixture();
  data.arrangements[0].sessions[0].runtime = { safetyCandidates: [
    { id: "confirmed", status: "confirmed", resolvedAt: "2026-10-03T10:00:00" },
    { id: "pending", status: "pending", createdAt: "2026-10-03T11:00:00" },
    { id: "closed", status: "confirmed", closedAt: "2026-10-03T12:00:00" },
  ] };
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(screen.events.length, 2);
  assert.equal(screen.events.find((e) => e.id.endsWith("-confirmed")).closed, false);
  assert.equal(screen.events.find((e) => e.id.endsWith("-closed")).closed, true);
});

test("the 30-day window uses school midnight and distinct arrangement IDs", () => {
  const data = fixture();
  const session = data.arrangements[0].sessions[0];
  data.arrangements[0].sessions = [
    { ...session, id: "before", startedAt: "2026-09-04T15:59:59Z" },
    { ...session, id: "boundary", startedAt: "2026-09-04T16:00:00Z" },
    { ...session, id: "unstarted", status: "可入场", startedAt: "2026-10-03T09:00:00" },
  ];
  data.arrangements.push(structuredClone(data.arrangements[0]));
  const screen = buildDataScreenSnapshot(data, { now });
  assert.equal(screen.metrics[3], 2);
  assert.equal(screen.metrics[5], 1);
  assert.equal(screen.periodParticipants, 1);
  assert.equal(screen.trend[0].day, "2026-09-05");
  assert.equal(screen.trend[0].count, 1);
});

test("teacher capability counts follow judgement conditions used by current AI configurations", () => {
  const data = fixture();
  data.aiCapabilityConfigs = [{ id: "config", sopId: "sop-1", judgementItems: [{ conditions: [{ capabilityId: "used" }] }] }];
  data.aiCapabilities = [{ id: "used", status: "已发布" }, { id: "other", status: "已发布" }];
  const screen = buildDataScreenSnapshot(data, { now, teacherId: "t1" });
  assert.equal(screen.construction[1], 1);
});
