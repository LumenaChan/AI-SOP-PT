import { fieldModelIssues, referencedValidationCapabilities } from './fieldValidationEvidenceRules.js';
import { workstationValidationLabel, WORKSTATION_ENABLE_STATUSES } from './sopWorkstationAiRules.js';
export function fieldPreparation({ checks, aiConfig, data }) {
  const targets = { workstation: 'base', readiness: 'base', primary_camera: 'base', camera_bindings: 'cameras', logical_areas: 'areas', capabilities: 'models', ai_config: 'judgement' };
  const rows = (checks.checks || []).map(check => ({ ...check, target: targets[check.key] || 'base' }));
  const issues = fieldModelIssues(referencedValidationCapabilities(aiConfig, data.aiCapabilities || []), data);
  rows.push({ key: 'model_evidence', label: '当前模型接入核验与独立评测报告齐全', passed: !issues.length, reason: issues.join('；'), target: 'models' });
  return { rows, ready: checks.ready && rows.every(row => row.passed), issues: [...new Set([...(checks.issues || []), ...rows.filter(r => !r.passed).map(r => r.reason).filter(Boolean)])] };
}
export function fieldWorkflowState(relation, validated = false) {
  const formal = relation.validationPurpose === 'real';
  const accepted = formal && validated && relation.validationStatus === 'passed' && relation.fieldAcceptance?.status === 'passed' && relation.fieldAcceptance.runId === relation.validationRunId;
  return {
    accepted,
    validationLabel: !formal && ['passed', 'validating'].includes(relation.validationStatus) ? '历史检查记录 · 待现场验收' : relation.validationStatus === 'passed' && !accepted ? '验收依据待复核' : workstationValidationLabel(relation),
    enableLabel: relation.enableStatus === 'enabled' && !accepted ? '启用记录待核验' : WORKSTATION_ENABLE_STATUSES[relation.enableStatus],
  };
}
