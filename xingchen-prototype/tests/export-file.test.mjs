import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoredExport, storedExportDownload, exportAvailability, escapeReportText } from '../src/exportFileRules.js';
import { arrangementRecordContext } from '../src/recordResultRules.js';
import { diagnosticLinks } from '../src/sessionDiagnosticRules.js';

test('导出原文件保持生成时内容、范围和格式，不随成绩修改变化', () => {
  const now = new Date('2026-10-25T10:00:00Z');
  const input = { targetId: 'a', scope: '个人报告', sessionId: 'session', fileName: '个人报告.html', format: 'HTML', content: '<p>成绩70分</p>' };
  const job = createStoredExport(input, 'job', now);
  input.content = '<p>成绩100分</p>';
  const file = storedExportDownload(job, now.getTime());
  assert.equal(file.content, '<p>成绩70分</p>');
  assert.equal(file.fileName, '个人报告.html');
  assert.equal(file.mime, 'text/html;charset=utf-8');
  assert.equal(job.sessionId, 'session');
  assert.equal(job.expiresAt, '2026-11-01T10:00:00.000Z');
});
test('有效期在临界时刻及点击下载时生效，旧记录不冒充原文件', () => {
  const now = new Date('2026-10-25T10:00:00Z');
  const job = createStoredExport({ fileName: 'x.csv', format: 'CSV', content: '\ufeff学生,分数\n张三,0' }, 'j', now);
  const end = Date.parse(job.expiresAt);
  assert.equal(exportAvailability(job, end - 1).downloadable, true);
  assert.equal(exportAvailability(job, end).label, '已过期');
  assert.throws(() => storedExportDownload(job, end), /已过期/);
  assert.equal(exportAvailability({ createdAt: '2026-10-25 18:00:00', expiresAt: '生成后 7 天' }, now.getTime()).label, '原文件不可用');
  assert.equal(exportAvailability({ createdAt: '2026-10-18 18:00:00', expiresAt: '生成后 7 天' }, now.getTime()).label, '已过期');
  assert.equal(exportAvailability({ file: { content: 'bytes', mime: 'text/plain' } }, now.getTime()).downloadable, false);
});
test('导出报告将名称和依据作为文字，不能执行其中的HTML', () => {
  assert.equal(escapeReportText('<script>"x" & \'y\'</script>'), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
});
test('记录背景优先使用本次锁定标准，缺少时间与快照时如实标记', () => {
  const data = { teachers: [{ id: 't', name: '负责教师' }], sops: [{ id: 's', name: '修改后的标准' }] };
  const a = { teacherId: 't', sopId: 's', status: '进行中', snapshot: { sopSnapshot: { name: '本次标准' } } };
  assert.equal(arrangementRecordContext(data, a).standardName, '本次标准');
  assert.equal(arrangementRecordContext(data, a).teacher, '负责教师');
  assert.equal(arrangementRecordContext(data, a).endedAt, '尚未结束');
  assert.equal(arrangementRecordContext(data, { ...a, status: '已结束', snapshot: {} }).endedAt, '未记录');
  assert.equal(arrangementRecordContext(data, { ...a, snapshot: {} }).standardBasis, '历史标准快照未记录');
  assert.equal(arrangementRecordContext(data, a, { evaluationSnapshot: { sopSnapshot: { name: '会话锁定标准' } } }).standardName, '会话锁定标准');
});
test('诊断跳转保持学生、会话、步骤和数据来源，缺失关联不跳到其他资源', () => {
  const a = { id: 'a', type: 'practice', sopId: 's' }, session = { id: 'sess', studentId: 'u', workstationId: 'w' }, step = { id: 'Step 03' };
  const data = { students: [{ id: 'u' }], workstations: [{ id: 'w' }], sops: [{ id: 's' }], aiCapabilityConfigs: [{ sopId: 's' }] };
  const links = diagnosticLinks(a, session, step, data, 'cpd');
  const u = new URL(links[0].path, 'http://local');
  assert.equal(u.pathname, '/admin/practices/a/students/u');
  assert.equal(u.searchParams.get('sessionId'), 'sess');
  assert.equal(u.searchParams.get('stepId'), 'Step 03');
  assert.equal(u.searchParams.get('source'), 'cpd');
  assert.ok(links.every(l => l.path.includes('source=cpd')));
  assert.equal(new URL(links[2].path, 'http://local').searchParams.get('workstationId'), 'w');
  assert.deepEqual(diagnosticLinks(a, session, step, {}, 'cpd'), []);
});
