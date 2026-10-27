import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldPreparation, fieldWorkflowState } from '../src/fieldPreparationRules.js';
test('准备检查逐项返回缺失原因与修正目标，不把一般配置完整当作具备正式验收条件', () => {
  const data = { aiCapabilities: [] }, aiConfig = { judgementItems: [] };
  const checks = { ready: false, issues: ['未选镜头'], checks: [{ key: 'camera_bindings', passed: false, label: '判断项视角', reason: '未选镜头' }, { key: 'logical_areas', passed: true, label: '区域' }] };
  const before = structuredClone({ data, aiConfig, checks });
  const r = fieldPreparation({ checks, aiConfig, data });
  assert.equal(r.ready, false);
  assert.equal(r.rows[0].target, 'cameras');
  assert.equal(r.rows[1].target, 'areas');
  assert.equal(r.rows.at(-1).target, 'models');
  assert.ok(r.issues.includes('未选镜头'));
  assert.deepEqual({ data, aiConfig, checks }, before);
  assert.equal(fieldPreparation({ checks: { ready: true, checks: [] }, aiConfig, data }).ready, false);
});
test('旧配置检查通过与启用记录不冒充正式验收，完整现场证据才显示已启用', () => {
  const legacy = { validationPurpose: 'prototype_demo', validationStatus: 'passed', enableStatus: 'enabled' };
  const before = structuredClone(legacy);
  assert.equal(fieldWorkflowState(legacy, true).accepted, false);
  assert.match(fieldWorkflowState(legacy, true).validationLabel, /历史检查/);
  assert.equal(fieldWorkflowState(legacy, true).enableLabel, '启用记录待核验');
  assert.deepEqual(legacy, before);
  const formal = { ...legacy, validationPurpose: 'real', validationRunId: 'run', fieldAcceptance: { status: 'passed', runId: 'run' } };
  assert.equal(fieldWorkflowState(formal, true).accepted, true);
  assert.equal(fieldWorkflowState(formal, true).enableLabel, '已启用');
  assert.equal(fieldWorkflowState(formal, false).accepted, false);
});
