function gradeFields(session) {
  return {
    score: session.score,
    scoreEngine: session.scoreEngine,
    resultStatus: session.resultStatus,
    rawScore: session.rawScore,
    manualAdjustments: session.manualAdjustments,
    originalScoreRecord: session.originalScoreRecord,
    scoreRevisions: session.scoreRevisions,
    gradeAuditHistory: session.gradeAuditHistory,
    gradeOperationReceipts: session.gradeOperationReceipts,
    reviewHistory: session.reviewHistory,
    steps: (session.steps || []).map((s) => ({
      id: s.id,
      score: s.score,
      effectiveScore: s.effectiveScore,
      rawScore: s.rawScore,
      maxScore: s.maxScore,
      originalScoreRecord: s.originalScoreRecord,
      result: s.result,
      reviewStatus: s.reviewStatus,
      reviewedAt: s.reviewedAt,
      reviewer: s.reviewer,
      evidenceArchived: s.evidenceArchived,
      completionResult: s.completionResult,
      reviewNote: s.reviewNote,
      scoreDisposition: s.scoreDisposition,
      completionSource: s.completionSource,
      aiEvidenceState: s.aiEvidenceState,
      flowCompletion: s.flowCompletion,
    })),
  };
}
// A final write guard also protects published grades from older runtime commands.
// Metadata such as workstation reset or media retention can still change.
export function assertFrozenGradeWrite(before, next) {
  for (const arrangement of before.arrangements || [])
    for (const session of arrangement.sessions || []) {
      if (
        arrangement.status !== "已发布" &&
        session.resultStatus !== "已发布" &&
        !session.scoreFrozen
      )
        continue;
      const candidateArrangement = (next.arrangements || []).find(
        (a) => a.id === arrangement.id,
      );
      const candidate = candidateArrangement?.sessions?.find(
        (s) => s.id === session.id,
      );
      // An authorized teacher correction updates the current published score in
      // place. Automatic/runtime paths cannot overwrite a published result.
      const previousAuditIds = new Set(
        (session.gradeAuditHistory || []).map((r) => r.operationId || r.id),
      );
      const correction = (candidate?.gradeAuditHistory || []).find(
        (r) =>
          !previousAuditIds.has(r.operationId || r.id) &&
          ["adjust", "review", "disposition", "task_confirm"].includes(
            r.source,
          ) &&
          r.actorId === (arrangement.teacherId || "t1") &&
          r.reason &&
          r.before?.score === Number(session.score) &&
          r.after?.score === Number(candidate.score),
      );
      if (
        correction &&
        (arrangement.status === "已发布" || session.resultStatus === "已发布"
          ? candidate.resultStatus === "已发布"
          : true) &&
        candidateArrangement.status === arrangement.status &&
        JSON.stringify(
          (candidate.steps || []).map((s) => [s.id, s.rawScore, s.maxScore]),
        ) ===
          JSON.stringify(
            (session.steps || []).map((s) => [s.id, s.rawScore, s.maxScore]),
          )
      )
        continue;
      if (
        !candidate ||
        JSON.stringify(gradeFields(candidate)) !==
          JSON.stringify(gradeFields(session)) ||
        (session.scoreFrozen && !candidate.scoreFrozen) ||
        (arrangement.status === "已发布" &&
          !["已发布", "已归档"].includes(candidateArrangement.status))
      )
        throw new Error(
          "已发布成绩只能由负责教师通过修改成绩入口更正，自动运行不能覆盖成绩。",
        );
    }
  return next;
}
