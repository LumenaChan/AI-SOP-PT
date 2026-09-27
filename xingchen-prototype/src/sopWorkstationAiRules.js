import { isCapabilityAvailableForConfiguration } from "./aiModelPublishingRules.js";
import {
  deriveWorkstationAiReadiness,
  normalizeWorkstationAiBaseConfig,
} from "./workstationAiRules.js";

export const WORKSTATION_VALIDATION_STATUSES = {
  unvalidated: "未验证",
  validating: "验证中",
  passed: "验证通过",
  failed: "验证不通过",
  pending_revalidation: "待重新验证",
};

export const WORKSTATION_ENABLE_STATUSES = {
  not_enabled: "未启用",
  enabled: "已启用",
  disabled: "已停用",
};

export const VALIDATION_SCENARIOS = [
  { key: "standard", label: "标准流程", kind: "positive" },
  { key: "omission", label: "漏项", kind: "negative" },
  { key: "wrong_order", label: "错序", kind: "negative" },
  { key: "wrong_object", label: "错误对象/工具", kind: "negative" },
  { key: "correction", label: "错误后纠正", kind: "negative" },
  { key: "uncertain", label: "遮挡/不确定", kind: "uncertain" },
  { key: "camera_error", label: "摄像头异常", kind: "technical" },
  { key: "safety", label: "安全场景", kind: "safety" },
];

const OPERATIONAL_WORKSTATION_STATUSES = new Set(["可入场", "使用中"]);

export function isWorkstationSelectable(workstation) {
  return Boolean(
    workstation?.id && OPERATIONAL_WORKSTATION_STATUSES.has(workstation.status),
  );
}

export function activeJudgementItems(aiConfig = {}) {
  const enabledStepIds = new Set(
    (aiConfig.stepConfigs || [])
      .filter((step) =>
        ["visual_auto", "visual_assist_default_pass"].includes(
          step.actualEvaluationMode,
        ),
      )
      .map((step) => step.stepId),
  );
  return (aiConfig.judgementItems || []).filter((item) =>
    enabledStepIds.has(item.stepId),
  );
}

export function requiredLogicalAreas(aiConfig = {}) {
  const requiredIds = new Set(
    activeJudgementItems(aiConfig).flatMap((item) =>
      (item.conditions || [])
        .map((condition) => condition.logicalAreaId)
        .filter(Boolean),
    ),
  );
  return (aiConfig.logicalAreas || []).filter((area) =>
    requiredIds.has(area.id),
  );
}

export function normalizeSopWorkstationAiConfig(config = {}) {
  return {
    ...config,
    id: config.id || "",
    sopAiConfigId: config.sopAiConfigId || "",
    workstationId: config.workstationId || "",
    judgementCameraBindings: Array.isArray(config.judgementCameraBindings)
      ? config.judgementCameraBindings.filter((item) => item?.judgementItemId)
      : [],
    logicalAreaMappings: Array.isArray(config.logicalAreaMappings)
      ? config.logicalAreaMappings.filter((item) => item?.logicalAreaId)
      : [],
    validationStatus: config.validationStatus || "unvalidated",
    enableStatus: config.enableStatus || "not_enabled",
    validationCases: Array.isArray(config.validationCases)
      ? config.validationCases
      : [],
    validationRecords: Array.isArray(config.validationRecords)
      ? config.validationRecords
      : [],
    validationEnvironment: {
      lighting: "正常",
      occlusion: "无遮挡",
      tester: "",
      tools: "",
      note: "",
      ...(config.validationEnvironment || {}),
    },
    lastValidatedAt: config.lastValidatedAt || "",
    lastValidatedBy: config.lastValidatedBy || "",
    lastCriticalConfigChangeAt: config.lastCriticalConfigChangeAt || "",
    createdAt: config.createdAt || "",
    updatedAt: config.updatedAt || "",
  };
}

export function createSopWorkstationAiConfig({
  id,
  aiConfig,
  workstation,
  now,
}) {
  if (!id || !aiConfig?.id || !workstation?.id)
    throw new Error("缺少SOP AI配置或工位ID。");
  if (!isWorkstationSelectable(workstation))
    throw new Error("只能选择当前可入场或使用中的工位。");
  const base = normalizeWorkstationAiBaseConfig(workstation);
  return normalizeSopWorkstationAiConfig({
    id,
    sopAiConfigId: aiConfig.id,
    workstationId: workstation.id,
    judgementCameraBindings: activeJudgementItems(aiConfig).map((item) => ({
      judgementItemId: item.id,
      cameraId: base.primaryCameraId || "",
      source: "primary",
    })),
    validationStatus: "unvalidated",
    enableStatus: "not_enabled",
    createdAt: now,
    updatedAt: now,
    lastCriticalConfigChangeAt: now,
  });
}

