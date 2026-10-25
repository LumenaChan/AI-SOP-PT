import {
  cameraViews,
  withCameraAliases,
  validateCameraCollection,
} from "./cameraRules.js";
export const WORKSTATION_AI_READINESS = {
  unconfigured: { label: "未配置", tone: "muted" },
  pending: { label: "待完善", tone: "warning" },
  available: { label: "可用", tone: "success" },
  abnormal: { label: "异常", tone: "danger" },
};

const CAMERA_TYPES = new Set(["全景摄像头", "细节摄像头", "摄像头"]);

export function isCameraDevice(device) {
  return Boolean(device && CAMERA_TYPES.has(device.type));
}

export function isEdgeDevice(device) {
  return device?.type === "边缘工作站";
}

export function normalizeWorkstationAiBaseConfig(workstation = {}) {
  const config = withCameraAliases(workstation.aiBaseConfig || {});
  return {
    ...config,
    workstationId: workstation.id || config.workstationId || "",
    primaryCameraId: config.primaryCameraId || "",
    fallbackCameraId: config.fallbackCameraId || "",
    edgeDeviceId: config.edgeDeviceId || "",
    lastCheckedAt: config.lastCheckedAt || "未检查",
    updatedAt: config.updatedAt || workstation.updatedAt || "",
    updatedBy: config.updatedBy || "系统迁移",
    lastAiCriticalChangeAt: config.lastAiCriticalChangeAt || "无",
  };
}

function deviceReferenceIssue(device, workstationId, expectedType, label) {
  if (!device) return `${label}设备不存在或已失效`;
  if (!expectedType(device)) return `${label}设备类型不正确`;
  if (device.workstationId !== workstationId) return `${label}未绑定到当前工位`;
  if (device.status === "停用") return `${label}已停用`;
  return "";
}

export function validateWorkstationAiBaseConfig({
  workstation,
  input,
  devices = [],
  requireComplete = false,
}) {
  if (!workstation?.id) throw new Error("工位不存在或已失效。");
  const mergedConfig = {
    ...normalizeWorkstationAiBaseConfig(workstation),
    ...(input || {}),
    workstationId: workstation.id,
  };
  const config = Array.isArray(input?.cameras)
    ? withCameraAliases(mergedConfig)
    : mergedConfig;
  if (
    config.primaryCameraId &&
    config.primaryCameraId === config.fallbackCameraId
  )
    throw new Error("主摄像头和备用摄像头不能选择同一台设备。");

  const checks = [
    [config.primaryCameraId, isCameraDevice, "主摄像头"],
    [config.fallbackCameraId, isCameraDevice, "备用摄像头"],
    [config.edgeDeviceId, isEdgeDevice, "边缘设备"],
  ];
  for (const [id, typeCheck, label] of checks) {
    if (!id) continue;
    const issue = deviceReferenceIssue(
      devices.find((device) => device.id === id),
      workstation.id,
      typeCheck,
      label,
    );
    if (issue) throw new Error(issue);
  }
  const validated = Array.isArray(input?.cameras)
    ? validateCameraCollection(config, workstation, devices)
    : withCameraAliases({ ...config, cameras: undefined });
  if (requireComplete) {
    if (!validated.primaryCameraId)
      throw new Error("请选择并启用一台主采集摄像头。");
    if (cameraViews(validated).some((c) => c.role === "legacy_secondary"))
      throw new Error("请确认历史第二视角的实际用途，选择辅助采集或备用待命。");
    if (cameraViews(validated).some((c) => c.role === "backup" && c.enabled))
      throw new Error("备用视角仅待命；参与采集前请选择主采集或辅助采集用途。");
  }
  return validated;
}

