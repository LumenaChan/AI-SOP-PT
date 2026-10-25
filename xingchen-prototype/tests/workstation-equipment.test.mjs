import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraViews,
  withCameraAliases,
  editCameraView,
} from "../src/cameraRules.js";
import {
  normalizeWorkstationAiBaseConfig,
  isCriticalWorkstationAiChange,
  deriveWorkstationAiReadiness,
} from "../src/workstationAiRules.js";
import {
  createWorkstationConfigActions,
  assertDeviceIdle,
  assertWorkstationIdle,
  currentWorkstationInspection,
} from "../src/workstationConfigActions.js";
import { deriveOpeningInspection } from "../src/workstationOpeningRules.js";
import { persistWorkingData } from "../src/storageMigrationRules.js";
import { workstationUsageRestriction } from "../src/workstationReleaseRules.js";

function fixture(source = "browser") {
  let data = {
    students: [],
    sops: [{ id: "sop", name: "实训标准" }],
    aiCapabilityConfigs: [{ id: "ai", sopId: "sop" }],
    workstations: [
      {
        id: "w",
        name: "测试工位",
        code: "W-1",
        status: "可入场",
        aiBaseConfig: withCameraAliases({
          edgeDeviceId: "edge",
          lastCheckedAt: "2026-09-01 10:00:00",
          cameras: [
            {
              deviceId: "main",
              name: "主操作画面",
              role: "primary",
              enabled: true,
              defaultPreview: true,
              areaIds: ["操作区"],
            },
            {
              deviceId: "aux",
              name: "工具细节",
              role: "auxiliary",
              enabled: true,
              defaultPreview: false,
              areaIds: ["工具区"],
            },
          ],
        }),
      },
    ],
    devices: [
      {
        id: "main",
        name: "主相机",
        type: "摄像头",
        workstationId: "w",
        status: "在线",
        streamStatus: "可用",
      },
      {
        id: "aux",
        name: "辅相机",
        type: "摄像头",
        workstationId: "w",
        status: "在线",
        streamStatus: "可用",
      },
      {
        id: "other",
        name: "新相机",
        type: "摄像头",
        workstationId: "w",
        status: "在线",
        streamStatus: "可用",
      },
      {
        id: "edge",
        name: "边缘设备",
        type: "边缘工作站",
        workstationId: "w",
        status: "在线",
      },
      {
        id: "edge2",
        name: "备用边缘设备",
        type: "边缘工作站",
        workstationId: "w",
        status: "在线",
      },
    ],
    arrangements: [],
    auditLogs: [],
    sopWorkstationAiConfigs: [
      {
        id: "relation",
        sopAiConfigId: "ai",
        workstationId: "w",
        validationStatus: "passed",
        enableStatus: "enabled",
        validationRecords: [{ id: "old-proof" }],
      },
      {
        id: "unrelated",
        workstationId: "elsewhere",
        validationStatus: "passed",
      },
    ],
  };
  const values = new Map();
  let fail = false,
    currentSource = source;
  const actions = createWorkstationConfigActions({
    source,
    getSource: () => currentSource,
    now: () => "2026-10-25 12:00:00",
    makeId: () => crypto.randomUUID(),
    setData: (fn) => {
      const next = fn(data);
      persistWorkingData(
        {
          setItem(k, v) {
            if (fail) throw new Error("保存失败");
            values.set(k, v);
          },
        },
        source,
        "fixture",
        next,
      );
      data = next;
    },
  });
  return {
    actions,
    values,
    get data() {
      return data;
    },
    get w() {
      return data.workstations[0];
    },
    get config() {
      return normalizeWorkstationAiBaseConfig(data.workstations[0]);
    },
    set fail(v) {
      fail = v;
    },
    set source(v) {
      currentSource = v;
    },
  };
}
function occupy(f, status = "进行中") {
  f.data.arrangements.push({
    id: "active",
    name: "正在实训",
    status: "进行中",
    sessions: [
      {
        id: "session",
        workstationId: "w",
        studentId: "student",
        status,
        score: 87,
        steps: [{ id: "step", score: 87 }],
        evaluationSnapshot: {
          workstationAiBaseConfigSnapshot: structuredClone(f.w.aiBaseConfig),
        },
      },
    ],
  });
}
test("默认显示与主采集独立，编辑第二视角不重建其他视角字段", () => {
  const f = fixture(),
    before = f.config;
  const preview = editCameraView(before, "aux", { defaultPreview: true });
  assert.equal(preview.primaryCameraId, "main");
  assert.equal(preview.cameras[1].defaultPreview, true);
  assert.equal(isCriticalWorkstationAiChange(before, preview), false);
  const renamed = editCameraView(preview, "aux", { name: "新细节名称" });
  assert.deepEqual(renamed.cameras[0], preview.cameras[0]);
  assert.deepEqual(renamed.cameras[1].areaIds, ["工具区"]);
  assert.equal(renamed.cameras[1].role, "auxiliary");
  const primary = editCameraView(renamed, "aux", { role: "primary" });
  assert.equal(primary.primaryCameraId, "aux");
  assert.equal(primary.cameras[0].role, "auxiliary");
  assert.equal(isCriticalWorkstationAiChange(before, primary), true);
  assert.equal(
    isCriticalWorkstationAiChange(before, {
      ...before,
      cameras: [...before.cameras].reverse(),
    }),
    false,
  );
});
test("活动会话期间可改名称说明和默认显示，不重置验证、不改历史快照及成绩", () => {
  const f = fixture();
  occupy(f);
  const old = structuredClone(f.data.arrangements),
    validation = structuredClone(f.data.sopWorkstationAiConfigs);
  f.actions.inspectWorkstationDevices("w");
  const cfg = f.config;
  const renamed = editCameraView(
    { ...cfg, regionDescription: "文字说明" },
    "aux",
    { name: "细节新名称", defaultPreview: true },
  );
  const result = f.actions.saveWorkstationAiBaseConfig(
    "w",
    renamed,
    JSON.stringify(cfg),
  );
  assert.equal(result.criticalChange, false);
  assert.deepEqual(f.data.arrangements, old);
  assert.deepEqual(f.data.sopWorkstationAiConfigs, validation);
  assert.ok(currentWorkstationInspection(f.w, f.data.devices));
  assert.equal(f.config.primaryCameraId, "main");
  assert.equal(f.config.lastCheckedAt, "2026-09-01 10:00:00");
  assert.equal(f.config.lastConfigValidatedAt, "2026-10-25 12:00:00");
});
test("运行设备、采集用途及覆盖变化统一保护所有活动状态", () => {
  for (const status of ["待开始", "可入场", "进行中", "已暂停", "故障"]) {
    for (const change of [
      (c) => ({ ...c, edgeDeviceId: "edge2" }),
      (c) => editCameraView(c, "aux", { enabled: false }),
      (c) => editCameraView(c, "main", { areaIds: ["新覆盖区"] }),
    ]) {
      const f = fixture();
      occupy(f, status);
      const before = structuredClone(f.data);
      assert.throws(
        () => f.actions.saveWorkstationAiBaseConfig("w", change(f.config)),
        /活动会话/,
      );
      assert.deepEqual(f.data, before);
      assert.throws(() => assertDeviceIdle(f.data, "edge"), /活动会话/);
      assert.throws(() => assertDeviceIdle(f.data, "main"), /活动会话/);
      assert.throws(() => assertWorkstationIdle(f.data, "w"), /活动会话/);
      assert.doesNotThrow(() => assertDeviceIdle(f.data, "other"));
    }
  }
});
test("已结束会话保留快照；真实运行变化仅使对应工位待重新验证", () => {
  const f = fixture();
  occupy(f, "已完成");
  f.data.arrangements[0].status = "已结束";
  const history = structuredClone(f.data.arrangements);
  const result = f.actions.saveWorkstationAiBaseConfig("w", {
    ...f.config,
    edgeDeviceId: "edge2",
  });
  assert.equal(result.affectedCount, 1);
  assert.equal(
    f.data.sopWorkstationAiConfigs[0].validationStatus,
    "pending_revalidation",
  );
  assert.equal(f.data.sopWorkstationAiConfigs[0].enableStatus, "enabled");
  assert.deepEqual(f.data.sopWorkstationAiConfigs[0].validationRecords, [
    { id: "old-proof" },
  ]);
  assert.equal(f.data.sopWorkstationAiConfigs[1].validationStatus, "passed");
  assert.deepEqual(f.data.arrangements, history);
  assert.doesNotThrow(() => assertDeviceIdle(f.data, "edge"));
});
test("保存要求主采集和已确认用途；未配边缘明确待完善，备用只能待命", () => {
  const f = fixture();
  assert.throws(
    () =>
      f.actions.saveWorkstationAiBaseConfig("w", { ...f.config, cameras: [] }),
    /主采集/,
  );
  const manual = f.actions.saveWorkstationAiBaseConfig("w", {
    ...f.config,
    edgeDeviceId: "",
  });
  assert.equal(manual.readiness.code, "pending");
  const cameraOnly = f.actions.inspectWorkstationDevices("w");
  assert.equal(cameraOnly.passed, true);
  assert.equal(
    cameraOnly.items.find((i) => i.kind === "edge").status,
    "not_required",
  );
  f.actions.saveWorkstationAiBaseConfig("w", {
    ...f.config,
    edgeDeviceId: "edge",
  });
  assert.throws(
    () =>
      f.actions.saveWorkstationAiBaseConfig(
        "w",
        editCameraView(f.config, "aux", { role: "legacy_secondary" }),
      ),
    /确认历史/,
  );
  const standby = editCameraView(f.config, "aux", { role: "backup" });
  assert.equal(standby.cameras[1].enabled, false);
  assert.equal(standby.cameras[1].defaultPreview, false);
  f.actions.saveWorkstationAiBaseConfig("w", standby);
  f.data.devices.find((d) => d.id === "aux").status = "离线";
  assert.equal(
    deriveWorkstationAiReadiness({ workstation: f.w, devices: f.data.devices })
      .code,
    "available",
  );
  const before = structuredClone(f.data);
  assert.throws(
    () =>
      f.actions.saveWorkstationAiBaseConfig("w", {
        ...f.config,
        cameras: cameraViews(f.config).map((c) => ({ ...c, enabled: true })),
      }),
    /备用视角/,
  );
  assert.deepEqual(f.data, before);
});
test("辅助离线在详情和开放检查均异常，设备检测保留故障状态", () => {
  const f = fixture();
  f.data.devices.find((d) => d.id === "aux").streamStatus = "不可用";
  const devices = structuredClone(f.data.devices);
  assert.equal(
    deriveWorkstationAiReadiness({ workstation: f.w, devices: f.data.devices })
      .code,
    "abnormal",
  );
  f.data.arrangements.push({ id: "p", studentIds: [], type: "practice" });
  const opening = deriveOpeningInspection({
    data: f.data,
    arrangementId: "p",
    workstationId: "w",
    gate: { enabled: false, sop: { steps: [] } },
    id: "report",
    checkedAt: "2026-10-25T04:00:00Z",
  });
  assert.ok(
    opening.items.some(
      (i) => i.cameraId === "aux" && i.status === "failed" && i.blocking,
    ),
  );
  const report = f.actions.inspectWorkstationDevices("w");
  assert.equal(report.source, "prototype_saved_state");
  assert.equal(report.passed, false);
  assert.equal(f.data.auditLogs[0].action, "执行设备检测");
  assert.equal(f.data.auditLogs[0].result, "检测有异常");
  assert.equal(report.items.find((i) => i.id === "aux").passed, false);
  assert.deepEqual(f.data.devices, devices);
  assert.ok(currentWorkstationInspection(f.w, f.data.devices));
  f.data.devices.find((d) => d.id === "aux").streamStatus = "可用";
  assert.equal(currentWorkstationInspection(f.w, f.data.devices), null);
  assert.equal(f.actions.inspectWorkstationDevices("w").passed, true);
});
test("保存失败、来源切换与陈旧配置不覆盖工作数据及检测记录", () => {
  for (const source of ["browser", "cpd"]) {
    const f = fixture(source),
      cfg = f.config,
      before = structuredClone(f.data);
    f.fail = true;
    assert.throws(
      () => f.actions.saveWorkstationAiBaseConfig("w", cfg),
      /保存失败/,
    );
    assert.throws(() => f.actions.inspectWorkstationDevices("w"), /保存失败/);
    assert.deepEqual(f.data, before);
    f.fail = false;
    f.source = source === "cpd" ? "browser" : "cpd";
    assert.throws(
      () => f.actions.saveWorkstationAiBaseConfig("w", cfg),
      /来源已切换/,
    );
    f.source = source;
    f.actions.inspectWorkstationDevices("w");
    const checked = structuredClone(f.data);
    assert.throws(
      () =>
        f.actions.saveWorkstationAiBaseConfig("w", cfg, JSON.stringify(cfg)),
      /配置已变化/,
    );
    assert.deepEqual(f.data, checked);
    assert.equal(f.values.size, 1);
  }
});
test("快照中的旧设备仍受占用保护；故障限制与就绪状态均保留原因", () => {
  const f = fixture();
  occupy(f);
  f.w.aiBaseConfig.edgeDeviceId = "edge2";
  assert.throws(() => assertDeviceIdle(f.data, "edge"), /活动会话/);
  f.w.status = "故障";
  assert.match(workstationUsageRestriction(f.w), /故障/);
  assert.equal(
    deriveWorkstationAiReadiness({ workstation: f.w, devices: f.data.devices })
      .code,
    "abnormal",
  );
  f.w.releaseHold = { reasons: ["安全事件待确认"] };
  assert.equal(workstationUsageRestriction(f.w), "安全事件待确认");
});
