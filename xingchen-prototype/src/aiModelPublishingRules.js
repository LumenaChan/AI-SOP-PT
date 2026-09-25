function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function metricSummaryForTask(task) {
  const result = task?.result || {};
  return task?.capabilityType === "action_recognition"
    ? {
        overallAccuracy: result.overallAccuracy,
        testSampleCount: result.testSampleCount,
      }
    : {
        precision: result.precision,
        recall: result.recall,
        compositeMetric: result.compositeMetric,
        testSampleCount: result.testSampleCount,
      };
}

export function buildPublicationReadiness(task) {
  const snapshot = task?.dataSnapshot;
  const result = task?.result;
  const categoryIds = (snapshot?.categories || []).map((item) => item.id);
  const resultCategoryIds = new Set(
    (result?.perCategory || []).map((item) => item.categoryId),
  );
  const checks = {
    taskCompleted: task?.status === "completed",
    modelArtifactExists: Boolean(task?.modelArtifactId),
    validationResultExists: Boolean(task?.validationResult),
    testResultExists: Boolean(result),
    testDataValid:
      Array.isArray(snapshot?.testItemIds) &&
      snapshot.testItemIds.length > 0 &&
      Number(result?.testSampleCount) > 0 &&
      result?.trainingTaskId === task?.id,
    categoryResultsComplete:
      categoryIds.length > 0 &&
      categoryIds.every((categoryId) => resultCategoryIds.has(categoryId)),
  };
  const messages = {
    taskCompleted: "训练任务已完成",
    modelArtifactExists: "模型产物完整有效",
    validationResultExists: "验证结果已生成",
    testResultExists: "独立测试结果已生成",
    testDataValid: "测试集来自当前训练任务快照且非空",
    categoryResultsComplete: "主要类别均有测试结果",
  };
  const blockers = [];
  if (!checks.taskCompleted) blockers.push("训练任务尚未完成。");
  if (!checks.modelArtifactExists) blockers.push("模型产物不存在或已失效。");
  if (!checks.validationResultExists) blockers.push("当前任务缺少验证结果。");
  if (!checks.testResultExists) blockers.push("当前任务缺少独立测试结果。");
  if (!checks.testDataValid)
    blockers.push("测试集为空，或测试结果与当前候选模型不对应。");
  if (!checks.categoryResultsComplete)
    blockers.push("一个或多个主要类别缺少测试结果。");
  return {
    checks,
    messages,
    blockers: [...new Set(blockers)],
    ready: blockers.length === 0,
  };
}

export function getCurrentCandidateTask(capability, tasks, publicationRecords) {
  if (!capability?.id) return null;
  const publishedTaskIds = new Set(
    (publicationRecords || [])
      .filter((record) => record.capabilityId === capability.id)
      .map((record) => record.trainingTaskId),
  );
  const candidates = (tasks || [])
    .filter(
      (task) =>
        task.capabilityId === capability.id &&
        task.status === "completed" &&
        task.modelArtifactId &&
        buildPublicationReadiness(task).ready &&
        !publishedTaskIds.has(task.id) &&
        task.id !== capability.currentPublishedModel?.trainingTaskId,
    )
    .sort((left, right) =>
      String(
        right.completedAt || right.updatedAt || right.createdAt,
      ).localeCompare(
        String(left.completedAt || left.updatedAt || left.createdAt),
      ),
    );
  if (capability.candidateTrainingTaskId) {
    const selected = candidates.find(
      (task) => task.id === capability.candidateTrainingTaskId,
    );
    if (selected) return selected;
  }
  return candidates[0] || null;
}

export function publishCandidateModel(
  { capability, task, publicationRecords = [], affectedConfigIds = [] },
  meta = {},
) {
  if (!capability?.id || task?.capabilityId !== capability.id)
    throw new Error("候选模型与当前AI能力不匹配。");
  const readiness = buildPublicationReadiness(task);
  if (!readiness.ready)
    throw new Error(readiness.blockers[0] || "候选模型未通过发布前检查。");
  if (
    publicationRecords.some(
      (record) =>
        record.capabilityId === capability.id &&
        record.trainingTaskId === task.id,
    )
  )
    throw new Error("该训练任务已经发布，不能重复发布。");
  const now = meta.now || new Date().toISOString();
  const actor = meta.actor || "系统管理员";
  const replacedExistingModel = Boolean(
    capability.currentPublishedModel?.modelArtifactId,
  );
  const affectedIds = [...new Set(affectedConfigIds.filter(Boolean))];
  const metricSummary = metricSummaryForTask(task);
  const currentPublishedModel = {
    trainingTaskId: task.id,
    modelArtifactId: task.modelArtifactId,
    publishedBy: actor,
    publishedAt: now,
    metricSummary: clone(metricSummary),
  };
  const record = {
    id: meta.recordId || `model-publication-${Date.now()}`,
    capabilityId: capability.id,
    trainingTaskId: task.id,
    modelArtifactId: task.modelArtifactId,
    publishedBy: actor,
    publishedAt: now,
    metricSummary: clone(metricSummary),
    replacedExistingModel,
    previousTrainingTaskId:
      capability.currentPublishedModel?.trainingTaskId || "",
    affectedConfigCount: affectedIds.length,
    affectedConfigIds: affectedIds,
  };
  const event = {
    id: meta.eventId || `capability-model-updated-${Date.now()}`,
    type: "ai_capability_current_model_updated",
    capabilityId: capability.id,
    trainingTaskId: task.id,
    publishedAt: now,
    affectedConfigIds: affectedIds,
    validationStatus: affectedIds.length
      ? "pending_revalidation"
      : "not_applicable",
  };
  return {
    capability: {
      ...capability,
      status: "已发布",
      currentModelStatus: "已发布",
      currentPublishedModel,
      candidateTrainingTaskId: "",
      candidateModelStatus: "",
      updatedAt: now,
    },
    task: {
      ...task,
      publicationStatus: "published",
      publishedAt: now,
      updatedAt: now,
    },
    record,
    event,
    readiness,
  };
}

export function isCapabilityAvailableForConfiguration(capability) {
  return (
    capability?.status === "已发布" &&
    capability?.currentModelStatus === "已发布" &&
    Boolean(capability?.currentPublishedModel?.modelArtifactId)
  );
}

export function canReactivateCapabilityModel(capability) {
  return (
    capability?.status === "已停用" &&
    capability?.currentModelStatus === "已发布" &&
    Boolean(capability?.currentPublishedModel?.modelArtifactId) &&
    capability?.currentPublishedModel?.fileStatus !== "missing" &&
    capability?.currentPublishedModel?.fileStatus !== "invalid"
  );
}
