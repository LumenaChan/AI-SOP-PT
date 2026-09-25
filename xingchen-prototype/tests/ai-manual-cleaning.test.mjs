import assert from "node:assert/strict";
import test from "node:test";
import {
  applyManualCleaningDecision,
  hasEnteredAnnotation,
  sortManualCleaningItems,
  summarizeManualCleaning,
} from "../src/aiManualCleaningRules.js";

const meta = { actor: "系统管理员", now: "2026-09-25 10:00" };

function item(id, patch = {}) {
  return {
    id,
    capabilityId: "cap-a",
    sourceVideoId: "video-a",
    cleaningStatus: "auto_cleaned",
    autoCleaningResult: "keep",
    manualCleaningStatus: "pending",
    ...patch,
  };
}

test("manual keep overrides an automatic rejection without deleting trace data", () => {
  const source = item("f1", {
    autoCleaningRecommendation: "auto_reject",
    autoCleaningResult: "auto_reject",
    cleaningReasons: ["blur"],
  });
  const [updated] = applyManualCleaningDecision(
    [source],
    { ids: ["f1"], decision: "kept" },
    meta,
  );
  assert.equal(updated.manualCleaningStatus, "kept");
  assert.equal(updated.autoCleaningResult, "auto_reject");
  assert.deepEqual(updated.cleaningReasons, ["blur"]);
  assert.equal(updated.sourceVideoId, "video-a");
  assert.equal(updated.manualCleanedBy, "系统管理员");
});

test("manual rejection overrides an automatic keep and requires a reason", () => {
  assert.throws(
    () =>
      applyManualCleaningDecision(
        [item("f1")],
        { ids: ["f1"], decision: "rejected", rejectionReason: "" },
        meta,
      ),
    /必须选择原因/,
  );
  const [updated] = applyManualCleaningDecision(
    [item("f1")],
    {
      ids: ["f1"],
      decision: "rejected",
      rejectionReason: "irrelevant",
      rejectionNote: "",
    },
    meta,
  );
  assert.equal(updated.manualCleaningStatus, "rejected");
  assert.equal(updated.rejectionReason, "irrelevant");
  assert.equal(updated.autoCleaningResult, "keep");
});

test("other rejection reason requires a note", () => {
  assert.throws(
    () =>
      applyManualCleaningDecision(
        [item("f1")],
        {
          ids: ["f1"],
          decision: "rejected",
          rejectionReason: "other",
          rejectionNote: " ",
        },
        meta,
      ),
    /必须填写原因说明/,
  );
});

test("batch decisions remain isolated to selected IDs", () => {
  const updated = applyManualCleaningDecision(
    [item("f1"), item("f2"), item("f3")],
    { ids: ["f1", "f3"], decision: "kept" },
    meta,
  );
  assert.deepEqual(
    updated.map((entry) => entry.manualCleaningStatus),
    ["kept", "pending", "kept"],
  );
});

test("confirmed data can be changed before annotation but is protected afterward", () => {
  const rejected = item("f1", {
    manualCleaningStatus: "rejected",
    rejectionReason: "poor_quality",
  });
  const [kept] = applyManualCleaningDecision(
    [rejected],
    { ids: ["f1"], decision: "kept" },
    meta,
  );
  assert.equal(kept.manualCleaningStatus, "kept");
  assert.equal(kept.rejectionReason, "");
  const annotated = { ...kept, annotationStatus: "in_progress" };
  assert.equal(hasEnteredAnnotation(annotated), true);
  assert.throws(
    () =>
      applyManualCleaningDecision(
        [annotated],
        {
          ids: ["f1"],
          decision: "rejected",
          rejectionReason: "duplicate",
        },
        meta,
      ),
    /已进入标注流程/,
  );
});

test("only automatically cleaned data can be manually confirmed", () => {
  assert.throws(
    () =>
      applyManualCleaningDecision(
        [item("f1", { cleaningStatus: "uncleaned" })],
        { ids: ["f1"], decision: "kept" },
        meta,
      ),
    /先完成自动清洗/,
  );
});

test("summary and default order prioritize pending automatic rejects", () => {
  const list = [
    item("kept", { manualCleaningStatus: "kept", sourceTimeMs: 4000 }),
    item("pending-keep", { autoCleaningRecommendation: "keep", sourceTimeMs: 2000 }),
    item("pending-reject", {
      autoCleaningRecommendation: "auto_reject",
      sourceTimeMs: 3000,
    }),
    item("rejected", { manualCleaningStatus: "rejected", sourceTimeMs: 1000 }),
  ];
  const summary = summarizeManualCleaning(list);
  assert.deepEqual(
    {
      total: summary.total,
      pending: summary.pending,
      kept: summary.kept,
      rejected: summary.rejected,
      confirmed: summary.confirmed,
      completionRate: summary.completionRate,
    },
    { total: 4, pending: 2, kept: 1, rejected: 1, confirmed: 2, completionRate: 50 },
  );
  assert.deepEqual(
    sortManualCleaningItems(list).map((entry) => entry.id),
    ["pending-reject", "pending-keep", "kept", "rejected"],
  );
});
