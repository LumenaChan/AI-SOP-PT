import test from "node:test";
import assert from "node:assert/strict";
import {
  buildValidationCoverage,
  checkSopWorkstationAiConfig,
  createDefaultValidationCases,
  createSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
  evaluateValidationCompletion,
  invalidateSopWorkstationConfigs,
  setJudgementCameraBinding,
  setLogicalAreaMapping,
} from "../src/sopWorkstationAiRules.js";

const aiConfig = {
  id: "config-1",
  status: "pending_validation",
  stepConfigs: [{ stepId: "step-1", actualEvaluationMode: "visual_auto" }],
  judgementItems: [
    {
      id: "item-1",
      stepId: "step-1",
      name: "完成验电",
      purposes: ["completion", "safety"],
      conditions: [
        {
          capabilityId: "cap-1",
          logicalAreaId: "area-1",
        },
      ],
    },
  ],
  logicalAreas: [{ id: "area-1", name: "验电区域" }],
};
const workstation = {
  id: "w1",
  status: "可入场",
  aiBaseConfig: {
    primaryCameraId: "cam-1",
    fallbackCameraId: "cam-2",
    edgeDeviceId: "edge-1",
  },
};
const devices = [
  {
    id: "cam-1",
    workstationId: "w1",
    type: "全景摄像头",
    status: "在线",
    streamStatus: "可用",
  },
  {
    id: "cam-2",
    workstationId: "w1",
    type: "细节摄像头",
    status: "在线",
    streamStatus: "可用",
  },
  {
    id: "edge-1",
    workstationId: "w1",
    type: "边缘工作站",
    status: "在线",
  },
];
const capabilities = [
  {
    id: "cap-1",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "model-1" },
  },
];

function configured() {
  return {
    ...createSopWorkstationAiConfig({
      id: "sw-1",
      aiConfig,
      workstation,
      now: "2026-09-27 10:00",
    }),
    logicalAreaMappings: [
      {
        logicalAreaId: "area-1",
        cameraId: "cam-1",
        x: 10,
        y: 15,
        width: 30,
        height: 25,
      },
    ],
  };
}

test("SOP工位配置用真实ID关联并默认选择主摄像头", () => {
  const result = createSopWorkstationAiConfig({
    id: "sw-1",
    aiConfig,
    workstation,
    now: "2026-09-27 10:00",
  });
  assert.equal(result.sopAiConfigId, "config-1");
  assert.equal(result.workstationId, "w1");
  assert.equal(result.judgementCameraBindings[0].cameraId, "cam-1");
  assert.equal("version" in result, false);
});

test("配置检查要求实际区域、可用工位、已发布能力和当前模型", () => {
  const missing = checkSopWorkstationAiConfig({
    config: createSopWorkstationAiConfig({
      id: "sw-1",
      aiConfig,
      workstation,
      now: "2026-09-27 10:00",
    }),
    aiConfig,
    aiConfigReady: true,
    workstation,
    devices,
    capabilities,
  });
  assert.equal(missing.ready, false);
  assert.match(missing.issues.join("；"), /验电区域尚未配置/);

  const passed = checkSopWorkstationAiConfig({
    config: configured(),
    aiConfig,
    aiConfigReady: true,
    workstation,
    devices,
    capabilities,
  });
  assert.equal(passed.ready, true);
});

test("判断项只能绑定本工位主备摄像头且修改后验证失效", () => {
  assert.throws(
    () =>
      setJudgementCameraBinding({
        config: configured(),
        judgementItemId: "item-1",
        cameraId: "other-camera",
        workstation,
        now: "2026-09-27 11:00",
      }),
    /主摄像头或备用摄像头/,
  );
  const updated = setJudgementCameraBinding({
    config: { ...configured(), validationStatus: "passed" },
    judgementItemId: "item-1",
    cameraId: "cam-2",
    workstation,
    now: "2026-09-27 11:00",
  });
  assert.equal(updated.validationStatus, "pending_revalidation");
  assert.equal(updated.judgementCameraBindings[0].cameraId, "cam-2");
});

