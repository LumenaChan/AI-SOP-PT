import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDerivedItemsDeletable,
  buildFrameExtractionTask,
  buildVideoSlicingTask,
  estimateFrameExtraction,
  extractionModeForCapability,
  formatTimecode,
  mockFrameStorageRef,
  parseTimecode,
} from "../src/aiExtractionRules.js";

const videoA = {
  id: "video-a",
  capabilityId: "cap-detect",
  fileName: "a.mp4",
  displayName: "视频A",
  duration: "00:10",
  width: 1920,
  height: 1080,
  frameRate: 25,
  processingStatus: "unprocessed",
};
const videoB = {
  ...videoA,
  id: "video-b",
  fileName: "b.mp4",
  displayName: "视频B",
  duration: "00:08",
};
const frameMeta = {
  taskId: "frame-task-1",
  frameId: (index, videoId) => `frame-${videoId}-${index}`,
  now: "2026-09-24 10:00",
  actor: "系统管理员",
};
const clipMeta = {
  taskId: "slice-task-1",
  clipId: (index, videoId) => `clip-${videoId}-${index}`,
  now: "2026-09-24 10:00",
  actor: "系统管理员",
};

test("capability type determines extraction mode without a manual override", () => {
  assert.equal(extractionModeForCapability("object_detection"), "frames");
  assert.equal(extractionModeForCapability("action_recognition"), "clips");
  assert.equal(extractionModeForCapability("unknown"), "");
});

test("timecode parsing and formatting supports precise source positions", () => {
  assert.equal(parseTimecode("01:02.500"), 62.5);
  assert.equal(parseTimecode("01:01:02"), 3662);
  assert.equal(formatTimecode(62.5, true), "01:02.500");
  assert.ok(Number.isNaN(parseTimecode("bad")));
});

test("estimates interval and fps extraction with range and maximum protection", () => {
  const interval = estimateFrameExtraction([videoA], {
    samplingMode: "interval",
    sampleValue: 0.5,
    rangeMode: "custom",
    startTime: "00:02",
    endTime: "00:05",
    maxFrames: 500,
  });
  assert.equal(interval.estimatedCount, 7);
  const fps = estimateFrameExtraction([videoA], {
    samplingMode: "fps",
    sampleValue: 2,
    rangeMode: "entire",
    maxFrames: 5,
  });
  assert.equal(fps.estimatedCount, 5);
  assert.equal(fps.reachedLimitCount, 1);
  assert.throws(
    () =>
      estimateFrameExtraction([videoA], {
        samplingMode: "fps",
        sampleValue: 30,
        rangeMode: "entire",
        maxFrames: 500,
      }),
    /原始帧率/,
  );
});

test("batch extraction creates stable traceable frames and keeps sources unchanged", () => {
  const sourceSnapshot = structuredClone([videoA, videoB]);
  const result = buildFrameExtractionTask(
    {
      capabilityId: "cap-detect",
      videos: [videoA, videoB],
      parameters: {
        samplingMode: "interval",
        sampleValue: 2,
        rangeMode: "entire",
        maxFrames: 500,
      },
    },
    frameMeta,
  );
  assert.equal(result.task.status, "completed");
  assert.equal(result.frames.length, 11);
  assert.ok(result.frames.every((frame) => frame.capabilityId === "cap-detect"));
  assert.ok(result.frames.every((frame) => ["video-a", "video-b"].includes(frame.sourceVideoId)));
  assert.ok(result.frames.every((frame) => frame.taskId === "frame-task-1"));
  assert.ok(
    result.frames.every((frame) =>
      frame.storageRef.startsWith(`mock-frame://${frame.sourceVideoId}/`),
    ),
  );
  assert.deepEqual([videoA, videoB], sourceSnapshot);
});

test("each simulated frame receives an independent image storage reference", () => {
  assert.equal(mockFrameStorageRef("video-a", 2500), "mock-frame://video-a/2500");
  assert.notEqual(
    mockFrameStorageRef("video-a", 2500),
    mockFrameStorageRef("video-a", 3000),
  );
});

test("one runtime failure yields a partial task without losing successful frames", () => {
  const result = buildFrameExtractionTask(
    {
      capabilityId: "cap-detect",
      videos: [videoA, videoB],
      failedSourceVideoIds: ["video-b"],
      parameters: {
        samplingMode: "interval",
        sampleValue: 2,
        rangeMode: "entire",
        maxFrames: 500,
      },
    },
    frameMeta,
  );
  assert.equal(result.task.status, "partial_failed");
  assert.deepEqual(result.task.completedVideoIds, ["video-a"]);
  assert.equal(result.task.failures[0].sourceVideoId, "video-b");
  assert.ok(result.frames.every((frame) => frame.sourceVideoId === "video-a"));
});

test("manual slicing validates one source and a valid time range", () => {
  const result = buildVideoSlicingTask(
    {
      capabilityId: "cap-action",
      videos: [videoA],
      method: "manual",
      parameters: { startTime: "00:02", endTime: "00:06", note: "动作段" },
    },
    clipMeta,
  );
  assert.equal(result.clips.length, 1);
  assert.equal(result.clips[0].sourceVideoId, "video-a");
  assert.equal(result.clips[0].startMs, 2000);
  assert.equal(result.clips[0].endMs, 6000);
  assert.equal(result.clips[0].processingStatus, "pending_cleaning");
  const failed = buildVideoSlicingTask(
    {
      capabilityId: "cap-action",
      videos: [videoA],
      method: "manual",
      parameters: { startTime: "00:07", endTime: "00:06" },
    },
    clipMeta,
  );
  assert.equal(failed.task.status, "failed");
  assert.match(failed.task.failures[0].reason, /结束时间必须大于开始时间/);
});

test("fixed-length slicing supports overlapping windows and multiple videos", () => {
  const result = buildVideoSlicingTask(
    {
      capabilityId: "cap-action",
      videos: [videoA, videoB],
      method: "fixed_length",
      parameters: { clipLength: 4, step: 2, startTime: "", endTime: "" },
    },
    clipMeta,
  );
  assert.equal(result.task.status, "completed");
  assert.equal(result.clips.filter((item) => item.sourceVideoId === "video-a").length, 4);
  assert.equal(result.clips.filter((item) => item.sourceVideoId === "video-b").length, 3);
  assert.ok(result.clips.some((item) => item.startMs === 2000 && item.endMs === 6000));
});

test("derived results can be deleted only before downstream processing", () => {
  const pending = { id: "frame-1", processingStatus: "pending_cleaning" };
  assert.doesNotThrow(() => assertDerivedItemsDeletable([pending]));
  assert.throws(
    () => assertDerivedItemsDeletable([pending, { id: "frame-2", processingStatus: "derived" }]),
    /已进入后续数据处理/,
  );
  assert.throws(
    () =>
      assertDerivedItemsDeletable([
        {
          id: "frame-3",
          processingStatus: "pending_cleaning",
          cleaningStatus: "auto_cleaned",
        },
      ]),
    /已进入后续数据处理/,
  );
});
