export const TRAINING_SPLITS = {
  unassigned: "未分配",
  train: "训练集",
  validation: "验证集",
  test: "测试集",
};

export const DEFAULT_TRAINING_RATIOS = {
  train: 80,
  validation: 10,
  test: 10,
};

const ASSIGNED_SPLITS = ["train", "validation", "test"];

export function validateTrainingRatios(input = {}) {
  const ratios = {
    train: Number(input.train),
    validation: Number(input.validation),
    test: Number(input.test),
  };
  if (
    Object.values(ratios).some((value) => !Number.isFinite(value) || value <= 0)
  )
    throw new Error("训练集、验证集和测试集比例都必须大于0。");
  if (Math.abs(ratios.train + ratios.validation + ratios.test - 100) > 0.001)
    throw new Error("训练集、验证集和测试集比例之和必须等于100%。");
  return ratios;
}

function legalBox(box, allowedCategoryIds) {
  const x = Number(box?.x);
  const y = Number(box?.y);
  const width = Number(box?.width);
  const height = Number(box?.height);
  return (
    allowedCategoryIds.has(box?.categoryId) &&
    [x, y, width, height].every(Number.isFinite) &&
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x + width <= 1.000001 &&
    y + height <= 1.000001
  );
}

function fileIsValid(item, sourceById) {
  return (
    !!sourceById[item?.sourceVideoId] &&
    item?.generationStatus !== "failed" &&
    item?.fileStatus !== "invalid" &&
    item?.fileStatus !== "corrupt" &&
    item?.invalidatedAt == null
  );
}

function sourceDurationMs(source) {
  const parts = String(source?.duration || "")
    .split(":")
    .map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0))
    return 0;
  if (parts.length === 3)
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return parts[0] * 1000;
}

export function collectTrainingCandidates({
  capability,
  items,
  sourceVideos,
  categories,
}) {
  if (!capability?.id)
    return { candidates: [], unavailable: [], reasonCounts: {} };
  const scoped = (Array.isArray(items) ? items : []).filter(
    (item) => item?.capabilityId === capability.id,
  );
  const sourceById = Object.fromEntries(
    (sourceVideos || [])
      .filter((item) => item?.capabilityId === capability.id)
      .map((item) => [item.id, item]),
  );
  const allowedCategories = (categories || []).filter(
    (item) => item?.capabilityId === capability.id,
  );
  const allowedCategoryIds = new Set(allowedCategories.map((item) => item.id));
  const unavailable = [];
  const candidates = [];
  for (const item of scoped) {
    let reason = "";
    if (item.manualCleaningStatus !== "kept") reason = "未人工保留";
    else if (item.annotationStatus !== "completed") reason = "标注未完成";
    else if (!fileIsValid(item, sourceById)) reason = "文件或来源无效";
    else if (capability.type === "object_detection") {
      const boxes = Array.isArray(item.boxes) ? item.boxes : [];
      if (!item.noTargetConfirmed && !boxes.length) reason = "目标标注不完整";
      else if (
        !item.noTargetConfirmed &&
        boxes.some((box) => !legalBox(box, allowedCategoryIds))
      )
        reason = "目标框无效";
      else if (item.noTargetConfirmed && boxes.length)
        reason = "无目标状态冲突";
    } else if (capability.type === "action_recognition") {
      const startMs = Number(item.refinedStartMs);
      const endMs = Number(item.refinedEndMs);
      const durationMs = sourceDurationMs(sourceById[item.sourceVideoId]);
      if (!allowedCategoryIds.has(item.actionCategoryId))
        reason = "动作类别无效";
      else if (
        !Number.isFinite(startMs) ||
        !Number.isFinite(endMs) ||
        startMs < 0 ||
        endMs <= startMs
      )
        reason = "动作区间无效";
      else if (durationMs > 0 && endMs > durationMs) reason = "动作区间无效";
    } else reason = "能力类型不支持";
    if (reason) unavailable.push({ item, reason });
    else candidates.push(item);
  }
  const reasonCounts = unavailable.reduce((result, entry) => {
    result[entry.reason] = (result[entry.reason] || 0) + 1;
    return result;
  }, {});
  return { candidates, unavailable, reasonCounts };
}

