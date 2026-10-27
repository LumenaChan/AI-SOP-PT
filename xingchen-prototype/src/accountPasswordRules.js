import { superAdmin, managedAdmin } from "./adminAccessRules.js";
export function passwordSessionToken(store) {
  const s = store.accountSession;
  return JSON.stringify([
    store.dataSource,
    s?.role,
    s?.account,
    s?.teacherId,
    s?.adminUserId,
    s?.credentialId,
    s?.accessId,
    s?.delegatedAdmin?.credentialId,
  ]);
}
export function changeAccountPassword(store, input, expected) {
  if (!store.accountSessionValid || passwordSessionToken(store) !== expected)
    throw new Error("当前账号或登录状态已变化，请重新打开修改密码。");
  if (superAdmin(store.accountSession))
    return store.changeSystemAdminPassword(input);
  if (managedAdmin(store.accountSession))
    return store.changeAdminPassword(input);
  if (store.accountSession?.role === "teacher")
    return store.changeTeacherPassword(input);
  throw new Error("请使用教师或管理员账号修改本人密码。");
}
