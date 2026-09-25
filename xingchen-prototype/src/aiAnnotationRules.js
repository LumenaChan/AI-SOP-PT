export const ANNOTATION_STATUSES = {
  not_started: "待标注",
  completed: "已标注",
};

export function defaultAnnotationCategories(capability) {
  if (!capability?.id) return [];
  const primaryName = capability.targetName?.trim() || capability.name?.trim();
  const type = capability.type === "action_recognition" ? "action" : "object";
  const categories = [
    {
      id: `category-${capability.id}-primary`,
      capabilityId: capability.id,
      name: primaryName || "主要目标",
      type,
      isDefault: true,
      isBackground: false,
    },
  ];
  if (type === "action")
    categories.push({
      id: `category-${capability.id}-background`,
      capabilityId: capability.id,
      name: "背景/非目标动作",
      type: "action",
      isDefault: true,
      isBackground: true,
    });
  return categories;
}

function validateCategoryName(categories, capabilityId, name, excludeId = "") {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("请填写标注类别名称。");
  if (
    categories.some(
      (item) =>
        item.id !== excludeId &&
        item.capabilityId === capabilityId &&
        item.name.toLowerCase() === cleanName.toLowerCase(),
    )
  )
    throw new Error("当前AI能力下已存在同名标注类别。");
  return cleanName;
}

export function createAnnotationCategory(categories, input, meta) {
  const name = validateCategoryName(categories, input.capabilityId, input.name);
  if (!input.capabilityId) throw new Error("请先选择AI能力。");
  if (!["object", "action"].includes(input.type))
    throw new Error("标注类别类型无效。");
  return {
    id: meta.id,
    capabilityId: input.capabilityId,
    name,
    type: input.type,
    isDefault: false,
    isBackground: false,
    createdAt: meta.now,
    updatedAt: meta.now,
  };
}

function categoryUsageCount(categoryId, frames, clips) {
  const boxCount = (frames || []).reduce(
    (sum, item) =>
      sum +
      (item.boxes || []).filter((box) => box.categoryId === categoryId).length,
    0,
  );
  const clipCount = (clips || []).filter(
    (item) => item.actionCategoryId === categoryId,
  ).length;
  return boxCount + clipCount;
}

export function updateAnnotationCategory(categories, input, context) {
  const existing = categories.find((item) => item.id === input.id);
  if (!existing) throw new Error("标注类别不存在或已失效。");
  if (categoryUsageCount(existing.id, context.frames, context.clips) > 0)
    throw new Error("当前类别已有标注，请先清理相关标注后再修改。");
  const name = validateCategoryName(
    categories,
    existing.capabilityId,
    input.name,
    existing.id,
  );
  return categories.map((item) =>
    item.id === existing.id ? { ...item, name, updatedAt: context.now } : item,
  );
}

