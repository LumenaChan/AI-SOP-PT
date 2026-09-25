import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TRAINING_RATIOS,
  assignSourceGroup,
  autoAssignSourceGroups,
  buildTrainingReadiness,
  collectTrainingCandidates,
  groupTrainingCandidates,
  summarizeTrainingData,
  targetCategoryIdsFor,
  trainingCategoryDistribution,
  validateTrainingRatios,
} from "../src/aiTrainingDataRules.js";

const objectCapability = { id: "cap-object", type: "object_detection" };
const actionCapability = { id: "cap-action", type: "action_recognition" };
const objectCategories = [
  { id: "cat-glove", capabilityId: "cap-object", name: "绝缘手套" },
  { id: "cat-damage", capabilityId: "cap-object", name: "破损" },
];
const actionCategories = [
  { id: "cat-action", capabilityId: "cap-action", name: "二次验电" },
  {
    id: "cat-background",
    capabilityId: "cap-action",
    name: "背景/非目标动作",
    isBackground: true,
  },
];

function video(id, capabilityId = "cap-object") {
  return { id, capabilityId, duration: "00:30", displayName: id };
}

function frame(id, sourceVideoId, patch = {}) {
  return {
    id,
    capabilityId: "cap-object",
    sourceVideoId,
    generationStatus: "success",
    manualCleaningStatus: "kept",
    annotationStatus: "completed",
    boxes: [
      {
        id: `box-${id}`,
        categoryId: "cat-glove",
        x: 0.1,
        y: 0.1,
        width: 0.3,
        height: 0.4,
      },
    ],
    ...patch,
  };
}

function clip(id, sourceVideoId, patch = {}) {
  return {
    id,
    capabilityId: "cap-action",
    sourceVideoId,
    generationStatus: "success",
    manualCleaningStatus: "kept",
    annotationStatus: "completed",
    actionCategoryId: "cat-action",
    refinedStartMs: 1000,
    refinedEndMs: 4000,
    ...patch,
  };
}

test("candidate pool only admits kept, completed and valid object annotations", () => {
  const sourceVideos = [video("v1")];
  const result = collectTrainingCandidates({
    capability: objectCapability,
    sourceVideos,
    categories: objectCategories,
    items: [
      frame("valid", "v1"),
      frame("pending", "v1", { annotationStatus: "not_started" }),
      frame("rejected", "v1", { manualCleaningStatus: "rejected" }),
      frame("broken", "v1", { fileStatus: "corrupt" }),
      frame("bad-box", "v1", {
        boxes: [{ categoryId: "cat-glove", x: 0, y: 0, width: 0, height: 1 }],
      }),
      frame("negative", "v1", { boxes: [], noTargetConfirmed: true }),
    ],
  });
  assert.deepEqual(
    result.candidates.map((item) => item.id),
    ["valid", "negative"],
  );
  assert.equal(result.unavailable.length, 4);
});

test("action candidates require one valid category and legal refined range", () => {
  const sourceVideos = [video("av1", "cap-action")];
  const result = collectTrainingCandidates({
    capability: actionCapability,
    sourceVideos,
    categories: actionCategories,
    items: [
      clip("valid", "av1"),
      clip("missing-label", "av1", { actionCategoryId: "" }),
      clip("bad-range", "av1", { refinedStartMs: 5000, refinedEndMs: 3000 }),
      clip("past-source", "av1", { refinedEndMs: 31000 }),
    ],
  });
  assert.deepEqual(
    result.candidates.map((item) => item.id),
    ["valid"],
  );
  assert.equal(result.unavailable.length, 3);
});

test("ratios default to 80/10/10 and require positive values totaling 100", () => {
  assert.deepEqual(
    validateTrainingRatios(DEFAULT_TRAINING_RATIOS),
    DEFAULT_TRAINING_RATIOS,
  );
  assert.throws(
    () => validateTrainingRatios({ train: 80, validation: 20, test: 10 }),
    /100/,
  );
  assert.throws(
    () => validateTrainingRatios({ train: 90, validation: 10, test: 0 }),
    /大于0/,
  );
});

test("automatic split keeps every source video in exactly one collection", () => {
  const candidates = [
    frame("f1", "v1"),
    frame("f2", "v1"),
    frame("f3", "v2"),
    frame("f4", "v3"),
    frame("f5", "v4"),
  ];
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos: ["v1", "v2", "v3", "v4"].map((id) => video(id)),
    categories: objectCategories,
    capability: objectCapability,
    config: {},
  });
  const assignments = autoAssignSourceGroups(groups, DEFAULT_TRAINING_RATIOS, [
    "cat-glove",
  ]);
  assert.equal(Object.keys(assignments).length, 4);
  assert.deepEqual(
    new Set(Object.values(assignments).map((item) => item.split)),
    new Set(["train", "validation", "test"]),
  );
  assert.ok(assignments.v1.itemIds.includes("f1"));
  assert.ok(assignments.v1.itemIds.includes("f2"));
});

test("manual adjustment moves an entire source group instead of one item", () => {
  const group = {
    sourceVideoId: "v1",
    itemIds: ["f1", "f2", "f3"],
  };
  const updated = assignSourceGroup({}, group, "validation");
  assert.deepEqual(updated.sourceAssignments.v1, {
    split: "validation",
    itemIds: ["f1", "f2", "f3"],
  });
  assert.throws(
    () => assignSourceGroup({}, { itemIds: ["f1"] }, "test"),
    /数据组不存在/,
  );
});

