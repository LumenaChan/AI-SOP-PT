import test from 'node:test';
import assert from 'node:assert/strict';
import { studentResult } from '../src/studentResultRules.js';
import { examReviewVisibility, changeExamReviewVisibility } from '../src/studentReviewAccessRules.js';
import { studentStepPlayback, studentStandardMedia, stepRange, playbackUrl } from '../src/studentPlaybackRules.js';
const now = Date.parse('2026-10-25T10:00:00Z');
function fixture() {
  return { arrangements: [{ id: 'a', type: 'exam', teacherId: 't', status: '已发布', snapshot: { sopSnapshot: { steps: [{ id: 's', completionCondition: '公开标准要求', commonMistakes: '公开标准提示', standardMedia: [{ id: 'm', url: '/assets/standard.mp4', name: '标准视频.mp4', kind: 'video' }] }] } }, sessions: [{ id: 'session', studentId: 'student', workstationId: 'w', status: '已完成', resultStatus: '已发布', endedAt: '2026-10-25T09:00:00Z', score: 80, steps: [{ id: 's', name: '操作', effectiveScore: 80, maxScore: 100, reviewNote: '本步教师评分反馈', internalNote: '不得泄漏内部事项', studentFeedback: { improvement: '教师给学生的改进建议' } }], recording: { status: '完整', retentionDays: 90, clips: [{ id: 'c', stepId: 's', sessionId: 'session', studentId: 'student', url: '/recording/own.mp4', cameraName: '主视角', startSeconds: 12, endSeconds: 25 }] } }] }] };
}
test('8种公开组合独立投影；未发布不因开关开启而泄漏', () => {
  for (let mask = 0; mask < 8; mask++) {
    const d = fixture(), a = d.arrangements[0];
    a.studentReviewVisibility = { feedback: Boolean(mask & 1), recording: Boolean(mask & 2), standard: Boolean(mask & 4) };
    let r = studentResult(d, 'student', 'a', 'session', now), text = JSON.stringify(r);
    assert.equal(text.includes('本步教师评分反馈'), Boolean(mask & 1));
    assert.equal(text.includes('/recording/own.mp4'), Boolean(mask & 2));
    assert.equal(text.includes('公开标准要求'), Boolean(mask & 4));
    assert.equal(text.includes('/assets/standard.mp4'), Boolean(mask & 4));
    assert.equal(text.includes('教师给学生的改进建议'), Boolean(mask & 1));
    assert.ok(!text.includes('不得泄漏内部事项'));
    a.sessions[0].resultStatus = '正式成绩';
    r = studentResult(d, 'student', 'a', 'session', now);
    assert.equal(r.visible, false);
    for (const word of ['反馈', '/recording/', '公开标准', 'standard.mp4']) assert.ok(!JSON.stringify(r).includes(word));
  }
});
test('公开由负责教师管理，不修改成绩、锁定快照或考试发布状态，拒绝管理员和过时设置', () => {
  const d = fixture(), before = structuredClone(d), a = d.arrangements[0];
  const input = { arrangementId: 'a', options: { feedback: true, recording: false, standard: true }, expected: JSON.stringify(examReviewVisibility(a)), at: 'now' };
  const changed = changeExamReviewVisibility(d, input, { role: 'teacher', id: 't' });
  assert.deepEqual(d, before);
  assert.deepEqual(changed.arrangements[0].sessions, a.sessions);
  assert.deepEqual(changed.arrangements[0].snapshot, a.snapshot);
  assert.equal(changed.arrangements[0].status, '已发布');
  assert.throws(() => changeExamReviewVisibility(d, input, { role: 'admin', id: 't' }), /负责教师/);
  assert.throws(() => changeExamReviewVisibility(d, input, { role: 'teacher', id: 'other' }), /负责教师/);
  assert.throws(() => changeExamReviewVisibility(changed, input, { role: 'teacher', id: 't' }), /已变化/);
  d.arrangements[0].status = '进行中';
  assert.throws(() => changeExamReviewVisibility(d, input, { role: 'teacher', id: 't' }), /考试结束/);
});
test('录像按本人会话与步骤定位，拒绝其他学生、失效地址、错误时间范围', () => {
  const d = fixture(), a = d.arrangements[0], s = a.sessions[0];
  s.recording.clips.push(...[
    { stepId: 's', studentId: 'other', url: '/other.mp4' },
    { stepId: 's', sessionId: 'other', url: '/other-session.mp4' },
    { stepId: 'other', url: '/other-step.mp4' },
    { stepId: 's', url: 'javascript:alert(1)' },
    { stepId: 's', url: '/bad.mp4', startSeconds: 25, endSeconds: 12 },
  ]);
  const r = studentStepPlayback(s.steps[0], s, now);
  assert.equal(r.clips.length, 1);
  assert.equal(r.clips[0].start, 12);
  assert.equal(r.clips[0].end, 25);
  assert.equal(studentResult(d, 'other', 'a', 'session', now), null);
  assert.equal(playbackUrl('data:text/html,evil'), '');
});
test('录像到期不输出地址；局部缺失仍可播放有效片段；没有录像不生成播放器数据', () => {
  const s = fixture().arrangements[0].sessions[0], step = s.steps[0];
  s.recording.status = '部分缺失';
  assert.equal(studentStepPlayback(step, s, now).status, 'partial');
  s.recording.expiresAt = '2026-10-25T10:00:00Z';
  const expired = studentStepPlayback(step, s, now);
  assert.equal(expired.status, 'expired');
  assert.ok(!JSON.stringify(expired).includes('own.mp4'));
  delete s.recording;
  assert.equal(studentStepPlayback(step, s, now).status, 'missing');
});
test('完整录像使用步骤时间定位，历史示范不借用当前标准，无效URL不输出', () => {
  assert.deepEqual(stepRange('06:00–08:30'), { start: 360, end: 510 });
  assert.equal(stepRange('08:30–06:00'), null);
  const s = { id: 'session', studentId: 'student', recording: { status: '完整', playbackUrl: '/own-full.mp4' } };
  assert.equal(studentStepPlayback({ id: 's', timeRange: '06:00–08:30' }, s, now).clips[0].start, 360);
  assert.equal(studentStepPlayback({ id: 's' }, s, now).clips.length, 0);
  const a = fixture().arrangements[0];
  assert.equal(studentStandardMedia(a.sessions[0].steps[0], a.sessions[0], a)[0].kind, 'video');
  a.snapshot.sopSnapshot.steps = [];
  assert.deepEqual(studentStandardMedia({ id: 's', standardMediaUrl: '/current.mp4' }, {}, a), []);
});

test('指定已发布展示结果允许样片，仍需本人身份且不改写业务数据', () => {
  const d = fixture(), a = d.arrangements[0], s = a.sessions[0];
  a.id = 'exam-dashboard-published-20261022';
  s.id = 'session-dashboard-published-20261022';
  a.studentReviewVisibility = { feedback: false, recording: false, standard: false };
  s.recording = { status: '不可用', storageStatus: '已过期' };
  const before = structuredClone(d);
  const r = studentResult(d, 'student', a.id, s.id, now);
  assert.equal(r.reviewAccess.recording, true);
  assert.equal(r.steps[0].playback.defaultExpanded, true);
  assert.equal(r.steps[0].playback.clips[0].url, '/assets/student-review-preview.mp4');
  assert.equal(r.reviewAccess.feedback, false);
  assert.equal(r.reviewAccess.standard, false);
  assert.deepEqual(d, before, '样片不能更新录像状态、成绩、公开设置或历史数据');
  assert.equal(studentResult(d, 'other', a.id, s.id, now), null);
  s.resultStatus = '正式成绩';
  assert.ok(!JSON.stringify(studentResult(d, 'student', a.id, s.id, now)).includes('student-review-preview.mp4'));
});
