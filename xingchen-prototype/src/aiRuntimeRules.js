import { evaluateAiCapabilityConfig } from "./aiCapabilityConfigRules.js";
import {
  activeJudgementItems,
  checkSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
} from "./sopWorkstationAiRules.js";
import { normalizeWorkstationAiBaseConfig } from "./workstationAiRules.js";
import {
  calculateScoreEngine,
  createEvaluationClock,
  setEvaluationClockPaused,
} from "./domainRules.js";

export const AI_RUNTIME_FALLBACK_POLICY =
  "AI未配置、不可用、不确定或发生技术异常时转人工确认并安全降级，不直接形成学生负向结果。";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export function deriveAiRuntimeGate({
  sopId,
  workstationId,
  sops = [],
  aiCapabilityConfigs = [],
  sopWorkstationAiConfigs = [],
  aiCapabilities = [],
  workstations = [],
  devices = [],
} = {}) {
  const sop = (Array.isArray(sops) ? sops : []).find(
    (item) => item?.id === sopId,
  );
  const workstation = (Array.isArray(workstations) ? workstations : []).find(
    (item) => item?.id === workstationId,
  );
  const aiConfig = (
    Array.isArray(aiCapabilityConfigs) ? aiCapabilityConfigs : []
  ).find((item) => item?.sopId === sopId);
  const relation = (
    Array.isArray(sopWorkstationAiConfigs) ? sopWorkstationAiConfigs : []
  ).find(
    (item) =>
      item?.sopAiConfigId === aiConfig?.id &&
      item?.workstationId === workstationId,
  );
  const reasons = [];
  if (!sop) reasons.push("SOP不存在或已失效");
  if (!workstation) reasons.push("工位不存在或已失效");
  if (!aiConfig) reasons.push("当前SOP尚未配置AI能力");

  const evaluation =
    sop && aiConfig
      ? evaluateAiCapabilityConfig({
          sop,
          config: aiConfig,
          capabilities: aiCapabilities,
        })
      : null;
  if (evaluation && !evaluation.ready) reasons.push(...evaluation.issues);
  if (aiConfig && !relation) reasons.push("当前SOP尚未配置该工位");

  const checks =
    sop && workstation && aiConfig && relation
      ? checkSopWorkstationAiConfig({
          config: relation,
          aiConfig,
          aiConfigReady: Boolean(evaluation?.ready),
          workstation,
          devices,
          capabilities: aiCapabilities,
        })
      : null;
  if (checks && !checks.ready) reasons.push(...checks.issues);
  const runtime = relation
    ? deriveSopWorkstationRuntimeStatus({
        config: relation,
        checks: checks || { ready: false },
        readiness: checks?.readiness,
      })
    : {
        code: aiConfig ? "not_configured" : "ai_unconfigured",
        label: aiConfig ? "工位未配置" : "AI未配置",
        runnable: false,
      };
  if (!runtime.runnable && runtime.label) reasons.push(runtime.label);

  const judgementItems = aiConfig ? activeJudgementItems(aiConfig) : [];
  const capabilityIds = unique(
    judgementItems.flatMap((item) =>
      (item.conditions || []).map((condition) => condition.capabilityId),
    ),
  );
  const capabilities = capabilityIds
    .map((id) =>
      (Array.isArray(aiCapabilities) ? aiCapabilities : []).find(
        (item) => item?.id === id,
      ),
    )
    .filter(Boolean);
  const automaticEvaluationStepCount = new Set(
    (aiConfig?.stepConfigs || [])
      .filter((step) => step.actualEvaluationMode === "visual_auto")
      .map((step) => step.stepId),
  ).size;
  const assistedEvaluationStepCount = new Set(
    (aiConfig?.stepConfigs || [])
      .filter(
        (step) => step.actualEvaluationMode === "visual_assist_default_pass",
      )
      .map((step) => step.stepId),
  ).size;
  const safetyMonitoringStepCount = new Set(
    judgementItems
      .filter((item) => (item.purposes || []).includes("safety"))
      .map((item) => item.stepId),
  ).size;
  const aiParticipatingStepCount = new Set(
    judgementItems.map((item) => item.stepId),
  ).size;
  const enabledStepCount = runtime.runnable ? aiParticipatingStepCount : 0;

  return {
    enabled: Boolean(runtime.runnable),
    runtimeStatus: runtime.code,
    runtimeLabel: runtime.label,
    reasons: unique(reasons),
    judgementItemCount: judgementItems.length,
    capabilityCount: capabilityIds.length,
    automaticEvaluationStepCount,
    assistedEvaluationStepCount,
    safetyMonitoringStepCount,
    aiParticipatingStepCount,
    automaticStepCount:
      automaticEvaluationStepCount + assistedEvaluationStepCount,
    enabledStepCount,
    validationStatus: relation?.validationStatus || "unvalidated",
    enableStatus: relation?.enableStatus || "not_enabled",
    sop,
    workstation,
    aiConfig,
    relation,
    evaluation,
    checks,
    runtime,
    judgementItems,
    capabilityIds,
    capabilities,
  };
}

