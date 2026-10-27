import { AccountPasswordFields } from "./TeacherPasswordPanels.jsx";
import {
  changeAccountPassword,
  passwordSessionToken,
} from "./accountPasswordRules.js";
import { useEffect, useState, useRef } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { ownProfileModel } from "./accountProfileRules.js";
import { adminLandingPath } from "./adminAccessRules.js";
import { displayDateTime } from "./dateTimeRules.js";
const btn = "button button--default",
  primary = "button button--primary";
export function AccountProfilePage({ setModal }) {
  const store = usePrototypeData(),
    model = ownProfileModel(store.data, store.accountSession, store.dataSource);
  const nav = useNavigate(),
    [params, setParams] = useSearchParams();
  const passwordRef = useRef(null),
    latestStore = useRef(store);
  latestStore.current = store;
  const openPassword = () => {
    if (!model) return;
    const expected = passwordSessionToken(store);
    setModal({
      title: "修改密码",
      className: "account-password-modal",
      confirmText: "保存新密码",
      content: (
        <AccountPasswordFields
          ref={passwordRef}
          name={model.name}
          account={model.account}
        />
      ),
      onConfirm: async () => {
        const fields = passwordRef.current;
        if (!fields) throw new Error("密码表单已关闭，请重新打开。");
        fields.setBusy(true);
        try {
          return await changeAccountPassword(
            latestStore.current,
            fields.getValue(),
            expected,
          );
        } catch (error) {
          fields.setBusy(false);
          throw error;
        }
      },
      onSuccess: (result) => {
        setModal(null);
        latestStore.current.logout();
        nav("/login", {
          replace: true,
          state: {
            account: result.account,
            message: "密码已修改，请使用新密码登录。",
          },
        });
      },
    });
  };
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState({ name: "", phone: "", personalNotes: "" }),
    [expected, setExpected] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const identityKey = `${store.dataSource}:${store.accountSession?.role}:${model?.id}`;
  useEffect(() => {
    setEditing(false);
    setMessage("");
    setError("");
  }, [identityKey]);
  useEffect(() => {
    if (model && params.get("password") === "change") {
      openPassword();
      const next = new URLSearchParams(params);
      next.delete("password");
      setParams(next, { replace: true });
    }
  }, [params.toString(), identityKey]);
  useEffect(() => () => setModal(null), [setModal]);
  if (!model)
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: "请使用教师或管理员账号登录后查看个人资料。" }}
      />
    );
  const begin = () => {
    setDraft({
      name: model.name,
      phone: model.phone,
      personalNotes: model.personalNotes,
    });
    setExpected(model.token);
    setEditing(true);
    setMessage("");
    setError("");
  };
  const teacher = model.kind === "teacher";
  const info = [
    ["登录账号", model.account],
    ["账号身份", model.identity],
    ["账号状态", model.status],
    ...(teacher
      ? [
          ["教师工号", model.employeeNo],
          ["所属院系", model.department],
          ["所属专业", model.major],
        ]
      : []),
  ];
  return (
    <div className="account-profile-page">
      <div className="page-header">
        <div>
          <h1>个人资料</h1>
          <p>查看本人账号信息，维护联系方式和登录密码。</p>
        </div>
        <Link
          className={btn}
          to={
            teacher
              ? "/teacher/dashboard"
              : adminLandingPath(store.data, store.accountSession)
          }
        >
          返回工作台
        </Link>
      </div>
      <section className="panel account-profile-basic">
        <div className="panel-title">
          <h2>基本资料</h2>
          {!editing && (
            <button
              className={btn}
              disabled={!store.dataWriteReady || Boolean(store.dataSyncError)}
              onClick={begin}
            >
              编辑资料
            </button>
          )}
        </div>
        <dl className="account-profile-readonly">
          {info.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {editing ? (
          <form
            aria-label="编辑本人资料"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              try {
                store.saveOwnProfile(draft, expected);
                setEditing(false);
                setMessage("个人资料已保存");
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <div className="account-profile-fields">
              <label className="field">
                <span>
                  <b className="required">*</b>姓名
                </span>
                <input
                  required
                  maxLength={40}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label className="field">
                联系电话
                <input
                  type="tel"
                  maxLength={30}
                  placeholder="手机号或办公电话，可留空"
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="field">
              个人备注
              <textarea
                maxLength={300}
                value={draft.personalNotes}
                onChange={(e) =>
                  setDraft({ ...draft, personalNotes: e.target.value })
                }
              />
            </label>
            <p className="form-hint">
              {teacher
                ? "登录账号、教师工号及所属院系／专业由管理员维护。"
                : "登录账号、身份及菜单权限由系统管理员维护。"}
              个人备注独立保存，不会覆盖管理员填写的管理备注。
            </p>
            <div className="form-actions">
              <button
                className={btn}
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                取消
              </button>
              <button
                className={primary}
                disabled={!store.dataWriteReady || Boolean(store.dataSyncError)}
              >
                保存资料
              </button>
            </div>
          </form>
        ) : (
          <dl className="account-profile-contact">
            {[
              ["姓名", model.name],
              ["联系电话", model.phone || "未填写"],
              ["个人备注", model.personalNotes || "未填写"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        <p className="account-profile-updated">
          资料更新时间：
          {model.updatedAt ? displayDateTime(model.updatedAt) : "未记录"}
        </p>
      </section>
      {!teacher && (
        <section className="panel account-profile-permissions">
          <div className="panel-title">
            <h2>功能菜单权限</h2>
          </div>
          <div>
            {model.permissions.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          {model.kind === "admin-user" && (
            <p className="form-hint">权限由系统管理员分配，本人不能修改。</p>
          )}
        </section>
      )}
      <section className="panel account-profile-password">
        <div>
          <h2>账号安全</h2>
          <p>
            {model.mustChange
              ? "当前使用临时密码，请先修改。"
              : model.passwordSet
                ? "登录密码已设置。"
                : "尚未分配密码，请联系管理员。"}
            密码不提供查看或找回。
          </p>
          <small>
            最近设置密码：
            {model.passwordChangedAt
              ? displayDateTime(model.passwordChangedAt)
              : "未记录"}
          </small>
        </div>
        <button
          className={primary}
          type="button"
          disabled={!store.dataWriteReady || Boolean(store.dataSyncError)}
          onClick={openPassword}
        >
          修改密码
        </button>
      </section>
    </div>
  );
}
