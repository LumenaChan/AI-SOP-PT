import test from "node:test";
import assert from "node:assert/strict";
import {
  applyWorkstationAiBaseConfig,
  deriveWorkstationAiReadiness,
  invalidateWorkstationValidationStates,
  validateWorkstationAiBaseConfig,
} from "../src/workstationAiRules.js";

const workstation = {
  id: "w1",
  status: "可入场",
  updatedAt: "2026-09-27 10:00",
  aiBaseConfig: {},
};
const devices = [
  {
    id: "cam-1",
    type: "全景摄像头",
    workstationId: "w1",
    status: "在线",
    streamStatus: "可用",
  },
  {
    id: "cam-2",
    type: "细节摄像头",
    workstationId: "w1",
    status: "在线",
    streamStatus: "可用",
  },
  {
    id: "edge-1",
    type: "边缘工作站",
    workstationId: "w1",
    status: "在线",
  },
];

test("未配置工位和完整配置工位分别显示未配置与可用", () => {
  assert.equal(
    deriveWorkstationAiReadiness({ workstation, devices }).code,
    "unconfigured",
  );
  const ready = deriveWorkstationAiReadiness({
    workstation: {
      ...workstation,
      aiBaseConfig: {
        primaryCameraId: "cam-1",
        edgeDeviceId: "edge-1",
      },
    },
    devices,
  });
  assert.equal(ready.code, "available");
});

test("摄像头离线或视频流不可用时显示异常", () => {
  const result = deriveWorkstationAiReadiness({
    workstation: {
      ...workstation,
      aiBaseConfig: {
        primaryCameraId: "cam-1",
        edgeDeviceId: "edge-1",
      },
    },
    devices: devices.map((device) =>
      device.id === "cam-1" ? { ...device, streamStatus: "不可用" } : device,
    ),
  });
  assert.equal(result.code, "abnormal");
  assert.match(result.reasons.join("；"), /视频流不可用/);
});

test("工位暂停或维护时即使设备在线也不能标记为可用", () => {
  const result = deriveWorkstationAiReadiness({
    workstation: {
      ...workstation,
      status: "暂停中",
      aiBaseConfig: {
        primaryCameraId: "cam-1",
        edgeDeviceId: "edge-1",
      },
    },
    devices,
  });
  assert.equal(result.code, "pending");
  assert.match(result.reasons.join("；"), /不可正式运行/);
});

test("主摄像头和备用摄像头不能重复且必须来自当前工位", () => {
  assert.throws(
    () =>
      validateWorkstationAiBaseConfig({
        workstation,
        devices,
        input: {
          primaryCameraId: "cam-1",
          fallbackCameraId: "cam-1",
        },
      }),
    /不能选择同一台/,
  );
  assert.throws(
    () =>
      validateWorkstationAiBaseConfig({
        workstation,
        devices: [
          ...devices,
          {
            id: "cam-other",
            type: "全景摄像头",
            workstationId: "w2",
            status: "在线",
          },
        ],
        input: { primaryCameraId: "cam-other" },
      }),
    /未绑定到当前工位/,
  );
});

test("关键设备变更保留配置并把已启用现场状态改为待重新验证", () => {
  const applied = applyWorkstationAiBaseConfig({
    workstation,
    input: { primaryCameraId: "cam-1", edgeDeviceId: "edge-1" },
    devices,
    now: "2026-09-27 10:30",
  });
  assert.equal(applied.criticalChange, true);
  assert.equal(applied.config.lastAiCriticalChangeAt, "2026-09-27 10:30");

  const invalidated = invalidateWorkstationValidationStates(
    [
      {
        id: "config-1",
        workstationValidationStates: [
          { workstationId: "w1", status: "enabled" },
          { workstationId: "w2", status: "enabled" },
        ],
      },
    ],
    "w1",
    "2026-09-27 10:30",
  );
  assert.equal(invalidated.affectedCount, 1);
  assert.equal(
    invalidated.configs[0].workstationValidationStates[0].status,
    "pending_revalidation",
  );
  assert.equal(
    invalidated.configs[0].workstationValidationStates[1].status,
    "enabled",
  );
});
