import { randomId } from "./browserCrypto.js";
import {
  assertTeacherAccountAvailable,
  assertTeacherPassword,
  generateTeacherPassword,
  teacherPasswordCredential,
  authenticatePrototypeAccount,
  teacherLoginSessionValid,
} from "./teacherAccountRules.js";
import { assertTeacherImportBatch } from "./teacherImportRules.js";
const fields = [
  "name",
  "employeeNo",
  "account",
  "department",
  "major",
  "phone",
  "notes",
];
export function teacherProfileInput(input) {
  return Object.fromEntries(
    fields.map((key) => [
      key,
      typeof input[key] === "string" ? input[key].trim() : "",
    ]),
  );
}
export function createTeacherAccountActions({
  getData,
  setData,
  getSession,
  getSource,
  source,
  now = () => new Date().toISOString(),
  makeId = () => randomId(),
}) {
  const admin = () => {
    if (getSource() !== source)
      throw new Error("数据来源已切换，请重新打开当前操作。");
    if (getSession()?.role === "teacher")
      throw new Error("只有管理员可以分配或重置教师密码。");
  };
  const audit = (data, teacher, action, at) => ({
    ...data,
    auditLogs: [
      {
        id: makeId(),
        time: at,
        actor: "admin",
        role: "管理员",
        action,
        target: `${teacher.name} / ${teacher.account}`,
        result: "成功",
      },
      ...(data.auditLogs || []),
    ],
  });
  return {
    async importTeachers(inputs) {
      admin();
      const profiles = inputs.map((input) => {
        const profile = teacherProfileInput(input);
        return {
          ...profile,
          employeeNo: profile.employeeNo.toUpperCase(),
          account: profile.account.toLowerCase(),
        };
      });
      assertTeacherImportBatch(profiles, [...(getData().teachers || []), ...(getData().adminUsers || [])]);
      const at = now(),
        created = [],
        receipts = [];
      // Limit concurrent hashing for large schools, then commit the entire batch
      // once. Any validation, hashing or persistence failure leaves data intact.
      for (let start = 0; start < profiles.length; start += 8) {
        const batch = await Promise.all(
          profiles.slice(start, start + 8).map(async (profile) => {
            // A safe first character keeps CSV credentials exact without
            // introducing spreadsheet formula prefixes into the password.
            let temporaryPassword;
            do {
              temporaryPassword = generateTeacherPassword();
            } while (!/^[A-Za-z0-9]/.test(temporaryPassword));
            const passwordCredential = await teacherPasswordCredential(
              temporaryPassword,
              { temporary: true, at },
            );
            const teacher = {
              ...profile,
              id: makeId(),
              status: "启用",
              sopCount: 0,
              arrangementCount: 0,
              accountResetAt: "未重置",
              updatedAt: at,
              passwordCredential,
            };
            return { teacher, temporaryPassword };
          }),
        );
        admin();
        for (const row of batch) {
          created.push(row.teacher);
          receipts.push({
            teacher: {
              id: row.teacher.id,
              name: row.teacher.name,
              account: row.teacher.account,
            },
            temporaryPassword: row.temporaryPassword,
          });
        }
      }
      setData((current) => {
        admin();
        assertTeacherImportBatch(profiles, [...(current.teachers || []), ...(current.adminUsers || [])]);
        return {
          ...current,
          teachers: [...created, ...current.teachers],
          auditLogs: [
            {
              id: makeId(),
              time: at,
              actor: "admin",
              role: "管理员",
              action: "批量导入教师并分配临时密码",
              target: `${created.length} 位教师`,
              result: "成功",
            },
            ...(current.auditLogs || []),
          ],
        };
      });
      return receipts;
    },
    async createTeacher(input) {
      admin();
      const profile = teacherProfileInput(input);
      profile.employeeNo = profile.employeeNo.toUpperCase();
      if (!profile.name || !/^[A-Z0-9-]{3,30}$/.test(profile.employeeNo))
        throw new Error("请填写有效教师姓名和工号。");
      const temporaryPassword = generateTeacherPassword();
      const at = now(),
        credential = await teacherPasswordCredential(temporaryPassword, {
          temporary: true,
          at,
        });
      let teacher;
      setData((current) => {
        admin();
        profile.account = assertTeacherAccountAvailable(
          [...(current.teachers || []), ...(current.adminUsers || [])],
          profile.account,
        );
        if (
          current.teachers.some(
            (t) => t.employeeNo?.toUpperCase() === profile.employeeNo,
          )
        )
          throw new Error("教师工号已存在，请更换后再保存。");
        teacher = {
          ...profile,
          id: makeId(),
          status: "启用",
          sopCount: 0,
          arrangementCount: 0,
          accountResetAt: "未重置",
          updatedAt: at,
          passwordCredential: credential,
        };
        return audit(
          { ...current, teachers: [teacher, ...current.teachers] },
          teacher,
          "新建教师并分配临时密码",
          at,
        );
      });
      return {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          account: teacher.account,
        },
        temporaryPassword,
      };
    },
    async resetTeacherPassword(id, expectedCredentialId) {
      admin();
      const original = getData().teachers.find((t) => t.id === id);
      if (!original) throw new Error("教师不存在或已失效，请返回列表刷新。");
      const expected =
        expectedCredentialId === undefined
          ? original.passwordCredential?.id || ""
          : expectedCredentialId;
      const temporaryPassword = generateTeacherPassword();
      const at = now(),
        credential = await teacherPasswordCredential(temporaryPassword, {
          temporary: true,
          at,
        });
      let teacher;
      setData((current) => {
        admin();
        teacher = current.teachers.find((t) => t.id === id);
        if (
          !teacher ||
          (teacher.passwordCredential?.id || "") !== expected ||
          teacher.account !== original.account
        )
          throw new Error("教师账号或密码状态已变化，请刷新后重新重置。");
        const updated = {
          ...teacher,
          passwordCredential: credential,
          accountResetAt: at,
          updatedAt: at,
        };
        return audit(
          {
            ...current,
            teachers: current.teachers.map((t) => (t.id === id ? updated : t)),
          },
          teacher,
          "重置教师密码",
          at,
        );
      });
      return {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          account: teacher.account,
        },
        temporaryPassword,
      };
    },
    async changeTeacherPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    }) {
      const session = getSession();
      if (
        getSource() !== source ||
        !teacherLoginSessionValid(getData(), session, source)
      )
        throw new Error("登录状态已失效，请重新登录。");
      if (newPassword !== confirmPassword)
        throw new Error("两次输入的新密码不一致。");
      assertTeacherPassword(newPassword);
      if (newPassword === currentPassword)
        throw new Error("新密码不能与当前密码相同。");
      await authenticatePrototypeAccount(
        getData(),
        session.account,
        currentPassword,
      );
      const at = now(),
        credential = await teacherPasswordCredential(newPassword, { at });
      setData((current) => {
        if (
          getSource() !== source ||
          !teacherLoginSessionValid(current, session, source)
        )
          throw new Error("账号或密码已变化，请重新登录后再修改。");
        const teacher = current.teachers.find(
          (t) => t.id === session.teacherId,
        );
        return {
          ...current,
          teachers: current.teachers.map((t) =>
            t.id === teacher.id
              ? { ...t, passwordCredential: credential, updatedAt: at }
              : t,
          ),
          auditLogs: [
            {
              id: makeId(),
              time: at,
              actor: teacher.name,
              role: "教师",
              action: "修改登录密码",
              target: `${teacher.name} / ${teacher.account}`,
              result: "成功",
            },
            ...(current.auditLogs || []),
          ],
        };
      });
      return { account: session.account };
    },
  };
}
