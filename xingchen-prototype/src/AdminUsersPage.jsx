import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useId,
} from "react";
import { usePrototypeData } from "./prototypeData.jsx";
import { ADMIN_MENUS, ADMIN_LIBRARY_MENUS } from "./adminAccessRules.js";
import { displayDateTime } from "./dateTimeRules.js";
const btn = "button button--default",
  primary = "button button--primary";
const permissionNames = (ids) =>
  ADMIN_MENUS.filter((m) => (ids || []).includes(m.id))
    .map((m) => m.label)
    .join("、");
const IDENTITY_OPTIONS = ["普通管理员", "AI实施工程师", "AI能力工程师"];
function AdminIdentityField({ value, onChange }) {
  const id = useId(),
    inputRef = useRef(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [searching, setSearching] = useState(false);
  const options = searching
    ? IDENTITY_OPTIONS.filter((option) =>
        option.toLowerCase().includes(value.trim().toLowerCase()),
      )
    : IDENTITY_OPTIONS;
  const choose = (option) => {
    onChange(option);
    setOpen(false);
    setSearching(false);
    setActive(-1);
  };
  return (
    <div
      className="field admin-identity-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <label htmlFor={id}>
        <b className="required">*</b>身份
      </label>
      <div className="admin-identity-combobox">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? `${id}-options` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 && options[active]
              ? `${id}-option-${active}`
              : undefined
          }
          value={value}
          required
          maxLength={40}
          autoComplete="off"
          placeholder="选择或填写身份"
          onFocus={() => {
            setOpen(true);
            setSearching(false);
            setActive(-1);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setSearching(true);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive(
                options.length
                  ? active < 0
                    ? event.key === "ArrowDown"
                      ? 0
                      : options.length - 1
                    : (active +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        options.length) %
                      options.length
                  : -1,
              );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (active >= 0 && options[active]) choose(options[active]);
              else setOpen(false);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              setActive(-1);
            }
          }}
        />
        <button
          type="button"
          className="admin-identity-toggle"
          tabIndex={-1}
          aria-label={open ? "收起身份选项" : "展开身份选项"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              setSearching(false);
              setActive(-1);
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open && (
          <div
            className="admin-identity-options"
            id={`${id}-options`}
            role="listbox"
            aria-label="常用身份"
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                id={`${id}-option-${index}`}
                tabIndex={-1}
                key={option}
                aria-selected={value === option}
                className={active === index ? "is-active" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option}
                {value === option && <span aria-hidden="true">✓</span>}
              </button>
            ))}
            {!options.length && <p>可直接填写自定义身份</p>}
          </div>
        )}
      </div>
    </div>
  );
}
export const AdminUserForm = forwardRef(function AdminUserForm({ user }, ref) {
  const [form, setForm] = useState(
    user
      ? { ...user, permissions: [...user.permissions] }
      : {
          name: "",
          account: "",
          identity: "",
          phone: "",
          notes: "",
          permissions: [],
        },
  );
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggle = (id) =>
    update(
      "permissions",
      form.permissions.includes(id)
        ? form.permissions.filter((x) => x !== id)
        : [...form.permissions, id],
    );
  const group = (menus, title) => (
    <section className="admin-user-permission-group">
      <header>
        <strong>{title}</strong>
        <button
          type="button"
          className="table-action"
          onClick={() =>
            update("permissions", [
              ...new Set([...form.permissions, ...menus.map((m) => m.id)]),
            ])
          }
        >
          全选
        </button>
        <button
          type="button"
          className="table-action"
          onClick={() =>
            update(
              "permissions",
              form.permissions.filter((id) => !menus.some((m) => m.id === id)),
            )
          }
        >
          清空
        </button>
      </header>
      <div>
        {menus.map((menu) => (
          <label key={menu.id}>
            <input
              type="checkbox"
              checked={form.permissions.includes(menu.id)}
              onChange={() => toggle(menu.id)}
            />
            {menu.label}
          </label>
        ))}
      </div>
    </section>
  );
  return (
    <div className="admin-user-form">
      <div className="admin-user-fields">
        {[
          ["name", "姓名"],
          ["account", "登录账号"],
          ["identity", "身份"],
          ["phone", "联系电话"],
        ].map(([key, label]) =>
          key === "identity" ? (
            <AdminIdentityField
              key={key}
              value={form.identity || ""}
              onChange={(value) => update("identity", value)}
            />
          ) : (
            <label className="field" key={key}>
              <span>
                {key !== "phone" && <b className="required">*</b>}
                {label}
              </span>
              <input
                value={form[key] || ""}
                maxLength={key === "account" ? 30 : key === "phone" ? 30 : 40}
                required={key !== "phone"}
                readOnly={key === "account" && Boolean(user)}
                autoComplete="off"
                placeholder={
                  key === "identity"
                    ? "填写身份，如AI实施工程师"
                    : key === "account"
                      ? "字母开头，4—30位字母、数字或._-"
                      : ""
                }
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ),
        )}
      </div>
      <div className="admin-user-permission-heading">
        <strong>
          <b className="required">*</b>功能菜单权限
        </strong>
        <span>已选择 {form.permissions.length} 项</span>
      </div>
      <p className="form-hint">
        身份用于说明岗位；实际访问范围由勾选的菜单决定。账号与授权由系统管理员admin统一管理。
      </p>
      {group(
        ADMIN_MENUS.filter((m) => !m.group),
        "管理功能",
      )}
      {group(ADMIN_LIBRARY_MENUS, "AI能力库")}
      <label className="field">
        备注
        <textarea
          value={form.notes || ""}
          maxLength={300}
          onChange={(e) => update("notes", e.target.value)}
        />
      </label>
      <p className="form-hint">
        {user
          ? "修改身份或菜单授权后，该账号须重新登录；已有业务数据保留。"
          : "保存后自动分配独立临时密码，首次登录须修改。登录信息在创建成功后显示。"}
      </p>
    </div>
  );
});
export function AdminUserReceipt({ receipt }) {
  const [message, setMessage] = useState("");
  const text = `姓名：${receipt.user.name}\n身份：${receipt.user.identity}\n登录账号：${receipt.user.account}\n临时密码：${receipt.temporaryPassword}`;
  return (
    <div className="admin-user-receipt">
      <p>
        请保存并分发登录信息。临时密码仅在本次显示，首次登录后须修改；遗失时可重新重置。
      </p>
      <dl>
        {[
          ["姓名", receipt.user.name],
          ["身份", receipt.user.identity],
          ["登录账号", receipt.user.account],
          ["临时密码", receipt.temporaryPassword],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
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
export function AdminUsersPage({ setModal }) {
  const store = usePrototypeData(),
    ref = useRef(null),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [size, setSize] = useState(10);
  const root = {
    id: "builtin-admin",
    name: store.data.systemAdminAccount?.name || "系统管理员",
    account: "admin",
    identity: "系统管理员",
    status: "启用",
    builtin: true,
  };
  const rows = [root, ...(store.data.adminUsers || [])].filter(
    (u) =>
      (!status || u.status === status) &&
      (!query.trim() ||
        [u.name, u.account, u.identity].some((v) =>
          String(v).toLowerCase().includes(query.trim().toLowerCase()),
        )),
  );
  const pages = Math.max(1, Math.ceil(rows.length / size)),
    current = Math.min(page, pages - 1);
  const receiptModal = (receipt, created) =>
    setModal({
      title: created ? "账号已创建 · 初始登录信息" : "密码已重置 · 新登录信息",
      hideCancel: true,
      dismissOnly: true,
      confirmText: "已保存登录信息",
      className: "admin-user-modal",
      content: <AdminUserReceipt receipt={receipt} />,
    });
  const openEdit = (user) =>
    setModal({
      title: user ? "编辑用户" : "创建管理端用户",
      size: "large",
      className: "admin-user-modal",
      confirmText: user ? "保存修改" : "创建账号",
      content: <AdminUserForm ref={ref} user={user} />,
      onConfirm: () =>
        user
          ? (store.updateAdminUser(
              user.id,
              ref.current.getValue(),
              user.accessId,
            ),
            "用户资料与授权已更新")
          : store.createAdminUser(ref.current.getValue()),
      ...(user ? {} : { onSuccess: (receipt) => receiptModal(receipt, true) }),
    });
  const reset = (user) =>
    setModal({
      title: `重置密码 · ${user.name}`,
      className: "admin-user-modal",
      content: (
        <p>
          将为“{user.account}”生成新临时密码，原密码及登录状态立即失效。
          {user.status === "停用"
            ? "重置密码后账号仍保持停用。"
            : "用户重新登录后须修改临时密码。"}
        </p>
      ),
      confirmText: "确认重置",
      onConfirm: () => store.resetAdminUserPassword(user.id, user.accessId),
      onSuccess: (receipt) => receiptModal(receipt, false),
    });
  const setStatusFor = (user) => {
    const next = user.status === "启用" ? "停用" : "启用";
    setModal({
      title: `${next}用户 · ${user.name}`,
      className: "admin-user-modal",
      content: (
        <p>
          {next === "停用"
            ? "停用后该账号立即失去访问权限，已有业务数据保留。"
            : "启用后，用户可按已分配的菜单权限登录使用。"}
        </p>
      ),
      confirmText: `确认${next}`,
      onConfirm: () => {
        store.setAdminUserStatus(user.id, next, user.accessId);
        return `账号已${next}`;
      },
    });
  };
  return (
    <div className="admin-users-page">
      <div className="page-header">
        <div>
          <h1>用户管理</h1>
          <p>创建管理端普通账号，填写身份并分配功能菜单。</p>
        </div>
        <button
          className={primary}
          disabled={!store.dataWriteReady || Boolean(store.dataSyncError)}
          onClick={() => openEdit()}
        >
          新建用户
        </button>
      </div>
      <section className="panel">
        <div className="admin-user-list-tools">
          <input
            aria-label="搜索用户"
            placeholder="搜索姓名、登录账号或身份"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="用户状态"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">全部状态</option>
            <option>启用</option>
            <option>停用</option>
          </select>
          <span>
            系统管理员 1 个 · 普通账号 {(store.data.adminUsers || []).length} 个
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "姓名",
                  "登录账号",
                  "身份",
                  "功能菜单",
                  "状态",
                  "密码状态",
                  "更新时间",
                  "操作",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(current * size, (current + 1) * size).map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.account}</td>
                  <td>{user.identity}</td>
                  <td>
                    <span
                      className="admin-user-menu-summary"
                      title={
                        user.builtin
                          ? "全部管理功能"
                          : permissionNames(user.permissions)
                      }
                    >
                      {user.builtin
                        ? "全部管理功能"
                        : permissionNames(user.permissions) || "未分配菜单"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status status--${user.status === "启用" ? "success" : "neutral"}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    {user.builtin
                      ? "系统账号"
                      : user.passwordCredential?.mustChange
                        ? "待修改临时密码"
                        : "已设置密码"}
                  </td>
                  <td>
                    {user.updatedAt ? displayDateTime(user.updatedAt) : "—"}
                  </td>
                  <td>
                    {user.builtin ? (
                      <span className="form-hint">内置账号</span>
                    ) : (
                      <div className="row-actions">
                        <button
                          className="table-action"
                          disabled={!store.dataWriteReady}
                          onClick={() => openEdit(user)}
                        >
                          编辑
                        </button>
                        <button
                          className="table-action"
                          disabled={!store.dataWriteReady}
                          onClick={() => reset(user)}
                        >
                          重置密码
                        </button>
                        <button
                          className="table-action"
                          disabled={!store.dataWriteReady}
                          onClick={() => setStatusFor(user)}
                        >
                          {user.status === "启用" ? "停用" : "启用"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    暂无符合条件的用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-user-pagination">
          <span>共 {rows.length} 条</span>
          <label>
            每页{" "}
            <select
              aria-label="用户列表每页条数"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>{" "}
            条
          </label>
          <button
            className={btn}
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            上一页
          </button>
          <span>
            {current + 1}/{pages}
          </span>
          <button
            className={btn}
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            下一页
          </button>
        </div>
      </section>
    </div>
  );
}
