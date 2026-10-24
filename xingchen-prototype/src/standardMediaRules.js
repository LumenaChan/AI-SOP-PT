const MB = 1024 * 1024;
export const STANDARD_MEDIA_LIMITS = { count: 10, total: 200 * MB };
const formats = {
  jpg: ["image", "image/jpeg", 10],
  jpeg: ["image", "image/jpeg", 10],
  png: ["image", "image/png", 10],
  gif: ["image", "image/gif", 10],
  webp: ["image", "image/webp", 10],
  mp4: ["video", "video/mp4", 100],
  webm: ["video", "video/webm", 100],
  pdf: ["pdf", "application/pdf", 20],
  doc: ["document", "application/msword", 20],
  docx: [
    "document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    20,
  ],
  ppt: ["document", "application/vnd.ms-powerpoint", 20],
  pptx: [
    "document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    20,
  ],
  xls: ["document", "application/vnd.ms-excel", 20],
  xlsx: [
    "document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    20,
  ],
};
export const STANDARD_MEDIA_ACCEPT = Object.keys(formats)
  .map((ext) => `.${ext}`)
  .join(",");
export const STANDARD_MEDIA_HELP =
  "支持 JPG/JPEG、PNG、GIF、WebP 图片（单个≤10MB），MP4、WebM 视频（单个≤100MB），PDF、Word（DOC/DOCX）、PPT/PPTX、Excel（XLS/XLSX）文档（单个≤20MB）。每步最多10个资料，合计≤200MB；可多次添加。";
export function mediaFormat(name = "") {
  return String(name).split(/[?#]/)[0].split(".").at(-1).toLowerCase();
}
export function mediaKind(item) {
  return (
    formats[mediaFormat(item.name || item.url)]?.[0] || item.kind || "document"
  );
}
export function mediaTypeLabel(item) {
  return (
    {
      image: "示教图片",
      video: "示教视频",
      pdf: "PDF 文档",
      document: "示教文档",
    }[mediaKind(item)] || "示教资料"
  );
}
export function mediaSize(size) {
  if (!Number.isFinite(size) || size < 0) return "";
  return size < MB
    ? `${Math.max(1, Math.ceil(size / 1024))} KB`
    : `${(size / MB).toFixed(1)} MB`;
}
// The array is authoritative, including an explicitly empty list after removal.
export function standardMediaItems(step) {
  if (Array.isArray(step?.standardMedia)) return step.standardMedia;
  if (!step?.standardMediaUrl && !step?.standardMediaName) return [];
  return [
    {
      id: "legacy-standard-media",
      name:
        step.standardMediaName ||
        step.standardMediaUrl?.split("/").pop() ||
        "已配置示教资料",
      url: step.standardMediaUrl || "",
      kind: String(step.standardMediaType).includes("视频") ? "video" : "image",
    },
  ];
}

// Teaching references must follow the same locked standard as the session.
// An empty or incomplete historical snapshot must never borrow today's files.
export function sessionStandardMediaStep({
  session,
  arrangement,
  sop,
  stepId,
}) {
  const locked =
    session?.evaluationSnapshot?.sopSnapshot ||
    session?.snapshot?.sopSnapshot ||
    arrangement?.snapshot?.sopSnapshot;
  if (locked) return locked.steps?.find((step) => step.id === stepId) || null;
  const recorded = session?.steps?.find((step) => step.id === stepId);
  if (
    recorded &&
    ["standardMedia", "standardMediaUrl", "standardMediaName"].some((key) =>
      Object.hasOwn(recorded, key),
    )
  )
    return recorded;
  return sop?.steps?.find((step) => step.id === stepId) || null;
}
export function validateStandardMediaFiles(existing, files) {
  if (!files.length) throw new Error("请选择资料文件。");
  if (existing.length + files.length > STANDARD_MEDIA_LIMITS.count)
    throw new Error("每个步骤最多10个资料，请减少文件数量后重试。");
  let total = existing.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
  const seen = new Set(
    existing.map((item) => item.fingerprint).filter(Boolean),
  );
  return files.map((file) => {
    const ext = mediaFormat(file.name),
      format = formats[ext];
    if (!format)
      throw new Error(`${file.name}：不支持此格式，请按下方格式说明选择。`);
    if (!Number.isFinite(file.size) || file.size <= 0)
      throw new Error(`${file.name}：文件为空或大小无效。`);
    if (file.size > format[2] * MB)
      throw new Error(`${file.name}：单个文件不能超过${format[2]}MB。`);
    if (
      file.type &&
      ![
        format[1],
        "application/octet-stream",
        ...(format[0] === "document" ? ["application/zip"] : []),
      ].includes(file.type)
    )
      throw new Error(`${file.name}：文件类型与扩展名不符。`);
    const fingerprint = JSON.stringify([
      file.name,
      file.size,
      file.lastModified || 0,
    ]);
    if (seen.has(fingerprint))
      throw new Error(`${file.name}：此文件已添加，请勿重复选择。`);
    seen.add(fingerprint);
    total += file.size;
    if (total > STANDARD_MEDIA_LIMITS.total)
      throw new Error("本步骤资料合计不能超过200MB。");
    return {
      name: file.name,
      size: file.size,
      mime: format[1],
      kind: format[0],
      fingerprint,
    };
  });
}
export async function addStandardMediaFiles(existing, files, saveFiles) {
  const metadata = validateStandardMediaFiles(existing, files);
  // Persist the whole batch before exposing any attachment in the SOP draft.
  const ids = await saveFiles(files, metadata);
  return [
    ...existing,
    ...metadata.map((item, index) => ({
      ...item,
      id: ids[index],
      assetId: ids[index],
    })),
  ];
}
