import { createExamTiming } from "./studentExamRules.js";
import {
  createOpenedAiSession,
  deriveAiRuntimeGate,
  startAiRuntimeSession,
  SESSION_MANUAL_PAUSE_REASON,
  simulateAiConditionOnSession,
} from "./aiRuntimeRules.js";
import { createSessionStepsFromSop } from "./domainRules.js";
import {
  changeSessionClosure,
  normalizeClosureData,
} from "./sessionClosureRules.js";
import { finalizeSubmittedStep } from "./visualEvaluationRules.js";
export const SESSION_CLOSURE_DEMO_PACKAGE = "session-closure-20261022";
// Shared, idempotent append migration. All new resources are isolated; original records remain intact.
function migrateManualClosureDemoData(data) {
  data.enhancementMigrations ||= [];
  if (data.enhancementMigrations.includes(SESSION_CLOSURE_DEMO_PACKAGE))
    return data;
  const source = data.sops?.find((s) => s.id === "sop-demo-bench-20261015");
  const student =
    data.students?.find((s) => s.id === "student-demo-20261015") ||
    data.students?.find(
      (s) =>
        s.status === "启用" &&
        (s.faceStatus === "已采集" || s.face === "已采集"),
    );
  if (!source || !student) return data;
  const at = "2026-10-22T02:00:00.000Z";
  let sequence = 0;
  const makeId = (p) => `closure-demo-${p}-${++sequence}`;
  const sopId = "sop-session-closure-demo-20261022";
  let sop = data.sops.find((s) => s.id === sopId);
  if (!sop) {
    sop = {
      ...structuredClone(source),
      id: sopId,
      name: "【演示】三步流程与求助闭环",
      demoPackageId: SESSION_CLOSURE_DEMO_PACKAGE,
      steps: [
        ...source.steps.map((s) => ({
          ...structuredClone(s),
          expectedJudgementMode: "default_pass_manual_deduction",
          judgementMode: "default_pass_manual_deduction",
          maxScore: 30,
          score: 30,
          manualProgressionPolicy: "student_submit",
        })),
        {
          ...structuredClone(source.steps[0]),
          id: "Step 03",
          name: "工具归位与台面整理",
          maxScore: 40,
          score: 40,
          expectedJudgementMode: "default_pass_manual_deduction",
          judgementMode: "default_pass_manual_deduction",
          completionCondition: "工具归位、台面整理完毕",
          teachingInstruction: "将工具放回指定位置并整理台面。",
          manualProgressionPolicy: "student_submit",
        },
      ].slice(0, 3),
    };
    data.sops.push(sop);
  }
  const specs = [
    ["manual", "无AI三步操作与重复求助", "practice", "进行中"],
    ["teacher", "本步完成等待教师确认", "practice", "进行中"],
    ["fault", "故障任务仍可求助", "practice", "进行中"],
    ["practice-result", "已复位练习结果回看", "practice", "已结束"],
    ["exam-wait", "考试已交卷等待发布", "exam", "待发布"],
    ["exam-result", "考试已发布结果回看", "exam", "已发布"],
    ["exam-running", "考试人工流程由教师确认", "exam", "进行中"],
  ];
  data.arrangements ||= [];
  data.devices ||= [];
  data.workstations ||= [];
  for (const [key, title, type, status] of specs) {
    const id = `${type}-closure-${key}-20261022`,
      wId = `ws-closure-${key}-20261022`,
      sId = `session-closure-${key}-20261022`;
    if (data.arrangements.some((a) => a.id === id)) continue;
    // Never take over a user-owned reserved resource.
    if (
      data.workstations.some((w) => w.id === wId) ||
      data.devices.some(
        (d) => d.id === `${wId}-camera` || d.id === `${wId}-edge`,
      )
    )
      continue;
    const station = {
      id: wId,
      code: `DEMO-CLOSURE-${key}`,
      name: `【演示】${title}工位`,
      location: "固定工作台闭环验证区",
      status:
        status === "进行中" ? (key === "fault" ? "故障" : "进行中") : "空闲",
      currentArrangement: status === "进行中" ? `【演示】${title}` : "无",
      currentArrangementId: status === "进行中" ? id : "",
      demoPackageId: SESSION_CLOSURE_DEMO_PACKAGE,
      aiBaseConfig: {
        primaryCameraId: `${wId}-camera`,
        fallbackCameraId: "",
        edgeDeviceId: `${wId}-edge`,
        cameras: [
          {
            deviceId: `${wId}-camera`,
            label: "工作台主视角",
            role: "primary",
            enabled: true,
            areaIds: ["工作台"],
          },
        ],
      },
    };
    data.workstations.push(station);
    for (const [suffix, deviceType] of [
      ["camera", "全景摄像头"],
      ["edge", "边缘工作站"],
    ])
      data.devices.push({
        id: `${wId}-${suffix}`,
        serial: `DEMO-CLOSURE-${key}-${suffix}`,
        name: `【演示】${title}${suffix === "camera" ? "摄像头" : "边缘节点"}`,
        type: deviceType,
        workstationId: wId,
        status: "在线",
        streamStatus: "可用",
        demoPackageId: SESSION_CLOSURE_DEMO_PACKAGE,
      });
    const frozen = structuredClone(sop);
    if (key === "teacher")
      frozen.steps[0].manualProgressionPolicy = "teacher_confirmation";
    const a = {
      id,
      type,
      name: `【演示】${title}`,
      teacherId: "t1",
      sopId: sop.id,
      status: "进行中",
      studentIds: [student.id],
      workstationIds: [wId],
      stationAssignments: [{ studentId: student.id, workstationId: wId }],
      allocationPolicy: "one_student_one_station",
      openWorkstationIds: [wId],
      scheduleStart: "2026-10-22T10:00:00",
      startedAt: at,
      snapshot: { sopSnapshot: frozen, sopId: sop.id, lockedAt: at },
      sessions: [],
      demoPackageId: SESSION_CLOSURE_DEMO_PACKAGE,
      ...(type === "exam"
        ? { entryEnd: "2099-10-22T23:59:59", examDurationMinutes: 180 }
        : {}),
    };
    const gate = deriveAiRuntimeGate({
      ...data,
      sopId: sop.id,
      workstationId: wId,
    });
    let session = createOpenedAiSession({
      id: sId,
      studentId: student.id,
      workstationId: wId,
      gate,
      lockedAt: at,
      steps: createSessionStepsFromSop(frozen.steps),
      recording: {
        status: "不可用",
        fullVideoAvailable: false,
        note: "原型演示，未接入真实视频",
      },
    });
    session = startAiRuntimeSession(
      {
        ...session,
        identityVerification: {
          method: "face",
          status: "passed",
          studentId: student.id,
          verifiedAt: at,
        },
      },
      at,
    );
    session.resultSource = "prototype_demo";
    session.recording = {
      ...session.recording,
      status: "不可用",
      fullVideoAvailable: false,
      coveragePercent: 0,
      note: "演示数据，未接入真实视频",
    };
    session.evaluationSnapshot = {
      ...session.evaluationSnapshot,
      sopSnapshot: frozen,
    };
    if (type === "exam") {
      session.examDurationMinutes = 180;
      session.examTiming = createExamTiming({
        durationMinutes: 180,
        startedAt: at,
        paused: true,
        now: at,
      });
      if (key === "exam-running") {
        a.status = "已暂停";
        session.status = "已暂停";
        session.runtime.evaluationClock.status = "paused";
        session.runtime.evaluationClock.pauseReason =
          SESSION_MANUAL_PAUSE_REASON;
      }
    }
    a.sessions = [session];
    data.arrangements.push(a);
    const apply = (action, payload = {}) => {
      const changed = changeSessionClosure(data, {
        arrangementId: id,
        sessionId: sId,
        action,
        at,
        makeId,
        actor:
          action === "accept_help" || action === "complete_help"
            ? "teacher"
            : "student",
        actorId:
          action === "accept_help" || action === "complete_help"
            ? "t1"
            : student.id,
        ...payload,
      });
      data = changed.data;
      return changed.result;
    };
    if (key === "manual") {
      let r = apply("request_help", {
        reasonCode: "operation_help",
        reasonLabel: "操作不会",
      });
      apply("accept_help", { requestId: r.id });
      apply("complete_help", {
        requestId: r.id,
        note: "教师已到场讲解持表姿势，请继续操作。",
      });
      r = apply("request_help", {
        reasonCode: "teacher_confirmation",
        reasonLabel: "需要教师确认",
      });
      apply("cancel_help", { requestId: r.id });
      apply("request_help", {
        reasonCode: "device_issue",
        reasonLabel: "设备异常",
        note: "第二次设备求助，等待接手。",
      });
    }
    if (key === "teacher") {
      apply("submit_step", { stepId: frozen.steps[0].id });
      const r = apply("request_help", {
        reasonCode: "teacher_confirmation",
        reasonLabel: "需要教师确认",
      });
      apply("accept_help", { requestId: r.id });
    }
    if (key === "fault") {
      apply("request_help", {
        reasonCode: "device_issue",
        reasonLabel: "设备异常",
        note: "工位异常，请教师到场。",
      });
      const target = data.arrangements.find((a) => a.id === id);
      target.sessions[0].status = "故障";
      target.sessions[0].runtime.technicalIncidents = [
        {
          id: "closure-demo-fault",
          status: "open",
          affectsContinuation: true,
          type: "camera_offline",
          reason: "演示：视频连接异常，等待教师和管理员处理",
        },
      ];
    }
    if (status !== "进行中") {
      const target = data.arrangements.find((a) => a.id === id),
        ss = target.sessions[0];
      apply("request_help", {
        reasonCode: type === "exam" ? "device_failure" : "device_issue",
        reasonLabel: "设备异常",
      });
      const active = data.arrangements.find((a) => a.id === id);
      active.status = status;
      active.endedAt = at;
      active.sessions = [
        {
          ...ss,
          status: "已复位",
          endedAt: at,
          currentStepId: "",
          score: 100,
          resultStatus:
            type === "exam"
              ? status === "已发布"
                ? "已发布"
                : "正式成绩"
              : "正式成绩",
          steps: ss.steps.map((s) => ({
            ...finalizeSubmittedStep(s, at),
            flowCompletion: {
              role: "teacher",
              actor: "t1",
              at,
              note: "演示：教师确认本步已操作；无自动证据",
            },
            completionSource: "manual_flow",
            state: "pass",
          })),
          helpRequests: active.sessions[0].helpRequests,
          events: active.sessions[0].events,
        },
      ];
    }
  }
  data.enhancementMigrations.push(SESSION_CLOSURE_DEMO_PACKAGE);
  return {
    ...data,
    arrangements: data.arrangements.map((a) =>
      a.demoPackageId === SESSION_CLOSURE_DEMO_PACKAGE
        ? normalizeClosureData({ arrangements: [a] }).arrangements[0]
        : a,
    ),
  };
}