export function deriveSopAiCapabilityStatus({
  sopId,
  targetWorkstationIds,
  ...data
} = {}) {
  const sop = (data.sops || []).find((item) => item?.id === sopId);
  if (!sop)
    return {
      status: "未配置",
      configured: false,
      workstationCount: 0,
      runnableWorkstationCount: 0,
      enabledWorkstationCount: 0,
      judgementItemCount: 0,
      capabilityCount: 0,
    };
  const aiConfig = (data.aiCapabilityConfigs || []).find(
    (item) => item?.sopId === sopId,
  );
  if (!aiConfig)
    return {
      status: sop.status === "草稿" ? "—" : "未配置",
      configured: false,
      workstationCount: 0,
      runnableWorkstationCount: 0,
      enabledWorkstationCount: 0,
      judgementItemCount: 0,
      capabilityCount: 0,
    };
  const evaluation = evaluateAiCapabilityConfig({
    sop,
    config: aiConfig,
    capabilities: data.aiCapabilities || [],
  });
  const requested = Array.isArray(targetWorkstationIds)
    ? new Set(targetWorkstationIds)
    : null;
  const relations = (data.sopWorkstationAiConfigs || []).filter(
    (item) =>
      item?.sopAiConfigId === aiConfig.id &&
      (!requested || requested.has(item.workstationId)),
  );
  const gates = relations.map((relation) =>
    deriveAiRuntimeGate({
      ...data,
      sopId,
      workstationId: relation.workstationId,
    }),
  );
  const runnableWorkstationCount = gates.filter((gate) => gate.enabled).length;
  const enabledWorkstationCount = relations.filter(
    (item) => item.enableStatus === "enabled",
  ).length;
  return {
    status: !evaluation.ready
      ? evaluation.statusLabel
      : runnableWorkstationCount
        ? "已启用"
        : "待验证",
    configured: evaluation.ready,
    workstationCount: relations.length,
    targetWorkstationCount: requested?.size ?? relations.length,
    runnableWorkstationCount,
    enabledWorkstationCount,
    judgementItemCount: evaluation.judgementItemCount,
    capabilityCount: evaluation.distinctCapabilityIds.length,
    aiConfig,
    evaluation,
    gates,
  };
}

export function createAiEvaluationSnapshot(gate, lockedAt) {
  if (!gate?.sop || !gate?.workstation)
    throw new Error("缺少SOP或工位，无法创建运行快照。");
  const { workstationValidationStates: _legacyValidationStates, ...aiConfig } =
    gate.aiConfig || {};
  return {
    sopId: gate.sop.id,
    workstationId: gate.workstation.id,
    sopSnapshot: clone(gate.sop),
    aiCapabilityConfigSnapshot: gate.aiConfig ? clone(aiConfig) : null,
    sopWorkstationAiConfigSnapshot: clone(gate.relation),
    capabilitySnapshots: clone(
      (gate.capabilities || []).map((capability) => ({
        id: capability.id,
        name: capability.name,
        type: capability.type,
        targetName: capability.targetName || "",
        status: capability.status,
        currentModelStatus: capability.currentModelStatus,
        currentPublishedModel: clone(capability.currentPublishedModel || null),
      })),
    ),
    workstationAiBaseConfigSnapshot: clone(
      normalizeWorkstationAiBaseConfig(gate.workstation),
    ),
    runtimeStatus: gate.runtimeStatus,
    runtimeLabel: gate.runtimeLabel,
    aiEnabled: gate.enabled,
    lockedAt,
  };
}

