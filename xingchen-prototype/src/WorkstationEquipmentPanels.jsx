import { workstationValidationLabel } from "./sopWorkstationAiRules.js";
import { workstationStandardRows } from "./workstationStandardRules.js";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { CameraCollectionEditor } from "./EnhancementPanels.jsx";
import { cameraViews, editCameraView, CAMERA_ROLES } from "./cameraRules.js";
import {
  normalizeWorkstationAiBaseConfig,
  isCriticalWorkstationAiChange,
  isEdgeDevice,
  deriveWorkstationAiReadiness,
  validateWorkstationAiBaseConfig,
} from "./workstationAiRules.js";
import { currentWorkstationInspection } from "./workstationConfigActions.js";
import {
  activeWorkstationUse,
  workstationUsageRestriction,
} from "./workstationReleaseRules.js";
import { AI_CONFIG_PATH } from "./aiEntry.js";
import { displayBusinessText } from "./businessTextRules.js";

export const workstationDevicePath = (id) =>
  `/admin/devices?workstationId=${encodeURIComponent(id)}`;
const standardPath = (sop, id) =>
  `${AI_CONFIG_PATH}/${encodeURIComponent(sop.id)}?tab=workstation&workstationId=${encodeURIComponent(id)}`;

export const WorkstationAiBaseConfigForm = forwardRef(
  function WorkstationAiBaseConfigForm({ workstation }, ref) {
    const { data } = usePrototypeData();
    const original = useRef(
      normalizeWorkstationAiBaseConfig(workstation),
    ).current;
    const [form, setForm] = useState(() =>
      editCameraView(
        {
          ...original,
          cameras: cameraViews(original).map((c) => ({
            ...c,
            name:
              c.name ||
              c.label ||
              data.devices.find((d) => d.id === c.deviceId)?.name ||
              "摄像头",
          })),
        },
        "",
        {},
      ),
    );
    const critical = isCriticalWorkstationAiChange(original, form);
    const affected = workstationStandardRows(data, workstation.id).filter(
      ({ relation }) =>
        ["passed", "validating"].includes(relation.validationStatus),
    );
    const active = activeWorkstationUse(data, workstation.id);
    const edgeDevices = data.devices.filter(
      (d) =>
        d.workstationId === workstation.id &&
        isEdgeDevice(d) &&
        d.status !== "停用",
    );
    useImperativeHandle(ref, () => ({
      validate() {
        return validateWorkstationAiBaseConfig({
          workstation,
          input: form,
          devices: data.devices,
          requireComplete: true,
        });
      },
      expectedConfig: JSON.stringify(original),
    }));
    return (
      <div className="workstation-ai-form equipment-form">
        <p className="hint">
          {active
            ? "当前工位有活动会话，仅可调整名称、说明与默认显示；运行设备、采集用途和覆盖条件须在会话结束后修改。"
            : "保存后请检测设备；采集条件变更后需重新完成现场验证。"}
        </p>
        <CameraCollectionEditor
          value={form}
          onChange={setForm}
          devices={data.devices}
          workstation={workstation}
        />
        <section className="equipment-edge-editor">
          <h3>运行边缘设备</h3>
          <label className="field">
            边缘设备（AI运行需要）
            <select
              value={form.edgeDeviceId || ""}
              onChange={(e) =>
                setForm({ ...form, edgeDeviceId: e.target.value })
              }
            >
              <option value="">请选择已绑定边缘设备</option>
              {edgeDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.status}
                </option>
              ))}
            </select>
          </label>
          {!form.edgeDeviceId && (
            <p className="hint">
              未选择运行边缘设备。可先保存摄像头配置用于录像与人工确认；AI状态保持待完善。需要AI时请登记、绑定并选择边缘设备。
            </p>
          )}
          <a
            className="button button--default"
            href={workstationDevicePath(workstation.id)}
            target="_blank"
            rel="noreferrer"
          >
            管理本工位设备（新窗口）
          </a>
          <p className="form-hint">
            可在新窗口登记、绑定设备，当前表单保持打开；设备保存后本页自动同步。
          </p>
        </section>
        {critical && (
          <section className="equipment-impact" role="status">
            <h3>
              {active
                ? "当前会话未结束，运行变更不能保存"
                : "本次变更需重新核对现场条件"}
            </h3>
            <p>
              保存后以下已验证或验证中的标准将待重新验证，原关联和历史记录保留：
            </p>
            {affected.length ? (
              <ul>
                {affected.map(({ relation, sop }) => (
                  <li key={relation.id}>
                    {sop?.name || "关联标准已失效"} ·{" "}
                    {workstationValidationLabel(relation)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>没有已验证的标准受到影响。后续启用AI仍需完成现场验证。</p>
            )}
          </section>
        )}
      </div>
    );
  },
);

export function WorkstationInspectionContent({ report, workstationId }) {
  return (
    <div className="equipment-inspection">
      <p>
        检测时间：{displayBusinessText(report.checkedAt)} ·{" "}
        {report.passed
          ? "已配置设备检测通过"
          : "存在设备异常，请按下列影响处理后重新检测"}
      </p>
      <ul>
        {report.items.map((i) => (
          <li key={i.id}>
            <strong>
              {i.label}：
              {i.status === "not_required"
                ? "未配置，不参与AI"
                : i.passed
                  ? "通过"
                  : "异常"}
            </strong>
            <span>{displayBusinessText(i.detail)}</span>
            {!i.passed && (
              <a
                className="table-action"
                href={
                  i.id.startsWith("missing-")
                    ? workstationDevicePath(workstationId)
                    : `/admin/devices/${encodeURIComponent(i.id)}`
                }
              >
                处理设备
              </a>
            )}
          </li>
        ))}
      </ul>
      <p>
        摄像头异常请先处理后再开放工位；边缘设备异常时可使用人工确认。启用AI前需完成对应标准的现场验证。
      </p>
    </div>
  );
}
export function openWorkstationInspection(setModal, store, workstation) {
  setModal({
    title: `${workstation.name} · 设备检测`,
    className: "device-connection-test-modal",
    content: <p>检测本工位的摄像头连接、视频流和边缘设备状态。</p>,
    confirmText: "开始检测",
    onConfirm: () => store.inspectWorkstationDevices(workstation.id),
    onSuccess: (report) =>
      setModal({
        title: "设备检测结果",
        className: "device-connection-test-modal",
        size: "large",
        dismissOnly: true,
        hideCancel: true,
        confirmText: "返回工位详情",
        content: (
          <WorkstationInspectionContent
            report={report}
            workstationId={workstation.id}
          />
        ),
      }),
  });
}
export function WorkstationEquipmentPanel({
  workstation,
  setModal,
  onConfigure,
}) {
  const store = usePrototypeData(),
    { data } = store;
  const config = normalizeWorkstationAiBaseConfig(workstation);
  const views = cameraViews(config);
  const readiness = deriveWorkstationAiReadiness({
    workstation,
    devices: data.devices,
  });
  const report = currentWorkstationInspection(workstation, data.devices);
  const linked = data.devices.filter((d) => d.workstationId === workstation.id);
  const devices = [
    ...linked,
    ...views
      .filter((v) => !linked.some((d) => d.id === v.deviceId))
      .map((v) => {
        const device = data.devices.find((d) => d.id === v.deviceId);
        return device
          ? { ...device, status: "未绑定到本工位" }
          : { id: v.deviceId, name: v.name, status: "设备已移除" };
      }),
  ];
  if (config.edgeDeviceId && !devices.some((d) => d.id === config.edgeDeviceId))
    devices.push(
      data.devices.some((d) => d.id === config.edgeDeviceId)
        ? {
            ...data.devices.find((d) => d.id === config.edgeDeviceId),
            status: "未绑定到本工位",
          }
        : { id: config.edgeDeviceId, name: "边缘设备已移除", status: "不存在" },
    );
  return (
    <section className="panel equipment-panel">
      <header className="panel-title">
        <h2>设备与视角</h2>
        <div className="row-actions">
          <button className="button button--default" onClick={onConfigure}>
            配置设备与视角
          </button>
          <button
            className="button button--default"
            onClick={() =>
              openWorkstationInspection(setModal, store, workstation)
            }
          >
            设备检测
          </button>
        </div>
      </header>
      <div className="equipment-state">
        <strong>设备状态：{readiness.label}</strong>
        <p>{readiness.reasons.join("；")}</p>
        <p>
          配置校验：
          {displayBusinessText(config.lastConfigValidatedAt || "尚未校验")} ·
          最近检测：
          {report
            ? `${displayBusinessText(report.checkedAt)} · ${report.passed ? "通过" : "异常"}`
            : config.deviceInspection
              ? "配置或设备状态已变化，请重新检测"
              : "尚未检测"}
        </p>
        {workstationUsageRestriction(workstation) && (
          <p>
            工位使用限制：{workstationUsageRestriction(workstation)}
            。设备恢复后仍需单独处理使用限制。
          </p>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>设备</th>
              <th>用途</th>
              <th>默认显示</th>
              <th>设备状态</th>
              <th>视频流</th>
              <th>最近心跳时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const view = views.find((c) => c.deviceId === d.id);
              return (
                <tr key={d.id}>
                  <td>{view?.name || d.name}</td>
                  <td>
                    {d.id === config.edgeDeviceId
                      ? "运行边缘设备"
                      : view
                        ? `${CAMERA_ROLES[view.role] || "用途待确认"}${view.enabled ? " · 参与采集" : " · 未采集"}`
                        : "已绑定，未选用"}
                  </td>
                  <td>{view?.enabled && view.defaultPreview ? "是" : "—"}</td>
                  <td>{d.status || "未知"}</td>
                  <td>{d.streamStatus || "—"}</td>
                  <td>{displayBusinessText(d.lastHeartbeat || "未记录")}</td>
                  <td>
                    <a
                      className="table-action"
                      href={`/admin/devices/${encodeURIComponent(d.id)}`}
                    >
                      查看设备
                    </a>
                  </td>
                </tr>
              );
            })}
            {!devices.length && (
              <tr>
                <td colSpan={7}>
                  尚未绑定设备，请先到设备管理登记并绑定本工位。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="row-actions equipment-links">
        <a
          className="button button--default"
          href={workstationDevicePath(workstation.id)}
        >
          管理本工位设备
        </a>
      </div>
    </section>
  );
}
export function WorkstationStandardsPanel({ workstation }) {
  const store = usePrototypeData(),
    nav = useNavigate();
  const rows = workstationStandardRows(store.data, workstation.id);
  return (
    <section className="panel equipment-panel">
      <header className="panel-title">
        <h2>关联标准与AI运行状态</h2>
        <button
          className="button button--default"
          onClick={() => nav(AI_CONFIG_PATH)}
        >
          管理AI能力配置
        </button>
      </header>
      <p className="form-hint">关键设备变更后，请完成受影响标准的现场验证。</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>实训标准</th>
              <th>现场验证</th>
              <th>AI启用</th>
              <th>当前运行结论</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ relation, sop }) => {
              let state;
              try {
                state = store.getSopWorkstationAiState(relation.id);
              } catch {
                state = null;
              }
              return (
                <tr key={relation.id}>
                  <td>{sop?.name || "关联标准已失效"}</td>
                  <td>{workstationValidationLabel(relation)}</td>
                  <td>
                    {relation.enableStatus === "enabled"
                      ? "已启用"
                      : relation.enableStatus === "disabled"
                        ? "已停用"
                        : "未启用"}
                  </td>
                  <td>{state?.runtimeStatus?.label || "关联信息待核对"}</td>
                  <td>
                    {sop && (
                      <a
                        className="table-action"
                        href={standardPath(sop, workstation.id)}
                      >
                        进入工位验证
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5}>
                  尚未关联实训标准。请在AI能力配置中选择本工位并完成现场验证。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
