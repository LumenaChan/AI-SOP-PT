// These records are supplied by the execution service. UI case saves can only
// reference them; selecting a label never promotes manual evidence to service evidence.
export function readableValidationText(value) {
  const text = String(value || "").trim();
  return (
    text.length >= 8 &&
    !/^(?:[\d\s.,，。-]+|通过|正常|无|ok|test|测试|与预期一致)$/i.test(text)
  );
}
export function validationEvidenceUrl(value) {
  const text = String(value || "").trim();
  if (/^\/(?!\/)[^\s\\]*$/.test(text)) return text;
  try {
    const url = new URL(text);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function referencedValidationCapabilities(aiConfig, capabilities = []) {
  const ids = new Set(
    (aiConfig?.judgementItems || [])
      .flatMap((i) => (i.conditions || []).map((c) => c.capabilityId))
      .filter(Boolean),
  );
  return [...ids].map(
    (id) => capabilities.find((c) => c.id === id) || { id, name: "能力已失效" },
  );
}
export function currentModelReport(capability, data = {}) {
  const model = capability?.currentPublishedModel;
  return (
    model?.independentReport ||
    (data.aiTrainingTasks || []).find((t) => t.id === model?.trainingTaskId)
      ?.independentReport ||
    (data.aiExistingModelCandidates || []).find(
      (c) =>
        c.id === model?.candidateId &&
        c.modelArtifactId === model?.modelArtifactId,
    )?.independentReport ||
    null
  );
}
export function fieldModelIssues(capabilities, data = {}) {
  const issues = [];
  if (!capabilities.length) issues.push("没有可验收的AI能力");
  for (const capability of capabilities) {
    const model = capability.currentPublishedModel,
      report = currentModelReport(capability, data);
    if (
      capability.status !== "已发布" ||
      capability.currentModelStatus !== "已发布" ||
      model?.resultSource !== "real" ||
      model?.integrationStatus !== "connected_verified"
    )
      issues.push(`${capability.name || capability.id}：模型接入尚未核验`);
    if (
      !report?.id ||
      report.resultSource !== "real" ||
      report.passed !== true ||
      !report.datasetRef ||
      !report.eventMetrics ||
      !Object.keys(report.eventMetrics).length ||
      report.modelArtifactId !== model?.modelArtifactId ||
      (report.capabilityId && report.capabilityId !== capability.id)
    )
      issues.push(
        `${capability.name || capability.id}：缺少匹配当前模型的独立评测报告`,
      );
  }
  return issues;
}
export function executionRecordIssues(
  record,
  relation,
  validationCase,
  aiConfig,
  capabilities = [],
) {
  const issues = [];
  if (
    validationCase.executionAttemptId &&
    record?.executionAttemptId !== validationCase.executionAttemptId
  )
    issues.push("执行记录不属于本次用例执行");
  if (
    !record?.id ||
    record.relationId !== relation.id ||
    !relation.validationRunId ||
    record.validationRunId !== relation.validationRunId ||
    record.caseId !== validationCase.id ||
    record.scenarioType !== validationCase.scenarioType ||
    record.contextKey !== relation.validationContextKey
  )
    issues.push("执行记录不属于当前工位、本轮验证或本用例");
  if (
    record?.resultSource !== "real" ||
    record?.integrationStatus !== "connected_verified"
  )
    issues.push("执行结果尚未由模型服务核验");
  if (
    !readableValidationText(record?.actualResult) ||
    !record?.executor ||
    !record?.completedAt ||
    !validationEvidenceUrl(record?.evidenceUrl)
  )
    issues.push("执行记录缺少有效输出、执行人、时间或可查看证据");
  if (
    !Number.isFinite(Date.parse(record?.completedAt || "")) ||
    Date.parse(record.completedAt) <
      Date.parse(relation.validationStartedAt || "")
  )
    issues.push("执行时间不属于本轮验证");
  const selected = validationCase.judgementItemIds || [];
  if (
    !selected.length ||
    selected.some((id) => !(record?.judgementItemIds || []).includes(id))
  )
    issues.push("执行记录未覆盖本用例所选判断项");
  const ids = new Set(
    (aiConfig.judgementItems || [])
      .filter((i) => selected.includes(i.id))
      .flatMap((i) => (i.conditions || []).map((c) => c.capabilityId))
      .filter(Boolean),
  );
  for (const id of ids) {
    const model = capabilities.find((c) => c.id === id)?.currentPublishedModel;
    if (
      !model?.modelArtifactId ||
      !(record?.modelArtifacts || []).some(
        (m) =>
          m.capabilityId === id && m.modelArtifactId === model.modelArtifactId,
      )
    )
      issues.push("执行记录使用的模型与当前发布模型不一致");
  }
  return [...new Set(issues)];
}
export function fieldAcceptanceIssues({
  relation,
  aiConfig,
  capabilities = [],
  data = {},
}) {
  const issues = [];
  if (relation.validationPurpose !== "real")
    issues.push("配置检查不能替代现场验收，请选择现场验证");
  if (!relation.validationRunId) issues.push("请开始新一轮现场验证");
  issues.push(
    ...fieldModelIssues(
      referencedValidationCapabilities(aiConfig, capabilities),
      data,
    ),
  );
  for (const c of relation.validationCases || []) {
    if (c.result === "not_applicable") continue;
    const record = (data.aiFieldValidationExecutions || []).find(
      (r) => r.id === c.executionRecordId,
    );
    const errors = executionRecordIssues(
      record,
      relation,
      c,
      aiConfig,
      capabilities,
    );
    if (
      record &&
      c.executionRecordSnapshot &&
      [
        "actualResult",
        "evidenceUrl",
        "executor",
        "completedAt",
        "expectationMatched",
        "modelArtifacts",
        "judgementItemIds",
      ].some(
        (key) =>
          JSON.stringify(record[key]) !==
          JSON.stringify(c.executionRecordSnapshot[key]),
      )
    )
      errors.push("执行记录内容已变化，请重新核对用例");
    if (c.result === "passed" && record?.expectationMatched !== true)
      errors.push("执行记录未确认符合期望");
    if (errors.length) issues.push(`${c.name}：${errors.join("；")}`);
  }
  return [...new Set(issues)];
}