export function deriveWorkstationAiReadiness({
  workstation,
  devices = [],
  edgeRequired = true,
}) {
  if (!workstation)
    return {
      code: "unconfigured",
      ...WORKSTATION_AI_READINESS.unconfigured,
      reasons: ["工位不存在或已失效"],
    };
  const config = normalizeWorkstationAiBaseConfig(workstation);
  const hasAnyConfig = Boolean(
    config.primaryCameraId || config.fallbackCameraId || config.edgeDeviceId,
  );
  if (!hasAnyConfig)
    return {
      code: "unconfigured",
      ...WORKSTATION_AI_READINESS.unconfigured,
      reasons: ["尚未选择主摄像头和边缘设备"],
    };

  const edge = devices.find((device) => device.id === config.edgeDeviceId);
  const pendingReasons = [];
  const abnormalReasons = [];
  if (!config.primaryCameraId) pendingReasons.push("未选择主摄像头");
  for (const view of cameraViews(config).filter((c) => c.enabled)) {
    const label =
      view.role === "primary" ? "主摄像头" : view.name || "采集摄像头";
    const device = devices.find((d) => d.id === view.deviceId);
    const issue = deviceReferenceIssue(
      device,
      workstation.id,
      isCameraDevice,
      label,
    );
    if (issue) pendingReasons.push(issue);
    else {
      if (device.status !== "在线")
        abnormalReasons.push(`${label}当前${device.status || "离线"}`);
      if (device.streamStatus !== "可用")
        abnormalReasons.push(`${label}视频流不可用`);
    }
    if (view.role === "backup")
      pendingReasons.push(`${label}为备用设备，请确认是否参与本次采集`);
  }

  if (edgeRequired && !config.edgeDeviceId)
    pendingReasons.push("未选择边缘设备");
  else if (config.edgeDeviceId) {
    const issue = deviceReferenceIssue(
      edge,
      workstation.id,
      isEdgeDevice,
      "边缘设备",
    );
    if (issue) pendingReasons.push(issue);
    else if (edge.status !== "在线")
      abnormalReasons.push(`边缘设备当前${edge.status || "离线"}`);
  }

  if (["故障"].includes(workstation.status))
    abnormalReasons.push(`工位业务状态为${workstation.status}`);
  if (["暂停中", "维护中", "停用"].includes(workstation.status))
    pendingReasons.push(`工位业务状态为${workstation.status}，不可正式运行`);

  if (abnormalReasons.length)
    return {
      code: "abnormal",
      ...WORKSTATION_AI_READINESS.abnormal,
      reasons: [...new Set([...abnormalReasons, ...pendingReasons])],
    };
  if (pendingReasons.length)
    return {
      code: "pending",
      ...WORKSTATION_AI_READINESS.pending,
      reasons: [...new Set(pendingReasons)],
    };
  return {
    code: "available",
    ...WORKSTATION_AI_READINESS.available,
    reasons: ["采集摄像头、视频流和边缘设备均正常"],
  };
}

// Names and default display are presentation metadata. Runtime resources,
// coverage and real capture conditions affect validation, independent of order.
export function workstationCaptureKey(config = {}) {
  const base = withCameraAliases(config);
  return JSON.stringify({
    cameras: cameraViews(base)
      .filter((c) => c.enabled)
      .map((c) => ({
        deviceId: c.deviceId,
        role: c.role,
        areaIds: [...new Set(c.areaIds || [])].sort(),
      }))
      .sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
    edgeDeviceId: base.edgeDeviceId || "",
    regions: base.regions || [],
  });
}
export function isCriticalWorkstationAiChange(before, after) {
  return workstationCaptureKey(before) !== workstationCaptureKey(after);
}

export function invalidateWorkstationValidationStates(
  configs,
  workstationId,
  now,
) {
  let affectedCount = 0;
  const nextConfigs = (Array.isArray(configs) ? configs : []).map((config) => ({
    ...config,
    workstationValidationStates: Array.isArray(
      config.workstationValidationStates,
    )
      ? config.workstationValidationStates.map((state) => {
          if (
            state.workstationId !== workstationId ||
            !["enabled", "validated", "passed"].includes(state.status)
          )
            return state;
          affectedCount += 1;
          return {
            ...state,
            status: "pending_revalidation",
            reason: "工位AI基础配置发生关键变更",
            updatedAt: now,
          };
        })
      : [],
  }));
  return { configs: nextConfigs, affectedCount };
}

export function applyWorkstationAiBaseConfig({
  workstation,
  input,
  devices,
  now,
  updatedBy = "系统管理员",
  requireComplete = false,
}) {
  const before = normalizeWorkstationAiBaseConfig(workstation);
  const validated = validateWorkstationAiBaseConfig({
    workstation,
    input,
    devices,
    requireComplete,
  });
  const criticalChange = isCriticalWorkstationAiChange(before, validated);
  return {
    config: {
      ...validated,
      lastCheckedAt: before.lastCheckedAt,
      deviceInspection: before.deviceInspection,
      lastConfigValidatedAt: now,
      updatedAt: now,
      updatedBy,
      lastAiCriticalChangeAt: criticalChange
        ? now
        : before.lastAiCriticalChangeAt,
    },
    criticalChange,
  };
}
