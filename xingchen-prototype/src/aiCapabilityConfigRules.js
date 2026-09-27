import { isCapabilityAvailableForConfiguration } from "./aiModelPublishingRules.js";

export const AI_CONFIG_STATUSES = {
  unconfigured: "未配置",
  configuring: "配置中",
  pending_validation: "待验证",
  enabled: "已启用",
};

export const AI_ACTUAL_EVALUATION_MODES = {
  visual_auto: "AI自动评价",
  visual_assist_default_pass: "AI辅助评价",
  default_pass_manual_deduction: "教师评价",
};

export const AI_JUDGEMENT_PURPOSES = {
  completion: "完成判断",
  scoring: "评分依据",
  safety: "安全提醒",
};

export const AI_CONDITION_COMBINATIONS = {
  all: "全部满足",
  any: "任一满足",
  sequence: "按顺序满足",
};

export const OBJECT_DETECTION_OPERATORS = {
  appears: "目标出现",
  enters_area: "目标进入逻辑区域",
  in_area: "目标位于逻辑区域",
};

export const ACTION_RECOGNITION_OPERATORS = {
  recognized: "识别到动作",
};

export const FIXED_AI_FALLBACK =
  "AI结果不可靠、摄像头异常或证据不足时，标记为不确定并转人工确认，不直接形成学生负向结果。";

export function allowedActualEvaluationModes(expectedMode) {
  if (expectedMode === "visual_auto")
    return [
      "visual_auto",
      "visual_assist_default_pass",
      "default_pass_manual_deduction",
    ];
  if (expectedMode === "visual_assist_default_pass")
    return ["visual_assist_default_pass", "default_pass_manual_deduction"];
  return ["default_pass_manual_deduction"];
}

export function isEvaluationModeDowngraded(expectedMode, actualMode) {
  return (
    Boolean(actualMode) &&
    allowedActualEvaluationModes(expectedMode)[0] !== actualMode
  );
}

export function createEmptyAiCapabilityConfig(sopId, { id, now, actor } = {}) {
  if (!sopId) throw new Error("缺少SOP ID，无法创建AI能力配置。");
  if (!id) throw new Error("缺少配置ID，无法创建AI能力配置。");
  return {
    id,
    sopId,
    status: "unconfigured",
    stepConfigs: [],
    judgementItems: [],
    logicalAreas: [],
    workstationValidationStates: [],
    createdBy: actor || "系统管理员",
    createdAt: now || "",
    updatedAt: now || "",
  };
}

export function createDefaultStepConfig(stepId, actualEvaluationMode = "") {
  return {
    stepId,
    actualEvaluationMode,
    downgradeReason: "",
    scoreRuleTreatments: [],
    safetyRuleTreatments: [],
  };
}

export function normalizeAiCapabilityConfig(config = {}) {
  return {
    ...config,
    status: config.status || "unconfigured",
    stepConfigs: Array.isArray(config.stepConfigs)
      ? config.stepConfigs
          .filter((item) => item?.stepId)
          .map((item) => ({
            ...createDefaultStepConfig(item.stepId),
            ...item,
            scoreRuleTreatments: Array.isArray(item.scoreRuleTreatments)
              ? item.scoreRuleTreatments.filter((entry) => entry?.ruleId)
              : [],
            safetyRuleTreatments: Array.isArray(item.safetyRuleTreatments)
              ? item.safetyRuleTreatments.filter((entry) => entry?.ruleId)
              : [],
          }))
      : [],
    judgementItems: Array.isArray(config.judgementItems)
      ? config.judgementItems.filter((item) => item?.id && item?.stepId)
      : [],
    logicalAreas: Array.isArray(config.logicalAreas)
      ? config.logicalAreas.filter((item) => item?.id)
      : [],
    workstationValidationStates: Array.isArray(
      config.workstationValidationStates,
    )
      ? config.workstationValidationStates
      : [],
  };
}

function stepRules(sop, stepId, type) {
  return (Array.isArray(sop?.[type]) ? sop[type] : []).filter(
    (rule) => rule?.id && rule.stepId === stepId,
  );
}

function itemHasPurpose(item, purpose) {
  return Array.isArray(item?.purposes) && item.purposes.includes(purpose);
}

function validCapabilityMap(capabilities) {
  return new Map(
    (Array.isArray(capabilities) ? capabilities : [])
      .filter(isCapabilityAvailableForConfiguration)
      .map((item) => [item.id, item]),
  );
}

