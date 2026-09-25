import assert from "node:assert/strict";
import test from "node:test";
import {
  batchAssignActionCategory,
  batchMarkFramesNoTarget,
  createAnnotationCategory,
  defaultAnnotationCategories,
  deleteAnnotationCategory,
  saveClipAnnotation,
  saveFrameAnnotation,
  summarizeAnnotations,
  updateAnnotationCategory,
} from "../src/aiAnnotationRules.js";

const meta = {
  actor: "系统管理员",
  now: "2026-09-25 11:00",
  boxId: () => "box-new",
};
const objectCapability = {
  id: "cap-object",
  name: "绝缘手套检测",
  targetName: "绝缘手套",
  type: "object_detection",
};
const actionCapability = {
  id: "cap-action",
  name: "二次验电动作识别",
  targetName: "二次验电",
  type: "action_recognition",
};

function frame(id, patch = {}) {
  return {
    id,
    capabilityId: "cap-object",
    sourceVideoId: "video-a",
    manualCleaningStatus: "kept",
    ...patch,
  };
}

function clip(id, patch = {}) {
  return {
    id,
    capabilityId: "cap-action",
    sourceVideoId: "video-action",
    manualCleaningStatus: "kept",
    startMs: 1000,
    endMs: 5000,
    durationMs: 4000,
    ...patch,
  };
}

test("default categories come from capability semantics and action adds background", () => {
  assert.deepEqual(
    defaultAnnotationCategories(objectCapability).map((item) => item.name),
    ["绝缘手套"],
  );
  const action = defaultAnnotationCategories(actionCapability);
  assert.deepEqual(
    action.map((item) => item.name),
    ["二次验电", "背景/非目标动作"],
  );
  assert.equal(action[1].isBackground, true);
});

test("frame annotation clamps boxes and supports multiple instances", () => {
  const categories = defaultAnnotationCategories(objectCapability);
  const saved = saveFrameAnnotation(
    frame("frame-1"),
    {
      noTargetConfirmed: false,
      boxes: [
        {
          categoryId: categories[0].id,
          x: -0.1,
          y: 0.1,
          width: 0.4,
          height: 0.5,
        },
        {
          id: "box-2",
          categoryId: categories[0].id,
          x: 0.8,
          y: 0.8,
          width: 0.5,
          height: 0.5,
        },
      ],
    },
    categories,
    meta,
  );
  assert.equal(saved.annotationStatus, "completed");
  assert.equal(saved.boxes.length, 2);
  assert.deepEqual(saved.boxes[0], {
    id: "box-new",
    categoryId: categories[0].id,
    x: 0,
    y: 0.1,
    width: 0.4,
    height: 0.5,
  });
  assert.ok(Math.abs(saved.boxes[1].width - 0.2) < 1e-9);
  assert.ok(Math.abs(saved.boxes[1].height - 0.2) < 1e-9);
});

test("empty frame stays pending unless no target is explicitly confirmed", () => {
  const categories = defaultAnnotationCategories(objectCapability);
  assert.throws(
    () =>
      saveFrameAnnotation(frame("frame-1"), { boxes: [] }, categories, meta),
    /无目标/,
  );
  const saved = saveFrameAnnotation(
    frame("frame-1"),
    { boxes: [], noTargetConfirmed: true },
    categories,
    meta,
  );
  assert.equal(saved.noTargetConfirmed, true);
  assert.deepEqual(saved.boxes, []);
});

test("only manually kept data can be annotated", () => {
  const categories = defaultAnnotationCategories(objectCapability);
  assert.throws(
    () =>
      saveFrameAnnotation(
        frame("frame-1", { manualCleaningStatus: "pending" }),
        { boxes: [], noTargetConfirmed: true },
        categories,
        meta,
      ),
    /已保留/,
  );
});

test("batch no-target marks selected frames only", () => {
  const updated = batchMarkFramesNoTarget(
    [frame("f1"), frame("f2"), frame("f3")],
    ["f1", "f3"],
    meta,
  );
  assert.deepEqual(
    updated.map((item) => item.annotationStatus || "not_started"),
    ["completed", "not_started", "completed"],
  );
});

test("clip annotation assigns one action and validates refined source range", () => {
  const categories = defaultAnnotationCategories(actionCapability);
  const source = { id: "video-action", durationMs: 12000 };
  const saved = saveClipAnnotation(
    clip("clip-1"),
    {
      actionCategoryId: categories[0].id,
      refinedStartMs: 1500,
      refinedEndMs: 4500,
    },
    categories,
    source,
    meta,
  );
  assert.equal(saved.annotationStatus, "completed");
  assert.equal(saved.actionCategoryId, categories[0].id);
  assert.equal(saved.refinedStartMs, 1500);
  assert.equal(saved.refinedEndMs, 4500);
  assert.equal(saved.sourceVideoId, "video-action");
  assert.throws(
    () =>
      saveClipAnnotation(
        clip("clip-1"),
        {
          actionCategoryId: categories[0].id,
          refinedStartMs: 1500,
          refinedEndMs: 13000,
        },
        categories,
        source,
        meta,
      ),
    /不能超过原始视频时长/,
  );
});

test("batch action assignment uses the same category without changing sources", () => {
  const categories = defaultAnnotationCategories(actionCapability);
  const updated = batchAssignActionCategory(
    [clip("c1"), clip("c2")],
    ["c1", "c2"],
    categories[1].id,
    categories,
    [{ id: "video-action", durationMs: 10000 }],
    meta,
  );
  assert.ok(
    updated.every((item) => item.actionCategoryId === categories[1].id),
  );
  assert.ok(updated.every((item) => item.sourceVideoId === "video-action"));
});

test("categories are isolated, unique, editable only before use and background is protected", () => {
  let categories = [
    ...defaultAnnotationCategories(objectCapability),
    ...defaultAnnotationCategories(actionCapability),
  ];
  const created = createAnnotationCategory(
    categories,
    { capabilityId: "cap-object", type: "object", name: "护目镜" },
    { id: "category-goggles", now: meta.now },
  );
  categories = [...categories, created];
  assert.throws(
    () =>
      createAnnotationCategory(
        categories,
        { capabilityId: "cap-object", type: "object", name: "护目镜" },
        { id: "duplicate", now: meta.now },
      ),
    /同名/,
  );
  categories = updateAnnotationCategory(
    categories,
    { id: "category-goggles", name: "防护镜" },
    { frames: [], clips: [], now: meta.now },
  );
  assert.equal(
    categories.find((item) => item.id === "category-goggles").name,
    "防护镜",
  );
  assert.throws(
    () =>
      deleteAnnotationCategory(categories, "category-goggles", {
        frames: [frame("f1", { boxes: [{ categoryId: "category-goggles" }] })],
        clips: [],
      }),
    /已有 1 条标注/,
  );
  const background = categories.find((item) => item.isBackground);
  assert.throws(
    () =>
      deleteAnnotationCategory(categories, background.id, {
        frames: [],
        clips: [],
      }),
    /不能删除/,
  );
});

test("annotation summary has no review state", () => {
  assert.deepEqual(
    summarizeAnnotations([
      frame("f1", { annotationStatus: "completed" }),
      frame("f2", { annotationStatus: "not_started" }),
      frame("f3"),
    ]),
    { total: 3, pending: 2, completed: 1, completionRate: 33.3 },
  );
});
