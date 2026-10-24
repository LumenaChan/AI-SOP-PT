const COMMON = ["草稿", "待开始", "准备中", "进行中", "已暂停"];

export function arrangementStatusOptions(type = "practice", records = []) {
  const statuses = [
    ...COMMON,
    ...(type === "exam" ? ["待发布", "已发布"] : ["已结束"]),
    "已取消",
  ];
  // Keep unfamiliar legacy states discoverable without adding them to new flows.
  return [
    "全部状态",
    ...new Set([
      ...statuses,
      ...records
        .filter((a) => a.type === type && !a.archivedRecord)
        .map((a) => a.status)
        .filter(Boolean),
    ]),
  ];
}
