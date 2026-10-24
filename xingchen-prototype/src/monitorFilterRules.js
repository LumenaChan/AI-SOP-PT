export const MONITOR_STATION_FILTERS = [
  { key: "all", label: "本次工位", tone: "muted" },
  { key: "running", label: "进行中", tone: "success", statuses: ["进行中"] },
  {
    key: "waiting",
    label: "待开始",
    tone: "muted",
    statuses: ["待开始", "可入场"],
  },
  { key: "paused", label: "已暂停", tone: "warning", statuses: ["已暂停"] },
  {
    key: "reset",
    label: "已结束",
    tone: "orange",
    statuses: ["已完成", "待复位", "已复位"],
  },
  { key: "fault", label: "故障", tone: "danger", statuses: ["故障"] },
];

// Summary counts and displayed stations share one population. Unopened selections,
// foreign sessions and duplicate station references must not inflate the counts.
export function monitorStationFilter(arrangement = {}, selectedKey = "all") {
  const sessions = arrangement.sessions || [];
  const opened = Array.isArray(arrangement.openWorkstationIds)
    ? new Set(arrangement.openWorkstationIds)
    : null;
  const allRows = [...new Set(arrangement.workstationIds || [])]
    .map((workstationId) => ({
      workstationId,
      session: sessions.find(
        (session) => session.workstationId === workstationId,
      ),
    }))
    .filter((row) => row.session && (!opened || opened.has(row.workstationId)));
  const matches = (row, filter) =>
    !filter.statuses || filter.statuses.includes(row.session.status);
  const filters = MONITOR_STATION_FILTERS.map((filter) => ({
    ...filter,
    count: allRows.filter((row) => matches(row, filter)).length,
  }));
  const selected =
    filters.find((filter) => filter.key === selectedKey) || filters[0];
  return {
    filters,
    selected,
    allRows,
    rows: allRows.filter((row) => matches(row, selected)),
  };
}
