// Obtain system evidence from the store before confirming the camera views.
export function confirmOpeningCheck(store, arrangementId, workstationId) {
  const report = store.runWorkstationOpeningCheck(arrangementId, workstationId);
  return {
    inspectionId: report.id,
    siteResetConfirmed: true,
    cameraConfirmations: Object.fromEntries(
      report.manualChecks.map((c) => [c.key, true]),
    ),
    fallbackAccepted: report.needsFallbackConfirmation,
  };
}
