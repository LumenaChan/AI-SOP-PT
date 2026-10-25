// Display-only sample requested for this exact published example. It never
// changes recording evidence, scores, publication settings or persisted data.
export function studentReviewPreviewPlayback(arrangementId, sessionId, stepId) {
  if (arrangementId !== 'exam-dashboard-published-20261022' || sessionId !== 'session-dashboard-published-20261022') return null;
  return {
    status: 'available', defaultExpanded: true,
    message: '可播放操作片段，支持暂停和倍速查看。',
    clips: [{ id: `review-preview-${stepId}`, label: '实训画面', url: '/assets/student-review-preview.mp4', poster: '/assets/student-monitor-hand-tracking.png', start: 0, end: 12 }],
  };
}
