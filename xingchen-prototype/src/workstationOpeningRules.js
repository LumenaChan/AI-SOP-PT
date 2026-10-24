import { cameraViews } from "./cameraRules.js";
import { workstationUsageRestriction } from "./workstationReleaseRules.js";
import {
  normalizeWorkstationAiBaseConfig,
  isCameraDevice,
} from "./workstationAiRules.js";

export const OPENING_CHECK_TTL_MS = 5 * 60 * 1000;
export const OPENING_STATUS_LABELS = {
  passed: "通过",
  failed: "异常",
  not_required: "不需要",
};

// Preview selection never promotes a secondary camera to primary or mutates
// inspection/confirmation state. Removed selections fall back to a valid view.
export function openingPreviewCameras(report, selectedCameraId = "") {
  const cameras = (report?.items || []).filter((item) => item.cameraId);
  const primary = cameras.find((camera) => camera.primary) || null;
  const auxiliaryCameras = cameras.filter((camera) => !camera.primary);
  const auxiliary =
    auxiliaryCameras.find((camera) => camera.cameraId === selectedCameraId) ||
    auxiliaryCameras[0] ||
    null;
  return { primary, auxiliary, auxiliaryCameras };
}

// This adapter simulates a device service. No browser checkbox is hardware evidence.
// Real integrations must replace the adapter, including frame freshness and storage probes.
export function deriveOpeningInspection({
  data,
  arrangementId,
  workstationId,
  gate,
  id,
  checkedAt,
}) {
  const arrangement = data.arrangements.find((a) => a.id === arrangementId);
  const workstation = data.workstations.find((w) => w.id === workstationId);
  if (!arrangement || !workstation) throw new Error("安排或工位不存在。");
  if (workstationUsageRestriction(workstation))
    throw new Error(workstationUsageRestriction(workstation));
  const config = normalizeWorkstationAiBaseConfig(workstation);
  const simulation = workstation.openingCheckSimulation || {};
  const views = cameraViews(config).filter((v) => v.enabled);
  const cameraChecks = views.map((view) => {
    const device = data.devices.find((d) => d.id === view.deviceId);
    const available = Boolean(
      device &&
        isCameraDevice(device) &&
        device.workstationId === workstationId &&
        device.status === "在线" &&
        device.streamStatus === "可用" &&
        simulation.frameAvailable !== false,
    );
    return {
      key: `camera:${view.deviceId}`,
      label:
        view.name ||
        view.label ||
        (view.deviceId === config.primaryCameraId ? "主视角" : "辅助视角"),
      cameraId: view.deviceId,
      primary: view.deviceId === config.primaryCameraId,
      status: available ? "passed" : "failed",
      blocking: true,
      detail: available
        ? "设备在线、视频流可用，模拟取帧成功"
        : "设备未绑定、离线、视频流不可用或无法获取画面",
      action: "检查摄像头连接及视频服务，处理后重新检测",
    };
  });
  if (!config.primaryCameraId)
    cameraChecks.unshift({
      key: "camera:missing",
      label: "主视角摄像头",
      primary: true,
      status: "failed",
      blocking: true,
      detail: "尚未配置主摄像头",
      action: "请管理员在工位设备配置中绑定主摄像头",
    });
  const edge = data.devices.find((d) => d.id === config.edgeDeviceId);
  const nodeOk = Boolean(
    edge &&
      edge.type === "边缘工作站" &&
      edge.workstationId === workstationId &&
      edge.status === "在线" &&
      simulation.nodeOnline !== false,
  );
  const aiIntended = Boolean(
    gate.aiParticipatingStepCount ||
      gate.automaticStepCount ||
      gate.sop?.steps?.some((s) =>
        ["visual_auto", "visual_assist_default_pass"].includes(
          s.expectedJudgementMode || s.judgementMode,
        ),
      ),
  );
  const inferenceOk = Boolean(
    gate.enabled && nodeOk && simulation.inferenceReady !== false,
  );
  const freeSpaceGb = Number(simulation.freeSpaceGb ?? 120);
  const requiredSpaceGb = Number(simulation.requiredSpaceGb ?? 10);
  const storageOk =
    Number.isFinite(freeSpaceGb) &&
    Number.isFinite(requiredSpaceGb) &&
    requiredSpaceGb > 0 &&
    freeSpaceGb >= requiredSpaceGb &&
    simulation.writable !== false &&
    simulation.writeTestPassed !== false;
  const storageDetail =
    !Number.isFinite(freeSpaceGb) ||
    !Number.isFinite(requiredSpaceGb) ||
    requiredSpaceGb <= 0
      ? "无法获取录像存储检测结果"
      : freeSpaceGb < requiredSpaceGb
        ? `录像存储空间不足：剩余 ${freeSpaceGb} GB，预计需要 ${requiredSpaceGb} GB`
        : simulation.writable === false
          ? "录像存储目录不可写"
          : simulation.writeTestPassed === false
            ? "录像试写入失败"
            : `模拟本地录像存储：剩余 ${freeSpaceGb} GB，预计需要 ${requiredSpaceGb} GB；目录可写、试写入成功`;
  const items = [
    ...cameraChecks,
    {
      key: "node",
      label: "边缘节点",
      status: config.edgeDeviceId
        ? nodeOk
          ? "passed"
          : "failed"
        : "not_required",
      blocking: false,
      detail: config.edgeDeviceId
        ? nodeOk
          ? "节点在线，模拟通信正常"
          : "节点离线或不可通信，AI不能启用；录像独立检查"
        : "未配置边缘节点，本次使用模拟本地录像存储",
      action: "请管理员检查边缘节点连接和设备绑定",
    },
    {
      key: "inference",
      label: "AI推理服务",
      status: !aiIntended ? "not_required" : inferenceOk ? "passed" : "failed",
      blocking: false,
      detail: !aiIntended
        ? "本次标准不要求AI参与"
        : inferenceOk
          ? "模拟服务响应正常，本次所需模型已就绪"
          : [
              ...(gate.reasons || []),
              ...(!nodeOk ? ["边缘节点不可用"] : []),
              ...(simulation.inferenceReady === false
                ? ["推理服务或模型自检失败"]
                : []),
            ].join("；") || "AI尚未就绪",
      action: "请管理员检查AI配置、模型适配及现场验证",
    },
    {
      key: "storage",
      label: "录像存储",
      status: storageOk ? "passed" : "failed",
      blocking: true,
      detail: storageDetail,
      action: "请管理员检查录像存储空间、写入权限及录像服务",
    },
  ];
  const report = {
    id,
    arrangementId,
    workstationId,
    checkedAt,
    source: "prototype_simulation",
    items,
    manualChecks: cameraChecks
      .filter((c) => c.cameraId)
      .map((c) => ({
        key: c.key,
        label: c.primary
          ? "主视角完整覆盖操作区域，画面清晰、无遮挡"
          : `${c.label}能看清对应操作，画面清晰、无遮挡`,
      })),
    canOpen: !items.some((c) => c.blocking && c.status !== "passed"),
    aiEnabled: inferenceOk,
    needsFallbackConfirmation: aiIntended && !inferenceOk,
    fallbackReasons:
      aiIntended && !inferenceOk
        ? items
            .filter(
              (c) =>
                ["node", "inference"].includes(c.key) && c.status === "failed",
            )
            .map((c) => c.detail)
        : [],
  };
  // Includes the bound resources and the exact AI configuration/model state. Opening
  // re-evaluates this against current store data; changes require a fresh inspection.
  report.fingerprint = JSON.stringify({
    arrangement: {
      id: arrangement.id,
      type: arrangement.type,
      status: arrangement.status,
      teacherId: arrangement.teacherId,
      studentIds: arrangement.studentIds,
      workstationIds: arrangement.workstationIds,
      stationAssignments: arrangement.stationAssignments,
      snapshot: arrangement.snapshot,
    },
    workstation,
    devices: data.devices.filter(
      (d) =>
        d.workstationId === workstationId ||
        views.some((v) => v.deviceId === d.id) ||
        d.id === config.edgeDeviceId,
    ),
    gate,
    students: data.students.filter((s) =>
      arrangement.studentIds?.includes(s.id),
    ),
  });
  return report;
}

