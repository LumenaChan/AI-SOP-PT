import { rememberStatisticsFilters } from "./statisticsFilterMemory.js";
import { displayBusinessText, displayStepLabel } from "./businessTextRules.js";
import { displayGradeText } from "./gradeRevisionRules.js";
import {
  arrangementAttendancePath,
  legacyAttendanceTarget,
} from "./arrangementAttendanceRules.js";
import { StatisticsLayer } from "./StatisticsLayer.jsx";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { SupportTaskCreate } from "./SupportTaskPanels.jsx";
import {
  teachingStatistics,
  statisticsProgress,
  statisticsSteps,
  statisticsStandardOptions,
  taskStatistics,
  STATISTICS_TABS,
  HISTORY_KINDS,
  HISTORY_STATUS,
  statisticsKey,
  validateStatisticsFilters,
} from "./teachingStatisticsRules.js";
import {
  statisticsCsv,
  withStatisticsReturn,
} from "./statisticsCommonRules.js";
import {
  openStatisticsDetail,
  statisticsDetailParent,
  openStatisticsStandardRecords,
  statisticsRecordFilters,
  openStatisticsStepAnalysis,
  statisticsAnalysisFilters,
  closeStatisticsDetail,
} from "./statisticsDetailNavigation.js";
const btn = "button button--default",
  primary = "button button--primary";
const workKinds = {
  all: "全部",
  review: "成绩复核",
  step: "流程确认",
  publish: "考试发布",
};
const fields = ["classId", "sopId", "type", "from", "to"];
const fmt = (n) => (n == null ? "—" : Number(n).toFixed(1));
const percent = (n, d) => (d ? `${fmt((n / d) * 100)}%` : "—");
const read = (c, r) => (c.value ? c.value(r) : r[c.key]);
const col = (key, label, value) => ({ key, label, value });
const textCol = (key, label, value) => ({
  ...col(key, label, value),
  multiline: true,
});

