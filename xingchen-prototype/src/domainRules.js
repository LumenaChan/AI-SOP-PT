export const JUDGEMENT_MODES = {
  visual_auto: {
    label: "自动评价",
    shortLabel: "自动评价",
    description:
      "摄像头可以较稳定识别该步骤的主要操作过程，系统可自动参与评价。",
  },
  visual_assist_default_pass: {
    label: "AI辅助评价",
    shortLabel: "AI辅助评价",
    description:
      "系统能够辅助判断；画面遮挡、证据不足或无法确认时，不自动扣分，由教师按需复核。",
  },
  default_pass_manual_deduction: {
    label: "教师评价",
    shortLabel: "教师评价",
    description:
      "该步骤无法仅依赖摄像头可靠判断，系统默认不扣分，需要时由教师根据现场或其他证据处理。",
  },
};

export const INCOMPLETE_POLICIES = {
  zero_score: {
    label: "本步骤 0 分",
    description: "步骤未完整完成时，本步骤计 0 分。",
  },
  rule_based: {
    label: "按评分规则计算",
    description: "步骤未完整完成时，按教师定义的评分规则计算剩余分值。",
  },
  teacher_review: {
    label: "教师评定",
    description: "步骤未完整完成时，由教师根据有效证据确定成绩。",
  },
};

export const SCORE_RULE_TYPES = {
  omission: "动作遗漏",
  wrong_order: "顺序错误",
  wrong_tool: "工具错误",
  repeat: "重复操作",
  timeout: "操作超时",
  quality: "质量不符合",
  other: "其他错误",
};

export const SCORE_DEDUCTION_MODES = {
  fixed_deduction: "固定扣分",
  zero_step: "本步骤 0 分",
};

export const CORRECTION_TREATMENTS = {
  keep_deduction: "纠正后仍保留扣分",
  cancel_after_correction: "纠正完成后撤销本次扣分",
  teacher_review: "纠正后由教师确认",
};

export const SAFETY_SESSION_TREATMENTS = {
  pause_for_review: "暂停并等待教师确认",
  continue_after_review: "教师确认安全后可继续",
  terminate_after_confirmation: "确认违规后终止本次评价",
};

export const SAFETY_SCORE_TREATMENTS = {
  no_score_effect: "不直接影响成绩",
  fixed_deduction: "固定扣分",
  zero_step: "本步骤 0 分",
  teacher_review: "由教师决定",
};

export const EVALUATION_ITEM_ROLES = {
  completion: "完成判断",
  scoring: "评分依据",
  safety: "安全提醒",
};

export const MACHINE_EVENT_CAPABILITY_MODES = {
  existing_capability: "Existing Capability",
  configuration_only: "Configuration Only",
  training_required: "Training Required",
};

export const EVALUATION_MAPPING_STATUSES = {
  draft: "配置中",
  coverage_blocked: "配置中",
  pending_teacher_confirmation: "待教师确认",
  confirmed: "已确认",
  changes_requested: "配置中",
};

export const FIELD_VALIDATION_SCENARIOS = [
  ["standard_flow", "标准流程"],
  ["missing_step", "漏步"],
  ["wrong_order", "错序"],
  ["wrong_tool", "错工具"],
  ["correction", "错误后纠正"],
  ["uncertain_or_occluded", "AI不确定 / 遮挡"],
  ["camera_offline", "摄像头掉线"],
  ["safety_redline", "安全红线"],
];

export const RECORDING_STATUSES = ["完整", "部分缺失", "不可用"];

export const DIAGNOSTIC_ROOT_CAUSES = [
  "模型",
  "ROI",
  "SOP配置",
  "系统",
  "非AI问题",
  "未知",
];

export const NO_TRIGGER_REASONS = {
  objectMissing: "未看到对象",
  actionInsufficient: "动作不足",
  roiMismatch: "区域不符",
  evidenceInterrupted: "证据中断",
  configMissing: "配置缺失",
};

export function isDefaultPassMode(mode) {
  return [
    "visual_assist_default_pass",
    "default_pass_manual_deduction",
  ].includes(mode);
}

export function createSopStepDraft({
  id = "Step 01",
  predecessor = "无",
  score = 10,
} = {}) {
  return {
    id,
    name: "",
    predecessor,
    timeout: "01:00",
    score,
    completionCondition: "",
    teachingInstruction: "",
    keyPoints: "",
    commonMistakes: "",
    standardMediaType: "示教图片",
    standardMediaUrl: "/assets/student-monitor-hand-tracking.png",
    evidence: "",
    incompletePolicy: "",
    flowPolicy: createDefaultFlowPolicy(),
    expectedJudgementMode: "visual_assist_default_pass",
    judgementMode: "visual_assist_default_pass",
    knownLimit:
      "遮挡、低置信度或录像缺失时不做负向推断，系统默认通过并提示抽查。",
    legacyScoringNote: "",
    legacySafetyNote: "",
  };
}

export function createDefaultFlowPolicy() {
  return {
    wrongOrder: { treatment: "teacher_review", scoreRuleId: "" },
    repeat: { treatment: "allow", scoreRuleId: "" },
    timeout: { treatment: "record_only", scoreRuleId: "" },
  };
}

