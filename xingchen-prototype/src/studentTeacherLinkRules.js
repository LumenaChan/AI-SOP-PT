import { ensureDateTimeSeconds } from "./dateTimeRules.js";

const WAITING_SESSION_STATUSES = new Set(["待开始", "可入场"]);

function displayTime(value) {
  const text = ensureDateTimeSeconds(String(value || ""));
  if (!text) return "时间未知";
  if (text.includes("T")) {
    const instant = new Date(text);
    if (!Number.isNaN(instant.getTime()))
      return new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(instant);
  }
  const dateTimeMatch = text.match(/(?:T|\s)(\d{2}:\d{2}:\d{2})/);
  if (dateTimeMatch) return dateTimeMatch[1];
  const shortTimeMatch = text.match(/\b(\d{2}:\d{2})\b/);
  return shortTimeMatch?.[1] || text;
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
      detail: "兼容旧 Session，不作为学生违规依据",
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
      detail: `确认时间 ${displayTime(verification.verifiedAt)}`,
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
    teacherTone: meta.tone,
    title: source.title || defaultTitle,
    detail:
      source.detail || (reason ? `原因：${reason}` : "旧事件未记录详细说明"),
    reasonLabel: reason,
    stepName: step?.name || "",
    displayTime: displayTime(source.createdAt || source.time),
    createdAt: source.createdAt || "",
    requiresAttention:
      source.requiresAttention === true ||
      ["practice_help", "exam_incident"].includes(meta.category),
  };
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
    String(right.createdAt || right.displayTime).localeCompare(
      String(left.createdAt || left.displayTime),
    ),
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
