import { randomId } from "./browserCrypto.js";
import { delegatedAdminValid } from "./accountIdentityRules.js";
import {
  ADMIN_MENUS,
  managedAdmin,
  superAdmin,
  adminSessionValid,
  currentAdminUser,
} from "./adminAccessRules.js";
import {
  teacherLoginSessionValid,
  assertTeacherPassword,
  teacherPasswordCredential,
  authenticatePrototypeAccount,
} from "./teacherAccountRules.js";
export function systemAdminProfile(data) {
  return {
    id: "builtin-admin",
    name: "系统管理员",
    phone: "",
    personalNotes: "",
    ...(data.systemAdminAccount || {}),
    account: "admin",
    identity: "系统管理员",
    status: "启用",
  };
}
export function ownProfileSessionValid(data, session, source) {
  return session?.role === "teacher"
    ? teacherLoginSessionValid(data, session, source)
    : session?.role === "admin" && adminSessionValid(data, session, source);
}
export function ownProfileRecord(data, session) {
  return session?.role === "teacher"
    ? (data.teachers || []).find((t) => t.id === session.teacherId)
    : managedAdmin(session)
      ? currentAdminUser(data, session)
      : superAdmin(session)
        ? systemAdminProfile(data)
        : null;
}
const editable = (record) => ({
  name: record.name || "",
  phone: record.phone || "",
  personalNotes: record.personalNotes || "",
});
export const ownProfileToken = (record) =>
  JSON.stringify({
    id: record.id,
    account: record.account,
    ...editable(record),
  });
export function ownProfileModel(data, session, source) {
  if (!ownProfileSessionValid(data, session, source)) return null;
  const record = ownProfileRecord(data, session);
  if (!record) return null;
  const teacher = session.role === "teacher",
    root = superAdmin(session);
  return {
    ...editable(record),
    id: record.id,
    account: record.account,
    kind: teacher ? "teacher" : root ? "system-admin" : "admin-user",
    identity: teacher ? "教师" : root ? "系统管理员" : record.identity,
    status: record.status || "启用",
    employeeNo: teacher ? record.employeeNo || "未记录" : "",
    department: teacher ? record.department || "未填写" : "",
    major: teacher ? record.major || "未填写" : "",
    permissions: teacher
      ? []
      : root
        ? ["全部管理功能（含用户管理）"]
        : ADMIN_MENUS.filter((m) =>
            (record.permissions || []).includes(m.id),
          ).map((m) => (m.group ? `${m.group} · ${m.label}` : m.label)),
    mustChange: Boolean(record.passwordCredential?.mustChange),
    passwordSet:
      Boolean(record.passwordCredential) ||
      root ||
      (teacher &&
        record.id === "t1" &&
        ["wangwei", "wanglaoshi"].includes(record.account)),
    passwordChangedAt: record.passwordCredential?.changedAt || "",
    updatedAt: record.updatedAt || "",
    token: ownProfileToken(record),
  };
}
export function validateOwnProfileInput(input) {
  if (
    !input ||
    Object.keys(input).some(
      (k) => !["name", "phone", "personalNotes"].includes(k),
    )
  )
    throw new Error("个人资料只能修改姓名、联系电话和个人备注。");
  const result = Object.fromEntries(
    ["name", "phone", "personalNotes"].map((k) => [
      k,
      typeof input[k] === "string" ? input[k].trim() : "",
    ]),
  );
  if (!result.name || result.name.length > 40)
    throw new Error("请填写姓名，最多40字。");
  if (
    result.phone &&
    (!/^[+()\d -]{5,30}$/.test(result.phone) ||
      result.phone.replace(/\D/g, "").length < 5)
  )
    throw new Error("请填写有效的手机号或办公电话，或留空。");
  if (result.personalNotes.length > 300) throw new Error("个人备注最多300字。");
  return result;
}
function principal(session) {
  return `${session?.role}:${session?.teacherId || session?.adminUserId || session?.account}:${session?.credentialId || "legacy-admin"}:${session?.accessId || ""}`;
}
export function createOwnProfileActions({
  getData,
  setData,
  getSession,
  getSource,
  source,
  now = () => new Date().toISOString(),
  makeId = () => randomId(),
}) {
  const assertSession = (session, data = getData()) => {
    if (
      getSource() !== source ||
      principal(session) !== principal(getSession()) ||
      !ownProfileSessionValid(data, session, source)
    )
      throw new Error("账号、密码或数据来源已变化，请重新登录后操作。");
    return ownProfileRecord(data, session);
  };
  const save = (data, session, record) =>
    session.role === "teacher"
      ? {
          ...data,
          teachers: data.teachers.map((t) => (t.id === record.id ? record : t)),
        }
      : managedAdmin(session)
        ? {
            ...data,
            adminUsers: data.adminUsers.map((u) =>
              u.id === record.id ? record : u,
            ),
          }
        : {
            ...data,
            systemAdminAccount: {
              name: record.name,
              phone: record.phone,
              personalNotes: record.personalNotes,
              updatedAt: record.updatedAt,
              ...(record.passwordCredential
                ? { passwordCredential: record.passwordCredential }
                : {}),
            },
          };
  return {
    saveOwnProfile(input, expected) {
      const session = getSession(),
        profile = validateOwnProfileInput(input);
      assertSession(session);
      const at = now();
      setData((current) => {
        const record = assertSession(session, current);
        if (
          record.passwordCredential?.mustChange &&
          !delegatedAdminValid(current, session, source)
        )
          throw new Error("请先修改临时密码，再修改个人资料。");
        if (ownProfileToken(record) !== expected)
          throw new Error("个人资料已发生变化，请刷新后重新编辑。");
        const updated = { ...record, ...profile, updatedAt: at },
          next = save(current, session, updated);
        return {
          ...next,
          auditLogs: [
            {
              id: makeId(),
              time: at,
              actor: record.name,
              role: session.role === "teacher" ? "教师" : record.identity,
              action: "修改本人个人资料",
              target: record.account,
              result: "成功",
              ...(session.delegatedAdmin ? { delegatedBy: "admin" } : {}),
              changedFields: Object.keys(profile).filter(
                (k) => profile[k] !== editable(record)[k],
              ),
            },
            ...(current.auditLogs || []),
          ],
        };
      });
      return { name: profile.name };
    },
    async changeSystemAdminPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    }) {
      const session = getSession();
      if (!superAdmin(session))
        throw new Error("请使用系统管理员本人账号操作。");
      assertSession(session);
      if (newPassword !== confirmPassword)
        throw new Error("两次输入的新密码不一致。");
      assertTeacherPassword(newPassword);
      if (newPassword === currentPassword)
        throw new Error("新密码不能与当前密码相同。");
      await authenticatePrototypeAccount(getData(), "admin", currentPassword);
      assertSession(session);
      const at = now(),
        credential = await teacherPasswordCredential(newPassword, { at });
      setData((current) => {
        const record = assertSession(session, current),
          next = save(current, session, {
            ...record,
            passwordCredential: credential,
            updatedAt: at,
          });
        return {
          ...next,
          auditLogs: [
            {
              id: makeId(),
              time: at,
              actor: record.name,
              role: "系统管理员",
              action: "修改本人登录密码",
              target: "admin",
              result: "成功",
            },
            ...(current.auditLogs || []),
          ],
        };
      });
      return { account: "admin" };
    },
  };
}