export function createScoreRuleDraft({ id, stepId } = {}) {
  return {
    id: id || `SR-${String(stepId || "STEP").replace(/\s+/g, "-")}-01`,
    stepId: stepId || "",
    name: "",
    type: "omission",
    deductionMode: "fixed_deduction",
    deductionValue: 5,
    maxTriggerCount: 1,
    correctionTreatment: "keep_deduction",
    description: "",
  };
}

export function createSafetyRuleDraft({ id, stepId } = {}) {
  return {
    id: id || `SAFE-${String(stepId || "STEP").replace(/\s+/g, "-")}-01`,
    stepId: stepId || "",
    name: "",
    violationCondition: "",
    sessionTreatment: "pause_for_review",
    scoreTreatment: "teacher_review",
    deductionValue: 0,
    enabled: true,
  };
}

export function nextBusinessRuleId({ rules = [], stepId, prefix = "SR" } = {}) {
  const escapedStepId = String(stepId || "STEP").replace(/\s+/g, "-");
  const matcher = new RegExp(`^${prefix}-${escapedStepId}-(\\d+)$`);
  const max = rules.reduce((value, rule) => {
    const match = String(rule?.id || "").match(matcher);
    return Math.max(value, Number(match?.[1] || 0));
  }, 0);
  return `${prefix}-${escapedStepId}-${String(max + 1).padStart(2, "0")}`;
}

export function normalizeScoreRule(rule = {}, index = 0) {
  return {
    ...rule,
    id: rule.id || `SR-LEGACY-${String(index + 1).padStart(2, "0")}`,
    stepId: rule.stepId || "",
    name: rule.name || "",
    type: rule.type || "other",
    deductionMode: rule.deductionMode || "fixed_deduction",
    deductionValue: Number(rule.deductionValue || 0),
    maxTriggerCount: Math.max(1, Number(rule.maxTriggerCount || 1)),
    correctionTreatment: rule.correctionTreatment || "keep_deduction",
    description: rule.description || "",
  };
}

export function normalizeSafetyRule(rule = {}, index = 0) {
  return {
    ...rule,
    id: rule.id || `SAFE-LEGACY-${String(index + 1).padStart(2, "0")}`,
    stepId: rule.stepId || "",
    name: rule.name || "",
    violationCondition: rule.violationCondition || "",
    sessionTreatment: rule.sessionTreatment || "pause_for_review",
    scoreTreatment: rule.scoreTreatment || "teacher_review",
    deductionValue: Number(rule.deductionValue || 0),
    enabled: rule.enabled !== false,
  };
}

function normalizeFlowAction(action, fallback) {
  if (action && typeof action === "object") {
    return {
      treatment: action.treatment || fallback,
      scoreRuleId: action.scoreRuleId || "",
    };
  }
  return { treatment: fallback, scoreRuleId: "" };
}

export function normalizeFlowPolicy(step = {}) {
  const policy = step.flowPolicy || {};
  return {
    wrongOrder: normalizeFlowAction(
      policy.wrongOrder,
      step.orderPolicy === "提醒后继续" ? "allow" : "teacher_review",
    ),
    repeat: normalizeFlowAction(
      policy.repeat,
      step.repeatPolicy === "允许重复" || step.repeatPolicy === "允许一次重复"
        ? "allow"
        : "teacher_review",
    ),
    timeout: normalizeFlowAction(
      policy.timeout,
      step.timeoutPolicy === "仅记录超时" ? "record_only" : "teacher_review",
    ),
  };
}

export function nextStableStepId({
  steps = [],
  historicalSteps = [],
  usedStepIds = [],
} = {}) {
  const ids = [
    ...steps.map((step) => step?.id),
    ...historicalSteps.map((step) => step?.id),
    ...usedStepIds,
  ].filter(Boolean);
  const max = ids.reduce((value, id) => {
    const number = Number(String(id).match(/\d+/)?.[0] || 0);
    return Math.max(value, number);
  }, 0);
  return `Step ${String(max + 1).padStart(2, "0")}`;
}

