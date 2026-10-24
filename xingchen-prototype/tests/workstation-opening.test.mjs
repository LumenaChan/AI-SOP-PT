import test from "node:test";
import assert from "node:assert/strict";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";
import { deriveAiRuntimeGate } from "../src/aiRuntimeRules.js";
import {
  deriveOpeningInspection,
  assertOpeningInspection,
  OPENING_CHECK_TTL_MS,
  openingPreviewCameras,
} from "../src/workstationOpeningRules.js";
import {
  studentRuntimeFixture,
  createStudentRuntimeStore,
} from "./student-e2e-fixture.mjs";
import { confirmOpeningCheck } from "./opening-check-fixture.mjs";

function fixture(type = "practice", change = () => {}) {
  const data = studentRuntimeFixture();
  change(data);
  const { store, clock } = createStudentRuntimeStore(data);
  const arrangement = store.saveArrangement(
    {
      type,
      name: "检查与开放验证",
      sopId: data.sops[0].id,
      teacherId: "teacher-e2e",
      studentIds: [data.students[0].id],
      workstationIds: [data.workstations[0].id],
      ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
    },
    true,
  );
  const stationId = data.workstations[0].id;
  const run = () => store.runWorkstationOpeningCheck(arrangement.id, stationId);
  const open = (input) =>
    store.openArrangementWorkstation(arrangement.id, stationId, input);
  return { data, store, clock, arrangement, stationId, run, open };
}
const confirmations = (
  report,
  fallbackAccepted = report.needsFallbackConfirmation,
) => ({
  inspectionId: report.id,
  siteResetConfirmed: true,
  cameraConfirmations: Object.fromEntries(
    report.manualChecks.map((c) => [c.key, true]),
  ),
  fallbackAccepted,
});

for (const type of ["practice", "exam"]) {
  test(`${type}: 自动检测加画面确认，记录随Session保存并可重载`, () => {
    const f = fixture(type),
      before = f.store.getData(),
      report = f.run();
    assert.deepEqual(
      f.store.getData(),
      before,
      "检测、重试和取消不改变业务数据",
    );
    assert.equal(report.canOpen, true);
    assert.equal(report.source, "prototype_simulation");
    assert.equal(
      report.items.find((c) => c.key === "inference").status,
      "passed",
    );
    assert.equal(report.manualChecks.length, 1);
    assert.equal(
      report.manualChecks.some((c) => /node|cache/.test(c.key)),
      false,
    );
    assert.throws(
      () => f.open({ node: true, mainCamera: true, cache: true }),
      /先完成系统检测/,
    );
    assert.throws(
      () => f.open({ inspectionId: report.id }),
      /确认所有使用视角/,
    );
    const { session } = f.open(confirmations(report));
    assert.equal(session.openingCheck.actorId, "teacher-e2e");
    assert.equal(session.openingCheck.confirmedAt, f.clock.now());
    assert.equal(session.openingCheck.fingerprint, undefined);
    assert.equal(session.openingCheck.cameraConfirmations[0].confirmed, true);
    assert.equal(session.evaluationProfile.aiRuntimeEnabled, true);
    const restored = createAiRuntimeStore(f.store.getData()).getData();
    assert.deepEqual(
      restored.arrangements[0].sessions[0].openingCheck,
      session.openingCheck,
    );
    assert.throws(() => f.open(confirmations(report)), /已开放/);
  });

  for (const [label, mutate] of [
    [
      "摄像头离线",
      (d) => {
        d.devices[0].status = "离线";
      },
    ],
    [
      "视频流不可用",
      (d) => {
        d.devices[0].streamStatus = "不可用";
      },
    ],
    [
      "无新画面",
      (d) => {
        d.workstations[0].openingCheckSimulation = { frameAvailable: false };
      },
    ],
    [
      "存储空间不足",
      (d) => {
        d.workstations[0].openingCheckSimulation = { freeSpaceGb: 1 };
      },
    ],
    [
      "录像不可写",
      (d) => {
        d.workstations[0].openingCheckSimulation = { writable: false };
      },
    ],
    [
      "试写入失败",
      (d) => {
        d.workstations[0].openingCheckSimulation = { writeTestPassed: false };
      },
    ],
  ])
    test(`${type}: ${label}阻止开放，伪造返回的通过结果不能绕过`, () => {
      const f = fixture(type, mutate),
        report = f.run();
      assert.equal(report.canOpen, false);
      report.canOpen = true;
      report.items.forEach((c) => {
        c.status = "passed";
      });
      assert.throws(() => f.open(confirmations(report)), /暂不能开放/);
      assert.equal(f.store.getData().arrangements[0].sessions.length, 0);
      assert.equal(f.store.getData().arrangements[0].snapshot, null);
    });

  test(`${type}: 推理异常允许明确确认后降级，录像仍须通过`, () => {
    const f = fixture(type, (d) => {
      d.workstations[0].openingCheckSimulation = { inferenceReady: false };
    });
    const report = f.run();
    assert.equal(report.canOpen, true);
    assert.equal(report.aiEnabled, false);
    assert.equal(report.needsFallbackConfirmation, true);
    assert.throws(() => f.open(confirmations(report, false)), /确认本次AI降级/);
    const { session } = f.open(confirmations(report));
    assert.equal(session.evaluationProfile.aiRuntimeEnabled, false);
    assert.equal(session.evaluationSnapshot.aiEnabled, false);
    assert.deepEqual(session.evaluationSnapshot.availableJudgementItemIds, []);
    assert.equal(session.evaluationProfile.enabledStepCount, 0);
    assert.equal(session.openingCheck.fallbackAccepted, true);
    assert.equal(
      session.openingCheck.items.find((c) => c.key === "storage").status,
      "passed",
    );
    f.store.startArrangement(f.arrangement.id);
    f.store.startWorkstationSession(f.arrangement.id, f.stationId);
    assert.throws(
      () =>
        f.store.simulateAiCondition(
          f.arrangement.id,
          f.stationId,
          "judgement-student-e2e",
          "condition-student-e2e",
        ),
      /未启用AI运行/,
    );
  });
}