function validateCondition(condition, capabilities, logicalAreas) {
  const issues = [];
  const capability = capabilities.get(condition?.capabilityId);
  if (!capability) {
    issues.push("引用的AI能力不存在、未发布或当前没有可用模型");
    return issues;
  }
  if (capability.type === "object_detection") {
    if (!OBJECT_DETECTION_OPERATORS[condition?.operator])
      issues.push("目标检测条件类型未设置");
    if (
      ["enters_area", "in_area"].includes(condition?.operator) &&
      !logicalAreas.some(
        (area) => area.id === condition.logicalAreaId && area.name?.trim(),
      )
    )
      issues.push("需要逻辑区域的条件必须选择有效区域");
    if (Number(condition?.minTargetCount) < 1)
      issues.push("最少目标数量必须大于0");
    if (Number(condition?.minDurationSeconds) < 0)
      issues.push("最短持续时间不能小于0");
    if (Number(condition?.minOccurrences) < 1)
      issues.push("最少出现次数必须大于0");
  } else if (capability.type === "action_recognition") {
    if (!ACTION_RECOGNITION_OPERATORS[condition?.operator])
      issues.push("动作识别条件类型未设置");
    if (Number(condition?.minOccurrences) < 1)
      issues.push("最少识别次数必须大于0");
    if (typeof condition?.withinCurrentStep !== "boolean")
      issues.push("请明确动作是否需要发生在当前步骤有效时间内");
  } else {
    issues.push("AI能力类型无效");
  }
  return issues;
}

export function validateAiJudgementItem({
  item,
  sop,
  capabilities = [],
  logicalAreas = [],
} = {}) {
  const issues = [];
  const step = (sop?.steps || []).find((entry) => entry.id === item?.stepId);
  if (!step) issues.push("关联步骤不存在");
  if (!String(item?.name || "").trim()) issues.push("判断项名称不能为空");
  const purposes = [...new Set(item?.purposes || [])].filter(
    (purpose) => AI_JUDGEMENT_PURPOSES[purpose],
  );
  if (!purposes.length) issues.push("至少选择一个判断用途");
  const scoreRuleIds = new Set(
    stepRules(sop, item?.stepId, "scoreRules").map((rule) => rule.id),
  );
  const safetyRuleIds = new Set(
    stepRules(sop, item?.stepId, "safetyRules").map((rule) => rule.id),
  );
  if (
    purposes.includes("scoring") &&
    !(item?.scoreRuleIds || []).some((id) => scoreRuleIds.has(id))
  )
    issues.push("评分用途必须关联当前步骤至少一条教师评分规则");
  if (
    purposes.includes("safety") &&
    !(item?.safetyRuleIds || []).some((id) => safetyRuleIds.has(id))
  )
    issues.push("安全用途必须关联当前步骤至少一条教师安全规则");
  const conditions = Array.isArray(item?.conditions) ? item.conditions : [];
  if (!conditions.length) issues.push("至少引用一个已发布AI能力条件");
  if (!AI_CONDITION_COMBINATIONS[item?.combination])
    issues.push("请选择有效的条件组合方式");
  if (item?.combination === "sequence" && conditions.length < 2)
    issues.push("按顺序满足至少需要两个条件");
  const published = validCapabilityMap(capabilities);
  conditions.forEach((condition, index) => {
    validateCondition(condition, published, logicalAreas).forEach((issue) =>
      issues.push(`条件${index + 1}：${issue}`),
    );
  });
  return [...new Set(issues)];
}

function validateRuleTreatments({ rules, treatments, items, purpose, label }) {
  const issues = [];
  rules.forEach((rule) => {
    const treatment = treatments.find((entry) => entry.ruleId === rule.id);
    if (!treatment?.mode) {
      issues.push(`${label}“${rule.name || rule.id}”尚未设置处理方式`);
      return;
    }
    if (treatment.mode === "teacher") {
      if (!String(treatment.reason || "").trim())
        issues.push(
          `${label}“${rule.name || rule.id}”由教师处理时必须填写原因`,
        );
      return;
    }
    if (treatment.mode !== "ai") {
      issues.push(`${label}“${rule.name || rule.id}”的处理方式无效`);
      return;
    }
    const linked = items.find(
      (item) =>
        item.id === treatment.judgementItemId &&
        itemHasPurpose(item, purpose) &&
        (purpose === "scoring"
          ? item.scoreRuleIds
          : item.safetyRuleIds
        )?.includes(rule.id),
    );
    if (!linked)
      issues.push(
        `${label}“${rule.name || rule.id}”由AI处理时必须关联匹配用途的判断项`,
      );
  });
  return issues;
}

