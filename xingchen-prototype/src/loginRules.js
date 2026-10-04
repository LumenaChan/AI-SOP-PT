const REMEMBERED_LOGIN_KEY = "aisop-prototype-remembered-login-v1";
const CAPTCHA_CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const isDemoLogin = ({ account, password } = {}) =>
  ["wanglaoshi", "admin"].includes(account) && password === "12345678";

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

// Only the prototype's public demonstration credentials may be remembered.
export function readRememberedLogin(storage) {
  try {
    const saved = JSON.parse(storage.getItem(REMEMBERED_LOGIN_KEY));
    return isDemoLogin(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveRememberedLogin(storage, { account, password, remember }) {
  try {
    if (remember && isDemoLogin({ account, password })) {
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
