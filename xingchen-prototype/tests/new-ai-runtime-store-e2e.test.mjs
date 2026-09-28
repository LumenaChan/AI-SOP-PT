import assert from "node:assert/strict";
import test from "node:test";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";

function runtimeData({
  purposes,
  actualEvaluationMode = "visual_auto",
  expectedJudgementMode = actualEvaluationMode,
  scoreRule,
  safetyRule,
  workstationCount = 1,
  fallbackCamera = false,
}) {
  const sop = {
    id: "sop-e2e",
    name: "新架构运行测试SOP",
    status: "已发布",
    steps: [
      {
        id: "step-e2e",
        name: "执行操作",
        score: 100,
        maxScore: 100,
        expectedJudgementMode,
        completionCondition: "动作完成",
      },
    ],
    scoreRules: scoreRule ? [scoreRule] : [],
    safetyRules: safetyRule ? [safetyRule] : [],
  };
  const capability = {
    id: "cap-e2e",
    name: "动作识别能力",
    targetName: "操作动作",
    type: "action_recognition",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "artifact-e2e" },
  };
  const judgementItem = {
    id: "item-e2e",
    stepId: "step-e2e",
    name: "操作事实成立",
    purposes,
    scoreRuleIds: scoreRule ? [scoreRule.id] : [],
    safetyRuleIds: safetyRule ? [safetyRule.id] : [],
    combination: "all",
    conditions: [
      {
        id: "condition-e2e",
        capabilityId: capability.id,
        operator: "recognized",
        minOccurrences: 1,
        withinCurrentStep: true,
      },
    ],
  };
  const aiConfig = {
    id: "config-e2e",
    sopId: sop.id,
    status: "enabled",
    logicalAreas: [],
    stepConfigs: [
      {
        stepId: "step-e2e",
        actualEvaluationMode,
        scoreRuleTreatments: scoreRule
          ? [
              {
                ruleId: scoreRule.id,
                mode: "ai",
                judgementItemId: judgementItem.id,
              },
            ]
          : [],
        safetyRuleTreatments: safetyRule
          ? [
              {
                ruleId: safetyRule.id,
                mode: "ai",
                judgementItemId: judgementItem.id,
              },
            ]
          : [],
      },
    ],
    judgementItems: [judgementItem],
  };
  const workstations = Array.from({ length: workstationCount }, (_, index) => ({
    id: `w-e2e-${index + 1}`,
    name: `测试工位${index + 1}`,
    status: "可入场",
    currentArrangement: "无",
    aiBaseConfig: {
      primaryCameraId: `camera-e2e-${index + 1}`,
      fallbackCameraId: fallbackCamera ? `fallback-e2e-${index + 1}` : "",
      edgeDeviceId: `edge-e2e-${index + 1}`,
    },
  }));
  const devices = workstations.flatMap((workstation, index) => [
    {
      id: `camera-e2e-${index + 1}`,
      workstationId: workstation.id,
      type: "全景摄像头",
      status: "在线",
      streamStatus: "可用",
    },
    ...(fallbackCamera
      ? [
          {
            id: `fallback-e2e-${index + 1}`,
            workstationId: workstation.id,
            type: "特写摄像头",
            status: "在线",
            streamStatus: "可用",
          },
        ]
      : []),
    {
      id: `edge-e2e-${index + 1}`,
      workstationId: workstation.id,
      type: "边缘工作站",
      status: "在线",
    },
  ]);
  const sopWorkstationAiConfigs = workstations.map((workstation, index) => ({
    id: `relation-e2e-${index + 1}`,
    sopAiConfigId: aiConfig.id,
    workstationId: workstation.id,
    judgementCameraBindings: [
      {
        judgementItemId: judgementItem.id,
        cameraId: `camera-e2e-${index + 1}`,
        source: "primary",
      },
    ],
    logicalAreaMappings: [],
    validationStatus: "passed",
    enableStatus: "enabled",
    validationCases: [],
    validationRecords: [{ id: `validation-e2e-${index + 1}` }],
  }));
  return {
    sops: [sop],
    aiCapabilities: [capability],
    aiCapabilityConfigs: [aiConfig],
    sopWorkstationAiConfigs,
    workstations,
    devices,
    arrangements: [],
    evaluationMappings: [],
    datasets: [],
    models: [],
    workstationProfiles: [],
    compatibilityDecisions: [],
    fieldValidations: [],
  };
}

function createStore(data) {
  let minute = 0;
  let id = 0;
  return createAiRuntimeStore(data, {
    now: () => `2026-09-27T16:${String(minute++).padStart(2, "0")}:00`,
    makeId: (prefix) => `${prefix}-${++id}`,
  });
}

