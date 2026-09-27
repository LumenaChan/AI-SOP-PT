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
  const config = workstation.aiBaseConfig || {};
  return {
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
}) {
  if (!workstation?.id) throw new Error("工位不存在或已失效。");
  const config = {
    ...normalizeWorkstationAiBaseConfig(workstation),
    ...(input || {}),
    workstationId: workstation.id,
  };
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
  return config;
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

  const primary = devices.find(
    (device) => device.id === config.primaryCameraId,
  );
  const fallback = devices.find(
    (device) => device.id === config.fallbackCameraId,
  );
  const edge = devices.find((device) => device.id === config.edgeDeviceId);
  const pendingReasons = [];
  const abnormalReasons = [];

  if (!config.primaryCameraId) pendingReasons.push("未选择主摄像头");
  else {
    const issue = deviceReferenceIssue(
      primary,
      workstation.id,
      isCameraDevice,
      "主摄像头",
    );
    if (issue) pendingReasons.push(issue);
    else {
      if (primary.status !== "在线")
        abnormalReasons.push(`主摄像头当前${primary.status || "离线"}`);
      if (primary.streamStatus !== "可用")
        abnormalReasons.push("主摄像头视频流不可用");
    }
  }

  if (config.fallbackCameraId) {
    const issue = deviceReferenceIssue(
      fallback,
      workstation.id,
      isCameraDevice,
      "备用摄像头",
    );
    if (issue) pendingReasons.push(issue);
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
      reasons: [...new Set(abnormalReasons)],
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
    reasons: ["主摄像头、视频流和边缘设备均可用"],
  };
}

export function isCriticalWorkstationAiChange(before, after) {
  const previous = before || {};
  const next = after || {};
  return ["primaryCameraId", "fallbackCameraId", "edgeDeviceId"].some(
    (key) => (previous[key] || "") !== (next[key] || ""),
  );
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
}) {
  const before = normalizeWorkstationAiBaseConfig(workstation);
  const validated = validateWorkstationAiBaseConfig({
    workstation,
    input,
    devices,
  });
  const criticalChange = isCriticalWorkstationAiChange(before, validated);
  return {
    config: {
      ...validated,
      lastCheckedAt: now,
      updatedAt: now,
      updatedBy,
      lastAiCriticalChangeAt: criticalChange
        ? now
        : before.lastAiCriticalChangeAt,
    },
    criticalChange,
  };
}
