import { AI_LIBRARY_PATH } from "./aiEntry.js";
import React, { useEffect, useState } from "react";
import { displayBusinessText } from "./businessTextRules.js";
import {
  validationEvidenceUrl,
  currentModelReport,
  fieldModelIssues,
  referencedValidationCapabilities,
} from "./fieldValidationEvidenceRules.js";
import {
  VALIDATION_SCENARIOS,
  activeJudgementItems,
  EXTENDED_VALIDATION_SCENARIOS,
  completeValidationCases,
  validationPlan,
  validationCaseInputIssues,
} from "./sopWorkstationAiRules.js";

export function ValidationCasePreviewList(props) {
  return <ValidationCaseTabs {...props} editable={false} />;
}

export function ValidationCaseTabs({
  relation,
  aiConfig,
  editable = true,
  ...props
}) {
  const cases = completeValidationCases(
    aiConfig,
    relation.validationCases || [],
  );
  const plan = validationPlan(aiConfig, relation);
  const [advanced, setAdvanced] = useState(false);
  const [selected, setSelected] = useState(cases[0]?.id);
  const visible = cases.filter(
    (c) =>
      advanced ||
      c.result !== "pending" ||
      c.executionState === "running" ||
      !plan.find((s) => s.key === c.scenarioType)?.advanced ||
      plan.find((s) => s.key === c.scenarioType)?.required,
  );
  const activeId = visible.some((c) => c.id === selected)
    ? selected
    : visible[0]?.id;
  const required = plan.filter((s) => s.required);
  const complete = required.filter((s) =>
    cases.some(
      (c) =>
        c.scenarioType === s.key &&
        !validationCaseInputIssues(c, activeJudgementItems(aiConfig)).length &&
        (c.result === "passed" ||
          (!s.advanced && c.result === "not_applicable")),
    ),
  ).length;
  const status = (c) =>
    c.executionState === "running"
      ? "执行中"
      : c.executionState === "awaiting_review"
        ? "待保存"
        : { passed: "通过", failed: "未通过", not_applicable: "不适用" }[
            c.result
          ] || "待执行";
  return (
    <section className="validation-case-preview">
      <div className="validation-tabs-toolbar">
        <div className="validation-progress-summary">
          <strong>验证用例</strong>
          <span>共16类场景</span>
          <span>必验完成 {complete}/{required.length}</span>
          <span>未通过 {cases.filter((c) => c.result === "failed").length}</span>
        </div>
        <div className="validation-toolbar-actions">
          <label>
            <input
              type="checkbox"
              checked={advanced}
              onChange={(e) => setAdvanced(e.target.checked)}
            />
            显示高级验证
          </label>
          <button
            type="button"
            className="table-action"
            onClick={() => props.setModal({
              title: "验证说明",
              dismissOnly: true,
              hideCancel: true,
              confirmText: "知道了",
              content: (
                <div className="validation-guidance">
                  <p><strong>如何操作</strong>确认现场环境并开始本轮验证，再逐项开始执行、结束执行、复核并保存结果。切换用例会保留填写内容。</p>
                  <p><strong>选择用例</strong>基础8类默认显示，高级8类按需展开；当前配置要求的高级用例标为“必验”，始终显示。未执行的可选用例不影响验收，已失败的用例需处理。</p>
                  <p><strong>验收要求</strong>每个判断项都需覆盖适用场景，并有错误或无效动作测试通过。标准流程、不确定、摄像头异常及标为必验的高级场景不可跳过；其余不适用场景需说明理由。完成后在下方检查验收覆盖并生成结论。</p>
                </div>
              ),
            })}
          >验证说明</button>
        </div>
      </div>
      <div
        className="validation-case-tabs"
        role="tablist"
        aria-label="现场验证场景"
      >
        {visible.map((c, index) => {
          const scenario = plan.find((s) => s.key === c.scenarioType);
          return (
            <button
              type="button"
              role="tab"
              id={`case-tab-${c.id}`}
              aria-controls={`case-panel-${c.id}`}
              aria-selected={activeId === c.id}
              tabIndex={activeId === c.id ? 0 : -1}
              key={c.id}
              onClick={() => setSelected(c.id)}
              onKeyDown={(e) => {
                const delta =
                  e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!delta && !["Home", "End"].includes(e.key)) return;
                e.preventDefault();
                const target =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? visible.length - 1
                      : (index + delta + visible.length) % visible.length;
                setSelected(visible[target].id);
                e.currentTarget.parentElement.children[target].focus();
              }}
            >
              <span>{c.name}</span>
              <small>
                {scenario?.advanced
                  ? scenario.required
                    ? "高级 · 必验"
                    : "高级 · 可选"
                  : "基础"}{" "}
                · {status(c)}
              </small>
            </button>
          );
        })}
      </div>
      {cases.map((c) => (
        <div
          key={c.id}
          id={`case-panel-${c.id}`}
          role="tabpanel"
          aria-labelledby={`case-tab-${c.id}`}
          hidden={activeId !== c.id}
        >
          <FieldValidationCaseCard
            {...props}
            relation={relation}
            relationId={relation.id}
            aiConfig={aiConfig}
            validationCase={c}
            editable={editable}
          />
        </div>
      ))}
      <div className="row-actions">
        <button
          type="button"
          className="button button--default"
          disabled={
            visible.findIndex((c) => c.id === activeId) === visible.length - 1
          }
          onClick={() =>
            setSelected(
              visible[visible.findIndex((c) => c.id === activeId) + 1]?.id,
            )
          }
        >
          下一项
        </button>
      </div>
    </section>
  );
}