export function evaluationProfileFromGate(gate) {
  const validationRecords = gate?.relation?.validationRecords || [];
  return {
    aiRuntimeEnabled: Boolean(gate?.enabled),
    automaticEvaluationEnabled: Boolean(gate?.enabled),
    enabledStepCount: gate?.enabledStepCount || 0,
    automaticStepCount: gate?.automaticStepCount || 0,
    aiParticipatingStepCount: gate?.aiParticipatingStepCount || 0,
    automaticEvaluationStepCount: gate?.automaticEvaluationStepCount || 0,
    assistedEvaluationStepCount: gate?.assistedEvaluationStepCount || 0,
    safetyMonitoringStepCount: gate?.safetyMonitoringStepCount || 0,
    judgementItemCount: gate?.judgementItemCount || 0,
    capabilityCount: gate?.capabilityCount || 0,
    validationId: validationRecords[0]?.id || "未验证",
    validationStatus: gate?.validationStatus || "unvalidated",
    enableStatus: gate?.enableStatus || "not_enabled",
    runtimeStatus: gate?.runtimeStatus || "ai_unconfigured",
    runtimeLabel: gate?.runtimeLabel || "AI未配置",
    fallbackPolicy: AI_RUNTIME_FALLBACK_POLICY,
  };
}

export function createOpenedAiSession({
  id,
  workstationId,
  studentId,
  gate,
  lockedAt,
  steps = [],
  recording = {},
}) {
  if (!id || !workstationId || !studentId)
    throw new Error("缺少Session、工位或学生ID，无法开放工位。");
  const evaluationSnapshot = createAiEvaluationSnapshot(gate, lockedAt);
  return {
    id,
    workstationId,
    studentId,
    status: "可入场",
    elapsed: "00:00:00",
    currentStepId: "",
    score: 0,
    evaluationProfile: evaluationProfileFromGate(gate),
    evaluationSnapshot,
    recording: clone(recording),
    steps: clone(steps),
    runtime: {
      actorBinding: {
        status: "uncertain",
        primaryActorId: studentId,
        trackId: "",
        history: [],
      },
      evaluationClock: createEvaluationClock(),
      aiObservations: [],
      aiJudgementResults: [],
      technicalIncidents: [],
      safetyCandidates: [],
      assistanceWarnings: [],
      correctionContext: {
        status: "inactive",
        relatedRuleId: "",
        relatedStepId: "",
        startedAt: "",
        completedAt: "",
      },
    },
    events: [
      {
        time: String(lockedAt || "").slice(-5),
        level: "blue",
        title: "工位检查通过",
        detail: gate.enabled
          ? `已锁定“${gate.sop.name}”与当前工位AI配置，AI评价已启用`
          : `已锁定“${gate.sop.name}”，${gate.runtimeLabel}，本次安全降级`,
      },
    ],
  };
}

export function startAiRuntimeSession(session, startedAt) {
  if (!session?.id) throw new Error("Session不存在或已失效。");
  if (!["待开始", "可入场"].includes(session.status))
    throw new Error("当前Session已经开始或结束，不能重复开始。");
  const firstStep = (session.steps || []).find(
    (step) => step.state === "pending",
  );
  const activeStepId = firstStep?.id || session.steps?.[0]?.id || "";
  const hasFallbackCamera = Boolean(
    session.evaluationSnapshot?.workstationAiBaseConfigSnapshot
      ?.fallbackCameraId,
  );
  return {
    ...session,
    status: "进行中",
    currentStepId: activeStepId,
    steps: (session.steps || []).map((step) =>
      step.id === activeStepId
        ? {
            ...step,
            state: "active",
            executionState: "active",
            observationWindow: {
              status: "open",
              openedAt: startedAt,
              closedAt: "",
              closeReason: "",
            },
            result: "进行中",
            duration: "00:00",
            observation: "已进入当前步骤，等待连续动作判定",
          }
        : step,
    ),
    runtime: {
      ...(session.runtime || {}),
      actorBinding: {
        ...(session.runtime?.actorBinding || {}),
        status: "confirmed",
        primaryActorId: session.studentId,
        trackId: `track-${session.id}`,
        history: [
          ...(session.runtime?.actorBinding?.history || []),
          { status: "confirmed", at: startedAt, note: "学生确认并开始" },
        ],
      },
      evaluationClock: createEvaluationClock({ status: "running" }),
    },
    startedAt: session.startedAt || startedAt,
    lastActiveAt: startedAt,
    recording: {
      ...(session.recording || {}),
      status: "完整",
      coveragePercent: 100,
      mainCamera: "正常",
      assistCamera: hasFallbackCamera ? "正常" : "不适用",
      startedAt:
        session.recording?.startedAt === "尚未开始"
          ? startedAt
          : session.recording?.startedAt || startedAt,
      lastSegmentAt: "持续写入中",
      fullVideoAvailable: true,
      incidents: [],
    },
    events: [
      {
        time: String(startedAt || "").slice(-5),
        level: "green",
        title: "学生确认并开始",
        detail: "身份、任务和工位已确认，会话计时与评价开始",
      },
      ...(session.events || []),
    ],
  };
}

