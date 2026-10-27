import { adminSessionValid, superAdmin } from "./adminAccessRules.js";
export function delegatedAdminValid(data, session, source) {
  const admin = session?.delegatedAdmin;
  return Boolean(
    session?.role === "teacher" &&
      session.source === source &&
      admin?.source === source &&
      superAdmin(admin) &&
      adminSessionValid(data, admin, source),
  );
}
export function switchWorkIdentitySession(data, session, source, target) {
  if (target === "admin") {
    if (superAdmin(session) && adminSessionValid(data, session, source))
      return session;
    if (!delegatedAdminValid(data, session, source))
      throw new Error("当前教师账号不能切换为管理员，请使用管理员账号登录。");
    return { ...session.delegatedAdmin, source };
  }
  if (target !== "teacher") throw new Error("请选择有效的工作身份。");
  if (session?.role === "teacher") {
    const teacher = (data.teachers || []).find(
      (t) => t.id === session.teacherId,
    );
    if (
      session.source !== source ||
      !teacher ||
      teacher.status === "停用" ||
      teacher.account !== session.account ||
      (teacher.passwordCredential?.id || "legacy-demo") !==
        session.credentialId ||
      (session.delegatedAdmin && !delegatedAdminValid(data, session, source))
    )
      throw new Error("教师登录状态已失效，请重新登录。");
    return session;
  }
  if (!superAdmin(session) || !adminSessionValid(data, session, source))
    throw new Error("当前账号不能切换教师身份。");
  const teacher = (data.teachers || []).find((t) => t.id === "t1");
  if (!teacher || teacher.status === "停用")
    throw new Error("当前教师账号不存在或已停用，请使用有效的教师账号登录。");
  return {
    role: "teacher",
    teacherId: teacher.id,
    account: teacher.account,
    credentialId: teacher.passwordCredential?.id || "legacy-demo",
    mustChange: Boolean(teacher.passwordCredential?.mustChange),
    source,
    delegatedAdmin: {
      role: "admin",
      account: "admin",
      credentialId: session.credentialId || "legacy-admin",
      source,
      ...(session.bootstrap ? { bootstrap: true } : {}),
    },
  };
}
