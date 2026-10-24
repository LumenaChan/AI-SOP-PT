import {
  arrangementAssignments,
  preparationActions,
} from "./arrangementPreparationRules.js";
import { workstationUsageRestriction } from "./workstationReleaseRules.js";

// Reuse one availability decision for candidate selection, randomization and
// final save. An explicit owner ID takes precedence over a legacy name.
export function allocationWorkstationAvailable(workstation, existing) {
  if (!workstation || workstationUsageRestriction(workstation)) return false;
  if (workstation.currentArrangementId)
    return Boolean(
      existing?.id && workstation.currentArrangementId === existing.id,
    );
  return (
    workstation.currentArrangement === "无" ||
    Boolean(existing?.id && workstation.currentArrangement === existing.name)
  );
}

export function allocationSetupReason(data, arrangement) {
  const stored = arrangement.id
    ? (data.arrangements || []).find((item) => item.id === arrangement.id)
    : null;
  if (arrangement.id && !stored) return "安排已失效，请返回列表刷新。";
  if (
    !preparationActions({ status: "草稿", ...arrangement }).edit ||
    arrangement.startedAt ||
    (stored && (!preparationActions(stored).edit || stored.startedAt))
  )
    return "工位已开放或会话已建立，不能重新分配；请先按原流程撤销未开始工位的准备。";
  const students = arrangement.studentIds || [],
    stations = arrangement.workstationIds || [];
  if (!students.length && !stations.length)
    return "请先选择参与学生和可用工位，一人一工位。";
  if (!students.length)
    return `已选 ${stations.length} 个工位，请选择 ${stations.length} 名参与学生。`;
  if (!stations.length)
    return `已选 ${students.length} 名学生，请在右侧选择 ${students.length} 个可用工位（一人一工位）。`;
  if (
    new Set(students).size !== students.length ||
    new Set(stations).size !== stations.length
  )
    return "学生或工位存在重复选择，请调整后再分配。";
  const enabled = new Set(
    (data.students || [])
      .filter((student) => student.status === "启用")
      .map((student) => student.id),
  );
  if (students.some((id) => !enabled.has(id)))
    return "所选学生包含停用或失效记录，请在“按学生选择”中移除后再分配。";
  const stationMap = new Map(
    (data.workstations || []).map((station) => [station.id, station]),
  );
  const unavailable = stations.filter(
    (id) => !allocationWorkstationAvailable(stationMap.get(id), stored),
  );
  if (unavailable.length)
    return `所选工位不可用：${unavailable
      .slice(0, 3)
      .map((id) => stationMap.get(id)?.name || id)
      .join("、")}${unavailable.length > 3 ? "等" : ""}，请移除或重新选择。`;
  if (students.length > stations.length)
    return `已选 ${students.length} 名学生、${stations.length} 个工位，请再选 ${students.length - stations.length} 个可用工位，或减少本次学生；人数较多请另建安排分批进行（一人一工位）。`;
  if (students.length < stations.length)
    return `已选 ${students.length} 名学生、${stations.length} 个工位，请再选 ${stations.length - students.length} 名学生，或移除多余工位（一人一工位）。`;
  return "";
}

// Only called by an explicit UI action. Never randomize while rendering,
// normalizing data, refreshing, saving or opening a workstation.
export function randomizeArrangementAllocation(
  data,
  arrangement,
  { random = Math.random, at = new Date().toISOString() } = {},
) {
  const reason = allocationSetupReason(data, arrangement);
  if (reason) throw new Error(reason);
  const ids = [...arrangement.studentIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new Error("随机分配未完成，请重试；原分配保持不变。");
    const j = Math.floor(value * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return {
    ...arrangement,
    stationAssignments: arrangement.workstationIds.map(
      (workstationId, index) => ({ workstationId, studentId: ids[index] }),
    ),
    allocationRandomizedAt: at,
  };
}

export function swapAllocationStudent(arrangement, workstationId, studentId) {
  const pairs = arrangementAssignments(arrangement);
  if (!pairs.some((pair) => pair.workstationId === workstationId))
    throw new Error("分配工位已失效，请重新选择。");
  if (studentId && !(arrangement.studentIds || []).includes(studentId))
    throw new Error("该学生不在本次参与名单中。");
  const previous =
    pairs.find((pair) => pair.workstationId === workstationId).studentId || "";
  return pairs.map((pair) =>
    pair.workstationId === workstationId
      ? { ...pair, studentId }
      : studentId && pair.studentId === studentId
        ? { ...pair, studentId: previous }
        : pair,
  );
}
