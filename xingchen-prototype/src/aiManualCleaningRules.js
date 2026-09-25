export const MANUAL_CLEANING_STATUSES = {
  pending: "待人工确认",
  kept: "已保留",
  rejected: "已剔除",
};

export const MANUAL_REJECTION_REASONS = {
  poor_quality: "画面质量差",
  severe_occlusion: "严重遮挡",
  target_invisible: "目标不可见",
  incomplete_action: "动作不完整",
  invalid_boundary: "片段边界不合理",
  irrelevant: "内容无关",
  duplicate: "重复数据",
  other: "其他",
};

export function hasEnteredAnnotation(item) {
  if (!item) return false;
  if (Array.isArray(item.annotations) && item.annotations.length) return true;
  return !["", "not_started", "pending", undefined, null].includes(
    item.annotationStatus,
  );
}

export function applyManualCleaningDecision(items, input, meta) {
  const list = Array.isArray(items) ? items : [];
  const selected = new Set(input?.ids || []);
  if (!selected.size) throw new Error("请至少选择一条数据。");
  if (!["kept", "rejected"].includes(input?.decision))
    throw new Error("请选择保留或剔除。");
  if (input.decision === "rejected") {
    if (!Object.hasOwn(MANUAL_REJECTION_REASONS, input.rejectionReason))
      throw new Error("人工剔除必须选择原因。");
    if (input.rejectionReason === "other" && !input.rejectionNote?.trim())
      throw new Error("选择“其他”时必须填写原因说明。");
  }
  const candidates = list.filter((item) => selected.has(item.id));
  if (candidates.length !== selected.size)
    throw new Error("部分数据不存在或不属于当前AI能力。");
  if (candidates.some((item) => item.cleaningStatus !== "auto_cleaned"))
    throw new Error("数据必须先完成自动清洗，才能进行人工确认。");
  if (candidates.some(hasEnteredAnnotation))
    throw new Error(
      "当前数据已进入标注流程，请先清理对应标注后再修改清洗结果。",
    );
  return list.map((item) =>
    selected.has(item.id)
      ? {
          ...item,
          manualCleaningStatus: input.decision,
          rejectionReason:
            input.decision === "rejected" ? input.rejectionReason : "",
          rejectionNote:
            input.decision === "rejected" ? input.rejectionNote?.trim() || "" : "",
          manualCleanedBy: meta.actor,
          manualCleanedAt: meta.now,
        }
      : item,
  );
}

export function summarizeManualCleaning(items) {
  const list = Array.isArray(items) ? items : [];
  const statusOf = (item) => item.manualCleaningStatus || "pending";
  const pending = list.filter((item) => statusOf(item) === "pending").length;
  const kept = list.filter((item) => statusOf(item) === "kept").length;
  const rejected = list.filter((item) => statusOf(item) === "rejected").length;
  return {
    total: list.length,
    pending,
    kept,
    rejected,
    confirmed: kept + rejected,
    completionRate: list.length
      ? Math.round(((kept + rejected) / list.length) * 100)
      : 0,
    autoKeep: list.filter(
      (item) =>
        (item.autoCleaningRecommendation || item.autoCleaningResult) === "keep",
    ).length,
    autoRejected: list.filter(
      (item) =>
        (item.autoCleaningRecommendation || item.autoCleaningResult) ===
        "auto_reject",
    ).length,
  };
}

export function sortManualCleaningItems(items) {
  const statusRank = { pending: 0, kept: 1, rejected: 2 };
  return [...(items || [])].sort((a, b) => {
    const statusDifference =
      statusRank[a.manualCleaningStatus || "pending"] -
      statusRank[b.manualCleaningStatus || "pending"];
    if (statusDifference) return statusDifference;
    if ((a.manualCleaningStatus || "pending") === "pending") {
      const aAuto =
        (a.autoCleaningRecommendation || a.autoCleaningResult) === "auto_reject"
          ? 0
          : 1;
      const bAuto =
        (b.autoCleaningRecommendation || b.autoCleaningResult) === "auto_reject"
          ? 0
          : 1;
      if (aAuto !== bAuto) return aAuto - bAuto;
    }
    const aTime = Number(a.sourceTimeMs ?? a.startMs ?? 0);
    const bTime = Number(b.sourceTimeMs ?? b.startMs ?? 0);
    return aTime - bTime;
  });
}
