export const ADMIN_LIBRARY_MENUS = [
  ["capabilities", "能力管理"],
  ["videos", "视频管理"],
  ["extraction", "抽帧/切片"],
  ["auto-cleaning", "自动清洗"],
  ["manual-cleaning", "人工清洗"],
  ["annotation", "数据标注"],
  ["training-data", "训练数据"],
  ["training", "模型训练"],
  ["publishing", "模型发布"],
].map(([section, label]) => ({
  id: `library.${section}`,
  label,
  path: `/admin/ai-capability-library/${section}`,
  group: "AI能力库",
}));
export const ADMIN_MENUS = [
  ["overview", "运行概览", "/admin/overview"],
  ["teachers", "教师管理", "/admin/teachers"],
  ["classes", "班级管理", "/admin/classes"],
  ["students", "学生管理", "/admin/students"],
  ["workstations", "工位管理", "/admin/workstations"],
  ["devices", "设备管理", "/admin/devices"],
  ["ai-config", "AI能力配置", "/admin/ai-capability-config"],
]
  .map(([id, label, path]) => ({ id, label, path }))
  .concat(ADMIN_LIBRARY_MENUS, [
    { id: "practices", label: "练习记录", path: "/admin/practices" },
    { id: "exams", label: "考试记录", path: "/admin/exams" },
    { id: "settings", label: "运行配置", path: "/admin/settings" },
    { id: "backups", label: "备份与恢复", path: "/admin/backups" },
    { id: "logs", label: "操作日志", path: "/admin/logs" },
  ]);
export const managedAdmin = (session) =>
  session?.role === "admin" && Boolean(session.adminUserId);
export const superAdmin = (session) =>
  session?.role === "admin" &&
  !session.adminUserId &&
  (!session.account || session.account === "admin");