export function ValidationEvidenceLink({ value, children = "查看证据" }) {
  const url = validationEvidenceUrl(value);
  return url ? (
    <a className="table-action" href={url} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : null;
}
export function openValidationExecution(setModal, record) {
  if (!record) return;
  setModal({
    title: "现场测试执行记录",
    dismissOnly: true,
    hideCancel: true,
    confirmText: "关闭",
    content: (
      <div className="field-validation-detail">
        <dl>
          {[
            [
              "核验状态",
              record.resultSource === "real" &&
              record.integrationStatus === "connected_verified"
                ? "服务已核验"
                : "待核验",
            ],
            ["执行人", record.executor],
            ["执行时间", displayBusinessText(record.completedAt)],
            ["系统输出", record.actualResult],
            [
              "预期比对",
              record.expectationMatched === true
                ? "符合期望"
                : "未确认符合期望",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "未记录"}</dd>
            </div>
          ))}
        </dl>
        <ValidationEvidenceLink value={record.evidenceUrl} />
      </div>
    ),
  });
}
export function ValidationModelReports({ relation, store, setModal }) {
  const data = store.data,
    config = (data.aiCapabilityConfigs || []).find(
      (c) => c.id === relation.sopAiConfigId,
    );
  const capabilities = referencedValidationCapabilities(
    { ...config, judgementItems: activeJudgementItems(config || {}) },
    data.aiCapabilities,
  );
  const issues = fieldModelIssues(capabilities, data);
  return (
    <section className="validation-model-reports">
      <strong>当前模型独立评测</strong>
      {capabilities.map((capability) => {
        const report = currentModelReport(capability, data);
        return (
          <div key={capability.id}>
            <span>{capability.name || capability.id}</span>
            <span>{report?.passed ? "报告已登记" : "待完成评测"}</span>
            <a
              className="table-action"
              href={`${AI_LIBRARY_PATH}/publishing?capabilityId=${encodeURIComponent(capability.id)}`}
              target="_blank"
              rel="noreferrer"
            >
              管理模型评测
            </a>
            {report && (
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  setModal({
                    title: `${capability.name || "当前模型"} · 评测报告`,
                    dismissOnly: true,
                    hideCancel: true,
                    confirmText: "关闭",
                    content: (
                      <div className="field-validation-detail">
                        <dl>
                          {[
                            ["评测报告", report.id],
                            ["数据集", report.datasetRef],
                            ["模型产物", report.modelArtifactId],
                            [
                              "评测时间",
                              displayBusinessText(
                                report.completedAt ||
                                  report.evaluatedAt ||
                                  "未记录",
                              ),
                            ],
                            ["评测结论", report.passed ? "通过" : "未通过"],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <dt>{k}</dt>
                              <dd>{v || "未记录"}</dd>
                            </div>
                          ))}
                        </dl>
                        <dl>
                          {Object.entries(report.eventMetrics || {})
                            .filter(
                              ([, value]) =>
                                typeof value === "number" ||
                                typeof value === "string",
                            )
                            .map(([key, value], index) => (
                              <div key={key}>
                                <dt>
                                  {{
                                    precision: "精确率",
                                    recall: "召回率",
                                    f1: "综合指标",
                                    accuracy: "准确率",
                                    latencyMs: "处理延迟（毫秒）",
                                  }[key] || `评测指标 ${index + 1}`}
                                </dt>
                                <dd>{String(value)}</dd>
                              </div>
                            ))}
                        </dl>
                        <ValidationEvidenceLink
                          value={report.reportUrl || report.evidenceUrl}
                        >
                          查看完整报告
                        </ValidationEvidenceLink>
                      </div>
                    ),
                  })
                }
              >
                查看报告
              </button>
            )}
          </div>
        );
      })}
      {!!issues.length && (
        <p className="hint">
          {issues.join("；")}。请先在模型发布中补齐评测，再完成现场验收。
        </p>
      )}
    </section>
  );
}
export function FieldValidationCaseCard({
  validationCase,
  judgementItems,
  relationId,
  relation,
  aiConfig,
  data,
  store,
  setModal,
  editable = true,
}) {
  const [draft, setDraft] = useState(validationCase),
    [message, setMessage] = useState("");
  useEffect(() => {
    setDraft(validationCase);
    setMessage("");
  }, [validationCase]);
  const formal = relation.validationPurpose === "real",
    excluded = draft.excludedJudgementItems || {};
  const executionRecords = (data.aiFieldValidationExecutions || []).filter(
    (r) =>
      r.relationId === relationId &&
      r.validationRunId === relation.validationRunId &&
      r.caseId === validationCase.id &&
      r.scenarioType === validationCase.scenarioType &&
      (!validationCase.executionAttemptId ||
        r.executionAttemptId === validationCase.executionAttemptId),
  );
  const execution = executionRecords.find(
    (r) => r.id === draft.executionRecordId,
  );
  const notApplicable = draft.result === "not_applicable";
  const scenario = validationPlan(aiConfig || {}, relation).find(
    (s) => s.key === draft.scenarioType,
  );
  const core =
    ["standard", "uncertain", "camera_error"].includes(draft.scenarioType) ||
    (scenario?.advanced && scenario.required);
  const allScenarios = [
    ...VALIDATION_SCENARIOS,
    ...EXTENDED_VALIDATION_SCENARIOS,
  ];
  const set = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const running = validationCase.executionState === "running";
  const canRerun = !running && Boolean(
    validationCase.executionAttemptId || validationCase.executedAt ||
    ["passed", "failed", "not_applicable"].includes(validationCase.result),
  );
  const startExecution = () => {
    store.startValidationCase(relationId, validationCase.id, {
      judgementItemIds: draft.judgementItemIds,
    });
    setMessage(
      formal
        ? "测试请求已登记，请按操作说明执行并关联本次执行记录"
        : "已开始，请按操作说明执行测试",
    );
  };
  const confirmRerun = () => setModal({
    title: "重新执行本用例",
    content: (
      <p className="field-validation-message">
        确认重新测试“{validationCase.name}”？上次已保存的结果会保留，本次结果和证据将清空，未保存的填写内容将丢弃。重新测试后需再次保存结果，其他用例不受影响。
      </p>
    ),
    confirmText: "确认重新执行",
    onConfirm: startExecution,
  });
  const save = () => {
    try {
      store.saveSopWorkstationValidationCase(
        relationId,
        validationCase.id,
        draft,
      );
      setMessage("用例结果已保存");
    } catch (e) {
      setMessage(e.message);
    }
  };
  return (
    <article
      className="ai-validation-case"
      id={`validation-case-${validationCase.id}`}
    >
      <header>
        <div>
          <small>
            {allScenarios.find((s) => s.key === draft.scenarioType)?.label ||
              "补充场景"}
          </small>
          <strong>{validationCase.name}</strong>
        </div>
        <div className="validation-case-header-actions">
          <span className="field-validation-result">
            {running ? "执行中" : validationCase.executionState === "awaiting_review" ? "待核对并保存" : {
              passed: "通过",
              failed: "不通过",
              not_applicable: "不适用",
              pending: "待执行",
            }[validationCase.result] || "待执行"}
          </span>
          {editable && canRerun && (
            <button type="button" className="button button--default" onClick={confirmRerun}>
              重新执行本用例
            </button>
          )}
        </div>
      </header>
      <div className="ai-validation-case__instructions">
        <span>
          <small>操作说明</small>
          {validationCase.instruction}
        </span>
        <span>
          <small>期望结果</small>
          {validationCase.expectedResult}
        </span>
      </div>
      <fieldset className="validation-case-fields" disabled={!editable}>
        <fieldset className="ai-validation-case__coverage">
          <legend>涉及AI判断项</legend>
          {judgementItems.map((item) => (
            <div key={item.id} className="validation-item-applicability">
              <label>
                <input
                  type="checkbox"
                  checked={(draft.judgementItemIds || []).includes(item.id)}
                  onChange={(e) =>
                    set(
                      "judgementItemIds",
                      e.target.checked
                        ? [...(draft.judgementItemIds || []), item.id]
                        : draft.judgementItemIds.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.name}
              </label>
              {!(draft.judgementItemIds || []).includes(item.id) && (
                <input
                  aria-label={`${item.name}的不适用原因`}
                  value={excluded[item.id] || ""}
                  onChange={(e) =>
                    set("excludedJudgementItems", {
                      ...excluded,
                      [item.id]: e.target.value,
                    })
                  }
                  placeholder={
                    core
                      ? "本场景必须测试该判断项"
                      : "如不适用，请说明具体理由（至少8字）"
                  }
                  disabled={core}
                />
              )}
            </div>
          ))}
        </fieldset>
      {editable && (running || !canRerun) && (
        <div className="row-actions">
          {running ? (
            <>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  try {
                    store.endValidationCase(
                      relationId,
                      validationCase.id,
                      draft.executionRecordId,
                    );
                    setMessage("执行已结束，请核对并保存验收结果");
                  } catch (e) {
                    setMessage(e.message);
                  }
                }}
              >
                结束执行
              </button>
              <button
                type="button"
                className="button button--default"
                onClick={() => {
                  try {
                    store.cancelValidationCase(relationId, validationCase.id);
                    setMessage("本次执行已取消");
                  } catch (e) {
                    setMessage(e.message);
                  }
                }}
              >
                取消执行
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                try {
                  startExecution();
                } catch (e) {
                  setMessage(e.message);
                }
              }}
            >
              开始执行
            </button>
          )}
        </div>
      )}
        <label className="field">
          用例结论
          <select
            value={draft.result}
            onChange={(e) => set("result", e.target.value)}
          >
            <option value="pending">待执行</option>
            <option value="passed">通过</option>
            <option value="failed">不通过</option>
            {!core && <option value="not_applicable">不适用</option>}
          </select>
        </label>
        {notApplicable ? (
          <label className="field">
            不适用原因
            <textarea
              value={draft.notApplicableReason || ""}
              onChange={(e) => set("notApplicableReason", e.target.value)}
              placeholder="说明该场景与本工位、判断项无关的具体依据（至少8字）"
            />
          </label>
        ) : (
          <>
            {formal && (
              <label className="field">
                关联执行记录
                <select
                  value={draft.executionRecordId || ""}
                  onChange={(e) => {
                    const r = executionRecords.find(
                      (r) => r.id === e.target.value,
                    );
                    setDraft((current) => ({
                      ...current,
                      executionRecordId: r?.id || "",
                      judgementItemIds: r
                        ? (r.judgementItemIds || []).filter((id) =>
                            judgementItems.some((i) => i.id === id),
                          )
                        : current.judgementItemIds,
                    }));
                  }}
                >
                  <option value="">请选择本用例的执行记录</option>
                  {executionRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {displayBusinessText(r.completedAt)} · {r.executor} ·{" "}
                      {r.expectationMatched ? "符合期望" : "待核对"}
                    </option>
                  ))}
                </select>
                {!executionRecords.length && (
                  <small>尚无本用例的执行记录，完成现场测试后在此关联。</small>
                )}
              </label>
            )}
            <label className="field">
              系统实际结果
              <textarea
                value={
                  formal
                    ? execution?.actualResult ||
                      (!editable ? draft.actualResult || "" : "")
                    : draft.actualResult || ""
                }
                readOnly={formal}
                onChange={(e) => set("actualResult", e.target.value)}
                placeholder={
                  formal
                    ? "关联执行记录后自动带出系统输出"
                    : "记录具体识别结果与影响范围，不能只填数字或通过"
                }
              />
            </label>
            <label className="field">
              预期与实际对照
              <textarea
                value={draft.reviewNote || ""}
                onChange={(e) => set("reviewNote", e.target.value)}
                placeholder="说明实际输出为何符合或不符合期望（至少8字）"
              />
            </label>
            <div className="form-row">
              <label className="field">
                证据地址
                <input
                  value={
                    formal
                      ? execution?.evidenceUrl ||
                        (!editable
                          ? draft.evidenceUrl || draft.evidenceRef || ""
                          : "")
                      : draft.evidenceUrl || ""
                  }
                  readOnly={formal}
                  onChange={(e) => set("evidenceUrl", e.target.value)}
                  placeholder="录像或证据材料地址"
                />
              </label>
              <label className="field">
                执行人
                <input
                  value={
                    formal
                      ? execution?.executor ||
                        (!editable ? draft.executor || "" : "")
                      : draft.executor ||
                        relation.validationEnvironment?.tester ||
                        ""
                  }
                  readOnly={formal}
                  onChange={(e) => set("executor", e.target.value)}
                />
              </label>
            </div>
          </>
        )}
        <label className="field">
          备注
          <input
            value={draft.note || ""}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>
      </fieldset>
      <div className="row-actions">
        <ValidationEvidenceLink
          value={
            formal
              ? execution?.evidenceUrl ||
                (!editable ? draft.evidenceUrl || draft.evidenceRef : "")
              : draft.evidenceUrl || draft.evidenceRef
          }
        />
        {execution && (
          <button
            type="button"
            className="table-action"
            onClick={() => openValidationExecution(setModal, execution)}
          >
            查看执行记录
          </button>
        )}
      </div>
      {editable && (
        <button
          type="button"
          className="button button--primary"
          disabled={
            draft.result === "pending" ||
            (draft.result !== "not_applicable" &&
              !["awaiting_review", "saved"].includes(
                validationCase.executionState,
              )) ||
            validationCase.executionState === "running"
          }
          onClick={save}
        >
          保存用例结果
        </button>
      )}
      {message && (
        <p className="field-validation-message" role="status">
          {message}
        </p>
      )}
    </article>
  );
}