// Automatic progression is an explicitly marked historical prototype replay using the
// existing demo model/config and observation engine. It never occupies the live station.
export const AUTO_CLOSURE_DEMO_PACKAGE = "session-closure-auto-20261022";
export function migrateSessionClosureDemoData(input) {
  const data = migrateManualClosureDemoData(input);
  // Repair only this migration's initial demo pause marker, preserving user-modified cases.
  for (const a of data.arrangements)
    if (a.id === "exam-closure-exam-running-20261022")
      for (const session of a.sessions || [])
        if (
          session.runtime?.evaluationClock?.pauseReason ===
          "教师手动暂停Session"
        )
          session.runtime.evaluationClock.pauseReason =
            SESSION_MANUAL_PAUSE_REASON;
  if (data.enhancementMigrations?.includes(AUTO_CLOSURE_DEMO_PACKAGE))
    return data;
  const id = "practice-closure-auto-20261022";
  if (data.arrangements.some((a) => a.id === id)) return data;
  const source = data.sops.find((s) => s.id === "sop-demo-bench-20261015");
  const student = data.students.find((s) => s.id === "student-demo-20261015");
  const workstation = data.workstations.find(
    (w) => w.id === "ws-demo-20261015",
  );
  if (!source || !student || !workstation) return data;
  const gate = deriveAiRuntimeGate({
    ...data,
    sopId: source.id,
    workstationId: workstation.id,
  });
  if (!gate.enabled || gate.relation?.validationPurpose !== "prototype_demo")
    return data;
  let seq = 0;
  const makeId = (p) => `closure-auto-${p}-${++seq}`;
  const at = "2026-10-22T01:00:00.000Z";
  let session = createOpenedAiSession({
    id: "session-closure-auto-20261022",
    studentId: student.id,
    workstationId: workstation.id,
    gate,
    lockedAt: at,
    steps: createSessionStepsFromSop(source.steps),
    recording: { status: "不可用", fullVideoAvailable: false },
  });
  session = startAiRuntimeSession(session, at);
  for (const [index, item] of gate.judgementItems.entries()) {
    if (item.stepId !== session.currentStepId) continue;
    for (const condition of item.conditions || [])
      session = simulateAiConditionOnSession({
        session,
        judgementItemId: item.id,
        conditionId: condition.id,
        sopSnapshot: source,
        when: new Date(Date.parse(at) + (index + 1) * 10000).toISOString(),
        makeId,
      }).updatedSession;
  }
  if (!session.steps.every((s) => s.completionSource === "ai")) return data;
  session = {
    ...session,
    status: "已复位",
    resultStatus: "正式成绩",
    endedAt: "2026-10-22T01:01:00.000Z",
    currentStepId: "",
    resultSource: "prototype_demo",
    recording: {
      ...session.recording,
      status: "不可用",
      fullVideoAvailable: false,
      coveragePercent: 0,
      note: "原型观察引擎回放，无真实录像",
    },
  };
  data.arrangements.push({
    id,
    type: "practice",
    name: "【演示】自动推进历史回放（非真实算法）",
    teacherId: "t1",
    sopId: source.id,
    status: "已结束",
    scheduleStart: "2026-10-22T09:00:00",
    studentIds: [student.id],
    workstationIds: [workstation.id],
    stationAssignments: [
      { studentId: student.id, workstationId: workstation.id },
    ],
    allocationPolicy: "one_student_one_station",
    openWorkstationIds: [],
    startedAt: at,
    endedAt: session.endedAt,
    snapshot: {
      sopSnapshot: structuredClone(source),
      sopId: source.id,
      lockedAt: at,
    },
    sessions: [session],
    demoPackageId: SESSION_CLOSURE_DEMO_PACKAGE,
  });
  data.enhancementMigrations.push(AUTO_CLOSURE_DEMO_PACKAGE);
  return data;
}