function normalizedRuntime(session = {}) {
  const runtime = session.runtime || {};
  return {
    ...runtime,
    actorBinding: runtime.actorBinding || {},
    evaluationClock: createEvaluationClock(runtime.evaluationClock || {}),
    aiObservations: runtime.aiObservations || [],
    aiJudgementResults: runtime.aiJudgementResults || [],
    aiScoringApplications: runtime.aiScoringApplications || [],
    safetyCandidates: runtime.safetyCandidates || [],
    technicalIncidents: runtime.technicalIncidents || [],
    assistanceWarnings: runtime.assistanceWarnings || [],
    correctionContext: {
      status: "inactive",
      relatedRuleId: "",
      relatedStepId: "",
      startedAt: "",
      completedAt: "",
      ...(runtime.correctionContext || {}),
    },
  };
}

function completeCurrentStep(session, runtime, stepId, when) {
  const currentIndex = (session.steps || []).findIndex(
    (step) => step.id === stepId,
  );
  const nextStep = session.steps?.[currentIndex + 1];
  const hasScoringApplication = runtime.aiScoringApplications.some(
    (item) => item.stepId === stepId,
  );
  const steps = (session.steps || []).map((step) => {
    if (step.id === stepId) {
      const maxScore = Number(step.maxScore || 0);
      const effectiveScore = hasScoringApplication
        ? Math.max(0, Number(step.effectiveScore ?? step.score ?? maxScore))
        : maxScore;
      return {
        ...step,
        state: "pass",
        executionState: "closed",
        completionResult: "complete",
        result: effectiveScore < maxScore ? "通过（含规则扣分）" : "通过",
        rawScore: maxScore,
        effectiveScore,
        score: effectiveScore,
        observationWindow: {
          ...step.observationWindow,
          status: "closed",
          closedAt: when,
          closeReason: "AI判断项完成条件成立",
        },
        observation: "AI判断项完成条件成立",
      };
    }
    if (step.id === nextStep?.id)
      return {
        ...step,
        state: "active",
        executionState: "active",
        result: "进行中",
        observationWindow: {
          status: "open",
          openedAt: when,
          closedAt: "",
          closeReason: "",
        },
      };
    return step;
  });
  return { steps, currentStepId: nextStep?.id || stepId };
}

