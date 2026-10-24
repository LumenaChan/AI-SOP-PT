import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { migrateEnhancementData } from "../src/enhancementDataRules.js";
import {
  createPreannotationTask,
  finishPreannotationDemo,
  validateSuggestion,
  confirmSuggestionSaved,
} from "../src/preannotationRules.js";
import {
  saveFrameAnnotation,
  saveClipAnnotation,
} from "../src/aiAnnotationRules.js";
import { collectTrainingCandidates } from "../src/aiTrainingDataRules.js";
import { applyDefaultPassPolicy } from "../src/domainRules.js";
import { finalizeSubmittedStep } from "../src/visualEvaluationRules.js";
const raw = JSON.parse(
  readFileSync(
    new URL("../src/data/currentPrototypeData.json", import.meta.url),
  ),
);
const now = "2026-10-15 12:10";

for (const [capabilityId, kind] of [
  ["cap-demo-glove-20261015", "frames"],
  ["cap-demo-meter-20261015", "clips"],
]) {
  test("演示" + kind + "预标注采用后能保存正式标注，保留原ID与类别", () => {
    const data = migrateEnhancementData(structuredClone(raw)),
      items = (kind === "frames" ? data.aiFrames : data.aiClips).filter(
        (x) => x.capabilityId === capabilityId,
      ),
      categories = data.aiAnnotationCategories.filter(
        (x) => x.capabilityId === capabilityId,
      );
    const task = finishPreannotationDemo(
      createPreannotationTask({
        items,
        sourceVideos: data.aiSourceVideos,
        categories,
        capabilityId,
        id: "task-save-" + kind,
        now,
      }),
      { items, sourceVideos: data.aiSourceVideos, categories, now },
    );
    const suggestion = task.suggestions.find(
        (x) => x.status === "pending_confirmation",
      ),
      item = items.find((x) => x.id === suggestion.itemId),
      source = data.aiSourceVideos.find((x) => x.id === item.sourceVideoId);
    validateSuggestion(suggestion, item, source, categories);
    const saved =
      kind === "frames"
        ? saveFrameAnnotation(item, { boxes: suggestion.boxes }, categories, {
            now,
            actor: "管理员",
            boxId: () => "saved-box",
          })
        : saveClipAnnotation(item, suggestion, categories, source, {
            now,
            actor: "管理员",
          });
    assert.equal(saved.annotationStatus, "completed");
    assert.equal(saved.id, item.id);
    assert.equal(item.annotationStatus, "not_started");
    const candidates = collectTrainingCandidates({
      capability: data.aiCapabilities.find((x) => x.id === capabilityId),
      items: [saved],
      sourceVideos: data.aiSourceVideos,
      categories,
    });
    assert.deepEqual(
      candidates.candidates.map((x) => x.id),
      [item.id],
    );
    assert.equal(candidates.unavailable.length, 0);
    data.aiPreannotationTasks = [task];
    assert.equal(
      confirmSuggestionSaved(
        data,
        { taskId: task.id },
        item,
        source,
        categories,
        now,
      )[0].suggestions.find((x) => x.itemId === item.id).status,
      "adopted",
    );
  });
}

function proposalFixture() {
  const item = {
    id: "clip",
    capabilityId: "cap",
    sourceVideoId: "video",
    manualCleaningStatus: "kept",
    annotationStatus: "not_started",
    actionCategoryId: "action",
    refinedStartMs: 0,
    refinedEndMs: 5000,
    startMs: 0,
    endMs: 5000,
  };
  const source = { id: "video", durationMs: 10000 };
  const categories = [
    {
      id: "action",
      capabilityId: "cap",
      type: "action",
      name: "测量",
      isBackground: false,
    },
  ];
  const task = finishPreannotationDemo(
    createPreannotationTask({
      items: [item],
      sourceVideos: [source],
      categories,
      capabilityId: "cap",
      id: "task",
      now,
    }),
    { items: [item], sourceVideos: [source], categories, now },
  );
  return { item, source, categories, suggestion: task.suggestions[0] };
}
test("另一处已完成标注后，旧建议不能再覆盖，即使原值和分钟时间戳未变化", () => {
  const { item, source, categories, suggestion } = proposalFixture();
  assert.throws(
    () =>
      validateSuggestion(
        suggestion,
        { ...item, annotationStatus: "completed" },
        source,
        categories,
      ),
    /过期|完成/,
  );
});
test("缺失或非有限的动作起止值不能作为可采用建议", () => {
  const { item, source, categories, suggestion } = proposalFixture();
  for (const value of [undefined, NaN, Infinity]) {
    assert.throws(
      () =>
        validateSuggestion(
          { ...suggestion, refinedStartMs: value },
          item,
          source,
          categories,
        ),
      /时间|范围/,
    );
    assert.throws(
      () =>
        validateSuggestion(
          { ...suggestion, refinedEndMs: value },
          item,
          source,
          categories,
        ),
      /时间|范围/,
    );
  }
});
const active = () => ({
  id: "step",
  state: "active",
  executionState: "active",
  evidenceSemantics: "observations_v1",
  maxScore: 100,
  score: 95,
  rawScore: 100,
  effectiveScore: 95,
  completionResult: "uncertain",
  observationWindow: { status: "open" },
  reviewStatus: "无需复核",
});
const applied = [
  { id: "application", stepId: "step", status: "applied", appliedDeduction: 5 },
];

