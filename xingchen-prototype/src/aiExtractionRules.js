export const EXTRACTION_TASK_STATUSES = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
  partial_failed: "部分失败",
};

export const DERIVED_DATA_STATUSES = {
  pending_cleaning: "待清洗",
  derived: "已进入后续处理",
};

export const FRAME_SAMPLING_MODES = {
  interval: "按时间间隔抽帧",
  fps: "按帧率抽帧",
};

export const CLIP_GENERATION_MODES = {
  manual: "手动切片",
  fixed_length: "定长自动切片",
};

export function extractionModeForCapability(type) {
  if (type === "object_detection") return "frames";
  if (type === "action_recognition") return "clips";
  return "";
}

export function parseTimecode(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const text = String(value || "").trim();
  if (!text) return NaN;
  const parts = text.split(":");
  if (parts.length > 3 || parts.some((part) => part === "")) return NaN;
  const numbers = parts.map(Number);
  if (numbers.some((part) => !Number.isFinite(part) || part < 0)) return NaN;
  if (numbers.length === 3)
    return numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
  if (numbers.length === 2) return numbers[0] * 60 + numbers[1];
  return numbers[0];
}

export function formatTimecode(seconds, milliseconds = false) {
  const safe = Math.max(0, Number(seconds || 0));
  const whole = Math.floor(safe);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remaining = whole % 60;
  const prefix = hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  return milliseconds
    ? `${prefix}.${String(Math.round((safe - whole) * 1000)).padStart(3, "0")}`
    : prefix;
}

function taskStatus(successCount, failureCount) {
  if (successCount && failureCount) return "partial_failed";
  if (failureCount) return "failed";
  return "completed";
}

function frameRange(video, parameters, batchSize) {
  const duration = parseTimecode(video.duration);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("无法读取视频时长，请检查原始视频是否损坏。");
  if (parameters.rangeMode !== "custom" || batchSize > 1)
    return { start: 0, end: duration };
  const start = parseTimecode(parameters.startTime);
  const end = parseTimecode(parameters.endTime);
  if (!Number.isFinite(start) || start < 0) throw new Error("开始时间无效。");
  if (!Number.isFinite(end) || end <= start)
    throw new Error("结束时间必须大于开始时间。");
  if (end > duration) throw new Error("结束时间不能超过原视频时长。");
  return { start, end };
}

export function estimateFrameExtraction(videos, parameters) {
  const list = Array.isArray(videos) ? videos : [];
  if (!list.length) throw new Error("请至少选择一个原始视频。");
  if (!Object.hasOwn(FRAME_SAMPLING_MODES, parameters?.samplingMode))
    throw new Error("请选择抽帧方式。");
  const sampleValue = Number(parameters.sampleValue);
  if (!Number.isFinite(sampleValue) || sampleValue <= 0)
    throw new Error("抽帧参数必须大于0。");
  const maxFrames = Number(parameters.maxFrames);
  if (!Number.isInteger(maxFrames) || maxFrames < 1 || maxFrames > 5000)
    throw new Error("单个视频最大抽帧数量应为1至5000张。");
  const estimates = list.map((video) => {
    const range = frameRange(video, parameters, list.length);
    if (
      parameters.samplingMode === "fps" &&
      Number(video.frameRate || 0) > 0 &&
      sampleValue > Number(video.frameRate)
    )
      throw new Error(`抽帧帧率不能超过“${video.displayName || video.fileName}”的原始帧率。`);
    const rawCount =
      parameters.samplingMode === "interval"
        ? Math.floor((range.end - range.start) / sampleValue) + 1
        : Math.floor((range.end - range.start) * sampleValue);
    return {
      sourceVideoId: video.id,
      start: range.start,
      end: range.end,
      count: Math.max(0, Math.min(rawCount, maxFrames)),
      reachedLimit: rawCount > maxFrames,
    };
  });
  return {
    videos: estimates,
    totalDuration: estimates.reduce((sum, item) => sum + item.end - item.start, 0),
    estimatedCount: estimates.reduce((sum, item) => sum + item.count, 0),
    reachedLimitCount: estimates.filter((item) => item.reachedLimit).length,
  };
}

