import test from 'node:test';
import assert from 'node:assert/strict';
import { studentResult } from '../src/studentResultRules.js';
const fixture = (type = 'practice') => ({
  sops: [{ id: 'sop', steps: [{ id: 'Step 02', completionCondition: '后来修改的要求不应泄漏' }] }],
  arrangements: [{ id: 'a', type, name: '本人练习', status: '已结束', snapshot: { sopSnapshot: { steps: [{ id: 'Step 02', completionCondition: '使用绝缘工具完成本次操作', keyPoints: '确认工具与操作对象', commonMistakes: '注意遗漏防护动作' }] } }, sessions: [{
    id: 'session', studentId: 'student', status: '已完成', resultStatus: '正式成绩', score: 70,
    internalNote: '内部敏感信息', steps: [
      { id: 'Step 01', name: '检查', score: 30, effectiveScore: 30, maxScore: 30, aiEvidenceState: 'unknown', result: '默认通过' },
      { id: 'Step 02', name: '操作', effectiveScore: 40, maxScore: 70, result: '人工确认未完成', reviewNote: '教师确认防护动作遗漏，扣30分', reviewer: '王老师', reviewedAt: '2026-10-25T10:00:00Z', internalNote: '内部根因不可公开' },
    ],
  }] }],
});
const result = d => studentResult(d, 'student', 'a', 'session');
test('低分步骤展示实际教师说明和本次要求，证据未确认保分不作为错误', () => {
  const d = fixture(), before = structuredClone(d), r = result(d);
  assert.equal(r.maxScore, 100);
  assert.equal(r.steps[0].review.needsAttention, false);
  assert.equal(r.steps[1].review.deduction, 30);
  assert.match(r.steps[1].review.teacherFeedback, /防护动作遗漏/);
  assert.equal(r.steps[1].review.correctRequirement, '使用绝缘工具完成本次操作');
  assert.ok(!JSON.stringify(r).includes('后来修改'));
  assert.ok(!JSON.stringify(r).includes('内部'));
  assert.deepEqual(d, before, '复盘只读取数据');
});
test('缺少明确错误原因时不编造，空分数不作为零分扣分', () => {
  const d = fixture(), s = d.arrangements[0].sessions[0];
  delete s.steps[1].reviewNote;
  s.steps[0].effectiveScore = '';
  const r = result(d);
  assert.equal(r.steps[0].review.deduction, null);
  assert.equal(r.steps[0].review.needsAttention, false);
  assert.match(r.steps[1].review.explanation, /具体操作问题尚未记录/);
  assert.ok(!r.steps[1].review.explanation.includes('量程'));
});
test('待复核独立标记，真实零分仍应列为重点', () => {
  const d = fixture(), s = d.arrangements[0].sessions[0];
  s.resultStatus = '待复核';
  Object.assign(s.steps[1], { effectiveScore: 0, reviewStatus: '待复核' });
  const r = result(d);
  assert.equal(r.steps[1].review.pendingReview, true);
  assert.equal(r.steps[1].review.deduction, 70);
  assert.equal(r.steps[1].review.attentionLabel, '待教师复核');
});
test('历史快照缺步骤不借用当前标准；无快照仅使用本会话记录的要求', () => {
  const d = fixture();
  d.arrangements[0].snapshot.sopSnapshot.steps = [];
  assert.equal(result(d).steps[1].review.correctRequirement, '');
  delete d.arrangements[0].snapshot;
  d.arrangements[0].sessions[0].steps[1].completionCondition = '当时记录的要求';
  assert.equal(result(d).steps[1].review.correctRequirement, '当时记录的要求');
});
test('教师复核历史只提取本步评分说明，不输出原始审计及其他学生结果', () => {
  const d = fixture(), s = d.arrangements[0].sessions[0];
  delete s.steps[1].reviewNote;
  s.gradeAuditHistory = [{ source: 'review', stepIds: ['Step 02'], reason: '已核实本步骤防护遗漏', internalNote: '内部审计', before: { score: 100 }, after: { score: 70 } }];
  const r = result(d);
  assert.equal(r.steps[1].review.teacherFeedback, '已核实本步骤防护遗漏');
  assert.equal('gradeAuditHistory' in r, false);
  assert.equal(studentResult(d, 'other', 'a', 'session'), null);
});
test('考试未发布不投影复盘；已发布默认不开放讲评与标准', () => {
  const d = fixture('exam');
  let r = result(d);
  assert.equal(r.visible, false);
  assert.ok(!JSON.stringify(r).includes('防护'));
  assert.equal('maxScore' in r, false);
  d.arrangements[0].sessions[0].resultStatus = '已发布';
  r = result(d);
  assert.equal(r.score, 70);
  assert.equal(r.steps[1].review.explanation, '');
  assert.equal(r.steps[1].review.correctRequirement, '');
  assert.equal('playback' in r.steps[1], false);
  assert.equal('standardMedia' in r.steps[1], false);
  assert.ok(!JSON.stringify(r).includes('内部'));
});
