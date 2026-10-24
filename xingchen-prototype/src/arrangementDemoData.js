import {
  createOpenedAiSession,
  deriveAiRuntimeGate,
} from "./aiRuntimeRules.js";
import { createSessionStepsFromSop } from "./domainRules.js";

export const PREPARATION_DEMO_PACKAGE = "arrangement-closure-20261022";

// Append once for both data sources. Existing arrangements, scores and snapshots are untouched.
export function migratePreparationDemoData(data) {
  data.enhancementMigrations ||= [];
  if (data.enhancementMigrations.includes(PREPARATION_DEMO_PACKAGE))
    return data;
  const sop = (data.sops || []).find(
    (s) => s.id === "sop-demo-bench-20261015" && s.status === "已发布",
  );
  const students = (data.students || [])
    .filter((s) => s.status === "启用")
    .slice(0, 2);
  if (!sop || students.length < 2) return data;
  const when = "2026-10-22 09:00:00";
  const workstationIds = [
    "ws-allocation-demo-a-20261022",
    "ws-allocation-demo-b-20261022",
  ];
  data.workstations ||= [];
  data.devices ||= [];
  data.arrangements ||= [];
  const createdStations = new Set();
  workstationIds.forEach((id, index) => {
    if (!data.workstations.some((w) => w.id === id)) {
      createdStations.add(id);
      data.workstations.push({
        id,
        code: `DEMO-ALLOC-${index + 1}`,
        name: `【演示】分配验证${index === 0 ? "A" : "B"}工位`,
        location: "固定工作台演示区",
        status: "可入场",
        currentArrangement: "无",
        supportedProject: sop.name,
        demoPackageId: PREPARATION_DEMO_PACKAGE,
        aiBaseConfig: {
          primaryCameraId: `${id}-camera`,
          fallbackCameraId: "",
          edgeDeviceId: `${id}-edge`,
          cameras: [
            {
              deviceId: `${id}-camera`,
              label: "工作台主视角",
              role: "primary",
              enabled: true,
              areaIds: ["工作台"],
            },
          ],
        },
      });
    }
    for (const [suffix, type, name] of [
      ["camera", "全景摄像头", "演示主摄像头"],
      ["edge", "边缘工作站", "演示边缘节点"],
    ]) {
      if (!data.devices.some((d) => d.id === `${id}-${suffix}`))
        data.devices.push({
          id: `${id}-${suffix}`,
          serial: `DEMO-ALLOC-${index}-${suffix}`,
          name,
          type,
          workstationId: id,
          status: "在线",
          streamStatus: "可用",
          demoPackageId: PREPARATION_DEMO_PACKAGE,
        });
    }
  });
  const studentIds = students.map((s) => s.id);
  const pairs = workstationIds.map((workstationId, index) => ({
    workstationId,
    studentId: studentIds[1 - index],
  }));
  const make = (id, name, type = "practice") => ({
    id,
    type,
    name: `【演示】${name}`,
    teacherId: data.teachers?.[0]?.id || "t1",
    sopId: sop.id,
    status: "待开始",
    scheduleStart: "2026-10-22T09:00:00",
    studentIds: [...studentIds],
    workstationIds: [...workstationIds],
    stationAssignments: pairs.map((p) => ({ ...p })),
    allocationPolicy: "one_student_one_station",
    openWorkstationIds: [],
    sessions: [],
    snapshot: null,
    startedAt: "",
    endedAt: "",
    updatedAt: when,
    demoPackageId: PREPARATION_DEMO_PACKAGE,
    ...(type === "exam"
      ? { entryEnd: "2026-10-22T09:30:00", examDurationMinutes: 30 }
      : {}),
  });
  const draft = make(
    "practice-allocation-draft-20261022",
    "人员分配待补齐草稿",
  );
  draft.status = "草稿";
  draft.workstationIds = [workstationIds[0]];
  draft.stationAssignments = [pairs[0]];
  const ready = make(
    "practice-allocation-ready-20261022",
    "一人一工位分配验证",
  );
  const prepared = make(
    "practice-preparation-open-20261022",
    "撤销工位准备与取消验证",
  );
  prepared.status = "准备中";
  prepared.openWorkstationIds = [...workstationIds];
  prepared.snapshot = {
    sopId: sop.id,
    sopSnapshot: structuredClone(sop),
    lockedAt: when,
  };
  prepared.sessions = pairs.map((pair, index) => {
    const gate = deriveAiRuntimeGate({
      ...data,
      sopId: sop.id,
      workstationId: pair.workstationId,
    });
    return createOpenedAiSession({
      id: `session-preparation-demo-${index + 1}-20261022`,
      ...pair,
      gate,
      lockedAt: when,
      steps: createSessionStepsFromSop(sop.steps),
      recording: {
        status: "不可用",
        fullVideoAvailable: false,
        note: "未开始演示会话，无真实录像",
      },
    });
  });
  if (createdStations.size !== workstationIds.length) {
    // A user-owned record may use a reserved demo ID. Never take its occupancy.
    Object.assign(prepared, {
      status: "待开始",
      openWorkstationIds: [],
      sessions: [],
      snapshot: null,
    });
  }
  const cancelled = make(
    "exam-preparation-cancelled-20261022",
    "已取消考试与复制草稿",
    "exam",
  );
  Object.assign(cancelled, {
    status: "已取消",
    cancelledAt: when,
    cancelledBy: "王老师",
    cancelReason: "演示：教学计划调整，考试未开始",
    preparationHistory: [
      {
        action: "cancel",
        at: when,
        actor: "王老师",
        reason: "演示：教学计划调整，考试未开始",
        workstationIds: [],
        sessionIds: [],
      },
    ],
  });
  for (const record of [draft, ready, prepared, cancelled]) {
    if (data.arrangements.some((a) => a.id === record.id)) continue;
    data.arrangements.push(record);
    if (record.id === prepared.id && record.openWorkstationIds.length)
      data.workstations = data.workstations.map((w) =>
        workstationIds.includes(w.id)
          ? {
              ...w,
              currentArrangement: record.name,
              currentArrangementId: record.id,
            }
          : w,
      );
  }
  data.enhancementMigrations.push(PREPARATION_DEMO_PACKAGE);
  return data;
}
