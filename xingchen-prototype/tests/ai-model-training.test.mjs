import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceTrainingTask,
  assertTrainingCanStart,
  cancelTrainingTask,
  capabilityPatchAfterTrainingTask,
  createTrainingTask,
  failTrainingTask,
  retryTrainingTask,
  validateTrainingParams,
} from "../src/aiModelTrainingRules.js";

const capability = {
  id: "cap-1",
  name: "手套检测",
  type: "object_detection",
  status: "待训练",
  currentModelStatus: "未训练",
};
const categories = [
  { id: "cat-glove", capabilityId: "cap-1", name: "绝缘手套" },
];
const candidates = ["train", "validation", "test"].map((split, index) => ({
  id: `frame-${index}`,
  sourceVideoId: `video-${index}`,
  sourceTimeMs: index * 1000,
  storageRef: `mock://${index}`,
  annotationStatus: "completed",
  boxes: [{ categoryId: "cat-glove", x: 0.1, y: 0.2, width: 0.3, height: 0.4 }],
  split,
}));
const groups = candidates.map((item) => ({
  split: item.split,
  items: [item],
}));
const readiness = { ready: true, blockers: [] };

function makeTask(overrides = {}) {
  return createTrainingTask(
    {
      capability: { ...capability, ...overrides.capability },
      readiness,
      candidates,
      groups,
      categories,
      params: {},
      tasks: [],
    },
    { id: overrides.id || "task-1", now: "2026-09-25 10:00" },
  );
}

test("训练前会重新检查数据就绪状态", () => {
  assert.throws(
    () =>
      assertTrainingCanStart({
        capability,
        readiness: { ready: false, blockers: ["测试集没有数据。"] },
        tasks: [],
      }),
    /测试集没有数据/,
  );
});

test("同一能力不能同时创建两个进行中的训练任务", () => {
  assert.throws(
    () =>
      assertTrainingCanStart({
        capability,
        readiness,
        tasks: [{ capabilityId: "cap-1", status: "validating" }],
      }),
    /进行中的训练任务/,
  );
});

test("创建任务会冻结数据、标注、类别和参数快照", () => {
  const task = makeTask();
  candidates[0].boxes[0].x = 0.7;
  categories[0].name = "已改名";
  assert.deepEqual(task.dataSnapshot.trainItemIds, ["frame-0"]);
  assert.equal(task.dataSnapshot.items[0].boxes[0].x, 0.1);
  assert.equal(task.dataSnapshot.categories[0].name, "绝缘手套");
  assert.equal(task.trainingParams.baseModel, "standard");
});

test("目标检测和动作识别仅接受各自训练参数", () => {
  assert.equal(
    validateTrainingParams(capability, { imageSize: 512 }).imageSize,
    512,
  );
  assert.throws(
    () => validateTrainingParams(capability, { epochs: 0 }),
    /训练轮数/,
  );
  const action = validateTrainingParams(
    { ...capability, type: "action_recognition" },
    { baseModel: "short_action", clipSampleLength: 32 },
  );
  assert.equal(action.clipSampleLength, 32);
  assert.equal("imageSize" in action, false);
});

test("任务按训练、验证、测试顺序完成并生成候选模型", () => {
  let task = makeTask();
  task = advanceTrainingTask(task, { now: "10:01" });
  assert.equal(task.status, "training");
  task = advanceTrainingTask(task, { now: "10:02" });
  assert.equal(task.status, "validating");
  task = advanceTrainingTask(task, { now: "10:03" });
  assert.equal(task.status, "testing");
  task = advanceTrainingTask(task, {
    now: "10:04",
    modelArtifactId: "artifact-1",
  });
  assert.equal(task.status, "completed");
  assert.equal(task.modelArtifactId, "artifact-1");
  assert.equal(task.result.testSampleCount, 1);
});

test("失败任务保留原因且重试生成新任务并复用原快照", () => {
  const failed = failTrainingTask(makeTask(), "训练节点断开", { now: "10:02" });
  const retried = retryTrainingTask(failed, [failed], {
    id: "task-2",
    now: "10:03",
  });
  assert.equal(failed.failureReason, "训练节点断开");
  assert.equal(retried.id, "task-2");
  assert.equal(retried.retriedFromTaskId, failed.id);
  assert.deepEqual(retried.dataSnapshot, failed.dataSnapshot);
});

test("仅待开始或训练中的任务可以取消", () => {
  assert.equal(cancelTrainingTask(makeTask()).status, "canceled");
  assert.throws(
    () => cancelTrainingTask({ ...makeTask(), status: "validating" }),
    /仅待开始或训练中/,
  );
});

test("已发布能力重训期间及完成后均保留已发布模型", () => {
  const published = {
    ...capability,
    status: "已发布",
    currentModelStatus: "已发布",
  };
  let task = makeTask({ capability: published });
  let patch = capabilityPatchAfterTrainingTask(published, task);
  assert.equal(patch.status, "已发布");
  for (let index = 0; index < 4; index += 1) task = advanceTrainingTask(task);
  patch = capabilityPatchAfterTrainingTask(published, task);
  assert.equal(patch.currentModelStatus, "已发布");
  assert.equal(patch.candidateTrainingTaskId, task.id);
});

test("未发布能力训练成功进入待发布，失败回到待训练", () => {
  const running = makeTask();
  assert.equal(
    capabilityPatchAfterTrainingTask(capability, running).status,
    "训练中",
  );
  const failed = failTrainingTask(running, "失败");
  assert.equal(
    capabilityPatchAfterTrainingTask(capability, failed).status,
    "待训练",
  );
  let completed = running;
  for (let index = 0; index < 4; index += 1)
    completed = advanceTrainingTask(completed);
  assert.equal(
    capabilityPatchAfterTrainingTask(capability, completed).status,
    "待发布",
  );
});
