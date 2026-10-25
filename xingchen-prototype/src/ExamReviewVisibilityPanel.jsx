import React, { useState } from 'react';
import { examReviewVisibility } from './studentReviewAccessRules.js';
export function ExamReviewVisibilityPanel({ arrangement, store }) {
  const initial = examReviewVisibility(arrangement);
  const [options, setOptions] = useState(initial);
  const [message, setMessage] = useState('');
  const [expected, setExpected] = useState(JSON.stringify(initial));
  return <section className="panel exam-review-visibility"><header className="panel-title"><h2>学生复盘开放范围</h2></header>
    <p>成绩发布后才生效。可分别开放讲评、本人录像和本次标准示范资料。</p>
    <div>{[['feedback', '评分说明与教师反馈'], ['recording', '本人操作录像'], ['standard', '正确要求与示范资料']].map(([key, label]) => <label key={key}><input type="checkbox" checked={options[key]} onChange={e => setOptions({ ...options, [key]: e.target.checked })} />{label}</label>)}</div>
    <button className="button button--default" onClick={() => { try { store.saveExamReviewVisibility(arrangement.id, options, expected); setExpected(JSON.stringify(options)); setMessage('开放范围已保存；未发布成绩的学生仍只能查看提交状态。'); } catch (e) { setMessage(e.message); } }}>保存开放范围</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
