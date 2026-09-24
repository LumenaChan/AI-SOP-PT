export const AI_VIDEO_CATEGORIES = {
  normal: "正常",
  error: "错误",
  background: "背景",
};

export const AI_VIDEO_SOURCES = {
  standard_demo: "标准示教",
  student_practice: "学生实操",
  supplemental_capture: "专项补采",
  historical_recording: "历史录像",
  other: "其他",
};

export const AI_VIDEO_PROCESSING_STATUSES = {
  unprocessed: "未处理",
  derived: "已进入后续处理",
};

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv"]);

function required(value, message) {
  if (!String(value || "").trim()) throw new Error(message);
}

function assertOption(value, options, message) {
  if (!Object.hasOwn(options, value)) throw new Error(message);
}

export function videoExtension(fileName = "") {
  return String(fileName).split(".").at(-1)?.toLowerCase() || "";
}

export function potentialVideoDuplicates(files, existingVideos, capabilityId) {
  const existing = Array.isArray(existingVideos) ? existingVideos : [];
  const seen = new Set();
  return (Array.isArray(files) ? files : []).filter((file) => {
    const key = `${file.fileName}\u0000${Number(file.fileSize || 0)}`;
    const duplicateInBatch = seen.has(key);
    seen.add(key);
    return (
      duplicateInBatch ||
      existing.some(
        (video) =>
          video.capabilityId === capabilityId &&
          video.fileName === file.fileName &&
          Number(video.fileSize || 0) === Number(file.fileSize || 0),
      )
    );
  });
}

export function createAiSourceVideos(input, existingVideos, meta) {
  required(input?.capabilityId, "请先选择AI能力。");
  assertOption(input?.dataCategory, AI_VIDEO_CATEGORIES, "请选择数据属性。");
  assertOption(input?.sourceType, AI_VIDEO_SOURCES, "请选择数据来源。");
  const files = Array.isArray(input?.files) ? input.files : [];
  if (!files.length) throw new Error("请选择至少一个视频文件。");
  for (const file of files) {
    required(file?.fileName, "视频文件名不能为空。");
    if (!VIDEO_EXTENSIONS.has(videoExtension(file.fileName)))
      throw new Error(`不支持 ${file.fileName}，请选择 mp4、mov、avi 或 mkv 文件。`);
  }
  const duplicates = potentialVideoDuplicates(
    files,
    existingVideos,
    input.capabilityId,
  );
  if (duplicates.length && !input.allowDuplicates)
    throw new Error(
      `检测到 ${duplicates.map((item) => item.fileName).join("、")} 可能重复，请确认后继续上传。`,
    );
  if (!Array.isArray(meta?.ids) || meta.ids.length !== files.length)
    throw new Error("视频ID生成失败，请重试。");
  return files.map((file, index) => ({
    id: meta.ids[index],
    capabilityId: input.capabilityId,
    fileName: file.fileName,
    displayName: file.displayName || file.fileName,
    storageRef: file.storageRef || "",
    mimeType: file.mimeType || "",
    codec: file.codec || "—",
    duration: file.duration || "待读取",
    width: Number(file.width || 0),
    height: Number(file.height || 0),
    fileSize: Number(file.fileSize || 0),
    dataCategory: input.dataCategory,
    sourceType: input.sourceType,
    workstationId: input.workstationId || "",
    capturedAt: input.capturedAt || "",
    note: String(input.note || "").trim(),
    processingStatus: "unprocessed",
    uploadedBy: meta.actor || "系统管理员",
    uploadedAt: meta.now,
    updatedAt: meta.now,
  }));
}

export function updateAiSourceVideo(video, input, now) {
  if (!video?.id) throw new Error("原始视频不存在或已删除。");
  required(input?.displayName, "请填写视频名称。");
  assertOption(input?.dataCategory, AI_VIDEO_CATEGORIES, "请选择数据属性。");
  assertOption(input?.sourceType, AI_VIDEO_SOURCES, "请选择数据来源。");
  return {
    ...video,
    displayName: input.displayName.trim(),
    dataCategory: input.dataCategory,
    sourceType: input.sourceType,
    workstationId: input.workstationId || "",
    capturedAt: input.capturedAt || "",
    note: String(input.note || "").trim(),
    updatedAt: now,
  };
}

export function batchUpdateAiSourceVideos(videos, ids, patch, now) {
  const selectedIds = new Set(Array.isArray(ids) ? ids : []);
  if (!selectedIds.size) throw new Error("请先选择视频。");
  if (patch.dataCategory)
    assertOption(patch.dataCategory, AI_VIDEO_CATEGORIES, "请选择数据属性。");
  if (patch.sourceType)
    assertOption(patch.sourceType, AI_VIDEO_SOURCES, "请选择数据来源。");
  return (Array.isArray(videos) ? videos : []).map((video) =>
    selectedIds.has(video.id) ? { ...video, ...patch, updatedAt: now } : video,
  );
}

export function assertAiSourceVideosDeletable(videos) {
  const selected = Array.isArray(videos) ? videos : [];
  if (!selected.length) throw new Error("请先选择视频。");
  const protectedVideo = selected.find(
    (video) => video.processingStatus === "derived",
  );
  if (protectedVideo)
    throw new Error(
      `“${protectedVideo.displayName || protectedVideo.fileName}”已生成后续训练数据，无法直接删除。请先清理该视频产生的派生数据后再操作。`,
    );
}

export function videoStats(videos) {
  const list = Array.isArray(videos) ? videos : [];
  return {
    total: list.length,
    normal: list.filter((item) => item.dataCategory === "normal").length,
    error: list.filter((item) => item.dataCategory === "error").length,
    background: list.filter((item) => item.dataCategory === "background").length,
    unprocessed: list.filter((item) => item.processingStatus === "unprocessed")
      .length,
    derived: list.filter((item) => item.processingStatus === "derived").length,
  };
}

export function capabilityStatusAfterVideoUpload(status) {
  return status === "草稿" ? "数据准备中" : status;
}