export function applyAiJudgementScoring({
  session,
  runtime,
  judgementItem,
  scoreRules = [],
  when,
  makeId = (prefix) => `${prefix}-${when}`,
}) {
  if (!(judgementItem.purposes || []).includes("scoring"))
    return { steps: session.steps, runtime, events: [] };
  let steps = session.steps;
  let correctionContext = runtime.correctionContext;
  const applications = [...runtime.aiScoringApplications];
  const events = [];
  for (const ruleId of judgementItem.scoreRuleIds || []) {
    const rule = scoreRules.find(
      (item) => item.id === ruleId && item.stepId === judgementItem.stepId,
    );
    if (!rule) continue;
    const previous = applications.filter(
      (item) => item.ruleId === rule.id && item.stepId === judgementItem.stepId,
    ).length;
    if (previous >= Math.max(1, Number(rule.maxTriggerCount || 1))) continue;
    const requiresReview = rule.correctionTreatment === "teacher_review";
    const step = steps.find((item) => item.id === judgementItem.stepId);
    if (!step) continue;
    const maxScore = Number(step.maxScore || 0);
    const priorApplications = applications.some(
      (item) => item.stepId === step.id && item.status === "applied",
    );
    const currentScore = priorApplications
      ? Number(step.effectiveScore ?? step.score ?? maxScore)
      : maxScore;
    const deduction =
      rule.deductionMode === "zero_step"
        ? currentScore
        : Math.min(currentScore, Number(rule.deductionValue || 0));
    const resultingScore = requiresReview
      ? currentScore
      : Math.max(0, currentScore - deduction);
    steps = steps.map((item) =>
      item.id === step.id
        ? {
            ...item,
            rawScore: maxScore,
            effectiveScore: resultingScore,
            score: resultingScore,
            result: requiresReview
              ? "AI评分证据待教师复核"
              : `触发教师评分规则：${rule.name}`,
            reviewStatus: requiresReview ? "待复核" : item.reviewStatus,
            scoreDisposition: requiresReview
              ? {
                  status: "pending",
                  reason: `AI判断项“${judgementItem.name}”触发教师评分规则“${rule.name}”`,
                  resolvedBy: "",
                  resolvedAt: "",
                }
              : item.scoreDisposition,
          }
        : item,
    );
    applications.push({
      id: makeId("ai-score-application"),
      stepId: step.id,
      judgementItemId: judgementItem.id,
      ruleId: rule.id,
      ruleName: rule.name,
      deductionMode: rule.deductionMode,
      deductionValue: Number(rule.deductionValue || 0),
      correctionTreatment: rule.correctionTreatment,
      correctedDeductionValue: Number(rule.correctedDeductionValue || 0),
      status: requiresReview ? "pending_review" : "applied",
      appliedDeduction: requiresReview ? 0 : deduction,
      createdAt: when,
    });
    if (
      !requiresReview &&
      ["cancel_after_correction", "reduce_after_correction"].includes(
        rule.correctionTreatment,
      ) &&
      correctionContext.status !== "active"
    )
      correctionContext = {
        status: "active",
        relatedRuleId: rule.id,
        relatedStepId: step.id,
        sourceJudgementItemId: judgementItem.id,
        startedAt: when,
        completedAt: "",
      };
    events.push({
      time: String(when).slice(-5),
      level: requiresReview ? "warning" : "blue",
      title: requiresReview ? "评分证据待教师复核" : "教师评分规则已执行",
      detail: `${rule.name}${requiresReview ? "" : ` · 扣${deduction}分`}`,
    });
  }
  return {
    steps,
    runtime: {
      ...runtime,
      aiScoringApplications: applications,
      correctionContext,
    },
    events,
  };
}

export function updateAiCorrectionContext({
  session,
  action,
  ruleId = "",
  sopSnapshot,
  when,
}) {
  if (!session) throw new Error("当前没有可处理的步骤。");
  const runtime = normalizedRuntime(session);
  const step = (session.steps || []).find((item) =>
    action === "open"
      ? item.id === session.currentStepId
      : item.id === runtime.correctionContext.relatedStepId,
  );
  if (!step) throw new Error("当前没有可处理的步骤。");
  let steps = session.steps;
  if (action === "open") {
    const rule = (sopSnapshot?.scoreRules || []).find(
      (item) => item.id === ruleId && item.stepId === step.id,
    );
    if (!rule) throw new Error("请选择当前步骤的教师评分规则。");
    if (runtime.correctionContext.status === "active")
      throw new Error("已有纠正上下文正在进行，不能重复扣分。");
    runtime.correctionContext = {
      status: "active",
      relatedRuleId: rule.id,
      relatedStepId: step.id,
      startedAt: when,
      completedAt: "",
    };
  } else {
    if (runtime.correctionContext.status !== "active")
      throw new Error("当前没有进行中的纠正上下文。");
    runtime.correctionContext = {
      ...runtime.correctionContext,
      status: "completed",
      completedAt: when,
    };
    const rule = (sopSnapshot?.scoreRules || []).find(
      (item) => item.id === runtime.correctionContext.relatedRuleId,
    );
    const deduction =
      rule?.correctionTreatment === "cancel_after_correction"
        ? 0
        : rule?.correctionTreatment === "reduce_after_correction"
          ? Number(rule.correctedDeductionValue || 0)
          : Number(rule?.deductionValue || 0);
    const scoringApplication = runtime.aiScoringApplications
      .filter((item) => item.ruleId === rule?.id && item.stepId === step.id)
      .at(-1);
    const correctedScore = Math.max(
      0,
      Math.min(
        Number(step.maxScore || 0),
        (scoringApplication
          ? Number(step.effectiveScore ?? step.score ?? 0) +
            Number(scoringApplication.appliedDeduction || 0)
          : Number(step.maxScore || 0)) - deduction,
      ),
    );
    steps = session.steps.map((item) =>
      item.id === step.id
        ? {
            ...item,
            effectiveScore: correctedScore,
            score: correctedScore,
            result: deduction ? "纠正后扣分" : "纠正完成",
            scoreDisposition:
              rule?.correctionTreatment === "teacher_review"
                ? {
                    status: "pending",
                    reason: "纠正结果需要教师确认",
                    resolvedBy: "",
                    resolvedAt: "",
                  }
                : item.scoreDisposition,
          }
        : item,
    );
    runtime.aiScoringApplications = runtime.aiScoringApplications.map((item) =>
      item.id === scoringApplication?.id
        ? {
            ...item,
            status: "corrected",
            appliedDeduction: deduction,
            correctedAt: when,
          }
        : item,
    );
  }
  const scoreEngine = calculateScoreEngine({ steps });
  return {
    ...session,
    steps,
    score: scoreEngine.effectiveScore,
    scoreEngine,
    runtime,
    events: [
      {
        time: String(when).slice(-5),
        level: "warning",
        title: action === "open" ? "进入纠正上下文" : "纠正动作完成",
        detail: "纠正动作与普通重复操作分开记录",
      },
      ...(session.events || []),
    ],
  };
}

