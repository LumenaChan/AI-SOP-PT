import { evaluateAiCapabilityConfig } from "./aiCapabilityConfigRules.js";
import {
  activeJudgementItems,
  checkSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
} from "./sopWorkstationAiRules.js";
import { normalizeWorkstationAiBaseConfig } from "./workstationAiRules.js";
import { createEvaluationClock } from "./domainRules.js";

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
  const automaticStepCount = new Set(
    (aiConfig?.stepConfigs || [])
      .filter((step) =>
        ["visual_auto", "visual_assist_default_pass"].includes(
          step.actualEvaluationMode,
        ),
      )
      .map((step) => step.stepId),
  ).size;
  const enabledStepCount = runtime.runnable
    ? new Set(judgementItems.map((item) => item.stepId)).size
    : 0;

  return {
    enabled: Boolean(runtime.runnable),
    runtimeStatus: runtime.code,
    runtimeLabel: runtime.label,
    reasons: unique(reasons),
    judgementItemCount: judgementItems.length,
    capabilityCount: capabilityIds.length,
    automaticStepCount,
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
    automaticEvaluationEnabled: Boolean(gate?.enabled),
    enabledStepCount: gate?.enabledStepCount || 0,
    automaticStepCount: gate?.automaticStepCount || 0,
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
      assistCamera: "正常",
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
