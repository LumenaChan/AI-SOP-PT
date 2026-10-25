import { cameraViews } from "./cameraRules.js";
import {
  applyWorkstationAiBaseConfig,
  normalizeWorkstationAiBaseConfig,
  workstationCaptureKey,
  deriveWorkstationAiReadiness,
} from "./workstationAiRules.js";
import {
  activeWorkstationUse,
  workstationSessionEnded,
} from "./workstationReleaseRules.js";
import { invalidateSopWorkstationConfigs } from "./sopWorkstationAiRules.js";

export function assertWorkstationIdle(data, workstationId) {
  if (activeWorkstationUse(data, workstationId)) {
    const names = (data.arrangements || [])
      .filter((a) =>
        (a.sessions || []).some(
          (s) =>
            s.workstationId === workstationId && !workstationSessionEnded(a, s),
        ),
      )
      .map((a) => a.name)
      .filter(Boolean);
    throw new Error(
      `工位有活动会话${names.length ? `（${[...new Set(names)].join("、")}）` : "或占用"}，请先结束会话后再变更运行设备或维护状态。`,
    );
  }
}
function usesDevice(config, id) {
  return (
    config?.edgeDeviceId === id ||
    cameraViews(config || {}).some((c) => c.deviceId === id && c.enabled)
  );
}
export function assertDeviceIdle(data, deviceId) {
  const workstationIds = new Set(
    (data.workstations || [])
      .filter((w) => usesDevice(w.aiBaseConfig, deviceId))
      .map((w) => w.id),
  );
  for (const a of data.arrangements || [])
    for (const s of a.sessions || []) {
      if (
        !workstationSessionEnded(a, s) &&
        usesDevice(
          s.evaluationSnapshot?.workstationAiBaseConfigSnapshot,
          deviceId,
        )
      )
        workstationIds.add(s.workstationId);
    }
  for (const id of workstationIds) assertWorkstationIdle(data, id);
}
export function workstationInspectionKey(workstation, devices) {
  const config = normalizeWorkstationAiBaseConfig(workstation);
  const ids = [
    ...cameraViews(config)
      .filter((c) => c.enabled)
      .map((c) => c.deviceId),
    config.edgeDeviceId,
  ].filter(Boolean);
  return JSON.stringify({
    capture: workstationCaptureKey(config),
    devices: ids.sort().map((id) => {
      const d = devices.find((d) => d.id === id);
      return d
        ? [
            id,
            d.type,
            d.workstationId,
            d.status,
            d.streamStatus,
            d.address,
            d.serial,
            d.resolution,
            d.lastHeartbeat,
          ]
        : [id, "missing"];
    }),
    simulation: workstation.openingCheckSimulation || {},
  });
}
export function currentWorkstationInspection(workstation, devices) {
  const report = workstation?.aiBaseConfig?.deviceInspection;
  return report?.source === "prototype_saved_state" &&
    Array.isArray(report.items) &&
    report.fingerprint === workstationInspectionKey(workstation, devices)
    ? report
    : null;
}
export function buildWorkstationInspection(workstation, devices, at) {
  const config = normalizeWorkstationAiBaseConfig(workstation),
    simulation = workstation.openingCheckSimulation || {};
  const items = cameraViews(config)
    .filter((c) => c.enabled)
    .map((c) => {
      const d = devices.find((d) => d.id === c.deviceId);
      const issues = [];
      if (!d) issues.push("设备不存在");
      else {
        if (d.workstationId !== workstation.id) issues.push("未绑定到本工位");
        if (!["摄像头", "全景摄像头", "细节摄像头"].includes(d.type))
          issues.push("设备类型不匹配");
        if (d.status !== "在线") issues.push(`设备${d.status || "状态未知"}`);
        if (d.streamStatus !== "可用") issues.push("视频流不可用");
        if (simulation.frameAvailable === false) issues.push("视频取帧失败");
      }
      return {
        id: c.deviceId,
        label: c.name || "采集摄像头",
        kind: "camera",
        blocking: true,
        passed: issues.length === 0,
        detail: issues.length ? issues.join("；") : "在线 · 视频流可用",
      };
    });
  if (!config.primaryCameraId)
    items.unshift({
      id: "missing-camera",
      label: "主采集摄像头",
      kind: "camera",
      blocking: true,
      passed: false,
      detail: "尚未配置",
    });
  const edge = devices.find((d) => d.id === config.edgeDeviceId);
  items.push({
    id: config.edgeDeviceId || "missing-edge",
    label: "边缘设备",
    kind: "edge",
    blocking: false,
    status: config.edgeDeviceId ? "checked" : "not_required",
    passed: Boolean(
      !config.edgeDeviceId ||
        (edge &&
          edge.workstationId === workstation.id &&
          edge.type === "边缘工作站" &&
          edge.status === "在线" &&
          simulation.nodeOnline !== false),
    ),
    detail: !config.edgeDeviceId
      ? "未配置边缘设备，仅使用录像与人工确认；AI待完善"
      : !edge
        ? "尚未配置或已移除"
        : edge.workstationId !== workstation.id
          ? "未绑定到本工位"
          : edge.type !== "边缘工作站"
            ? "设备类型不匹配"
            : simulation.nodeOnline === false
              ? "边缘设备通信失败"
              : edge.status || "状态未知",
  });
  return {
    checkedAt: at,
    source: "prototype_saved_state",
    fingerprint: workstationInspectionKey(workstation, devices),
    passed: items.every((i) => i.passed),
    items,
  };
}
export function createWorkstationConfigActions({
  setData,
  getSource,
  source,
  now,
  makeId,
}) {
  const checkSource = () => {
    if (getSource() !== source)
      throw new Error("数据来源已切换，请重新打开配置。");
  };
  const audit = (w, action, at, extra = {}) => ({
    id: makeId(),
    time: at,
    actor: "系统管理员",
    role: "管理员",
    action,
    target: `${w.name} / ${w.code || ""}`,
    result: "成功",
    ...extra,
  });
  return {
    saveWorkstationAiBaseConfig(id, input, expectedConfig) {
      let result;
      setData((current) => {
        checkSource();
        const w = current.workstations.find((w) => w.id === id);
        if (!w) throw new Error("工位不存在或已失效。");
        if (
          expectedConfig &&
          JSON.stringify(normalizeWorkstationAiBaseConfig(w)) !== expectedConfig
        )
          throw new Error("工位配置已变化，请重新打开后修改。");
        const at = now();
        const applied = applyWorkstationAiBaseConfig({
          workstation: w,
          input,
          devices: current.devices,
          now: at,
          requireComplete: true,
        });
        if (applied.criticalChange) assertWorkstationIdle(current, id);
        const invalidated = applied.criticalChange
          ? invalidateSopWorkstationConfigs(
              current.sopWorkstationAiConfigs,
              (r) => r.workstationId === id,
              at,
              "工位运行设备或覆盖条件变化",
            )
          : {
              configs: current.sopWorkstationAiConfigs || [],
              affectedCount: 0,
            };
        const affectedIds = applied.criticalChange
          ? (current.sopWorkstationAiConfigs || [])
              .filter(
                (r) =>
                  r.workstationId === id &&
                  ["passed", "validating"].includes(r.validationStatus),
              )
              .map((r) => r.id)
          : [];
        const affectedNames = affectedIds.map((relationId) => {
          const r = current.sopWorkstationAiConfigs.find(
            (r) => r.id === relationId,
          );
          const config = (current.aiCapabilityConfigs || []).find(
            (c) => c.id === r.sopAiConfigId,
          );
          return (
            (current.sops || []).find((s) => s.id === config?.sopId)?.name ||
            "关联标准已失效"
          );
        });
        const updated = { ...w, aiBaseConfig: applied.config, updatedAt: at };
        result = {
          workstation: updated,
          readiness: deriveWorkstationAiReadiness({
            workstation: updated,
            devices: current.devices,
          }),
          criticalChange: applied.criticalChange,
          affectedCount: invalidated.affectedCount,
        };
        return {
          ...current,
          workstations: current.workstations.map((w) =>
            w.id === id ? updated : w,
          ),
          sopWorkstationAiConfigs: invalidated.configs,
          auditLogs: [
            audit(w, "保存工位设备与视角配置", at, {
              affectedAiConfigCount: invalidated.affectedCount,
              changedFields: applied.criticalChange
                ? "运行设备或覆盖条件"
                : "名称、说明或默认显示",
              affectedAiConfigIds: affectedIds,
              detail: applied.criticalChange
                ? `运行设备或覆盖条件变更；${affectedNames.length ? `待重新验证：${affectedNames.join("、")}` : "没有已验证标准受到影响"}`
                : "仅调整名称、说明或默认显示，现场验证保留",
            }),
            ...(current.auditLogs || []),
          ],
        };
      });
      return result;
    },
    inspectWorkstationDevices(id) {
      let report;
      setData((current) => {
        checkSource();
        const w = current.workstations.find((w) => w.id === id);
        if (!w) throw new Error("工位不存在或已失效。");
        const at = now();
        report = buildWorkstationInspection(w, current.devices, at);
        return {
          ...current,
          workstations: current.workstations.map((w) =>
            w.id === id
              ? {
                  ...w,
                  aiBaseConfig: {
                    ...normalizeWorkstationAiBaseConfig(w),
                    deviceInspection: report,
                  },
                  updatedAt: at,
                }
              : w,
          ),
          auditLogs: [
            audit(w, "执行设备检测", at, {
              result: report.passed ? "检测通过" : "检测有异常",
              detail: report.items
                .map(
                  (i) =>
                    `${i.label}：${i.status === "not_required" ? "未配置，不参与AI" : i.passed ? "通过" : "异常"}`,
                )
                .join("；"),
            }),
            ...(current.auditLogs || []),
          ],
        };
      });
      return report;
    },
  };
}