function createAndStart(store, data, workstationCount = 1) {
  const arrangement = store.saveArrangement(
    {
      name: "新架构闭环测试",
      type: "practice",
      scheduleStart: "2026-09-27T16:00:00",
      sopId: data.sops[0].id,
      studentIds: Array.from(
        { length: workstationCount },
        (_, index) => `student-${index + 1}`,
      ),
      workstationIds: data.workstations
        .slice(0, workstationCount)
        .map((item) => item.id),
    },
    true,
  );
  for (const workstation of data.workstations.slice(0, workstationCount))
    store.openArrangementWorkstation(arrangement.id, workstation.id, {
      node: true,
      mainCamera: true,
      cache: true,
    });
  store.startArrangement(arrangement.id);
  for (const workstation of data.workstations.slice(0, workstationCount))
    store.startWorkstationSession(arrangement.id, workstation.id);
  return arrangement;
}

test("Store E2E executes save, open, start, workstation start and scoring through new architecture only", () => {
  const scoreRule = {
    id: "score-rule-e2e",
    stepId: "step-e2e",
    name: "工具使用错误",
    deductionMode: "fixed_deduction",
    deductionValue: 5,
    maxTriggerCount: 1,
    correctionTreatment: "keep_deduction",
  };
  const data = runtimeData({
    purposes: ["completion", "scoring"],
    scoreRule,
    workstationCount: 2,
  });
  const store = createStore(data);
  const arrangement = createAndStart(store, data, 2);
  const result = store.simulateAiCondition(
    arrangement.id,
    data.workstations[1].id,
    "item-e2e",
    "condition-e2e",
  );

  assert.equal(result.completed, true);
  assert.equal(result.updatedSession.steps[0].state, "pass");
  assert.equal(result.updatedSession.steps[0].score, 95);
  assert.equal(
    result.updatedSession.runtime.aiScoringApplications[0].ruleId,
    scoreRule.id,
  );
  assert.equal(
    result.updatedSession.runtime.aiScoringApplications[0].appliedDeduction,
    scoreRule.deductionValue,
  );
  for (const key of [
    "evaluationMappings",
    "datasets",
    "models",
    "workstationProfiles",
    "compatibilityDecisions",
    "fieldValidations",
  ])
    assert.deepEqual(store.getData()[key], [], key);
});

test("scoring-only item keeps the step open and applies the teacher correction rule", () => {
  const scoreRule = {
    id: "score-rule-e2e",
    stepId: "step-e2e",
    name: "首次操作错误",
    deductionMode: "fixed_deduction",
    deductionValue: 5,
    maxTriggerCount: 1,
    correctionTreatment: "reduce_after_correction",
    correctedDeductionValue: 2,
  };
  const data = runtimeData({
    purposes: ["scoring"],
    actualEvaluationMode: "visual_assist_default_pass",
    scoreRule,
  });
  const store = createStore(data);
  const arrangement = createAndStart(store, data);
  const result = store.simulateAiCondition(
    arrangement.id,
    data.workstations[0].id,
    "item-e2e",
    "condition-e2e",
  );
  assert.equal(result.completed, false);
  assert.equal(result.updatedSession.steps[0].state, "active");
  assert.equal(result.updatedSession.steps[0].score, 95);
  assert.equal(
    result.updatedSession.runtime.correctionContext.relatedRuleId,
    scoreRule.id,
  );

  const corrected = store.setCorrectionContext(
    arrangement.id,
    data.workstations[0].id,
    "complete",
  );
  assert.equal(corrected.steps[0].score, 98);
  assert.equal(corrected.runtime.aiScoringApplications[0].status, "corrected");
  assert.equal(
    corrected.runtime.aiScoringApplications[0].appliedDeduction,
    scoreRule.correctedDeductionValue,
  );
});

test("teacher-review scoring rule creates pending review without an AI final deduction", () => {
  const scoreRule = {
    id: "score-rule-e2e",
    stepId: "step-e2e",
    name: "教师确认操作事实",
    deductionMode: "fixed_deduction",
    deductionValue: 10,
    maxTriggerCount: 1,
    correctionTreatment: "teacher_review",
  };
  const data = runtimeData({
    purposes: ["scoring"],
    actualEvaluationMode: "visual_assist_default_pass",
    scoreRule,
  });
  const store = createStore(data);
  const arrangement = createAndStart(store, data);
  const result = store.simulateAiCondition(
    arrangement.id,
    data.workstations[0].id,
    "item-e2e",
    "condition-e2e",
  );

  assert.equal(result.updatedSession.steps[0].score, 100);
  assert.equal(result.updatedSession.steps[0].reviewStatus, "待复核");
  assert.equal(
    result.updatedSession.steps[0].scoreDisposition.status,
    "pending",
  );
  assert.equal(
    result.updatedSession.runtime.aiScoringApplications[0].status,
    "pending_review",
  );
});

