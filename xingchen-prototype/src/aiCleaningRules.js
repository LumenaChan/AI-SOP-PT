export const AUTO_CLEANING_TASK_STATUSES = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
  partial_failed: "部分失败",
};

export const AUTO_CLEANING_RESULTS = {
  keep: "建议保留",
  auto_reject: "自动剔除",
};

export const CLEANING_REASONS = {
  blur: "画面模糊",
  severe_blur: "严重模糊",
  black_screen: "黑屏/无有效画面",
  too_dark: "过暗",
  overexposed: "过曝",
  highly_similar: "高度重复",
  low_resolution: "分辨率过低",
  corrupted: "文件损坏",
  too_short: "片段过短",
};

export const CLEANING_WARNINGS = {
  too_long: "片段时长超过建议范围",
};

export const CLEANING_SENSITIVITIES = {
  loose: "宽松",
  standard: "标准",
  strict: "严格",
};

export const DEFAULT_IMAGE_CLEANING_RULES = {
  blur: { enabled: true, sensitivity: "standard" },
  blackScreen: { enabled: true },
  darkness: { enabled: true, sensitivity: "standard" },
  overexposure: { enabled: true, sensitivity: "standard" },
  similarity: { enabled: true },
  resolution: { enabled: true, minWidth: 640, minHeight: 480 },
  corruption: { enabled: true },
};

export const DEFAULT_CLIP_CLEANING_RULES = {
  corruption: { enabled: true },
  blackScreen: { enabled: true },
  blur: { enabled: true, sensitivity: "standard" },
  darkness: { enabled: true, sensitivity: "standard" },
  overexposure: { enabled: true, sensitivity: "standard" },
  duration: { enabled: true, minSeconds: 1.5, maxSeconds: 30 },
  similarity: { enabled: true },
};

const IMAGE_LIMITS = {
  loose: { blur: 0.16, dark: 0.1, bright: 0.94 },
  standard: { blur: 0.3, dark: 0.18, bright: 0.88 },
  strict: { blur: 0.44, dark: 0.26, bright: 0.8 },
};

const CLIP_LIMITS = {
  loose: { blur: 0.88, black: 0.9, dark: 0.9, bright: 0.9 },
  standard: { blur: 0.75, black: 0.8, dark: 0.8, bright: 0.8 },
  strict: { blur: 0.62, black: 0.68, dark: 0.68, bright: 0.68 },
};

function sensitivity(value) {
  return Object.hasOwn(CLEANING_SENSITIVITIES, value) ? value : "standard";
}

function mockImageSignals(item, index) {
  const profiles = [
    { clarity: 0.76, brightness: 0.56 },
    { clarity: 0.23, brightness: 0.48 },
    { clarity: 0.67, brightness: 0.13 },
    { clarity: 0.7, brightness: 0.92 },
    { clarity: 0.64, brightness: 0.05, blackRatio: 0.94 },
    { clarity: 0.82, brightness: 0.52 },
  ];
  return {
    ...profiles[index % profiles.length],
    signature: `${item.sourceVideoId}:${Math.floor(Number(item.sourceTimeMs || 0) / 8000)}`,
    corrupted: String(item.storageRef || "").startsWith("corrupt://"),
  };
}

function mockClipSignals(item, index) {
  const profiles = [
    { blackRatio: 0.03, blurRatio: 0.08, darkRatio: 0.06, brightRatio: 0.03 },
    { blackRatio: 0.84, blurRatio: 0.15, darkRatio: 0.82, brightRatio: 0.01 },
    { blackRatio: 0.02, blurRatio: 0.82, darkRatio: 0.18, brightRatio: 0.04 },
    { blackRatio: 0.03, blurRatio: 0.12, darkRatio: 0.04, brightRatio: 0.84 },
    { blackRatio: 0.04, blurRatio: 0.1, darkRatio: 0.05, brightRatio: 0.03 },
  ];
  return {
    ...profiles[index % profiles.length],
    signature: item.qualitySignals?.signature || "",
    corrupted: String(item.storageRef || "").startsWith("corrupt://"),
  };
}

