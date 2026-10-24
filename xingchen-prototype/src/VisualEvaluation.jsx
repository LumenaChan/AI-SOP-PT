import { StandardMediaSection } from "./StandardMedia.jsx";
import { StepFlowRecord } from "./SessionClosurePanels.jsx";
import {
  OBSERVATION_TARGETS,
  normalizeVisualRequirement,
  stepEvaluationMeaning,
  evaluationCoverage,
} from "./visualEvaluationRules.js";

export function RequirementsEditor({ step, steps, onChange }) {
  const values = step.visualRequirements || [];
  const patch = (id, change) =>
    onChange(values.map((r) => (r.id === id ? { ...r, ...change } : r)));
  return (
    <details className="enhancement-card" open={values.length > 0}>
      <summary>可见操作要求 · {values.length} 项</summary>
      <p className="hint">
        明确动作、结果状态与允许变化。未记录要求的历史标准继续保留。
      </p>
      {values.map((raw, i) => {
        const r = normalizeVisualRequirement(raw);
        return (
          <article className="enhancement-card" key={r.id}>
            <div className="form-row">
              <label className="field">
                要求名称
                <input
                  value={r.name}
                  onChange={(e) => patch(r.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                判断目标
                <select
                  value={r.target}
                  onChange={(e) =>
                    patch(r.id, {
                      target: e.target.value,
                      continuous: "current_step",
                    })
                  }
                >
                  <option value="">请选择</option>
                  {Object.entries(OBSERVATION_TARGETS).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {[
              ["definition", "合格说明"],
              ["object", "指定工具、工件或部位"],
              ["variations", "允许的不同做法"],
              ["mistakes", "不合格示例"],
              ["unknownWhen", "不可判定条件"],
              ["evidence", "必需的可见证据"],
            ].map(([k, label]) => (
              <label className="field" key={k}>
                {label}
                <textarea
                  value={r[k]}
                  onChange={(e) => patch(r.id, { [k]: e.target.value })}
                />
              </label>
            ))}
            {r.target === "state" && (
              <div className="form-row">
                <label className="field">
                  持续检查
                  <select
                    value={r.continuous}
                    onChange={(e) =>
                      patch(r.id, { continuous: e.target.value })
                    }
                  >
                    <option value="current_step">当前步骤</option>
                    <option value="specified">持续到指定步骤</option>
                  </select>
                </label>
                {r.continuous === "specified" && (
                  <label className="field">
                    结束步骤
                    <select
                      value={r.endStepId}
                      onChange={(e) =>
                        patch(r.id, { endStepId: e.target.value })
                      }
                    >
                      <option value="">请选择</option>
                      {steps
                        .slice(steps.findIndex((s) => s.id === step.id))
                        .map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            <label className="check-row">
              <input
                type="checkbox"
                checked={r.assessDonning}
                onChange={(e) =>
                  patch(r.id, { assessDonning: e.target.checked })
                }
              />
              本要求包含穿戴过程考核（不勾选时不强制现场重新穿戴）
            </label>
            <button
              type="button"
              className="table-action table-action--danger"
              onClick={() => {
                if (window.confirm(`删除第${i + 1}条可见要求？`))
                  onChange(values.filter((x) => x.id !== r.id));
              }}
            >
              删除要求
            </button>
          </article>
        );
      })}
      <button
        type="button"
        className="btn"
        onClick={() =>
          onChange([
            ...values,
            normalizeVisualRequirement({ id: `vr-${crypto.randomUUID()}` }),
          ])
        }
      >
        添加可见要求
      </button>
    </details>
  );
}
export function RequirementsView({ step }) {
  const values = step?.visualRequirements || [];
  return (
    <div className="enhancement-requirements">
      {values.length ? (
        values.map((r) => (
          <div key={r.id}>
            <strong>
              {r.name} · {OBSERVATION_TARGETS[r.target] || "目标待完善"}
            </strong>
            <p>{r.definition}</p>
            <small>
              允许变化：{r.variations || "未记录"}；必需证据：
              {r.evidence || "未记录"}；不可判定：{r.unknownWhen || "未记录"}
            </small>
          </div>
        ))
      ) : (
        <small>可见要求尚未单独整理，沿用教师原完成条件。</small>
      )}
    </div>
  );
}
export function EvaluationBadge({ step }) {
  const m = stepEvaluationMeaning(step);
  return (
    <span
      className={`evaluation-meaning evaluation-meaning--${m.key}`}
      title={m.detail}
    >
      {m.label}
    </span>
  );
}
export function stepJudgementProcessId(step) {
  return `step-judgement-process-${encodeURIComponent(step?.id || "step")}`;
}

export function StepEvaluationExplanation({ step, children, teachingStep }) {
  const meaning = stepEvaluationMeaning(step);
  const requirementCount = step?.visualRequirements?.length || 0;
  return (
    <section
      className="panel step-evaluation-explanation"
      aria-label="判定依据与可见要求"
    >
      <header>
        <h2>判定依据与可见要求</h2>
        <span>
          {step?.id} · {step?.name}
        </span>
      </header>
      <StepFlowRecord step={step} />
      <div className="step-evaluation-explanation__summary">
        <EvaluationBadge step={step} />
        <p>{meaning.detail}</p>
      </div>
      {requirementCount ? (
        <details key={step.id} className="step-evaluation-requirements">
          <summary>查看可见操作要求 · {requirementCount} 项</summary>
          <RequirementsView step={step} />
        </details>
      ) : (
        <p className="step-evaluation-explanation__legacy">
          可见要求尚未单独整理，沿用本次会话锁定的教师标准。
        </p>
      )}
      <StandardMediaSection
        key={`teaching-${step?.id}`}
        step={teachingStep}
        hideEmpty
        title="标准示教资料（教学参考）"
      />
      {children && (
        <details
          key={`evidence-${step?.id}`}
          className="step-evaluation-evidence"
        >
          <summary>查看步骤证据视角</summary>
          {children}
        </details>
      )}
      <details
        key={`process-${step?.id}`}
        id={stepJudgementProcessId(step)}
        className="step-evaluation-process"
      >
        <summary>查看判定过程</summary>
        <ol className="step-judgement-process">
          <li>
            <div>
              <strong>观察记录</strong>
              <p>{step?.observation || "尚无观察记录"}</p>
            </div>
          </li>
          <li>
            <div>
              <strong>教师标准</strong>
              <p>
                {step?.completionCondition ||
                  (step?.visualRequirements || [])
                    .map((r) => r.definition)
                    .filter(Boolean)
                    .join("；") ||
                  "沿用本次会话锁定的教师标准"}
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>步骤判定 · {step?.result || "尚未形成结果"}</strong>
              <p>{meaning.detail}</p>
            </div>
          </li>
        </ol>
      </details>
    </section>
  );
}

export function CoverageSummary({ steps }) {
  const c = evaluationCoverage(steps);
  return (
    <div className="enhancement-summary">
      共 {c.total} 步 · 证据支持 {c.confirmed} · 未确认保分 {c.unknown} ·
      教师确认 {c.teacher} · 历史依据未记录 {c.legacy}
      <small>成绩与检测依据分别记录；演示结果不代表真实算法效果。</small>
    </div>
  );
}