test("未配置AI仍可使用录像；明确确认降级，不伪装成推理通过", () => {
  const f = fixture("practice", (d) => {
    d.aiCapabilityConfigs = [];
    d.sopWorkstationAiConfigs = [];
    d.workstations[0].aiBaseConfig.edgeDeviceId = "";
  });
  const report = f.run();
  assert.equal(
    report.items.find((c) => c.key === "node").status,
    "not_required",
  );
  assert.equal(
    report.items.find((c) => c.key === "inference").status,
    "failed",
  );
  assert.equal(
    f.open(confirmations(report)).session.evaluationProfile.aiRuntimeEnabled,
    false,
  );
});

test("不要求AI的标准，推理显示不需要，不增加降级勾选", () => {
  const f = fixture("practice", (d) => {
    d.sops[0].steps[0].expectedJudgementMode = "manual_default_pass";
    d.aiCapabilityConfigs = [];
    d.sopWorkstationAiConfigs = [];
  });
  const report = f.run();
  assert.equal(
    report.items.find((c) => c.key === "inference").status,
    "not_required",
  );
  assert.equal(report.needsFallbackConfirmation, false);
  f.open(confirmations(report, false));
});

test("多个视角逐一确认；辅助摄像头异常同样阻止开放", () => {
  const configure = (d) => {
    d.devices.push({ ...d.devices[0], id: "aux", type: "细节摄像头" });
    d.workstations[0].aiBaseConfig.fallbackCameraId = "aux";
  };
  const f = fixture("practice", configure),
    report = f.run(),
    input = confirmations(report);
  assert.equal(report.manualChecks.length, 2);
  input.cameraConfirmations["camera:aux"] = false;
  assert.throws(() => f.open(input), /确认所有使用视角/);
  f.open(confirmations(report));
  const bad = fixture("practice", (d) => {
    configure(d);
    d.devices.at(-1).status = "离线";
  });
  assert.equal(bad.run().canOpen, false);
});

test("过期、旧重试、错工位或重载前的检测均不能开放", () => {
  const f = fixture(),
    first = f.run(),
    next = f.run();
  assert.throws(() => f.open(confirmations(first)), /先完成系统检测/);
  assert.throws(
    () => f.open({ ...confirmations(next), inspectionId: "other-station" }),
    /先完成系统检测/,
  );
  f.clock.advance(OPENING_CHECK_TTL_MS / 1000 + 1);
  assert.throws(() => f.open(confirmations(next)), /检测已过期/);
  const fresh = f.run();
  const reloaded = createAiRuntimeStore(f.store.getData(), {
    now: f.clock.now,
  });
  assert.throws(
    () =>
      reloaded.openArrangementWorkstation(
        f.arrangement.id,
        f.stationId,
        confirmations(fresh),
      ),
    /先完成系统检测/,
  );
  f.open(confirmations(fresh));
});

test("已检测后修改安排，必须重新检测；检测历史不写进成绩", () => {
  const f = fixture(),
    report = f.run();
  f.store.saveArrangement(
    { ...f.arrangement, name: "更新后安排", teacherId: "other-teacher" },
    true,
  );
  assert.throws(() => f.open(confirmations(report)), /状态已变化/);
  const { session } = f.open(
    confirmOpeningCheck(f.store, f.arrangement.id, f.stationId),
  );
  assert.equal(session.openingCheck.actorId, "other-teacher");
  assert.equal(session.score, 0);
  assert.deepEqual(session.runtime.aiObservations, []);
});

