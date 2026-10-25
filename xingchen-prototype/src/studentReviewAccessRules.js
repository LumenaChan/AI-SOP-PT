export function examReviewVisibility(arrangement) {
  const saved = arrangement.studentReviewVisibility || {};
  return { feedback: saved.feedback === true, recording: saved.recording === true, standard: saved.standard === true };
}
export function changeExamReviewVisibility(data, input, actor) {
  const arrangement = (data.arrangements || []).find(a => a.id === input.arrangementId);
  if (actor.role !== 'teacher' || !arrangement || arrangement.type !== 'exam' || arrangement.teacherId !== actor.id)
    throw new Error('只能由本场考试的负责教师设置学生复盘范围。');
  if (!['待发布', '已发布', '已归档'].includes(arrangement.status)) throw new Error('考试结束后才能设置学生复盘范围。');
  const before = examReviewVisibility(arrangement);
  if (JSON.stringify(before) !== input.expected) throw new Error('开放范围已变化，请刷新后重新设置。');
  const options = {};
  for (const key of ['feedback', 'recording', 'standard']) {
    if (typeof input.options?.[key] !== 'boolean') throw new Error('请确认完整的学生复盘范围。');
    options[key] = input.options[key];
  }
  return { ...data, arrangements: data.arrangements.map(a => a === arrangement ? { ...a, studentReviewVisibility: options, updatedAt: input.at } : a) };
}