export function evaluateAiCapabilityConfig({
  sop,
  config,
  capabilities = [],
} = {}) {
  const normalized = normalizeAiCapabilityConfig(config || {});
  const steps = Array.isArray(sop?.steps) ? sop.steps : [];
  const logicalAreas = normalized.logicalAreas;
  const itemIssues = new Map();
  normalized.judgementItems.forEach((item) =>
    itemIssues.set(
      item.id,
      validateAiJudgementItem({ item, sop, capabilities, logicalAreas }),
    ),
  );
  const stepResults = steps.map((step) => {
    const issues = [];
    const expected = step.expectedJudgementMode || step.judgementMode;
    const stepConfig = normalized.stepConfigs.find(
      (item) => item.stepId === step.id,
    );
    const items = normalized.judgementItems.filter(
      (item) => item.stepId === step.id,
    );
    if (!stepConfig?.actualEvaluationMode) {
      issues.push("尚未设置实际评价方式");
    } else if (
      !allowedActualEvaluationModes(expected).includes(
        stepConfig.actualEvaluationMode,
      )
    ) {
      issues.push("实际评价方式不能高于教师期望");
    } else if (
      isEvaluationModeDowngraded(expected, stepConfig.actualEvaluationMode) &&
      !String(stepConfig.downgradeReason || "").trim()
    ) {
      issues.push("评价方式降级时必须填写原因");
    }
    if (
      stepConfig?.actualEvaluationMode === "visual_auto" &&
      !items.some((item) => itemHasPurpose(item, "completion"))
    )
      issues.push("AI自动评价步骤至少需要一个完成判断项");
    if (
      stepConfig?.actualEvaluationMode === "visual_assist_default_pass" &&
      !items.length
    )
      issues.push("AI辅助评价步骤至少需要一个AI判断项提供辅助证据");
    if (
      stepConfig?.actualEvaluationMode === "default_pass_manual_deduction" &&
      items.some((item) =>
        (item.purposes || []).some((purpose) => purpose !== "safety"),
      )
    )
      issues.push("教师评价步骤的AI判断项只能用于安全提醒");
    issues.push(
      ...validateRuleTreatments({
        rules: stepRules(sop, step.id, "scoreRules"),
        treatments: stepConfig?.scoreRuleTreatments || [],
        items,
        purpose: "scoring",
        label: "评分规则",
      }),
      ...validateRuleTreatments({
        rules: stepRules(sop, step.id, "safetyRules"),
        treatments: stepConfig?.safetyRuleTreatments || [],
        items,
        purpose: "safety",
        label: "安全规则",
      }),
    );
    items.forEach((item) =>
      (itemIssues.get(item.id) || []).forEach((issue) =>
        issues.push(`判断项“${item.name || item.id}”：${issue}`),
      ),
    );
    const hasStarted = Boolean(
      stepConfig?.actualEvaluationMode ||
        items.length ||
        stepConfig?.scoreRuleTreatments?.length ||
        stepConfig?.safetyRuleTreatments?.length,
    );
    const status = !hasStarted
      ? "unconfigured"
      : issues.length
        ? "configuring"
        : stepConfig.actualEvaluationMode === "default_pass_manual_deduction" &&
            !items.length
          ? "no_ai"
          : "complete";
    return { stepId: step.id, status, issues };
  });
  const issues = stepResults.flatMap((result) =>
    result.issues.map((issue) => `${result.stepId}：${issue}`),
  );
  const ready = steps.length > 0 && issues.length === 0;
  const distinctCapabilityIds = [
    ...new Set(
      normalized.judgementItems.flatMap((item) =>
        (item.conditions || []).map((condition) => condition.capabilityId),
      ),
    ),
  ].filter(Boolean);
  const hasContent = Boolean(
    normalized.stepConfigs.some((item) => item.actualEvaluationMode) ||
      normalized.judgementItems.length ||
      normalized.logicalAreas.length,
  );
  const status = !hasContent
    ? "unconfigured"
    : normalized.status === "enabled" && ready
      ? "enabled"
      : normalized.status === "pending_validation" && ready
        ? "pending_validation"
        : "configuring";
  return {
    ready,
    status,
    statusLabel: AI_CONFIG_STATUSES[status],
    issues,
    stepResults,
    totalSteps: steps.length,
    configuredStepCount: stepResults.filter((item) =>
      ["complete", "no_ai"].includes(item.status),
    ).length,
    judgementItemCount: normalized.judgementItems.length,
    distinctCapabilityIds,
    logicalAreaCount: logicalAreas.length,
    modeCounts: {
      automatic: normalized.stepConfigs.filter(
        (item) => item.actualEvaluationMode === "visual_auto",
      ).length,
      assisted: normalized.stepConfigs.filter(
        (item) => item.actualEvaluationMode === "visual_assist_default_pass",
      ).length,
      teacher: normalized.stepConfigs.filter(
        (item) => item.actualEvaluationMode === "default_pass_manual_deduction",
      ).length,
    },
  };
}

export function completeAiCapabilityConfig({ sop, config, capabilities, now }) {
  const evaluation = evaluateAiCapabilityConfig({ sop, config, capabilities });
  if (!evaluation.ready)
    throw new Error(evaluation.issues[0] || "AI能力配置尚未通过完整性检查。");
  return {
    ...normalizeAiCapabilityConfig(config),
    status: "pending_validation",
    completedAt: now || "",
    updatedAt: now || "",
  };
}

export function applyAiConfigMutation(config, patch, now) {
  const current = normalizeAiCapabilityConfig(config);
  return {
    ...current,
    ...patch,
    status: "configuring",
    completedAt: "",
    updatedAt: now || current.updatedAt,
  };
}

export function capabilityConfigReferenceIds(configs, capabilityId) {
  return (Array.isArray(configs) ? configs : [])
    .filter((config) =>
      (config?.judgementItems || []).some((item) =>
        (item.conditions || []).some(
          (condition) => condition.capabilityId === capabilityId,
        ),
      ),
    )
    .map((config) => config.id);
}