export function currentAdminUser(data, session) {
  return managedAdmin(session)
    ? (data.adminUsers || []).find((u) => u.id === session.adminUserId)
    : null;
}
export function adminSessionValid(data, session, source) {
  if (superAdmin(session))
    return (
      (session.credentialId || "legacy-admin") ===
      (data.systemAdminAccount?.passwordCredential?.id || "legacy-admin")
    );
  const user = currentAdminUser(data, session);
  return Boolean(
    user &&
      user.status === "启用" &&
      session.source === source &&
      session.account === user.account &&
      session.credentialId === user.passwordCredential?.id &&
      session.accessId === user.accessId,
  );
}
export function canAdminMenu(data, session, menuId) {
  if (superAdmin(session)) return adminSessionValid(data, session);
  const user = currentAdminUser(data, session);
  return Boolean(
    managedAdmin(session) &&
      menuId !== "users" &&
      user?.status === "启用" &&
      session.credentialId === user.passwordCredential?.id &&
      session.accessId === user.accessId &&
      (user.permissions || []).includes(menuId),
  );
}
export function adminMenuForPath(path) {
  const pathname = String(path || "").split(/[?#]/)[0];
  if (pathname === "/admin/users" || pathname.startsWith("/admin/users/"))
    return "users";
  if (pathname === "/admin/issues" || pathname.startsWith("/admin/issues/"))
    return "overview";
  return (
    ADMIN_MENUS.find(
      (m) => pathname === m.path || pathname.startsWith(m.path + "/"),
    )?.id || ""
  );
}
export function adminPathAllowed(data, session, path) {
  if (superAdmin(session)) return adminSessionValid(data, session);
  if (String(path || "").split(/[?#]/)[0] === "/account/profile")
    return adminSessionValid(data, session, session?.source);
  const record = String(path || "")
    .split(/[?#]/)[0]
    .match(/^\/admin\/(practices|exams)\/([^/]+)(?:\/|$)/);
  if (record) {
    let id;
    try {
      id = decodeURIComponent(record[2]);
    } catch {
      return false;
    }
    const arrangement = (data.arrangements || []).find((a) => a.id === id);
    if (
      arrangement &&
      (arrangement.type === "exam" ? "exams" : "practices") !== record[1]
    )
      return false;
  }
  const id = adminMenuForPath(path);
  return Boolean(id && canAdminMenu(data, session, id));
}
export function adminLandingPath(data, session) {
  if (superAdmin(session)) return "/admin/overview";
  return (
    ADMIN_MENUS.find((m) => canAdminMenu(data, session, m.id))?.path || "/login"
  );
}
export function adminLibraryLandingPath(data, session) {
  return (
    ADMIN_LIBRARY_MENUS.find((menu) => canAdminMenu(data, session, menu.id))
      ?.path || ""
  );
}
export function adminAccountRedirect(data, session, source, pathname) {
  if (!session) return "/login";
  if (session.role !== "admin") return "";
  if (!adminSessionValid(data, session, source)) return "/login";
  const user = currentAdminUser(data, session);
  if (user?.passwordCredential?.mustChange) return "/account/password";
  if (managedAdmin(session) && pathname === "/admin/ai-capability-library")
    return (
      adminLibraryLandingPath(data, session) || adminLandingPath(data, session)
    );
  if (managedAdmin(session) && ["/", "/admin"].includes(pathname))
    return adminLandingPath(data, session);
  return "";
}
export function assertRootAdmin(data, session, source) {
  if (!superAdmin(session) || !adminSessionValid(data, session, source))
    throw new Error("仅系统管理员admin可以管理账号和分配权限。");
}
const groups = {
  teachers:
    "createTeacher importTeachers updateTeacher setTeacherStatus resetTeacherPassword",
  classes: "createClass updateClass archiveClass restoreClass",
  students:
    "createStudent importStudents updateStudent updateStudentFacePhoto setStudentStatus resetStudentFace",
  workstations:
    "createWorkstation updateWorkstation setWorkstationStatus resolveWorkstationRestriction saveWorkstationImplementation saveFieldValidation saveWorkstationAiBaseConfig inspectWorkstationDevices checkWorkstationEquipment",
  devices: "createDevice updateDevice setDeviceStatus testDeviceConnection",
  "ai-config":
    "getSopAiCapabilityStatus getSopMappingStatus getSopAiEvaluationStatus saveAiStepConfig saveAiRuleTreatment createAiLogicalArea deleteAiLogicalArea saveAiJudgementItem deleteAiJudgementItem completeAiCapabilityConfig getSopWorkstationAiState addSopWorkstationAiConfig saveSopWorkstationCameraBinding saveSopWorkstationAreaMapping disableSopWorkstationAi clearAiCapabilityConfig saveMultiCameraBinding expandValidationScenarios saveValidationPurpose startSopWorkstationFieldValidation startValidationCase cancelValidationCase endValidationCase startSopWorkstationValidation saveSopWorkstationValidationCase completeSopWorkstationValidation enableSopWorkstationAi",
  "library.capabilities":
    "createAiCapability updateAiCapability deactivateAiCapability reactivateAiCapability deleteAiCapability",
  "library.videos":
    "uploadAiSourceVideos updateAiSourceVideo batchUpdateAiSourceVideos deleteAiSourceVideos",
  "library.extraction":
    "startFrameExtraction startVideoSlicing deleteAiDerivedItems retryExtractionTask",
  "library.auto-cleaning": "runAutoCleaning restoreAutoCleaningItems",
  "library.manual-cleaning": "applyManualCleaningDecision",
  "library.annotation":
    "createAiAnnotationCategory updateAiAnnotationCategory deleteAiAnnotationCategory saveAiFrameAnnotation batchMarkAiFramesNoTarget saveAiClipAnnotation batchAssignAiClipCategory startPreannotation runPreannotation cancelPreannotation dismissSuggestion",
  "library.training-data":
    "autoSplitAiTrainingData assignAiTrainingSourceGroup saveAiTrainingData prepareAiTrainingData",
  "library.training":
    "startAiModelTraining advanceAiModelTraining cancelAiModelTraining retryAiModelTraining",
  "library.publishing":
    "publishAiCapabilityModel restorePublishedModel saveExistingModelCandidate evaluateExistingModel publishExistingModel",
  overview:
    "addIssueNote verifyIssueTechnical confirmIssueBusiness closeIssue reopenIssue",
  settings: "saveSystemSettings",
  backups: "retryBackup exportWorkingData exportWorkingBackups",
  logs: "recordAuditAccess",
};
export function adminActionMenus(name, args = [], data = {}) {
  if (name === "updateSampleMetadata")
    return [args[0] === "video" ? "library.videos" : "library.annotation"];
  if (
    [
      "getWorkstationAiReadiness",
      "getWorkstationEvaluationGate",
      "getWorkstationReadiness",
    ].includes(name)
  )
    return ["workstations", "ai-config"];
  if (
    [
      "createExportJob",
      "saveDiagnosticRootCause",
      "recordAuditAccess",
    ].includes(name)
  ) {
    const target =
      name === "createExportJob"
        ? args[0]?.targetId
        : name === "saveDiagnosticRootCause"
          ? args[0]
          : String(args[1] || "")
              .split("/")
              .at(-1)
              .trim();
    if (target === "admin-practices") return ["practices"];
    if (target === "admin-exams") return ["exams"];
    const arrangement = (data.arrangements || []).find(
      (a) => a.id === target || (a.sessions || []).some((s) => s.id === target),
    );
    if (arrangement)
      return [arrangement.type === "exam" ? "exams" : "practices"];
    return name === "recordAuditAccess" ? ["logs"] : [];
  }
  return Object.entries(groups)
    .filter(([, names]) => names.split(" ").includes(name))
    .map(([menu]) => menu);
}
export function guardAdminActions(store, { getData, getSession, getSource }) {
  const owner = getSession();
  return Object.fromEntries(
    Object.entries(store).map(([name, value]) => [
      name,
      typeof value !== "function"
        ? value
        : (...args) => {
            const session = getSession();
            if (
              !["login", "logout", "switchWorkIdentity"].includes(name) &&
              (superAdmin(owner) || superAdmin(session))
            )
              assertAdminWriteSession(getData(), owner, session, getSource());
            if (managedAdmin(owner) || managedAdmin(session)) {
              if (!["login", "logout"].includes(name)) {
                if (
                  owner?.adminUserId !== session?.adminUserId ||
                  owner?.credentialId !== session?.credentialId ||
                  owner?.accessId !== session?.accessId
                )
                  throw new Error("登录账号已变化，请重新打开操作。");
                if (!adminSessionValid(getData(), session, getSource()))
                  throw new Error("登录状态已失效，请重新登录。");
                if (
                  name !== "changeAdminPassword" &&
                  currentAdminUser(getData(), session)?.passwordCredential
                    ?.mustChange
                )
                  throw new Error("请先修改临时密码，再使用管理功能。");
                if (
                  !["changeAdminPassword", "saveOwnProfile"].includes(name) &&
                  !adminActionMenus(name, args, getData()).some((menu) =>
                    canAdminMenu(getData(), session, menu),
                  )
                )
                  throw new Error("当前账号没有此功能的操作权限。");
              }
            }
            return value(...args);
          },
    ]),
  );
}
export function assertAdminWriteSession(data, expected, current, source) {
  if (superAdmin(expected) || superAdmin(current)) {
    if (
      !superAdmin(expected) ||
      !superAdmin(current) ||
      (expected.credentialId || "legacy-admin") !==
        (current.credentialId || "legacy-admin") ||
      !adminSessionValid(data, expected, source)
    )
      throw new Error("账号、密码或登录状态已变化，请重新登录后操作。");
    return;
  }
  if (!managedAdmin(expected) && !managedAdmin(current)) return;
  if (
    !expected ||
    !current ||
    expected.adminUserId !== current.adminUserId ||
    expected.credentialId !== current.credentialId ||
    expected.accessId !== current.accessId ||
    !adminSessionValid(data, expected, source)
  )
    throw new Error("账号、权限或登录状态已变化，本次操作未保存，请重新登录。");
}