function groupedIndexes(items) {
  const groups = new Map();
  items.forEach((item, index) => {
    if (!groups.has(item.sourceVideoId)) groups.set(item.sourceVideoId, []);
    groups.get(item.sourceVideoId).push(index);
  });
  return groups;
}

function duplicateIndexes(items, signals, mode, enabled) {
  const duplicates = new Set();
  if (!enabled) return duplicates;
  for (const indexes of groupedIndexes(items).values()) {
    const signatures = new Set();
    indexes
      .slice()
      .sort((a, b) =>
        mode === "frames"
          ? Number(items[a].sourceTimeMs || 0) - Number(items[b].sourceTimeMs || 0)
          : Number(items[a].startMs || 0) - Number(items[b].startMs || 0),
      )
      .forEach((index, position, sorted) => {
        const signal = signals[index];
        if (signal.signature) {
          if (signatures.has(signal.signature)) duplicates.add(index);
          else signatures.add(signal.signature);
          return;
        }
        if (mode !== "clips" || position === 0) return;
        const previous = items[sorted[position - 1]];
        const current = items[index];
        const overlap = Math.max(
          0,
          Math.min(previous.endMs, current.endMs) -
            Math.max(previous.startMs, current.startMs),
        );
        const shortest = Math.min(previous.durationMs, current.durationMs);
        if (shortest > 0 && overlap / shortest >= 0.8) duplicates.add(index);
      });
  }
  return duplicates;
}

function imageReasons(item, signal, rules, duplicate) {
  const reasons = [];
  if (rules.corruption?.enabled && signal.corrupted) reasons.push("corrupted");
  if (rules.blackScreen?.enabled && Number(signal.blackRatio || 0) >= 0.9)
    reasons.push("black_screen");
  if (
    rules.blur?.enabled &&
    Number(signal.clarity ?? 1) < IMAGE_LIMITS[sensitivity(rules.blur.sensitivity)].blur
  )
    reasons.push("blur");
  if (
    rules.darkness?.enabled &&
    Number(signal.brightness ?? 0.5) <
      IMAGE_LIMITS[sensitivity(rules.darkness.sensitivity)].dark
  )
    reasons.push("too_dark");
  if (
    rules.overexposure?.enabled &&
    Number(signal.brightness ?? 0.5) >
      IMAGE_LIMITS[sensitivity(rules.overexposure.sensitivity)].bright
  )
    reasons.push("overexposed");
  if (
    rules.resolution?.enabled &&
    (Number(item.width || 0) < Number(rules.resolution.minWidth || 0) ||
      Number(item.height || 0) < Number(rules.resolution.minHeight || 0))
  )
    reasons.push("low_resolution");
  if (duplicate) reasons.push("highly_similar");
  return [...new Set(reasons)];
}

function clipReasons(item, signal, rules, duplicate) {
  const reasons = [];
  if (rules.corruption?.enabled && signal.corrupted) reasons.push("corrupted");
  if (
    rules.blackScreen?.enabled &&
    Number(signal.blackRatio || 0) >= CLIP_LIMITS.standard.black
  )
    reasons.push("black_screen");
  if (
    rules.blur?.enabled &&
    Number(signal.blurRatio || 0) >= CLIP_LIMITS[sensitivity(rules.blur.sensitivity)].blur
  )
    reasons.push("severe_blur");
  if (
    rules.darkness?.enabled &&
    Number(signal.darkRatio || 0) >=
      CLIP_LIMITS[sensitivity(rules.darkness.sensitivity)].dark
  )
    reasons.push("too_dark");
  if (
    rules.overexposure?.enabled &&
    Number(signal.brightRatio || 0) >=
      CLIP_LIMITS[sensitivity(rules.overexposure.sensitivity)].bright
  )
    reasons.push("overexposed");
  if (
    rules.duration?.enabled &&
    Number(item.durationMs || 0) < Number(rules.duration.minSeconds || 0) * 1000
  )
    reasons.push("too_short");
  if (duplicate) reasons.push("highly_similar");
  return [...new Set(reasons)];
}