function categoryIdsForItem(item, capability) {
  if (capability.type === "object_detection")
    return [
      ...new Set(
        (item.boxes || []).map((box) => box.categoryId).filter(Boolean),
      ),
    ];
  return item.actionCategoryId ? [item.actionCategoryId] : [];
}

export function groupTrainingCandidates({
  candidates,
  sourceVideos,
  categories,
  capability,
  config,
}) {
  const sourceById = Object.fromEntries(
    (sourceVideos || []).map((item) => [item.id, item]),
  );
  const categoryById = Object.fromEntries(
    (categories || []).map((item) => [item.id, item]),
  );
  const grouped = new Map();
  for (const item of candidates || []) {
    if (!grouped.has(item.sourceVideoId)) grouped.set(item.sourceVideoId, []);
    grouped.get(item.sourceVideoId).push(item);
  }
  return [...grouped.entries()].map(([sourceVideoId, groupItems]) => {
    const assignment = config?.sourceAssignments?.[sourceVideoId];
    const assignedIds = new Set(assignment?.itemIds || []);
    const includesNewData = groupItems.some(
      (item) => !assignedIds.has(item.id),
    );
    const split =
      ASSIGNED_SPLITS.includes(assignment?.split) && !includesNewData
        ? assignment.split
        : "unassigned";
    const categoryIds = [
      ...new Set(
        groupItems.flatMap((item) => categoryIdsForItem(item, capability)),
      ),
    ];
    return {
      sourceVideoId,
      sourceGroupId: sourceById[sourceVideoId]?.sourceGroupId || sourceVideoId,
      sourceVideo: sourceById[sourceVideoId],
      items: groupItems,
      itemIds: groupItems.map((item) => item.id),
      itemCount: groupItems.length,
      categoryIds,
      categoryNames: categoryIds.map(
        (id) => categoryById[id]?.name || "失效类别",
      ),
      noTargetCount: groupItems.filter((item) => item.noTargetConfirmed).length,
      split,
      includesNewData,
    };
  });
}

function coverageScore(group, targetCategoryIds) {
  const categories = new Set(group.categoryIds);
  return targetCategoryIds.reduce(
    (score, id) => score + (categories.has(id) ? 1 : 0),
    0,
  );
}

export function autoAssignSourceGroups(
  groups,
  inputRatios,
  targetCategoryIds = [],
) {
  const ratios = validateTrainingRatios(inputRatios);
  const list = [...(groups || [])];
  const assignments = {};
  if (!list.length) return assignments;
  const remaining = [...list];
  const takeBest = (score) => {
    remaining.sort(
      (a, b) =>
        score(b) - score(a) ||
        b.itemCount - a.itemCount ||
        a.sourceVideoId.localeCompare(b.sourceVideoId),
    );
    return remaining.shift();
  };
  if (remaining.length >= 3) {
    const validation = takeBest((group) =>
      coverageScore(group, targetCategoryIds),
    );
    const test = takeBest((group) => coverageScore(group, targetCategoryIds));
    const train = takeBest((group) => group.itemCount);
    assignments[validation.sourceVideoId] = {
      split: "validation",
      itemIds: validation.itemIds,
    };
    assignments[test.sourceVideoId] = { split: "test", itemIds: test.itemIds };
    assignments[train.sourceVideoId] = {
      split: "train",
      itemIds: train.itemIds,
    };
  } else {
    const train = takeBest((group) => group.itemCount);
    assignments[train.sourceVideoId] = {
      split: "train",
      itemIds: train.itemIds,
    };
    if (remaining.length) {
      const validation = takeBest((group) =>
        coverageScore(group, targetCategoryIds),
      );
      assignments[validation.sourceVideoId] = {
        split: "validation",
        itemIds: validation.itemIds,
      };
    }
  }
  const desired = {
    train:
      (list.reduce((sum, group) => sum + group.itemCount, 0) * ratios.train) /
      100,
    validation:
      (list.reduce((sum, group) => sum + group.itemCount, 0) *
        ratios.validation) /
      100,
    test:
      (list.reduce((sum, group) => sum + group.itemCount, 0) * ratios.test) /
      100,
  };
  const counts = { train: 0, validation: 0, test: 0 };
  for (const [sourceVideoId, assignment] of Object.entries(assignments)) {
    counts[assignment.split] +=
      list.find((group) => group.sourceVideoId === sourceVideoId)?.itemCount ||
      0;
  }
  for (const group of remaining) {
    const split = ASSIGNED_SPLITS.reduce((best, candidate) => {
      const candidateNeed = desired[candidate] - counts[candidate];
      const bestNeed = desired[best] - counts[best];
      return candidateNeed > bestNeed ? candidate : best;
    }, "train");
    assignments[group.sourceVideoId] = { split, itemIds: group.itemIds };
    counts[split] += group.itemCount;
  }
  return assignments;
}

