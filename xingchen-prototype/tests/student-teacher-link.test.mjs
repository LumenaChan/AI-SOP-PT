import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  normalizeStoredStudentEvent,
  teacherIdentityView,
  teacherSessionEvents,
} from "../src/studentTeacherLinkRules.js";

test("历史事件只剩毫秒片段时显示时间未知，不将其伪装为可靠时刻", () => {
  const session = {
    id: "legacy-time",
    events: [
      { id: "lost", time: ".000Z", title: "历史会话事件" },
      { id: "valid", createdAt: "2026-10-22T02:00:00.000Z", title: "可靠时刻" },
    ],
  };
  const events = teacherSessionEvents(session);
  assert.equal(events[0].id, "valid");
  assert.equal(
    events.find((event) => event.id === "lost").displayTime,
    "时间未知",
  );
  assert.equal(
    events.find((event) => event.id === "valid").displayTime,
    "10:00:00",
  );
  assert.equal(session.events[0].time, ".000Z");
});

test("教师身份状态兼容等待、已确认和旧 Session 缺失信息", () => {
  assert.equal(teacherIdentityView({ status: "待开始" }).state, "waiting");
  assert.equal(teacherIdentityView({ status: "进行中" }).state, "missing");
  assert.equal(
    teacherIdentityView({
      status: "进行中",
      studentId: "s1",
      identityVerification: {
        method: "face",
        status: "passed",
        studentId: "s1",
        verifiedAt: "2026-09-28T14:02:00.000+08:00",
      },
    }).label,
    "人脸识别通过",
  );
});

test("提示、练习求助和考试异常求助保持独立教师事件分类", () => {
  const session = {
    id: "session-link",
    studentId: "s1",
    steps: [{ id: "step-1", name: "现场操作" }],
    events: [
      { id: "hint", type: "student_hint_requested", stepId: "step-1" },
      { id: "help", type: "practice_help_requested", reasonLabel: "操作不会" },
      {
        id: "incident",
        type: "exam_incident_help_requested",
        reason: "设备故障",
      },
      { id: "legacy", title: "摄像头离线", level: "danger" },
    ],
  };
  const events = teacherSessionEvents(session);
  assert.equal(events.find((item) => item.id === "hint").teacherTone, "info");
  assert.equal(
    events.find((item) => item.id === "help").category,
    "practice_help",
  );
  assert.equal(
    events.find((item) => item.id === "incident").category,
    "exam_incident",
  );
  assert.equal(
    events.find((item) => item.id === "legacy").category,
    "technical",
  );
  assert.doesNotThrow(() => normalizeStoredStudentEvent(null, session));
});

