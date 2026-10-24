import { strictMetricNumber } from "./teacherDashboardMetrics.js";
import { stepFlowLabel, sessionHelpRequests } from "./sessionClosureRules.js";
export function studentResult(data, studentId, arrangementId, sessionId) {
  if (!studentId || !sessionId) return null;
  const arrangement = (data.arrangements || []).find(
    (a) => a.id === arrangementId,
  );
  const session = arrangement?.sessions?.find(
    (s) => s.id === sessionId && s.studentId === studentId,
  );
  if (
    !session ||
    ["草稿", "已取消"].includes(arrangement.status) ||
    session.status === "已取消"
  )
    return null;
  if (
    !["已完成", "待复位", "已复位"].includes(session.status) &&
    !session.endedAt &&
    !["未参加", "已发布"].includes(session.resultStatus)
  )
    return null;
  const exam = arrangement.type === "exam";
  const published = session.resultStatus === "已发布";
  const absent = session.resultStatus === "未参加";
  const visible = !absent && (!exam || published);
  const recordedScore = strictMetricNumber(
    Object.prototype.hasOwnProperty.call(session, "score")
      ? session.score
      : session.scoreEngine?.effectiveScore,
  );
  // Return an allowlisted student projection. No hidden exam standards, notes or scores.
  return {
    arrangementId,
    sessionId,
    studentId,
    title: arrangement.name,
    type: arrangement.type,
    endedAt:
      session.endedAt || session.submittedAt || arrangement.endedAt || "",
    status: absent
      ? "未参加"
      : exam && !published
        ? "已交卷 · 待发布"
        : exam
          ? "考试成绩已发布"
          : session.resultStatus === "待复核"
            ? "练习结果待复核"
            : "练习结果已生成",
    published,
    visible,
    helpHistory: sessionHelpRequests(session, arrangement).map((r) => ({
      id: r.id,
      status: r.status,
      reasonLabel: r.reasonLabel,
      createdAt: r.createdAt,
      receipt: r.receipt || "",
      closeReason: r.closeReason || "",
    })),
    ...(visible
      ? {
          score:
            recordedScore !== null && recordedScore >= 0 ? recordedScore : null,
          steps: (session.steps || []).map((s) => ({
            id: s.id,
            name: s.name,
            score: s.effectiveScore ?? s.score,
            maxScore: s.maxScore,
            result: s.result,
            flow: stepFlowLabel(s),
            flowActor:
              s.flowCompletion?.role === "teacher"
                ? "教师"
                : s.flowCompletion?.role === "student"
                  ? "本人"
                  : "",
            flowAt: s.flowCompletion?.at || "",
            evidence:
              s.aiEvidenceState === "confirmed"
                ? s.resultSource === "real"
                  ? "AI证据支持"
                  : "演示证据支持"
                : "未自动确认（按规则保分或教师复核）",
          })),
        }
      : {}),
  };
}
export function studentRecentResults(data, studentId) {
  return (data.arrangements || [])
    .flatMap((a) =>
      (a.sessions || [])
        .filter((s) => s.studentId === studentId)
        .map((s) => studentResult(data, studentId, a.id, s.id))
        .filter(Boolean),
    )
    .sort((a, b) => String(b.endedAt).localeCompare(String(a.endedAt)));
}
