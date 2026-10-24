import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { teacherDashboardMetrics } from "./teacherDashboardMetrics.js";
import { openSupportTasks } from "./supportTaskRules.js";
import { legacyStatisticsTarget } from "./statisticsCommonRules.js";
import { DashboardCardPager } from "./DashboardCardPager.jsx";
export function DashboardPerformanceSection() {
  const { data } = usePrototypeData(),
    nav = useNavigate(),
    [params] = useSearchParams(),
    [page, setPage] = useState(0);
  const metrics = teacherDashboardMetrics(data),
    tasks = openSupportTasks(data),
    count = new Set(tasks.map((t) => t.studentId)).size;
  const pages = Math.max(1, Math.ceil(metrics.errors.length / 3)),
    safe = Math.min(page, pages - 1);
  if (
    ["average", "publishing", "support", "errors"].includes(
      params.get("metric"),
    )
  )
    return (
      <Navigate replace to={legacyStatisticsTarget(params.get("metric"))} />
    );
  return (
    <section className="dashboard-performance-section">
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>学生表现</h2>
            <button
              className="button button--default"
              onClick={() => nav("/teacher/statistics")}
            >
              查看教学统计
            </button>
          </div>
          <div className="dashboard-performance-metrics">
            <button onClick={() => nav(legacyStatisticsTarget("average"))}>
              <strong>
                {metrics.average.value == null
                  ? "—"
                  : Number(metrics.average.value).toFixed(1)}
              </strong>
              <span>平均得分（百分制）</span>
              <small>{metrics.average.count}人次有效正式结果 · 查看统计</small>
            </button>
            <button onClick={() => nav(legacyStatisticsTarget("publishing"))}>
              <strong>
                {metrics.publishing.denominator
                  ? `${Math.round(metrics.publishing.value)}%`
                  : "—"}
              </strong>
              <span>考试成绩发布率</span>
              <small>
                {metrics.publishing.numerator}/{metrics.publishing.denominator}
                份 · 待复核{metrics.publishing.pendingCount}份
              </small>
            </button>
            <button onClick={() => nav(legacyStatisticsTarget("support"))}>
              <strong>{count}</strong>
              <span>待辅导学生</span>
              <small>{tasks.length}项未结任务 · 按学生去重</small>
            </button>
          </div>
          <p className="hint">
            按当前教师全部记录统计；详细筛选与分析请进入教学统计。
          </p>
        </section>
        <section className="panel teacher-error-card">
          <div className="panel-title">
            <h2>高频错误</h2>
            <DashboardCardPager
              page={safe}
              totalPages={pages}
              onChange={setPage}
            />
          </div>
          <div className="rank-list dashboard-error-list">
            {metrics.errors.slice(safe * 3, (safe + 1) * 3).map((e, i) => (
              <button
                key={e.id}
                onClick={() => {
                  const q = new URLSearchParams({
                    tab: "steps",
                    detail: "errors",
                    sopId: e.sopId,
                    basisArrangementId: e.basisArrangementId,
                    basisSessionId: e.basisSessionId,
                    step: e.stepId,
                  });
                  nav(`/teacher/statistics?${q}`);
                }}
              >
                <b>{safe * 3 + i + 1}</b>
                <span>
                  <strong title={e.stepName}>{e.stepName}</strong>
                  <small title={`${e.sopName} · ${e.standardBasisLabel}`}>
                    {e.sopName} · {e.standardBasisLabel}
                  </small>
                </span>
                <em>{e.count} 条 · 查看</em>
              </button>
            ))}
            {!metrics.errors.length && (
              <p className="hint">暂无已确认的有效扣分记录。</p>
            )}
          </div>
          <p className="hint">
            按当时标准快照与步骤统计；待确认和仅缺证保分不算错误。
          </p>
        </section>
      </div>
    </section>
  );
}
