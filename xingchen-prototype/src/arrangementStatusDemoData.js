import {
  createOpenedAiSession,
  deriveAiRuntimeGate,
  startAiRuntimeSession,
  ARRANGEMENT_MANUAL_PAUSE_REASON,
} from "./aiRuntimeRules.js";
import {
  createSessionStepsFromSop,
  setEvaluationClockPaused,
} from "./domainRules.js";
import { createExamTiming } from "./studentExamRules.js";

export const ARRANGEMENT_STATUS_DEMO_PACKAGE = "arrangement-status-20261024";
export const ARRANGEMENT_STATUS_DEMO_CASES = [
  { key: "exam-draft", type: "exam", status: "草稿", title: "考试草稿待完善" },
  {
    key: "exam-preparing",
    type: "exam",
    status: "准备中",
    title: "考试准备中等待开始",
  },
  {
    key: "exam-paused",
    type: "exam",
    status: "已暂停",
    title: "考试整场暂停与恢复",
  },
  {
    key: "practice-paused",
    type: "practice",
    status: "已暂停",
    title: "练习整场暂停与恢复",
  },
  {
    key: "practice-cancelled",
    type: "practice",
    status: "已取消",
    title: "练习取消与复制草稿",
  },
];

// Append the same package to CPD and existing working copies. Never restore a
// deleted demonstration or reset a teacher's subsequent edits on the next load.
export function migrateArrangementStatusDemoData(data) {
  if (data.enhancementMigrations?.includes(ARRANGEMENT_STATUS_DEMO_PACKAGE))
    return data;
  const sop =
    (data.sops || []).find(
      (s) =>
        s.id === "sop-session-closure-demo-20261022" && s.status === "已发布",
    ) ||
    (data.sops || []).find((s) => s.status === "已发布" && s.steps?.length);
  const teacher =
    (data.teachers || []).find((t) => t.id === "t1") || data.teachers?.[0];
  const studentTemplate =
    (data.students || []).find((s) => s.id === "student-demo-20261015") ||
    (data.students || []).find((s) => s.status === "启用");
  if (!sop?.steps?.length || !teacher || !studentTemplate) return data;
  const next = {
    ...data,
    arrangements: [...(data.arrangements || [])],
    workstations: [...(data.workstations || [])],
    devices: [...(data.devices || [])],
    students: [...(data.students || [])],
    enhancementMigrations: [...(data.enhancementMigrations || [])],
  };
  const at = "2026-10-24T02:00:00.000Z",
    pausedAt = "2026-10-24T02:02:00.000Z";
  for (const [index, spec] of ARRANGEMENT_STATUS_DEMO_CASES.entries()) {
    const id = `${spec.key}-status-20261024`,
      workstationId = `ws-status-${spec.key}-20261024`,
      studentId = `student-status-${spec.key}-20261024`;
    if (next.arrangements.some((a) => a.id === id)) continue;
    // Reserved ID collisions must not take over a user's resource or identity.
    if (
      next.workstations.some((w) => w.id === workstationId) ||
      next.students.some((s) => s.id === studentId) ||
      next.devices.some((d) =>
        ["camera", "edge"].some(
          (suffix) => d.id === `${workstationId}-${suffix}`,
        ),
      )
    )
      continue;
    const opened = ["准备中", "已暂停"].includes(spec.status),
      paused = spec.status === "已暂停";
    const name = `【演示】${spec.title}`;
    next.students.push({
      id: studentId,
      classId: studentTemplate.classId,
      gender: "未记录",
      name: `${spec.type === "exam" ? "考试" : "练习"}状态学生${index + 1}`,
      no: `2026900${index + 1}`,
      status: "启用",
      face: "未采集",
      faceStatus: "未采集",
      demoPackageId: ARRANGEMENT_STATUS_DEMO_PACKAGE,
      updatedAt: at,
    });
    const station = {
      id: workstationId,
      name: `【演示】状态验证${index + 1}号工位`,
      code: `DEMO-STATUS-${index + 1}`,
      location: "状态流程演示区",
      status: paused ? "使用中" : "可入场",
      supportedProject: sop.name,
      currentArrangement: opened ? name : "无",
      currentArrangementId: opened ? id : "",
      demoPackageId: ARRANGEMENT_STATUS_DEMO_PACKAGE,
      aiBaseConfig: {
        primaryCameraId: `${workstationId}-camera`,
        edgeDeviceId: `${workstationId}-edge`,
        fallbackCameraId: "",
        cameras: [
          {
            deviceId: `${workstationId}-camera`,
            name: "主视角",
            role: "primary",
            enabled: true,
            defaultPreview: true,
            areaIds: ["工作台"],
          },
        ],
      },
    };
    next.workstations.push(station);
    for (const [suffix, type, label] of [
      ["camera", "全景摄像头", "主摄像头"],
      ["edge", "边缘工作站", "边缘节点"],
    ]) {
      next.devices.push({
        id: `${workstationId}-${suffix}`,
        serial: `DEMO-STATUS-${index + 1}-${suffix}`,
        name: `【演示】状态验证${index + 1}${label}`,
        type,
        workstationId,
        status: "在线",
        streamStatus: "可用",
        demoPackageId: ARRANGEMENT_STATUS_DEMO_PACKAGE,
      });
    }
    const arrangement = {
      id,
      name,
      type: spec.type,
      status: spec.status,
      teacherId: teacher.id,
      sopId: sop.id,
      studentIds: [studentId],
      workstationIds: [workstationId],
      stationAssignments: [{ workstationId, studentId }],
      allocationPolicy: "one_student_one_station",
      openWorkstationIds: opened ? [workstationId] : [],
      sessions: [],
      snapshot: opened
        ? { sopId: sop.id, sopSnapshot: structuredClone(sop), lockedAt: at }
        : null,
      scheduleStart: "2026-10-24T10:00:00",
      startedAt: paused ? at : "",
      paused,
      endedAt: "",
      updatedAt: paused ? pausedAt : at,
      archivedRecord: false,
      demoPackageId: ARRANGEMENT_STATUS_DEMO_PACKAGE,
      ...(spec.type === "exam"
        ? { entryEnd: "2026-10-24T10:30:00", examDurationMinutes: 30 }
        : {}),
    };
    if (opened) {
      const gate = deriveAiRuntimeGate({
        ...next,
        sopId: sop.id,
        workstationId,
      });
      let session = createOpenedAiSession({
        id: `session-status-${spec.key}-20261024`,
        studentId,
        workstationId,
        gate,
        lockedAt: at,
        steps: createSessionStepsFromSop(sop.steps),
        recording: {
          status: "不可用",
          fullVideoAvailable: false,
          note: "状态演示记录，未接入真实录像",
        },
      });
      session.evaluationSnapshot = {
        ...session.evaluationSnapshot,
        sopSnapshot: structuredClone(sop),
      };
      session.resultSource = "prototype_demo";
      if (paused) {
        session = startAiRuntimeSession(session, at);
        session = {
          ...session,
          status: "已暂停",
          elapsed: "00:02:00",
          steps: session.steps.map((s) =>
            s.executionState === "active"
              ? { ...s, executionState: "paused" }
              : s,
          ),
          runtime: {
            ...session.runtime,
            evaluationClock: setEvaluationClockPaused(
              { ...session.runtime.evaluationClock, elapsedSeconds: 120 },
              true,
              { reason: ARRANGEMENT_MANUAL_PAUSE_REASON, at: pausedAt },
            ),
          },
          events: [
            {
              id: `event-${id}-paused`,
              type: "arrangement_paused",
              title: "教师暂停本次安排",
              detail:
                "状态演示：教师可恢复整场安排，沿用已锁定的标准和学生会话。",
              createdAt: pausedAt,
              time: "10:02:00",
              level: "info",
            },
            ...(session.events || []),
          ],
        };
        if (spec.type === "exam") {
          session.examDurationMinutes = 30;
          session.examTiming = createExamTiming({
            durationMinutes: 30,
            startedAt: at,
            effectiveElapsedSeconds: 120,
            paused: true,
            now: pausedAt,
          });
        }
      }
      arrangement.sessions = [session];
    }
    if (spec.status === "已取消")
      Object.assign(arrangement, {
        cancelledAt: at,
        cancelledBy: teacher.name,
        cancelReason: "状态演示：教学计划调整，未开始练习已取消",
        preparationHistory: [
          {
            action: "cancel",
            at,
            actor: teacher.name,
            reason: "教学计划调整",
            workstationIds: [],
            sessionIds: [],
          },
        ],
      });
    next.arrangements.push(arrangement);
  }
  next.enhancementMigrations.push(ARRANGEMENT_STATUS_DEMO_PACKAGE);
  return next;
}