export function normalizeSopStep(step = {}, index = 0) {
  const text = `${step.name || ""}${step.completionCondition || ""}${step.evidence || ""}`;
  const inferredMode = /扭矩|力度|重量|内部状态|声音|读数精度/.test(text)
    ? "default_pass_manual_deduction"
    : "visual_auto";
  const expectedJudgementMode =
    step.expectedJudgementMode || step.judgementMode || inferredMode;
  const limitByMode = {
    visual_auto: "关键动作和目标区域需要持续出现在画面内。",
    visual_assist_default_pass:
      "遮挡、低置信度或录像缺失时不做负向推断，系统默认通过并提示抽查。",
    default_pass_manual_deduction:
      "该要求无法仅凭摄像头画面可靠确认，系统默认通过；教师发现问题后可留痕扣分。",
  };
  const repeatPolicyMap = {
    重复即提示并扣分: "重复扣分",
    重复即进入人工复核: "进入教师复核",
  };
  const timeoutPolicyMap = {
    超时进入人工复核: "进入教师复核",
    超时终止评价: "终止本次评价",
  };
  return {
    ...step,
    expectedJudgementMode,
    judgementMode: expectedJudgementMode,
    judgementModeSource:
      step.judgementModeSource ||
      (step.expectedJudgementMode || step.judgementMode
        ? "teacher_defined"
        : "legacy_inferred"),
    incompletePolicy:
      step.incompletePolicy === undefined
        ? "legacy_unspecified"
        : step.incompletePolicy,
    flowPolicy: normalizeFlowPolicy(step),
    knownLimit: step.knownLimit || limitByMode[expectedJudgementMode],
    teachingInstruction:
      step.teachingInstruction ||
      step.completionCondition ||
      `按标准完成第 ${index + 1} 步操作。`,
    keyPoints:
      step.keyPoints ||
      step.evidence ||
      "保持操作区域清晰可见并按规定顺序完成。",
    commonMistakes:
      step.commonMistakes ||
      step.deductionRule ||
      "顺序错误、动作遗漏或工具使用不规范。",
    standardMediaType: step.standardMediaType || "示教图片",
    standardMediaUrl:
      step.standardMediaUrl || "/assets/student-monitor-hand-tracking.png",
    legacyScoringNote: step.legacyScoringNote || step.deductionRule || "",
    legacySafetyNote: step.legacySafetyNote || step.redline || "",
    legacyFlowNote:
      step.legacyFlowNote ||
      [
        step.skipPolicy && `跳过：${step.skipPolicy}`,
        step.orderPolicy &&
          `错序：${repeatPolicyMap[step.orderPolicy] || step.orderPolicy}`,
        step.repeatPolicy &&
          `重复：${repeatPolicyMap[step.repeatPolicy] || step.repeatPolicy}`,
        step.timeoutPolicy &&
          `超时：${timeoutPolicyMap[step.timeoutPolicy] || step.timeoutPolicy}`,
      ]
        .filter(Boolean)
        .join("；"),
    legacyTechnicalConfig:
      step.legacyTechnicalConfig ||
      (step.confirmFrames || step.minConfidence
        ? {
            confirmFrames: Number(step.confirmFrames || 5),
            minConfidence: String(step.minConfidence || "0.80"),
          }
        : null),
  };
}

export function validateScoreRule(rule = {}, step = {}) {
  const normalized = normalizeScoreRule(rule);
  const issues = [];
  if (!normalized.name.trim()) issues.push("未填写错误名称");
  if (!SCORE_RULE_TYPES[normalized.type]) issues.push("错误类型无效");
  if (!SCORE_DEDUCTION_MODES[normalized.deductionMode])
    issues.push("扣分方式无效");
  if (
    normalized.deductionMode === "fixed_deduction" &&
    (!(normalized.deductionValue > 0) ||
      normalized.deductionValue > Number(step.score || Infinity))
  )
    issues.push("固定扣分值必须大于0且不超过步骤满分");
  if (
    !Number.isInteger(normalized.maxTriggerCount) ||
    normalized.maxTriggerCount < 1
  )
    issues.push("最大触发次数必须是正整数");
  if (!CORRECTION_TREATMENTS[normalized.correctionTreatment])
    issues.push("纠正后处理无效");
  return issues;
}

export function validateSafetyRule(rule = {}, step = {}) {
  const normalized = normalizeSafetyRule(rule);
  const issues = [];
  if (!normalized.name.trim()) issues.push("未填写安全规则名称");
  if (!normalized.violationCondition.trim()) issues.push("未填写违规成立条件");
  if (!SAFETY_SESSION_TREATMENTS[normalized.sessionTreatment])
    issues.push("安全处置方式无效");
  if (!SAFETY_SCORE_TREATMENTS[normalized.scoreTreatment])
    issues.push("成绩处理方式无效");
  if (
    normalized.scoreTreatment === "fixed_deduction" &&
    (!(normalized.deductionValue > 0) ||
      normalized.deductionValue > Number(step.score || Infinity))
  )
    issues.push("固定扣分值必须大于0且不超过步骤满分");
  return issues;
}

