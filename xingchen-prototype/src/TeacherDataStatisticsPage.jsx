import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { StatisticsLayer } from "./StatisticsLayer.jsx";
import { displayDateTime } from "./dateTimeRules.js";
import { withStatisticsReturn } from "./statisticsCommonRules.js";
import { displayBusinessText } from "./businessTextRules.js";
import { rememberStatisticsFilters } from "./statisticsFilterMemory.js";
import { arrangementDestination } from "./domainRules.js";
import {
  DATA_STATISTICS_PATH,
  DATA_RANGE_LABELS,
  dataStatisticsRange,
  teacherDataStatistics,
  validateDataStatisticsFilters,
  dataStatisticsImprovementPath,
  dataStatisticsCsv,
} from "./teacherDataStatisticsRules.js";
const btn = "button button--default",
  primary = "button button--primary";
const fmt = (n) => (n === null || n === undefined ? "—" : Number(n).toFixed(1));
const pct = (n) => (n === null || n === undefined ? "—" : `${fmt(n)}%`);
const typeLabel = (type) => (type === "exam" ? "考试" : "练习");
const fields = [
  "classId",
  "sopId",
  "type",
  "from",
  "to",
  "range",
  "grain",
  "dimension",
];
function downloadCsv(content, title) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `数据统计-${title}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function StatisticsDataTable({
  rows,
  columns,
  filters,
  source,
  title,
  disabled,
  action,
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [size, setSize] = useState(10),
    [error, setError] = useState(""),
    [sort, setSort] = useState(null);
  const filtered = rows.filter(
    (row) =>
      !query.trim() ||
      columns.some((c) =>
        String(c.value ? c.value(row) : (row[c.key] ?? ""))
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      ),
  );
  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const c = columns.find((c) => c.key === sort.key);
        const x =
            typeof a[c.key] === "number"
              ? a[c.key]
              : c.value
                ? c.value(a)
                : a[c.key],
          y =
            typeof b[c.key] === "number"
              ? b[c.key]
              : c.value
                ? c.value(b)
                : b[c.key];
        return (
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x ?? "").localeCompare(String(y ?? ""), "zh-CN")) *
          sort.direction
        );
      })
    : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / size)),
    safePage = Math.min(page, pages - 1);
  return (
    <>
      <div className="data-statistics-table-tools">
        <label>
          查询明细
          <input
            aria-label={`查询${title}`}
            value={query}
            placeholder="搜索名称、学生或日期"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <button
          className={btn}
          disabled={disabled || !filtered.length}
          onClick={() => {
            try {
              downloadCsv(
                dataStatisticsCsv(sorted, columns, filters, source, title),
                title,
              );
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          导出{title}（{filtered.length}条）
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="statistics-table-wrap">
        <table className="statistics-table data-statistics-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSort({
                        key: c.key,
                        direction: sort?.key === c.key ? -sort.direction : 1,
                      });
                      setPage(0);
                    }}
                  >
                    {c.label}
                    {sort?.key === c.key
                      ? sort.direction === 1
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                </th>
              ))}
              {action && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(safePage * size, (safePage + 1) * size).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {displayBusinessText(
                      c.value ? c.value(row) : (row[c.key] ?? "—"),
                    )}
                  </td>
                ))}
                {action && <td>{action(row)}</td>}
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan={columns.length + (action ? 1 : 0)}>
                  当前范围暂无记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="data-statistics-pagination">
        <span>共 {filtered.length} 条</span>
        <label>
          每页{" "}
          <select
            aria-label={`${title}每页条数`}
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>{" "}
          条
        </label>
        <button
          className={btn}
          disabled={!safePage}
          onClick={() => setPage(safePage - 1)}
        >
          上一页
        </button>
        <span>
          {safePage + 1}/{pages}
        </span>
        <button
          className={btn}
          disabled={safePage >= pages - 1}
          onClick={() => setPage(safePage + 1)}
        >
          下一页
        </button>
      </div>
    </>
  );
}
export function TeacherDataStatisticsPage() {
  const store = usePrototypeData(),
    location = useLocation(),
    [params, setParams] = useSearchParams();
  const sourceMismatch =
    params.has("source") && params.get("source") !== store.dataSource;
  const effective = new URLSearchParams(sourceMismatch ? "" : params);
  const initialRange =
    effective.get("range") ||
    (effective.has("from") || effective.has("to") ? "custom" : "month");
  const defaults = dataStatisticsRange(initialRange);
  const filters = Object.fromEntries(
    fields.map((key) => [key, effective.get(key) || ""]),
  );
  filters.range = Object.hasOwn(DATA_RANGE_LABELS, initialRange)
    ? initialRange
    : "month";
  if (!effective.has("from") && !effective.has("to"))
    Object.assign(filters, defaults);
  filters.grain = ["day", "week", "month"].includes(filters.grain)
    ? filters.grain
    : "day";
  filters.dimension = filters.dimension === "standard" ? "standard" : "class";
  filters.teacherId = store.teacherId;
  const fingerprint = JSON.stringify(filters);
  const [draft, setDraft] = useState(filters),
    [error, setError] = useState(""),
    [notes, setNotes] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setDraft(filters);
    setError("");
  }, [fingerprint]);
  useEffect(() => {
    if (sourceMismatch)
      setParams({ source: store.dataSource }, { replace: true });
  }, [sourceMismatch, store.dataSource, setParams]);
  const filterError = validateDataStatisticsFilters(filters);
  const model = useMemo(
    () =>
      teacherDataStatistics(
        store.data,
        filterError ? { teacherId: store.teacherId } : filters,
      ),
    [store.data, fingerprint, refresh],
  );
  useEffect(() => {
    if (!sourceMismatch && !filterError) {
      const saved = new URLSearchParams();
      for (const key of fields) if (filters[key]) saved.set(key, filters[key]);
      rememberStatisticsFilters(
        DATA_STATISTICS_PATH,
        saved,
        store.dataSource,
        store.teacherId,
      );
    }
  }, [
    fingerprint,
    sourceMismatch,
    filterError,
    store.dataSource,
    store.teacherId,
  ]);
  const patch = (changes, reset = false) => {
    const next = new URLSearchParams(reset ? "" : effective);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.set("source", store.dataSource);
    setParams(next);
  };
  const open = (detail, dimension = "", group = "") =>
    patch({
      detail,
      groupBy: dimension || filters.dimension,
      group: dimension && !group ? "__unrecorded__" : group,
      bucket: "",
    });
  const scoped = (rows) =>
    rows.filter(
      (r) =>
        !effective.get("group") ||
        (((effective.get("groupBy") || filters.dimension) === "standard"
          ? r.sopId
          : r.classId) || "__unrecorded__") === effective.get("group"),
    );
  const detail = effective.get("detail"),
    bucket = effective.get("bucket");
  const detailRows =
    detail === "activities"
      ? model.activities
      : detail === "coverage"
        ? scoped(model.expected)
        : detail === "completions"
          ? scoped(model.completions)
          : detail === "grades"
            ? scoped(model.grades)
            : scoped(model.participants).filter(
                (r) =>
                  !bucket ||
                  model.series.rows
                    .find((b) => b.id === bucket)
                    ?.records.some((x) => x.id === r.id),
              );
  const titles = {
    activities: "实训开展记录",
    participants: "实训参与记录",
    students: "参与学生记录（同一学生可有多次记录）",
    coverage: "已结束安排完成明细",
    completions: "实训完成记录",
    grades: "有效正式成绩",
  };
  const groupRows =
    filters.dimension === "class" ? model.classes : model.standards;
  const activityPath = (a) =>
    `/teacher/${a.type === "exam" ? "exams" : "practices"}/${encodeURIComponent(a.id)}/${arrangementDestination(a)}`;
  const sourcePath = (path) => {
    const u = new URL(path, "http://prototype.local");
    u.searchParams.set("source", store.dataSource);
    return withStatisticsReturn(
      u.pathname + u.search + u.hash,
      location.pathname + location.search,
      store.dataSource,
    );
  };
  const summaryColumns = [
    { key: "name", label: filters.dimension === "class" ? "班级" : "实训标准" },
    { key: "activityCount", label: "开展场次" },
    { key: "studentCount", label: "参与学生数" },
    { key: "participationCount", label: "参与人次" },
    { key: "completionCount", label: "完成人次" },
    { key: "expectedCount", label: "结束安排应参加人次" },
    { key: "expectedParticipatedCount", label: "结束安排已参加人次" },
    { key: "completedCount", label: "结束安排已完成人次" },
    {
      key: "completionRate",
      label: "完成率",
      value: (r) => pct(r.completionRate),
    },
    { key: "count", label: "有效成绩数" },
    { key: "average", label: "平均分", value: (r) => fmt(r.average) },
    {
      key: "passRate",
      label: "参考及格率（60分）",
      value: (r) => pct(r.passRate),
    },
  ];
  const detailColumns = [
    ...(detail !== "activities"
      ? [
          { key: "studentName", label: "学生" },
          { key: "studentNumber", label: "学号" },
          { key: "className", label: "班级" },
        ]
      : []),
    { key: "arrangementName", label: "安排" },
    { key: "sopName", label: "实训标准" },
    { key: "type", label: "类型", value: (r) => typeLabel(r.type) },
    {
      key: "time",
      label:
        detail === "grades"
          ? "结果形成时间"
          : detail === "coverage"
            ? "安排结束时间"
            : detail === "completions"
              ? "完成时间"
              : "实际开始时间",
      value: (r) => (r.time ? displayDateTime(r.time) : "未记录"),
    },
    ...(detail === "grades"
      ? [
          {
            key: "normalizedScore",
            label: "百分制得分",
            value: (r) => fmt(r.normalizedScore),
          },
          { key: "resultStatus", label: "成绩状态" },
        ]
      : [
          {
            key: "status",
            label: detail === "coverage" ? "完成情况" : "状态",
            value: (r) => r.status || r.session?.status || "未记录",
          },
        ]),
  ];
  const sum = model.summary,
    maxTrend = Math.max(
      1,
      ...model.series.rows.map((r) => r.practice + r.exam),
    ),
    maxClass = Math.max(
      1,
      ...model.classes.flatMap((r) => [
        r.expectedParticipatedCount,
        r.expectedCount,
        r.completedCount,
      ]),
    ),
    maxStandard = Math.max(
      1,
      ...model.standards.map((r) => r.participationCount),
    );
  const exportDisabled = Boolean(store.dataSyncError);
  return (
    <div className="teacher-data-statistics">
      <div className="page-header">
        <div>
          <h1>数据统计</h1>
          <p>查看实训开展、学生参与与任务完成情况。</p>
        </div>
        <div className="statistics-row-actions">
          <button className={btn} onClick={() => setRefresh((n) => n + 1)}>
            刷新
          </button>
          <button
            className={btn}
            aria-expanded={notes}
            onClick={() => setNotes(!notes)}
          >
            口径说明
          </button>
        </div>
      </div>
      <section className="panel data-statistics-filter">
        <form
          aria-label="数据统计筛选"
          onSubmit={(e) => {
            e.preventDefault();
            const message = validateDataStatisticsFilters(draft);
            if (message) {
              setError(message);
              return;
            }
            setError("");
            patch(Object.fromEntries(fields.map((k) => [k, draft[k]])), true);
          }}
        >
          <label className="field">
            时间范围
            <select
              value={draft.range}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  range: e.target.value,
                  ...dataStatisticsRange(e.target.value),
                })
              }
            >
              {Object.entries(DATA_RANGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            开始日期
            <input
              type="date"
              value={draft.from}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  from: e.target.value,
                  range: draft.range === "term" ? "term" : "custom",
                })
              }
            />
          </label>
          <label className="field">
            结束日期
            <input
              type="date"
              value={draft.to}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  to: e.target.value,
                  range: draft.range === "term" ? "term" : "custom",
                })
              }
            />
          </label>
          <label className="field">
            班级
            <select
              value={draft.classId}
              onChange={(e) => setDraft({ ...draft, classId: e.target.value })}
            >
              <option value="">全部班级</option>
              {model.options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            实训类型
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              <option value="">练习与考试</option>
              <option value="practice">练习</option>
              <option value="exam">考试</option>
            </select>
          </label>
          <label className="field">
            实训标准
            <select
              value={draft.sopId}
              onChange={(e) => setDraft({ ...draft, sopId: e.target.value })}
            >
              <option value="">全部实训标准</option>
              {model.options.standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            趋势汇总
            <select
              value={draft.grain}
              onChange={(e) => setDraft({ ...draft, grain: e.target.value })}
            >
              <option value="day">按日</option>
              <option value="week">按周</option>
              <option value="month">按月</option>
            </select>
          </label>
          <div className="data-statistics-filter-actions">
            <button className={primary}>应用筛选</button>
            <button
              type="button"
              className={btn}
              onClick={() =>
                patch(
                  {
                    range: "month",
                    ...dataStatisticsRange("month"),
                    grain: "day",
                  },
                  true,
                )
              }
            >
              重置
            </button>
          </div>
        </form>
        {draft.range === "term" && (
          <p className="hint">请按学校实际学期填写起止日期，不自动推定学期。</p>
        )}
        {(error || filterError) && (
          <p className="form-error" role="alert">
            {error || filterError}
          </p>
        )}
        <p className="data-statistics-applied">
          已应用：{filters.from || "不限起始日期"} 至{" "}
          {filters.to || "不限结束日期"} · 当前教师负责记录 ·
          开展按开始时间，完成按完成时间，成绩按结果形成时间。
        </p>
      </section>
      {notes && (
        <section className="panel data-statistics-notes">
          <h2>统计口径</h2>
          <p>
            参与学生按实际开始的记录去重；参与人次按实训记录计。完成率为所选期间已结束安排中，已完成或提交的学生人次／可靠名单应参加人次；进行中的安排单独查看，不记为未完成。完成不代表全部操作正确。
          </p>
          <p>
            平均分与参考及格率仅统计有效正式成绩，及格线为百分制60分；同类、同标准且历史评分依据一致才汇总。未开始、未参加、取消、暂计分和待复核结果不混入成绩。数据缺失不补零。
          </p>
          <p>
            班级优先使用本次历史归属，未记录时使用当前归属。趋势按北京时间划分，周一为每周起点；跨度较大时自动改用周或月汇总。不同指标的日期口径不同，不能直接相减推断缺席人数。
          </p>
        </section>
      )}
      {!filterError && (
        <>
          <div className="data-statistics-metrics">
            {[
              ["开展场次", sum.activityCount, "实际开始的安排数", "activities"],
              [
                "参与学生数",
                sum.studentCount,
                "按学生去重，明细列出参与记录",
                "students",
              ],
              [
                "参与人次",
                sum.participationCount,
                `本期完成 ${sum.completionCount} 人次`,
                "participants",
              ],
              [
                "完成率",
                pct(sum.completionRate),
                `已结束安排 ${sum.completedCount}/${sum.expectedCount} 人次`,
                "coverage",
              ],
              [
                "平均分",
                fmt(sum.average),
                !sum.count
                  ? "当前范围暂无有效正式成绩"
                  : sum.comparable
                    ? `${sum.count} 条有效正式成绩`
                    : `${sum.count} 条有效成绩，评分依据不一致时不汇总`,
                "grades",
              ],
              [
                "参考及格率（60分）",
                pct(sum.passRate),
                "同类、同标准、同评分依据",
                "grades",
              ],
            ].map(([label, value, note, detail]) => (
              <button
                key={label}
                className="data-statistics-metric"
                onClick={() => open(detail)}
              >
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
                <span className="data-statistics-metric-link">查看明细 →</span>
              </button>
            ))}
          </div>
          {(Object.values(model.missing).some(Boolean) ||
            model.excludedGrades > 0) && (
            <details className="panel data-statistics-data-quality">
              <summary>数据说明与未纳入记录</summary>
              <p>
                开始时间未记录：{model.missing.starts} 条参与记录、
                {model.missing.arrangements} 个安排；完成时间未记录：
                {model.missing.completions} 条。安排结束时间未记录：
                {model.missing.cohorts} 个，名单缺失或重复：
                {model.missing.rosters} 个。
              </p>
              <p>
                有日期筛选时，缺少对应时间的记录不进入该项统计；选择全部日期可查看历史记录。无法确定应参加名单的安排不计入完成率。本期未纳入有效成绩的记录{" "}
                {model.excludedGrades} 条。
              </p>
            </details>
          )}
          <section className="panel data-statistics-chart">
            <div className="panel-title">
              <h2>实训开展趋势</h2>
              <div className="statistics-row-actions">
                <button className={btn} onClick={() => open("participants")}>
                  查看参与记录
                </button>
                <button className={btn} onClick={() => open("completions")}>
                  查看完成记录
                </button>
              </div>
            </div>
            <p>
              按{{ day: "日", week: "周", month: "月" }[model.series.grain]}
              汇总参与人次；开始时间未记录的记录不进入趋势。
            </p>
            <div className="data-statistics-legend">
              <span>
                <i className="is-practice" />
                练习
              </span>
              <span>
                <i className="is-exam" />
                考试
              </span>
            </div>
            {model.series.rows.length ? (
              <div
                className="data-statistics-trend"
                role="group"
                aria-label="实训参与人次趋势"
              >
                {model.series.rows.map((r) => (
                  <button
                    key={r.id}
                    title={`${r.label}：练习${r.practice}人次，考试${r.exam}人次`}
                    onClick={() =>
                      patch({ detail: "participants", bucket: r.id, group: "" })
                    }
                  >
                    <strong>{r.practice + r.exam}</strong>
                    <span className="data-statistics-trend-track">
                      <i
                        className="is-exam"
                        style={{ height: `${(r.exam / maxTrend) * 100}%` }}
                      />
                      <i
                        className="is-practice"
                        style={{ height: `${(r.practice / maxTrend) * 100}%` }}
                      />
                    </span>
                    <small>{r.label}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="data-statistics-empty">
                当前范围暂无可按时间汇总的参与记录。
              </p>
            )}
          </section>
          <div className="data-statistics-chart-grid">
            <section className="panel data-statistics-chart">
              <div className="panel-title">
                <h2>班级参与与完成</h2>
              </div>
              <p>
                按本期已结束安排的可靠学生名单，比较应参加、已参加与已完成人次。
              </p>
              <div className="data-statistics-legend">
                <span>
                  <i className="is-practice" />
                  参与
                </span>
                <span>
                  <i className="is-expected" />
                  应参加
                </span>
                <span>
                  <i className="is-complete" />
                  已完成
                </span>
              </div>
              <div className="data-statistics-horizontal">
                {model.classes
                  .filter((r) => r.expectedCount > 0)
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => open("coverage", "class", r.id)}
                    >
                      <strong>{r.name}</strong>
                      <div>
                        {[
                          [
                            r.expectedParticipatedCount,
                            "is-practice",
                            "结束安排已参加",
                          ],
                          [r.expectedCount, "is-expected", "结束安排应参加"],
                          [r.completedCount, "is-complete", "结束安排已完成"],
                        ].map(([n, cls, label]) => (
                          <span key={cls} aria-label={`${label}${n}人次`}>
                            <i
                              className={cls}
                              style={{ width: `${(n / maxClass) * 100}%` }}
                            />
                            <b>{n}</b>
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                {!model.classes.some((r) => r.expectedCount > 0) && (
                  <p className="data-statistics-empty">
                    本期暂无已结束且有可靠名单的班级安排。
                  </p>
                )}
              </div>
            </section>
            <section className="panel data-statistics-chart">
              <div className="panel-title">
                <h2>实训项目开展</h2>
              </div>
              <p>按实际参与人次比较各实训标准的开展情况。</p>
              <div className="data-statistics-horizontal">
                {model.standards.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => open("participants", "standard", r.id)}
                  >
                    <strong>{r.name}</strong>
                    <div>
                      <span aria-label={`${r.participationCount}参与人次`}>
                        <i
                          className="is-practice"
                          style={{
                            width: `${(r.participationCount / maxStandard) * 100}%`,
                          }}
                        />
                        <b>{r.participationCount}</b>
                      </span>
                    </div>
                    <small>
                      {r.activityCount}场 · {r.studentCount}名学生 ·{" "}
                      {r.completionCount}完成人次
                    </small>
                  </button>
                ))}
                {!model.standards.length && (
                  <p className="data-statistics-empty">
                    当前范围暂无实训项目数据。
                  </p>
                )}
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="panel-title">
              <h2>统计汇总</h2>
              <label className="data-statistics-dimension">
                汇总维度
                <select
                  aria-label="汇总维度"
                  value={filters.dimension}
                  onChange={(e) =>
                    patch({
                      dimension: e.target.value,
                      detail: "",
                      group: "",
                      bucket: "",
                    })
                  }
                >
                  <option value="class">按班级</option>
                  <option value="standard">按实训标准</option>
                </select>
              </label>
            </div>
            <p className="data-statistics-caption">
              平均分及参考及格率仅在同类、同标准且评分依据一致时展示。跨班级场次和学生数不可直接相加。
            </p>
            <StatisticsDataTable
              key={`summary:${fingerprint}`}
              rows={groupRows}
              columns={summaryColumns}
              filters={filters}
              source={store.dataSource}
              title="统计汇总"
              disabled={exportDisabled}
              action={(r) => (
                <div className="statistics-row-actions">
                  <button
                    className="statistics-text-link"
                    onClick={() =>
                      open("participants", filters.dimension, r.id)
                    }
                  >
                    参与明细
                  </button>
                  <button
                    className="statistics-text-link"
                    onClick={() => open("coverage", filters.dimension, r.id)}
                  >
                    完成明细
                  </button>
                  <Link
                    to={dataStatisticsImprovementPath(
                      {
                        ...filters,
                        [filters.dimension === "class" ? "classId" : "sopId"]:
                          r.id,
                      },
                      store.dataSource,
                    )}
                  >
                    教学分析
                  </Link>
                </div>
              )}
            />
          </section>
        </>
      )}
      {Object.hasOwn(titles, detail) && !filterError && (
        <StatisticsLayer
          title={titles[detail]}
          wide
          onClose={() =>
            patch({ detail: "", group: "", groupBy: "", bucket: "" })
          }
        >
          <p className="data-statistics-caption">
            {detail === "grades"
              ? "复用教学改进中的有效正式成绩范围。"
              : detail === "coverage"
                ? "名单按已结束安排计算；无操作记录不直接认定为缺席。"
                : "仅展示当前筛选范围内的记录。"}
          </p>
          {detail === "grades" && (
            <Link
              className={btn}
              to={dataStatisticsImprovementPath(filters, store.dataSource)}
            >
              查看教学分析
            </Link>
          )}
          <StatisticsDataTable
            key={`${fingerprint}:${detail}:${effective.get("group")}:${bucket}`}
            rows={detailRows}
            columns={detailColumns}
            filters={filters}
            source={store.dataSource}
            title={titles[detail]}
            disabled={exportDisabled}
            action={(r) => (
              <Link
                className="statistics-text-link"
                to={sourcePath(
                  detail === "activities" || detail === "coverage"
                    ? activityPath(r.arrangement)
                    : r.reportPath,
                )}
              >
                查看
                {detail === "activities" || detail === "coverage"
                  ? "安排"
                  : "记录"}
              </Link>
            )}
          />
        </StatisticsLayer>
      )}
    </div>
  );
}
