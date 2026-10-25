// Current standard/workstation relationships are identified by IDs. Legacy
// supportedProject text and historical validation records never create links.
export function workstationStandardRows(data, workstationId) {
  return (data.sopWorkstationAiConfigs || [])
    .filter((relation) => relation.workstationId === workstationId)
    .map((relation) => {
      const config = (data.aiCapabilityConfigs || []).find(
        (item) => item.id === relation.sopAiConfigId,
      );
      const sop = (data.sops || []).find((item) => item.id === config?.sopId);
      return { relation, sop };
    });
}

export function workstationLinkedStandards(data, workstationId) {
  return [
    ...new Map(
      workstationStandardRows(data, workstationId)
        .filter(({ sop }) => sop)
        .map(({ sop }) => [sop.id, sop]),
    ).values(),
  ];
}

export function standardWorkstationIds(data, sopId) {
  const configs = new Set(
    (data.aiCapabilityConfigs || [])
      .filter((config) => config.sopId === sopId)
      .map((config) => config.id),
  );
  return [
    ...new Set(
      (data.sopWorkstationAiConfigs || [])
        .filter((relation) => configs.has(relation.sopAiConfigId))
        .map((relation) => relation.workstationId),
    ),
  ];
}
