export const JUDGEMENT_MODES = {
  visual_auto: {
    label: "视频自动判定",
    shortLabel: "自动判定",
    description:
      "摄像头画面可稳定识别时自动计分；看不清或证据缺失时默认通过并提示抽查。",
  },
  visual_assist_default_pass: {
    label: "视频辅助判定，异常时默认通过",
    shortLabel: "辅助判定",
    description:
      "正常画面由系统判定；遮挡、低置信度或证据缺失时保持满分，并提示教师抽查。",
  },
  default_pass_manual_deduction: {
    label: "视频不可可靠判定，默认通过",
    shortLabel: "教师抽查",
    description:
      "仅凭视频无法可靠确认，系统默认给满分；教师发现问题后填写依据并扣分。",
  },
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

export function normalizeSopStep(step = {}, index = 0) {
  const text = `${step.name || ""}${step.completionCondition || ""}${step.evidence || ""}`;
  const inferredMode = /扭矩|力度|重量|内部状态|声音|读数精度/.test(text)
    ? "default_pass_manual_deduction"
    : "visual_auto";
  const judgementMode = step.judgementMode || inferredMode;
  const limitByMode = {
    visual_auto: "关键动作和目标区域需要持续出现在画面内。",
    visual_assist_default_pass:
      "遮挡、低置信度或录像缺失时不做负向推断，系统默认通过并提示抽查。",
    default_pass_manual_deduction:
      "该要求无法仅凭摄像头画面可靠确认，系统默认通过；教师发现问题后可留痕扣分。",
  };
  return {
    ...step,
    judgementMode,
    knownLimit: step.knownLimit || limitByMode[judgementMode],
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
    confirmFrames: Number(step.confirmFrames || 5),
    minConfidence: String(step.minConfidence || "0.80"),
  };
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
} = {}) {
  const implementation = workstation?.implementation || {};
  const reasons = [];
  if (!model || model.status !== "已部署") reasons.push("没有兼容的已部署模型");
  if (model && sop && model.sopVersion !== sop.version)
    reasons.push("模型与当前 SOP 版本不兼容");
  if (implementation.cameraPosition !== "已确认") reasons.push("机位尚未确认");
  if (implementation.lighting !== "已确认") reasons.push("光照尚未确认");
  if (implementation.occlusion !== "已确认") reasons.push("遮挡条件尚未确认");
  if (!implementation.roiVersion) reasons.push("尚未配置 ROI 版本");
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
      return step.judgementMode === "visual_auto" && enabled
        ? "visual_auto"
        : step.judgementMode === "visual_auto"
          ? "visual_assist_default_pass"
          : step.judgementMode;
    },
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
