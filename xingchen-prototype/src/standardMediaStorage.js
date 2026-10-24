const DATABASE = "xingchen-standard-teaching-media-v1";
const COLLECTION = "files";
function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB)
      return reject(
        new Error("当前浏览器无法保存资料，请使用支持本地文件存储的浏览器。"),
      );
    let blocked = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(COLLECTION);
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(new Error("本地资料存储无法打开，请检查浏览器存储权限。"));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("本地资料存储被其他页面占用，请关闭旧页面后重试。"));
    };
  });
}
export async function saveStandardMediaFiles(files, metadata) {
  const db = await openMediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const ids = files.map(() => `teaching-media-${crypto.randomUUID()}`);
      const transaction = db.transaction(COLLECTION, "readwrite");
      const store = transaction.objectStore(COLLECTION);
      transaction.oncomplete = () => resolve(ids);
      transaction.onabort = () =>
        reject(
          new Error(
            "资料保存失败，可能是本地存储空间不足。本次文件未添加，请减少文件大小后重试。",
          ),
        );
      transaction.onerror = () => {}; // onabort reports the batch failure.
      try {
        files.forEach((file, index) =>
          store.add(
            new Blob([file], { type: metadata[index].mime }),
            ids[index],
          ),
        );
      } catch {
        transaction.abort();
      }
    });
  } finally {
    db.close();
  }
}
export async function loadStandardMediaFile(id) {
  const db = await openMediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(COLLECTION, "readonly");
      const request = transaction.objectStore(COLLECTION).get(id);
      request.onsuccess = () =>
        request.result instanceof Blob
          ? resolve(request.result)
          : reject(new Error("资料文件不在此浏览器中，请联系教师重新添加。"));
      request.onerror = () => reject(new Error("资料读取失败，请稍后重试。"));
    });
  } finally {
    db.close();
  }
}
