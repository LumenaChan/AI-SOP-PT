import { displayClockTime } from "./dateTimeRules.js";
import { notificationTime } from "./notificationRules.js";

const WAITING_SESSION_STATUSES = new Set(["待开始", "可入场"]);

function eventOccurrenceTime(source, session) {
  if (source.createdAt && displayClockTime(source.createdAt) !== "时间未知")
    return source.createdAt;
  if (
    /^\d{4}-\d{2}-\d{2}[ T]/.test(source.time || "") &&
    displayClockTime(source.time) !== "时间未知"
  )
    return source.time;
  // These two legacy writers stored only the final MM:ss. Recover the hour only
  // from a unique matching record in this same session; never use today's clock.
  const actor = String(source.title || "").match(/^人员绑定：(.+)$/);
  let candidates;
  if (actor)
    candidates = (session.runtime?.actorBinding?.history || [])
      .filter((item) => item.status === actor[1])
      .map((item) => item.at);
  else if (source.title === "协助行为提醒")
    candidates = (session.runtime?.assistanceWarnings || []).map(
      (item) => item.occurredAt,
    );
  if (candidates && /^(?:\d{2}:\d{2}|\.\d+Z)$/i.test(source.time || "")) {
    const matching = [
      ...new Set(
        candidates.filter(
          (at) =>
            /^\d{4}-\d{2}-\d{2}[ T]/.test(at || "") &&
            String(at).slice(-5) === source.time &&
            displayClockTime(at) !== "时间未知",
        ),
      ),
    ];
    return matching.length === 1 ? matching[0] : "";
  }
  return source.createdAt || source.time || "";
}

export function teacherIdentityView(session = {}) {
  const verification = session.identityVerification;
  if (!verification) {
    if (WAITING_SESSION_STATUSES.has(session.status))
      return {
        state: "waiting",
        label: "等待学生刷脸入场",
        detail: "尚未写入本次身份确认",
        tone: "muted",
      };
    return {
      state: "missing",
      label: "身份确认信息缺失",
      detail: "",
      tone: "warning",
    };
  }
  if (
    verification.method === "face" &&
    verification.status === "passed" &&
    verification.studentId === session.studentId
  )
    return {
      state: "passed",
      label: "人脸识别通过",
      detail: `确认时间 ${displayClockTime(verification.verifiedAt)}`,
      tone: "success",
    };
  return {
    state: "abnormal",
    label: "身份确认异常",
    detail: "身份记录与当前学生不一致，请现场核对",
    tone: "warning",
  };
}

const EVENT_META = {
  student_identity_verified: {
    category: "identity",
    categoryLabel: "身份事件",
    tone: "success",
  },
  student_hint_requested: {
    category: "hint",
    categoryLabel: "学习提示",
    tone: "info",
  },
  student_help_requested: {
    category: "practice_help",
    categoryLabel: "练习求助",
    tone: "attention",
  },
  practice_help_requested: {
    category: "practice_help",
    categoryLabel: "练习求助",
    tone: "attention",
  },
  exam_incident_help_requested: {
    category: "exam_incident",
    categoryLabel: "考试异常求助",
    tone: "attention",
  },
  teacher_ended_session: {
    category: "review",
    categoryLabel: "会话处置",
    tone: "info",
  },
  student_finished: {
    category: "review",
    categoryLabel: "结果事件",
    tone: "success",
  },
  exam_manual_submitted: {
    category: "review",
    categoryLabel: "考试交卷",
    tone: "success",
  },
  exam_auto_submitted: {
    category: "review",
    categoryLabel: "考试交卷",
    tone: "warning",
  },
  exam_started: {
    category: "review",
    categoryLabel: "考试运行",
    tone: "info",
  },
};

