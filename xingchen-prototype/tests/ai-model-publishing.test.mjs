import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicationReadiness,
  canReactivateCapabilityModel,
  getCurrentCandidateTask,
  isCapabilityAvailableForConfiguration,
  publishCandidateModel,
} from "../src/aiModelPublishingRules.js";

const capability = {
  id: "cap-1",
  name: "手套检测",
  type: "object_detection",
  status: "待发布",
  currentModelStatus: "待发布",
  referenceCount: 0,
};

function completedTask(id = "task-1", completedAt = "2026-09-25 10:00") {
  return {
    id,
    capabilityId: "cap-1",
    capabilityType: "object_detection",
    status: "completed",
    modelArtifactId: `artifact-${id}`,
    completedAt,
    validationResult: { status: "completed", sampleCount: 2 },
    dataSnapshot: {
      testItemIds: ["frame-test-1", "frame-test-2"],
      categories: [
        { id: "cat-glove", capabilityId: "cap-1", name: "绝缘手套" },
      ],
    },
    result: {
      trainingTaskId: id,
      precision: 0.91,
      recall: 0.88,
      compositeMetric: 0.895,
      testSampleCount: 2,
      perCategory: [
        {
          categoryId: "cat-glove",
          name: "绝缘手套",
          precision: 0.91,
          recall: 0.88,
        },
      ],
    },
  };
}

test("发布前检查要求完成任务、模型产物、验证结果和测试结果", () => {
  assert.equal(buildPublicationReadiness(completedTask()).ready, true);
  assert.equal(
    buildPublicationReadiness({ ...completedTask(), status: "testing" }).ready,
    false,
  );
  assert.equal(
    buildPublicationReadiness({ ...completedTask(), modelArtifactId: "" })
      .ready,
    false,
  );
  assert.equal(
    buildPublicationReadiness({ ...completedTask(), validationResult: null })
      .ready,
    false,
  );
  assert.equal(
    buildPublicationReadiness({ ...completedTask(), result: null }).ready,
    false,
  );
});

test("测试结果必须对应当前训练任务且覆盖主要类别", () => {
  const mismatched = completedTask();
  mismatched.result.trainingTaskId = "task-other";
  assert.match(
    buildPublicationReadiness(mismatched).blockers.join(""),
    /不对应/,
  );
  const missingCategory = completedTask();
  missingCategory.result.perCategory = [];
  assert.match(
    buildPublicationReadiness(missingCategory).blockers.join(""),
    /主要类别/,
  );
});

test("最新成功且未发布的训练任务成为当前候选模型", () => {
  const older = completedTask("task-old", "2026-09-24 10:00");
  const latest = completedTask("task-new", "2026-09-25 10:00");
  assert.equal(
    getCurrentCandidateTask(capability, [older, latest], []).id,
    "task-new",
  );
  assert.equal(
    getCurrentCandidateTask(
      capability,
      [older, latest],
      [{ capabilityId: "cap-1", trainingTaskId: "task-new" }],
    ).id,
    "task-old",
  );
});

test("首次发布产生唯一当前模型、清空候选并生成发布记录", () => {
  const published = publishCandidateModel(
    { capability, task: completedTask() },
    {
      recordId: "record-1",
      eventId: "event-1",
      now: "2026-09-25 11:00",
      actor: "管理员甲",
    },
  );
  assert.equal(published.capability.status, "已发布");
  assert.equal(published.capability.currentModelStatus, "已发布");
  assert.equal(published.capability.candidateTrainingTaskId, "");
  assert.equal(
    published.capability.currentPublishedModel.trainingTaskId,
    "task-1",
  );
  assert.equal(published.record.replacedExistingModel, false);
  assert.equal(published.record.publishedBy, "管理员甲");
  assert.equal(
    isCapabilityAvailableForConfiguration(published.capability),
    true,
  );
});

test("只有已发布且存在当前模型的能力可供后续配置选择", () => {
  assert.equal(isCapabilityAvailableForConfiguration(capability), false);
  assert.equal(
    isCapabilityAvailableForConfiguration({
      ...capability,
      status: "已发布",
      currentModelStatus: "已发布",
    }),
    false,
  );
});

test("重新发布替换当前模型但保留之前发布记录的追溯信息", () => {
  const current = {
    ...capability,
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: {
      trainingTaskId: "task-old",
      modelArtifactId: "artifact-old",
    },
  };
  const published = publishCandidateModel({
    capability: current,
    task: completedTask("task-new"),
    publicationRecords: [
      {
        capabilityId: "cap-1",
        trainingTaskId: "task-old",
      },
    ],
  });
  assert.equal(published.record.replacedExistingModel, true);
  assert.equal(published.record.previousTrainingTaskId, "task-old");
  assert.equal(
    published.capability.currentPublishedModel.trainingTaskId,
    "task-new",
  );
});

test("已引用能力重新发布保留引用并产生待重新验证事件", () => {
  const referenced = {
    ...capability,
    status: "已发布",
    currentModelStatus: "已发布",
    referenceCount: 2,
    referencingConfigIds: ["config-1", "config-2"],
    currentPublishedModel: {
      trainingTaskId: "task-old",
      modelArtifactId: "artifact-old",
    },
  };
  const published = publishCandidateModel({
    capability: referenced,
    task: completedTask("task-new"),
    affectedConfigIds: referenced.referencingConfigIds,
  });
  assert.deepEqual(published.capability.referencingConfigIds, [
    "config-1",
    "config-2",
  ]);
  assert.equal(published.record.affectedConfigCount, 2);
  assert.equal(published.event.validationStatus, "pending_revalidation");
});

test("同一训练任务不能重复发布", () => {
  assert.throws(
    () =>
      publishCandidateModel({
        capability,
        task: completedTask(),
        publicationRecords: [
          { capabilityId: "cap-1", trainingTaskId: "task-1" },
        ],
      }),
    /已经发布/,
  );
});

test("停用能力仅在当前已发布模型文件有效时可以重新启用", () => {
  const stopped = {
    ...capability,
    status: "已停用",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "artifact-current" },
  };
  assert.equal(canReactivateCapabilityModel(stopped), true);
  assert.equal(
    canReactivateCapabilityModel({
      ...stopped,
      currentPublishedModel: {
        modelArtifactId: "artifact-current",
        fileStatus: "missing",
      },
    }),
    false,
  );
});