export function deleteAnnotationCategory(categories, categoryId, context) {
  const existing = categories.find((item) => item.id === categoryId);
  if (!existing) throw new Error("标注类别不存在或已失效。");
  if (existing.isBackground)
    throw new Error("“背景/非目标动作”是动作识别必需类别，不能删除。");
  const used = categoryUsageCount(categoryId, context.frames, context.clips);
  if (used)
    throw new Error(`当前类别已有 ${used} 条标注，请先清理相关标注后再删除。`);
  return categories.filter((item) => item.id !== categoryId);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function normalizeBox(box, categories, meta) {
  if (!categories.some((item) => item.id === box.categoryId))
    throw new Error("目标框必须选择当前AI能力下的标注类别。");
  const x = clamp(box.x, 0, 1);
  const y = clamp(box.y, 0, 1);
  const width = clamp(box.width, 0, 1 - x);
  const height = clamp(box.height, 0, 1 - y);
  if (width <= 0 || height <= 0) throw new Error("目标框宽度和高度必须大于0。");
  return {
    id: box.id || meta.boxId(),
    categoryId: box.categoryId,
    x,
    y,
    width,
    height,
  };
}

function assertAnnotationInput(item) {
  if (!item?.id) throw new Error("标注数据不存在或已失效。");
  if (item.manualCleaningStatus !== "kept")
    throw new Error("只有人工清洗已保留的数据可以进入标注。");
}

export function saveFrameAnnotation(item, input, categories, meta) {
  assertAnnotationInput(item);
  const allowed = categories.filter(
    (category) =>
      category.capabilityId === item.capabilityId && category.type === "object",
  );
  const noTargetConfirmed = !!input.noTargetConfirmed;
  const boxes = noTargetConfirmed
    ? []
    : (input.boxes || []).map((box) => normalizeBox(box, allowed, meta));
  if (!boxes.length && !noTargetConfirmed)
    throw new Error("请至少绘制一个有效目标框，或明确标记为“无目标”。");
  return {
    ...item,
    annotationStatus: "completed",
    noTargetConfirmed,
    boxes,
    annotatedBy: item.annotatedBy || meta.actor,
    annotatedAt: item.annotatedAt || meta.now,
    annotationUpdatedAt: meta.now,
  };
}

export function batchMarkFramesNoTarget(items, ids, meta) {
  const selected = new Set(ids || []);
  if (!selected.size) throw new Error("请至少选择一张图片。");
  if (items.filter((item) => selected.has(item.id)).length !== selected.size)
    throw new Error("部分图片不存在或不属于当前AI能力。");
  return items.map((item) =>
    selected.has(item.id)
      ? saveFrameAnnotation(item, { noTargetConfirmed: true, boxes: [] }, [], {
          ...meta,
          boxId: () => "",
        })
      : item,
  );
}

export function saveClipAnnotation(item, input, categories, sourceVideo, meta) {
  assertAnnotationInput(item);
  const allowed = categories.filter(
    (category) =>
      category.capabilityId === item.capabilityId && category.type === "action",
  );
  if (!allowed.some((category) => category.id === input.actionCategoryId))
    throw new Error("请选择当前AI能力下的动作类别。");
  const startMs = Number(input.refinedStartMs);
  const endMs = Number(input.refinedEndMs);
  const durationMs = Number(sourceVideo?.durationMs || 0);
  if (!Number.isFinite(startMs) || startMs < 0)
    throw new Error("开始时间无效。");
  if (!Number.isFinite(endMs) || endMs <= startMs)
    throw new Error("结束时间必须大于开始时间。");
  if (durationMs > 0 && endMs > durationMs)
    throw new Error("结束时间不能超过原始视频时长。");
  return {
    ...item,
    annotationStatus: "completed",
    actionCategoryId: input.actionCategoryId,
    refinedStartMs: Math.round(startMs),
    refinedEndMs: Math.round(endMs),
    annotatedBy: item.annotatedBy || meta.actor,
    annotatedAt: item.annotatedAt || meta.now,
    annotationUpdatedAt: meta.now,
  };
}

export function batchAssignActionCategory(
  items,
  ids,
  actionCategoryId,
  categories,
  sourceVideos,
  meta,
) {
  const selected = new Set(ids || []);
  if (!selected.size) throw new Error("请至少选择一个视频片段。");
  if (items.filter((item) => selected.has(item.id)).length !== selected.size)
    throw new Error("部分视频片段不存在或不属于当前AI能力。");
  const sourceById = Object.fromEntries(
    (sourceVideos || []).map((item) => [item.id, item]),
  );
  return items.map((item) =>
    selected.has(item.id)
      ? saveClipAnnotation(
          item,
          {
            actionCategoryId,
            refinedStartMs: item.refinedStartMs ?? item.startMs,
            refinedEndMs: item.refinedEndMs ?? item.endMs,
          },
          categories,
          sourceById[item.sourceVideoId],
          meta,
        )
      : item,
  );
}

export function summarizeAnnotations(items) {
  const list = Array.isArray(items) ? items : [];
  const completed = list.filter(
    (item) => item.annotationStatus === "completed",
  ).length;
  return {
    total: list.length,
    pending: list.length - completed,
    completed,
    completionRate: list.length
      ? Math.round((completed / list.length) * 1000) / 10
      : 0,
  };
}