function isValidRectangle(mapping) {
  const values = [mapping?.x, mapping?.y, mapping?.width, mapping?.height].map(
    Number,
  );
  if (values.some((value) => !Number.isFinite(value))) return false;
  const [x, y, width, height] = values;
  return (
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x + width <= 100 &&
    y + height <= 100
  );
}

function allowedCameraIds(workstation) {
  const base = normalizeWorkstationAiBaseConfig(workstation);
  return [base.primaryCameraId, base.fallbackCameraId].filter(Boolean);
}

export function checkSopWorkstationAiConfig({
  config,
  aiConfig,
  aiConfigReady,
  workstation,
  devices = [],
  capabilities = [],
}) {
  const normalized = normalizeSopWorkstationAiConfig(config);
  const items = activeJudgementItems(aiConfig);
  const areas = requiredLogicalAreas(aiConfig);
  const base = normalizeWorkstationAiBaseConfig(workstation);
  const readiness = deriveWorkstationAiReadiness({
    workstation,
    devices,
    edgeRequired: true,
  });
  const cameraIds = allowedCameraIds(workstation);
  const issues = [];
  const checks = [];
  const add = (key, label, passed, reason) => {
    checks.push({ key, label, passed, reason: passed ? "" : reason });
    if (!passed && reason) issues.push(reason);
  };

  add(
    "workstation",
    "工位基础状态正常",
    isWorkstationSelectable(workstation),
    `工位业务状态为${workstation?.status || "未知"}`,
  );
  add(
    "readiness",
    "工位AI运行状态可用",
    readiness.code === "available",
    readiness.reasons.join("；"),
  );
  const primary = devices.find((device) => device.id === base.primaryCameraId);
  add(
    "primary_camera",
    "主摄像头存在且视频流可用",
    Boolean(
      primary && primary.status === "在线" && primary.streamStatus === "可用",
    ),
    "主摄像头不存在、离线或视频流不可用",
  );

  const missingBindings = items.filter((item) => {
    const binding = normalized.judgementCameraBindings.find(
      (entry) => entry.judgementItemId === item.id,
    );
    const camera = devices.find((device) => device.id === binding?.cameraId);
    return !(
      binding &&
      cameraIds.includes(binding.cameraId) &&
      camera?.workstationId === workstation?.id &&
      camera.status === "在线" &&
      camera.streamStatus === "可用"
    );
  });
  add(
    "camera_bindings",
    `${items.length}个AI判断项摄像头配置完整`,
    missingBindings.length === 0,
    missingBindings.length
      ? `${missingBindings.map((item) => item.name).join("、")}缺少可用摄像头`
      : "",
  );

  const missingAreas = areas.filter((area) => {
    const mapping = normalized.logicalAreaMappings.find(
      (entry) => entry.logicalAreaId === area.id,
    );
    return !(
      mapping &&
      cameraIds.includes(mapping.cameraId) &&
      isValidRectangle(mapping)
    );
  });
  add(
    "logical_areas",
    `${areas.length}个逻辑区域已映射`,
    missingAreas.length === 0,
    missingAreas.length
      ? `${missingAreas.map((area) => area.name).join("、")}尚未配置实际区域`
      : "",
  );

  const capabilityIds = [
    ...new Set(
      items.flatMap((item) =>
        (item.conditions || []).map((condition) => condition.capabilityId),
      ),
    ),
  ].filter(Boolean);
  const invalidCapabilities = capabilityIds.filter((id) => {
    const capability = capabilities.find((item) => item.id === id);
    return !isCapabilityAvailableForConfiguration(capability);
  });
  add(
    "capabilities",
    `${capabilityIds.length}个引用AI能力均已发布`,
    invalidCapabilities.length === 0,
    invalidCapabilities.length ? "存在已停用、未发布或无当前模型的AI能力" : "",
  );
  add(
    "ai_config",
    "AI能力配置完整",
    Boolean(aiConfigReady),
    "当前SOP的AI能力配置尚未完成",
  );

  return {
    ready: issues.length === 0,
    checks,
    issues: [...new Set(issues)],
    readiness,
    activeJudgementItems: items,
    requiredLogicalAreas: areas,
  };
}

