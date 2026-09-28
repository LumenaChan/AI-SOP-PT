import { ACTIVE_STUDENT_SESSION_STATUSES } from "./studentIdentityRules.js";

function studentEventTime(value) {
  const text = String(value || "");
  const match = text.match(/(?:T|\s)(\d{2}:\d{2})/);
  return match?.[1] || text;
}

export const STUDENT_HELP_REASONS = [
  { value: "operation_help", label: "操作不会" },
  { value: "device_issue", label: "设备异常" },
  { value: "teacher_confirmation", label: "需要教师确认" },
  { value: "other", label: "其他" },
];

export function getStudentSessionAccess(
  data,
  studentId,
  arrangementId,
  workstationId,
) {
  if (!studentId) return { allowed: false, reason: "请先完成学生身份确认。" };
  const arrangement = (data?.arrangements || []).find(
    (item) => item?.id === arrangementId,
  );
  const session = arrangement?.sessions?.find(
    (item) => item?.workstationId === workstationId,
  );
  if (!arrangement || !session)
    return { allowed: false, reason: "当前任务不存在或工位尚未开放。" };
  if (session.studentId !== studentId)
    return { allowed: false, reason: "当前任务与登录学生不匹配。" };
  const justCompleted =
    ["已完成", "待复位"].includes(session.status) &&
    session.identityVerification?.status === "passed" &&
    session.identityVerification?.studentId === studentId;
  if (
    !ACTIVE_STUDENT_SESSION_STATUSES.includes(session.status) &&
    !justCompleted
  )
    return { allowed: false, reason: "该任务已不属于当前可进入任务。" };
  return { allowed: true, arrangement, session };
}

export function getStudentTaskDetails(data, task) {
  const arrangement = (data?.arrangements || []).find(
    (item) => item?.id === task?.arrangementId,
  );
  const session = arrangement?.sessions?.find(
    (item) => item?.id === task?.sessionId,
  );
  const workstation = (data?.workstations || []).find(
    (item) => item?.id === task?.workstationId,
  );
  const teacher = (data?.teachers || []).find(
    (item) => item?.id === arrangement?.teacherId,
  );
  const sop =
    session?.evaluationSnapshot?.sopSnapshot ||
    arrangement?.snapshot?.sopSnapshot ||
    (data?.sops || []).find((item) => item?.id === arrangement?.sopId);
  return arrangement && session
    ? { arrangement, session, workstation, sop, teacher }
    : null;
}

export function studentTaskActionLabel(type, status) {
  const noun = type === "exam" ? "考试" : "练习";
  return ["进行中", "已暂停"].includes(status) ? `继续${noun}` : `进入${noun}`;
}

export function resolveStudentPrimaryCamera(data, session, workstation) {
  const primaryCameraId =
    session?.evaluationSnapshot?.workstationAiBaseConfigSnapshot
      ?.primaryCameraId ||
    workstation?.aiBaseConfig?.primaryCameraId ||
    "";
  const camera = (data?.devices || []).find(
    (item) => item?.id === primaryCameraId,
  );
  const available = Boolean(
    camera &&
      camera.status === "在线" &&
      !["不可用", "异常", "离线"].includes(camera.streamStatus),
  );
  return {
    primaryCameraId,
    camera: camera || null,
    available,
    reason: !primaryCameraId
      ? "当前工位尚未配置主摄像头"
      : !camera
        ? "主摄像头设备信息不可用"
        : available
          ? ""
          : camera.notes || "当前视频暂不可用",
  };
}

export function buildStudentPracticeFeedback({
  session,
  currentStep,
  cameraState,
}) {
  const runtime = session?.runtime || {};
  const unresolvedIncident = (runtime.technicalIncidents || []).find(
    (item) => item?.status !== "resolved",
  );
  const pendingSafety = (runtime.safetyCandidates || []).find(
    (item) => item?.status === "pending",
  );
  if (pendingSafety || currentStep?.state === "blocked")
    return {
      type: "safety",
      title: "安全提醒",
      message: "请立即停止当前操作，并等待教师到场确认安全要求。",
    };
  if (unresolvedIncident || !cameraState?.available)
    return {
      type: "technical",
      title: "系统评价暂不可用",
      message: "本次练习已进入安全降级模式，请按操作规范继续或等待教师处理。",
    };
  if (
    !(
      session?.evaluationProfile?.aiRuntimeEnabled ??
      session?.evaluationProfile?.automaticEvaluationEnabled
    )
  )
    return {
      type: "technical",
      title: "AI辅助评价当前不可用",
      message: "本次练习将按安全降级规则运行，不会因此判定操作错误。",
    };

  const config = session?.evaluationSnapshot?.aiCapabilityConfigSnapshot;
  const judgementItems = (config?.judgementItems || []).filter(
    (item) => item?.enabled !== false && item?.stepId === currentStep?.id,
  );
  const results = runtime.aiJudgementResults || [];
  const confirmed = judgementItems.find((item) =>
    results.some(
      (result) =>
        result?.judgementItemId === item.id && result?.result === "confirmed",
    ),
  );
  if (confirmed)
    return {
      type: "success",
      title: "操作进展",
      message: `${confirmed.name || "当前关键操作"}已确认，请继续按步骤完成操作。`,
    };

  const pending = judgementItems[0];
  if (pending?.purposes?.includes("safety"))
    return {
      type: "safety",
      title: "安全提醒",
      message: `系统暂未确认${pending.name || "当前安全要求"}，请暂停并检查防护要求。`,
    };
  if (pending?.combination === "sequence")
    return {
      type: "sequence",
      title: "顺序提醒",
      message: `当前尚未确认${pending.name || "本步骤关键操作"}，请检查操作顺序。`,
    };
  if (pending)
    return {
      type: "normal",
      title: "操作提示",
      message: `系统暂未确认${pending.name || "本步骤关键操作"}，请检查后继续。`,
    };
  if (runtime.actorBinding?.status === "uncertain")
    return {
      type: "uncertain",
      title: "系统暂时无法确认当前动作",
      message: "请保持本人和关键操作区域清晰可见。",
    };
  return {
    type: "normal",
    title: "操作提示",
    message: currentStep?.teachingInstruction || "请按当前步骤要求完成操作。",
  };
}

