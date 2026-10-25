import { assertTeacherAccountAvailable } from "./teacherAccountRules.js";

export const TEACHER_IMPORT_HEADER =
  "姓名,工号,登录账号,所属院系,所属专业,联系电话,备注";
export const TEACHER_IMPORT_TEMPLATE = `${TEACHER_IMPORT_HEADER}\r\n赵敏,T-0101,zhaomin,新能源汽车学院,新能源汽车技术,,`;
export const ACCOUNT_IMPORT_LIMIT = 500;

// CSV supports Excel UTF-8 BOM, quoted commas/newlines and escaped quotes.
export function parseAccountCsv(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    value = "",
    quoted = false,
    closed = false;
  const field = () => {
    row.push(value.trim());
    value = "";
    closed = false;
  };
  const record = () => {
    field();
    if (row.some(Boolean)) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else value += c;
    } else if (c === '"') {
      if (value.trim() || closed)
        throw new Error("CSV引号格式错误，请使用模板重新保存。");
      quoted = true;
    } else if (c === ",") field();
    else if (c === "\n" || c === "\r") {
      record();
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      if (closed && c.trim()) throw new Error("CSV引号后存在多余内容。");
      value += c;
    }
  }
  if (quoted) throw new Error("CSV引号未闭合，请检查文件内容。");
  record();
  return rows;
}
export function teacherImportPreview(raw, teachers) {
  const records = parseAccountCsv(raw);
  if (records[0]?.[0] === "姓名") {
    if (records[0].join(",") !== TEACHER_IMPORT_HEADER)
      throw new Error("表头与教师导入模板不一致，请下载模板后填写。");
    records.shift();
  }
  if (records.length > ACCOUNT_IMPORT_LIMIT)
    throw new Error(`单次最多导入${ACCOUNT_IMPORT_LIMIT}位教师，请分批导入。`);
  const rows = records.map((cells, index) => {
    const [
      name = "",
      employeeNo = "",
      account = "",
      department = "",
      major = "",
      phone = "",
      notes = "",
    ] = cells;
    const profile = {
      name,
      employeeNo: employeeNo.toUpperCase(),
      account: account.toLowerCase(),
      department,
      major,
      phone,
      notes,
    };
    let result = "可导入";
    try {
      if (cells.length < 5 || cells.length > 7)
        throw new Error("应为5—7列，请按模板填写");
      validateTeacherImportProfile(profile, teachers);
    } catch (error) {
      result = error.message;
    }
    return { ...profile, index: index + 1, result };
  });
  return rows.map((row) => ({
    ...row,
    result:
      row.result !== "可导入"
        ? row.result
        : rows.filter((r) => r.employeeNo === row.employeeNo).length > 1
          ? "批次内工号重复"
          : rows.filter((r) => r.account === row.account).length > 1
            ? "批次内账号重复"
            : "可导入",
  }));
}
export function validateTeacherImportProfile(profile, teachers) {
  if (!profile.name || !/^[A-Z0-9-]{3,30}$/.test(profile.employeeNo))
    throw new Error("姓名或工号格式错误");
  if (!profile.department || !profile.major)
    throw new Error("请填写所属院系和专业");
  if (profile.phone && !/^1\d{10}$/.test(profile.phone))
    throw new Error("联系电话应为11位手机号或留空");
  assertTeacherAccountAvailable(teachers, profile.account);
  if (teachers.some((t) => t.employeeNo?.toUpperCase() === profile.employeeNo))
    throw new Error("教师工号已存在");
}
export function assertTeacherImportBatch(profiles, teachers) {
  if (!profiles.length || profiles.length > ACCOUNT_IMPORT_LIMIT)
    throw new Error(`请提供1—${ACCOUNT_IMPORT_LIMIT}位教师的数据。`);
  const seen = [...teachers];
  profiles.forEach((p, index) => {
    try {
      validateTeacherImportProfile(p, seen);
    } catch (error) {
      throw new Error(`第${index + 1}行：${error.message}；整批未导入。`);
    }
    seen.push(p);
  });
}

export function teacherCredentialsCsv(receipts) {
  // Prevent spreadsheet formula execution in names/accounts. Passwords are
  // generated internally, but apply the same escaping to every exported value.
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      ["姓名", "登录账号", "临时密码"],
      ...receipts.map((r) => [
        r.teacher.name,
        r.teacher.account,
        r.temporaryPassword,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
