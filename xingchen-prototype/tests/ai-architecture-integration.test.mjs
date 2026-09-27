import assert from "node:assert/strict";
import test from "node:test";
import { createCapability } from "../src/aiCapabilityRules.js";
import { createAiSourceVideos } from "../src/aiVideoRules.js";
import {
  buildFrameExtractionTask,
  buildVideoSlicingTask,
  extractionModeForCapability,
} from "../src/aiExtractionRules.js";
import { buildAutoCleaningTask } from "../src/aiCleaningRules.js";
import { applyManualCleaningDecision } from "../src/aiManualCleaningRules.js";
import {
  defaultAnnotationCategories,
  saveClipAnnotation,
  saveFrameAnnotation,
} from "../src/aiAnnotationRules.js";
import {
  DEFAULT_TRAINING_RATIOS,
  autoAssignSourceGroups,
  buildTrainingReadiness,
  collectTrainingCandidates,
  groupTrainingCandidates,
  targetCategoryIdsFor,
} from "../src/aiTrainingDataRules.js";
import {
  advanceTrainingTask,
  createTrainingTask,
} from "../src/aiModelTrainingRules.js";
import {
  isCapabilityAvailableForConfiguration,
  publishCandidateModel,
} from "../src/aiModelPublishingRules.js";
import { evaluateAiCapabilityConfig } from "../src/aiCapabilityConfigRules.js";
import {
  checkSopWorkstationAiConfig,
  createDefaultValidationCases,
  createSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
  evaluateValidationCompletion,
} from "../src/sopWorkstationAiRules.js";

const now = "2026-09-27 14:00";

function createSourceVideos(capability) {
  const files = ["a", "b", "c"].map((suffix) => ({
    fileName: `${capability.id}-${suffix}.mp4`,
    displayName: `${capability.name}-${suffix}`,
    storageRef: `mock-video://${capability.id}/${suffix}`,
    mimeType: "video/mp4",
    duration: "00:06",
    width: 1920,
    height: 1080,
    fileSize: 1024,
  }));
  return createAiSourceVideos(
    {
      capabilityId: capability.id,
      files,
      dataCategory: "normal",
      sourceType: "standard_demo",
      workstationId: "w1",
    },
    [],
    {
      ids: files.map((_, index) => `video-${capability.id}-${index + 1}`),
      actor: "系统管理员",
      now,
    },
  );
}

function extract(capability, sourceVideos) {
  if (capability.type === "object_detection")
    return buildFrameExtractionTask(
      {
        capabilityId: capability.id,
        videos: sourceVideos,
        parameters: {
          samplingMode: "interval",
          sampleValue: 3,
          rangeMode: "entire",
          maxFrames: 100,
        },
      },
      {
        taskId: `extract-${capability.id}`,
        frameId: (index, videoId) => `frame-${videoId}-${index}`,
        actor: "系统管理员",
        now,
      },
    ).frames;
  return buildVideoSlicingTask(
    {
      capabilityId: capability.id,
      videos: sourceVideos,
      method: "fixed_length",
      parameters: { clipLength: 3, step: 3 },
    },
    {
      taskId: `slice-${capability.id}`,
      clipId: (index, videoId) => `clip-${videoId}-${index}`,
      actor: "系统管理员",
      now,
    },
  ).clips;
}

function annotate(capability, items, categories, sourceVideos) {
  const primaryCategory = categories.find((item) => !item.isBackground);
  return items.map((item, index) =>
    capability.type === "object_detection"
      ? saveFrameAnnotation(
          item,
          {
            boxes: [
              {
                categoryId: primaryCategory.id,
                x: 0.1,
                y: 0.15,
                width: 0.3,
                height: 0.4,
              },
            ],
          },
          categories,
          {
            actor: "系统管理员",
            now,
            boxId: () => `box-${item.id}-${index}`,
          },
        )
      : saveClipAnnotation(
          item,
          {
            actionCategoryId: primaryCategory.id,
            refinedStartMs: item.startMs,
            refinedEndMs: item.endMs,
          },
          categories,
          {
            ...sourceVideos.find((video) => video.id === item.sourceVideoId),
            durationMs: 6000,
          },
          { actor: "系统管理员", now },
        ),
  );
}

