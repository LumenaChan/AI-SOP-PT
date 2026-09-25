import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CLIP_CLEANING_RULES,
  DEFAULT_IMAGE_CLEANING_RULES,
  buildAutoCleaningTask,
  restoreAutoRejectedItems,
  summarizeCleaning,
} from "../src/aiCleaningRules.js";

const meta = { taskId: "clean-task-1", actor: "管理员", now: "2026-09-25 09:00" };

function frame(id, sourceVideoId, sourceTimeMs, qualitySignals = {}, patch = {}) {
  return {
    id,
    capabilityId: "cap-a",
    sourceVideoId,
    sourceTimeMs,
    width: 1920,
    height: 1080,
    storageRef: `mock-frame://${id}`,
    qualitySignals,
    ...patch,
  };
}

function clip(id, sourceVideoId, startMs, endMs, qualitySignals = {}, patch = {}) {
  return {
    id,
    capabilityId: "cap-action",
    sourceVideoId,
    startMs,
    endMs,
    durationMs: endMs - startMs,
    storageRef: `mock-clip://${id}`,
    qualitySignals,
    ...patch,
  };
}

test("image cleaning detects explainable quality reasons and multiple reasons", () => {
  const items = [
    frame("f1", "v1", 1000, { clarity: 0.8, brightness: 0.5, signature: "a" }),
    frame("f2", "v1", 2000, {
      clarity: 0.1,
      brightness: 0.05,
      blackRatio: 0.96,
      signature: "a",
    }),
    frame("f3", "v1", 3000, { clarity: 0.8, brightness: 0.97, signature: "b" }, { width: 320 }),
    frame("f4", "v2", 1000, { clarity: 0.8, brightness: 0.5, signature: "a", corrupted: true }),
  ];
  const result = buildAutoCleaningTask(
    { capabilityId: "cap-a", mode: "frames", items, rules: DEFAULT_IMAGE_CLEANING_RULES },
    meta,
  );
  assert.equal(result.task.totalCount, 4);
  assert.deepEqual(result.items[1].cleaningReasons.sort(), [
    "black_screen",
    "blur",
    "highly_similar",
    "too_dark",
  ]);
  assert.deepEqual(result.items[2].cleaningReasons.sort(), [
    "low_resolution",
    "overexposed",
  ]);
  assert.deepEqual(result.items[3].cleaningReasons, ["corrupted"]);
  assert.equal(result.items[0].autoCleaningResult, "keep");
});

test("similarity only rejects repeated frames from the same source video", () => {
  const result = buildAutoCleaningTask(
    {
      capabilityId: "cap-a",
      mode: "frames",
      rules: DEFAULT_IMAGE_CLEANING_RULES,
      items: [
        frame("f1", "v1", 1000, { clarity: 0.8, brightness: 0.5, signature: "same" }),
        frame("f2", "v1", 2000, { clarity: 0.8, brightness: 0.5, signature: "same" }),
        frame("f3", "v2", 1000, { clarity: 0.8, brightness: 0.5, signature: "same" }),
      ],
    },
    meta,
  );
  assert.deepEqual(result.items.map((item) => item.cleaningReasons), [[], ["highly_similar"], []]);
});

test("clip cleaning detects unusable ratios, short clips, overlap and long warnings", () => {
  const result = buildAutoCleaningTask(
    {
      capabilityId: "cap-action",
      mode: "clips",
      rules: DEFAULT_CLIP_CLEANING_RULES,
      items: [
        clip("c1", "v1", 0, 5000, { blackRatio: 0.02, blurRatio: 0.05 }),
        clip("c2", "v1", 1000, 5500, { blackRatio: 0.9, blurRatio: 0.9, darkRatio: 0.9 }),
        clip("c3", "v2", 0, 1000, { brightRatio: 0.9 }),
        clip("c4", "v2", 5000, 40000, {}, { storageRef: "corrupt://clip" }),
      ],
    },
    meta,
  );
  assert.ok(result.items[1].cleaningReasons.includes("highly_similar"));
  assert.ok(result.items[1].cleaningReasons.includes("black_screen"));
  assert.ok(result.items[1].cleaningReasons.includes("severe_blur"));
  assert.ok(result.items[2].cleaningReasons.includes("too_short"));
  assert.ok(result.items[2].cleaningReasons.includes("overexposed"));
  assert.deepEqual(result.items[3].cleaningWarnings, ["too_long"]);
  assert.ok(result.items[3].cleaningReasons.includes("corrupted"));
});

test("restored rejects stay kept on the next automatic cleaning run", () => {
  const first = buildAutoCleaningTask(
    {
      capabilityId: "cap-a",
      mode: "frames",
      rules: DEFAULT_IMAGE_CLEANING_RULES,
      items: [frame("f1", "v1", 1000, { clarity: 0.1, brightness: 0.5 })],
    },
    meta,
  );
  const restored = restoreAutoRejectedItems(first.items, ["f1"], {
    actor: "管理员",
    now: "2026-09-25 09:05",
  });
  assert.equal(restored[0].manualOverride, "keep");
  const rerun = buildAutoCleaningTask(
    {
      capabilityId: "cap-a",
      mode: "frames",
      rules: DEFAULT_IMAGE_CLEANING_RULES,
      items: restored,
    },
    { ...meta, taskId: "clean-task-2" },
  );
  assert.equal(rerun.items[0].autoCleaningRecommendation, "auto_reject");
  assert.equal(rerun.items[0].autoCleaningResult, "keep");
  assert.ok(rerun.items[0].cleaningReasons.includes("blur"));
});

test("cleaning rejects mixed capability data and summary counts restored items", () => {
  assert.throws(
    () =>
      buildAutoCleaningTask(
        {
          capabilityId: "cap-a",
          mode: "frames",
          rules: DEFAULT_IMAGE_CLEANING_RULES,
          items: [frame("f1", "v1", 1000), { ...frame("f2", "v1", 2000), capabilityId: "cap-b" }],
        },
        meta,
      ),
    /同一个AI能力/,
  );
  const summary = summarizeCleaning([
    { cleaningStatus: "auto_cleaned", autoCleaningResult: "keep" },
    { cleaningStatus: "auto_cleaned", autoCleaningResult: "keep", manualOverride: "keep", cleaningReasons: ["blur"] },
    { cleaningStatus: "auto_cleaned", autoCleaningResult: "auto_reject", cleaningReasons: ["blur", "too_dark"] },
    {},
  ]);
  assert.deepEqual(
    { total: summary.total, uncleaned: summary.uncleaned, keep: summary.keep, rejected: summary.rejected, restored: summary.restored },
    { total: 4, uncleaned: 1, keep: 2, rejected: 1, restored: 1 },
  );
  assert.deepEqual(summary.reasonCounts, { blur: 2, too_dark: 1 });
});