export function simulateAiConditionOnSession({
  session,
  judgementItemId,
  conditionId,
  sopSnapshot,
  when,
  makeId = (prefix) => `${prefix}-${when}`,
}) {
  const aiConfig = session?.evaluationSnapshot?.aiCapabilityConfigSnapshot;
  const capabilities = session?.evaluationSnapshot?.capabilitySnapshots || [];
  const currentStep = session?.steps?.find(
    (item) => item.id === session.currentStepId,
  );
  const judgementItems = activeJudgementItems(aiConfig || {}).filter(
    (item) => item.stepId === currentStep?.id,
  );
  const judgementItem = judgementItems.find(
    (item) => item.id === judgementItemId,
  );
  const condition = (judgementItem?.conditions || []).find(
    (item) => item.id === conditionId,
  );
  if (!session || !currentStep || !judgementItem || !condition)
    throw new Error("当前步骤没有可模拟的AI判断条件。");
  if (
    !(
      session.evaluationProfile?.aiRuntimeEnabled ??
      session.evaluationProfile?.automaticEvaluationEnabled
    )
  )
    throw new Error("当前Session未启用AI运行，只能按安全降级流程运行。");
  if (session.status !== "进行中")
    throw new Error("会话未运行，不能产生AI识别观察。");
  const runtime = normalizedRuntime(session);
  if (runtime.actorBinding.status !== "confirmed")
    throw new Error("主操作人未确认，AI观察不能用于当前学生评价。");
  if (currentStep.observationWindow?.status !== "open")
    throw new Error("当前步骤观察窗口未开启。");
  const capability = capabilities.find(
    (item) => item.id === condition.capabilityId,
  );
  const observation = {
    id: makeId("ai-observation"),
    judgementItemId,
    conditionId,
    capabilityId: condition.capabilityId,
    capabilityName: capability?.name || condition.capabilityId,
    stepId: currentStep.id,
    actorId: session.studentId,
    result: "observed",
    occurrenceCount: 1,
    observedDurationSeconds: Number(condition.minDurationSeconds || 0),
    observedAt: when,
  };
  const aiObservations = [...runtime.aiObservations, observation];
  const conditionSatisfied = (candidate) =>
    aiObservations.filter(
      (item) =>
        item.stepId === currentStep.id &&
        item.judgementItemId === judgementItem.id &&
        item.conditionId === candidate.id,
    ).length >= Math.max(1, Number(candidate.minOccurrences || 1));
  const conditions = judgementItem.conditions || [];
  const allSatisfied = conditions.every(conditionSatisfied);
  const anySatisfied = conditions.some(conditionSatisfied);
  const observedOrder = aiObservations
    .filter(
      (item) =>
        item.stepId === currentStep.id &&
        item.judgementItemId === judgementItem.id,
    )
    .map((item) => item.conditionId);
  const firstIndexes = conditions.map((item) => observedOrder.indexOf(item.id));
  const sequenceSatisfied =
    allSatisfied &&
    firstIndexes.every(
      (index, position) =>
        index >= 0 && (position === 0 || index > firstIndexes[position - 1]),
    );
  const confirmed =
    judgementItem.combination === "any"
      ? anySatisfied
      : judgementItem.combination === "sequence"
        ? sequenceSatisfied
        : allSatisfied;
  const previousResult = runtime.aiJudgementResults.find(
    (item) =>
      item.stepId === currentStep.id &&
      item.judgementItemId === judgementItem.id,
  );
  const becameConfirmed = confirmed && previousResult?.result !== "confirmed";
  const judgementResult = {
    id: previousResult?.id || makeId("ai-judgement-result"),
    judgementItemId: judgementItem.id,
    judgementItemName: judgementItem.name,
    stepId: currentStep.id,
    purposes: [...(judgementItem.purposes || [])],
    result: confirmed ? "confirmed" : "observing",
    satisfiedConditionIds: conditions
      .filter(conditionSatisfied)
      .map((item) => item.id),
    observedAt: when,
  };
  const aiJudgementResults = [
    ...runtime.aiJudgementResults.filter(
      (item) =>
        !(
          item.stepId === currentStep.id &&
          item.judgementItemId === judgementItem.id
        ),
    ),
    judgementResult,
  ];
  let workingRuntime = { ...runtime, aiObservations, aiJudgementResults };
  let steps = session.steps;
  let scoreEvents = [];
  if (becameConfirmed) {
    const scoring = applyAiJudgementScoring({
      session: { ...session, steps },
      runtime: workingRuntime,
      judgementItem,
      scoreRules: sopSnapshot?.scoreRules || [],
      when,
      makeId,
    });
    steps = scoring.steps;
    workingRuntime = scoring.runtime;
    scoreEvents = scoring.events;
  }
  const newSafetyCandidates =
    becameConfirmed && (judgementItem.purposes || []).includes("safety")
      ? (judgementItem.safetyRuleIds || [])
          .filter(
            (ruleId) =>
              !workingRuntime.safetyCandidates.some(
                (candidate) =>
                  candidate.safetyRuleId === ruleId &&
                  candidate.stepId === currentStep.id &&
                  candidate.status === "pending",
              ),
          )
          .map((ruleId) => ({
            id: makeId("safety-candidate"),
            safetyRuleId: ruleId,
            stepId: currentStep.id,
            status: "pending",
            sourceJudgementItemId: judgementItem.id,
            createdAt: when,
          }))
      : [];
  workingRuntime = {
    ...workingRuntime,
    safetyCandidates: [
      ...workingRuntime.safetyCandidates,
      ...newSafetyCandidates,
    ],
  };
  const safetyBlocked = workingRuntime.safetyCandidates.some(
    (candidate) =>
      candidate.stepId === currentStep.id && candidate.status === "pending",
  );
  const completionItems = judgementItems.filter((item) =>
    (item.purposes || []).includes("completion"),
  );
  const completionReady =
    completionItems.length > 0 &&
    completionItems.every((item) =>
      aiJudgementResults.some(
        (result) =>
          result.judgementItemId === item.id && result.result === "confirmed",
      ),
    );
  let currentStepId = session.currentStepId;
  let completed = false;
  if (completionReady && !safetyBlocked) {
    const completion = completeCurrentStep(
      { ...session, steps },
      workingRuntime,
      currentStep.id,
      when,
    );
    steps = completion.steps;
    currentStepId = completion.currentStepId;
    completed = true;
  } else if (safetyBlocked) {
    steps = steps.map((step) =>
      step.id === currentStep.id
        ? {
            ...step,
            state: step.state === "pass" ? "active" : step.state,
            executionState: "safety_blocked",
            completionResult: "uncertain",
            observationWindow: {
              ...step.observationWindow,
              status: "open",
              closedAt: "",
              closeReason: "",
            },
          }
        : step,
    );
    workingRuntime = {
      ...workingRuntime,
      evaluationClock: setEvaluationClockPaused(
        workingRuntime.evaluationClock,
        true,
        { reason: "安全候选等待教师确认", at: when },
      ),
    };
  }
  const scoreEngine = calculateScoreEngine({ steps });
  const updatedSession = {
    ...session,
    status: safetyBlocked ? "已暂停" : session.status,
    currentStepId: safetyBlocked ? currentStep.id : currentStepId,
    steps,
    score: scoreEngine.effectiveScore,
    scoreEngine,
    runtime: workingRuntime,
    events: [
      {
        time: String(when).slice(-5),
        level: safetyBlocked ? "danger" : confirmed ? "green" : "blue",
        title: confirmed ? "AI判断项成立" : "AI判断条件已观察",
        detail: `${judgementItem.name} · ${capability?.name || "AI能力"}`,
      },
      ...scoreEvents,
      ...(session.events || []),
    ],
  };
  return {
    updatedSession,
    confirmed,
    completed,
    completionReady,
    safetyBlocked,
    observation,
    judgementResult,
  };
}

