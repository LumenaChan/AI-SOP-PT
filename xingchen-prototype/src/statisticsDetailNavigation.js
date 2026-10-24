const SCOPE_KEYS = [
  "source",
  "tab",
  "classId",
  "sopId",
  "basisArrangementId",
  "basisSessionId",
  "type",
  "from",
  "to",
  "student",
];
const RECORD_SCOPE_KEYS = [
  "recordSopId",
  "recordType",
  "recordBasisArrangementId",
  "recordBasisSessionId",
];

const ANALYSIS_SCOPE_KEYS = [
  "analysisSopId",
  "analysisType",
  "analysisBasisArrangementId",
  "analysisBasisSessionId",
];
const ANALYSIS_VIEW_KEYS = ["apage", "asize", "asort", "adesc"];
const isStepSource = (detail) => /^(stepall|steperrors):/.test(detail || "");

// Parent lists and analysis drawers stay in the URL so refresh and report return
// retain their own search/pagination without changing the underlying page scope.
export function openStatisticsDetail(params, detail, source) {
  const next = new URLSearchParams(params);
  for (const key of [
    "courseId",
    "sopVersion",
    "recordSopVersion",
    "detailReturn",
    ...RECORD_SCOPE_KEYS,
  ])
    next.delete(key);
  next.set("source", source);
  const analysisChild =
    next.get("detail") === "step-analysis" && isStepSource(detail);
  if (
    (next.get("detail") === "students" && detail.startsWith("student:")) ||
    analysisChild
  ) {
    next.set("detailReturn", next.toString());
  }
  if (!analysisChild)
    for (const key of [...ANALYSIS_SCOPE_KEYS, ...ANALYSIS_VIEW_KEYS])
      next.delete(key);
  next.set("detail", detail);
  next.delete("q");
  next.delete("dpage");
  next.delete("dsort");
  next.delete("ddesc");
  return next;
}

export function openStatisticsStepAnalysis(params, group, source) {
  const next = openStatisticsDetail(params, "step-analysis", source);
  next.set("analysisSopId", group.sopId);
  next.set("analysisType", group.type);
  next.set("analysisBasisArrangementId", group.basisArrangementId);
  next.set("analysisBasisSessionId", group.basisSessionId);
  return next;
}

export function statisticsAnalysisFilters(params, filters) {
  const sopId = params.get("analysisSopId"),
    type = params.get("analysisType"),
    basisArrangementId = params.get("analysisBasisArrangementId"),
    basisSessionId = params.get("analysisBasisSessionId");
  if (
    !sopId ||
    !["practice", "exam"].includes(type) ||
    !basisArrangementId ||
    !basisSessionId ||
    (filters.sopId && filters.sopId !== sopId) ||
    (filters.type && filters.type !== type)
  )
    return null;
  return { ...filters, sopId, type, basisArrangementId, basisSessionId };
}

export function closeStatisticsDetail(params, source) {
  const next = new URLSearchParams(params);
  for (const key of [
    "detail",
    "detailReturn",
    "q",
    "dpage",
    "dsize",
    "dsort",
    "ddesc",
    "recordSopVersion",
    ...RECORD_SCOPE_KEYS,
    ...ANALYSIS_SCOPE_KEYS,
    ...ANALYSIS_VIEW_KEYS,
  ])
    next.delete(key);
  next.set("source", source);
  return next;
}

// Looking at one group's source records must not select that group for the
// underlying analysis page. Keep the detail scope in separate URL parameters so
// closing it, refreshing, or returning from a report preserves the standard list.
export function openStatisticsStandardRecords(params, group, source) {
  const next = openStatisticsDetail(params, "records", source);
  next.set("recordSopId", group.sopId);
  next.set("recordBasisArrangementId", group.basisArrangementId);
  next.set("recordBasisSessionId", group.basisSessionId);
  next.set("recordType", group.type);
  return next;
}

export function statisticsRecordFilters(params, filters) {
  if (!RECORD_SCOPE_KEYS.some((key) => params.has(key))) return { ...filters };
  const sopId = params.get("recordSopId"),
    type = params.get("recordType"),
    basisArrangementId = params.get("recordBasisArrangementId"),
    basisSessionId = params.get("recordBasisSessionId");
  if (
    !sopId ||
    !["practice", "exam"].includes(type) ||
    Boolean(basisArrangementId) !== Boolean(basisSessionId)
  )
    return null;
  // Legacy links without a basis anchor retain their standard/type range.
  // Do not infer a historical definition from their obsolete version label.
  return {
    ...filters,
    sopId,
    type,
    basisArrangementId: basisArrangementId || "",
    basisSessionId: basisSessionId || "",
  };
}

// A clear route out of a selected historical scoring basis. Preserve the
// teacher's class/date scope; do not inject recommendations from another range.
export function statisticsStandardListParams(params, source) {
  const next = new URLSearchParams(params);
  for (const key of [
    "sopId",
    "sopVersion",
    "recordSopVersion",
    "basisArrangementId",
    "basisSessionId",
    "type",
    "detail",
    "detailReturn",
    ...RECORD_SCOPE_KEYS,
    ...ANALYSIS_SCOPE_KEYS,
    ...ANALYSIS_VIEW_KEYS,
    "courseId",
    "student",
    "compare",
    "attendance",
    "page",
    "sort",
    "desc",
    "q",
    "dpage",
  ])
    next.delete(key);
  next.set("tab", "steps");
  next.set("source", source);
  return next;
}

export function statisticsDetailParent(params, source) {
  if (params.get("source") !== source) return null;
  const stored = params.get("detailReturn");
  if (!stored) return null;
  const parent = new URLSearchParams(stored);
  const studentReturn =
    parent.get("detail") === "students" &&
    params.get("detail")?.startsWith("student:");
  const analysisReturn =
    parent.get("detail") === "step-analysis" &&
    isStepSource(params.get("detail")) &&
    ANALYSIS_SCOPE_KEYS.every(
      (key) => parent.get(key) && parent.get(key) === params.get(key),
    );
  if (
    (!studentReturn && !analysisReturn) ||
    parent.has("detailReturn") ||
    SCOPE_KEYS.some(
      (key) => (parent.get(key) || "") !== (params.get(key) || ""),
    )
  )
    return null;
  for (const key of ["courseId", "sopVersion", "recordSopVersion"])
    parent.delete(key);
  return parent;
}
