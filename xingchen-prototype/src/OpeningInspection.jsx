import { displayBusinessText } from "./businessTextRules.js";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AlertOutlined, CheckCircleFilled } from "@ant-design/icons";
import {
  OPENING_STATUS_LABELS,
  OPENING_CHECK_TTL_MS,
  openingPreviewCameras,
} from "./workstationOpeningRules.js";
import { notificationTime } from "./notificationRules.js";
import { workstationCaption } from "./resourceDisplayRules.js";

export const ModalSubmitReadiness = createContext(null);

export function OpeningCameraPreview({ report, checking = false }) {
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const { primary, auxiliary, auxiliaryCameras } = openingPreviewCameras(
    report,
    selectedCameraId,
  );
  const pane = (camera, isPrimary) => (
    <figure
      className="opening-camera-pane"
      key={isPrimary ? "primary" : "auxiliary"}
    >
      <div
        className="opening-camera-pane__frame"
        data-camera-id={camera?.cameraId || undefined}
      >
        {camera?.status === "passed" && !checking ? (
          <img
            key={camera.cameraId}
            src={
              isPrimary
                ? "/assets/workstation-male.png"
                : "/assets/workstation-female.png"
            }
            alt={`${camera.label}占位演示画面，非真实摄像头画面`}
          />
        ) : (
          <div className="opening-check-camera-empty">
            {checking
              ? "正在获取工位画面…"
              : camera
                ? `${camera.label}不可用`
                : isPrimary
                  ? "未配置主摄像头"
                  : "未配置辅助摄像头"}
          </div>
        )}
        <div className="opening-camera-pane__header">
          <strong>{isPrimary ? "主视角" : "辅助视角"}</strong>
          {!isPrimary && (
            <select
              aria-label="切换辅助视角摄像头"
              value={auxiliary?.cameraId || ""}
              disabled={checking || auxiliaryCameras.length < 2}
              onChange={(event) => setSelectedCameraId(event.target.value)}
            >
              {!auxiliaryCameras.length && (
                <option value="">未配置辅助摄像头</option>
              )}
              {auxiliaryCameras.map((item) => (
                <option key={item.cameraId} value={item.cameraId}>
                  {item.label}
                  {item.status !== "passed" ? "（不可用）" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <figcaption>
        {camera
          ? `${camera.label} · ${checking ? "检测中" : camera.status === "passed" ? "占位演示画面，非实时视频" : "无可用画面"}`
          : checking
            ? "等待检测结果"
            : isPrimary
              ? "请管理员配置主摄像头"
              : "配置其他摄像头后可在此切换查看"}
      </figcaption>
    </figure>
  );
  return (
    <div className="prep-camera-grid opening-camera-grid">
      {pane(primary, true)}
      {pane(auxiliary, false)}
    </div>
  );
}

export function OpeningInspectionResults({ report, checking = false }) {
  return (
    <section className="opening-check-section" aria-busy={checking}>
      <h3>系统检测结果</h3>
      <p className="opening-check-meta">
        {checking
          ? "正在检测设备、视频、AI服务与录像存储…"
          : report
            ? `原型模拟检测 · ${notificationTime(report.checkedAt)}`
            : "尚未取得检测结果"}
      </p>
      {report && !checking && (
        <ul className="opening-check-results">
          {report.items.map((item) => (
            <li key={item.key}>
              <div>
                <strong>{item.label}</strong>
                <span className={`opening-check-status is-${item.status}`}>
                  {OPENING_STATUS_LABELS[item.status]}
                  {item.status === "failed"
                    ? item.blocking
                      ? " · 阻止开放"
                      : " · AI降级"
                    : ""}
                </span>
              </div>
              <p>{displayBusinessText(item.detail)}</p>
              {item.status === "failed" && <small>{item.action}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const StationCheckForm = forwardRef(function StationCheckForm(
  { workstation, snapshot, readiness, runCheck },
  ref,
) {
  const setReady = useContext(ModalSubmitReadiness);
  const [report, setReport] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [cameraConfirmations, setCameraConfirmations] = useState({});
  const [siteResetConfirmed, setSiteResetConfirmed] = useState(false);
  const [fallbackAccepted, setFallbackAccepted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [retry, setRetry] = useState(0);
  // The modal retains its content element. Always invoke the provided command
  // through a ref; late timers never update an unmounted dialog.
  const checkCommand = useRef(runCheck);
  checkCommand.current = runCheck;
  useEffect(() => {
    let active = true;
    setChecking(true);
    setError("");
    setReport(null);
    setCameraConfirmations({});
    setSiteResetConfirmed(false);
    setFallbackAccepted(false);
    setExpired(false);
    setReady?.(false);
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkCommand.current();
        if (active) setReport(result);
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "检测失败，请重新检测。",
          );
      } finally {
        if (active) setChecking(false);
      }
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [retry, setReady]);
  useEffect(() => {
    if (!report) return;
    const timeout = window.setTimeout(
      () => setExpired(true),
      Math.max(
        0,
        Date.parse(report.checkedAt) + OPENING_CHECK_TTL_MS - Date.now(),
      ),
    );
    return () => window.clearTimeout(timeout);
  }, [report]);
  const ready = Boolean(
    report?.canOpen &&
      !checking &&
      !expired &&
      siteResetConfirmed &&
      report.manualChecks.every((c) => cameraConfirmations[c.key]) &&
      (!report.needsFallbackConfirmation || fallbackAccepted),
  );
  useEffect(() => {
    setReady?.(ready);
  }, [ready, setReady]);
  useImperativeHandle(ref, () => ({
    getValue: () => ({
      inspectionId: !checking && !expired ? report?.id : "",
      cameraConfirmations,
      siteResetConfirmed,
      fallbackAccepted,
    }),
    invalidate: () => {
      setExpired(true);
      setReady?.(false);
    },
  }));
  return (
    <div className="form-stack opening-check-form">
      <OpeningCameraPreview report={report} checking={checking} />
      <OpeningInspectionResults report={report} checking={checking} />
      <div className="opening-check-tools">
        <button
          type="button"
          className="button button--default"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            setReady?.(false);
            setRetry((n) => n + 1);
          }}
        >
          {checking ? "检测中…" : "重新检测"}
        </button>
      </div>
      {report?.items.some((c) => c.status === "failed") && (
        <details className="opening-check-record">
          <summary>设备状态与处理指引</summary>
          <p>
            {workstation.name} · {workstationCaption(workstation)}
          </p>
          {report.items
            .filter((c) => c.status === "failed")
            .map((c) => (
              <p key={c.key}>
                {c.label}：{c.action}
              </p>
            ))}
          <p>请联系管理员处理，完成后点击“重新检测”。</p>
        </details>
      )}
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
      {expired && (
        <p className="form-error" role="alert">
          检测结果已失效，请重新检测并确认画面。
        </p>
      )}
      {report && !checking && (
        <>
          <section className="opening-check-section">
            <h3>教师现场与画面确认</h3>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={siteResetConfirmed}
                disabled={!report.canOpen || expired}
                onChange={(event) =>
                  setSiteResetConfirmed(event.target.checked)
                }
              />
              工具、设备和操作区域已复位，上一位学生已离场，现场具备本次使用条件
            </label>
            {report.manualChecks.map((check) => (
              <label className="checkbox-row" key={check.key}>
                <input
                  type="checkbox"
                  checked={Boolean(cameraConfirmations[check.key])}
                  disabled={!report.canOpen || expired}
                  onChange={(event) =>
                    setCameraConfirmations((values) => ({
                      ...values,
                      [check.key]: event.target.checked,
                    }))
                  }
                />
                {check.label}
              </label>
            ))}
            {!report.canOpen && (
              <p className="form-error">
                请先处理系统检测异常，再重新检测；人工确认不能跳过异常。
              </p>
            )}
          </section>
          <div
            className={`evaluation-gate-callout ${report.aiEnabled ? "is-enabled" : "is-fallback"}`}
          >
            {report.aiEnabled ? (
              <CheckCircleFilled aria-hidden="true" />
            ) : (
              <AlertOutlined aria-hidden="true" />
            )}
            <div className="evaluation-gate-callout__content">
              <strong>
                {report.aiEnabled
                  ? readiness.gate.runtimeLabel
                  : report.needsFallbackConfirmation
                    ? "本次AI降级开放"
                    : "本次不启用AI"}
              </strong>
              <p>
                {report.aiEnabled
                  ? `AI参与步骤 ${readiness.gate.aiParticipatingStepCount} 个，其中自动评价 ${readiness.gate.automaticEvaluationStepCount} 个、AI辅助 ${readiness.gate.assistedEvaluationStepCount} 个、安全提醒 ${readiness.gate.safetyMonitoringStepCount} 个。`
                  : report.needsFallbackConfirmation
                    ? "相关步骤按既有默认通过规则处理，教师仍可复核；已确认的安全红线仍会阻断会话。"
                    : "按教学标准与既有评分规则执行。"}
              </p>
              {report.needsFallbackConfirmation && (
                <>
                  <small>{report.fallbackReasons.join("；")}</small>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      disabled={!report.canOpen || expired}
                      checked={fallbackAccepted}
                      onChange={(event) =>
                        setFallbackAccepted(event.target.checked)
                      }
                    />
                    我已了解并确认本次AI降级方式
                  </label>
                </>
              )}
            </div>
          </div>
        </>
      )}
      <p className="hint">
        将使用{snapshot ? "已锁定" : "首次开放时生成"}
        的教学标准与工位AI能力快照；开放时保存本次检测结果与教师确认记录。
      </p>
      <small className="opening-check-meta">
        {workstationCaption(workstation)}
      </small>
    </div>
  );
});

export function OpeningInspectionRecord({ session, teachers = [] }) {
  const record = session?.openingCheck;
  if (!record) return null;
  const actor = teachers.find((t) => t.id === record.actorId);
  return (
    <details className="opening-check-record">
      <summary>工位开放检查记录</summary>
      <p>
        确认教师：{actor?.name || "任课教师"} ·{" "}
        {notificationTime(record.confirmedAt)}
      </p>
      <OpeningInspectionResults report={record} />
      <p>
        画面确认：{record.cameraConfirmations.map((c) => c.label).join("；")}
      </p>
      {record.siteResetConfirmation?.confirmed && (
        <p>现场准备确认：{record.siteResetConfirmation.label}</p>
      )}
      {record.fallbackAccepted && <p>教师已确认本次AI降级方式。</p>}
    </details>
  );
}