export function resolveAiSafetyCandidate({
  session,
  candidateId,
  resolution,
  sopSnapshot,
  when,
  resolvedBy = "王老师",
}) {
  const runtime = normalizedRuntime(session || {});
  const candidate = runtime.safetyCandidates.find(
    (item) => item.id === candidateId && item.status === "pending",
  );
  if (!session || !candidate) throw new Error("待处理安全候选不存在。");
  const confirmed = resolution === "confirmed";
  const safetyRule = (sopSnapshot?.safetyRules || []).find(
    (item) => item.id === candidate.safetyRuleId,
  );
  let steps = session.steps.map((step) => {
    if (step.id !== candidate.stepId) return step;
    if (!confirmed) return { ...step, executionState: "active" };
    const hasScoringApplication = runtime.aiScoringApplications.some(
      (item) =>
        item.stepId === step.id &&
        ["applied", "corrected"].includes(item.status),
    );
    const scoreBeforeSafety = hasScoringApplication
      ? Number(step.effectiveScore ?? step.score ?? step.maxScore ?? 0)
      : Number(step.maxScore || 0);
    const score =
      safetyRule?.scoreTreatment === "zero_step"
        ? 0
        : safetyRule?.scoreTreatment === "fixed_deduction"
          ? Math.max(
              0,
              scoreBeforeSafety - Number(safetyRule.deductionValue || 0),
            )
          : step.effectiveScore;
    return {
      ...step,
      executionState:
        safetyRule?.sessionTreatment === "terminate_after_confirmation"
          ? "terminated"
          : safetyRule?.sessionTreatment === "continue_after_review"
            ? "active"
            : "paused",
      completionResult: "not_completed",
      result: "安全违规已确认",
      effectiveScore: score,
      score,
      scoreDisposition:
        safetyRule?.scoreTreatment === "teacher_review"
          ? {
              status: "pending",
              reason: "安全规则要求教师处置成绩",
              resolvedBy: "",
              resolvedAt: "",
            }
          : step.scoreDisposition,
    };
  });
  const safetyCandidates = runtime.safetyCandidates.map((item) =>
    item.id === candidateId
      ? {
          ...item,
          status: confirmed ? "confirmed" : "false_positive",
          resolvedAt: when,
          resolvedBy,
        }
      : item,
  );
  const remainingPending = safetyCandidates.some(
    (item) => item.stepId === candidate.stepId && item.status === "pending",
  );
  let currentStepId = session.currentStepId;
  let completed = false;
  const aiConfig = session.evaluationSnapshot?.aiCapabilityConfigSnapshot || {};
  const completionItems = activeJudgementItems(aiConfig).filter(
    (item) =>
      item.stepId === candidate.stepId &&
      (item.purposes || []).includes("completion"),
  );
  const completionReady =
    completionItems.length > 0 &&
    completionItems.every((item) =>
      runtime.aiJudgementResults.some(
        (result) =>
          result.judgementItemId === item.id && result.result === "confirmed",
      ),
    );
  const nextRuntime = { ...runtime, safetyCandidates };
  if (!confirmed && !remainingPending && completionReady) {
    const completion = completeCurrentStep(
      { ...session, steps },
      nextRuntime,
      candidate.stepId,
      when,
    );
    steps = completion.steps;
    currentStepId = completion.currentStepId;
    completed = true;
  }
  const terminated =
    confirmed &&
    safetyRule?.sessionTreatment === "terminate_after_confirmation";
  const remainsPaused =
    confirmed && safetyRule?.sessionTreatment === "pause_for_review";
  const scoreEngine = calculateScoreEngine({ steps });
  return {
    ...session,
    status: terminated ? "待复位" : remainsPaused ? "已暂停" : "进行中",
    currentStepId: terminated ? "" : currentStepId,
    steps,
    score: scoreEngine.effectiveScore,
    scoreEngine,
    runtime: {
      ...nextRuntime,
      evaluationClock:
        terminated || remainsPaused
          ? nextRuntime.evaluationClock
          : setEvaluationClockPaused(nextRuntime.evaluationClock, false, {
              reason: confirmed ? "安全违规已处置" : "安全候选误报排除",
              at: when,
            }),
    },
    events: [
      {
        time: String(when).slice(-5),
        level: confirmed ? "danger" : "green",
        title: confirmed ? "安全违规已确认" : "安全候选误报已排除",
        detail: confirmed
          ? "按教师预先定义的安全规则处理"
          : completed
            ? "误报已排除，已成立的完成判断继续生效"
            : "恢复操作且暂停时间不计入评价计时",
      },
      ...(session.events || []),
    ],
  };
}
