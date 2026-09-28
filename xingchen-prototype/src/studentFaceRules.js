import { getStudentFaceStatus } from "./studentIdentityRules.js";

export const STUDENT_FACE_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const STUDENT_FACE_MAX_STORED_BYTES = 300 * 1024;
export const STUDENT_FACE_MAX_DIMENSION = 512;
export const STUDENT_FACE_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_FACE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function normalizeStudentFaceData(student = {}) {
  const faceStatus = getStudentFaceStatus(student);
  return {
    ...student,
    faceStatus,
    face: faceStatus,
    facePhotoDataUrl:
      typeof student.facePhotoDataUrl === "string"
        ? student.facePhotoDataUrl
        : "",
    faceUpdatedAt:
      typeof student.faceUpdatedAt === "string" ? student.faceUpdatedAt : "",
  };
}

export function applyStudentFaceUpload(student, dataUrl, updatedAt) {
  if (!String(dataUrl || "").startsWith("data:image/"))
    throw new Error("人脸照片数据无效，请重新选择图片。");
  return {
    ...normalizeStudentFaceData(student),
    faceStatus: "已采集",
    face: "已采集",
    facePhotoDataUrl: dataUrl,
    faceUpdatedAt: updatedAt,
  };
}

export function markStudentFaceForRecapture(student) {
  return {
    ...normalizeStudentFaceData(student),
    faceStatus: "待重采",
    face: "待重采",
  };
}

export function validateStudentFaceFile(file) {
  if (!file) throw new Error("请选择一张学生人脸照片。");
  if (!ALLOWED_FACE_IMAGE_TYPES.has(file.type))
    throw new Error("仅支持 JPG、PNG 或 WebP 图片。");
  if (!Number.isFinite(file.size) || file.size <= 0)
    throw new Error("图片内容为空或无法读取，请重新选择。");
  if (file.size > STUDENT_FACE_MAX_SOURCE_BYTES)
    throw new Error("图片过大，请选择 5MB 以内图片。");
  return true;
}

export function approximateDataUrlBytes(dataUrl = "") {
  const base64 = String(dataUrl).split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择。"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片格式损坏或无法识别。"));
      image.onload = () => resolve(image);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressImageForPrototype(
  file,
  {
    maxDimension = STUDENT_FACE_MAX_DIMENSION,
    maxBytes = STUDENT_FACE_MAX_STORED_BYTES,
    initialQuality = 0.78,
  } = {},
) {
  validateStudentFaceFile(file);
  if (typeof document === "undefined" || typeof FileReader === "undefined")
    throw new Error("当前环境无法处理图片，请更换浏览器后重试。");
  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight)
    throw new Error("无法读取图片尺寸，请重新选择。");
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));
  let quality = initialQuality;
  let dataUrl = "";
  let approxBytes = Infinity;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("图片压缩失败，请更换图片后重试。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    approxBytes = approximateDataUrlBytes(dataUrl);
    if (approxBytes <= maxBytes) break;
    quality = Math.max(0.48, quality - 0.08);
    width = Math.max(160, Math.round(width * 0.88));
    height = Math.max(160, Math.round(height * 0.88));
  }

  if (!dataUrl || approxBytes > maxBytes)
    throw new Error("图片压缩后仍然过大，请选择内容更简单或尺寸更小的图片。");
  return {
    dataUrl,
    width,
    height,
    approxBytes,
    fileName: file.name || "学生人脸照片",
  };
}

export function formatFaceImageSize(bytes = 0) {
  return bytes >= 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${bytes} B`;
}

export function persistPrototypeData(storage, key, data) {
  try {
    storage?.setItem(key, JSON.stringify(data));
  } catch {
    throw new Error(
      "人脸照片保存失败，浏览器本地存储空间不足。请更换更小的图片后重试。",
    );
  }
}
