import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createAiEvaluationSnapshot,
  createOpenedAiSession,
  deriveAiRuntimeGate,
  deriveSopAiCapabilityStatus,
  evaluationProfileFromGate,
  startAiRuntimeSession,
} from "../src/aiRuntimeRules.js";
import { createSessionStepsFromSop } from "../src/domainRules.js";
import { capabilityConfigReferenceIds } from "../src/aiCapabilityConfigRules.js";
import { invalidateSopWorkstationConfigs } from "../src/sopWorkstationAiRules.js";

const storeSource = readFileSync(
  new URL("../src/prototypeData.jsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8",
);

function fixture() {
  const sop = {
    id: "sop-runtime",
    name: "二次验电",
    status: "已发布",
    steps: [
      {
        id: "step-1",
        name: "确认验电",
        expectedJudgementMode: "visual_auto",
        completionCondition: "验电动作完成",
      },
    ],
    scoreRules: [],
    safetyRules: [],
  };
  const capability = {
    id: "cap-runtime",
    name: "验电动作识别",
    targetName: "二次验电",
    type: "action_recognition",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "artifact-runtime" },
  };
  const aiConfig = {
    id: "config-runtime",
    sopId: sop.id,
    status: "enabled",
    logicalAreas: [],
    stepConfigs: [
      {
        stepId: "step-1",
        actualEvaluationMode: "visual_auto",
        scoreRuleTreatments: [],
        safetyRuleTreatments: [],
      },
    ],
    judgementItems: [
      {
        id: "item-runtime",
        stepId: "step-1",
        name: "验电动作成立",
        purposes: ["completion"],
        scoreRuleIds: [],
        safetyRuleIds: [],
        combination: "all",
        conditions: [
          {
            id: "condition-runtime",
            capabilityId: capability.id,
            operator: "recognized",
            minOccurrences: 1,
            withinCurrentStep: true,
          },
        ],
      },
    ],
  };
  const workstation = {
    id: "w-runtime",
    name: "验电工位",
    status: "可入场",
    aiBaseConfig: {
      primaryCameraId: "camera-runtime",
      fallbackCameraId: "",
      edgeDeviceId: "edge-runtime",
    },
  };
  const devices = [
    {
      id: "camera-runtime",
      workstationId: workstation.id,
      type: "全景摄像头",
      status: "在线",
      streamStatus: "可用",
    },
    {
      id: "edge-runtime",
      workstationId: workstation.id,
      type: "边缘工作站",
      status: "在线",
    },
  ];
  const relation = {
    id: "relation-runtime",
    sopAiConfigId: aiConfig.id,
    workstationId: workstation.id,
    judgementCameraBindings: [
      {
        judgementItemId: "item-runtime",
        cameraId: "camera-runtime",
        source: "primary",
      },
    ],
    logicalAreaMappings: [],
    validationStatus: "passed",
    enableStatus: "enabled",
    validationCases: [],
    validationRecords: [{ id: "validation-runtime" }],
  };
  return {
    sop,
    capability,
    aiConfig,
    workstation,
    devices,
    relation,
    data: {
      sops: [sop],
      aiCapabilityConfigs: [aiConfig],
      sopWorkstationAiConfigs: [relation],
      aiCapabilities: [capability],
      workstations: [workstation],
      devices,
    },
  };
}

test("new runtime gate works from six new architecture sources only", () => {
  const { data, sop, workstation } = fixture();
  const gate = deriveAiRuntimeGate({
    ...data,
    sopId: sop.id,
    workstationId: workstation.id,
    evaluationMappings: [],
    datasets: [],
    models: [],
    aiPackages: [],
    workstationProfiles: [],
    fieldValidations: [],
  });
  assert.equal(gate.enabled, true, gate.reasons.join("；"));
  assert.equal(gate.judgementItemCount, 1);
  assert.equal(gate.capabilityCount, 1);
  assert.equal(
    evaluationProfileFromGate(gate).automaticEvaluationEnabled,
    true,
  );

  const snapshot = createAiEvaluationSnapshot(gate, "2026-09-27 15:00");
  assert.equal(snapshot.sopId, sop.id);
  assert.equal(snapshot.aiCapabilityConfigSnapshot.id, "config-runtime");
  assert.equal(snapshot.sopWorkstationAiConfigSnapshot.id, "relation-runtime");
  assert.deepEqual(
    snapshot.capabilitySnapshots.map((item) => item.id),
    ["cap-runtime"],
  );
  const serialized = JSON.stringify(snapshot);
  for (const obsolete of [
    "sopVersion",
    "mappingVersion",
    "datasetVersion",
    "modelVersion",
    "packageVersion",
    "workstationProfileVersion",
  ])
    assert.equal(serialized.includes(obsolete), false, obsolete);
});

