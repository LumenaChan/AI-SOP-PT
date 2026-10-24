import { loadStandardMediaFile } from "./standardMediaStorage.js";

export function collectStandardMediaAssets(data) {
  const assets = new Map();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value.standardMedia)) {
      for (const item of value.standardMedia) {
        if (item?.assetId && !assets.has(item.assetId))
          assets.set(item.assetId, {
            assetId: item.assetId,
            name: item.name || "示教资料",
            mime: item.mime || "",
          });
        else if (item?.url?.startsWith("blob:") && !assets.has(item.url))
          assets.set(item.url, {
            name: item.name || "旧示教资料",
            legacyUrl: item.url,
          });
      }
    } else if (
      value.standardMediaUrl?.startsWith("blob:") &&
      !assets.has(value.standardMediaUrl)
    ) {
      assets.set(value.standardMediaUrl, {
        name: value.standardMediaName || "旧示教资料",
        legacyUrl: value.standardMediaUrl,
      });
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(data);
  return [...assets.values()];
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit++)
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  return current >>> 0;
});
async function blobCrc(blob) {
  let crc = 0xffffffff;
  // Read bounded chunks rather than turning a 100MB video into a base64 string.
  const reader = blob.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const byte of value)
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  } finally {
    reader.releaseLock();
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function header(length) {
  const bytes = new Uint8Array(length);
  return { bytes, view: new DataView(bytes.buffer) };
}
// Stored ZIP entries keep already-compressed images/videos unchanged and avoid
// a new runtime dependency. UTF-8 names, central-directory offsets and CRCs are explicit.
export async function createMediaZip(entries) {
  if (entries.length > 65535) throw new Error("资料过多，无法生成单个资料包。");
  const parts = [],
    directory = [],
    encoder = new TextEncoder();
  let offset = 0,
    directorySize = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name),
      blob = entry.blob;
    if (name.length > 65535)
      throw new Error("资料文件名过长，无法生成资料包。");
    if (
      blob.size > 0xffffffff ||
      offset + 30 + name.length + blob.size > 0xffffffff
    )
      throw new Error("资料包超过4GB，请分批备份资料。");
    const crc = await blobCrc(blob),
      local = header(30),
      central = header(46);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x800, true);
    local.view.setUint16(12, 0x21, true); // 1980-01-01, no invented source file date.
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, blob.size, true);
    local.view.setUint32(22, blob.size, true);
    local.view.setUint16(26, name.length, true);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x800, true);
    central.view.setUint16(14, 0x21, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, blob.size, true);
    central.view.setUint32(24, blob.size, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    parts.push(local.bytes, name, blob);
    directory.push(central.bytes, name);
    offset += 30 + name.length + blob.size;
    directorySize += 46 + name.length;
  }
  if (offset + directorySize > 0xffffffff)
    throw new Error("资料包超过4GB，请分批备份资料。");
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, entries.length, true);
  end.view.setUint16(10, entries.length, true);
  end.view.setUint32(12, directorySize, true);
  end.view.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end.bytes], {
    type: "application/zip",
  });
}
const jsonBlob = (value) =>
  new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
export async function standardMediaWorkingBackup(
  snapshotText,
  loadFile = loadStandardMediaFile,
) {
  const snapshot = JSON.parse(snapshotText),
    assets = collectStandardMediaAssets(snapshot.data);
  if (!assets.length)
    return {
      blob: new Blob([snapshotText], { type: "application/json" }),
      name: "兴辰工作数据.json",
      missing: 0,
      included: 0,
    };
  const entries = [
      {
        name: "工作数据.json",
        blob: new Blob([snapshotText], { type: "application/json" }),
      },
    ],
    manifest = [];
  for (const [index, item] of assets.entries()) {
    try {
      if (!item.assetId)
        throw new Error(
          "旧资料使用临时地址，无法作为持久文件备份，请重新添加。",
        );
      const file = await loadFile(item.assetId);
      const safeName = item.name
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .slice(0, 120);
      const path = `示教资料/${index + 1}-${safeName}`;
      entries.push({ name: path, blob: file });
      manifest.push({ ...item, path, size: file.size, status: "included" });
    } catch (error) {
      manifest.push({
        ...item,
        status: "missing",
        reason: error.message || "资料读取失败",
      });
    }
  }
  entries.push({
    name: "资料清单.json",
    blob: jsonBlob({
      format: "xingchen-teaching-media-backup",
      version: 1,
      source: snapshot.source,
      exportedAt: snapshot.exportedAt,
      assets: manifest,
    }),
  });
  return {
    blob: await createMediaZip(entries),
    name: "兴辰工作数据与示教资料.zip",
    missing: manifest.filter((item) => item.status === "missing").length,
    included: manifest.filter((item) => item.status === "included").length,
  };
}
