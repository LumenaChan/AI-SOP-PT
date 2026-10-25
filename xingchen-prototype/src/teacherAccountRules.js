// Local prototype credentials. Only salted password verifiers are persisted;
// initial/reset plaintext is returned to the initiating dialog once.
export const TEACHER_PASSWORD_HINT = "8—32位，至少包含字母和数字，不含空格";
const ITERATIONS = 210000;
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const bytes = (text) =>
  Uint8Array.from(text.match(/.{2}/g) || [], (b) => parseInt(b, 16));
export const normalizeTeacherAccount = (account) =>
  String(account || "")
    .trim()
    .toLowerCase();
export function assertTeacherAccountAvailable(teachers, account, id = "") {
  const value = normalizeTeacherAccount(account);
  if (!/^[a-z][a-z0-9._-]{3,29}$/.test(value))
    throw new Error("账号需以字母开头，长度4—30位。");
  if (
    ["admin", "disabled-demo"].includes(value) ||
    (value === "wanglaoshi" && id !== "t1")
  )
    throw new Error("该账号为系统保留账号，请使用其他登录账号。");
  if (
    (teachers || []).some(
      (t) => t.id !== id && normalizeTeacherAccount(t.account) === value,
    )
  )
    throw new Error("登录账号已存在，请更换后再保存。");
  return value;
}
export function assertTeacherPassword(password) {
  if (
    typeof password !== "string" ||
    !/^[\x21-\x7e]{8,32}$/.test(password) ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  )
    throw new Error(`密码需${TEACHER_PASSWORD_HINT}。`);
}
export function generateTeacherPassword() {
  const alphabet =
    "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz!@#$";
  let value;
  do {
    value = Array.from(
      crypto.getRandomValues(new Uint8Array(12)),
      (n) => alphabet[n % alphabet.length],
    ).join("");
  } while (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value));
  return value;
}
async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: bytes(salt), iterations },
        key,
        256,
      ),
    ),
  );
}
export async function teacherPasswordCredential(
  password,
  { temporary = false, at = new Date().toISOString() } = {},
) {
  assertTeacherPassword(password);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return {
    id: crypto.randomUUID(),
    algorithm: "PBKDF2-SHA256",
    salt,
    iterations: ITERATIONS,
    hash: await derive(password, salt, ITERATIONS),
    mustChange: temporary,
    changedAt: at,
  };
}
function validCredential(c) {
  return (
    c?.algorithm === "PBKDF2-SHA256" &&
    /^[a-f0-9]{32}$/.test(c.salt || "") &&
    /^[a-f0-9]{64}$/.test(c.hash || "") &&
    c.iterations === ITERATIONS &&
    typeof c.id === "string"
  );
}
export async function verifyTeacherPassword(teacher, password) {
  const c = teacher?.passwordCredential;
  if (
    !validCredential(c) ||
    typeof password !== "string" ||
    password.length > 128
  )
    return false;
  const hash = await derive(password, c.salt, c.iterations);
  let difference = 0;
  for (let i = 0; i < c.hash.length; i++)
    difference |= c.hash.charCodeAt(i) ^ hash.charCodeAt(i);
  return difference === 0;
}
export function teacherPasswordStatus(teacher) {
  return !teacher.passwordCredential
    ? "未分配密码"
    : teacher.passwordCredential.mustChange
      ? "待教师修改临时密码"
      : "已设置密码";
}
export function findLoginTeacher(data, account) {
  const normalized = normalizeTeacherAccount(account);
  const matches = (data.teachers || []).filter(
    (t) => normalizeTeacherAccount(t.account) === normalized,
  );
  if (matches.length === 1) return matches[0];
  if (!matches.length && normalized === "wanglaoshi")
    return (data.teachers || []).find(
      (t) => t.id === "t1" && ["wangwei", "wanglaoshi"].includes(t.account),
    );
  return null;
}
export async function authenticatePrototypeAccount(data, account, password) {
  const normalized = normalizeTeacherAccount(account);
  if (normalized === "admin" && password === "12345678")
    return { role: "admin", account: "admin" };
  const teacher = findLoginTeacher(data, normalized);
  if (!teacher || normalized === "disabled-demo")
    throw new Error("账号或密码错误，请检查后重试。");
  if (teacher.status === "停用")
    throw new Error("该教师账号已停用，请联系管理员。");
  const legacyDemo =
    !teacher.passwordCredential &&
    teacher.id === "t1" &&
    ["wangwei", "wanglaoshi"].includes(teacher.account);
  if (!teacher.passwordCredential && !legacyDemo)
    throw new Error("该账号尚未分配密码，请联系管理员重置密码。");
  if (
    !(legacyDemo
      ? password === "12345678"
      : await verifyTeacherPassword(teacher, password))
  )
    throw new Error("账号或密码错误，请检查后重试。");
  return {
    role: "teacher",
    teacherId: teacher.id,
    account: teacher.account,
    credentialId: teacher.passwordCredential?.id || "legacy-demo",
    mustChange: Boolean(teacher.passwordCredential?.mustChange),
  };
}
export function teacherLoginSessionValid(data, session, source) {
  if (!session || session.role !== "teacher") return false;
  const teacher = (data.teachers || []).find((t) => t.id === session.teacherId);
  return Boolean(
    session.source === source &&
      teacher &&
      teacher.status !== "停用" &&
      session.account === teacher.account &&
      session.credentialId ===
        (teacher.passwordCredential?.id || "legacy-demo"),
  );
}
export function teacherAccountRedirect(data, session, source, pathname) {
  if (session?.role !== "teacher") return "";
  if (!teacherLoginSessionValid(data, session, source)) return "/login";
  const teacher = data.teachers.find((t) => t.id === session.teacherId);
  if (teacher.passwordCredential?.mustChange) return "/account/password";
  return pathname.startsWith("/admin") ? "/teacher/dashboard" : "";
}
export const TEACHER_LOGIN_SESSION_KEY = "xingchen-account-session-v1";
export function readAccountSession(storage) {
  try {
    const value = JSON.parse(
      storage?.getItem(TEACHER_LOGIN_SESSION_KEY) || "null",
    );
    return value && ["teacher", "admin"].includes(value.role) ? value : null;
  } catch {
    return null;
  }
}
export function writeAccountSession(storage, value) {
  if (!storage) throw new Error("无法保存登录状态，请检查浏览器存储设置。");
  if (value) storage.setItem(TEACHER_LOGIN_SESSION_KEY, JSON.stringify(value));
  else storage.removeItem(TEACHER_LOGIN_SESSION_KEY);
}