export function buildAutoCleaningTask(input, meta) {
  const items = Array.isArray(input?.items) ? input.items : [];
  if (!input?.capabilityId) throw new Error("请先选择AI能力。");
  if (!items.length) throw new Error("当前能力暂无可清洗数据。");
  if (!["frames", "clips"].includes(input.mode))
    throw new Error("当前AI能力类型不支持自动清洗。");
  if (items.some((item) => item.capabilityId !== input.capabilityId))
    throw new Error("清洗数据必须属于同一个AI能力。");
  const rules = input.rules ||
    (input.mode === "frames"
      ? DEFAULT_IMAGE_CLEANING_RULES
      : DEFAULT_CLIP_CLEANING_RULES);
  const signals = items.map((item, index) => ({
    ...(input.mode === "frames"
      ? mockImageSignals(item, index)
      : mockClipSignals(item, index)),
    ...(item.qualitySignals || {}),
  }));
  const duplicates = duplicateIndexes(
    items,
    signals,
    input.mode,
    rules.similarity?.enabled,
  );
  const cleanedItems = items.map((item, index) => {
    const reasons =
      input.mode === "frames"
        ? imageReasons(item, signals[index], rules, duplicates.has(index))
        : clipReasons(item, signals[index], rules, duplicates.has(index));
    const warnings = [];
    if (
      input.mode === "clips" &&
      rules.duration?.enabled &&
      Number(item.durationMs || 0) > Number(rules.duration.maxSeconds || 0) * 1000
    )
      warnings.push("too_long");
    const recommendation = reasons.length ? "auto_reject" : "keep";
    const protectedKeep = item.manualOverride === "keep";
    return {
      ...item,
      cleaningStatus: "auto_cleaned",
      autoCleaningRecommendation: recommendation,
      autoCleaningResult: protectedKeep ? "keep" : recommendation,
      cleaningReasons: reasons,
      cleaningWarnings: warnings,
      lastCleaningTaskId: meta.taskId,
      cleanedAt: meta.now,
      manualCleaningStatus: item.manualCleaningStatus || "pending",
    };
  });
  const keepCount = cleanedItems.filter(
    (item) => item.autoCleaningResult === "keep",
  ).length;
  const rejectCount = cleanedItems.length - keepCount;
  return {
    task: {
      id: meta.taskId,
      capabilityId: input.capabilityId,
      dataType: input.mode === "frames" ? "frame" : "clip",
      rules: JSON.parse(JSON.stringify(rules)),
      status: "completed",
      totalCount: items.length,
      processedCount: items.length,
      keepCount,
      rejectCount,
      failedCount: 0,
      createdBy: meta.actor,
      createdAt: meta.now,
      completedAt: meta.now,
    },
    items: cleanedItems,
  };
}

export function restoreAutoRejectedItems(items, ids, meta) {
  const selected = new Set(ids || []);
  if (!selected.size) throw new Error("请至少选择一条自动剔除数据。");
  let restoredCount = 0;
  const updated = (items || []).map((item) => {
    if (!selected.has(item.id)) return item;
    if (item.autoCleaningResult !== "auto_reject")
      throw new Error("只能恢复当前为“自动剔除”的数据。");
    restoredCount += 1;
    return {
      ...item,
      autoCleaningResult: "keep",
      manualOverride: "keep",
      manualOverrideBy: meta.actor,
      manualOverrideAt: meta.now,
    };
  });
  if (restoredCount !== selected.size)
    throw new Error("部分数据不存在或不属于当前清洗结果。");
  return updated;
}

export function summarizeCleaning(items) {
  const list = Array.isArray(items) ? items : [];
  const reasonCounts = {};
  const warningCounts = {};
  list.forEach((item) => {
    (item.cleaningReasons || []).forEach((reason) => {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    (item.cleaningWarnings || []).forEach((warning) => {
      warningCounts[warning] = (warningCounts[warning] || 0) + 1;
    });
  });
  return {
    total: list.length,
    uncleaned: list.filter((item) => item.cleaningStatus !== "auto_cleaned").length,
    keep: list.filter((item) => item.autoCleaningResult === "keep").length,
    rejected: list.filter((item) => item.autoCleaningResult === "auto_reject").length,
    restored: list.filter((item) => item.manualOverride === "keep").length,
    reasonCounts,
    warningCounts,
  };
}
