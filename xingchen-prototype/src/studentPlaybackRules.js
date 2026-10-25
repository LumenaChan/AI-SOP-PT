import { exportTime } from './exportFileRules.js';
import { standardMediaItems } from './standardMediaRules.js';
export function playbackUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function stepRange(value) {
  const match = String(value || '').match(/^(\d{1,3}:\d{2}(?::\d{2})?)\s*[–—-]\s*(\d{1,3}:\d{2}(?::\d{2})?)$/);
  const seconds = text => text.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  if (!match || [match[1], match[2]].some(t => t.split(':').slice(1).some(part => Number(part) >= 60))) return null;
  const start = seconds(match[1]), end = seconds(match[2]);
  return end > start ? { start, end } : null;
}
export function studentStepPlayback(step, session, now = Date.now()) {
  const recording = session.recording || {};
  if ((recording.sessionId && recording.sessionId !== session.id) || (recording.studentId && recording.studentId !== session.studentId))
    return { status: 'missing', message: '本步骤暂无可播放的本人录像。', clips: [] };
  const expire = exportTime(recording.expiresAt);
  const recordedEnd = exportTime(session.endedAt || session.submittedAt || recording.lastSegmentAt);
  const days = Number(recording.retentionDays);
  const deadline = Number.isFinite(expire) ? expire : Number.isFinite(recordedEnd) && days > 0 ? recordedEnd + days * 86400000 : null;
  if (recording.storageStatus === '已过期' || (deadline !== null && now >= deadline)) return { status: 'expired', message: '录像已超过保留期限，评分说明和教师反馈仍可查看。', clips: [] };
  if (recording.storageStatus === '已删除') return { status: 'missing', message: '本次录像已删除，评分说明和教师反馈仍可查看。', clips: [] };
  const clips = (Array.isArray(recording.clips) ? recording.clips : []).filter(c => c.stepId === step.id &&
    (!c.sessionId || c.sessionId === session.id) && (!c.studentId || c.studentId === session.studentId) &&
    (!c.workstationId || c.workstationId === session.workstationId) && c.status !== '不可用' &&
    (!c.expiresAt || exportTime(c.expiresAt) > now)).flatMap((c, i) => {
      const url = playbackUrl(c.url);
      if (!url) return [];
      const start = Number(c.startSeconds ?? 0), end = c.endSeconds == null ? null : Number(c.endSeconds);
      if (!Number.isFinite(start) || start < 0 || (end !== null && (!Number.isFinite(end) || end <= start))) return [];
      return [{ id: String(c.id || `clip-${i}`), label: String(c.cameraName || c.cameraId || '操作录像'), url, start, end, ...(c.expiresAt ? { expiresAt: exportTime(c.expiresAt) } : {}) }];
    });
  // Full-session recordings are usable only with a known step time range.
  const full = playbackUrl(recording.playbackUrl), range = stepRange(step.timeRange);
  if (!clips.length && full && range && recording.fullVideoAvailable !== false && recording.status !== '不可用')
    clips.push({ id: 'session-recording', label: '本次操作录像', url: full, ...range });
  const clipExpired = (Array.isArray(recording.clips) ? recording.clips : []).some(c => c.stepId === step.id && c.expiresAt && exportTime(c.expiresAt) <= now);
  if (!clips.length && clipExpired) return { status: 'expired', message: '本步骤录像片段已到期，评分说明和教师反馈仍可查看。', clips: [] };
  const partial = recording.status === '部分缺失' || (recording.incidents || []).some(i => i.affectedStepId === step.id);
  return { status: clips.length ? partial ? 'partial' : 'available' : 'missing',
    expiresAt: deadline, message: clips.length ? partial ? '录像部分缺失，可回放已保留的片段。' : '回放本步骤的操作片段。' : '本步骤暂无可播放录像，可查看评分说明和教师反馈。', clips };
}
export function studentStandardMedia(step, session, arrangement) {
  const locked = session.evaluationSnapshot?.sopSnapshot || session.snapshot?.sopSnapshot || arrangement.snapshot?.sopSnapshot;
  const definition = locked ? locked.steps?.find(s => s.id === step.id) : step;
  return standardMediaItems(definition).filter(m => m.assetId || playbackUrl(m.url)).map(m => ({
    id: String(m.id), name: String(m.name || '正确示范'), kind: m.kind,
    ...(m.assetId ? { assetId: m.assetId } : { url: playbackUrl(m.url) }),
    ...(m.size ? { size: m.size } : {}),
  }));
}
