import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  normalizeStoredStudentEvent,
  teacherIdentityView,
  teacherSessionEvents,
} from "../src/studentTeacherLinkRules.js";

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
