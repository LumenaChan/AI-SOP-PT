import {
  findLoginTeacher,
  normalizeTeacherAccount,
} from "./teacherAccountRules.js";

const REMEMBERED_LOGIN_KEY = "aisop-prototype-remembered-login-v1";
const CAPTCHA_CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const isDemoLogin = ({ account, password } = {}) =>
  ["wanglaoshi", "admin"].includes(account) && password === "12345678";

export function recordLoginFailure(previous, account, failure) {
  const normalized = normalizeTeacherAccount(account);
  if (failure?.code !== "INVALID_CREDENTIALS") return previous;
  return {
    account: normalized,
    count: (previous?.account === normalized ? previous.count : 0) + 1,
  };
}

export function loginRecoveryHint(data, account, failures) {
  const normalized = normalizeTeacherAccount(account);
  if (!normalized || failures?.account !== normalized || failures.count < 3)
    return "";
  if (normalized === "admin") return "忘记密码？请联系系统负责人协助处理。";
  if (
    (data.adminUsers || []).some(
      (user) => normalizeTeacherAccount(user.account) === normalized,
    )
  )
    return "忘记密码？请联系系统管理员在用户管理中重置密码。";
  if (findLoginTeacher(data, normalized))
    return "忘记密码？请联系管理员在教师管理中重置密码。";
  return "无法登录？请联系管理员确认账号并协助处理。";
}

export function createLoginCaptcha() {
  const values = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(
    values,
    (value) => CAPTCHA_CHARACTERS[value % CAPTCHA_CHARACTERS.length],
  ).join("");
}

export function matchesLoginCaptcha(input, challenge) {
  return (
    Boolean(challenge) &&
    String(input || "")
      .trim()
      .toUpperCase() === challenge
  );
}

// Private teacher credentials only remember the username. The old public demo
// shortcut retains its existing behavior; real passwords are never persisted.
export function readRememberedLogin(storage) {
  try {
    const saved = JSON.parse(storage.getItem(REMEMBERED_LOGIN_KEY));
    if (
      saved?.accountOnly === true &&
      /^[a-z][a-z0-9._-]{3,29}$/.test(saved.account || "")
    )
      return { account: saved.account, accountOnly: true };
    return isDemoLogin(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveRememberedLogin(
  storage,
  { account, password, remember, accountOnly = false },
) {
  try {
    if (
      remember &&
      accountOnly &&
      /^[a-z][a-z0-9._-]{3,29}$/.test(account || "") &&
      account !== "disabled-demo"
    ) {
      storage.setItem(
        REMEMBERED_LOGIN_KEY,
        JSON.stringify({ account, accountOnly: true }),
      );
    } else if (remember && isDemoLogin({ account, password })) {
      storage.setItem(
        REMEMBERED_LOGIN_KEY,
        JSON.stringify({ account, password }),
      );
    } else storage.removeItem(REMEMBERED_LOGIN_KEY);
    return true;
  } catch {
    return false;
  }
}
