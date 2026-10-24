import { reconcileAssignments } from "./arrangementPreparationRules.js";

const unique = (ids = []) => [...new Set(ids.filter(Boolean))];
const matches = (query, ...values) => {
  const text = String(query || "")
    .trim()
    .toLocaleLowerCase();
  return (
    !text ||
    values.some((value) =>
      String(value || "")
        .toLocaleLowerCase()
        .includes(text),
    )
  );
};
function paginate(rows, page = 1, size = 10) {
  const pageSize = [10, 20, 30, 50, 100].includes(Number(size))
    ? Number(size)
    : 10;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(pages, Math.max(1, Math.floor(Number(page)) || 1));
  return {
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
    total: rows.length,
    page: current,
    pageSize,
  };
}

// Classes are a bulk-edit shortcut. Persist the explicit student IDs, never a
// live class membership expression that changes an already saved arrangement.
export function changeArrangementParticipants(
  arrangement,
  students,
  ids,
  selected,
) {
  const current = unique(arrangement.studentIds);
  const currentSet = new Set(current);
  const requested = new Set(unique(ids));
  const enabled = new Set(
    students
      .filter((student) => student.status === "启用")
      .map((student) => student.id),
  );
  const studentIds = selected
    ? unique(
        [...current, ...requested].filter(
          (id) => currentSet.has(id) || enabled.has(id),
        ),
      )
    : current.filter((id) => !requested.has(id));
  return {
    ...arrangement,
    studentIds,
    stationAssignments: reconcileAssignments(
      studentIds,
      arrangement.workstationIds || [],
      arrangement.stationAssignments || [],
    ),
  };
}

export function arrangementParticipantModel({
  students = [],
  classes = [],
  selectedIds = [],
  ...filters
}) {
  const ids = unique(selectedIds),
    selected = new Set(ids);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const roster = [...studentMap.values()]
    .filter((student) => student.status === "启用" || selected.has(student.id))
    .map((student) => ({
      ...student,
      selected: selected.has(student.id),
      className:
        classMap.get(student.classId)?.name ||
        (student.classId ? "班级已失效" : "未分班"),
    }));
  for (const id of ids)
    if (!studentMap.has(id))
      roster.push({
        id,
        name: "学生已失效",
        no: id,
        classId: "",
        className: "未记录",
        status: "已失效",
        selected: true,
      });
  const members = new Map();
  for (const student of studentMap.values()) {
    if (!members.has(student.classId)) members.set(student.classId, []);
    members.get(student.classId).push(student);
  }
  const groups = classes.map((item) => {
    const people = members.get(item.id) || [];
    const eligible = people.filter((student) => student.status === "启用");
    const selectedCount = people.filter((student) =>
      selected.has(student.id),
    ).length;
    const checked = eligible.length
      ? eligible.every((student) => selected.has(student.id))
      : selectedCount > 0;
    return {
      ...item,
      memberIds: people.map((student) => student.id),
      eligibleCount: eligible.length,
      selectedCount,
      checked,
      partial: selectedCount > 0 && !checked,
      disabled: !eligible.length && !selectedCount,
    };
  });
  const studentRows = roster.filter(
    (student) =>
      matches(filters.studentQuery, student.name, student.no) &&
      (!filters.classId || student.classId === filters.classId) &&
      (!filters.onlySelected || student.selected),
  );
  return {
    selectedIds: ids,
    selectedCount: ids.length,
    unavailableSelected: roster.filter(
      (student) => student.selected && student.status !== "启用",
    ).length,
    classOptions: groups,
    classPage: paginate(
      groups.filter((item) =>
        matches(filters.classQuery, item.name, item.code),
      ),
      filters.classPage,
      filters.classPageSize,
    ),
    studentPage: paginate(
      studentRows,
      filters.studentPage,
      filters.studentPageSize,
    ),
  };
}
