import { StudentStepPlayback } from './StudentStepPlayback.jsx';
import { StandardMediaSection } from './StandardMedia.jsx';
import React, { useState } from 'react';
import { displayBusinessText, displayStepLabel } from './businessTextRules.js';
export function StudentResultReview({ result }) {
  const [filter, setFilter] = useState('all');
  const attention = result.steps.filter(s => s.review?.needsAttention);
  const steps = filter === 'attention' ? attention : result.steps;
  const number = value => value == null || String(value).trim() === '' || !Number.isFinite(Number(value)) ? '—' : value;
  return <div className="student-review">
    <section className="student-review-overview">
      <h2>{result.score == null ? '成绩待核对' : `有效得分 ${result.score} 分`}{result.maxScore > 0 && <span> / 满分 {result.maxScore} 分</span>}</h2>
      <p>{result.status === '练习结果待复核' ? '以下为当前结果，待教师复核的步骤会明确标注。' : result.type === 'exam' ? '以下内容按教师设置的复盘范围展示。' : '查看评分说明和教师反馈，按本次标准复盘操作。'}</p>
      <h3>重点改进</h3>
      {attention.length ? <ul>{attention.map(step => <li key={step.id}><a href={`#student-review-step-${encodeURIComponent(step.id)}`} onClick={event => {
        event.preventDefault();
        setFilter('all');
        requestAnimationFrame(() => {
          const target = document.getElementById(`student-review-step-${encodeURIComponent(step.id)}`);
          if (target) { target.open = true; target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
      }}>{displayStepLabel(step.id)} · {step.name}</a><span>{step.review.attentionLabel}{step.review.deduction > 0 ? ` · ${step.review.pendingReview ? '当前扣' : '扣'}${step.review.deduction}分` : ''}</span></li>)}</ul> : <p>本次没有已记录的扣分或待处理问题。可展开步骤查看已开放的复盘内容。</p>}
    </section>
    <section className="student-review-detail">
      <div className="student-review-toolbar"><h2>步骤复盘</h2><div role="group" aria-label="步骤筛选">
        <button className="button button--default" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>全部步骤（{result.steps.length}）</button>
        <button className="button button--default" aria-pressed={filter === 'attention'} onClick={() => setFilter('attention')}>重点关注（{attention.length}）</button>
      </div></div>
      {!steps.length && <p>没有需要重点关注的步骤，可切换查看全部步骤。</p>}
      <div className="student-review-steps">{result.steps.map(step => {
        const review = step.review;
        return <div key={step.id} hidden={!steps.includes(step)}><details id={`student-review-step-${encodeURIComponent(step.id)}`} className="student-review-step" open={Boolean(review?.needsAttention)} onToggle={event => { if (!event.currentTarget.open) event.currentTarget.querySelectorAll('video').forEach(v => v.pause()); }}>
          <summary><strong>{displayStepLabel(step.id)} · {step.name}</strong><span>{number(step.score)}/{number(step.maxScore)} 分{review?.needsAttention ? ` · ${review.attentionLabel}` : ''}</span></summary>
          <div className="student-review-step-body">
            {review?.explanation && <section><h3>{review.teacherFeedback ? '教师反馈与评分说明' : '评分说明'}</h3><p>{displayBusinessText(review.explanation)}</p>{(review.teacher || review.feedbackAt) && <small>{review.teacher || '教师'}{review.feedbackAt && ` · ${displayBusinessText(review.feedbackAt)}`}</small>}</section>}
            {review?.pendingReview && <p className="student-review-pending">本步骤尚待教师复核，请以教师确认后的结果为准。</p>}
            {review && result.reviewAccess?.standard !== false && <section><h3>本次正确要求</h3><p>{review.correctRequirement || '本次步骤的正确要求未记录，请向教师确认。'}</p>{review.operatingPoints && review.operatingPoints !== review.correctRequirement && <p>操作要点：{review.operatingPoints}</p>}</section>}
            {review?.improvement && <section><h3>下次实训注意</h3><p>{review.improvement}</p></section>}
            {steps.includes(step) && step.playback && <StudentStepPlayback key={step.id} playback={step.playback} />}
            {steps.includes(step) && step.standardMedia?.length > 0 && <StandardMediaSection step={{ standardMedia: step.standardMedia }} title="查看正确示范" hideEmpty />}
            <details className="student-review-record"><summary>查看流程与证据记录</summary><p>{step.result}</p><p>{step.flow}{step.flowActor && ` · ${step.flowActor} · ${displayBusinessText(step.flowAt)}`}</p><p>{step.evidence}</p></details>
          </div>
        </details></div>;
      })}</div>
    </section>
  </div>;
}