export const ValidationEnvironmentEditor = React.forwardRef(
  function ValidationEnvironmentEditor({ environment }, ref) {
    const [value, setValue] = useState({ ...environment });
    React.useImperativeHandle(ref, () => ({ getValue: () => value }));
    return (
      <div className="validation-environment-editor">
        {[
          ["tester", "验证人"],
          ["tools", "使用工具"],
          ["lighting", "光照情况"],
          ["occlusion", "遮挡情况"],
          ["note", "现场说明"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              value={value[key] || ""}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    );
  },
);
export function ValidationRunDetails({ record }) {
  return (
    <div className="field-validation-detail">
      <p>
        验证人：{record.validatedBy} · {displayBusinessText(record.completedAt)}
      </p>
      <p>
        光照：{record.environment?.lighting || "未记录"} · 遮挡：
        {record.environment?.occlusion || "未记录"} · 工具：
        {record.environment?.tools || "未记录"}
      </p>
      {(record.modelReports || []).map(
        ({ capabilityId, report }) =>
          report && (
            <section key={capabilityId}>
              <strong>本轮模型独立评测</strong>
              <p>
                报告：{report.id} · 模型：{report.modelArtifactId} · 数据集：
                {report.datasetRef}
              </p>
              <ValidationEvidenceLink
                value={report.reportUrl || report.evidenceUrl}
              >
                查看评测报告
              </ValidationEvidenceLink>
            </section>
          ),
      )}
      {!!record.issues?.length && (
        <ul>
          {record.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
      {(record.cases || []).map((c) => (
        <section key={c.id}>
          <strong>
            {c.name} ·{" "}
            {{
              passed: "通过",
              failed: "不通过",
              not_applicable: "不适用",
              pending: "未执行",
            }[c.result] || "未记录"}
          </strong>
          <p>
            {c.result === "not_applicable"
              ? c.notApplicableReason
              : c.resultSource === "prototype_demo"
                ? "历史配置检查结果"
                : c.actualResult}
          </p>
          <p>{c.reviewNote}</p>
          <p>
            执行人：{c.executor || "未记录"} ·{" "}
            {displayBusinessText(c.executedAt || "未记录")}
          </p>
          <ValidationEvidenceLink value={c.evidenceUrl || c.evidenceRef} />
        </section>
      ))}
    </div>
  );
}
