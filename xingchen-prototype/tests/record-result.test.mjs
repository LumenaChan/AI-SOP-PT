import test from 'node:test';
import assert from 'node:assert/strict';
import { getArrangementResultStats, sessionResultPresentation, arrangementAbnormalWorkstations } from '../src/recordResultRules.js';
import { sessionPrimaryIssue } from '../src/domainRules.js';
import { stepDiagnostic, diagnosticCheckLabel } from '../src/sessionDiagnosticRules.js';

test('进行中均分排除未开始、未参加和无效分数，发布门槛不冒充待复核人数', () => {
  const a = { sessions: [
    { id: 'waiting', status: '待开始', score: 0 },
    { id: 'absent', resultStatus: '未参加', score: 0 },
    { id: 'active', status: '进行中', score: 50 },
    { id: 'fault', status: '故障', score: 30, steps: [{ result: '安全阻断' }] },
    { id: 'empty', status: '进行中', score: '' },
  ] };
  const r = getArrangementResultStats(a);
  assert.equal(r.average, '40.0');
  assert.match(r.averageHint, /2 条记录.*含暂计分/);
  assert.deepEqual(r.reviews.map(s => s.id), ['fault']);
  assert.ok(r.blockers.length > r.reviews.length);
  assert.equal(getArrangementResultStats({ sessions: [a.sessions[0]] }).average, '--');
});
test('待处理事项按学生去重，正常进行中不算待复核', () => {
  const r = getArrangementResultStats({ sessions: [
    { id: 'a', status: '已完成', resultStatus: '待复核', steps: [{ scoreDisposition: { status: 'retest_required' } }], runtime: { safetyCandidates: [{ status: 'pending' }] } },
    { id: 'b', status: '进行中' },
    { id: 'c', status: '已完成', resultStatus: '正式成绩', score: 0 },
  ] });
  assert.deepEqual(r.reviews.map(s => s.id), ['a']);
  assert.equal(r.average, '0.0', '真正的零分必须保留');
  assert.equal(sessionResultPresentation(r.sessions[0]).gradeStatus, '待复核');
  assert.equal(sessionResultPresentation(r.sessions[1]).gradeStatus, '暂计分');
  assert.equal(sessionResultPresentation({ status: '待开始', score: 0 }).score, '—');
});
test('主要问题排除未执行和执行中的暂计零分，安全优先于普通扣分', () => {
  const unfinished = { id: 'next', state: 'pending', effectiveScore: 0, maxScore: 10 };
  assert.equal(sessionPrimaryIssue({ status: '待开始', steps: [unfinished] }), '尚未开始');
  assert.equal(sessionPrimaryIssue({ status: '进行中', steps: [unfinished, { ...unfinished, state: 'active' }] }), '无已确认问题');
  assert.equal(sessionPrimaryIssue({ steps: [
    { id: 'deduction', name: '普通扣分', effectiveScore: 5, maxScore: 10 },
    { id: 'safety', name: '验电', state: 'blocked' },
  ] }), 'safety · 验电');
});
test('异常工位包含故障和本安排限制，排除无关工位与仅暂停', () => {
  const data = { workstations: [
    { id: 'fault', status: '故障' },
    { id: 'hold', releaseHold: { arrangementId: 'a', reasons: ['待恢复'] } },
    { id: 'paused', status: '暂停中' },
    { id: 'other', status: '故障' },
  ] };
  assert.deepEqual(arrangementAbnormalWorkstations(data, { id: 'a', workstationIds: ['fault', 'hold', 'paused'] }).map(x => x.workstation.id), ['fault', 'hold']);
});
test('安全阻断不证明动作充分，缺少证据不是未满足，无区域要求不是已满足', () => {
  const s = { state: 'blocked', id: 'step', diagnostic: { checks: { objectVisible: true, actionSufficient: true } } };
  const before = structuredClone(s);
  const d = stepDiagnostic(s, { recording: { status: '部分缺失', incidents: [{ affectedStepId: 'step', detail: '录像中断' }] } });
  assert.equal(d.checks.objectVisible, null);
  assert.equal(d.checks.actionSufficient, null);
  assert.equal(d.checks.evidenceContinuous, false);
  assert.match(d.noTriggerReason, /不代表动作完成条件已满足.*录像/);
  assert.deepEqual(s, before, '诊断不改写成绩、历史或源记录');
  const normal = stepDiagnostic({ id: 'step' }, { evaluationSnapshot: { aiCapabilityConfigSnapshot: { judgementItems: [] } } });
  assert.equal(normal.checks.roiMatched, 'not_applicable');
  assert.equal(diagnosticCheckLabel(null), '未取得证据');
  assert.equal(diagnosticCheckLabel(false), '未满足');
});
test('区域映射只核查当前步骤；其他步骤录像异常不直接判当前步骤失败', () => {
  const d = stepDiagnostic({ id: 'step', state: 'active' }, { recording: { status: '部分缺失', incidents: [{ affectedStepId: 'other' }] }, evaluationSnapshot: {
    aiCapabilityConfigSnapshot: { judgementItems: [{ stepId: 'other', conditions: [{ logicalAreaId: 'area' }] }] },
  } });
  assert.equal(d.checks.roiMatched, 'not_applicable');
  assert.equal(d.checks.evidenceContinuous, null);
  assert.equal(stepDiagnostic({ state: 'pending' }, { recording: { status: '不可用' } }).checks.evidenceContinuous, null);
  assert.equal(stepDiagnostic({ judgementMode: 'default_pass_manual_deduction' }).checks.actionSufficient, 'not_applicable');
});