export function assignSourceGroup(config, group, split) {
  if (!group?.sourceVideoId) throw new Error("原始视频数据组不存在或已失效。");
  if (!ASSIGNED_SPLITS.includes(split))
    throw new Error("请选择训练集、验证集或测试集。");
  return {
    ...(config || {}),
    sourceAssignments: {
      ...(config?.sourceAssignments || {}),
      [group.sourceVideoId]: { split, itemIds: [...group.itemIds] },
    },
    readinessStatus: "pending",
    preparedAt: "",
  };
}

export function targetCategoryIdsFor(capability, candidates, categories) {
  const used = new Set(
    (candidates || []).flatMap((item) => categoryIdsForItem(item, capability)),
  );
  return (categories || [])
    .filter(
      (category) =>
        category.capabilityId === capability?.id &&
        !category.isBackground &&
        used.has(category.id),
    )
    .map((category) => category.id);
}

export function trainingCategoryDistribution({
  capability,
  candidates,
  groups,
  categories,
}) {
  const splitByItemId = new Map();
  for (const group of groups || [])
    for (const item of group.items || [])
      splitByItemId.set(item.id, group.split);
  const scopedCategories = (categories || []).filter(
    (category) => category.capabilityId === capability?.id,
  );
  const rows = scopedCategories.map((category) => {
    const matching = (candidates || []).filter((item) =>
      categoryIdsForItem(item, capability).includes(category.id),
    );
    const counts = Object.fromEntries(
      ["train", "validation", "test", "unassigned"].map((split) => [
        split,
        matching.filter(
          (item) => (splitByItemId.get(item.id) || "unassigned") === split,
        ).length,
      ]),
    );
    return {
      categoryId: category.id,
      name: category.name,
      isBackground: !!category.isBackground,
      itemCount: matching.length,
      boxCount:
        capability?.type === "object_detection"
          ? matching.reduce(
              (sum, item) =>
                sum +
                (item.boxes || []).filter(
                  (box) => box.categoryId === category.id,
                ).length,
              0,
            )
          : null,
      ...counts,
    };
  });
  const noTargetItems = (candidates || []).filter(
    (item) => item.noTargetConfirmed,
  );
  return {
    rows,
    positiveItemCount: (candidates || []).length - noTargetItems.length,
    noTargetItemCount: noTargetItems.length,
  };
}

