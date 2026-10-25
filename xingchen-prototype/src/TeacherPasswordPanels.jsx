import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { TEACHER_PASSWORD_HINT } from "./teacherAccountRules.js";
import { teacherCredentialsCsv } from "./teacherImportRules.js";

export function TeacherImportReceipt({ receipts }) {
  const [message, setMessage] = useState("");
  const csv = teacherCredentialsCsv(receipts);
  return (
    <div className="teacher-import-receipt">
      <p>
        已导入 {receipts.length}{" "}
        位教师，并为每人分配不同的临时密码。教师首次登录须修改密码。
      </p>
      <p className="form-hint">
        登录信息仅在本次弹窗显示，请下载或复制后分发。关闭后无法再次查看原密码；遗失时可单独重置。
      </p>
      <div className="import-actions">
        <a
          className="button button--default"
          download="教师初始登录信息.csv"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
        >
          下载登录信息CSV
        </a>
        <button
          type="button"
          className="button button--default"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(csv.replace(/^\uFEFF/, ""));
              setMessage("全部登录信息已复制");
            } catch {
              setMessage("无法自动复制，请下载CSV或手动复制。");
            }
          }}
        >
          复制全部登录信息
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <div className="table-wrap teacher-import-receipt__table">
        <table>
          <thead>
            <tr>
              <th>教师</th>
              <th>登录账号</th>
              <th>临时密码</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((row) => (
              <tr key={row.teacher.id}>
                <td>{row.teacher.name}</td>
                <td>{row.teacher.account}</td>
                <td>
                  <code>{row.temporaryPassword}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function teacherImportReceiptModal(receipts) {
  return {
    title: "教师导入成功 · 初始登录信息",
    size: "large",
    className: "teacher-password-modal",
    hideCancel: true,
    dismissOnly: true,
    confirmText: "已保存登录信息",
    content: <TeacherImportReceipt receipts={receipts} />,
  };
}

export function TeacherPasswordReceipt({ receipt }) {
  const [message, setMessage] = useState("");
  return (
    <div className="teacher-password-receipt">
      <p>
        请将以下登录信息交给教师。临时密码只在此处显示一次，关闭后无法再次查看；遗失时可重新重置。
      </p>
      <dl>
        <div>
          <dt>教师</dt>
          <dd>{receipt.teacher.name}</dd>
        </div>
        <div>
          <dt>登录账号</dt>
          <dd>{receipt.teacher.account}</dd>
        </div>
        <div>
          <dt>临时密码</dt>
          <dd>
            <code>{receipt.temporaryPassword}</code>
          </dd>
        </div>
      </dl>
      <p className="form-hint">
        教师使用临时密码登录后，须先设置自己的密码。重置密码不会启用已停用的账号。
      </p>
      <button
        type="button"
        className="button button--default"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `教师：${receipt.teacher.name}\n登录账号：${receipt.teacher.account}\n临时密码：${receipt.temporaryPassword}`,
            );
            setMessage("登录信息已复制");
          } catch {
            setMessage("无法自动复制，请手动选中并复制登录信息。");
          }
        }}
      >
        复制登录信息
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export function teacherPasswordReceiptModal(receipt, created = false) {
  return {
    title: created ? "教师已创建 · 初始登录信息" : "密码已重置 · 新登录信息",
    className: "teacher-password-modal",
    hideCancel: true,
    dismissOnly: true,
    confirmText: "已保存登录信息",
    content: <TeacherPasswordReceipt receipt={receipt} />,
  };
}
export function openTeacherPasswordReset(setModal, store, teacher) {
  setModal({
    title: `重置密码 · ${teacher.name}`,
    className: "teacher-password-modal",
    content: (
      <div className="form-stack">
        <p>
          将为账号“{teacher.account}
          ”生成新的临时密码。原密码立即失效，教师须重新登录并修改密码。
        </p>
        {teacher.status === "停用" && (
          <p className="hint">
            该账号已停用。重置后仍保持停用，需要启用后才能登录。
          </p>
        )}
        <p className="form-hint">
          无法查看或找回原密码；新临时密码在重置成功后显示一次。
        </p>
      </div>
    ),
    confirmText: "确认重置密码",
    onConfirm: () =>
      store.resetTeacherPassword(
        teacher.id,
        teacher.passwordCredential?.id || "",
      ),
    onSuccess: (receipt) => setModal(teacherPasswordReceiptModal(receipt)),
  });
}
export function TeacherChangePasswordPage() {
  const store = usePrototypeData(),
    nav = useNavigate();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const teacher = store.currentTeacher;
  if (
    !store.accountSession ||
    store.accountSession.role !== "teacher" ||
    !store.accountSessionValid
  )
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: "请使用教师账号重新登录后修改密码。" }}
      />
    );
  const required = Boolean(teacher?.passwordCredential?.mustChange);
  return (
    <main className="teacher-password-page">
      <section className="panel">
        <h1>{required ? "设置自己的登录密码" : "修改登录密码"}</h1>
        <p>
          {teacher?.name} · {teacher?.account}
        </p>
        <p className="hint">
          {required
            ? "当前使用的是管理员分配的临时密码，请完成修改后进入系统。"
            : "修改成功后需使用新密码重新登录。"}
        </p>
        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const result = await store.changeTeacherPassword(form);
              store.logout();
              nav("/login", {
                replace: true,
                state: {
                  account: result.account,
                  message: "密码已修改，请使用新密码登录。",
                },
              });
            } catch (failure) {
              setError(failure.message || "密码修改失败，请重试。");
            } finally {
              setBusy(false);
            }
          }}
        >
          {[
            [
              "currentPassword",
              required ? "当前临时密码" : "当前密码",
              "current-password",
            ],
            ["newPassword", "新密码", "new-password"],
            ["confirmPassword", "确认新密码", "new-password"],
          ].map(([key, label, autoComplete]) => (
            <label className="field" key={key}>
              {label}
              <input
                type="password"
                name={key}
                value={form[key]}
                required
                maxLength={key === "currentPassword" ? 128 : 32}
                autoComplete={autoComplete}
                disabled={busy}
                onChange={(e) => {
                  setForm({ ...form, [key]: e.target.value });
                  setError("");
                }}
              />
            </label>
          ))}
          <p className="form-hint">
            {TEACHER_PASSWORD_HINT}，新密码不能与当前密码相同。
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="button button--primary" disabled={busy}>
              {busy ? "正在保存…" : "保存新密码"}
            </button>
            {!required && (
              <button
                type="button"
                className="button button--default"
                disabled={busy}
                onClick={() => nav("/teacher/dashboard", { replace: true })}
              >
                返回工作台
              </button>
            )}
            <button
              type="button"
              className="button button--default"
              disabled={busy}
              onClick={() => {
                store.logout();
                nav("/login", { replace: true });
              }}
            >
              退出登录
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
