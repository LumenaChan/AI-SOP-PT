import { ValidationModelReports } from "./FieldValidationPanels.jsx";
import { displayBusinessText } from "./businessTextRules.js";
import React, { useState, useEffect } from "react";
import { usePrototypeData } from "./prototypeData.jsx";
import {
  SAMPLE_TYPES,
  SAMPLE_USES,
  validateSuggestion,
} from "./preannotationRules.js";
import {
  workstationCameras,
  cameraViews,
  editCameraView,
  CAMERA_ROLES,
  VIEW_STRATEGIES,
  bindingCameras,
} from "./cameraRules.js";
const TASKS = {
  pending: "待运行",
  processing: "运行中",
  completed: "已完成",
  partial_failed: "部分失败",
  failed: "失败",
  canceled: "已取消",
};
function useAction() {
  const [message, setMessage] = useState("");
  return [
    message,
    (fn) => {
      try {
        fn();
        setMessage("操作完成");
      } catch (e) {
        setMessage(e.message);
      }
    },
  ];
}
export function SampleMetadataPanel({ capabilityId, current, kind }) {
  const store = usePrototypeData(),
    sources = (store.data.aiSourceVideos || []).filter(
      (v) => v.capabilityId === capabilityId,
    );
  const [sourceId, setSourceId] = useState(""),
    [draft, setDraft] = useState({}),
    [message, run] = useAction();
  const source =
    sources.find((v) => v.id === (current?.sourceVideoId || sourceId)) ||
    sources[0];
  useEffect(
    () => setDraft(source || {}),
    [
      source?.id,
      source?.sourceGroupId,
      source?.participantId,
      source?.sampleUse,
    ],
  );
  if (!source) return null;
  return (
    <section className="enhancement-card">
      <details>
        <summary>样本属性与数据隔离</summary>
        <p>
          同次采集的不同镜头使用相同采集组；真实未完成与不可判定分别记录。封存测试不参与预标注或调优。
        </p>
        {!current && (
          <label className="field">
            原始视频
            <select
              value={source.id}
              onChange={(e) => setSourceId(e.target.value)}
            >
              {sources.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.fileName || v.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="two-col-form">
          {[
            ["sourceGroupId", "采集组"],
            ["participantId", "操作人标识"],
            ["captureBatch", "采集批次"],
            ["captureConditions", "拍摄条件与限制"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input
                value={draft[key] || ""}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field">
            数据用途
            <select
              value={draft.sampleUse || "development"}
              onChange={(e) =>
                setDraft({ ...draft, sampleUse: e.target.value })
              }
            >
              {Object.entries(SAMPLE_USES).map(([k, v]) => (
                <option key={k} value={k}>
                  {displayBusinessText(v)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() =>
            run(() => store.updateSampleMetadata("video", source.id, draft))
          }
        >
          保存视频属性
        </button>
        {current && (
          <div className="form-row">
            <label className="field">
              当前样本类型
              <select
                value={current.sampleType || ""}
                onChange={(e) =>
                  run(() =>
                    store.updateSampleMetadata(kind, current.id, {
                      sampleType: e.target.value,
                    }),
                  )
                }
              >
                <option value="">未记录</option>
                {Object.entries(SAMPLE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {displayBusinessText(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              可见性
              <select
                value={current.visibility || "unknown"}
                onChange={(e) =>
                  run(() =>
                    store.updateSampleMetadata(kind, current.id, {
                      visibility: e.target.value,
                    }),
                  )
                }
              >
                <option value="unknown">未核实</option>
                <option value="visible">关键部位可见</option>
                <option value="occluded">遮挡</option>
                <option value="out_of_view">画外</option>
              </select>
            </label>
          </div>
        )}
        <small role="status">{displayBusinessText(message)}</small>
      </details>
    </section>
  );
}
export function PreannotationTasks({ capabilityId }) {
  const store = usePrototypeData(),
    [message, run] = useAction(),
    tasks = (store.data.aiPreannotationTasks || []).filter(
      (t) => t.capabilityId === capabilityId,
    );
  if (!capabilityId) return null;
  return (
    <section className="enhancement-card">
      <strong>AI辅助预标注 · 原型演示</strong>
      <p>
        当前生成的是占位建议，尚未接入模型服务。采用建议后请检查、修正并保存；建议不会自动变成正式标注。
      </p>
      <button
        className="btn"
        onClick={() => run(() => store.startPreannotation(capabilityId))}
      >
        创建预标注演示任务
      </button>
      <span role="status">{displayBusinessText(message)}</span>
      <div className="enhancement-list">
        {tasks.map((t) => (
          <article key={t.id}>
            <span>
              {displayBusinessText(t.createdAt)} · {TASKS[t.status]} ·{" "}
              {t.items.length}个样本 · 演示结果
            </span>
            {["pending", "partial_failed", "failed"].includes(t.status) && (
              <>
                <button onClick={() => run(() => store.runPreannotation(t.id))}>
                  运行 / 重试失败项
                </button>
                <button
                  onClick={() => run(() => store.runPreannotation(t.id, true))}
                >
                  演示部分失败
                </button>
              </>
            )}
            {["pending", "processing"].includes(t.status) && (
              <button
                onClick={() => run(() => store.cancelPreannotation(t.id))}
              >
                取消
              </button>
            )}
            <small>
              {t.suggestions?.filter((s) => s.status === "adopted").length || 0}{" "}
              个已人工保存
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
export function SuggestionPanel({ current, categories, source, onAdopt }) {
  const store = usePrototypeData(),
    [message, run] = useAction();
  const rows = (store.data.aiPreannotationTasks || []).flatMap((t) =>
    (t.suggestions || [])
      .filter(
        (s) =>
          s.itemId === current.id &&
          ["pending_confirmation", "failed"].includes(s.status),
      )
      .map((s) => ({ task: t, suggestion: s })),
  );
  return (
    <div className="enhancement-card">
      <SampleMetadataPanel
        capabilityId={current.capabilityId}
        current={current}
        kind={current.startMs != null ? "clips" : "frames"}
      />
      {rows.map(({ task, suggestion: s }) => (
        <div key={task.id}>
          <strong>待确认建议 · 演示生成</strong>
          <p>{s.reason || "采用到当前编辑草稿后，检查并保存才生效。"}</p>
          {s.status === "pending_confirmation" && (
            <>
              <button
                onClick={() =>
                  run(() => {
                    validateSuggestion(s, current, source, categories);
                    onAdopt(s, { taskId: task.id, itemId: current.id });
                  })
                }
              >
                采用到草稿
              </button>
              <button
                onClick={() =>
                  run(() => store.dismissSuggestion(task.id, current.id))
                }
              >
                不采用
              </button>
            </>
          )}
        </div>
      ))}
      <small role="alert">{displayBusinessText(message)}</small>
    </div>
  );
}
export function CameraCollectionEditor({
  value,
  onChange,
  devices,
  workstation,
}) {
  const cameras = cameraViews(value),
    available = devices.filter(
      (d) =>
        d.workstationId === workstation.id &&
        ["摄像头", "全景摄像头", "细节摄像头"].includes(d.type) &&
        d.status !== "停用",
    );
  const update = (index, patch) =>
    onChange(editCameraView(value, cameras[index].deviceId, patch));
  return (
    <section className="equipment-camera-editor">
      <h3>采集视角</h3>
      <p>
        主采集与辅助采集参与录像和开放检查；备用设备只待命。默认显示只影响画面展示，不改变采集或AI评价。
      </p>
      {cameras.map((c, i) => {
        const device = devices.find((d) => d.id === c.deviceId);
        return (
          <article className="equipment-camera-card" key={c.deviceId}>
            <header>
              <strong>{device?.name || "设备已移除"}</strong>
              <span>
                {device?.status || "不存在"} · 视频流
                {device?.streamStatus || "未知"}
              </span>
              <button
                type="button"
                className="table-action"
                onClick={() =>
                  onChange(
                    editCameraView(
                      { ...value, cameras: cameras.filter((_, j) => j !== i) },
                      "",
                      {},
                    ),
                  )
                }
              >
                移除视角
              </button>
            </header>
            <div className="equipment-camera-fields">
              <label className="field">
                视角名称
                <input
                  value={c.name || c.label || ""}
                  maxLength={80}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </label>
              <label className="field">
                采集用途
                <select
                  value={c.role}
                  onChange={(e) => update(i, { role: e.target.value })}
                >
                  {c.role === "legacy_secondary" && (
                    <option value="legacy_secondary" disabled>
                      历史视角，请确认用途
                    </option>
                  )}
                  <option value="primary">主采集</option>
                  <option value="auxiliary">辅助采集</option>
                  <option value="backup">备用待命</option>
                </select>
              </label>
              <label className="equipment-check">
                <input
                  type="checkbox"
                  checked={c.enabled !== false}
                  disabled={c.role === "backup"}
                  onChange={(e) => update(i, { enabled: e.target.checked })}
                />
                参与采集
              </label>
              <label className="equipment-check">
                <input
                  type="radio"
                  name={`default-preview-${workstation.id}`}
                  checked={Boolean(c.defaultPreview)}
                  disabled={!c.enabled || c.role === "backup"}
                  onChange={() => update(i, { defaultPreview: true })}
                />
                默认显示
              </label>
              <label className="field equipment-camera-coverage">
                物理覆盖说明
                <input
                  value={(c.areaIds || []).join("，")}
                  placeholder="如：工作台、入口"
                  onChange={(e) =>
                    update(i, {
                      areaIds: e.target.value
                        .split(/[,，]/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            </div>
            {c.role === "legacy_secondary" && (
              <p className="form-hint">
                保存前请确认这台设备用于辅助采集还是备用待命，不会自动改写历史用途。
              </p>
            )}
          </article>
        );
      })}
      {!cameras.length && (
        <p className="hint">尚未配置采集视角，请从已绑定设备中添加。</p>
      )}
      <label className="field">
        添加已绑定摄像头
        <select
          aria-label="添加工位相机"
          value=""
          onChange={(e) => {
            const d = available.find((d) => d.id === e.target.value);
            if (d)
              onChange(
                editCameraView(
                  {
                    ...value,
                    cameras: [
                      ...cameras,
                      {
                        deviceId: d.id,
                        name: d.name,
                        role: cameras.some(
                          (c) => c.enabled && c.role === "primary",
                        )
                          ? "auxiliary"
                          : "primary",
                        enabled: true,
                        defaultPreview: false,
                        areaIds: [],
                      },
                    ],
                  },
                  d.id,
                  {},
                ),
              );
          }}
        >
          <option value="">选择摄像头…</option>
          {available
            .filter((d) => !cameras.some((c) => c.deviceId === d.id))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.status}
              </option>
            ))}
        </select>
      </label>
      <label className="field">
        工位用途说明
        <textarea
          value={value.regionDescription || ""}
          onChange={(e) =>
            onChange({ ...value, regionDescription: e.target.value })
          }
          placeholder="描述工位与拍摄位置的用途"
        />
      </label>
      <p className="form-hint">
        物理覆盖说明不代表已完成AI区域配置。具体实训标准的区域框选仍在“工位启用与验证”中设置。
      </p>
    </section>
  );
}

export function ViewBindingEditor({ relation, item, cameras, store }) {
  const binding =
      relation.judgementCameraBindings.find(
        (b) => b.judgementItemId === item.id,
      ) || {},
    [draft, setDraft] = useState({
      strategy: binding.strategy || "single",
      cameraIds: bindingCameras(binding),
    }),
    [message, run] = useAction();
  useEffect(
    () =>
      setDraft({
        strategy: binding.strategy || "single",
        cameraIds: bindingCameras(binding),
      }),
    [relation.id, JSON.stringify(binding)],
  );
  return (
    <article className="judgement-camera-card">
      <div className="judgement-camera-card__heading">
        <strong>{item.name}</strong>
        <small>同一操作人；到达区域不代表完成检查</small>
      </div>
      <label className="judgement-camera-card__strategy">
        <span>视角策略</span>
        <select
          value={draft.strategy}
          onChange={(e) =>
            setDraft({
              ...draft,
              strategy: e.target.value,
              cameraIds:
                e.target.value === "single"
                  ? draft.cameraIds.slice(0, 1)
                  : draft.cameraIds,
            })
          }
        >
          {Object.entries(VIEW_STRATEGIES).map(([k, v]) => (
            <option key={k} value={k}>
              {displayBusinessText(v)}
            </option>
          ))}
        </select>
      </label>
      <div
        className="judgement-camera-card__options"
        role="group"
        aria-label={`${item.name}的摄像头选择`}
      >
        {cameras.map((c) => (
          <label key={c.id}>
            <input
              type={draft.strategy === "single" ? "radio" : "checkbox"}
              name={`camera-${item.id}`}
              checked={draft.cameraIds.includes(c.id)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  cameraIds:
                    draft.strategy === "single"
                      ? [c.id]
                      : e.target.checked
                        ? [...draft.cameraIds, c.id]
                        : draft.cameraIds.filter((id) => id !== c.id),
                })
              }
            />
            <span>{c.label}</span>
            <span className="judgement-camera-card__camera-status">
              {c.status || "离线"}
            </span>
          </label>
        ))}
      </div>
      <div className="judgement-camera-card__actions">
        <button
          type="button"
          className="button button--default"
          onClick={() =>
            run(() => store.saveMultiCameraBinding(relation.id, item.id, draft))
          }
        >
          保存视角策略
        </button>
        {message && <small role="status">{displayBusinessText(message)}</small>}
      </div>
    </article>
  );
}
export function ValidationPurposePanel({ relation, store, setModal }) {
  const [purpose, setPurpose] = useState(
      relation.validationPurpose || "prototype_demo",
    ),
    [message, run] = useAction();
  return (
    <section className="enhancement-card">
      <label className="validation-purpose-field">
        <strong>本次验证用途</strong>
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="prototype_demo">配置检查</option>
          <option value="real">现场验证</option>
        </select>
      </label>
      <p>
        配置检查用于核对配置和验证流程。启用AI前，需完成现场验证，并提供独立评测报告和各项验证证据。
      </p>
      {purpose === "real" && (
        <ValidationModelReports
          relation={relation}
          store={store}
          setModal={setModal}
        />
      )}
      <button
        onClick={() =>
          run(() =>
            store.saveValidationPurpose(relation.id, {
              validationPurpose: purpose,
            }),
          )
        }
      >
        保存验证设置
      </button>
      <small role="status">{displayBusinessText(message)}</small>
    </section>
  );
}
export function ExistingModelPanel({ capabilityId }) {
  const store = usePrototypeData(),
    [draft, setDraft] = useState({
      modelArtifactId: "",
      description: "",
      inputFormat: "RGB",
      outputFormat: "动作类别/置信度/时间区间",
      licenseNote: "",
    }),
    [message, run] = useAction();
  return (
    <section className="enhancement-card">
      <details>
        <summary>已有模型适配与验证（独立于训练）</summary>
        <p>
          登记候选后需另行完成真实接入和独立评测。当前记录不会冒充已训练、已验证模型。
        </p>
        {[
          ["modelArtifactId", "模型来源 / 产物标识"],
          ["description", "适用条件与限制"],
          ["inputFormat", "输入形式"],
          ["outputFormat", "输出结构"],
          ["licenseNote", "许可与交付说明"],
        ].map(([k, v]) => (
          <label className="field" key={k}>
            {displayBusinessText(v)}
            <input
              value={draft[k] || ""}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
            />
          </label>
        ))}
        <button
          onClick={() =>
            run(() => store.saveExistingModelCandidate(capabilityId, draft))
          }
        >
          登记待验证候选
        </button>
        <small role="status">{displayBusinessText(message)}</small>
        {(store.data.aiExistingModelCandidates || [])
          .filter((c) => c.capabilityId === capabilityId)
          .map((c) => (
            <article key={c.id}>
              <strong>
                {c.modelArtifactId} ·{" "}
                {c.status === "published"
                  ? "已发布演示"
                  : c.status === "validated"
                    ? "演示验证通过"
                    : "待验证"}
              </strong>
              <p>{c.description}</p>
              <small>
                来源：已有模型适配；结果：
                {c.resultSource === "real" ? "真实待核验" : "原型模拟"}
                ；事件级真实指标：未实测
              </small>
              {c.status === "pending_validation" && (
                <button
                  onClick={() => run(() => store.evaluateExistingModel(c.id))}
                >
                  运行演示独立评测
                </button>
              )}
              {c.status === "validated" && (
                <button
                  onClick={() => run(() => store.publishExistingModel(c.id))}
                >
                  发布当前演示候选
                </button>
              )}
              <details>
                <summary>导入真实评测材料（保存前校验）</summary>
                <textarea
                  aria-label={`${c.modelArtifactId}评测材料`}
                  value={draft.reportJson || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, reportJson: e.target.value })
                  }
                />
                <button
                  onClick={() =>
                    run(() =>
                      store.evaluateExistingModel(
                        c.id,
                        "real",
                        JSON.parse(draft.reportJson || "{}"),
                      ),
                    )
                  }
                >
                  校验报告与服务接入条件
                </button>
              </details>
            </article>
          ))}
      </details>
    </section>
  );
}
export function ObservationSimulator({ arrangement, session, store }) {
  const items =
      session.evaluationSnapshot?.aiCapabilityConfigSnapshot?.judgementItems ||
      [],
    [itemId, setItemId] = useState(""),
    [conditionId, setConditionId] = useState(""),
    [phase, setPhase] = useState("complete"),
    [duration, setDuration] = useState(3),
    [eventId, setEventId] = useState(""),
    [cameraId, setCameraId] = useState(""),
    [last, setLast] = useState(null),
    [targetCount, setTargetCount] = useState(2),
    [message, run] = useAction();
  const item =
      items.find((i) => i.id === itemId) ||
      items.find((i) => i.stepId === session.currentStepId) ||
      items[0],
    condition =
      item?.conditions?.find((c) => c.id === conditionId) ||
      item?.conditions?.[0],
    cameras = cameraViews(
      session.evaluationSnapshot?.workstationAiBaseConfigSnapshot || {},
    ).filter((c) => c.enabled),
    selectedCamera = cameraId || cameras[0]?.deviceId;
  if (!item) return null;
  const send = (repeat = false) =>
    run(() => {
      const end = Date.now(),
        payload =
          repeat && last
            ? last
            : {
                id: `demo-observation-${crypto.randomUUID()}`,
                sessionId: session.id,
                sopId: session.evaluationSnapshot?.sopId,
                configId:
                  session.evaluationSnapshot?.aiCapabilityConfigSnapshot?.id,
                eventId: eventId || undefined,
                phase,
                startedAtMs: end - Number(duration) * 1000,
                endedAtMs: end,
                cameraId: selectedCamera,
                visibility: phase === "unknown" ? "occluded" : "visible",
                observedTargetCount: Number(targetCount),
                logicalAreaId: condition.logicalAreaId,
              };
      store.simulateAiCondition(
        arrangement.id,
        session.workstationId,
        item.id,
        condition.id,
        payload,
      );
      setLast(payload);
    });
  return (
    <details className="enhancement-card">
      <summary>连续事件与跨区域观察演示</summary>
      <p>
        模拟输入时长；当前步骤外的事实保留在时间轴，不提前确认后续步骤。重复同观察不会增加次数。
      </p>
      <div className="two-col-form">
        <label className="field">
          观察判断项
          <select
            value={item.id}
            onChange={(e) => {
              setItemId(e.target.value);
              setConditionId("");
            }}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.stepId} · {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          条件
          <select
            value={condition?.id || ""}
            onChange={(e) => setConditionId(e.target.value)}
          >
            {item.conditions?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.operator}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          输入阶段
          <select value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="start">开始 / 观察中</option>
            <option value="complete">完整动作 / 状态成立</option>
            <option value="interrupted">中断</option>
            <option value="invalid">持续状态失效</option>
            <option value="unknown">遮挡 / 未知</option>
          </select>
        </label>
        <label className="field">
          模拟观察时长（秒）
          <input
            type="number"
            min="0"
            max="600"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        <label className="field">
          可见目标数量
          <input
            type="number"
            min="0"
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
          />
        </label>
        <label className="field">
          同次动作标识
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="重叠窗口填写同一标识"
          />
        </label>
        <label className="field">
          相机
          <select
            value={selectedCamera || ""}
            onChange={(e) => setCameraId(e.target.value)}
          >
            {cameras.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button disabled={session.status !== "进行中"} onClick={() => send()}>
        记录模拟观察
      </button>
      <button
        disabled={!last || session.status !== "进行中"}
        onClick={() => send(true)}
      >
        重发同一观察
      </button>
      <button
        onClick={() =>
          run(() =>
            store.setCameraActorBinding(
              arrangement.id,
              session.workstationId,
              selectedCamera,
              "confirmed",
            ),
          )
        }
      >
        确认此镜头操作人交接
      </button>
      <button
        onClick={() =>
          run(() =>
            store.setCameraActorBinding(
              arrangement.id,
              session.workstationId,
              selectedCamera,
              "uncertain",
            ),
          )
        }
      >
        交接不明
      </button>
      <small role="status">{displayBusinessText(message)}</small>
      <ObservationTimeline session={session} />
    </details>
  );
}
export function ObservationTimeline({ session }) {
  const runtime = session?.runtime || {};
  return (
    <div className="enhancement-list">
      <strong>
        观察 {runtime.aiObservations?.length || 0} 条 · 聚合事件{" "}
        {runtime.actionEvents?.length || 0} 个 ·{" "}
        {session?.evaluationSnapshot?.executionPurpose === "real"
          ? "真实用途待接入核实"
          : "原型演示 / 历史未核实"}
      </strong>
      {Object.values(runtime.sustainedStates || {}).map((s) => (
        <p key={s.requirementId}>
          持续要求 · {s.requirementId} ·{" "}
          {s.status === "valid"
            ? "当前有效"
            : s.status === "invalid"
              ? "已失效，待确认"
              : s.status === "observing"
                ? "观察中"
                : "当前未知"}{" "}
          · {s.cameraId}
        </p>
      ))}
      {(runtime.actorHandoffHistory || []).slice(-3).map((h, i) => (
        <small key={i}>
          人物交接 · {h.cameraId} ·{" "}
          {h.status === "confirmed" ? "已确认" : "归属不明"} · 演示记录
        </small>
      ))}
      {runtime.lastNoTriggerReason && (
        <p>未确认原因：{displayBusinessText(runtime.lastNoTriggerReason)}</p>
      )}
      {(runtime.actionEvents || [])
        .slice(-12)
        .reverse()
        .map((e) => (
          <article key={e.id}>
            <span>
              {e.stepId} · {e.cameraId || "相机未记录"} ·{" "}
              {e.status === "complete"
                ? "完整"
                : e.status === "observing"
                  ? "观察中"
                  : e.status === "interrupted"
                    ? "已中断"
                    : "未知"}{" "}
              · {((e.endedAtMs - e.startedAtMs) / 1000).toFixed(1)}秒 ·{" "}
              {e.observationIds.length}窗口
            </span>
            <small>演示观察 · 媒体未接入</small>
          </article>
        ))}
    </div>
  );
}
export function EvidenceCameraSummary({ step, session }) {
  const views = cameraViews(
      session?.evaluationSnapshot?.workstationAiBaseConfigSnapshot || {},
    ),
    ids =
      step?.evidenceCameraIds ||
      step?.evidenceMetadata?.availableCameraIds ||
      [];
  return (
    <div className="enhancement-card">
      <strong>步骤证据视角</strong>
      <p>
        {ids.length
          ? ids
              .map((id) => views.find((c) => c.deviceId === id)?.name || id)
              .join("、")
          : "未记录可追溯的相机证据"}
      </p>
      <small>
        来源：
        {step?.resultSource === "real"
          ? "真实执行"
          : step?.resultSource === "prototype_demo"
            ? "原型演示"
            : "历史未核实"}
        ；占位画面不代表学生真实录像。
      </small>
    </div>
  );
}
export function SourceMetadataFields({ value, onChange }) {
  return (
    <details className="enhancement-card">
      <summary>采集属性与样本用途</summary>
      {[
        ["sourceGroupId", "采集组"],
        ["participantId", "操作人标识"],
        ["captureBatch", "采集批次"],
        ["captureConditions", "拍摄条件与限制"],
      ].map(([k, v]) => (
        <label className="field" key={k}>
          {displayBusinessText(v)}
          <input
            value={value[k] || ""}
            onChange={(e) => onChange(k, e.target.value)}
          />
        </label>
      ))}
      <label className="field">
        素材用途
        <select
          value={value.sampleUse || "development"}
          onChange={(e) => onChange("sampleUse", e.target.value)}
        >
          {Object.entries(SAMPLE_USES).map(([k, v]) => (
            <option key={k} value={k}>
              {displayBusinessText(v)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        样本类型
        <select
          value={value.sampleType || ""}
          onChange={(e) => onChange("sampleType", e.target.value)}
        >
          <option value="">未记录</option>
          {Object.entries(SAMPLE_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {displayBusinessText(v)}
            </option>
          ))}
        </select>
      </label>
    </details>
  );
}
export function SessionCameraViewer({
  session,
  workstation,
  devices = [],
  renderPreview,
}) {
  const views = workstationCameras(
      workstation,
      devices,
      session?.evaluationSnapshot?.workstationAiBaseConfigSnapshot,
    ),
    [selected, setSelected] = useState(""),
    camera =
      views.find((c) => c.id === selected) ||
      views.find((c) => c.defaultPreview) ||
      views[0];
  const snapshot = session?.evaluationSnapshot?.workstationAiBaseConfigSnapshot;
  return (
    <section className="live-video-panel session-camera-viewer">
      <header className="live-video-toolbar">
        <div className="session-camera-viewer__heading">
          <strong>会话视角预览</strong>
          <small>
            {snapshot
              ? "本次会话锁定配置"
              : "历史相机快照未记录 · 当前配置参考"}{" "}
            · {views.length} 路视角
          </small>
        </div>
        <label className="session-camera-viewer__select">
          <span>摄像头</span>
          <select
            aria-label="查看工位相机"
            value={camera?.id || ""}
            disabled={!views.length}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!views.length && <option value="">未配置视角</option>}
            {views.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} · {c.available ? "设备可用" : "不可用"}
              </option>
            ))}
          </select>
        </label>
      </header>
      {renderPreview ? (
        renderPreview(camera)
      ) : (
        <div className="enhancement-camera-placeholder">
          <strong>{camera?.label || "未配置视角"}</strong>
          <p>
            {camera?.available
              ? "视频服务未接入；当前为视角选择与状态演示"
              : "该视角当前不可用，相关要求返回未知"}
          </p>
          <small>
            覆盖区域：{camera?.areaIds?.join("、") || "未记录"}
            ；到达区域不能证明检查完成。
          </small>
        </div>
      )}
    </section>
  );
}

export function ModelRecoveryPanel({ capabilityId }) {
  const store = usePrototypeData(),
    records = (store.data.aiModelPublicationRecords || []).filter(
      (r) =>
        r.capabilityId === capabilityId && r.previousModel?.modelArtifactId,
    ),
    [selected, setSelected] = useState(""),
    [reason, setReason] = useState(""),
    [message, run] = useAction(),
    record = records.find((r) => r.id === selected) || records[0];
  if (!record) return null;
  return (
    <details className="enhancement-card">
      <summary>管理员恢复已保留的历史模型</summary>
      <p>恢复后会使相关工位待重新验证，既有会话沿用锁定快照。</p>
      <label className="field">
        恢复目标
        <select value={record.id} onChange={(e) => setSelected(e.target.value)}>
          {records.map((r) => (
            <option key={r.id} value={r.id}>
              {r.previousModel.modelArtifactId} ·{" "}
              {displayBusinessText(r.publishedAt)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        恢复原因
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <button
        disabled={!reason.trim()}
        onClick={() =>
          run(() => {
            if (window.confirm("确认恢复此模型并使相关工位待重新验证？"))
              store.restorePublishedModel(capabilityId, record.id, reason);
          })
        }
      >
        确认恢复并留痕
      </button>
      <small role="status">{displayBusinessText(message)}</small>
    </details>
  );
}
