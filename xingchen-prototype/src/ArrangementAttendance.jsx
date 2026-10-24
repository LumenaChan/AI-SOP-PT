import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { StatisticsLayer } from "./StatisticsLayer.jsx";
import {
  arrangementAttendance,
  arrangementAttendanceCsv,
  attendanceReturnTarget,
  withAttendanceReturn,
} from "./arrangementAttendanceRules.js";
import {
  validStatisticsReturn,
  withStatisticsReturn,
} from "./statisticsCommonRules.js";

const btn = "button button--default";

export function AttendanceReturnLink() {
  const loc = useLocation(),
    nav = useNavigate(),
    { dataSource } = usePrototypeData();
  const back = attendanceReturnTarget(
    new URLSearchParams(loc.search),
    dataSource,
    loc.pathname,
  );
  return back ? (
    <div className="statistics-return">
      <button type="button" className={btn} onClick={() => nav(back)}>
        ← 返回参加名单
      </button>
    </div>
  ) : null;
}

export function ArrangementAttendanceEntry({
  arrangement,
  adminReadOnly = false,
}) {
  const { data, dataSource } = usePrototypeData(),
    loc = useLocation(),
    nav = useNavigate(),
    [params, setParams] = useSearchParams(),
    [exportError, setExportError] = useState("");
  const model = arrangementAttendance(
    data,
    arrangement.id,
    adminReadOnly ? null : "t1",
  );
  if (!model) return null;
  const patch = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };
  const opened = params.get("attendance") === "1",
    query = params.get("aq") || "",
    rows = model.rows.filter((r) =>
      `${r.studentName} ${r.studentNumber}`.includes(query.trim()),
    ),
    size = [10, 20, 50].includes(Number(params.get("asize")))
      ? Number(params.get("asize"))
      : 10,
    pageCount = Math.max(1, Math.ceil(rows.length / size)),
    page = Math.max(
      0,
      Math.min(pageCount - 1, Math.floor(Number(params.get("apage"))) || 0),
    );
  const back =
    params.get("statisticsSource") === dataSource
      ? validStatisticsReturn(params.get("statisticsReturn"))
      : "";
  const viewRecord = (path) => {
    if (adminReadOnly) {
      const sessionId = new URL(
        path,
        "http://prototype.local",
      ).searchParams.get("sessionId");
      const session = arrangement.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      path = `/admin/${arrangement.type === "exam" ? "exams" : "practices"}/${arrangement.id}/students/${session.studentId}?sessionId=${encodeURIComponent(session.id)}`;
    }
    nav(
      withAttendanceReturn(
        withStatisticsReturn(path, back, dataSource),
        loc.pathname + loc.search,
        dataSource,
      ),
    );
  };
  const download = () => {
    try {
      const bytes = arrangementAttendanceCsv(model, rows, dataSource, query),
        url = URL.createObjectURL(
          new Blob([bytes], { type: "text/csv;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `${arrangement.name}-参加名单.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError("");
    } catch (error) {
      setExportError(error.message);
    }
  };
  return (
    <>
      <button
        type="button"
        className={btn}
        onClick={() => {
          setExportError("");
          patch({ attendance: "1" });
        }}
      >
        查看参加名单
      </button>
      {opened && (
        <StatisticsLayer
          title={`${arrangement.name} · 参加名单`}
          wide
          onClose={() =>
            patch({ attendance: "", aq: "", apage: "", asize: "" })
          }
          onBack={back ? () => nav(back) : undefined}
          backLabel="返回统计明细"
        >
          <p className="hint">
            本安排完整名单，不受教学统计的班级、日期或有效成绩筛选裁剪。参加状态依据本次操作记录，无记录不直接认定为未参加。
          </p>
          <p className="attendance-summary">
            <strong>
              {arrangement.status === "已取消"
                ? `原安排学生 ${model.counts.listed} 人（安排已取消）`
                : model.reliable
                  ? `应参加 ${model.counts.expected} 人`
                  : `安排学生 ${model.counts.listed} 人（分配待核对）`}
            </strong>
            <span>已参加 {model.counts.participated} 人</span>
            <span>明确未参加 {model.counts.absent} 人</span>
            <span>尚未开始 {model.counts.waiting} 人</span>
            <span>待核对 {model.counts.pending} 人</span>
          </p>
          {!model.reliable && (
            <p className="hint">
              分配记录不完整或存在重复，暂不推断可靠的应参加人数。
            </p>
          )}
          <div className="attendance-toolbar">
            <label className="statistics-search">
              搜索姓名或学号
              <input
                aria-label="搜索参加名单姓名或学号"
                value={query}
                onChange={(e) => patch({ aq: e.target.value, apage: "" })}
              />
            </label>
            <button
              type="button"
              className={btn}
              disabled={!rows.length}
              onClick={download}
            >
              导出名单（{rows.length}人）
            </button>
          </div>
          {exportError && (
            <p role="alert" className="form-error">
              {exportError}
            </p>
          )}
          <div className="statistics-table-wrap">
            <table className="statistics-table attendance-table">
              <thead>
                <tr>
                  {[
                    "学生",
                    "学号",
                    "班级",
                    "工位",
                    "参加状态",
                    "结果状态",
                    "操作",
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(page * size, (page + 1) * size).map((r) => (
                  <tr key={r.id}>
                    <td>{r.studentName}</td>
                    <td>{r.studentNumber}</td>
                    <td>{r.className}</td>
                    <td>{r.workstationName}</td>
                    <td>{r.status}</td>
                    <td>{r.resultStatus}</td>
                    <td>
                      {r.recordOptions.length > 1 ? (
                        <select
                          aria-label={`选择${r.studentName}的历史记录`}
                          value=""
                          onChange={(e) =>
                            e.target.value && viewRecord(e.target.value)
                          }
                        >
                          <option value="">选择历史记录</option>
                          {r.recordOptions.map((entry) => (
                            <option key={entry.id} value={entry.path}>
                              {entry.label}
                            </option>
                          ))}
                        </select>
                      ) : r.reportPath ? (
                        <button
                          type="button"
                          className={btn}
                          onClick={() => viewRecord(r.reportPath)}
                        >
                          查看本次记录
                        </button>
                      ) : (
                        "暂无可查看记录"
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={7}>没有符合条件的学生。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="statistics-pagination">
            <span>共 {rows.length} 人</span>
            <label>
              每页{" "}
              <select
                aria-label="参加名单每页人数"
                value={size}
                onChange={(e) => patch({ asize: e.target.value, apage: "" })}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>{" "}
              人
            </label>
            <button
              type="button"
              className={btn}
              disabled={page === 0}
              onClick={() => patch({ apage: page - 1 })}
            >
              上一页
            </button>
            <span>
              {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              className={btn}
              disabled={page + 1 === pageCount}
              onClick={() => patch({ apage: page + 1 })}
            >
              下一页
            </button>
          </div>
          {(model.extras.length > 0 || model.extraAssignments.length > 0) && (
            <details className="attendance-extras">
              <summary>
                查看名单外待核对记录（{model.extras.length}条会话、
                {model.extraAssignments.length}条分配）
              </summary>
              <p>以下记录不加入应参加人数，请在原安排核对。</p>
              {model.extras.map((s, i) => (
                <p key={s.id || i}>
                  {data.students.find((x) => x.id === s.studentId)?.name ||
                    "学生信息缺失"}{" "}
                  ·{" "}
                  {data.workstations.find((w) => w.id === s.workstationId)
                    ?.name || "工位待核对"}{" "}
                  · {s.resultStatus || s.status || "状态未记录"}
                </p>
              ))}
              {model.extraAssignments.map((p, i) => (
                <p key={i}>
                  {data.students.find((s) => s.id === p.studentId)?.name ||
                    "学生信息缺失"}{" "}
                  · 名单外分配
                </p>
              ))}
            </details>
          )}
        </StatisticsLayer>
      )}
    </>
  );
}
