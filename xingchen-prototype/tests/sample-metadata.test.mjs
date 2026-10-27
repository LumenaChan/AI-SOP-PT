import assert from "node:assert/strict";
import test from "node:test";
import { sourceMetadataChanged, invalidateTrainingDataPreparation, updateAiSourceVideo } from "../src/aiVideoRules.js";
import { createEnhancementActions } from "../src/enhancementStore.js";
import { collectTrainingCandidates, groupTrainingCandidates, buildTrainingReadiness } from "../src/aiTrainingDataRules.js";

test("only capture metadata changes invalidate prepared data, retaining assignments and other capabilities", () => {
  const original = { id: "v", capabilityId: "c", displayName: "视频", dataCategory: "normal", sourceType: "standard_demo", sampleUse: "development", sourceGroupId: "g", participantId: "p" };
  const renamed = updateAiSourceVideo(original, { ...original, displayName: "视频新名称" }, "now");
  assert.equal(sourceMetadataChanged(original, renamed), false);
  for (const field of ["sourceGroupId", "participantId", "captureBatch", "sampleUse", "sampleType", "captureConditions"]) {
    const updated = updateAiSourceVideo(original, { ...original, [field]: field === "sampleUse" ? "sealed_test" : "changed" }, "now");
    assert.equal(sourceMetadataChanged(original, updated), true, field);
  }
  const configs = [{ capabilityId: "c", readinessStatus: "ready", preparedAt: "before", assignments: [{ sourceVideoId: "v", split: "train" }] }, { capabilityId: "other", readinessStatus: "ready", preparedAt: "before" }];
  const updated = invalidateTrainingDataPreparation(configs, "c");
  assert.equal(updated[0].readinessStatus, "pending");
  assert.equal(updated[0].preparedAt, "");
  assert.deepEqual(updated[0].assignments, configs[0].assignments);
  assert.deepEqual(updated[1], configs[1]);
  assert.equal(configs[0].readinessStatus, "ready");
});

test("sample type/visibility edits preserve labels and source properties and invalidate preparation", () => {
  const original = { aiFrames: [{ id: "f", capabilityId: "c", sourceVideoId: "v", sampleType: "standard", boxes: [{ id: "box" }] }], aiSourceVideos: [{ id: "v", capabilityId: "c", sampleUse: "sealed_test" }], aiTrainingDataConfigs: [{ capabilityId: "c", readinessStatus: "ready", preparedAt: "before" }], aiTrainingTasks: [{ id: "task", snapshot: { sampleType: "standard" } }], auditLogs: [] };
  let data = structuredClone(original);
  const actions = createEnhancementActions({ setData(fn) { data = fn(data); }, now: () => "now", makeId: () => "audit" });
  actions.updateSampleMetadata("frames", "f", { sampleType: "uncertain", visibility: "occluded" });
  assert.equal(data.aiFrames[0].sampleType, "uncertain");
  assert.equal(data.aiFrames[0].visibility, "occluded");
  assert.deepEqual(data.aiFrames[0].boxes, original.aiFrames[0].boxes);
  assert.deepEqual(data.aiSourceVideos, original.aiSourceVideos);
  assert.deepEqual(data.aiTrainingTasks, original.aiTrainingTasks);
  assert.equal(data.aiTrainingDataConfigs[0].readinessStatus, "pending");
  assert.throws(() => actions.updateSampleMetadata("video", "v", { sampleUse: "development" }), /封存/);
  assert.throws(() => updateAiSourceVideo({ ...original.aiSourceVideos[0], displayName: "视频", dataCategory: "normal", sourceType: "standard_demo" }, { displayName: "视频", dataCategory: "normal", sourceType: "standard_demo", sampleUse: "development" }, "now"), /封存/);
  assert.equal(data.aiSourceVideos[0].sampleUse, "sealed_test");
});

test("new training candidates use current source grouping and participant without rewriting old samples", () => {
  const capability = { id: "c", type: "object_detection" };
  const sourceVideos = [{ id: "v", capabilityId: "c", sourceGroupId: "current-group", participantId: "current-person", sampleUse: "sealed_test" }];
  const frame = { id: "f", capabilityId: "c", sourceVideoId: "v", sourceGroupId: "old-group", participantId: "old-person", samplePurpose: "development", manualCleaningStatus: "kept", annotationStatus: "completed", noTargetConfirmed: true, sampleType: "uncertain", visibility: "occluded" };
  const { candidates } = collectTrainingCandidates({ capability, items: [frame], sourceVideos, categories: [] });
  assert.equal(candidates[0].sourceGroupId, "current-group");
  assert.equal(candidates[0].participantId, "current-person");
  assert.equal(candidates[0].samplePurpose, "sealed_test");
  assert.equal(candidates[0].sampleType, "uncertain");
  assert.equal(candidates[0].visibility, "occluded");
  assert.equal(frame.sourceGroupId, "old-group");
  const groups = groupTrainingCandidates({ candidates, sourceVideos, categories: [], capability, config: { sourceAssignments: { v: { split: "train", itemIds: ["f"] } } } });
  const readiness = buildTrainingReadiness({ capability, candidates, groups, categories: [] });
  assert.equal(groups[0].split, "unassigned");
  assert.equal(readiness.checks.allAssigned, false);
  assert.equal(readiness.checks.sealedTestProtected, true);
});