test("Store E2E keeps completion plus safety pending until the teacher resolves it", () => {
  const safetyRule = {
    id: "safety-rule-e2e",
    stepId: "step-e2e",
    name: "危险操作",
    sessionTreatment: "continue_after_review",
    scoreTreatment: "no_score_effect",
    deductionValue: 0,
    enabled: true,
  };
  const data = runtimeData({
    purposes: ["completion", "safety"],
    safetyRule,
  });
  const store = createStore(data);
  const arrangement = createAndStart(store, data);
  const result = store.simulateAiCondition(
    arrangement.id,
    data.workstations[0].id,
    "item-e2e",
    "condition-e2e",
  );

  assert.equal(result.completed, false);
  assert.equal(result.safetyBlocked, true);
  assert.equal(result.updatedSession.status, "已暂停");
  assert.notEqual(result.updatedSession.steps[0].state, "pass");
  assert.equal(result.updatedSession.steps[0].executionState, "safety_blocked");
  assert.equal(
    result.updatedSession.runtime.safetyCandidates[0].status,
    "pending",
  );

  const resolved = store.resolveSafetyCandidate(
    arrangement.id,
    data.workstations[0].id,
    result.updatedSession.runtime.safetyCandidates[0].id,
    "false_positive",
  );
  assert.equal(resolved.status, "进行中");
  assert.equal(resolved.steps[0].state, "pass");
  assert.equal(resolved.steps[0].executionState, "closed");
});

test("Store E2E applies the teacher safety rule after a confirmed candidate", () => {
  const safetyRule = {
    id: "safety-rule-e2e",
    stepId: "step-e2e",
    name: "危险操作",
    sessionTreatment: "terminate_after_confirmation",
    scoreTreatment: "fixed_deduction",
    deductionValue: 20,
    enabled: true,
  };
  const data = runtimeData({
    purposes: ["completion", "safety"],
    safetyRule,
  });
  const store = createStore(data);
  const arrangement = createAndStart(store, data);
  const result = store.simulateAiCondition(
    arrangement.id,
    data.workstations[0].id,
    "item-e2e",
    "condition-e2e",
  );
  const resolved = store.resolveSafetyCandidate(
    arrangement.id,
    data.workstations[0].id,
    result.updatedSession.runtime.safetyCandidates[0].id,
    "confirmed",
  );

  assert.equal(resolved.status, "待复位");
  assert.equal(resolved.steps[0].state, "active");
  assert.equal(resolved.steps[0].executionState, "terminated");
  assert.equal(resolved.steps[0].score, 80);
});

test("teacher evaluation safety item creates only a safety candidate", () => {
  const safetyRule = {
    id: "safety-rule-e2e",
    stepId: "step-e2e",
    name: "教师评价步骤安全提醒",
    sessionTreatment: "pause_for_review",
    scoreTreatment: "teacher_review",
    deductionValue: 0,
    enabled: true,
  };
  const data = runtimeData({
    purposes: ["safety"],
    actualEvaluationMode: "default_pass_manual_deduction",
    safetyRule,
  });
  const store = createStore(data);
  const arrangement = createAndStart(store, data);
  const result = store.simulateAiCondition(
    arrangement.id,
    data.workstations[0].id,
    "item-e2e",
    "condition-e2e",
  );

  assert.equal(result.completed, false);
  assert.equal(result.updatedSession.steps[0].state, "active");
  assert.equal(result.updatedSession.steps[0].score, 0);
  assert.equal(result.updatedSession.runtime.aiScoringApplications.length, 0);
  assert.equal(result.updatedSession.runtime.safetyCandidates.length, 1);
});

test("workstation without fallback camera requires no assist checklist and records not applicable", () => {
  const data = runtimeData({ purposes: ["completion"] });
  const store = createStore(data);
  const arrangement = createAndStart(store, data);
  const saved = store
    .getData()
    .arrangements.find((item) => item.id === arrangement.id);
  assert.equal(saved.sessions[0].recording.assistCamera, "不适用");
  assert.deepEqual(
    store.getWorkstationReadiness(arrangement.id, data.workstations[0].id)
      .checks,
    ["node", "mainCamera", "cache"],
  );
});
