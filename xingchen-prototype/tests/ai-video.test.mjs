import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAiSourceVideosDeletable,
  batchUpdateAiSourceVideos,
  capabilityStatusAfterVideoUpload,
  createAiSourceVideos,
  potentialVideoDuplicates,
  updateAiSourceVideo,
  videoStats,
} from "../src/aiVideoRules.js";

const file = {
  fileName: "secondary-check.mp4",
  displayName: "secondary-check.mp4",
  storageRef: "blob:preview",
  mimeType: "video/mp4",
  duration: "00:42",
  width: 1920,
  height: 1080,
  fileSize: 1024,
};

const input = {
  capabilityId: "cap-a",
  files: [file],
  dataCategory: "normal",
  sourceType: "standard_demo",
  workstationId: "w1",
  capturedAt: "2026-09-24",
  note: "正面机位",
};

const meta = {
  ids: ["ai-video-1"],
  now: "2026-09-24 10:00",
  actor: "系统管理员",
};

test("creates stable source video records bound to one capability", () => {
  const [video] = createAiSourceVideos(input, [], meta);
  assert.equal(video.id, "ai-video-1");
  assert.equal(video.capabilityId, "cap-a");
  assert.equal(video.processingStatus, "unprocessed");
  assert.equal(video.fileName, "secondary-check.mp4");
  assert.equal(video.workstationId, "w1");
});

test("supports multiple files and validates required metadata and formats", () => {
  const videos = createAiSourceVideos(
    { ...input, files: [file, { ...file, fileName: "background.mov" }] },
    [],
    { ...meta, ids: ["ai-video-1", "ai-video-2"] },
  );
  assert.equal(videos.length, 2);
  assert.throws(
    () => createAiSourceVideos({ ...input, dataCategory: "" }, [], meta),
    /数据属性/,
  );
  assert.throws(
    () => createAiSourceVideos({ ...input, sourceType: "" }, [], meta),
    /数据来源/,
  );
  assert.throws(
    () =>
      createAiSourceVideos(
        { ...input, files: [{ ...file, fileName: "notes.txt" }] },
        [],
        meta,
      ),
    /不支持/,
  );
});

test("isolates videos by capability and prompts on same-name same-size uploads", () => {
  const [existing] = createAiSourceVideos(input, [], meta);
  assert.equal(potentialVideoDuplicates([file], [existing], "cap-a").length, 1);
  assert.equal(potentialVideoDuplicates([file], [existing], "cap-b").length, 0);
  assert.equal(potentialVideoDuplicates([file, file], [], "cap-a").length, 1);
  assert.throws(
    () => createAiSourceVideos(input, [existing], meta),
    /可能重复/,
  );
  assert.doesNotThrow(() =>
    createAiSourceVideos({ ...input, allowDuplicates: true }, [existing], meta),
  );
});

test("edits only business metadata and keeps source identity immutable", () => {
  const [video] = createAiSourceVideos(input, [], meta);
  const updated = updateAiSourceVideo(
    video,
    {
      displayName: "标准验电动作",
      dataCategory: "error",
      sourceType: "supplemental_capture",
      workstationId: "w2",
      capturedAt: "2026-09-25",
      note: "弱光",
      capabilityId: "cap-b",
      fileName: "changed.mp4",
    },
    "2026-09-25 10:00",
  );
  assert.equal(updated.displayName, "标准验电动作");
  assert.equal(updated.capabilityId, "cap-a");
  assert.equal(updated.fileName, "secondary-check.mp4");
  assert.equal(updated.dataCategory, "error");
});

test("batch updates selected videos without moving their capability", () => {
  const [first] = createAiSourceVideos(input, [], meta);
  const second = { ...first, id: "ai-video-2", capabilityId: "cap-b" };
  const updated = batchUpdateAiSourceVideos(
    [first, second],
    [first.id],
    { dataCategory: "background" },
    "2026-09-25 11:00",
  );
  assert.equal(updated[0].dataCategory, "background");
  assert.equal(updated[0].capabilityId, "cap-a");
  assert.equal(updated[1].dataCategory, "normal");
});

test("protects derived videos from single and batch deletion", () => {
  const [video] = createAiSourceVideos(input, [], meta);
  assert.doesNotThrow(() => assertAiSourceVideosDeletable([video]));
  assert.throws(
    () =>
      assertAiSourceVideosDeletable([
        video,
        { ...video, id: "ai-video-2", processingStatus: "derived" },
      ]),
    /已生成后续训练数据/,
  );
});

test("reports lightweight statistics for the current capability", () => {
  const [normal] = createAiSourceVideos(input, [], meta);
  const error = {
    ...normal,
    id: "ai-video-2",
    dataCategory: "error",
    processingStatus: "derived",
  };
  assert.deepEqual(videoStats([normal, error]), {
    total: 2,
    normal: 1,
    error: 1,
    background: 0,
    unprocessed: 1,
    derived: 1,
  });
  assert.deepEqual(videoStats(undefined).total, 0);
});

test("first upload advances only a draft capability to data preparation", () => {
  assert.equal(capabilityStatusAfterVideoUpload("草稿"), "数据准备中");
  assert.equal(capabilityStatusAfterVideoUpload("待训练"), "待训练");
  assert.equal(capabilityStatusAfterVideoUpload("已发布"), "已发布");
});