function invalidateValidation(config, now, reason) {
  const current = normalizeSopWorkstationAiConfig(config);
  const hadEffectiveValidation = ["passed", "validating"].includes(
    current.validationStatus,
  );
  return {
    ...current,
    validationStatus: hadEffectiveValidation
      ? "pending_revalidation"
      : current.validationStatus,
    lastCriticalConfigChangeAt: now,
    updatedAt: now,
    validationInvalidationReason: hadEffectiveValidation ? reason : "",
  };
}

export function setJudgementCameraBinding({
  config,
  judgementItemId,
  cameraId,
  workstation,
  now,
}) {
  const current = normalizeSopWorkstationAiConfig(config);
  if (!judgementItemId) throw new Error("AI判断项不存在。");
  if (!allowedCameraIds(workstation).includes(cameraId))
    throw new Error("只能选择当前工位的主摄像头或备用摄像头。");
  const existing = current.judgementCameraBindings.find(
    (item) => item.judgementItemId === judgementItemId,
  );
  if (existing?.cameraId === cameraId) return current;
  const base = normalizeWorkstationAiBaseConfig(workstation);
  return {
    ...invalidateValidation(current, now, "AI判断项摄像头发生变化"),
    judgementCameraBindings: [
      ...current.judgementCameraBindings.filter(
        (item) => item.judgementItemId !== judgementItemId,
      ),
      {
        judgementItemId,
        cameraId,
        source: cameraId === base.primaryCameraId ? "primary" : "fallback",
      },
    ],
  };
}

export function setLogicalAreaMapping({
  config,
  logicalAreaId,
  cameraId,
  rectangle,
  workstation,
  now,
}) {
  if (!logicalAreaId) throw new Error("逻辑区域不存在。");
  if (!allowedCameraIds(workstation).includes(cameraId))
    throw new Error("实际区域只能绑定当前工位的主摄像头或备用摄像头。");
  const mapping = {
    logicalAreaId,
    cameraId,
    x: Number(rectangle?.x),
    y: Number(rectangle?.y),
    width: Number(rectangle?.width),
    height: Number(rectangle?.height),
  };
  if (!isValidRectangle(mapping))
    throw new Error("请在画面范围内绘制有效的矩形区域。");
  const current = normalizeSopWorkstationAiConfig(config);
  const existing = current.logicalAreaMappings.find(
    (item) => item.logicalAreaId === logicalAreaId,
  );
  if (
    existing &&
    ["cameraId", "x", "y", "width", "height"].every(
      (key) => existing[key] === mapping[key],
    )
  )
    return current;
  return {
    ...invalidateValidation(current, now, "实际区域配置发生变化"),
    logicalAreaMappings: [
      ...current.logicalAreaMappings.filter(
        (item) => item.logicalAreaId !== logicalAreaId,
      ),
      mapping,
    ],
  };
}

export function createDefaultValidationCases(aiConfig = {}, makeId) {
  const items = activeJudgementItems(aiConfig);
  const allIds = items.map((item) => item.id);
  const safetyIds = items
    .filter((item) => (item.purposes || []).includes("safety"))
    .map((item) => item.id);
  const firstId = allIds.slice(0, 1);
  const instructions = {
    standard: "按SOP完整执行标准正确流程。",
    omission: "漏做一个关键动作，确认系统能识别缺失且不会误判其他步骤。",
    wrong_order: "调整关键动作顺序，确认系统能区分顺序。",
    wrong_object: "使用错误对象或工具完成动作。",
    correction: "先执行错误动作，再按要求完成纠正。",
    uncertain: "遮挡关键目标，确认系统返回不确定并转人工确认。",
    camera_error: "模拟主摄像头断流，确认停止新的负向自动判断。",
    safety: "模拟安全风险，确认形成候选提醒且允许人工处理。",
  };
  const expected = {
    standard: "全部应判断项按预期成立。",
    omission: "识别漏项，不将技术不确定直接认定为学生错误。",
    wrong_order: "识别错序并按当前配置给出结果。",
    wrong_object: "不把错误对象或工具识别为正确完成。",
    correction: "保留纠正过程并按当前规则输出结果。",
    uncertain: "输出不确定/无法确认，不直接形成学生负向结果。",
    camera_error: "识别技术异常，停止形成新的负向自动判断。",
    safety: "形成安全风险候选，支持人工确认或解除。",
  };
  return VALIDATION_SCENARIOS.map((scenario, index) => ({
    id: makeId ? makeId(scenario.key, index) : `case-${scenario.key}`,
    name: scenario.label,
    scenarioType: scenario.key,
    judgementItemIds:
      scenario.key === "safety"
        ? safetyIds.length
          ? safetyIds
          : allIds
        : scenario.key === "standard" ||
            ["uncertain", "camera_error"].includes(scenario.key)
          ? allIds
          : firstId,
    instruction: instructions[scenario.key],
    expectedResult: expected[scenario.key],
    actualResult: "",
    result: "pending",
    note: "",
  }));
}