test("new architecture opens and starts a real Session while every old runtime source is empty", () => {
  const { data, sop, workstation } = fixture();
  const oldRuntimeSources = {
    evaluationMappings: [],
    datasets: [],
    models: [],
    workstationProfiles: [],
    compatibilityDecisions: [],
    fieldValidations: [],
  };
  const arrangement = {
    id: "practice-runtime",
    type: "practice",
    status: "待开始",
    sopId: sop.id,
    workstationIds: [workstation.id],
    openWorkstationIds: [],
    studentIds: ["student-runtime"],
    sessions: [],
    ...oldRuntimeSources,
  };
  const gate = deriveAiRuntimeGate({
    ...data,
    ...oldRuntimeSources,
    sopId: arrangement.sopId,
    workstationId: workstation.id,
  });
  const opened = createOpenedAiSession({
    id: "session-runtime",
    workstationId: workstation.id,
    studentId: arrangement.studentIds[0],
    gate,
    lockedAt: "2026-09-27 15:30",
    steps: createSessionStepsFromSop(sop.steps),
    recording: { status: "不可用", startedAt: "尚未开始" },
  });
  assert.equal(opened.status, "可入场");
  assert.equal(opened.evaluationProfile.automaticEvaluationEnabled, true);
  assert.equal(opened.evaluationSnapshot.runtimeStatus, "runnable");
  assert.equal(
    opened.evaluationSnapshot.aiCapabilityConfigSnapshot.id,
    data.aiCapabilityConfigs[0].id,
  );

  const started = startAiRuntimeSession(opened, "2026-09-27 15:31");
  assert.equal(started.status, "进行中");
  assert.equal(started.currentStepId, "step-1");
  assert.equal(started.steps[0].observationWindow.status, "open");
  assert.equal(started.runtime.actorBinding.status, "confirmed");
  assert.equal(started.runtime.evaluationClock.status, "running");
  assert.equal(started.recording.status, "完整");
  assert.equal(started.evaluationSnapshot.aiEnabled, true);
});

test("SOP status and runtime gate share the same enabled relation fact", () => {
  const { data, sop, workstation } = fixture();
  const status = deriveSopAiCapabilityStatus({
    ...data,
    sopId: sop.id,
    targetWorkstationIds: [workstation.id],
  });
  assert.equal(status.status, "已启用");
  assert.equal(status.runnableWorkstationCount, 1);

  const pendingData = {
    ...data,
    sopWorkstationAiConfigs: data.sopWorkstationAiConfigs.map((item) => ({
      ...item,
      validationStatus: "pending_revalidation",
    })),
  };
  const pendingGate = deriveAiRuntimeGate({
    ...pendingData,
    sopId: sop.id,
    workstationId: workstation.id,
  });
  assert.equal(pendingGate.enabled, false);
  assert.equal(pendingGate.runtimeStatus, "pending_revalidation");
  assert.equal(
    deriveSopAiCapabilityStatus({ ...pendingData, sopId: sop.id }).status,
    "待验证",
  );
});

test("reactivating a referenced capability invalidates real SOP-workstation validation", () => {
  const { aiConfig, relation, capability } = fixture();
  const affectedConfigIds = capabilityConfigReferenceIds(
    [aiConfig],
    capability.id,
  );
  const invalidated = invalidateSopWorkstationConfigs(
    [relation],
    (item) => affectedConfigIds.includes(item.sopAiConfigId),
    "2026-09-27 16:00",
    "AI能力重新启用，需要重新完成现场验证",
  );
  assert.deepEqual(affectedConfigIds, [aiConfig.id]);
  assert.equal(invalidated.affectedCount, 1);
  assert.equal(invalidated.configs[0].validationStatus, "pending_revalidation");
  assert.equal(invalidated.configs[0].enableStatus, "enabled");
  assert.match(invalidated.configs[0].validationInvalidationReason, /重新启用/);
});

test("runtime blocks when a published capability is disabled or camera becomes unavailable", () => {
  const { data, sop, workstation } = fixture();
  const disabled = deriveAiRuntimeGate({
    ...data,
    aiCapabilities: data.aiCapabilities.map((item) => ({
      ...item,
      status: "已停用",
    })),
    sopId: sop.id,
    workstationId: workstation.id,
  });
  assert.equal(disabled.enabled, false);
  assert.match(disabled.reasons.join("；"), /未发布或当前没有可用模型/);

  const cameraOffline = deriveAiRuntimeGate({
    ...data,
    devices: data.devices.map((item) =>
      item.id === "camera-runtime" ? { ...item, status: "离线" } : item,
    ),
    sopId: sop.id,
    workstationId: workstation.id,
  });
  assert.equal(cameraOffline.enabled, false);
  assert.match(cameraOffline.reasons.join("；"), /摄像头/);
});

test("formal arrangement and runtime panel source are disconnected from legacy AI runtime", () => {
  const gateSource = storeSource
    .split("getWorkstationEvaluationGate(workstationId, sopId)")[1]
    ?.split("getSopAiCapabilityStatus")[0];
  const openSource = storeSource
    .split(
      "openArrangementWorkstation(arrangementId, workstationId, checklist)",
    )[1]
    ?.split("startArrangement(id)")[0];
  const sessionSource = storeSource
    .split("startArrangement(id)")[1]
    ?.split("advanceRuntimeClock")[0];
  const runtimePanel = appSource
    .split("function RuntimeSimulatorPanel(")[1]
    ?.split("function StudentMonitorPage(")[0];
  for (const source of [gateSource, openSource, sessionSource, runtimePanel]) {
    assert.ok(source);
    for (const obsolete of [
      "evaluationMappings",
      "datasets",
      "workstationProfiles",
      "compatibilityDecisions",
      "machineEvents",
      "mappingVersion",
      "datasetVersion",
      "modelVersion",
      "aiPackageVersion",
      "workstationProfileVersion",
      "sopVersion",
    ])
      assert.equal(source.includes(obsolete), false, obsolete);
  }
  assert.match(runtimePanel, /aiCapabilityConfigSnapshot/);
  assert.match(runtimePanel, /activeJudgementItems/);
  assert.match(runtimePanel, /simulateAiCondition/);
});
