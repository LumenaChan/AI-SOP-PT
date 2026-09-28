import test from "node:test";
import assert from "node:assert/strict";
import {
  appendStudentHelpRequestToSession,
  appendStudentHintRequestToSession,
  attachStudentVerificationToSession,
  buildStudentHelpPayload,
  buildStudentPracticeFeedback,
  getStudentSessionAccess,
  getStudentTaskDetails,
  resolveStudentPrimaryCamera,
  studentTaskActionLabel,
} from "../src/studentPracticeRules.js";

const session = {
  id: "session-1",
  studentId: "student-1",
  workstationId: "station-1",
  status: "进行中",
  currentStepId: "Step 01",
  score: 20,
  steps: [{ id: "Step 01", state: "active", name: "检查防护用品" }],
  events: [],
};

test("学生只能进入分配给自己的 Session", () => {
  const data = {
    arrangements: [{ id: "practice-1", sessions: [session] }],
  };
  assert.equal(
    getStudentSessionAccess(data, "student-1", "practice-1", "station-1")
      .allowed,
    true,
  );
  assert.deepEqual(
    getStudentSessionAccess(data, "student-2", "practice-1", "station-1"),
    { allowed: false, reason: "当前任务与登录学生不匹配。" },
  );
});

test("旧历史 Session 地址不可进入，刚完成的本次 Session 可显示完成页", () => {
  const historical = { ...session, status: "待复位" };
  const arrangement = { id: "practice-1", sessions: [historical] };
  assert.equal(
    getStudentSessionAccess(
      { arrangements: [arrangement] },
      "student-1",
      "practice-1",
      "station-1",
    ).allowed,
    false,
  );
  arrangement.sessions = [
    {
      ...historical,
      identityVerification: {
        method: "face",
        status: "passed",
        studentId: "student-1",
        verifiedAt: "2026-09-28T10:00:00.000Z",
      },
    },
  ];
  assert.equal(
    getStudentSessionAccess(
      { arrangements: [arrangement] },
      "student-1",
      "practice-1",
      "station-1",
    ).allowed,
    true,
  );
});

test("首次进入写入身份确认，已有有效确认保持不变", () => {
  const verification = {
    method: "face",
    status: "passed",
    studentId: "student-1",
    verifiedAt: "2026-09-28T10:00:00.000Z",
  };
  const attached = attachStudentVerificationToSession(session, verification);
  assert.deepEqual(attached.identityVerification, verification);
  assert.equal(
    attachStudentVerificationToSession(attached, {
      ...verification,
      verifiedAt: "2026-09-28T11:00:00.000Z",
    }),
    attached,
  );
  assert.throws(
    () =>
      attachStudentVerificationToSession(session, {
        ...verification,
        studentId: "student-2",
      }),
    /不匹配/,
  );
});

test("写入身份确认时同步形成教师可读取的身份事件", () => {
  const updated = attachStudentVerificationToSession(
    session,
    {
      method: "face",
      status: "passed",
      studentId: "student-1",
      verifiedAt: "2026-09-28T10:00:00.000Z",
    },
    { id: "identity-1", createdAt: "2026-09-28T10:00:00.000Z" },
  );
  assert.equal(updated.events[0].type, "student_identity_verified");
  assert.equal(updated.events[0].time, "10:00");
  assert.equal(updated.events[0].scoreImpact, "none");
});

test("查看提示只增加提示事件，不改变分数和步骤", () => {
  const updated = appendStudentHintRequestToSession(session, "Step 01", {
    id: "hint-1",
    createdAt: "2026-09-28 10:05",
  });
  assert.equal(updated.score, session.score);
  assert.deepEqual(updated.steps, session.steps);
  assert.equal(updated.events[0].type, "student_hint_requested");
  assert.equal(updated.events[0].scoreImpact, "none");
  assert.equal(updated.events[0].studentId, "student-1");
});

