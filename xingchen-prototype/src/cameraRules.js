export const CAMERA_ROLES = {
  primary: "主采集",
  auxiliary: "辅助采集",
  backup: "备用",
  legacy_secondary: "历史第二视角 · 角色待确认",
};
export const VIEW_STRATEGIES = {
  single: "单视角",
  any: "任一视角",
  all: "多视角共同满足",
};
export function cameraViews(config = {}) {
  if (Array.isArray(config.cameras))
    return config.cameras.map((c) => ({
      ...c,
      enabled: c.enabled !== false,
      areaIds: c.areaIds || [],
    }));
  return [
    config.primaryCameraId && {
      deviceId: config.primaryCameraId,
      name: "主视角",
      role: "primary",
      enabled: true,
      defaultPreview: true,
      areaIds: [],
    },
    config.fallbackCameraId && {
      deviceId: config.fallbackCameraId,
      name: "历史第二视角",
      role: "legacy_secondary",
      enabled: true,
      defaultPreview: false,
      areaIds: [],
    },
  ].filter(Boolean);
}
export function withCameraAliases(config = {}) {
  const cameras = cameraViews(config),
    enabled = cameras.filter((c) => c.enabled),
    primary =
      enabled.find((c) => c.defaultPreview) ||
      enabled.find((c) => c.role === "primary");
  return {
    ...config,
    cameras,
    primaryCameraId: primary?.deviceId || "",
    fallbackCameraId:
      enabled.find(
        (c) =>
          c.deviceId !== primary?.deviceId &&
          ["backup", "legacy_secondary", "auxiliary"].includes(c.role),
      )?.deviceId || "",
  };
}
export function workstationCameras(workstation, devices = [], snapshot) {
  return cameraViews(snapshot || workstation?.aiBaseConfig || {})
    .filter((c) => c.enabled)
    .map((c) => ({
      ...devices.find((d) => d.id === c.deviceId),
      ...c,
      id: c.deviceId,
      label: c.name || CAMERA_ROLES[c.role],
      available: devices.some(
        (d) =>
          d.id === c.deviceId &&
          d.workstationId === workstation?.id &&
          d.status === "在线" &&
          d.streamStatus === "可用",
      ),
    }));
}
export function monitorListCameras(workstation, devices = [], session) {
  const views = workstationCameras(
    workstation,
    devices,
    session?.evaluationSnapshot?.workstationAiBaseConfigSnapshot,
  );
  const primary =
    views.find((view) => view.defaultPreview) ||
    views.find((view) => view.role === "primary") ||
    views[0];
  const unique = new Map();
  for (const view of [primary, ...views].filter(Boolean)) {
    if (!unique.has(view.id)) unique.set(view.id, view);
  }
  return [...unique.values()].slice(0, 2);
}

export function bindingCameras(binding = {}) {
  return [
    ...new Set(
      binding.cameraIds?.length
        ? binding.cameraIds
        : [binding.cameraId].filter(Boolean),
    ),
  ];
}
export function validateCameraCollection(config, workstation, devices = []) {
  const views = cameraViews(config),
    ids = views.map((c) => c.deviceId),
    enabled = views.filter((c) => c.enabled);
  if (new Set(ids).size !== ids.length) throw new Error("相机不能重复添加。");
  if (
    enabled.length &&
    (enabled.filter((c) => c.defaultPreview).length !== 1 ||
      !enabled.some((c) => c.role === "primary"))
  )
    throw new Error("请选择一个主采集视角，并且只能有一个默认预览。");
  for (const view of views) {
    const device = devices.find((d) => d.id === view.deviceId);
    if (
      !device ||
      device.workstationId !== workstation.id ||
      !["全景摄像头", "细节摄像头", "摄像头"].includes(device.type) ||
      device.status === "停用"
    )
      throw new Error("相机必须是当前工位已绑定且未停用的摄像头。");
    if (!view.name?.trim() || !CAMERA_ROLES[view.role])
      throw new Error("请填写视角名称并选择角色。");
  }
  return withCameraAliases({ ...config, cameras: views });
}
export function effectiveCameraIds(binding, workstation) {
  const allowed = new Set(
    cameraViews(workstation?.aiBaseConfig || {})
      .filter((c) => c.enabled)
      .map((c) => c.deviceId),
  );
  return bindingCameras(binding).filter((id) => allowed.has(id));
}
