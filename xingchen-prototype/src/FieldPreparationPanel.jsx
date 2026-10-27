import React from 'react';
import { ValidationModelReports } from './FieldValidationPanels.jsx';
export function focusFieldSection(id) {
  const element = document.getElementById(id);
  if (!element) return;
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
  }
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  element.querySelector('input, select, button')?.focus({ preventScroll: true });
}
export function FieldPreparationPanel({ relation, preparation, store, setModal }) {
  const id = relation.id;
  return <section id={`field-preparation-${id}`} className="ai-workstation-block field-preparation">
    <header className="panel-title"><h2>1. 准备检查</h2><span>{preparation.ready ? '准备齐全' : `${preparation.rows.filter(r => !r.passed).length}项需要处理`}</span></header>
    <p className="hint">先处理下方缺项，再开始现场验证；修改配置后检查状态会自动更新。</p>
    <div className="field-preparation-list">{preparation.rows.map(row => <article key={row.key}>
      <div><strong>{row.label}</strong>{row.reason && <p>{row.reason}</p>}</div>
      <span className={row.passed ? 'is-pass' : 'is-fail'}>{row.passed ? '已满足' : '待处理'}</span>
      {row.target === 'base' ? <a className="button button--default" href={`/admin/workstations/${encodeURIComponent(relation.workstationId)}?source=${store.dataSource || 'browser'}`}>查看设备配置</a> : row.target === 'judgement' ? <a className="button button--default" href={`/admin/ai-capability-config/${encodeURIComponent(store.data.aiCapabilityConfigs?.find(c => c.id === relation.sopAiConfigId)?.sopId || '')}?tab=judgement&source=${store.dataSource || 'browser'}`}>查看判断项配置</a> : <button className="button button--default" onClick={() => focusFieldSection(`field-${row.target}-${id}`)}>{row.target === 'cameras' ? '配置摄像头视角' : row.target === 'areas' ? '配置实际区域' : '查看模型与评测'}</button>}
    </article>)}</div>
    <div className="row-actions"><button className="button button--primary" disabled={!preparation.ready} onClick={() => focusFieldSection(`field-validation-${id}`)}>下一步：现场验证</button></div>
  </section>;
}
export function FieldModelPreparation({ relation, store, setModal }) {
  return <section className="ai-workstation-block" id={`field-models-${relation.id}`}><header className="panel-title"><h2>模型与独立评测</h2></header><ValidationModelReports relation={relation} store={store} setModal={setModal} /></section>;
}