function completeCapabilityPipeline(type, id, name, targetName) {
  let capability = createCapability(
    {
      name,
      type,
      description: `可复用的${targetName}视觉识别能力`,
      targetName,
      note: "一期联调",
    },
    [],
    { id, now, actor: "系统管理员" },
  );
  const sourceVideos = createSourceVideos(capability);
  const mode = extractionModeForCapability(capability.type);
  const extractedItems = extract(capability, sourceVideos);
  const autoCleaned = buildAutoCleaningTask(
    {
      capabilityId: capability.id,
      mode,
      items: extractedItems,
    },
    { taskId: `clean-${id}`, actor: "系统管理员", now },
  ).items;
  const kept = applyManualCleaningDecision(
    autoCleaned,
    { ids: autoCleaned.map((item) => item.id), decision: "kept" },
    { actor: "系统管理员", now },
  );
  const categories = defaultAnnotationCategories(capability);
  const annotated = annotate(capability, kept, categories, sourceVideos);
  const { candidates, unavailable } = collectTrainingCandidates({
    capability,
    sourceVideos,
    categories,
    items: annotated,
  });
  assert.equal(unavailable.length, 0);
  const unassignedGroups = groupTrainingCandidates({
    candidates,
    sourceVideos,
    categories,
    capability,
    config: {},
  });
  const sourceAssignments = autoAssignSourceGroups(
    unassignedGroups,
    DEFAULT_TRAINING_RATIOS,
    targetCategoryIdsFor(capability, candidates, categories),
  );
  const splitConfig = {
    sourceAssignments,
    lastSavedCandidateIds: candidates.map((item) => item.id),
  };
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos,
    categories,
    capability,
    config: splitConfig,
  });
  const readiness = buildTrainingReadiness({
    capability,
    candidates,
    groups,
    categories,
    config: splitConfig,
  });
  assert.equal(readiness.ready, true, readiness.blockers.join("；"));
  let trainingTask = createTrainingTask(
    {
      capability,
      readiness,
      candidates,
      groups,
      categories,
      params: {},
      tasks: [],
    },
    { id: `training-${id}`, actor: "系统管理员", now },
  );
  const firstSnapshotId = trainingTask.dataSnapshot.items[0].id;
  annotated[0].id = "upstream-mutated-after-training";
  assert.equal(trainingTask.dataSnapshot.items[0].id, firstSnapshotId);
  while (trainingTask.status !== "completed")
    trainingTask = advanceTrainingTask(trainingTask, {
      now,
      modelArtifactId: `artifact-${id}`,
    });
  assert.equal(isCapabilityAvailableForConfiguration(capability), false);
  const published = publishCandidateModel(
    { capability, task: trainingTask },
    {
      recordId: `publication-${id}`,
      eventId: `event-${id}`,
      actor: "系统管理员",
      now,
    },
  );
  capability = published.capability;
  assert.equal(isCapabilityAvailableForConfiguration(capability), true);
  return {
    capability,
    sourceVideos,
    extractedItems,
    annotated,
    trainingTask,
    publication: published,
  };
}

