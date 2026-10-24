export const LEGACY_SOP_RECOVERY_MARKER = "legacy-sop-recovery-v19";
export const PROTOTYPE_DATA_SOURCE_BROWSER = "browser";
export const PROTOTYPE_DATA_SOURCE_CPD = "cpd";

export function normalizePrototypeDataSource(value) {
  return value === PROTOTYPE_DATA_SOURCE_CPD
    ? PROTOTYPE_DATA_SOURCE_CPD
    : PROTOTYPE_DATA_SOURCE_BROWSER;
}

export function prototypeDataFingerprint(snapshot) {
  const source = JSON.stringify(snapshot);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${source.length}-${(hash >>> 0).toString(36)}`;
}

export function isUsablePrototypeDataSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      !Array.isArray(snapshot) &&
      Array.isArray(snapshot.sops) &&
      Array.isArray(snapshot.classes) &&
      Array.isArray(snapshot.students) &&
      Array.isArray(snapshot.workstations),
  );
}

export function clonePrototypeDataSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

export function selectCpdWorkingData({
  storage,
  storageKey,
  fingerprint,
  currentPrototypeData,
}) {
  try {
    const storedValue = storage?.getItem(storageKey);
    const stored = storedValue ? JSON.parse(storedValue) : null;
    if (isUsablePrototypeDataSnapshot(stored?.data))
      return {
        kind: "cpd-storage",
        sourceChanged: stored.fingerprint !== fingerprint,
        data: clonePrototypeDataSnapshot(stored.data),
      };
  } catch {
    // Fall through to the source-controlled CPD snapshot.
  }
  if (isUsablePrototypeDataSnapshot(currentPrototypeData))
    return {
      kind: "cpd-default",
      data: clonePrototypeDataSnapshot(currentPrototypeData),
    };
  return { kind: "seed", data: null };
}

export function selectPrototypeDataSource({
  storage,
  storageKey,
  legacyStorageKeys = [],
  expectedVersion,
  currentPrototypeData,
}) {
  const parseStored = (key) => {
    try {
      const value = storage?.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };
  const stored = parseStored(storageKey);
  const legacyRecords = legacyStorageKeys.map(parseStored).filter(Boolean);
  if (
    stored?.version === expectedVersion ||
    isUsablePrototypeDataSnapshot(stored)
  )
    return { kind: "current-storage", data: stored, legacyRecords };
  if (legacyRecords.length)
    return {
      kind: "legacy-storage",
      data: legacyRecords[0],
      legacyRecords,
    };
  if (isUsablePrototypeDataSnapshot(currentPrototypeData))
    return {
      kind: "current-default",
      data: clonePrototypeDataSnapshot(currentPrototypeData),
      legacyRecords,
    };
  return { kind: "seed", data: null, legacyRecords };
}

export const PROTOTYPE_STORAGE_KEYS = {
  browser: "xingchen-prototype-data-v22",
  cpd: "xingchen-prototype-cpd-working-data-v1",
  selection: "xingchen-prototype-data-source-v1",
};

export function persistWorkingData(storage, source, fingerprint, data) {
  const key = PROTOTYPE_STORAGE_KEYS[normalizePrototypeDataSource(source)];
  const value = source === "cpd" ? { fingerprint, data } : data;
  storage.setItem(key, JSON.stringify(value));
}

const BACKUP_STORAGE_KEYS = [
  ...Object.values(PROTOTYPE_STORAGE_KEYS),
  ...Array.from({ length: 21 }, (_, i) => `xingchen-prototype-data-v${i + 1}`),
];

// Back up the original bytes, before normalization or default-data updates.
// IndexedDB avoids doubling large face-photo payloads in localStorage.
export async function backupWorkingStorage(
  storage,
  indexedDB = globalThis.indexedDB,
  namespace = "before-sop-20261015",
) {
  const entries = BACKUP_STORAGE_KEYS.flatMap((key) => {
    const raw = storage.getItem(key);
    return raw == null
      ? []
      : [{ key, raw, fingerprint: prototypeDataFingerprint(raw) }];
  });
  if (!entries.length) return;
  if (!indexedDB) {
    for (const item of entries) {
      const key = `xingchen-backup-${namespace}:${item.key}`;
      if (storage.getItem(key) == null) storage.setItem(key, item.raw);
    }
    return;
  }
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("xingchen-prototype-backups", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("snapshots", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("备份数据库被其他页面占用，请关闭旧页面后重试。"));
  });
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite");
      for (const item of entries) {
        const id = `${namespace}:${item.key}`;
        const store = tx.objectStore("snapshots");
        const query = store.get(id);
        query.onsuccess = () => {
          if (!query.result)
            store.put({ ...item, id, savedAt: new Date().toISOString() });
        };
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("备份中断"));
    });
  } finally {
    db.close();
  }
}

export async function readWorkingBackups(indexedDB = globalThis.indexedDB) {
  if (!indexedDB)
    return [
      "before-sop-20261015",
      "before-teaching-statistics-20261023",
    ].flatMap((namespace) =>
      BACKUP_STORAGE_KEYS.flatMap((key) => {
        const raw = globalThis.localStorage?.getItem(
          `xingchen-backup-${namespace}:${key}`,
        );
        return raw == null ? [] : [{ key, raw, namespace }];
      }),
    );
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("xingchen-prototype-backups", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("snapshots", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("snapshots").objectStore("snapshots").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}

export function recoverMissingLegacySops(current = {}, legacyRecords = []) {
  if (current.storageMigrations?.[LEGACY_SOP_RECOVERY_MARKER]) return current;
  const currentSops = Array.isArray(current.sops) ? current.sops : [];
  const knownIds = new Set(currentSops.map((item) => item?.id).filter(Boolean));
  const recovered = [];
  for (const record of Array.isArray(legacyRecords) ? legacyRecords : []) {
    for (const sop of Array.isArray(record?.sops) ? record.sops : []) {
      if (!sop?.id || !String(sop.name || "").trim() || knownIds.has(sop.id))
        continue;
      knownIds.add(sop.id);
      recovered.push(sop);
    }
  }
  return {
    ...current,
    sops: [...recovered, ...currentSops],
    storageMigrations: {
      ...(current.storageMigrations || {}),
      [LEGACY_SOP_RECOVERY_MARKER]: true,
    },
  };
}