test("主摄像头只从新架构快照或工位 AI 基础配置读取", () => {
  const data = {
    devices: [
      { id: "camera-1", name: "CAM-001", status: "在线", streamStatus: "可用" },
      {
        id: "camera-2",
        name: "CAM-002",
        status: "离线",
        streamStatus: "不可用",
      },
    ],
  };
  const state = resolveStudentPrimaryCamera(
    data,
    {
      evaluationSnapshot: {
        workstationAiBaseConfigSnapshot: { primaryCameraId: "camera-1" },
      },
    },
    { aiBaseConfig: { primaryCameraId: "camera-2" } },
  );
  assert.equal(state.camera.name, "CAM-001");
  assert.equal(state.available, true);
  assert.equal(
    resolveStudentPrimaryCamera(
      data,
      {},
      {
        aiBaseConfig: { primaryCameraId: "camera-2" },
      },
    ).available,
    false,
  );
});

test("技术异常反馈使用保守业务文案且不判学生错误", () => {
  const feedback = buildStudentPracticeFeedback({
    session: {
      ...session,
      evaluationProfile: { aiRuntimeEnabled: true },
      runtime: {
        technicalIncidents: [{ id: "incident-1", status: "open" }],
      },
    },
    currentStep: session.steps[0],
    cameraState: { available: true },
  });
  assert.equal(feedback.type, "technical");
  assert.match(feedback.message, /安全降级/);
  assert.doesNotMatch(feedback.message, /失败|判错|confidence|capabilityId/);
});

test("待确认安全候选优先显示停止操作提醒", () => {
  const feedback = buildStudentPracticeFeedback({
    session: {
      ...session,
      evaluationProfile: { aiRuntimeEnabled: true },
      runtime: { safetyCandidates: [{ id: "safety-1", status: "pending" }] },
    },
    currentStep: session.steps[0],
    cameraState: { available: true },
  });
  assert.equal(feedback.type, "safety");
  assert.match(feedback.message, /停止当前操作/);
});

test("求助原因使用点击选项，其他原因必须填写说明", () => {
  assert.deepEqual(buildStudentHelpPayload("device_issue"), {
    reasonCode: "device_issue",
    reasonLabel: "设备异常",
    note: "",
  });
  assert.throws(() => buildStudentHelpPayload("other"), /填写/);
  assert.equal(
    buildStudentHelpPayload("other", "屏幕无显示").note,
    "屏幕无显示",
  );
});

test("请求教师帮助写入业务事件且不改变评分和步骤", () => {
  const payload = buildStudentHelpPayload("teacher_confirmation");
  const updated = appendStudentHelpRequestToSession(session, payload, {
    id: "help-1",
    createdAt: "2026-09-28 10:10",
  });
  assert.equal(updated.score, session.score);
  assert.deepEqual(updated.steps, session.steps);
  assert.equal(updated.helpRequestedAt, "2026-09-28 10:10");
  assert.equal(updated.events[0].type, "practice_help_requested");
  assert.equal(updated.events[0].reasonLabel, "需要教师确认");
  assert.equal(updated.events[0].scoreImpact, "none");
  assert.equal(
    appendStudentHelpRequestToSession(updated, payload, {
      id: "help-2",
      createdAt: "2026-09-28 10:11",
    }),
    updated,
  );
});

test("任务按钮根据类型和 Session 状态显示进入或继续", () => {
  assert.equal(studentTaskActionLabel("practice", "可入场"), "进入练习");
  assert.equal(studentTaskActionLabel("practice", "已暂停"), "继续练习");
  assert.equal(studentTaskActionLabel("exam", "进行中"), "继续考试");
});

test("当前任务卡通过真实 ID 关联工位、SOP 和教师", () => {
  const data = {
    arrangements: [
      {
        id: "practice-1",
        sopId: "sop-1",
        teacherId: "teacher-1",
        sessions: [session],
      },
    ],
    workstations: [{ id: "station-1", name: "1号工位" }],
    sops: [{ id: "sop-1", name: "安全操作" }],
    teachers: [{ id: "teacher-1", name: "王伟" }],
  };
  const details = getStudentTaskDetails(data, {
    arrangementId: "practice-1",
    sessionId: "session-1",
    workstationId: "station-1",
  });
  assert.equal(details.workstation.name, "1号工位");
  assert.equal(details.sop.name, "安全操作");
  assert.equal(details.teacher.name, "王伟");
});