export function buildValidationCoverage(aiConfig, cases = []) {
  const items = activeJudgementItems(aiConfig);
  const passedCases = cases.filter((item) => item.result === "passed");
  const rows = items.map((item) => {
    const related = passedCases.filter((entry) =>
      (entry.judgementItemIds || []).includes(item.id),
    );
    return {
      judgementItemId: item.id,
      judgementItemName: item.name,
      covered: related.length > 0,
      caseNames: related.map((entry) => entry.name),
      result: related.length ? "通过" : "未覆盖",
    };
  });
  return {
    rows,
    total: rows.length,
    covered: rows.filter((item) => item.covered).length,
    complete: rows.every((item) => item.covered),
  };
}

export function evaluateValidationCompletion({ aiConfig, cases = [], checks }) {
  const coverage = buildValidationCoverage(aiConfig, cases);
  const executed = cases.filter((item) => item.result !== "pending");
  const scenarioKeys = new Set(executed.map((item) => item.scenarioType));
  const missingScenarios = VALIDATION_SCENARIOS.filter(
    (item) => !scenarioKeys.has(item.key),
  );
  const failedCases = cases.filter((item) => item.result === "failed");
  const issues = [];
  if (!checks?.ready) issues.push("工位配置检查尚未通过");
  if (missingScenarios.length)
    issues.push(
      `尚未执行：${missingScenarios.map((item) => item.label).join("、")}`,
    );
  if (!coverage.complete) issues.push("仍有AI判断项未被通过案例覆盖");
  if (failedCases.length)
    issues.push(`${failedCases.map((item) => item.name).join("、")}验证不通过`);
  if (cases.some((item) => item.result === "pending"))
    issues.push("仍有验证案例未完成");
  return {
    passed: issues.length === 0,
    issues: [...new Set(issues)],
    coverage,
    executedCount: executed.length,
    passedCount: cases.filter((item) => item.result === "passed").length,
    failedCount: failedCases.length,
  };
}

export function deriveSopWorkstationRuntimeStatus({
  config,
  checks,
  readiness,
}) {
  const current = normalizeSopWorkstationAiConfig(config);
  if (current.enableStatus !== "enabled")
    return {
      code: current.enableStatus === "disabled" ? "disabled" : "not_enabled",
      label: current.enableStatus === "disabled" ? "已停用" : "未启用",
      runnable: false,
    };
  if (current.validationStatus === "pending_revalidation")
    return {
      code: "pending_revalidation",
      label: "待重新验证",
      runnable: false,
    };
  if (readiness?.code !== "available")
    return { code: "workstation_abnormal", label: "工位异常", runnable: false };
  if (!checks?.ready)
    return {
      code: "capability_abnormal",
      label: "能力或配置异常",
      runnable: false,
    };
  if (current.validationStatus !== "passed")
    return { code: "not_validated", label: "未通过验证", runnable: false };
  return { code: "runnable", label: "可运行", runnable: true };
}

export function invalidateSopWorkstationConfigs(
  configs,
  predicate,
  now,
  reason,
) {
  let affectedCount = 0;
  const updated = (Array.isArray(configs) ? configs : []).map((config) => {
    if (!predicate(config)) return config;
    const current = normalizeSopWorkstationAiConfig(config);
    if (!["passed", "validating"].includes(current.validationStatus))
      return current;
    affectedCount += 1;
    return {
      ...current,
      validationStatus: "pending_revalidation",
      validationInvalidationReason: reason,
      lastCriticalConfigChangeAt: now,
      updatedAt: now,
    };
  });
  return { configs: updated, affectedCount };
}