function StatisticsTable({
  rows,
  columns,
  params,
  patch,
  prefix = "",
  className = "",
}) {
  const page = Math.max(0, Number(params.get(prefix + "page")) || 0),
    size = [10, 20, 50].includes(Number(params.get(prefix + "size")))
      ? Number(params.get(prefix + "size"))
      : 10;
  const sort = params.get(prefix + "sort") || "",
    desc = params.get(prefix + "desc") === "1",
    column = columns.find((c) => c.key === sort);
  const sorted =
    column && column.key !== "actions"
      ? [...rows].sort((a, b) => {
          const x = read(column, a),
            y = read(column, b);
          return (
            (typeof x === "number" && typeof y === "number"
              ? x - y
              : String(x ?? "").localeCompare(String(y ?? ""), "zh-CN")) *
            (desc ? -1 : 1)
          );
        })
      : rows;
  const pages = Math.max(1, Math.ceil(sorted.length / size)),
    safe = Math.min(page, pages - 1);
  const cellContent = (c, r) => {
    if (c.render) return c.render(r);
    const value = read(c, r);
    const text =
      typeof value === "number" && !Number.isInteger(value)
        ? fmt(value)
        : displayBusinessText(value ?? "—");
    return c.multiline ? (
      <span className="statistics-cell-preview" title={String(text)}>
        {text}
      </span>
    ) : (
      text
    );
  };
  return (
    <>
      <div className="statistics-table-wrap">
        <table
          className={`statistics-table${className ? ` ${className}` : ""}`}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={
                    [c.className, c.multiline && "statistics-cell--multiline"]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {c.key === "actions" ? (
                    c.label
                  ) : (
                    <button
                      onClick={() =>
                        patch({
                          [prefix + "sort"]: c.key,
                          [prefix + "desc"]: sort === c.key && !desc ? "1" : "",
                          [prefix + "page"]: "",
                        })
                      }
                    >
                      {c.label}
                      {sort === c.key ? (desc ? " ↓" : " ↑") : ""}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(safe * size, (safe + 1) * size).map((r, i) => (
              <tr key={`${r.id || r.sessionId || i}:${r.stepId || ""}`}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={
                      [c.className, c.multiline && "statistics-cell--multiline"]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  >
                    {cellContent(c, r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="statistics-empty">当前范围没有符合条件的记录。</p>
        )}
      </div>
      <div className="statistics-pagination">
        <span>共 {rows.length} 条</span>
        <label>
          每页{" "}
          <select
            value={size}
            onChange={(e) =>
              patch({
                [prefix + "size"]: e.target.value,
                [prefix + "page"]: "",
              })
            }
          >
            {[10, 20, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>{" "}
          条
        </label>
        <button
          className={btn}
          disabled={!safe}
          onClick={() => patch({ [prefix + "page"]: String(safe - 1) })}
        >
          上一页
        </button>
        <span>
          {safe + 1}/{pages}
        </span>
        <button
          className={btn}
          disabled={safe >= pages - 1}
          onClick={() => patch({ [prefix + "page"]: String(safe + 1) })}
        >
          下一页
        </button>
      </div>
    </>
  );
}
function ExportButton({ rows, columns, title, unit, scope, source, disabled }) {
  const [error, setError] = useState("");
  const download = () => {
    try {
      const metadata = {
        导出对象: title,
        统计单位: unit,
        查询范围: scope,
        数据源: source === "cpd" ? "CPD工作数据" : "浏览器工作数据",
        生成时间: displayBusinessText(new Date()),
        口径: "当前已保存有效成绩；日期含义见查询范围",
      };
      const content = statisticsCsv(
        columns.filter((c) => c.key !== "actions"),
        rows,
        metadata,
      );
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `教学改进-${title}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <span className="statistics-export">
      <button
        className={btn}
        disabled={!rows.length || disabled}
        onClick={download}
      >
        导出当前明细（{rows.length}条）
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
function Metric({ label, value, note, onClick }) {
  return (
    <button className="statistics-metric" disabled={!onClick} onClick={onClick}>
      <span>{label}</span>
      <strong>{displayBusinessText(value)}</strong>
      {note && <small>{note}</small>}
    </button>
  );
}
function Trend({ rows, connected }) {
  if (!rows.length) return null;
  const points = rows.map(
    (r, i) =>
      `${45 + i * (520 / Math.max(1, rows.length - 1))},${170 - r.normalizedScore * 1.4}`,
  );
  return (
    <svg
      className="statistics-trend"
      viewBox="0 0 620 220"
      role="img"
      aria-label="同一标准历次百分制得分"
    >
      <line x1="45" y1="170" x2="590" y2="170" stroke="#ccd9ea" />
      {[0, 50, 100].map((n) => (
        <g key={n}>
          <text x="5" y={175 - n * 1.4}>
            {n}
          </text>
          <line
            x1="45"
            y1={170 - n * 1.4}
            x2="590"
            y2={170 - n * 1.4}
            stroke="#e9eff7"
          />
        </g>
      ))}
      {connected && (
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#1677ff"
          strokeWidth="3"
        />
      )}
      {rows.map((r, i) => {
        const [x, y] = points[i].split(",");
        return (
          <g key={r.id}>
            <circle cx={x} cy={y} r="4" fill="#1677ff" />
            <text x={x} y={Number(y) - 10} textAnchor="middle">
              {fmt(r.normalizedScore)}
            </text>
            <text x={x} y="195" textAnchor="middle">
              {displayBusinessText(r.resultAt).slice(0, 10)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function TeachingStatisticsPage({ initialTab }) {
  const store = usePrototypeData(),
    { data, dataSource } = store,
    loc = useLocation(),
    nav = useNavigate(),
    [params, setParams] = useSearchParams();
  const sourceChanged =
    params.has("source") && params.get("source") !== dataSource;
  const effective = new URLSearchParams(sourceChanged ? undefined : params);
  // 课程筛选已移除：旧书签或统计返回链接不再携带隐含的课程范围。
  effective.delete("courseId");
  effective.delete("sopVersion");
  effective.delete("recordSopVersion");
  const filters = Object.fromEntries(
    fields.map((k) => [k, effective.get(k) || ""]),
  );
  filters.teacherId = store.teacherId;
  filters.basisArrangementId = effective.get("basisArrangementId") || "";
  filters.basisSessionId = effective.get("basisSessionId") || "";
  const tab = Object.hasOwn(STATISTICS_TABS, effective.get("tab"))
    ? effective.get("tab")
    : initialTab || "classes";
  useEffect(() => {
    if (!sourceChanged && !validateStatisticsFilters(filters)) rememberStatisticsFilters("/teacher/statistics", effective, dataSource, store.teacherId);
  }, [loc.search, dataSource, store.teacherId, sourceChanged]);
  const [draft, setDraft] = useState(filters),
    [error, setError] = useState(""),
    [support, setSupport] = useState(null),
    [refresh, setRefresh] = useState(0),
    [scopeOpen, setScopeOpen] = useState(false);
  const fingerprint = JSON.stringify(filters);
  useEffect(() => setDraft(filters), [fingerprint]);
  useEffect(() => {
    if (sourceChanged) {
      setSupport(null);
      setParams(new URLSearchParams({ source: dataSource }), { replace: true });
    } else if (
      ["courseId", "sopVersion", "recordSopVersion"].some((k) => params.has(k))
    ) {
      const next = new URLSearchParams(params);
      for (const key of ["courseId", "sopVersion", "recordSopVersion"])
        next.delete(key);
      setParams(next, { replace: true });
    }
  }, [sourceChanged, dataSource, params, setParams]);
  const patch = (changes, reset = false) => {
    const next = new URLSearchParams(reset ? undefined : effective);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === undefined || value === "")
        next.delete(key);
      else next.set(key, String(value));
    }
    next.set("source", dataSource);
    if (
      fields.some((key) => Object.hasOwn(changes, key)) &&
      !Object.hasOwn(changes, "basisArrangementId")
    ) {
      next.delete("basisArrangementId");
      next.delete("basisSessionId");
    }
    if (!next.get("detail")) next.delete("detailReturn");
    if (next.get("detail") !== "records") {
      for (const key of [
        "recordSopId",
        "recordType",
        "recordBasisArrangementId",
        "recordBasisSessionId",
      ])
        next.delete(key);
    }
    if (
      next.get("detail") !== "step-analysis" &&
      !/^(stepall|steperrors):/.test(next.get("detail") || "")
    ) {
      for (const key of [
        "analysisSopId",
        "analysisType",
        "analysisBasisArrangementId",
        "analysisBasisSessionId",
        "apage",
        "asize",
        "asort",
        "adesc",
      ])
        next.delete(key);
    }
    setParams(next, { replace: true });
  };
  const filterError = validateStatisticsFilters(filters),
    model = teachingStatistics(
      data,
      filterError ? { teacherId: store.teacherId } : filters,
    ),
    { metrics, summary } = model;
  const all = teachingStatistics(data, { teacherId: store.teacherId }),
    allRows = all.base;
  const unique = (rows, key, label) => [
    ...new Map(
      rows
        .filter((r) => r[key])
        .map((r) => [r[key], { id: r[key], name: label(r) }]),
    ).values(),
  ];
  const options = {
    classId: unique(
      allRows,
      "classId",
      (r) =>
        (data.classes || []).find((c) => c.id === r.classId)?.name || r.classId,
    ),
    sopId: unique(allRows, "sopId", (r) => r.sopName),
    type: [
      { id: "practice", name: "练习" },
      { id: "exam", name: "考试" },
    ],
  };
  const names = {
    classId: "班级",
    sopId: "实训标准",
    type: "结果类型",
  };
  const scope = [
    `当前教师：${store.teacherName}`,
    ...(filters.basisSessionId ? ["评分依据：所选历史快照，同口径合并"] : []),
    ...Object.entries(names)
      .filter(([k]) => filters[k])
      .map(
        ([k, v]) =>
          `${v}：${options[k]?.find((o) => o.id === filters[k])?.name || filters[k]}`,
      ),
    filters.from || filters.to
      ? `${filters.from || "不限开始"} 至 ${filters.to || "不限结束"}`
      : "全部日期",
    tab === "followup"
      ? "任务按创建日期；当前待办不受日期筛选"
      : "成绩按可信结果形成时间",
  ].join(" · ");
  const pendingDraft = fields.some(
    (k) => (draft[k] || "") !== (filters[k] || ""),
  );
  const studentId = effective.get("student") || "",
    progress = statisticsProgress(model, studentId, filters),
    steps = statisticsSteps(model, filters);
  const standards = tab === "steps" ? statisticsStandardOptions(model) : [];
  const requestedAnalysisFilters = statisticsAnalysisFilters(
    effective,
    filters,
  );
  // Resolve the selected capture inside the main page's current teacher/class/date
  // scope. A stale or cross-scope URL must not broaden the analysis silently.
  const analysisAnchor =
    requestedAnalysisFilters &&
    metrics.rows.find(
      (row) =>
        row.arrangementId === requestedAnalysisFilters.basisArrangementId &&
        row.sessionId === requestedAnalysisFilters.basisSessionId &&
        row.sopId === requestedAnalysisFilters.sopId &&
        row.type === requestedAnalysisFilters.type,
    );
  const analysisModel = analysisAnchor
    ? teachingStatistics(data, requestedAnalysisFilters)
    : null;
  const analysisSteps = analysisModel
    ? statisticsSteps(analysisModel, requestedAnalysisFilters)
    : [];
  const analysisScope = analysisModel
    ? `${scope}；本次分析：${analysisAnchor.sopName} · ${analysisAnchor.type === "exam" ? "考试" : "练习"} · ${analysisAnchor.standardBasisLabel}`
    : "所选分析范围已失效，请关闭后重新选择。";
  const actionMetrics = analysisModel?.metrics || metrics;
  const selectStandard = (group) => {
    setError("");
    setParams(
      group.ready
        ? openStatisticsStepAnalysis(effective, group, dataSource)
        : openStatisticsStandardRecords(effective, group, dataSource),
      { replace: true },
    );
  };
  const standardColumns = [
    col("sopName", "实训标准"),
    col("standardBasisLabel", "标准依据"),
    col("type", "结果类型", (group) =>
      group.type === "exam" ? "考试" : "练习",
    ),
    col("count", "有效结果人次"),
    col("stepCount", "可分析步骤数"),
    col("reason", "说明"),
    {
      key: "actions",
      label: "操作",
      render: (group) => (
        <button
          className="statistics-text-link"
          onClick={() => selectStandard(group)}
        >
          {group.ready ? "查看步骤分析" : "查看原始记录"}
        </button>
      ),
    },
  ];
  const studentOptions = unique(
    model.metrics.rows,
    "studentId",
    (r) => r.studentName,
  );
  const kind = Object.hasOwn(HISTORY_KINDS, effective.get("kind"))
    ? effective.get("kind")
    : "all";
  const kindRows = model.history
      .filter((r) => kind === "all" || r.kind === kind)
      .sort(
        (a, b) =>
          Number(
            [
              "pending",
              "handling",
              "coaching",
              "awaiting_confirmation",
              "awaiting_review",
            ].includes(b.status),
          ) -
          Number(
            [
              "pending",
              "handling",
              "coaching",
              "awaiting_confirmation",
              "awaiting_review",
            ].includes(a.status),
          ),
      ),
    taskSummary = taskStatistics(kindRows),
    status = effective.get("status") || "all";
  const taskRows = status === "all" ? kindRows : taskSummary[status] || [];
  const workKind = Object.hasOwn(workKinds, effective.get("work"))
    ? effective.get("work")
    : "all";
  const workRows = model.current.filter(
    (r) => workKind === "all" || r.type === workKind,
  );
  const workStudentColumn = col(
    "studentName",
    "学生",
    (r) => r.studentName || "—",
  );
  const go = (path) =>
    nav(
      withStatisticsReturn(
        path,
        `/teacher/statistics?${effective}`,
        dataSource,
      ),
    );
  const openDetail = (detail) =>
    setParams(openStatisticsDetail(effective, detail, dataSource), {
      replace: true,
    });
  const detailParent = statisticsDetailParent(effective, dataSource);
  const sourceActions = (r) => (
    <div className="statistics-row-actions">
      <button className={btn} onClick={() => go(r.reportPath)}>
        查看源报告
      </button>
      {r.valid &&
        r.normalizedScore < 80 &&
        r.timestamp !== null &&
        !actionMetrics.rows.some(
          (x) =>
            x.valid &&
            x.studentId === r.studentId &&
            (x.timestamp === null ||
              (x.id !== r.id && x.timestamp === r.timestamp)),
        ) &&
        actionMetrics.lowStudents.some(
          (x) => statisticsKey(x) === statisticsKey(r),
        ) && (
          <button
            className={btn}
            onClick={() =>
              setSupport({
                ...r,
                supportFilters: analysisModel
                  ? requestedAnalysisFilters
                  : filters,
              })
            }
          >
            安排辅导
          </button>
        )}
    </div>
  );
  const resultColumns = [
    {
      ...col("studentName", "学生"),
      render: (r) => (
        <button
          className="statistics-text-link"
          onClick={() =>
            patch({
              tab: "progress",
              student: r.studentId,
              sopId: r.sopId,
              basisArrangementId: r.arrangementId,
              basisSessionId: r.sessionId,
              type: r.type,
              detail: "",
              page: "",
              compare: "",
            })
          }
        >
          {r.studentName}
        </button>
      ),
    },
    col("studentNumber", "学号"),
    {
      ...col("arrangementName", "安排"),
      className: "statistics-cell--arrangement",
      render: (r) => (
        <button
          className="statistics-text-link"
          title="查看本场参加名单"
          onClick={() => go(arrangementAttendancePath(r.arrangement))}
        >
          {r.arrangementName}
        </button>
      ),
    },
    {
      ...col("resultAt", "结果时间", (r) => r.resultAt || "未记录"),
      className: "statistics-cell--result-time",
    },
    col("score", "原分", (r) => r.score),
    col("maxScore", "满分"),
    col("normalizedScore", "百分制", (r) => r.normalizedScore),
    {
      ...col("standardBasisLabel", "标准依据"),
      className: "statistics-cell--basis",
    },
    {
      ...col("classSource", "班级来源"),
      className: "statistics-cell--class-source",
    },
    textCol("source", "结果依据", (r) =>
      r.valid ? r.sourceLabels.join("；") : r.exclusionLabels.join("；"),
    ),
    { key: "actions", label: "操作", render: sourceActions },
  ];
  const historyColumns = [
    col("kind", "记录类型", (r) => HISTORY_KINDS[r.kind] || "未知类型"),
    col("studentName", "学生"),
    col("arrangementName", "来源安排"),
    col("createdAt", "创建时间", (r) => r.createdAt || "未记录"),
    col("status", "状态", (r) => HISTORY_STATUS[r.status] || "状态未知"),
    col("teacherName", "负责教师"),
    textCol("instruction", "学生事项"),
    textCol("conclusion", "结果/关闭说明"),
    {
      key: "actions",
      label: "操作",
      render: (r) => (
        <button className={btn} onClick={() => go(r.path)}>
          {["completed", "cancelled", "closed"].includes(r.status)
            ? "查看历史"
            : "查看并办理"}
        </button>
      ),
    },
  ];
  const students = [
    ...new Map(
      summary.valid.map((r) => [
        r.studentId,
        {
          id: r.studentId,
          studentId: r.studentId,
          studentName: r.studentName,
          studentNumber: r.studentNumber,
          count: summary.valid.filter((x) => x.studentId === r.studentId)
            .length,
        },
      ]),
    ).values(),
  ];
  const studentColumns = [
    col("studentName", "学生"),
    col("studentNumber", "学号"),
    col("count", "有效结果人次"),
    {
      key: "actions",
      label: "操作",
      render: (r) => (
        <div className="statistics-row-actions">
          <button
            className={btn}
            onClick={() => openDetail(`student:${r.studentId}`)}
          >
            查看结果
          </button>
          <button
            className={btn}
            onClick={() =>
              patch({
                tab: "progress",
                student: r.studentId,
                detail: "",
                page: "",
              })
            }
          >
            查看进步
          </button>
        </div>
      ),
    },
  ];
  const stepColumns = [
    col("id", "步骤编号", (r) => displayStepLabel(r.id)),
    col("name", "步骤"),
    col("max", "满分"),
    col("average", "平均分", (r) => r.average),
    col("rate", "平均得分率", (r) => fmt(r.rate) + "%"),
    col("count", "样本人次"),
    col("errorCount", "确认扣分人次"),
    col("students", "涉及学生"),
    col("ratio", "扣分占比", (r) => percent(r.errorCount, r.count)),
    {
      key: "actions",
      label: "来源",
      render: (r) => (
        <div className="statistics-row-actions">
          <button className={btn} onClick={() => openDetail(`stepall:${r.id}`)}>
            样本
          </button>
          <button
            className={btn}
            onClick={() => openDetail(`steperrors:${r.id}`)}
          >
            扣分来源
          </button>
        </div>
      ),
    },
  ];
  const taskSummaryButtons = [
    "all",
    "open",
    "completed",
    "cancelled",
    "closed",
    "unknown",
  ].map((k) => (
    <button
      key={k}
      className={status === k ? "active" : ""}
      onClick={() => patch({ status: k, page: "" })}
    >
      {
        {
          all: "全部",
          open: "未结",
          completed: "成功完成",
          cancelled: "取消/撤销",
          closed: "随会话关闭",
          unknown: "未知",
        }[k]
      }{" "}
      {k === "all" ? kindRows.length : taskSummary[k].length}
    </button>
  ));
  const detail = effective.get("detail") || "";
  let descriptor = null;
  if (detail === "step-analysis") {
    descriptor = {
      kind: "analysis",
      title: "步骤分析",
      rows: analysisSteps,
      columns: stepColumns,
      unit: "步骤",
      scope: analysisScope,
    };
  } else if (detail === "records") {
    const recordFilters = statisticsRecordFilters(effective, filters);
    const recordModel = recordFilters
      ? teachingStatistics(data, recordFilters)
      : null;
    descriptor = {
      title: "当前标准的原始记录",
      rows: recordModel?.metrics.rows || [],
      columns: resultColumns,
      unit: "实训结果记录（含排除记录，不代表均可用于分析）",
      scope: recordFilters
        ? `${scope}；本明细标准：${data.sops.find((s) => s.id === recordFilters.sopId)?.name || "标准信息未记录"} · 按当时标准快照 · ${recordFilters.type === "exam" ? "考试" : recordFilters.type === "practice" ? "练习" : "全部结果类型"}`
        : "明细范围已失效，请关闭后重新选择原始记录。",
    };
  } else if (detail === "all")
    descriptor = {
      title: "全部有效结果",
      rows: summary.valid,
      columns: resultColumns,
      unit: "结果人次",
    };
  else if (detail === "excluded")
    descriptor = {
      title: "排除记录",
      rows: metrics.average.excluded,
      columns: resultColumns,
      unit: "实训结果记录",
    };
  else if (detail === "errors")
    descriptor = {
      title: "已确认扣分来源",
      rows: metrics.errors
        .filter(
          (g) => !effective.get("step") || g.stepId === effective.get("step"),
        )
        .flatMap((g) => g.rows),
      columns: [
        ...resultColumns.filter((c) => c.key !== "actions"),
        col("stepName", "步骤"),
        col("stepScore", "步骤有效分"),
        textCol("sources", "确认依据", (r) =>
          r.sources.map((s) => displayGradeText(s.reason)).join("；"),
        ),
        { key: "actions", label: "操作", render: sourceActions },
      ],
      unit: "单次实训中的步骤（历史评分依据不完整时仅供查看，不作比较）",
    };
  else if (detail === "students")
    descriptor = {
      title: "有有效结果的学生",
      rows: students,
      columns: studentColumns,
      unit: "学生（去重）",
    };
  else if (detail.startsWith("student:"))
    descriptor = {
      title: "学生有效结果",
      rows: summary.valid.filter((r) => r.studentId === detail.slice(8)),
      columns: resultColumns,
      unit: "结果人次",
    };
  else if (detail.startsWith("class:"))
    descriptor = {
      title: "班级结果明细",
      rows: metrics.rows.filter(
        (r) => (r.classId || "unknown") === detail.slice(6),
      ),
      columns: resultColumns,
      unit: "结果来源记录",
    };
  else if (detail.startsWith("band:"))
    descriptor = {
      title: model.distribution[Number(detail.slice(5))]?.label || "分布明细",
      rows: model.distribution[Number(detail.slice(5))]?.rows || [],
      columns: resultColumns,
      unit: "有效结果人次",
    };
  else if (detail.startsWith("stepall:") || detail.startsWith("steperrors:")) {
    const scopedSteps = effective.has("analysisSopId") ? analysisSteps : steps;
    const g = scopedSteps.find(
      (s) => s.id === detail.split(":").slice(1).join(":"),
    );
    descriptor = {
      title: `${g?.name || "步骤"} · ${detail.startsWith("stepall:") ? "有效样本" : "确认扣分来源"}`,
      rows: g ? (detail.startsWith("stepall:") ? g.rows : g.errors) : [],
      columns: [
        ...resultColumns.filter((c) => c.key !== "actions"),
        col("stepName", "步骤"),
        col("stepScore", "步骤分"),
        col("stepMaxScore", "步骤满分"),
        textCol("sources", "确认依据", (r) =>
          r.sources.map((s) => displayGradeText(s.reason)).join("；"),
        ),
        { key: "actions", label: "操作", render: sourceActions },
      ],
      unit: "步骤记录（同一次实训的同一步骤只计一次）",
      ...(effective.has("analysisSopId") ? { scope: analysisScope } : {}),
    };
  } else if (detail.startsWith("publication:")) {
    const k = detail.slice(12);
    const publication = teachingStatistics(data, {
      ...filters,
      from: "",
      to: "",
    }).metrics.publishing;
    descriptor = {
      title: `考试结果 · ${{ published: "已发布", ready: "待发布", pending: "待复核", excluded: "不计入发布率" }[k] || k}`,
      rows: publication[k] || [],
      columns: resultColumns,
      unit: "考试结果份数（当前状态，不受日期筛选）",
    };
  }
  const q = descriptor?.kind === "analysis" ? "" : effective.get("q") || "";
  const detailRows = descriptor
    ? descriptor.rows.filter(
        (r) =>
          !q ||
          `${r.studentName || ""} ${r.studentNumber || ""} ${r.arrangementName || ""}`.includes(
            q,
          ),
      )
    : [];
  const legacyAttendance = effective.get("attendance");
  const legacyTarget = !sourceChanged
    ? legacyAttendanceTarget(data, effective, dataSource, store.teacherId)
    : "";
  useEffect(() => {
    if (legacyTarget) nav(legacyTarget, { replace: true });
  }, [legacyTarget, nav]);
  const supportDirty = useRef(false);
  const closeSupport = () => {
    if (
      supportDirty.current &&
      !window.confirm("关闭辅导表单？尚未保存的填写将丢失。")
    )
      return false;
    setSupport(null);
    supportDirty.current = false;
    return true;
  };
  const compareIds = (effective.get("compare") || "")
      .split(",")
      .filter(Boolean),
    compare = progress.valid
      .filter((r) => compareIds.includes(r.sessionId))
      .sort((a, b) => a.timestamp - b.timestamp);
  const toggleCompare = (r) => {
    let ids = compareIds.includes(r.sessionId)
      ? compareIds.filter((x) => x !== r.sessionId)
      : [...compareIds, r.sessionId];
    if (ids.length > 2) {
      setError("最多选择两次可比结果。");
      return;
    }
    setError("");
    patch({ compare: ids.join(",") });
  };
  const exportProps = {
    scope,
    source: dataSource,
    disabled: Boolean(store.dataSyncError),
  };
  if (filterError)
    return (
      <section className="panel">
        <h1>教学改进</h1>
        <p role="alert">{filterError}</p>
        <button className={btn} onClick={() => patch({}, true)}>
          重置查询
        </button>
      </section>
    );
  return (
    <div className="teaching-statistics" data-refresh={refresh}>
      <div className="page-header">
        <div>
          <h1>教学改进</h1>
          <p>从结果和依据出发，查看班级表现与教学跟进。</p>
        </div>
        <div className="statistics-row-actions">
          <button className={btn} onClick={() => setRefresh((n) => n + 1)}>
            刷新
          </button>
          <button className={btn} onClick={() => setScopeOpen(!scopeOpen)}>
            口径说明
          </button>
        </div>
      </div>
      {legacyAttendance && !legacyTarget && !sourceChanged && (
        <section className="panel">
          <p>参加名单对应的安排不存在或不属于当前教师。</p>
          <button
            className={btn}
            onClick={() =>
              patch({ attendance: "", apage: "", asize: "", aq: "" })
            }
          >
            返回统计范围
          </button>
        </section>
      )}
      {scopeOpen && (
        <section className="panel statistics-notes">
          <h2>统计口径</h2>
          <p>
            平均分按有效正式结果人次计算；参考及格线为60分。缺证保分属于政策有效分，不代表AI识别效果或技能掌握率。历史标准按当时快照分析，评分口径不同不直接比较。分数/状态修订按当前已保存成绩重算。
          </p>
          <p>
            成绩日期取可信结果形成时间，未知时间单列；教学跟进按任务创建日期看当前状态，当前待办不受日期筛选。排除原因可重叠，合计不等于被排除记录总数。
          </p>
          <p>
            教师仅查看本人负责记录；默认全部日期以保留演示样例。当前数据源：
            {dataSource === "cpd" ? "CPD工作数据" : "浏览器工作数据"}。
          </p>
        </section>
      )}
      <section className="panel statistics-filter-panel">
        <form
          aria-label="教学改进筛选"
          onSubmit={(e) => {
            e.preventDefault();
            const message = validateStatisticsFilters(draft);
            if (message) {
              setError(message);
              return;
            }
            setError("");
            patch(
              {
                ...draft,
                teacherId: "",
                tab,
                student: "",
                detail: "",
                attendance: "",
                compare: "",
                page: "",
                dpage: "",
                q: "",
              },
              true,
            );
          }}
        >
          <div className="list-toolbar statistics-filters">
            {Object.entries(names).map(([key, label]) => (
              <select
                key={key}
                aria-label={label}
                value={draft[key]}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    [key]: e.target.value,
                  });
                }}
              >
                <option value="">全部{label}</option>
                {(options[key] || []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            ))}
            <div className="statistics-date-range">
              {["from", "to"].map((key, i) => (
                <Fragment key={key}>
                  {i > 0 && <span aria-hidden="true">至</span>}
                  <input
                    aria-label={i ? "结束日期" : "开始日期"}
                    title={i ? "结束日期" : "开始日期"}
                    type="date"
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                </Fragment>
              ))}
            </div>
            <div className="statistics-row-actions">
              <button className={primary} type="submit">
                应用筛选
              </button>
              <button
                className={btn}
                type="button"
                onClick={() => {
                  setError("");
                  setDraft({
                    teacherId: store.teacherId,
                    ...Object.fromEntries(fields.map((k) => [k, ""])),
                  });
                  patch({ tab }, true);
                }}
              >
                重置
              </button>
            </div>
          </div>
          {pendingDraft && (
            <p className="hint">
              有尚未应用的条件，当前结果及导出仍按已应用范围。
            </p>
          )}
        </form>
        <p className="hint">已应用：{scope}</p>
      </section>
      {(error || store.dataSyncError) && (
        <p className="form-error" role="alert">
          {error || store.dataSyncError}
        </p>
      )}
      <div className="statistics-tabs" role="tablist" aria-label="教学改进分类">
        {Object.entries(STATISTICS_TABS).map(([id, label]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() =>
              patch({
                tab: id,
                detail: "",
                attendance: "",
                page: "",
                dpage: "",
                q: "",
                compare: "",
              })
            }
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "classes" && (
        <>
          <div className="statistics-metrics">
            <Metric
              label="有有效结果的学生"
              value={summary.students}
              note="按学生去重 · 查看来源"
              onClick={() => openDetail("students")}
            />
            <Metric
              label="有效正式结果"
              value={summary.count}
              note="人次 · 查看全部明细"
              onClick={() => openDetail("all")}
            />
            <Metric
              label="平均得分（百分制）"
              value={fmt(summary.average)}
              note={`${summary.count}人次有效样本`}
              onClick={() => openDetail("all")}
            />
            <Metric
              label="参考及格率（60分）"
              value={percent(summary.pass, summary.count)}
              note={`${summary.pass}/${summary.count}人次`}
              onClick={() => openDetail("all")}
            />
          </div>
          <section className="panel">
            <div className="panel-title">
              <h2>成绩分布</h2>
              <button className={btn} onClick={() => openDetail("excluded")}>
                排除记录 {summary.excluded} 条
              </button>
            </div>
            <div className="statistics-distribution">
              {model.distribution.map((g, i) => (
                <button key={g.label} onClick={() => openDetail(`band:${i}`)}>
                  <span>{g.label}</span>
                  <span className="statistics-bar-track">
                    <i
                      style={{
                        width: `${summary.count ? (g.rows.length / summary.count) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <strong>{g.rows.length} 人次</strong>
                </button>
              ))}
            </div>
            <p className="hint">
              {model.unknownDates}{" "}
              条来源缺少可信结果时间；全部日期可查看，设置日期时排除未知时间。班级历史未记录时标明当前归属。
            </p>
          </section>
          <section className="panel">
            <div className="panel-title">
              <h2>班级结果概览</h2>
              <button className={btn} onClick={() => openDetail("all")}>
                查看全部有效结果
              </button>
            </div>
            {!model.comparable && (
              <p className="hint">
                当前为概览。请选择实训标准和结果类型；历史评分口径不一致时分组查看。
              </p>
            )}
            <StatisticsTable
              rows={model.classes}
              columns={[
                col("name", "班级"),
                col("source", "归属依据"),
                col("students", "学生数"),
                col("count", "有效人次"),
                col("average", "平均分"),
                col("passRate", "参考及格率", (r) => percent(r.pass, r.count)),
                col("excluded", "待核对/排除记录"),
                {
                  key: "actions",
                  label: "操作",
                  render: (r) => (
                    <button
                      className={btn}
                      onClick={() => openDetail(`class:${r.id}`)}
                    >
                      查看结果
                    </button>
                  ),
                },
              ]}
              params={effective}
              patch={patch}
            />
          </section>
        </>
      )}
      {tab === "progress" && (
        <>
          <section className="panel">
            <h2>选择学生与可比标准</h2>
            <label className="statistics-arrangement-select">
              <select
                aria-label="选择学生"
                value={studentId}
                onChange={(e) =>
                  patch({ student: e.target.value, compare: "", page: "" })
                }
              >
                <option value="">请选择学生</option>
                {studentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            {!model.comparable && (
              <p className="hint">
                选择实训标准和练习/考试类型后，按历史快照中的评分依据比较进步；口径不一致时不计算首末变化。
              </p>
            )}
          </section>
          {studentId && !studentOptions.some((s) => s.id === studentId) ? (
            <section className="panel">
              <p>该学生不在当前范围，请重新选择；没有改用其他学生。</p>
            </section>
          ) : (
            studentId && (
              <>
                <div className="statistics-metrics">
                  <Metric
                    label="本范围有效结果"
                    value={progress.valid.length}
                    note="人次"
                  />
                  <Metric
                    label="首次得分"
                    value={fmt(progress.first?.normalizedScore)}
                  />
                  <Metric
                    label="最近得分"
                    value={fmt(progress.last?.normalizedScore)}
                  />
                  <Metric
                    label="首末变化（分）"
                    value={
                      progress.delta === null
                        ? "—"
                        : `${progress.delta > 0 ? "+" : ""}${fmt(progress.delta)}`
                    }
                  />
                </div>
                <section className="panel">
                  <h2>历次结果与变化</h2>
                  {progress.reason && <p className="hint">{progress.reason}</p>}
                  {progress.valid.length > progress.timed.length && (
                    <p className="hint">
                      另有 {progress.valid.length - progress.timed.length}{" "}
                      条有效结果时间未记录，未参与首末比较。
                    </p>
                  )}
                  {filters.sopId && filters.type && (
                    <Trend rows={progress.timed} connected={progress.ready} />
                  )}
                  <div className="panel-title">
                    <h3>历次结果明细</h3>
                    <ExportButton
                      {...exportProps}
                      rows={progress.rows}
                      columns={resultColumns}
                      title="学生历次结果"
                      unit="实训结果记录"
                    />
                  </div>
                  <StatisticsTable
                    rows={progress.rows}
                    columns={[
                      ...(filters.sopId && filters.type
                        ? [
                            {
                              key: "compare",
                              label: "选择两次对比",
                              render: (r) => (
                                <input
                                  aria-label={`选择${r.sessionId}比较`}
                                  type="checkbox"
                                  checked={compareIds.includes(r.sessionId)}
                                  disabled={
                                    !r.valid ||
                                    r.timestamp === null ||
                                    !r.standardBasisComplete
                                  }
                                  onChange={() => toggleCompare(r)}
                                />
                              ),
                            },
                          ]
                        : []),
                      ...resultColumns,
                    ]}
                    params={effective}
                    patch={patch}
                  />
                  {compare.length === 2 && (
                    <div className="statistics-compare">
                      <h3>两次步骤对比</h3>
                      <p>
                        {compare[0].arrangementName} /{" "}
                        {compare[1].arrangementName}
                      </p>
                      {!compare[0].standardBasisKey ||
                      compare[0].standardBasisKey !==
                        compare[1].standardBasisKey ? (
                        <p>
                          两次记录的历史评分依据不同或不完整，不能直接计算步骤变化。
                        </p>
                      ) : compare[0].timestamp === compare[1].timestamp ? (
                        <p>两次结果时间相同，无法可靠确认先后。</p>
                      ) : (
                        <StatisticsTable
                          rows={compare[0].session.steps.map((s) => {
                            const other = compare[1].session.steps.find(
                              (t) => t.id === s.id,
                            );
                            return {
                              id: s.id,
                              name: s.name,
                              left: `${s.effectiveScore ?? s.score}/${s.maxScore}`,
                              change: other
                                ? Number(other.effectiveScore ?? other.score) -
                                  Number(s.effectiveScore ?? s.score)
                                : null,
                              right: other
                                ? `${other.effectiveScore ?? other.score}/${other.maxScore}`
                                : "步骤未记录",
                            };
                          })}
                          columns={[
                            col("name", "步骤"),
                            col("left", "所选结果一"),
                            col("right", "所选结果二"),
                            col("change", "第二次减第一次（分）"),
                          ]}
                          params={effective}
                          patch={patch}
                          prefix="c"
                        />
                      )}
                    </div>
                  )}
                </section>
                <section className="panel">
                  <h2>关联辅导记录</h2>
                  <StatisticsTable
                    rows={all.history.filter(
                      (t) =>
                        t.kind === "support" &&
                        t.studentId === studentId &&
                        (!filters.sopId || t.sopId === filters.sopId) &&
                        (!filters.type || t.type === filters.type),
                    )}
                    columns={historyColumns}
                    params={effective}
                    patch={patch}
                    prefix="s"
                  />
                  <p className="hint">
                    关联辅导看当前状态，办结不等于成绩提升。源成绩和辅导发起依据分别保留。
                  </p>
                </section>
              </>
            )
          )}
        </>
      )}
      {tab === "steps" && (
        <section className="panel">
          <div className="panel-title">
            <h2>同标准步骤分析</h2>
          </div>
          <p className="statistics-current-note">
            按实训标准及历史评分依据分组，点击“查看步骤分析”在侧栏查看详情。
          </p>
          {standards.length ? (
            <StatisticsTable
              rows={standards}
              columns={standardColumns}
              params={effective}
              patch={patch}
            />
          ) : (
            <p className="statistics-empty">
              当前查询范围没有来源记录，可调整或重置上方筛选。
            </p>
          )}
        </section>
      )}
      {tab === "followup" && (
        <>
          <section className="panel">
            <div className="panel-title">
              <h2>求助、补证与辅导记录</h2>
              <label>
                <select
                  aria-label="跟进记录类型"
                  value={kind}
                  onChange={(e) =>
                    patch({ kind: e.target.value, status: "all", page: "" })
                  }
                >
                  {Object.entries(HISTORY_KINDS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="hint">
              按创建日期选记录，展示当前状态。创建日期未知记录{" "}
              {model.unknownTaskDates} 条，日期筛选时不纳入。
            </p>
            <div className="statistics-status-tabs">{taskSummaryButtons}</div>
            <p>
              {kind === "all" ? "全部类型" : "本类型"}成功办结率{" "}
              {taskSummary.rate === null ? "—" : `${fmt(taskSummary.rate)}%`}（
              {taskSummary.completed.length}/{taskSummary.denominator}
              ）；取消、撤销、随会话关闭不算成功办结。
            </p>
            <ExportButton
              {...exportProps}
              rows={taskRows}
              columns={historyColumns}
              title={`${HISTORY_KINDS[kind]}-${status}`}
              unit="任务/请求记录"
            />
            <StatisticsTable
              rows={taskRows}
              columns={historyColumns}
              params={effective}
              patch={patch}
            />
          </section>
          <section className="panel">
            <div className="panel-title">
              <h2>当前待处理工作</h2>
              <label>
                <select
                  aria-label="待处理工作类别"
                  value={workKind}
                  onChange={(e) => patch({ work: e.target.value, wpage: "" })}
                >
                  {Object.entries(workKinds).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="statistics-current-note">
              当前待办，日期筛选不适用；班级、实训标准和类型范围仍生效。
            </p>
            {workKind === "publish" &&
              (() => {
                const pub = teachingStatistics(data, {
                  ...filters,
                  from: "",
                  to: "",
                }).metrics.publishing;
                return (
                  <>
                    <p>
                      待发布考试 {workRows.length} 场；考试成绩发布率{" "}
                      {percent(pub.numerator, pub.denominator)}（{pub.numerator}
                      /{pub.denominator}份），待复核 {pub.pendingCount} 份。
                    </p>
                    <div className="statistics-row-actions">
                      {[
                        ["published", "已发布"],
                        ["ready", "待发布"],
                        ["pending", "待复核"],
                        ["excluded", "不计入发布率"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={btn}
                          onClick={() => openDetail(`publication:${key}`)}
                        >
                          {label} {pub[key].length}份
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            <ExportButton
              {...exportProps}
              scope={`${scope}；当前待办类别：${workKinds[workKind]}；日期筛选不适用`}
              rows={workRows}
              columns={[
                col("id", "来源组合标识"),
                col("type", "类别", (r) => workKinds[r.type] || "未知类别"),
                col("arrangementName", "安排"),
                workStudentColumn,
                textCol("instruction", "事项"),
                col("status", "状态"),
              ]}
              title={`当前待处理工作-${workKinds[workKind]}`}
              unit={
                workKind === "all"
                  ? "待办事项（考试发布按场次统计，复核和流程确认按每次实训的步骤统计）"
                  : workKind === "publish"
                    ? "考试安排"
                    : "实训及步骤记录"
              }
            />
            <StatisticsTable
              rows={workRows}
              className="statistics-table--work"
              columns={[
                col("type", "类别", (r) => workKinds[r.type] || "未知类别"),
                col("arrangementName", "安排"),
                workStudentColumn,
                textCol("instruction", "事项"),
                {
                  key: "actions",
                  label: "操作",
                  render: (r) => (
                    <button className={btn} onClick={() => go(r.path)}>
                      {r.actionLabel}
                    </button>
                  ),
                },
              ]}
              params={effective}
              patch={patch}
              prefix="w"
            />
          </section>
        </>
      )}
      {descriptor && (
        <StatisticsLayer
          key={detail}
          title={descriptor.title}
          onBack={
            detailParent
              ? () => setParams(detailParent, { replace: true })
              : undefined
          }
          onClose={() =>
            setParams(closeStatisticsDetail(effective, dataSource), {
              replace: true,
            })
          }
          wide
        >
          <p className="hint">
            {descriptor.scope || scope} · 统计单位：{descriptor.unit}
          </p>
          {descriptor.kind !== "analysis" && (
            <>
              <label className="statistics-search">
                查询本明细姓名/学号/安排
                <input
                  value={q}
                  onChange={(e) => patch({ q: e.target.value, dpage: "" })}
                />
              </label>
            </>
          )}
          <div className="panel-title">
            <p>
              {descriptor.kind === "analysis" ? (
                `有效结果 ${analysisModel?.summary.count || 0} 人次 · ${analysisSteps.length} 个可分析步骤`
              ) : (
                <>
                  当前明细 {detailRows.length}{" "}
                  条，导出全部符合条件记录。当前成绩可在源报告核对。
                </>
              )}
            </p>
            <ExportButton
              {...exportProps}
              scope={`${descriptor.scope || scope}；明细额外条件：${q || "无"}；${descriptor.unit}`}
              rows={detailRows}
              columns={descriptor.columns}
              title={descriptor.title}
              unit={descriptor.unit}
            />
          </div>
          <StatisticsTable
            rows={detailRows}
            columns={descriptor.columns}
            params={effective}
            patch={patch}
            prefix={descriptor.kind === "analysis" ? "a" : "d"}
          />
          {descriptor.kind === "analysis" && (
            <>
              {!analysisSteps.length && analysisModel && (
                <p className="hint">
                  当前范围暂无可分析步骤，请核对有效样本和历史评分依据。
                </p>
              )}
              <p className="hint">
                同一学生在同一次实训中的同一步骤，最多统计一次已确认扣分；证据不足时保留分数、人工确认流程完成，均不计为AI确认成功。
              </p>
              <div className="statistics-step-bars">
                {analysisSteps.map((g) => (
                  <div key={g.id}>
                    <span>{g.name}</span>
                    <span className="statistics-bar-track">
                      <i style={{ width: `${g.rate}%` }} />
                    </span>
                    <span>{fmt(g.rate)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </StatisticsLayer>
      )}
      {support && (
        <StatisticsLayer title="安排学生辅导" onClose={closeSupport}>
          <SupportTaskCreate
            key={support.id}
            initiallyOpen
            row={support}
            filters={support.supportFilters || filters}
            onCreated={(task) => {
              setSupport(null);
              go(`/teacher/support-tasks/${task.id}`);
            }}
            onCancel={closeSupport}
            onDirtyChange={(dirty) => {
              supportDirty.current = dirty;
            }}
          />
        </StatisticsLayer>
      )}
    </div>
  );
}
