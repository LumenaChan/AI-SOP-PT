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
    if (
      stored?.fingerprint === fingerprint &&
      isUsablePrototypeDataSnapshot(stored.data)
    )
      return {
        kind: "cpd-storage",
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
  if (stored?.version === expectedVersion)
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