export function validateSopDefinition(draft = {}) {
  const issues = [];
  const add = (stage, message, stepIndex = null) =>
    issues.push({ stage, message, stepIndex });
  if (!draft.name?.trim()) add(0, "未填写 SOP 名称");
  if (!draft.operation?.trim()) add(0, "未填写适用操作");
  if (!draft.basis?.trim()) add(0, "未填写标准依据");
  if (!draft.conditions?.trim()) add(0, "未填写适用实训环境");
  if (!draft.steps?.length) add(1, "至少需要一个操作步骤");

  const scoreRules = (draft.scoreRules || []).map(normalizeScoreRule);
  const safetyRules = (draft.safetyRules || []).map(normalizeSafetyRule);
  const ids = new Set();
  for (const [index, source] of (draft.steps || []).entries()) {
    const step = normalizeSopStep(source, index);
    if (ids.has(step.id)) add(1, `${step.id} 重复`, index);
    ids.add(step.id);
    if (!step.name?.trim()) add(1, `${step.id} 未填写步骤名称`, index);
    if (!step.completionCondition?.trim())
      add(1, `${step.id} 未填写完成条件`, index);
    if (!step.teachingInstruction?.trim())
      add(1, `${step.id} 未填写标准操作说明`, index);
    if (!step.keyPoints?.trim()) add(1, `${step.id} 未填写操作要点`, index);
    if (source.attribute && !["必做", "required"].includes(source.attribute))
      add(1, `${step.id} 仍为可选或分支步骤，请调整为线性必做步骤`, index);
    const expectedPredecessor = index === 0 ? "无" : draft.steps[index - 1]?.id;
    if (step.predecessor !== expectedPredecessor)
      add(1, `${step.id} 前置步骤必须为 ${expectedPredecessor}`, index);
    if (!JUDGEMENT_MODES[step.expectedJudgementMode])
      add(2, `${step.id} 未选择有效的期望评价方式`, index);
    if (!INCOMPLETE_POLICIES[step.incompletePolicy])
      add(2, `${step.id} 未明确步骤未完成时如何计分`, index);
    if (
      step.expectedJudgementMode !== "default_pass_manual_deduction" &&
      !step.evidence?.trim()
    )
      add(2, `${step.id} 未填写评价证据要求`, index);
    if (
      step.expectedJudgementMode !== "visual_auto" &&
      !step.knownLimit?.trim()
    )
      add(2, `${step.id} 未填写视频评价限制`, index);
    if (!/^\d{2}:\d{2}$/.test(step.timeout || ""))
      add(1, `${step.id} 建议完成时间格式应为 mm:ss`, index);
    if (!(Number(step.score) > 0)) add(2, `${step.id} 分值必须大于 0`, index);

    for (const rule of scoreRules.filter((item) => item.stepId === step.id)) {
      for (const problem of validateScoreRule(rule, step))
        add(2, `${step.id} · ${rule.name || rule.id}：${problem}`, index);
    }
    for (const rule of safetyRules.filter((item) => item.stepId === step.id)) {
      for (const problem of validateSafetyRule(rule, step))
        add(2, `${step.id} · ${rule.name || rule.id}：${problem}`, index);
    }
    for (const [label, action] of [
      ["顺序错误", step.flowPolicy.wrongOrder],
      ["重复操作", step.flowPolicy.repeat],
      ["操作超时", step.flowPolicy.timeout],
    ]) {
      if (action.treatment === "apply_score_rule") {
        const rule = scoreRules.find(
          (item) => item.id === action.scoreRuleId && item.stepId === step.id,
        );
        if (!rule) add(2, `${step.id} ${label}未关联有效评分规则`, index);
      }
    }
  }

  const validStepIds = new Set((draft.steps || []).map((step) => step.id));
  for (const rule of [...scoreRules, ...safetyRules]) {
    if (!validStepIds.has(rule.stepId)) add(2, `${rule.id} 关联的步骤不存在`);
  }
  const allRuleIds = [...scoreRules, ...safetyRules].map((rule) => rule.id);
  if (new Set(allRuleIds).size !== allRuleIds.length)
    add(2, "评分规则或安全规则存在重复 ID");

  const total = (draft.steps || []).reduce(
    (sum, step) => sum + Number(step.score || 0),
    0,
  );
  if (total !== 100) add(2, `步骤总分为 ${total}，必须等于 100`);
  return issues;
}

export function normalizeEvaluationItem(item = {}, index = 0) {
  return {
    ...item,
    id: item.id || `EI-${String(index + 1).padStart(3, "0")}`,
    stepId: item.stepId || "",
    name: item.name || "",
    type: item.type || "业务判断项",
    roles: [...new Set(item.roles || [])],
    sourceCompletion: item.sourceCompletion || "",
    sourceScoreRuleIds: [...new Set(item.sourceScoreRuleIds || [])],
    sourceSafetyRuleIds: [...new Set(item.sourceSafetyRuleIds || [])],
    machineEventIds: [...new Set(item.machineEventIds || [])],
    scoreTreatment: {
      type: item.scoreTreatment?.type || "",
      note: item.scoreTreatment?.note || "",
    },
    fallback: item.fallback || "no_negative_auto_decision",
  };
}

export function normalizeMachineEvent(event = {}, index = 0) {
  return {
    ...event,
    id: event.id || `ME-${String(index + 1).padStart(3, "0")}`,
    name: event.name || "",
    factDefinition: event.factDefinition || "",
    capabilityMode: event.capabilityMode || "existing_capability",
    existingCapabilityRef: event.existingCapabilityRef || "",
    implementationNote: event.implementationNote || "",
  };
}

export function normalizeEvaluationMapping(mapping = {}, index = 0) {
  return {
    ...mapping,
    id: mapping.id || `mapping-${index + 1}`,
    version: mapping.version || `MAP${index + 1}`,
    status: mapping.status || "draft",
    authoredFor: {
      sopId: mapping.authoredFor?.sopId || mapping.sopId || "",
      sopVersion: mapping.authoredFor?.sopVersion || mapping.sopVersion || "",
    },
    compatibleSopVersions: Array.isArray(mapping.compatibleSopVersions)
      ? mapping.compatibleSopVersions
      : [],
    evaluationItems: (mapping.evaluationItems || []).map(
      normalizeEvaluationItem,
    ),
    machineEvents: (mapping.machineEvents || []).map(normalizeMachineEvent),
    teacherConfirmation: {
      status: mapping.teacherConfirmation?.status || "未确认",
      teacher: mapping.teacherConfirmation?.teacher || "",
      comment: mapping.teacherConfirmation?.comment || "",
      confirmedAt: mapping.teacherConfirmation?.confirmedAt || "",
    },
  };
}

export function isMappingApplicableToSop(mapping = {}, sop = {}) {
  const normalized = normalizeEvaluationMapping(mapping);
  if (
    normalized.authoredFor.sopId === sop.id &&
    normalized.authoredFor.sopVersion === sop.version
  )
    return true;
  return normalized.compatibleSopVersions.some(
    (reference) =>
      reference.sopVersion === sop.version &&
      (reference.sopId === sop.id ||
        (reference.sopFamilyId && reference.sopFamilyId === sop.familyId)),
  );
}