export function buildFrameExtractionTask(input, meta) {
  const plan = estimateFrameExtraction(input.videos, input.parameters);
  const frames = [];
  const failures = [];
  const completedVideoIds = [];
  for (const estimate of plan.videos) {
    const video = input.videos.find((item) => item.id === estimate.sourceVideoId);
    try {
      if (input.failedSourceVideoIds?.includes(video.id))
        throw new Error("视频解码失败，请检查文件完整性后重试。");
      const step =
        input.parameters.samplingMode === "interval"
          ? Number(input.parameters.sampleValue)
          : 1 / Number(input.parameters.sampleValue);
      for (let index = 0; index < estimate.count; index += 1) {
        const time = Math.min(estimate.end, estimate.start + index * step);
        frames.push({
          id: meta.frameId(index, video.id),
          capabilityId: input.capabilityId,
          sourceVideoId: video.id,
          taskId: meta.taskId,
          sourceTimeMs: Math.round(time * 1000),
          fileName: `${video.id}_${formatTimecode(time, true).replaceAll(":", "m")}.jpg`,
          storageRef: "",
          width: video.width || 0,
          height: video.height || 0,
          generationStatus: "success",
          processingStatus: "pending_cleaning",
          createdAt: meta.now,
        });
      }
      completedVideoIds.push(video.id);
    } catch (reason) {
      failures.push({
        sourceVideoId: video.id,
        reason: reason instanceof Error ? reason.message : "抽帧失败。",
      });
    }
  }
  return {
    task: {
      id: meta.taskId,
      capabilityId: input.capabilityId,
      taskType: "frame_extraction",
      method: input.parameters.samplingMode,
      sourceVideoIds: input.videos.map((item) => item.id),
      parameters: { ...input.parameters },
      status: taskStatus(completedVideoIds.length, failures.length),
      progress: 100,
      completedVideoIds,
      generatedCount: frames.length,
      failures,
      createdBy: meta.actor,
      createdAt: meta.now,
      updatedAt: meta.now,
    },
    frames,
  };
}

function validateClipRange(video, start, end) {
  const duration = parseTimecode(video.duration);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("无法读取视频时长，请检查原始视频是否损坏。");
  if (!Number.isFinite(start) || start < 0) throw new Error("开始时间无效。");
  if (!Number.isFinite(end) || end <= start)
    throw new Error("结束时间必须大于开始时间。");
  if (end > duration) throw new Error("结束时间不能超过原视频时长。");
  return duration;
}

export function buildVideoSlicingTask(input, meta) {
  const videos = Array.isArray(input.videos) ? input.videos : [];
  if (!videos.length) throw new Error("请至少选择一个原始视频。");
  if (!Object.hasOwn(CLIP_GENERATION_MODES, input.method))
    throw new Error("请选择视频切片方式。");
  if (input.method === "manual" && videos.length !== 1)
    throw new Error("手动切片每次只能选择一个原始视频。");
  const clips = [];
  const failures = [];
  const completedVideoIds = [];
  let sequence = 0;
  for (const video of videos) {
    try {
      if (input.failedSourceVideoIds?.includes(video.id))
        throw new Error("视频解码失败，请检查文件完整性后重试。");
      const duration = parseTimecode(video.duration);
      const ranges = [];
      if (input.method === "manual") {
        const start = parseTimecode(input.parameters.startTime);
        const end = parseTimecode(input.parameters.endTime);
        validateClipRange(video, start, end);
        ranges.push({ start, end });
      } else {
        const clipLength = Number(input.parameters.clipLength);
        const step = Number(input.parameters.step);
        if (!Number.isFinite(clipLength) || clipLength <= 0)
          throw new Error("片段长度必须大于0秒。");
        if (!Number.isFinite(step) || step <= 0)
          throw new Error("滑动步长必须大于0秒。");
        const start = input.parameters.startTime
          ? parseTimecode(input.parameters.startTime)
          : 0;
        const end = input.parameters.endTime
          ? parseTimecode(input.parameters.endTime)
          : duration;
        validateClipRange(video, start, end);
        for (let cursor = start; cursor + clipLength <= end; cursor += step)
          ranges.push({ start: cursor, end: cursor + clipLength });
        if (!ranges.length) throw new Error("当前时间范围不足以生成一个完整片段。");
      }
      for (const range of ranges) {
        clips.push({
          id: meta.clipId(sequence, video.id),
          capabilityId: input.capabilityId,
          sourceVideoId: video.id,
          taskId: meta.taskId,
          startMs: Math.round(range.start * 1000),
          endMs: Math.round(range.end * 1000),
          durationMs: Math.round((range.end - range.start) * 1000),
          storageRef: video.storageRef || "",
          generationMethod: input.method,
          note: input.parameters.note?.trim() || "",
          generationStatus: "success",
          processingStatus: "pending_cleaning",
          createdAt: meta.now,
        });
        sequence += 1;
      }
      completedVideoIds.push(video.id);
    } catch (reason) {
      failures.push({
        sourceVideoId: video.id,
        reason: reason instanceof Error ? reason.message : "视频切片失败。",
      });
    }
  }
  return {
    task: {
      id: meta.taskId,
      capabilityId: input.capabilityId,
      taskType: "video_slicing",
      method: input.method,
      sourceVideoIds: videos.map((item) => item.id),
      parameters: { ...input.parameters },
      status: taskStatus(completedVideoIds.length, failures.length),
      progress: 100,
      completedVideoIds,
      generatedCount: clips.length,
      failures,
      createdBy: meta.actor,
      createdAt: meta.now,
      updatedAt: meta.now,
    },
    clips,
  };
}

export function assertDerivedItemsDeletable(items) {
  const selected = Array.isArray(items) ? items : [];
  if (!selected.length) throw new Error("请先选择生成结果。");
  if (selected.some((item) => item.processingStatus === "derived"))
    throw new Error(
      "所选结果已进入后续数据处理，不能直接删除。请先清理相关后续数据后再操作。",
    );
}
