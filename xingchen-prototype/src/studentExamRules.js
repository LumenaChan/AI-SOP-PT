export const DEFAULT_EXAM_DURATION_MINUTES = 30;
export const MIN_EXAM_DURATION_MINUTES = 5;
export const MAX_EXAM_DURATION_MINUTES = 240;

export const EXAM_INCIDENT_REASONS = [
  { value: "device_failure", label: "设备故障" },
  { value: "site_incident", label: "现场异常" },
  { value: "physical_discomfort", label: "身体不适" },
  { value: "other", label: "其他" },
];

function studentEventTime(value) {
  const text = String(value || "");
  const match = text.match(/(?:T|\s)(\d{2}:\d{2})/);
  return match?.[1] || text;
}

function timestampMs(value) {
  if (!value) return NaN;
  const normalized = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");
  return new Date(normalized).getTime();
}

export function normalizeExamDuration(value) {
  const duration = Number(value);
  return Number.isInteger(duration) &&
    duration >= MIN_EXAM_DURATION_MINUTES &&
    duration <= MAX_EXAM_DURATION_MINUTES
    ? duration
    : DEFAULT_EXAM_DURATION_MINUTES;
}

export function validateExamDuration(value) {
  const duration = Number(value);
  if (!Number.isInteger(duration)) throw new Error("考试时长必须为整数分钟。");
  if (
    duration < MIN_EXAM_DURATION_MINUTES ||
    duration > MAX_EXAM_DURATION_MINUTES
  )
    throw new Error(
      `考试时长应为 ${MIN_EXAM_DURATION_MINUTES}～${MAX_EXAM_DURATION_MINUTES} 分钟。`,
    );
  return duration;
}

export function elapsedTextToSeconds(value) {
  const parts = String(value || "")
    .split(":")
    .map(Number);
  if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item)))
    return 0;
  return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
}

export function createExamTiming({
  durationMinutes,
  startedAt,
  effectiveElapsedSeconds = 0,
  paused = false,
  now = startedAt,
} = {}) {
  const at = now || new Date().toISOString();
  return {
    durationMinutes: normalizeExamDuration(durationMinutes),
    startedAt: startedAt || at,
    accumulatedActiveSeconds: Math.max(0, Number(effectiveElapsedSeconds || 0)),
    lastResumedAt: paused ? "" : at,
    pausedAt: paused ? at : "",
  };
}

export function normalizeExamTiming(session, durationMinutes, now) {
  const timing = session?.examTiming;
  if (timing)
    return {
      durationMinutes: normalizeExamDuration(
        timing.durationMinutes ??
          session.examDurationMinutes ??
          durationMinutes,
      ),
      startedAt: timing.startedAt || session.startedAt || now || "",
      accumulatedActiveSeconds: Math.max(
        0,
        Number(timing.accumulatedActiveSeconds || 0),
      ),
      lastResumedAt:
        timing.lastResumedAt || (session?.status === "进行中" ? now || "" : ""),
      pausedAt: timing.pausedAt || "",
    };
  const paused = session?.status !== "进行中";
  return createExamTiming({
    durationMinutes: session?.examDurationMinutes ?? durationMinutes,
    startedAt: session?.startedAt || now,
    effectiveElapsedSeconds:
      session?.runtime?.evaluationClock?.elapsedSeconds ??
      elapsedTextToSeconds(session?.elapsed),
    paused,
    now,
  });
}

export function examEffectiveElapsedSeconds(session, now = Date.now()) {
  const timing = normalizeExamTiming(
    session,
    session?.examDurationMinutes,
    new Date(now).toISOString(),
  );
  let elapsed = timing.accumulatedActiveSeconds;
  if (session?.status === "进行中" && timing.lastResumedAt) {
    const resumedAt = timestampMs(timing.lastResumedAt);
    if (Number.isFinite(resumedAt))
      elapsed += Math.max(0, (Number(now) - resumedAt) / 1000);
  }
  return Math.max(0, Math.floor(elapsed));
}

export function examRemainingSeconds(session, now = Date.now()) {
  if (!session) return 0;
  const duration = normalizeExamDuration(
    session.examTiming?.durationMinutes ?? session.examDurationMinutes,
  );
  return Math.max(0, duration * 60 - examEffectiveElapsedSeconds(session, now));
}

export function transitionExamTiming(session, paused, now) {
  const at = now || new Date().toISOString();
  const atMs = timestampMs(at);
  const timing = normalizeExamTiming(session, session?.examDurationMinutes, at);
  if (paused) {
    const resumedMs = timestampMs(timing.lastResumedAt);
    const additional =
      Number.isFinite(resumedMs) && Number.isFinite(atMs)
        ? Math.max(0, Math.floor((atMs - resumedMs) / 1000))
        : 0;
    return {
      ...timing,
      accumulatedActiveSeconds: timing.accumulatedActiveSeconds + additional,
      lastResumedAt: "",
      pausedAt: at,
    };
  }
  return {
    ...timing,
    lastResumedAt: at,
    pausedAt: "",
  };
}

export function formatExamRemaining(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function examCountdownTone(seconds) {
  if (seconds <= 60) return "danger";
  if (seconds <= 5 * 60) return "warning";
  return "normal";
}

export function buildExamIncidentPayload(reasonCode, note = "") {
  const reason = EXAM_INCIDENT_REASONS.find(
    (item) => item.value === reasonCode,
  );
  if (!reason) throw new Error("请选择异常类型。");
  const cleanNote = String(note || "").trim();
  if (reasonCode === "other" && !cleanNote)
    throw new Error("请填写其他异常说明。");
  return { reasonCode, reasonLabel: reason.label, note: cleanNote };
}

export function appendExamIncidentHelpRequest(
  session,
  workstationId,
  payload,
  { id, createdAt },
) {
  if (!session?.studentId) throw new Error("考试 Session 不存在。");
  if (session.examIncidentHelpRequestedAt) return session;
  const detail = [payload?.reasonLabel, payload?.note]
    .filter(Boolean)
    .join("：");
  const event = {
    id,
    type: "exam_incident_help_requested",
    source: "student_exam_incident_help",
    studentId: session.studentId,
    sessionId: session.id,
    workstationId,
    stepId: session.currentStepId || "",
    reason: payload?.reasonLabel || "其他",
    reasonCode: payload?.reasonCode || "other",
    note: payload?.note || "",
    detail,
    createdAt,
    time: studentEventTime(createdAt),
    level: "warning",
    title: "学生发起考试异常求助",
    scoreImpact: "none",
    requiresAttention: true,
  };
  return {
    ...session,
    examIncidentHelpRequestedAt: createdAt,
    events: [event, ...(session.events || [])],
  };
}

export function formatExamEntryWindow(scheduleStart, entryEnd) {
  if (!scheduleStart) return "以教师现场安排为准";
  const start = String(scheduleStart).replace("T", " ").slice(0, 16);
  const end = entryEnd ? String(entryEnd).replace("T", " ").slice(11, 16) : "";
  return end ? `${start} - ${end}` : start;
}

export function examEntryStatus(scheduleStart, entryEnd, now = Date.now()) {
  const start = timestampMs(scheduleStart);
  const end = timestampMs(entryEnd);
  if (Number.isFinite(start) && now < start) return "未到入场时间";
  if (Number.isFinite(end) && now > end) return "已超过入场截止时间";
  return "可入场";
}