test("底层再次核对设备/模型状态，不能拿旧报告或失败状态强行开放", () => {
  const f = fixture(),
    data = f.store.getData();
  const gate = () =>
    deriveAiRuntimeGate({
      ...data,
      sopId: f.arrangement.sopId,
      workstationId: f.stationId,
    });
  const derive = () =>
    deriveOpeningInspection({
      data,
      arrangementId: f.arrangement.id,
      workstationId: f.stationId,
      gate: gate(),
      id: "inspection",
      checkedAt: f.clock.now(),
    });
  const report = derive(),
    checklist = confirmations(report);
  const camera = data.devices[0];
  camera.streamStatus = "不可用";
  assert.throws(
    () =>
      assertOpeningInspection({
        report,
        current: derive(),
        checklist,
        at: f.clock.now(),
      }),
    /状态已变化/,
  );
  camera.streamStatus = "可用";
  data.aiCapabilities[0].currentPublishedModel.modelArtifactId = "new-model";
  assert.throws(
    () =>
      assertOpeningInspection({
        report,
        current: derive(),
        checklist,
        at: f.clock.now(),
      }),
    /状态已变化/,
  );
});

test("三台以上摄像头：切换辅助视角时主视角固定，不改变检测和确认记录", () => {
  const f = fixture("practice", (d) => {
    const mainId = d.workstations[0].aiBaseConfig.primaryCameraId;
    d.devices.push(
      ...["aux-two", "aux-three", "disabled-camera"].map((id) => ({
        ...d.devices[0],
        id,
        type: "细节摄像头",
      })),
    );
    d.workstations[0].aiBaseConfig.cameras = [
      {
        deviceId: mainId,
        name: "固定主视角",
        role: "primary",
        defaultPreview: true,
        enabled: true,
      },
      {
        deviceId: "aux-two",
        name: "手部细节",
        role: "auxiliary",
        enabled: true,
      },
      {
        deviceId: "aux-three",
        name: "侧面操作区",
        role: "auxiliary",
        enabled: true,
      },
      {
        deviceId: "disabled-camera",
        name: "停用视角",
        role: "auxiliary",
        enabled: false,
      },
    ];
  });
  const report = f.run(),
    before = structuredClone(report);
  const first = openingPreviewCameras(report);
  assert.equal(
    first.primary.cameraId,
    f.data.workstations[0].aiBaseConfig.primaryCameraId,
  );
  assert.equal(first.auxiliary.cameraId, "aux-two");
  assert.deepEqual(
    first.auxiliaryCameras.map((c) => c.cameraId),
    ["aux-two", "aux-three"],
  );
  const switched = openingPreviewCameras(report, "aux-three");
  assert.equal(switched.primary.cameraId, first.primary.cameraId);
  assert.equal(switched.auxiliary.cameraId, "aux-three");
  assert.equal(
    openingPreviewCameras(report, first.primary.cameraId).auxiliary.cameraId,
    "aux-two",
  );
  assert.equal(
    openingPreviewCameras(report, "another-station-camera").auxiliary.cameraId,
    "aux-two",
  );
  const changedReport = {
    ...report,
    items: report.items.filter((c) => c.cameraId !== "aux-three"),
  };
  assert.equal(
    openingPreviewCameras(changedReport, "aux-three").auxiliary.cameraId,
    "aux-two",
  );
  assert.deepEqual(report, before);
  assert.equal(report.manualChecks.length, 3);
  const input = confirmations(report);
  input.cameraConfirmations["camera:aux-three"] = false;
  assert.throws(() => f.open(input), /确认所有使用视角/);
  f.open(confirmations(report));
});

test("预览空态及异常：不复制主视角充当辅助，不自动将辅助提升为主视角", () => {
  const f = fixture(),
    report = f.run();
  const one = openingPreviewCameras(report);
  assert.equal(one.auxiliary, null);
  assert.deepEqual(one.auxiliaryCameras, []);
  assert.deepEqual(openingPreviewCameras(null), {
    primary: null,
    auxiliary: null,
    auxiliaryCameras: [],
  });
  const orphan = {
    items: [
      { cameraId: "aux", label: "辅助视角", status: "failed", primary: false },
    ],
  };
  const view = openingPreviewCameras(orphan, "aux");
  assert.equal(view.primary, null);
  assert.equal(view.auxiliary.status, "failed");
});