function sameIds(left, right) {
  const a = [...new Set(left || [])].sort();
  const b = [...new Set(right || [])].sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function buildTrainingReadiness({
  capability,
  candidates,
  groups,
  categories,
  config,
}) {
  const distribution = trainingCategoryDistribution({
    capability,
    candidates,
    groups,
    categories,
  });
  const counts = Object.fromEntries(
    ["train", "validation", "test", "unassigned"].map((split) => [
      split,
      (groups || [])
        .filter((group) => group.split === split)
        .reduce((sum, group) => sum + group.itemCount, 0),
    ]),
  );
  const targetIds = targetCategoryIdsFor(capability, candidates, categories);
  const targetRows = distribution.rows.filter((row) =>
    targetIds.includes(row.categoryId),
  );
  const checks = {
    hasData: (candidates || []).length > 0,
    hasTrainData: counts.train > 0,
    hasValidationData: counts.validation > 0,
    hasTestData: counts.test > 0,
    allAssigned: counts.unassigned === 0,
    noSourceVideoLeakage: (groups || []).every(
      (group) =>
        ASSIGNED_SPLITS.includes(group.split) || group.split === "unassigned",
    ),
    annotationsComplete: true,
    filesValid: true,
    hasTargetCategories: targetIds.length > 0,
    hasPositiveImages:
      capability?.type !== "object_detection" ||
      distribution.positiveItemCount > 0,
    hasBackgroundCategory:
      capability?.type !== "action_recognition" ||
      (categories || []).some(
        (category) =>
          category.capabilityId === capability.id && category.isBackground,
      ),
    targetClassesCoveredInValidation:
      targetRows.length > 0 && targetRows.every((row) => row.validation > 0),
    targetClassesCoveredInTest:
      targetRows.length > 0 && targetRows.every((row) => row.test > 0),
  };
  const currentIds = (candidates || []).map((item) => item.id);
  const dataChanged = !sameIds(config?.lastSavedCandidateIds, currentIds);
  const blockers = [];
  if (!checks.hasData) blockers.push("当前没有已清洗且已标注的数据。");
  if (checks.hasData && !checks.allAssigned)
    blockers.push("仍有可用数据未分配到训练集、验证集或测试集。");
  if (!checks.hasTrainData) blockers.push("训练集没有数据。");
  if (!checks.hasValidationData) blockers.push("验证集没有数据。");
  if (!checks.hasTestData) blockers.push("测试集没有数据。");
  if (!checks.noSourceVideoLeakage)
    blockers.push("检测到同一原始视频的数据被分配到不同集合，请重新划分。");
  if (!checks.hasTargetCategories)
    blockers.push("当前没有可用于训练的主要目标类别。");
  if (!checks.hasPositiveImages)
    blockers.push("目标检测训练数据中没有包含目标框的图片。");
  if (!checks.hasBackgroundCategory)
    blockers.push("动作识别能力缺少“背景/非目标动作”类别。");
  if (targetRows.length && !checks.targetClassesCoveredInValidation)
    blockers.push("验证集缺少一个或多个主要目标类别。");
  if (targetRows.length && !checks.targetClassesCoveredInTest)
    blockers.push("测试集缺少一个或多个主要目标类别。");
  if (dataChanged)
    blockers.push("当前训练数据已发生变化，请保存划分并重新检查。");
  const warnings = [];
  if (
    capability?.type === "object_detection" &&
    !distribution.noTargetItemCount
  )
    warnings.push("当前没有无目标图片，建议补充负样本以改善数据分布。");
  if (
    capability?.type === "action_recognition" &&
    !distribution.rows.some((row) => row.isBackground && row.itemCount > 0)
  )
    warnings.push("当前没有背景/非目标动作片段，建议继续补充数据。");
  if ((candidates || []).length > 0 && (candidates || []).length < 10)
    warnings.push("当前样本数量较少，建议继续补充数据。");
  return {
    checks,
    counts,
    dataChanged,
    blockers: [...new Set(blockers)],
    warnings,
    ready: blockers.length === 0,
    distribution,
  };
}

export function summarizeTrainingData(
  candidates,
  groups,
  unavailableCount = 0,
) {
  const counts = { train: 0, validation: 0, test: 0, unassigned: 0 };
  for (const group of groups || []) counts[group.split] += group.itemCount;
  return {
    candidateCount: (candidates || []).length,
    assignedCount: counts.train + counts.validation + counts.test,
    unavailableCount,
    sourceVideoCount: (groups || []).length,
    ...counts,
  };
}
