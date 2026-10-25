import { displayBusinessText } from './businessTextRules.js';
const WEEK = 7 * 24 * 60 * 60 * 1000;
export function exportTime(value) {
  if (typeof value !== 'string') return NaN;
  const text = value.trim();
  return Date.parse(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d)?$/.test(text) ? `${text.replace(' ', 'T')}+08:00` : text);
}
export function createStoredExport(input, id, now = new Date()) {
  const createdAt = now.toISOString();
  const mime = { CSV: 'text/csv;charset=utf-8', HTML: 'text/html;charset=utf-8', JSON: 'application/json;charset=utf-8' }[input.format];
  const file = typeof input.content === 'string' && mime ? { content: mime.startsWith('text/') ? displayBusinessText(input.content) : input.content, mime } : undefined;
  return { id, scope: input.scope, targetId: input.targetId, fileName: input.fileName, format: input.format,
    dataScope: input.dataScope || '导出时当前数据', createdAt, expiresAt: new Date(now.getTime() + WEEK).toISOString(),
    status: file ? '可下载' : '原文件不可用', ...(file ? { file } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  };
}
export function exportAvailability(job, now = Date.now()) {
  const expiry = exportTime(job.expiresAt);
  const created = exportTime(job.createdAt);
  const expiresAt = Number.isFinite(expiry) ? expiry : Number.isFinite(created) ? created + WEEK : NaN;
  if (Number.isFinite(expiresAt) && now >= expiresAt) return { downloadable: false, label: '已过期', expiresAt };
  if (!Number.isFinite(expiresAt) || typeof job.file?.content !== 'string' || !job.file?.mime)
    return { downloadable: false, label: '原文件不可用', expiresAt };
  return { downloadable: true, label: '可下载', expiresAt };
}
export function storedExportDownload(job, now = Date.now()) {
  const availability = exportAvailability(job, now);
  if (!availability.downloadable) throw new Error(`${availability.label}，请按当前数据重新导出。`);
  return { fileName: job.fileName, content: job.file.content, mime: job.file.mime };
}
export const escapeReportText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
