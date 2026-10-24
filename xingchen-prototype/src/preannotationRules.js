import { prototypeDataFingerprint } from "./storageMigrationRules.js";
export const SAMPLE_TYPES = {
  standard: "标准操作",
  variation: "合法变化",
  error: "已知错误",
  incomplete: "真实未完成",
  lookalike: "相似无效动作",
  background: "背景",
  uncertain: "不可判定",
};
export const SAMPLE_USES = {
  development: "开发训练",
  validation: "验证调优",
  sealed_test: "封存测试",
};
export function sourceDurationMs(source = {}) {
  if (Number(source.durationMs) > 0) return Number(source.durationMs);
  const values = String(source.duration || "")
    .split(":")
    .map(Number);
  if (!values.length || values.some((n) => !Number.isFinite(n) || n < 0))
    return 0;
  return values.reduce((a, n) => a * 60 + n, 0) * 1000;
}
export function suggestionBaseline(item, source, categories) {
  return prototypeDataFingerprint({
    source: [
      source?.id,
      source?.storageRef,
      source?.duration,
      source?.durationMs,
      source?.sampleUse,
      source?.sourceGroupId,
      source?.participantId,
    ],
    item: [
      item.id,
      item.capabilityId,
      item.sourceVideoId,
      item.annotationStatus,
      item.startMs,
      item.endMs,
      item.durationMs,
      item.boxes,
      item.noTargetConfirmed,
      item.actionCategoryId,
      item.refinedStartMs,
      item.refinedEndMs,
      item.annotationUpdatedAt,
      item.manualCleaningStatus,
    ],
    categories: categories.map((c) => [c.id, c.name, c.type, c.isBackground]),
  });
}
export function createPreannotationTask({
  items,
  sourceVideos,
  categories,
  capabilityId,
  id,
  now,
}) {
  if (!items.length) throw new Error("没有可处理的数据。");
  const sources = new Map(sourceVideos.map((x) => [x.id, x]));
  const usable = items.filter(
    (x) =>
      !!sources.get(x.sourceVideoId) &&
      x.manualCleaningStatus === "kept" &&
      x.annotationStatus !== "completed" &&
      sources.get(x.sourceVideoId)?.sampleUse !== "sealed_test",
  );
  if (!usable.length)
    throw new Error(
      "没有待标注且可用于预标注的样本；已标注与封存测试数据已跳过。",
    );
  return {
    id,
    capabilityId,
    status: "pending",
    resultSource: "prototype_demo",
    createdAt: now,
    items: usable.map((item) => ({
      itemId: item.id,
      baseline: suggestionBaseline(
        item,
        sources.get(item.sourceVideoId),
        categories,
      ),
    })),
    suggestions: [],
  };
}
export function finishPreannotationDemo(
  task,
  { items, sourceVideos, categories, now, failOne = false },
) {
  if (
    !["pending", "processing", "partial_failed", "failed"].includes(task.status)
  )
    throw new Error("该任务不能重复运行，请创建新任务。");
  const suggestions = task.items.map((ref, index) => {
    const previous = task.suggestions?.find((s) => s.itemId === ref.itemId);
    if (previous && !["failed"].includes(previous.status)) return previous;
    const item = items.find((x) => x.id === ref.itemId),
      source = sourceVideos.find((x) => x.id === item?.sourceVideoId);
    const base = {
      ...ref,
      status: "pending_confirmation",
      resultSource: "prototype_demo",
    };
    if (
      !item?.id ||
      !source?.id ||
      source.sampleUse === "sealed_test" ||
      item.annotationStatus === "completed" ||
      item.manualCleaningStatus !== "kept" ||
      suggestionBaseline(item, source, categories) !== ref.baseline ||
      (failOne && index === 0)
    )
      return {
        ...base,
        status: "failed",
        reason: "来源改变、样本不可用或演示失败，请检查后重新生成",
      };
    const primary = categories.find((c) => !c.isBackground);
    if (!primary) return { ...base, status: "failed", reason: "类别词表为空" };
    return item.startMs != null
      ? {
          ...base,
          actionCategoryId: primary.id,
          refinedStartMs: item.startMs,
          refinedEndMs: item.endMs,
        }
      : {
          ...base,
          boxes: [
            {
              id: `suggestion-${task.id}-${index}`,
              categoryId: primary.id,
              x: 0.25,
              y: 0.25,
              width: 0.3,
              height: 0.3,
            },
          ],
        };
  });
  const failed = suggestions.filter((s) => s.status === "failed").length;
  return {
    ...task,
    suggestions,
    status:
      failed === suggestions.length
        ? "failed"
        : failed
          ? "partial_failed"
          : "completed",
    completedAt: now,
  };
}
export function validateSuggestion(suggestion, item, source, categories) {
  if (!suggestion || suggestion.status !== "pending_confirmation")
    throw new Error("建议不可采用。");
  if (
    item.manualCleaningStatus !== "kept" ||
    source?.sampleUse === "sealed_test" ||
    suggestion.baseline !== suggestionBaseline(item, source, categories)
  )
    throw new Error("来源或人工标注已变化，建议已过期。");
  const ids = new Set(categories.map((c) => c.id));
  if (
    suggestion.boxes &&
    suggestion.boxes.some(
      (b) =>
        !ids.has(b.categoryId) ||
        ![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
        b.x < 0 ||
        b.y < 0 ||
        b.width <= 0 ||
        b.height <= 0 ||
        b.x + b.width > 1 ||
        b.y + b.height > 1,
    )
  )
    throw new Error("建议目标框或类别无效。");
  if (
    suggestion.actionCategoryId &&
    (!ids.has(suggestion.actionCategoryId) ||
      !Number.isFinite(suggestion.refinedStartMs) ||
      !Number.isFinite(suggestion.refinedEndMs) ||
      suggestion.refinedStartMs < 0 ||
      suggestion.refinedEndMs <= suggestion.refinedStartMs ||
      suggestion.refinedEndMs > sourceDurationMs(source))
  )
    throw new Error("建议动作类别或时间范围无效。");
  return suggestion;
}
export function confirmSuggestionSaved(
  data,
  reference,
  item,
  source,
  categories,
  now,
) {
  if (!reference) return data.aiPreannotationTasks || [];
  if (!item?.id || (reference.itemId && reference.itemId !== item.id))
    throw new Error("建议与当前样本不匹配。");
  const task = (data.aiPreannotationTasks || []).find(
      (t) => t.id === reference.taskId,
    ),
    suggestion = task?.suggestions.find((s) => s.itemId === item.id);
  validateSuggestion(suggestion, item, source, categories);
  return data.aiPreannotationTasks.map((t) =>
    t.id === task.id
      ? {
          ...t,
          suggestions: t.suggestions.map((s) =>
            s.itemId === item.id
              ? {
                  ...s,
                  status: "adopted",
                  adoptedAt: now,
                  confirmation: "human_saved",
                }
              : s,
          ),
        }
      : t,
  );
}