test("旧工位地址只作为学生正式 Session 路由兼容入口", () => {
  const source = readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  const route = source.match(
    /path="\/workstation\/:id\/:stationId"[\s\S]{0,160}element=\{<([^ ]+)/,
  );
  assert.equal(route?.[1], "LegacyWorkstationRedirect");
  assert.match(source, /function LegacyWorkstationRedirect\(\)/);
  assert.match(source, /`\/student\/session\/\$\{id\}\/\$\{stationId\}`/);
  assert.doesNotMatch(
    source,
    /path="\/workstation\/:id\/:stationId"\s+element=\{<WorkstationPage/,
  );
});

test("教师结束安排会冻结运行态并让学生端识别教师结束原因", () => {
  const source = readFileSync(
    new URL("../src/prototypeData.jsx", import.meta.url),
    "utf8",
  );
  const ending = source
    .split('endArrangement(id, note = "")')[1]
    ?.split("resetArrangementWorkstation")[0];
  assert.ok(ending);
  assert.match(ending, /endedBy: "teacher"/);
  assert.match(ending, /submitReason: "teacher_end"/);
  assert.match(ending, /type: "teacher_ended_session"/);
  assert.match(ending, /transitionExamTiming/);
  assert.match(ending, /status: "stopped"/);
});

test("教师事件时间统一HH:mm:ss：完整时刻不截掉秒，UTC转北京时间", async () => {
  const { displayClockTime } = await import("../src/dateTimeRules.js");
  for (const [input, expected] of [
    ["14:18:25", "14:18:25"],
    ["10:18", "10:18:00"],
    ["2026-10-24 16:42:35", "16:42:35"],
    ["2026-10-24T08:42:35.000Z", "16:42:35"],
    ["2026-10-24T00:00:00+08:00", "00:00:00"],
    ["42:35", "时间未知"],
    [".000Z", "时间未知"],
    ["25:00:00", "时间未知"],
  ])
    assert.equal(displayClockTime(input), expected);
});

test("已有截短的协助和人员绑定事件，从同Session唯一原始记录恢复小时，不修改原事件", () => {
  const session = {
    id: "time-recovery",
    runtime: {
      assistanceWarnings: [{ occurredAt: "2026-10-23 16:42:35" }],
      actorBinding: {
        history: [{ status: "uncertain", at: "2026-10-23 16:42:29" }],
      },
    },
    events: [
      { id: "assist", title: "协助行为提醒", time: "42:35" },
      { id: "actor", title: "人员绑定：uncertain", time: "42:29" },
    ],
  };
  const before = structuredClone(session),
    events = teacherSessionEvents(session);
  assert.equal(events.find((e) => e.id === "assist").displayTime, "16:42:35");
  assert.equal(events.find((e) => e.id === "actor").displayTime, "16:42:29");
  assert.deepEqual(
    events.map((e) => e.id),
    ["assist", "actor"],
  );
  const stored = normalizeStoredStudentEvent(session.events[0], session);
  assert.equal(stored.eventSortAt, undefined);
  assert.equal(stored.time, "42:35");
  assert.deepEqual(session, before);
});

test("缺失或有歧义的旧分秒片段不补成当前小时，合法完整createdAt优先", () => {
  const session = {
    id: "ambiguous",
    runtime: {
      assistanceWarnings: [
        { occurredAt: "2026-10-23 16:12:35" },
        { occurredAt: "2026-10-23 17:12:35" },
      ],
    },
    events: [
      { id: "ambiguous", title: "协助行为提醒", time: "12:35" },
      { id: "missing", title: "人员绑定：lost", time: "12:35" },
      {
        id: "full",
        title: "协助行为提醒",
        time: "12:35",
        createdAt: "2026-10-23T08:12:35Z",
      },
    ],
  };
  const events = teacherSessionEvents(session);
  assert.equal(
    events.find((e) => e.id === "ambiguous").displayTime,
    "时间未知",
  );
  assert.equal(events.find((e) => e.id === "missing").displayTime, "时间未知");
  assert.equal(events.find((e) => e.id === "full").displayTime, "16:12:35");
});

test("教师事件排序统一北京时间，ISO和本地时间不会因字符串格式错序", () => {
  const events = teacherSessionEvents({
    events: [
      { id: "old", createdAt: "2026-10-23T08:40:00Z" },
      { id: "new", createdAt: "2026-10-23 16:42:35" },
    ],
  });
  assert.deepEqual(
    events.map((e) => e.id),
    ["new", "old"],
  );
});

test("新会话开放和开始事件保留完整日期，并记录正确时分秒", async () => {
  const {
    studentRuntimeFixture,
    createStudentRuntimeStore,
    createOpenArrangement,
  } = await import("./student-e2e-fixture.mjs");
  const data = studentRuntimeFixture(),
    { store } = createStudentRuntimeStore(data);
  const a = createOpenArrangement(store, data, "practice");
  store.startWorkstationSession(a.id, data.workstations[0].id);
  const session = store.getData().arrangements.find((item) => item.id === a.id)
    .sessions[0];
  const events = session.events.filter((e) =>
    ["工位检查通过", "学生确认并开始"].includes(e.title),
  );
  assert.equal(events.length, 2);
  for (const event of events) {
    assert.ok(event.createdAt.startsWith("2026-09-28"));
    assert.equal(event.time, "14:00:00");
  }
});