test("不同工位实际区域独立并且区域修改触发重新验证", () => {
  const updated = setLogicalAreaMapping({
    config: { ...configured(), validationStatus: "passed" },
    logicalAreaId: "area-1",
    cameraId: "cam-2",
    rectangle: { x: 20, y: 20, width: 25, height: 30 },
    workstation,
    now: "2026-09-27 11:00",
  });
  assert.equal(updated.validationStatus, "pending_revalidation");
  assert.deepEqual(updated.logicalAreaMappings[0], {
    logicalAreaId: "area-1",
    cameraId: "cam-2",
    x: 20,
    y: 20,
    width: 25,
    height: 30,
  });
});

test("八类验证案例通过并覆盖全部判断项后才能形成验证通过", () => {
  const cases = createDefaultValidationCases(aiConfig).map((item) => ({
    ...item,
    actualResult: "模拟结果与预期一致",
    result: "passed",
  }));
  const coverage = buildValidationCoverage(aiConfig, cases);
  assert.equal(coverage.complete, true);
  const result = evaluateValidationCompletion({
    aiConfig,
    cases,
    checks: { ready: true },
  });
  assert.equal(result.passed, true);
  assert.equal(result.executedCount, 8);
});

test("失败案例、未覆盖判断项或配置检查失败都不能启用", () => {
  const cases = createDefaultValidationCases(aiConfig).map((item, index) => ({
    ...item,
    actualResult: "已记录",
    result: index === 1 ? "failed" : "passed",
  }));
  const result = evaluateValidationCompletion({
    aiConfig,
    cases,
    checks: { ready: true },
  });
  assert.equal(result.passed, false);
  assert.match(result.issues.join("；"), /验证不通过/);
});

test("已启用关系在待重新验证或临时工位异常时均不可运行", () => {
  const pending = deriveSopWorkstationRuntimeStatus({
    config: {
      ...configured(),
      enableStatus: "enabled",
      validationStatus: "pending_revalidation",
    },
    checks: { ready: true },
    readiness: { code: "available" },
  });
  assert.equal(pending.runnable, false);
  assert.equal(pending.label, "待重新验证");
  const offline = deriveSopWorkstationRuntimeStatus({
    config: {
      ...configured(),
      enableStatus: "enabled",
      validationStatus: "passed",
    },
    checks: { ready: false },
    readiness: { code: "abnormal" },
  });
  assert.equal(offline.label, "工位异常");
});

test("能力、SOP逻辑或工位关键变化只使有效验证失效并保留配置", () => {
  const result = invalidateSopWorkstationConfigs(
    [
      { ...configured(), validationStatus: "passed", enableStatus: "enabled" },
      { ...configured(), id: "sw-2", workstationId: "w2" },
    ],
    (item) => item.workstationId === "w1",
    "2026-09-27 12:00",
    "主摄像头发生变化",
  );
  assert.equal(result.affectedCount, 1);
  assert.equal(result.configs[0].validationStatus, "pending_revalidation");
  assert.equal(result.configs[0].enableStatus, "enabled");
  assert.equal(result.configs[0].logicalAreaMappings.length, 1);
});

test("教师评价步骤的安全提醒仍参与摄像头、区域和现场验证", () => {
  const teacherConfig = {
    ...aiConfig,
    stepConfigs: [
      {
        stepId: "step-1",
        actualEvaluationMode: "default_pass_manual_deduction",
      },
    ],
    judgementItems: [
      {
        ...aiConfig.judgementItems[0],
        purposes: ["safety"],
      },
      {
        id: "item-non-safety",
        stepId: "step-1",
        name: "教师评分辅助",
        purposes: ["scoring"],
        conditions: [{ capabilityId: "cap-1", logicalAreaId: "area-1" }],
      },
    ],
  };
  const relation = createSopWorkstationAiConfig({
    id: "sw-teacher",
    aiConfig: teacherConfig,
    workstation,
    now: "2026-09-27 13:00",
  });
  assert.deepEqual(
    relation.judgementCameraBindings.map((item) => item.judgementItemId),
    ["item-1"],
  );
  const checks = checkSopWorkstationAiConfig({
    config: relation,
    aiConfig: teacherConfig,
    aiConfigReady: true,
    workstation,
    devices,
    capabilities,
  });
  assert.equal(checks.ready, false);
  assert.match(checks.issues.join("；"), /验电区域尚未配置/);
});
