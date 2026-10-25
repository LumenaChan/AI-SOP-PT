import { strictMetricNumber } from './gradeScoreValidityRules.js';
import { displayGradeText } from './gradeRevisionRules.js';
const instant = value => {
  const stamp = String(value || '').trim();
  const parsed = Date.parse(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d)?$/.test(stamp) ? `${stamp.replace(' ', 'T')}+08:00` : stamp);
  return Number.isFinite(parsed) ? parsed : 0;
};
const text = value => typeof value === 'string' ? displayGradeText(value).replace(/^(?:原型演示|演示)[:：]\s*/, '').trim() : '';

// Student-facing review contains only scoring explanations and teacher-authored
// teaching content. Never project diagnostics, raw audits or current standards.
export function studentPracticeStep(step, session, arrangement, access = { feedback: true, standard: true }) {
  const locked = session.evaluationSnapshot?.sopSnapshot || session.snapshot?.sopSnapshot || arrangement.snapshot?.sopSnapshot;
  const definition = locked ? locked.steps?.find(s => s.id === step.id) : step;
  const score = strictMetricNumber(step.effectiveScore ?? step.score);
  const maximum = strictMetricNumber(step.maxScore);
  const deduction = score !== null && maximum !== null && score >= 0 && maximum >= score ? maximum - score : null;
  const pending = ['待复核', '待补充证据'].includes(step.reviewStatus) || ['pending', 'retest_required'].includes(step.scoreDisposition?.status);
  const safety = step.redlineConfirmed === true || step.result === '安全阻断' || step.executionState === 'safety_blocked';
  const audits = (session.gradeAuditHistory || []).filter(a => a.source !== 'session_lifecycle' && (a.stepIds || []).includes(step.id));
  const legacy = (session.reviewHistory || []).filter(a => a.stepId === step.id);
  const latest = [...audits, ...legacy].sort((a, b) => instant(a.at || a.time) - instant(b.at || b.time)).at(-1);
  const feedback = access.feedback ? text(step.studentFeedback?.comment) || text(step.reviewNote) || text(latest?.reason) : '';
  const rules = (session.runtime?.scoringApplications || []).filter(a => a.stepId === step.id && ['applied', 'corrected'].includes(a.status) && Number(a.appliedDeduction) > 0);
  const scoringReasons = (access.feedback ? rules : []).map(a => `${text(a.ruleName) || '评分规则'}：扣${Number(a.appliedDeduction)}分`);
  const needsAttention = safety || pending || deduction > 0 || Boolean(feedback);
  return {
    deduction, needsAttention, pendingReview: pending, safety,
    attentionLabel: safety ? '安全问题' : pending ? '待教师复核' : deduction > 0 ? '需要改进' : feedback ? '教师反馈' : '本步结果',
    explanation: !access.feedback ? '' : feedback || scoringReasons.join('；') || (deduction > 0 ? '本步骤存在扣分，具体操作问题尚未记录。' : safety ? '存在已确认的安全问题，请按教师要求复盘。' : ''),
    teacherFeedback: feedback,
    teacher: access.feedback ? text(step.reviewer) || text(latest?.actor || latest?.operator) : '',
    feedbackAt: access.feedback ? step.reviewedAt || latest?.at || latest?.time || '' : '',
    correctRequirement: access.standard ? text(definition?.completionCondition) || text(definition?.teachingInstruction) : '',
    operatingPoints: access.standard ? text(definition?.keyPoints) : '',
    improvement: (access.feedback ? text(step.studentFeedback?.improvement) : '') || (access.standard ? text(definition?.commonMistakes) : ''),
    hasLockedStandard: Boolean(definition),
  };
}