function inferredMeta(event) {
  const text = `${event?.title || ""} ${event?.detail || ""}`;
  if (/安全|红线/.test(text))
    return { category: "safety", categoryLabel: "安全事件", tone: "danger" };
  if (/技术|故障|离线|摄像头|服务异常/.test(text))
    return {
      category: "technical",
      categoryLabel: "技术异常",
      tone: event?.level === "danger" ? "danger" : "warning",
    };
  if (/复核|评分|成绩处置/.test(text))
    return { category: "review", categoryLabel: "评分复核", tone: "warning" };
  return {
    category: "other",
    categoryLabel: "会话事件",
    tone: event?.level === "danger" ? "danger" : "info",
  };
}

export function normalizeTeacherSessionEvent(event, session = {}) {
  const source = event && typeof event === "object" ? event : {};
  const type = source.type || "legacy_session_event";
  const meta = EVENT_META[type] || inferredMeta(source);
  const step = (session.steps || []).find((item) => item.id === source.stepId);
  const reason = source.reasonLabel || source.reason || "";
  const occurredAt = eventOccurrenceTime(source, session);
  const defaultTitle =
    meta.category === "hint"
      ? `学生查看了${step ? ` ${step.id} ${step.name}` : "当前步骤"}操作提示`
      : meta.category === "practice_help"
        ? "学生请求教师到场"
        : meta.category === "exam_incident"
          ? "学生提交考试异常求助"
          : "会话事件";
  return {
    ...source,
    id:
      source.id ||
      `${session.id || "session"}-${type}-${source.createdAt || source.time || "legacy"}`,
    type,
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    teacherTone:
      source.helpStatus === "completed"
        ? "success"
        : ["cancelled", "closed"].includes(source.helpStatus)
          ? "info"
          : meta.tone,
    title: source.title || defaultTitle,
    detail:
      source.detail || (reason ? `原因：${reason}` : "旧事件未记录详细说明"),
    reasonLabel: reason,
    stepName: step?.name || "",
    displayTime: displayClockTime(occurredAt),
    eventSortAt: displayClockTime(occurredAt) !== "时间未知" ? occurredAt : "",
    createdAt: source.createdAt || "",
    requiresAttention:
      source.requiresAttention === true ||
      (source.requiresAttention !== false &&
        !["handling", "completed", "cancelled", "closed"].includes(
          source.helpStatus,
        ) &&
        ["practice_help", "exam_incident"].includes(meta.category)),
  };
}

export function teacherEventSortTime(event) {
  const value = String(
    event.eventSortAt ||
      event.createdAt ||
      (event.displayTime === "时间未知" ? "" : event.displayTime || ""),
  );
  const normalized = notificationTime(value);
  return normalized === "时间未知" || normalized === "刚刚" ? "" : normalized;
}

export function teacherSessionEvents(session = {}) {
  const events = (Array.isArray(session.events) ? session.events : []).map(
    (event) => normalizeTeacherSessionEvent(event, session),
  );
  const hasIdentityEvent = events.some(
    (event) => event.type === "student_identity_verified",
  );
  const identity = teacherIdentityView(session);
  if (identity.state === "passed" && !hasIdentityEvent) {
    events.push(
      normalizeTeacherSessionEvent(
        {
          id: `${session.id || "session"}-identity-compatible`,
          type: "student_identity_verified",
          title: "学生人脸身份确认通过",
          detail: identity.detail,
          createdAt: session.identityVerification?.verifiedAt || "",
          level: "green",
          scoreImpact: "none",
        },
        session,
      ),
    );
  }
  return events.sort((left, right) =>
    teacherEventSortTime(right).localeCompare(teacherEventSortTime(left)),
  );
}

export function teacherStudentActivities(session = {}) {
  return teacherSessionEvents(session).filter((event) =>
    ["identity", "hint", "practice_help", "exam_incident"].includes(
      event.category,
    ),
  );
}

export function normalizeStoredStudentEvent(event, session = {}) {
  const normalized = normalizeTeacherSessionEvent(event, session);
  const {
    category,
    categoryLabel,
    teacherTone,
    displayTime: _displayTime,
    eventSortAt: _eventSortAt,
    stepName: _stepName,
    ...stored
  } = normalized;
  return {
    ...stored,
    category,
    categoryLabel,
    teacherTone,
  };
}