export function getMappingStatusForSop({ sop, mappings = [] } = {}) {
  const applicable = mappings
    .map(normalizeEvaluationMapping)
    .filter((mapping) => isMappingApplicableToSop(mapping, sop))
    .sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );
  const mapping = applicable[0] || null;
  return {
    status: mapping
      ? EVALUATION_MAPPING_STATUSES[mapping.status] || "配置中"
      : "未建立",
    mapping,
    confirmed: mapping?.status === "confirmed",
  };
}

export function checkCompletionScoringCoverage({
  sop = {},
  mapping = {},
} = {}) {
  const normalized = normalizeEvaluationMapping(mapping);
  const scoreRules = (sop.scoreRules || []).map(normalizeScoreRule);
  const issues = [];
  let totalCount = 0;
  let coveredCount = 0;
  const byStep = [];

  for (const source of sop.steps || []) {
    const step = normalizeSopStep(source);
    if (step.incompletePolicy !== "rule_based") continue;
    const completionItems = normalized.evaluationItems.filter(
      (item) => item.stepId === step.id && item.roles.includes("completion"),
    );
    const stepIssues = [];
    if (!completionItems.length) {
      stepIssues.push(`${step.id} 尚未配置承担完成判断的评价项`);
    }
    for (const item of completionItems) {
      totalCount += 1;
      if (item.scoreTreatment.type === "score_rule") {
        const validRuleIds = item.sourceScoreRuleIds.filter((ruleId) =>
          scoreRules.some(
            (rule) => rule.id === ruleId && rule.stepId === step.id,
          ),
        );
        if (!validRuleIds.length) {
          stepIssues.push(`${item.name || item.id} 未关联本步骤的有效评分规则`);
          continue;
        }
        coveredCount += 1;
        continue;
      }
      if (
        item.scoreTreatment.type === "no_deduction" &&
        item.scoreTreatment.note.trim()
      ) {
        coveredCount += 1;
        continue;
      }
      stepIssues.push(`${item.name || item.id} 尚未明确评分处置`);
    }
    issues.push(...stepIssues);
    byStep.push({
      stepId: step.id,
      itemCount: completionItems.length,
      passed: stepIssues.length === 0,
      issues: stepIssues,
    });
  }
  return {
    passed: issues.length === 0,
    issues,
    totalCount,
    coveredCount,
    byStep,
  };
}

export function validateEvaluationMapping({ sop = {}, mapping = {} } = {}) {
  const normalized = normalizeEvaluationMapping(mapping);
  const issues = [];
  const stepIds = new Set((sop.steps || []).map((step) => step.id));
  const scoreRules = new Map(
    (sop.scoreRules || []).map((rule) => [rule.id, rule]),
  );
  const safetyRules = new Map(
    (sop.safetyRules || []).map((rule) => [rule.id, rule]),
  );
  const eventIds = new Set(normalized.machineEvents.map((event) => event.id));
  if (!normalized.evaluationItems.length)
    issues.push("至少需要一个 Evaluation Item");

  for (const item of normalized.evaluationItems) {
    if (!item.name.trim()) issues.push(`${item.id} 未填写评价项名称`);
    if (!stepIds.has(item.stepId)) issues.push(`${item.id} 关联的 Step 不存在`);
    if (!item.roles.length) issues.push(`${item.id} 至少选择一个 role`);
    if (item.roles.some((role) => !EVALUATION_ITEM_ROLES[role]))
      issues.push(`${item.id} 包含无效 role`);
    if (item.machineEventIds.some((eventId) => !eventIds.has(eventId)))
      issues.push(`${item.id} 引用了不存在的 Machine Event`);
    if (!item.machineEventIds.length)
      issues.push(`${item.id} 至少需要关联一个 Machine Event`);
    if (item.roles.includes("completion") && !item.sourceCompletion.trim())
      issues.push(`${item.id} 缺少来自 SOP 的完成条件`);
    if (item.roles.includes("scoring") && !item.sourceScoreRuleIds.length)
      issues.push(`${item.id} 承担评分依据时必须引用 Score Rule`);
    if (item.roles.includes("safety") && !item.sourceSafetyRuleIds.length)
      issues.push(`${item.id} 承担安全提醒时必须引用 Safety Rule`);
    if (
      item.sourceScoreRuleIds.some(
        (ruleId) => scoreRules.get(ruleId)?.stepId !== item.stepId,
      )
    )
      issues.push(`${item.id} 引用了其他步骤或不存在的评分规则`);
    if (
      item.sourceSafetyRuleIds.some(
        (ruleId) => safetyRules.get(ruleId)?.stepId !== item.stepId,
      )
    )
      issues.push(`${item.id} 引用了其他步骤或不存在的安全规则`);
  }
  for (const event of normalized.machineEvents) {
    if (!event.name.trim()) issues.push(`${event.id} 未填写机器事实名称`);
    if (!event.factDefinition.trim())
      issues.push(`${event.id} 未填写机器事实定义`);
    if (!MACHINE_EVENT_CAPABILITY_MODES[event.capabilityMode])
      issues.push(`${event.id} 的能力实现方式无效`);
    if (
      ["score", "deduction", "finalResult", "studentResult"].some(
        (key) => key in event,
      )
    )
      issues.push(`${event.id} 不能直接保存扣分、分数或学生最终结果`);
  }
  const coverage = checkCompletionScoringCoverage({ sop, mapping: normalized });
  issues.push(...coverage.issues);
  return {
    passed: issues.length === 0,
    issues: [...new Set(issues)],
    coverage,
  };
}