export function buildStudentHelpPayload(reasonCode, note = "") {
  const reason = STUDENT_HELP_REASONS.find((item) => item.value === reasonCode);
  if (!reason) throw new Error("请选择求助原因。");
  const cleanNote = String(note || "").trim();
  if (reasonCode === "other" && !cleanNote)
    throw new Error("请填写其他求助内容。");
  return { reasonCode, reasonLabel: reason.label, note: cleanNote };
}

export function attachStudentVerificationToSession(
  session,
  verification,
  metadata,
) {
  if (!session?.studentId) throw new Error("工位会话不存在或尚未开放。");
  if (
    !verification ||
    verification.method !== "face" ||
    verification.status !== "passed" ||
    verification.studentId !== session.studentId
  )
    throw new Error("当前身份确认与工位会话不匹配。");
  if (
    session.identityVerification?.status === "passed" &&
    session.identityVerification?.studentId === session.studentId
  )
    return session;
  const identityVerification = {
    method: "face",
    status: "passed",
    studentId: verification.studentId,
    verifiedAt: verification.verifiedAt,
  };
  const identityEvent = metadata?.id
    ? {
        id: metadata.id,
        type: "student_identity_verified",
        source: "student_face_login",
        studentId: session.studentId,
        createdAt: metadata.createdAt || verification.verifiedAt,
        time: studentEventTime(metadata.createdAt || verification.verifiedAt),
        level: "green",
        title: "学生人脸身份确认通过",
        detail: "本次学生身份已通过刷脸确认。",
        scoreImpact: "none",
      }
    : null;
  return {
    ...session,
    identityVerification,
    ...(identityEvent
      ? { events: [identityEvent, ...(session.events || [])] }
      : {}),
  };
}

export function appendStudentHintRequestToSession(
  session,
  stepId,
  { id, createdAt },
) {
  if (!session?.studentId) throw new Error("工位会话不存在或尚未开放。");
  if (!stepId || !session.steps?.some((step) => step.id === stepId))
    throw new Error("当前步骤不存在，暂时无法查看提示。");
  const event = {
    id,
    type: "student_hint_requested",
    source: "student",
    studentId: session.studentId,
    stepId,
    createdAt,
    time: studentEventTime(createdAt),
    level: "blue",
    title: "学生查看了当前步骤操作提示",
    detail: "已向学生展示当前SOP步骤中的教学内容，不影响评分。",
    scoreImpact: "none",
  };
  return {
    ...session,
    events: [event, ...(session.events || [])],
  };
}

export function appendStudentHelpRequestToSession(
  session,
  payload,
  { id, createdAt },
) {
  if (!session?.studentId) throw new Error("工位会话不存在或尚未开放。");
  if (session.helpRequestedAt) return session;
  const detail =
    [payload?.reasonLabel, payload?.note].filter(Boolean).join("：") ||
    "学生在当前步骤请求教师到场协助";
  const event = {
    id,
    type: "practice_help_requested",
    time: studentEventTime(createdAt),
    createdAt,
    level: "warning",
    title: "学生请求帮助",
    detail,
    source: "student_help",
    studentId: session.studentId,
    stepId: session.currentStepId || "",
    reasonCode: payload?.reasonCode || "other",
    reasonLabel: payload?.reasonLabel || "其他",
    note: payload?.note || "",
    scoreImpact: "none",
    requiresAttention: true,
  };
  return {
    ...session,
    helpRequestedAt: createdAt,
    events: [event, ...(session.events || [])],
  };
}

export function isStudentCurrentSessionStatus(status) {
  return ACTIVE_STUDENT_SESSION_STATUSES.includes(status);
}
