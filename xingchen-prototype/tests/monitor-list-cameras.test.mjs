import test from "node:test";
import assert from "node:assert/strict";
import { monitorListCameras } from "../src/cameraRules.js";

function fixture() {
  const views = [
    { deviceId: "aux", name: "辅助视角", role: "auxiliary", enabled: true },
    {
      deviceId: "main",
      name: "主视角",
      role: "primary",
      defaultPreview: true,
      enabled: true,
    },
    { deviceId: "third", name: "第三视角", role: "auxiliary", enabled: true },
  ];
  const workstation = { id: "w", aiBaseConfig: { cameras: views } };
  const devices = views.map((c) => ({
    id: c.deviceId,
    workstationId: "w",
    type: "摄像头",
    status: "在线",
    streamStatus: "可用",
  }));
  return { workstation, devices };
}

test("列表预览主视角优先且最多两路，支持任意数量配置，不改配置和快照", () => {
  const input = fixture(),
    before = structuredClone(input);
  const views = monitorListCameras(input.workstation, input.devices);
  assert.deepEqual(
    views.map((v) => v.id),
    ["main", "aux"],
  );
  assert.deepEqual(input, before);
  assert.equal(
    views.some((v) => v.id === "third"),
    false,
  );
});

test("会话已有锁定配置时沿用本次视角，当前工位配置变化不替换历史视角", () => {
  const { workstation, devices } = fixture();
  const session = {
    evaluationSnapshot: {
      workstationAiBaseConfigSnapshot: structuredClone(
        workstation.aiBaseConfig,
      ),
    },
  };
  workstation.aiBaseConfig.cameras = [
    {
      deviceId: "third",
      name: "新配置",
      role: "primary",
      defaultPreview: true,
    },
  ];
  const before = structuredClone(session);
  assert.deepEqual(
    monitorListCameras(workstation, devices, session).map((v) => v.id),
    ["main", "aux"],
  );
  assert.deepEqual(session, before);
});

test("只有一个或没有摄像头时不虚构第二路，禁用视角不显示", () => {
  const { workstation, devices } = fixture();
  workstation.aiBaseConfig.cameras = [workstation.aiBaseConfig.cameras[1]];
  assert.deepEqual(
    monitorListCameras(workstation, devices).map((v) => v.id),
    ["main"],
  );
  workstation.aiBaseConfig.cameras.push({ deviceId: "aux", enabled: false });
  assert.equal(monitorListCameras(workstation, devices).length, 1);
  assert.deepEqual(
    monitorListCameras({ id: "empty", aiBaseConfig: { cameras: [] } }, devices),
    [],
  );
});

test("第二路不可用时保留视角及不可用状态，不用第三路替代，也不显示他人工位画面", () => {
  const { workstation, devices } = fixture();
  devices.find((d) => d.id === "aux").status = "离线";
  let views = monitorListCameras(workstation, devices);
  assert.deepEqual(
    views.map((v) => v.id),
    ["main", "aux"],
  );
  assert.equal(views[0].available, true);
  assert.equal(views[1].available, false);
  devices.find((d) => d.id === "main").workstationId = "other";
  views = monitorListCameras(workstation, devices);
  assert.equal(views[0].available, false);
});