export function canSubmitMappingForTeacherConfirmation(input = {}) {
  return validateEvaluationMapping(input).passed;
}

export function createSessionStepsFromSop(sopSteps = []) {
  return sopSteps.map((source, index) => {
    const step = normalizeSopStep(source, index);
    const maxScore = Number(step.maxScore ?? step.score ?? 0);
    return {
      ...step,
      state: "pending",
      result: "未进行",
      duration: "--",
      maxScore,
      rawScore: 0,
      effectiveScore: 0,
      score: 0,
      reviewStatus: "无需复核",
      ruleId: step.ruleId || `RULE-${String(index + 1).padStart(3, "0")}`,
      timeRange: "尚未产生",
      evidenceStatus: "未产生",
      evidenceSources: [],
      evidence: "尚未产生证据",
      observation: "等待进入步骤",
    };
  });
}

export function applyDefaultPassPolicy(step = {}) {
  const normalized = normalizeSopStep(step);
  const uncertainty =
    ["证据不足", "画面遮挡", "无法判定", "AI低置信度"].includes(
      normalized.result,
    ) ||
    [
      "证据不足",
      "录像缺失",
      "部分缺失",
      "不可用",
      "画面遮挡",
      "低置信度",
    ].includes(normalized.evidenceStatus) ||
    normalized.aiDecision === "uncertain";
  const manuallyReviewed =
    Boolean(normalized.reviewedAt) ||
    ["人工调整", "已确认扣分", "复核通过"].includes(normalized.reviewStatus);
  const safetyBlocked =
    normalized.result === "安全阻断" || normalized.redlineConfirmed === true;

  if (uncertainty && !manuallyReviewed && !safetyBlocked) {
    const fullScore = Number(normalized.maxScore ?? normalized.score ?? 0);
    return {
      ...normalized,
      state: "pass",
      result: "默认通过",
      rawScore: fullScore,
      effectiveScore: fullScore,
      score: fullScore,
      reviewStatus: "建议抽查",
      defaultPassReason:
        normalized.evidenceStatus === "证据不足"
          ? "视频证据不足，按既定规则默认通过"
          : "AI 无法可靠判定，按既定规则默认通过",
    };
  }
  return normalized;
}

export function diagnoseNoTrigger(checks = {}) {
  if (checks.configComplete === false) return NO_TRIGGER_REASONS.configMissing;
  if (checks.evidenceContinuous === false)
    return NO_TRIGGER_REASONS.evidenceInterrupted;
  if (checks.roiMatched === false) return NO_TRIGGER_REASONS.roiMismatch;
  if (checks.objectVisible === false) return NO_TRIGGER_REASONS.objectMissing;
  if (checks.actionSufficient === false)
    return NO_TRIGGER_REASONS.actionInsufficient;
  return "已满足触发条件";
}

export function requiresMandatoryReview(step = {}) {
  if (step.result === "安全阻断" || step.redlineConfirmed === true) return true;
  return (
    ["待复核", "待补充证据"].includes(step.reviewStatus) &&
    !isDefaultPassMode(step.judgementMode)
  );
}

export function workstationFeedbackPolicy(type, published = false) {
  const exam = type === "exam";
  return {
    showTeachingContent: !exam,
    showRealtimeResult: !exam,
    showRealtimeScore: !exam,
    showCorrectionHints: !exam,
    showFinalReport: !exam || published,
    statusText: exam
      ? published
        ? "成绩已发布"
        : "考试中不显示正误、扣分和标准答案"
      : "练习中提供步骤指导和纠正提示",
  };
}

export function automaticEvaluationGate({
  workstation,
  sop,
  model,
  validation,
  mapping,
  requireConfirmedMapping = false,
} = {}) {
  const implementation = workstation?.implementation || {};
  const reasons = [];
  if (!sop || sop.status !== "已发布") reasons.push("SOP 尚未发布");
  if (requireConfirmedMapping && mapping?.status !== "confirmed")
    reasons.push("AI评价业务口径尚未完成教师确认");
  if (!model || model.status !== "已部署") reasons.push("没有兼容的已部署模型");
  if (model && sop && model.sopVersion !== sop.version)
    reasons.push("模型与当前 SOP 版本不兼容");
  if (implementation.cameraPosition !== "已确认") reasons.push("机位尚未确认");
  if (implementation.lighting !== "已确认") reasons.push("光照尚未确认");
  if (implementation.occlusion !== "已确认") reasons.push("遮挡条件尚未确认");
  if (!implementation.roiVersion) reasons.push("尚未配置 ROI 版本");
  if (!implementation.cameraConfigVersion)
    reasons.push("尚未确认摄像头配置版本");
  if (!validation) reasons.push("当前 SOP 版本尚无现场验证记录");
  if (validation && validation.status !== "通过")
    reasons.push("现场验证未通过");
  if (validation && sop && validation.sopVersion !== sop.version)
    reasons.push("现场验证记录不属于当前 SOP 版本");
  if (validation && model && validation.modelVersion !== model.version)
    reasons.push("模型版本已变化，需要重新现场验证");
  if (
    validation &&
    implementation.roiVersion &&
    validation.roiVersion !== implementation.roiVersion
  )
    reasons.push("ROI 版本已变化，需要重新现场验证");
  if (
    validation &&
    implementation.cameraConfigVersion &&
    validation.cameraConfigVersion !== implementation.cameraConfigVersion
  )
    reasons.push("摄像头配置已变化，需要重新现场验证");

  const enabled = reasons.length === 0;
  const automaticSteps = (sop?.steps || []).filter(
    (step) => step.judgementMode === "visual_auto",
  );
  return {
    enabled,
    status: enabled ? "自动评价已启用" : "自动评价已降级",
    reasons,
    automaticStepCount: automaticSteps.length,
    enabledStepCount: enabled ? automaticSteps.length : 0,
    effectiveMode(step) {
      return getEffectiveJudgementMode({ sopStep: step, gate: { enabled } });
    },
  };
}

