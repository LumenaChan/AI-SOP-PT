import { invalidateSopWorkstationConfigs } from "./sopWorkstationAiRules.js";
import { strictMetricNumber } from "./gradeScoreValidityRules.js";
// A standard is one mutable current object. Historical comparison and AI
// applicability use captured content, never a teacher-managed version number.
const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
      : value;
const pick = (value, keys) =>
  Object.fromEntries(keys.map((key) => [key, value?.[key] ?? ""]));
export function standardScoringKey(sop) {
  if (!Array.isArray(sop?.steps) || !sop.steps.length) return "";
  const steps = sop.steps.map((s, i) => ({
    ...pick(s, [
      "id",
      "name",
      "completionCondition",
      "timeout",
      "incompletePolicy",
      "flowPolicy",
      "visualRequirements",
    ]),
    score: Number(s.score ?? s.maxScore),
    predecessor: s.predecessor || (i ? sop.steps[i - 1].id : "无"),
    attribute: s.attribute || "必做",
    judgementMode: s.expectedJudgementMode || s.judgementMode || "",
    scoringNote: s.legacyScoringNote || s.deductionRule || "",
    safetyNote: s.legacySafetyNote || s.redline || "",
  }));
  return JSON.stringify(
    stable({
      steps,
      scoreRules: sop.scoreRules || [],
      safetyRules: sop.safetyRules || [],
    }),
  );
}
export function standardDefinitionKey(sop) {
  return standardScoringKey(sop);
}
export function historicalStandardBasis(arrangement, session) {
  const containers = [
    session?.evaluationSnapshot,
    session?.snapshot,
    arrangement?.snapshot,
  ];
  const captured =
    containers.find(
      (value) =>
        value?.sopSnapshot &&
        !["legacy_current_fallback", "legacy_preserved_display"].includes(
          value.standardSnapshotProvenance,
        ),
    ) || containers.find((value) => value?.sopSnapshot);
  const sop = captured?.sopSnapshot;
  const steps = sop?.steps;
  const incomplete =
    !Array.isArray(steps) ||
    !steps.length ||
    ["legacy_current_fallback", "legacy_preserved_display"].includes(
      captured?.standardSnapshotProvenance,
    ) ||
    steps.some(
      (s) =>
        !s.id ||
        !s.name ||
        !s.completionCondition ||
        (s.score == null && s.maxScore == null) ||
        strictMetricNumber(s.score ?? s.maxScore) === null ||
        Number(s.score ?? s.maxScore) < 0,
    ) ||
    (session?.steps || []).some((s) => !steps.some((def) => def.id === s.id));
  return {
    sop: sop || null,
    complete: !incomplete,
    key: incomplete ? "" : standardScoringKey(sop),
    label: incomplete
      ? "历史标准信息不完整"
      : `${steps.length}步 · ${steps.reduce((sum, s) => sum + Number(s.score ?? s.maxScore), 0)}分`,
    reason: incomplete
      ? "当时的步骤或评分依据不完整，仅查看原始记录"
      : "按当时标准快照分析，相同评分口径合并统计",
  };
}
// Legacy technical references remain readable until the standard is actually
// changed. Thereafter only a captured matching definition can authorize reuse.
export function standardReferenceMatches(reference, sop) {
  if (!reference || !sop) return false;
  const id = reference.sopId || reference.authoredFor?.sopId;
  if (id && id !== sop.id) return false;
  const key =
    reference.standardDefinitionKey ||
    reference.authoredFor?.standardDefinitionKey;
  if (key) return key === standardDefinitionKey(sop);
  if (sop.standardContentChangedAt) return false;
  return (
    !reference.sopVersion ||
    !sop.version ||
    reference.sopVersion === sop.version
  );
}
export function preserveStandardHistory(data, before, at) {
  return (data.arrangements || []).map((a) => {
    if (
      a.sopId !== before.id ||
      (!(a.sessions || []).length &&
        !(a.openWorkstationIds || []).length &&
        !a.startedAt)
    )
      return a;
    if (a.snapshot?.sopSnapshot) return a;
    // Preserve the old display fallback without pretending it is a newly
    // recovered historical scoring snapshot.
    return {
      ...a,
      snapshot: {
        ...a.snapshot,
        sopId: before.id,
        sopSnapshot: clone(before),
        lockedAt: a.snapshot?.lockedAt || at,
        standardSnapshotProvenance: "legacy_preserved_display",
      },
    };
  });
}
export function overwriteCurrentStandard(existing, input, at) {
  if (!existing || !["草稿", "已发布", "已停用"].includes(existing.status))
    throw new Error("当前实训标准不可编辑。");
  if (
    input.updatedAt &&
    existing.updatedAt &&
    input.updatedAt !== existing.updatedAt
  )
    throw new Error("实训标准已被更新，请刷新后重新核对修改。");
  const next = {
    ...existing,
    ...input,
    id: existing.id,
    version: existing.version,
    familyId: existing.familyId,
    status: existing.status,
    frozen: false,
    history: existing.history || [],
    signedBy: existing.signedBy,
    publishedAt: existing.publishedAt,
    name: String(input.name || "").trim(),
    updatedAt: at,
  };
  if (!next.name) throw new Error("请填写实训标准名称。");
  const criticalChange =
    standardDefinitionKey(existing) !== standardDefinitionKey(next);
  next.standardDefinitionKey = standardDefinitionKey(next);
  if (criticalChange) next.standardContentChangedAt = at;
  else next.standardContentChangedAt = existing.standardContentChangedAt || "";
  return { standard: next, criticalChange };
}

// Shared transaction: immutable historical captures and independent AI releases
// survive; only current applicability / workstation validation is invalidated.
export function applyCurrentStandardUpdate(
  data,
  existing,
  standard,
  criticalChange,
  at,
) {
  return {
    ...data,
    sops: data.sops.map((s) => (s.id === existing.id ? standard : s)),
    arrangements: preserveStandardHistory(data, existing, at),
    aiCapabilityConfigs: (data.aiCapabilityConfigs || []).map((config) =>
      criticalChange && config.sopId === existing.id
        ? {
            ...config,
            status: "configuring",
            standardReviewRequired: true,
            updatedAt: at,
            completedAt: "",
          }
        : config,
    ),
    sopWorkstationAiConfigs: criticalChange
      ? invalidateSopWorkstationConfigs(
          data.sopWorkstationAiConfigs || [],
          (relation) =>
            (data.aiCapabilityConfigs || []).some(
              (config) =>
                config.sopId === existing.id &&
                config.id === relation.sopAiConfigId,
            ),
          at,
          "实训标准的步骤或评分依据已更新，请核对AI配置并重新验证",
        ).configs
      : data.sopWorkstationAiConfigs,
  };
}
