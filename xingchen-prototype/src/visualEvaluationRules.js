export const OBSERVATION_TARGETS = {
  action: "动作发生",
  state: "结果状态",
  process: "操作过程",
};
export const COMPLETION_BASES = {
  action: "完整动作证据",
  state: "结果状态证据",
  both: "动作与结果状态",
};
export function normalizeVisualRequirement(value = {}) {
  return {
    ...value,
    id: value.id || "",
    name: value.name || "",
    target: value.target || "",
    definition: value.definition || "",
    object: value.object || "",
    variations: value.variations || "",
    mistakes: value.mistakes || "",
    unknownWhen: value.unknownWhen || "",
    evidence: value.evidence || "",
    continuous: value.continuous || "current_step",
    endStepId: value.endStepId || "",
    assessDonning: value.assessDonning === true,
  };
}
export function visualRequirementIssues(step = {}, steps = []) {
  const issues = [],
    names = new Set(),
    ids = new Set();
  for (const r of step.visualRequirements || []) {
    if (!r.id || ids.has(r.id)) issues.push("可见要求标识缺失或重复");
    ids.add(r.id);
    if (!r.name?.trim() || names.has(r.name.trim()))
      issues.push("可见要求名称为空或重复");
    names.add(r.name?.trim());
    if (!OBSERVATION_TARGETS[r.target]) issues.push("请选择可见要求的判断目标");
    if (
      (step.expectedJudgementMode || step.judgementMode) !==
      "default_pass_manual_deduction"
    ) {
      if (
        !r.definition?.trim() ||
        !r.evidence?.trim() ||
        !r.unknownWhen?.trim()
      )
        issues.push("自动/辅助可见要求需填写合格说明、必需证据和不可判定条件");
    }
    if (
      r.continuous === "specified" &&
      (r.target !== "state" ||
        steps.findIndex((s) => s.id === r.endStepId) <
          steps.findIndex((s) => s.id === step.id))
    )
      issues.push("持续检查结束步骤必须存在且不早于当前步骤");
  }
  return [...new Set(issues)];
}

export function stepEvaluationMeaning(step = {}) {
  if (step.redlineConfirmed || step.result === "安全阻断")
    return {
      key: "safety",
      label: "安全处置",
      detail: "按安全规则处理",
      evidenceConfirmed: false,
    };
  if (step.reviewedAt || step.completionSource === "teacher")
    return {
      key: "teacher",
      label: "教师已确认",
      detail: "以教师复核记录为准",
      evidenceConfirmed: false,
    };
  if (
    step.aiEvidenceState === "unknown" ||
    step.defaultPassReason ||
    step.aiDecision === "uncertain" ||
    (["uncertain", "not_evaluable"].includes(step.completionResult) &&
      !["active", "pending"].includes(step.state)) ||
    /默认通过|无法判定|证据不足|画面遮挡/.test(step.result || "")
  )
    return {
      key: "unknown",
      label: "未自动确认 · 按规则保分",
      detail:
        step.defaultPassReason ||
        step.unknownReason ||
        "证据不足，不直接判定操作错误",
      evidenceConfirmed: false,
    };
  if (step.aiEvidenceState === "confirmed")
    return {
      key: "confirmed",
      label:
        step.resultSource === "real" ? "AI证据支持完成" : "演示证据支持完成",
      detail:
        step.resultSource === "real"
          ? "可追溯模型与证据"
          : "原型演示，不代表现场算法效果",
      evidenceConfirmed: true,
    };
  if (step.completionSource === "student")
    return {
      key: "submitted",
      label: "学生已提交",
      detail: "提交与AI确认完成分别记录",
      evidenceConfirmed: false,
    };
  if (["pending", "waiting"].includes(step.state) || step.result === "未进行")
    return {
      key: "waiting",
      label: "尚未形成判定",
      detail: "等待操作",
      evidenceConfirmed: false,
    };
  if (step.state === "active" || step.executionState === "active")
    return {
      key: "observing",
      label: "正在观察",
      detail: "尚未形成完整证据",
      evidenceConfirmed: false,
    };
  return {
    key: "legacy",
    label: "历史依据未记录",
    detail: "保留原分数与流程，不反推AI完成",
    evidenceConfirmed: false,
  };
}
export function evaluationCoverage(steps = []) {
  const meanings = steps.map(stepEvaluationMeaning);
  return {
    total: steps.length,
    confirmed: meanings.filter((x) => x.evidenceConfirmed).length,
    unknown: meanings.filter((x) => x.key === "unknown").length,
    teacher: meanings.filter((x) => x.key === "teacher").length,
    legacy: meanings.filter((x) => x.key === "legacy").length,
  };
}
// Missing completion evidence does not cancel independently confirmed scoring facts.
export function scoreWithConfirmedDeductions(step, scoringApplications = []) {
  const max = Math.max(0, Number(step.maxScore ?? step.score ?? 0));
  const byId = new Map();
  if (step.evidenceSemantics === "observations_v1")
    for (const application of scoringApplications) {
      if (
        application.stepId !== step.id ||
        !["applied", "corrected"].includes(application.status)
      )
        continue;
      const deduction = Number(application.appliedDeduction);
      if (!Number.isFinite(deduction) || deduction < 0) continue;
      byId.set(application.id || application, application);
    }
  const deduction = Math.min(
    max,
    [...byId.values()].reduce(
      (total, application) => total + Number(application.appliedDeduction),
      0,
    ),
  );
  return {
    max,
    effectiveScore: max - deduction,
    deduction,
    applicationIds: [...byId.values()].map((a) => a.id).filter(Boolean),
  };
}
export function preservedReviewStatus(step) {
  if (["待复核", "待补充证据"].includes(step.reviewStatus))
    return step.reviewStatus;
  return ["pending", "retest_required"].includes(step.scoreDisposition?.status)
    ? "待复核"
    : "建议抽查";
}
export function finalizeSubmittedStep(step, when, context = {}) {
  if (
    step.evidenceSemantics !== "observations_v1" ||
    step.flowCompletion ||
    step.completionSource === "ai" ||
    step.reviewedAt ||
    step.redlineConfirmed ||
    step.result === "安全阻断"
  )
    return step;
  const protectedScore = scoreWithConfirmedDeductions(
    step,
    context.scoringApplications || [],
  );
  const completionSource =
    context.completionSource === "teacher_end" ? "teacher_end" : "student";
  return {
    ...step,
    executionState: "closed",
    completionSource,
    aiEvidenceState: "unknown",
    aiDecision: "uncertain",
    completionResult: "uncertain",
    result: protectedScore.deduction
      ? "未自动确认（保留有效规则扣分）"
      : "未自动确认（按规则保分）",
    defaultPassReason:
      (completionSource === "teacher_end" ? "教师结束会话" : "学生结束或交卷") +
      "，缺少完整可靠的自动完成证据；不因缺证追加扣分，保留已确认的独立评分记录。",
    rawScore: protectedScore.max,
    effectiveScore: protectedScore.effectiveScore,
    score: protectedScore.effectiveScore,
    scoreEvidenceApplicationIds: protectedScore.applicationIds,
    reviewStatus: preservedReviewStatus(step),
    submittedAt: when,
    observationWindow: {
      ...step.observationWindow,
      status: "closed",
      closedAt: when,
      closeReason: completionSource === "teacher_end" ? "教师结束" : "学生提交",
    },
  };
}