export function getEffectiveJudgementMode({ sopStep, gate } = {}) {
  const configuredMode = normalizeSopStep(sopStep || {}).judgementMode;
  if (configuredMode !== "visual_auto") return configuredMode;
  return gate?.enabled ? "visual_auto" : "visual_assist_default_pass";
}

function versionNumber(value = "") {
  const parts = String(value).match(/\d+/g) || [];
  return parts.reduce((total, part, index) => {
    const weight = 1000 ** Math.max(0, parts.length - index - 1);
    return total + Number(part) * weight;
  }, 0);
}

function latestVersion(items = [], field = "version") {
  return [...items].sort(
    (a, b) => versionNumber(b?.[field]) - versionNumber(a?.[field]),
  )[0];
}

export function getSopAiEvaluationStatus({
  sop,
  datasets = [],
  models = [],
  workstations = [],
  fieldValidations = [],
  evaluationMappings = [],
  targetWorkstationIds,
} = {}) {
  const mappingStatus = getMappingStatusForSop({
    sop,
    mappings: evaluationMappings,
  });
  if (!sop || sop.status !== "已发布") {
    return {
      status: "—",
      automaticTargetCount: 0,
      modelReadyCount: 0,
      validatedCount: 0,
      availableCount: 0,
      targetWorkstationCount: 0,
      validatedWorkstationCount: 0,
      mappingStatus,
      reasons: ["草稿或未发布 SOP 不进入 AI 评价适配"],
    };
  }

  const automaticTargetCount = (sop.steps || []).filter(
    (step) => step.judgementMode === "visual_auto",
  ).length;
  const sopDatasets = datasets.filter((item) => item.sopId === sop.id);
  const latestDataset = latestVersion(sopDatasets);
  const latestLockedDataset = latestVersion(
    sopDatasets.filter((item) => item.status === "已锁定"),
  );
  const deployedModel = latestVersion(
    models.filter(
      (item) =>
        item.sopId === sop.id &&
        item.sopVersion === sop.version &&
        item.status === "已部署",
    ),
  );
  const productionDataset = deployedModel
    ? sopDatasets.find(
        (item) => item.version === deployedModel.datasetVersion,
      ) || null
    : null;
  const researchDataset =
    latestDataset && latestDataset.version !== productionDataset?.version
      ? latestDataset
      : null;
  const compatibleModels = models.filter(
    (item) => item.sopId === sop.id && item.sopVersion === sop.version,
  );
  const hasStarted = sopDatasets.length > 0 || compatibleModels.length > 0;
  const explicitTargets = Array.isArray(targetWorkstationIds)
    ? new Set(targetWorkstationIds)
    : null;
  const targetWorkstations = workstations.filter((workstation) =>
    explicitTargets
      ? explicitTargets.has(workstation.id)
      : workstation.supportedProject === sop.name ||
        fieldValidations.some(
          (record) =>
            record.sopId === sop.id && record.workstationId === workstation.id,
        ),
  );
  const gateResults = targetWorkstations.map((workstation) => {
    const validation = [...fieldValidations]
      .filter(
        (record) =>
          record.workstationId === workstation.id &&
          record.sopId === sop.id &&
          record.sopVersion === sop.version,
      )
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      )[0];
    return automaticEvaluationGate({
      workstation,
      sop,
      model: deployedModel,
      validation,
      mapping: mappingStatus.mapping,
      requireConfirmedMapping: true,
    });
  });
  const validatedWorkstationCount = gateResults.filter(
    (gate) => gate.enabled,
  ).length;
  const modelReadyCount = deployedModel ? automaticTargetCount : 0;
  const validatedCount = validatedWorkstationCount ? automaticTargetCount : 0;
  const availableCount = validatedCount;
  const reasons = [];
  if (!productionDataset && !latestLockedDataset)
    reasons.push("尚无已锁定 Dataset");
  if (deployedModel && !productionDataset)
    reasons.push("已部署模型绑定的 Dataset 不存在");
  if (!deployedModel) reasons.push("尚无兼容的已部署模型");
  if (!targetWorkstations.length) reasons.push("尚未设置或识别目标工位");
  if (!mappingStatus.confirmed) reasons.push("AI评价业务口径尚未完成教师确认");
  for (const gate of gateResults) reasons.push(...gate.reasons);

  let status = "配置中";
  if (!hasStarted) status = "未配置";
  else if (
    productionDataset &&
    deployedModel &&
    mappingStatus.confirmed &&
    targetWorkstations.length > 0 &&
    validatedWorkstationCount === targetWorkstations.length
  )
    status = "可用";
  else if (
    productionDataset &&
    deployedModel &&
    mappingStatus.confirmed &&
    validatedWorkstationCount > 0
  )
    status = "部分可用";

  return {
    status,
    automaticTargetCount,
    modelReadyCount,
    validatedCount,
    availableCount,
    targetWorkstationCount: targetWorkstations.length,
    validatedWorkstationCount,
    dataset: productionDataset || latestLockedDataset || latestDataset || null,
    productionDataset,
    researchDataset,
    latestDataset: latestDataset || null,
    model: deployedModel || null,
    mappingStatus,
    reasons: [...new Set(reasons)],
  };
}