test("target detection and action recognition complete the same new architecture with distinct products", () => {
  const objectResult = completeCapabilityPipeline(
    "object_detection",
    "cap-object-e2e",
    "绝缘手套检测",
    "绝缘手套",
  );
  const actionResult = completeCapabilityPipeline(
    "action_recognition",
    "cap-action-e2e",
    "二次验电动作识别",
    "二次验电",
  );

  assert.ok(
    objectResult.extractedItems.every(
      (item) =>
        item.id.startsWith("frame-") &&
        item.storageRef.startsWith("mock-frame://") &&
        Number.isFinite(item.sourceTimeMs),
    ),
  );
  assert.ok(
    actionResult.extractedItems.every(
      (item) =>
        item.id.startsWith("clip-") &&
        item.endMs > item.startMs &&
        item.sourceVideoId,
    ),
  );
  assert.ok(
    objectResult.trainingTask.dataSnapshot.items.every((item) =>
      Array.isArray(item.boxes),
    ),
  );
  assert.ok(
    actionResult.trainingTask.dataSnapshot.items.every(
      (item) => item.actionCategoryId && item.endMs > item.startMs,
    ),
  );

  const sop = {
    id: "sop-e2e",
    status: "已发布",
    steps: [
      {
        id: "step-object",
        expectedJudgementMode: "visual_auto",
        completionCondition: "已佩戴绝缘手套",
      },
      {
        id: "step-action",
        expectedJudgementMode: "visual_auto",
        completionCondition: "已完成二次验电",
      },
    ],
    scoreRules: [],
    safetyRules: [],
  };
  const aiConfig = {
    id: "config-e2e",
    sopId: sop.id,
    status: "pending_validation",
    logicalAreas: [],
    stepConfigs: sop.steps.map((step) => ({
      stepId: step.id,
      actualEvaluationMode: "visual_auto",
      scoreRuleTreatments: [],
      safetyRuleTreatments: [],
    })),
    judgementItems: [
      {
        id: "item-object",
        stepId: "step-object",
        name: "手套出现",
        purposes: ["completion"],
        scoreRuleIds: [],
        safetyRuleIds: [],
        combination: "all",
        conditions: [
          {
            id: "condition-object",
            capabilityId: objectResult.capability.id,
            operator: "appears",
            minTargetCount: 1,
            minDurationSeconds: 1,
            minOccurrences: 1,
          },
        ],
      },
      {
        id: "item-action",
        stepId: "step-action",
        name: "验电动作完成",
        purposes: ["completion"],
        scoreRuleIds: [],
        safetyRuleIds: [],
        combination: "all",
        conditions: [
          {
            id: "condition-action",
            capabilityId: actionResult.capability.id,
            operator: "recognized",
            minOccurrences: 1,
            withinCurrentStep: true,
          },
        ],
      },
    ],
  };
  const capabilities = [objectResult.capability, actionResult.capability];
  const evaluation = evaluateAiCapabilityConfig({
    sop,
    config: aiConfig,
    capabilities,
  });
  assert.equal(evaluation.ready, true, evaluation.issues.join("；"));

  const workstation = {
    id: "w1",
    status: "可入场",
    aiBaseConfig: { primaryCameraId: "cam-1", edgeDeviceId: "edge-1" },
  };
  const devices = [
    {
      id: "cam-1",
      workstationId: "w1",
      type: "全景摄像头",
      status: "在线",
      streamStatus: "可用",
    },
    {
      id: "edge-1",
      workstationId: "w1",
      type: "边缘工作站",
      status: "在线",
    },
  ];
  const workstationConfig = createSopWorkstationAiConfig({
    id: "sop-workstation-e2e",
    aiConfig,
    workstation,
    now,
  });
  const checks = checkSopWorkstationAiConfig({
    config: workstationConfig,
    aiConfig,
    aiConfigReady: evaluation.ready,
    workstation,
    devices,
    capabilities,
  });
  assert.equal(checks.ready, true, checks.issues.join("；"));
  const cases = createDefaultValidationCases(
    aiConfig,
    (scenario, index) => `case-${scenario}-${index}`,
  ).map((item) => ({
    ...item,
    actualResult: "现场结果与预期一致",
    result: "passed",
  }));
  assert.equal(
    evaluateValidationCompletion({ aiConfig, cases, checks }).passed,
    true,
  );
  const runtime = deriveSopWorkstationRuntimeStatus({
    config: {
      ...workstationConfig,
      validationStatus: "passed",
      enableStatus: "enabled",
    },
    checks,
    readiness: checks.readiness,
  });
  assert.equal(runtime.runnable, true);
});