export function openingEvaluationGate(gate, report) {
  if (report.aiEnabled || !gate.enabled) return gate;
  return {
    ...gate,
    enabled: false,
    enabledStepCount: 0,
    checks: {
      ...gate.checks,
      ready: false,
      availableJudgementItemIds: [],
      unavailableJudgementItemIds: [
        ...new Set([
          ...(gate.checks?.availableJudgementItemIds || []),
          ...(gate.checks?.unavailableJudgementItemIds || []),
        ]),
      ],
    },
    runtimeStatus: "opening_check_fallback",
    runtimeLabel: "AI检测未通过",
    reasons: [...new Set([...(gate.reasons || []), ...report.fallbackReasons])],
  };
}

export function assertOpeningInspection({
  report,
  current,
  checklist,
  at,
  actorId,
}) {
  if (!report || checklist?.inspectionId !== report.id)
    throw new Error("请先完成系统检测，旧的人工勾选不能替代检测结果。");
  const age = Date.parse(at) - Date.parse(report.checkedAt);
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age > OPENING_CHECK_TTL_MS ||
    report.fingerprint !== current.fingerprint
  )
    throw new Error(
      "检测已过期或工位、设备、安排状态已变化，请重新检测并确认画面。",
    );
  if (!current.canOpen)
    throw new Error(
      `暂不能开放：${current.items
        .filter((c) => c.blocking && c.status !== "passed")
        .map((c) => `${c.label}：${c.detail}`)
        .join("；")}`,
    );
  if (
    current.manualChecks.some(
      (c) => checklist.cameraConfirmations?.[c.key] !== true,
    )
  )
    throw new Error("请查看画面并确认所有使用视角的覆盖情况。");
  if (current.needsFallbackConfirmation && checklist.fallbackAccepted !== true)
    throw new Error("请确认本次AI降级方式后再开放。");
  if (checklist.siteResetConfirmed !== true)
    throw new Error(
      "请确认工具、设备和操作区域已复位，上一位学生已离场，现场具备本次使用条件。",
    );
  const { fingerprint, ...saved } = report;
  return {
    ...saved,
    confirmedAt: at,
    actorId,
    siteResetConfirmation: {
      confirmed: true,
      label:
        "工具、设备和操作区域已复位，上一位学生已离场，现场具备本次使用条件",
      actorId,
      confirmedAt: at,
    },
    cameraConfirmations: current.manualChecks.map((c) => ({
      ...c,
      confirmed: true,
    })),
    fallbackAccepted:
      current.needsFallbackConfirmation && checklist.fallbackAccepted === true,
  };
}
