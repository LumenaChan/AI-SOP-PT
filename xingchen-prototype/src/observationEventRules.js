import { bindingCameras } from "./cameraRules.js";
export function ingestObservation({
  session,
  runtime,
  judgementItem,
  condition,
  payload = {},
  when,
  makeId,
}) {
  const id = payload.id || makeId("ai-observation"),
    prior = (runtime.aiObservations || []).find((o) => o.id === id);
  if (prior) return { runtime, observation: prior, duplicate: true };
  const at = Date.parse(when.replace?.(" ", "T") || when) || Date.now(),
    start = Number(payload.startedAtMs ?? at),
    end = Number(payload.endedAtMs ?? start);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    throw new Error("观察起止时间无效。");
  const binding =
    session.evaluationSnapshot?.sopWorkstationAiConfigSnapshot?.judgementCameraBindings?.find(
      (b) => b.judgementItemId === judgementItem.id,
    );
  const cameraId =
    payload.cameraId ||
    bindingCameras(binding)[0] ||
    session.evaluationSnapshot?.workstationAiBaseConfigSnapshot
      ?.primaryCameraId ||
    "";
  const actorId = payload.actorId || session.studentId,
    resultSource = "prototype_demo";
  const captureStepId = session.currentStepId;
  const cameraActor = runtime.cameraActorBindings?.[cameraId],
    primaryCameraId =
      session.evaluationSnapshot?.workstationAiBaseConfigSnapshot
        ?.primaryCameraId;
  const cameraActorUnknown =
    cameraActor?.status === "uncertain" ||
    (cameraActor?.actorId && cameraActor.actorId !== session.studentId) ||
    (session.evaluationSnapshot?.evidenceSemantics === "observations_v1" &&
      cameraId !== primaryCameraId &&
      cameraActor?.status !== "confirmed");
  if (
    !["start", "complete", "interrupted", "invalid", "unknown"].includes(
      payload.phase || "complete",
    )
  )
    throw new Error("不支持的观察阶段。");
  if (
    !Number.isFinite(Number(payload.observedTargetCount ?? 1)) ||
    Number(payload.observedTargetCount ?? 1) < 0
  )
    throw new Error("观察目标数量无效。");
  const identityUnknown =
    actorId !== session.studentId ||
    runtime.actorBinding?.status !== "confirmed" ||
    cameraActorUnknown;
  const expectedModel = session.evaluationSnapshot?.capabilitySnapshots?.find(
    (c) => c.id === condition.capabilityId,
  )?.currentPublishedModel?.modelArtifactId;
  const reasons = [
    [
      session.evaluationSnapshot?.unavailableJudgementItemIds?.includes(
        judgementItem.id,
      ),
      "当前判断项必需的视角或区域不可用",
    ],
    [payload.sessionId && payload.sessionId !== session.id, "会话不匹配"],
    [
      payload.sopId && payload.sopId !== session.evaluationSnapshot?.sopId,
      "SOP不匹配",
    ],
    [
      payload.configId &&
        payload.configId !==
          session.evaluationSnapshot?.aiCapabilityConfigSnapshot?.id,
      "配置不匹配",
    ],
    [
      payload.modelArtifactId && payload.modelArtifactId !== expectedModel,
      "模型不匹配",
    ],
    [
      payload.capabilityId && payload.capabilityId !== condition.capabilityId,
      "能力不匹配",
    ],
    [identityUnknown, "操作人归属不明确"],
    [
      bindingCameras(binding).length &&
        !bindingCameras(binding).includes(cameraId),
      "来源相机不在判断项配置内",
    ],
    [
      (runtime.technicalIncidents || []).some(
        (i) =>
          i.status !== "resolved" && (i.cameraId === cameraId || !i.cameraId),
      ),
      "视频或技术异常未恢复",
    ],
    [
      (payload.visibility && payload.visibility !== "visible") ||
        payload.phase === "unknown",
      "关键证据不可见",
    ],
    [
      Number(payload.observedTargetCount ?? 1) <
        Number(condition.minTargetCount || 1),
      "可见目标数量不足",
    ],
    [
      payload.logicalAreaId &&
        condition.logicalAreaId &&
        payload.logicalAreaId !== condition.logicalAreaId,
      "不在要求的逻辑区域",
    ],
    [payload.phase === "invalid", "持续状态已失效"],
    [payload.phase === "interrupted", "动作中断"],
  ];
  const reason = reasons.find(([invalid]) => invalid)?.[1] || "";
  const observation = {
    ...payload,
    id,
    sessionId: session.id,
    judgementItemId: judgementItem.id,
    conditionId: condition.id,
    capabilityId: condition.capabilityId,
    stepId: judgementItem.stepId,
    captureStepId,
    actorId,
    cameraId,
    resultSource,
    startedAtMs: start,
    endedAtMs: end,
    observedAt: when,
    phase: payload.phase || "complete",
    visibility: payload.visibility || "visible",
    result: reason ? "unknown" : "observed",
    unknownReason: reason,
    observedDurationSeconds: (end - start) / 1000,
  };
  const events = [...(runtime.actionEvents || [])];
  const scope =
    judgementItem.observationScope === "session" &&
    condition.withinCurrentStep === false
      ? "session"
      : captureStepId;
  const matches = (e) =>
    e.judgementItemId === judgementItem.id &&
    e.conditionId === condition.id &&
    e.actorId === actorId &&
    e.cameraId === cameraId &&
    e.scope === scope;
  let index = events.findIndex(
    (e) =>
      matches(e) &&
      !["interrupted", "unknown"].includes(e.status) &&
      start <= e.endedAtMs &&
      end >= e.startedAtMs &&
      (!payload.eventId || e.externalEventId === payload.eventId),
  );
  if (payload.phase === "interrupted" || reason) {
    for (let i = 0; i < events.length; i++)
      if (matches(events[i]) && events[i].status === "observing")
        events[i] = {
          ...events[i],
          status: "interrupted",
          interruptedAt: when,
        };
  }
  if (index < 0) {
    events.push({
      id: makeId("action-event"),
      externalEventId: payload.eventId || id,
      judgementItemId: judgementItem.id,
      conditionId: condition.id,
      actorId,
      cameraId,
      scope,
      stepId: judgementItem.stepId,
      objectId: payload.objectId || "",
      startedAtMs: start,
      endedAtMs: end,
      observationIds: [id],
      resultSource,
      status: reason
        ? "unknown"
        : payload.phase === "start"
          ? "observing"
          : "complete",
    });
    index = events.length - 1;
  } else {
    const e = events[index];
    events[index] = {
      ...e,
      startedAtMs: Math.min(start, e.startedAtMs),
      endedAtMs: Math.max(end, e.endedAtMs),
      observationIds: [...e.observationIds, id],
      status: reason
        ? "unknown"
        : payload.phase === "start"
          ? "observing"
          : payload.phase === "interrupted"
            ? "interrupted"
            : "complete",
    };
  }
  if (
    (reason && ["unknown", "invalid"].includes(payload.phase)) ||
    (payload.visibility && payload.visibility !== "visible")
  ) {
    for (let i = 0; i < events.length; i++)
      if (matches(events[i]) && events[i].status === "observing")
        events[i] = { ...events[i], status: "interrupted" };
  }
  const stateStatuses = { ...(runtime.sustainedStates || {}) };
  const requirement = session.evaluationSnapshot?.sopSnapshot?.steps
    ?.find((s) => s.id === judgementItem.stepId)
    ?.visualRequirements?.find((r) => r.id === judgementItem.requirementId);
  const sopSteps = session.evaluationSnapshot?.sopSnapshot?.steps || [];
  const currentIndex = sopSteps.findIndex(
      (s) => s.id === session.currentStepId,
    ),
    startIndex = sopSteps.findIndex((s) => s.id === judgementItem.stepId),
    endIndex =
      requirement?.continuous === "specified"
        ? sopSteps.findIndex((s) => s.id === requirement.endStepId)
        : startIndex;
  const stateInScope =
    currentIndex >= startIndex && currentIndex <= endIndex && startIndex >= 0;
  observation.outsideRequirementWindow =
    requirement?.target === "state" && !stateInScope;
  if (requirement?.target === "state" && stateInScope)
    stateStatuses[requirement.id] = {
      requirementId: requirement.id,
      stepId: judgementItem.stepId,
      cameraId,
      actorId,
      status:
        payload.phase === "invalid" && payload.visibility !== "occluded"
          ? "invalid"
          : reason
            ? "unknown"
            : payload.phase === "start"
              ? "observing"
              : "valid",
      reason,
      observedAt: when,
    };
  return {
    observation,
    runtime: {
      ...runtime,
      sustainedStates: stateStatuses,
      aiObservations: [...(runtime.aiObservations || []), observation],
      actionEvents: events,
      lastNoTriggerReason: reason || "",
    },
    duplicate: false,
  };
}
export function eventConditionSatisfied(
  runtime,
  condition,
  judgementItem,
  session,
) {
  const binding =
      session.evaluationSnapshot?.sopWorkstationAiConfigSnapshot?.judgementCameraBindings?.find(
        (b) => b.judgementItemId === judgementItem.id,
      ),
    ids = bindingCameras(binding);
  const events = (runtime.actionEvents || []).filter(
    (e) =>
      e.judgementItemId === judgementItem.id &&
      e.conditionId === condition.id &&
      e.actorId === session.studentId &&
      ((judgementItem.observationScope === "session" &&
        condition.withinCurrentStep === false) ||
        e.scope === session.currentStepId) &&
      e.status === "complete" &&
      (e.endedAtMs - e.startedAtMs) / 1000 >=
        Number(condition.minDurationSeconds || 0),
  );
  const enough = (list) =>
    list.length >= Math.max(1, Number(condition.minOccurrences || 1));
  if (binding?.strategy === "all") {
    if (!ids.length) return false;
    const tolerance = Number(binding.timeToleranceMs ?? 1000);
    const anchors = events.filter((e) => e.cameraId === ids[0]);
    const matches = anchors.filter((anchor) =>
      ids
        .slice(1)
        .every((cameraId) =>
          events.some(
            (e) =>
              e.cameraId === cameraId &&
              Math.max(anchor.startedAtMs, e.startedAtMs) <=
                Math.min(anchor.endedAtMs, e.endedAtMs) + tolerance &&
              (!binding.sameObjectRequired ||
                (anchor.objectId && e.objectId === anchor.objectId)),
          ),
        ),
    );
    return enough(matches);
  }
  if (binding?.strategy === "any")
    return ids.some((id) => enough(events.filter((e) => e.cameraId === id)));
  return enough(events.filter((e) => !ids.length || ids.includes(e.cameraId)));
}