test("保分处理仅豁免缺证，不能清掉独立评分证据已确认的扣分", () => {
  const updated = applyDefaultPassPolicy(
    { ...active(), aiDecision: "uncertain" },
    { scoringApplications: applied },
  );
  assert.equal(updated.score, 95);
  assert.equal(updated.state, "active");
  assert.equal(updated.aiEvidenceState, "unknown");
});
test("交卷保留有效扣分，教师结束与学生提交分别留痕", () => {
  const submitted = finalizeSubmittedStep(active(), now, {
    scoringApplications: applied,
  });
  assert.equal(submitted.score, 95);
  assert.equal(submitted.executionState, "closed");
  assert.equal(submitted.completionSource, "student");
  const teacherEnded = finalizeSubmittedStep(active(), now, {
    scoringApplications: applied,
    completionSource: "teacher_end",
  });
  assert.equal(teacherEnded.score, 95);
  assert.equal(teacherEnded.completionSource, "teacher_end");
  assert.match(teacherEnded.observationWindow.closeReason, /教师/);
});
test("待教师复核的评分证据不会被未知保分或提交改成普通抽查", () => {
  const pending = {
    ...active(),
    score: 100,
    effectiveScore: 100,
    reviewStatus: "待复核",
    scoreDisposition: { status: "pending", reason: "规则证据待确认" },
  };
  const uncertain = applyDefaultPassPolicy(
    { ...pending, aiDecision: "uncertain" },
    {
      scoringApplications: [
        { ...applied[0], status: "pending_review", appliedDeduction: 0 },
      ],
    },
  );
  assert.equal(uncertain.reviewStatus, "待复核");
  assert.equal(finalizeSubmittedStep(pending, now).reviewStatus, "待复核");
});

test("已有迁移标记的工作数据仍修复缺失类别类型，保留原标注与标识", () => {
  const input = structuredClone(raw);
  const ids = input.aiAnnotationCategories.map((x) => x.id);
  for (const category of input.aiAnnotationCategories) delete category.type;
  const before = structuredClone({
    frames: input.aiFrames,
    clips: input.aiClips,
    sessions: input.sessions,
  });
  const updated = migrateEnhancementData(input);
  assert.deepEqual(
    updated.aiAnnotationCategories.map((x) => x.id),
    ids,
  );
  assert.ok(
    updated.aiAnnotationCategories.every((x) =>
      ["object", "action"].includes(x.type),
    ),
  );
  assert.deepEqual(
    {
      frames: updated.aiFrames,
      clips: updated.aiClips,
      sessions: updated.sessions,
    },
    before,
  );
});
test("已更正、取消、其他步骤和重复评分记录按有效事实计算", () => {
  const records = [
    { ...applied[0], status: "cancelled" },
    {
      id: "corrected",
      stepId: "step",
      status: "corrected",
      appliedDeduction: 2,
    },
    { id: "other", stepId: "another", status: "applied", appliedDeduction: 50 },
  ];
  const updated = finalizeSubmittedStep(active(), now, {
    scoringApplications: [...records, records[1]],
  });
  assert.equal(updated.score, 98);
  assert.deepEqual(updated.scoreEvidenceApplicationIds, ["corrected"]);
  assert.equal(
    finalizeSubmittedStep(active(), now, { scoringApplications: [records[0]] })
      .score,
    100,
  );
});
test("评分待复核的事实优先于过时的无需复核文案", () => {
  const pending = { ...active(), scoreDisposition: { status: "pending" } };
  assert.equal(finalizeSubmittedStep(pending, now).reviewStatus, "待复核");
  assert.equal(
    applyDefaultPassPolicy({ ...pending, aiDecision: "uncertain" })
      .reviewStatus,
    "待复核",
  );
});
test("手动目标框保存拒绝非有限坐标，避免保存后成为空值", () => {
  const item = {
    id: "frame",
    capabilityId: "cap",
    manualCleaningStatus: "kept",
  };
  const categories = [{ id: "object", capabilityId: "cap", type: "object" }];
  for (const bad of [undefined, NaN, Infinity, "invalid"]) {
    assert.throws(
      () =>
        saveFrameAnnotation(
          item,
          {
            boxes: [
              { categoryId: "object", x: bad, y: 0, width: 0.5, height: 0.5 },
            ],
          },
          categories,
          { now, actor: "管理员", boxId: () => "box" },
        ),
      /数值/,
    );
  }
});
