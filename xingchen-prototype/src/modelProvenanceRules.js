export const RESULT_SOURCES = {
  prototype_demo: "原型模拟",
  real: "真实模型执行",
  manual: "人工录入",
  legacy_unverified: "历史未核实",
};
export function modelSourceLabel(model) {
  return RESULT_SOURCES[model?.resultSource] || "历史未核实";
}
export function validateExistingModelReport(
  candidate,
  report,
  purpose = "prototype_demo",
) {
  const issues = [];
  if (!candidate?.id || !candidate.modelArtifactId)
    issues.push("模型候选不存在");
  if (
    report?.candidateId !== candidate?.id ||
    report?.modelArtifactId !== candidate?.modelArtifactId ||
    report?.capabilityId !== candidate?.capabilityId
  )
    issues.push("报告与候选、能力或模型产物不匹配");
  if (!report?.datasetRef || !report?.id || report?.passed !== true)
    issues.push("缺少通过的独立评测与数据标识");
  if (
    purpose === "real" &&
    (report?.resultSource !== "real" ||
      candidate?.integrationStatus !== "connected_verified" ||
      !report?.environmentRef ||
      !report?.eventMetrics)
  )
    issues.push("真实模型服务尚未接入核验，或缺少现场环境与事件级评测");
  return { ready: issues.length === 0, issues };
}
