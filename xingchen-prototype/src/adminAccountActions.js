import {
  assertRootAdmin,
  adminSessionValid,
  currentAdminUser,
} from "./adminAccessRules.js";
import {
  assertTeacherAccountAvailable,
  assertTeacherPassword,
  generateTeacherPassword,
  teacherPasswordCredential,
  verifyTeacherPassword,
} from "./teacherAccountRules.js";
import { ADMIN_MENUS } from "./adminAccessRules.js";
export function adminProfileInput(input) {
  const text = (key) => String(input?.[key] || "").trim();
  const profile = {
    name: text("name"),
    account: text("account").toLowerCase(),
    identity: text("identity"),
    phone: text("phone"),
    notes: text("notes"),
    permissions: [...new Set(input?.permissions || [])],
  };
  if (!profile.name || profile.name.length > 40)
    throw new Error("请填写姓名，最多40字。");
  if (!profile.identity || profile.identity.length > 40)
    throw new Error("请填写账号身份，最多40字，例如AI实施工程师。");
  if (
    !profile.permissions.length ||
    profile.permissions.some((id) => !ADMIN_MENUS.some((m) => m.id === id))
  )
    throw new Error("请至少选择一个有效的功能菜单。");
  return profile;
}
export function createAdminAccountActions({
  getData,
  setData,
  getSession,
  getSource,
  source,
  now = () => new Date().toISOString(),
  makeId = () => crypto.randomUUID(),
}) {
  const root = () => {
    if (getSource() !== source)
      throw new Error("数据来源已切换，请重新打开操作。");
    assertRootAdmin(getData(), getSession(), source);
  };
  const audit = (data, user, action, at) => ({
    ...data,
    auditLogs: [
      {
        id: makeId(),
        time: at,
        actor: "admin",
        role: "系统管理员",
        action,
        target: `${user.name} / ${user.account}`,
        result: "成功",
      },
      ...(data.auditLogs || []),
    ],
  });
  const available = (data, account, id = "") =>
    assertTeacherAccountAvailable(
      [
        ...(data.teachers || []),
        ...(data.adminUsers || []).filter((u) => u.id !== id),
      ],
      account,
    );
  const check = (current, id, expected) => {
    const u = (current.adminUsers || []).find((u) => u.id === id);
    if (!u || u.accessId !== expected)
      throw new Error("账号状态或权限已变化，请刷新后重试。");
    return u;
  };
  return {
    async createAdminUser(input) {
      root();
      const profile = adminProfileInput(input);
      available(getData(), profile.account);
      const temporaryPassword = generateTeacherPassword(),
        at = now();
      const credential = await teacherPasswordCredential(temporaryPassword, {
        temporary: true,
        at,
      });
      let user;
      setData((current) => {
        root();
        available(current, profile.account);
        user = {
          ...profile,
          id: makeId(),
          status: "启用",
          accessId: makeId(),
          passwordCredential: credential,
          createdAt: at,
          updatedAt: at,
        };
        return audit(
          { ...current, adminUsers: [user, ...(current.adminUsers || [])] },
          user,
          "创建管理端账号并分配菜单",
          at,
        );
      });
      return {
        user: {
          id: user.id,
          name: user.name,
          account: user.account,
          identity: user.identity,
        },
        temporaryPassword,
      };
    },
    updateAdminUser(id, input, expected) {
      root();
      const profile = adminProfileInput(input),
        at = now();
      let updated;
      setData((current) => {
        root();
        const u = check(current, id, expected);
        if (profile.account !== u.account)
          throw new Error("登录账号创建后不可修改。");
        available(current, profile.account, id);
        updated = { ...u, ...profile, accessId: makeId(), updatedAt: at };
        return audit(
          {
            ...current,
            adminUsers: current.adminUsers.map((x) =>
              x.id === id ? updated : x,
            ),
          },
          updated,
          "修改管理端账号身份与菜单授权",
          at,
        );
      });
      return updated;
    },
    setAdminUserStatus(id, status, expected) {
      root();
      if (!["启用", "停用"].includes(status))
        throw new Error("请选择有效的账号状态。");
      const at = now();
      setData((current) => {
        root();
        const u = check(current, id, expected),
          updated = { ...u, status, accessId: makeId(), updatedAt: at };
        return audit(
          {
            ...current,
            adminUsers: current.adminUsers.map((x) =>
              x.id === id ? updated : x,
            ),
          },
          updated,
          `${status}管理端账号`,
          at,
        );
      });
    },
    async resetAdminUserPassword(id, expected) {
      root();
      const original = check(getData(), id, expected),
        temporaryPassword = generateTeacherPassword(),
        at = now();
      const credential = await teacherPasswordCredential(temporaryPassword, {
        temporary: true,
        at,
      });
      setData((current) => {
        root();
        const u = check(current, id, expected);
        if (u.passwordCredential?.id !== original.passwordCredential?.id)
          throw new Error("密码已被修改，请刷新后重试。");
        return audit(
          {
            ...current,
            adminUsers: current.adminUsers.map((x) =>
              x.id === id
                ? {
                    ...x,
                    passwordCredential: credential,
                    accessId: makeId(),
                    resetAt: at,
                    updatedAt: at,
                  }
                : x,
            ),
          },
          u,
          "重置管理端账号密码",
          at,
        );
      });
      return {
        user: {
          id: original.id,
          name: original.name,
          account: original.account,
          identity: original.identity,
        },
        temporaryPassword,
      };
    },
    async changeAdminPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    }) {
      const session = getSession(),
        user = currentAdminUser(getData(), session);
      if (
        getSource() !== source ||
        !user ||
        !adminSessionValid(getData(), session, source)
      )
        throw new Error("登录状态已失效，请重新登录。");
      if (newPassword !== confirmPassword)
        throw new Error("两次输入的新密码不一致。");
      assertTeacherPassword(newPassword);
      if (newPassword === currentPassword)
        throw new Error("新密码不能与当前密码相同。");
      if (!(await verifyTeacherPassword(user, currentPassword)))
        throw new Error("当前密码不正确。");
      const at = now(),
        credential = await teacherPasswordCredential(newPassword, { at });
      setData((current) => {
        if (
          getSource() !== source ||
          !adminSessionValid(current, session, source)
        )
          throw new Error("账号或权限已变化，请重新登录。");
        return {
          ...current,
          adminUsers: current.adminUsers.map((u) =>
            u.id === user.id
              ? { ...u, passwordCredential: credential, updatedAt: at }
              : u,
          ),
          auditLogs: [
            {
              id: makeId(),
              time: at,
              actor: user.name,
              role: user.identity,
              action: "修改登录密码",
              target: user.account,
              result: "成功",
            },
            ...(current.auditLogs || []),
          ],
        };
      });
      return { account: user.account };
    },
  };
}