export function recordModelValidationResult(
  model = {},
  { passed, reason = "", operator = "系统管理员", time = "" } = {},
) {
  if (model.status !== "待验证")
    throw new Error("只有待验证模型可以提交验证结论。");
  const normalizedReason = reason.trim();
  if (!passed && !normalizedReason) throw new Error("请填写验证未通过原因。");
  const status = passed ? "可部署" : "验证未通过";
  const record = {
    result: passed ? "通过" : "未通过",
    reason: passed ? "模型验证通过" : normalizedReason,
    operator,
    time,
  };
  return {
    ...model,
    status,
    f1: passed && model.f1 === "待评测" ? "92.0%" : model.f1,
    sequenceAccuracy:
      passed && model.sequenceAccuracy === "待评测"
        ? "88.0%"
        : model.sequenceAccuracy,
    otherRecall:
      passed && model.otherRecall === "待评测" ? "93.0%" : model.otherRecall,
    evaluatedAt: time,
    updatedAt: time,
    validationHistory: [...(model.validationHistory || []), record],
  };
}

export function scoreOf(steps = []) {
  return steps.reduce(
    (total, step) => total + Number(step.effectiveScore ?? step.score ?? 0),
    0,
  );
}

export function recordedDeductionOf(steps = []) {
  return steps.reduce((total, step) => {
    const notYetScored =
      ["pending", "active", "waiting"].includes(step.state) ||
      ["未进行", "进行中"].includes(step.result);
    if (notYetScored) return total;

    const maxScore = Number(step.maxScore || 0);
    const effectiveScore = Number(
      step.effectiveScore ?? step.score ?? maxScore,
    );
    if (!Number.isFinite(maxScore) || !Number.isFinite(effectiveScore)) {
      return total;
    }
    return total + Math.max(0, maxScore - effectiveScore);
  }, 0);
}

export function sessionPrimaryIssue(session) {
  if (!session) return "尚未开始";
  const issueStep = (session.steps || []).find(
    (step) =>
      ["待复核", "待补充证据"].includes(step.reviewStatus) ||
      Number(step.effectiveScore ?? step.score ?? 0) < Number(step.maxScore),
  );
  if (issueStep) return `${issueStep.id} · ${issueStep.name}`;
  return (
    (session.events || []).find((event) => event.level === "danger")?.title ||
    "无阻断问题"
  );
}

export function arrangementDestination(item) {
  if (item.status === "草稿") return "edit";
  if (["待开始", "准备中"].includes(item.status)) return "prep";
  if (["进行中", "已暂停"].includes(item.status)) return "live";
  return "results";
}

export function getPublishBlockers(sessions = []) {
  return sessions.filter((session) => {
    if (["正式成绩", "已发布", "未参加"].includes(session.resultStatus))
      return false;
    const steps = session.steps || [];
    const hasMandatoryReview = steps.some(requiresMandatoryReview);
    const hasCompleteScore =
      steps.length > 0 &&
      steps.every((step) =>
        Number.isFinite(Number(step.effectiveScore ?? step.score)),
      );
    return hasMandatoryReview || !hasCompleteScore;
  });
}

export function canCloseIssue(issue) {
  if (!issue || issue.status === "已关闭") return false;
  return (
    issue.technicalCheck?.status === "已通过" &&
    ["已确认", "无需确认"].includes(issue.businessCheck?.status)
  );
}

export function validateSystemSettings(input) {
  const practiceRecordingDays = Number(
    input.practiceRecordingDays ?? input.recordingDays,
  );
  const examRecordingDays = Number(
    input.examRecordingDays ?? input.recordingDays,
  );
  const numericRules = [
    [practiceRecordingDays, 30, 730, "练习录像保存期限"],
    [examRecordingDays, 30, 730, "考试录像保存期限"],
    ["downloadDays", 1, 30, "导出文件下载期限"],
    ["backupRetentionDays", 7, 180, "备份保留周期"],
    ["cacheThreshold", 5, 40, "缓存水位预警阈值"],
  ];
  for (const [keyOrValue, min, max, label] of numericRules) {
    const value =
      typeof keyOrValue === "string" ? Number(input[keyOrValue]) : keyOrValue;
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${label}必须在 ${min}–${max} 之间。`);
    }
  }
  return {
    ...input,
    recordingDays: practiceRecordingDays,
    practiceRecordingDays,
    examRecordingDays,
    downloadDays: Number(input.downloadDays),
    backupRetentionDays: Number(input.backupRetentionDays),
    cacheThreshold: Number(input.cacheThreshold),
  };
}
