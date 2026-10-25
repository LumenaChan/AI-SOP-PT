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

// Private teacher credentials only remember the username. The old public demo
// shortcut retains its existing behavior; real passwords are never persisted.
export function readRememberedLogin(storage) {
  try {
    const saved = JSON.parse(storage.getItem(REMEMBERED_LOGIN_KEY));
    if (
      saved?.accountOnly === true &&
      /^[a-z][a-z0-9._-]{3,29}$/.test(saved.account || "") &&
      saved.account !== "admin"
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
      !["admin", "disabled-demo"].includes(account)
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
