export const STUDENT_IDENTITY_SESSION_KEY = "xingchen-student-session";

export const ACTIVE_STUDENT_SESSION_STATUSES = [
  "待开始",
  "可入场",
  "进行中",
  "已暂停",
];

const HISTORICAL_ARRANGEMENT_STATUSES = new Set([
  "已结束",
  "待发布",
  "已发布",
  "已归档",
]);

export function getStudentFaceStatus(student) {
  const status = student?.faceStatus || student?.face || "未采集";
  if (status === "待更新") return "待重采";
  return ["已采集", "未采集", "待重采"].includes(status)
    ? status
    : "未采集";
}

export function getStudentIdentityError(student) {
  if (!student) return "未识别到有效学生身份，请联系教师或管理员确认学生资料。";
  if (student.status !== "启用")
    return student.status === "停用"
      ? "该学生账号已停用，请联系教师或管理员处理。"
      : "该学生账号当前不是启用状态，请联系教师或管理员处理。";
  const faceStatus = getStudentFaceStatus(student);
  if (faceStatus === "未采集")
    return "该学生尚未采集人脸资料，请联系管理员完成采集。";
  if (faceStatus === "待重采")
    return "该学生人脸资料已失效，请联系管理员重新采集。";
  if (faceStatus !== "已采集")
    return "当前人脸资料状态不可用于身份确认，请联系管理员处理。";
  return "";
}

export function buildStudentIdentityVerification(identitySession) {
  if (!identitySession?.studentId) return null;
  return {
    method: "face",
    status: "passed",
    studentId: identitySession.studentId,
    verifiedAt: identitySession.verifiedAt,
  };
}

export function createStudentIdentitySession(studentId, verifiedAt) {
  return {
    studentId,
    method: "face",
    status: "passed",
    verifiedAt: verifiedAt || new Date().toISOString(),
  };
}

export function readStudentIdentitySession(storage) {
  const target =
    storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!target) return null;
  try {
    const parsed = JSON.parse(target.getItem(STUDENT_IDENTITY_SESSION_KEY));
    if (
      !parsed?.studentId ||
      parsed.method !== "face" ||
      parsed.status !== "passed" ||
      !parsed.verifiedAt
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStudentIdentitySession(identitySession, storage) {
  const target =
    storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!target) return identitySession;
  target.setItem(STUDENT_IDENTITY_SESSION_KEY, JSON.stringify(identitySession));
  return identitySession;
}

export function clearStudentIdentitySession(storage) {
  const target =
    storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  target?.removeItem(STUDENT_IDENTITY_SESSION_KEY);
}

export function resolveStudentIdentity(students, storage) {
  const identitySession = readStudentIdentitySession(storage);
  if (!identitySession) return null;
  const student = (students || []).find(
    (item) => item.id === identitySession.studentId,
  );
  if (getStudentIdentityError(student)) {
    clearStudentIdentitySession(storage);
    return null;
  }
  return { identitySession, student };
}

export function getStudentCurrentSessions(data, studentId) {
  if (!studentId || !Array.isArray(data?.arrangements)) return [];
  return data.arrangements
    .filter(
      (arrangement) =>
        arrangement &&
        !arrangement.archivedRecord &&
        !HISTORICAL_ARRANGEMENT_STATUSES.has(arrangement.status),
    )
    .flatMap((arrangement) =>
      (Array.isArray(arrangement.sessions) ? arrangement.sessions : [])
        .filter(
          (session) =>
            session?.studentId === studentId &&
            ACTIVE_STUDENT_SESSION_STATUSES.includes(session.status),
        )
        .map((session) => ({
          arrangementId: arrangement.id,
          sessionId: session.id,
          workstationId: session.workstationId,
          studentId: session.studentId,
          type: arrangement.type,
          arrangementStatus: arrangement.status,
          sessionStatus: session.status,
          scheduleStart: arrangement.scheduleStart || "",
          entryEnd: arrangement.entryEnd || "",
          currentStepId: session.currentStepId || "",
        })),
    )
    .sort((left, right) =>
      String(left.scheduleStart).localeCompare(String(right.scheduleStart)),
    );
}

export async function requestStudentCamera(mediaDevices) {
  if (!mediaDevices?.getUserMedia)
    throw Object.assign(new Error("当前浏览器不支持摄像头"), {
      name: "NotSupportedError",
    });
  return mediaDevices.getUserMedia({ video: true, audio: false });
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}
