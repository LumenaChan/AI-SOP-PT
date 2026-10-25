import { getExamPublishGate, requiresMandatoryReview } from './domainRules.js';
import { deriveWorkstationAiReadiness } from './workstationAiRules.js';

export function sessionHasStarted(session = {}) {
  return !['待开始', '可入场', '已取消'].includes(session.status) &&
    !['未参加', '已取消'].includes(session.resultStatus);
}
export function sessionResultPresentation(session = {}) {
  const started = sessionHasStarted(session);
  const final = ['正式成绩', '已发布'].includes(session.resultStatus);
  const ended = Boolean(session.endedAt) || ['已完成', '待复位', '已复位'].includes(session.status);
  const scoreValid = session.score !== null && session.score !== undefined && String(session.score).trim() !== '' && Number.isFinite(Number(session.score));
  return {
    score: started && scoreValid ? `${session.score}分` : '—',
    status: session.status || (final || ended ? '已完成' : '状态未记录'),
    gradeStatus: !started ? (session.resultStatus || '尚未形成') : final ? session.resultStatus :
      ['待复核', '待发布'].includes(session.resultStatus) ? session.resultStatus : ended ? '待核定' : '暂计分',
  };
}
export function getArrangementResultStats(arrangement, sops = []) {
  const sessions = arrangement.sessions || [];
  const measured = sessions.filter(s => sessionHasStarted(s) && sessionResultPresentation(s).score !== '—');
  const average = measured.length ? (measured.reduce((sum, s) => sum + Number(s.score), 0) / measured.length).toFixed(1) : '--';
  const provisional = measured.some(s => sessionResultPresentation(s).gradeStatus === '暂计分');
  const publishGate = getExamPublishGate(sessions, arrangement.snapshot?.sopSnapshot || sops.find(s => s.id === arrangement.sopId));
  const blockers = sessions.filter(s => publishGate.details.some(d => d.sessionId === s.id));
  const reviews = sessions.filter(s => sessionHasStarted(s) && (s.resultStatus === '待复核' ||
    (s.steps || []).some(t => requiresMandatoryReview(t) || ['pending', 'retest_required'].includes(t.scoreDisposition?.status)) ||
    (s.runtime?.safetyCandidates || []).some(c => ['pending', 'awaiting_confirmation'].includes(c.status))));
  return { sessions, average, averageHint: `按已开始且有分数的 ${measured.length} 条记录计算${provisional ? '，含暂计分' : ''}`, reviews, blockers, publishGate };
}
export function arrangementAbnormalWorkstations(data, arrangement) {
  const ids = new Set([...(arrangement.workstationIds || []), ...(arrangement.sessions || []).map(s => s.workstationId)]);
  return (data.workstations || []).filter(w => ids.has(w.id)).map(w => {
    const reasons = [];
    if (w.releaseHold?.arrangementId === arrangement.id) reasons.push(...(w.releaseHold.reasons || ['存在使用限制']));
    if (w.status === '故障') reasons.push('工位当前故障');
    const health = deriveWorkstationAiReadiness({ workstation: w, devices: data.devices || [] });
    if (health.code === 'abnormal') reasons.push(...health.reasons);
    return { workstation: w, reasons: [...new Set(reasons)] };
  }).filter(row => row.reasons.length);
}

export function arrangementRecordContext(data, arrangement, session) {
  const snapshot = session?.evaluationSnapshot?.sopSnapshot || session?.snapshot?.sopSnapshot || arrangement.snapshot?.sopSnapshot;
  const current = (data.sops || []).find(s => s.id === (session?.evaluationSnapshot?.sopId || arrangement.snapshot?.sopId || arrangement.sopId));
  const ended = ['已结束', '待发布', '已发布', '已归档', '已取消'].includes(arrangement.status);
  const waiting = ['草稿', '待开始', '准备中'].includes(arrangement.status);
  return {
    teacher: arrangement.teacherName || (data.teachers || []).find(t => t.id === arrangement.teacherId)?.name || '未记录',
    standardName: snapshot?.name || current?.name || '名称未记录',
    standardBasis: snapshot ? '本次锁定标准' : '历史标准快照未记录',
    startedAt: arrangement.startedAt || (waiting ? '尚未开始' : '未记录'),
    endedAt: arrangement.endedAt || (ended ? '未记录' : '尚未结束'),
  };
}
