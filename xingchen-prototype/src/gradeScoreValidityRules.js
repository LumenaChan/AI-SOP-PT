// Shared score validity for statistics and publication. Stored empty values are never inferred.
const array = (value) => (Array.isArray(value) ? value : []);
const own = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);
export function strictMetricNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  if (
    typeof value === "string" &&
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function maxForStep(step, sop) {
  if (own(step, "maxScore")) return strictMetricNumber(step.maxScore);
  const definition = array(sop.steps).find(
    (candidate) => candidate.id === step.id,
  );
  return strictMetricNumber(definition?.maxScore ?? definition?.score);
}

export function maximumFor(session, sop) {
  if (own(session, "maxScore")) return strictMetricNumber(session.maxScore);
  const steps = array(session.steps);
  if (steps.length) {
    const maxima = steps.map((step) => maxForStep(step, sop));
    if (maxima.some((max) => max === null || max < 0)) return null;
    return maxima.reduce((total, max) => total + max, 0);
  }
  // Frozen standard scores are a denominator, never a substitute for results.
  const definitions = array(sop.steps);
  if (!definitions.length) return null;
  const maxima = definitions.map((step) =>
    strictMetricNumber(step.maxScore ?? step.score),
  );
  return maxima.some((max) => max === null || max < 0)
    ? null
    : maxima.reduce((sum, max) => sum + max, 0);
}

export function stepScore(step) {
  return strictMetricNumber(
    own(step, "effectiveScore") ? step.effectiveScore : step.score,
  );
}

export function gradeScoreValidity(session = {}, sop = {}) {
  const score = strictMetricNumber(
    own(session, "score") ? session.score : session.scoreEngine?.effectiveScore,
  );
  const maxScore = maximumFor(session, sop);
  const invalidSteps = array(session.steps).filter((step) => {
    const value = stepScore(step),
      max = maxForStep(step, sop);
    return (
      value === null || max === null || max < 0 || value < 0 || value > max
    );
  });
  const invalidMaximum = maxScore === null || maxScore <= 0;
  const invalidTotal =
    score === null || score < 0 || (maxScore !== null && score > maxScore);
  return {
    score,
    maxScore,
    invalidSteps,
    invalidMaximum,
    invalidTotal,
    valid: !invalidMaximum && !invalidTotal && !invalidSteps.length,
  };
}
