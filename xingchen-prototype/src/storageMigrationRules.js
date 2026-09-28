export const LEGACY_SOP_RECOVERY_MARKER = "legacy-sop-recovery-v19";

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
