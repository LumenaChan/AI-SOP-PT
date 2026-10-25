// Diagnostic presentation uses locked configuration and recorded evidence only.
// Legacy diagnostic.checks were inferred from scores/states and are not evidence.
export function stepDiagnostic(step = {}, session = {}) {
  const snapshot = session.evaluationSnapshot || {};
  const ai = snapshot.aiCapabilityConfigSnapshot;
  const config = snapshot.sopWorkstationAiConfigSnapshot;
  const manual = step.judgementMode === 'default_pass_manual_deduction';
  const items = (ai?.judgementItems || []).filter(j => j.stepId === step.id && j.enabled !== false);
  const required = items.flatMap(j => (j.conditions || []).map(c => c.logicalAreaId).filter(Boolean));
  const mappings = config?.logicalAreaMappings || [];
  const recording = session.recording;
  const pending = step.state === 'pending' || ['待开始', '可入场'].includes(session.status);
  const incidents = (recording?.incidents || []).filter(i => i.affectedStepId === step.id || i.affectedStepId === '全部步骤');
  const checks = {
    objectVisible: manual ? 'not_applicable' : null,
    actionSufficient: manual ? 'not_applicable' : null,
    roiMatched: manual ? 'not_applicable' : !ai ? null : !required.length ? 'not_applicable' :
      !config ? null : required.every(id => mappings.some(m => m.logicalAreaId === id)),
    evidenceContinuous: pending ? null : incidents.length || recording?.status === '不可用' ? false :
      recording?.status === '完整' && Boolean(step.timeRange) ? true : null,
    configComplete: manual ? 'not_applicable' : !ai || !config ? null :
      (session.evaluationProfile?.aiRuntimeEnabled ?? session.evaluationProfile?.automaticEvaluationEnabled) === true ? true : null,
  };
  const safety = step.state === 'blocked' || step.redlineConfirmed || step.executionState === 'safety_blocked';
  const complete = step.completionResult === 'complete' || step.state === 'pass';
  const status = safety ? '安全阻断已触发' : pending ? '尚未执行' : complete ? '步骤已完成' : '尚未确认完成';
  const parts = [safety ? '安全阻断已触发，不代表动作完成条件已满足' : status];
  if (checks.evidenceContinuous === false) parts.push('本步骤录像存在缺失或不可用');
  if (!manual && checks.configComplete === null) parts.push('缺少完整的本次AI运行配置依据');
  if (!manual && !pending) parts.push('目标可见性和动作持续情况尚无独立检查证据');
  return { checks, triggerStatus: status, noTriggerReason: parts.join('；'), recentFacts: [step.observation, ...incidents.map(i => i.detail)].filter(Boolean) };
}
export const diagnosticCheckLabel = value => value === true ? '满足' : value === false ? '未满足' : value === 'not_applicable' ? '不适用' : '未取得证据';

export function diagnosticLinks(record, session, step, data, source = 'browser') {
  if (!session || !step) return [];
  const scope = new URLSearchParams({ source });
  const links = [];
  if ((data.students || []).some(s => s.id === session.studentId)) {
    const params = new URLSearchParams({ sessionId: session.id, stepId: step.id, source });
    links.push({ label: '查看本步骤证据', path: `/admin/${record.type === 'exam' ? 'exams' : 'practices'}/${encodeURIComponent(record.id)}/students/${encodeURIComponent(session.studentId)}?${params}` });
  }
  if ((data.workstations || []).some(w => w.id === session.workstationId)) links.push({ label: '查看当前工位', path: `/admin/workstations/${encodeURIComponent(session.workstationId)}?${scope}` });
  const sopId = session.evaluationSnapshot?.sopId || record.snapshot?.sopId || record.sopId;
  if ((data.sops || []).some(s => s.id === sopId) && (data.aiCapabilityConfigs || []).some(c => c.sopId === sopId)) {
    const params = new URLSearchParams({ tab: 'workstation', workstationId: session.workstationId || '', source });
    links.push({ label: '查看当前AI配置', path: `/admin/ai-capability-config/${encodeURIComponent(sopId)}?${params}` });
  }
  return links;
}