test("new annotated items stay unassigned and never silently join an old split", () => {
  const candidates = [frame("f1", "v1"), frame("f-new", "v1")];
  const [group] = groupTrainingCandidates({
    candidates,
    sourceVideos: [video("v1")],
    categories: objectCategories,
    capability: objectCapability,
    config: {
      sourceAssignments: { v1: { split: "train", itemIds: ["f1"] } },
    },
  });
  assert.equal(group.split, "unassigned");
  assert.equal(group.includesNewData, true);
});

test("object distribution counts images, boxes and no-target images", () => {
  const candidates = [
    frame("f1", "v1"),
    frame("f2", "v2", {
      boxes: [
        { categoryId: "cat-glove", x: 0, y: 0, width: 0.2, height: 0.2 },
        { categoryId: "cat-glove", x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
      ],
    }),
    frame("f3", "v3", { boxes: [], noTargetConfirmed: true }),
  ];
  const config = {
    sourceAssignments: {
      v1: { split: "train", itemIds: ["f1"] },
      v2: { split: "validation", itemIds: ["f2"] },
      v3: { split: "test", itemIds: ["f3"] },
    },
  };
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos: ["v1", "v2", "v3"].map((id) => video(id)),
    categories: objectCategories,
    capability: objectCapability,
    config,
  });
  const distribution = trainingCategoryDistribution({
    capability: objectCapability,
    candidates,
    groups,
    categories: objectCategories,
  });
  assert.equal(distribution.rows[0].itemCount, 2);
  assert.equal(distribution.rows[0].boxCount, 3);
  assert.equal(distribution.noTargetItemCount, 1);
});

test("action distribution counts each final action label once", () => {
  const candidates = [
    clip("c1", "av1"),
    clip("c2", "av2", { actionCategoryId: "cat-background" }),
  ];
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos: [video("av1", "cap-action"), video("av2", "cap-action")],
    categories: actionCategories,
    capability: actionCapability,
    config: {
      sourceAssignments: {
        av1: { split: "train", itemIds: ["c1"] },
        av2: { split: "validation", itemIds: ["c2"] },
      },
    },
  });
  const distribution = trainingCategoryDistribution({
    capability: actionCapability,
    candidates,
    groups,
    categories: actionCategories,
  });
  assert.deepEqual(
    distribution.rows.map((row) => row.itemCount),
    [1, 1],
  );
});

test("readiness blocks empty sets and missing target classes in validation or test", () => {
  const candidates = [frame("f1", "v1"), frame("f2", "v2"), frame("f3", "v3")];
  const sourceVideos = ["v1", "v2", "v3"].map((id) => video(id));
  const config = {
    sourceAssignments: {
      v1: { split: "train", itemIds: ["f1"] },
      v2: { split: "validation", itemIds: ["f2"] },
      v3: { split: "train", itemIds: ["f3"] },
    },
    lastSavedCandidateIds: candidates.map((item) => item.id),
  };
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos,
    categories: objectCategories,
    capability: objectCapability,
    config,
  });
  const readiness = buildTrainingReadiness({
    capability: objectCapability,
    candidates,
    groups,
    categories: objectCategories,
    config,
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.some((item) => item.includes("测试集没有数据")));
  assert.ok(readiness.blockers.some((item) => item.includes("测试集缺少")));
});

test("readiness passes when all splits contain the main category and saved data is current", () => {
  const candidates = [frame("f1", "v1"), frame("f2", "v2"), frame("f3", "v3")];
  const config = {
    sourceAssignments: {
      v1: { split: "train", itemIds: ["f1"] },
      v2: { split: "validation", itemIds: ["f2"] },
      v3: { split: "test", itemIds: ["f3"] },
    },
    lastSavedCandidateIds: candidates.map((item) => item.id),
  };
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos: ["v1", "v2", "v3"].map((id) => video(id)),
    categories: objectCategories,
    capability: objectCapability,
    config,
  });
  const readiness = buildTrainingReadiness({
    capability: objectCapability,
    candidates,
    groups,
    categories: objectCategories,
    config,
  });
  assert.equal(readiness.ready, true);
  assert.equal(
    targetCategoryIdsFor(objectCapability, candidates, objectCategories).length,
    1,
  );
  assert.deepEqual(summarizeTrainingData(candidates, groups, 2), {
    candidateCount: 3,
    assignedCount: 3,
    unavailableCount: 2,
    sourceVideoCount: 3,
    train: 1,
    validation: 1,
    test: 1,
    unassigned: 0,
  });
});

test("upstream candidate changes require saving the current split again", () => {
  const candidates = [frame("f1", "v1"), frame("f2", "v2"), frame("f3", "v3")];
  const config = {
    sourceAssignments: {
      v1: { split: "train", itemIds: ["f1"] },
      v2: { split: "validation", itemIds: ["f2"] },
      v3: { split: "test", itemIds: ["f3"] },
    },
    lastSavedCandidateIds: ["f1", "f2", "removed-item"],
  };
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos: ["v1", "v2", "v3"].map((id) => video(id)),
    categories: objectCategories,
    capability: objectCapability,
    config,
  });
  const readiness = buildTrainingReadiness({
    capability: objectCapability,
    candidates,
    groups,
    categories: objectCategories,
    config,
  });
  assert.equal(readiness.dataChanged, true);
  assert.ok(readiness.blockers.some((item) => item.includes("已发生变化")));
});
