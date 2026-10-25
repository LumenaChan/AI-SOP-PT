import { ExamReviewVisibilityPanel } from "./ExamReviewVisibilityPanel.jsx";
import { StudentResultReview } from "./StudentResultReview.jsx";
import { RecordExportHistory } from "./RecordExportHistory.jsx";
import { escapeReportText } from "./exportFileRules.js";
import { getArrangementResultStats, sessionResultPresentation, arrangementAbnormalWorkstations, arrangementRecordContext } from "./recordResultRules.js";
import { stepDiagnostic, diagnosticCheckLabel, diagnosticLinks } from "./sessionDiagnosticRules.js";
import {
  ValidationEnvironmentEditor,
  ValidationRunDetails,
  ValidationCasePreviewList,
  ValidationCaseTabs,
} from "./FieldValidationPanels.jsx";
import {
  validationResult,
  assertFieldEnablement,
} from "./workstationValidationActions.js";
import {
  workstationLinkedStandards,
  standardWorkstationIds,
} from "./workstationStandardRules.js";
import {
  WorkstationAiBaseConfigForm,
  WorkstationEquipmentPanel,
  WorkstationStandardsPanel,
  openWorkstationInspection,
} from "./WorkstationEquipmentPanels.jsx";
import {
  workstationUsageRestriction,
  activeWorkstationUse,
  workstationArrangementState,
} from "./workstationReleaseRules.js";
import {
  TeacherChangePasswordPage,
  teacherPasswordReceiptModal,
  openTeacherPasswordReset,
  teacherImportReceiptModal,
} from "./TeacherPasswordPanels.jsx";
import {
  teacherImportPreview,
  TEACHER_IMPORT_TEMPLATE,
  ACCOUNT_IMPORT_LIMIT,
} from "./teacherImportRules.js";
import {
  teacherPasswordStatus,
  teacherAccountRedirect,
} from "./teacherAccountRules.js";
import { displayBusinessText, displayStepLabel } from "./businessTextRules.js";
import {
  historicalStandardBasis,
  standardReferenceMatches,
} from "./trainingStandardRules.js";
import {
  ArrangementAttendanceEntry,
  AttendanceReturnLink,
} from "./ArrangementAttendance.jsx";
import { MonitorListCameras } from "./MonitorListCameras.jsx";
import { monitorStationFilter } from "./monitorFilterRules.js";
import { arrangementStatusOptions } from "./arrangementStatusRules.js";
import {
  StationCheckForm,
  ModalSubmitReadiness,
  OpeningInspectionRecord,
} from "./OpeningInspection.jsx";
import {
  compactWorkstationLabel,
  workstationBusinessCode,
  workstationCaption,
  workstationOptionLabel,
  hiddenDeviceSerial,
  deviceSerialLabel,
  deviceDisplayName,
} from "./resourceDisplayRules.js";
import { standardMediaWorkingBackup } from "./standardMediaBackup.js";
import {
  StandardMediaEditor,
  StandardMediaList,
  StandardMediaSection,
} from "./StandardMedia.jsx";
import { sessionStandardMediaStep } from "./standardMediaRules.js";
import { TeachingStatisticsPage } from "./TeachingStatisticsPage.jsx";
import { DashboardCardPager } from "./DashboardCardPager.jsx";
import { NotificationPopover } from "./NotificationPopover.jsx";
import { ArrangementStudentPicker } from "./ArrangementStudentPicker.jsx";
import { changeArrangementParticipants } from "./arrangementParticipantRules.js";
import {
  allocationSetupReason,
  allocationWorkstationAvailable,
  randomizeArrangementAllocation,
  swapAllocationStudent,
} from "./arrangementAllocationRules.js";
import {
  useStatisticsNavigate as useNavigate,
  StatisticsReturnLink,
} from "./StatisticsNavigation.jsx";
import { DashboardPerformanceSection } from "./DashboardPerformancePanels.jsx";
import {
  SupportTaskPage,
  StudentSupportTaskList,
  SupportTaskSourcePanel,
} from "./SupportTaskPanels.jsx";
import {
  teacherDashboardTasks,
  adminCurrentArrangements,
} from "./teacherDashboardTasks.js";
import {
  EvidenceTaskSessionPanel,
  StudentEvidenceTaskList,
  EvidenceTaskPage,
  taskOperationId,
} from "./EvidenceTaskPanels.jsx";
import {
  openEvidenceTasks,
  evidenceTasksForSession,
} from "./evidenceTaskRules.js";
import { gradeStateToken, displayGradeText } from "./gradeRevisionRules.js";
import {
  HelpLifecycle,
  StepProgression,
  StepFlowRecord,
} from "./SessionClosurePanels.jsx";
import { openHelpRequests, HELP_LABELS } from "./sessionClosureRules.js";
import { studentRecentResults, studentResult } from "./studentResultRules.js";
import { StudentCameraPreview } from "./StudentCameraPreview.jsx";
import { teacherPrototypeSchedule } from "./dashboardRules.js";
import {
  arrangementAssignments,
  reconcileAssignments,
  allocationIssues,
  preparationActions,
  hasLockedPreparationSnapshot,
  reportSession,
  sessionReportPath,
} from "./arrangementPreparationRules.js";
import { modelSourceLabel } from "./modelProvenanceRules.js";
import {
  SampleMetadataPanel,
  PreannotationTasks,
  SuggestionPanel,
  ViewBindingEditor,
  ValidationPurposePanel,
  ExistingModelPanel,
  ObservationSimulator,
  ObservationTimeline,
  EvidenceCameraSummary,
  SourceMetadataFields,
  ModelRecoveryPanel,
  SessionCameraViewer,
} from "./EnhancementPanels.jsx";
import {
  workstationCameras,
  cameraViews,
  withCameraAliases,
} from "./cameraRules.js";
import {
  RequirementsEditor,
  RequirementsView,
  EvaluationBadge,
  CoverageSummary,
  StepEvaluationExplanation,
  stepJudgementProcessId,
} from "./VisualEvaluation.jsx";
import {
  stepEvaluationMeaning,
  evaluationCoverage,
  COMPLETION_BASES,
} from "./visualEvaluationRules.js";
import {
  createRef,
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CameraOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudDownloadOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DesktopOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  ExportOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HddOutlined,
  HistoryOutlined,
  HomeOutlined,
  LaptopOutlined,
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  PlusOutlined,
  ProductOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ScissorOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  classMajors,
  departments,
  deviceTypes,
  PrototypeDataProvider,
  TeacherDataScope,
  usePrototypeData,
} from "./prototypeData.jsx";
import { dateTimeInputValue } from "./dateTimeRules.js";
import DataScreen from "./DataScreen.jsx";
import {
  createLoginCaptcha,
  matchesLoginCaptcha,
  readRememberedLogin,
  saveRememberedLogin,
} from "./loginRules.js";
import {
  buildStudentIdentityVerification,
  clearStudentIdentitySession,
  createStudentIdentitySession,
  getStudentFaceStatus,
  getStudentIdentityError,
  requestStudentCamera,
  resolveStudentIdentity,
  stopMediaStream,
  writeStudentIdentitySession,
} from "./studentIdentityRules.js";
import {
  buildStudentHelpPayload,
  buildStudentPracticeFeedback,
  getStudentSessionAccess,
  getStudentTaskDetails,
  resolveStudentPrimaryCamera,
  STUDENT_HELP_REASONS,
  studentTaskActionLabel,
} from "./studentPracticeRules.js";
import {
  teacherIdentityView,
  teacherSessionEvents,
  teacherEventSortTime,
  teacherStudentActivities,
} from "./studentTeacherLinkRules.js";
import {
  DEFAULT_EXAM_DURATION_MINUTES,
  EXAM_INCIDENT_REASONS,
  examCountdownTone,
  examEntryStatus,
  examRemainingSeconds,
  formatExamEntryWindow,
  formatExamRemaining,
  normalizeExamDuration,
} from "./studentExamRules.js";
import {
  compressImageForPrototype,
  formatFaceImageSize,
  STUDENT_FACE_ACCEPT,
} from "./studentFaceRules.js";
import {
  AI_CONFIG_PATH,
  AI_LIBRARY_PATH,
  AI_LIBRARY_SECTIONS,
  deriveSopAiConfigurationSummary,
  getConfigurableSops,
} from "./aiEntry.js";
import {
  AI_CAPABILITY_STATUSES,
  AI_CAPABILITY_TYPES,
  canEditCapability,
  canEditCapabilityMeaning,
  capabilityReferenceCount,
} from "./aiCapabilityRules.js";
import {
  AI_VIDEO_CATEGORIES,
  AI_VIDEO_PROCESSING_STATUSES,
  AI_VIDEO_SOURCES,
  potentialVideoDuplicates,
  videoStats,
} from "./aiVideoRules.js";
import {
  CLIP_GENERATION_MODES,
  DERIVED_DATA_STATUSES,
  EXTRACTION_TASK_STATUSES,
  FRAME_SAMPLING_MODES,
  estimateFrameExtraction,
  extractionModeForCapability,
  formatTimecode as formatDerivedTimecode,
  parseTimecode as parseDerivedTimecode,
} from "./aiExtractionRules.js";
import {
  AUTO_CLEANING_RESULTS,
  AUTO_CLEANING_TASK_STATUSES,
  CLEANING_REASONS,
  CLEANING_SENSITIVITIES,
  CLEANING_WARNINGS,
  DEFAULT_CLIP_CLEANING_RULES,
  DEFAULT_IMAGE_CLEANING_RULES,
  summarizeCleaning,
} from "./aiCleaningRules.js";
import {
  MANUAL_CLEANING_STATUSES,
  MANUAL_REJECTION_REASONS,
  sortManualCleaningItems,
  summarizeManualCleaning,
} from "./aiManualCleaningRules.js";
import {
  ANNOTATION_STATUSES,
  summarizeAnnotations,
} from "./aiAnnotationRules.js";
import {
  DEFAULT_TRAINING_RATIOS,
  TRAINING_SPLITS,
  buildTrainingReadiness,
  collectTrainingCandidates,
  groupTrainingCandidates,
  summarizeTrainingData,
  trainingCategoryDistribution,
  validateTrainingRatios,
} from "./aiTrainingDataRules.js";
import {
  ACTION_MODEL_PRESETS,
  ACTIVE_TRAINING_STATUSES,
  OBJECT_MODEL_PRESETS,
  TRAINING_TASK_STATUSES,
  defaultTrainingParams,
} from "./aiModelTrainingRules.js";
import {
  buildPublicationReadiness,
  canReactivateCapabilityModel,
  getCurrentCandidateTask,
  isCapabilityAvailableForConfiguration,
} from "./aiModelPublishingRules.js";
import {
  ACTION_RECOGNITION_OPERATORS,
  AI_ACTUAL_EVALUATION_MODES,
  AI_CONDITION_COMBINATIONS,
  AI_JUDGEMENT_PURPOSES,
  allowedActualEvaluationModes,
  evaluateAiCapabilityConfig,
  FIXED_AI_FALLBACK,
  isEvaluationModeDowngraded,
  normalizeAiCapabilityConfig,
  OBJECT_DETECTION_OPERATORS,
} from "./aiCapabilityConfigRules.js";
import {
  deriveWorkstationAiReadiness,
  isCameraDevice,
  isEdgeDevice,
  normalizeWorkstationAiBaseConfig,
} from "./workstationAiRules.js";
import {
  activeJudgementItems,
  buildValidationCoverage as buildSopWorkstationValidationCoverage,
  checkSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
  isWorkstationSelectable,
  normalizeSopWorkstationAiConfig,
  requiredLogicalAreas,
  VALIDATION_SCENARIOS,
  WORKSTATION_ENABLE_STATUSES,
  WORKSTATION_VALIDATION_STATUSES,
  workstationValidationLabel,
} from "./sopWorkstationAiRules.js";
import {
  automaticEvaluationGate,
  ACTOR_BINDING_STATUSES,
  arrangementDestination,
  canCloseIssue,
  checkCompletionScoringCoverage,
  COMPATIBILITY_DECISIONS,
  COMPATIBILITY_LAYER_STATUSES,
  CORRECTION_TREATMENTS,
  createSafetyRuleDraft,
  createScoreRuleDraft,
  createSopStepDraft,
  DIAGNOSTIC_ROOT_CAUSES,
  deriveDataRequirements,
  EVALUATION_ITEM_ROLES,
  COMPLETION_RESULTS,
  FIELD_VALIDATION_SCENARIOS,
  getAiPackageCreationReadiness,
  getExamPublishGate,
  isSopAvailableForNewArrangement,
  INCOMPLETE_POLICIES,
  JUDGEMENT_MODES,
  MACHINE_EVENT_CAPABILITY_MODES,
  nextStableStepId,
  nextBusinessRuleId,
  recordedDeductionOf,
  SAFETY_SCORE_TREATMENTS,
  SAFETY_CANDIDATE_STATUSES,
  SAFETY_SESSION_TREATMENTS,
  SCORE_DEDUCTION_MODES,
  SCORE_RULE_TYPES,
  SCORE_DISPOSITIONS,
  STEP_EXECUTION_STATES,
  TECHNICAL_INCIDENT_TYPES,
  sessionPrimaryIssue,
  validateEvaluationMapping,
  validateSopDefinition,
  workstationFeedbackPolicy,
} from "./domainRules.js";

const teacherNav = [
  ["教师工作台", "/teacher/dashboard", <HomeOutlined />],
  ["实训标准库", "/teacher/sop", <BookOutlined />],
  ["练习管理", "/teacher/practices", <EditOutlined />],
  ["考试管理", "/teacher/exams", <FileDoneOutlined />],
  ["教学统计", "/teacher/statistics", <BarChartOutlined />],
];
const adminNav = [
  ["运行概览", "/admin/overview", <BarChartOutlined />],
  ["教师管理", "/admin/teachers", <TeamOutlined />],
  ["班级管理", "/admin/classes", <AppstoreOutlined />],
  ["学生管理", "/admin/students", <UserOutlined />],
  ["工位管理", "/admin/workstations", <DesktopOutlined />],
  ["设备管理", "/admin/devices", <HddOutlined />],
  ["AI能力配置", AI_CONFIG_PATH, <ApartmentOutlined />],
  ["AI能力库", AI_LIBRARY_PATH, <VideoCameraOutlined />],
  ["练习记录", "/admin/practices", <EditOutlined />],
  ["考试记录", "/admin/exams", <FileDoneOutlined />],
  ["运行配置", "/admin/settings", <SettingOutlined />],
  ["备份与恢复", "/admin/backups", <DatabaseOutlined />],
  ["操作日志", "/admin/logs", <HistoryOutlined />],
];

function getSopAiConfigurationSummary(data, sop) {
  const config = (data.aiCapabilityConfigs || []).find(
    (item) => item.sopId === sop?.id,
  );
  return deriveSopAiConfigurationSummary({
    sop,
    config,
    workstationConfigs: data.sopWorkstationAiConfigs,
    workstations: data.workstations,
    devices: data.devices,
    capabilities: data.aiCapabilities,
  });
}

const stations = [
  {
    id: 1,
    name: "张浩",
    no: "20241001",
    score: 78,
    step: "高压电池包断电",
    time: "00:18:27",
    status: "故障",
    tone: "danger",
    image: "/assets/workstation-male.png",
    progress: 52,
  },
  {
    id: 2,
    name: "李思雨",
    no: "20241002",
    score: 92,
    step: "车辆下电与验电",
    time: "00:16:05",
    status: "进行中",
    tone: "success",
    image: "/assets/workstation-female.png",
    progress: 64,
  },
  {
    id: 3,
    name: "陈宇",
    no: "20241003",
    score: 85,
    step: "高压部件拆装",
    time: "00:12:14",
    status: "已暂停",
    tone: "warning",
    image: "/assets/workstation-male.png",
    progress: 72,
  },
  {
    id: 4,
    name: "王梓轩",
    no: "20241004",
    score: "--",
    step: "等待开始",
    time: "--",
    status: "待开始",
    tone: "muted",
    image: "/assets/workstation-empty.png",
    progress: 0,
  },
  {
    id: 5,
    name: "刘佳怡",
    no: "20241005",
    score: 88,
    step: "绝缘检测",
    time: "00:20:11",
    status: "进行中",
    tone: "success",
    image: "/assets/workstation-female.png",
    progress: 78,
  },
  {
    id: 6,
    name: "赵子墨",
    no: "20241006",
    score: 81,
    step: "高压接插件安装",
    time: "00:08:33",
    status: "待复位",
    tone: "orange",
    image: "/assets/workstation-male.png",
    progress: 40,
  },
];

const monitorSteps = [
  {
    title: "身份确认与安全防护检查",
    short: "安全防护",
    state: "pass",
    result: "通过",
    time: "00:42",
    score: "15 / 15",
    requirement: "完成人脸核验，展示绝缘手套、安全帽与工装，并确认手套无破损。",
    observation: "身份一致；三项防护用品均已识别，手套翻转检查动作完整。",
    rule: "SAFE-001 · 防护用品完整",
  },
  {
    title: "车辆下电并设置安全警示",
    short: "车辆下电",
    state: "pass",
    result: "通过",
    time: "01:18",
    score: "15 / 15",
    requirement: "车辆驻车后关闭点火开关，移除钥匙并放置高压作业警示牌。",
    observation: "下电顺序正确，钥匙已离车，警示牌位于工位入口可见区域。",
    rule: "POWER-002 · 下电顺序完整",
  },
  {
    title: "高压系统验电",
    short: "高压验电",
    state: "fail",
    result: "不通过",
    time: "00:58",
    score: "8 / 15",
    requirement: "验电工具完成自检后，依次检查两个高压端点。",
    observation: "已识别第一端点验电动作，第二端点动作未形成完整证据链。",
    rule: "HS-OP-003 · 二次验电不完整",
  },
  {
    title: "拆卸高压接插件",
    short: "拆卸接插件",
    state: "active",
    result: "进行中",
    time: "02:14",
    score: "实时评价",
    requirement: "解除二次锁止，沿规定方向稳定拆卸接插件并完成绝缘防护。",
    observation: "当前识别到双手稳定握持接插件，动作置信度 92%。",
    rule: "HS-OP-004 · 接插件拆卸轨迹",
  },
  {
    title: "完成绝缘检测",
    short: "绝缘检测",
    state: "pending",
    result: "未进行",
    time: "--:--",
    score: "待评价",
    requirement: "按指定量程完成绝缘电阻检测，并记录稳定后的测量结果。",
    observation: "等待学生进入本步骤。",
    rule: "INS-005 · 绝缘检测完整性",
  },
  {
    title: "恢复与工位复位",
    short: "工位复位",
    state: "pending",
    result: "未进行",
    time: "--:--",
    score: "待评价",
    requirement: "恢复接插件与安全装置，清点工具并将工位恢复到可用状态。",
    observation: "等待学生进入本步骤。",
    rule: "RESET-006 · 工位复位完整性",
  },
];

const students = [
  ["张浩", "20241001", "新能源2401班", "78分", "待复核", "绝缘手套佩戴不规范"],
  ["李思雨", "20241002", "新能源2401班", "92分", "正式成绩", "无"],
  ["陈宇", "20241003", "新能源2401班", "85分", "正式成绩", "验电顺序错误"],
  ["刘佳怡", "20241005", "新能源2402班", "88分", "正式成绩", "工具放置不规范"],
  ["赵子墨", "20241006", "新能源2402班", "81分", "生成中", "接插件未二次确认"],
];
const sopRows = [
  [
    "新能源汽车高压安全操作",
    "王老师",
    "V3.2",
    "已发布",
    "训练完成",
    "2026-09-15 16:32",
  ],
  [
    "工业机器人末端夹具更换",
    "王老师",
    "V1.4",
    "草稿",
    "需补充素材",
    "2026-09-14 10:18",
  ],
  [
    "数控车床工件装夹",
    "李老师",
    "V2.1",
    "已发布",
    "训练完成",
    "2026-09-12 09:44",
  ],
  [
    "电气控制柜故障排查",
    "周老师",
    "V1.8",
    "已发布",
    "训练完成",
    "2026-09-10 14:21",
  ],
];
const sopSteps = [
  {
    title: "身份确认与安全防护检查",
    type: "操作步骤",
    score: 15,
    summary: "确认学生身份，并完成绝缘手套、安全帽与工装穿戴检查。",
    requirements: [
      "面向主摄像头完成人脸核验",
      "依次展示绝缘手套、安全帽与工装",
      "双手翻转，确认手套无破损",
    ],
    evidence: ["身份核验截图", "防护用品全景视频", "绝缘手套近景片段"],
    deductions: ["防护用品缺失：本步骤 0 分", "手套检查动作不完整：扣 5 分"],
    redline: "身份不一致或未佩戴绝缘手套时，禁止进入下一步。",
  },
  {
    title: "车辆下电并设置安全警示",
    type: "操作步骤",
    score: 15,
    summary: "按照断电顺序关闭车辆，并在工位外侧放置高压作业警示。",
    requirements: [
      "确认车辆处于驻车状态",
      "关闭点火开关并移除钥匙",
      "在工位入口放置高压作业警示牌",
    ],
    evidence: ["仪表下电画面", "钥匙离车画面", "警示牌位置全景"],
    deductions: ["顺序错误：扣 5 分", "未放置警示牌：扣 5 分"],
  },
  {
    title: "高压系统验电",
    type: "操作步骤",
    score: 15,
    summary: "使用合格验电工具依次检查两个高压端点，确认系统无残余电压。",
    requirements: [
      "验电工具完成自检",
      "对第一端点完成验电",
      "对第二端点完成二次验电",
    ],
    evidence: ["工具自检近景", "第一端点验电片段", "第二端点验电片段"],
    deductions: ["工具未自检：扣 3 分", "二次验电不完整：扣 7 分"],
    redline: "未完成两个端点验电时，不得拆卸高压接插件。",
  },
  {
    title: "拆卸高压接插件",
    type: "核心步骤",
    score: 25,
    summary: "解除二次锁止后，沿规定方向拆卸高压接插件并完成绝缘防护。",
    requirements: [
      "解除二次锁止机构",
      "双手稳定拆卸接插件",
      "端口立即加装绝缘防护",
    ],
    evidence: ["锁止机构近景", "拆卸动作全程", "端口防护完成画面"],
    deductions: ["拉拽线束：扣 10 分", "未安装绝缘防护：本步骤 0 分"],
    redline: "检测到带电拆卸或工具短接风险时，立即暂停评价并触发安全告警。",
  },
  {
    title: "完成绝缘检测",
    type: "操作步骤",
    score: 15,
    summary: "按指定量程完成绝缘电阻检测，并记录稳定后的测量结果。",
    requirements: ["确认仪表量程", "正确连接检测端点", "读取并口述稳定测量值"],
    evidence: ["仪表量程画面", "端点连接画面", "测量结果近景"],
    deductions: ["量程选择错误：扣 5 分", "未等待数值稳定：扣 3 分"],
  },
  {
    title: "恢复与工位复位",
    type: "操作步骤",
    score: 15,
    summary: "恢复接插件与安全装置，清点工具并将工位恢复到可用状态。",
    requirements: [
      "接插件完成二次锁止",
      "工具与防护用品归位",
      "确认工位无遗留物",
    ],
    evidence: ["锁止状态近景", "工具清点画面", "工位复位全景"],
    deductions: ["未执行二次锁止：扣 7 分", "工具未归位：扣 3 分"],
  },
];
const arrangements = [
  [
    "新能源汽车高压安全操作练习",
    "新能源汽车高压安全操作",
    "28人",
    "进行中",
    "2026-09-17 10:00",
  ],
  [
    "2402班高压安全强化练习",
    "新能源汽车高压安全操作",
    "24人",
    "待开始",
    "2026-09-18 14:00",
  ],
  [
    "机器人夹具更换练习",
    "工业机器人末端夹具更换",
    "20人",
    "草稿",
    "2026-09-20 09:00",
  ],
  [
    "数控装夹阶段练习",
    "数控车床工件装夹",
    "32人",
    "已结束",
    "2026-09-12 13:30",
  ],
];
const examRows = [
  [
    "新能源汽车高压安全操作期中考试",
    "新能源汽车高压安全操作",
    "28人",
    "待发布",
    "2026-09-16 09:00",
  ],
  [
    "2402班高压安全操作考试",
    "新能源汽车高压安全操作",
    "24人",
    "待开始",
    "2026-09-22 14:00",
  ],
  [
    "数控装夹技能考试",
    "数控车床工件装夹",
    "30人",
    "已发布",
    "2026-09-10 08:30",
  ],
];

function Status({ children, tone }) {
  const text = String(children);
  const t =
    tone ||
    (/故障|告警|失败|异常|错误|重复|不可用/.test(text)
      ? "danger"
      : /暂停|待复核|待发布|待停用|待检测|待重采|维护|需|部分缺失/.test(text)
        ? "warning"
        : /进行|完成|完整|正式|在线|启用|已发布|成功|可用|可入场|可导入|已采集|已关闭|已处理|已通过|已确认/.test(
              text,
            )
          ? "success"
          : "muted");
  return (
    <span className={`status status--${t}`}>
      {t === "danger" ? (
        <ExclamationCircleFilled />
      ) : t === "success" ? (
        <CheckCircleFilled />
      ) : (
        <ClockCircleOutlined />
      )}
      {typeof children === "string" ? displayBusinessText(children) : children}
    </span>
  );
}
function Button({
  children,
  type = "default",
  icon,
  onClick,
  disabled = false,
  htmlType = "button",
}) {
  return (
    <button
      type={htmlType}
      disabled={disabled}
      onClick={onClick}
      className={`button button--${type}`}
    >
      {icon && (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
function PanelTitle({ title, action }) {
  return (
    <header className="panel-title">
      <h2>{displayBusinessText(title)}</h2>
      {action}
    </header>
  );
}

function FieldLabel({ children, required = false }) {
  return (
    <span className="field__label">
      {required && (
        <b className="field__required" aria-hidden="true">
          *
        </b>
      )}
      {typeof children === "string" ? displayBusinessText(children) : children}
    </span>
  );
}
function Metric({ label, value, hint, icon, tone, onClick }) {
  const Component = onClick ? "button" : "section";
  return (
    <Component
      className={`metric metric--${tone}${onClick ? " metric--interactive" : ""}`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <span className="metric__icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{displayBusinessText(value)}</strong>
        <p>{hint}</p>
      </div>
    </Component>
  );
}
function PageHeader({ title, subtitle, actions, back }) {
  const nav = useNavigate();
  return (
    <header className="page-header">
      <div>
        {back && (
          <button className="back-link" onClick={() => nav(-1)}>
            ← 返回
          </button>
        )}
        <h1>{displayBusinessText(title)}</h1>
        {subtitle && <p>{displayBusinessText(subtitle)}</p>}
      </div>
      <div className="page-header__actions">{actions}</div>
    </header>
  );
}

function MissingState({ title, backTo }) {
  const nav = useNavigate();
  return (
    <section className="panel empty-state">
      <AlertOutlined />
      <h1>{title}</h1>
      <p>对象可能已被停用、归档或由其他操作更新，请返回列表重新选择。</p>
      <Button type="primary" onClick={() => nav(backTo)}>
        返回列表
      </Button>
    </section>
  );
}

function Modal({ data, close, done }) {
  const [busy, setBusy] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    setBusy(false);
    setContentReady(false);
    setError("");
    if (!data) return undefined;
    const previous = document.activeElement;
    window.setTimeout(() => {
      const firstField = dialogRef.current?.querySelector(
        "input, select, textarea, button",
      );
      (firstField || dialogRef.current)?.focus();
    }, 0);
    return () => previous?.focus?.();
  }, [data]);

  if (!data) return null;
  const submit = async () => {
    if (data.requireContentReady && !contentReady) return;
    if (data.dismissOnly || (!data.onConfirm && !data.success)) {
      close();
      return;
    }
    if (!data.onConfirm) {
      setError("该操作尚未接入业务处理，本次没有保存或修改任何数据。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const message = await data.onConfirm();
      if (data.onSuccess) {
        data.onSuccess(message);
        return;
      }
      done(message || data.success || "操作已完成");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "操作失败，请检查输入后重试。",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="overlay"
      onMouseDown={(e) => !busy && e.target === e.currentTarget && close()}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={[
          "modal",
          data.size === "large" ? "modal--large" : "",
          data.className || "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={error ? "modal-error" : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) close();
          if (event.key === "Tab") {
            const focusable = [
              ...dialogRef.current.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
              ),
            ];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header>
          <div>
            <span className="eyebrow">{data.eyebrow || "操作确认"}</span>
            <h2 id="modal-title">{displayBusinessText(data.title)}</h2>
          </div>
          <button
            className="icon-button"
            disabled={busy}
            onClick={close}
            aria-label="关闭弹窗"
          >
            ×
          </button>
        </header>
        <div className="modal__body">
          <ModalSubmitReadiness.Provider value={setContentReady}>
            {data.content || <p>确认执行当前操作？操作记录将写入审计日志。</p>}
          </ModalSubmitReadiness.Provider>
          {error && (
            <p className="form-error" id="modal-error" role="alert">
              <ExclamationCircleFilled /> {displayBusinessText(error)}
            </p>
          )}
        </div>
        <footer>
          {!data.hideCancel && (
            <Button onClick={close} disabled={busy}>
              取消
            </Button>
          )}
          <Button
            type="primary"
            onClick={submit}
            disabled={busy || (data.requireContentReady && !contentReady)}
          >
            {busy
              ? "处理中…"
              : data.confirmText || (data.onConfirm ? "确认" : "知道了")}
          </Button>
        </footer>
      </section>
    </div>
  );
}
function Shell({ children, modal, setModal, toast, setToast }) {
  const loc = useLocation(),
    nav = useNavigate(),
    admin = loc.pathname.startsWith("/admin");
  const store = usePrototypeData();
  const { notifications = [] } = store.data;
  const [collapsed, setCollapsed] = useState(
      () => typeof window !== "undefined" && window.innerWidth < 1180,
    ),
    [aiLibraryOpen, setAiLibraryOpen] = useState(true),
    [roleMenuOpen, setRoleMenuOpen] = useState(false),
    [notificationOpen, setNotificationOpen] = useState(false),
    [backupBusy, setBackupBusy] = useState(false),
    [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const items = admin ? adminNav : teacherNav;
  const onAiLibraryPage = loc.pathname.startsWith(AI_LIBRARY_PATH);
  const showAiLibraryChildren = onAiLibraryPage && aiLibraryOpen && !collapsed;
  const activeAiLibraryItemRef = useRef(null);
  useEffect(() => {
    if (showAiLibraryChildren)
      activeAiLibraryItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [loc.pathname, showAiLibraryChildren]);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const displayedNotifications = notifications.map((item) => {
    const issueId = item.path?.startsWith("/admin/issues/")
      ? item.path.split("/").at(-1)
      : "";
    const issue = store.data.issues.find((entry) => entry.id === issueId);
    return issue?.status === "已关闭"
      ? {
          ...item,
          title: `${issue.nodeId} 异常已关闭`,
          detail: "技术与现场确认完成，受影响会话仍保持暂停",
          tone: "success",
        }
      : item;
  });
  const clockText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(clock)
    .replaceAll("/", "-");
  const finish = (message) => {
    const msg = message || modal?.success || "操作已完成";
    setModal(null);
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  };
  return (
    <div className={`app ${collapsed ? "app--collapsed" : ""}`}>
      <aside className="sidebar">
        <button
          className="brand"
          aria-label="返回当前角色首页"
          onClick={() => nav(admin ? "/admin/overview" : "/teacher/dashboard")}
        >
          <span className="brand__content">
            <strong>
              <span>AI视觉实训操作流程</span>
              <span>智能评测系统</span>
            </strong>
          </span>
        </button>
        <nav className={admin ? "sidebar__nav--admin" : ""}>
          {items.map(([label, path, icon]) => (
            <Fragment key={path}>
              <button
                title={label}
                aria-label={label}
                className={`${loc.pathname.startsWith(path) ? "active" : ""} ${path === AI_LIBRARY_PATH ? "sidebar__parent" : ""}`}
                aria-expanded={
                  path === AI_LIBRARY_PATH ? showAiLibraryChildren : undefined
                }
                aria-controls={
                  path === AI_LIBRARY_PATH ? "ai-library-subnav" : undefined
                }
                onClick={() => {
                  if (path !== AI_LIBRARY_PATH) {
                    nav(path);
                    return;
                  }
                  if (collapsed) {
                    setCollapsed(false);
                    setAiLibraryOpen(true);
                  } else if (onAiLibraryPage) {
                    setAiLibraryOpen((open) => !open);
                  } else {
                    setAiLibraryOpen(true);
                  }
                  if (!onAiLibraryPage) nav(AI_LIBRARY_PATH);
                }}
              >
                {icon}
                <span className="sidebar__label">{label}</span>
              </button>
              {path === AI_LIBRARY_PATH && showAiLibraryChildren && (
                <div
                  id="ai-library-subnav"
                  className="sidebar__subnav"
                  role="group"
                  aria-label="AI能力库二级菜单"
                >
                  {AI_LIBRARY_SECTIONS.map((section) => {
                    const sectionPath = `${AI_LIBRARY_PATH}/${section.path}`;
                    const active =
                      loc.pathname === sectionPath ||
                      (section.path === "capabilities" &&
                        loc.pathname.startsWith(`${sectionPath}/`));
                    return (
                      <button
                        key={section.path}
                        ref={active ? activeAiLibraryItemRef : undefined}
                        title={section.title}
                        className={active ? "active" : ""}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          const detailId = loc.pathname.startsWith(
                            `${AI_LIBRARY_PATH}/capabilities/`,
                          )
                            ? loc.pathname.split("/")[4]
                            : null;
                          const selectedId =
                            new URLSearchParams(loc.search).get(
                              "capabilityId",
                            ) || detailId;
                          const selected = (
                            store.data.aiCapabilities || []
                          ).some((item) => item.id === selectedId);
                          nav(
                            selected && section.path !== "capabilities"
                              ? `${sectionPath}?capabilityId=${encodeURIComponent(selectedId)}`
                              : sectionPath,
                          );
                        }}
                      >
                        <span className="sidebar__label">{section.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Fragment>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="sidebar__footer-slogan">
            让技能更安全
            <br />
            让教育更智能
          </span>
          <span className="sidebar__footer-brand">
            AI赋能职业教育
            <br />
            兴辰智能（北京）科技有限公司
          </span>
        </div>
      </aside>
      <section className="app-main">
        {store.dataSyncError && (
          <div
            className="evaluation-notice evaluation-notice--warning"
            role="alert"
          >
            {store.dataSyncError}{" "}
            可在右上角身份菜单的“原型数据与备份”中导出当前数据和升级前备份。
          </div>
        )}
        <header className="topbar">
          <div>
            <button
              className="icon-button"
              aria-label={collapsed ? "展开侧边导航" : "收起侧边导航"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <span className="breadcrumb">{admin ? "管理员端" : "教师端"}</span>
          </div>
          <div className="topbar__right">
            <span className="clock" title="当前系统时间">
              {clockText}
            </span>
            <a
              className="screen-mode"
              href={`/data-screen?scope=${admin ? "school" : "teacher"}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DesktopOutlined /> 数据大屏
            </a>
            <div className="notification-wrap">
              <button
                className="notification"
                aria-label={`通知，${unreadCount} 条未读`}
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
                aria-controls={
                  notificationOpen ? "header-notification-popover" : undefined
                }
                onClick={() => {
                  setNotificationOpen(!notificationOpen);
                  setRoleMenuOpen(false);
                }}
              >
                <BellOutlined aria-hidden="true" />
                {unreadCount > 0 && <b>{unreadCount}</b>}
              </button>
              {notificationOpen && (
                <NotificationPopover
                  items={displayedNotifications}
                  onMarkAllRead={() => store.markAllNotificationsRead()}
                  onSelect={(item) => {
                    store.markNotificationRead(item.id);
                    setNotificationOpen(false);
                    nav(item.path);
                  }}
                  onClose={() => setNotificationOpen(false)}
                />
              )}
            </div>
            <div className="role-menu-wrap">
              <button
                className="user-menu"
                aria-label={`打开身份菜单，当前为${admin ? "系统管理员" : store.teacherName}`}
                aria-haspopup="menu"
                aria-expanded={roleMenuOpen}
                onClick={() => {
                  setRoleMenuOpen(!roleMenuOpen);
                  setNotificationOpen(false);
                }}
              >
                <span className="avatar">
                  <UserOutlined aria-hidden="true" />
                </span>
                <span>
                  <strong>{admin ? "系统管理员" : store.teacherName}</strong>
                  <small>
                    {admin
                      ? "管理员端"
                      : store.currentTeacher?.department || "教师端"}
                  </small>
                </span>
                <span className="role-menu__chevron" aria-hidden="true">
                  ⌄
                </span>
              </button>
              {roleMenuOpen && (
                <div className="role-popover" role="menu">
                  <span className="eyebrow">当前工作身份</span>
                  <strong>
                    {admin ? "系统管理员" : `${store.teacherName} · 教师`}
                  </strong>
                  <p>切换身份后将进入对应工作台，当前页面不会保存为草稿。</p>
                  <details className="role-data-source">
                    <summary className="role-data-source__heading">
                      <span>原型数据与备份</span>
                      <small>
                        {store.dataSource === "cpd" ? "CPD 数据" : "浏览器数据"}
                      </small>
                    </summary>
                    <div className="role-data-source__body">
                      <div
                        className="role-data-source__options"
                        role="radiogroup"
                        aria-label="选择原型数据来源"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={store.dataSource === "cpd"}
                          className={store.dataSource === "cpd" ? "active" : ""}
                          onClick={() => {
                            const changed = store.switchDataSource("cpd");
                            setRoleMenuOpen(false);
                            if (changed) {
                              setToast("已切换为 CPD 演示数据");
                              window.setTimeout(() => setToast(""), 2200);
                            }
                          }}
                        >
                          <DatabaseOutlined aria-hidden="true" />
                          <span>
                            <strong>CPD 数据</strong>
                            <small>项目默认演示数据</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={store.dataSource === "browser"}
                          className={
                            store.dataSource === "browser" ? "active" : ""
                          }
                          onClick={() => {
                            const changed = store.switchDataSource("browser");
                            setRoleMenuOpen(false);
                            if (changed) {
                              setToast("已切换为浏览器数据");
                              window.setTimeout(() => setToast(""), 2200);
                            }
                          }}
                        >
                          <DesktopOutlined aria-hidden="true" />
                          <span>
                            <strong>浏览器数据</strong>
                            <small>此浏览器原有数据</small>
                          </span>
                        </button>
                      </div>
                      <details className="role-data-source__backup">
                        <summary>数据备份（按需导出）</summary>
                        <p className="role-data-source__backup-note">
                          当前工作数据包含上传的示教资料，有附件时导出ZIP包；升级前备份保留原始数据。下载不会切换或覆盖当前数据。
                        </p>
                        <div className="role-data-source__exports">
                          <Button
                            disabled={backupBusy}
                            onClick={async () => {
                              setBackupBusy(true);
                              try {
                                const result = await standardMediaWorkingBackup(
                                  store.exportWorkingData(),
                                );
                                downloadBlobFile(result.name, result.blob);
                                setToast(
                                  result.missing
                                    ? `备份已导出，${result.missing}个资料文件无法读取，详见资料清单。`
                                    : result.included
                                      ? `工作数据及${result.included}个示教资料文件已导出。`
                                      : "工作数据已导出。",
                                );
                              } catch (error) {
                                setToast(
                                  error.message ||
                                    "工作数据导出失败，请保留当前页面后重试。",
                                );
                              } finally {
                                setBackupBusy(false);
                              }
                            }}
                          >
                            {backupBusy ? "正在导出…" : "导出当前工作数据"}
                          </Button>
                          <Button
                            onClick={async () => {
                              try {
                                downloadTextFile(
                                  "兴辰升级前备份.json",
                                  await store.exportWorkingBackups(),
                                  "application/json",
                                );
                              } catch {
                                setToast("备份导出失败，请保留当前页面后重试");
                              }
                            }}
                          >
                            导出升级前备份
                          </Button>
                        </div>
                      </details>
                      <p className="role-data-source__note">
                        两套数据独立保存。切换会关闭当前编辑，未保存内容不会带入另一来源。
                      </p>
                    </div>
                  </details>
                  <Button
                    disabled={!admin}
                    onClick={() => {
                      nav("/teacher/dashboard");
                      setRoleMenuOpen(false);
                    }}
                  >
                    教师端{!admin ? " · 当前" : ""}
                  </Button>
                  <Button
                    disabled={admin || store.accountSession?.role === "teacher"}
                    onClick={() => {
                      nav("/admin/overview");
                      setRoleMenuOpen(false);
                    }}
                  >
                    管理员端{admin ? " · 当前" : ""}
                  </Button>
                  <Button
                    onClick={() => {
                      clearStudentIdentitySession();
                      nav("/student/login");
                      setRoleMenuOpen(false);
                    }}
                  >
                    学生端
                  </Button>
                  {!admin && (
                    <Button
                      onClick={() => {
                        setRoleMenuOpen(false);
                        nav("/account/password");
                      }}
                    >
                      修改密码
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      store.logout();
                      setRoleMenuOpen(false);
                      nav("/login");
                    }}
                  >
                    退出登录
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <AttendanceReturnLink />
          <StatisticsReturnLink />
          {admin ? children : <TeacherDataScope>{children}</TeacherDataScope>}
        </main>
      </section>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircleFilled />
          {displayBusinessText(toast)}
        </div>
      )}
      <Modal data={modal} close={() => setModal(null)} done={finish} />
    </div>
  );
}
function LoginPage() {
  const nav = useNavigate(),
    location = useLocation(),
    store = usePrototypeData();
  const [signingIn, setSigningIn] = useState(false);
  const [remembered] = useState(() => {
    try {
      const saved = readRememberedLogin(window.localStorage);
      const demoTeacher = store.data.teachers.find((t) => t.id === "t1");
      return saved?.account === "wanglaoshi" && demoTeacher?.passwordCredential
        ? { account: demoTeacher.account, accountOnly: true }
        : saved;
    } catch {
      return null;
    }
  });
  const [account, setAccount] = useState(
    location.state?.account || remembered?.account || "wanglaoshi",
  );
  const [password, setPassword] = useState(
    location.state?.account || remembered?.accountOnly
      ? ""
      : remembered?.password || "12345678",
  );
  const [rememberPassword, setRememberPassword] = useState(Boolean(remembered));
  const rememberAccountOnly =
    account.trim().toLowerCase() !== "admin" &&
    (account.trim().toLowerCase() !== "wanglaoshi" ||
      Boolean(
        store.data.teachers.find((t) => t.id === "t1")?.passwordCredential,
      ));
  const [captcha, setCaptcha] = useState(createLoginCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const captchaCanvas = useRef(null),
    captchaField = useRef(null);
  const refreshCaptcha = () => {
    let next = createLoginCaptcha();
    while (next === captcha) next = createLoginCaptcha();
    setCaptcha(next);
    setCaptchaInput("");
  };
  useEffect(() => {
    const context = captchaCanvas.current.getContext("2d");
    if (!context) return;
    context.fillStyle = "#eff5fc";
    context.fillRect(0, 0, 264, 84);
    context.strokeStyle = "#c7d7eb";
    context.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      context.beginPath();
      context.moveTo(0, 12 + i * 16);
      context.lineTo(264, 72 - i * 14);
      context.stroke();
    }
    context.font = "600 44px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    Array.from(captcha).forEach((character, i) => {
      context.save();
      context.translate(43 + i * 59, 43);
      context.rotate((i % 2 ? 1 : -1) * 0.09);
      context.fillStyle = i % 2 ? "#32699c" : "#234b77";
      context.fillText(character, 0, 0);
      context.restore();
    });
  }, [captcha]);
  return (
    <div className="login-page">
      <figure className="login-hero-figure">
        <div className="login-hero-panorama">
          <img
            src="/assets/login-ai-vision-training.png"
            alt="AI视觉系统识别新能源汽车高压实训操作过程"
          />
        </div>
      </figure>
      <section className="login-brand">
        <div className="brand-lockup">
          <div>
            <h1>AI视觉实训操作流程智能评测系统</h1>
            <p>实训过程识别 · 操作步骤评测 · 证据闭环追溯</p>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (signingIn) return;
            if (!captchaInput.trim()) {
              setError("请输入验证码。");
              captchaField.current.focus();
              return;
            }
            if (!matchesLoginCaptcha(captchaInput, captcha)) {
              setError("验证码错误，请重新输入。");
              refreshCaptcha();
              captchaField.current.focus();
              return;
            }
            setSigningIn(true);
            try {
              const result = await store.login(account, password);
              try {
                saveRememberedLogin(window.localStorage, {
                  account:
                    result.role === "teacher" &&
                    result.credentialId !== "legacy-demo"
                      ? result.account
                      : account.trim().toLowerCase(),
                  password,
                  accountOnly:
                    result.role === "teacher" &&
                    (result.credentialId !== "legacy-demo" ||
                      account.trim().toLowerCase() !== "wanglaoshi"),
                  remember: rememberPassword && !result.mustChange,
                });
              } catch {
                /* Optional remembered login never blocks a valid session. */
              }
              nav(
                result.role === "admin"
                  ? "/admin/overview"
                  : result.mustChange
                    ? "/account/password"
                    : "/teacher/dashboard",
                { replace: true },
              );
            } catch (failure) {
              setError(failure.message || "登录失败，请重试。");
              refreshCaptcha();
            } finally {
              setSigningIn(false);
            }
          }}
        >
          <h2>欢迎登录</h2>
          {location.state?.message && (
            <p className="login-account-note" role="status">
              {location.state.message}
            </p>
          )}
          <label>
            账号
            <input
              name="username"
              autoComplete="username"
              value={account}
              onChange={(event) => {
                setAccount(event.target.value);
                setError("");
              }}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          <label htmlFor="login-captcha">验证码</label>
          <div className="login-captcha-row">
            <input
              id="login-captcha"
              ref={captchaField}
              value={captchaInput}
              maxLength={4}
              autoComplete="off"
              spellCheck={false}
              placeholder="请输入验证码"
              aria-describedby={error ? "login-error" : undefined}
              onChange={(event) => {
                setCaptchaInput(event.target.value);
                setError("");
              }}
            />
            <button
              type="button"
              className="login-captcha-image"
              aria-label="刷新验证码"
              title="点击刷新验证码"
              onClick={() => {
                refreshCaptcha();
                setError("");
              }}
            >
              <canvas
                ref={captchaCanvas}
                width="264"
                height="84"
                role="img"
                aria-label="四位图形验证码"
              />
            </button>
          </div>
          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberPassword}
              onChange={(event) => {
                setRememberPassword(event.target.checked);
                if (!event.target.checked) {
                  try {
                    saveRememberedLogin(window.localStorage, {
                      remember: false,
                    });
                  } catch {
                    /* Keep the checkbox usable when storage is unavailable. */
                  }
                }
              }}
            />
            <span>{rememberAccountOnly ? "记住账号" : "记住密码"}</span>
          </label>
          {error && (
            <p className="form-error" id="login-error" role="alert">
              <ExclamationCircleFilled /> {displayBusinessText(error)}
            </p>
          )}
          <Button htmlType="submit" type="primary" disabled={signingIn}>
            {signingIn ? "正在登录…" : "登录系统"}
          </Button>
          <p className="login-account-note">
            忘记教师密码？请联系管理员在教师管理中重置密码。
          </p>
          <div className="login-secondary-links">
            <button
              type="button"
              className="login-entry-link"
              onClick={() => nav("/student/login")}
            >
              学生登录
            </button>
            <a
              className="login-entry-link"
              href="/data-screen?scope=school"
              target="_blank"
              rel="noopener noreferrer"
            >
              数据大屏
            </a>
          </div>
        </form>
      </section>
      <footer className="login-footer">
        <p className="login-visual">
          <SafetyCertificateOutlined />
          <span>
            每一次评价都有依据，用AI、标准、过程与证据，帮助教师更轻松地管理实训现场。
          </span>
        </p>
        <small className="login-company-name">
          兴辰智能（北京）科技有限公司
        </small>
      </footer>
    </div>
  );
}

function StudentShell({ children }) {
  const nav = useNavigate();
  const location = useLocation();
  const store = usePrototypeData();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const resolved = resolveStudentIdentity(store.data.students);
  const leaveStudent = (path) => {
    setRoleMenuOpen(false);
    clearStudentIdentitySession();
    nav(path);
  };
  return (
    <div className="student-app">
      <header className="student-topbar">
        <button
          className="student-brand"
          onClick={() =>
            nav(
              location.pathname === "/student/login" || !resolved
                ? "/student/login"
                : "/student/current",
            )
          }
          aria-label="返回学生端首页"
        >
          <span>
            <strong>AI视觉实训操作流程智能评测系统</strong>
            <small>学生端</small>
          </span>
        </button>
        <div className="student-topbar__actions">
          {resolved && location.pathname !== "/student/login" && (
            <span className="student-welcome">
              {resolved.student.name} · {resolved.student.no}
            </span>
          )}
          {resolved && location.pathname !== "/student/login" && (
            <Button
              onClick={() => {
                clearStudentIdentitySession();
                nav("/student/login");
              }}
            >
              退出学生端
            </Button>
          )}
          <div className="role-menu-wrap">
            <button
              className="student-role-switch"
              aria-haspopup="menu"
              aria-expanded={roleMenuOpen}
              onClick={() => setRoleMenuOpen((open) => !open)}
            >
              <UserOutlined /> 切换身份 <span aria-hidden="true">⌄</span>
            </button>
            {roleMenuOpen && (
              <div className="role-popover student-role-popover" role="menu">
                <span className="eyebrow">原型演示身份</span>
                <strong>
                  {resolved ? `${resolved.student.name} · 学生` : "学生端"}
                </strong>
                <p>切换到教师或管理员工作台，不会改变正在运行的实训会话。</p>
                <Button onClick={() => leaveStudent("/teacher/dashboard")}>
                  教师端
                </Button>
                <Button onClick={() => leaveStudent("/admin/overview")}>
                  管理员端
                </Button>
                <Button disabled>学生端 · 当前</Button>
                {resolved && (
                  <Button
                    onClick={() => {
                      clearStudentIdentitySession();
                      leaveStudent("/student/login");
                    }}
                  >
                    退出学生端
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main
        className={`student-content ${
          location.pathname.startsWith("/student/session/")
            ? "student-content--session"
            : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}

function cameraFailureMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError")
    return "摄像头权限未开启";
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError")
    return "未检测到可用摄像头";
  if (error?.name === "NotReadableError") return "摄像头正被其他应用占用";
  return "当前摄像头不可用";
}

function StudentLoginPage() {
  const nav = useNavigate();
  const store = usePrototypeData();
  const validDefault = store.data.students.find(
    (student) => !getStudentIdentityError(student),
  );
  const [studentId, setStudentId] = useState(
    validDefault?.id || store.data.students[0]?.id || "",
  );
  const [cameraStatus, setCameraStatus] = useState("initializing");
  const [cameraMessage, setCameraMessage] = useState("正在连接摄像头…");
  const [recognitionStatus, setRecognitionStatus] = useState("idle");
  const [recognitionError, setRecognitionError] = useState("");
  const [recognizedStudent, setRecognizedStudent] = useState(null);
  const [currentTaskCount, setCurrentTaskCount] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (cancelled || streamRef.current) return;
      setCameraStatus("simulated");
      setCameraMessage("摄像头暂未响应，已切换为原型模拟识别模式");
    }, 4000);
    setCameraStatus("initializing");
    requestStudentCamera(navigator.mediaDevices)
      .then((stream) => {
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }
        streamRef.current = stream;
        window.clearTimeout(fallbackTimer);
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraStatus("ready");
        setCameraMessage("摄像头已就绪，请正对画面");
      })
      .catch((error) => {
        if (cancelled) return;
        window.clearTimeout(fallbackTimer);
        console.warn("学生登录摄像头不可用，已进入模拟模式：", error);
        setCameraStatus("simulated");
        setCameraMessage(
          `${cameraFailureMessage(error)}，已切换为原型模拟识别模式`,
        );
      });
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(recognitionTimerRef.current);
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const selectedStudent = store.data.students.find(
    (student) => student.id === studentId,
  );
  const selectedClass = store.data.classes.find(
    (item) => item.id === recognizedStudent?.classId,
  );
  const startRecognition = () => {
    clearStudentIdentitySession();
    setRecognitionStatus("recognizing");
    setRecognitionError("");
    setRecognizedStudent(null);
    recognitionTimerRef.current = window.setTimeout(() => {
      const student = store.data.students.find((item) => item.id === studentId);
      const error = getStudentIdentityError(student);
      if (error) {
        setRecognitionStatus("failed");
        setRecognitionError(error);
        return;
      }
      const identitySession = createStudentIdentitySession(student.id);
      writeStudentIdentitySession(identitySession);
      setRecognizedStudent(student);
      setCurrentTaskCount(store.getStudentCurrentSessions(student.id).length);
      setRecognitionStatus("success");
    }, 1000);
  };

  return (
    <div className="student-login-page">
      <section className="student-login-intro">
        <span className="eyebrow">身份确认</span>
        <h1>学生刷脸登录</h1>
        <p>
          请正对摄像头，保持面部无遮挡。识别通过后可进入当前实训任务或查看本人最近结果。
        </p>
        <div className="student-camera" data-status={cameraStatus}>
          <video ref={videoRef} autoPlay muted playsInline />
          {cameraStatus !== "ready" && (
            <div className="student-camera__fallback">
              <span>
                <UserOutlined />
              </span>
              <strong>
                {cameraStatus === "initializing"
                  ? "正在连接摄像头"
                  : "模拟摄像头画面"}
              </strong>
              <small>请将面部保持在识别区域内</small>
            </div>
          )}
          <div className="student-camera__frame" aria-hidden="true" />
          <span
            className={`student-camera__state student-camera__state--${cameraStatus}`}
          >
            <i />{" "}
            {cameraStatus === "ready"
              ? "摄像头可用"
              : cameraStatus === "initializing"
                ? "初始化中"
                : "模拟模式"}
          </span>
        </div>
        <p
          className={`student-camera-message ${cameraStatus === "simulated" ? "is-warning" : ""}`}
        >
          {cameraMessage}
        </p>
      </section>

      <aside className="student-login-card">
        <div>
          <span className="eyebrow">当前操作</span>
          <h2>
            {recognitionStatus === "success"
              ? "身份确认成功"
              : "请完成人脸识别"}
          </h2>
          <p>
            {recognitionStatus === "recognizing"
              ? "正在识别人脸，请保持正视摄像头…"
              : "识别过程约需 1 秒，请勿遮挡面部。"}
          </p>
        </div>

        {recognitionStatus === "success" && recognizedStudent ? (
          <section className="student-recognition-result student-recognition-result--success">
            <CheckCircleFilled />
            <div>
              <small>识别成功</small>
              <strong>{recognizedStudent.name}</strong>
              <span>学号：{recognizedStudent.no}</span>
              <span>{selectedClass?.name || "暂未归班"}</span>
              <p>
                {currentTaskCount
                  ? `当前有 ${currentTaskCount} 个可进入任务`
                  : "当前暂无可进入任务"}
              </p>
            </div>
          </section>
        ) : recognitionStatus === "failed" ? (
          <section
            className="student-recognition-result student-recognition-result--failed"
            role="alert"
          >
            <ExclamationCircleFilled />
            <div>
              <small>身份确认未通过</small>
              <strong>{selectedStudent?.name || "未识别学生"}</strong>
              <p>{recognitionError}</p>
            </div>
          </section>
        ) : (
          <div
            className={`student-recognition-progress ${recognitionStatus === "recognizing" ? "is-active" : ""}`}
          >
            <span>
              <CameraOutlined />
            </span>
            <strong>
              {recognitionStatus === "recognizing"
                ? "正在识别人脸…"
                : "等待开始识别"}
            </strong>
          </div>
        )}

        {recognitionStatus === "success" ? (
          <Button type="primary" onClick={() => nav("/student/current")}>
            查看任务与结果
          </Button>
        ) : (
          <Button
            type="primary"
            disabled={!studentId || recognitionStatus === "recognizing"}
            onClick={startRecognition}
          >
            {recognitionStatus === "recognizing"
              ? "正在识别…"
              : recognitionStatus === "failed"
                ? "重新识别"
                : "开始人脸识别"}
          </Button>
        )}

        <details className="student-demo-settings">
          <summary>原型演示设置</summary>
          <label>
            模拟识别对象
            <select
              value={studentId}
              disabled={recognitionStatus === "recognizing"}
              onChange={(event) => {
                clearStudentIdentitySession();
                setStudentId(event.target.value);
                setRecognitionStatus("idle");
                setRecognitionError("");
                setRecognizedStudent(null);
              }}
            >
              {store.data.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.no} · {student.status} ·{" "}
                  {getStudentFaceStatus(student)}
                </option>
              ))}
            </select>
          </label>
          <small>仅用于原型演示，不代表正式人脸登录方式。</small>
        </details>
      </aside>
    </div>
  );
}

function StudentCurrentPage() {
  const nav = useNavigate();
  const store = usePrototypeData();
  const [refreshedAt, setRefreshedAt] = useState("");
  const resolved = resolveStudentIdentity(store.data.students);
  if (!resolved) return <Navigate to="/student/login" replace />;
  const sessions = store.getStudentCurrentSessions(resolved.student.id);
  const recentResults = studentRecentResults(store.data, resolved.student.id);
  const studentClass = store.data.classes.find(
    (item) => item.id === resolved.student.classId,
  );
  const cards = sessions
    .map((task) => getStudentTaskDetails(store.data, task))
    .filter(Boolean);
  const formatSchedule = (value) =>
    value
      ? displayBusinessText(String(value)).replace("T", " ")
      : "以教师现场安排为准";
  return (
    <section className="student-current-page">
      <header className="student-current-heading">
        <div>
          <span className="eyebrow">当前任务</span>
          <h1>{resolved.student.name}</h1>
          <p>
            {studentClass?.name || "班级信息待补充"} · 学号：
            {resolved.student.no}
          </p>
        </div>
        <Button
          onClick={() =>
            setRefreshedAt(
              new Intl.DateTimeFormat("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).format(new Date()),
            )
          }
        >
          <ReloadOutlined /> 刷新当前任务
        </Button>
      </header>

      {cards.length > 1 && (
        <p className="student-current-notice">
          <AlertOutlined /> 当前存在多个可进入任务，请按教师现场安排选择。
        </p>
      )}

      {cards.length ? (
        <div className="student-task-grid">
          {cards.map(({ arrangement, session, workstation, sop, teacher }) => (
            <article className="student-task-card" key={session.id}>
              <header>
                <Status
                  tone={arrangement.type === "exam" ? "warning" : "success"}
                >
                  {arrangement.type === "exam" ? "考试" : "练习"}
                </Status>
                <Status>{session.status}</Status>
              </header>
              <h2>{arrangement.name}</h2>
              <dl>
                <div>
                  <dt>教师</dt>
                  <dd>{teacher?.name || "教师信息待补充"}</dd>
                </div>
                {arrangement.type === "exam" ? (
                  <>
                    <div>
                      <dt>允许入场</dt>
                      <dd>
                        {formatExamEntryWindow(
                          arrangement.scheduleStart,
                          arrangement.entryEnd,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>考试时长</dt>
                      <dd>
                        {normalizeExamDuration(arrangement.examDurationMinutes)}{" "}
                        分钟
                      </dd>
                    </div>
                    <div>
                      <dt>入场状态</dt>
                      <dd>
                        {["进行中", "已暂停"].includes(session.status)
                          ? session.status
                          : examEntryStatus(
                              arrangement.scheduleStart,
                              arrangement.entryEnd,
                            )}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>计划时间</dt>
                    <dd>{formatSchedule(arrangement.scheduleStart)}</dd>
                  </div>
                )}
                <div>
                  <dt>实训标准</dt>
                  <dd>{sop?.name || "当前标准暂不可用"}</dd>
                </div>
                <div>
                  <dt>工位</dt>
                  <dd>{workstation?.name || "工位信息不可用"}</dd>
                </div>
              </dl>
              <Button
                type="primary"
                disabled={!workstation}
                onClick={() =>
                  nav(
                    `/student/session/${arrangement.id}/${session.workstationId}?sessionId=${session.id}`,
                  )
                }
              >
                {studentTaskActionLabel(arrangement.type, session.status)}
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <section className="student-current-empty">
          <span>
            <CheckCircleOutlined />
          </span>
          <h2>当前暂无可进入的练习或考试</h2>
          <p>请等待教师安排并开放工位。</p>
          <Button onClick={() => setRefreshedAt(new Date().toISOString())}>
            <ReloadOutlined /> 刷新当前任务
          </Button>
        </section>
      )}
      <StudentEvidenceTaskList studentId={resolved.student.id} />
      <StudentSupportTaskList studentId={resolved.student.id} />
      <section className="student-recent-results">
        <h2>最近完成</h2>
        {!recentResults.length && <p>暂无已完成记录。</p>}
        <div className="student-task-grid">
          {recentResults.map((result) => (
            <article className="student-task-card" key={result.sessionId}>
              <h2>{result.title}</h2>
              <p>{result.status}</p>
              <p>{displayBusinessText(result.endedAt || "结束时间未记录")}</p>
              {result.visible && (
                <p>
                  {result.score == null
                    ? "成绩待核对"
                    : `有效得分 ${result.score} 分`}{" "}
                </p>
              )}
              <Button
                type="primary"
                onClick={() =>
                  nav(
                    `/student/results/${result.arrangementId}/${result.sessionId}`,
                  )
                }
              >
                {result.visible ? "查看本人结果" : "查看提交状态"}
              </Button>
            </article>
          ))}
        </div>
      </section>
      {refreshedAt && (
        <small className="student-current-refreshed">
          已刷新 · {displayBusinessText(refreshedAt)}
        </small>
      )}
    </section>
  );
}

function StudentResultPage() {
  const nav = useNavigate();
  const { id, sessionId } = useParams();
  const store = usePrototypeData();
  const identity = resolveStudentIdentity(store.data.students);
  const [resultClock, setResultClock] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setResultClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  if (!identity) return <Navigate to="/student/login" replace />;
  const result = studentResult(store.data, identity.student.id, id, sessionId, resultClock);
  return (
    <section className="student-current-page student-result-page">
      <Button onClick={() => nav("/student/current")}>返回任务与结果</Button>
      {!result ? (
        <>
          <h1>结果暂不可查看</h1>
          <p>记录不存在、尚未完成或不属于当前登录学生。</p>
        </>
      ) : (
        <>
          <h1>{result.title}</h1>
          <p>{result.status}</p>
          <p>{displayBusinessText(result.endedAt || "结束时间未记录")}</p>
          {!result.visible ? (
            <p>
              {result.status === "未参加"
                ? "本次未参加，没有正式成绩。"
                : "本次提交已保存，请等待教师统一发布成绩。"}
            </p>
          ) : (
            <StudentResultReview key={result.sessionId} result={result} />
          )}
          <StudentEvidenceTaskList
            studentId={identity.student.id}
            arrangementId={id}
            sessionId={sessionId}
          />
          <StudentSupportTaskList
            studentId={identity.student.id}
            arrangementId={id}
            sessionId={sessionId}
          />
          {result.helpHistory.length > 0 && (
            <section className="student-result-steps">
              <h2>教师帮助记录</h2>
              {result.helpHistory.map((r) => (
                <article key={r.id}>
                  <h3>
                    {HELP_LABELS[r.status]} · {r.reasonLabel}
                  </h3>
                  <p>{displayBusinessText(r.createdAt)}</p>
                  {r.receipt && <p>教师回执：{r.receipt}</p>}
                  {r.closeReason && <p>{r.closeReason}</p>}
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}

function Dashboard() {
  const nav = useNavigate();
  const store = usePrototypeData();
  const { data } = store;
  const [schedulePage, setSchedulePage] = useState(0);
  const [todoPage, setTodoPage] = useState(0);
  const activeArrangements = data.arrangements.filter(
    (item) =>
      item.teacherId === store.teacherId &&
      !item.archivedRecord &&
      item.status !== "已取消",
  );
  const displayedTodayArrangements =
    teacherPrototypeSchedule(activeArrangements);
  const schedulePageSize = 3;
  const schedulePageCount = Math.max(
    1,
    Math.ceil(displayedTodayArrangements.length / schedulePageSize),
  );
  const safeSchedulePage = Math.min(schedulePage, schedulePageCount - 1);
  const visibleTodayArrangements = displayedTodayArrangements.slice(
    safeSchedulePage * schedulePageSize,
    (safeSchedulePage + 1) * schedulePageSize,
  );
  const runningArrangements = activeArrangements.filter((item) =>
    ["进行中", "已暂停"].includes(item.status),
  );
  const displayedTeacherTodos = teacherDashboardTasks(data, store.teacherId);
  const pendingCount = displayedTeacherTodos.length;
  const pendingPublishTasks = displayedTeacherTodos.filter(
    (item) => item.type === "publish",
  );
  const pendingPublishExams = pendingPublishTasks.map((task) =>
    data.arrangements.find((a) => a.id === task.sourceIds.arrangementId),
  );
  const pendingPublishScoreCount = pendingPublishExams.reduce(
    (total, a) =>
      total +
      (a.sessions || []).filter((s) => s.resultStatus === "正式成绩").length,
    0,
  );
  const taskCounts = (type) =>
    displayedTeacherTodos.filter((item) => item.type === type).length;
  const todoPageSize = 3;
  const todoPageCount = Math.max(
    1,
    Math.ceil(displayedTeacherTodos.length / todoPageSize),
  );
  const safeTodoPage = Math.min(todoPage, todoPageCount - 1);
  const visibleTeacherTodos = displayedTeacherTodos.slice(
    safeTodoPage * todoPageSize,
    (safeTodoPage + 1) * todoPageSize,
  );
  const openArrangement = (item) =>
    nav(
      `/teacher/${item.type === "exam" ? "exams" : "practices"}/${item.id}/${arrangementDestination(item)}`,
    );
  const taskIcon = (type) =>
    type === "safety" ? (
      <SafetyCertificateOutlined />
    ) : type === "help" ? (
      <BellOutlined />
    ) : type === "step" ? (
      <CheckCircleOutlined />
    ) : ["evidence", "publish"].includes(type) ? (
      <FileDoneOutlined />
    ) : (
      <AlertOutlined />
    );
  return (
    <>
      <PageHeader
        title="教师工作台"
        actions={
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => nav("/teacher/practices/new")}
            >
              创建练习
            </Button>
            <Button onClick={() => nav("/teacher/exams/new")}>创建考试</Button>
            <Button onClick={() => nav("/teacher/sop/new")}>
              新建实训标准
            </Button>
          </>
        }
      />
      <div className="metric-grid">
        <Metric
          label="今日安排"
          value={displayedTodayArrangements.length}
          hint={`练习 ${displayedTodayArrangements.filter((item) => item.type === "practice").length} · 考试 ${displayedTodayArrangements.filter((item) => item.type === "exam").length}`}
          icon={<EditOutlined />}
          tone="blue"
        />
        <Metric
          label="正在进行"
          value={runningArrangements.length}
          hint={`练习 ${runningArrangements.filter((item) => item.type === "practice").length} · 考试 ${runningArrangements.filter((item) => item.type === "exam").length}`}
          icon={<PlayCircleFilled />}
          tone="green"
        />
        <Metric
          label="待处理"
          value={pendingCount}
          hint={`业务待办 ${pendingCount - taskCounts("safety") - taskCounts("technical")} · 安全/技术状态 ${taskCounts("safety") + taskCounts("technical")}`}
          icon={<AlertOutlined />}
          tone="amber"
        />
        <Metric
          label="待发布考试"
          value={pendingPublishExams.length}
          hint={
            pendingPublishExams.length
              ? `${pendingPublishScoreCount} 份成绩待确认`
              : "当前无待发布考试"
          }
          icon={<FileDoneOutlined />}
          tone="purple"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel panel--stretch">
          <PanelTitle
            title="今日安排"
            action={
              <DashboardCardPager
                page={safeSchedulePage}
                totalPages={schedulePageCount}
                onChange={setSchedulePage}
              />
            }
          />
          <div className="schedule-list">
            {visibleTodayArrangements.map((item) => {
              const sop = data.sops.find((entry) => entry.id === item.sopId);
              const scheduleContent = (
                <>
                  <span className="schedule-time">
                    {item.scheduleStart
                      ? displayBusinessText(item.scheduleStart).slice(11, 19)
                      : "待定"}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.type === "exam" ? "考试" : "练习"} ·{" "}
                      {item.sopName || sop?.name || "实训标准已失效"} ·{" "}
                      {item.studentCount ?? (item.studentIds || []).length} 人
                    </small>
                  </span>
                  <Status>{item.status}</Status>
                  <span className="schedule-list__action">进入 →</span>
                </>
              );

              return (
                <button key={item.id} onClick={() => openArrangement(item)}>
                  {scheduleContent}
                </button>
              );
            })}
            {!visibleTodayArrangements.length && (
              <p className="hint">今日暂无安排，可创建练习或考试。</p>
            )}
          </div>
        </section>
        <section className="panel teacher-todo-card">
          <PanelTitle
            title="待办事项"
            action={
              <DashboardCardPager
                page={safeTodoPage}
                totalPages={todoPageCount}
                onChange={setTodoPage}
              />
            }
          />
          <div className="todo-list">
            {visibleTeacherTodos.map((item) => (
              <button key={item.id} onClick={() => nav(item.path)}>
                {taskIcon(item.type)}
                <span>
                  <strong>{displayBusinessText(item.title)}</strong>
                  <small>{displayBusinessText(item.detail)}</small>
                </span>
                <b>{item.actionLabel}</b>
              </button>
            ))}
            {!displayedTeacherTodos.length && (
              <p className="hint">当前没有需要立即处理的事项。</p>
            )}
          </div>
        </section>
      </div>
      <DashboardPerformanceSection />
    </>
  );
}

function MonitorPage({ exam = false, setModal }) {
  const nav = useNavigate();
  const { id } = useParams();
  const store = usePrototypeData();
  const [view, setView] = useState("grid");
  const [stationFilter, setStationFilter] = useState({
    arrangementId: id,
    key: "all",
  });
  useEffect(() => {
    setStationFilter({ arrangementId: id, key: "all" });
  }, [id]);
  const arrangement = store.data.arrangements.find((item) => item.id === id);
  const workstationLabel = (workstationId) => {
    const item = store.data.workstations.find(
      (station) => station.id === workstationId,
    );
    return compactWorkstationLabel(item);
  };
  const sop = store.data.sops.find((item) => item.id === arrangement?.sopId);
  const base = exam ? "exams" : "practices";
  const endRef = useRef(null);
  if (!arrangement)
    return (
      <MissingState title="安排不存在或已失效" backTo={`/teacher/${base}`} />
    );
  const sessions = arrangement.sessions || [];
  const monitorFilter = monitorStationFilter(
    arrangement,
    stationFilter.arrangementId === id ? stationFilter.key : "all",
  );
  const selectStationFilter = (key) =>
    setStationFilter({
      arrangementId: id,
      key: key === monitorFilter.selected.key ? "all" : key,
    });
  const completedSteps = sessions.reduce(
    (total, session) =>
      total +
      (session.steps || []).filter((step) => step.state === "pass").length,
    0,
  );
  const allSteps = sessions.reduce(
    (total, session) => total + (session.steps || []).length,
    0,
  );
  const progress = allSteps ? Math.round((completedSteps / allSteps) * 100) : 0;
  const events = sessions
    .flatMap((session) =>
      teacherSessionEvents(session).map((event) => ({
        ...event,
        workstationId: session.workstationId,
        sessionId: session.id,
        studentId: session.studentId,
      })),
    )
    .sort((a, b) =>
      teacherEventSortTime(b).localeCompare(teacherEventSortTime(a)),
    );
  const pause = () => {
    const shouldPause = arrangement.status === "进行中";
    setModal({
      title: shouldPause ? `暂停本次${exam ? "考试" : "练习"}` : "恢复本次安排",
      className: exam
        ? "teacher-exam-pause-modal"
        : "teacher-practice-pause-modal",
      content: (
        <p>
          {shouldPause
            ? "暂停后，所有进行中会话同时停止计时和自动判定；视频继续留存。"
            : "恢复后，原先暂停的学生会话重新开始计时与判定。"}
        </p>
      ),
      confirmText: shouldPause ? "确认暂停" : "确认恢复",
      onConfirm: () => {
        store.setArrangementPaused(arrangement.id, shouldPause);
        return `${arrangement.name} 已${shouldPause ? "暂停" : "恢复"}`;
      },
    });
  };
  const finish = () =>
    setModal({
      title: `结束本次${exam ? "考试" : "练习"}`,
      className: exam ? "teacher-exam-end-modal" : "teacher-practice-end-modal",
      size: "large",
      content: <EndArrangementForm ref={endRef} arrangement={arrangement} />,
      confirmText: "确认结束并生成结果",
      onConfirm: () => {
        const updated = store.endArrangement(
          arrangement.id,
          endRef.current.getValue(),
        );
        window.setTimeout(
          () => nav(`/teacher/${base}/${updated.id}/results`),
          0,
        );
        return `${arrangement.name} 已结束，正常工位占用已自动释放`;
      },
    });
  const aiEnabledCount = sessions.filter(
    (item) =>
      item.evaluationProfile?.aiRuntimeEnabled ??
      item.evaluationProfile?.automaticEvaluationEnabled,
  ).length;
  const canControlArrangement = ["进行中", "已暂停"].includes(
    arrangement.status,
  );
  return (
    <>
      <PageHeader
        title={arrangement.name}
        subtitle={
          <span>
            <Status>{arrangement.status}</Status>　开始时间{" "}
            {displayBusinessText(arrangement.startedAt || "尚未开始")} ·
            本次标准快照{" "}
            {arrangement.snapshot?.sopSnapshot?.name || sop?.name || "未锁定"}
            {" · "}AI评价可用工位 {aiEnabledCount}/{sessions.length}
          </span>
        }
        actions={
          <>
            <ArrangementAttendanceEntry arrangement={arrangement} />
            {canControlArrangement &&
              arrangement.openWorkstationIds.length <
                arrangement.workstationIds.length && (
                <Button
                  onClick={() => nav(`/teacher/${base}/${arrangement.id}/prep`)}
                >
                  开放更多工位
                </Button>
              )}
            {canControlArrangement ? (
              <>
                <Button
                  onClick={pause}
                  icon={
                    arrangement.status === "已暂停" ? (
                      <PlayCircleFilled />
                    ) : (
                      <PauseCircleFilled />
                    )
                  }
                >
                  {arrangement.status === "已暂停"
                    ? "恢复安排"
                    : `暂停${exam ? "考试" : "练习"}`}
                </Button>
                <Button type="primary" onClick={finish}>
                  结束本次{exam ? "考试" : "练习"}
                </Button>
              </>
            ) : (
              <Button
                type="primary"
                onClick={() =>
                  nav(`/teacher/${base}/${arrangement.id}/results`)
                }
              >
                查看{exam ? "考试" : "练习"}结果
              </Button>
            )}
          </>
        }
      />
      {exam && (
        <div className="mode-notice">
          <LockOutlined />
          <div>
            <strong>考试模式</strong>
            <span>
              学生端隐藏普通错误和漏项提示；教师端仍可查看实时评分与安全告警。
            </span>
          </div>
        </div>
      )}
      <div className="monitor-summary">
        <div
          className="monitor-summary__statuses"
          role="group"
          aria-label="按工位状态筛选"
        >
          {monitorFilter.filters.map(({ key, count, label, tone }) => (
            <button
              type="button"
              className={`summary summary--${tone}${monitorFilter.selected.key === key ? " is-active" : ""}`}
              key={key}
              aria-pressed={monitorFilter.selected.key === key}
              aria-controls="monitor-station-grid"
              aria-label={`${label} ${count} 个工位`}
              onClick={() => selectStationFilter(key)}
            >
              <DesktopOutlined />
              <strong>{count}</strong>
              <small>{label}</small>
            </button>
          ))}
        </div>
        <div className="overall-progress">
          <span>
            整体实训进度 <strong>{progress}%</strong>
          </span>
          <div>
            <i style={{ width: `${progress}%` }} />
          </div>
          <small>{`${completedSteps}/${allSteps || 0} 已通过`}</small>
        </div>
      </div>
      <div
        className={`monitor-layout ${view === "list" ? "monitor-layout--list" : ""}`}
      >
        <section className="station-area">
          <div className="section-toolbar">
            <h2>工位会话状态</h2>
            <div className="segmented segmented--small monitor-view-switch">
              <button
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                <AppstoreOutlined /> 卡片模式
              </button>
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                <FileTextOutlined /> 列表模式
              </button>
            </div>
          </div>
          <div
            className="station-grid"
            id="monitor-station-grid"
            aria-label={`${monitorFilter.selected.label}列表`}
          >
            {monitorFilter.rows.map(({ workstationId, session }) => {
              const index = arrangement.workstationIds.indexOf(workstationId);
              const workstation = store.data.workstations.find(
                (item) => item.id === workstationId,
              );
              const student = store.data.students.find(
                (item) => item.id === session?.studentId,
              );
              const currentStep = (session?.steps || []).find(
                (step) => step.id === session.currentStepId,
              );
              const status = session?.status || "未开放";
              const identity = teacherIdentityView(session || { status });
              const tone =
                status === "故障"
                  ? "danger"
                  : status === "已暂停" || status === "待复位"
                    ? "warning"
                    : status === "进行中"
                      ? "success"
                      : "muted";
              const sessionProgress = session
                ? Math.round(
                    ((session.steps || []).filter(
                      (step) => step.state === "pass",
                    ).length /
                      Math.max(1, (session.steps || []).length)) *
                      100,
                  )
                : 0;
              return (
                <button
                  className={`station-card station-card--${tone}`}
                  onClick={() =>
                    session &&
                    nav(
                      `/teacher/${base}/${arrangement.id}/stations/${workstationId}`,
                    )
                  }
                  key={workstationId}
                  disabled={!session}
                  aria-label={`${workstationLabel(workstationId)} · ${student?.name || "未分配学生"}${status === "故障" ? " · 故障，自动评价已受控暂停，查看阻断原因" : ""}`}
                >
                  <header>
                    <strong title={workstationOptionLabel(workstation)}>
                      {workstationLabel(workstationId)}
                    </strong>
                    {status === "故障" ? (
                      <span
                        className={`station-card__fault-summary${view === "list" ? "" : " station-card__fault-summary--compact"}`}
                        title="自动评价已受控暂停，点击查看阻断原因"
                      >
                        <ExclamationCircleFilled />
                        <span>
                          {view === "list" ? "故障 · 评价暂停" : "故障"}
                        </span>
                        <span className="station-card__fault-link">
                          {view === "list" ? "查看阻断 →" : "→"}
                        </span>
                      </span>
                    ) : (
                      <Status tone={tone}>{status}</Status>
                    )}
                  </header>
                  {view === "list" ? (
                    <MonitorListCameras
                      workstation={workstation}
                      session={session}
                      devices={store.data.devices}
                      status={status}
                      index={index}
                    />
                  ) : (
                    <div className="station-card__visual">
                      <img
                        src={
                          index % 2
                            ? "/assets/workstation-female.png"
                            : "/assets/workstation-male.png"
                        }
                        alt={`${workstationLabel(workstationId)}会话画面`}
                      />
                      {status === "进行中" && (
                        <span className="live">
                          <i /> 运行中
                        </span>
                      )}
                      {status === "故障" && (
                        <span className="blocked-pill">已阻断</span>
                      )}
                    </div>
                  )}
                  <div className="station-card__body">
                    <div className="station-card__student">
                      <strong title={student?.name || "未分配学生"}>
                        {student?.name || "未分配学生"}
                      </strong>
                      <b>
                        {session &&
                        session.score != null &&
                        session.score !== ""
                          ? `${session.score}分`
                          : "—"}
                      </b>
                      <span
                        className="station-card__student-number"
                        title={student?.no}
                      >
                        {student
                          ? `学号 ${student.no || "未记录"}`
                          : "等待开放"}
                      </span>
                      <span className="station-card__elapsed" title="有效用时">
                        <ClockCircleOutlined />
                        {session?.elapsed || "--"}
                      </span>
                    </div>
                    <p>
                      <span title={currentStep?.name}>
                        现场：
                        {currentStep?.name ||
                          (status === "待开始" ? "等待学生入场" : "无动作判定")}
                      </span>
                    </p>
                    {session && (
                      <div
                        className={`station-identity station-identity--${identity.tone}`}
                        title={[identity.label, identity.detail]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        <UserOutlined />
                        <span>
                          <strong>{identity.label}</strong>
                        </span>
                      </div>
                    )}
                    <div className="progress">
                      <i style={{ width: `${sessionProgress}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
            {!monitorFilter.rows.length && (
              <div className="monitor-station-empty" role="status">
                <p>
                  暂无
                  {monitorFilter.selected.key === "all"
                    ? "开放"
                    : monitorFilter.selected.label}
                  工位
                </p>
                {monitorFilter.selected.key !== "all" && (
                  <Button onClick={() => selectStationFilter("all")}>
                    查看全部工位
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
        <aside className="event-panel">
          <PanelTitle
            title="异常与关键事件"
            action={<Status>{events.length} 条</Status>}
          />
          <div className="timeline">
            {events.map((event, index) => (
              <button
                className={`event event--${event.teacherTone || event.level || "info"}`}
                key={event.id || `${event.displayTime}-${index}`}
                onClick={() =>
                  nav(
                    `/teacher/${base}/${arrangement.id}/stations/${event.workstationId}?sessionId=${event.sessionId}${event.requestId ? `#help-${event.requestId}` : ""}`,
                  )
                }
              >
                <i />
                <time>{event.displayTime}</time>
                <span>
                  <em
                    className={`event-category event-category--${event.category}`}
                  >
                    {event.categoryLabel}
                  </em>
                  <strong
                    title={
                      store.data.workstations.find(
                        (item) => item.id === event.workstationId,
                      )?.name
                    }
                  >
                    {workstationLabel(event.workstationId)} ·{" "}
                    {displayBusinessText(event.title)}
                  </strong>
                  <small>
                    {event.stepName ? `${event.stepName} · ` : ""}
                    {event.reasonLabel ? `原因：${event.reasonLabel} · ` : ""}
                    {displayBusinessText(event.detail)}
                  </small>
                </span>
              </button>
            ))}
            {!events.length && <p className="hint">暂无关键事件</p>}
          </div>
        </aside>
      </div>
    </>
  );
}

const StudentHelpForm = forwardRef(function StudentHelpForm(_, ref) {
  const [reasonCode, setReasonCode] = useState("operation_help");
  const [note, setNote] = useState("");
  useImperativeHandle(ref, () => ({
    getValue: () => buildStudentHelpPayload(reasonCode, note),
  }));
  return (
    <div className="student-help-form">
      <p>请选择本次需要教师到场的原因。</p>
      <div className="student-help-reasons">
        {STUDENT_HELP_REASONS.map((reason) => (
          <label key={reason.value}>
            <input
              type="radio"
              name="student-help-reason"
              value={reason.value}
              checked={reasonCode === reason.value}
              onChange={() => setReasonCode(reason.value)}
            />
            <span>{reason.label}</span>
          </label>
        ))}
      </div>
      {reasonCode === "other" && (
        <label className="field">
          其他求助内容
          <textarea
            autoFocus
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="请简要说明需要教师协助的内容"
          />
        </label>
      )}
    </div>
  );
});

const ExamIncidentHelpForm = forwardRef(function ExamIncidentHelpForm(_, ref) {
  const [reasonCode, setReasonCode] = useState("device_failure");
  const [note, setNote] = useState("");
  useImperativeHandle(ref, () => ({
    getValue: () => ({ reasonCode, note }),
  }));
  return (
    <div className="student-help-form exam-incident-help-form">
      <p>异常求助只用于现场处置，不会自动影响考试得分。</p>
      <div className="student-help-reasons">
        {EXAM_INCIDENT_REASONS.map((reason) => (
          <label key={reason.value}>
            <input
              type="radio"
              name="exam-incident-reason"
              value={reason.value}
              checked={reasonCode === reason.value}
              onChange={() => setReasonCode(reason.value)}
            />
            <span>{reason.label}</span>
          </label>
        ))}
      </div>
      <label className="field">
        <FieldLabel required={reasonCode === "other"}>
          {reasonCode === "other" ? "异常说明" : "补充说明"}
        </FieldLabel>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="请简要描述现场情况，便于教师快速处理"
        />
      </label>
    </div>
  );
});

export function StudentHintContent({ step, mediaStep = step }) {
  const [showMedia, setShowMedia] = useState(false);
  return (
    <div className="student-hint-content">
      <span className="eyebrow">{step?.id || "当前步骤"}</span>
      <h3>{step?.name || "当前步骤提示"}</h3>
      <article>
        <strong>操作说明</strong>
        <p>{step?.teachingInstruction || "当前步骤暂无操作说明。"}</p>
      </article>
      <article>
        <strong>操作要点</strong>
        <p>{step?.keyPoints || "当前步骤暂无补充要点。"}</p>
      </article>
      <article>
        <strong>常见错误</strong>
        <p>{step?.commonMistakes || "当前步骤暂无常见错误说明。"}</p>
      </article>
      <article className="is-safety">
        <strong>安全要求</strong>
        <p>{step?.redline || "请遵守现场通用安全规范。"}</p>
      </article>
      <Button onClick={() => setShowMedia((shown) => !shown)}>
        <PlayCircleFilled /> {showMedia ? "收起标准示教" : "查看标准示教"}
      </Button>
      {showMedia && (
        <div className="student-hint-media">
          <StandardMediaList step={mediaStep} />
        </div>
      )}
    </div>
  );
}

function StudentSessionPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { id, stationId } = useParams();
  const store = usePrototypeData();
  const resolved = resolveStudentIdentity(store.data.students);
  const access = getStudentSessionAccess(
    store.data,
    resolved?.student?.id,
    id,
    stationId,
    new URLSearchParams(location.search).get("sessionId") || "",
  );
  const verification = buildStudentIdentityVerification(
    resolved?.identitySession,
  );

  useEffect(() => {
    const hasValidVerification =
      access.session?.identityVerification?.status === "passed" &&
      access.session?.identityVerification?.studentId === resolved?.student?.id;
    if (
      access.allowed &&
      verification &&
      !hasValidVerification &&
      ["待开始", "可入场", "进行中", "已暂停"].includes(access.session?.status)
    ) {
      store.attachStudentIdentityVerification(
        id,
        stationId,
        verification,
        access.session.id,
      );
    }
  }, [
    access.allowed,
    access.session?.id,
    access.session?.identityVerification,
    id,
    stationId,
    verification?.studentId,
    verification?.verifiedAt,
    resolved?.student?.id,
  ]);

  if (!resolved) return <Navigate to="/student/login" replace />;
  if (!access.allowed)
    return (
      <section className="student-session-denied">
        <LockOutlined />
        <h1>无法进入当前任务</h1>
        <p>{access.reason}</p>
        <Button type="primary" onClick={() => nav("/student/current")}>
          返回当前任务
        </Button>
      </section>
    );
  if (["已完成", "待复位", "已复位"].includes(access.session.status))
    return (
      <Navigate to={`/student/results/${id}/${access.session.id}`} replace />
    );
  return <WorkstationPage studentMode resolvedSessionId={access.session.id} />;
}

function LegacyWorkstationRedirect() {
  const { id, stationId } = useParams();
  const store = usePrototypeData();
  const resolved = resolveStudentIdentity(store.data.students);
  return (
    <Navigate
      to={resolved ? `/student/session/${id}/${stationId}` : "/student/login"}
      replace
    />
  );
}

function WorkstationPage({ studentMode = false, resolvedSessionId = "" }) {
  const nav = useNavigate();
  const location = useLocation();
  const selectedSessionId =
    resolvedSessionId || new URLSearchParams(location.search).get("sessionId");
  const { id, stationId } = useParams();
  const store = usePrototypeData();
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [examNow, setExamNow] = useState(Date.now());
  const helpRef = useRef(null);
  const examIncidentRef = useRef(null);
  const autoSubmitRef = useRef("");
  const arrangement = store.data.arrangements.find((item) => item.id === id);
  const session = arrangement?.sessions.find(
    (item) =>
      item.workstationId === stationId &&
      (!selectedSessionId || item.id === selectedSessionId),
  );
  const workstation = store.data.workstations.find(
    (item) => item.id === stationId,
  );
  const student = store.data.students.find(
    (item) => item.id === session?.studentId,
  );
  const sop =
    session?.evaluationSnapshot?.sopSnapshot ||
    arrangement?.snapshot?.sopSnapshot ||
    store.data.sops.find((item) => item.id === arrangement?.sopId);
  useEffect(() => {
    if (arrangement?.type !== "exam" || session?.status !== "进行中") return;
    setExamNow(Date.now());
    const timer = window.setInterval(() => setExamNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [arrangement?.type, session?.id, session?.status]);

  useEffect(() => {
    if (
      arrangement?.type !== "exam" ||
      session?.status !== "进行中" ||
      !session.examTiming
    )
      return;
    if (examRemainingSeconds(session, examNow) > 0) return;
    if (autoSubmitRef.current === session.id) return;
    autoSubmitRef.current = session.id;
    try {
      store.finishWorkstationSession(arrangement.id, stationId, {
        sessionId: session.id,
        reason: "time_expired",
      });
    } catch (error) {
      autoSubmitRef.current = "";
      console.error("考试超时自动交卷失败：", error);
    }
  }, [arrangement?.id, arrangement?.type, examNow, session, stationId, store]);
  if (!arrangement || !session || !workstation || !student || !sop)
    return (
      <div className="workstation-page workstation-page--empty">
        <ProductOutlined />
        <h1>当前工位没有可进入的训练会话</h1>
        <p>请确认教师已经开放工位并分配学生。</p>
      </div>
    );

  const exam = arrangement.type === "exam";
  const published =
    arrangement.status === "已发布" || session.resultStatus === "已发布";
  const policy = workstationFeedbackPolicy(arrangement.type, published);
  const waiting = ["待开始", "可入场"].includes(session.status);
  const paused = session.status === "已暂停";
  const blocked = session.status === "故障";
  const completed =
    ["已完成", "待复位"].includes(session.status) ||
    (session.status !== "故障" &&
      ["已结束", "待发布", "已发布"].includes(arrangement.status));
  const currentIndex = Math.max(
    session.currentStepId ? 0 : Math.max(0, session.steps.length - 1),
    session.steps.findIndex((step) => step.id === session.currentStepId),
  );
  const currentStep = session.steps[currentIndex] || session.steps[0];
  const standardStep =
    sop.steps.find((step) => step.id === currentStep?.id) || currentStep;
  const completedSteps = session.steps.filter(
    (step) => step.state === "pass",
  ).length;
  const progress = session.steps.length
    ? Math.round((completedSteps / session.steps.length) * 100)
    : 0;
  const remainingSeconds = exam ? examRemainingSeconds(session, examNow) : 0;
  const countdownTone = examCountdownTone(remainingSeconds);
  const unfinishedCount = session.steps.filter((step) =>
    ["pending", "active"].includes(step.state),
  ).length;
  const evaluationProfile = session.evaluationProfile || {
    aiRuntimeEnabled: false,
    automaticEvaluationEnabled: false,
    enabledStepCount: 0,
    automaticStepCount: 0,
    aiParticipatingStepCount: 0,
    automaticEvaluationStepCount: 0,
    assistedEvaluationStepCount: 0,
    safetyMonitoringStepCount: 0,
    fallbackPolicy: "未启用步骤默认通过，教师发现问题后留痕扣分",
  };
  const aiRuntimeEnabled =
    evaluationProfile.aiRuntimeEnabled ??
    evaluationProfile.automaticEvaluationEnabled;
  const cameraState = resolveStudentPrimaryCamera(
    store.data,
    session,
    workstation,
  );
  const practiceFeedback = buildStudentPracticeFeedback({
    session,
    currentStep: standardStep,
    cameraState,
  });
  const safetyBlocked =
    standardStep?.state === "blocked" ||
    (session.runtime?.safetyCandidates || []).some(
      (item) => item.status === "pending",
    );
  const technicalPaused = (session.runtime?.technicalIncidents || []).some(
    (item) => item.status !== "resolved" && item.affectsContinuation,
  );
  const readiness = [
    {
      label: "身份确认",
      detail:
        session.identityVerification?.status === "passed"
          ? `${student.name}的身份已确认`
          : studentMode
            ? "正在写入本次身份确认"
            : "请确认本次学生身份",
      ready:
        session.identityVerification?.status === "passed" ||
        (studentMode && Boolean(student)),
      blocking: true,
    },
    {
      label: "摄像头画面",
      detail: cameraState.available
        ? `${cameraState.camera.name}在线，关键区域可见`
        : cameraState.reason,
      ready: cameraState.available,
      blocking: true,
    },
    {
      label: "评价服务",
      detail: aiRuntimeEnabled
        ? "AI辅助评价已就绪"
        : "AI辅助评价当前不可用，本次将按安全降级规则运行",
      ready: aiRuntimeEnabled,
      blocking: false,
    },
    {
      label: exam ? "考试资源" : "训练资源",
      detail: exam
        ? "试题流程和录像存储已就绪"
        : `${sop.steps.length} 个步骤的教学内容已加载`,
      ready: exam || sop.steps.every((step) => step.teachingInstruction),
      blocking: true,
    },
  ];
  const ready = readiness.every((item) => !item.blocking || item.ready);
  const finishModal = (message) => {
    setModal(null);
    setToast(message || "操作已完成");
    window.setTimeout(() => setToast(""), 2400);
  };
  const start = () =>
    setModal({
      eyebrow: exam ? "考试开始确认" : "训练开始确认",
      title: `开始${exam ? "考试" : "训练"}`,
      content: (
        <div className="workstation-confirm-copy">
          <p>
            将以 <strong>{student.name}</strong> 的身份在{workstation.name}
            开始，使用本次会话已锁定的实训标准。
          </p>
          <p>开始后刷新页面会自动恢复当前进度，不会重复创建记录。</p>
        </div>
      ),
      confirmText: `确认开始${exam ? "考试" : "训练"}`,
      onConfirm: () => {
        store.startWorkstationSession(
          arrangement.id,
          workstation.id,
          session.id,
        );
        return `${student.name} 的${exam ? "考试" : "训练"}已开始`;
      },
    });
  const requestHelp = () =>
    setModal({
      eyebrow: "请求教师到场",
      title: "需要老师帮助吗？",
      content: <StudentHelpForm ref={helpRef} />,
      confirmText: "发送请求",
      onConfirm: () => {
        store.requestTeacherHelp(arrangement.id, workstation.id, {
          ...helpRef.current?.getValue(),
          sessionId: session.id,
        });
        return "已通知教师，请留在当前工位等待";
      },
    });
  const requestExamIncidentHelp = () =>
    setModal({
      eyebrow: "考试异常求助",
      title: "请选择需要教师处理的异常",
      content: <ExamIncidentHelpForm ref={examIncidentRef} />,
      confirmText: "通知教师",
      onConfirm: () => {
        store.requestExamIncidentHelp(arrangement.id, workstation.id, {
          ...examIncidentRef.current?.getValue(),
          sessionId: session.id,
        });
        return "已通知教师，请停止受影响的操作并等待处理";
      },
    });
  const showHint = () => {
    store.recordStudentHintRequest(
      arrangement.id,
      workstation.id,
      currentStep?.id,
      session.id,
    );
    setModal({
      eyebrow: "当前步骤提示",
      title: "我不会，查看操作提示",
      size: "large",
      dismissOnly: true,
      hideCancel: true,
      confirmText: "知道了",
      content: (
        <StudentHintContent
          step={standardStep}
          mediaStep={sessionStandardMediaStep({
            session,
            arrangement,
            sop,
            stepId: standardStep?.id,
          })}
        />
      ),
    });
  };
  const finish = () =>
    setModal({
      eyebrow: exam ? "交卷确认" : "结束确认",
      title: `确认结束本次${exam ? "考试" : "训练"}？`,
      content: (
        <div className="workstation-confirm-copy">
          {unfinishedCount ? (
            <p className="warning-copy">
              还有 <strong>{unfinishedCount}</strong>{" "}
              个步骤未完成。结束后将按当前记录生成结果，不能从学生端撤销。
            </p>
          ) : (
            <p>所有步骤均已记录，结束后将生成本次个人结果。</p>
          )}
          <ul>
            {session.steps.map((step) => (
              <li key={step.id}>
                {step.name} ·{" "}
                {step.flowCompletion || step.state === "pass"
                  ? "流程已完成"
                  : session.stepConfirmation?.status === "pending" &&
                      session.stepConfirmation.stepId === step.id
                    ? "待教师确认流程"
                    : "流程未完成"}
              </li>
            ))}
          </ul>
          {exam && <p>考试成绩将在教师统一发布后显示。</p>}
        </div>
      ),
      confirmText: exam ? "确认交卷" : "确认结束",
      onConfirm: () => {
        store.finishWorkstationSession(arrangement.id, workstation.id, {
          sessionId: session.id,
          reason: exam ? "manual_submit" : "student_finished",
        });
        return exam ? "已交卷，等待教师发布成绩" : "训练已结束，个人报告已生成";
      },
    });
  const modalDone = async (message) => finishModal(message);

  return (
    <div
      className={`workstation-page ${exam ? "workstation-page--exam" : ""} ${
        studentMode ? "workstation-page--student" : ""
      }`}
    >
      {!studentMode && (
        <header className="workstation-topbar">
          <button
            className="workstation-brand"
            onClick={() => window.location.reload()}
          >
            <ProductOutlined />
            <span>
              <strong>兴辰智能</strong>
              <small>学生工位端</small>
            </span>
          </button>
          <div>
            <Status tone={exam ? "warning" : "success"}>
              {exam ? "考试模式" : "训练模式"}
            </Status>
            <span>{workstation.name}</span>
            <span>{student.name}</span>
          </div>
        </header>
      )}

      {waiting ? (
        <main className="workstation-entry">
          <section className="workstation-entry__hero">
            <span className="eyebrow">{exam ? "考试入场" : "训练入场"}</span>
            <h1>{arrangement.name}</h1>
            <p>{policy.statusText}</p>
          </section>
          <div className="workstation-entry__grid">
            <section className="workstation-card workstation-identity-card">
              <h2>请确认本次身份与任务</h2>
              <div className="identity-summary">
                <span className="student-avatar">
                  <UserOutlined />
                </span>
                <div>
                  <strong>{student.name}</strong>
                  <small>学号 {student.no}</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>任务</dt>
                  <dd>{arrangement.name}</dd>
                </div>
                <div>
                  <dt>工位</dt>
                  <dd>
                    {workstation.name} · {workstation.location}
                  </dd>
                </div>
                <div>
                  <dt>标准</dt>
                  <dd>{sop.name}</dd>
                </div>
                {exam && (
                  <div>
                    <dt>考试时长</dt>
                    <dd>
                      {normalizeExamDuration(
                        session.examDurationMinutes ??
                          arrangement.examDurationMinutes,
                      )}{" "}
                      分钟
                    </dd>
                  </div>
                )}
              </dl>
              {exam && (
                <div className="exam-entry-rules">
                  <strong>考试规则</strong>
                  <p>开始后立即计时，倒计时结束会自动交卷。</p>
                  <p>考试中不显示标准答案、操作提示、实时正误或得分。</p>
                </div>
              )}
              {studentMode ? (
                <p className="workstation-identity-verified">
                  <CheckCircleFilled /> 已使用本次人脸登录身份确认
                </p>
              ) : (
                <label className="workstation-check">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(event) =>
                      setIdentityConfirmed(event.target.checked)
                    }
                  />
                  我确认以上学生、任务和工位信息无误
                </label>
              )}
            </section>
            <section className="workstation-card readiness-card">
              <h2>开始前准备</h2>
              <div className="readiness-list">
                {readiness.map((item) => (
                  <article key={item.label}>
                    {item.ready ? <CheckCircleFilled /> : <AlertOutlined />}
                    <div>
                      <strong>{item.label}</strong>
                      <small>{displayBusinessText(item.detail)}</small>
                    </div>
                    <Status tone={item.ready ? "success" : "danger"}>
                      {item.ready ? "就绪" : "不可用"}
                    </Status>
                  </article>
                ))}
              </div>
              <Button
                type="primary"
                disabled={(!studentMode && !identityConfirmed) || !ready}
                onClick={start}
              >
                {exam ? "确认开始考试" : "确认并开始训练"}
              </Button>
              <small className="session-resume-note">
                页面刷新或短暂断线后会自动恢复当前进度
              </small>
            </section>
          </div>
        </main>
      ) : completed ? (
        <main className="workstation-complete">
          <CheckCircleFilled />
          <span className="eyebrow">
            {session.endedBy === "teacher"
              ? exam
                ? "本次考试已结束"
                : "本次练习已由教师结束"
              : exam
                ? session.submitReason === "time_expired"
                  ? "考试时间到"
                  : "考试已提交"
                : "训练已完成"}
          </span>
          <h1>
            {session.endedBy === "teacher" && exam
              ? "考试记录已保存，请等待教师发布成绩"
              : exam && !published
                ? "成绩等待教师统一发布"
                : `本次得分 ${session.score} 分`}
          </h1>
          <p>
            {session.endedBy === "teacher"
              ? exam
                ? "教师已结束本次考试，步骤、时间和视频证据已保存，当前页面不能继续操作。"
                : "教师已结束本次练习，当前步骤、用时和现场记录均已保存。"
              : exam && !published
                ? session.submitReason === "time_expired"
                  ? "倒计时结束后系统已自动交卷。步骤、时间和视频证据已保存，请等待教师发布成绩。"
                  : "试卷已提交。系统已保存步骤、时间和视频证据，请等待教师发布成绩。"
                : `已记录 ${completedSteps}/${session.steps.length} 个完成步骤，可查看本次个人结果。`}
          </p>
          {policy.showFinalReport && (
            <section className="workstation-result-list">
              {session.steps.map((step, index) => (
                <article key={step.id}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{step.name}</strong>
                    <small>
                      {step.result} · {step.duration}
                    </small>
                  </span>
                  <em>
                    {step.effectiveScore ?? step.score}/{step.maxScore} 分
                  </em>
                </article>
              ))}
            </section>
          )}
          <div className="workstation-complete__actions">
            {studentMode ? (
              <>
                <Button type="primary" onClick={() => nav("/student/current")}>
                  返回当前任务
                </Button>
                <Button
                  onClick={() => {
                    clearStudentIdentitySession();
                    nav("/student/login");
                  }}
                >
                  退出学生端
                </Button>
              </>
            ) : (
              <Button
                onClick={() =>
                  nav(`/workstation/${arrangement.id}/${workstation.id}`)
                }
              >
                刷新结果状态
              </Button>
            )}
          </div>
        </main>
      ) : (
        <main className="workstation-session">
          <section className="workstation-session__heading">
            <div>
              <span className="eyebrow">{arrangement.name}</span>
              <h1>
                {exam
                  ? `考试进行中 · 第 ${currentIndex + 1} 步`
                  : currentStep?.name}
              </h1>
              <p>{policy.statusText}</p>
            </div>
            <div
              className={`workstation-timer ${exam ? `workstation-timer--${countdownTone}` : ""}`}
            >
              <small>{exam ? "剩余时间" : "有效用时"}</small>
              <strong>
                {exam ? formatExamRemaining(remainingSeconds) : session.elapsed}
              </strong>
              <span>
                {exam
                  ? `共 ${normalizeExamDuration(session.examDurationMinutes ?? arrangement.examDurationMinutes)} 分钟`
                  : `${progress}%`}
              </span>
            </div>
          </section>

          {safetyBlocked && (
            <section className="workstation-blocked">
              <SafetyCertificateOutlined />
              <div>
                <strong>安全异常</strong>
                <p>请立即停止操作并等待教师处理。</p>
              </div>
            </section>
          )}
          {blocked && !safetyBlocked && (
            <section className="workstation-blocked">
              <AlertOutlined />
              <div>
                <strong>系统评价暂不可用</strong>
                <p>
                  {displayBusinessText(
                    session.events[0]?.detail || "请按现场要求等待教师处理。",
                  )}
                </p>
              </div>
            </section>
          )}
          {paused && !blocked && !safetyBlocked && (
            <section className="workstation-paused">
              <PauseCircleFilled />
              <div>
                <strong>
                  {technicalPaused
                    ? "系统异常"
                    : exam
                      ? "考试已暂停"
                      : "当前会话已暂停"}
                </strong>
                <p>
                  {technicalPaused
                    ? "当前考试评价与倒计时已暂停，请保持现场并等待教师处理。"
                    : exam
                      ? "当前倒计时已停止，请保持现场状态并等待教师恢复。"
                      : "计时与自动评价已经停止，录像仍按规则留存。"}
                </p>
              </div>
              <Button
                type="primary"
                disabled={studentMode || arrangement.status === "已暂停"}
                onClick={() => {
                  store.setArrangementSessionPaused(
                    arrangement.id,
                    workstation.id,
                    false,
                    session.id,
                  );
                  setToast("会话已从原步骤恢复");
                  window.setTimeout(() => setToast(""), 2400);
                }}
              >
                {studentMode || arrangement.status === "已暂停"
                  ? "等待教师恢复安排"
                  : "从断点恢复"}
              </Button>
            </section>
          )}

          <div className="workstation-session__grid">
            <StudentCameraPreview
              key={session.id}
              data={store.data}
              session={session}
              workstation={workstation}
              student={student}
            />

            {exam ? (
              <div className="exam-session-side">
                <section className="exam-focus-card">
                  <SafetyCertificateOutlined />
                  <span className="eyebrow">
                    第 {currentIndex + 1} / {session.steps.length} 步
                  </span>
                  <h2>{currentStep?.name}</h2>
                  <p>请独立完成现场操作。</p>
                  <small>系统正在记录本次考试过程。</small>
                </section>
                <aside className="workstation-control-card">
                  <h2>考试状态</h2>
                  <div className="workstation-runtime-list">
                    <span>
                      <small>当前状态 / 模型来源</small>
                      <strong>{session.status}</strong>
                    </span>
                    <span>
                      <small>步骤进度</small>
                      <strong>
                        {currentIndex + 1}/{session.steps.length}
                      </strong>
                    </span>
                    <span>
                      <small>视频记录</small>
                      <strong>
                        {cameraState.available ? "记录中" : "需处理"}
                      </strong>
                    </span>
                    <span>
                      <small>智能辅助</small>
                      <strong>
                        {aiRuntimeEnabled ? "运行中" : "降级运行"}
                      </strong>
                    </span>
                  </div>
                  <HelpLifecycle
                    arrangement={arrangement}
                    session={session}
                    studentMode
                    onRequest={requestExamIncidentHelp}
                  />
                  <Button
                    type="danger"
                    onClick={finish}
                    disabled={blocked || safetyBlocked}
                  >
                    结束并交卷
                  </Button>
                  <small className="session-resume-note">
                    刷新或短暂断线后按服务端时间恢复倒计时
                  </small>
                </aside>
              </div>
            ) : (
              <section className="student-current-step-card">
                <span className="eyebrow">当前步骤 · {standardStep?.id}</span>
                <h2>{standardStep?.name || "当前步骤"}</h2>
                <RequirementsView step={standardStep} />
                <EvaluationBadge
                  step={session.steps.find(
                    (s) => s.id === session.currentStepId,
                  )}
                />
                <div className="student-step-instruction">
                  <strong>操作说明</strong>
                  <p>
                    {standardStep?.teachingInstruction ||
                      "当前步骤暂无操作说明。"}
                  </p>
                </div>
                <div className="student-step-instruction">
                  <strong>操作要点</strong>
                  <p>{standardStep?.keyPoints || "请按教师现场要求完成。"}</p>
                </div>
                {policy.showStandardMedia && (
                  <StandardMediaSection
                    key={`media-${session.id}-${standardStep?.id}`}
                    step={sessionStandardMediaStep({
                      session,
                      arrangement,
                      sop,
                      stepId: standardStep?.id,
                    })}
                  />
                )}
                {standardStep?.redline && (
                  <div className="student-step-instruction is-safety">
                    <strong>
                      <SafetyCertificateOutlined /> 安全提醒
                    </strong>
                    <p>{standardStep.redline}</p>
                  </div>
                )}
              </section>
            )}
          </div>

          {policy.showAiFeedback && (
            <section
              className={`student-ai-feedback is-${practiceFeedback.type}`}
            >
              <span>
                <AlertOutlined />
              </span>
              <div>
                <small>AI练习反馈</small>
                <strong>{practiceFeedback.title}</strong>
                <p>{practiceFeedback.message}</p>
              </div>
            </section>
          )}

          {policy.allowLearningHelp && (
            <section className="student-practice-actions">
              <div className="student-practice-summary">
                <span>
                  <small>当前状态</small>
                  <strong>{session.status}</strong>
                </span>
                <span>
                  <small>步骤进度</small>
                  <strong>
                    {currentIndex + 1}/{session.steps.length}
                  </strong>
                </span>
                <span>
                  <small>实时得分</small>
                  <strong>{session.score} 分</strong>
                </span>
              </div>
              <HelpLifecycle
                arrangement={arrangement}
                session={session}
                studentMode
                onRequest={requestHelp}
              />
              <div className="student-practice-buttons">
                {policy.allowHint && (
                  <Button onClick={showHint} disabled={!currentStep}>
                    <BookOutlined /> 我不会
                  </Button>
                )}
                <Button
                  type="danger"
                  onClick={finish}
                  disabled={blocked || safetyBlocked}
                >
                  结束练习
                </Button>
              </div>
              <small className="session-resume-note">
                刷新或短暂断线后会自动恢复当前步骤
              </small>
            </section>
          )}

          <StepProgression
            arrangement={arrangement}
            session={session}
            studentMode
          />
          <section className="workstation-step-progress">
            <header>
              <h2>步骤进度</h2>
              <span>
                {completedSteps} / {session.steps.length} 已记录
              </span>
            </header>
            <div>
              {session.steps.map((step, index) => {
                const current = index === currentIndex;
                const neutralResult =
                  step.state === "pending"
                    ? "未开始"
                    : current
                      ? "当前步骤"
                      : "已记录";
                return (
                  <article className={current ? "active" : ""} key={step.id}>
                    <b>{index + 1}</b>
                    <span>
                      <strong>{step.name}</strong>
                      <small>
                        {policy.showRealtimeResult
                          ? step.result
                          : neutralResult}
                      </small>
                    </span>
                    {policy.showRealtimeResult && <em>{step.duration}</em>}
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircleFilled /> {displayBusinessText(toast)}
        </div>
      )}
      <Modal data={modal} close={() => setModal(null)} done={modalDone} />
    </div>
  );
}

const RuntimeIncidentForm = forwardRef(function RuntimeIncidentForm(_, ref) {
  const [type, setType] = useState("camera_offline");
  const [affectsContinuation, setAffectsContinuation] = useState(true);
  const [note, setNote] = useState("");
  useImperativeHandle(ref, () => ({
    getValue: () => ({ type, affectsContinuation, note }),
  }));
  return (
    <div className="form-stack">
      <label className="field">
        技术异常类型
        <select value={type} onChange={(event) => setType(event.target.value)}>
          {Object.entries(TECHNICAL_INCIDENT_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={affectsContinuation}
          onChange={(event) => setAffectsContinuation(event.target.checked)}
        />
        异常阻碍学生继续操作，需要暂停当前会话与评价计时
      </label>
      <label className="field">
        现场说明
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="例如：主视角摄像头离线，当前步骤无法继续取证"
        />
      </label>
      <p className="hint">
        技术异常本身不会自动形成学生负向结论；练习默认通过，考试进入成绩处置。
      </p>
    </div>
  );
});

function RuntimeSimulatorPanel({ arrangement, session, sop, store, setModal }) {
  const incidentRef = useRef(null);
  const runtime = session.runtime || {};
  const actor = runtime.actorBinding || {};
  const clock = runtime.evaluationClock || {};
  const currentStep = session.steps.find(
    (step) => step.id === session.currentStepId,
  );
  const evaluationSnapshot = session.evaluationSnapshot || {};
  const aiConfig = evaluationSnapshot.aiCapabilityConfigSnapshot || {};
  const capabilities = evaluationSnapshot.capabilitySnapshots || [];
  const judgementItems = activeJudgementItems(aiConfig).filter(
    (item) => item.stepId === currentStep?.id,
  );
  const areas = aiConfig.logicalAreas || [];
  const purposeLabels = {
    completion: "完成判断",
    scoring: "评分依据",
    safety: "安全提醒",
  };
  const conditionDescription = (condition) => {
    const capability = capabilities.find(
      (item) => item.id === condition.capabilityId,
    );
    const area = areas.find((item) => item.id === condition.logicalAreaId);
    const operator =
      OBJECT_DETECTION_OPERATORS[condition.operator] ||
      ACTION_RECOGNITION_OPERATORS[condition.operator] ||
      condition.operator;
    const details = [operator];
    if (area) details.push(area.name);
    if (Number(condition.minDurationSeconds) > 0)
      details.push(`持续≥${condition.minDurationSeconds}秒`);
    if (Number(condition.minOccurrences) > 1)
      details.push(`至少${condition.minOccurrences}次`);
    return {
      capabilityName: capability?.name || condition.capabilityId || "能力失效",
      text: details.filter(Boolean).join(" · "),
    };
  };
  const scoreRules = (sop?.scoreRules || []).filter(
    (item) => item.stepId === currentStep?.id,
  );
  const safetyRules = (sop?.safetyRules || []).filter(
    (item) => item.stepId === currentStep?.id && item.enabled !== false,
  );
  const pendingSafety = (runtime.safetyCandidates || []).find(
    (item) => item.status === "pending",
  );
  const pendingIncident = (runtime.technicalIncidents || []).find(
    (item) => item.status !== "resolved" && item.affectsContinuation,
  );
  const correctionActive = runtime.correctionContext?.status === "active";
  const confirmAction = (title, content, confirmText, onConfirm) =>
    setModal({ title, content: <p>{content}</p>, confirmText, onConfirm });
  const setActor = (status) =>
    confirmAction(
      "更新主操作人绑定",
      status === "confirmed"
        ? "确认当前学生重新成为唯一主操作人，并恢复因重新绑定导致的暂停。"
        : "该状态会阻止新的负向自动评价；丢失时同时暂停会话并生成技术异常。",
      "确认更新",
      () => {
        store.setActorBindingStatus(
          arrangement.id,
          session.workstationId,
          status,
          "运行模拟操作",
        );
        return `人员绑定已更新为${ACTOR_BINDING_STATUSES[status]}`;
      },
    );
  const openIncident = () =>
    setModal({
      title: "记录技术异常",
      content: <RuntimeIncidentForm ref={incidentRef} />,
      confirmText: "记录异常",
      onConfirm: () => {
        store.reportTechnicalIncident(
          arrangement.id,
          session.workstationId,
          incidentRef.current.getValue(),
        );
        return "技术异常已记录，并按练习/考试策略处理";
      },
    });
  return (
    <section className="panel runtime-simulator">
      <PanelTitle
        title="运行状态模拟（原型）"
        action={<span>实训记录 AI配置快照</span>}
      />
      <p className="hint">
        用于演示真实业务状态变化。AI观察事实必须经判断条件形成AI判断项结果后才影响步骤；安全候选与技术异常均不直接自动处罚。
      </p>
      <ObservationSimulator
        key={session.id}
        arrangement={arrangement}
        session={session}
        store={store}
      />
      <div className="runtime-status-grid">
        <article>
          <small>主操作人</small>
          <strong>
            {ACTOR_BINDING_STATUSES[actor.status] || actor.status || "未建立"}
          </strong>
          <span>{actor.trackId || "无有效跟踪记录"}</span>
        </article>
        <article>
          <small>评价计时</small>
          <strong>{session.elapsed}</strong>
          <span>
            墙钟 {Math.floor(Number(clock.wallSeconds || 0) / 60)}分 · 暂停{" "}
            {Number(clock.pausedSeconds || 0)}秒
          </span>
        </article>
        <article>
          <small>步骤执行</small>
          <strong>
            {STEP_EXECUTION_STATES[currentStep?.executionState] || "无活动步骤"}
          </strong>
          <span>窗口 {currentStep?.observationWindow?.status || "—"}</span>
        </article>
        <article>
          <small>完成结果</small>
          <strong>
            {COMPLETION_RESULTS[currentStep?.completionResult] || "尚未形成"}
          </strong>
          <span>独立于当前得分</span>
        </article>
      </div>
      <div className="runtime-action-groups">
        <div>
          <b>计时与人员</b>
          <Button
            onClick={() => {
              store.advanceRuntimeClock(
                arrangement.id,
                session.workstationId,
                30,
              );
            }}
          >
            推进30秒
          </Button>
          <Button onClick={() => setActor("uncertain")}>身份不确定</Button>
          <Button onClick={() => setActor("lost")}>跟踪丢失</Button>
          <Button onClick={() => setActor("confirmed")}>重新绑定</Button>
          <Button
            onClick={() => {
              store.createAssistanceWarning(
                arrangement.id,
                session.workstationId,
              );
            }}
          >
            第二人员持续介入
          </Button>
        </div>
        <div className="runtime-judgement-group">
          <b>AI判断项与判断条件</b>
          {judgementItems.length ? (
            judgementItems.map((item) => {
              const result = (runtime.aiJudgementResults || []).find(
                (entry) =>
                  entry.stepId === currentStep?.id &&
                  entry.judgementItemId === item.id,
              );
              return (
                <article key={item.id} className="runtime-judgement-item">
                  <header>
                    <strong>{item.name}</strong>
                    <Status
                      tone={
                        result?.result === "confirmed" ? "success" : "warning"
                      }
                    >
                      {result?.result === "confirmed" ? "成立" : "观察中"}
                    </Status>
                  </header>
                  <small>
                    {(item.purposes || [])
                      .map((purpose) => purposeLabels[purpose] || purpose)
                      .join("、")}
                    {" · "}
                    {AI_CONDITION_COMBINATIONS[item.combination] || "全部满足"}
                  </small>
                  <div className="inline-actions">
                    {(item.conditions || []).map((condition) => {
                      const description = conditionDescription(condition);
                      return (
                        <Button
                          key={condition.id}
                          disabled={
                            session.status !== "进行中" ||
                            !(
                              session.evaluationProfile?.aiRuntimeEnabled ??
                              session.evaluationProfile
                                ?.automaticEvaluationEnabled
                            )
                          }
                          onClick={() =>
                            confirmAction(
                              "模拟AI识别观察",
                              `${description.capabilityName}：${description.text}`,
                              "确认产生观察",
                              () => {
                                const outcome = store.simulateAiCondition(
                                  arrangement.id,
                                  session.workstationId,
                                  item.id,
                                  condition.id,
                                );
                                return outcome.completed
                                  ? "完成判断项已成立，步骤已关闭"
                                  : outcome.confirmed
                                    ? "AI判断项已成立"
                                    : "识别观察已记录，继续等待其他条件";
                              },
                            )
                          }
                        >
                          {description.capabilityName} · {description.text}
                        </Button>
                      );
                    })}
                  </div>
                </article>
              );
            })
          ) : (
            <span className="hint">当前步骤没有启用的AI判断项</span>
          )}
        </div>
        <div>
          <b>纠正与异常</b>
          <Button
            disabled={!scoreRules.length || correctionActive}
            onClick={() =>
              confirmAction(
                "模拟规则违规",
                "开启纠正过程；后续纠正动作不会被当作普通重复操作再次处罚。",
                "进入纠正",
                () => {
                  store.setCorrectionContext(
                    arrangement.id,
                    session.workstationId,
                    "open",
                    scoreRules[0]?.id,
                  );
                  return "已进入纠正上下文";
                },
              )
            }
          >
            触发可纠正规则
          </Button>
          <Button
            disabled={!correctionActive}
            onClick={() =>
              confirmAction(
                "完成纠正",
                "按教师预先定义的纠正后处理计算，不在运行阶段自创扣分。",
                "确认纠正",
                () => {
                  store.setCorrectionContext(
                    arrangement.id,
                    session.workstationId,
                    "complete",
                  );
                  return "纠正结果已按教师评分规则处理";
                },
              )
            }
          >
            完成纠正
          </Button>
          <Button onClick={openIncident}>记录技术异常</Button>
          <Button
            disabled={!pendingIncident}
            onClick={() => {
              store.resolveTechnicalIncident(
                arrangement.id,
                session.workstationId,
                pendingIncident?.id,
              );
            }}
          >
            恢复技术异常
          </Button>
        </div>
        <div>
          <b>安全候选</b>
          {pendingSafety ? (
            <>
              <Button
                onClick={() => {
                  store.resolveSafetyCandidate(
                    arrangement.id,
                    session.workstationId,
                    pendingSafety.id,
                    "false_positive",
                  );
                }}
              >
                误报并恢复
              </Button>
              <Button
                danger
                onClick={() =>
                  confirmAction(
                    "确认安全违规",
                    "确认后仅按教师已定义的安全规则处理成绩与会话，不因暂停本身处罚。",
                    "确认违规",
                    () => {
                      store.resolveSafetyCandidate(
                        arrangement.id,
                        session.workstationId,
                        pendingSafety.id,
                        "confirmed",
                      );
                      return "安全违规已按教师规则处理";
                    },
                  )
                }
              >
                确认违规
              </Button>
            </>
          ) : (
            <Button
              danger
              disabled={!currentStep || !safetyRules.length}
              onClick={() => {
                store.createSafetyCandidate(
                  arrangement.id,
                  session.workstationId,
                  safetyRules[0]?.id,
                );
              }}
            >
              触发安全候选
            </Button>
          )}
          <span className="hint">
            {pendingSafety
              ? SAFETY_CANDIDATE_STATUSES[pendingSafety.status]
              : "当前无待确认候选"}
          </span>
        </div>
      </div>
      <div className="runtime-ledger">
        <span>
          AI识别观察 <b>{runtime.aiObservations?.length || 0}</b>
        </span>
        <span>
          AI判断项结果 <b>{runtime.aiJudgementResults?.length || 0}</b>
        </span>
        <span>
          技术异常 <b>{runtime.technicalIncidents?.length || 0}</b>
        </span>
        <span>
          安全候选 <b>{runtime.safetyCandidates?.length || 0}</b>
        </span>
        <span>
          协助提醒 <b>{runtime.assistanceWarnings?.length || 0}</b>
        </span>
      </div>
    </section>
  );
}

function StudentMonitorPage({ exam = false, setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const selectedSessionId = new URLSearchParams(location.search).get(
    "sessionId",
  );
  const { id, stationId } = useParams();
  const store = usePrototypeData();
  const arrangement = store.data.arrangements.find((item) => item.id === id);
  const session = arrangement?.sessions.find(
    (item) =>
      item.workstationId === stationId &&
      (!selectedSessionId || item.id === selectedSessionId),
  );
  const workstation = store.data.workstations.find(
    (item) => item.id === stationId,
  );
  const student = store.data.students.find(
    (item) => item.id === session?.studentId,
  );
  const sop = store.data.sops.find((item) => item.id === arrangement?.sopId);
  const base = exam ? "exams" : "practices";
  const initialIndex = Math.max(
    0,
    (session?.steps || []).findIndex(
      (step) => step.id === session?.currentStepId,
    ),
  );
  const [selectedStep, setSelectedStep] = useState(initialIndex);
  if (!arrangement || !session || !workstation)
    return (
      <MissingState
        title="工位会话不存在或尚未开放"
        backTo={`/teacher/${base}/${id}/live`}
      />
    );
  const detailStep = session.steps?.[selectedStep] || session.steps?.[0] || {};
  const currentStep = (session.steps || []).find(
    (step) => step.id === session.currentStepId,
  );
  const running = session.status === "进行中";
  const paused = session.status === "已暂停";
  const blocked = session.status === "故障";
  const waiting = session.status === "待开始" || session.status === "可入场";
  const completed = (session.steps || []).filter(
    (step) => step.state === "pass",
  ).length;
  const progress = Math.round(
    (completed / Math.max(1, (session.steps || []).length)) * 100,
  );
  const coverage = evaluationCoverage(session.steps);
  const identity = teacherIdentityView(session);
  const normalizedEvents = teacherSessionEvents(session);
  const studentActivities = teacherStudentActivities(session);
  const reportPath = sessionReportPath(arrangement, session);
  const togglePause = () =>
    setModal({
      title: paused ? "恢复当前学生会话" : "暂停当前学生会话",
      content: (
        <p>
          {paused
            ? "恢复计时和自动评价，继续沿用当前安排快照。"
            : "暂停后停止当前学生计时与判定，其他工位不受影响。"}
        </p>
      ),
      confirmText: paused ? "确认恢复" : "确认暂停",
      onConfirm: () => {
        const status = store.setArrangementSessionPaused(
          arrangement.id,
          workstation.id,
          !paused,
          session.id,
        );
        return `${student.name} 的会话已更新为${status}`;
      },
    });
  const stateMessage = blocked
    ? ["自动评价受控暂停", session.events[0]?.detail || "等待管理员处理故障"]
    : paused
      ? ["当前学生会话已暂停", "视频继续留存，计时与动作判定已停止"]
      : waiting
        ? ["等待学生入场", "尚未开始计时，不显示虚假进度或动作候选"]
        : null;
  return (
    <>
      <PageHeader
        back
        title={`${workstation.name} · ${student?.name || "未分配学生"}`}
        subtitle={
          <span>
            {student ? `学号 ${student.no}` : "尚未分配"}　·　{sop?.name}　·　
            <Status
              tone={
                blocked
                  ? "danger"
                  : paused
                    ? "warning"
                    : running
                      ? "success"
                      : "muted"
              }
            >
              {session.status}
            </Status>
          </span>
        }
        actions={
          <>
            <Button
              icon={<LaptopOutlined />}
              onClick={() =>
                nav(`/workstation/${arrangement.id}/${workstation.id}`)
              }
            >
              打开学生端入口
            </Button>
            <Button
              disabled={blocked || waiting || session.status === "待复位"}
              icon={paused ? <PlayCircleFilled /> : <PauseCircleFilled />}
              onClick={togglePause}
            >
              {paused ? "继续评价" : "暂停评价"}
            </Button>
            <Button type="primary" onClick={() => nav(reportPath)}>
              查看学生报告
            </Button>
          </>
        }
      />
      <OpeningInspectionRecord
        session={session}
        teachers={store.data.teachers}
      />
      <div className="student-monitor-layout">
        <section className="student-monitor-main">
          <SessionCameraViewer
            key={session.id}
            session={session}
            workstation={workstation}
            devices={store.data.devices}
            renderPreview={(camera) => (
              <div
                className={`live-video-frame ${!running ? "is-paused" : ""}`}
              >
                {camera?.available &&
                (!camera.areaIds?.length ||
                  camera.areaIds.every((area) => area === "工作台")) ? (
                  <>
                    <img
                      src={
                        camera.role === "primary"
                          ? "/assets/student-monitor-hand-tracking.png"
                          : "/assets/workstation-female.png"
                      }
                      alt={`${workstation.name} · ${camera.label}占位演示图，非真实摄像头画面`}
                    />
                    <div className="video-top-overlay">
                      <span>
                        <EyeOutlined /> 占位演示画面
                      </span>
                      <span>非真实摄像头画面或识别结果</span>
                    </div>
                    {running && (
                      <div className="video-bottom-overlay">
                        <span>当前步骤记录（不随下方查看切换）</span>
                        <strong>{currentStep?.name || "等待操作"}</strong>
                        <time>
                          <ClockCircleOutlined /> {session.elapsed}
                        </time>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="session-camera-viewer__placeholder">
                    <VideoCameraOutlined />
                    <strong>{camera?.label || "未配置视角"}</strong>
                    <p>
                      {camera?.available
                        ? "视频服务未接入，当前为视角配置演示"
                        : "该视角不可用，相关要求返回未知"}
                    </p>
                    <span>
                      覆盖区域：{camera?.areaIds?.join("、") || "未记录"}
                    </span>
                  </div>
                )}
                {stateMessage && (
                  <div className="video-paused-state">
                    {blocked ? <AlertOutlined /> : <PauseCircleFilled />}
                    <strong>{stateMessage[0]}</strong>
                    <span>{stateMessage[1]}</span>
                  </div>
                )}
              </div>
            )}
          />
          <section className="panel action-progress-panel">
            <PanelTitle
              title="操作步骤完成情况"
              action={
                <span className="progress-count">
                  {completed} / {session.steps.length} 已通过 · 现场{" "}
                  {currentStep?.id || "无"}
                </span>
              }
            />
            <div className="action-step-strip">
              {session.steps.map((step, index) => (
                <button
                  key={step.id}
                  className={`action-step action-step--${step.state === "blocked" ? "fail" : step.state} ${selectedStep === index ? "active" : ""}`}
                  onClick={() => setSelectedStep(index)}
                  aria-label={`${step.id} ${step.name}，${step.result}，用时 ${step.duration}`}
                >
                  <span className="action-step__number">{index + 1}</span>
                  <span className="action-step__copy">
                    <strong>{step.name}</strong>
                    <small>{step.duration}</small>
                  </span>
                  <span className="action-step__result">
                    {step.state === "pass" ? (
                      <CheckCircleFilled />
                    ) : step.state === "active" ? (
                      <PlayCircleFilled />
                    ) : step.state === "blocked" ? (
                      <ExclamationCircleFilled />
                    ) : (
                      <ClockCircleOutlined />
                    )}
                    {step.result}
                    <EvaluationBadge step={step} />
                  </span>
                </button>
              ))}
            </div>
          </section>
          <StepEvaluationExplanation
            key={detailStep.id}
            step={detailStep}
            teachingStep={sessionStandardMediaStep({
              session,
              arrangement,
              sop,
              stepId: detailStep.id,
            })}
          >
            <EvidenceCameraSummary step={detailStep} session={session} />
          </StepEvaluationExplanation>
          <section className="panel">
            <StepProgression arrangement={arrangement} session={session} />
            <HelpLifecycle arrangement={arrangement} session={session} />
          </section>
          <section className="panel monitor-event-card">
            <PanelTitle title="当前会话事件" />
            {normalizedEvents.length ? (
              normalizedEvents.map((event) => (
                <div
                  className={`monitor-alert-row monitor-alert-row--${event.teacherTone}`}
                  key={event.id}
                >
                  <AlertOutlined />
                  <div>
                    <small className="monitor-event-category">
                      {event.categoryLabel}
                    </small>
                    <strong>{displayBusinessText(event.title)}</strong>
                    <p>
                      {event.displayTime} · {displayBusinessText(event.detail)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="hint">当前会话暂无异常事件</p>
            )}
            <div className="monitor-side-actions">
              <Button type="primary" onClick={() => nav(reportPath)}>
                查看完整证据
              </Button>
            </div>
          </section>
        </section>
        <aside className="student-monitor-side">
          <section className="panel teacher-identity-card">
            <header>
              <div>
                <span className="eyebrow">学生身份</span>
                <h2>{student?.name || "学生信息缺失"}</h2>
                <p>{student?.no ? `学号 ${student.no}` : "学号信息不可用"}</p>
              </div>
              <Status tone={identity.tone}>{identity.label}</Status>
            </header>
            <div
              className={`teacher-identity-result teacher-identity-result--${identity.state}`}
            >
              {identity.state === "passed" ? (
                <CheckCircleFilled />
              ) : (
                <AlertOutlined />
              )}
              <span>
                <strong>{identity.label}</strong>
                {identity.detail && <small>{identity.detail}</small>}
              </span>
            </div>
          </section>
          <section className="monitor-kpis">
            <div className="monitor-score-ring">
              <strong>{waiting ? "--" : session.score}</strong>
              <small>实时得分</small>
            </div>
            <div>
              <small>完成进度</small>
              <strong>{waiting ? "0%" : `${progress}%`}</strong>
            </div>
            <div>
              <small>有效用时</small>
              <strong>{session.elapsed}</strong>
            </div>
            <div>
              <small>异常提醒</small>
              <strong
                className={
                  normalizedEvents.some(
                    (event) => event.teacherTone === "danger",
                  )
                    ? "danger-text"
                    : ""
                }
              >
                {
                  normalizedEvents.filter((event) =>
                    ["danger", "warning", "attention"].includes(
                      event.teacherTone,
                    ),
                  ).length
                }
              </strong>
            </div>
            <div>
              <small>录像状态</small>
              <strong>{session.recording?.status || "不可用"}</strong>
            </div>
            <details key={session.id} className="monitor-evidence-overview">
              <summary>
                检测依据概览
                <span>
                  证据支持 {coverage.confirmed}/{coverage.total} 步
                </span>
              </summary>
              <CoverageSummary steps={session.steps} />
            </details>
          </section>
          <section className="panel student-activity-card">
            <PanelTitle
              title="学生行为与求助"
              action={<Status>{studentActivities.length} 条</Status>}
            />
            {studentActivities.length ? (
              <div className="student-activity-list">
                {studentActivities.map((event) => (
                  <article
                    className={`student-activity student-activity--${event.teacherTone}`}
                    key={event.id}
                  >
                    {event.category === "identity" ? (
                      <UserOutlined />
                    ) : event.category === "hint" ? (
                      <BookOutlined />
                    ) : (
                      <BellOutlined />
                    )}
                    <div>
                      <small>
                        {event.categoryLabel} · {event.displayTime}
                      </small>
                      <strong>{displayBusinessText(event.title)}</strong>
                      <p>
                        {event.stepName ? `${event.stepName} · ` : ""}
                        {event.reasonLabel
                          ? `原因：${event.reasonLabel}`
                          : event.detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="hint">尚无学生提示行为或求助记录</p>
            )}
          </section>
          <section className="panel current-step-panel">
            <header>
              <div>
                <span className="eyebrow">
                  正在查看 · {detailStep.id}
                  {detailStep.id !== session.currentStepId &&
                    "（历史/其他步骤）"}
                </span>
                <h2>{detailStep.name}</h2>
              </div>
              <Status
                tone={
                  detailStep.state === "blocked"
                    ? "danger"
                    : detailStep.state === "pass"
                      ? "success"
                      : detailStep.state === "active"
                        ? "warning"
                        : "muted"
                }
              >
                {detailStep.result}
              </Status>
            </header>
            <div className="step-result-grid">
              <span>
                <small>评价结果</small>
                <strong>{detailStep.result}</strong>
              </span>
              <span>
                <small>本步骤用时</small>
                <strong>{detailStep.duration}</strong>
              </span>
              <span>
                <small>当前得分</small>
                <strong>{detailStep.score}</strong>
              </span>
            </div>
            <div className="step-detail-list">
              <article>
                <small>标准要求</small>
                <p>
                  {sop?.steps.find((step) => step.id === detailStep.id)
                    ?.completionCondition || "本次标准快照已锁定"}
                </p>
              </article>
              <article>
                <small>实时观察</small>
                <p>{displayBusinessText(detailStep.observation)}</p>
              </article>
              <article>
                <small>证据状态</small>
                <p>
                  {detailStep.evidenceMetadata?.clipStatus ||
                    detailStep.evidenceStatus}
                  {detailStep.evidenceMetadata?.cameras?.length
                    ? ` · ${detailStep.evidenceMetadata.cameras.join(" + ")}`
                    : ""}
                </p>
              </article>
            </div>
            <div className="step-runtime-status">
              <small>检测依据</small>
              <EvaluationBadge step={detailStep} />
            </div>
            <button
              type="button"
              className="step-detail-link"
              aria-controls={stepJudgementProcessId(detailStep)}
              onClick={() => {
                const process = document.getElementById(
                  stepJudgementProcessId(detailStep),
                );
                if (process) {
                  process.open = true;
                  process.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }}
            >
              查看详细判定依据 →
            </button>
          </section>
        </aside>
      </div>
      {/* 此部分为原型演示阶段使用，已废弃
      <RuntimeSimulatorPanel
        arrangement={arrangement}
        session={session}
        sop={sop}
        store={store}
        setModal={setModal}
      />
      */}
    </>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <footer className="table-pagination" aria-label="列表分页">
      <span>共 {total} 条</span>
      <div className="table-pagination__controls">
        <label>
          每页
          <select
            aria-label="每页显示条数"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option value={size} key={size}>
                {size}
              </option>
            ))}
          </select>
          条
        </label>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          上一页
        </button>
        <span>
          第 <strong>{page}</strong> / {pageCount} 页
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        >
          下一页
        </button>
      </div>
    </footer>
  );
}

function useListPagination(items) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const identity = items
    .map(
      (item, index) =>
        item?.id ?? item?.sourceVideoId ?? item?.categoryId ?? index,
    )
    .join("|");
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [identity]);
  useEffect(
    () => setPage((current) => Math.min(current, pageCount)),
    [pageCount],
  );
  return {
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
    paginationProps: {
      total: items.length,
      page,
      pageSize,
      onPageChange: setPage,
      onPageSizeChange: (nextPageSize) => {
        setPageSize(nextPageSize);
        setPage(1);
      },
    },
  };
}

function DataTable({
  columns,
  rows,
  onRow,
  onView,
  onMore,
  renderActions,
  rowKey,
  selectedRowKey,
  viewLabel = "查看",
  emptyText = "暂无符合条件的记录",
  statusColumns = [2, 3, 4],
  pagination = "auto",
}) {
  const hasActions = Boolean(onRow || onView || onMore || renderActions);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const paginationIdentity = rows
    .map((row, index) => {
      if (rowKey) return String(rowKey(row, index));
      return `${String(row?.[0] ?? "row")}:${index}`;
    })
    .join("|");
  const paginationEnabled =
    pagination === true || (pagination === "auto" && rows.length > 10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    const index =
      selectedRowKey && rowKey
        ? rows.findIndex(
            (r, i) => String(rowKey(r, i)) === String(selectedRowKey),
          )
        : -1;
    setPage(index >= 0 ? Math.floor(index / pageSize) + 1 : 1);
  }, [paginationIdentity, selectedRowKey, pageSize]);
  useEffect(
    () => setPage((current) => Math.min(current, pageCount)),
    [pageCount],
  );
  const firstRowIndex = paginationEnabled ? (page - 1) * pageSize : 0;
  const visibleRows = rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .slice(
      firstRowIndex,
      paginationEnabled ? firstRowIndex + pageSize : rows.length,
    );
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
              {hasActions && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row: currentRow, originalIndex }) => (
              <tr
                key={rowKey ? rowKey(currentRow, originalIndex) : originalIndex}
                className={
                  selectedRowKey &&
                  rowKey &&
                  String(rowKey(currentRow, originalIndex)) ===
                    String(selectedRowKey)
                    ? "statistics-selected-result"
                    : undefined
                }
              >
                {currentRow.map((cell, columnIndex) => (
                  <td key={columnIndex}>
                    {statusColumns.includes(columnIndex) &&
                    /状态|发布|完成|待|启用|停用|在线|成功|故障|异常|进行|使用中|可入场|已采集|未采集|草稿|可导入|错误|重复|维护|完整|缺失|不可用/.test(
                      String(cell),
                    ) ? (
                      <Status>{cell}</Status>
                    ) : (
                      displayBusinessText(cell)
                    )}
                  </td>
                ))}
                {hasActions && (
                  <td>
                    {(onView || onRow) && (
                      <button
                        className="table-action"
                        aria-label={`查看 ${currentRow[0]}`}
                        onClick={() =>
                          (onView || onRow)(currentRow, originalIndex)
                        }
                      >
                        {typeof viewLabel === "function"
                          ? viewLabel(currentRow, originalIndex)
                          : viewLabel}
                      </button>
                    )}
                    {onMore && (
                      <button
                        className="icon-button"
                        aria-label={`更多操作：${currentRow[0]}`}
                        onClick={() => onMore(currentRow, originalIndex)}
                      >
                        <MoreOutlined aria-hidden="true" />
                      </button>
                    )}
                    {renderActions?.(currentRow, originalIndex)}
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  className="table-empty"
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paginationEnabled && (
        <TablePagination
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      )}
    </>
  );
}
function Toolbar({
  primary,
  onPrimary,
  children,
  placeholder = "搜索名称",
  filters = ["全部状态", "已发布", "草稿"],
  value = "",
  filterValue = filters[0],
  onChange,
  onFilterChange,
  onRefresh,
}) {
  return (
    <div className="list-toolbar">
      <div className="search">
        <SearchOutlined />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
      </div>
      {filters.length > 0 && (
        <select
          aria-label="筛选状态"
          value={filterValue}
          onChange={(event) => onFilterChange?.(event.target.value)}
        >
          {filters.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      )}
      {children}
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
      <span />
      {primary && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onPrimary}>
          {primary}
        </Button>
      )}
    </div>
  );
}

const emptySopDraft = () => ({
  name: "",
  owner: "王老师",
  status: "草稿",
  frozen: false,
  major: "新能源汽车技术",
  course: "",
  operation: "",
  basis: "",
  conditions: "",
  standardDuration: "15 分钟",
  scoreRules: [],
  safetyRules: [],
  usedStepIds: ["Step 01"],
  steps: [createSopStepDraft({ id: "Step 01", predecessor: "无", score: 100 })],
});

function validateSopDraft(draft) {
  return validateSopDefinition(draft);
}

const CopySopForm = forwardRef(function CopySopForm({ initialName }, ref) {
  const [name, setName] = useState(initialName);
  useImperativeHandle(ref, () => ({ getValue: () => name }));
  return (
    <label className="field">
      新标准名称
      <input value={name} onChange={(event) => setName(event.target.value)} />
    </label>
  );
});

const UploadSampleForm = forwardRef(function UploadSampleForm({ sop }, ref) {
  const [form, setForm] = useState({
    fileName: "",
    timeRange: "00:00–00:15",
    label: sop.steps[0]?.id || "Other",
    note: "",
  });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="form-stack">
      <p className="hint">
        <LockOutlined />{" "}
        只能选择教师已定义的步骤或“其他动作”，上传不会新增或改写实训标准步骤。
      </p>
      <label className="field">
        选择视频文件
        <input
          type="file"
          accept="video/*"
          onChange={(event) =>
            update("fileName", event.target.files?.[0]?.name || form.fileName)
          }
        />
      </label>
      <label className="field">
        视频文件名（也可手工填写演示文件）
        <input
          placeholder="例如 station-03-clip.mp4"
          value={form.fileName}
          onChange={(event) => update("fileName", event.target.value)}
        />
      </label>
      <div className="form-row">
        <label className="field">
          片段时间
          <input
            value={form.timeRange}
            onChange={(event) => update("timeRange", event.target.value)}
          />
        </label>
        <label className="field">
          动作标签
          <select
            value={form.label}
            onChange={(event) => update("label", event.target.value)}
          >
            {sop.steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.id} · {step.name}
              </option>
            ))}
            <option value="Other">其他动作 · 非标准动作／遮挡／停顿</option>
          </select>
        </label>
      </div>
      <label className="field">
        标注说明
        <textarea
          value={form.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </label>
    </div>
  );
});

const SourceVideoForm = forwardRef(function SourceVideoForm(_, ref) {
  const [form, setForm] = useState({
    fileName: "",
    duration: "03:00",
    source: "标准示教采集",
    note: "",
  });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="form-stack">
      <p className="hint">
        源视频是数据生产的源文件。系统按源视频分配训练集／验证集／测试集，避免同一视频拆帧后跨集合泄漏。
      </p>
      <label className="field">
        选择源视频
        <input
          type="file"
          accept="video/*"
          onChange={(event) =>
            update("fileName", event.target.files?.[0]?.name || form.fileName)
          }
        />
      </label>
      <div className="form-row">
        <label className="field">
          文件名
          <input
            placeholder="例如 station-a02-round2.mp4"
            value={form.fileName}
            onChange={(event) => update("fileName", event.target.value)}
          />
        </label>
        <label className="field">
          时长（mm:ss）
          <input
            value={form.duration}
            onChange={(event) => update("duration", event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        数据来源
        <select
          value={form.source}
          onChange={(event) => update("source", event.target.value)}
        >
          <option>标准示教采集</option>
          <option>专项补采</option>
          <option>历史录像</option>
        </select>
      </label>
      <label className="field">
        采集说明
        <textarea
          value={form.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </label>
    </div>
  );
});

const TimeRangeAnnotationForm = forwardRef(function TimeRangeAnnotationForm(
  { sourceVideo, mapping },
  ref,
) {
  const firstItem = mapping?.evaluationItems?.[0];
  const [form, setForm] = useState({
    sourceVideoId: sourceVideo.id,
    startTime: "00:00",
    endTime: "00:10",
    evaluationItemId: firstItem?.id || "",
    machineEventId: firstItem?.machineEventIds?.[0] || "",
    annotationType: "action",
  });
  const selectedItem = mapping?.evaluationItems?.find(
    (item) => item.id === form.evaluationItemId,
  );
  const events = (mapping?.machineEvents || []).filter((event) =>
    selectedItem?.machineEventIds?.includes(event.id),
  );
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectItem = (value) => {
    const item = mapping.evaluationItems.find((entry) => entry.id === value);
    setForm((current) => ({
      ...current,
      evaluationItemId: value,
      machineEventId: item?.machineEventIds?.[0] || "",
    }));
  };
  return (
    <div className="form-stack">
      <div className="definition-list">
        <span>
          <small>源视频</small>
          <strong>{sourceVideo.fileName}</strong>
        </span>
        <span>
          <small>视频时长</small>
          <strong>{sourceVideo.duration}</strong>
        </span>
      </div>
      <div className="form-row">
        <label className="field">
          开始时间（mm:ss）
          <input
            value={form.startTime}
            onChange={(event) => update("startTime", event.target.value)}
          />
        </label>
        <label className="field">
          结束时间（mm:ss）
          <input
            value={form.endTime}
            onChange={(event) => update("endTime", event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        评价项
        <select
          value={form.evaluationItemId}
          onChange={(event) => selectItem(event.target.value)}
        >
          {(mapping?.evaluationItems || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.stepId} · {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label className="field">
          机器事实
          <select
            value={form.machineEventId}
            onChange={(event) => update("machineEventId", event.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          标注方式
          <select
            value={form.annotationType}
            onChange={(event) => update("annotationType", event.target.value)}
          >
            <option value="action">动作区间标注</option>
            <option value="detect">目标框选标注</option>
          </select>
        </label>
      </div>
    </div>
  );
});

const AnnotationForm = forwardRef(function AnnotationForm({ range }, ref) {
  const [form, setForm] = useState({
    timeRangeId: range.id,
    type: range.annotationType || "action",
    label: range.label || "",
    bboxSummary: "",
    note: "",
  });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="form-stack">
      <div className="definition-list">
        <span>
          <small>动作片段</small>
          <strong>
            {range.startTime}–{range.endTime}
          </strong>
        </span>
        <span>
          <small>机器事实</small>
          <strong>{range.label}</strong>
        </span>
      </div>
      <label className="field">
        标注标签
        <input
          value={form.label}
          onChange={(event) => update("label", event.target.value)}
        />
      </label>
      {form.type === "detect" && (
        <label className="field">
          框选摘要
          <input
            placeholder="例如：抽取 8 帧，完成双手区域框选"
            value={form.bboxSummary}
            onChange={(event) => update("bboxSummary", event.target.value)}
          />
        </label>
      )}
      <label className="field">
        标注说明
        <textarea
          value={form.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </label>
    </div>
  );
});

const AnnotationReviewForm = forwardRef(function AnnotationReviewForm(
  { annotation },
  ref,
) {
  const [form, setForm] = useState({ decision: "pass", note: "" });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  return (
    <div className="form-stack">
      <div className="definition-list">
        <span>
          <small>标注标签</small>
          <strong>{annotation.label}</strong>
        </span>
        <span>
          <small>标注类型</small>
          <strong>
            {annotation.type === "detect" ? "目标框选" : "动作区间"}
          </strong>
        </span>
      </div>
      <label className="field">
        审核结论
        <select
          value={form.decision}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              decision: event.target.value,
            }))
          }
        >
          <option value="pass">通过，可纳入数据集</option>
          <option value="reject">退回修改</option>
        </select>
      </label>
      <label className="field">
        审核说明
        <textarea
          value={form.note}
          onChange={(event) =>
            setForm((current) => ({ ...current, note: event.target.value }))
          }
        />
      </label>
    </div>
  );
});

const ReviewSampleForm = forwardRef(function ReviewSampleForm(
  { sample, sop, acceptLabel = "纳入下一版数据集" },
  ref,
) {
  const [form, setForm] = useState({
    decision: "accept",
    label: sample.label,
    note: sample.note || "",
  });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="form-stack">
      <div className="definition-list">
        <span>
          <small>视频片段</small>
          <strong>{sample.fileName}</strong>
        </span>
        <span>
          <small>AI 原判</small>
          <strong>{sample.aiPrediction}</strong>
        </span>
        <span>
          <small>时间范围</small>
          <strong>{sample.timeRange}</strong>
        </span>
        <span>
          <small>纠正原因</small>
          <strong>{displayBusinessText(sample.reason)}</strong>
        </span>
      </div>
      <div className="form-row">
        <label className="field">
          复核结论
          <select
            value={form.decision}
            onChange={(event) => update("decision", event.target.value)}
          >
            <option value="accept">{acceptLabel}</option>
            <option value="reject">拒绝样本</option>
          </select>
        </label>
        <label className="field">
          确认标签
          <select
            value={form.label}
            onChange={(event) => update("label", event.target.value)}
          >
            {sop.steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.id} · {step.name}
              </option>
            ))}
            <option value="Other">其他动作</option>
          </select>
        </label>
      </div>
      <label className="field">
        复核说明
        <textarea
          value={form.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </label>
    </div>
  );
});

function SopList() {
  const nav = useNavigate();
  const store = usePrototypeData();
  const { data } = store;
  const [tab, setTab] = useState("mine"),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("全部"),
    [aiFilter, setAiFilter] = useState("全部");
  const visible = data.sops.filter((sop) => {
    const aiStatus = getSopAiConfigurationSummary(data, sop).status;
    return (
      (tab === "school" ||
        sop.owner ===
          (store.teacherId === "t1" ? "王老师" : store.teacherName)) &&
      (statusFilter === "全部" || sop.status === statusFilter) &&
      (aiFilter === "全部" || aiStatus === aiFilter) &&
      `${sop.name} ${sop.major || ""} ${sop.course || ""} ${sop.owner}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });
  const rows = visible.map((sop) => [
    sop.name,
    `${sop.major || "未设置专业"}${sop.course ? ` / ${sop.course}` : ""}`,
    sop.owner,
    sop.status,
    `${(sop.steps || []).length} 步`,
    getSopAiConfigurationSummary(data, sop).status,
    sop.updatedAt,
  ]);
  return (
    <>
      <PageHeader
        title="实训标准库"
        subtitle="以标准操作流程（SOP）为基础，管理教学要求与评价规则。"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav("/teacher/sop/new")}
          >
            创建实训标准
          </Button>
        }
      />
      <div className="tabs" role="tablist" aria-label="标准范围">
        <button
          role="tab"
          aria-selected={tab === "mine"}
          className={tab === "mine" ? "active" : ""}
          onClick={() => setTab("mine")}
        >
          我的标准
        </button>
        <button
          role="tab"
          aria-selected={tab === "school"}
          className={tab === "school" ? "active" : ""}
          onClick={() => setTab("school")}
        >
          全校标准
        </button>
      </div>
      <section className="panel panel--table">
        <div className="list-toolbar sop-list-toolbar">
          <div className="search">
            <SearchOutlined />
            <input
              aria-label="搜索实训标准"
              placeholder="搜索标准名称、专业、课程或创建教师"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="标准状态"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {["全部", "草稿", "已发布", "已停用"].map((item) => (
              <option key={item} value={item}>
                {item === "全部" ? "全部状态" : item}
              </option>
            ))}
          </select>
          <select
            aria-label="AI评价"
            value={aiFilter}
            onChange={(event) => setAiFilter(event.target.value)}
          >
            {["全部", "—", "未配置", "配置中", "待验证", "已启用"].map(
              (item) => (
                <option key={item} value={item}>
                  {item === "全部" ? "全部AI评价" : item}
                </option>
              ),
            )}
          </select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setQuery("");
              setStatusFilter("全部");
              setAiFilter("全部");
            }}
          >
            刷新
          </Button>
        </div>
        <DataTable
          pagination
          columns={[
            "标准名称",
            "所属专业 / 课程",
            "创建教师",
            "标准状态",
            "步骤",
            "AI评价",
            "更新时间",
          ]}
          rows={rows}
          statusColumns={[3, 5]}
          viewLabel={(row) => (row[3] === "草稿" ? "继续编辑" : "查看")}
          rowKey={(_, index) => visible[index].id}
          onView={(_, index) => {
            const sop = visible[index];
            if (!sop) return;
            nav(
              sop.status === "草稿"
                ? `/teacher/sop/edit/${sop.id}`
                : `/teacher/sop/${sop.id}`,
            );
          }}
        />
      </section>
    </>
  );
}

function StandardMediaPreview({ step }) {
  return <StandardMediaList step={step} showEmpty={false} />;
}

function ReadonlyBusinessRules({ sop, step }) {
  const scoreRules = (sop.scoreRules || []).filter(
    (rule) => rule.stepId === step.id,
  );
  const safetyRules = (sop.safetyRules || []).filter(
    (rule) => rule.stepId === step.id,
  );
  const flowLabels = {
    allow: "允许并记录",
    teacher_review: "教师确认",
    apply_score_rule: "应用评分规则",
    record_only: "仅记录超时",
  };
  const ruleName = (id) =>
    scoreRules.find((rule) => rule.id === id)?.name || id || "—";
  return (
    <div className="readonly-business-rules">
      <section>
        <h3>评分规则</h3>
        {scoreRules.map((rule) => (
          <article key={rule.id}>
            <span>
              <code>{rule.id}</code>
              <strong>{rule.name}</strong>
            </span>
            <small>
              {SCORE_RULE_TYPES[rule.type] || rule.type} ·{" "}
              {SCORE_DEDUCTION_MODES[rule.deductionMode] || rule.deductionMode}
              {rule.deductionMode === "fixed_deduction"
                ? ` ${rule.deductionValue} 分`
                : ""}{" "}
              · 最多 {rule.maxTriggerCount} 次
            </small>
            <p>
              {CORRECTION_TREATMENTS[rule.correctionTreatment] ||
                rule.correctionTreatment}
              {rule.correctionTreatment === "reduce_after_correction"
                ? `，纠正后扣 ${rule.correctedDeductionValue} 分`
                : ""}
              {rule.description ? `；${rule.description}` : ""}
            </p>
          </article>
        ))}
        {!scoreRules.length && (
          <p className="hint">本步骤暂无结构化评分规则。</p>
        )}
        {step.legacyScoringNote && (
          <div className="legacy-rule-note">
            <AlertOutlined />
            <span>
              <strong>历史评分补充说明</strong>
              <small>{step.legacyScoringNote}</small>
            </span>
          </div>
        )}
      </section>
      <section>
        <h3>安全规则</h3>
        {safetyRules.map((rule) => (
          <article key={rule.id}>
            <span>
              <code>{rule.id}</code>
              <strong>{rule.name}</strong>
            </span>
            <small>
              {SAFETY_SESSION_TREATMENTS[rule.sessionTreatment]} ·{" "}
              {SAFETY_SCORE_TREATMENTS[rule.scoreTreatment]}
              {rule.scoreTreatment === "fixed_deduction"
                ? ` ${rule.deductionValue} 分`
                : ""}
            </small>
            <p>{rule.violationCondition}</p>
          </article>
        ))}
        {!safetyRules.length && (
          <p className="hint">本步骤暂无结构化安全规则。</p>
        )}
        {step.legacySafetyNote && (
          <div className="legacy-rule-note legacy-rule-note--danger">
            <AlertOutlined />
            <span>
              <strong>历史安全红线说明</strong>
              <small>{step.legacySafetyNote}</small>
            </span>
          </div>
        )}
      </section>
      <details className="business-rule-details">
        <summary>流程规则</summary>
        <div className="definition-list">
          {[
            ["wrongOrder", "顺序错误"],
            ["repeat", "重复操作"],
            ["timeout", "操作超时"],
          ].map(([key, label]) => {
            const action = step.flowPolicy?.[key] || {};
            return (
              <span key={key}>
                <small>{label}</small>
                <strong>
                  {flowLabels[action.treatment] || "教师确认"}
                  {action.scoreRuleId
                    ? ` · ${ruleName(action.scoreRuleId)}`
                    : ""}
                </strong>
              </span>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function SopDetail({ setModal }) {
  const nav = useNavigate(),
    { id } = useParams(),
    store = usePrototypeData();
  const sop = store.data.sops.find((item) => item.id === id);
  const aiSummary = getSopAiConfigurationSummary(store.data, sop);
  const aiConfig = aiSummary.config;
  const [tab, setTab] = useState("overview");
  const [selectedStep, setSelectedStep] = useState(0);
  const activeStep = sop?.steps[selectedStep] || sop?.steps[0];
  const judgementCounts = (sop?.steps || []).reduce(
    (counts, step) => ({
      ...counts,
      [step.expectedJudgementMode || step.judgementMode]:
        (counts[step.expectedJudgementMode || step.judgementMode] || 0) + 1,
    }),
    {},
  );
  const structuredSafetyCount = (sop?.safetyRules || []).length;
  const legacySafetyCount = (sop?.steps || []).filter(
    (step) =>
      step.legacySafetyNote &&
      !(sop?.safetyRules || []).some((rule) => rule.stepId === step.id),
  ).length;
  const copyRef = useRef(null);
  if (!sop)
    return (
      <MissingState title="实训标准不存在或已失效" backTo="/teacher/sop" />
    );
  const copy = () =>
    setModal({
      title: "复制为独立实训标准",
      content: (
        <CopySopForm ref={copyRef} initialName={`${sop.name}（副本）`} />
      ),
      confirmText: "创建副本",
      onConfirm: () => {
        const created = store.copySop(sop.id, copyRef.current.getValue());
        window.setTimeout(() => nav(`/teacher/sop/edit/${created.id}`), 0);
        return `已创建 ${created.name}`;
      },
    });
  const deactivate = () =>
    setModal({
      title: "停用实训标准",
      className: "teacher-sop-deactivate-modal",
      content: (
        <p>
          停用后该实训标准不再用于新建练习、考试和新的 AI
          配置；已有历史记录不受影响。
        </p>
      ),
      confirmText: "确认停用",
      onConfirm: () => {
        store.deactivateSop(sop.id);
        return `${sop.name} 已停用`;
      },
    });
  return (
    <>
      <PageHeader
        back
        title={sop.name}
        subtitle={`${sop.status} · 责任教师：${sop.owner} · ${sop.publishedAt || sop.updatedAt}`}
        actions={
          <>
            {["草稿", "已发布", "已停用"].includes(sop.status) && (
              <Button onClick={() => nav(`/teacher/sop/edit/${sop.id}`)}>
                {sop.status === "草稿" ? "编辑草稿" : "编辑标准"}
              </Button>
            )}
            {["已发布", "已停用"].includes(sop.status) && (
              <Button onClick={copy}>复制创建</Button>
            )}
            {sop.status === "已发布" && (
              <Button onClick={deactivate}>停用</Button>
            )}
            {sop.status === "已发布" && (
              <Button
                onClick={() =>
                  nav("/teacher/practices/new", { state: { sopId: sop.id } })
                }
              >
                创建练习
              </Button>
            )}
            {sop.status === "已发布" && (
              <Button
                type="primary"
                onClick={() =>
                  nav("/teacher/exams/new", { state: { sopId: sop.id } })
                }
              >
                创建考试
              </Button>
            )}
          </>
        }
      />
      <section className="sop-boundary-note">
        <LockOutlined />
        <div>
          <strong>
            {sop.status === "草稿"
              ? "草稿可继续编辑"
              : `${sop.status} · 当前内容可编辑`}
          </strong>
          <p>
            修改会覆盖当前实训标准；已有安排和会话继续使用当时保存的标准快照。步骤或评分要求变化后，相关AI配置需要核对并重新验证。
          </p>
        </div>
        <Status tone="success">
          {sop.signedBy ? `${sop.signedBy} 已签名` : "待签名"}
        </Status>
      </section>
      <div className="detail-grid sop-top-metrics">
        <Metric
          label="操作步骤"
          value={`${(sop.steps || []).length} 步`}
          hint="固定步骤编号"
          icon={<BookOutlined />}
        />
        <Metric
          label="总分"
          value={`${(sop.steps || []).reduce((sum, step) => sum + Number(step.score || 0), 0)} 分`}
          hint="教师评分标准"
          icon={<FileTextOutlined />}
        />
        <Metric
          label="标准耗时"
          value={sop.standardDuration}
          hint="不直接参与扣分"
          icon={<ClockCircleOutlined />}
        />
        <Metric
          label="安全规则"
          value={`${structuredSafetyCount + legacySafetyCount} 项`}
          hint={
            legacySafetyCount
              ? `${structuredSafetyCount} 项结构化 · ${legacySafetyCount} 项历史说明`
              : "由教师定义处置标准"
          }
          icon={<AlertOutlined />}
          tone="warning"
        />
        <Metric
          label="AI评价"
          value={aiSummary.status}
          hint="与实训标准发布相互独立"
          icon={<VideoCameraOutlined />}
          tone={aiSummary.status === "已启用" ? "success" : "warning"}
        />
      </div>
      <div
        className="tabs sop-detail-tabs sop-standard-detail-tabs"
        role="tablist"
        aria-label="实训标准详情"
      >
        {[
          ["overview", "标准概览"],
          ["steps", "步骤与评价"],
          ["ai", "AI评价能力"],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <section className="panel sop-overview-panel">
          <PanelTitle title="标准概览" />
          <div className="definition-list sop-detail-overview">
            <span>
              <small>所属专业</small>
              <strong>{sop.major || "未设置"}</strong>
            </span>
            <span>
              <small>适用课程</small>
              <strong>{sop.course || "—"}</strong>
            </span>
            <span>
              <small>适用操作</small>
              <strong>{sop.operation}</strong>
            </span>
            <span>
              <small>标准依据</small>
              <strong>{sop.basis}</strong>
            </span>
            <span>
              <small>适用实训环境</small>
              <strong>{sop.conditions}</strong>
            </span>
          </div>
          <PanelTitle title="操作流程预览" />
          <div className="sop-flow-preview">
            {(sop.steps || []).map((step, index) => (
              <span key={step.id}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <strong>{step.name}</strong>
                <small>{step.timeout}</small>
              </span>
            ))}
          </div>
        </section>
      )}
      {tab === "steps" && activeStep && (
        <div className="rule-layout sop-readonly-layout">
          <aside className="panel rule-steps">
            <PanelTitle title="操作步骤" />
            {(sop.steps || []).map((step, index) => (
              <button
                className={index === selectedStep ? "active" : ""}
                key={step.id}
                onClick={() => setSelectedStep(index)}
              >
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{step.name}</span>
                <small>{step.id} · 线性必做</small>
              </button>
            ))}
          </aside>
          <section className="panel rule-editor">
            <PanelTitle
              title={`${activeStep.id} · ${activeStep.name}`}
              action={
                <Status>
                  {
                    JUDGEMENT_MODES[
                      activeStep.expectedJudgementMode ||
                        activeStep.judgementMode
                    ]?.label
                  }
                </Status>
              }
            />
            <div className="definition-list sop-step-readonly">
              <span>
                <small>步骤类型</small>
                <strong>线性必做</strong>
              </span>
              <span>
                <small>前置步骤</small>
                <strong>{activeStep.predecessor}</strong>
              </span>
              <span>
                <small>建议时间</small>
                <strong>{activeStep.timeout}</strong>
              </span>
              <span>
                <small>分值</small>
                <strong>{activeStep.score} 分</strong>
              </span>
              <span>
                <small>标准操作说明</small>
                <strong>{activeStep.teachingInstruction}</strong>
              </span>
              <span>
                <small>操作要点</small>
                <strong>{activeStep.keyPoints}</strong>
              </span>
              <span>
                <small>常见错误</small>
                <strong>{activeStep.commonMistakes || "—"}</strong>
              </span>
              <span>
                <small>完成条件</small>
                <strong>{activeStep.completionCondition}</strong>
              </span>
              <span>
                <small>未完成计分</small>
                <strong>
                  {INCOMPLETE_POLICIES[activeStep.incompletePolicy]?.label ||
                    "历史标准未明确"}
                </strong>
              </span>
              <span>
                <small>视频评价限制</small>
                <strong>
                  {(activeStep.expectedJudgementMode ||
                    activeStep.judgementMode) === "visual_auto"
                    ? "—"
                    : activeStep.knownLimit}
                </strong>
              </span>
              <span>
                <small>评价证据要求</small>
                <strong>{activeStep.evidence || "无需视频证据"}</strong>
              </span>
            </div>
            <RequirementsView step={activeStep} />
            <StandardMediaPreview step={activeStep} />
            <ReadonlyBusinessRules sop={sop} step={activeStep} />
          </section>
        </div>
      )}
      {tab === "ai" && (
        <section className="panel sop-ai-detail-panel">
          <div className="ai-capability-hero">
            <div>
              <small>当前实际 AI评价能力</small>
              <h2>{aiSummary.status}</h2>
              <p>
                当前 {sop.steps.length} 个步骤中，
                {judgementCounts.visual_auto || 0} 个期望自动评价，
                {judgementCounts.visual_assist_default_pass || 0}{" "}
                个期望AI辅助评价，
                {judgementCounts.default_pass_manual_deduction || 0}{" "}
                个由教师评价。教师选择表示业务期望；具体AI判断由管理员在AI能力配置中完成。
              </p>
            </div>
            <div className="inline-actions">
              <Status
                tone={aiSummary.status === "已启用" ? "success" : "warning"}
              >
                {aiSummary.status}
              </Status>
            </div>
          </div>
          <div className="definition-list ai-capability-summary">
            <span>
              <small>AI能力配置</small>
              <strong>{aiSummary.status}</strong>
            </span>
            <span>
              <small>完成判断项</small>
              <strong>
                {aiConfig?.judgementItems?.filter((item) =>
                  item.purposes?.includes("completion"),
                ).length || 0}{" "}
                项
              </strong>
            </span>
            <span>
              <small>评分依据项</small>
              <strong>
                {aiConfig?.judgementItems?.filter((item) =>
                  item.purposes?.includes("scoring"),
                ).length || 0}{" "}
                项
              </strong>
            </span>
            <span>
              <small>安全提醒项</small>
              <strong>
                {aiConfig?.judgementItems?.filter((item) =>
                  item.purposes?.includes("safety"),
                ).length || 0}{" "}
                项
              </strong>
            </span>
            <span>
              <small>引用AI能力</small>
              <strong>{aiSummary.capabilityCount} 个</strong>
            </span>
            <span>
              <small>工位运行</small>
              <strong>
                {aiSummary.runnableWorkstationCount}/
                {aiSummary.workstationCount} 个可运行
              </strong>
            </span>
          </div>
          <DataTable
            pagination
            columns={["步骤", "教师标准设定", "当前实际能力", "状态说明"]}
            statusColumns={[]}
            rows={sop.steps.map((step) => {
              const expectedMode =
                step.expectedJudgementMode || step.judgementMode;
              const expected = JUDGEMENT_MODES[expectedMode]?.label || "未配置";
              const stepConfig = aiConfig?.stepConfigs?.find(
                (item) => item.stepId === step.id,
              );
              const items = (aiConfig?.judgementItems || []).filter(
                (item) => item.stepId === step.id,
              );
              const capabilityCount = new Set(
                items.flatMap((item) =>
                  (item.conditions || [])
                    .map((condition) => condition.capabilityId)
                    .filter(Boolean),
                ),
              ).size;
              const actual = stepConfig?.actualEvaluationMode
                ? AI_ACTUAL_EVALUATION_MODES[stepConfig.actualEvaluationMode] ||
                  "未配置"
                : "未配置";
              const reason = items.length
                ? `${items.length} 个AI判断项 · 引用 ${capabilityCount} 个AI能力`
                : stepConfig?.actualEvaluationMode ===
                    "default_pass_manual_deduction"
                  ? stepConfig.downgradeReason || "由教师依据实训标准评价"
                  : "尚未形成可用的AI判断配置";
              return [`${step.id} · ${step.name}`, expected, actual, reason];
            })}
          />
        </section>
      )}
    </>
  );
}

function SopEditor({ setModal }) {
  const nav = useNavigate(),
    location = useLocation(),
    { id } = useParams(),
    store = usePrototypeData();
  const source = id ? store.data.sops.find((item) => item.id === id) : null;
  const [draft, setDraft] = useState(() =>
    JSON.parse(
      JSON.stringify(
        source || {
          ...emptySopDraft(),
          owner: store.teacherId === "t1" ? "王老师" : store.teacherName,
        },
      ),
    ),
  );
  const [stage, setStage] = useState(() =>
      Math.min(3, Math.max(0, Number(location.state?.stage || 0))),
    ),
    [selectedRuleStep, setSelectedRuleStep] = useState(0),
    [dirty, setDirty] = useState(false),
    [signature, setSignature] = useState(""),
    [signed, setSigned] = useState(false),
    [saveError, setSaveError] = useState("");
  const editingCurrent = Boolean(source && source.status !== "草稿");
  const stages = [
    "基本信息",
    "操作步骤",
    "评价规则",
    editingCurrent ? "检查并保存" : "检查并发布",
  ];
  const active = draft.steps[selectedRuleStep] || draft.steps[0];
  const issues = validateSopDraft(draft);
  const totalScore = draft.steps.reduce(
    (sum, step) => sum + Number(step.score || 0),
    0,
  );
  const judgementCounts = draft.steps.reduce(
    (counts, step) => ({
      ...counts,
      [step.expectedJudgementMode || step.judgementMode]:
        (counts[step.expectedJudgementMode || step.judgementMode] || 0) + 1,
    }),
    {},
  );
  const activeScoreRules = (draft.scoreRules || []).filter(
    (rule) => rule.stepId === active?.id,
  );
  const activeSafetyRules = (draft.safetyRules || []).filter(
    (rule) => rule.stepId === active?.id,
  );
  const linearizeSteps = (steps) =>
    steps.map((step, index) => ({
      ...step,
      predecessor: index === 0 ? "无" : steps[index - 1].id,
    }));
  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const updateStep = (key, value) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, index) =>
        index === selectedRuleStep ? { ...step, [key]: value } : step,
      ),
    }));
    setDirty(true);
  };
  const updateStepFields = (fields) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, index) =>
        index === selectedRuleStep ? { ...step, ...fields } : step,
      ),
    }));
    setDirty(true);
  };
  const mediaBusyRef = useRef(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const updateStepMedia = (stepId, items) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              standardMedia: items,
              standardMediaType: "无",
              standardMediaName: "",
              standardMediaUrl: "",
            }
          : step,
      ),
    }));
    setDirty(true);
  };
  const setMediaUploading = (busy) => {
    mediaBusyRef.current = busy;
    setMediaBusy(busy);
  };
  const updateJudgementMode = (value) => {
    const defaultLimits = {
      visual_auto: "关键动作和目标区域需要持续出现在画面内。",
      visual_assist_default_pass:
        "遮挡、低置信度或录像缺失时不做负向推断，系统默认通过并提示抽查。",
      default_pass_manual_deduction:
        "该要求无法仅凭摄像头画面可靠确认，系统默认通过；教师发现问题后可留痕扣分。",
    };
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, index) =>
        index === selectedRuleStep
          ? {
              ...step,
              expectedJudgementMode: value,
              judgementMode: value,
              knownLimit: defaultLimits[value],
            }
          : step,
      ),
    }));
    setDirty(true);
  };
  const addScoreRule = () => {
    const rules = draft.scoreRules || [];
    const idValue = nextBusinessRuleId({
      rules,
      stepId: active.id,
      prefix: "SR",
    });
    updateDraft("scoreRules", [
      ...rules,
      createScoreRuleDraft({ id: idValue, stepId: active.id }),
    ]);
  };
  const updateScoreRule = (idValue, key, value) =>
    updateDraft(
      "scoreRules",
      (draft.scoreRules || []).map((rule) =>
        rule.id === idValue ? { ...rule, [key]: value } : rule,
      ),
    );
  const removeScoreRule = (idValue) => {
    updateDraft(
      "scoreRules",
      (draft.scoreRules || []).filter((rule) => rule.id !== idValue),
    );
    updateStepFields({
      flowPolicy: {
        ...active.flowPolicy,
        ...Object.fromEntries(
          Object.entries(active.flowPolicy || {}).map(([key, action]) => [
            key,
            action.scoreRuleId === idValue
              ? {
                  ...action,
                  treatment:
                    key === "timeout" ? "record_only" : "teacher_review",
                  scoreRuleId: "",
                }
              : action,
          ]),
        ),
      },
    });
  };
  const addSafetyRule = () => {
    const rules = draft.safetyRules || [];
    const idValue = nextBusinessRuleId({
      rules,
      stepId: active.id,
      prefix: "SAFE",
    });
    updateDraft("safetyRules", [
      ...rules,
      createSafetyRuleDraft({ id: idValue, stepId: active.id }),
    ]);
  };
  const updateSafetyRule = (idValue, key, value) =>
    updateDraft(
      "safetyRules",
      (draft.safetyRules || []).map((rule) =>
        rule.id === idValue ? { ...rule, [key]: value } : rule,
      ),
    );
  const removeSafetyRule = (idValue) =>
    updateDraft(
      "safetyRules",
      (draft.safetyRules || []).filter((rule) => rule.id !== idValue),
    );
  const updateFlowPolicy = (key, field, value) =>
    updateStepFields({
      flowPolicy: {
        ...active.flowPolicy,
        [key]: { ...active.flowPolicy?.[key], [field]: value },
      },
    });
  const persistDraft = () => {
    if (mediaBusyRef.current) throw new Error("资料正在添加，请完成后再保存。");
    const saved = id
      ? store.updateSopDraft(id, draft)
      : store.createSopDraft(draft);
    setDraft(JSON.parse(JSON.stringify(saved)));
    setDirty(false);
    setSaveError("");
    return saved;
  };
  const save = () =>
    setModal({
      title: editingCurrent ? "保存实训标准修改" : "保存实训标准草稿",
      className: "teacher-sop-save-modal",
      content: (
        <p>
          {editingCurrent
            ? "将覆盖当前标准内容，历史快照和已有会话保持原样；步骤或评分规则变化后，相关AI配置需重新核对并验证。"
            : "保存当前实训标准草稿。"}
        </p>
      ),
      confirmText: editingCurrent ? "确认保存修改" : "保存草稿",
      onConfirm: () => {
        const saved = persistDraft();
        if (!id)
          window.setTimeout(
            () =>
              nav(`/teacher/sop/edit/${saved.id}`, {
                replace: true,
                state: { stage },
              }),
            0,
          );
        return `${saved.name} ${editingCurrent ? "修改已保存" : "草稿已保存"}`;
      },
    });
  const goToStage = (target) => {
    if (mediaBusyRef.current) {
      setSaveError("资料正在添加，请完成后再切换步骤。");
      return;
    }
    if (target <= stage) {
      setStage(target);
      return;
    }
    if (editingCurrent) {
      setStage(target);
      return;
    }
    try {
      const saved = persistDraft();
      if (!id)
        window.setTimeout(
          () =>
            nav(`/teacher/sop/edit/${saved.id}`, {
              replace: true,
              state: { stage: target },
            }),
          0,
        );
      else setStage(target);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "草稿保存失败。");
    }
  };
  const publish = () =>
    setModal({
      title: "签名并发布实训标准",
      content: (
        <p>
          发布后可用于新建教学安排，后续修改覆盖当前内容；已有安排保留当时快照。AI评价能力独立配置，未就绪时按教师规则降级。
        </p>
      ),
      confirmText: "确认发布",
      onConfirm: () => {
        if (!id) throw new Error("请先保存草稿，再执行签名发布。");
        if (issues.length)
          throw new Error(`仍有 ${issues.length} 项校验问题，请返回修正。`);
        if (!signed || !signature.trim())
          throw new Error("请填写教师姓名并勾选签名确认。");
        const published = store.publishSop(id, draft, signature);
        window.setTimeout(() => nav(`/teacher/sop/${published.id}`), 0);
        return `${published.name} 已发布`;
      },
    });
  const moveStep = (offset) => {
    const target = selectedRuleStep + offset;
    if (target < 0 || target >= draft.steps.length) return;
    const steps = [...draft.steps];
    [steps[selectedRuleStep], steps[target]] = [
      steps[target],
      steps[selectedRuleStep],
    ];
    updateDraft("steps", linearizeSteps(steps));
    setSelectedRuleStep(target);
  };
  const addStep = () => {
    const idValue = nextStableStepId({
      steps: draft.steps,
      usedStepIds: draft.usedStepIds || [],
    });
    setDraft((current) => ({
      ...current,
      steps: [
        ...current.steps,
        createSopStepDraft({
          id: idValue,
          predecessor: current.steps.at(-1)?.id || "无",
          score: 10,
        }),
      ],
      usedStepIds: [
        ...new Set([
          ...(current.usedStepIds || current.steps.map((step) => step.id)),
          idValue,
        ]),
      ],
    }));
    setDirty(true);
    setSelectedRuleStep(draft.steps.length);
  };
  const removeStep = () => {
    if (draft.steps.length === 1) return;
    const removed = active.id;
    const steps = linearizeSteps(
      draft.steps.filter((_, index) => index !== selectedRuleStep),
    );
    setDraft((current) => ({
      ...current,
      steps,
      scoreRules: (current.scoreRules || []).filter(
        (rule) => rule.stepId !== removed,
      ),
      safetyRules: (current.safetyRules || []).filter(
        (rule) => rule.stepId !== removed,
      ),
    }));
    setDirty(true);
    setSelectedRuleStep(Math.max(0, selectedRuleStep - 1));
  };
  const deleteDraft = () =>
    setModal({
      title: "删除实训标准草稿",
      className: "teacher-sop-delete-modal",
      content: (
        <p>
          确认删除“{source?.name}
          ”？删除后草稿无法恢复，已发布标准及历史安排不受影响。
        </p>
      ),
      confirmText: "确认删除",
      onConfirm: () => {
        store.deleteSopDraft(id);
        window.setTimeout(() => nav("/teacher/sop"), 0);
        return "实训标准草稿已删除";
      },
    });
  if (id && (!source || !["草稿", "已发布", "已停用"].includes(source.status)))
    return (
      <Navigate to={source ? `/teacher/sop/${id}` : "/teacher/sop"} replace />
    );
  return (
    <>
      <PageHeader
        back
        title={`${id ? "编辑" : "创建"}实训标准：${draft.name || "未命名标准"}`}
        subtitle={`${dirty ? "有未保存更改" : id ? `最近保存 ${draft.updatedAt}` : "尚未保存"} · 步骤编号在当前标准内稳定`}
        actions={
          <>
            {id && !editingCurrent && (
              <Button disabled={mediaBusy} onClick={deleteDraft}>
                删除草稿
              </Button>
            )}
            <Button disabled={mediaBusy} onClick={save}>
              {editingCurrent ? "保存修改" : "保存草稿"}
            </Button>
            <Button
              type="primary"
              disabled={mediaBusy}
              onClick={() =>
                stage < 3
                  ? goToStage(stage + 1)
                  : editingCurrent
                    ? save()
                    : publish()
              }
            >
              {stage < 3
                ? "下一步"
                : editingCurrent
                  ? "确认保存修改"
                  : "签名并发布"}
            </Button>
          </>
        }
      />
      <div className="stepper">
        {stages.map((name, index) => (
          <button
            key={name}
            className={index === stage ? "active" : index < stage ? "done" : ""}
            onClick={() => goToStage(index)}
          >
            <b>{index < stage ? "✓" : index + 1}</b>
            <span>{name}</span>
          </button>
        ))}
      </div>
      {saveError && (
        <p className="form-error sop-save-error" role="alert">
          <ExclamationCircleFilled /> {saveError}
        </p>
      )}
      {stage === 0 && (
        <div className="editor-grid sop-basic-layout">
          <section className="panel">
            <PanelTitle title="基本信息" />
            <label className="field">
              标准名称
              <input
                maxLength={50}
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
              />
            </label>
            <div className="form-row">
              <label className="field">
                所属专业
                <select
                  value={draft.major || "新能源汽车技术"}
                  onChange={(event) => updateDraft("major", event.target.value)}
                >
                  {[
                    "新能源汽车技术",
                    "汽车检测与维修技术",
                    "机电一体化技术",
                    "工业机器人技术",
                    "数控技术",
                    "其他",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <FieldLabel>适用课程</FieldLabel>
                <input
                  value={draft.course || ""}
                  onChange={(event) =>
                    updateDraft("course", event.target.value)
                  }
                />
              </label>
            </div>
            <label className="field">
              适用操作
              <textarea
                value={draft.operation}
                onChange={(event) =>
                  updateDraft("operation", event.target.value)
                }
              />
            </label>
            <label className="field">
              标准依据
              <textarea
                value={draft.basis}
                onChange={(event) => updateDraft("basis", event.target.value)}
              />
            </label>
            <div className="form-row sop-duration-row">
              <label className="field">
                标准耗时
                <span className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    value={Number(
                      String(draft.standardDuration).match(/\d+/)?.[0] || 15,
                    )}
                    onChange={(event) =>
                      updateDraft(
                        "standardDuration",
                        `${event.target.value} 分钟`,
                      )
                    }
                  />
                  <b>分钟</b>
                </span>
              </label>
            </div>
            <label className="field">
              适用实训环境
              <textarea
                value={draft.conditions}
                onChange={(event) =>
                  updateDraft("conditions", event.target.value)
                }
              />
            </label>
          </section>
          <aside className="panel sop-responsibility-card">
            <SafetyCertificateOutlined />
            <h2>标准责任</h2>
            <span>
              <small>标准责任人</small>
              <strong>{draft.owner}</strong>
            </span>
            <span>
              <small>当前状态</small>
              <strong>{draft.status || "草稿"}</strong>
            </span>
            <p>
              实训标准包含标准操作流程（SOP）、教学要求与评价规则，由专业教师定义，AI不会自动生成或改写。
            </p>
          </aside>
        </div>
      )}
      {stage === 1 && (
        <div className="rule-layout sop-definition-layout">
          <aside className="panel rule-steps">
            <PanelTitle
              title="操作步骤"
              action={
                <Button
                  icon={<PlusOutlined />}
                  disabled={mediaBusy}
                  onClick={addStep}
                >
                  新增
                </Button>
              }
            />
            {draft.steps.map((step, index) => (
              <button
                className={index === selectedRuleStep ? "active" : ""}
                key={step.id}
                disabled={mediaBusy}
                onClick={() => setSelectedRuleStep(index)}
              >
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{step.name || "未命名步骤"}</span>
                <small>线性必做 · 建议 {step.timeout}</small>
                <small className="step-system-id">系统标识：{step.id}</small>
              </button>
            ))}
          </aside>
          <section className="panel rule-editor">
            <PanelTitle
              title={`${active.id} · ${active.name || "未命名步骤"}`}
              action={<Status>教师定义</Status>}
            />
            <div className="sop-authority-callout">
              <LockOutlined />
              <div>
                <strong>步骤编号一经创建不随排序改变</strong>
                <p>调整顺序不会改变系统标识；删除步骤后也不会复用该编号。</p>
              </div>
            </div>
            {draft.steps.some(
              (step) =>
                step.attribute &&
                !["必做", "required"].includes(step.attribute),
            ) && (
              <div className="evaluation-notice evaluation-notice--warning">
                <AlertOutlined />
                <span>
                  当前草稿来自旧版可选/分支结构。请确认后将全部步骤转为一期线性必做流程；原
                  步骤编号不会改变。
                </span>
                <Button
                  onClick={() =>
                    updateDraft(
                      "steps",
                      linearizeSteps(
                        draft.steps.map(({ attribute, ...step }) => step),
                      ),
                    )
                  }
                >
                  转为线性必做
                </Button>
              </div>
            )}
            <div className="rule-form">
              <label className="field">
                步骤名称
                <input
                  value={active.name}
                  onChange={(event) => updateStep("name", event.target.value)}
                />
              </label>
              <label className="field">
                完成条件
                <textarea
                  value={active.completionCondition}
                  onChange={(event) =>
                    updateStep("completionCondition", event.target.value)
                  }
                />
              </label>
              <RequirementsEditor
                step={active}
                steps={draft.steps}
                onChange={(value) => updateStep("visualRequirements", value)}
              />
              <div className="teaching-content-card">
                <div>
                  <strong>学生端标准教学内容</strong>
                  <small>
                    由教师维护，供学生操作前查看；模型不会生成或改写这些内容。
                  </small>
                </div>
                <label className="field">
                  标准操作说明
                  <textarea
                    value={active.teachingInstruction || ""}
                    onChange={(event) =>
                      updateStep("teachingInstruction", event.target.value)
                    }
                  />
                </label>
                <div className="form-row">
                  <label className="field">
                    操作要点
                    <textarea
                      value={active.keyPoints || ""}
                      onChange={(event) =>
                        updateStep("keyPoints", event.target.value)
                      }
                    />
                  </label>
                  <label className="field">
                    常见错误
                    <textarea
                      value={active.commonMistakes || ""}
                      onChange={(event) =>
                        updateStep("commonMistakes", event.target.value)
                      }
                    />
                  </label>
                </div>
                <StandardMediaEditor
                  key={active.id}
                  step={active}
                  onChange={(items) => updateStepMedia(active.id, items)}
                  onBusyChange={setMediaUploading}
                />
              </div>
              <div className="definition-list linear-step-facts">
                <span>
                  <small>前置步骤</small>
                  <strong>{active.predecessor}</strong>
                </span>
                <span>
                  <small>步骤类型</small>
                  <strong>线性必做</strong>
                </span>
              </div>
              <label className="field compact-field">
                建议完成时间（mm:ss）
                <input
                  value={active.timeout}
                  onChange={(event) =>
                    updateStep("timeout", event.target.value)
                  }
                />
              </label>
              <div className="definition-actions">
                <Button
                  disabled={mediaBusy || selectedRuleStep === 0}
                  onClick={() => moveStep(-1)}
                >
                  上移步骤
                </Button>
                <Button
                  disabled={
                    mediaBusy || selectedRuleStep === draft.steps.length - 1
                  }
                  onClick={() => moveStep(1)}
                >
                  下移步骤
                </Button>
                <Button
                  type="danger"
                  disabled={mediaBusy || draft.steps.length === 1}
                  onClick={removeStep}
                >
                  删除步骤
                </Button>
                <span>调整顺序不会重编号</span>
              </div>
            </div>
          </section>
        </div>
      )}
      {stage === 2 && (
        <div className="evaluation-stage">
          <div
            className={`score-allocation ${totalScore === 100 ? "score-allocation--complete" : totalScore > 100 ? "score-allocation--over" : ""}`}
          >
            <span>
              <small>当前总分</small>
              <strong>{totalScore} / 100</strong>
            </span>
            <p>
              {totalScore === 100
                ? "✓ 总分已配置完成"
                : totalScore < 100
                  ? `还需分配 ${100 - totalScore} 分`
                  : `已超出 ${totalScore - 100} 分`}
            </p>
          </div>
          <div className="rule-layout">
            <aside className="panel rule-steps">
              <PanelTitle title="评价步骤" />
              {draft.steps.map((step, index) => (
                <button
                  className={index === selectedRuleStep ? "active" : ""}
                  key={step.id}
                  onClick={() => setSelectedRuleStep(index)}
                >
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>{step.name || "未命名步骤"}</span>
                  <small>
                    {step.score} 分 ·{" "}
                    {JUDGEMENT_MODES[step.judgementMode]?.shortLabel}
                  </small>
                </button>
              ))}
            </aside>
            <section className="panel rule-editor">
              <PanelTitle
                title={`${active.id} · 评价规则`}
                action={<Status>{active.score} 分</Status>}
              />
              <div className="rule-form">
                <label className="field compact-field">
                  本步骤分值
                  <input
                    type="number"
                    min="1"
                    value={active.score}
                    onChange={(event) =>
                      updateStep("score", Number(event.target.value))
                    }
                  />
                </label>
                <div className="field">
                  步骤未完整完成时如何计分
                  <div
                    className="incomplete-policy-options"
                    role="radiogroup"
                    aria-label="未完成计分方式"
                  >
                    {Object.entries(INCOMPLETE_POLICIES).map(
                      ([value, config]) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={active.incompletePolicy === value}
                          className={
                            active.incompletePolicy === value ? "active" : ""
                          }
                          key={value}
                          onClick={() => updateStep("incompletePolicy", value)}
                        >
                          <span className="mode-radio" />
                          <strong>{config.label}</strong>
                          <small>{config.description}</small>
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <label className="field">
                  练习人工流程推进
                  <select
                    value={active.manualProgressionPolicy || "student_submit"}
                    onChange={(e) =>
                      updateStep("manualProgressionPolicy", e.target.value)
                    }
                  >
                    <option value="student_submit">
                      学生提交本步完成后推进
                    </option>
                    <option value="teacher_confirmation">
                      学生提交后等待教师确认
                    </option>
                  </select>
                  <small>
                    AI自动确认保持自动推进；考试的人工推进统一由教师确认。人工流程确认不代替AI证据或成绩复核。
                  </small>
                </label>
                <div className="field">
                  评价方式
                  <div
                    className="judgement-mode-options"
                    role="radiogroup"
                    aria-label="评价方式"
                  >
                    {Object.entries(JUDGEMENT_MODES).map(([value, config]) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={
                          (active.expectedJudgementMode ||
                            active.judgementMode) === value
                        }
                        className={
                          (active.expectedJudgementMode ||
                            active.judgementMode) === value
                            ? "active"
                            : ""
                        }
                        key={value}
                        onClick={() => updateJudgementMode(value)}
                      >
                        <span className="mode-radio" />
                        <strong>{config.label}</strong>
                        <small>{config.description}</small>
                      </button>
                    ))}
                  </div>
                </div>
                {(active.expectedJudgementMode || active.judgementMode) ===
                  "visual_auto" && (
                  <p className="evaluation-notice sop-evaluation-note">
                    <AlertOutlined />{" "}
                    最终是否能启用自动评价，还需完成AI模型适配和工位现场验证。本设置仅表示教师认为该步骤适合视频自动评价。
                  </p>
                )}
                {(active.expectedJudgementMode || active.judgementMode) !==
                  "visual_auto" && (
                  <label className="field">
                    视频评价限制
                    <textarea
                      value={active.knownLimit || ""}
                      onChange={(event) =>
                        updateStep("knownLimit", event.target.value)
                      }
                    />
                  </label>
                )}
                {(active.expectedJudgementMode || active.judgementMode) !==
                  "default_pass_manual_deduction" && (
                  <label className="field">
                    评价证据要求
                    <textarea
                      value={active.evidence}
                      onChange={(event) =>
                        updateStep("evidence", event.target.value)
                      }
                    />
                  </label>
                )}
                <section className="structured-rule-section">
                  <header>
                    <span>
                      <strong>评分规则</strong>
                      <small>扣分值由教师定义，AI实施人员只能引用规则。</small>
                    </span>
                    <Button icon={<PlusOutlined />} onClick={addScoreRule}>
                      新增评分规则
                    </Button>
                  </header>
                  {active.legacyScoringNote && !activeScoreRules.length && (
                    <div className="legacy-rule-note">
                      <AlertOutlined />
                      <span>
                        <strong>历史评分补充说明</strong>
                        <small>{active.legacyScoringNote}</small>
                      </span>
                      <em>不会自动转换成正式评分规则</em>
                    </div>
                  )}
                  <div className="structured-rule-list">
                    {activeScoreRules.map((rule) => (
                      <article key={rule.id}>
                        <header>
                          <code>{rule.id}</code>
                          <Button
                            type="danger"
                            onClick={() => removeScoreRule(rule.id)}
                          >
                            删除
                          </Button>
                        </header>
                        <div className="form-row">
                          <label className="field">
                            错误名称
                            <input
                              value={rule.name}
                              onChange={(event) =>
                                updateScoreRule(
                                  rule.id,
                                  "name",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            错误类型
                            <select
                              value={rule.type}
                              onChange={(event) =>
                                updateScoreRule(
                                  rule.id,
                                  "type",
                                  event.target.value,
                                )
                              }
                            >
                              {Object.entries(SCORE_RULE_TYPES).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </div>
                        <div className="rule-fields-grid">
                          <label className="field">
                            扣分方式
                            <select
                              value={rule.deductionMode}
                              onChange={(event) =>
                                updateScoreRule(
                                  rule.id,
                                  "deductionMode",
                                  event.target.value,
                                )
                              }
                            >
                              {Object.entries(SCORE_DEDUCTION_MODES).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          {rule.deductionMode === "fixed_deduction" && (
                            <label className="field">
                              每次扣分
                              <input
                                type="number"
                                min="1"
                                max={active.score}
                                value={rule.deductionValue}
                                onChange={(event) =>
                                  updateScoreRule(
                                    rule.id,
                                    "deductionValue",
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>
                          )}
                          <label className="field">
                            最大触发次数
                            <input
                              type="number"
                              min="1"
                              value={rule.maxTriggerCount}
                              onChange={(event) =>
                                updateScoreRule(
                                  rule.id,
                                  "maxTriggerCount",
                                  Number(event.target.value),
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            纠正后处理
                            <select
                              value={rule.correctionTreatment}
                              onChange={(event) =>
                                updateScoreRule(
                                  rule.id,
                                  "correctionTreatment",
                                  event.target.value,
                                )
                              }
                            >
                              {Object.entries(CORRECTION_TREATMENTS).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          {rule.correctionTreatment ===
                            "reduce_after_correction" && (
                            <label className="field">
                              纠正后扣分值
                              <input
                                type="number"
                                min="1"
                                max={
                                  rule.deductionMode === "zero_step"
                                    ? Math.max(1, Number(active.score) - 1)
                                    : Math.max(
                                        1,
                                        Number(rule.deductionValue) - 1,
                                      )
                                }
                                value={rule.correctedDeductionValue || ""}
                                onChange={(event) =>
                                  updateScoreRule(
                                    rule.id,
                                    "correctedDeductionValue",
                                    Number(event.target.value),
                                  )
                                }
                                placeholder="必须小于原扣分值"
                              />
                            </label>
                          )}
                        </div>
                        <label className="field">
                          <FieldLabel>规则说明</FieldLabel>
                          <textarea
                            value={rule.description || ""}
                            onChange={(event) =>
                              updateScoreRule(
                                rule.id,
                                "description",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </article>
                    ))}
                    {!activeScoreRules.length && (
                      <div className="empty-inline">
                        <FileTextOutlined />
                        <b>尚未创建结构化评分规则</b>
                        <p>
                          如果选择“按评分规则计算”，后续评价映射
                          必须把每个完成判断项关联到这里的规则，或明确不扣分。
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="structured-rule-section safety-rule-editor">
                  <header>
                    <span>
                      <strong>安全规则</strong>
                      <small>
                        安全违规是否扣分、暂停或终止，均由教师明确。
                      </small>
                    </span>
                    <Button icon={<PlusOutlined />} onClick={addSafetyRule}>
                      新增安全规则
                    </Button>
                  </header>
                  {active.legacySafetyNote && !activeSafetyRules.length && (
                    <div className="legacy-rule-note legacy-rule-note--danger">
                      <AlertOutlined />
                      <span>
                        <strong>历史安全红线说明</strong>
                        <small>{active.legacySafetyNote}</small>
                      </span>
                      <em>请在当前草稿中由教师结构化确认</em>
                    </div>
                  )}
                  <div className="structured-rule-list">
                    {activeSafetyRules.map((rule) => (
                      <article key={rule.id}>
                        <header>
                          <code>{rule.id}</code>
                          <Button
                            type="danger"
                            onClick={() => removeSafetyRule(rule.id)}
                          >
                            删除
                          </Button>
                        </header>
                        <div className="form-row">
                          <label className="field">
                            安全规则名称
                            <input
                              value={rule.name}
                              onChange={(event) =>
                                updateSafetyRule(
                                  rule.id,
                                  "name",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            违规成立条件
                            <textarea
                              value={rule.violationCondition}
                              onChange={(event) =>
                                updateSafetyRule(
                                  rule.id,
                                  "violationCondition",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                        <div className="rule-fields-grid">
                          <label className="field">
                            现场处置
                            <select
                              value={rule.sessionTreatment}
                              onChange={(event) =>
                                updateSafetyRule(
                                  rule.id,
                                  "sessionTreatment",
                                  event.target.value,
                                )
                              }
                            >
                              {Object.entries(SAFETY_SESSION_TREATMENTS).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          <label className="field">
                            成绩处理
                            <select
                              value={rule.scoreTreatment}
                              onChange={(event) =>
                                updateSafetyRule(
                                  rule.id,
                                  "scoreTreatment",
                                  event.target.value,
                                )
                              }
                            >
                              {Object.entries(SAFETY_SCORE_TREATMENTS).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          {rule.scoreTreatment === "fixed_deduction" && (
                            <label className="field">
                              扣分值
                              <input
                                type="number"
                                min="1"
                                max={active.score}
                                value={rule.deductionValue}
                                onChange={(event) =>
                                  updateSafetyRule(
                                    rule.id,
                                    "deductionValue",
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>
                          )}
                        </div>
                      </article>
                    ))}
                    {!activeSafetyRules.length && (
                      <div className="empty-inline">
                        <SafetyCertificateOutlined />
                        <b>本步骤未配置结构化安全规则</b>
                        <p>没有安全红线时可以保持为空。</p>
                      </div>
                    )}
                  </div>
                </section>

                <details className="business-rule-details">
                  <summary>流程规则</summary>
                  <p className="hint">
                    步骤未完成统一由未完成处理规则
                    处理；流程异常如需扣分，必须引用上方教师评分规则。
                  </p>
                  <div className="flow-policy-grid">
                    {[
                      [
                        "wrongOrder",
                        "顺序错误",
                        [
                          ["allow", "允许并记录"],
                          ["teacher_review", "教师确认"],
                          ["apply_score_rule", "应用评分规则"],
                        ],
                      ],
                      [
                        "repeat",
                        "重复操作",
                        [
                          ["allow", "允许并记录"],
                          ["teacher_review", "教师确认"],
                          ["apply_score_rule", "应用评分规则"],
                        ],
                      ],
                      [
                        "timeout",
                        "操作超时",
                        [
                          ["record_only", "仅记录超时"],
                          ["teacher_review", "教师确认"],
                          ["apply_score_rule", "应用评分规则"],
                        ],
                      ],
                    ].map(([key, label, options]) => {
                      const action = active.flowPolicy?.[key] || {};
                      return (
                        <div key={key}>
                          <label className="field">
                            {label}
                            <select
                              value={action.treatment || options[0][0]}
                              onChange={(event) =>
                                updateFlowPolicy(
                                  key,
                                  "treatment",
                                  event.target.value,
                                )
                              }
                            >
                              {options.map(([value, text]) => (
                                <option key={value} value={value}>
                                  {text}
                                </option>
                              ))}
                            </select>
                          </label>
                          {action.treatment === "apply_score_rule" && (
                            <label className="field">
                              关联评分规则
                              <select
                                value={action.scoreRuleId || ""}
                                onChange={(event) =>
                                  updateFlowPolicy(
                                    key,
                                    "scoreRuleId",
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="">请选择</option>
                                {activeScoreRules.map((rule) => (
                                  <option key={rule.id} value={rule.id}>
                                    {rule.id} · {rule.name || "未命名规则"}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            </section>
          </div>
        </div>
      )}
      {stage === 3 && (
        <section className="panel review-page">
          <div
            className={`review-hero ${issues.length ? "review-hero--warning" : ""}`}
          >
            {issues.length ? <AlertOutlined /> : <CheckCircleOutlined />}
            <div>
              <h2>
                {issues.length
                  ? `还有 ${issues.length} 项内容需要完善`
                  : "实训标准已满足发布条件"}
              </h2>
              <p>
                这里只检查教学与评价标准；AI评价尚未配置也可以正常发布实训标准。
              </p>
            </div>
          </div>
          <div className="review-list">
            {issues.length ? (
              issues.map((issue, index) => (
                <span key={`${issue.message}-${index}`}>
                  <ExclamationCircleFilled />
                  <b>{issue.message}</b>
                  <button
                    type="button"
                    onClick={() => {
                      if (issue.stepIndex !== null)
                        setSelectedRuleStep(issue.stepIndex);
                      setStage(issue.stage);
                    }}
                  >
                    去修改
                  </button>
                </span>
              ))
            ) : (
              <>
                <span>
                  <CheckCircleFilled />
                  <b>{draft.steps.length} 个固定步骤编号</b>
                  <small>步骤内容、顺序和依赖完整</small>
                </span>
                <span>
                  <CheckCircleFilled />
                  <b>总分 100 分</b>
                  <small>评分闭环已通过</small>
                </span>
                <span>
                  <CheckCircleFilled />
                  <b>自动评价 {judgementCounts.visual_auto || 0} 步</b>
                  <small>发布后再完成AI评价和工位适配</small>
                </span>
                <span>
                  <CheckCircleFilled />
                  <b>
                    AI辅助 {judgementCounts.visual_assist_default_pass || 0} 步
                    · 教师评价{" "}
                    {judgementCounts.default_pass_manual_deduction || 0} 步
                  </b>
                  <small>AI不确定时不会自动扣分</small>
                </span>
                <span>
                  <CheckCircleFilled />
                  <b>安全规则 {(draft.safetyRules || []).length} 项</b>
                  <small>现场与成绩处置均由教师明确</small>
                </span>
              </>
            )}
          </div>
          {!editingCurrent && (
            <div className="signature-box">
              <label className="field">
                专业教师签名
                <input
                  placeholder="请输入本人姓名"
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={signed}
                  onChange={(event) => setSigned(event.target.checked)}
                />{" "}
                我已逐项审核并确认当前内容为本实训项目正式教学与评价标准。
              </label>
            </div>
          )}
          <div className="publish-boundary">
            <span>
              <strong>
                {editingCurrent ? "保存当前实训标准" : "发布实训标准"}
              </strong>
              <small>
                当前标准仅保留一份，修改覆盖更新；历史安排使用当时快照，AI评价能力独立建设。
              </small>
            </span>
          </div>
        </section>
      )}
    </>
  );
}

function Learning({ setModal }) {
  const store = usePrototypeData();
  const [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("全部状态"),
    [selectedIds, setSelectedIds] = useState([]);
  const visible = store.data.learningSamples.filter(
    (sample) =>
      (statusFilter === "全部状态" || sample.status === statusFilter) &&
      `${sample.source} ${sample.student} ${sample.fileName} ${sample.label}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const { pageItems: pagedSamples, paginationProps: samplePagination } =
    useListPagination(visible);
  const reviewRef = useRef(null);
  const review = (sample) => {
    const sop = store.data.sops.find((item) => item.id === sample.sopId);
    const dataset = store.data.datasets.find(
      (item) => item.sopId === sample.sopId,
    );
    setModal({
      title: "复核动作训练样本",
      size: "large",
      content: (
        <ReviewSampleForm
          ref={reviewRef}
          sample={sample}
          sop={sop}
          acceptLabel={
            dataset?.status === "已锁定"
              ? `纳入 ${dataset.nextVersion || "下一版数据集"}`
              : `纳入当前 ${dataset?.version || "数据集"}`
          }
        />
      ),
      confirmText: "保存复核结论",
      onConfirm: () => {
        const form = reviewRef.current.getValue();
        const status = store.reviewLearningSample(
          sample.id,
          form.decision,
          form.label,
          form.note,
        );
        return `${sample.fileName}：${status}`;
      },
    });
  };
  const promote = (sample) => {
    setModal({
      title: "转入正式数据生产链",
      content: (
        <p>
          将 <strong>{sample.fileName}</strong> 作为困难样本反馈
          转为源视频。后续仍需标注与审核，不会直接纳入数据集。
        </p>
      ),
      confirmText: "转入数据生产",
      onConfirm: () => {
        store.promoteDifficultSample(sample.id);
        return `${sample.fileName} 已进入源视频待加工队列`;
      },
    });
  };
  const batchAccept = () => {
    const pending = store.data.learningSamples.filter(
      (item) => selectedIds.includes(item.id) && item.status === "待审核",
    );
    setModal({
      title: "批量纳入已选择样本",
      content: (
        <p>
          将把明确勾选的 {pending.length} 条待审样本按现有标签纳入对应可编辑
          数据集；当前版本已锁定时进入下一版候选。不会修改任何实训标准
          或已锁定版本。
        </p>
      ),
      confirmText: `纳入 ${pending.length} 条`,
      onConfirm: () => {
        if (!pending.length) throw new Error("当前筛选范围内没有待审核样本。");
        pending.forEach((sample) =>
          store.reviewLearningSample(
            sample.id,
            "accept",
            sample.label,
            "批量复核通过",
          ),
        );
        setSelectedIds([]);
        return `${pending.length} 条样本已进入下一版数据集`;
      },
    });
  };
  return (
    <>
      <PageHeader
        back
        title="动作训练样本复核"
        subtitle="困难样本先进入正式数据生产链；教师只审核已完成标注的候选，实训标准的步骤不可由样本反向生成"
      />
      <section className="sop-boundary-note">
        <DatabaseOutlined />
        <div>
          <strong>纳入边界</strong>
          <p>
            待加工 → 源视频 → 标注与审核 → 数据集
            候选。运行反馈不会直接进入训练集；当前锁定数据集、已发布实训标准
            和已部署模型均不被原地改写。
          </p>
        </div>
        <Status tone="warning">
          {
            store.data.learningSamples.filter(
              (item) => item.status === "待审核",
            ).length
          }{" "}
          条待审核
        </Status>
      </section>
      <section className="panel panel--table">
        <Toolbar
          placeholder="搜索文件、来源或标签"
          filters={[
            "全部状态",
            "待加工",
            "已转数据生产",
            "待审核",
            "已纳入",
            "已拒绝",
          ]}
          value={query}
          filterValue={statusFilter}
          onChange={setQuery}
          onFilterChange={setStatusFilter}
          onRefresh={() => {
            setQuery("");
            setStatusFilter("全部状态");
            setSelectedIds([]);
          }}
          primary={`批量纳入（${selectedIds.length}）`}
          onPrimary={batchAccept}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="选择当前筛选中的全部待审样本"
                    type="checkbox"
                    checked={
                      visible.some((item) => item.status === "待审核") &&
                      visible
                        .filter((item) => item.status === "待审核")
                        .every((item) => selectedIds.includes(item.id))
                    }
                    onChange={(event) => {
                      const ids = visible
                        .filter((item) => item.status === "待审核")
                        .map((item) => item.id);
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...new Set([...current, ...ids])]
                          : current.filter((id) => !ids.includes(id)),
                      );
                    }}
                  />
                </th>
                {[
                  "视频片段",
                  "来源",
                  "AI 原判",
                  "纠正原因",
                  "确认标签",
                  "审核状态",
                  "操作",
                ].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedSamples.map((sample) => (
                <tr key={sample.id}>
                  <td>
                    <input
                      aria-label={`选择 ${sample.fileName}`}
                      type="checkbox"
                      disabled={sample.status !== "待审核"}
                      checked={selectedIds.includes(sample.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, sample.id]
                            : current.filter((id) => id !== sample.id),
                        )
                      }
                    />
                  </td>
                  <td>{sample.fileName}</td>
                  <td>{sample.source}</td>
                  <td>{sample.aiPrediction}</td>
                  <td>{displayBusinessText(sample.reason)}</td>
                  <td>{sample.label}</td>
                  <td>
                    <Status>{sample.status}</Status>
                  </td>
                  <td>
                    <button
                      className="table-action"
                      onClick={() =>
                        sample.status === "待加工"
                          ? promote(sample)
                          : review(sample)
                      }
                    >
                      {sample.status === "待加工" ? "转入数据生产" : "查看"}
                    </button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td className="table-empty" colSpan="8">
                    暂无符合条件的样本
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...samplePagination} />
      </section>
    </>
  );
}

const EndArrangementForm = forwardRef(function EndArrangementForm(
  { arrangement },
  ref,
) {
  const active = arrangement.sessions.filter((item) =>
    ["进行中", "已暂停", "待开始", "可入场"].includes(item.status),
  );
  const [note, setNote] = useState(
    `确认结束；${active.length} 个未结束会话转入结果生成或未参加状态。`,
  );
  useImperativeHandle(ref, () => ({ getValue: () => note }));
  return (
    <div className="form-stack">
      <p>
        当前有 {active.filter((item) => item.status === "进行中").length}{" "}
        个进行中、
        {active.filter((item) => item.status === "已暂停").length} 个暂停、
        {
          active.filter((item) => ["待开始", "可入场"].includes(item.status))
            .length
        }{" "}
        个待开始会话。
        结束后停止入场并进入结果汇总，正常工位自动释放占用；异常工位保留使用限制，现场复位在下次开放前确认。
      </p>
      <label className="field">
        结束说明
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
    </div>
  );
});

const PreparationReasonForm = forwardRef(function PreparationReasonForm(
  { detail },
  ref,
) {
  const [reason, setReason] = useState("");
  useImperativeHandle(ref, () => ({ getValue: () => reason }));
  return (
    <div className="form-stack">
      <p>{detail}</p>
      <label className="field">
        <FieldLabel required>原因说明</FieldLabel>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="请填写原因，操作记录将保留"
        />
      </label>
    </div>
  );
});

function ArrangementPreparationActions({
  arrangement,
  store,
  setModal,
  workstationId,
  compact = false,
}) {
  const nav = useNavigate();
  const reasonRef = useRef(null);
  const allowed = preparationActions(arrangement);
  const base = `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}`;
  const confirm = (action) => {
    const title = {
      deleteDraft: "删除草稿",
      cancel: "取消本次安排",
      withdraw: "撤销该工位准备",
      copy: "复制为新草稿",
    }[action];
    const needsReason = ["cancel", "withdraw"].includes(action);
    const detail =
      action === "withdraw"
        ? "只撤销该工位的未开始会话并释放本安排占用；其他工位不受影响。原检查记录与快照保留。"
        : action === "cancel"
          ? "仅允许取消尚未开始的安排。已开放的未开始会话将关闭并释放本安排占用，不生成正式成绩。"
          : action === "copy"
            ? "复制学生、工位与配置为新的草稿；原取消记录保留，新安排需重新检查开放。"
            : "删除未开放且没有业务引用的草稿，保留本次删除审计。";
    setModal({
      title: `${title}：${arrangement.name}`,
      content: needsReason ? (
        <PreparationReasonForm ref={reasonRef} detail={detail} />
      ) : (
        <p>{detail}</p>
      ),
      confirmText: `确认${title}`,
      onConfirm: () => {
        let changed;
        if (action === "deleteDraft")
          store.deleteArrangementDraft(arrangement.id);
        if (action === "cancel")
          store.cancelArrangement(
            arrangement.id,
            reasonRef.current?.getValue(),
          );
        if (action === "withdraw")
          store.withdrawArrangementWorkstation(
            arrangement.id,
            workstationId,
            reasonRef.current?.getValue(),
          );
        if (action === "copy")
          changed = store.copyCancelledArrangement(arrangement.id);
        if (action !== "withdraw")
          window.setTimeout(
            () =>
              nav(
                action === "deleteDraft"
                  ? base
                  : action === "copy"
                    ? `${base}/${changed.id}/edit`
                    : `${base}/${arrangement.id}/prep`,
              ),
            0,
          );
        return `${title}已完成`;
      },
    });
  };
  const actionButton = (action, label) =>
    compact ? (
      <button
        key={action}
        className="table-action"
        onClick={() => confirm(action)}
      >
        {label}
      </button>
    ) : (
      <Button key={action} onClick={() => confirm(action)}>
        {label}
      </Button>
    );
  if (workstationId)
    return allowed.withdraw &&
      arrangement.openWorkstationIds.includes(workstationId)
      ? actionButton("withdraw", "撤销准备")
      : null;
  return (
    <span className="arrangement-preparation-actions">
      {allowed.deleteDraft && actionButton("deleteDraft", "删除草稿")}
      {allowed.cancel && actionButton("cancel", "取消安排")}
      {allowed.copy && actionButton("copy", "复制为新草稿")}
    </span>
  );
}

function ArrangementAllocation({ arrangement, data, onChange, onRandomize }) {
  const pairs = arrangementAssignments(arrangement);
  const issues = allocationIssues(arrangement);
  const [feedback, setFeedback] = useState(null);
  const allocationKey = (item) =>
    JSON.stringify([
      item.studentIds,
      item.workstationIds,
      item.stationAssignments,
      item.allocationRandomizedAt,
    ]);
  const currentKey = allocationKey(arrangement);
  const setupReason = onChange ? allocationSetupReason(data, arrangement) : "";
  const selectedStudents = (arrangement.studentIds || []).map(
    (id) =>
      data.students.find((s) => s.id === id) || {
        id,
        name: "学生已失效",
        no: id,
      },
  );
  const assign = (workstationId, studentId) => {
    onChange(swapAllocationStudent(arrangement, workstationId, studentId));
    setFeedback(null);
  };
  const randomize = () => {
    try {
      const result = onRandomize();
      setFeedback({
        key: allocationKey(result),
        text: `已随机分配 ${result.studentIds.length} 名学生，可手动调整个别工位；保存后生效。`,
      });
    } catch (error) {
      setFeedback({ key: currentKey, text: error.message });
    }
  };
  const unassigned = selectedStudents.filter(
    (s) => !pairs.some((p) => p.studentId === s.id),
  );
  return (
    <section className="arrangement-allocation" aria-label="学生与工位分配">
      <PanelTitle
        title="学生与工位分配"
        action={
          <div className="allocation-actions">
            <span>
              {arrangement.studentIds?.length || 0} 人 · {pairs.length} 个工位
            </span>
            {onRandomize && (
              <button
                type="button"
                className="button"
                disabled={Boolean(setupReason)}
                title={
                  setupReason || "随机配对所选学生和工位；将替换当前对应关系"
                }
                onClick={randomize}
              >
                {arrangement.allocationRandomizedAt ? "重新随机" : "随机分配"}
              </button>
            )}
          </div>
        }
      />
      {onChange ? (
        <div
          className={setupReason || issues.length ? "readonly-note" : "hint"}
          role="status"
        >
          {setupReason ||
            (feedback?.key === currentKey
              ? feedback.text
              : issues.length
                ? "对应关系尚未完整，请点击“随机分配”，或手动调整分配。"
                : "系统已补齐分配，可随机分配或手动调整；选择已分配学生会交换两人的工位。")}
        </div>
      ) : issues.length > 0 ? (
        <div className="readonly-note" role="status">
          {issues.join("；")}
          {!onChange && " 历史会话与快照保持不变。"}
        </div>
      ) : (
        <p className="hint">
          一次一批、一人一工位。
          {onChange
            ? "可调整学生对应关系，选择已分配学生将交换两人的工位。"
            : "开放工位按此对应关系建立会话。"}
        </p>
      )}
      <DataTable
        columns={["工位", "分配学生", "学号", "会话状态"]}
        rows={pairs.map((p) => {
          const student = data.students.find((s) => s.id === p.studentId);
          const session = (arrangement.sessions || []).find(
            (s) =>
              s.workstationId === p.workstationId &&
              s.studentId === p.studentId,
          );
          return [
            data.workstations.find((w) => w.id === p.workstationId)?.name ||
              p.workstationId,
            onChange ? (
              <select
                aria-label={`分配学生：${p.workstationId}`}
                value={p.studentId}
                onChange={(e) => assign(p.workstationId, e.target.value)}
              >
                <option value="">请选择学生</option>
                {selectedStudents.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name} · {s.no}
                  </option>
                ))}
              </select>
            ) : (
              student?.name || "未分配"
            ),
            student?.no || "—",
            arrangement.status === "已取消"
              ? "已取消"
              : session?.status || "未开放",
          ];
        })}
        rowKey={(_, index) => pairs[index].workstationId}
        pagination={false}
        emptyText="请先选择学生和工位。"
      />
      {unassigned.length > 0 && (
        <p className="warning-text">
          尚未分配 {unassigned.length} 人：
          {unassigned
            .slice(0, 5)
            .map((s) => s.name)
            .join("、")}
          {unassigned.length > 5 &&
            (onChange
              ? "等；完整名单可在上方“按学生选择”的“仅看已选”中查看。"
              : "等。")}
        </p>
      )}
    </section>
  );
}

function ArrangementList({ exam = false, setModal }) {
  const nav = useNavigate();
  const store = usePrototypeData();
  const { data } = store;
  const name = exam ? "考试" : "练习";
  const base = exam ? "exams" : "practices";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const source = data.arrangements.filter(
    (item) =>
      item.type === (exam ? "exam" : "practice") && !item.archivedRecord,
  );
  const filters = arrangementStatusOptions(exam ? "exam" : "practice", source);
  const visible = source.filter((item) => {
    const sop = data.sops.find((entry) => entry.id === item.sopId);
    return (
      `${item.name} ${sop?.name || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (statusFilter === "全部状态" || item.status === statusFilter)
    );
  });
  const rows = visible.map((item) => {
    const sop = data.sops.find((entry) => entry.id === item.sopId);
    return [
      item.name,
      sop?.name || "历史标准",
      `${item.studentIds.length}人`,
      item.status,
      item.type === "exam" && item.entryEnd
        ? `${displayBusinessText(item.scheduleStart).replace("T", " ")}—${displayBusinessText(item.entryEnd).slice(11)}`
        : displayBusinessText(item.scheduleStart).replace("T", " "),
    ];
  });
  const openArrangement = (_, index) => {
    const item = visible[index];
    if (!item) return;
    const destination = arrangementDestination(item);
    nav(`/teacher/${base}/${item.id}/${destination}`);
  };
  return (
    <>
      <PageHeader
        title={`${name}管理`}
        subtitle={`配置、准备并跟踪本人负责的${name}安排`}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav(`/teacher/${base}/new`)}
          >
            创建{name}
          </Button>
        }
      />
      <section className="panel panel--table">
        <Toolbar
          placeholder={`搜索${name}名称或实训标准`}
          filters={filters}
          value={query}
          filterValue={statusFilter}
          onChange={setQuery}
          onFilterChange={setStatusFilter}
          onRefresh={() => {
            setQuery("");
            setStatusFilter("全部状态");
          }}
        />
        <DataTable
          pagination
          columns={[
            `${name}名称`,
            "实训标准",
            "参与人数",
            "状态",
            exam ? "允许入场时间" : "计划时间",
          ]}
          rows={rows}
          rowKey={(_, index) => visible[index].id}
          onView={openArrangement}
          renderActions={(_, index) => (
            <ArrangementPreparationActions
              arrangement={visible[index]}
              store={store}
              setModal={setModal}
              compact
            />
          )}
        />
      </section>
    </>
  );
}

function ArrangementForm({ exam = false, setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const store = usePrototypeData();
  const type = exam ? "exam" : "practice";
  const name = exam ? "考试" : "练习";
  const base = exam ? "exams" : "practices";
  const existing = id
    ? store.data.arrangements.find((item) => item.id === id)
    : null;
  const publishedSops = store.data.sops.filter(isSopAvailableForNewArrangement);
  const preferredSopId = publishedSops.some(
    (item) => item.id === location.state?.sopId,
  )
    ? location.state.sopId
    : publishedSops[0]?.id || "";
  const [draft, setDraft] = useState(() =>
    existing
      ? {
          ...JSON.parse(JSON.stringify(existing)),
          stationAssignments: arrangementAssignments(existing).map((p) => ({
            ...p,
          })),
          ...(exam
            ? {
                examDurationMinutes: normalizeExamDuration(
                  existing.examDurationMinutes,
                ),
              }
            : {}),
        }
      : {
          type,
          name: "",
          sopId: preferredSopId,
          scheduleStart: "2026-09-20T09:00",
          entryEnd: exam ? "2026-09-20T09:30" : "",
          ...(exam
            ? { examDurationMinutes: DEFAULT_EXAM_DURATION_MINUTES }
            : {}),
          studentIds: [],
          workstationIds: [],
          stationAssignments: [],
        },
  );
  const update = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const toggle = (key, value) =>
    setDraft((current) => {
      const next = {
        ...current,
        [key]: current[key].includes(value)
          ? current[key].filter((id) => id !== value)
          : [...current[key], value],
      };
      return {
        ...next,
        stationAssignments: reconcileAssignments(
          next.studentIds,
          next.workstationIds,
          current.stationAssignments,
        ),
      };
    });
  const selectedSop = store.data.sops.find((item) => item.id === draft.sopId);
  const selectedAiStatus = store.getSopAiCapabilityStatus(
    selectedSop?.id,
    draft.workstationIds.length
      ? { targetWorkstationIds: draft.workstationIds }
      : {},
  );
  const submit = (finalize) =>
    setModal({
      title: finalize ? `完成${name}配置` : `保存${name}草稿`,
      className: !exam && !finalize ? "teacher-practice-draft-save-modal" : "",
      content: (
        <p>
          {finalize
            ? "保存后进入工位准备；只有逐工位检查通过后才会锁定本次安排并允许入场。"
            : "草稿保存后可从列表继续编辑，不会开放任何工位。"}
        </p>
      ),
      confirmText: finalize ? "保存并进入准备" : "保存草稿",
      onConfirm: () => {
        const saved = store.saveArrangement(
          { ...draft, id: existing?.id, type },
          finalize,
        );
        window.setTimeout(
          () =>
            nav(
              finalize
                ? `/teacher/${base}/${saved.id}/prep`
                : `/teacher/${base}/${saved.id}/edit`,
            ),
          0,
        );
        return `${saved.name} 已${finalize ? "完成配置" : "保存为草稿"}`;
      },
    });
  if (id && !existing)
    return (
      <MissingState title="安排不存在或已删除" backTo={`/teacher/${base}`} />
    );
  if (existing && !preparationActions(existing).edit)
    return (
      <Navigate
        to={`/teacher/${base}/${existing.id}/${arrangementDestination(existing)}`}
        replace
      />
    );
  return (
    <>
      <PageHeader
        back
        title={`${existing ? "编辑" : "创建"}${name}`}
        subtitle="选择已发布实训标准、参与学生和候选工位；AI能力在准备阶段逐工位确认"
        actions={
          <>
            {existing && <ArrangementAttendanceEntry arrangement={existing} />}
            {existing && (
              <ArrangementPreparationActions
                arrangement={existing}
                store={store}
                setModal={setModal}
              />
            )}
            <Button onClick={() => submit(false)}>保存草稿</Button>
            <Button type="primary" onClick={() => submit(true)}>
              完成配置，进入准备
            </Button>
          </>
        }
      />
      <div className="form-layout">
        <section className="panel form-main">
          <h2>基本信息</h2>
          <label className="field">
            {name}名称
            <input
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder={`例如：新能源2401班高压安全${name}`}
            />
          </label>
          <div className="form-row">
            <label className="field">
              {exam ? "允许入场开始时间" : "计划开始时间"}
              <input
                type="datetime-local"
                step="1"
                value={dateTimeInputValue(draft.scheduleStart)}
                onChange={(event) =>
                  update("scheduleStart", event.target.value)
                }
              />
            </label>
            {exam && (
              <label className="field">
                允许入场截止时间
                <input
                  type="datetime-local"
                  step="1"
                  value={dateTimeInputValue(draft.entryEnd)}
                  onChange={(event) => update("entryEnd", event.target.value)}
                />
              </label>
            )}
          </div>
          {exam && (
            <label className="field">
              考试时长（分钟）
              <input
                type="number"
                min="5"
                max="240"
                step="1"
                value={draft.examDurationMinutes}
                onChange={(event) =>
                  update("examDurationMinutes", event.target.value)
                }
              />
              <small>学生确认开始考试后锁定，允许设置 5～240 分钟。</small>
            </label>
          )}
          <h2>评价标准与 AI评价能力</h2>
          <label className="field">
            已发布实训标准
            <select
              value={draft.sopId}
              disabled={hasLockedPreparationSnapshot(existing || {})}
              onChange={(event) => update("sopId", event.target.value)}
            >
              {publishedSops.map((sop) => (
                <option key={sop.id} value={sop.id}>
                  {sop.name}
                </option>
              ))}
            </select>
          </label>
          <div className="selection-card selection-card--static arrangement-ai-card">
            <VideoCameraOutlined />
            <span>
              <strong>{selectedSop?.name || "未选择实训标准"}</strong>
              <small>
                AI判断项 {selectedAiStatus.judgementItemCount} 项 · 引用AI能力{" "}
                {selectedAiStatus.capabilityCount} 个
              </small>
              <small>
                可运行工位 {selectedAiStatus.runnableWorkstationCount} /{" "}
                {selectedAiStatus.targetWorkstationCount} · 已启用{" "}
                {selectedAiStatus.enabledWorkstationCount} 个
              </small>
            </span>
            <Status
              tone={
                selectedAiStatus.status === "已启用" ? "success" : "warning"
              }
            >
              AI能力配置：{selectedAiStatus.status}
            </Status>
          </div>
          <p className="arrangement-ai-note">
            <SafetyCertificateOutlined /> AI能力不完整不会阻止创建{name}
            ；不可用工位的自动评价步骤将安全降级，AI不确定或证据不足时不自动扣分。
          </p>
          <ArrangementStudentPicker
            key={`${type}:${existing?.id || "new"}`}
            students={store.data.students}
            classes={store.data.classes}
            selectedIds={draft.studentIds}
            Pagination={TablePagination}
            onSelectionChange={(ids, selected) =>
              setDraft((current) =>
                changeArrangementParticipants(
                  current,
                  store.data.students,
                  ids,
                  selected,
                ),
              )
            }
          />
          <ArrangementAllocation
            arrangement={draft}
            data={store.data}
            onChange={(pairs) => update("stationAssignments", pairs)}
            onRandomize={() => {
              const next = randomizeArrangementAllocation(store.data, draft);
              setDraft(next);
              return next;
            }}
          />
        </section>
        <aside className="panel station-picker">
          <PanelTitle
            title="选择工位"
            action={<span>{draft.workstationIds.length} 个已选</span>}
          />
          {store.data.workstations.map((workstation) => {
            const selected = draft.workstationIds.includes(workstation.id);
            const blocked = !allocationWorkstationAvailable(
              workstation,
              existing,
            );
            return (
              <label
                key={workstation.id}
                className={blocked ? "is-disabled" : ""}
              >
                <input
                  type="checkbox"
                  disabled={blocked && !selected}
                  checked={selected}
                  onChange={() => toggle("workstationIds", workstation.id)}
                />
                <span>
                  <strong>{workstation.name}</strong>
                  <small>{workstationCaption(workstation)}</small>
                </span>
                <Status tone={blocked ? "danger" : "success"}>
                  {blocked
                    ? selected
                      ? "需移除"
                      : workstation.status === "故障" ||
                          workstation.status === "维护中"
                        ? workstation.status
                        : "已被占用"
                    : "可选择"}
                </Status>
              </label>
            );
          })}
          <p className="hint">
            <AlertOutlined />{" "}
            选择只保存候选范围；主辅画面、设备和缓存将在准备页逐站确认。
          </p>
        </aside>
      </div>
    </>
  );
}

function ArrangementPreparationHistory({ arrangement, data }) {
  if (
    !(arrangement.preparationHistory || []).length &&
    !(arrangement.withdrawnSessions || []).length
  )
    return null;
  return (
    <section className="panel arrangement-preparation-history">
      <PanelTitle title="准备操作历史" />
      {(arrangement.preparationHistory || []).map((entry, index) => (
        <div className="preparation-history-entry" key={`${entry.at}-${index}`}>
          <strong>
            {entry.action === "cancel" ? "取消安排" : "撤销工位准备"} ·{" "}
            {entry.actor}
          </strong>
          <p>{displayBusinessText(entry.reason)}</p>
          <small>
            {displayBusinessText(entry.at)} ·{" "}
            {(entry.workstationIds || [])
              .map(
                (id) => data.workstations.find((w) => w.id === id)?.name || id,
              )
              .join("、") || "未开放工位"}
          </small>
        </div>
      ))}
      {(arrangement.withdrawnSessions || []).length > 0 && (
        <details>
          <summary>
            查看已撤销的准备会话 · {arrangement.withdrawnSessions.length} 条
          </summary>
          {arrangement.withdrawnSessions.map((s) => (
            <div className="preparation-history-entry" key={s.id}>
              <strong>
                {data.students.find((student) => student.id === s.studentId)
                  ?.name || s.studentId}{" "}
                ·{" "}
                {data.workstations.find((w) => w.id === s.workstationId)
                  ?.name || s.workstationId}
              </strong>
              <p>{s.closedReason}</p>
              <small>
                已取消，无正式成绩 · 原检查快照保留 ·{" "}
                {displayBusinessText(
                  s.evaluationSnapshot?.lockedAt || s.closedAt,
                )}
              </small>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function PrepPage({ exam = false, setModal }) {
  const nav = useNavigate();
  const { id } = useParams();
  const store = usePrototypeData();
  const base = exam ? "exams" : "practices";
  const arrangement = store.data.arrangements.find((item) => item.id === id);
  const alreadyStarted = ["进行中", "已暂停"].includes(arrangement?.status);
  const checkRef = useRef(null);
  if (!arrangement)
    return (
      <MissingState title="安排不存在或已失效" backTo={`/teacher/${base}`} />
    );
  if (arrangement.status === "已取消")
    return (
      <>
        <PageHeader
          back
          title={`${exam ? "考试" : "练习"}已取消：${arrangement.name}`}
          subtitle={`${arrangement.cancelledBy || "教师"} · ${arrangement.cancelledAt || "历史记录"}`}
          actions={
            <>
              <ArrangementAttendanceEntry arrangement={arrangement} />
              <ArrangementPreparationActions
                arrangement={arrangement}
                store={store}
                setModal={setModal}
              />
            </>
          }
        />
        <p className="readonly-note">
          取消原因：{arrangement.cancelReason || "历史记录未填写"}
          。未开始会话已关闭，本次不生成正式成绩。
        </p>
        <section className="panel">
          <ArrangementAllocation arrangement={arrangement} data={store.data} />
        </section>
        <ArrangementPreparationHistory
          arrangement={arrangement}
          data={store.data}
        />
      </>
    );
  if (!["待开始", "准备中", "进行中", "已暂停"].includes(arrangement.status))
    return (
      <Navigate
        to={`/teacher/${base}/${arrangement.id}/${arrangementDestination(arrangement)}`}
        replace
      />
    );
  const lockedSnapshot = hasLockedPreparationSnapshot(arrangement);
  const selectedWorkstations = arrangement.workstationIds
    .map((workstationId) =>
      store.data.workstations.find((item) => item.id === workstationId),
    )
    .filter(Boolean);
  const openCheck = (workstation) => {
    const readiness = store.getWorkstationReadiness(
      arrangement.id,
      workstation.id,
    );
    if (!readiness.ok) {
      setModal({
        title: `${workstation.name} 暂不能开放`,
        className: "workstation-blocked-modal",
        content: (
          <div className="alert-block">
            <strong>
              <AlertOutlined /> 阻断原因
            </strong>
            {readiness.errors.map((error) => (
              <p key={error}>{displayBusinessText(error)}</p>
            ))}
          </div>
        ),
        hideCancel: true,
        dismissOnly: true,
        confirmText: "知道了",
      });
      return;
    }
    setModal({
      title: `${workstation.name} · 检查与开放`,
      requireContentReady: true,
      className: "workstation-opening-modal",
      size: "large",
      content: (
        <StationCheckForm
          ref={checkRef}
          workstation={workstation}
          snapshot={arrangement.snapshot}
          readiness={readiness}
          runCheck={() =>
            store.runWorkstationOpeningCheck(arrangement.id, workstation.id)
          }
        />
      ),
      confirmText: "确认并开放",
      onConfirm: () => {
        let result;
        try {
          result = store.openArrangementWorkstation(
            arrangement.id,
            workstation.id,
            checkRef.current.getValue(),
          );
        } catch (error) {
          checkRef.current?.invalidate();
          throw error;
        }
        return `${workstation.name} 已开放，${(result.session.evaluationProfile.aiRuntimeEnabled ?? result.session.evaluationProfile.automaticEvaluationEnabled) ? "AI运行已启用" : "AI运行已安全降级"}`;
      },
    });
  };
  const start = () =>
    setModal({
      title: `开始本次${exam ? "考试" : "练习"}`,
      content: (
        <p>
          当前已开放 {arrangement.openWorkstationIds.length} /{" "}
          {arrangement.workstationIds.length}{" "}
          个工位。未开放工位保持阻断，可在开始后按本次安排继续加入。
        </p>
      ),
      confirmText: "开始并进入监控",
      onConfirm: () => {
        store.startArrangement(arrangement.id);
        window.setTimeout(
          () => nav(`/teacher/${base}/${arrangement.id}/live`),
          0,
        );
        return `${arrangement.name} 已开始`;
      },
    });
  return (
    <>
      <PageHeader
        back
        title={`${exam ? "考试" : "练习"}准备：${arrangement.name}`}
        subtitle="逐工位检查；确认提交才开放，取消不会改变状态"
        actions={
          <>
            <ArrangementAttendanceEntry arrangement={arrangement} />
            <ArrangementPreparationActions
              arrangement={arrangement}
              store={store}
              setModal={setModal}
            />
            {preparationActions(arrangement).edit && (
              <Button
                onClick={() => nav(`/teacher/${base}/${arrangement.id}/edit`)}
              >
                编辑分配
              </Button>
            )}
            {alreadyStarted ? (
              <Button
                type="primary"
                onClick={() => nav(`/teacher/${base}/${arrangement.id}/live`)}
              >
                返回实时监控
              </Button>
            ) : (
              <Button
                type="primary"
                disabled={
                  !arrangement.openWorkstationIds.length ||
                  allocationIssues(arrangement).length > 0
                }
                onClick={start}
              >
                开始并进入实时监控
              </Button>
            )}
          </>
        }
      />
      <div className="prep-banner">
        <div>
          <SafetyCertificateOutlined />
          <span>
            <strong>
              {lockedSnapshot
                ? "已锁定本次教学标准与AI能力快照"
                : "首次开放工位时生成本次教学与AI能力快照"}
            </strong>
            <small>
              {displayBusinessText(
                lockedSnapshot
                  ? `锁定时间 ${arrangement.snapshot.lockedAt}，后续实训标准和 AI 调整不影响本安排。`
                  : "尚未开放工位，因此没有虚假显示已锁定。",
              )}
            </small>
          </span>
        </div>
        <Status tone={lockedSnapshot ? "success" : "warning"}>
          {lockedSnapshot ? "已锁定" : "尚未锁定"}
        </Status>
      </div>
      <section className="panel arrangement-allocation-panel">
        <ArrangementAllocation arrangement={arrangement} data={store.data} />
      </section>
      {lockedSnapshot && (
        <section className="panel evaluation-snapshot-panel">
          <PanelTitle title="本次运行快照" action={<LockOutlined />} />
          <div className="version-binding">
            <span>
              <small>实训标准</small>
              <b>{arrangement.snapshot.sopSnapshot?.name || "已锁定"}</b>
            </span>
            <span>
              <small>标准 ID</small>
              <b>{arrangement.snapshot.sopId || arrangement.sopId}</b>
            </span>
            <span>
              <small>快照时间</small>
              <b>
                {displayBusinessText(arrangement.snapshot.lockedAt || "已锁定")}
              </b>
            </span>
          </div>
          <p className="hint">
            每个已开放工位还会独立锁定当前工位AI配置与现场验证记录；后续调整不追溯改写本次运行证据。
          </p>
        </section>
      )}
      <section className="panel">
        <PanelTitle
          title="工位准备状态"
          action={
            <span>
              已开放 {arrangement.openWorkstationIds.length} /{" "}
              {arrangement.workstationIds.length}
            </span>
          }
        />
        <div className="prep-list">
          {selectedWorkstations.map((workstation, index) => {
            const readiness = store.getWorkstationReadiness(
              arrangement.id,
              workstation.id,
            );
            const opened = arrangement.openWorkstationIds.includes(
              workstation.id,
            );
            return (
              <div key={workstation.id}>
                <img
                  src={
                    index % 2
                      ? "/assets/workstation-female.png"
                      : "/assets/workstation-male.png"
                  }
                  alt={`${workstation.name}主视角预览`}
                />
                <span className="prep-station-info">
                  <strong>{workstation.name}</strong>
                  <small>{workstationCaption(workstation)}</small>
                  {!readiness.ok && (
                    <em className="danger-text">
                      {readiness.errors.join("；")}
                    </em>
                  )}
                  {readiness.ok && readiness.warnings.length > 0 && (
                    <em className="warning-text">
                      自动评价降级：{readiness.warnings[0]}
                    </em>
                  )}
                </span>
                <span className="prep-station-student">
                  <small>分配学生</small>
                  <strong>
                    {store.data.students.find(
                      (s) =>
                        s.id ===
                        arrangementAssignments(arrangement).find(
                          (p) => p.workstationId === workstation.id,
                        )?.studentId,
                    )?.name || "未分配"}
                  </strong>
                </span>
                <div className="prep-station-statuses">
                  <Status tone={readiness.ok ? "success" : "danger"}>
                    {readiness.ok ? "基础检查可执行" : "准备阻断"}
                  </Status>
                  <Status tone={readiness.gate.enabled ? "success" : "warning"}>
                    {readiness.gate.enabled ? "自动评价可用" : "默认通过模式"}
                  </Status>
                  <Status>{opened ? "已锁定" : "待检查"}</Status>
                </div>
                <div className="prep-station-actions">
                  <Button
                    disabled={opened}
                    type={opened ? "success" : "primary"}
                    onClick={() => openCheck(workstation)}
                  >
                    {opened
                      ? "已开放"
                      : readiness.ok
                        ? "检查并开放"
                        : "查看阻断原因"}
                  </Button>
                  {opened && (
                    <ArrangementPreparationActions
                      arrangement={arrangement}
                      store={store}
                      setModal={setModal}
                      workstationId={workstation.id}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <ArrangementPreparationHistory
        arrangement={arrangement}
        data={store.data}
      />
    </>
  );
}

function downloadTextFile(
  fileName,
  content,
  mime = "text/plain;charset=utf-8",
) {
  downloadBlobFile(
    fileName,
    new Blob(
      [mime.startsWith("text/") ? displayBusinessText(content) : content],
      {
        type: mime,
      },
    ),
  );
}

function downloadBlobFile(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  return `"${String(displayBusinessText(value) ?? "").replaceAll('"', '""')}"`;
}

const ReviewStepForm = forwardRef(function ReviewStepForm(
  { session, step },
  ref,
) {
  const [conclusion, setConclusion] = useState("pass");
  const [note, setNote] = useState("");
  const [studentInstruction, setStudentInstruction] = useState("");
  const [archiveEvidence, setArchiveEvidence] = useState(true);
  const [returnToLearning, setReturnToLearning] = useState(false);
  const current = Number(step.effectiveScore ?? step.rawScore ?? 0);
  const after =
    conclusion === "pass"
      ? Number(step.maxScore || 0)
      : conclusion === "insufficient"
        ? current
        : Number(step.rawScore ?? current);
  const totalAfter = Number(session.score || 0) - current + after;
  useImperativeHandle(ref, () => ({
    getValue: () => ({
      conclusion,
      note,
      archiveEvidence,
      returnToLearning,
      studentInstruction,
      ...(conclusion === "insufficient" ? {} : { score: after }),
    }),
  }));
  return (
    <div className="review-form">
      <section className="review-evidence-summary">
        <div>
          <span className="eyebrow">当前证据</span>
          <strong>
            {step.timeRange} ·{" "}
            {(step.evidenceSources || []).join(" + ") || "无可用片段"}
          </strong>
          <small>
            {step.ruleId} · {displayBusinessText(step.observation)}
          </small>
        </div>
        <Status
          tone={step.evidenceStatus === "证据不足" ? "warning" : "success"}
        >
          {step.evidenceStatus}
        </Status>
      </section>
      <label className="field">
        人工结论
        <select
          value={conclusion}
          onChange={(event) => setConclusion(event.target.value)}
        >
          <option value="pass">确认已完成，恢复本步骤满分</option>
          <option value="fail">确认未完成，保留原判得分</option>
          <option value="insufficient">仍无法判断，发起补充证据</option>
        </select>
      </label>
      <label className="field">
        <FieldLabel required>复核依据与说明</FieldLabel>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="说明观察到的事实、采用的证据与结论依据"
        />
      </label>
      {conclusion === "insufficient" && (
        <label className="field">
          <FieldLabel required>学生需要补充的事项</FieldLabel>
          <textarea
            value={studentInstruction}
            onChange={(e) => setStudentInstruction(e.target.value)}
            placeholder="说明需到场做什么、向哪位教师补充材料；不要填写教师内部判分结论"
          />
        </label>
      )}
      <label className="review-check">
        <input
          type="checkbox"
          checked={archiveEvidence}
          onChange={(event) => setArchiveEvidence(event.target.checked)}
        />
        确认采用已有证据记录或填写的现场核验依据（不生成录像附件）
      </label>
      <label className="review-check">
        <input
          type="checkbox"
          checked={returnToLearning}
          onChange={(event) => setReturnToLearning(event.target.checked)}
        />
        将本次纠正作为待审样本回流到下一版数据集
      </label>
      <section className="score-impact">
        <span>
          <small>当前步骤得分</small>
          <strong>{current} 分</strong>
        </span>
        <b>→</b>
        <span>
          <small>复核后步骤得分</small>
          <strong>{after} 分</strong>
        </span>
        <span>
          <small>报告总分</small>
          <strong>
            {session.score} → {totalAfter} 分
          </strong>
        </span>
      </section>
      <p className="audit-hint">
        <HistoryOutlined />{" "}
        保存后记录操作者、时间、原判、有效分、理由和证据；选择“补充证据”不会解除发布阻断。
      </p>
    </div>
  );
});

const ScoreAdjustForm = forwardRef(function ScoreAdjustForm({ step }, ref) {
  const [score, setScore] = useState(step.effectiveScore ?? step.rawScore ?? 0);
  const [reason, setReason] = useState("");
  useImperativeHandle(ref, () => ({ getValue: () => ({ score, reason }) }));
  return (
    <div className="form-stack">
      <p className="hint">
        原始判定 {step.rawScore} 分；当前有效分 {step.effectiveScore}{" "}
        分；本步骤满分 {step.maxScore} 分。
      </p>
      <label className="field">
        调整后步骤分
        <input
          type="number"
          min="0"
          max={step.maxScore}
          value={score}
          onChange={(event) => setScore(event.target.value)}
        />
      </label>
      <label className="field">
        <FieldLabel required>修改原因</FieldLabel>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="说明为何修改，以及引用了哪段证据"
        />
      </label>
    </div>
  );
});

const ScoreDispositionForm = forwardRef(function ScoreDispositionForm(
  { step },
  ref,
) {
  const [status, setStatus] = useState("teacher_resolved");
  const [score, setScore] = useState(
    step.effectiveScore ?? step.rawScore ?? step.maxScore ?? 0,
  );
  const [reason, setReason] = useState("");
  const [studentInstruction, setStudentInstruction] = useState("");
  useImperativeHandle(ref, () => ({
    getValue: () => ({ status, score, reason, studentInstruction }),
  }));
  const needsScore = status !== "retest_required";
  return (
    <div className="form-stack">
      <div className="alert-block">
        <strong>
          当前处置：
          {SCORE_DISPOSITIONS[step.scoreDisposition?.status] || "待教师处置"}
        </strong>
        <p>
          {displayGradeText(step.scoreDisposition?.reason) ||
            "需要教师基于证据决定后续处理，系统不会自行补分或扣分。"}
        </p>
      </div>
      <label className="field">
        处置结果
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="teacher_resolved">教师直接处置</option>
          <option value="retest_required">需要补测</option>
          <option value="policy_protected">政策保护</option>
        </select>
      </label>
      {!needsScore && (
        <label className="field">
          <FieldLabel required>学生线下补测要求</FieldLabel>
          <textarea
            value={studentInstruction}
            onChange={(e) => setStudentInstruction(e.target.value)}
            placeholder="说明补测范围、到场要求和负责教师；补测结果将在登记核验后确认"
          />
        </label>
      )}
      {needsScore && (
        <label className="field">
          最终步骤分
          <input
            type="number"
            min="0"
            max={step.maxScore}
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </label>
      )}
      <label className="field">
        <FieldLabel required>处置依据</FieldLabel>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="说明证据、补测或政策依据"
        />
      </label>
    </div>
  );
});

function ArrangementResultMetrics({ arrangement, exam = false }) {
  const { data } = usePrototypeData();
  const { sessions, average, averageHint, reviews } = getArrangementResultStats(
    arrangement,
    data.sops,
  );
  const abnormal = arrangementAbnormalWorkstations(data, arrangement);
  return (
    <div className="metric-grid">
      <Metric
        label="当前平均分"
        value={average}
        hint={averageHint}
        icon={<BarChartOutlined />}
        tone="blue"
      />
      <Metric
        label="会话记录"
        value={`${sessions.length}/${arrangement.studentIds.length}`}
        hint={`${sessions.filter((item) => ["待开始", "可入场"].includes(item.status) && item.resultStatus !== "未参加").length} 人未开始 · ${sessions.filter((item) => item.resultStatus === "未参加").length} 人未参加`}
        icon={<CheckCircleOutlined />}
        tone="green"
      />
      <Metric
        label="待复核成绩"
        value={reviews.length}
        hint={reviews.length ? "存在待复核、成绩处置或安全确认事项" : "暂无待复核事项"}
        icon={<DesktopOutlined />}
        tone="amber"
      />
      <Metric
        label="当前异常工位"
        value={abnormal.length}
        hint={abnormal.length ? "关联工位存在设备异常或使用限制，见下方明细" : "关联工位暂无已知运行异常"}
        onClick={abnormal.length ? () => document.getElementById(`record-workstation-issues-${arrangement.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }) : undefined}
        icon={<SafetyCertificateOutlined />}
        tone="purple"
      />
    </div>
  );
}

function WorkstationRestrictionPanel({
  arrangement,
  store,
  adminReadOnly = false,
}) {
  const nav = useNavigate();
  const restricted = arrangementAbnormalWorkstations(store.data, arrangement);
  if (!restricted.length) return null;
  return (
    <section className="panel workstation-release-panel" id={`record-workstation-issues-${arrangement.id}`}>
      <PanelTitle
        title="关联工位当前异常"
        action={
          <span className="panel-title__meta">{restricted.length} 个工位</span>
        }
      />
      <p className="hint">
        以下为关联工位当前的设备异常或使用限制，请进入工位详情核对处理。
      </p>
      <div className="reset-grid">
        {restricted.map(({ workstation: station, reasons }) => (
          <article key={station.id}>
            <div>
              <strong>{station.name}</strong>
              <small>{reasons.join("；")}</small>
            </div>
            <Status tone="danger">存在异常</Status>
            <Button
              onClick={() =>
                nav(
                  adminReadOnly
                    ? `/admin/workstations/${station.id}`
                    : `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}/${arrangement.id}/stations/${station.id}`,
                )
              }
            >
              {adminReadOnly ? "查看工位" : "查看异常"}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResultsPage({ exam = false, setModal, adminReadOnly = false }) {
  const nav = useNavigate();
  const resultLocation = useLocation();
  const selectedResult = new URLSearchParams(resultLocation.search).get(
    "sessionId",
  );
  const { id } = useParams();
  const store = usePrototypeData();
  const arrangement = store.data.arrangements.find((item) => item.id === id);
  const base = exam ? "exams" : "practices";
  const accessLogged = useRef("");
  useEffect(() => {
    if (!adminReadOnly || !arrangement || !store.dataWriteReady) return;
    const key = `${store.dataSource}:${arrangement.id}`;
    if (accessLogged.current === key) return;
    if (
      store.recordAuditAccess(
        "查看教学记录",
        `${arrangement.name} / ${arrangement.id}`,
        {
          reason: "管理员跨教师只读查看",
          sopId: arrangement.snapshot?.sopId || arrangement.sopId,
          snapshotLockedAt: arrangement.snapshot?.lockedAt || "尚未锁定快照",
        },
      )
    )
      accessLogged.current = key;
  }, [adminReadOnly, arrangement?.id, store.dataWriteReady, store.dataSource]);
  if (!arrangement)
    return (
      <MissingState
        title="安排不存在或已失效"
        backTo={`/${adminReadOnly ? "admin" : "teacher"}/${base}`}
      />
    );
  if (
    selectedResult &&
    !arrangement.sessions.some((s) => s.id === selectedResult)
  )
    return (
      <MissingState
        title="指定结果已失效，未替换为其他学生记录"
        backTo={`/${adminReadOnly ? "admin" : "teacher"}/${base}/${arrangement.id}/results`}
      />
    );
  const { sessions, blockers, publishGate } = getArrangementResultStats(
    arrangement,
    store.data.sops,
  );
  const recordContext = arrangementRecordContext(store.data, arrangement);
  const resultsPublished = arrangement.status === "已发布";
  if (arrangement.status === "已取消")
    return (
      <>
        <PageHeader
          back
          title={`${arrangement.name} · 已取消`}
          subtitle={`取消时间 ${arrangement.cancelledAt || "历史记录"}`}
          actions={
            !adminReadOnly && (
              <ArrangementPreparationActions
                arrangement={arrangement}
                store={store}
                setModal={setModal}
              />
            )
          }
        />
        <p className="readonly-note">
          {arrangement.cancelReason || "安排已取消"}。未开始会话不生成正式成绩。
        </p>
        <section className="panel">
          <ArrangementAllocation arrangement={arrangement} data={store.data} />
        </section>
        <ArrangementPreparationHistory
          arrangement={arrangement}
          data={store.data}
        />
      </>
    );
  const rows = sessions.map((session) => {
    const student = store.data.students.find(
      (item) => item.id === session.studentId,
    );
    const classItem = store.data.classes.find(
      (item) => item.id === student?.classId,
    );
    return [
      student?.name || "学生已失效",
      student?.no || "—",
      classItem?.name || "—",
      store.data.workstations.find((w) => w.id === session.workstationId)
        ?.name || "未分配工位",
      sessionResultPresentation(session).score,
      sessionResultPresentation(session).status,
      sessionResultPresentation(session).gradeStatus,
      sessionPrimaryIssue(session),
    ];
  });
  const exportRows = (store.data.exportJobs || []).filter(
    (item) => item.targetId === arrangement.id,
  );
  const buildCsv = () => {
    const header = [
      "学生",
      "学号",
      "班级",
      "有效得分",
      "成绩状态",
      "实训标准",
      "检测结果来源",
      "证据支持步骤数",
      "未确认保分步骤数",
    ];
    const body = sessions.map((session) => {
      const student = store.data.students.find(
        (item) => item.id === session.studentId,
      );
      const classItem = store.data.classes.find(
        (item) => item.id === student?.classId,
      );
      return [
        student?.name || "学生已失效",
        student?.no || "—",
        classItem?.name || "—",
        sessionResultPresentation(session).score,
        sessionResultPresentation(session).gradeStatus,
        arrangementRecordContext(store.data, arrangement, session).standardName,
        session.evaluationSnapshot?.executionPurpose === "real"
          ? "现场用途，来源见个人报告"
          : "历史来源未核实",
        evaluationCoverage(session.steps).confirmed,
        evaluationCoverage(session.steps).unknown,
      ];
    });
    return [header, ...body]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
  };
  const exportResults = () =>
    setModal({
      title: `导出${exam ? "考试" : "练习"}结果`,
      className: exam
        ? "teacher-exam-export-modal"
        : "teacher-practice-export-modal",
      content: (
        <div className="form-stack">
          <p>
            范围：当前安排全部 {sessions.length}{" "}
            条学生记录；格式：CSV；分数：各记录当前成绩。
          </p>
          <p className="hint">
            文件包含未参加和待复核状态，不会把未正式发布的考试成绩标记为已发布。
          </p>
        </div>
      ),
      confirmText: "生成并下载 CSV",
      onConfirm: () => {
        const fileName = `${arrangement.name}-${timestampForFile()}.csv`;
        store.createExportJob({
          scope: "安排结果",
          targetId: arrangement.id,
          fileName,
          format: "CSV",
          dataScope: "导出时当前成绩",
          content: `\uFEFF${buildCsv()}`,
        });
        downloadTextFile(
          fileName,
          `\uFEFF${buildCsv()}`,
          "text/csv;charset=utf-8",
        );
        return `${fileName} 已生成并开始下载`;
      },
    });
  const publish = () => {
    if (blockers.length) {
      setModal({
        title: "暂不能发布成绩",
        className: "teacher-exam-publish-modal",
        content: (
          <div className="alert-block">
            <strong>
              <AlertOutlined /> 发布门槛未满足
            </strong>
            <p>还有 {blockers.length} 条成绩未完成复核：</p>
            {blockers.map((session) => {
              const student = store.data.students.find(
                (item) => item.id === session.studentId,
              );
              return (
                <p key={session.id}>
                  {student?.name || session.studentId} ·{" "}
                  {session.resultStatus || "结果生成中"}
                </p>
              );
            })}
          </div>
        ),
        hideCancel: true,
        dismissOnly: true,
        confirmText: "知道了",
      });
      return;
    }
    setModal({
      title: "统一发布考试成绩",
      className: "teacher-exam-publish-modal",
      content: (
        <p>
          将发布{" "}
          {sessions.filter((item) => item.resultStatus === "正式成绩").length}{" "}
          条正式成绩；
          {
            sessions.filter((item) => item.resultStatus === "未参加").length
          }{" "}
          人保留未参加状态。发布后学生可查看当前成绩，教师更正后同步更新。
        </p>
      ),
      confirmText: "确认统一发布",
      onConfirm: () => {
        store.publishExamResults(arrangement.id);
        return `${arrangement.name} 成绩已发布`;
      },
    });
  };

  return (
    <div className={adminReadOnly ? "admin-record-detail" : undefined}>
      <PageHeader
        back
        title={`${exam ? "考试" : "练习"}${adminReadOnly ? "记录" : "结果"}：${arrangement.name}`}
        subtitle={`状态 ${arrangement.status} · ${recordContext.standardBasis}`}
        actions={
          <>
            <ArrangementAttendanceEntry
              arrangement={arrangement}
              adminReadOnly={adminReadOnly}
            />
            <Button icon={<ExportOutlined />} onClick={exportResults}>
              导出结果
            </Button>
            {!adminReadOnly && exam && arrangement.status === "待发布" && (
              <Button type="primary" onClick={publish}>
                统一发布成绩
              </Button>
            )}
            {exam && arrangement.status === "已发布" && (
              <Status tone="success">
                已于 {displayBusinessText(arrangement.publishedAt)} 发布
              </Status>
            )}
          </>
        }
      />
      {adminReadOnly && (
        <p className="readonly-note readonly-note--prominent">
          <EyeOutlined />{" "}
          管理员只读查看同一份教学结果；技术诊断位于页面底部，不提供发布、复核或改分操作。
        </p>
      )}
      <dl className="record-context">
        {[["负责教师", recordContext.teacher], ["开始时间", recordContext.startedAt], ["结束时间", recordContext.endedAt], ["本次实训标准", recordContext.standardName]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{displayBusinessText(value)}</dd></div>)}
      </dl>
      {!adminReadOnly && exam && ["待发布", "已发布", "已归档"].includes(arrangement.status) && arrangement.teacherId === store.teacherId && (
        <ExamReviewVisibilityPanel key={arrangement.id} arrangement={arrangement} store={store} />
      )}
      <ArrangementResultMetrics arrangement={arrangement} exam={exam} />
      {/* 考试发布卡片展示三种业务状态：暂不可发布（列出待处理人数及原因）、
          可发布（会话成绩校验通过，仍由教师执行统一发布）、已发布（学生可查看）。
          已发布优先显示，避免把发布后的检查通过误呈现为仍可再次发布。
          “成绩处理状态”是 Score Disposition 的中文业务名称；分数无效、
          未完成复核、待处理成绩或安全事件须先闭环，未参加学生保留原状态。
          最终是否允许发布由发布命令复查，包括未完成的补证／补测任务。 */}
      {exam && (
        <section
          className={`panel publish-gate ${publishGate.passed ? "is-ready" : "is-blocked"}`}
        >
          <PanelTitle
            title="考试发布门槛"
            action={
              <Status
                tone={
                  resultsPublished || publishGate.passed ? "success" : "warning"
                }
              >
                {resultsPublished
                  ? "已发布"
                  : publishGate.passed
                    ? "可发布"
                    : `暂不可发布 · ${publishGate.details.length} 人待处理`}
              </Status>
            }
          />
          <p className="hint">
            {resultsPublished
              ? "成绩已统一发布，学生可查看当前成绩，教师更正后同步更新；未参加学生保留未参加状态。"
              : "发布前需完成成绩复核、异常成绩处理和安全事件确认，确保分数完整有效、成绩已核定。未参加学生保留未参加状态，发布后向学生展示当前成绩。"}
          </p>
          {!publishGate.passed && (
            <div className="publish-gate-list">
              {publishGate.details.map((detail) => {
                const blockedSession = sessions.find(
                  (item) => item.id === detail.sessionId,
                );
                const blockedStudent = store.data.students.find(
                  (item) => item.id === blockedSession?.studentId,
                );
                return (
                  <span key={detail.sessionId}>
                    <b>{blockedStudent?.name || detail.sessionId}</b> 待复核{" "}
                    {detail.pendingReviewCount} · 成绩待处理{" "}
                    {detail.pendingDispositionCount} · 安全待确认{" "}
                    {detail.pendingSafetyCount} · 步骤分无效{" "}
                    {detail.emptyScoreCount}
                    {detail.resultNotReady && " · 结果尚未完成核定，请处理复核"}
                    {detail.invalidTotal &&
                      " · 总分为空或超出有效范围，请进入学生结果核定"}
                    {detail.invalidMaximum &&
                      " · 缺少有效满分依据，请核对锁定标准"}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}
      <WorkstationRestrictionPanel
        arrangement={arrangement}
        store={store}
        adminReadOnly={adminReadOnly}
      />
      <section className="panel panel--table arrangement-student-results">
        <PanelTitle
          title="学生结果"
          action={
            !exam &&
            !adminReadOnly && (
              <button
                onClick={() =>
                  nav(`/teacher/practices/${arrangement.id}/history`)
                }
              >
                练习历史比较 →
              </button>
            )
          }
        />
        <DataTable
          pagination
          columns={[
            "学生",
            "学号",
            "班级",
            "工位",
            "当前得分",
            "会话状态",
            "成绩状态",
            "主要问题",
          ]}
          statusColumns={[5, 6]}
          rows={rows}
          rowKey={(_, index) => sessions[index].id}
          selectedRowKey={selectedResult}
          onRow={(_, index) =>
            nav(
              sessionReportPath(
                arrangement,
                sessions[index],
                adminReadOnly ? "admin" : "teacher",
              ),
            )
          }
        />
      </section>
      <RecordExportHistory
        jobs={exportRows}
        onExport={exportResults}
        onDownload={({ fileName, content, mime }) => downloadBlobFile(fileName, new Blob([content], { type: mime }))}
      />
      {adminReadOnly && (
        <SessionDiagnosticPanel record={arrangement} store={store} />
      )}
    </div>
  );
}
function timestampForFile() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replaceAll(":", "-")
    .replace(" ", "T");
}

function Report({ exam = false, setModal, adminReadOnly = false }) {
  const nav = useNavigate();
  const { id, studentId } = useParams();
  const location = useLocation();
  const requestedSessionId = new URLSearchParams(location.search).get(
    "sessionId",
  );
  const store = usePrototypeData();
  const arrangement = store.data.arrangements.find((item) => item.id === id);
  const session = reportSession(arrangement, studentId, requestedSessionId);
  const student = store.data.students.find((item) => item.id === studentId);
  const sop = store.data.sops.find((item) => item.id === arrangement?.sopId);
  const initialStep = Math.max(
    0,
    session?.steps.findIndex((item) =>
      new URLSearchParams(location.search).get("stepId")
        ? item.id === new URLSearchParams(location.search).get("stepId")
        : ["待复核", "待补充证据"].includes(item.reviewStatus) ||
          ["pending", "retest_required"].includes(
            item.scoreDisposition?.status,
          ),
    ) ?? 0,
  );
  const [sel, setSel] = useState(initialStep);
  useEffect(() => setSel(initialStep), [session?.id, location.search]);
  const reviewRef = useRef(null);
  const adjustRef = useRef(null);
  const dispositionRef = useRef(null);
  if (
    arrangement &&
    student &&
    !requestedSessionId &&
    !session &&
    arrangement.sessions.filter((s) => s.studentId === studentId).length > 1
  )
    return (
      <>
        <PageHeader
          back
          title={`${student.name} · 选择操作记录`}
          subtitle="该学生有多条历史会话，请选择具体记录；不会默认打开第一条。"
        />
        <section className="panel">
          <DataTable
            columns={["工位", "会话状态", "结果状态", "开始时间"]}
            rows={arrangement.sessions
              .filter((s) => s.studentId === studentId)
              .map((s) => [
                store.data.workstations.find((w) => w.id === s.workstationId)
                  ?.name || "未分配工位",
                s.status,
                s.resultStatus || "未生成结果",
                s.startedAt || "未开始",
              ])}
            rowKey={(_, index) =>
              arrangement.sessions.filter((s) => s.studentId === studentId)[
                index
              ].id
            }
            onView={(_, index) =>
              nav(
                sessionReportPath(
                  arrangement,
                  arrangement.sessions.filter((s) => s.studentId === studentId)[
                    index
                  ],
                  adminReadOnly ? "admin" : "teacher",
                ),
              )
            }
          />
        </section>
      </>
    );
  if (!arrangement || !session || !student)
    return (
      <MissingState
        title="学生评价记录不存在或尚未生成"
        backTo={
          adminReadOnly
            ? `/admin/${exam ? "exams" : "practices"}/${id}`
            : `/teacher/${exam ? "exams" : "practices"}/${id}/results`
        }
      />
    );
  if (["未参加", "已取消"].includes(session.resultStatus))
    return (
      <>
        <PageHeader
          back
          title={`${student.name} · ${session.resultStatus}`}
          subtitle={arrangement.name}
        />
        <section className="panel">
          <p>
            {session.absenceReason ||
              session.closedReason ||
              "未开始操作，不生成正式成绩。"}
          </p>
          <p className="hint">本条记录不计入平均分，不存在可评价的操作录像。</p>
        </section>
      </>
    );
  const steps = session.steps || [];
  const activeStep = steps[sel] || steps[0];
  const hasFallbackCamera = Boolean(
    session.evaluationSnapshot?.workstationAiBaseConfigSnapshot
      ?.fallbackCameraId,
  );
  const totalMax = steps.reduce(
    (sum, item) => sum + Number(item.maxScore || 0),
    0,
  );
  const recordedDeduction = recordedDeductionOf(steps);
  const pendingCount =
    steps.filter(
      (item) =>
        ["待复核", "待补充证据"].includes(item.reviewStatus) ||
        ["pending", "retest_required"].includes(
          item.scoreDisposition?.status || "normal",
        ),
    ).length +
    (session.runtime?.safetyCandidates || []).filter(
      (item) => item.status === "pending",
    ).length;
  const completedCount = steps.filter(
    (item) => item.state !== "pending",
  ).length;
  const locked =
    arrangement.status === "已发布" ||
    session.resultStatus === "已发布" ||
    Boolean(session.scoreFrozen);
  const activeTask = evidenceTasksForSession(
    store.data,
    session.id,
    arrangement.id,
  ).find(
    (t) =>
      t.stepId === activeStep.id &&
      ["pending", "handling", "awaiting_confirmation"].includes(t.status),
  );
  const canReview =
    !adminReadOnly &&
    ["已结束", "待发布"].includes(arrangement.status) &&
    !locked;
  const canAdjust =
    !adminReadOnly &&
    ["已结束", "待发布", "已发布", "已归档"].includes(arrangement.status) &&
    session.resultStatus !== "未参加";
  const exportReport = () =>
    setModal({
      title: "导出个人评价报告",
      content: (
        <p>
          将生成可在浏览器中查看的报告，包含当前成绩、逐步骤证据状态和修改记录。
        </p>
      ),
      confirmText: "生成并下载报告",
      onConfirm: () => {
        const fileName = `${student.name}-${arrangement.name}-评价报告.html`;
        const text = escapeReportText;
        const reportContext = arrangementRecordContext(store.data, arrangement, session);
        const rows = steps
          .map(
            (step) =>
              `<tr><td>${text(step.id)}</td><td>${text(step.name)}</td><td>${text(step.effectiveScore)}/${text(step.maxScore)}</td><td>${text(step.result)} · ${text(stepEvaluationMeaning(step).label)}</td><td>${text(step.reviewStatus)}</td><td>${text(step.timeRange)}</td></tr>`,
          )
          .join("");
        const html = `<!doctype html><meta charset="utf-8"><title>${text(student.name)}评价报告</title><style>body{font:14px sans-serif;max-width:900px;margin:40px auto;color:#172033}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dfe6ef;padding:8px;text-align:left}</style><h1>${text(arrangement.name)} · ${text(student.name)}</h1><p>学号 ${text(student.no)}｜实训标准 ${text(reportContext.standardName)}｜有效成绩 ${text(session.score)}/${text(totalMax)}｜状态 ${text(session.resultStatus)}</p><table><thead><tr><th>步骤</th><th>名称</th><th>得分</th><th>结果</th><th>复核</th><th>证据时间</th></tr></thead><tbody>${rows}</tbody></table><h2>成绩修改记录</h2><pre>${text((session.reviewHistory || []).map((item) => `${item.time} ${item.operator} ${item.stepId} ${item.before}→${item.after} ${displayGradeText(item.reason)}`).join("\n") || "无修订")}</pre>`;
        store.createExportJob({
          scope: "个人报告",
          targetId: arrangement.id,
          fileName,
          format: "HTML",
          sessionId: session.id,
          content: html,
          dataScope: "当前成绩",
        });
        downloadTextFile(fileName, html, "text/html;charset=utf-8");
        return `${fileName} 已生成并开始下载`;
      },
    });
  const review = () => {
    const context = {
      expectedState: gradeStateToken(session),
      operationId: taskOperationId(),
    };
    setModal({
      eyebrow: "评价复核",
      title: `${activeStep.id} · ${activeStep.name}`,
      size: "large",
      confirmText: "保存复核结论",
      content: (
        <ReviewStepForm ref={reviewRef} session={session} step={activeStep} />
      ),
      onConfirm: () => {
        store.reviewSessionStep(arrangement.id, session.id, activeStep.id, {
          ...reviewRef.current.getValue(),
          ...context,
        });
        return `${student.name} 的 ${activeStep.id} 复核已保存`;
      },
    });
  };
  const adjust = () => {
    const context = {
      expectedState: gradeStateToken(session),
      operationId: taskOperationId(),
    };
    setModal({
      title: `调整 ${activeStep.id} 有效得分`,
      content: <ScoreAdjustForm ref={adjustRef} step={activeStep} />,
      confirmText: "保存分数调整",
      onConfirm: () => {
        store.adjustSessionStepScore(
          arrangement.id,
          session.id,
          activeStep.id,
          { ...adjustRef.current.getValue(), ...context },
        );
        return `${activeStep.id} 有效得分已更新`;
      },
    });
  };
  const resolveDisposition = () => {
    const context = {
      expectedState: gradeStateToken(session),
      operationId: taskOperationId(),
    };
    setModal({
      title: `处理 ${activeStep.id} 成绩处置`,
      content: <ScoreDispositionForm ref={dispositionRef} step={activeStep} />,
      confirmText: "保存处置",
      onConfirm: () => {
        store.resolveScoreDisposition(
          arrangement.id,
          session.id,
          activeStep.id,
          { ...dispositionRef.current.getValue(), ...context },
        );
        return `${activeStep.id} 成绩处置已保存`;
      },
    });
  };
  return (
    <>
      <PageHeader
        back
        title={`${exam ? "考试" : "练习"}个人${adminReadOnly ? "记录" : "报告"} · ${student.name}`}
        subtitle={sop?.name || "历史标准"}
        actions={
          <>
            {!exam && !adminReadOnly && (
              <Button
                icon={<HistoryOutlined />}
                onClick={() =>
                  nav(
                    `/teacher/practices/${arrangement.id}/history?student=${student.id}`,
                  )
                }
              >
                历史比较
              </Button>
            )}
            <Button icon={<ExportOutlined />} onClick={exportReport}>
              导出报告
            </Button>
          </>
        }
      />
      <OpeningInspectionRecord
        session={session}
        teachers={store.data.teachers}
      />
      <div className="report-summary">
        <div>
          <span className="score-ring">
            <strong>{session.score ?? "—"}</strong>
            <small>{session.score == null ? "待核对" : "分"}</small>
          </span>
          <div>
            <Status>{session.resultStatus || "过程记录"}</Status>
            <h2>
              {student.name} · {student.no}
            </h2>
            <p>
              有效耗时 {session.elapsed} · 暂停时长不计入有效耗时 ·{" "}
              {arrangement.endedAt ? "教师已结束" : "会话仍在进行"}
            </p>
          </div>
        </div>
        <div className="report-numbers">
          <span>
            <small>完成步骤</small>
            <strong>
              {completedCount}/{steps.length}
            </strong>
          </span>
          <span>
            <small>{arrangement.endedAt ? "有效扣分" : "当前有效扣分"}</small>
            <strong>-{recordedDeduction}</strong>
          </span>
          <span>
            <small>待复核</small>
            <strong>{pendingCount}</strong>
          </span>
          <span>
            <small>录像状态</small>
            <Status>{session.recording?.status || "不可用"}</Status>
          </span>
        </div>
      </div>
      {session.recording?.status !== "完整" && (
        <div className="recording-integrity-alert">
          <AlertOutlined />
          <div>
            <strong>
              录像{session.recording?.status || "不可用"}
              ，系统异常不作为学生扣分依据
            </strong>
            <p>
              步骤结果、有效成绩、教师修改和审计记录继续保留；缺失步骤按默认通过规则处理。
              已确认的安全红线仍保持阻断并进入强制复核。
            </p>
          </div>
        </div>
      )}
      <CoverageSummary steps={steps} />
      <div className="report-observation-summary">
        <ObservationTimeline session={session} />
      </div>
      <div className="report-layout">
        <aside className="panel report-steps">
          <PanelTitle title="步骤评价" />
          {steps.map((step, i) => (
            <button
              className={i === sel ? "active" : ""}
              onClick={() => setSel(i)}
              key={step.id}
            >
              <b>{i + 1}</b>
              <span className="report-step__content">
                <strong>{step.name}</strong>
                <span className="report-step__meta">
                  <small>
                    {["pending", "retest_required"].includes(
                      step.scoreDisposition?.status,
                    )
                      ? SCORE_DISPOSITIONS[step.scoreDisposition.status]
                      : step.reviewStatus === "无需复核"
                        ? step.result
                        : step.reviewStatus}
                  </small>
                  <em>
                    {step.effectiveScore}/{step.maxScore}分
                  </em>
                </span>
              </span>
            </button>
          ))}
        </aside>
        <section className="panel evidence">
          <header>
            <div>
              <span className="eyebrow">
                {activeStep.id} · 证据{" "}
                {activeStep.evidenceMetadata?.clipStatus ||
                  activeStep.evidenceStatus}
              </span>
              <h2>{activeStep.name}</h2>
            </div>
            <Status>
              {activeStep.reviewStatus === "无需复核"
                ? activeStep.result
                : activeStep.reviewStatus}
            </Status>
          </header>
          {cameraViews(
            session.evaluationSnapshot?.workstationAiBaseConfigSnapshot || {},
          ).length > 2 && (
            <SessionCameraViewer
              session={session}
              workstation={store.data.workstations.find(
                (w) => w.id === session.workstationId,
              )}
              devices={store.data.devices}
            />
          )}
          <div className="video-compare">
            <figure>
              {activeStep.evidenceMetadata?.cameras?.includes("主视角") ? (
                <img
                  src={
                    sel % 2
                      ? "/assets/workstation-female.png"
                      : "/assets/workstation-male.png"
                  }
                  alt={`${activeStep.name}主视角证据示意图`}
                />
              ) : (
                <div className="missing-evidence-frame">
                  <VideoCameraOutlined />
                  <strong>主视角片段不可用</strong>
                </div>
              )}
              <figcaption>
                主视角 · {activeStep.timeRange} ·{" "}
                {activeStep.evidenceMetadata?.cameras?.includes("主视角")
                  ? "占位示意（媒体未接入）"
                  : "片段缺失"}
              </figcaption>
            </figure>
            {hasFallbackCamera && (
              <figure>
                {activeStep.evidenceMetadata?.cameras?.includes("辅助视角") ? (
                  <img
                    src={
                      sel % 2
                        ? "/assets/workstation-male.png"
                        : "/assets/workstation-female.png"
                    }
                    alt={`${activeStep.name}辅助视角证据示意图`}
                  />
                ) : (
                  <div className="missing-evidence-frame">
                    <VideoCameraOutlined />
                    <strong>辅助视角片段不可用</strong>
                  </div>
                )}
                <figcaption>
                  辅助视角 · {activeStep.timeRange} ·{" "}
                  {activeStep.evidenceMetadata?.cameras?.includes("辅助视角")
                    ? "占位示意（媒体未接入）"
                    : "片段缺失"}
                </figcaption>
              </figure>
            )}
          </div>
          <div className="evidence-explain">
            <span>
              <small>运行状态</small>
              <strong>
                {STEP_EXECUTION_STATES[activeStep.executionState] || "—"} ·{" "}
                {COMPLETION_RESULTS[activeStep.completionResult] || "—"}
              </strong>
            </span>
            <span>
              <small>成绩处理状态</small>
              <strong>
                {SCORE_DISPOSITIONS[activeStep.scoreDisposition?.status] ||
                  "正常计分"}
              </strong>
            </span>
            <span>
              <small>标准要求</small>
              <strong>
                {sop?.steps?.find((item) => item.id === activeStep.id)
                  ?.completionCondition ||
                  `${activeStep.name}满足本次标准快照中的完成条件。`}
              </strong>
            </span>
            <span>
              <small>观察事实</small>
              <strong>{displayBusinessText(activeStep.observation)}</strong>
            </span>
            <span>
              <small>触发规则</small>
              <strong>
                {activeStep.ruleId} · {activeStep.result}
              </strong>
            </span>
            <span>
              <small>分数影响</small>
              <strong
                className={
                  activeStep.effectiveScore < activeStep.maxScore
                    ? "danger-text"
                    : ""
                }
              >
                {activeStep.effectiveScore}/{activeStep.maxScore} 分
              </strong>
            </span>
          </div>
          <StepEvaluationExplanation
            key={activeStep.id}
            step={activeStep}
            teachingStep={sessionStandardMediaStep({
              session,
              arrangement,
              sop,
              stepId: activeStep.id,
            })}
          >
            <EvidenceCameraSummary step={activeStep} session={session} />
          </StepEvaluationExplanation>
          <div className="evidence-timeline">
            <span>
              <small>证据状态</small>
              <strong>
                {activeStep.evidenceMetadata?.clipStatus ||
                  activeStep.evidenceStatus}
              </strong>
            </span>
            <span>
              <small>片段定位</small>
              <strong>{activeStep.timeRange}</strong>
            </span>
            <span>
              <small>摄像头</small>
              <strong>
                {(activeStep.evidenceMetadata?.cameras || []).join("、") ||
                  "无可用画面"}
              </strong>
            </span>
            <span>
              <small>评价快照</small>
              <strong>本次教学标准与工位能力已锁定</strong>
            </span>
          </div>
          {activeStep.evidenceMetadata?.systemAnomaly && (
            <p className="system-evidence-note">
              <AlertOutlined /> {activeStep.evidenceMetadata.scoringPolicy}
            </p>
          )}
          <EvidenceTaskSessionPanel
            session={session}
            arrangement={arrangement}
            readOnly={adminReadOnly}
          />
          <SupportTaskSourcePanel
            arrangement={arrangement}
            session={session}
            readOnly={adminReadOnly}
          />
          {activeTask && (
            <p className="hint">
              本步骤已有未完成补证或补测任务，请从任务入口办理。
            </p>
          )}
          <div className="evidence-actions">
            {!canReview && (
              <p className="hint">
                {adminReadOnly
                  ? "管理员只读查看，不提供复核或改分操作。"
                  : locked
                    ? "成绩已发布；如需更正，可直接修改成绩。"
                    : "会话结束并形成结果后才能进行人工复核。"}
              </p>
            )}
            <Button
              disabled={!canReview || Boolean(activeTask)}
              onClick={review}
            >
              处理步骤复核
            </Button>
            <Button
              disabled={!canAdjust || Boolean(activeTask)}
              type="primary"
              onClick={adjust}
            >
              调整有效得分
            </Button>
            <Button
              disabled={
                !canReview ||
                Boolean(activeTask) ||
                !["pending", "retest_required"].includes(
                  activeStep.scoreDisposition?.status,
                )
              }
              onClick={resolveDisposition}
            >
              处理成绩处置
            </Button>
          </div>
          {(session.reviewHistory || []).length > 0 && (
            <div className="review-history">
              <h3>成绩修改记录</h3>
              {[...session.reviewHistory].reverse().map((item, index) => (
                <article key={`${item.time}-${index}`}>
                  <HistoryOutlined />
                  <div>
                    <strong>
                      {item.stepId} · {item.action} · {item.before}→{item.after}{" "}
                      分
                    </strong>
                    <small>
                      {displayBusinessText(item.time)} · {item.operator} ·{" "}
                      {displayGradeText(item.reason)}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function HistoryCompare() {
  const { id } = useParams();
  const loc = useLocation();
  const { data } = usePrototypeData();
  const requestedStudent = new URLSearchParams(loc.search).get("student");
  const sourceArrangement = data.arrangements.find((item) => item.id === id);
  const eligibleStudents = data.students.filter(
    (student) =>
      data.arrangements.flatMap((arrangement) =>
        arrangement.type !== "practice"
          ? []
          : (arrangement.sessions || []).filter(
              (session) =>
                session.studentId === student.id &&
                ["正式成绩", "已发布"].includes(session.resultStatus),
            ),
      ).length >= 2,
  );
  const [studentId, setStudentId] = useState(
    requestedStudent ||
      sourceArrangement?.studentIds?.[0] ||
      eligibleStudents[0]?.id ||
      "",
  );
  const records = data.arrangements
    .flatMap((arrangement) =>
      arrangement.type !== "practice"
        ? []
        : (arrangement.sessions || [])
            .filter(
              (session) =>
                session.studentId === studentId &&
                ["正式成绩", "已发布"].includes(session.resultStatus),
            )
            .map((session) => ({ arrangement, session })),
    )
    .sort((a, b) =>
      a.arrangement.scheduleStart.localeCompare(b.arrangement.scheduleStart),
    );
  const [beforeId, setBeforeId] = useState(records[0]?.session.id || "");
  const [afterId, setAfterId] = useState(records.at(-1)?.session.id || "");
  const before =
    records.find((item) => item.session.id === beforeId) || records[0];
  const after =
    records.find((item) => item.session.id === afterId) || records.at(-1);
  if (!records.length)
    return (
      <MissingState
        title="该学生暂无可比较的正式练习记录"
        backTo="/teacher/practices"
      />
    );
  const beforeSteps = before?.session.steps || [];
  const afterSteps = after?.session.steps || [];
  const comparable = Boolean(
    before &&
      after &&
      before.arrangement.sopId === after.arrangement.sopId &&
      beforeSteps.length === afterSteps.length &&
      historicalStandardBasis(before.arrangement, before.session).complete &&
      historicalStandardBasis(before.arrangement, before.session).key ===
        historicalStandardBasis(after.arrangement, after.session).key &&
      beforeSteps.every(
        (step, index) =>
          step.id === afterSteps[index]?.id &&
          step.name === afterSteps[index]?.name &&
          Number(step.maxScore) === Number(afterSteps[index]?.maxScore),
      ),
  );
  const dimensions = (before?.session.steps || []).map((step) => {
    const other = after?.session.steps.find((item) => item.id === step.id);
    return [
      step.id,
      step.name,
      Number(step.effectiveScore || 0),
      Number(other?.effectiveScore || 0),
      Number(step.maxScore || 0),
      Number(other?.maxScore || 0),
    ];
  });
  const student = data.students.find((item) => item.id === studentId);
  return (
    <>
      <PageHeader
        back
        title={`练习历史比较 · ${student?.name || "选择学生"}`}
        subtitle="先选择同一学生的两次正式记录；不同实训标准或步骤结构会提示不可直接比较"
      />
      <section className="panel comparison">
        <div className="comparison-controls">
          <label className="field">
            学生
            <select
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setBeforeId("");
                setAfterId("");
              }}
            >
              {eligibleStudents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.no}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            基准记录
            <select
              value={before?.session.id || ""}
              onChange={(event) => setBeforeId(event.target.value)}
            >
              {records.map((item) => (
                <option
                  key={`before-${item.session.id}`}
                  value={item.session.id}
                >
                  {displayBusinessText(item.arrangement.scheduleStart)?.slice(
                    0,
                    10,
                  )}{" "}
                  · {item.arrangement.name} · {item.session.score}分
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            对比记录
            <select
              value={after?.session.id || ""}
              onChange={(event) => setAfterId(event.target.value)}
            >
              {records.map((item) => (
                <option
                  key={`after-${item.session.id}`}
                  value={item.session.id}
                >
                  {displayBusinessText(item.arrangement.scheduleStart)?.slice(
                    0,
                    10,
                  )}{" "}
                  · {item.arrangement.name} · {item.session.score}分
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="comparison-head">
          <span>
            <small>
              基准 ·{" "}
              {displayBusinessText(before?.arrangement.scheduleStart)?.slice(
                0,
                10,
              )}
            </small>
            <strong>{before?.session.score}分</strong>
            <Status>
              {data.sops.find((item) => item.id === before?.arrangement.sopId)
                ?.name || "历史标准"}
            </Status>
          </span>
          <span className="comparison-arrow">
            →
            <b>
              {comparable
                ? `${Number(after?.session.score || 0) - Number(before?.session.score || 0) >= 0 ? "+" : ""}${Number(after?.session.score || 0) - Number(before?.session.score || 0)} 原始分`
                : "不可直接比较"}
            </b>
          </span>
          <span>
            <small>
              对比 ·{" "}
              {displayBusinessText(after?.arrangement.scheduleStart)?.slice(
                0,
                10,
              )}
            </small>
            <strong>{after?.session.score}分</strong>
            <Status>
              {data.sops.find((item) => item.id === after?.arrangement.sopId)
                ?.name || "历史标准"}
            </Status>
          </span>
        </div>
        <div className="comparison-legend" aria-label="图例">
          <span>
            <i />
            首次练习
          </span>
          <span>
            <i className="latest" />
            最近练习
          </span>
          <small>各维度按该步骤满分归一化显示</small>
        </div>
        <div className="compare-chart">
          {dimensions.map(
            ([stepId, label, beforeScore, afterScore, beforeMax, afterMax]) => (
              <div key={stepId}>
                <label>
                  {stepId}
                  <small>{label}</small>
                </label>
                <span aria-label={`基准记录 ${beforeScore} / ${beforeMax} 分`}>
                  <i
                    style={{
                      width: `${beforeMax ? (beforeScore / beforeMax) * 100 : 0}%`,
                    }}
                  />
                </span>
                <b>
                  {beforeScore}/{beforeMax}
                </b>
                <span aria-label={`对比记录 ${afterScore} / ${afterMax} 分`}>
                  <i
                    className="latest"
                    style={{
                      width: `${afterMax ? (afterScore / afterMax) * 100 : 0}%`,
                    }}
                  />
                </span>
                <b className="latest-score">
                  {afterScore}/{afterMax}
                </b>
              </div>
            ),
          )}
        </div>
        <div className="comparison-note">
          <AlertOutlined />
          <div>
            <strong>
              {comparable
                ? "同一标准下的两次记录"
                : "所选记录不可直接解释为能力变化"}
            </strong>
            <p>
              {comparable
                ? "两次记录引用同一实训标准，步骤名称和分值结构一致。柱形按各自步骤满分归一化，顶部保留原始分。"
                : "两次记录使用不同实训标准或步骤结构，只展示原始事实，不计算或宣称能力提升。"}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function versionNumber(value = "") {
  const parts = String(value).match(/\d+/g)?.map(Number) || [];
  return parts.reduce((total, part) => total * 10000 + part, 0);
}

function newestVersion(items = []) {
  return [...items].sort(
    (a, b) =>
      versionNumber(b.version) - versionNumber(a.version) ||
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  )[0];
}

function AiDatasetSamples({ sop, setModal }) {
  const store = usePrototypeData();
  const dataset = newestVersion(
    store.data.datasets.filter((item) => item.sopId === sop.id),
  );
  const reviewRef = useRef(null);
  const [status, setStatus] = useState("全部状态");
  const [query, setQuery] = useState("");
  const samples = store.data.learningSamples.filter(
    (sample) =>
      sample.sopId === sop.id &&
      (status === "全部状态" || sample.status === status) &&
      `${sample.fileName} ${sample.source} ${sample.label}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const review = (sample) => {
    setModal({
      title: "复核动作训练样本",
      size: "large",
      content: (
        <ReviewSampleForm
          ref={reviewRef}
          sample={sample}
          sop={sop}
          acceptLabel={
            dataset?.status === "已锁定"
              ? `纳入 ${dataset.nextVersion || `D${versionNumber(dataset.version) + 1}`}`
              : `纳入当前 ${dataset?.version || "数据集"}`
          }
        />
      ),
      confirmText: "保存复核结论",
      onConfirm: () => {
        const form = reviewRef.current.getValue();
        const nextStatus = store.reviewLearningSample(
          sample.id,
          form.decision,
          form.label,
          form.note,
        );
        return `${sample.fileName}：${nextStatus}`;
      },
    });
  };
  const promote = (sample) => {
    setModal({
      title: "转入正式数据生产链",
      content: (
        <div className="form-stack">
          <p>
            将困难样本候选 <strong>{sample.fileName}</strong>{" "}
            转为源视频，之后仍需完成时间片段标注、审核和数据集纳入，不会直接进入训练集。
          </p>
          <p className="hint">
            来源实训记录：{sample.sourceSessionId || "未记录"} · 步骤：
            {sample.sourceStepId || sample.label || "未记录"}
          </p>
        </div>
      ),
      confirmText: "转入数据生产",
      onConfirm: () => {
        store.promoteDifficultSample(sample.id);
        return `${sample.fileName} 已转入源视频待加工队列`;
      },
    });
  };
  return (
    <section className="panel panel--table ai-sample-panel">
      <PanelTitle
        title="样本审核"
        action={
          <Status>
            {samples.filter((item) => item.status === "待审核").length} 条待审核
          </Status>
        }
      />
      <Toolbar
        placeholder="搜索视频文件、来源或标签"
        filters={[
          "全部状态",
          "待加工",
          "已转数据生产",
          "待审核",
          "已纳入",
          "已拒绝",
        ]}
        value={query}
        filterValue={status}
        onChange={setQuery}
        onFilterChange={setStatus}
        onRefresh={() => {
          setQuery("");
          setStatus("全部状态");
        }}
      />
      <DataTable
        pagination
        columns={["视频片段", "来源", "AI建议", "确认标签", "状态", "更新时间"]}
        rows={samples.map((sample) => [
          sample.fileName,
          sample.source,
          sample.aiPrediction,
          sample.label,
          sample.status,
          sample.reviewedAt || sample.createdAt || "—",
        ])}
        statusColumns={[4]}
        onView={(_, index) =>
          samples[index].status === "待加工"
            ? promote(samples[index])
            : review(samples[index])
        }
        viewLabel={(_, index) =>
          samples[index].status === "待加工" ? "转入数据生产" : "复核"
        }
        emptyText="当前实训标准暂无样本"
      />
    </section>
  );
}

const MappingRejectForm = forwardRef(function MappingRejectForm(_, ref) {
  const [comment, setComment] = useState("");
  useImperativeHandle(ref, () => ({
    getValue() {
      if (!comment.trim()) throw new Error("请填写需要修改的业务口径。");
      return comment.trim();
    },
  }));
  return (
    <label className="field">
      <FieldLabel required>修改意见</FieldLabel>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="请指出与实训标准不一致的判断项或处置方式。"
      />
    </label>
  );
});

function TeacherMappingReview({ setModal }) {
  const nav = useNavigate();
  const { id, mappingId } = useParams();
  const store = usePrototypeData();
  const sop = store.data.sops.find((item) => item.id === id);
  const status = sop ? store.getSopMappingStatus(sop.id) : null;
  const mapping = status?.mapping?.id === mappingId ? status.mapping : null;
  const rejectRef = useRef(null);
  if (!sop || !mapping)
    return (
      <MissingState
        title="AI业务口径不存在或已失效"
        backTo={`/teacher/sop/${id}`}
      />
    );
  const roleText = (roles) =>
    roles.map((role) => EVALUATION_ITEM_ROLES[role]).join("、");
  const confirm = () =>
    setModal({
      title: "确认AI业务判断口径",
      content: (
        <p>
          确认后 {mapping.version}{" "}
          将被冻结。此操作只确认业务含义，不代表当前AI能力已经可用。
        </p>
      ),
      confirmText: "确认业务口径",
      onConfirm: () => {
        store.reviewEvaluationMapping(mapping.id, true);
        window.setTimeout(() => nav(`/teacher/sop/${sop.id}`), 0);
        return "业务口径已确认；AI能力仍需独立完成建设和验证";
      },
    });
  const reject = () =>
    setModal({
      title: "退回修改",
      content: <MappingRejectForm ref={rejectRef} />,
      confirmText: "退回AI实施人员",
      onConfirm: () => {
        const comment = rejectRef.current.getValue();
        store.reviewEvaluationMapping(mapping.id, false, comment);
        window.setTimeout(() => nav(`/teacher/sop/${sop.id}`), 0);
        return "已退回修改";
      },
    });
  return (
    <>
      <PageHeader
        back
        title={`${sop.name} · AI业务口径确认`}
        subtitle={`${sop.name} / ${mapping.version} · 教师只确认业务含义、规则来源和无法判断时的处理`}
        actions={
          mapping.status === "pending_teacher_confirmation" ? (
            <>
              <Button onClick={reject}>退回修改</Button>
              <Button type="primary" onClick={confirm}>
                确认业务口径
              </Button>
            </>
          ) : null
        }
      />
      <section className="sop-boundary-note">
        <SafetyCertificateOutlined />
        <div>
          <strong>确认评价映射 ≠ AI能力可用</strong>
          <p>后续数据、能力包和工位验证未完成时，系统仍不能启用自动评价。</p>
        </div>
        <Status>{status.status}</Status>
      </section>
      <section className="panel mapping-teacher-summary">
        <PanelTitle title="评价口径摘要" />
        <div className="definition-list">
          <span>
            <small>评价项</small>
            <strong>{mapping.evaluationItems.length} 项</strong>
          </span>
          <span>
            <small>完成判断</small>
            <strong>
              {
                mapping.evaluationItems.filter((item) =>
                  item.roles.includes("completion"),
                ).length
              }{" "}
              项
            </strong>
          </span>
          <span>
            <small>评分依据</small>
            <strong>
              {
                mapping.evaluationItems.filter((item) =>
                  item.roles.includes("scoring"),
                ).length
              }{" "}
              项
            </strong>
          </span>
          <span>
            <small>安全提醒</small>
            <strong>
              {
                mapping.evaluationItems.filter((item) =>
                  item.roles.includes("safety"),
                ).length
              }{" "}
              项
            </strong>
          </span>
        </div>
      </section>
      <section className="panel mapping-teacher-items">
        <PanelTitle title="逐项核对" />
        {mapping.evaluationItems.map((item) => {
          const step = sop.steps.find((entry) => entry.id === item.stepId);
          const scoreRules = (sop.scoreRules || []).filter((rule) =>
            item.sourceScoreRuleIds.includes(rule.id),
          );
          const safetyRules = (sop.safetyRules || []).filter((rule) =>
            item.sourceSafetyRuleIds.includes(rule.id),
          );
          return (
            <article key={item.id}>
              <header>
                <span>
                  <small>
                    {step?.id} · {step?.name}
                  </small>
                  <strong>{item.name}</strong>
                </span>
                <Status>{roleText(item.roles)}</Status>
              </header>
              {item.roles.includes("completion") && (
                <p>
                  <b>完成判断：</b>
                  {item.sourceCompletion}
                </p>
              )}
              {scoreRules.map((rule) => (
                <p key={rule.id}>
                  <b>评分依据：</b>
                  {rule.name}（{SCORE_DEDUCTION_MODES[rule.deductionMode]}
                  {rule.deductionMode === "fixed_deduction"
                    ? ` ${rule.deductionValue}分`
                    : ""}
                  ）
                </p>
              ))}
              {safetyRules.map((rule) => (
                <p key={rule.id}>
                  <b>安全标准：</b>
                  {rule.name}；{SAFETY_SCORE_TREATMENTS[rule.scoreTreatment]}
                </p>
              ))}
              {item.scoreTreatment?.type === "no_deduction" && (
                <p>
                  <b>未完成处置：</b>不扣分；
                  {displayBusinessText(item.scoreTreatment.note)}
                </p>
              )}
              <footer>
                <SafetyCertificateOutlined />
                系统无法可靠确认时，不自动作负向判断，由教师按需复核。
              </footer>
            </article>
          );
        })}
      </section>
    </>
  );
}

const AI_CONFIG_STEP_STATUSES = {
  unconfigured: "未配置",
  configuring: "配置中",
  complete: "已完成",
  no_ai: "无需AI",
};

const AI_CONFIG_FLOW_TREATMENTS = {
  allow: "允许继续",
  teacher_review: "转教师确认",
  record_only: "仅记录",
  terminate: "终止本次评价",
};

function aiExpectedModeLabel(step) {
  return (
    AI_ACTUAL_EVALUATION_MODES[
      step?.expectedJudgementMode || step?.judgementMode
    ] || "未设置"
  );
}

const AiLogicalAreaForm = forwardRef(function AiLogicalAreaForm(_, ref) {
  const [form, setForm] = useState({ name: "", description: "" });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  return (
    <div className="form-stack">
      <label className="field">
        <FieldLabel required>区域名称</FieldLabel>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="例如：工具放置区"
        />
      </label>
      <label className="field">
        区域说明
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="说明该区域在业务中的用途。本轮不配置摄像头坐标。"
        />
      </label>
    </div>
  );
});

function defaultAiCondition(capability) {
  return {
    id: "",
    capabilityId: capability?.id || "",
    operator:
      capability?.type === "action_recognition" ? "recognized" : "appears",
    logicalAreaId: "",
    minTargetCount: 1,
    minDurationSeconds: 0,
    minOccurrences: 1,
    withinCurrentStep: true,
  };
}

export const AiJudgementItemForm = forwardRef(function AiJudgementItemForm(
  { initial, step, capabilities, logicalAreas },
  ref,
) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const firstCapability = capabilities[0];
  const [form, setForm] = useState(() =>
    initial
      ? JSON.parse(JSON.stringify(initial))
      : {
          id: "",
          stepId: step.id,
          name: "",
          purposes: ["completion"],
          scoreRuleIds: [],
          safetyRuleIds: [],
          combination: "all",
          completionBasis: "action",
          sameActorRequired: true,
          observationScope: "current_step",
          conditions: firstCapability
            ? [defaultAiCondition(firstCapability)]
            : [],
        },
  );
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key, value) =>
    update(
      key,
      (form[key] || []).includes(value)
        ? form[key].filter((item) => item !== value)
        : [...(form[key] || []), value],
    );
  const visibleCapabilities = capabilities.filter(
    (capability) =>
      (!query.trim() ||
        `${capability.name} ${capability.targetName} ${capability.description}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase())) &&
      (!typeFilter || capability.type === typeFilter),
  );
  const updateCondition = (index, patchValue) =>
    update(
      "conditions",
      form.conditions.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, ...patchValue } : condition,
      ),
    );
  const scoreRules = (step.scoreRules || []).filter(Boolean);
  const safetyRules = (step.safetyRules || []).filter(Boolean);
  return (
    <div className="form-stack ai-judgement-form">
      <label className="field">
        <FieldLabel required>判断项名称</FieldLabel>
        <input
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="例如：确认绝缘手套已佩戴"
        />
      </label>
      <StandardMediaSection key={`teaching-${step.id}`} step={step} />
      <RequirementsView step={step} />
      {!!step.visualRequirements?.length && (
        <label className="field">
          关联教师可见要求
          <select
            value={form.requirementId || ""}
            onChange={(e) => {
              update("requirementId", e.target.value);
              const r = step.visualRequirements.find(
                (r) => r.id === e.target.value,
              );
              update(
                "completionBasis",
                r?.assessDonning
                  ? "both"
                  : r?.target === "state"
                    ? "state"
                    : "action",
              );
            }}
          >
            <option value="">请选择</option>
            {step.visualRequirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-row">
        <label className="field">
          完成证据
          <select
            value={form.completionBasis || "action"}
            onChange={(e) => update("completionBasis", e.target.value)}
          >
            {Object.entries(COMPLETION_BASES).map(([k, v]) => (
              <option key={k} value={k}>
                {displayBusinessText(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          观察范围
          <select
            value={form.observationScope || "current_step"}
            onChange={(e) => update("observationScope", e.target.value)}
          >
            <option value="current_step">当前步骤</option>
            <option value="session">全程记录，按教师规则使用</option>
          </select>
        </label>
      </div>
      <label className="check-row">
        <input type="checkbox" checked disabled />
        事实必须属于当前已确认主操作人
      </label>
      <div className="ai-config-purpose-picker">
        <small>判断用途（可多选）</small>
        {Object.entries(AI_JUDGEMENT_PURPOSES).map(([value, label]) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={form.purposes.includes(value)}
              onChange={() => toggle("purposes", value)}
            />
            {label}
          </label>
        ))}
      </div>
      {form.purposes.includes("completion") && (
        <div className="ai-config-readonly-value">
          <small>关联完成条件</small>
          <strong>{step.completionCondition || "教师未填写"}</strong>
        </div>
      )}
      {form.purposes.includes("scoring") && (
        <div className="ai-config-reference-picker">
          <small>关联教师评分规则</small>
          {scoreRules.map((rule) => (
            <label key={rule.id}>
              <input
                type="checkbox"
                checked={form.scoreRuleIds.includes(rule.id)}
                onChange={() => toggle("scoreRuleIds", rule.id)}
              />
              {rule.name || rule.id}
            </label>
          ))}
          {!scoreRules.length && (
            <p className="hint">本步骤没有教师评分规则。</p>
          )}
        </div>
      )}
      {form.purposes.includes("safety") && (
        <div className="ai-config-reference-picker">
          <small>关联教师安全规则</small>
          {safetyRules.map((rule) => (
            <label key={rule.id}>
              <input
                type="checkbox"
                checked={form.safetyRuleIds.includes(rule.id)}
                onChange={() => toggle("safetyRuleIds", rule.id)}
              />
              {rule.name || rule.id}
            </label>
          ))}
          {!safetyRules.length && (
            <p className="hint">本步骤没有教师安全规则。</p>
          )}
        </div>
      )}
      <div className="ai-config-condition-heading">
        <div>
          <strong>AI能力与判断条件</strong>
          <small>只可引用已有当前发布模型的AI能力。</small>
        </div>
        <Button
          icon={<PlusOutlined />}
          disabled={!capabilities.length}
          onClick={() =>
            update("conditions", [
              ...form.conditions,
              defaultAiCondition(firstCapability),
            ])
          }
        >
          添加条件
        </Button>
      </div>
      {!!capabilities.length && (
        <div className="form-row ai-capability-filter-row">
          <label className="field">
            搜索能力
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="名称、识别对象或说明"
            />
          </label>
          <label className="field">
            能力类型
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">全部类型</option>
              {Object.entries(AI_CAPABILITY_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!capabilities.length && (
        <div className="evaluation-notice evaluation-notice--warning">
          <AlertOutlined />
          <span>
            当前没有可引用的已发布AI能力，请先到AI能力库完成模型发布。
          </span>
        </div>
      )}
      <div className="ai-config-condition-list">
        {form.conditions.map((condition, index) => {
          const selected = capabilities.find(
            (item) => item.id === condition.capabilityId,
          );
          const options = selected
            ? [
                selected,
                ...visibleCapabilities.filter(
                  (item) => item.id !== selected.id,
                ),
              ]
            : visibleCapabilities;
          const isObject = selected?.type === "object_detection";
          return (
            <article key={condition.id || `condition-${index}`}>
              <header>
                <strong>条件 {index + 1}</strong>
                <button
                  type="button"
                  className="table-action table-action--danger"
                  onClick={() =>
                    update(
                      "conditions",
                      form.conditions.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                >
                  删除
                </button>
              </header>
              <label className="field">
                引用AI能力
                <select
                  value={condition.capabilityId}
                  onChange={(event) => {
                    const nextCapability = capabilities.find(
                      (item) => item.id === event.target.value,
                    );
                    updateCondition(index, {
                      ...defaultAiCondition(nextCapability),
                      id: condition.id,
                    });
                  }}
                >
                  <option value="">请选择</option>
                  {options.map((capability) => (
                    <option key={capability.id} value={capability.id}>
                      {capability.name} · {AI_CAPABILITY_TYPES[capability.type]}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <div className="ai-config-capability-meta">
                  <span>{AI_CAPABILITY_TYPES[selected.type]}</span>
                  <span>识别目标：{selected.targetName || "—"}</span>
                  <span>
                    最近发布：
                    {displayBusinessText(
                      selected.currentPublishedModel?.publishedAt || "—",
                    )}
                  </span>
                  <p>{selected.description || "暂无能力说明"}</p>
                </div>
              )}
              {selected && (
                <div className="form-row">
                  <label className="field">
                    判断条件
                    <select
                      value={condition.operator}
                      onChange={(event) =>
                        updateCondition(index, { operator: event.target.value })
                      }
                    >
                      {Object.entries(
                        isObject
                          ? OBJECT_DETECTION_OPERATORS
                          : ACTION_RECOGNITION_OPERATORS,
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    最少出现次数
                    <input
                      type="number"
                      min="1"
                      value={condition.minOccurrences}
                      onChange={(event) =>
                        updateCondition(index, {
                          minOccurrences: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              )}
              {selected && !isObject && (
                <div className="form-row">
                  <label className="field">
                    动作最短持续时间（秒）
                    <input
                      type="number"
                      min="0"
                      value={condition.minDurationSeconds || 0}
                      onChange={(e) =>
                        updateCondition(index, {
                          minDurationSeconds: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    动作发生区域
                    <select
                      value={condition.logicalAreaId || ""}
                      onChange={(e) =>
                        updateCondition(index, {
                          logicalAreaId: e.target.value,
                        })
                      }
                    >
                      <option value="">不限制区域</option>
                      {logicalAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {isObject && (
                <>
                  {["enters_area", "in_area"].includes(condition.operator) && (
                    <label className="field">
                      逻辑区域
                      <select
                        value={condition.logicalAreaId || ""}
                        onChange={(event) =>
                          updateCondition(index, {
                            logicalAreaId: event.target.value,
                          })
                        }
                      >
                        <option value="">请选择</option>
                        {logicalAreas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="form-row">
                    <label className="field">
                      最少目标数量
                      <input
                        type="number"
                        min="1"
                        value={condition.minTargetCount}
                        onChange={(event) =>
                          updateCondition(index, {
                            minTargetCount: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      最短持续时间（秒）
                      <input
                        type="number"
                        min="0"
                        value={condition.minDurationSeconds}
                        onChange={(event) =>
                          updateCondition(index, {
                            minDurationSeconds: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </>
              )}
              {selected?.type === "action_recognition" && (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={condition.withinCurrentStep !== false}
                    onChange={(event) =>
                      updateCondition(index, {
                        withinCurrentStep: event.target.checked,
                      })
                    }
                  />
                  仅在当前步骤有效时间内判断
                </label>
              )}
            </article>
          );
        })}
      </div>
      <label className="field">
        多条件组合
        <select
          value={form.combination}
          onChange={(event) => update("combination", event.target.value)}
        >
          {Object.entries(AI_CONDITION_COMBINATIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="ai-config-fallback">
        <SafetyCertificateOutlined />
        <span>{FIXED_AI_FALLBACK}</span>
      </div>
    </div>
  );
});

function AiRuleTreatmentRow({
  sopId,
  stepId,
  kind,
  rule,
  saved,
  items,
  store,
}) {
  const [draft, setDraft] = useState(() => ({
    mode: saved?.mode || "",
    reason: saved?.reason || "",
    judgementItemId: saved?.judgementItemId || "",
  }));
  useEffect(() => {
    setDraft({
      mode: saved?.mode || "",
      reason: saved?.reason || "",
      judgementItemId: saved?.judgementItemId || "",
    });
  }, [saved?.mode, saved?.reason, saved?.judgementItemId]);
  const purpose = kind === "score" ? "scoring" : "safety";
  const ruleField = kind === "score" ? "scoreRuleIds" : "safetyRuleIds";
  const candidates = items.filter(
    (item) =>
      item.purposes?.includes(purpose) && item[ruleField]?.includes(rule.id),
  );
  return (
    <article className="ai-config-rule-row">
      <div className="ai-config-rule-row__identity">
        <strong>{rule.name || rule.id}</strong>
        <small>{rule.id}</small>
      </div>
      <div className="ai-config-rule-row__controls">
        <label className="field">
          处理方式
          <select
            value={draft.mode}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                mode: event.target.value,
                judgementItemId:
                  event.target.value === "teacher"
                    ? ""
                    : current.judgementItemId,
              }))
            }
          >
            <option value="">请选择</option>
            <option value="ai">
              {kind === "score" ? "由AI判断" : "AI辅助监测"}
            </option>
            <option value="teacher">由教师处理</option>
          </select>
        </label>
        {draft.mode === "ai" && (
          <label className="field">
            关联判断项
            <select
              value={draft.judgementItemId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  judgementItemId: event.target.value,
                }))
              }
            >
              <option value="">请选择</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {!candidates.length && (
              <small className="form-error">请先新增关联本规则的判断项。</small>
            )}
          </label>
        )}
        {draft.mode === "teacher" && (
          <label className="field">
            教师处理原因
            <input
              value={draft.reason}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              placeholder="请说明摄像头无法可靠判断的原因"
            />
          </label>
        )}
        <Button
          disabled={
            !draft.mode ||
            (draft.mode === "teacher" && !draft.reason.trim()) ||
            (draft.mode === "ai" && !draft.judgementItemId)
          }
          onClick={() =>
            store.saveAiRuleTreatment(sopId, {
              stepId,
              kind,
              ruleId: rule.id,
              ...draft,
            })
          }
        >
          保存
        </Button>
      </div>
    </article>
  );
}

export function AiConfigStepCard({
  sop,
  step,
  index,
  config,
  evaluation,
  capabilities,
  store,
  setModal,
  nav,
}) {
  const stepConfig =
    config.stepConfigs.find((item) => item.stepId === step.id) || {};
  const stepResult = evaluation.stepResults.find(
    (item) => item.stepId === step.id,
  ) || { status: "unconfigured", issues: [] };
  const items = config.judgementItems.filter((item) => item.stepId === step.id);
  const scoreRules = (sop.scoreRules || []).filter(
    (rule) => rule.stepId === step.id,
  );
  const safetyRules = (sop.safetyRules || []).filter(
    (rule) => rule.stepId === step.id,
  );
  const expected = step.expectedJudgementMode || step.judgementMode;
  const allowedModes = allowedActualEvaluationModes(expected);
  const [modeDraft, setModeDraft] = useState(
    stepConfig.actualEvaluationMode || "",
  );
  const [reasonDraft, setReasonDraft] = useState(
    stepConfig.downgradeReason || "",
  );
  useEffect(() => {
    setModeDraft(stepConfig.actualEvaluationMode || "");
    setReasonDraft(stepConfig.downgradeReason || "");
  }, [stepConfig.actualEvaluationMode, stepConfig.downgradeReason]);
  const openItemForm = (item) => {
    const formRef = createRef();
    setModal({
      title: item ? "编辑AI判断项" : "新增AI判断项",
      size: "large",
      content: (
        <AiJudgementItemForm
          ref={formRef}
          initial={item}
          step={{ ...step, scoreRules, safetyRules }}
          capabilities={capabilities}
          logicalAreas={config.logicalAreas}
        />
      ),
      confirmText: item ? "保存修改" : "创建判断项",
      onConfirm: () => {
        store.saveAiJudgementItem(sop.id, formRef.current.getValue());
        return item ? "AI判断项已更新" : "AI判断项已创建";
      },
    });
  };
  return (
    <details className="panel ai-config-step" open={index === 0}>
      <summary>
        <span className="ai-config-step__index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span>
          <strong>
            {step.id} · {step.name || "未命名步骤"}
          </strong>
          <small>教师期望：{aiExpectedModeLabel(step)}</small>
        </span>
        <Status>{AI_CONFIG_STEP_STATUSES[stepResult.status]}</Status>
      </summary>
      <div className="ai-config-step__body">
        <section className="ai-config-teacher-standard">
          <header>
            <LockOutlined />
            <div>
              <strong>教师标准（只读）</strong>
              <small>AI配置仅引用这些业务标准，不能在这里修改。</small>
            </div>
          </header>
          <div className="ai-config-readonly-grid">
            <div className="wide">
              <small>教学内容</small>
              <strong>{step.teachingInstruction || "教师未填写"}</strong>
            </div>
            <div className="wide">
              <small>完成条件</small>
              <strong>{step.completionCondition || "教师未填写"}</strong>
            </div>
            <div>
              <small>本步骤分值</small>
              <strong>{step.score ?? 0} 分</strong>
            </div>
            <div>
              <small>未完成处理</small>
              <strong>
                {INCOMPLETE_POLICIES[step.incompletePolicy]?.label ||
                  "教师未明确"}
              </strong>
            </div>
            <div>
              <small>期望评价方式</small>
              <strong>{aiExpectedModeLabel(step)}</strong>
            </div>
            <div>
              <small>前置步骤</small>
              <strong>{step.predecessor || "无"}</strong>
            </div>
          </div>
          <StandardMediaSection
            key={`teaching-${step.id}`}
            step={step}
            note="仅作教学参考，AI训练样本在能力库中单独采集与标注。"
          />
          <div className="ai-config-teacher-rules">
            <article>
              <strong>评分规则</strong>
              {scoreRules.map((rule) => (
                <p key={rule.id}>{rule.name || rule.id}</p>
              ))}
              {!scoreRules.length && <p>无结构化评分规则</p>}
            </article>
            <article>
              <strong>安全规则</strong>
              {safetyRules.map((rule) => (
                <p key={rule.id}>{rule.name || rule.id}</p>
              ))}
              {!safetyRules.length && <p>无结构化安全规则</p>}
            </article>
            <article>
              <strong>流程规则</strong>
              <p>
                错序：
                {AI_CONFIG_FLOW_TREATMENTS[
                  step.flowPolicy?.wrongOrder?.treatment
                ] || "教师未设置"}
              </p>
              <p>
                重复：
                {AI_CONFIG_FLOW_TREATMENTS[
                  step.flowPolicy?.repeat?.treatment
                ] || "教师未设置"}
              </p>
              <p>
                超时：
                {AI_CONFIG_FLOW_TREATMENTS[
                  step.flowPolicy?.timeout?.treatment
                ] || "教师未设置"}
              </p>
            </article>
          </div>
        </section>
        <section className="ai-config-workspace">
          <header>
            <div>
              <strong>AI判断配置</strong>
              <small>按本步骤业务标准组装已发布AI能力。</small>
            </div>
            <Status>{AI_CONFIG_STEP_STATUSES[stepResult.status]}</Status>
          </header>
          <div className="ai-config-mode-editor">
            <div className="ai-config-mode-editor__primary">
              <label className="field">
                实际评价方式
                <select
                  value={modeDraft}
                  onChange={(event) => setModeDraft(event.target.value)}
                >
                  <option value="">请选择</option>
                  {allowedModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {AI_ACTUAL_EVALUATION_MODES[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="primary"
                disabled={
                  !modeDraft ||
                  (isEvaluationModeDowngraded(expected, modeDraft) &&
                    !reasonDraft.trim())
                }
                onClick={() =>
                  store.saveAiStepConfig(sop.id, {
                    stepId: step.id,
                    actualEvaluationMode: modeDraft,
                    downgradeReason: reasonDraft,
                  })
                }
              >
                保存评价方式
              </Button>
            </div>
            {isEvaluationModeDowngraded(expected, modeDraft) && (
              <label className="field ai-config-downgrade-reason">
                <FieldLabel required>降级原因</FieldLabel>
                <textarea
                  value={reasonDraft}
                  onChange={(event) => setReasonDraft(event.target.value)}
                  placeholder="说明当前摄像头或AI能力无法可靠完成判断的原因"
                />
              </label>
            )}
          </div>
          <div className="ai-config-subsection">
            <div className="ai-config-subsection__header">
              <div>
                <strong>AI判断项</strong>
                <small>完成、评分和安全用途均需引用教师原始标准。</small>
              </div>
              <Button icon={<PlusOutlined />} onClick={() => openItemForm()}>
                新增判断项
              </Button>
            </div>
            {!capabilities.length && (
              <div className="evaluation-notice evaluation-notice--warning">
                <AlertOutlined />
                <span>暂无可引用的已发布AI能力。</span>
                <Button
                  onClick={() =>
                    nav(
                      `${AI_CAPABILITIES_PATH}?fromSopId=${encodeURIComponent(sop.id)}&stepId=${encodeURIComponent(step.id)}`,
                    )
                  }
                >
                  前往AI能力库
                </Button>
              </div>
            )}
            <div className="ai-config-item-list">
              {items.map((item) => (
                <article key={item.id}>
                  <header>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.purposes
                          .map((purpose) => AI_JUDGEMENT_PURPOSES[purpose])
                          .join(" · ")}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="table-action"
                        onClick={() => openItemForm(item)}
                      >
                        编辑
                      </button>
                      <button
                        className="table-action table-action--danger"
                        onClick={() =>
                          setModal({
                            title: "删除AI判断项",
                            content: (
                              <p>
                                删除“{item.name}
                                ”会同时失去其完成、评分或安全规则覆盖，配置可能重新变为不完整。确认删除？
                              </p>
                            ),
                            confirmText: "确认删除",
                            onConfirm: () => {
                              store.deleteAiJudgementItem(sop.id, item.id);
                              return "AI判断项已删除";
                            },
                          })
                        }
                      >
                        删除
                      </button>
                    </div>
                  </header>
                  <div className="ai-config-item-tags">
                    {(item.conditions || []).map((condition) => {
                      const capability = capabilities.find(
                        (entry) => entry.id === condition.capabilityId,
                      );
                      return (
                        <span key={condition.id}>
                          {capability?.name || "能力引用异常"}
                        </span>
                      );
                    })}
                    <span>
                      {AI_CONDITION_COMBINATIONS[item.combination] ||
                        "组合未设置"}
                    </span>
                  </div>
                  <p>{FIXED_AI_FALLBACK}</p>
                </article>
              ))}
              {!items.length && (
                <p className="hint">本步骤尚未添加AI判断项。</p>
              )}
            </div>
          </div>
          {!!scoreRules.length && (
            <div className="ai-config-subsection">
              <div className="ai-config-subsection__header">
                <div>
                  <strong>评分规则覆盖</strong>
                  <small>逐条选择由AI判断或由教师处理。</small>
                </div>
              </div>
              {scoreRules.map((rule) => (
                <AiRuleTreatmentRow
                  key={rule.id}
                  sopId={sop.id}
                  stepId={step.id}
                  kind="score"
                  rule={rule}
                  saved={stepConfig.scoreRuleTreatments?.find(
                    (entry) => entry.ruleId === rule.id,
                  )}
                  items={items}
                  store={store}
                />
              ))}
            </div>
          )}
          {!!safetyRules.length && (
            <div className="ai-config-subsection">
              <div className="ai-config-subsection__header">
                <div>
                  <strong>安全规则覆盖</strong>
                  <small>逐条选择AI辅助监测或由教师处理。</small>
                </div>
              </div>
              {safetyRules.map((rule) => (
                <AiRuleTreatmentRow
                  key={rule.id}
                  sopId={sop.id}
                  stepId={step.id}
                  kind="safety"
                  rule={rule}
                  saved={stepConfig.safetyRuleTreatments?.find(
                    (entry) => entry.ruleId === rule.id,
                  )}
                  items={items}
                  store={store}
                />
              ))}
            </div>
          )}
          {!!stepResult.issues.length && (
            <div className="ai-config-step-issues">
              <strong>当前步骤还需完善</strong>
              {stepResult.issues.map((issue) => (
                <p key={issue}>
                  <AlertOutlined /> {issue}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </details>
  );
}

function AiCapabilityConfigList() {
  const nav = useNavigate();
  const { data } = usePrototypeData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部配置状态");
  const [majorFilter, setMajorFilter] = useState("全部专业");
  const [ownerFilter, setOwnerFilter] = useState("全部教师");
  const sops = getConfigurableSops(data?.sops);
  const capabilities = data?.aiCapabilities || [];
  const entries = sops.map((sop) => {
    const config = (data.aiCapabilityConfigs || []).find(
      (item) => item.sopId === sop.id,
    );
    const evaluation = evaluateAiCapabilityConfig({
      sop,
      config,
      capabilities,
    });
    const workstationConfigs = config
      ? (data.sopWorkstationAiConfigs || []).filter(
          (item) => item.sopAiConfigId === config.id,
        )
      : [];
    const runnableCount = workstationConfigs.filter((relation) => {
      const workstation = data.workstations.find(
        (item) => item.id === relation.workstationId,
      );
      if (!workstation) return false;
      const checks = checkSopWorkstationAiConfig({
        config: relation,
        aiConfig: config,
        aiConfigReady: evaluation.ready,
        workstation,
        devices: data.devices,
        capabilities,
      });
      return deriveSopWorkstationRuntimeStatus({
        config: relation,
        checks,
        readiness: checks.readiness,
      }).runnable;
    }).length;
    return {
      sop,
      evaluation,
      row: [
        sop.name || "未命名实训标准",
        [sop.major, sop.course].filter(Boolean).join(" / ") || "未设置",
        sop.owner || "未设置",
        `${evaluation.totalSteps} 步`,
        evaluation.statusLabel,
        `${evaluation.configuredStepCount}/${evaluation.totalSteps}`,
        `${evaluation.judgementItemCount} 项`,
        `${evaluation.distinctCapabilityIds.length} 个`,
        workstationConfigs.length
          ? `${runnableCount}/${workstationConfigs.length} 个可运行`
          : "尚未添加工位",
        <button
          className="table-action"
          onClick={() => nav(`${AI_CONFIG_PATH}/${encodeURIComponent(sop.id)}`)}
        >
          {evaluation.status === "unconfigured"
            ? "开始配置"
            : evaluation.status === "enabled"
              ? "查看"
              : "进入配置"}
        </button>,
      ],
    };
  });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = entries.filter(({ sop, evaluation }) => {
    const searchableText = [sop.name, sop.major, sop.course, sop.owner]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
      (statusFilter === "全部配置状态" ||
        evaluation.statusLabel === statusFilter) &&
      (majorFilter === "全部专业" || sop.major === majorFilter) &&
      (ownerFilter === "全部教师" || sop.owner === ownerFilter)
    );
  });
  return (
    <>
      <PageHeader
        title="AI能力配置"
        subtitle="按已发布实训标准的步骤组装AI判断项、已发布能力和教师业务规则。"
      />
      {sops.length ? (
        <section className="panel panel--table ai-config-list-table">
          <Toolbar
            placeholder="搜索标准名称、专业或课程"
            filters={[
              "全部配置状态",
              ...new Set(
                entries.map(({ evaluation }) => evaluation.statusLabel),
              ),
            ]}
            value={query}
            filterValue={statusFilter}
            onChange={setQuery}
            onFilterChange={setStatusFilter}
            onRefresh={() => {
              setQuery("");
              setStatusFilter("全部配置状态");
              setMajorFilter("全部专业");
              setOwnerFilter("全部教师");
            }}
          >
            <select
              aria-label="筛选专业"
              value={majorFilter}
              onChange={(event) => setMajorFilter(event.target.value)}
            >
              <option>全部专业</option>
              {[...new Set(sops.map((sop) => sop.major).filter(Boolean))].map(
                (major) => (
                  <option key={major}>{major}</option>
                ),
              )}
            </select>
            <select
              aria-label="筛选创建教师"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
            >
              <option>全部教师</option>
              {[...new Set(sops.map((sop) => sop.owner).filter(Boolean))].map(
                (owner) => (
                  <option key={owner}>{owner}</option>
                ),
              )}
            </select>
          </Toolbar>
          <DataTable
            pagination
            columns={[
              "标准名称",
              "专业/课程",
              "创建教师",
              "步骤数",
              "AI配置状态",
              "已配置步骤",
              "AI判断项",
              "引用AI能力",
              "工位状态",
              "操作",
            ]}
            rows={filteredEntries.map(({ row }) => row)}
            rowKey={(_, index) => filteredEntries[index]?.sop.id || index}
            emptyText="暂无符合筛选条件的实训标准"
            statusColumns={[4, 8]}
          />
        </section>
      ) : (
        <section className="panel empty-state ai-entry-table">
          <BookOutlined />
          <h2>暂无可配置的实训标准</h2>
          <p>教师发布实训标准后，可在此为实训标准配置AI判断能力。</p>
        </section>
      )}
    </>
  );
}

const AiWorkstationSelectForm = forwardRef(function AiWorkstationSelectForm(
  { workstations, devices },
  ref,
) {
  const [workstationId, setWorkstationId] = useState(workstations[0]?.id || "");
  useImperativeHandle(ref, () => ({
    getValue() {
      if (!workstationId) throw new Error("请选择目标工位。");
      return workstationId;
    },
  }));
  return (
    <div className="ai-workstation-select-form">
      <label className="field">
        <FieldLabel required>目标工位</FieldLabel>
        <select
          value={workstationId}
          onChange={(event) => setWorkstationId(event.target.value)}
        >
          {workstations.map((workstation) => {
            const readiness = deriveWorkstationAiReadiness({
              workstation,
              devices,
              edgeRequired: true,
            });
            return (
              <option key={workstation.id} value={workstation.id}>
                {workstationOptionLabel(workstation)} · AI{readiness.label}
              </option>
            );
          })}
        </select>
      </label>
      {workstations.map((workstation) => {
        if (workstation.id !== workstationId) return null;
        const readiness = deriveWorkstationAiReadiness({
          workstation,
          devices,
          edgeRequired: true,
        });
        return (
          <div className="ai-workstation-option-summary" key={workstation.id}>
            <Status tone={readiness.tone}>{readiness.label}</Status>
            <span>{workstation.location}</span>
            <p>{readiness.reasons.join("；")}</p>
          </div>
        );
      })}
      <p className="form-hint">
        AI基础状态异常或待完善的工位可以添加并查看原因，但完成修复前不能启用。
      </p>
    </div>
  );
});

function AiAreaMappingEditor({ area, mapping, cameras, relationId, store }) {
  const canvasRef = useRef(null);
  const [cameraId, setCameraId] = useState(
    mapping?.cameraId || cameras[0]?.id || "",
  );
  const [rectangle, setRectangle] = useState({
    x: Number(mapping?.x ?? 18),
    y: Number(mapping?.y ?? 22),
    width: Number(mapping?.width ?? 36),
    height: Number(mapping?.height ?? 30),
  });
  const dragRef = useRef(null);
  useEffect(() => {
    setCameraId(mapping?.cameraId || cameras[0]?.id || "");
    setRectangle({
      x: Number(mapping?.x ?? 18),
      y: Number(mapping?.y ?? 22),
      width: Number(mapping?.width ?? 36),
      height: Number(mapping?.height ?? 30),
    });
  }, [
    mapping?.cameraId,
    mapping?.x,
    mapping?.y,
    mapping?.width,
    mapping?.height,
  ]);
  const point = (event) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(
        0,
        Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: Math.max(
        0,
        Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100),
      ),
    };
  };
  const startDraw = (event) => {
    const start = point(event);
    if (!start) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = start;
    setRectangle({ x: start.x, y: start.y, width: 1, height: 1 });
  };
  const draw = (event) => {
    if (!dragRef.current) return;
    const current = point(event);
    if (!current) return;
    const start = dragRef.current;
    setRectangle({
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.max(1, Math.abs(current.x - start.x)),
      height: Math.max(1, Math.abs(current.y - start.y)),
    });
  };
  const finishDraw = () => {
    dragRef.current = null;
  };
  const setNumber = (key, value) =>
    setRectangle((current) => ({ ...current, [key]: Number(value) }));
  return (
    <details className="ai-area-mapping-editor" open={!mapping}>
      <summary>
        <span>
          <strong>{area.name}</strong>
          <small>{area.description || "当前实训标准需要的逻辑区域"}</small>
        </span>
        <Status>{mapping ? "已配置" : "未配置"}</Status>
      </summary>
      <div className="ai-area-mapping-editor__body">
        <label className="field">
          区域所属摄像头
          <select
            value={cameraId}
            onChange={(event) => setCameraId(event.target.value)}
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label} · {camera.name}
              </option>
            ))}
          </select>
        </label>
        <div
          className="ai-roi-canvas"
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={finishDraw}
          onPointerCancel={finishDraw}
          role="application"
          aria-label={`${area.name}实际区域框选画面`}
        >
          <img
            src="/assets/workstation-male.png"
            alt="当前工位摄像头示例画面"
          />
          <span
            className="ai-roi-canvas__box"
            style={{
              left: `${rectangle.x}%`,
              top: `${rectangle.y}%`,
              width: `${rectangle.width}%`,
              height: `${rectangle.height}%`,
            }}
          >
            {area.name}
          </span>
        </div>
        <p className="hint">在画面中拖动鼠标框选矩形，也可以直接调整坐标。</p>
        <div className="ai-roi-coordinates">
          {[
            ["x", "左侧 X"],
            ["y", "顶部 Y"],
            ["width", "宽度"],
            ["height", "高度"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              {label}（%）
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(rectangle[key] * 10) / 10}
                onChange={(event) => setNumber(key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="row-actions ai-area-mapping-editor__actions">
          <Button
            type="primary"
            disabled={!cameraId}
            onClick={() =>
              store.saveSopWorkstationAreaMapping(relationId, {
                logicalAreaId: area.id,
                cameraId,
                rectangle,
              })
            }
          >
            保存实际区域
          </Button>
        </div>
      </div>
    </details>
  );
}

export function AiWorkstationConfigWorkspace({
  relation,
  aiConfig,
  evaluation,
  data,
  store,
  setModal,
}) {
  const normalized = normalizeSopWorkstationAiConfig(relation);
  const workstation = data.workstations.find(
    (item) => item.id === normalized.workstationId,
  );
  if (!workstation) return null;
  const base = normalizeWorkstationAiBaseConfig(workstation);
  const primaryCamera = data.devices.find(
    (item) => item.id === base.primaryCameraId,
  );
  const fallbackCamera = data.devices.find(
    (item) => item.id === base.fallbackCameraId,
  );
  const cameras = workstationCameras(workstation, data.devices);
  const checks = checkSopWorkstationAiConfig({
    config: normalized,
    aiConfig,
    aiConfigReady: evaluation.ready,
    workstation,
    devices: data.devices,
    capabilities: data.aiCapabilities,
  });
  const runtime = deriveSopWorkstationRuntimeStatus({
    config: normalized,
    checks,
    readiness: checks.readiness,
  });
  const areas = requiredLogicalAreas(aiConfig);
  const coverage = buildSopWorkstationValidationCoverage(
    { ...aiConfig, validationScenarioSet: normalized.validationScenarioSet },
    normalized.validationCases,
    normalized,
  );
  const validationContext = {
    relation: normalized,
    aiConfig,
    checks,
    workstation,
    data,
  };
  const validationCheck = validationResult(validationContext);
  let enableIssue = "";
  try {
    assertFieldEnablement(validationContext);
  } catch (error) {
    enableIssue = error.message;
  }
  const [validationMessage, setValidationMessage] = useState("");
  const restartEnvironmentRef = useRef(null);
  const [environment, setEnvironment] = useState(
    normalized.validationEnvironment,
  );
  useEffect(() => {
    setEnvironment(normalized.validationEnvironment);
    setValidationMessage("");
  }, [normalized.id, normalized.validationStartedAt]);
  const startValidation = () => {
    try {
      store.startSopWorkstationValidation(normalized.id, environment);
      setValidationMessage("");
    } catch (error) {
      setValidationMessage(error.message);
    }
  };
  const restartValidation = () =>
    setModal({
      title: "重新开始现场验证",
      size: "large",
      content: (
        <div className="form-stack">
          <p>
            本轮已保存结果将保留到验证记录。确认现场环境后，重新生成验证用例。
          </p>
          <ValidationEnvironmentEditor
            ref={restartEnvironmentRef}
            environment={normalized.validationEnvironment}
          />
        </div>
      ),
      confirmText: "保存过程并重新开始",
      onConfirm: () =>
        store.startSopWorkstationValidation(
          normalized.id,
          restartEnvironmentRef.current.getValue(),
          { restart: true },
        ),
    });
  const confirmEnable = () =>
    setModal({
      title:
        normalized.enableStatus === "disabled"
          ? "重新启用AI评价"
          : "启用AI评价",
      content: (
        <p>
          确认在{workstation.name}
          启用当前实训标准的AI评价？启用后，新进入该工位执行本实训标准的学生将按当前AI判断配置运行。
        </p>
      ),
      confirmText: "确认启用",
      onConfirm: () => {
        store.enableSopWorkstationAi(normalized.id);
        return `${workstation.name}已启用当前实训标准的AI评价`;
      },
    });
  return (
    <div className="ai-workstation-workspace">
      <ValidationPurposePanel
        key={normalized.id}
        relation={normalized}
        store={store}
        setModal={setModal}
      />
      <section className="ai-workstation-block">
        <PanelTitle
          title={`${workstation.name} · 工位基础信息`}
          action={
            <Status tone={checks.readiness.tone}>
              AI{checks.readiness.label}
            </Status>
          }
        />
        <div className="ai-workstation-facts">
          {[
            ["工位编号", workstationBusinessCode(workstation) || "演示工位"],
            ["工位状态", workstation.status],
            ["主摄像头", deviceDisplayName(primaryCamera)],
            ["第二视角（角色见集合）", deviceDisplayName(fallbackCamera)],
            [
              "主摄像头状态",
              primaryCamera
                ? `${primaryCamera.status} / ${primaryCamera.streamStatus}`
                : "--",
            ],
            ["最近基础配置变更", base.lastAiCriticalChangeAt],
          ].map(([label, value]) => (
            <span key={label}>
              <small>{label}</small>
              <strong>{displayBusinessText(value)}</strong>
            </span>
          ))}
        </div>
        {checks.readiness.code !== "available" && (
          <div className="evaluation-notice evaluation-notice--warning">
            <AlertOutlined />
            <span>{checks.readiness.reasons.join("；")}</span>
          </div>
        )}
      </section>

      <section className="ai-workstation-block">
        <PanelTitle
          title="判断项摄像头配置"
          action={<span>按判断项配置有效视角</span>}
        />
        <div className="ai-judgement-camera-list">
          {checks.activeJudgementItems.map((item) => (
            <ViewBindingEditor
              key={item.id}
              relation={normalized}
              item={item}
              cameras={cameras}
              store={store}
            />
          ))}
        </div>
      </section>

      <section className="ai-workstation-block">
        <PanelTitle
          title="逻辑区域到实际区域"
          action={<span>{areas.length} 个需要映射</span>}
        />
        {areas.flatMap((area) =>
          cameras.map((camera) => (
            <AiAreaMappingEditor
              key={`${area.id}:${camera.id}`}
              area={{ ...area, name: `${area.name} · ${camera.label}` }}
              mapping={
                normalized.logicalAreaMappings.find(
                  (m) =>
                    m.logicalAreaId === area.id && m.cameraId === camera.id,
                ) || { cameraId: camera.id }
              }
              cameras={[camera]}
              relationId={normalized.id}
              store={store}
            />
          )),
        )}
        {!areas.length && <p className="hint">当前AI判断项不依赖逻辑区域。</p>}
      </section>

      <section className="ai-workstation-block">
        <PanelTitle
          title="配置检查"
          action={
            <Status>{checks.ready ? "可以开始现场验证" : "需要完善"}</Status>
          }
        />
        <div className="ai-workstation-checks">
          {checks.checks.map((check) => (
            <article
              className={check.passed ? "is-pass" : "is-fail"}
              key={check.key}
            >
              {check.passed ? <CheckCircleOutlined /> : <AlertOutlined />}
              <span>
                <strong>{check.label}</strong>
                {check.reason && <small>{check.reason}</small>}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-workstation-block">
        <PanelTitle
          title="现场验证"
          action={<Status>{workstationValidationLabel(normalized)}</Status>}
        />
        {normalized.validationStatus !== "validating" ? (
          <>
          <div className="ai-validation-start">
            <div className="form-row">
              <label className="field">
                验证人
                <input
                  value={environment.tester}
                  onChange={(event) =>
                    setEnvironment((current) => ({
                      ...current,
                      tester: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                使用工具
                <input
                  value={environment.tools}
                  onChange={(event) =>
                    setEnvironment((current) => ({
                      ...current,
                      tools: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label className="field">
                光照情况
                <select
                  value={environment.lighting}
                  onChange={(event) =>
                    setEnvironment((current) => ({
                      ...current,
                      lighting: event.target.value,
                    }))
                  }
                >
                  <option>正常</option>
                  <option>偏暗</option>
                  <option>过亮</option>
                </select>
              </label>
              <label className="field">
                遮挡情况
                <select
                  value={environment.occlusion}
                  onChange={(event) =>
                    setEnvironment((current) => ({
                      ...current,
                      occlusion: event.target.value,
                    }))
                  }
                >
                  <option>无遮挡</option>
                  <option>轻微遮挡</option>
                  <option>明显遮挡</option>
                </select>
              </label>
            </div>
            <label className="field">
              现场说明
              <textarea
                value={environment.note}
                onChange={(event) =>
                  setEnvironment((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </label>
            <div className="ai-validation-actions">
              {normalized.validationStatus === "pending_revalidation" && (
                <div className="evaluation-notice evaluation-notice--warning">
                  <AlertOutlined />
                  <span>
                    {normalized.validationInvalidationReason ||
                      "关键配置已经变化，需要重新验证。"}
                  </span>
                </div>
              )}
              <Button
                type="primary"
                disabled={!checks.ready}
                onClick={startValidation}
              >
                {normalized.validationPurpose === "real"
                  ? "开始现场验证"
                  : "开始配置检查"}
              </Button>
            </div>
          </div>
          <ValidationCasePreviewList
            relation={normalized}
            aiConfig={aiConfig}
            judgementItems={checks.activeJudgementItems}
            data={data}
            setModal={setModal}
            store={store}
          />
          </>
        ) : (
          <>
            <div className="validation-environment-summary">
              <details>
                <summary>
                  <strong>本轮现场环境</strong>
                  <span>验证人：{normalized.validationEnvironment.tester || "未记录"}</span>
                  <span>查看详情</span>
                </summary>
                <dl>
                  <div><dt>使用工具</dt><dd>{normalized.validationEnvironment.tools || "未记录"}</dd></div>
                  <div><dt>光照情况</dt><dd>{normalized.validationEnvironment.lighting || "未记录"}</dd></div>
                  <div><dt>遮挡情况</dt><dd>{normalized.validationEnvironment.occlusion || "未记录"}</dd></div>
                  <div><dt>现场说明</dt><dd>{normalized.validationEnvironment.note || "未填写"}</dd></div>
                </dl>
              </details>
              <button
                type="button"
                className="button button--default"
                onClick={restartValidation}
              >
                {normalized.validationRunId ? "修改环境并重新开始" : "重新开始验证"}
              </button>
              {!normalized.validationRunId && (
                <p className="validation-environment-warning" role="status">
                  本轮执行信息不完整，请重新开始验证；已保存的过程会保留。
                </p>
              )}
            </div>
            <ValidationCaseTabs relation={normalized} aiConfig={aiConfig} judgementItems={checks.activeJudgementItems} data={data} setModal={setModal} store={store} />
            <details className="validation-acceptance-details">
              <summary>验收覆盖 · {coverage.covered}/{coverage.total} 个判断项已满足要求</summary>
              <section className="ai-validation-coverage">
              {coverage.rows.map((row) => (
                <span key={row.judgementItemId}>
                  <strong>{row.judgementItemName}</strong>
                  <small>
                    {row.covered
                      ? "适用场景均已覆盖"
                      : `待补齐：${row.missingScenarios.join("、") || "错误或无效动作测试"}`}
                    {row.cells.filter((c) => c.status === "not_applicable")
                      .length > 0 &&
                      `；已说明不适用 ${row.cells.filter((c) => c.status === "not_applicable").length} 类`}
                  </small>
                  <Status>{row.result}</Status>
                </span>
              ))}
              </section>
            </details>
            <Button
              type="primary"
              disabled={
                !normalized.validationCases.length || normalized.validationCases.some((item) => item.executionState === "running")
              }
              onClick={() => {
                try {
                  const { result } = store.completeSopWorkstationValidation(
                    normalized.id,
                  );
                  setValidationMessage(
                    result.passed
                      ? normalized.validationPurpose === "real"
                        ? "现场验收通过，可继续启用AI评价。"
                        : "配置检查已完成；启用前仍需完成现场验证。"
                      : `验证未通过：${result.issues.join("；")}`,
                  );
                } catch (error) {
                  setValidationMessage(error.message);
                }
              }}
            >
              完成验证并生成结论
            </Button>
            {!validationCheck.passed && (
              <details className="validation-blockers">
                <summary>
                  查看待处理项（{validationCheck.issues.length}项）
                </summary>
                <ul>
                  {validationCheck.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
        {validationMessage && (
          <p role="status" className="field-validation-message">
            {validationMessage}
          </p>
        )}
        {!!normalized.validationRecords.length && (
          <div className="ai-validation-records">
            <h3>验证记录</h3>
            <DataTable
              pagination
              columns={[
                "验证时间",
                "验证人",
                "用例",
                "通过",
                "失败",
                "结论",
                "操作",
              ]}
              rows={normalized.validationRecords.map((record) => [
                record.completedAt,
                record.validatedBy,
                `${record.summary?.caseCount || 0} 个`,
                `${record.summary?.passedCount || 0} 个`,
                `${record.summary?.failedCount || 0} 个`,
                record.overallResult === "interrupted"
                  ? "已保存过程"
                  : record.overallResult === "passed"
                    ? record.scope === "configuration"
                      ? "配置检查通过"
                      : "验证通过"
                    : "验证不通过",
                <button
                  type="button"
                  className="table-action"
                  onClick={() =>
                    setModal({
                      title: "验证记录详情",
                      size: "large",
                      dismissOnly: true,
                      hideCancel: true,
                      confirmText: "关闭",
                      content: <ValidationRunDetails record={record} />,
                    })
                  }
                >
                  查看记录
                </button>,
              ])}
              statusColumns={[5]}
            />
          </div>
        )}
      </section>

      <section className="ai-workstation-block ai-workstation-enable-state">
        <PanelTitle
          title="启用与运行状态"
          action={<Status>{runtime.label}</Status>}
        />
        <div className="ai-workstation-enable-grid">
          <span>
            <small>启用状态</small>
            <strong>
              {WORKSTATION_ENABLE_STATUSES[normalized.enableStatus]}
            </strong>
          </span>
          <span>
            <small>验证状态</small>
            <strong>{workstationValidationLabel(normalized)}</strong>
          </span>
          <span>
            <small>当前运行状态</small>
            <strong>{runtime.label}</strong>
          </span>
          <span>
            <small>最近验证</small>
            <strong>
              {displayBusinessText(normalized.lastValidatedAt || "未验证")}
            </strong>
          </span>
        </div>
        {enableIssue && <p className="hint">{enableIssue}</p>}
        <div className="row-actions">
          {normalized.enableStatus === "enabled" ? (
            <Button
              type="danger"
              onClick={() =>
                setModal({
                  title: "停用当前工位AI评价",
                  content: (
                    <p>
                      停用后不再用于新学生运行，当前区域、摄像头配置和验证记录均会保留。
                    </p>
                  ),
                  confirmText: "确认停用",
                  onConfirm: () => {
                    store.disableSopWorkstationAi(normalized.id);
                    return "当前工位AI评价已停用";
                  },
                })
              }
            >
              停用AI评价
            </Button>
          ) : (
            <Button
              type="primary"
              disabled={Boolean(enableIssue)}
              onClick={confirmEnable}
            >
              {normalized.enableStatus === "disabled"
                ? "重新启用"
                : "启用AI评价"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function SopWorkstationEnablementSection({
  sop,
  aiConfig,
  evaluation,
  data,
  store,
  setModal,
  nav,
}) {
  const relations = (data.sopWorkstationAiConfigs || []).filter(
    (item) => item.sopAiConfigId === aiConfig.id,
  );
  const location = useLocation();
  const targetWorkstationId = new URLSearchParams(location.search).get(
    "workstationId",
  );
  const [selectedId, setSelectedId] = useState(
    () =>
      (targetWorkstationId
        ? relations.find((r) => r.workstationId === targetWorkstationId)?.id
        : relations[0]?.id) || "",
  );
  useEffect(() => {
    if (!relations.some((item) => item.id === selectedId))
      setSelectedId(
        (targetWorkstationId
          ? relations.find((r) => r.workstationId === targetWorkstationId)?.id
          : relations[0]?.id) || "",
      );
  }, [relations, selectedId, targetWorkstationId]);
  const selected = relations.find((item) => item.id === selectedId);
  const available = data.workstations.filter(
    (workstation) =>
      isWorkstationSelectable(workstation) &&
      !relations.some((item) => item.workstationId === workstation.id),
  );
  const addWorkstation = () => {
    const formRef = createRef();
    setModal({
      eyebrow: "工位启用与现场验证",
      title: "添加目标工位",
      content: (
        <AiWorkstationSelectForm
          ref={formRef}
          workstations={available}
          devices={data.devices}
        />
      ),
      confirmText: "添加工位",
      onConfirm: () => {
        const created = store.addSopWorkstationAiConfig(
          sop.id,
          formRef.current.getValue(),
        );
        setSelectedId(created.id);
        return "目标工位已添加";
      },
    });
  };
  if (!evaluation.ready || aiConfig.status === "configuring")
    return (
      <section className="panel empty-state ai-workstation-enablement">
        <AlertOutlined />
        <h2>当前实训标准的AI能力配置尚未完成</h2>
        <p>请先完成AI判断项和能力引用配置，再进入工位启用与现场验证。</p>
      </section>
    );
  return (
    <section className="panel ai-workstation-enablement">
      <PanelTitle
        title="工位启用与现场验证"
        action={
          <Button
            icon={<PlusOutlined />}
            disabled={!available.length}
            onClick={addWorkstation}
          >
            添加工位
          </Button>
        }
      />
      <p className="hint">
        每个工位独立维护当前摄像头选择、实际区域、验证状态和启用状态，不创建工位配置版本。
      </p>
      {targetWorkstationId &&
        !relations.some((r) => r.workstationId === targetWorkstationId) && (
          <p className="hint" role="status">
            目标工位的关联已失效或不在当前数据来源中，请手动选择工位；不会自动改为其他工位。
          </p>
        )}
      {!relations.length ? (
        <div className="empty-state ai-workstation-empty">
          <DesktopOutlined />
          <h3>暂无已添加工位</h3>
          <p>请从工位管理中的现有工位选择目标工位。</p>
          {!available.length && (
            <Button onClick={() => nav("/admin/workstations")}>
              去工位管理
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="ai-workstation-list">
            {relations.map((relation) => {
              const workstation = data.workstations.find(
                (item) => item.id === relation.workstationId,
              );
              if (!workstation) return null;
              const checks = checkSopWorkstationAiConfig({
                config: relation,
                aiConfig,
                aiConfigReady: evaluation.ready,
                workstation,
                devices: data.devices,
                capabilities: data.aiCapabilities,
              });
              const runtime = deriveSopWorkstationRuntimeStatus({
                config: relation,
                checks,
                readiness: checks.readiness,
              });
              const base = normalizeWorkstationAiBaseConfig(workstation);
              const selectableCameraIds = new Set(
                [base.primaryCameraId, base.fallbackCameraId].filter(Boolean),
              );
              const configuredCameraCount = checks.activeJudgementItems.filter(
                (item) =>
                  relation.judgementCameraBindings?.some(
                    (binding) =>
                      binding.judgementItemId === item.id &&
                      selectableCameraIds.has(binding.cameraId),
                  ),
              ).length;
              const configuredAreaCount = checks.requiredLogicalAreas.filter(
                (area) =>
                  relation.logicalAreaMappings?.some(
                    (mapping) =>
                      mapping.logicalAreaId === area.id &&
                      selectableCameraIds.has(mapping.cameraId),
                  ),
              ).length;
              return (
                <button
                  key={relation.id}
                  className={`ai-workstation-list__item ${selectedId === relation.id ? "is-active" : ""}`}
                  onClick={() => setSelectedId(relation.id)}
                >
                  <span>
                    <strong>{workstation.name}</strong>
                    <small>{workstationCaption(workstation)}</small>
                  </span>
                  <span>
                    <small>AI基础状态</small>
                    <Status tone={checks.readiness.tone}>
                      {checks.readiness.label}
                    </Status>
                  </span>
                  <span>
                    <small>区域配置</small>
                    <strong>
                      {configuredAreaCount}/{checks.requiredLogicalAreas.length}
                    </strong>
                  </span>
                  <span>
                    <small>摄像头配置</small>
                    <strong>
                      {configuredCameraCount}/
                      {checks.activeJudgementItems.length}
                    </strong>
                  </span>
                  <span>
                    <small>现场验证</small>
                    <Status>
                      {
                        WORKSTATION_VALIDATION_STATUSES[
                          relation.validationStatus
                        ]
                      }
                    </Status>
                  </span>
                  <span>
                    <small>启用状态</small>
                    <Status>
                      {WORKSTATION_ENABLE_STATUSES[relation.enableStatus]}
                    </Status>
                  </span>
                  <span>
                    <small>运行状态</small>
                    <Status>{runtime.label}</Status>
                  </span>
                  <span>
                    <small>最近验证</small>
                    <strong>
                      {displayBusinessText(
                        relation.lastValidatedAt || "未验证",
                      )}
                    </strong>
                  </span>
                </button>
              );
            })}
          </div>
          {selected && (
            <AiWorkstationConfigWorkspace
              relation={selected}
              aiConfig={aiConfig}
              evaluation={evaluation}
              data={data}
              store={store}
              setModal={setModal}
            />
          )}
        </>
      )}
    </section>
  );
}

function AiConfigDisplayModeSwitch({ mode, onChange }) {
  return (
    <div
      className="segmented segmented--small ai-config-display-mode"
      role="group"
      aria-label="AI能力配置展示模式"
    >
      <button
        type="button"
        className={mode === "tabs" ? "active" : ""}
        aria-pressed={mode === "tabs"}
        onClick={() => onChange("tabs")}
      >
        Tab分栏
      </button>
      <button
        type="button"
        className={mode === "waterfall" ? "active" : ""}
        aria-pressed={mode === "waterfall"}
        onClick={() => onChange("waterfall")}
      >
        瀑布流
      </button>
    </div>
  );
}

function AiConfigLogicalAreaManager({ sopId }) {
  const store = usePrototypeData();
  const rawConfig = (store.data.aiCapabilityConfigs || []).find(
    (item) => item.sopId === sopId,
  );
  const config = normalizeAiCapabilityConfig(rawConfig || { sopId });
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const referenceCount = (areaId) =>
    config.judgementItems.reduce(
      (count, item) =>
        count +
        (item.conditions || []).filter(
          (condition) => condition.logicalAreaId === areaId,
        ).length,
      0,
    );
  const createArea = () => {
    setError("");
    try {
      store.createAiLogicalArea(sopId, form);
      setForm({ name: "", description: "" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "逻辑区域创建失败。");
    }
  };
  const deleteArea = (areaId) => {
    setError("");
    try {
      store.deleteAiLogicalArea(sopId, areaId);
      setPendingDeleteId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "逻辑区域删除失败。");
    }
  };
  return (
    <div className="ai-config-area-manager">
      <div className="ai-config-area-manager__form">
        <label className="field">
          <FieldLabel required>区域名称</FieldLabel>
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="例如：工具放置区"
          />
        </label>
        <label className="field">
          区域说明
          <input
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="说明该区域在业务中的用途"
          />
        </label>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!form.name.trim()}
          onClick={createArea}
        >
          新增区域
        </Button>
      </div>
      <p className="hint">
        逻辑区域是实训标准中的业务区域；具体摄像头画面坐标仍在工位验证中配置。
      </p>
      {error && <p className="form-error">{displayBusinessText(error)}</p>}
      <div className="ai-config-area-manager__list">
        {config.logicalAreas.map((area) => {
          const count = referenceCount(area.id);
          return (
            <article key={area.id}>
              <div>
                <strong>{area.name}</strong>
                <p>{area.description || "暂无说明"}</p>
                <small>被 {count} 个判断条件引用</small>
              </div>
              {pendingDeleteId === area.id ? (
                <div className="row-actions">
                  <Button onClick={() => setPendingDeleteId("")}>取消</Button>
                  <Button
                    type="danger"
                    disabled={count > 0}
                    onClick={() => deleteArea(area.id)}
                  >
                    确认删除
                  </Button>
                </div>
              ) : (
                <Button
                  type="danger"
                  disabled={count > 0}
                  onClick={() => setPendingDeleteId(area.id)}
                >
                  删除
                </Button>
              )}
            </article>
          );
        })}
        {!config.logicalAreas.length && (
          <div className="ai-config-area-manager__empty">
            <ApartmentOutlined />
            <p>暂无逻辑区域。仅在判断条件需要区域时创建。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AiCapabilityConfigOverviewTab({
  sop,
  rawConfig,
  config,
  evaluation,
  expectedCounts,
  progress,
  data,
  store,
  setModal,
  onContinue,
  onOpenWorkstations,
}) {
  const summary = deriveSopAiConfigurationSummary({
    sop,
    config: rawConfig,
    workstationConfigs: data.sopWorkstationAiConfigs,
    workstations: data.workstations,
    devices: data.devices,
    capabilities: data.aiCapabilities,
  });
  const relations = (data.sopWorkstationAiConfigs || []).filter(
    (item) => item.sopAiConfigId === config.id,
  );
  const passedCount = relations.filter(
    (item) => item.validationStatus === "passed",
  ).length;
  return (
    <div className="ai-config-tab-stack">
      {config.standardReviewRequired && (
        <p className="hint">
          实训标准内容已更新，请核对步骤与评分规则，完成配置后重新进行工位现场验证。
        </p>
      )}
      <section className="panel ai-config-tab-overview">
        <PanelTitle
          title="配置概览"
          action={<Status>{evaluation.statusLabel}</Status>}
        />
        <div className="ai-config-summary__grid ai-config-summary__grid--wide">
          <div>
            <small>标准名称</small>
            <strong>{sop.name || "未命名实训标准"}</strong>
          </div>
          <div>
            <small>创建教师</small>
            <strong>{sop.owner || "未设置"}</strong>
          </div>
          <div>
            <small>专业/课程</small>
            <strong>
              {[sop.major, sop.course].filter(Boolean).join(" / ") || "未设置"}
            </strong>
          </div>
          <div>
            <small>标准状态</small>
            <Status>{sop.status}</Status>
          </div>
          <div>
            <small>步骤数</small>
            <strong>{evaluation.totalSteps} 步</strong>
          </div>
          <div>
            <small>教师期望评价方式</small>
            <strong>
              自动 {expectedCounts.automatic} · 辅助 {expectedCounts.assisted} ·
              教师 {expectedCounts.teacher}
            </strong>
          </div>
          <div>
            <small>当前实际评价方式</small>
            <strong>
              自动 {evaluation.modeCounts.automatic} · 辅助{" "}
              {evaluation.modeCounts.assisted}· 教师{" "}
              {evaluation.modeCounts.teacher}
            </strong>
          </div>
          <div>
            <small>配置对象</small>
            <strong>
              判断项 {evaluation.judgementItemCount} · 能力{" "}
              {evaluation.distinctCapabilityIds.length}· 区域{" "}
              {evaluation.logicalAreaCount}
            </strong>
          </div>
        </div>
        <div className="ai-config-progress-row">
          <span>
            <small>配置完整度</small>
            <strong>{progress}%</strong>
          </span>
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {evaluation.configuredStepCount}/{evaluation.totalSteps}{" "}
            个步骤已完成配置
          </small>
        </div>
      </section>

      <section className="panel ai-config-readiness">
        <PanelTitle
          title="配置完整性检查"
          action={
            <div className="row-actions">
              {!evaluation.ready && (
                <Button onClick={onContinue}>继续配置</Button>
              )}
              {evaluation.status === "pending_validation" && (
                <Button onClick={onOpenWorkstations}>去工位验证</Button>
              )}
              <Button
                type="primary"
                disabled={
                  !evaluation.ready ||
                  evaluation.status === "pending_validation"
                }
                onClick={() =>
                  setModal({
                    title: "完成AI能力配置",
                    content: (
                      <p>
                        完整性检查已通过。完成后配置进入“待验证”，后续需要在工位现场验证后才能启用。
                      </p>
                    ),
                    confirmText: "确认完成",
                    onConfirm: () => {
                      store.completeAiCapabilityConfig(sop.id);
                      return "AI能力配置已进入待验证";
                    },
                  })
                }
              >
                完成配置
              </Button>
            </div>
          }
        />
        {evaluation.ready ? (
          <div className="evaluation-notice evaluation-notice--success">
            <CheckCircleOutlined />
            <span>所有步骤、规则、判断项、能力引用和条件均已通过检查。</span>
          </div>
        ) : (
          <div className="ai-config-check-list">
            {evaluation.issues.map((issue) => (
              <p key={issue}>
                <AlertOutlined /> {issue}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="panel ai-config-tab-workstation-summary">
        <PanelTitle
          title="工位启用摘要"
          action={<Button onClick={onOpenWorkstations}>查看工位</Button>}
        />
        <div className="ai-config-tab-stat-grid">
          <div>
            <small>目标工位</small>
            <strong>{summary.workstationCount}</strong>
          </div>
          <div>
            <small>验证通过</small>
            <strong>{passedCount}</strong>
          </div>
          <div>
            <small>已启用</small>
            <strong>{summary.enabledWorkstationCount}</strong>
          </div>
          <div>
            <small>可运行</small>
            <strong>{summary.runnableWorkstationCount}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function AiCapabilityConfigJudgementTab({
  sop,
  config,
  evaluation,
  capabilities,
  store,
  setModal,
  nav,
  selectedStepId,
  setSelectedStepId,
}) {
  const stepNavRef = useRef(null);
  const steps = sop.steps || [];
  const selectedIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === selectedStepId),
  );
  const selectedStep = steps[selectedIndex];
  const selectedResult = evaluation.stepResults.find(
    (item) => item.stepId === selectedStep?.id,
  ) || { status: "unconfigured", issues: [] };
  useEffect(() => {
    const navigation = stepNavRef.current;
    const activeButton = navigation?.querySelector('[aria-current="step"]');
    if (!activeButton) return;
    const navigationRect = navigation.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    if (buttonRect.left < navigationRect.left + 8)
      navigation.scrollLeft += buttonRect.left - navigationRect.left - 8;
    else if (buttonRect.right > navigationRect.right - 8)
      navigation.scrollLeft += buttonRect.right - navigationRect.right + 8;
  }, [selectedStep?.id]);
  const openAreaManager = () =>
    setModal({
      eyebrow: "AI判断配置",
      title: "逻辑区域管理",
      size: "large",
      content: <AiConfigLogicalAreaManager sopId={sop.id} />,
      confirmText: "完成",
      hideCancel: true,
      dismissOnly: true,
    });
  return (
    <section className="panel ai-config-judgement-tab">
      <PanelTitle
        title="AI判断配置"
        action={
          <Button icon={<ApartmentOutlined />} onClick={openAreaManager}>
            逻辑区域管理
          </Button>
        }
      />
      <p className="hint">
        逐个步骤引用已发布AI能力，并配置评分与安全规则覆盖。
      </p>
      <div className="ai-config-judgement-layout">
        <aside className="ai-config-step-nav" aria-label="实训操作步骤导航">
          <header>
            <small>操作步骤</small>
            <strong>{steps.length} 个步骤</strong>
          </header>
          <div ref={stepNavRef}>
            {steps.map((step, index) => {
              const result = evaluation.stepResults.find(
                (item) => item.stepId === step.id,
              ) || { status: "unconfigured" };
              const active = step.id === selectedStep?.id;
              return (
                <button
                  type="button"
                  key={step.id}
                  className={active ? "is-active" : ""}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setSelectedStepId(step.id)}
                >
                  <span
                    className={`ai-config-step-nav__state is-${result.status}`}
                  >
                    {result.status === "complete"
                      ? "✓"
                      : result.status === "configuring"
                        ? "!"
                        : result.status === "no_ai"
                          ? "—"
                          : "○"}
                  </span>
                  <span>
                    <small>步骤 {String(index + 1).padStart(2, "0")}</small>
                    <strong>{step.name || "未命名步骤"}</strong>
                    <em>{AI_CONFIG_STEP_STATUSES[result.status]}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="ai-config-tab-step">
          {selectedStep ? (
            <>
              <header className="ai-config-tab-step__header">
                <div>
                  <small>
                    当前步骤 {String(selectedIndex + 1).padStart(2, "0")}
                  </small>
                  <h2>
                    {displayStepLabel(selectedStep.id)} ·{" "}
                    {selectedStep.name || "未命名步骤"}
                  </h2>
                  <p>教师期望：{aiExpectedModeLabel(selectedStep)}</p>
                </div>
                <Status>
                  {AI_CONFIG_STEP_STATUSES[selectedResult.status]}
                </Status>
              </header>
              <div className="ai-config-tab-step__content">
                <AiConfigStepCard
                  key={selectedStep.id}
                  sop={sop}
                  step={selectedStep}
                  index={0}
                  config={config}
                  evaluation={evaluation}
                  capabilities={capabilities}
                  store={store}
                  setModal={setModal}
                  nav={nav}
                />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <AlertOutlined />
              <h2>当前实训标准没有可配置步骤</h2>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AiCapabilityConfigTabbedDetail({ setModal, onModeChange }) {
  const store = usePrototypeData();
  const { data } = store;
  const { sopId } = useParams();
  const sop = getConfigurableSops(data?.sops).find((item) => item.id === sopId);
  if (!sop)
    return (
      <MissingState title="可配置的实训标准不存在" backTo={AI_CONFIG_PATH} />
    );
  return (
    <AiCapabilityConfigTabbedWorkspace
      sop={sop}
      data={data}
      store={store}
      setModal={setModal}
      onModeChange={onModeChange}
    />
  );
}

function AiCapabilityConfigTabbedWorkspace({
  sop,
  data,
  store,
  setModal,
  onModeChange,
}) {
  const nav = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() =>
    new URLSearchParams(location.search).get("tab") === "workstation"
      ? "workstation"
      : "overview",
  );
  const rawConfig = (data.aiCapabilityConfigs || []).find(
    (item) => item.sopId === sop.id,
  );
  const config = normalizeAiCapabilityConfig(rawConfig || { sopId: sop.id });
  const allCapabilities = data.aiCapabilities || [];
  const capabilities = allCapabilities.filter(
    isCapabilityAvailableForConfiguration,
  );
  const evaluation = evaluateAiCapabilityConfig({
    sop,
    config: rawConfig,
    capabilities: allCapabilities,
  });
  const expectedCounts = (sop.steps || []).reduce(
    (counts, step) => {
      const mode = step.expectedJudgementMode || step.judgementMode;
      if (mode === "visual_auto") counts.automatic += 1;
      else if (mode === "visual_assist_default_pass") counts.assisted += 1;
      else counts.teacher += 1;
      return counts;
    },
    { automatic: 0, assisted: 0, teacher: 0 },
  );
  const progress = evaluation.totalSteps
    ? Math.round((evaluation.configuredStepCount / evaluation.totalSteps) * 100)
    : 0;
  const preferredStepId =
    evaluation.stepResults.find((item) =>
      ["unconfigured", "configuring"].includes(item.status),
    )?.stepId ||
    sop.steps?.[0]?.id ||
    "";
  const [selectedStepId, setSelectedStepId] = useState(preferredStepId);
  useEffect(() => {
    if (!(sop.steps || []).some((step) => step.id === selectedStepId))
      setSelectedStepId(preferredStepId);
  }, [preferredStepId, selectedStepId, sop.steps]);
  const continueConfiguration = () => {
    const firstIncomplete = evaluation.stepResults.find((item) =>
      ["unconfigured", "configuring"].includes(item.status),
    );
    if (firstIncomplete) setSelectedStepId(firstIncomplete.stepId);
    setActiveTab("judgement");
  };
  const clearAction = rawConfig ? (
    <Button
      type="danger"
      onClick={() =>
        setModal({
          title: "清空当前AI能力配置",
          content: (
            <p>
              将删除当前实训标准的所有步骤配置、AI判断项和逻辑区域，并解除对AI能力的引用。此操作不会修改教师实训标准或AI能力库内容。
            </p>
          ),
          confirmText: "确认清空",
          onConfirm: () => {
            store.clearAiCapabilityConfig(sop.id);
            return "当前AI能力配置已清空";
          },
        })
      }
    >
      清空当前配置
    </Button>
  ) : null;
  return (
    <>
      <PageHeader
        title="AI能力配置"
        subtitle={sop.name || "未命名实训标准"}
        actions={
          <div className="row-actions ai-config-page-actions">
            <AiConfigDisplayModeSwitch mode="tabs" onChange={onModeChange} />
            {clearAction}
            {data.workstations.some(
              (w) =>
                w.id ===
                new URLSearchParams(location.search).get("workstationId"),
            ) && (
              <Button
                onClick={() =>
                  nav(
                    `/admin/workstations/${encodeURIComponent(new URLSearchParams(location.search).get("workstationId"))}`,
                  )
                }
              >
                返回工位详情
              </Button>
            )}
            <Button onClick={() => nav(AI_CONFIG_PATH)}>返回标准列表</Button>
          </div>
        }
      />
      <nav className="tabs ai-config-primary-tabs" aria-label="AI能力配置详情">
        {[
          ["overview", "配置概览"],
          ["judgement", "AI判断配置"],
          ["workstation", "工位启用与验证"],
        ].map(([value, label]) => (
          <button
            type="button"
            role="tab"
            key={value}
            className={activeTab === value ? "active" : ""}
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {activeTab === "overview" && (
        <AiCapabilityConfigOverviewTab
          sop={sop}
          rawConfig={rawConfig}
          config={config}
          evaluation={evaluation}
          expectedCounts={expectedCounts}
          progress={progress}
          data={data}
          store={store}
          setModal={setModal}
          onContinue={continueConfiguration}
          onOpenWorkstations={() => setActiveTab("workstation")}
        />
      )}
      {activeTab === "judgement" && (
        <AiCapabilityConfigJudgementTab
          sop={sop}
          config={config}
          evaluation={evaluation}
          capabilities={capabilities}
          store={store}
          setModal={setModal}
          nav={nav}
          selectedStepId={selectedStepId}
          setSelectedStepId={setSelectedStepId}
        />
      )}
      {activeTab === "workstation" &&
        (!evaluation.ready || config.status === "configuring" ? (
          <section className="panel empty-state ai-workstation-enablement ai-config-tab-workstation-empty">
            <AlertOutlined />
            <h2>当前实训标准的AI能力配置尚未完成</h2>
            <p>请先完成AI判断项和能力引用配置，再进入工位启用与现场验证。</p>
            <Button type="primary" onClick={continueConfiguration}>
              去AI判断配置
            </Button>
          </section>
        ) : (
          <SopWorkstationEnablementSection
            sop={sop}
            aiConfig={config}
            evaluation={evaluation}
            data={data}
            store={store}
            setModal={setModal}
            nav={nav}
          />
        ))}
    </>
  );
}

function AiCapabilityConfigWaterfallMode({ setModal, onModeChange }) {
  const rootRef = useRef(null);
  const [actionTarget, setActionTarget] = useState(null);
  useEffect(() => {
    setActionTarget(
      rootRef.current?.querySelector(".page-header__actions .row-actions") ||
        null,
    );
  }, []);
  return (
    <div ref={rootRef} className="ai-config-waterfall-mode">
      <AiCapabilityConfigDetail setModal={setModal} />
      {actionTarget &&
        createPortal(
          <div className="ai-config-display-mode-portal">
            <AiConfigDisplayModeSwitch
              mode="waterfall"
              onChange={onModeChange}
            />
          </div>,
          actionTarget,
        )}
    </div>
  );
}

function AiCapabilityConfigDetailModes({ setModal }) {
  const [mode, setMode] = useState("tabs");
  return mode === "waterfall" ? (
    <AiCapabilityConfigWaterfallMode
      setModal={setModal}
      onModeChange={setMode}
    />
  ) : (
    <AiCapabilityConfigTabbedDetail
      setModal={setModal}
      onModeChange={setMode}
    />
  );
}

function AiCapabilityConfigDetail({ setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const store = usePrototypeData();
  const { data } = store;
  const { sopId } = useParams();
  const sop = getConfigurableSops(data?.sops).find((item) => item.id === sopId);
  if (!sop)
    return (
      <MissingState title="可配置的实训标准不存在" backTo={AI_CONFIG_PATH} />
    );
  const rawConfig = (data.aiCapabilityConfigs || []).find(
    (item) => item.sopId === sop.id,
  );
  const config = normalizeAiCapabilityConfig(rawConfig || { sopId: sop.id });
  const allCapabilities = data.aiCapabilities || [];
  const capabilities = allCapabilities.filter(
    isCapabilityAvailableForConfiguration,
  );
  const evaluation = evaluateAiCapabilityConfig({
    sop,
    config: rawConfig,
    capabilities: allCapabilities,
  });
  const expectedCounts = (sop.steps || []).reduce(
    (counts, step) => {
      const mode = step.expectedJudgementMode || step.judgementMode;
      if (mode === "visual_auto") counts.automatic += 1;
      else if (mode === "visual_assist_default_pass") counts.assisted += 1;
      else counts.teacher += 1;
      return counts;
    },
    { automatic: 0, assisted: 0, teacher: 0 },
  );
  const progress = evaluation.totalSteps
    ? Math.round((evaluation.configuredStepCount / evaluation.totalSteps) * 100)
    : 0;
  const addArea = () => {
    const formRef = createRef();
    setModal({
      title: "新增逻辑区域",
      content: <AiLogicalAreaForm ref={formRef} />,
      confirmText: "创建区域",
      onConfirm: () => {
        store.createAiLogicalArea(sop.id, formRef.current.getValue());
        return "逻辑区域已创建";
      },
    });
  };
  return (
    <>
      <PageHeader
        title="AI能力配置"
        subtitle={sop.name || "未命名实训标准"}
        actions={
          <div className="row-actions">
            {!!rawConfig && (
              <Button
                type="danger"
                onClick={() =>
                  setModal({
                    title: "清空当前AI能力配置",
                    content: (
                      <p>
                        将删除当前实训标准的所有步骤配置、AI判断项和逻辑区域，并解除对AI能力的引用。此操作不会修改教师实训标准或AI能力库内容。
                      </p>
                    ),
                    confirmText: "确认清空",
                    onConfirm: () => {
                      store.clearAiCapabilityConfig(sop.id);
                      return "当前AI能力配置已清空";
                    },
                  })
                }
              >
                清空当前配置
              </Button>
            )}
            {data.workstations.some(
              (w) =>
                w.id ===
                new URLSearchParams(location.search).get("workstationId"),
            ) && (
              <Button
                onClick={() =>
                  nav(
                    `/admin/workstations/${encodeURIComponent(new URLSearchParams(location.search).get("workstationId"))}`,
                  )
                }
              >
                返回工位详情
              </Button>
            )}
            <Button onClick={() => nav(AI_CONFIG_PATH)}>返回标准列表</Button>
          </div>
        }
      />
      {config.standardReviewRequired && (
        <p className="hint">
          实训标准内容已更新，请核对步骤与评分规则，完成配置后重新进行工位现场验证。
        </p>
      )}
      <section className="panel ai-config-overview">
        <PanelTitle
          title="当前配置概览"
          action={<Status>{evaluation.statusLabel}</Status>}
        />
        <div className="ai-config-summary__grid ai-config-summary__grid--wide">
          <div>
            <small>标准名称</small>
            <strong>{sop.name}</strong>
          </div>
          <div>
            <small>创建教师</small>
            <strong>{sop.owner || "未设置"}</strong>
          </div>
          <div>
            <small>专业/课程</small>
            <strong>
              {[sop.major, sop.course].filter(Boolean).join(" / ") || "未设置"}
            </strong>
          </div>
          <div>
            <small>标准状态</small>
            <Status>{sop.status}</Status>
          </div>
          <div>
            <small>步骤数</small>
            <strong>{evaluation.totalSteps} 步</strong>
          </div>
          <div>
            <small>教师期望评价方式</small>
            <strong>
              自动 {expectedCounts.automatic} · 辅助 {expectedCounts.assisted} ·
              教师 {expectedCounts.teacher}
            </strong>
          </div>
          <div>
            <small>AI判断项</small>
            <strong>{evaluation.judgementItemCount} 项</strong>
          </div>
          <div>
            <small>引用AI能力</small>
            <strong>{evaluation.distinctCapabilityIds.length} 个</strong>
          </div>
        </div>
        <div className="ai-config-progress-row">
          <span>
            <small>配置完整度</small>
            <strong>{progress}%</strong>
          </span>
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {evaluation.configuredStepCount}/{evaluation.totalSteps}{" "}
            个步骤已完成配置
          </small>
        </div>
      </section>
      <section className="panel ai-config-readiness">
        <PanelTitle
          title="配置完整性检查"
          action={
            <div className="row-actions">
              {evaluation.status === "pending_validation" && (
                <Button
                  onClick={() =>
                    document
                      .getElementById("workstation-enablement")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  去工位验证
                </Button>
              )}
              <Button
                type="primary"
                disabled={
                  !evaluation.ready ||
                  evaluation.status === "pending_validation"
                }
                onClick={() =>
                  setModal({
                    title: "完成AI能力配置",
                    content: (
                      <p>
                        完整性检查已通过。完成后配置进入“待验证”，后续需要在工位现场验证后才能启用。
                      </p>
                    ),
                    confirmText: "确认完成",
                    onConfirm: () => {
                      store.completeAiCapabilityConfig(sop.id);
                      return "AI能力配置已进入待验证";
                    },
                  })
                }
              >
                完成配置
              </Button>
            </div>
          }
        />
        {evaluation.ready ? (
          <div className="evaluation-notice evaluation-notice--success">
            <CheckCircleOutlined />
            <span>所有步骤、规则、判断项、能力引用和条件均已通过检查。</span>
          </div>
        ) : (
          <div className="ai-config-check-list">
            {evaluation.issues.slice(0, 8).map((issue) => (
              <p key={issue}>
                <AlertOutlined /> {issue}
              </p>
            ))}
            {evaluation.issues.length > 8 && (
              <small>
                另有 {evaluation.issues.length - 8} 项，请在对应步骤内查看。
              </small>
            )}
          </div>
        )}
      </section>
      <section className="panel ai-config-logical-areas">
        <PanelTitle
          title="逻辑区域"
          action={
            <Button icon={<PlusOutlined />} onClick={addArea}>
              新增逻辑区域
            </Button>
          }
        />
        <p className="hint">
          逻辑区域只描述业务含义，摄像头画面与坐标将在后续工位验证中配置。
        </p>
        <div className="ai-config-area-list">
          {config.logicalAreas.map((area) => (
            <article key={area.id}>
              <div>
                <strong>{area.name}</strong>
                <small>{area.description || "暂无说明"}</small>
                <small>
                  被{" "}
                  {config.judgementItems.reduce(
                    (count, item) =>
                      count +
                      (item.conditions || []).filter(
                        (condition) => condition.logicalAreaId === area.id,
                      ).length,
                    0,
                  )}{" "}
                  个判断条件引用
                </small>
              </div>
              <button
                className="table-action table-action--danger"
                onClick={() =>
                  setModal({
                    title: "删除逻辑区域",
                    content: (
                      <p>
                        确认删除“{area.name}”？已被判断条件引用的区域无法删除。
                      </p>
                    ),
                    confirmText: "确认删除",
                    onConfirm: () => {
                      store.deleteAiLogicalArea(sop.id, area.id);
                      return "逻辑区域已删除";
                    },
                  })
                }
              >
                删除
              </button>
            </article>
          ))}
          {!config.logicalAreas.length && (
            <p className="hint">
              暂无逻辑区域。仅在条件需要“进入区域”或“位于区域”时创建。
            </p>
          )}
        </div>
      </section>
      <div className="ai-config-step-list">
        {(sop.steps || []).map((step, index) => (
          <AiConfigStepCard
            key={step.id}
            sop={sop}
            step={step}
            index={index}
            config={config}
            evaluation={evaluation}
            capabilities={capabilities}
            store={store}
            setModal={setModal}
            nav={nav}
          />
        ))}
      </div>
      <section className="panel ai-config-footer-summary">
        <div>
          <small>步骤</small>
          <strong>{evaluation.totalSteps}</strong>
        </div>
        <div>
          <small>AI自动</small>
          <strong>{evaluation.modeCounts.automatic}</strong>
        </div>
        <div>
          <small>AI辅助</small>
          <strong>{evaluation.modeCounts.assisted}</strong>
        </div>
        <div>
          <small>教师评价</small>
          <strong>{evaluation.modeCounts.teacher}</strong>
        </div>
        <div>
          <small>判断项</small>
          <strong>{evaluation.judgementItemCount}</strong>
        </div>
        <div>
          <small>引用能力</small>
          <strong>{evaluation.distinctCapabilityIds.length}</strong>
        </div>
        <div>
          <small>逻辑区域</small>
          <strong>{evaluation.logicalAreaCount}</strong>
        </div>
        <div>
          <small>当前状态</small>
          <Status>{evaluation.statusLabel}</Status>
        </div>
      </section>
      {!!rawConfig && (
        <div id="workstation-enablement">
          <SopWorkstationEnablementSection
            sop={sop}
            aiConfig={config}
            evaluation={evaluation}
            data={data}
            store={store}
            setModal={setModal}
            nav={nav}
          />
        </div>
      )}
    </>
  );
}

const AI_CAPABILITIES_PATH = `${AI_LIBRARY_PATH}/capabilities`;

function confirmAiCapabilityAction(action, capability, store, setModal, nav) {
  const count = capabilityReferenceCount(capability);
  if (action === "delete" && count) {
    setModal({
      title: "当前能力不可删除",
      content: (
        <p>当前AI能力正在被 {count} 个AI能力配置引用，请先解除引用后再删除。</p>
      ),
      dismissOnly: true,
    });
    return;
  }
  if (action === "reactivate" && !canReactivateCapabilityModel(capability)) {
    setModal({
      title: "当前能力不可重新启用",
      content: <p>当前能力没有已发布模型，不能重新启用。</p>,
      dismissOnly: true,
    });
    return;
  }
  const deleting = action === "delete";
  const deactivating = action === "deactivate";
  setModal({
    title: deleting
      ? "删除AI能力"
      : deactivating
        ? "停用AI能力"
        : "重新启用AI能力",
    content: (
      <p>
        {deleting
          ? `确认删除“${capability.name}”？删除后无法恢复。`
          : deactivating
            ? `停用“${capability.name}”后，该能力不再供新的AI能力配置选择；已有引用不会自动删除。`
            : `确认重新启用“${capability.name}”？启用后可供新的AI能力配置选择。`}
      </p>
    ),
    confirmText: deleting ? "确认删除" : deactivating ? "确认停用" : "确认启用",
    onConfirm: () => {
      if (deleting) {
        store.deleteAiCapability(capability.id);
        window.setTimeout(() => nav(AI_CAPABILITIES_PATH), 0);
      } else if (deactivating) {
        store.deactivateAiCapability(capability.id);
      } else {
        store.reactivateAiCapability(capability.id);
      }
      return `${capability.name} 已${deleting ? "删除" : deactivating ? "停用" : "重新启用"}`;
    },
  });
}

function AiCapabilityList({ setModal }) {
  const nav = useNavigate();
  const store = usePrototypeData();
  const capabilities = Array.isArray(store.data.aiCapabilities)
    ? store.data.aiCapabilities
    : [];
  const sourceVideos = Array.isArray(store.data.aiSourceVideos)
    ? store.data.aiSourceVideos
    : [];
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const visible = capabilities
    .filter(
      (item) =>
        item?.id &&
        (!query.trim() ||
          item.name
            ?.toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())) &&
        (!typeFilter || item.type === typeFilter) &&
        (!statusFilter || item.status === statusFilter),
    )
    .sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );
  const showAction = (capability, action, label) => (
    <button
      key={action}
      className="table-action"
      onClick={() =>
        confirmAiCapabilityAction(action, capability, store, setModal, nav)
      }
    >
      {label}
    </button>
  );
  const rows = visible.map((capability) => [
    capability.name,
    AI_CAPABILITY_TYPES[capability.type] || "未知类型",
    <Status key="status">{capability.status || "草稿"}</Status>,
    String(
      sourceVideos.filter((video) => video.capabilityId === capability.id)
        .length,
    ),
    "0",
    <Status key="model">{capability.currentModelStatus || "未训练"}</Status>,
    `${capabilityReferenceCount(capability)} 个`,
    capability.updatedAt || "—",
    <div className="ai-capability-row-actions" key="actions">
      <button
        className="table-action"
        onClick={() =>
          nav(`${AI_CAPABILITIES_PATH}/${encodeURIComponent(capability.id)}`)
        }
      >
        查看
      </button>
      {canEditCapability(capability) && (
        <button
          className="table-action"
          onClick={() =>
            nav(
              `${AI_CAPABILITIES_PATH}/${encodeURIComponent(capability.id)}/edit`,
            )
          }
        >
          {canEditCapabilityMeaning(capability) ? "编辑" : "编辑备注"}
        </button>
      )}
      {capability.status === "已发布" &&
        showAction(capability, "deactivate", "停用")}
      {capability.status === "已停用" &&
        showAction(capability, "reactivate", "重新启用")}
      {!["已发布", "训练中"].includes(capability.status) &&
        showAction(capability, "delete", "删除")}
    </div>,
  ]);
  return (
    <>
      <PageHeader
        title="能力管理"
        subtitle="管理可跨实训标准复用的目标检测和动作识别能力。"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav(`${AI_CAPABILITIES_PATH}/new`)}
          >
            新建AI能力
          </Button>
        }
      />
      {capabilities.length ? (
        <section className="panel panel--table">
          <div className="list-toolbar ai-capability-toolbar">
            <label className="search">
              <SearchOutlined aria-hidden="true" />
              <input
                aria-label="搜索能力名称"
                placeholder="搜索能力名称"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="筛选能力类型"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">全部类型</option>
              {Object.entries(AI_CAPABILITY_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="筛选能力状态"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">全部状态</option>
              {AI_CAPABILITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setQuery("");
                setTypeFilter("");
                setStatusFilter("");
              }}
            >
              刷新
            </Button>
          </div>
          <DataTable
            pagination
            columns={[
              "能力名称",
              "能力类型",
              "当前状态",
              "原始视频",
              "有效训练数据",
              "当前模型",
              "被引用",
              "更新时间",
              "操作",
            ]}
            rows={rows}
            rowKey={(_, index) => visible[index].id}
            statusColumns={[]}
            emptyText="没有符合筛选条件的AI能力"
          />
        </section>
      ) : (
        <section className="panel empty-state">
          <DatabaseOutlined />
          <h2>暂无AI能力</h2>
          <p>
            创建可复用的目标检测或动作识别能力后，可继续准备训练数据并完成模型发布。
          </p>
          <Button
            type="primary"
            onClick={() => nav(`${AI_CAPABILITIES_PATH}/new`)}
          >
            新建AI能力
          </Button>
        </section>
      )}
    </>
  );
}

function AiCapabilityForm() {
  const nav = useNavigate();
  const { capabilityId } = useParams();
  const store = usePrototypeData();
  const existing = capabilityId
    ? (store.data.aiCapabilities || []).find((item) => item.id === capabilityId)
    : null;
  const creating = !capabilityId;
  const [draft, setDraft] = useState(() => ({
    name: existing?.name || "",
    type: existing?.type || "",
    description: existing?.description || "",
    targetName: existing?.targetName || "",
    note: existing?.note || "",
  }));
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft({
      name: existing?.name || "",
      type: existing?.type || "",
      description: existing?.description || "",
      targetName: existing?.targetName || "",
      note: existing?.note || "",
    });
    setError("");
  }, [capabilityId]);
  if (!creating && !existing)
    return <MissingState title="AI能力不存在" backTo={AI_CAPABILITIES_PATH} />;
  if (!creating && !canEditCapability(existing))
    return (
      <MissingState
        title="当前能力状态不可编辑"
        backTo={`${AI_CAPABILITIES_PATH}/${encodeURIComponent(capabilityId)}`}
      />
    );
  const meaningEditable = creating || canEditCapabilityMeaning(existing);
  const targetLabel =
    draft.type === "object_detection"
      ? "识别对象"
      : draft.type === "action_recognition"
        ? "动作名称"
        : "识别对象 / 动作名称";
  const setField = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  const save = (event) => {
    event.preventDefault();
    try {
      const saved = creating
        ? store.createAiCapability(draft)
        : store.updateAiCapability(capabilityId, draft);
      nav(`${AI_CAPABILITIES_PATH}/${encodeURIComponent(saved.id)}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "保存失败，请检查输入。",
      );
    }
  };
  return (
    <>
      <PageHeader
        title={creating ? "新建AI能力" : `编辑AI能力 · ${existing.name}`}
        subtitle="能力描述平台可重复使用的视觉识别事实，不包含实训标准的评分和工位规则。"
        actions={
          <Button
            onClick={() =>
              nav(
                creating
                  ? AI_CAPABILITIES_PATH
                  : `${AI_CAPABILITIES_PATH}/${encodeURIComponent(capabilityId)}`,
              )
            }
          >
            取消
          </Button>
        }
      />
      <form className="panel ai-capability-form" onSubmit={save}>
        {!meaningEditable && (
          <p className="hint ai-capability-lock-note">
            已发布能力的识别含义已锁定。本页仅可修改备注；如需改变识别对象或动作，请新建AI能力。
          </p>
        )}
        <div className="ai-capability-form__grid">
          <label className="field">
            能力名称
            <input
              value={draft.name}
              onChange={setField("name")}
              disabled={!meaningEditable}
              maxLength={50}
              placeholder="例如：验电笔检测"
            />
          </label>
          <label className="field">
            能力类型
            <select
              value={draft.type}
              onChange={setField("type")}
              disabled={!creating}
            >
              <option value="">请选择能力类型</option>
              {Object.entries(AI_CAPABILITY_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          能力说明
          <textarea
            value={draft.description}
            onChange={setField("description")}
            disabled={!meaningEditable}
            placeholder="说明该能力识别什么，不填写实训标准的评分或工位规则。"
          />
        </label>
        <label className="field">
          {targetLabel}
          <input
            value={draft.targetName}
            onChange={setField("targetName")}
            disabled={!meaningEditable}
            placeholder={
              draft.type === "action_recognition"
                ? "例如：二次验电"
                : "例如：绝缘手套"
            }
          />
        </label>
        <label className="field">
          <FieldLabel>备注</FieldLabel>
          <textarea
            value={draft.note}
            onChange={setField("note")}
            placeholder="记录数据采集注意事项或实施说明。"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            <ExclamationCircleFilled /> {displayBusinessText(error)}
          </p>
        )}
        <div className="ai-capability-form__actions">
          <Button type="primary" htmlType="submit">
            {creating ? "创建能力" : "保存修改"}
          </Button>
        </div>
      </form>
    </>
  );
}

function AiCapabilityDetail({ setModal }) {
  const nav = useNavigate();
  const { capabilityId } = useParams();
  const store = usePrototypeData();
  const capability = (store.data.aiCapabilities || []).find(
    (item) => item.id === capabilityId,
  );
  if (!capability)
    return <MissingState title="AI能力不存在" backTo={AI_CAPABILITIES_PATH} />;
  const count = capabilityReferenceCount(capability);
  const sourceVideoCount = (store.data.aiSourceVideos || []).filter(
    (video) => video.capabilityId === capability.id,
  ).length;
  return (
    <>
      <div className="ai-capability-breadcrumb">
        AI能力库 /{" "}
        <button onClick={() => nav(AI_CAPABILITIES_PATH)}>能力管理</button> /{" "}
        {capability.name}
      </div>
      <PageHeader
        title={capability.name}
        subtitle="平台可复用的视觉识别能力"
        actions={
          <>
            <Button onClick={() => nav(AI_CAPABILITIES_PATH)}>返回列表</Button>
            {canEditCapability(capability) && (
              <Button
                onClick={() =>
                  nav(
                    `${AI_CAPABILITIES_PATH}/${encodeURIComponent(capability.id)}/edit`,
                  )
                }
              >
                {canEditCapabilityMeaning(capability) ? "编辑" : "编辑备注"}
              </Button>
            )}
            {capability.status === "已发布" && (
              <Button
                onClick={() =>
                  confirmAiCapabilityAction(
                    "deactivate",
                    capability,
                    store,
                    setModal,
                    nav,
                  )
                }
              >
                停用
              </Button>
            )}
            {capability.status === "已停用" && (
              <Button
                type="primary"
                onClick={() =>
                  confirmAiCapabilityAction(
                    "reactivate",
                    capability,
                    store,
                    setModal,
                    nav,
                  )
                }
              >
                重新启用
              </Button>
            )}
            {!["已发布", "训练中"].includes(capability.status) && (
              <Button
                onClick={() =>
                  confirmAiCapabilityAction(
                    "delete",
                    capability,
                    store,
                    setModal,
                    nav,
                  )
                }
              >
                删除
              </Button>
            )}
          </>
        }
      />
      <div className="ai-library-capability-summary">
        <span>
          <small>能力类型</small>
          <strong>{AI_CAPABILITY_TYPES[capability.type] || "未知类型"}</strong>
        </span>
        <span>
          <small>当前状态</small>
          <Status>{capability.status}</Status>
        </span>
        <span>
          <small>当前模型</small>
          <Status>{capability.currentModelStatus || "未训练"}</Status>
        </span>
        <span>
          <small>被引用</small>
          <strong>{count} 个AI能力配置</strong>
        </span>
        <span>
          <small>最近更新</small>
          <strong>{displayBusinessText(capability.updatedAt || "—")}</strong>
        </span>
      </div>
      <section className="panel ai-capability-detail-section">
        <PanelTitle title="基础信息" />
        <div className="ai-capability-facts">
          {[
            ["能力名称", capability.name],
            ["能力类型", AI_CAPABILITY_TYPES[capability.type]],
            ["能力说明", capability.description],
            [
              capability.type === "object_detection" ? "识别对象" : "动作名称",
              capability.targetName,
            ],
            ["创建人", capability.createdBy],
            ["创建时间", capability.createdAt],
            ["更新时间", capability.updatedAt],
            ["备注", capability.note || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value || "—"}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel ai-capability-detail-section">
        <PanelTitle title="数据概览" />
        <div className="ai-capability-data-grid">
          {[
            ["原始视频", String(sourceVideoCount)],
            ["已生成数据", "0"],
            ["有效训练数据", "0"],
            ["已标注", "0"],
            ["当前模型", capability.currentModelStatus || "未训练"],
          ].map(([label, value]) => (
            <span key={label}>
              <small>{label}</small>
              <strong>{displayBusinessText(value)}</strong>
            </span>
          ))}
        </div>
      </section>
      <section className="panel ai-capability-detail-section">
        <PanelTitle title="引用关系" />
        <p className="hint">
          {count
            ? `当前被 ${count} 个AI能力配置引用。`
            : "暂无AI能力配置引用。"}
        </p>
      </section>
      <section className="panel ai-capability-detail-section">
        <PanelTitle title="后续数据流程" />
        <p className="hint">
          以下入口会保留当前能力，后续页面按该能力单独管理数据。
        </p>
        <div className="ai-capability-flow-links">
          {AI_LIBRARY_SECTIONS.slice(1).map((section) => (
            <Button
              key={section.path}
              onClick={() =>
                nav(
                  `${AI_LIBRARY_PATH}/${section.path}?capabilityId=${encodeURIComponent(capability.id)}`,
                )
              }
            >
              {section.title}
            </Button>
          ))}
        </div>
      </section>
    </>
  );
}

function formatVideoFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatVideoDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "待读取";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours
    ? [hours, minutes, remaining]
        .map((item) => String(item).padStart(2, "0"))
        .join(":")
    : [minutes, remaining]
        .map((item) => String(item).padStart(2, "0"))
        .join(":");
}

function readVideoFileMetadata(file) {
  const storageRef = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      resolve({
        fileName: file.name,
        displayName: file.name,
        storageRef,
        mimeType: file.type,
        codec: file.type || "—",
        duration: formatVideoDuration(video.duration),
        width: Number(video.videoWidth || 0),
        height: Number(video.videoHeight || 0),
        fileSize: Number(file.size || 0),
      });
    };
    video.preload = "metadata";
    video.onloadedmetadata = finish;
    video.onerror = finish;
    window.setTimeout(finish, 1600);
    video.src = storageRef;
  });
}

const AiVideoUploadForm = forwardRef(function AiVideoUploadForm(
  { capability, workstations, existingVideos },
  ref,
) {
  const [form, setForm] = useState({
    dataCategory: "normal",
    sourceType: "standard_demo",
    workstationId: "",
    note: "",
    capturedAt: "",
    allowDuplicates: false,
  });
  const [files, setFiles] = useState([]);
  const [reading, setReading] = useState(false);
  const duplicates = potentialVideoDuplicates(
    files,
    existingVideos,
    capability.id,
  );
  useImperativeHandle(ref, () => ({
    getValue: () => ({ ...form, files, reading }),
  }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="form-stack ai-video-upload-form">
      <SourceMetadataFields value={form} onChange={update} />
      <div className="ai-video-readonly-capability">
        <small>当前AI能力</small>
        <strong>{capability.name}</strong>
        <span>{AI_CAPABILITY_TYPES[capability.type] || "未知类型"}</span>
      </div>
      <label className="field">
        视频文件（支持批量选择）
        <input
          type="file"
          multiple
          accept=".mp4,.mov,.avi,.mkv,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
          onChange={async (event) => {
            const selectedFiles = [...(event.target.files || [])];
            setReading(Boolean(selectedFiles.length));
            setFiles(
              await Promise.all(selectedFiles.map(readVideoFileMetadata)),
            );
            setReading(false);
          }}
        />
      </label>
      {reading && <p className="hint">正在读取视频基础信息…</p>}
      {!!files.length && (
        <div className="ai-video-upload-files">
          {files.map((file) => (
            <span key={`${file.fileName}-${file.fileSize}`}>
              <VideoCameraOutlined />
              <strong>{file.fileName}</strong>
              <small>
                {file.duration} ·{" "}
                {file.width && file.height
                  ? `${file.width}×${file.height}`
                  : "分辨率待读取"}{" "}
                · {formatVideoFileSize(file.fileSize)}
              </small>
            </span>
          ))}
        </div>
      )}
      <div className="form-row">
        <label className="field">
          数据属性
          <select
            value={form.dataCategory}
            onChange={(event) => update("dataCategory", event.target.value)}
          >
            {Object.entries(AI_VIDEO_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          数据来源
          <select
            value={form.sourceType}
            onChange={(event) => update("sourceType", event.target.value)}
          >
            {Object.entries(AI_VIDEO_SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <FieldLabel>拍摄工位</FieldLabel>
          <select
            value={form.workstationId}
            onChange={(event) => update("workstationId", event.target.value)}
          >
            <option value="">未记录</option>
            {(workstations || []).map((item) => (
              <option key={item.id} value={item.id}>
                {workstationOptionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <FieldLabel>拍摄日期</FieldLabel>
          <input
            type="date"
            value={displayBusinessText(form.capturedAt).slice(0, 10)}
            onChange={(event) => update("capturedAt", event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <FieldLabel>拍摄说明</FieldLabel>
        <textarea
          rows={3}
          placeholder="例如：正面机位、弱光环境、有轻微遮挡"
          value={form.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </label>
      {!!duplicates.length && (
        <label className="ai-video-duplicate-warning">
          <input
            type="checkbox"
            checked={form.allowDuplicates}
            onChange={(event) =>
              update("allowDuplicates", event.target.checked)
            }
          />
          检测到 {duplicates.length} 个同名且同大小的视频，仍然继续上传
        </label>
      )}
    </div>
  );
});

const AiVideoMetadataForm = forwardRef(function AiVideoMetadataForm(
  { video, workstations },
  ref,
) {
  const [form, setForm] = useState({
    ...video,
    displayName: video.displayName || video.fileName,
    dataCategory: video.dataCategory,
    sourceType: video.sourceType,
    workstationId: video.workstationId || "",
    capturedAt: video.capturedAt || "",
    note: video.note || "",
  });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="form-stack">
      <SourceMetadataFields value={form} onChange={update} />
      <label className="field">
        视频名称
        <input
          value={form.displayName}
          maxLength={80}
          onChange={(event) => update("displayName", event.target.value)}
        />
      </label>
      <div className="form-row">
        <label className="field">
          数据属性
          <select
            value={form.dataCategory}
            onChange={(event) => update("dataCategory", event.target.value)}
          >
            {Object.entries(AI_VIDEO_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          数据来源
          <select
            value={form.sourceType}
            onChange={(event) => update("sourceType", event.target.value)}
          >
            {Object.entries(AI_VIDEO_SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <FieldLabel>拍摄工位</FieldLabel>
          <select
            value={form.workstationId}
            onChange={(event) => update("workstationId", event.target.value)}
          >
            <option value="">未记录</option>
            {(workstations || []).map((item) => (
              <option key={item.id} value={item.id}>
                {workstationOptionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <FieldLabel>拍摄日期</FieldLabel>
          <input
            type="date"
            value={displayBusinessText(form.capturedAt).slice(0, 10)}
            onChange={(event) => update("capturedAt", event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <FieldLabel>拍摄说明</FieldLabel>
        <textarea
          rows={3}
          value={form.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </label>
      <div className="ai-video-locked-fields">
        <span>
          <small>原始文件</small>
          <strong>{video.fileName}</strong>
        </span>
        <span>
          <small>所属能力</small>
          <strong>上传后不可修改</strong>
        </span>
        <span>
          <small>原始时长</small>
          <strong>{video.duration}</strong>
        </span>
        <span>
          <small>文件大小</small>
          <strong>{formatVideoFileSize(video.fileSize)}</strong>
        </span>
      </div>
    </div>
  );
});

const AiVideoBatchForm = forwardRef(function AiVideoBatchForm(
  { mode, count },
  ref,
) {
  const options = mode === "category" ? AI_VIDEO_CATEGORIES : AI_VIDEO_SOURCES;
  const [value, setValue] = useState(Object.keys(options)[0]);
  useImperativeHandle(ref, () => ({
    getValue: () => ({
      [mode === "category" ? "dataCategory" : "sourceType"]: value,
    }),
  }));
  return (
    <div className="form-stack">
      <p className="hint">将同时修改已选择的 {count} 个视频。</p>
      <label className="field">
        {mode === "category" ? "数据属性" : "数据来源"}
        <select
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          {Object.entries(options).map(([option, label]) => (
            <option key={option} value={option}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
});

function AiVideoPreview({ video, workstation }) {
  const [previewUnavailable, setPreviewUnavailable] = useState(
    !video.storageRef,
  );
  return (
    <div className="ai-video-preview">
      {!previewUnavailable ? (
        <video
          controls
          preload="metadata"
          src={video.storageRef}
          onError={() => setPreviewUnavailable(true)}
        >
          当前浏览器无法播放该视频。
        </video>
      ) : (
        <div className="ai-video-preview__unavailable">
          <VideoCameraOutlined />
          <strong>演示数据未保存源文件内容</strong>
          <span>上传本地视频后可在此播放、暂停、拖动进度并使用全屏。</span>
        </div>
      )}
      <div className="ai-video-preview__facts">
        {[
          ["视频名称", video.displayName || video.fileName],
          ["数据属性", AI_VIDEO_CATEGORIES[video.dataCategory]],
          ["数据来源", AI_VIDEO_SOURCES[video.sourceType]],
          [
            "拍摄工位",
            workstation ? workstationOptionLabel(workstation) : "未记录",
          ],
          ["拍摄说明", video.note || "—"],
          ["上传时间", video.uploadedAt || "—"],
        ].map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value || "—"}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function AiVideoManagement({ setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const store = usePrototypeData();
  const uploadRef = useRef(null);
  const editRef = useRef(null);
  const batchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [videoPage, setVideoPage] = useState(1);
  const [videoPageSize, setVideoPageSize] = useState(10);
  const capabilities = Array.isArray(store.data.aiCapabilities)
    ? store.data.aiCapabilities
    : [];
  const allVideos = Array.isArray(store.data.aiSourceVideos)
    ? store.data.aiSourceVideos
    : [];
  const selectedId = new URLSearchParams(location.search).get("capabilityId");
  const capability = capabilities.find((item) => item.id === selectedId);
  const videos = capability
    ? allVideos.filter((item) => item.capabilityId === capability.id)
    : [];
  const visible = videos.filter(
    (item) =>
      (!query.trim() ||
        [item.displayName, item.fileName].some((value) =>
          String(value || "")
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )) &&
      (!categoryFilter || item.dataCategory === categoryFilter) &&
      (!sourceFilter || item.sourceType === sourceFilter) &&
      (!statusFilter || item.processingStatus === statusFilter),
  );
  const videoPageCount = Math.max(1, Math.ceil(visible.length / videoPageSize));
  const pageVideos = visible.slice(
    (videoPage - 1) * videoPageSize,
    videoPage * videoPageSize,
  );
  const stats = videoStats(videos);
  const workstationById = Object.fromEntries(
    (store.data.workstations || []).map((item) => [item.id, item]),
  );
  useEffect(() => setSelectedIds([]), [selectedId]);
  useEffect(
    () => setVideoPage(1),
    [selectedId, query, categoryFilter, sourceFilter, statusFilter],
  );
  useEffect(
    () => setVideoPage((current) => Math.min(current, videoPageCount)),
    [videoPageCount],
  );

  const openUpload = () => {
    if (!capability) return;
    setModal({
      eyebrow: "原始视频",
      title: "上传视频",
      size: "large",
      confirmText: "开始上传",
      content: (
        <AiVideoUploadForm
          ref={uploadRef}
          capability={capability}
          workstations={store.data.workstations || []}
          existingVideos={allVideos}
        />
      ),
      onConfirm: () => {
        const input = uploadRef.current?.getValue();
        if (input?.reading) throw new Error("视频信息仍在读取，请稍后再试。");
        const created = store.uploadAiSourceVideos({
          ...input,
          capabilityId: capability.id,
        });
        return `已上传 ${created.length} 个原始视频`;
      },
    });
  };
  const openPreview = (video) =>
    setModal({
      eyebrow: "视频预览",
      title: video.displayName || video.fileName,
      size: "large",
      hideCancel: true,
      dismissOnly: true,
      confirmText: "关闭",
      content: (
        <AiVideoPreview
          video={video}
          workstation={workstationById[video.workstationId]}
        />
      ),
    });
  const openEdit = (video) =>
    setModal({
      eyebrow: "原始视频",
      title: "编辑视频信息",
      size: "large",
      confirmText: "保存修改",
      content: (
        <AiVideoMetadataForm
          ref={editRef}
          video={video}
          workstations={store.data.workstations || []}
        />
      ),
      onConfirm: () => {
        store.updateAiSourceVideo(video.id, editRef.current?.getValue());
        return "视频信息已更新";
      },
    });
  const requestDelete = (targets) => {
    const protectedVideo = targets.find(
      (item) => item.processingStatus === "derived",
    );
    if (protectedVideo) {
      setModal({
        title: "当前视频不可删除",
        hideCancel: true,
        dismissOnly: true,
        content: (
          <p>
            “{protectedVideo.displayName || protectedVideo.fileName}
            ”已生成后续训练数据，无法直接删除。请先清理该视频产生的派生数据后再操作。
          </p>
        ),
      });
      return;
    }
    setModal({
      title:
        targets.length > 1
          ? `删除 ${targets.length} 个原始视频`
          : "删除原始视频",
      confirmText: "确认删除",
      content: <p>删除后将永久移除所选原始视频，是否继续？</p>,
      onConfirm: () => {
        store.deleteAiSourceVideos(targets.map((item) => item.id));
        setSelectedIds([]);
        return `已删除 ${targets.length} 个原始视频`;
      },
    });
  };
  const openBatch = (mode) =>
    setModal({
      eyebrow: "批量操作",
      title: mode === "category" ? "批量修改数据属性" : "批量修改数据来源",
      confirmText: "保存修改",
      content: (
        <AiVideoBatchForm
          ref={batchRef}
          mode={mode}
          count={selectedIds.length}
        />
      ),
      onConfirm: () => {
        store.batchUpdateAiSourceVideos(
          selectedIds,
          batchRef.current?.getValue(),
        );
        setSelectedIds([]);
        return `已更新 ${selectedIds.length} 个视频`;
      },
    });
  const toggleSelected = (id) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const allPageVideosSelected =
    pageVideos.length > 0 &&
    pageVideos.every((item) => selectedIds.includes(item.id));

  return (
    <>
      <PageHeader
        title="视频管理"
        subtitle="按AI能力独立维护原始视频，后续处理只生成派生数据。"
        actions={
          <>
            {capability && (
              <Button
                onClick={() =>
                  nav(
                    `${AI_LIBRARY_PATH}/extraction?capabilityId=${encodeURIComponent(capability.id)}`,
                  )
                }
              >
                {capability.type === "object_detection" ? "去抽帧" : "去切片"}
              </Button>
            )}
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={openUpload}
              disabled={!capability}
            >
              上传视频
            </Button>
          </>
        }
      />
      <section className="panel ai-video-capability-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/videos?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/videos`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type] || "未知类型"} ·{" "}
                {item.status}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-video-capability-meta">
            <span>
              <small>能力类型</small>
              <strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              <small>当前状态</small>
              <Status>{capability.status}</Status>
            </span>
          </div>
        )}
        {selectedId && !capability && (
          <p className="form-error" role="alert">
            所选AI能力不存在，请重新选择。
          </p>
        )}
      </section>
      {capability && <SampleMetadataPanel capabilityId={capability.id} />}
      {!capability ? (
        <section className="panel empty-state ai-library-empty ai-entry-table">
          <VideoCameraOutlined />
          <h2>请先选择AI能力</h2>
          <p>视频数据按AI能力独立管理。请选择一个AI能力后继续。</p>
        </section>
      ) : !videos.length ? (
        <section className="panel empty-state ai-library-empty ai-entry-table">
          <UploadOutlined />
          <h2>暂无原始视频</h2>
          <p>上传与当前AI能力相关的原始视频，后续可进行抽帧或视频切片。</p>
          <Button type="primary" icon={<UploadOutlined />} onClick={openUpload}>
            上传视频
          </Button>
        </section>
      ) : (
        <>
          <div className="ai-video-stats">
            {[
              ["原始视频总数", stats.total],
              ["正常视频", stats.normal],
              ["错误视频", stats.error],
              ["背景视频", stats.background],
              ["未处理", stats.unprocessed],
              ["已进入后续处理", stats.derived],
            ].map(([label, value]) => (
              <span key={label}>
                <small>{label}</small>
                <strong>{displayBusinessText(value)}</strong>
              </span>
            ))}
          </div>
          <section className="panel panel--table ai-entry-table ai-video-list-panel">
            <div className="list-toolbar ai-video-toolbar">
              <label className="search">
                <SearchOutlined aria-hidden="true" />
                <input
                  aria-label="搜索视频名称"
                  placeholder="搜索视频名称"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                aria-label="筛选数据属性"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="">全部属性</option>
                {Object.entries(AI_VIDEO_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="筛选数据来源"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="">全部来源</option>
                {Object.entries(AI_VIDEO_SOURCES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="筛选处理状态"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">全部处理状态</option>
                {Object.entries(AI_VIDEO_PROCESSING_STATUSES).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            {!!selectedIds.length && (
              <div className="ai-video-batch-bar">
                <strong>已选择 {selectedIds.length} 个视频</strong>
                <Button onClick={() => openBatch("category")}>
                  修改数据属性
                </Button>
                <Button onClick={() => openBatch("source")}>
                  修改数据来源
                </Button>
                <Button
                  onClick={() =>
                    requestDelete(
                      videos.filter((item) => selectedIds.includes(item.id)),
                    )
                  }
                >
                  批量删除
                </Button>
                <button
                  className="table-action"
                  onClick={() => setSelectedIds([])}
                >
                  取消选择
                </button>
              </div>
            )}
            <div className="table-wrap ai-video-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="选择当前页全部视频"
                        type="checkbox"
                        checked={allPageVideosSelected}
                        onChange={() =>
                          setSelectedIds((current) =>
                            allPageVideosSelected
                              ? current.filter(
                                  (id) =>
                                    !pageVideos.some((item) => item.id === id),
                                )
                              : [
                                  ...new Set([
                                    ...current,
                                    ...pageVideos.map((item) => item.id),
                                  ]),
                                ],
                          )
                        }
                      />
                    </th>
                    <th>视频名称</th>
                    <th>数据属性</th>
                    <th>数据来源</th>
                    <th>拍摄工位</th>
                    <th>时长</th>
                    <th>分辨率</th>
                    <th>文件大小</th>
                    <th>处理状态</th>
                    <th>上传人</th>
                    <th>上传时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageVideos.map((video) => {
                    const workstation = workstationById[video.workstationId];
                    return (
                      <tr key={video.id}>
                        <td>
                          <input
                            aria-label={`选择 ${video.displayName || video.fileName}`}
                            type="checkbox"
                            checked={selectedIds.includes(video.id)}
                            onChange={() => toggleSelected(video.id)}
                          />
                        </td>
                        <td>
                          <strong>{video.displayName || video.fileName}</strong>
                          <small className="ai-video-file-name">
                            {video.fileName}
                          </small>
                        </td>
                        <td>
                          {AI_VIDEO_CATEGORIES[video.dataCategory] || "—"}
                        </td>
                        <td>{AI_VIDEO_SOURCES[video.sourceType] || "—"}</td>
                        <td>{workstation ? workstation.name : "—"}</td>
                        <td>{video.duration || "—"}</td>
                        <td>
                          {video.width && video.height
                            ? `${video.width}×${video.height}`
                            : "—"}
                        </td>
                        <td>{formatVideoFileSize(video.fileSize)}</td>
                        <td>
                          <Status>
                            {AI_VIDEO_PROCESSING_STATUSES[
                              video.processingStatus
                            ] || "未处理"}
                          </Status>
                        </td>
                        <td>{video.uploadedBy || "—"}</td>
                        <td>{displayBusinessText(video.uploadedAt || "—")}</td>
                        <td>
                          <div className="ai-capability-row-actions">
                            <button
                              className="table-action"
                              onClick={() => openPreview(video)}
                            >
                              预览
                            </button>
                            <button
                              className="table-action"
                              onClick={() => openEdit(video)}
                            >
                              编辑信息
                            </button>
                            <button
                              className="table-action"
                              onClick={() => requestDelete([video])}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!visible.length && (
                    <tr>
                      <td className="table-empty" colSpan={12}>
                        没有符合筛选条件的视频
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              total={visible.length}
              page={videoPage}
              pageSize={videoPageSize}
              onPageChange={setVideoPage}
              onPageSizeChange={(nextPageSize) => {
                setVideoPageSize(nextPageSize);
                setVideoPage(1);
              }}
            />
          </section>
        </>
      )}
    </>
  );
}

function frameImageUrl(frame) {
  if (frame.storageRef && !String(frame.storageRef).startsWith("mock-frame://"))
    return frame.storageRef;
  const seed =
    [...String(frame.sourceVideoId || "frame")].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ) + Math.round(Number(frame.sourceTimeMs || 0) / 100);
  const shift = seed % 54;
  const accent = 198 + (seed % 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop stop-color="hsl(${accent} 24% 76%)"/><stop offset="1" stop-color="hsl(${accent} 20% 61%)"/></linearGradient>
      <linearGradient id="bench" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#263b4e"/><stop offset="1" stop-color="#142432"/></linearGradient>
    </defs>
    <rect width="640" height="360" fill="#101b25"/>
    <rect x="18" y="18" width="604" height="324" rx="12" fill="url(#wall)"/>
    <rect x="35" y="42" width="170" height="102" rx="5" fill="#8da6b7"/><rect x="45" y="52" width="150" height="82" fill="#b9cbd5"/>
    <rect x="448" y="48" width="142" height="82" rx="6" fill="#546d80"/><circle cx="476" cy="75" r="9" fill="#78d9a2"/><rect x="496" y="67" width="72" height="8" rx="4" fill="#bcd0da"/><rect x="466" y="96" width="102" height="9" rx="4" fill="#8fa8b8"/>
    <rect x="36" y="244" width="568" height="82" rx="8" fill="url(#bench)"/><rect x="78" y="219" width="210" height="37" rx="6" fill="#41596a"/>
    <circle cx="${320 + shift / 3}" cy="102" r="38" fill="#263b4e"/><path d="M270 212 Q275 138 ${320 + shift / 3} 136 Q371 139 379 216Z" fill="#203648"/>
    <path d="M288 166 Q236 ${178 + shift} 232" fill="none" stroke="#314a5d" stroke-width="25" stroke-linecap="round"/><path d="M354 166 Q411 ${435 - shift / 2} 228" fill="none" stroke="#314a5d" stroke-width="25" stroke-linecap="round"/>
    <path d="M${159 + shift} 218 q18 -15 34 1 l18 25 q-22 17 -48 2Z" fill="#f28b35" stroke="#fff3d8" stroke-width="5"/><path d="M${418 - shift / 2} 219 q18 -15 34 1 l16 26 q-22 16 -47 1Z" fill="#f28b35" stroke="#fff3d8" stroke-width="5"/>
    <rect x="270" y="252" width="112" height="39" rx="7" fill="#748c9c"/><circle cx="296" cy="272" r="8" fill="#77dba4"/><rect x="315" y="265" width="48" height="12" rx="4" fill="#bacad3"/>
    <path d="M30 61v-24h24M586 37h24v24M30 299v24h24M586 323h24v-24" fill="none" stroke="#e8f4fa" stroke-width="4" opacity=".8"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function DerivedDataPreview({ item, sourceVideo, kind }) {
  const clipStart = Number(item.startMs || 0) / 1000;
  const clipEnd = Number(item.endMs || 0) / 1000;
  const [unavailable, setUnavailable] = useState(!item.storageRef);
  return (
    <div className="ai-derived-preview">
      {kind === "frames" ? (
        <figure className="ai-frame-preview-image">
          <img
            src={frameImageUrl(item)}
            alt={`${sourceVideo?.displayName || "原始视频"}在${formatDerivedTimecode(item.sourceTimeMs / 1000, true)}生成的图片帧`}
          />
          <figcaption>
            源视频时间点 {formatDerivedTimecode(item.sourceTimeMs / 1000, true)}
          </figcaption>
        </figure>
      ) : !unavailable ? (
        <video
          controls
          preload="metadata"
          src={`${item.storageRef}#t=${clipStart},${clipEnd}`}
          onError={() => setUnavailable(true)}
        >
          当前浏览器无法播放该视频片段。
        </video>
      ) : (
        <div className="ai-frame-preview-canvas">
          <PlayCircleFilled />
          <strong>
            {formatDerivedTimecode(clipStart)} –{" "}
            {formatDerivedTimecode(clipEnd)}
          </strong>
          <span>演示数据未保存原始视频内容</span>
        </div>
      )}
      <div className="ai-video-preview__facts">
        {[
          [
            kind === "frames" ? "图片名称" : "片段ID",
            kind === "frames" ? item.fileName : item.id,
          ],
          [
            "来源视频",
            sourceVideo?.displayName ||
              sourceVideo?.fileName ||
              "原始视频不存在",
          ],
          ["生成任务", item.taskId],
          [
            kind === "frames" ? "源视频时间点" : "片段范围",
            kind === "frames"
              ? formatDerivedTimecode(item.sourceTimeMs / 1000, true)
              : `${formatDerivedTimecode(clipStart)} – ${formatDerivedTimecode(clipEnd)}`,
          ],
          [
            kind === "frames" ? "分辨率" : "片段时长",
            kind === "frames"
              ? item.width && item.height
                ? `${item.width}×${item.height}`
                : "—"
              : formatDerivedTimecode(item.durationMs / 1000),
          ],
          [
            "当前状态",
            item.annotationStatus === "completed"
              ? "已标注"
              : item.manualCleaningStatus === "kept"
                ? "人工已保留"
                : DERIVED_DATA_STATUSES[item.processingStatus] || "待清洗",
          ],
        ].map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{displayBusinessText(value)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function AiExtractionPage({ setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const store = usePrototypeData();
  const videoRef = useRef(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [sourceStatusFilter, setSourceStatusFilter] = useState("");
  const [selectedResultIds, setSelectedResultIds] = useState([]);
  const [resultSourceFilter, setResultSourceFilter] = useState("");
  const [resultTaskFilter, setResultTaskFilter] = useState("");
  const [resultStatusFilter, setResultStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [formError, setFormError] = useState("");
  const [frameParams, setFrameParams] = useState({
    samplingMode: "interval",
    sampleValue: "0.5",
    rangeMode: "entire",
    startTime: "00:00",
    endTime: "00:10",
    maxFrames: "500",
    outputResolution: "original",
  });
  const [clipMethod, setClipMethod] = useState("manual");
  const [clipParams, setClipParams] = useState({
    startTime: "00:00",
    endTime: "00:05",
    note: "",
    clipLength: "5",
    step: "5",
  });
  const capabilities = Array.isArray(store.data.aiCapabilities)
    ? store.data.aiCapabilities
    : [];
  const selectedId = new URLSearchParams(location.search).get("capabilityId");
  const capability = capabilities.find((item) => item.id === selectedId);
  const mode = extractionModeForCapability(capability?.type);
  const videos = (store.data.aiSourceVideos || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const tasks = (store.data.aiExtractionTasks || [])
    .filter((item) => item.capabilityId === capability?.id)
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
  const frames = (store.data.aiFrames || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const clips = (store.data.aiClips || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const results = mode === "frames" ? frames : clips;
  const sourceVideoById = Object.fromEntries(
    videos.map((item) => [item.id, item]),
  );
  const visibleVideos = videos.filter(
    (item) =>
      !sourceStatusFilter || item.processingStatus === sourceStatusFilter,
  );
  const visibleResults = results.filter(
    (item) =>
      (!resultSourceFilter || item.sourceVideoId === resultSourceFilter) &&
      (!resultTaskFilter || item.taskId === resultTaskFilter) &&
      (!resultStatusFilter || item.processingStatus === resultStatusFilter) &&
      (!methodFilter || item.generationMethod === methodFilter),
  );
  const {
    pageItems: pagedExtractionTasks,
    paginationProps: extractionTaskPagination,
  } = useListPagination(tasks);
  const { pageItems: pagedResults, paginationProps: resultPagination } =
    useListPagination(visibleResults);
  const processedVideoCount = videos.filter(
    (item) => item.processingStatus === "derived",
  ).length;
  const pendingCleaningCount = results.filter(
    (item) => item.processingStatus === "pending_cleaning",
  ).length;
  const selectedVideos = videos.filter((item) =>
    selectedVideoIds.includes(item.id),
  );
  let frameEstimate = null;
  let frameEstimateError = "";
  if (mode === "frames" && selectedVideos.length) {
    try {
      frameEstimate = estimateFrameExtraction(selectedVideos, {
        ...frameParams,
        sampleValue: Number(frameParams.sampleValue),
        maxFrames: Number(frameParams.maxFrames),
      });
    } catch (reason) {
      frameEstimateError =
        reason instanceof Error ? reason.message : "抽帧参数无效。";
    }
  }
  useEffect(() => {
    setSelectedVideoIds([]);
    setSelectedResultIds([]);
    setFormError("");
  }, [selectedId]);
  useEffect(() => {
    if (clipMethod === "manual" && selectedVideoIds.length > 1)
      setSelectedVideoIds(selectedVideoIds.slice(0, 1));
  }, [clipMethod, selectedVideoIds]);

  const toggleVideo = (id) => {
    setFormError("");
    setSelectedVideoIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (mode === "clips" && clipMethod === "manual") return [id];
      return [...current, id];
    });
  };
  const openFrameTask = () => {
    if (!selectedVideos.length) {
      setFormError("请至少选择一个未生成结果的原始视频。");
      return;
    }
    if (frameEstimateError) {
      setFormError(frameEstimateError);
      return;
    }
    const parameters = {
      ...frameParams,
      sampleValue: Number(frameParams.sampleValue),
      maxFrames: Number(frameParams.maxFrames),
      rangeMode: selectedVideos.length > 1 ? "entire" : frameParams.rangeMode,
    };
    setModal({
      eyebrow: "抽帧任务",
      title: "确认开始抽帧",
      confirmText: "开始抽帧",
      content: (
        <div className="ai-task-confirmation">
          <p>
            已选择 <strong>{selectedVideos.length}</strong>{" "}
            个原始视频，总处理时长约{" "}
            <strong>
              {formatDerivedTimecode(frameEstimate.totalDuration)}
            </strong>
            。
          </p>
          <p>
            预计生成 <strong>{frameEstimate.estimatedCount}</strong> 张图片
            {frameEstimate.reachedLimitCount
              ? `，其中 ${frameEstimate.reachedLimitCount} 个视频会达到数量上限`
              : ""}
            。
          </p>
          <p className="hint">
            本步骤只生成图片帧，不执行去重、质量判断或标注。
          </p>
        </div>
      ),
      onConfirm: () => {
        const result = store.startFrameExtraction({
          capabilityId: capability.id,
          sourceVideoIds: selectedVideoIds,
          parameters,
        });
        setSelectedVideoIds([]);
        setFormError("");
        return `抽帧完成，共生成 ${result.frames.length} 张图片`;
      },
    });
  };
  const openClipTask = () => {
    if (!selectedVideos.length) {
      setFormError("请至少选择一个原始视频。");
      return;
    }
    const parameters =
      clipMethod === "manual"
        ? {
            startTime: clipParams.startTime,
            endTime: clipParams.endTime,
            note: clipParams.note,
          }
        : {
            clipLength: Number(clipParams.clipLength),
            step: Number(clipParams.step),
            startTime: selectedVideos.length === 1 ? clipParams.startTime : "",
            endTime: selectedVideos.length === 1 ? clipParams.endTime : "",
          };
    if (clipMethod === "manual") {
      const start = parseDerivedTimecode(parameters.startTime);
      const end = parseDerivedTimecode(parameters.endTime);
      const duration = parseDerivedTimecode(selectedVideos[0].duration);
      if (!Number.isFinite(duration) || duration <= 0) {
        setFormError("无法读取视频时长，请返回视频管理检查原始视频。");
        return;
      }
      if (!Number.isFinite(start) || start < 0) {
        setFormError("开始时间无效。");
        return;
      }
      if (!Number.isFinite(end) || end <= start) {
        setFormError("结束时间必须大于开始时间。");
        return;
      }
      if (end > duration) {
        setFormError("结束时间不能超过原视频时长。");
        return;
      }
    } else if (
      !Number.isFinite(parameters.clipLength) ||
      parameters.clipLength <= 0 ||
      !Number.isFinite(parameters.step) ||
      parameters.step <= 0
    ) {
      setFormError("片段长度和滑动步长必须大于0秒。");
      return;
    }
    setModal({
      eyebrow: "视频切片任务",
      title: clipMethod === "manual" ? "确认生成手动片段" : "确认开始定长切片",
      confirmText: clipMethod === "manual" ? "生成片段" : "开始切片",
      content: (
        <div className="ai-task-confirmation">
          <p>
            将处理 <strong>{selectedVideos.length}</strong> 个原始视频。
          </p>
          <p>
            生成方式：<strong>{CLIP_GENERATION_MODES[clipMethod]}</strong>
          </p>
          <p className="hint">
            生成结果不包含最终动作标签，后续统一进入清洗和数据标注。
          </p>
        </div>
      ),
      onConfirm: () => {
        const result = store.startVideoSlicing({
          capabilityId: capability.id,
          sourceVideoIds: selectedVideoIds,
          method: clipMethod,
          parameters,
        });
        setSelectedVideoIds([]);
        setFormError("");
        return `视频切片完成，共生成 ${result.clips.length} 个片段`;
      },
    });
  };
  const openResultPreview = (item) =>
    setModal({
      eyebrow: mode === "frames" ? "图片帧预览" : "视频片段预览",
      title:
        mode === "frames"
          ? item.fileName
          : `${formatDerivedTimecode(item.startMs / 1000)} – ${formatDerivedTimecode(item.endMs / 1000)}`,
      size: "large",
      hideCancel: true,
      dismissOnly: true,
      confirmText: "关闭",
      content: (
        <DerivedDataPreview
          item={item}
          sourceVideo={sourceVideoById[item.sourceVideoId]}
          kind={mode}
        />
      ),
    });
  const requestDeleteResults = (targets) => {
    if (targets.some((item) => item.processingStatus === "derived")) {
      setModal({
        title: "生成结果不可删除",
        hideCancel: true,
        dismissOnly: true,
        content: (
          <p>
            所选结果已进入后续数据处理，不能直接删除。请先清理相关后续数据后再操作。
          </p>
        ),
      });
      return;
    }
    setModal({
      title: `删除 ${targets.length} 条生成结果`,
      confirmText: "确认删除",
      content: <p>删除后可以重新从原始视频生成，是否继续？</p>,
      onConfirm: () => {
        store.deleteAiDerivedItems(
          mode,
          targets.map((item) => item.id),
        );
        setSelectedResultIds([]);
        return `已删除 ${targets.length} 条生成结果`;
      },
    });
  };
  const retryTask = (task) =>
    setModal({
      eyebrow: "失败重试",
      title: "重试失败视频",
      confirmText: "开始重试",
      content: (
        <div className="ai-task-confirmation">
          <p>
            仅重试本任务中失败的 {task.failures.length}{" "}
            个视频，已成功结果不会重复生成。
          </p>
          {task.failures.map((failure) => (
            <p className="form-error" key={failure.sourceVideoId}>
              {sourceVideoById[failure.sourceVideoId]?.displayName ||
                failure.sourceVideoId}
              ：{displayBusinessText(failure.reason)}
            </p>
          ))}
        </div>
      ),
      onConfirm: () => {
        const result = store.retryExtractionTask(task.id);
        return `重试完成，生成 ${result.task.generatedCount} 条结果`;
      },
    });
  const selectedVideo = selectedVideos[0];
  const selectedVideoHasFrames = (video) =>
    mode === "frames" && frames.some((item) => item.sourceVideoId === video.id);
  const selectedResults = results.filter((item) =>
    selectedResultIds.includes(item.id),
  );

  return (
    <>
      <PageHeader
        title={
          mode === "frames"
            ? "抽帧"
            : mode === "clips"
              ? "视频切片"
              : "抽帧/切片"
        }
        subtitle={
          mode === "frames"
            ? "从原始视频中提取图片帧，供后续清洗和目标框标注使用。"
            : mode === "clips"
              ? "从原始视频中生成动作识别训练片段，后续再进行清洗和动作标签标注。"
              : "抽帧和视频切片均基于某一个具体AI能力进行。"
        }
        actions={
          capability && (
            <Button
              onClick={() =>
                nav(
                  `${AI_LIBRARY_PATH}/videos?capabilityId=${encodeURIComponent(capability.id)}`,
                )
              }
            >
              返回视频管理
            </Button>
          )
        }
      />
      <section className="panel ai-video-capability-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/extraction?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/extraction`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type] || "未知类型"} ·{" "}
                {item.status}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-video-capability-meta">
            <span>
              <small>能力类型</small>
              <strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              <small>当前模式</small>
              <strong>{mode === "frames" ? "抽帧" : "视频切片"}</strong>
            </span>
          </div>
        )}
      </section>
      {!capability ? (
        <section className="panel empty-state ai-library-empty ai-entry-table">
          <ScissorOutlined />
          <h2>请先选择AI能力</h2>
          <p>抽帧和视频切片均基于某一个具体AI能力进行。</p>
        </section>
      ) : !videos.length ? (
        <section className="panel empty-state ai-library-empty ai-entry-table">
          <VideoCameraOutlined />
          <h2>暂无可处理视频</h2>
          <p>请先前往“视频管理”上传原始视频。</p>
          <Button
            type="primary"
            onClick={() =>
              nav(
                `${AI_LIBRARY_PATH}/videos?capabilityId=${encodeURIComponent(capability.id)}`,
              )
            }
          >
            去视频管理
          </Button>
        </section>
      ) : (
        <>
          <div className="ai-video-stats ai-extraction-stats">
            {[
              ["原始视频", videos.length],
              ["已处理视频", processedVideoCount],
              [mode === "frames" ? "已生成图片" : "已生成片段", results.length],
              ["待清洗", pendingCleaningCount],
            ].map(([label, value]) => (
              <span key={label}>
                <small>{label}</small>
                <strong>{displayBusinessText(value)}</strong>
              </span>
            ))}
          </div>
          <div className="ai-extraction-workspace">
            <section className="panel ai-source-selection">
              <PanelTitle
                title="选择原始视频"
                action={
                  <select
                    aria-label="筛选原始视频处理状态"
                    value={sourceStatusFilter}
                    onChange={(event) =>
                      setSourceStatusFilter(event.target.value)
                    }
                  >
                    <option value="">全部视频</option>
                    <option value="unprocessed">待处理视频</option>
                    <option value="derived">已处理视频</option>
                  </select>
                }
              />
              <p className="hint">
                原始视频在本页面只读。如需修改属性或来源，请返回视频管理。
              </p>
              <div className="ai-source-video-list">
                {visibleVideos.map((video) => {
                  const locked = selectedVideoHasFrames(video);
                  return (
                    <label
                      className={`ai-source-video-option ${locked ? "is-locked" : ""}`}
                      key={video.id}
                    >
                      <input
                        type={
                          mode === "clips" && clipMethod === "manual"
                            ? "radio"
                            : "checkbox"
                        }
                        name={
                          mode === "clips" && clipMethod === "manual"
                            ? "manual-source-video"
                            : undefined
                        }
                        checked={selectedVideoIds.includes(video.id)}
                        disabled={locked}
                        onChange={() => toggleVideo(video.id)}
                      />
                      <span>
                        <strong>{video.displayName || video.fileName}</strong>
                        <small>
                          {video.duration} ·{" "}
                          {AI_VIDEO_CATEGORIES[video.dataCategory] || "—"} ·{" "}
                          {video.width && video.height
                            ? `${video.width}×${video.height}`
                            : "分辨率未知"}
                        </small>
                      </span>
                      <Status>
                        {locked
                          ? "已有结果"
                          : AI_VIDEO_PROCESSING_STATUSES[
                              video.processingStatus
                            ]}
                      </Status>
                    </label>
                  );
                })}
              </div>
            </section>
            <section className="panel ai-processing-parameters">
              <PanelTitle title={mode === "frames" ? "抽帧参数" : "切片参数"} />
              {mode === "frames" ? (
                <div className="form-stack">
                  <div
                    className="ai-mode-switch"
                    role="group"
                    aria-label="抽帧方式"
                  >
                    {Object.entries(FRAME_SAMPLING_MODES).map(
                      ([value, label]) => (
                        <button
                          key={value}
                          className={
                            frameParams.samplingMode === value ? "active" : ""
                          }
                          onClick={() =>
                            setFrameParams((current) => ({
                              ...current,
                              samplingMode: value,
                            }))
                          }
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                  <label className="field">
                    {frameParams.samplingMode === "interval"
                      ? "抽帧间隔（秒）"
                      : "抽帧帧率（帧/秒）"}
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={frameParams.sampleValue}
                      onChange={(event) =>
                        setFrameParams((current) => ({
                          ...current,
                          sampleValue: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    抽帧时间范围
                    <select
                      value={
                        selectedVideos.length > 1
                          ? "entire"
                          : frameParams.rangeMode
                      }
                      disabled={selectedVideos.length > 1}
                      onChange={(event) =>
                        setFrameParams((current) => ({
                          ...current,
                          rangeMode: event.target.value,
                        }))
                      }
                    >
                      <option value="entire">整段视频</option>
                      <option value="custom">指定时间范围</option>
                    </select>
                  </label>
                  {selectedVideos.length === 1 &&
                    frameParams.rangeMode === "custom" && (
                      <div className="form-row">
                        <label className="field">
                          开始时间
                          <input
                            value={frameParams.startTime}
                            onChange={(event) =>
                              setFrameParams((current) => ({
                                ...current,
                                startTime: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="field">
                          结束时间
                          <input
                            value={frameParams.endTime}
                            onChange={(event) =>
                              setFrameParams((current) => ({
                                ...current,
                                endTime: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                  {selectedVideos.length > 1 && (
                    <p className="hint">批量抽帧统一使用每个视频的完整时长。</p>
                  )}
                  <div className="form-row">
                    <label className="field">
                      单个视频最大抽帧数量
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={frameParams.maxFrames}
                        onChange={(event) =>
                          setFrameParams((current) => ({
                            ...current,
                            maxFrames: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      输出分辨率
                      <select value="original" disabled>
                        <option value="original">保持原始分辨率</option>
                      </select>
                    </label>
                  </div>
                  {frameEstimate && (
                    <div className="ai-processing-estimate">
                      <span>
                        已选择 <strong>{selectedVideos.length}</strong> 个视频
                      </span>
                      <span>
                        总时长{" "}
                        <strong>
                          {formatDerivedTimecode(frameEstimate.totalDuration)}
                        </strong>
                      </span>
                      <span>
                        预计生成{" "}
                        <strong>约 {frameEstimate.estimatedCount} 张</strong>
                      </span>
                      {!!frameEstimate.reachedLimitCount && (
                        <p>
                          有 {frameEstimate.reachedLimitCount}{" "}
                          个视频将达到抽帧上限。
                        </p>
                      )}
                    </div>
                  )}
                  {frameEstimateError && (
                    <p className="form-error">{frameEstimateError}</p>
                  )}
                  <Button type="primary" onClick={openFrameTask}>
                    开始抽帧
                  </Button>
                </div>
              ) : (
                <div className="form-stack">
                  <div
                    className="ai-mode-switch"
                    role="group"
                    aria-label="视频切片方式"
                  >
                    {Object.entries(CLIP_GENERATION_MODES).map(
                      ([value, label]) => (
                        <button
                          key={value}
                          className={clipMethod === value ? "active" : ""}
                          onClick={() => setClipMethod(value)}
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                  {clipMethod === "manual" ? (
                    <>
                      <div className="ai-clip-player">
                        {selectedVideo?.storageRef ? (
                          <video
                            ref={videoRef}
                            controls
                            preload="metadata"
                            src={selectedVideo.storageRef}
                          />
                        ) : (
                          <div>
                            <PlayCircleFilled />
                            <span>
                              {selectedVideo
                                ? "演示数据未保存原始视频内容"
                                : "选择一个视频后设置动作起止时间"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="form-row">
                        <label className="field">
                          开始时间
                          <input
                            value={clipParams.startTime}
                            onChange={(event) =>
                              setClipParams((current) => ({
                                ...current,
                                startTime: event.target.value,
                              }))
                            }
                          />
                          <button
                            className="field-inline-action"
                            onClick={() =>
                              setClipParams((current) => ({
                                ...current,
                                startTime: formatDerivedTimecode(
                                  videoRef.current?.currentTime || 0,
                                  true,
                                ),
                              }))
                            }
                          >
                            设为当前时间
                          </button>
                        </label>
                        <label className="field">
                          结束时间
                          <input
                            value={clipParams.endTime}
                            onChange={(event) =>
                              setClipParams((current) => ({
                                ...current,
                                endTime: event.target.value,
                              }))
                            }
                          />
                          <button
                            className="field-inline-action"
                            onClick={() =>
                              setClipParams((current) => ({
                                ...current,
                                endTime: formatDerivedTimecode(
                                  videoRef.current?.currentTime || 0,
                                  true,
                                ),
                              }))
                            }
                          >
                            设为当前时间
                          </button>
                        </label>
                      </div>
                      <label className="field">
                        <FieldLabel>片段说明</FieldLabel>
                        <textarea
                          rows={3}
                          value={clipParams.note}
                          onChange={(event) =>
                            setClipParams((current) => ({
                              ...current,
                              note: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="form-row">
                        <label className="field">
                          片段长度（秒）
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={clipParams.clipLength}
                            onChange={(event) =>
                              setClipParams((current) => ({
                                ...current,
                                clipLength: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="field">
                          滑动步长（秒）
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={clipParams.step}
                            onChange={(event) =>
                              setClipParams((current) => ({
                                ...current,
                                step: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      {selectedVideos.length === 1 ? (
                        <div className="form-row">
                          <label className="field">
                            开始时间
                            <input
                              value={clipParams.startTime}
                              onChange={(event) =>
                                setClipParams((current) => ({
                                  ...current,
                                  startTime: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            结束时间
                            <input
                              value={clipParams.endTime}
                              onChange={(event) =>
                                setClipParams((current) => ({
                                  ...current,
                                  endTime: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                      ) : (
                        <p className="hint">
                          批量切片统一使用每个视频的完整时长，允许片段重叠。
                        </p>
                      )}
                    </>
                  )}
                  <Button type="primary" onClick={openClipTask}>
                    {clipMethod === "manual" ? "生成片段" : "开始切片"}
                  </Button>
                </div>
              )}
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
            </section>
          </div>
          {!!tasks.length && (
            <section className="panel ai-extraction-tasks">
              <PanelTitle title="处理任务" />
              <div className="ai-task-list">
                {pagedExtractionTasks.map((task) => (
                  <article key={task.id}>
                    <div>
                      <strong>
                        {task.taskType === "frame_extraction"
                          ? "抽帧任务"
                          : "视频切片任务"}
                      </strong>
                      <small>
                        {displayBusinessText(task.createdAt)} ·{" "}
                        {task.sourceVideoIds.length} 个视频
                      </small>
                    </div>
                    <Status>
                      {EXTRACTION_TASK_STATUSES[task.status] || task.status}
                    </Status>
                    <span className="ai-extraction-task__progress">
                      {task.progress || 0}%
                    </span>
                    <span className="ai-extraction-task__result">
                      已生成 {task.generatedCount || 0} 条
                    </span>
                    {!!task.failures?.length &&
                      task.retryStatus !== "resolved" && (
                        <button
                          className="table-action"
                          onClick={() => retryTask(task)}
                        >
                          重试失败项
                        </button>
                      )}
                    {!!task.failures?.length &&
                      task.retryStatus === "resolved" && (
                        <Status>已重试</Status>
                      )}
                    {!!task.failures?.length && (
                      <div className="ai-task-failures">
                        {task.failures.map((failure) => (
                          <p key={failure.sourceVideoId}>
                            {sourceVideoById[failure.sourceVideoId]
                              ?.displayName || failure.sourceVideoId}
                            ：{displayBusinessText(failure.reason)}
                          </p>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <TablePagination {...extractionTaskPagination} />
            </section>
          )}
          <section className="panel ai-derived-results">
            <PanelTitle
              title={mode === "frames" ? "生成图片集" : "生成视频片段集"}
            />
            {results.length ? (
              <>
                <div className="ai-derived-flow-note">
                  <strong>
                    {mode === "frames"
                      ? "原始视频 → 图片集"
                      : "原始视频 → 视频片段集"}
                  </strong>
                  <span>
                    {mode === "frames"
                      ? `当前共生成 ${results.length} 张独立图片，后续清洗和目标框标注均以图片为单位。`
                      : `当前共生成 ${results.length} 个独立视频片段，后续清洗和动作标签标注均以片段为单位。`}
                  </span>
                </div>
                <div className="ai-result-filters">
                  <select
                    aria-label="按来源视频筛选"
                    value={resultSourceFilter}
                    onChange={(event) =>
                      setResultSourceFilter(event.target.value)
                    }
                  >
                    <option value="">全部来源视频</option>
                    {videos.map((video) => (
                      <option key={video.id} value={video.id}>
                        {video.displayName || video.fileName}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="按生成任务筛选"
                    value={resultTaskFilter}
                    onChange={(event) =>
                      setResultTaskFilter(event.target.value)
                    }
                  >
                    <option value="">全部生成任务</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.id}
                      </option>
                    ))}
                  </select>
                  {mode === "clips" && (
                    <select
                      aria-label="按生成方式筛选"
                      value={methodFilter}
                      onChange={(event) => setMethodFilter(event.target.value)}
                    >
                      <option value="">全部生成方式</option>
                      {Object.entries(CLIP_GENERATION_MODES).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  )}
                  <select
                    aria-label="按后续状态筛选"
                    value={resultStatusFilter}
                    onChange={(event) =>
                      setResultStatusFilter(event.target.value)
                    }
                  >
                    <option value="">全部状态</option>
                    {Object.entries(DERIVED_DATA_STATUSES).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                  {!!selectedResultIds.length && (
                    <Button
                      onClick={() => requestDeleteResults(selectedResults)}
                    >
                      删除所选（{selectedResultIds.length}）
                    </Button>
                  )}
                </div>
                {mode === "frames" ? (
                  <div className="ai-frame-grid">
                    {pagedResults.map((frame) => (
                      <article key={frame.id}>
                        <div className="ai-frame-card__header">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedResultIds.includes(frame.id)}
                              onChange={() =>
                                setSelectedResultIds((current) =>
                                  current.includes(frame.id)
                                    ? current.filter((id) => id !== frame.id)
                                    : [...current, frame.id],
                                )
                              }
                            />
                            选择
                          </label>
                          <button
                            className="ai-frame-card__delete"
                            type="button"
                            aria-label={`删除图片帧 ${formatDerivedTimecode(frame.sourceTimeMs / 1000, true)}`}
                            title="删除"
                            onClick={() => requestDeleteResults([frame])}
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                        <button
                          className="ai-frame-thumbnail"
                          onClick={() => openResultPreview(frame)}
                        >
                          <img
                            src={frameImageUrl(frame)}
                            alt={`${sourceVideoById[frame.sourceVideoId]?.displayName || "原始视频"}抽取的图片帧`}
                          />
                          <span>
                            {formatDerivedTimecode(
                              frame.sourceTimeMs / 1000,
                              true,
                            )}
                          </span>
                        </button>
                        <strong>
                          {sourceVideoById[frame.sourceVideoId]?.displayName ||
                            "原始视频不存在"}
                        </strong>
                        <small>
                          源视频时间点：
                          {formatDerivedTimecode(
                            frame.sourceTimeMs / 1000,
                            true,
                          )}
                        </small>
                        <div>
                          <Status>
                            {DERIVED_DATA_STATUSES[frame.processingStatus]}
                          </Status>
                          <Status
                            tone={
                              frame.cleaningStatus === "auto_cleaned"
                                ? "success"
                                : "muted"
                            }
                          >
                            {frame.cleaningStatus === "auto_cleaned"
                              ? "已自动清洗"
                              : "未清洗"}
                          </Status>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>选择</th>
                          <th>来源视频</th>
                          <th>开始时间</th>
                          <th>结束时间</th>
                          <th>时长</th>
                          <th>生成方式</th>
                          <th>当前状态</th>
                          <th>清洗状态</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedResults.map((clip) => (
                          <tr key={clip.id}>
                            <td>
                              <input
                                aria-label={`选择片段 ${clip.id}`}
                                type="checkbox"
                                checked={selectedResultIds.includes(clip.id)}
                                onChange={() =>
                                  setSelectedResultIds((current) =>
                                    current.includes(clip.id)
                                      ? current.filter((id) => id !== clip.id)
                                      : [...current, clip.id],
                                  )
                                }
                              />
                            </td>
                            <td>
                              {sourceVideoById[clip.sourceVideoId]
                                ?.displayName || "原始视频不存在"}
                            </td>
                            <td>
                              {formatDerivedTimecode(clip.startMs / 1000)}
                            </td>
                            <td>{formatDerivedTimecode(clip.endMs / 1000)}</td>
                            <td>
                              {formatDerivedTimecode(clip.durationMs / 1000)}
                            </td>
                            <td>
                              {CLIP_GENERATION_MODES[clip.generationMethod]}
                            </td>
                            <td>
                              <Status>
                                {DERIVED_DATA_STATUSES[clip.processingStatus]}
                              </Status>
                            </td>
                            <td>
                              <Status
                                tone={
                                  clip.cleaningStatus === "auto_cleaned"
                                    ? "success"
                                    : "muted"
                                }
                              >
                                {clip.cleaningStatus === "auto_cleaned"
                                  ? "已自动清洗"
                                  : "未清洗"}
                              </Status>
                            </td>
                            <td>
                              <div className="ai-capability-row-actions">
                                <button
                                  className="table-action"
                                  onClick={() => openResultPreview(clip)}
                                >
                                  播放片段
                                </button>
                                <button
                                  className="table-action"
                                  onClick={() => requestDeleteResults([clip])}
                                >
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!visibleResults.length && (
                  <p className="table-empty">没有符合筛选条件的生成结果</p>
                )}
                <TablePagination {...resultPagination} />
              </>
            ) : (
              <div className="empty-state ai-derived-empty">
                <ScissorOutlined />
                <h2>
                  {mode === "frames" ? "尚未生成图片帧" : "尚未生成视频片段"}
                </h2>
                <p>
                  {mode === "frames"
                    ? "选择原始视频并配置抽帧参数后开始抽帧。"
                    : "选择原始视频后，可手动或定长生成训练片段。"}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function cloneCleaningRules(rules) {
  return JSON.parse(JSON.stringify(rules));
}

function CleaningRuleToggle({ title, description, value, onChange, children }) {
  return (
    <article
      className={`ai-cleaning-rule ${value.enabled ? "is-enabled" : ""}`}
    >
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <label className="ai-cleaning-toggle">
        <input
          type="checkbox"
          checked={!!value.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
        <span>{value.enabled ? "已开启" : "已关闭"}</span>
      </label>
      {value.enabled && children}
    </article>
  );
}

function CleaningSensitivity({ value, onChange, ariaLabel }) {
  return (
    <label className="ai-cleaning-rule-option">
      敏感度
      <select
        aria-label={ariaLabel}
        value={value || "standard"}
        onChange={(event) => onChange({ sensitivity: event.target.value })}
      >
        {Object.entries(CLEANING_SENSITIVITIES).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AiAutoCleaningPage({ setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const store = usePrototypeData();
  const selectedId =
    new URLSearchParams(location.search).get("capabilityId") || "";
  const capabilities = Array.isArray(store.data.aiCapabilities)
    ? store.data.aiCapabilities
    : [];
  const capability = capabilities.find((item) => item.id === selectedId);
  const mode = capability ? extractionModeForCapability(capability.type) : "";
  const [imageRules, setImageRules] = useState(() =>
    cloneCleaningRules(DEFAULT_IMAGE_CLEANING_RULES),
  );
  const [clipRules, setClipRules] = useState(() =>
    cloneCleaningRules(DEFAULT_CLIP_CLEANING_RULES),
  );
  const [resultFilter, setResultFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageError, setPageError] = useState("");
  useEffect(() => {
    setResultFilter("");
    setReasonFilter("");
    setSourceFilter("");
    setTaskFilter("");
    setSelectedIds([]);
    setPageError("");
  }, [selectedId]);
  const rules = mode === "frames" ? imageRules : clipRules;
  const setRules = mode === "frames" ? setImageRules : setClipRules;
  const updateRule = (name, patch) =>
    setRules((current) => ({
      ...current,
      [name]: { ...current[name], ...patch },
    }));
  const items = !capability
    ? []
    : mode === "frames"
      ? (store.data.aiFrames || []).filter(
          (item) => item.capabilityId === capability.id,
        )
      : (store.data.aiClips || []).filter(
          (item) => item.capabilityId === capability.id,
        );
  const tasks = !capability
    ? []
    : (store.data.aiCleaningTasks || []).filter(
        (item) => item.capabilityId === capability.id,
      );
  const videos = !capability
    ? []
    : (store.data.aiSourceVideos || []).filter(
        (item) => item.capabilityId === capability.id,
      );
  const sourceById = Object.fromEntries(
    videos.map((video) => [video.id, video]),
  );
  const summary = summarizeCleaning(items);
  const reasonEntries = Object.entries(CLEANING_REASONS).filter(([reason]) =>
    mode === "frames"
      ? !["severe_blur", "too_short"].includes(reason)
      : reason !== "blur" && reason !== "low_resolution",
  );
  const visibleItems = items.filter((item) => {
    const resultMatches =
      !resultFilter ||
      (resultFilter === "uncleaned"
        ? item.cleaningStatus !== "auto_cleaned"
        : resultFilter === "manual_keep"
          ? item.manualOverride === "keep"
          : item.autoCleaningResult === resultFilter);
    return (
      resultMatches &&
      (!reasonFilter || (item.cleaningReasons || []).includes(reasonFilter)) &&
      (!sourceFilter || item.sourceVideoId === sourceFilter) &&
      (!taskFilter || item.lastCleaningTaskId === taskFilter)
    );
  });
  const {
    pageItems: pagedCleaningTasks,
    paginationProps: cleaningTaskPagination,
  } = useListPagination(tasks);
  const {
    pageItems: pagedCleaningItems,
    paginationProps: cleaningResultPagination,
  } = useListPagination(visibleItems);
  const activeRuleLabels =
    mode === "frames"
      ? [
          rules.blur.enabled &&
            `模糊检测：${CLEANING_SENSITIVITIES[rules.blur.sensitivity]}`,
          rules.blackScreen.enabled && "黑屏检测：开启",
          rules.darkness.enabled &&
            `过暗检测：${CLEANING_SENSITIVITIES[rules.darkness.sensitivity]}`,
          rules.overexposure.enabled &&
            `过曝检测：${CLEANING_SENSITIVITIES[rules.overexposure.sensitivity]}`,
          rules.similarity.enabled && "同源高度相似检测：开启",
          rules.resolution.enabled &&
            `最低分辨率：${rules.resolution.minWidth}×${rules.resolution.minHeight}`,
          rules.corruption.enabled && "文件损坏检测：开启",
        ].filter(Boolean)
      : [
          rules.corruption.enabled && "文件损坏检测：开启",
          rules.blackScreen.enabled && "黑屏检测：开启",
          rules.blur.enabled &&
            `严重模糊检测：${CLEANING_SENSITIVITIES[rules.blur.sensitivity]}`,
          rules.darkness.enabled &&
            `过暗检测：${CLEANING_SENSITIVITIES[rules.darkness.sensitivity]}`,
          rules.overexposure.enabled &&
            `过曝检测：${CLEANING_SENSITIVITIES[rules.overexposure.sensitivity]}`,
          rules.duration.enabled &&
            `片段时长：不少于 ${rules.duration.minSeconds} 秒，建议不超过 ${rules.duration.maxSeconds} 秒`,
          rules.similarity.enabled && "同源高度重复检测：开启",
        ].filter(Boolean);
  const startCleaning = () => {
    setPageError("");
    setModal({
      eyebrow: "自动清洗任务",
      title: tasks.length ? "确认重新执行自动清洗" : "确认开始自动清洗",
      confirmText: tasks.length ? "重新执行" : "开始自动清洗",
      content: (
        <div className="ai-cleaning-confirmation">
          <p>
            本次将处理 <strong>{items.length}</strong> 条
            {mode === "frames" ? "图片帧" : "视频片段"}。
          </p>
          <div>
            {activeRuleLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <p className="hint">
            自动剔除只改变清洗结果，不删除文件；人工恢复记录会受到保护。
          </p>
        </div>
      ),
      onConfirm: () => {
        const result = store.runAutoCleaning({
          capabilityId: capability.id,
          rules: cloneCleaningRules(rules),
        });
        setSelectedIds([]);
        return `自动清洗完成：建议保留 ${result.task.keepCount} 条，自动剔除 ${result.task.rejectCount} 条`;
      },
    });
  };
  const requestRestore = (ids) => {
    setPageError("");
    setModal({
      eyebrow: "人工恢复",
      title:
        ids.length > 1 ? `恢复所选 ${ids.length} 条数据` : "恢复为建议保留",
      confirmText: "确认恢复",
      content: (
        <div className="ai-cleaning-confirmation">
          <p>
            恢复后，该数据将标记为<strong>人工恢复</strong>并按“建议保留”展示。
          </p>
          <p className="hint">
            再次自动清洗仍会更新风险原因，但不会静默覆盖本次人工恢复。
          </p>
        </div>
      ),
      onConfirm: () => {
        store.restoreAutoCleaningItems({ capabilityId: capability.id, ids });
        setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
        return `已恢复 ${ids.length} 条数据`;
      },
    });
  };
  const openPreview = (item) =>
    setModal({
      eyebrow: mode === "frames" ? "图片清洗详情" : "片段清洗详情",
      title:
        mode === "frames"
          ? item.fileName
          : `${formatDerivedTimecode(item.startMs / 1000)} – ${formatDerivedTimecode(item.endMs / 1000)}`,
      size: "large",
      hideConfirm: true,
      content: (
        <>
          <DerivedDataPreview
            item={item}
            sourceVideo={sourceById[item.sourceVideoId]}
            kind={mode}
          />
          <div className="ai-derived-metadata">
            <div>
              <span>来源视频</span>
              <strong>
                {sourceById[item.sourceVideoId]?.displayName ||
                  "原始视频不存在"}
              </strong>
            </div>
            <div>
              <span>清洗结果</span>
              <strong>
                {item.cleaningStatus === "auto_cleaned"
                  ? AUTO_CLEANING_RESULTS[item.autoCleaningResult]
                  : "未清洗"}
              </strong>
            </div>
            <div>
              <span>命中原因</span>
              <strong>
                {(item.cleaningReasons || [])
                  .map((reason) => CLEANING_REASONS[reason])
                  .join("、") || "无"}
              </strong>
            </div>
            <div>
              <span>最近任务</span>
              <strong>{item.lastCleaningTaskId || "尚未清洗"}</strong>
            </div>
          </div>
        </>
      ),
    });
  return (
    <>
      <PageHeader
        title="自动清洗"
        subtitle="对抽帧图片或视频片段执行可解释的基础质量筛选，不删除任何派生数据。"
      />
      <section className="panel ai-capability-context ai-cleaning-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/auto-cleaning?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/auto-cleaning`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type] || item.type}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-cleaning-context-summary">
            <span>
              能力类型<strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              处理对象
              <strong>{mode === "frames" ? "抽帧图片" : "视频片段"}</strong>
            </span>
            <span>
              当前流程
              <strong>
                {mode === "frames" ? "图片质量筛选" : "片段质量筛选"}
              </strong>
            </span>
          </div>
        )}
      </section>
      {!selectedId ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <DatabaseOutlined />
            <h2>请先选择AI能力</h2>
            <p>自动清洗按AI能力独立处理，不会跨能力混合数据。</p>
          </div>
        </section>
      ) : !capability ? (
        <section className="panel">
          <div className="empty-state">
            <ExclamationCircleFilled />
            <h2>所选AI能力不存在</h2>
            <p>请重新选择有效的AI能力。</p>
          </div>
        </section>
      ) : !items.length ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <ScissorOutlined />
            <h2>暂无可清洗数据</h2>
            <p>
              请先前往“抽帧/切片”生成{mode === "frames" ? "图片帧" : "视频片段"}
              。
            </p>
            <Button
              type="primary"
              onClick={() =>
                nav(
                  `${AI_LIBRARY_PATH}/extraction?capabilityId=${encodeURIComponent(capability.id)}`,
                )
              }
            >
              去抽帧/切片
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="ai-cleaning-stats" aria-label="待清洗数据统计">
            <article>
              <span>{mode === "frames" ? "总图片" : "总片段"}</span>
              <strong>{summary.total}</strong>
              <small>当前能力全部派生数据</small>
            </article>
            <article>
              <span>未清洗</span>
              <strong>{summary.uncleaned}</strong>
              <small>等待自动质量检测</small>
            </article>
            <article className="is-keep">
              <span>建议保留</span>
              <strong>{summary.keep}</strong>
              <small>含人工恢复数据</small>
            </article>
            <article className="is-reject">
              <span>自动剔除</span>
              <strong>{summary.rejected}</strong>
              <small>文件与记录仍保留</small>
            </article>
            <article>
              <span>人工恢复</span>
              <strong>{summary.restored}</strong>
              <small>再次清洗不会覆盖</small>
            </article>
          </section>
          <section className="panel ai-cleaning-rules-panel">
            <PanelTitle
              title="清洗规则配置"
              action={
                <Button type="primary" onClick={startCleaning}>
                  {tasks.length ? (
                    <>
                      <ReloadOutlined />
                      重新执行自动清洗
                    </>
                  ) : (
                    "开始自动清洗"
                  )}
                </Button>
              }
            />
            <p className="hint">
              仅检测数据质量，不判断动作是否正确，也不生成业务标签。
            </p>
            <div className="ai-cleaning-rule-grid">
              {mode === "frames" ? (
                <>
                  <CleaningRuleToggle
                    title="模糊检测"
                    description="识别无法清晰标注目标的失焦或运动模糊画面。"
                    value={rules.blur}
                    onChange={(patch) => updateRule("blur", patch)}
                  >
                    <CleaningSensitivity
                      ariaLabel="模糊检测敏感度"
                      value={rules.blur.sensitivity}
                      onChange={(patch) => updateRule("blur", patch)}
                    />
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="黑屏检测"
                    description="识别全黑、近黑或没有有效画面的图片。"
                    value={rules.blackScreen}
                    onChange={(patch) => updateRule("blackScreen", patch)}
                  />
                  <CleaningRuleToggle
                    title="过暗检测"
                    description="识别整体亮度过低、目标细节难以辨认的图片。"
                    value={rules.darkness}
                    onChange={(patch) => updateRule("darkness", patch)}
                  >
                    <CleaningSensitivity
                      ariaLabel="过暗检测敏感度"
                      value={rules.darkness.sensitivity}
                      onChange={(patch) => updateRule("darkness", patch)}
                    />
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="过曝检测"
                    description="识别大面积高亮、细节严重丢失的图片。"
                    value={rules.overexposure}
                    onChange={(patch) => updateRule("overexposure", patch)}
                  >
                    <CleaningSensitivity
                      ariaLabel="过曝检测敏感度"
                      value={rules.overexposure.sensitivity}
                      onChange={(patch) => updateRule("overexposure", patch)}
                    />
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="高度相似检测"
                    description="仅在同一个原始视频的图片之间识别连续重复画面。"
                    value={rules.similarity}
                    onChange={(patch) => updateRule("similarity", patch)}
                  />
                  <CleaningRuleToggle
                    title="分辨率异常检测"
                    description="识别低于当前最低要求的图片。"
                    value={rules.resolution}
                    onChange={(patch) => updateRule("resolution", patch)}
                  >
                    <div className="ai-cleaning-size-inputs">
                      <label>
                        最低宽度
                        <input
                          aria-label="最低宽度"
                          type="number"
                          min="1"
                          value={rules.resolution.minWidth}
                          onChange={(event) =>
                            updateRule("resolution", {
                              minWidth: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        最低高度
                        <input
                          aria-label="最低高度"
                          type="number"
                          min="1"
                          value={rules.resolution.minHeight}
                          onChange={(event) =>
                            updateRule("resolution", {
                              minHeight: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="文件损坏检测"
                    description="识别空文件、无法读取或解码失败的图片。"
                    value={rules.corruption}
                    onChange={(patch) => updateRule("corruption", patch)}
                  />
                </>
              ) : (
                <>
                  <CleaningRuleToggle
                    title="文件损坏检测"
                    description="识别无法读取、为空或解码失败的视频片段。"
                    value={rules.corruption}
                    onChange={(patch) => updateRule("corruption", patch)}
                  />
                  <CleaningRuleToggle
                    title="黑屏检测"
                    description="识别大比例采样画面为黑屏的片段。"
                    value={rules.blackScreen}
                    onChange={(patch) => updateRule("blackScreen", patch)}
                  />
                  <CleaningRuleToggle
                    title="严重模糊检测"
                    description="识别大比例采样画面严重模糊的片段。"
                    value={rules.blur}
                    onChange={(patch) => updateRule("blur", patch)}
                  >
                    <CleaningSensitivity
                      ariaLabel="严重模糊检测敏感度"
                      value={rules.blur.sensitivity}
                      onChange={(patch) => updateRule("blur", patch)}
                    />
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="过暗检测"
                    description="识别大比例采样画面无法辨认的过暗片段。"
                    value={rules.darkness}
                    onChange={(patch) => updateRule("darkness", patch)}
                  >
                    <CleaningSensitivity
                      ariaLabel="片段过暗检测敏感度"
                      value={rules.darkness.sensitivity}
                      onChange={(patch) => updateRule("darkness", patch)}
                    />
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="过曝检测"
                    description="识别大比例采样画面细节丢失的过曝片段。"
                    value={rules.overexposure}
                    onChange={(patch) => updateRule("overexposure", patch)}
                  >
                    <CleaningSensitivity
                      ariaLabel="片段过曝检测敏感度"
                      value={rules.overexposure.sensitivity}
                      onChange={(patch) => updateRule("overexposure", patch)}
                    />
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="片段时长检测"
                    description="过短片段自动剔除；超过建议时长只显示提示。"
                    value={rules.duration}
                    onChange={(patch) => updateRule("duration", patch)}
                  >
                    <div className="ai-cleaning-size-inputs">
                      <label>
                        最短时长（秒）
                        <input
                          aria-label="最短片段时长"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={rules.duration.minSeconds}
                          onChange={(event) =>
                            updateRule("duration", {
                              minSeconds: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        建议最长（秒）
                        <input
                          aria-label="建议最长片段时长"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={rules.duration.maxSeconds}
                          onChange={(event) =>
                            updateRule("duration", {
                              maxSeconds: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </CleaningRuleToggle>
                  <CleaningRuleToggle
                    title="高度重复检测"
                    description="仅在同一个原始视频的片段之间识别高度重叠内容。"
                    value={rules.similarity}
                    onChange={(patch) => updateRule("similarity", patch)}
                  />
                </>
              )}
            </div>
          </section>
          {!!tasks.length && (
            <section className="panel ai-cleaning-tasks">
              <PanelTitle title="清洗任务" />
              <div className="ai-task-list">
                {pagedCleaningTasks.map((task) => (
                  <article className="ai-cleaning-task" key={task.id}>
                    <div>
                      <strong>自动清洗任务</strong>
                      <small>
                        {displayBusinessText(task.createdAt)} ·{" "}
                        {task.dataType === "frame" ? "图片" : "片段"}
                      </small>
                    </div>
                    <Status tone="success">
                      {AUTO_CLEANING_TASK_STATUSES[task.status] || task.status}
                    </Status>
                    <span className="ai-cleaning-task__progress">
                      {task.processedCount}/{task.totalCount}
                    </span>
                    <span className="ai-cleaning-task__summary">
                      保留 {task.keepCount} · 剔除 {task.rejectCount} · 失败{" "}
                      {task.failedCount}
                    </span>
                  </article>
                ))}
              </div>
              <TablePagination {...cleaningTaskPagination} />
            </section>
          )}
          <section className="panel ai-cleaning-results">
            <PanelTitle title="清洗结果" />
            {summary.uncleaned === 0 && (
              <div className="ai-cleaning-complete">
                <CheckCircleFilled />
                <div>
                  <strong>自动清洗已完成</strong>
                  <p>可查看自动剔除原因，或前往人工清洗进行最终确认。</p>
                </div>
                <Button
                  onClick={() =>
                    nav(
                      `${AI_LIBRARY_PATH}/manual-cleaning?capabilityId=${encodeURIComponent(capability.id)}`,
                    )
                  }
                >
                  前往人工清洗
                </Button>
              </div>
            )}
            <div className="ai-cleaning-result-summary">
              <span>
                <strong>{summary.total}</strong> 条数据
              </span>
              <span className="is-keep">
                <strong>{summary.keep}</strong> 建议保留
              </span>
              <span className="is-reject">
                <strong>{summary.rejected}</strong> 自动剔除
              </span>
              {Object.entries(summary.reasonCounts).map(([reason, count]) => (
                <span key={reason}>
                  {CLEANING_REASONS[reason] || reason} {count}
                </span>
              ))}
            </div>
            <p className="hint">
              一条数据可同时命中多个原因，因此原因数量之和可能大于自动剔除总数。
            </p>
            <div className="ai-result-filters">
              <select
                aria-label="按清洗结果筛选"
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value)}
              >
                <option value="">全部清洗结果</option>
                <option value="uncleaned">未清洗</option>
                <option value="keep">建议保留</option>
                <option value="auto_reject">自动剔除</option>
                <option value="manual_keep">人工恢复</option>
              </select>
              <select
                aria-label="按清洗原因筛选"
                value={reasonFilter}
                onChange={(event) => setReasonFilter(event.target.value)}
              >
                <option value="">全部清洗原因</option>
                {reasonEntries.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="按来源视频筛选"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="">全部来源视频</option>
                {videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.displayName || video.fileName}
                  </option>
                ))}
              </select>
              <select
                aria-label="按清洗任务筛选"
                value={taskFilter}
                onChange={(event) => setTaskFilter(event.target.value)}
              >
                <option value="">全部清洗任务</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.id}
                  </option>
                ))}
              </select>
              {!!selectedIds.length && (
                <Button onClick={() => requestRestore(selectedIds)}>
                  批量恢复（{selectedIds.length}）
                </Button>
              )}
            </div>
            {pageError && (
              <p className="form-error" role="alert">
                {pageError}
              </p>
            )}
            {mode === "frames" ? (
              <div className="ai-cleaning-frame-grid">
                {pagedCleaningItems.map((item) => {
                  const rejected = item.autoCleaningResult === "auto_reject";
                  return (
                    <article
                      key={item.id}
                      className={rejected ? "is-rejected" : ""}
                    >
                      <div className="ai-cleaning-card__header">
                        <label>
                          <input
                            type="checkbox"
                            aria-label={`选择清洗结果 ${item.id}`}
                            disabled={!rejected}
                            checked={selectedIds.includes(item.id)}
                            onChange={() =>
                              setSelectedIds((current) =>
                                current.includes(item.id)
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
                          />
                          选择恢复
                        </label>
                        {rejected && (
                          <button
                            className="ai-cleaning-card__restore"
                            type="button"
                            aria-label={`恢复清洗图片 ${formatDerivedTimecode(item.sourceTimeMs / 1000, true)}`}
                            title="恢复"
                            onClick={() => requestRestore([item.id])}
                          >
                            <ReloadOutlined />
                          </button>
                        )}
                      </div>
                      <button
                        className="ai-frame-thumbnail"
                        onClick={() => openPreview(item)}
                      >
                        <img
                          src={frameImageUrl(item)}
                          alt={`${sourceById[item.sourceVideoId]?.displayName || "原始视频"}的清洗图片`}
                        />
                        <span>
                          {formatDerivedTimecode(
                            item.sourceTimeMs / 1000,
                            true,
                          )}
                        </span>
                      </button>
                      <strong>
                        {sourceById[item.sourceVideoId]?.displayName ||
                          "原始视频不存在"}
                      </strong>
                      <small>
                        源视频时间点：
                        {formatDerivedTimecode(item.sourceTimeMs / 1000, true)}
                      </small>
                      <div className="ai-cleaning-item-status">
                        <Status
                          tone={
                            rejected
                              ? "danger"
                              : item.cleaningStatus === "auto_cleaned"
                                ? "success"
                                : "muted"
                          }
                        >
                          {item.cleaningStatus === "auto_cleaned"
                            ? AUTO_CLEANING_RESULTS[item.autoCleaningResult]
                            : "未清洗"}
                        </Status>
                        {item.manualOverride === "keep" && (
                          <Status tone="warning">人工恢复</Status>
                        )}
                      </div>
                      <div className="ai-cleaning-reasons">
                        {(item.cleaningReasons || []).map((reason) => (
                          <span key={reason}>{CLEANING_REASONS[reason]}</span>
                        ))}
                        {!(item.cleaningReasons || []).length &&
                          item.cleaningStatus === "auto_cleaned" && (
                            <span className="is-clear">未命中风险规则</span>
                          )}
                      </div>
                      {item.manualOverride === "keep" &&
                        item.autoCleaningRecommendation === "auto_reject" && (
                          <p className="ai-cleaning-override-note">
                            仍命中规则，已按人工恢复保护
                          </p>
                        )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>选择</th>
                      <th>视频片段</th>
                      <th>来源视频</th>
                      <th>时间范围</th>
                      <th>清洗结果</th>
                      <th>原因/提示</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCleaningItems.map((item) => {
                      const rejected =
                        item.autoCleaningResult === "auto_reject";
                      return (
                        <tr key={item.id}>
                          <td>
                            <input
                              aria-label={`选择清洗结果 ${item.id}`}
                              type="checkbox"
                              disabled={!rejected}
                              checked={selectedIds.includes(item.id)}
                              onChange={() =>
                                setSelectedIds((current) =>
                                  current.includes(item.id)
                                    ? current.filter((id) => id !== item.id)
                                    : [...current, item.id],
                                )
                              }
                            />
                          </td>
                          <td>{item.id}</td>
                          <td>
                            {sourceById[item.sourceVideoId]?.displayName ||
                              "原始视频不存在"}
                          </td>
                          <td>
                            {formatDerivedTimecode(item.startMs / 1000)} –{" "}
                            {formatDerivedTimecode(item.endMs / 1000)}
                          </td>
                          <td>
                            <div className="ai-cleaning-item-status">
                              <Status
                                tone={
                                  rejected
                                    ? "danger"
                                    : item.cleaningStatus === "auto_cleaned"
                                      ? "success"
                                      : "muted"
                                }
                              >
                                {item.cleaningStatus === "auto_cleaned"
                                  ? AUTO_CLEANING_RESULTS[
                                      item.autoCleaningResult
                                    ]
                                  : "未清洗"}
                              </Status>
                              {item.manualOverride === "keep" && (
                                <Status tone="warning">人工恢复</Status>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="ai-cleaning-reasons">
                              {(item.cleaningReasons || []).map((reason) => (
                                <span key={reason}>
                                  {CLEANING_REASONS[reason]}
                                </span>
                              ))}
                              {(item.cleaningWarnings || []).map((warning) => (
                                <span className="is-warning" key={warning}>
                                  {CLEANING_WARNINGS[warning]}
                                </span>
                              ))}
                              {!(item.cleaningReasons || []).length &&
                                !(item.cleaningWarnings || []).length &&
                                item.cleaningStatus === "auto_cleaned" && (
                                  <span className="is-clear">
                                    未命中风险规则
                                  </span>
                                )}
                            </div>
                            {item.manualOverride === "keep" &&
                              item.autoCleaningRecommendation ===
                                "auto_reject" && (
                                <small className="ai-cleaning-override-note">
                                  仍命中规则，已按人工恢复保护
                                </small>
                              )}
                          </td>
                          <td>
                            <div className="ai-capability-row-actions">
                              <button
                                className="table-action"
                                onClick={() => openPreview(item)}
                              >
                                播放
                              </button>
                              {rejected && (
                                <button
                                  className="table-action"
                                  onClick={() => requestRestore([item.id])}
                                >
                                  恢复
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!visibleItems.length && (
              <p className="table-empty">没有符合当前筛选条件的数据</p>
            )}
            <TablePagination {...cleaningResultPagination} />
          </section>
        </>
      )}
    </>
  );
}

const ManualRejectForm = forwardRef(function ManualRejectForm(_, ref) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  useImperativeHandle(ref, () => ({
    getValue() {
      if (!reason) throw new Error("人工剔除必须选择原因。");
      if (reason === "other" && !note.trim())
        throw new Error("选择“其他”时必须填写原因说明。");
      return { rejectionReason: reason, rejectionNote: note.trim() };
    },
  }));
  return (
    <div className="form-stack">
      <p className="hint">剔除只改变最终清洗结果，不删除图片或视频片段。</p>
      <label className="field">
        剔除原因
        <select
          aria-label="人工剔除原因"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="">请选择剔除原因</option>
          {Object.entries(MANUAL_REJECTION_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {reason === "other" && (
        <label className="field">
          原因说明
          <textarea
            aria-label="其他剔除原因说明"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="请说明该数据不适合继续使用的原因"
          />
        </label>
      )}
    </div>
  );
});

function manualAutoResult(item) {
  return item.autoCleaningRecommendation || item.autoCleaningResult;
}

function ManualCleaningPreview({
  items,
  initialId,
  mode,
  sourceById,
  onDecision,
}) {
  const initialIndex = Math.max(
    0,
    items.findIndex((item) => item.id === initialId),
  );
  const [index, setIndex] = useState(initialIndex);
  const [localStatuses, setLocalStatuses] = useState({});
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const current = items[index];
  if (!current) return <p className="table-empty">当前数据不存在或已失效</p>;
  const manualStatus =
    localStatuses[current.id] || current.manualCleaningStatus || "pending";
  const move = (nextIndex) => {
    setIndex(nextIndex);
    setReason("");
    setNote("");
    setError("");
  };
  const decide = (decision) => {
    try {
      onDecision(
        [current.id],
        decision,
        decision === "rejected"
          ? { rejectionReason: reason, rejectionNote: note }
          : {},
      );
      setLocalStatuses((existing) => ({ ...existing, [current.id]: decision }));
      setError("");
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "操作失败，请重试。",
      );
    }
  };
  return (
    <div className="manual-cleaning-preview">
      <div className="manual-cleaning-preview__nav">
        <Button disabled={index === 0} onClick={() => move(index - 1)}>
          上一条
        </Button>
        <span>
          {index + 1} / {items.length}
        </span>
        <Button
          disabled={index === items.length - 1}
          onClick={() => move(index + 1)}
        >
          下一条
        </Button>
      </div>
      <DerivedDataPreview
        item={current}
        sourceVideo={sourceById[current.sourceVideoId]}
        kind={mode}
      />
      <div className="ai-derived-metadata">
        <div>
          <span>来源视频</span>
          <strong>
            {sourceById[current.sourceVideoId]?.displayName || "原始视频不存在"}
          </strong>
        </div>
        <div>
          <span>{mode === "frames" ? "源视频时间点" : "片段时间范围"}</span>
          <strong>
            {mode === "frames"
              ? formatDerivedTimecode(current.sourceTimeMs / 1000, true)
              : `${formatDerivedTimecode(current.startMs / 1000)} – ${formatDerivedTimecode(current.endMs / 1000)}`}
          </strong>
        </div>
        {mode === "frames" && (
          <div>
            <span>原始分辨率</span>
            <strong>
              {current.width || 0}×{current.height || 0}
            </strong>
          </div>
        )}
        <div>
          <span>自动清洗结果</span>
          <strong>
            {AUTO_CLEANING_RESULTS[manualAutoResult(current)] || "未清洗"}
          </strong>
        </div>
        <div>
          <span>自动清洗原因</span>
          <strong>
            {(current.cleaningReasons || [])
              .map((item) => CLEANING_REASONS[item])
              .join("、") || "未命中风险规则"}
          </strong>
        </div>
        <div>
          <span>当前人工状态</span>
          <strong>{MANUAL_CLEANING_STATUSES[manualStatus]}</strong>
        </div>
      </div>
      <div className="manual-cleaning-preview__actions">
        <Button type="primary" onClick={() => decide("kept")}>
          保留
        </Button>
        <label className="field">
          剔除原因
          <select
            aria-label="大图预览剔除原因"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="">请选择</option>
            {Object.entries(MANUAL_REJECTION_REASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {reason === "other" && (
          <label className="field">
            原因说明
            <input
              aria-label="大图预览其他原因说明"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        )}
        <Button onClick={() => decide("rejected")}>确认剔除</Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
    </div>
  );
}

function AiManualCleaningPage({ setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const store = usePrototypeData();
  const rejectFormRef = useRef(null);
  const selectedId =
    new URLSearchParams(location.search).get("capabilityId") || "";
  const capabilities = Array.isArray(store.data.aiCapabilities)
    ? store.data.aiCapabilities
    : [];
  const capability = capabilities.find((item) => item.id === selectedId);
  const mode = capability ? extractionModeForCapability(capability.type) : "";
  const [manualFilter, setManualFilter] = useState("pending");
  const [autoFilter, setAutoFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [rejectionFilter, setRejectionFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageError, setPageError] = useState("");
  useEffect(() => {
    setManualFilter("pending");
    setAutoFilter("");
    setReasonFilter("");
    setSourceFilter("");
    setRejectionFilter("");
    setTaskFilter("");
    setSelectedIds([]);
    setPageError("");
  }, [selectedId]);
  const allItems = !capability
    ? []
    : mode === "frames"
      ? (store.data.aiFrames || []).filter(
          (item) => item.capabilityId === capability.id,
        )
      : (store.data.aiClips || []).filter(
          (item) => item.capabilityId === capability.id,
        );
  const eligibleItems = allItems.filter(
    (item) => item.cleaningStatus === "auto_cleaned",
  );
  const uncleanedCount = allItems.length - eligibleItems.length;
  const videos = !capability
    ? []
    : (store.data.aiSourceVideos || []).filter(
        (item) => item.capabilityId === capability.id,
      );
  const sourceById = Object.fromEntries(
    videos.map((video) => [video.id, video]),
  );
  const extractionTasks = !capability
    ? []
    : (store.data.aiExtractionTasks || []).filter(
        (item) => item.capabilityId === capability.id,
      );
  const summary = summarizeManualCleaning(eligibleItems);
  const reasonEntries = Object.entries(CLEANING_REASONS).filter(([reason]) =>
    mode === "frames"
      ? !["severe_blur", "too_short"].includes(reason)
      : reason !== "blur" && reason !== "low_resolution",
  );
  const visibleItems = sortManualCleaningItems(eligibleItems).filter((item) => {
    const status = item.manualCleaningStatus || "pending";
    return (
      (!manualFilter || status === manualFilter) &&
      (!autoFilter || manualAutoResult(item) === autoFilter) &&
      (!reasonFilter || (item.cleaningReasons || []).includes(reasonFilter)) &&
      (!sourceFilter || item.sourceVideoId === sourceFilter) &&
      (!rejectionFilter || item.rejectionReason === rejectionFilter) &&
      (!taskFilter || item.taskId === taskFilter)
    );
  });
  const {
    pageItems: pagedManualItems,
    paginationProps: manualResultPagination,
  } = useListPagination(visibleItems);
  const applyDecision = (ids, decision, details = {}) => {
    setPageError("");
    try {
      store.applyManualCleaningDecision({
        capabilityId: capability.id,
        ids,
        decision,
        ...details,
      });
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    } catch (problem) {
      const message =
        problem instanceof Error ? problem.message : "操作失败，请重试。";
      setPageError(message);
      throw problem;
    }
  };
  const requestKeep = (ids) => {
    try {
      applyDecision(ids, "kept");
    } catch {
      // The page-level error keeps the protection reason visible.
    }
  };
  const requestReject = (ids) => {
    setPageError("");
    setModal({
      eyebrow: "人工清洗",
      title: ids.length > 1 ? `剔除所选 ${ids.length} 条数据` : "确认人工剔除",
      confirmText: "确认剔除",
      content: <ManualRejectForm ref={rejectFormRef} />,
      onConfirm: () => {
        const detail = rejectFormRef.current?.getValue();
        applyDecision(ids, "rejected", detail);
        return `已人工剔除 ${ids.length} 条数据`;
      },
    });
  };
  const openPreview = (item) =>
    setModal({
      eyebrow: mode === "frames" ? "图片人工复核" : "视频片段人工复核",
      title:
        mode === "frames"
          ? item.fileName
          : `${formatDerivedTimecode(item.startMs / 1000)} – ${formatDerivedTimecode(item.endMs / 1000)}`,
      size: "large",
      hideConfirm: true,
      content: (
        <ManualCleaningPreview
          items={visibleItems}
          initialId={item.id}
          mode={mode}
          sourceById={sourceById}
          onDecision={applyDecision}
        />
      ),
    });
  const selectAllVisible = () =>
    setSelectedIds((current) => {
      const visibleIds = visibleItems.map((item) => item.id);
      return visibleIds.every((id) => current.includes(id))
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])];
    });
  return (
    <>
      <PageHeader
        title="人工清洗"
        subtitle="人工最终确认图片或视频片段是否值得进入数据标注，最终结果优先于自动建议。"
      />
      <section className="panel ai-capability-context ai-cleaning-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/manual-cleaning?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/manual-cleaning`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type] || item.type}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-cleaning-context-summary">
            <span>
              能力类型<strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              人工处理对象
              <strong>{mode === "frames" ? "抽帧图片" : "视频片段"}</strong>
            </span>
            <span>
              有效数据口径<strong>人工确认已保留</strong>
            </span>
          </div>
        )}
      </section>
      {!selectedId ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <DatabaseOutlined />
            <h2>请先选择AI能力</h2>
            <p>人工清洗按AI能力独立处理，不会跨能力混合数据。</p>
          </div>
        </section>
      ) : !capability ? (
        <section className="panel">
          <div className="empty-state">
            <ExclamationCircleFilled />
            <h2>所选AI能力不存在</h2>
            <p>请重新选择有效的AI能力。</p>
          </div>
        </section>
      ) : !eligibleItems.length ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <EyeOutlined />
            <h2>暂无可人工清洗的数据</h2>
            <p>请先前往“自动清洗”完成第一轮数据筛选。</p>
            <Button
              type="primary"
              onClick={() =>
                nav(
                  `${AI_LIBRARY_PATH}/auto-cleaning?capabilityId=${encodeURIComponent(capability.id)}`,
                )
              }
            >
              去自动清洗
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="manual-cleaning-progress panel">
            <div className="manual-cleaning-progress__header">
              <div>
                <span>人工清洗进度</span>
                <strong>
                  {summary.confirmed} / {summary.total}
                </strong>
              </div>
              <b>{summary.completionRate}%</b>
            </div>
            <div className="manual-cleaning-progress__bar">
              <span style={{ width: `${summary.completionRate}%` }} />
            </div>
            <div className="manual-cleaning-progress__stats">
              <span>
                待人工确认<strong>{summary.pending}</strong>
              </span>
              <span className="is-keep">
                已保留<strong>{summary.kept}</strong>
              </span>
              <span className="is-reject">
                已剔除<strong>{summary.rejected}</strong>
              </span>
              <span>
                自动建议保留<strong>{summary.autoKeep}</strong>
              </span>
              <span>
                自动剔除<strong>{summary.autoRejected}</strong>
              </span>
            </div>
          </section>
          {!!uncleanedCount && (
            <section className="manual-cleaning-notice">
              <ClockCircleOutlined />
              <span>
                仍有 <strong>{uncleanedCount}</strong>{" "}
                条数据尚未完成自动清洗，暂不进入人工清洗列表。
              </span>
              <Button
                onClick={() =>
                  nav(
                    `${AI_LIBRARY_PATH}/auto-cleaning?capabilityId=${encodeURIComponent(capability.id)}`,
                  )
                }
              >
                去自动清洗
              </Button>
            </section>
          )}
          {summary.pending === 0 && (
            <section className="manual-cleaning-complete">
              <CheckCircleFilled />
              <div>
                <strong>当前没有待人工确认的数据</strong>
                <p>
                  可查看已保留或已剔除的数据，并继续调整尚未进入标注的数据。
                </p>
              </div>
              <Button
                onClick={() =>
                  nav(
                    `${AI_LIBRARY_PATH}/annotation?capabilityId=${encodeURIComponent(capability.id)}`,
                  )
                }
              >
                前往数据标注
              </Button>
            </section>
          )}
          <section className="panel manual-cleaning-workspace">
            <PanelTitle
              title={
                mode === "frames"
                  ? "图片人工清洗工作台"
                  : "视频片段人工清洗工作台"
              }
            />
            <div className="manual-cleaning-principle">
              <SafetyCertificateOutlined />
              <span>
                <strong>自动清洗结果只是参考</strong>，最终以人工“保留 /
                剔除”结果为准。人工清洗不修改文件内容和片段边界。
              </span>
            </div>
            <div className="ai-result-filters manual-cleaning-filters">
              <select
                aria-label="按人工状态筛选"
                value={manualFilter}
                onChange={(event) => {
                  setManualFilter(event.target.value);
                  setSelectedIds([]);
                }}
              >
                <option value="">全部人工状态</option>
                {Object.entries(MANUAL_CLEANING_STATUSES).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              <select
                aria-label="按自动清洗结果筛选"
                value={autoFilter}
                onChange={(event) => setAutoFilter(event.target.value)}
              >
                <option value="">全部自动结果</option>
                {Object.entries(AUTO_CLEANING_RESULTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="按自动清洗原因筛选"
                value={reasonFilter}
                onChange={(event) => setReasonFilter(event.target.value)}
              >
                <option value="">全部自动原因</option>
                {reasonEntries.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="按来源视频筛选"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="">全部来源视频</option>
                {videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.displayName || video.fileName}
                  </option>
                ))}
              </select>
              <select
                aria-label="按人工剔除原因筛选"
                value={rejectionFilter}
                onChange={(event) => setRejectionFilter(event.target.value)}
              >
                <option value="">全部人工剔除原因</option>
                {Object.entries(MANUAL_REJECTION_REASONS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              <select
                aria-label="按生成任务筛选"
                value={taskFilter}
                onChange={(event) => setTaskFilter(event.target.value)}
              >
                <option value="">全部生成任务</option>
                {extractionTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="manual-cleaning-batchbar">
              <Button onClick={selectAllVisible}>
                {visibleItems.length &&
                visibleItems.every((item) => selectedIds.includes(item.id))
                  ? "取消全选"
                  : "选择当前结果"}
              </Button>
              <span>已选择 {selectedIds.length} 条</span>
              <Button
                disabled={!selectedIds.length}
                type="primary"
                onClick={() => requestKeep(selectedIds)}
              >
                批量保留
              </Button>
              <Button
                disabled={!selectedIds.length}
                onClick={() => requestReject(selectedIds)}
              >
                批量剔除
              </Button>
            </div>
            {pageError && (
              <p className="form-error" role="alert">
                {pageError}
              </p>
            )}
            {mode === "frames" ? (
              <div className="manual-cleaning-frame-grid">
                {pagedManualItems.map((item) => {
                  const manualStatus = item.manualCleaningStatus || "pending";
                  const autoResult = manualAutoResult(item);
                  return (
                    <article key={item.id} className={`is-${manualStatus}`}>
                      <div className="manual-cleaning-card__header">
                        <label>
                          <input
                            aria-label={`选择人工清洗数据 ${item.id}`}
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() =>
                              setSelectedIds((current) =>
                                current.includes(item.id)
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
                          />
                          选择
                        </label>
                        <div className="manual-cleaning-card__actions">
                          <button
                            className={
                              manualStatus === "kept" ? "is-active" : ""
                            }
                            type="button"
                            aria-label={
                              manualStatus === "rejected"
                                ? "恢复为保留"
                                : "保留"
                            }
                            title={
                              manualStatus === "rejected"
                                ? "恢复为保留"
                                : "保留"
                            }
                            onClick={() => requestKeep([item.id])}
                          >
                            <CheckCircleOutlined />
                          </button>
                          <button
                            className={`is-reject ${manualStatus === "rejected" ? "is-active" : ""}`}
                            type="button"
                            aria-label={
                              manualStatus === "kept" ? "改为剔除" : "剔除"
                            }
                            title={
                              manualStatus === "kept" ? "改为剔除" : "剔除"
                            }
                            onClick={() => requestReject([item.id])}
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                      </div>
                      <button
                        className="ai-frame-thumbnail"
                        onClick={() => openPreview(item)}
                      >
                        <img
                          src={frameImageUrl(item)}
                          alt={`${sourceById[item.sourceVideoId]?.displayName || "原始视频"}的人工清洗图片`}
                        />
                        <span>
                          {formatDerivedTimecode(
                            item.sourceTimeMs / 1000,
                            true,
                          )}
                        </span>
                      </button>
                      <strong>
                        {sourceById[item.sourceVideoId]?.displayName ||
                          "原始视频不存在"}
                      </strong>
                      <small>
                        源视频时间点：
                        {formatDerivedTimecode(item.sourceTimeMs / 1000, true)}
                      </small>
                      <div className="manual-cleaning-status-row">
                        <Status
                          tone={
                            autoResult === "auto_reject" ? "danger" : "success"
                          }
                        >
                          自动：{AUTO_CLEANING_RESULTS[autoResult]}
                        </Status>
                        <Status
                          tone={
                            manualStatus === "kept"
                              ? "success"
                              : manualStatus === "rejected"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {MANUAL_CLEANING_STATUSES[manualStatus]}
                        </Status>
                      </div>
                      <div className="ai-cleaning-reasons">
                        {(item.cleaningReasons || []).map((reason) => (
                          <span key={reason}>{CLEANING_REASONS[reason]}</span>
                        ))}
                        {!(item.cleaningReasons || []).length && (
                          <span className="is-clear">未命中风险规则</span>
                        )}
                      </div>
                      {manualStatus === "rejected" && (
                        <p className="manual-cleaning-rejection">
                          剔除原因：
                          {MANUAL_REJECTION_REASONS[item.rejectionReason] ||
                            item.rejectionReason}
                          {item.rejectionNote ? ` · ${item.rejectionNote}` : ""}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>选择</th>
                      <th>视频片段</th>
                      <th>来源视频</th>
                      <th>时间范围</th>
                      <th>时长</th>
                      <th>自动清洗</th>
                      <th>人工状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedManualItems.map((item) => {
                      const manualStatus =
                        item.manualCleaningStatus || "pending";
                      const autoResult = manualAutoResult(item);
                      return (
                        <tr key={item.id}>
                          <td>
                            <input
                              aria-label={`选择人工清洗数据 ${item.id}`}
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() =>
                                setSelectedIds((current) =>
                                  current.includes(item.id)
                                    ? current.filter((id) => id !== item.id)
                                    : [...current, item.id],
                                )
                              }
                            />
                          </td>
                          <td>{item.id}</td>
                          <td>
                            {sourceById[item.sourceVideoId]?.displayName ||
                              "原始视频不存在"}
                          </td>
                          <td>
                            {formatDerivedTimecode(item.startMs / 1000)} –{" "}
                            {formatDerivedTimecode(item.endMs / 1000)}
                          </td>
                          <td>
                            {formatDerivedTimecode(item.durationMs / 1000)}
                          </td>
                          <td>
                            <Status
                              tone={
                                autoResult === "auto_reject"
                                  ? "danger"
                                  : "success"
                              }
                            >
                              {AUTO_CLEANING_RESULTS[autoResult]}
                            </Status>
                            <div className="ai-cleaning-reasons">
                              {(item.cleaningReasons || []).map((reason) => (
                                <span key={reason}>
                                  {CLEANING_REASONS[reason]}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <Status
                              tone={
                                manualStatus === "kept"
                                  ? "success"
                                  : manualStatus === "rejected"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {MANUAL_CLEANING_STATUSES[manualStatus]}
                            </Status>
                            {manualStatus === "rejected" && (
                              <small className="manual-cleaning-rejection">
                                {MANUAL_REJECTION_REASONS[item.rejectionReason]}
                                {item.rejectionNote
                                  ? ` · ${item.rejectionNote}`
                                  : ""}
                              </small>
                            )}
                          </td>
                          <td>
                            <div className="ai-capability-row-actions">
                              <button
                                className="table-action"
                                onClick={() => openPreview(item)}
                              >
                                播放
                              </button>
                              <button
                                className="table-action"
                                onClick={() => requestKeep([item.id])}
                              >
                                {manualStatus === "rejected"
                                  ? "恢复为保留"
                                  : "保留"}
                              </button>
                              <button
                                className="table-action"
                                onClick={() => requestReject([item.id])}
                              >
                                {manualStatus === "kept" ? "改为剔除" : "剔除"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!visibleItems.length && (
              <div className="empty-state manual-cleaning-empty">
                <CheckCircleOutlined />
                <h2>
                  {manualFilter === "pending"
                    ? "当前没有待人工确认的数据"
                    : "没有符合筛选条件的数据"}
                </h2>
                <p>可以切换人工状态或其他筛选条件继续查看。</p>
              </div>
            )}
            <TablePagination {...manualResultPagination} />
          </section>
        </>
      )}
    </>
  );
}

function AnnotationCategoryManager({ capability, categories, items, store }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");
  const usageCount = (categoryId) =>
    items.reduce(
      (sum, item) =>
        sum +
        (capability.type === "object_detection"
          ? (item.boxes || []).filter((box) => box.categoryId === categoryId)
              .length
          : item.actionCategoryId === categoryId
            ? 1
            : 0),
      0,
    );
  const run = (action) => {
    setError("");
    try {
      action();
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "操作失败，请重试。",
      );
    }
  };
  const create = () =>
    run(() => {
      store.createAiAnnotationCategory({
        capabilityId: capability.id,
        name: newName,
      });
      setNewName("");
    });
  return (
    <section className="panel annotation-categories">
      <PanelTitle
        title="标注类别"
        extra={
          <span>
            {capability.type === "object_detection" ? "目标类别" : "动作类别"}
          </span>
        }
      />
      <p className="annotation-boundary-note">
        类别只属于当前AI能力，与具体实训标准和步骤无关。已有标注引用的类别不能修改或删除。
      </p>
      <div className="annotation-category-list">
        {categories.map((category) => {
          const used = usageCount(category.id);
          const locked =
            used > 0 || category.isDefault || category.isBackground;
          return (
            <article key={category.id}>
              {editingId === category.id ? (
                <input
                  aria-label={`修改类别 ${category.name}`}
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
              ) : (
                <div>
                  <strong>{category.name}</strong>
                  <small>
                    {category.isBackground
                      ? "固定背景类别"
                      : category.isDefault
                        ? "默认类别"
                        : "自定义类别"}
                    {` · ${used} 条标注`}
                  </small>
                </div>
              )}
              <div className="annotation-category-actions">
                {editingId === category.id ? (
                  <>
                    <button
                      className="table-action"
                      onClick={() =>
                        run(() => {
                          store.updateAiAnnotationCategory(
                            category.id,
                            editingName,
                          );
                          setEditingId("");
                        })
                      }
                    >
                      保存
                    </button>
                    <button
                      className="table-action"
                      onClick={() => setEditingId("")}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="table-action"
                      disabled={locked}
                      title={
                        locked ? "固定类别或已有标注引用，不能修改" : "修改类别"
                      }
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                    >
                      修改
                    </button>
                    <button
                      className="table-action danger-text"
                      disabled={locked}
                      title={
                        locked ? "固定类别或已有标注引用，不能删除" : "删除类别"
                      }
                      onClick={() =>
                        run(() => store.deleteAiAnnotationCategory(category.id))
                      }
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="annotation-category-create">
        <input
          aria-label="新标注类别名称"
          placeholder={
            capability.type === "object_detection"
              ? "例如：绝缘手套破损"
              : "例如：复检动作"
          }
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && create()}
        />
        <Button type="primary" onClick={create}>
          添加类别
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
    </section>
  );
}

function ObjectAnnotationWorkbench({
  items,
  current,
  categories,
  sourceById,
  onSelect,
  store,
}) {
  const canvasRef = useRef(null);
  const [boxes, setBoxes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || "",
  );
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [noTarget, setNoTarget] = useState(false);
  const [drag, setDrag] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [suggestionRef, setSuggestionRef] = useState(null);
  useEffect(() => {
    setBoxes(Array.isArray(current?.boxes) ? current.boxes : []);
    setNoTarget(!!current?.noTargetConfirmed);
    setSelectedBoxId("");
    setError("");
    setSuggestionRef(null);
  }, [current?.id, current?.annotationUpdatedAt]);
  useEffect(() => {
    if (!categories.some((item) => item.id === selectedCategoryId))
      setSelectedCategoryId(categories[0]?.id || "");
  }, [categories, selectedCategoryId]);
  if (!current) return null;
  const currentIndex = items.findIndex((item) => item.id === current.id);
  const pointFromEvent = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };
  const beginDraw = (event) => {
    if (event.target !== event.currentTarget || noTarget) return;
    if (!selectedCategoryId) {
      setError("请先选择目标类别。");
      return;
    }
    const point = pointFromEvent(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedBoxId("");
    setDrag({ type: "draw", start: point });
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  };
  const beginMove = (event, box, type = "move") => {
    event.stopPropagation();
    const point = pointFromEvent(event);
    canvasRef.current?.setPointerCapture?.(event.pointerId);
    setSelectedBoxId(box.id);
    setDrag({ type, start: point, box: { ...box } });
  };
  const movePointer = (event) => {
    if (!drag) return;
    const point = pointFromEvent(event);
    if (drag.type === "draw") {
      setDraft({
        x: Math.min(point.x, drag.start.x),
        y: Math.min(point.y, drag.start.y),
        width: Math.abs(point.x - drag.start.x),
        height: Math.abs(point.y - drag.start.y),
      });
      return;
    }
    setBoxes((currentBoxes) =>
      currentBoxes.map((box) => {
        if (box.id !== drag.box.id) return box;
        if (drag.type === "resize")
          return {
            ...box,
            width: Math.max(
              0.01,
              Math.min(1 - box.x, drag.box.width + point.x - drag.start.x),
            ),
            height: Math.max(
              0.01,
              Math.min(1 - box.y, drag.box.height + point.y - drag.start.y),
            ),
          };
        return {
          ...box,
          x: Math.min(
            1 - box.width,
            Math.max(0, drag.box.x + point.x - drag.start.x),
          ),
          y: Math.min(
            1 - box.height,
            Math.max(0, drag.box.y + point.y - drag.start.y),
          ),
        };
      }),
    );
  };
  const endPointer = () => {
    if (
      drag?.type === "draw" &&
      draft?.width >= 0.01 &&
      draft?.height >= 0.01
    ) {
      const id = `draft-box-${Date.now()}-${boxes.length}`;
      setBoxes((currentBoxes) => [
        ...currentBoxes,
        { id, categoryId: selectedCategoryId, ...draft },
      ]);
      setSelectedBoxId(id);
    }
    setDrag(null);
    setDraft(null);
  };
  const go = (offset) => {
    const target = items[currentIndex + offset];
    if (target) onSelect(target.id);
  };
  const save = (andNext = false) => {
    setError("");
    try {
      store.saveAiFrameAnnotation({
        capabilityId: current.capabilityId,
        suggestionRef,
        frameId: current.id,
        boxes,
        noTargetConfirmed: noTarget,
      });
      setSuggestionRef(null);
      if (andNext && items[currentIndex + 1])
        onSelect(items[currentIndex + 1].id);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "保存失败，请重试。",
      );
    }
  };
  const visibleBoxes = [
    ...boxes,
    ...(draft
      ? [{ id: "draft", categoryId: selectedCategoryId, ...draft }]
      : []),
  ];
  return (
    <div className="annotation-object-workbench">
      <SuggestionPanel
        current={current}
        categories={categories}
        source={sourceById[current.sourceVideoId]}
        onAdopt={(s, ref) => {
          setBoxes(s.boxes || []);
          setNoTarget(false);
          setSuggestionRef(ref);
        }}
      />
      <div className="annotation-workbench-toolbar">
        <div>
          <strong>{current.fileName || current.id}</strong>
          <span>
            {sourceById[current.sourceVideoId]?.displayName || "来源视频不存在"}{" "}
            · {formatDerivedTimecode(current.sourceTimeMs / 1000, true)}
          </span>
        </div>
        <label>
          当前绘制类别
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="annotation-object-layout">
        <div>
          <div
            ref={canvasRef}
            className={`annotation-canvas ${noTarget ? "is-disabled" : ""}`}
            onPointerDown={beginDraw}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            <img
              src={frameImageUrl(current)}
              alt={`${current.fileName || "图片帧"}标注画布`}
              draggable="false"
            />
            {visibleBoxes.map((box) => {
              const category = categories.find(
                (item) => item.id === box.categoryId,
              );
              return (
                <div
                  key={box.id}
                  className={`annotation-box ${selectedBoxId === box.id ? "is-selected" : ""}`}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`,
                  }}
                  onPointerDown={(event) =>
                    box.id !== "draft" && beginMove(event, box)
                  }
                >
                  <span>{category?.name || "未知类别"}</span>
                  {box.id !== "draft" && (
                    <i
                      className="annotation-box-resize"
                      onPointerDown={(event) => beginMove(event, box, "resize")}
                    />
                  )}
                </div>
              );
            })}
            {noTarget && (
              <div className="annotation-no-target-overlay">
                <CheckCircleOutlined />
                <strong>已明确标记：无目标</strong>
              </div>
            )}
          </div>
          <p className="annotation-canvas-help">
            在图片上拖拽绘制目标框；拖动框可移动，拖动右下角可缩放。
          </p>
        </div>
        <aside className="annotation-box-panel">
          <header>
            <strong>目标框</strong>
            <span>{boxes.length} 个</span>
          </header>
          <label className="annotation-no-target-toggle">
            <input
              type="checkbox"
              checked={noTarget}
              onChange={(event) => {
                setNoTarget(event.target.checked);
                if (event.target.checked) setBoxes([]);
              }}
            />
            此图片无目标
          </label>
          <div className="annotation-box-list">
            {boxes.map((box, index) => (
              <article
                key={box.id}
                className={selectedBoxId === box.id ? "is-selected" : ""}
                onClick={() => setSelectedBoxId(box.id)}
              >
                <b
                  aria-label={`目标框 ${index + 1}`}
                  title={`目标框 ${index + 1}`}
                >
                  {index + 1}
                </b>
                <select
                  value={box.categoryId}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    setBoxes((currentBoxes) =>
                      currentBoxes.map((item) =>
                        item.id === box.id
                          ? { ...item, categoryId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`删除目标框 ${index + 1}`}
                  title="删除目标框"
                  onClick={(event) => {
                    event.stopPropagation();
                    setBoxes((currentBoxes) =>
                      currentBoxes.filter((item) => item.id !== box.id),
                    );
                  }}
                >
                  <DeleteOutlined />
                </button>
              </article>
            ))}
            {!boxes.length && !noTarget && <p>尚未绘制目标框。</p>}
          </div>
        </aside>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
      <div className="annotation-workbench-actions">
        <Button disabled={currentIndex <= 0} onClick={() => go(-1)}>
          上一张
        </Button>
        <span>
          {currentIndex + 1} / {items.length}
        </span>
        <Button
          disabled={currentIndex >= items.length - 1}
          onClick={() => go(1)}
        >
          下一张
        </Button>
        <i />
        <Button onClick={() => save(false)}>保存</Button>
        <Button type="primary" onClick={() => save(true)}>
          保存并下一张
        </Button>
      </div>
    </div>
  );
}

function ActionAnnotationWorkbench({
  items,
  current,
  categories,
  sourceById,
  onSelect,
  store,
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [suggestionRef, setSuggestionRef] = useState(null);
  useEffect(() => {
    setCategoryId(current?.actionCategoryId || categories[0]?.id || "");
    setStart(
      formatDerivedTimecode(
        (current?.refinedStartMs ?? current?.startMs ?? 0) / 1000,
        true,
      ),
    );
    setEnd(
      formatDerivedTimecode(
        (current?.refinedEndMs ?? current?.endMs ?? 0) / 1000,
        true,
      ),
    );
    setError("");
    setSuggestionRef(null);
  }, [current?.id, current?.annotationUpdatedAt]);
  if (!current) return null;
  const currentIndex = items.findIndex((item) => item.id === current.id);
  const save = (andNext = false) => {
    setError("");
    try {
      store.saveAiClipAnnotation({
        capabilityId: current.capabilityId,
        suggestionRef,
        clipId: current.id,
        actionCategoryId: categoryId,
        refinedStartMs: parseDerivedTimecode(start) * 1000,
        refinedEndMs: parseDerivedTimecode(end) * 1000,
      });
      setSuggestionRef(null);
      if (andNext && items[currentIndex + 1])
        onSelect(items[currentIndex + 1].id);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "保存失败，请重试。",
      );
    }
  };
  return (
    <div className="annotation-action-workbench">
      <SuggestionPanel
        current={current}
        categories={categories}
        source={sourceById[current.sourceVideoId]}
        onAdopt={(s, ref) => {
          setCategoryId(s.actionCategoryId);
          setStart(formatDerivedTimecode(s.refinedStartMs / 1000, true));
          setEnd(formatDerivedTimecode(s.refinedEndMs / 1000, true));
          setSuggestionRef(ref);
        }}
      />
      <div className="annotation-action-preview">
        <DerivedDataPreview
          item={current}
          sourceVideo={sourceById[current.sourceVideoId]}
          kind="clips"
        />
      </div>
      <div className="annotation-action-form">
        <h3>动作标注</h3>
        <p>
          每个视频片段只分配一个动作类别，可在原始视频范围内细化动作起止时间。
        </p>
        <label className="field">
          动作类别
          <select
            aria-label="动作类别"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="two-col-form">
          <label className="field">
            动作开始
            <input
              aria-label="动作开始时间"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="field">
            动作结束
            <input
              aria-label="动作结束时间"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>
        <small>
          原片段：{formatDerivedTimecode(current.startMs / 1000, true)} –{" "}
          {formatDerivedTimecode(current.endMs / 1000, true)}
        </small>
        {error && (
          <p className="form-error" role="alert">
            {displayBusinessText(error)}
          </p>
        )}
        <div className="annotation-workbench-actions">
          <Button
            disabled={currentIndex <= 0}
            onClick={() => onSelect(items[currentIndex - 1]?.id)}
          >
            上一个
          </Button>
          <span>
            {currentIndex + 1} / {items.length}
          </span>
          <Button
            disabled={currentIndex >= items.length - 1}
            onClick={() => onSelect(items[currentIndex + 1]?.id)}
          >
            下一个
          </Button>
          <i />
          <Button onClick={() => save(false)}>保存</Button>
          <Button type="primary" onClick={() => save(true)}>
            保存并下一个
          </Button>
        </div>
      </div>
    </div>
  );
}

function AiAnnotationPage({ setModal }) {
  const store = usePrototypeData();
  const nav = useNavigate();
  const location = useLocation();
  const selectedId =
    new URLSearchParams(location.search).get("capabilityId") || "";
  const capabilities = (store.data.aiCapabilities || []).filter((item) =>
    ["object_detection", "action_recognition"].includes(item.type),
  );
  const capability = capabilities.find((item) => item.id === selectedId);
  const mode = capability?.type === "object_detection" ? "frames" : "clips";
  const allItems = !capability
    ? []
    : (mode === "frames"
        ? store.data.aiFrames || []
        : store.data.aiClips || []
      ).filter((item) => item.capabilityId === capability.id);
  const items = allItems.filter((item) => item.manualCleaningStatus === "kept");
  const categories = (store.data.aiAnnotationCategories || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const videos = (store.data.aiSourceVideos || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const sourceById = Object.fromEntries(videos.map((item) => [item.id, item]));
  const summary = summarizeAnnotations(items);
  const [statusFilter, setStatusFilter] = useState("not_started");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [pageError, setPageError] = useState("");
  useEffect(() => {
    setStatusFilter("not_started");
    setSourceFilter("");
    setCategoryFilter("");
    setCurrentId("");
    setSelectedIds([]);
    setPageError("");
  }, [capability?.id]);
  useEffect(() => {
    if (!categories.some((item) => item.id === batchCategoryId))
      setBatchCategoryId(categories[0]?.id || "");
  }, [categories, batchCategoryId]);
  const visibleItems = items.filter((item) => {
    const status = item.annotationStatus || "not_started";
    const categoryMatch =
      !categoryFilter ||
      (mode === "frames"
        ? (item.boxes || []).some((box) => box.categoryId === categoryFilter)
        : item.actionCategoryId === categoryFilter);
    return (
      (!statusFilter || status === statusFilter) &&
      (!sourceFilter || item.sourceVideoId === sourceFilter) &&
      categoryMatch
    );
  });
  const current =
    visibleItems.find((item) => item.id === currentId) ||
    visibleItems[0] ||
    null;
  const toggleSelected = (id) =>
    setSelectedIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((item) => item !== id)
        : [...currentIds, id],
    );
  const confirmBatch = () => {
    setPageError("");
    if (!selectedIds.length) return;
    const isFrames = mode === "frames";
    setModal({
      eyebrow: "批量标注确认",
      title: isFrames
        ? `将 ${selectedIds.length} 张图片标记为无目标`
        : `为 ${selectedIds.length} 个片段分配动作类别`,
      confirmText: "确认批量标注",
      content: (
        <p>
          {isFrames
            ? "保存后这些图片将清空已有目标框，并明确记录为无目标。"
            : `所选片段将统一标注为“${categories.find((item) => item.id === batchCategoryId)?.name || "所选类别"}”，片段边界保持当前值。`}
        </p>
      ),
      onConfirm: () => {
        if (isFrames)
          store.batchMarkAiFramesNoTarget({
            capabilityId: capability.id,
            ids: selectedIds,
          });
        else
          store.batchAssignAiClipCategory({
            capabilityId: capability.id,
            ids: selectedIds,
            actionCategoryId: batchCategoryId,
          });
        setSelectedIds([]);
        return `已完成 ${selectedIds.length} 条批量标注`;
      },
    });
  };
  return (
    <>
      <PageHeader
        title="数据标注"
        subtitle="对人工清洗已保留的数据进行目标框或动作区间标注，产出可进入训练数据的数据候选。"
      />
      <section className="panel ai-capability-context ai-cleaning-context ai-annotation-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/annotation?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/annotation`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type]} ·{" "}
                {modelSourceLabel(item.currentPublishedModel)}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-cleaning-context-summary">
            <span>
              能力类型<strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              标注对象
              <strong>
                {mode === "frames" ? "独立图片帧" : "独立视频片段"}
              </strong>
            </span>
            <span>
              准入条件<strong>人工清洗已保留</strong>
            </span>
          </div>
        )}
      </section>
      {capability && <PreannotationTasks capabilityId={capability.id} />}
      {!selectedId ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <DatabaseOutlined />
            <h2>请先选择AI能力</h2>
            <p>标注数据和类别按AI能力隔离。</p>
          </div>
        </section>
      ) : !capability ? (
        <section className="panel">
          <div className="empty-state">
            <ExclamationCircleFilled />
            <h2>所选AI能力不存在</h2>
            <p>请重新选择有效的AI能力。</p>
          </div>
        </section>
      ) : !items.length ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <EyeOutlined />
            <h2>暂无可标注数据</h2>
            <p>
              只有人工清洗已保留的{mode === "frames" ? "图片" : "视频片段"}
              可以进入标注。
            </p>
            <Button
              type="primary"
              onClick={() =>
                nav(
                  `${AI_LIBRARY_PATH}/manual-cleaning?capabilityId=${encodeURIComponent(capability.id)}`,
                )
              }
            >
              去人工清洗
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel annotation-progress">
            <div>
              <span>标注进度</span>
              <strong>
                {summary.completed} / {summary.total}
              </strong>
            </div>
            <div className="manual-cleaning-progress__bar">
              <span style={{ width: `${summary.completionRate}%` }} />
            </div>
            <div className="annotation-progress-stats">
              <span>
                待标注<strong>{summary.pending}</strong>
              </span>
              <span>
                已标注<strong>{summary.completed}</strong>
              </span>
              <b>{summary.completionRate}%</b>
            </div>
          </section>
          {summary.pending === 0 && (
            <section className="manual-cleaning-complete annotation-complete">
              <CheckCircleFilled />
              <div>
                <strong>当前能力的数据已全部标注</strong>
                <p>这些标注数据可作为后续训练数据候选。</p>
              </div>
              <Button
                onClick={() =>
                  nav(
                    `${AI_LIBRARY_PATH}/training-data?capabilityId=${encodeURIComponent(capability.id)}`,
                  )
                }
              >
                查看训练数据
              </Button>
            </section>
          )}
          <AnnotationCategoryManager
            capability={capability}
            categories={categories}
            items={allItems}
            store={store}
          />
          <section className="panel annotation-workspace">
            <PanelTitle
              title={mode === "frames" ? "目标框标注工作台" : "动作标注工作台"}
            />
            <div className="ai-result-filters annotation-filters">
              <select
                aria-label="按标注状态筛选"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setSelectedIds([]);
                }}
              >
                <option value="">全部标注状态</option>
                {Object.entries(ANNOTATION_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="按来源视频筛选"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="">全部来源视频</option>
                {videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.displayName || video.fileName}
                  </option>
                ))}
              </select>
              <select
                aria-label="按标注类别筛选"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="">全部标注类别</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="annotation-batchbar">
              <Button
                onClick={() =>
                  setSelectedIds(visibleItems.map((item) => item.id))
                }
              >
                选择当前结果
              </Button>
              <Button onClick={() => setSelectedIds([])}>取消选择</Button>
              <span>已选择 {selectedIds.length} 条</span>
              {mode === "clips" && (
                <select
                  aria-label="批量动作类别"
                  value={batchCategoryId}
                  onChange={(event) => setBatchCategoryId(event.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                type="primary"
                disabled={!selectedIds.length}
                onClick={confirmBatch}
              >
                {mode === "frames" ? "批量标记无目标" : "批量分配类别"}
              </Button>
            </div>
            {pageError && (
              <p className="form-error" role="alert">
                {pageError}
              </p>
            )}
            <div className="annotation-main-layout">
              <aside className="annotation-queue">
                <header>
                  <strong>数据队列</strong>
                  <span>{visibleItems.length} 条</span>
                </header>
                {visibleItems.map((item) => (
                  <article
                    key={item.id}
                    className={current?.id === item.id ? "is-active" : ""}
                  >
                    <input
                      aria-label={`选择标注数据 ${item.id}`}
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id)}
                    />
                    <button onClick={() => setCurrentId(item.id)}>
                      {mode === "frames" ? (
                        <img src={frameImageUrl(item)} alt="" />
                      ) : (
                        <PlayCircleFilled />
                      )}
                      <span>
                        <strong>
                          {mode === "frames"
                            ? item.fileName || item.id
                            : `${formatDerivedTimecode(item.startMs / 1000)} – ${formatDerivedTimecode(item.endMs / 1000)}`}
                        </strong>
                        <small>
                          {sourceById[item.sourceVideoId]?.displayName ||
                            "来源视频不存在"}
                        </small>
                      </span>
                      {item.annotationStatus !== "completed" && (
                        <Status tone="warning">
                          {
                            ANNOTATION_STATUSES[
                              item.annotationStatus || "not_started"
                            ]
                          }
                        </Status>
                      )}
                    </button>
                    {item.annotationStatus === "completed" && (
                      <span className="annotation-queue__completed-ribbon">
                        已标注
                      </span>
                    )}
                  </article>
                ))}
                {!visibleItems.length && (
                  <div className="annotation-queue-empty">
                    <CheckCircleOutlined />
                    <span>没有符合筛选条件的数据</span>
                  </div>
                )}
              </aside>
              <div className="annotation-editor">
                {!current ? (
                  <div className="empty-state annotation-editor-empty">
                    <CheckCircleOutlined />
                    <h2>当前筛选下没有可处理数据</h2>
                    <p>可以切换标注状态、来源视频或标注类别继续查看。</p>
                  </div>
                ) : mode === "frames" ? (
                  <ObjectAnnotationWorkbench
                    items={visibleItems}
                    current={current}
                    categories={categories}
                    sourceById={sourceById}
                    onSelect={setCurrentId}
                    store={store}
                  />
                ) : (
                  <ActionAnnotationWorkbench
                    items={visibleItems}
                    current={current}
                    categories={categories}
                    sourceById={sourceById}
                    onSelect={setCurrentId}
                    store={store}
                  />
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function AiTrainingDataPage({ setModal }) {
  const store = usePrototypeData();
  const nav = useNavigate();
  const location = useLocation();
  const selectedId =
    new URLSearchParams(location.search).get("capabilityId") || "";
  const capabilities = (store.data.aiCapabilities || []).filter((item) =>
    ["object_detection", "action_recognition"].includes(item.type),
  );
  const capability = capabilities.find((item) => item.id === selectedId);
  const mode = capability?.type === "object_detection" ? "frames" : "clips";
  const allItems = !capability
    ? []
    : (mode === "frames"
        ? store.data.aiFrames || []
        : store.data.aiClips || []
      ).filter((item) => item.capabilityId === capability.id);
  const videos = (store.data.aiSourceVideos || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const categories = (store.data.aiAnnotationCategories || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const config =
    (store.data.aiTrainingDataConfigs || []).find(
      (item) => item.capabilityId === capability?.id,
    ) ||
    (capability
      ? {
          capabilityId: capability.id,
          ratios: { ...DEFAULT_TRAINING_RATIOS },
          sourceAssignments: {},
          lastSavedCandidateIds: [],
          readinessStatus: "pending",
        }
      : null);
  const candidateResult = collectTrainingCandidates({
    capability,
    items: allItems,
    sourceVideos: videos,
    categories,
  });
  const groups = groupTrainingCandidates({
    candidates: candidateResult.candidates,
    sourceVideos: videos,
    categories,
    capability,
    config,
  });
  const {
    pageItems: pagedTrainingGroups,
    paginationProps: trainingGroupPagination,
  } = useListPagination(groups);
  const readiness = buildTrainingReadiness({
    capability,
    candidates: candidateResult.candidates,
    groups,
    categories,
    config,
  });
  const distribution = trainingCategoryDistribution({
    capability,
    candidates: candidateResult.candidates,
    groups,
    categories,
  });
  const summary = summarizeTrainingData(
    candidateResult.candidates,
    groups,
    candidateResult.unavailable.length,
  );
  const [ratios, setRatios] = useState({ ...DEFAULT_TRAINING_RATIOS });
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  useEffect(() => {
    setRatios({
      ...DEFAULT_TRAINING_RATIOS,
      ...(config?.ratios || {}),
    });
    setPageError("");
    setPageSuccess("");
  }, [
    capability?.id,
    config?.ratios?.train,
    config?.ratios?.validation,
    config?.ratios?.test,
  ]);
  const ratioTotal =
    Number(ratios.train || 0) +
    Number(ratios.validation || 0) +
    Number(ratios.test || 0);
  const ratioDirty = ["train", "validation", "test"].some(
    (key) => Number(ratios[key]) !== Number(config?.ratios?.[key]),
  );
  const run = (action) => {
    setPageError("");
    setPageSuccess("");
    try {
      return action();
    } catch (problem) {
      setPageError(
        problem instanceof Error ? problem.message : "操作失败，请重试。",
      );
      return null;
    }
  };
  const applyAutoSplit = () => {
    const updated = run(() =>
      store.autoSplitAiTrainingData({ capabilityId: capability.id, ratios }),
    );
    if (updated) setPageSuccess("已按采集组重新生成当前划分，请检查后保存。");
  };
  const requestAutoSplit = () => {
    if (!run(() => validateTrainingRatios(ratios))) return;
    const alreadySplit = groups.some((group) => group.split !== "unassigned");
    if (!alreadySplit) return applyAutoSplit();
    setModal({
      eyebrow: "重新自动划分",
      title: "覆盖当前训练数据集合归属",
      confirmText: "确认重新划分",
      content: (
        <p>
          重新划分将覆盖当前手动调整的训练集、验证集和测试集归属，是否继续？
        </p>
      ),
      onConfirm: () => {
        const updated = store.autoSplitAiTrainingData({
          capabilityId: capability.id,
          ratios,
        });
        setPageSuccess("已按采集组重新生成当前划分，请检查后保存。");
        return `已重新划分 ${Object.keys(updated.sourceAssignments || {}).length} 个来源视频（同采集组保持一致）`;
      },
    });
  };
  const save = () => {
    const result = run(() =>
      store.saveAiTrainingData({ capabilityId: capability.id, ratios }),
    );
    if (result)
      setPageSuccess(
        result.readiness.ready
          ? "划分已保存，当前训练数据已通过训练前检查。"
          : "划分已保存，请按训练前检查继续调整数据。",
      );
  };
  const prepare = () => {
    const result = run(() => store.prepareAiTrainingData(capability.id));
    if (result)
      nav(
        `${AI_LIBRARY_PATH}/training?capabilityId=${encodeURIComponent(capability.id)}`,
      );
  };
  const checkRows = [
    ["hasData", "存在可用训练数据"],
    ["hasTrainData", "训练集有数据"],
    ["hasValidationData", "验证集有数据"],
    ["hasTestData", "测试集有数据"],
    ["allAssigned", "所有候选数据均已分配"],
    ["noSourceVideoLeakage", "未发现来源视频跨集合"],
    ["annotationsComplete", "当前训练数据标注完整"],
    ["filesValid", "当前训练数据文件有效"],
    ["hasTargetCategories", "存在主要目标类别"],
    ...(capability?.type === "object_detection"
      ? [["hasPositiveImages", "存在有目标图片"]]
      : [["hasBackgroundCategory", "存在背景/非目标动作类别"]]),
    ["targetClassesCoveredInValidation", "验证集包含全部主要目标类别"],
    ["targetClassesCoveredInTest", "测试集包含全部主要目标类别"],
  ];
  return (
    <>
      <PageHeader
        title="训练数据"
        subtitle="整理当前AI能力已清洗、已标注的数据，并按采集组划分训练集、验证集和测试集。"
      />
      <section className="panel ai-capability-context ai-cleaning-context training-data-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/training-data?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/training-data`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type]} ·{" "}
                {modelSourceLabel(item.currentPublishedModel)}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-cleaning-context-summary">
            <span>
              能力类型<strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              当前训练数据<strong>唯一一套，可持续调整</strong>
            </span>
            <span>
              最小划分单位<strong>来源原始视频</strong>
            </span>
          </div>
        )}
      </section>
      {!selectedId ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <DatabaseOutlined />
            <h2>请先选择AI能力</h2>
            <p>训练数据按AI能力独立管理。</p>
          </div>
        </section>
      ) : !capability ? (
        <section className="panel">
          <div className="empty-state">
            <ExclamationCircleFilled />
            <h2>所选AI能力不存在</h2>
            <p>请重新选择有效的AI能力。</p>
          </div>
        </section>
      ) : !candidateResult.candidates.length ? (
        <>
          <section className="training-data-overview">
            <article>
              <small>候选数据</small>
              <strong>0</strong>
            </article>
            <article>
              <small>不可用数据</small>
              <strong>{candidateResult.unavailable.length}</strong>
            </article>
          </section>
          <section className="panel ai-library-workspace">
            <div className="empty-state ai-library-empty">
              <DatabaseOutlined />
              <h2>暂无可用训练数据</h2>
              <p>请先完成数据清洗和数据标注。</p>
              <div className="empty-state-actions">
                <Button
                  onClick={() =>
                    nav(
                      `${AI_LIBRARY_PATH}/manual-cleaning?capabilityId=${encodeURIComponent(capability.id)}`,
                    )
                  }
                >
                  去人工清洗
                </Button>
                <Button
                  type="primary"
                  onClick={() =>
                    nav(
                      `${AI_LIBRARY_PATH}/annotation?capabilityId=${encodeURIComponent(capability.id)}`,
                    )
                  }
                >
                  去数据标注
                </Button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="training-data-overview">
            {[
              ["候选数据", summary.candidateCount, "已保留且标注完整"],
              ["已进入训练数据", summary.assignedCount, "三个集合合计"],
              ["不可用数据", summary.unavailableCount, "不在本页处理"],
              [
                "来源采集组",
                summary.sourceGroupCount,
                summary.sourceVideoCount + " 个原始视频，按采集组划分",
              ],
              ["训练集", summary.train, "用于参数学习"],
              ["验证集", summary.validation, "用于训练过程评估"],
              ["测试集", summary.test, "用于独立效果验证"],
              ["未分配", summary.unassigned, "不会自动进入训练集"],
            ].map(([label, value, note]) => (
              <article
                key={label}
                className={label === "未分配" && value ? "is-warning" : ""}
              >
                <small>{label}</small>
                <strong>{displayBusinessText(value)}</strong>
                <span>{note}</span>
              </article>
            ))}
          </section>
          {(readiness.dataChanged || summary.unassigned > 0) && (
            <section className="training-data-change-notice">
              <ExclamationCircleFilled />
              <div>
                <strong>
                  {summary.unassigned > 0
                    ? `有 ${summary.unassigned} 条可用数据尚未分配`
                    : "当前训练数据已发生变化"}
                </strong>
                <p>
                  新增数据不会自动进入训练集，请重新划分或按采集组手动分配后保存。
                </p>
              </div>
            </section>
          )}
          <section className="training-data-grid">
            <section className="panel training-split-panel">
              <PanelTitle title="训练集 / 验证集 / 测试集划分" />
              <p className="training-panel-note">
                自动划分会尽量兼顾类别分布；同一采集组的全部视角和片段保持在同一个集合，人员跨集合会阻止数据就绪。
              </p>
              <div className="training-ratio-grid">
                {[
                  ["train", "训练集", "用于模型参数学习"],
                  ["validation", "验证集", "用于训练过程中的效果评估"],
                  ["test", "测试集", "用于训练完成后的独立验证"],
                ].map(([key, label, note]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <div>
                      <input
                        aria-label={`${label}比例`}
                        type="number"
                        min="1"
                        max="98"
                        value={ratios[key]}
                        onChange={(event) =>
                          setRatios((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))
                        }
                      />
                      <b>%</b>
                    </div>
                    <small>{note}</small>
                  </label>
                ))}
              </div>
              <div
                className={`training-ratio-total ${ratioTotal === 100 ? "is-valid" : "is-invalid"}`}
              >
                当前合计 <strong>{ratioTotal}%</strong>
                <span>{ratioTotal === 100 ? "比例有效" : "必须等于100%"}</span>
              </div>
              <div className="training-split-actions">
                <Button type="primary" onClick={requestAutoSplit}>
                  {groups.some((group) => group.split !== "unassigned")
                    ? "重新自动划分"
                    : "自动划分"}
                </Button>
                <span>默认比例为80% / 10% / 10%</span>
              </div>
            </section>
            <section className="panel training-integrity-panel">
              <PanelTitle title="数据完整性检查" />
              <div className="training-integrity-summary">
                <span>
                  可用<strong>{summary.candidateCount}</strong>
                </span>
                <span>
                  不可用<strong>{summary.unavailableCount}</strong>
                </span>
              </div>
              {Object.entries(candidateResult.reasonCounts).map(
                ([reason, count]) => (
                  <div className="training-unavailable-reason" key={reason}>
                    <span>{displayBusinessText(reason)}</span>
                    <strong>{count}</strong>
                  </div>
                ),
              )}
              {!candidateResult.unavailable.length && (
                <div className="training-integrity-ok">
                  <CheckCircleFilled /> 当前派生数据均满足候选池准入条件
                </div>
              )}
              <div className="training-integrity-links">
                <Button
                  onClick={() =>
                    nav(
                      `${AI_LIBRARY_PATH}/manual-cleaning?capabilityId=${encodeURIComponent(capability.id)}`,
                    )
                  }
                >
                  去人工清洗
                </Button>
                <Button
                  onClick={() =>
                    nav(
                      `${AI_LIBRARY_PATH}/annotation?capabilityId=${encodeURIComponent(capability.id)}`,
                    )
                  }
                >
                  去数据标注
                </Button>
              </div>
            </section>
          </section>
          <section className="panel training-source-groups">
            <PanelTitle
              title="按采集组管理"
              extra={<span>{groups.length} 个采集组</span>}
            />
            <div className="training-leakage-note">
              <SafetyCertificateOutlined />
              <span>
                同次采集的多段视频、多镜头一起分配；同一操作人跨集合会提示风险。封存测试只用于测试，不能进入训练或调优。
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>来源原始视频</th>
                    <th>数据来源</th>
                    <th>数据属性</th>
                    <th>有效派生数据</th>
                    <th>类别分布</th>
                    <th>当前集合</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTrainingGroups.map((group) => (
                    <tr key={group.sourceVideoId}>
                      <td>
                        <strong>
                          {group.sourceVideo?.displayName ||
                            group.sourceVideo?.fileName ||
                            group.sourceVideoId}
                        </strong>
                        <small className="table-subline">
                          {group.sourceGroupId} ·{" "}
                          {group.sourceVideoIds?.length || 1} 个视频 ·{" "}
                          {group.sealed ? "封存测试" : "开发/验证"}
                        </small>
                      </td>
                      <td>
                        {AI_VIDEO_SOURCES[group.sourceVideo?.sourceType] ||
                          "未填写"}
                      </td>
                      <td>
                        {AI_VIDEO_CATEGORIES[group.sourceVideo?.dataCategory] ||
                          "未填写"}
                      </td>
                      <td>
                        {group.itemCount}{" "}
                        {mode === "frames" ? "张图片" : "个片段"}
                        {group.includesNewData && (
                          <Status tone="warning">包含新增数据</Status>
                        )}
                      </td>
                      <td>
                        <div className="training-group-categories">
                          {group.categoryNames.map((name) => (
                            <span key={name}>{name}</span>
                          ))}
                          {!!group.noTargetCount && (
                            <span>无目标 {group.noTargetCount}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <select
                          aria-label={`调整${group.sourceVideo?.displayName || group.sourceVideoId}集合`}
                          value={group.split}
                          onChange={(event) => {
                            const updated = run(() =>
                              store.assignAiTrainingSourceGroup({
                                capabilityId: capability.id,
                                sourceVideoId: group.sourceVideoId,
                                split: event.target.value,
                              }),
                            );
                            if (updated)
                              setPageSuccess("采集组归属已调整，请保存划分。");
                          }}
                        >
                          <option value="unassigned" disabled>
                            未分配
                          </option>
                          <option value="train">训练集</option>
                          <option value="validation">验证集</option>
                          <option value="test">测试集</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination {...trainingGroupPagination} />
          </section>
          <section className="panel training-distribution">
            <PanelTitle title="类别分布" />
            {mode === "frames" && (
              <div className="training-object-summary">
                <span>
                  有目标图片<strong>{distribution.positiveItemCount}</strong>
                </span>
                <span>
                  无目标图片<strong>{distribution.noTargetItemCount}</strong>
                </span>
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{mode === "frames" ? "目标类别" : "动作类别"}</th>
                    <th>{mode === "frames" ? "图片数" : "片段数"}</th>
                    {mode === "frames" && <th>目标框数量</th>}
                    <th>训练集</th>
                    <th>验证集</th>
                    <th>测试集</th>
                    <th>未分配</th>
                    <th>分布提示</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.rows.map((row) => {
                    const risk =
                      !row.isBackground &&
                      row.itemCount > 0 &&
                      (!row.validation || !row.test);
                    return (
                      <tr key={row.categoryId}>
                        <td>
                          <strong>{row.name}</strong>
                          {row.isBackground && (
                            <small className="table-subline">背景类别</small>
                          )}
                        </td>
                        <td>{row.itemCount}</td>
                        {mode === "frames" && <td>{row.boxCount}</td>}
                        <td>{row.train}</td>
                        <td>{row.validation}</td>
                        <td>{row.test}</td>
                        <td>{row.unassigned}</td>
                        <td>
                          <Status
                            tone={
                              risk
                                ? "danger"
                                : row.itemCount
                                  ? "success"
                                  : "muted"
                            }
                          >
                            {risk
                              ? "验证或测试缺失"
                              : row.itemCount
                                ? "分布可检查"
                                : "暂无样本"}
                          </Status>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel training-readiness">
            <PanelTitle
              title="训练前检查"
              extra={
                <Status tone={readiness.ready ? "success" : "warning"}>
                  {readiness.ready ? "检查通过" : "需要处理"}
                </Status>
              }
            />
            <div className="training-check-grid">
              {checkRows.map(([key, label]) => (
                <article
                  key={key}
                  className={readiness.checks[key] ? "is-pass" : "is-blocked"}
                >
                  {readiness.checks[key] ? (
                    <CheckCircleFilled />
                  ) : (
                    <ExclamationCircleFilled />
                  )}
                  <span>{label}</span>
                </article>
              ))}
            </div>
            {!!readiness.blockers.length && (
              <div className="training-message-list is-blocked">
                <strong>阻止准备训练</strong>
                {readiness.blockers.map((message) => (
                  <p key={message}>{displayBusinessText(message)}</p>
                ))}
              </div>
            )}
            {!!readiness.warnings.length && (
              <div className="training-message-list is-warning">
                <strong>数据分布提示</strong>
                {readiness.warnings.map((message) => (
                  <p key={message}>{displayBusinessText(message)}</p>
                ))}
              </div>
            )}
            {pageError && (
              <p className="form-error" role="alert">
                {pageError}
              </p>
            )}
            {pageSuccess && <p className="form-success">{pageSuccess}</p>}
            <div className="training-footer-actions">
              <span>
                {displayBusinessText(
                  config?.lastSavedAt
                    ? `上次保存：${config.lastSavedAt} · ${config.lastSavedBy || "系统管理员"}`
                    : "当前划分尚未保存",
                )}
              </span>
              <Button onClick={save}>保存划分</Button>
              <Button
                type="primary"
                disabled={
                  !readiness.ready ||
                  config?.readinessStatus !== "ready" ||
                  ratioDirty
                }
                onClick={prepare}
              >
                准备训练
              </Button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

const AiTrainingStartForm = forwardRef(function AiTrainingStartForm(
  { capability, readiness, initialParams },
  ref,
) {
  const [params, setParams] = useState({
    ...defaultTrainingParams(capability?.type),
    ...(initialParams || {}),
  });
  const [advanced, setAdvanced] = useState(false);
  useImperativeHandle(ref, () => ({ getValue: () => ({ ...params }) }), [
    params,
  ]);
  const setNumber = (key, value) =>
    setParams((current) => ({ ...current, [key]: value }));
  const presets =
    capability?.type === "action_recognition"
      ? ACTION_MODEL_PRESETS
      : OBJECT_MODEL_PRESETS;
  return (
    <div className="training-start-form">
      <section className="training-snapshot-summary">
        <div>
          <small>训练集</small>
          <strong>{readiness?.counts?.train || 0}</strong>
        </div>
        <div>
          <small>验证集</small>
          <strong>{readiness?.counts?.validation || 0}</strong>
        </div>
        <div>
          <small>测试集</small>
          <strong>{readiness?.counts?.test || 0}</strong>
        </div>
      </section>
      <p className="form-info">
        开始后将锁定当前数据、标注、类别和训练参数快照。本次训练不受后续数据调整影响。
      </p>
      <div className="form-grid form-grid--2">
        <label className="field field--full">
          基础模型
          <select
            value={params.baseModel}
            onChange={(event) =>
              setParams((current) => ({
                ...current,
                baseModel: event.target.value,
              }))
            }
          >
            {presets.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} · {item.note}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          训练轮数
          <input
            type="number"
            min="1"
            max="500"
            value={params.epochs}
            onChange={(event) => setNumber("epochs", event.target.value)}
          />
        </label>
        <label className="field">
          批次大小
          <input
            type="number"
            min="1"
            value={params.batchSize}
            onChange={(event) => setNumber("batchSize", event.target.value)}
          />
        </label>
        {capability?.type === "object_detection" ? (
          <label className="field field--full">
            输入图片尺寸
            <select
              value={params.imageSize}
              onChange={(event) => setNumber("imageSize", event.target.value)}
            >
              <option value="416">416 × 416</option>
              <option value="512">512 × 512</option>
              <option value="640">640 × 640</option>
              <option value="960">960 × 960</option>
            </select>
          </label>
        ) : (
          <label className="field field--full">
            片段采样长度
            <select
              value={params.clipSampleLength}
              onChange={(event) =>
                setNumber("clipSampleLength", event.target.value)
              }
            >
              <option value="8">8 帧</option>
              <option value="16">16 帧</option>
              <option value="32">32 帧</option>
              <option value="64">64 帧</option>
            </select>
          </label>
        )}
      </div>
      <button
        className="training-advanced-toggle"
        type="button"
        onClick={() => setAdvanced((value) => !value)}
      >
        {advanced ? "收起高级参数" : "展开高级参数"}
      </button>
      {advanced &&
        (capability?.type === "object_detection" ? (
          <label className="field">
            初始学习率
            <input
              type="number"
              min="0.000001"
              max="1"
              step="0.0001"
              value={params.initialLearningRate}
              onChange={(event) =>
                setNumber("initialLearningRate", event.target.value)
              }
            />
          </label>
        ) : (
          <label className="field">
            采样间隔
            <input
              type="number"
              min="1"
              max="16"
              value={params.sampleInterval}
              onChange={(event) =>
                setNumber("sampleInterval", event.target.value)
              }
            />
          </label>
        ))}
    </div>
  );
});

function TrainingTaskResult({ task, sourceById }) {
  const result = task?.result;
  if (!result) return null;
  const objectMode = task.capabilityType === "object_detection";
  return (
    <section className="training-result">
      <PanelTitle title="测试结果" />
      <div className="training-result-metrics">
        {objectMode ? (
          <>
            <div>
              <small>精确率</small>
              <strong>{Math.round(result.precision * 1000) / 10}%</strong>
            </div>
            <div>
              <small>召回率</small>
              <strong>{Math.round(result.recall * 1000) / 10}%</strong>
            </div>
            <div>
              <small>综合检测指标</small>
              <strong>{Math.round(result.compositeMetric * 1000) / 10}%</strong>
            </div>
          </>
        ) : (
          <div>
            <small>总体准确率</small>
            <strong>{Math.round(result.overallAccuracy * 1000) / 10}%</strong>
          </div>
        )}
        <div>
          <small>测试样本</small>
          <strong>{result.testSampleCount || 0}</strong>
        </div>
      </div>
      <div className="table-wrap training-category-result">
        <table>
          <thead>
            <tr>
              <th>类别</th>
              {objectMode ? (
                <>
                  <th>精确率</th>
                  <th>召回率</th>
                </>
              ) : (
                <th>准确率</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(result.perCategory || []).map((item) => (
              <tr key={item.categoryId}>
                <td>{item.name || "失效类别"}</td>
                {objectMode ? (
                  <>
                    <td>{Math.round(item.precision * 1000) / 10}%</td>
                    <td>{Math.round(item.recall * 1000) / 10}%</td>
                  </>
                ) : (
                  <td>{Math.round(item.accuracy * 1000) / 10}%</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!objectMode && !!result.confusionMatrix?.length && (
        <div className="training-confusion-matrix">
          <strong>混淆矩阵</strong>
          {result.confusionMatrix.map((row) => (
            <span key={row.categoryId}>{row.values.join(" · ")}</span>
          ))}
        </div>
      )}
      {!!result.predictions?.length && (
        <div className="training-predictions">
          <h3>测试样本预测预览</h3>
          <div>
            {result.predictions.map((prediction) => (
              <article key={prediction.itemId}>
                {objectMode ? (
                  <img src={frameImageUrl(prediction)} alt="目标检测预测图片" />
                ) : (
                  <span className="training-clip-preview">
                    <PlayCircleFilled />
                  </span>
                )}
                <strong>
                  {sourceById[prediction.sourceVideoId]?.displayName ||
                    prediction.itemId}
                </strong>
                <small>
                  {objectMode
                    ? formatDerivedTimecode(
                        (prediction.sourceTimeMs || 0) / 1000,
                        true,
                      )
                    : `${formatDerivedTimecode((prediction.startMs || 0) / 1000)} – ${formatDerivedTimecode((prediction.endMs || 0) / 1000)}`}
                  {` · 置信度 ${Math.round((prediction.confidence || 0) * 100)}%`}
                </small>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AiModelTrainingPage({ setModal }) {
  const store = usePrototypeData();
  const nav = useNavigate();
  const location = useLocation();
  const startRef = useRef(null);
  const selectedId =
    new URLSearchParams(location.search).get("capabilityId") || "";
  const capabilities = (store.data.aiCapabilities || []).filter((item) =>
    ["object_detection", "action_recognition"].includes(item.type),
  );
  const capability = capabilities.find((item) => item.id === selectedId);
  const mode = capability?.type === "object_detection" ? "frames" : "clips";
  const allItems = capability
    ? (mode === "frames"
        ? store.data.aiFrames || []
        : store.data.aiClips || []
      ).filter((item) => item.capabilityId === capability.id)
    : [];
  const sourceVideos = (store.data.aiSourceVideos || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const sourceById = Object.fromEntries(
    sourceVideos.map((item) => [item.id, item]),
  );
  const categories = (store.data.aiAnnotationCategories || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const config = (store.data.aiTrainingDataConfigs || []).find(
    (item) => item.capabilityId === capability?.id,
  );
  const candidateResult = collectTrainingCandidates({
    capability,
    items: allItems,
    sourceVideos,
    categories,
  });
  const groups = groupTrainingCandidates({
    candidates: candidateResult.candidates,
    sourceVideos,
    categories,
    capability,
    config,
  });
  const readiness = buildTrainingReadiness({
    capability,
    candidates: candidateResult.candidates,
    groups,
    categories,
    config,
  });
  const tasks = (store.data.aiTrainingTasks || [])
    .filter((item) => item.capabilityId === capability?.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const {
    pageItems: pagedTrainingTasks,
    paginationProps: trainingTaskPagination,
  } = useListPagination(tasks);
  const activeTask = tasks.find((item) =>
    ACTIVE_TRAINING_STATUSES.includes(item.status),
  );
  const latestCandidate = getCurrentCandidateTask(
    capability,
    tasks,
    store.data.aiModelPublicationRecords || [],
  );
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [pageError, setPageError] = useState("");
  useEffect(() => {
    setSelectedTaskId(tasks[0]?.id || "");
    setPageError("");
  }, [capability?.id]);
  const selectedTask =
    tasks.find((item) => item.id === selectedTaskId) || tasks[0];
  const canStart =
    !!capability &&
    readiness.ready &&
    config?.readinessStatus === "ready" &&
    !activeTask;
  const startTraining = (initialParams) => {
    if (!canStart) return;
    setModal({
      eyebrow: "创建训练任务",
      title: `${capability.name} · ${AI_CAPABILITY_TYPES[capability.type]}`,
      size: "large",
      confirmText: "开始训练",
      content: (
        <AiTrainingStartForm
          ref={startRef}
          capability={capability}
          readiness={readiness}
          initialParams={initialParams}
        />
      ),
      onConfirm: () => {
        const created = store.startAiModelTraining({
          capabilityId: capability.id,
          params: startRef.current.getValue(),
        });
        setSelectedTaskId(created.id);
        return `${capability.name}训练任务已开始`;
      },
    });
  };
  const run = (action) => {
    setPageError("");
    try {
      const result = action();
      if (result?.id) setSelectedTaskId(result.id);
    } catch (problem) {
      setPageError(
        problem instanceof Error ? problem.message : "操作失败，请重试。",
      );
    }
  };
  const requestCancel = (task) =>
    setModal({
      title: "取消训练任务",
      content: <p>取消后会保留任务记录和已有日志，是否继续？</p>,
      confirmText: "确认取消",
      onConfirm: () => {
        store.cancelAiModelTraining(task.id);
        return "训练任务已取消";
      },
    });
  const requestRetry = (task) =>
    setModal({
      title: "使用原快照与参数重试",
      content: (
        <p>将创建一条新的训练任务，并复用失败任务锁定的数据快照与训练参数。</p>
      ),
      confirmText: "确认重试",
      onConfirm: () => {
        const created = store.retryAiModelTraining(task.id);
        setSelectedTaskId(created.id);
        return "新的训练任务已开始";
      },
    });
  return (
    <>
      <PageHeader
        title="模型训练"
        subtitle="基于当前AI能力的训练数据创建任务，跟踪训练、验证与测试结果。"
        actions={
          <Button
            type="primary"
            disabled={!canStart}
            icon={<PlayCircleFilled />}
            onClick={() => startTraining()}
          >
            开始训练
          </Button>
        }
      />
      <section className="panel ai-capability-context model-training-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/training?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/training`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type]} ·{" "}
                {modelSourceLabel(item.currentPublishedModel)}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-cleaning-context-summary">
            <span>
              能力状态<strong>{capability.status || "未设置"}</strong>
            </span>
            <span>
              当前模型
              <strong>{capability.currentModelStatus || "未训练"}</strong>
            </span>
            <span>
              训练任务<strong>{tasks.length}</strong>
            </span>
          </div>
        )}
      </section>
      {capability && (
        <>
          <ExistingModelPanel
            key={capability.id}
            capabilityId={capability.id}
          />
          <section className="enhancement-card">
            当前训练、验证与测试为原型模拟；事件级完整视频指标与现场时延尚未实测。手部关键点可按效果选用，不是所有动作必须标注。
          </section>
        </>
      )}
      {!selectedId ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <DatabaseOutlined />
            <h2>请先选择AI能力</h2>
            <p>训练任务按AI能力独立管理。</p>
          </div>
        </section>
      ) : !capability ? (
        <section className="panel">
          <div className="empty-state">
            <ExclamationCircleFilled />
            <h2>所选AI能力不存在</h2>
            <p>请重新选择有效的AI能力。</p>
          </div>
        </section>
      ) : (
        <>
          <section
            className={`panel training-readiness-card ${canStart ? "is-ready" : "is-blocked"}`}
          >
            <div>
              {canStart ? <CheckCircleFilled /> : <AlertOutlined />}
              <span>
                <strong>
                  {canStart
                    ? "训练数据已就绪"
                    : activeTask
                      ? "已有训练任务进行中"
                      : "训练数据尚未就绪"}
                </strong>
                <small>
                  {activeTask
                    ? `任务 ${activeTask.id} 当前处于${TRAINING_TASK_STATUSES[activeTask.status]}。`
                    : readiness.blockers[0] ||
                      "创建任务时会再次校验当前数据，并锁定不可变快照。"}
                </small>
              </span>
            </div>
            {!canStart && !activeTask && (
              <Button
                onClick={() =>
                  nav(
                    `${AI_LIBRARY_PATH}/training-data?capabilityId=${encodeURIComponent(capability.id)}`,
                  )
                }
              >
                返回训练数据
              </Button>
            )}
          </section>
          {capability.status === "已发布" && (
            <section className="training-published-note">
              <CheckCircleFilled />
              <span>
                <strong>线上已发布模型继续生效</strong>
                <small>
                  本页创建的新训练任务只生成候选模型，不会自动替换当前已发布模型。
                </small>
              </span>
            </section>
          )}
          {latestCandidate && (
            <section className="panel training-candidate-card">
              <div>
                <span>当前候选模型</span>
                <strong>{latestCandidate.modelArtifactId}</strong>
                <small>
                  来自任务 {latestCandidate.id} ·{" "}
                  {displayBusinessText(latestCandidate.completedAt)}
                </small>
              </div>
              <Status tone="warning">待发布</Status>
              <Button
                onClick={() =>
                  nav(
                    `${AI_LIBRARY_PATH}/publishing?capabilityId=${encodeURIComponent(capability.id)}`,
                  )
                }
              >
                前往模型发布
              </Button>
            </section>
          )}
          {activeTask && (
            <section className="panel training-active-card">
              <div className="training-active-header">
                <div>
                  <small>进行中的任务</small>
                  <h2>{TRAINING_TASK_STATUSES[activeTask.status]}</h2>
                  <span>{activeTask.id}</span>
                </div>
                <strong>{activeTask.progress || 0}%</strong>
              </div>
              <div className="training-progress-track">
                <span style={{ width: `${activeTask.progress || 0}%` }} />
              </div>
              <div className="training-stage-track">
                {["training", "validating", "testing", "completed"].map(
                  (stage, index) => {
                    const currentIndex = [
                      "training",
                      "validating",
                      "testing",
                      "completed",
                    ].indexOf(activeTask.status);
                    return (
                      <span
                        key={stage}
                        className={index <= currentIndex ? "is-active" : ""}
                      >
                        {TRAINING_TASK_STATUSES[stage]}
                      </span>
                    );
                  },
                )}
              </div>
              <div className="training-active-actions">
                <span>
                  {activeTask.status === "training"
                    ? `训练轮次 ${activeTask.currentEpoch || 0} / ${activeTask.trainingParams?.epochs || 0}`
                    : "任务已完成当前阶段，等待下一阶段结果。"}
                </span>
                {["pending", "training"].includes(activeTask.status) && (
                  <Button onClick={() => requestCancel(activeTask)}>
                    取消任务
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() =>
                    run(() => store.advanceAiModelTraining(activeTask.id))
                  }
                >
                  刷新任务状态
                </Button>
              </div>
            </section>
          )}
          {pageError && (
            <p className="form-error" role="alert">
              {pageError}
            </p>
          )}
          <div className="training-page-grid">
            <section className="panel training-history">
              <PanelTitle
                title="训练任务记录"
                action={<span>{tasks.length} 条</span>}
              />
              {pagedTrainingTasks.map((task) => (
                <button
                  key={task.id}
                  className={selectedTask?.id === task.id ? "is-active" : ""}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <span>
                    <strong>{task.id}</strong>
                    <small>
                      {displayBusinessText(task.createdAt)} ·{" "}
                      {task.createdBy || "系统管理员"}
                    </small>
                  </span>
                  <Status>
                    {TRAINING_TASK_STATUSES[task.status] || task.status}
                  </Status>
                </button>
              ))}
              {!tasks.length && (
                <div className="empty-state">
                  <HistoryOutlined />
                  <h2>暂无训练任务</h2>
                  <p>训练数据准备完成后可以创建第一条任务。</p>
                </div>
              )}
              <TablePagination {...trainingTaskPagination} />
            </section>
            {selectedTask && (
              <section className="panel training-task-detail">
                <header>
                  <div>
                    <span>任务详情</span>
                    <h2>{selectedTask.id}</h2>
                  </div>
                  <Status>
                    {TRAINING_TASK_STATUSES[selectedTask.status] ||
                      selectedTask.status}
                  </Status>
                </header>
                <div className="training-snapshot-summary">
                  <div>
                    <small>训练集</small>
                    <strong>{selectedTask.snapshotSummary?.train || 0}</strong>
                  </div>
                  <div>
                    <small>验证集</small>
                    <strong>
                      {selectedTask.snapshotSummary?.validation || 0}
                    </strong>
                  </div>
                  <div>
                    <small>测试集</small>
                    <strong>{selectedTask.snapshotSummary?.test || 0}</strong>
                  </div>
                  <div>
                    <small>类别</small>
                    <strong>
                      {selectedTask.snapshotSummary?.categoryCount || 0}
                    </strong>
                  </div>
                </div>
                <dl className="training-param-list">
                  <div>
                    <dt>基础模型</dt>
                    <dd>
                      {[...OBJECT_MODEL_PRESETS, ...ACTION_MODEL_PRESETS].find(
                        (item) =>
                          item.value === selectedTask.trainingParams?.baseModel,
                      )?.label || selectedTask.trainingParams?.baseModel}
                    </dd>
                  </div>
                  <div>
                    <dt>训练轮数</dt>
                    <dd>{selectedTask.trainingParams?.epochs}</dd>
                  </div>
                  <div>
                    <dt>批次大小</dt>
                    <dd>{selectedTask.trainingParams?.batchSize}</dd>
                  </div>
                  <div>
                    <dt>快照时间</dt>
                    <dd>
                      {displayBusinessText(
                        selectedTask.dataSnapshot?.capturedAt ||
                          selectedTask.createdAt,
                      )}
                    </dd>
                  </div>
                </dl>
                {selectedTask.failureReason && (
                  <div className="training-failure">
                    <ExclamationCircleFilled />
                    <span>
                      <strong>失败原因</strong>
                      <small>{selectedTask.failureReason}</small>
                    </span>
                  </div>
                )}
                <div className="training-detail-actions">
                  {selectedTask.status === "failed" && (
                    <Button
                      type="primary"
                      onClick={() => requestRetry(selectedTask)}
                    >
                      使用原参数重试
                    </Button>
                  )}
                  {selectedTask.status === "failed" && (
                    <Button
                      disabled={!canStart}
                      onClick={() => startTraining(selectedTask.trainingParams)}
                    >
                      修改参数创建新任务
                    </Button>
                  )}
                </div>
                <TrainingTaskResult
                  task={selectedTask}
                  sourceById={sourceById}
                />
                <section className="training-log-list">
                  <h3>运行日志</h3>
                  {(selectedTask.logs || []).map((log, index) => (
                    <div key={`${log.time}-${index}`}>
                      <time>{displayBusinessText(log.time)}</time>
                      <b>{log.stage}</b>
                      <span>{log.message}</span>
                    </div>
                  ))}
                  {!selectedTask.logs?.length && (
                    <p className="hint">暂无运行日志。</p>
                  )}
                </section>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}

function PublishedModelMetrics({ capability, model }) {
  const metrics = model?.metricSummary || {};
  const actionMode = capability?.type === "action_recognition";
  return (
    <div className="publication-metric-summary">
      {actionMode ? (
        <div>
          <small>总体准确率</small>
          <strong>
            {Number.isFinite(metrics.overallAccuracy)
              ? `${Math.round(metrics.overallAccuracy * 1000) / 10}%`
              : "—"}
          </strong>
        </div>
      ) : (
        <>
          <div>
            <small>精确率</small>
            <strong>
              {Number.isFinite(metrics.precision)
                ? `${Math.round(metrics.precision * 1000) / 10}%`
                : "—"}
            </strong>
          </div>
          <div>
            <small>召回率</small>
            <strong>
              {Number.isFinite(metrics.recall)
                ? `${Math.round(metrics.recall * 1000) / 10}%`
                : "—"}
            </strong>
          </div>
          <div>
            <small>综合检测指标</small>
            <strong>
              {Number.isFinite(metrics.compositeMetric)
                ? `${Math.round(metrics.compositeMetric * 1000) / 10}%`
                : "—"}
            </strong>
          </div>
        </>
      )}
      <div>
        <small>测试样本</small>
        <strong>{metrics.testSampleCount ?? "—"}</strong>
      </div>
    </div>
  );
}

function AiModelPublishingPage({ setModal }) {
  const store = usePrototypeData();
  const nav = useNavigate();
  const location = useLocation();
  const selectedId =
    new URLSearchParams(location.search).get("capabilityId") || "";
  const capabilities = (store.data.aiCapabilities || []).filter((item) =>
    ["object_detection", "action_recognition"].includes(item.type),
  );
  const capability = capabilities.find((item) => item.id === selectedId);
  const tasks = (store.data.aiTrainingTasks || []).filter(
    (item) => item.capabilityId === capability?.id,
  );
  const publicationRecords = (store.data.aiModelPublicationRecords || [])
    .filter((item) => item.capabilityId === capability?.id)
    .sort((left, right) =>
      String(right.publishedAt).localeCompare(String(left.publishedAt)),
    );
  const {
    pageItems: pagedPublicationRecords,
    paginationProps: publicationPagination,
  } = useListPagination(publicationRecords);
  const candidate = getCurrentCandidateTask(
    capability,
    tasks,
    store.data.aiModelPublicationRecords || [],
  );
  const readiness = buildPublicationReadiness(candidate);
  const activeTask = tasks.find((item) =>
    ACTIVE_TRAINING_STATUSES.includes(item.status),
  );
  const sourceById = Object.fromEntries(
    (store.data.aiSourceVideos || [])
      .filter((item) => item.capabilityId === capability?.id)
      .map((item) => [item.id, item]),
  );
  const currentModel = capability?.currentPublishedModel || null;
  const referenceCount = capabilityReferenceCount(capability);
  const publish = () => {
    const replacing = Boolean(currentModel?.modelArtifactId);
    setModal({
      eyebrow: replacing ? "重新发布确认" : "首次发布确认",
      title: replacing ? "确认替换当前已发布模型" : "确认发布当前模型",
      confirmText: replacing ? "确认重新发布" : "确认发布",
      content: (
        <div className="publication-confirm-copy">
          {replacing ? (
            <>
              <p>
                发布后，新候选模型将替换当前模型，训练任务和发布记录仍保留。
              </p>
              {referenceCount > 0 && (
                <div className="publication-impact-warning">
                  <AlertOutlined />
                  <span>
                    <strong>
                      当前AI能力已被 {referenceCount} 个AI能力配置引用
                    </strong>
                    <small>
                      原有判断配置和引用关系保持不变，相关工位现场验证状态将变为“待重新验证”。
                    </small>
                  </span>
                </div>
              )}
            </>
          ) : (
            <p>
              发布后，该AI能力将变为“已发布”，并可被后续AI能力配置选择使用。
            </p>
          )}
        </div>
      ),
      onConfirm: () => {
        const result = store.publishAiCapabilityModel({
          capabilityId: capability.id,
          trainingTaskId: candidate.id,
        });
        return result.record.replacedExistingModel
          ? `当前模型已更新${result.record.affectedConfigCount ? `，${result.record.affectedConfigCount} 个相关配置待重新验证` : ""}`
          : `${capability.name}已发布`;
      },
    });
  };
  const changeActivation = () => {
    const stopped = capability.status === "已停用";
    if (stopped && !canReactivateCapabilityModel(capability)) {
      setModal({
        title: "当前能力不能重新启用",
        content: (
          <p>
            当前已发布模型不存在或文件状态异常，请先完成新的模型训练与发布。
          </p>
        ),
        dismissOnly: true,
      });
      return;
    }
    setModal({
      eyebrow: stopped ? "重新启用" : "停用能力",
      title: stopped
        ? `重新启用“${capability.name}”`
        : `停用“${capability.name}”`,
      confirmText: stopped ? "确认重新启用" : "确认停用",
      content: stopped ? (
        <p>重新启用后，该能力可再次供新的AI能力配置选择。</p>
      ) : (
        <div className="publication-confirm-copy">
          <p>停用后，当前已发布模型、训练数据、训练任务和发布记录都会保留。</p>
          {referenceCount > 0 && (
            <div className="publication-impact-warning">
              <AlertOutlined />
              <span>
                <strong>
                  当前能力正在被 {referenceCount} 个AI能力配置引用
                </strong>
                <small>停用后不再允许新增引用；已有引用不会自动删除。</small>
              </span>
            </div>
          )}
        </div>
      ),
      onConfirm: () => {
        if (stopped) store.reactivateAiCapability(capability.id);
        else store.deactivateAiCapability(capability.id);
        return `${capability.name}已${stopped ? "重新启用" : "停用"}`;
      },
    });
  };
  const checkRows = [
    ["taskCompleted", "训练任务已完成"],
    ["modelArtifactExists", "模型产物完整有效"],
    ["validationResultExists", "验证结果已生成"],
    ["testResultExists", "独立测试结果已生成"],
    ["testDataValid", "测试集来自当前任务快照且非空"],
    ["categoryResultsComplete", "主要类别均有测试结果"],
  ];
  return (
    <>
      <PageHeader
        title="模型发布"
        subtitle="查看候选模型的验证与测试结果，人工确认平台当前正式可用的模型。"
        actions={
          capability &&
          ["已发布", "已停用"].includes(capability.status) &&
          currentModel ? (
            <Button onClick={changeActivation}>
              {capability.status === "已停用" ? "重新启用" : "停用能力"}
            </Button>
          ) : null
        }
      />
      <section className="panel ai-capability-context model-publishing-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={capability?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/publishing?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/publishing`,
              )
            }
          >
            <option value="">请选择AI能力</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {AI_CAPABILITY_TYPES[item.type]} ·{" "}
                {modelSourceLabel(item.currentPublishedModel)}
              </option>
            ))}
          </select>
        </label>
        {capability && (
          <div className="ai-cleaning-context-summary">
            <span>
              能力类型<strong>{AI_CAPABILITY_TYPES[capability.type]}</strong>
            </span>
            <span>
              当前状态<strong>{capability.status || "未设置"}</strong>
            </span>
            <span>
              被引用<strong>{referenceCount}</strong>
            </span>
          </div>
        )}
      </section>
      {capability && (
        <>
          <ExistingModelPanel
            key={capability.id}
            capabilityId={capability.id}
          />
          <section className="enhancement-card">
            发布当前候选用于原型演示。历史结果未核实；真实模型接入与独立现场评测完成后，才可进入真实启用流程。
          </section>
        </>
      )}
      {!selectedId ? (
        <section className="panel ai-library-workspace">
          <div className="empty-state ai-library-empty">
            <CloudDownloadOutlined />
            <h2>请先选择AI能力</h2>
            <p>模型发布按AI能力独立管理。</p>
          </div>
        </section>
      ) : !capability ? (
        <section className="panel">
          <div className="empty-state">
            <ExclamationCircleFilled />
            <h2>所选AI能力不存在</h2>
            <p>请重新选择有效的AI能力。</p>
          </div>
        </section>
      ) : (
        <>
          <div className="publication-model-grid">
            <section className="panel published-model-card">
              <PanelTitle
                title="当前已发布模型"
                action={
                  currentModel ? <Status>{capability.status}</Status> : null
                }
              />
              {currentModel ? (
                <>
                  <div className="published-model-identity">
                    <CheckCircleFilled />
                    <span>
                      <strong>{currentModel.modelArtifactId}</strong>
                      <small>
                        来源{" "}
                        {currentModel.trainingTaskId ||
                          currentModel.candidateId ||
                          "历史未记录"}{" "}
                        · {modelSourceLabel(currentModel)} ·{" "}
                        {displayBusinessText(currentModel.publishedAt)}
                      </small>
                    </span>
                  </div>
                  <PublishedModelMetrics
                    capability={capability}
                    model={currentModel}
                  />
                  <p className="hint">
                    发布人：{currentModel.publishedBy || "系统管理员"} ·
                    当前作为平台正式可用模型
                  </p>
                </>
              ) : (
                <div className="publication-empty-model">
                  <CloudDownloadOutlined />
                  <strong>尚无已发布模型</strong>
                  <small>候选模型经过人工确认后会成为当前已发布模型。</small>
                </div>
              )}
            </section>
            <section
              className={`panel candidate-model-card ${candidate ? "has-candidate" : ""}`}
            >
              <PanelTitle
                title="候选模型"
                action={
                  candidate ? <Status tone="warning">待确认</Status> : null
                }
              />
              {candidate ? (
                <>
                  <div className="published-model-identity">
                    <ClockCircleOutlined />
                    <span>
                      <strong>{candidate.modelArtifactId}</strong>
                      <small>
                        来源任务 {candidate.id} ·{" "}
                        {displayBusinessText(
                          candidate.completedAt || candidate.updatedAt,
                        )}
                      </small>
                    </span>
                  </div>
                  <PublishedModelMetrics
                    capability={capability}
                    model={{ metricSummary: candidate.result }}
                  />
                  <p className="hint">
                    {currentModel
                      ? "当前已发布模型继续正常使用，发布后才会由该候选模型替换。"
                      : "该训练结果尚未发布，当前能力还不能供新的AI能力配置选择。"}
                  </p>
                </>
              ) : (
                <div className="publication-empty-model">
                  {activeTask ? <ReloadOutlined /> : <DatabaseOutlined />}
                  <strong>
                    {activeTask ? "模型正在训练" : "暂无可发布模型"}
                  </strong>
                  <small>
                    {activeTask
                      ? "训练完成并通过测试后，可在此确认发布。"
                      : currentModel
                        ? "当前没有新的候选模型。"
                        : "请先前往模型训练完成训练任务。"}
                  </small>
                  <Button
                    onClick={() =>
                      nav(
                        `${AI_LIBRARY_PATH}/training?capabilityId=${encodeURIComponent(capability.id)}`,
                      )
                    }
                  >
                    {activeTask ? "查看训练任务" : "去模型训练"}
                  </Button>
                </div>
              )}
            </section>
          </div>
          {candidate && (
            <>
              <section className="panel publication-readiness">
                <PanelTitle
                  title="发布前检查"
                  action={
                    <Status tone={readiness.ready ? "success" : "danger"}>
                      {readiness.ready ? "允许发布" : "暂不能发布"}
                    </Status>
                  }
                />
                <div className="publication-check-grid">
                  {checkRows.map(([key, label]) => (
                    <article
                      key={key}
                      className={readiness.checks[key] ? "is-pass" : "is-fail"}
                    >
                      {readiness.checks[key] ? (
                        <CheckCircleFilled />
                      ) : (
                        <ExclamationCircleFilled />
                      )}
                      <span>
                        <strong>{label}</strong>
                        <small>
                          {readiness.checks[key] ? "已通过" : "未通过"}
                        </small>
                      </span>
                    </article>
                  ))}
                </div>
                {!!readiness.blockers.length && (
                  <div className="training-message-list is-blocked">
                    <strong>发布阻止项</strong>
                    {readiness.blockers.map((message) => (
                      <p key={message}>{displayBusinessText(message)}</p>
                    ))}
                  </div>
                )}
                {referenceCount > 0 && currentModel && (
                  <div className="publication-impact-note">
                    <AlertOutlined />
                    <span>
                      <strong>
                        重新发布将影响 {referenceCount} 个AI能力配置
                      </strong>
                      <small>
                        引用与判断条件保持不变；相关工位现场验证将进入“待重新验证”。
                      </small>
                    </span>
                  </div>
                )}
                <div className="publication-submit-row">
                  <span>指标用于人工判断，本期不设置统一数值门槛。</span>
                  <Button
                    type="primary"
                    disabled={!readiness.ready}
                    icon={<CloudDownloadOutlined />}
                    onClick={publish}
                  >
                    {currentModel ? "重新发布模型" : "发布模型"}
                  </Button>
                </div>
              </section>
              <section className="panel publication-test-result">
                <TrainingTaskResult task={candidate} sourceById={sourceById} />
              </section>
            </>
          )}
          <section className="panel publication-records">
            <PanelTitle
              title="发布记录"
              action={<span>{publicationRecords.length} 条</span>}
            />
            <p className="hint">
              发布与恢复均记录来源；恢复后，相关工位需重新验证，原有会话快照继续保留。
            </p>
            <ModelRecoveryPanel capabilityId={capability.id} />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>发布时间</th>
                    <th>来源训练 / 适配候选</th>
                    <th>发布人</th>
                    <th>发布类型</th>
                    <th>影响配置</th>
                    <th>指标摘要</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPublicationRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{displayBusinessText(record.publishedAt)}</td>
                      <td>
                        {record.trainingTaskId ||
                          record.candidateId ||
                          "历史未记录"}
                        <small>{modelSourceLabel(record)}</small>
                      </td>
                      <td>{record.publishedBy}</td>
                      <td>
                        {record.publicationType === "restore"
                          ? "恢复历史模型"
                          : record.replacedExistingModel
                            ? "替换当前模型"
                            : "首次发布"}
                      </td>
                      <td>{record.affectedConfigCount || 0}</td>
                      <td>
                        {capability.type === "action_recognition"
                          ? `准确率 ${Number.isFinite(record.metricSummary?.overallAccuracy) ? `${Math.round(record.metricSummary.overallAccuracy * 1000) / 10}%` : "—"}`
                          : `综合指标 ${Number.isFinite(record.metricSummary?.compositeMetric) ? `${Math.round(record.metricSummary.compositeMetric * 1000) / 10}%` : "—"}`}
                      </td>
                    </tr>
                  ))}
                  {!publicationRecords.length && (
                    <tr>
                      <td className="table-empty" colSpan={6}>
                        暂无发布记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination {...publicationPagination} />
          </section>
        </>
      )}
    </>
  );
}

function AiCapabilityLibrary({ setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const { section: sectionPath } = useParams();
  const { data } = usePrototypeData();
  const section = AI_LIBRARY_SECTIONS.find((item) => item.path === sectionPath);
  const selectedId = new URLSearchParams(location.search).get("capabilityId");
  const capabilities = Array.isArray(data.aiCapabilities)
    ? data.aiCapabilities
    : [];
  const selected = capabilities.find((item) => item.id === selectedId);
  if (!section)
    return (
      <MissingState title="功能页面不存在" backTo={AI_CAPABILITIES_PATH} />
    );
  if (sectionPath === "capabilities")
    return <AiCapabilityList setModal={setModal} />;
  if (sectionPath === "videos")
    return <AiVideoManagement setModal={setModal} />;
  if (sectionPath === "extraction")
    return <AiExtractionPage setModal={setModal} />;
  if (sectionPath === "auto-cleaning")
    return <AiAutoCleaningPage setModal={setModal} />;
  if (sectionPath === "manual-cleaning")
    return <AiManualCleaningPage setModal={setModal} />;
  if (sectionPath === "annotation")
    return <AiAnnotationPage setModal={setModal} />;
  if (sectionPath === "training-data")
    return <AiTrainingDataPage setModal={setModal} />;
  if (sectionPath === "training")
    return <AiModelTrainingPage setModal={setModal} />;
  if (sectionPath === "publishing")
    return <AiModelPublishingPage setModal={setModal} />;
  return (
    <>
      <PageHeader title={section.title} subtitle={section.description} />
      <section className="panel ai-capability-context">
        <label className="field">
          当前AI能力
          <select
            aria-label="当前AI能力"
            value={selected?.id || ""}
            onChange={(event) =>
              nav(
                event.target.value
                  ? `${AI_LIBRARY_PATH}/${sectionPath}?capabilityId=${encodeURIComponent(event.target.value)}`
                  : `${AI_LIBRARY_PATH}/${sectionPath}`,
              )
            }
          >
            <option value="">请选择</option>
            {capabilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {selectedId && !selected && (
          <p className="form-error" role="alert">
            所选AI能力不存在，请重新选择。
          </p>
        )}
      </section>
      <section className="panel ai-library-workspace ai-entry-table">
        <div className="empty-state ai-library-empty">
          <DatabaseOutlined />
          <h2>{selected ? `${selected.name} · 暂无内容` : "请选择AI能力"}</h2>
          <p>
            {selected
              ? `${section.title}的详细功能将在后续任务中开放。`
              : "请先在“能力管理”中创建或选择一个AI能力。"}
          </p>
          {!selected && (
            <Button onClick={() => nav(AI_CAPABILITIES_PATH)}>
              前往能力管理
            </Button>
          )}
        </div>
      </section>
    </>
  );
}

// 旧版AI评价管理暂时屏蔽：包含Mapping、Dataset、AI Package、
// Workstation Profile和Compatibility等早期架构逻辑。
// 一期正式入口为SOP标准 → AI能力配置 → AI能力库；旧实现仅保留历史兼容，
// 不得继续作为一期正式业务入口扩展。
function AiEvaluationList() {
  const nav = useNavigate();
  const store = usePrototypeData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部状态");
  const published = store.data.sops.filter((sop) => sop.status === "已发布");
  const entries = published.map((sop) => {
    const status = store.getSopAiEvaluationStatus(sop.id);
    const datasets = store.data.datasets.filter(
      (item) => item.sopId === sop.id,
    );
    const models = store.data.models.filter((item) => item.sopId === sop.id);
    const currentDataset = status.dataset || newestVersion(datasets);
    const currentModel = status.model || newestVersion(models);
    const updatedAt = [
      sop.updatedAt,
      currentDataset?.updatedAt,
      currentModel?.updatedAt,
    ]
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0];
    return { sop, status, currentDataset, currentModel, updatedAt };
  });
  const visible = entries.filter(
    (entry) =>
      (filter === "全部状态" || entry.status.status === filter) &&
      entry.sop.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const count = (matcher) => entries.filter(matcher).length;
  return (
    <>
      <PageHeader
        title="AI评价管理"
        subtitle="以已发布 SOP 为入口，管理数据生产、数据集、AI能力包和工位现场验证"
      />
      <section className="sop-boundary-note">
        <SafetyCertificateOutlined />
        <div>
          <strong>AI 只适配教师发布的标准，不生成或改写 SOP</strong>
          <p>
            当前仅使用摄像头视频；无法可靠判断时默认通过，由教师按需抽查和扣分。
          </p>
        </div>
        <Status tone="success">
          当前实训标准 · AI配置、数据及模型独立管理
        </Status>
      </section>
      <div className="metric-grid ai-evaluation-metrics">
        <Metric
          label="已发布 SOP"
          value={entries.length}
          hint="进入 AI 适配范围"
          icon={<BookOutlined />}
          tone="blue"
        />
        <Metric
          label="可用"
          value={count((item) => item.status.status === "可用")}
          hint="全部目标工位已通过"
          icon={<CheckCircleOutlined />}
          tone="green"
        />
        <Metric
          label="配置中"
          value={count((item) =>
            ["配置中", "部分可用"].includes(item.status.status),
          )}
          hint="数据、AI能力包或验证未完成"
          icon={<ReloadOutlined />}
          tone="amber"
        />
        <Metric
          label="未配置"
          value={count((item) => item.status.status === "未配置")}
          hint="尚未形成可用 AI能力包"
          icon={<DatabaseOutlined />}
          tone="purple"
        />
      </div>
      <section className="panel panel--table">
        <Toolbar
          placeholder="搜索实训标准名称"
          filters={["全部状态", "可用", "部分可用", "配置中", "未配置"]}
          value={query}
          filterValue={filter}
          onChange={setQuery}
          onFilterChange={setFilter}
          onRefresh={() => {
            setQuery("");
            setFilter("全部状态");
          }}
        />
        <DataTable
          pagination
          columns={[
            "实训标准",
            "评价映射",
            "自动目标",
            "数据集",
            "AI能力包",
            "工位验证",
            "AI能力",
            "更新时间",
          ]}
          rows={visible.map((entry) => [
            entry.sop.name,
            entry.status.mappingStatus.status,
            `${entry.status.automaticTargetCount} 步`,
            entry.currentDataset
              ? `${entry.currentDataset.version} · ${entry.currentDataset.status}`
              : "未创建",
            entry.currentModel
              ? `${entry.currentModel.version} · ${entry.currentModel.status}`
              : "未创建",
            `${entry.status.validatedWorkstationCount}/${entry.status.targetWorkstationCount} 工位`,
            entry.status.status,
            entry.updatedAt || "—",
          ])}
          statusColumns={[1, 3, 4, 6]}
          onView={(_, index) =>
            nav(`/admin/ai-evaluation/${visible[index].sop.id}`)
          }
          viewLabel="进入适配"
          rowKey={(_, index) => visible[index].sop.id}
        />
      </section>
    </>
  );
}

const ModelValidationFailureForm = forwardRef(
  function ModelValidationFailureForm(_, ref) {
    const [reason, setReason] = useState("");
    useImperativeHandle(ref, () => ({
      getValue() {
        if (!reason.trim()) throw new Error("请填写验证未通过原因。");
        return reason.trim();
      },
    }));
    return (
      <label className="field">
        <FieldLabel required>未通过原因</FieldLabel>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="例如：步骤04使用错误工具的识别召回率不足。"
        />
      </label>
    );
  },
);

function AiMappingPanel({ sop, mappingStatus, store }) {
  const source = mappingStatus.mapping;
  const [draft, setDraft] = useState(() =>
    source ? JSON.parse(JSON.stringify(source)) : null,
  );
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(source ? JSON.parse(JSON.stringify(source)) : null);
    setDirty(false);
  }, [source?.id, source?.updatedAt, source?.status]);

  if (!draft) {
    return (
      <section className="panel empty-state">
        <ApartmentOutlined />
        <h2>尚未建立评价映射</h2>
        <p>
          先把教师业务标准拆为评价项，再定义机器可确认的事实；这里不能新增或修改扣分值。
        </p>
        <Button
          type="primary"
          onClick={() => store.createEvaluationMapping(sop.id)}
        >
          创建评价映射草稿
        </Button>
      </section>
    );
  }

  const editable = ["draft", "coverage_blocked", "changes_requested"].includes(
    draft.status,
  );
  const validation = validateEvaluationMapping({ sop, mapping: draft });
  const coverage = checkCompletionScoringCoverage({ sop, mapping: draft });
  const aiEligibleSteps = sop.steps.filter(
    (step) =>
      (step.expectedJudgementMode || step.judgementMode) !==
      "default_pass_manual_deduction",
  );
  const teacherOnlySteps = sop.steps.filter(
    (step) =>
      (step.expectedJudgementMode || step.judgementMode) ===
      "default_pass_manual_deduction",
  );
  const setField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const updateItem = (id, patchValue) =>
    setField(
      "evaluationItems",
      draft.evaluationItems.map((item) =>
        item.id === id ? { ...item, ...patchValue } : item,
      ),
    );
  const updateEvent = (id, patchValue) =>
    setField(
      "machineEvents",
      draft.machineEvents.map((event) =>
        event.id === id ? { ...event, ...patchValue } : event,
      ),
    );
  const addEvent = () => {
    const id = `ME-${draft.version}-${String(draft.machineEvents.length + 1).padStart(3, "0")}`;
    setField("machineEvents", [
      ...draft.machineEvents,
      {
        id,
        name: "",
        factDefinition: "",
        capabilityMode: "existing_capability",
        existingCapabilityRef: "",
        implementationNote: "",
      },
    ]);
  };
  const addItem = () => {
    const step = aiEligibleSteps[0];
    if (!step) return;
    const id = `EI-${draft.version}-${String(draft.evaluationItems.length + 1).padStart(3, "0")}`;
    setField("evaluationItems", [
      ...draft.evaluationItems,
      {
        id,
        stepId: step?.id || "",
        name: "",
        type: "业务判断项",
        roles: ["completion"],
        sourceCompletion: step?.completionCondition || "",
        sourceScoreRuleIds: [],
        sourceSafetyRuleIds: [],
        machineEventIds: [],
        scoreTreatment: { type: "", note: "" },
        fallback: "no_negative_auto_decision",
      },
    ]);
  };
  const save = () => {
    const saved = store.saveEvaluationMapping(draft.id, draft);
    setDraft(JSON.parse(JSON.stringify(saved)));
    setDirty(false);
  };
  const submit = () => store.submitEvaluationMapping(draft.id);
  return (
    <div className="mapping-workbench">
      <section className="panel mapping-overview-card">
        <PanelTitle
          title={`${draft.version} · 评价映射`}
          action={
            <div className="inline-actions">
              <Status>{mappingStatus.status}</Status>
              {editable && (
                <Button onClick={save} disabled={!dirty}>
                  保存草稿
                </Button>
              )}
              <Button
                type="primary"
                disabled={!editable || dirty || !validation.passed}
                onClick={submit}
              >
                提交教师确认
              </Button>
            </div>
          }
        />
        <div className="definition-list">
          <span>
            <small>创作来源</small>
            <strong>{sop.name}</strong>
          </span>
          <span>
            <small>未来兼容复用</small>
            <strong>
              {draft.compatibleSopVersions.length
                ? `${draft.compatibleSopVersions.length} 条历史记录`
                : "尚未判定"}
            </strong>
          </span>
          <span>
            <small>评价项</small>
            <strong>{draft.evaluationItems.length} 项</strong>
          </span>
          <span>
            <small>机器事实</small>
            <strong>{draft.machineEvents.length} 项</strong>
          </span>
        </div>
        <p className="hint">
          配置依据当前实训标准内容。标准的步骤或评分要求更新后，需要重新核对配置和现场验证；历史记录保留当时快照。
        </p>
      </section>

      <section
        className={`panel coverage-gate ${coverage.passed ? "coverage-gate--pass" : "coverage-gate--blocked"}`}
      >
        <PanelTitle
          title="完成条件与评分规则覆盖情况"
          action={
            <Status tone={coverage.passed ? "success" : "warning"}>
              {coverage.passed ? "通过" : "阻断提交"}
            </Status>
          }
        />
        <p>
          {coverage.passed
            ? `需要覆盖的 ${coverage.totalCount} 个完成判断项均已明确评分处置。`
            : "未完成处理规则为“按评分规则计算”的步骤，所有完成判断项都必须引用教师评分规则或明确不扣分。AI实施人员不能自行填写扣分值。"}
        </p>
        {!!coverage.issues.length && (
          <div className="ai-gate-reasons">
            {coverage.issues.map((issue) => (
              <span key={issue}>
                <AlertOutlined />
                <b>{issue}</b>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="panel mapping-editor-section">
        <PanelTitle
          title="评价项"
          action={
            editable && (
              <Button
                icon={<PlusOutlined />}
                onClick={addItem}
                disabled={!aiEligibleSteps.length}
              >
                新增评价项
              </Button>
            )
          }
        />
        <p className="hint">
          评价项承接教师业务标准；机器事实
          只能提供事实，不能直接扣分或形成学生结果。
        </p>
        {!!teacherOnlySteps.length && (
          <div className="evaluation-notice">
            <SafetyCertificateOutlined />
            <span>
              教师评价 / 不进入AI自动映射：
              {teacherOnlySteps
                .map((step) => `${step.id} · ${step.name}`)
                .join("；")}
            </span>
          </div>
        )}
        <div className="mapping-card-list">
          {draft.evaluationItems.map((item) => {
            const step =
              aiEligibleSteps.find((entry) => entry.id === item.stepId) ||
              aiEligibleSteps[0];
            const stepScoreRules = (sop.scoreRules || []).filter(
              (rule) => rule.stepId === item.stepId,
            );
            const stepSafetyRules = (sop.safetyRules || []).filter(
              (rule) => rule.stepId === item.stepId,
            );
            const toggle = (values, value) =>
              values.includes(value)
                ? values.filter((entry) => entry !== value)
                : [...values, value];
            return (
              <article key={item.id}>
                <header>
                  <code>{item.id}</code>
                  {editable && (
                    <Button
                      type="danger"
                      onClick={() =>
                        setField(
                          "evaluationItems",
                          draft.evaluationItems.filter(
                            (entry) => entry.id !== item.id,
                          ),
                        )
                      }
                    >
                      删除
                    </Button>
                  )}
                </header>
                <div className="form-row">
                  <label className="field">
                    关联步骤
                    <select
                      disabled={!editable}
                      value={item.stepId}
                      onChange={(event) => {
                        const selected = sop.steps.find(
                          (entry) => entry.id === event.target.value,
                        );
                        updateItem(item.id, {
                          stepId: event.target.value,
                          sourceCompletion: selected?.completionCondition || "",
                          sourceScoreRuleIds: [],
                          sourceSafetyRuleIds: [],
                        });
                      }}
                    >
                      {aiEligibleSteps.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.id} · {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    评价项名称
                    <input
                      disabled={!editable}
                      value={item.name}
                      onChange={(event) =>
                        updateItem(item.id, { name: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="mapping-role-picker">
                  <small>评价用途</small>
                  {Object.entries(EVALUATION_ITEM_ROLES).map(
                    ([role, label]) => (
                      <label key={role}>
                        <input
                          disabled={
                            !editable ||
                            (role === "scoring" &&
                              item.scoreTreatment?.type === "score_rule")
                          }
                          type="checkbox"
                          checked={item.roles.includes(role)}
                          onChange={() =>
                            updateItem(item.id, {
                              roles: toggle(item.roles, role),
                            })
                          }
                        />
                        {label}
                      </label>
                    ),
                  )}
                </div>
                {item.roles.includes("completion") && (
                  <label className="field">
                    来源完成条件
                    <textarea
                      disabled={!editable}
                      value={
                        item.sourceCompletion || step?.completionCondition || ""
                      }
                      onChange={(event) =>
                        updateItem(item.id, {
                          sourceCompletion: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                {item.roles.includes("scoring") && (
                  <div className="mapping-reference-picker">
                    <small>引用教师评分规则</small>
                    {stepScoreRules.map((rule) => (
                      <label key={rule.id}>
                        <input
                          disabled={!editable}
                          type="checkbox"
                          checked={item.sourceScoreRuleIds.includes(rule.id)}
                          onChange={() =>
                            updateItem(item.id, {
                              sourceScoreRuleIds: toggle(
                                item.sourceScoreRuleIds,
                                rule.id,
                              ),
                            })
                          }
                        />
                        {rule.id} · {rule.name}
                      </label>
                    ))}
                  </div>
                )}
                {item.roles.includes("safety") && (
                  <div className="mapping-reference-picker">
                    <small>引用教师安全规则</small>
                    {stepSafetyRules.map((rule) => (
                      <label key={rule.id}>
                        <input
                          disabled={!editable}
                          type="checkbox"
                          checked={item.sourceSafetyRuleIds.includes(rule.id)}
                          onChange={() =>
                            updateItem(item.id, {
                              sourceSafetyRuleIds: toggle(
                                item.sourceSafetyRuleIds,
                                rule.id,
                              ),
                            })
                          }
                        />
                        {rule.id} · {rule.name}
                      </label>
                    ))}
                  </div>
                )}
                <div className="mapping-reference-picker">
                  <small>关联机器事实</small>
                  {draft.machineEvents.map((event) => (
                    <label key={event.id}>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={item.machineEventIds.includes(event.id)}
                        onChange={() =>
                          updateItem(item.id, {
                            machineEventIds: toggle(
                              item.machineEventIds,
                              event.id,
                            ),
                          })
                        }
                      />
                      {event.id} · {event.name || "未命名事实"}
                    </label>
                  ))}
                </div>
                {item.roles.includes("completion") &&
                  step?.incompletePolicy === "rule_based" && (
                    <div className="rule-fields-grid">
                      <label className="field">
                        未完成评分处置
                        <select
                          disabled={!editable}
                          value={item.scoreTreatment?.type || ""}
                          onChange={(event) => {
                            const type = event.target.value;
                            updateItem(item.id, {
                              scoreTreatment: {
                                ...item.scoreTreatment,
                                type,
                              },
                              roles:
                                type === "score_rule" &&
                                !item.roles.includes("scoring")
                                  ? [...item.roles, "scoring"]
                                  : item.roles,
                            });
                          }}
                        >
                          <option value="">请选择</option>
                          <option value="score_rule">引用教师评分规则</option>
                          <option value="no_deduction">明确不扣分</option>
                        </select>
                      </label>
                      {item.scoreTreatment?.type === "score_rule" && (
                        <label className="field">
                          关联规则
                          <select
                            disabled={!editable}
                            value={item.sourceScoreRuleIds[0] || ""}
                            onChange={(event) =>
                              updateItem(item.id, {
                                sourceScoreRuleIds: event.target.value
                                  ? [event.target.value]
                                  : [],
                                roles: item.roles.includes("scoring")
                                  ? item.roles
                                  : [...item.roles, "scoring"],
                              })
                            }
                          >
                            <option value="">请选择</option>
                            {stepScoreRules.map((rule) => (
                              <option key={rule.id} value={rule.id}>
                                {rule.id} · {rule.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {item.scoreTreatment?.type === "no_deduction" && (
                        <label className="field">
                          不扣分依据
                          <input
                            disabled={!editable}
                            value={item.scoreTreatment?.note || ""}
                            onChange={(event) =>
                              updateItem(item.id, {
                                scoreTreatment: {
                                  ...item.scoreTreatment,
                                  note: event.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      )}
                    </div>
                  )}
                <p className="mapping-fallback">
                  <SafetyCertificateOutlined />{" "}
                  无法确认时不作负向自动判断，保持默认通过并进入教师抽查。
                </p>
              </article>
            );
          })}
          {!draft.evaluationItems.length && (
            <div className="empty-inline">
              <FileTextOutlined />
              <b>尚无评价项</b>
              <p>从教师完成条件、评分规则或安全规则中建立业务判断项。</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel mapping-editor-section">
        <PanelTitle
          title="机器事实"
          action={
            editable && (
              <Button icon={<PlusOutlined />} onClick={addEvent}>
                新增机器事实
              </Button>
            )
          }
        />
        <p className="hint">
          这里只记录机器能够确认的客观事实，不保存扣分、成绩或最终结果。
        </p>
        <div className="mapping-card-list machine-event-list">
          {draft.machineEvents.map((event) => (
            <article key={event.id}>
              <header>
                <code>{event.id}</code>
                {editable && (
                  <Button
                    type="danger"
                    onClick={() => {
                      setField(
                        "machineEvents",
                        draft.machineEvents.filter(
                          (entry) => entry.id !== event.id,
                        ),
                      );
                      setDraft((current) => ({
                        ...current,
                        evaluationItems: current.evaluationItems.map(
                          (item) => ({
                            ...item,
                            machineEventIds: item.machineEventIds.filter(
                              (id) => id !== event.id,
                            ),
                          }),
                        ),
                      }));
                    }}
                  >
                    删除
                  </Button>
                )}
              </header>
              <div className="form-row">
                <label className="field">
                  事实名称
                  <input
                    disabled={!editable}
                    value={event.name}
                    onChange={(e) =>
                      updateEvent(event.id, { name: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  能力实现方式
                  <select
                    disabled={!editable}
                    value={event.capabilityMode}
                    onChange={(e) =>
                      updateEvent(event.id, { capabilityMode: e.target.value })
                    }
                  >
                    {Object.entries(MACHINE_EVENT_CAPABILITY_MODES).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label className="field">
                事实成立定义
                <textarea
                  disabled={!editable}
                  value={event.factDefinition}
                  onChange={(e) =>
                    updateEvent(event.id, { factDefinition: e.target.value })
                  }
                />
              </label>
              <div className="form-row">
                <label className="field">
                  已有能力引用
                  <input
                    disabled={!editable}
                    value={event.existingCapabilityRef}
                    onChange={(e) =>
                      updateEvent(event.id, {
                        existingCapabilityRef: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="field">
                  实施说明
                  <input
                    disabled={!editable}
                    value={event.implementationNote}
                    onChange={(e) =>
                      updateEvent(event.id, {
                        implementationNote: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const MODEL_LIFECYCLE_ACTIONS = {
  待训练: "开始训练",
  训练中: "完成训练",
  可部署: "部署为生产模型",
  已回滚: "重新部署",
  失败: "重新训练",
  验证未通过: "重新训练",
};

function AiDataPipeline({ sop, mapping, dataset, store, setModal }) {
  const sourceVideoRef = useRef(null);
  const timeRangeRef = useRef(null);
  const annotationRef = useRef(null);
  const reviewRef = useRef(null);
  const requirements = deriveDataRequirements(mapping);
  const mappingConfirmed = mapping?.status === "confirmed";
  const sourceVideos = (store.data.sourceVideos || []).filter(
    (item) => item.sopId === sop.id,
  );
  const ranges = (store.data.timeRangeAnnotations || []).filter(
    (item) => item.sopId === sop.id,
  );
  const annotations = (store.data.annotations || []).filter(
    (item) => item.sopId === sop.id,
  );
  const approvedPending = annotations.filter(
    (item) => item.status === "已通过" && !item.datasetId,
  );
  const eventName = (id) =>
    mapping?.machineEvents?.find((item) => item.id === id)?.name || id;
  const itemName = (id) =>
    mapping?.evaluationItems?.find((item) => item.id === id)?.name || id;

  const uploadSourceVideo = () => {
    setModal({
      title: "上传源视频",
      size: "large",
      content: <SourceVideoForm ref={sourceVideoRef} />,
      confirmText: "保存源视频",
      onConfirm: () => {
        const created = store.addSourceVideo({
          ...sourceVideoRef.current.getValue(),
          sopId: sop.id,
        });
        return `${created.fileName} 已进入数据加工队列`;
      },
    });
  };
  const createTimeRange = (sourceVideo) => {
    setModal({
      title: "设置动作时间片段",
      size: "large",
      content: (
        <TimeRangeAnnotationForm
          ref={timeRangeRef}
          sourceVideo={sourceVideo}
          mapping={mapping}
        />
      ),
      confirmText: "保存动作片段",
      onConfirm: () => {
        const created = store.addTimeRangeAnnotation(
          timeRangeRef.current.getValue(),
        );
        return `${created.startTime}–${created.endTime} 已进入标注队列`;
      },
    });
  };
  const annotate = (range) => {
    setModal({
      title: "完成标注",
      size: "large",
      content: <AnnotationForm ref={annotationRef} range={range} />,
      confirmText: "提交审核",
      onConfirm: () => {
        store.saveAnnotation(annotationRef.current.getValue());
        return `${range.label} 标注已提交审核`;
      },
    });
  };
  const review = (annotation) => {
    setModal({
      title: "审核标注",
      content: <AnnotationReviewForm ref={reviewRef} annotation={annotation} />,
      confirmText: "提交审核结论",
      onConfirm: () => {
        const value = reviewRef.current.getValue();
        const updated = store.reviewAnnotation(
          annotation.id,
          value.decision === "pass",
          value.note,
        );
        return `标注已${updated.status}`;
      },
    });
  };
  const includeInDataset = () => {
    const updated = store.addApprovedAnnotationsToDataset(sop.id, dataset.id);
    return `${approvedPending.length} 条标注已纳入 ${updated.version}`;
  };

  return (
    <div className="ai-data-pipeline">
      <section className="panel">
        <PanelTitle title="数据需求与实现路径" />
        <p className="hint">
          数据需求来自已确认评价映射。复用已有能力与仅需配置
          不启动训练；只有需要训练进入数据生产和训练链路。
        </p>
        {!mappingConfirmed && (
          <p className="form-error">
            当前评价映射
            尚未完成教师确认，数据需求仅供预览，暂不能新增或推进数据版本。
          </p>
        )}
        <div className="ai-requirement-grid">
          {[
            ["复用已有能力", requirements.existingCapability],
            ["仅需配置", requirements.configurationOnly],
            ["需要训练", requirements.trainingRequired],
          ].map(([label, items]) => (
            <article key={label}>
              <small>{label}</small>
              <strong>{items.length} 项</strong>
              <p>
                {items.length
                  ? items.map((item) => item.name).join("、")
                  : "当前无此类能力"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel--table">
        <PanelTitle
          title="1. 源视频"
          action={
            <Button
              type="primary"
              icon={<UploadOutlined />}
              disabled={!mappingConfirmed}
              onClick={uploadSourceVideo}
            >
              上传源视频
            </Button>
          }
        />
        <p className="hint">
          保存完整源视频及来源信息；时间片段和标注均追溯到源视频。
        </p>
        <DataTable
          pagination
          columns={["文件", "时长", "来源", "评价映射", "状态"]}
          rows={sourceVideos.map((video) => [
            video.fileName,
            video.duration,
            video.source,
            video.mappingVersion,
            video.status,
          ])}
          statusColumns={[4]}
          emptyText="尚无源视频"
        />
        <div className="pipeline-actions-list">
          {sourceVideos.map((video) => (
            <span key={video.id}>
              <b>{video.fileName}</b>
              <Button
                disabled={
                  !mappingConfirmed || !mapping?.evaluationItems?.length
                }
                onClick={() => createTimeRange(video)}
              >
                设置动作片段
              </Button>
            </span>
          ))}
        </div>
      </section>

      <section className="panel panel--table">
        <PanelTitle title="2. 时间片段标注与标注" />
        <p className="hint">
          先定位动作区间，再完成动作或目标框选标注并审核；机器事实
          仅描述机器可确认的事实，不直接产生扣分。
        </p>
        <DataTable
          pagination
          columns={[
            "源视频",
            "时间片段",
            "评价项",
            "机器事实",
            "标注方式",
            "状态",
          ]}
          rows={ranges.map((range) => {
            const source = sourceVideos.find(
              (item) => item.id === range.sourceVideoId,
            );
            return [
              source?.fileName || range.sourceVideoId,
              `${range.startTime}–${range.endTime}`,
              itemName(range.evaluationItemId),
              eventName(range.machineEventId),
              range.annotationType === "detect" ? "目标框选" : "动作区间",
              range.status,
            ];
          })}
          statusColumns={[5]}
          emptyText="尚未设置动作时间片段"
        />
        <div className="pipeline-actions-list">
          {ranges.map((range) => {
            const annotation = annotations.find(
              (item) => item.timeRangeId === range.id,
            );
            return (
              <span key={range.id}>
                <b>
                  {range.startTime}–{range.endTime} · {range.label}
                </b>
                {!annotation || annotation.status === "已退回" ? (
                  <Button onClick={() => annotate(range)}>
                    {annotation ? "修改标注" : "开始标注"}
                  </Button>
                ) : annotation.status === "待审核" ? (
                  <Button onClick={() => review(annotation)}>审核标注</Button>
                ) : (
                  <Status tone="success">{annotation.status}</Status>
                )}
              </span>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <PanelTitle
          title={`3. 数据集组装 · ${dataset.version}`}
          action={
            <Button
              type="primary"
              disabled={
                !mappingConfirmed ||
                dataset.status !== "采集中" ||
                !approvedPending.length
              }
              onClick={includeInDataset}
            >
              纳入已审核标注（{approvedPending.length}）
            </Button>
          }
        />
        <p className="hint">
          集合划分以源视频 为最小单位；同一源视频产生的帧和动作片段不会跨集合。
        </p>
        <div className="dataset-split-grid">
          {[
            ["训练集", "train"],
            ["验证集", "validation"],
            ["测试集", "test"],
          ].map(([label, key]) => (
            <article key={key}>
              <small>{label}</small>
              <strong>{dataset.splits?.[key]?.length || 0} 个源视频</strong>
              <p>
                {(dataset.splits?.[key] || [])
                  .map(
                    (videoId) =>
                      sourceVideos.find((video) => video.id === videoId)
                        ?.fileName || videoId,
                  )
                  .join("、") || "尚未分配"}
              </p>
            </article>
          ))}
        </div>
      </section>

      {store.data.learningSamples.some((item) => item.sopId === sop.id) && (
        <details className="panel legacy-data-details">
          <summary>查看历史样本兼容记录</summary>
          <AiDatasetSamples sop={sop} setModal={setModal} />
        </details>
      )}
    </div>
  );
}

const CompatibilityDecisionForm = forwardRef(function CompatibilityDecisionForm(
  { assessment },
  ref,
) {
  const suggested = Object.values(assessment.layers || {}).every((value) =>
    ["compatible", "not_applicable"].includes(value),
  )
    ? "compatible"
    : "conditional";
  const [decision, setDecision] = useState(suggested);
  const [operator, setOperator] = useState("刘工");
  const [reason, setReason] = useState(assessment.summary || "");
  useImperativeHandle(ref, () => ({
    getValue: () => ({ decision, operator, reason }),
  }));
  return (
    <div className="form-stack">
      <div className="alert-block">
        <strong>历史标准内容变更</strong>
        <p>{assessment.summary}</p>
      </div>
      <div className="compatibility-layer-grid">
        {Object.entries(assessment.layers || {}).map(([layer, status]) => (
          <span key={layer}>
            <small>{layer}</small>
            <strong>{COMPATIBILITY_LAYER_STATUSES[status] || status}</strong>
          </span>
        ))}
      </div>
      <div className="form-row">
        <label className="field">
          兼容结论
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
          >
            <option value="compatible">兼容复用</option>
            <option value="conditional">有条件兼容</option>
            <option value="incompatible">不兼容</option>
          </select>
        </label>
        <label className="field">
          确认人
          <input
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <FieldLabel required>判断依据</FieldLabel>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <p className="hint">
        确认兼容只允许复用被评估为兼容的层；需要更新或重新验证的层仍不能启用自动评价。
      </p>
    </div>
  );
});

function AiEvaluationDetail({ setModal }) {
  const { id } = useParams();
  const store = usePrototypeData();
  const sop = store.data.sops.find((item) => item.id === id);
  const [tab, setTab] = useState("mapping");
  const [selectedWorkstationId, setSelectedWorkstationId] = useState("");
  const workstationAiRef = useRef(null);
  const modelValidationRef = useRef(null);
  const compatibilityRef = useRef(null);
  if (!sop)
    return (
      <MissingState title="AI 适配对象不存在" backTo="/admin/ai-evaluation" />
    );

  const datasets = store.data.datasets
    .filter((item) => item.sopId === sop.id)
    .sort((a, b) => versionNumber(b.version) - versionNumber(a.version));
  const models = store.data.models
    .filter((item) => item.sopId === sop.id)
    .sort((a, b) => versionNumber(b.version) - versionNumber(a.version));
  const aiStatus = store.getSopAiEvaluationStatus(sop.id);
  const mappingStatus =
    aiStatus.mappingStatus || store.getSopMappingStatus(sop.id);
  const mapping = mappingStatus.mapping;
  const dataRequirements = deriveDataRequirements(mapping);
  const dataset = datasets[0];
  const packageDataset = dataRequirements.requiresTraining
    ? datasets.find((item) => item.status === "已锁定")
    : null;
  const packageReadiness = getAiPackageCreationReadiness({
    sop,
    mapping,
    dataset: packageDataset,
  });
  const productionDataset = aiStatus.productionDataset;
  const researchDataset = aiStatus.researchDataset;
  const productionModel = aiStatus.model;
  const model = productionModel || models[0];
  const matrixDataset = productionDataset || dataset;
  const linkedWorkstationIds = new Set(
    standardWorkstationIds(store.data, sop.id),
  );
  const targetWorkstations = store.data.workstations.filter((workstation) =>
    linkedWorkstationIds.has(workstation.id),
  );
  const selectableWorkstations = targetWorkstations.length
    ? targetWorkstations
    : store.data.workstations;
  const selectedWorkstation =
    selectableWorkstations.find((item) => item.id === selectedWorkstationId) ||
    selectableWorkstations[0];
  const selectedProfile = (store.data.workstationProfiles || []).find(
    (item) => item.id === selectedWorkstation?.currentProfileId,
  );
  const validations = store.data.fieldValidations.filter(
    (record) => record.sopId === sop.id,
  );
  const selectedValidation = validations.find(
    (record) =>
      record.workstationId === selectedWorkstation?.id &&
      standardReferenceMatches(record, sop),
  );
  const selectedGate = selectedWorkstation
    ? store.getWorkstationEvaluationGate(selectedWorkstation.id, sop.id)
    : null;
  const impactAssessments = (store.data.aiImpactAssessments || []).filter(
    (item) => item.toSopId === sop.id,
  );
  const compatibilityDecisions = (
    store.data.compatibilityDecisions || []
  ).filter((item) => item.toSopId === sop.id);

  const beginAdaptation = () => {
    setModal({
      title: "开始首次 AI 适配",
      content: (
        <p>
          将为“{sop.name}”创建独立的数据集 D1。标准内容和步骤编号不会被修改。
        </p>
      ),
      confirmText: "创建 D1",
      onConfirm: () => {
        store.startAiAdaptation(sop.id);
        return "已创建数据集 D1，可开始上传和审核样本";
      },
    });
  };
  const advanceDataset = () => {
    if (!dataset) return beginAdaptation();
    if (dataset.status === "已锁定") {
      setModal({
        title: "创建下一版数据集",
        content: (
          <p>
            将基于 {dataset.version} 和已复核候选样本创建{" "}
            {dataset.nextVersion || "下一版本"}，原版本保持锁定。
          </p>
        ),
        confirmText: "创建新版本",
        onConfirm: () => {
          const created = store.createDatasetVersion(sop.id);
          return `已创建 ${created.version}`;
        },
      });
      return;
    }
    const next = dataset.status === "采集中" ? "提交审核" : "锁定数据集";
    setModal({
      title: next,
      content: (
        <p>{next}后数据集将进入下一生命周期状态，已发布 SOP 不受影响。</p>
      ),
      confirmText: next,
      onConfirm: () => {
        const updated = store.advanceDatasetLifecycle(dataset.id);
        return `${updated.version} 已更新为${updated.status}`;
      },
    });
  };
  const createModel = () => {
    setModal({
      title: "创建 AI能力包候选版本",
      content: (
        <div className="form-stack">
          <p>
            AI能力包将绑定当前标准内容与评价映射 {mapping?.version || "—"}
            {dataRequirements.requiresTraining
              ? `，训练数据来自 ${packageDataset?.version || "待准备数据集"}`
              : "。当前仅复用已有能力与配置，无需新训练数据集"}
            。
          </p>
          {!!packageReadiness.issues.length && (
            <p className="form-error">{packageReadiness.issues.join("；")}</p>
          )}
        </div>
      ),
      confirmText: "创建 AI能力包",
      onConfirm: () => {
        const created = store.createModelCandidate(sop.id, packageDataset?.id);
        return `已创建 AI能力包 ${created.version}`;
      },
    });
  };
  const advanceModel = (item) => {
    const nextLabel = MODEL_LIFECYCLE_ACTIONS[item.status];
    setModal({
      title: nextLabel || "推进 AI能力包生命周期",
      content: (
        <p>
          {item.version} 绑定已核定标准内容 / 数据集 {item.datasetVersion}
          。部署时同一 SOP 只保留一个生产 AI能力包。
        </p>
      ),
      confirmText: nextLabel || "确认",
      onConfirm: () => {
        const updated = store.advanceModelLifecycle(item.id);
        return `${updated.version} 已更新为${updated.status}`;
      },
    });
  };
  const validateModel = (item, passed) => {
    setModal({
      title: passed ? "确认 AI能力包验证通过" : "记录 AI能力包验证未通过",
      content: passed ? (
        <p>确认 {item.version} 已完成验证并进入可部署状态。</p>
      ) : (
        <ModelValidationFailureForm ref={modelValidationRef} />
      ),
      confirmText: passed ? "验证通过" : "确认验证不通过",
      onConfirm: () => {
        const reason = passed ? "" : modelValidationRef.current.getValue();
        const updated = store.recordModelValidation(item.id, passed, reason);
        return `${updated.version} 已更新为${updated.status}`;
      },
    });
  };
  const editImplementation = () => {
    if (!selectedWorkstation) return;
    setModal({
      title: `${selectedWorkstation.name} · 摄像头与 ROI 配置`,
      size: "large",
      content: (
        <ImplementationCheckForm
          ref={implementationRef}
          workstation={selectedWorkstation}
          evaluationItems={mapping?.evaluationItems || []}
        />
      ),
      confirmText: "保存实施检查",
      onConfirm: () => {
        store.saveWorkstationImplementation(
          selectedWorkstation.id,
          implementationRef.current.getValue(),
        );
        return `${selectedWorkstation.name} 实施检查已保存`;
      },
    });
  };
  const runFieldValidation = () => {
    if (!selectedWorkstation) return;
    setModal({
      title: `${selectedWorkstation.name} · 8 场景现场验证`,
      size: "large",
      content: (
        <FieldValidationForm
          ref={validationRef}
          workstation={selectedWorkstation}
          sops={[sop]}
          evaluationItems={mapping?.evaluationItems || []}
        />
      ),
      confirmText: "提交验证结果",
      onConfirm: () => {
        const record = store.saveFieldValidation(
          validationRef.current.getValue(),
        );
        return `现场验证结果：${record.status}`;
      },
    });
  };
  const confirmCompatibility = (assessment) => {
    setModal({
      title: "确认兼容性结论",
      size: "large",
      content: (
        <CompatibilityDecisionForm
          ref={compatibilityRef}
          assessment={assessment}
        />
      ),
      confirmText: "保存兼容结论",
      onConfirm: () => {
        const decision = store.confirmCompatibilityDecision(
          assessment.id,
          compatibilityRef.current.getValue(),
        );
        return `${assessment.fromVersion} → ${assessment.toVersion}：${COMPATIBILITY_DECISIONS[decision.decision]}`;
      },
    });
  };

  return (
    <>
      <PageHeader
        back
        title={`${sop.name} · AI评价适配`}
        subtitle="管理员维护数据、AI能力包与工位能力；标准修改后需核对适配并重新验证"
        actions={
          <Button
            onClick={() => window.location.reload()}
            icon={<ReloadOutlined />}
          >
            刷新状态
          </Button>
        }
      />
      <section className="sop-boundary-note">
        <LockOutlined />
        <div>
          <strong>当前实训标准 · {sop.name}</strong>
          <p>
            AI能力只能引用当前步骤编号；不确定、遮挡或不可视觉判断时，按既定规则默认通过。
          </p>
        </div>
        <Status tone={aiStatus.status === "可用" ? "success" : "warning"}>
          {aiStatus.status}
        </Status>
      </section>
      <div className="ai-adaptation-summary">
        <span>
          <small>实训标准</small>
          <strong>{sop.name}</strong>
        </span>
        <span>
          <small>评价映射状态</small>
          <strong>{mappingStatus.status}</strong>
        </span>
        <span>
          <small>当前生产数据集</small>
          <strong>{productionDataset ? productionDataset.version : "—"}</strong>
        </span>
        <span>
          <small>当前生产 AI能力包</small>
          <strong>
            {productionModel ? `${productionModel.version} · 已部署` : "—"}
          </strong>
        </span>
        <span>
          <small>在研数据集</small>
          <strong>
            {researchDataset
              ? `${researchDataset.version} · ${researchDataset.status}`
              : "—"}
          </strong>
        </span>
        <span>
          <small>AI 状态</small>
          <strong>{aiStatus.status}</strong>
        </span>
        <span>
          <small>当前工位配置</small>
          <strong>{selectedProfile?.version || "未配置"}</strong>
        </span>
      </div>
      {researchDataset && (
        <p className="hint ai-research-note">
          {researchDataset.version}{" "}
          用于下一轮模型训练，不影响当前生产AI评价能力。
        </p>
      )}
      <div
        className="tabs sop-detail-tabs ai-adaptation-tabs"
        role="tablist"
        aria-label="AI适配详情"
      >
        {[
          ["mapping", "评价映射"],
          ["overview", "适配概览"],
          ["dataset", "数据生产与数据集"],
          ["model", "AI能力包"],
          ["validation", "工位验证"],
          ["compatibility", "影响与兼容性"],
          ["history", "版本与记录"],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "mapping" && (
        <AiMappingPanel sop={sop} mappingStatus={mappingStatus} store={store} />
      )}

      {tab === "overview" && (
        <>
          <section className="panel panel--table">
            <PanelTitle
              title="步骤适配矩阵"
              action={
                !dataset && (
                  <Button
                    type="primary"
                    disabled={!mappingStatus.confirmed}
                    onClick={beginAdaptation}
                  >
                    开始 AI 适配
                  </Button>
                )
              }
            />
            <p className="hint">
              有效运行方式由教师设定、AI能力包能力和工位现场验证共同决定；自动评价门禁不通过时自动降级，不产生自动扣分。
            </p>
            <DataTable
              pagination
              columns={[
                "步骤编号",
                "教师设定",
                "数据集",
                "AI能力包",
                "工位验证",
                "有效运行方式",
              ]}
              rows={sop.steps.map((step) => {
                const labelCount = matrixDataset?.labels?.[step.id] || 0;
                const modelCompatible = Boolean(
                  productionModel &&
                    (productionModel.requiresTraining === false ||
                      productionModel.datasetVersion ===
                        productionDataset?.version),
                );
                const fieldState = !targetWorkstations.length
                  ? "未设置工位"
                  : `${aiStatus.validatedWorkstationCount}/${targetWorkstations.length} 通过`;
                const effectiveMode =
                  step.judgementMode === "visual_auto" &&
                  aiStatus.status !== "可用"
                    ? "visual_assist_default_pass"
                    : step.judgementMode;
                return [
                  `${step.id} · ${step.name}`,
                  JUDGEMENT_MODES[step.judgementMode]?.shortLabel || "未设置",
                  matrixDataset
                    ? `${matrixDataset.version} · ${labelCount} 条 · ${matrixDataset.status}`
                    : "未创建",
                  modelCompatible
                    ? `${productionModel.version} · ${productionModel.status}${!standardReferenceMatches(productionModel, sop) ? " · 兼容复用" : ""}`
                    : "未形成生产基线",
                  fieldState,
                  JUDGEMENT_MODES[effectiveMode]?.shortLabel || "教师评价",
                ];
              })}
              statusColumns={[2, 3, 4, 5]}
            />
          </section>
          <section className="panel ai-gate-reasons">
            <PanelTitle title="自动评价启用检查" />
            {aiStatus.reasons.length ? (
              aiStatus.reasons.slice(0, 8).map((reason) => (
                <span key={reason}>
                  <AlertOutlined />
                  <b>{displayBusinessText(reason)}</b>
                </span>
              ))
            ) : (
              <span className="success">
                <CheckCircleFilled />
                <b>数据集、生产模型与全部目标工位验证均满足自动评价门禁</b>
              </span>
            )}
          </section>
        </>
      )}

      {tab === "dataset" && (
        <>
          {!dataset ? (
            <section className="panel empty-state">
              <DatabaseOutlined />
              <h2>
                {dataRequirements.requiresTraining
                  ? "需要训练，尚未创建数据集"
                  : "当前评价映射无需新训练数据集"}
              </h2>
              <p>
                {!mappingStatus.confirmed
                  ? "先完成评价映射并由教师确认业务口径，再进入数据建设。"
                  : dataRequirements.requiresTraining
                    ? "首次数据生产从 D1 开始，源视频经时间片段标注、标注和审核后才能纳入。"
                    : "当前全部机器事实均可复用已有能力或通过配置实现，可直接组装 AI能力包。"}
              </p>
              {dataRequirements.requiresTraining ? (
                <Button
                  type="primary"
                  disabled={!mappingStatus.confirmed}
                  onClick={beginAdaptation}
                >
                  创建 D1
                </Button>
              ) : (
                <Button
                  type="primary"
                  disabled={!packageReadiness.passed}
                  onClick={createModel}
                >
                  直接创建 AI能力包
                </Button>
              )}
            </section>
          ) : (
            <>
              <section className="panel">
                <PanelTitle
                  title={`${dataset.name} · ${dataset.status}`}
                  action={
                    <div className="inline-actions">
                      <Button
                        type="primary"
                        disabled={!mappingStatus.confirmed}
                        onClick={advanceDataset}
                      >
                        {dataset.status === "已锁定"
                          ? `创建 ${dataset.nextVersion || "下一版"}`
                          : dataset.status === "采集中"
                            ? "提交审核"
                            : "锁定数据集"}
                      </Button>
                    </div>
                  }
                />
                <div className="ai-lifecycle">
                  <Status>采集中</Status>
                  <i />
                  <Status>待审核</Status>
                  <i />
                  <Status>已锁定</Status>
                </div>
                <div className="ai-dataset-stats">
                  <span>
                    <small>正式样本</small>
                    <strong>{dataset.sampleCount || 0}</strong>
                  </span>
                  <span>
                    <small>已纳入</small>
                    <strong>{dataset.acceptedCount || 0}</strong>
                  </span>
                  <span>
                    <small>待审核候选</small>
                    <strong>{dataset.candidateCount || 0}</strong>
                  </span>
                  <span>
                    <small>下一版本</small>
                    <strong>{dataset.nextVersion || "—"}</strong>
                  </span>
                </div>
              </section>
              <AiDataPipeline
                sop={sop}
                mapping={mapping}
                dataset={dataset}
                store={store}
                setModal={setModal}
              />
            </>
          )}
        </>
      )}

      {tab === "model" && (
        <>
          <section className="panel">
            <PanelTitle
              title="AI能力包生命周期"
              action={
                <Button
                  type="primary"
                  disabled={!packageReadiness.passed}
                  onClick={createModel}
                >
                  创建 AI能力包
                </Button>
              }
            />
            <p className="hint">
              AI能力包绑定 SOP
              与评价映射；复用已有能力、仅需配置直接组装能力，需要训练才绑定已锁定数据集并训练。
            </p>
            {!packageReadiness.passed && (
              <p className="form-error">
                当前不可创建：{packageReadiness.issues.join("；")}
              </p>
            )}
            <div className="ai-model-list">
              {models.map((item) => {
                const rollbackTarget = models.find(
                  (candidate) =>
                    candidate.id !== item.id &&
                    candidate.standardDefinitionKey ===
                      item.standardDefinitionKey &&
                    candidate.status === "已回滚",
                );
                const lastFailedValidation = [...(item.validationHistory || [])]
                  .reverse()
                  .find((record) => record.result === "未通过");
                return (
                  <article key={item.id}>
                    <header>
                      <span>
                        <strong>
                          {item.name} {item.version}
                        </strong>
                        <small>
                          标准内容已绑定 · 评价映射{" "}
                          {item.mappingVersion || "历史评价映射"} · 数据集{" "}
                          {item.datasetVersion || "无需训练"}
                        </small>
                      </span>
                      <Status>{item.status}</Status>
                    </header>
                    <div className="ai-package-components">
                      <span>
                        <small>复用已有能力</small>
                        <b>
                          {item.components?.existingCapabilities?.length || 0}{" "}
                          项
                        </b>
                      </span>
                      <span>
                        <small>配置能力</small>
                        <b>
                          {item.components?.configuredCapabilities?.length || 0}{" "}
                          项
                        </b>
                      </span>
                      <span>
                        <small>训练能力</small>
                        <b>
                          {item.components?.trainedCapabilities?.length || 0} 项
                        </b>
                      </span>
                    </div>
                    <div>
                      <span>
                        <small>F1</small>
                        <b>
                          {item.requiresTraining === false
                            ? "无需训练"
                            : item.f1}
                        </b>
                      </span>
                      <span>
                        <small>序列准确率</small>
                        <b>{item.sequenceAccuracy}</b>
                      </span>
                      <span>
                        <small>其他动作召回率</small>
                        <b>{item.otherRecall}</b>
                      </span>
                      <span>
                        <small>部署范围</small>
                        <b>{item.deploymentTarget}</b>
                      </span>
                    </div>
                    <footer>
                      <span>
                        <small>
                          更新于 {displayBusinessText(item.updatedAt)}
                        </small>
                        {lastFailedValidation && (
                          <small className="model-validation-record">
                            最近未通过：
                            {displayBusinessText(
                              lastFailedValidation.reason,
                            )} · {lastFailedValidation.operator} ·{" "}
                            {displayBusinessText(lastFailedValidation.time)}
                          </small>
                        )}
                      </span>
                      <div className="inline-actions">
                        {item.status === "已部署" ? (
                          rollbackTarget ? (
                            <Button
                              onClick={() =>
                                setModal({
                                  title: "回滚生产 AI能力包",
                                  content: (
                                    <p>
                                      将停用 {item.version} 并恢复{" "}
                                      {rollbackTarget.version}
                                      。AI能力包
                                      版本变化后，既有工位现场验证会失效并需要重新验证。
                                    </p>
                                  ),
                                  confirmText: `恢复 ${rollbackTarget.version}`,
                                  onConfirm: () => {
                                    const result = store.rollbackModel(item.id);
                                    return `已恢复生产 AI能力包 ${result.restored.version}`;
                                  },
                                })
                              }
                            >
                              回滚至 {rollbackTarget.version}
                            </Button>
                          ) : (
                            <Status tone="muted">当前唯一生产版本</Status>
                          )
                        ) : item.status === "待验证" ? (
                          <>
                            <Button onClick={() => validateModel(item, false)}>
                              验证不通过
                            </Button>
                            <Button
                              type="primary"
                              onClick={() => validateModel(item, true)}
                            >
                              验证通过
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="primary"
                            onClick={() => advanceModel(item)}
                          >
                            {MODEL_LIFECYCLE_ACTIONS[item.status] ||
                              "推进生命周期"}
                          </Button>
                        )}
                      </div>
                    </footer>
                  </article>
                );
              })}
              {!models.length && (
                <div className="empty-inline">
                  <ProductOutlined />
                  <b>暂无 AI能力包</b>
                  <p>
                    {packageReadiness.passed
                      ? "数据需求已满足，可以创建首个 AI能力包。"
                      : packageReadiness.issues.join("；")}
                  </p>
                </div>
              )}
            </div>
          </section>
          {model && (
            <section className="panel panel--table">
              <PanelTitle title="步骤与场景验证" />
              <DataTable
                pagination
                columns={["对象", "AI能力包能力", "现场结果", "说明"]}
                rows={[
                  ...sop.steps.map((step) => [
                    `${step.id} · ${step.name}`,
                    step.judgementMode === "default_pass_manual_deduction"
                      ? "不进入AI能力包"
                      : model.status === "已部署"
                        ? "已具备"
                        : model.status === "可部署"
                          ? "验证通过"
                          : "待验证",
                    step.judgementMode === "default_pass_manual_deduction"
                      ? "教师评价"
                      : validations.some((item) => item.status === "通过")
                        ? "有通过记录"
                        : "待现场验证",
                    JUDGEMENT_MODES[step.judgementMode]?.shortLabel,
                  ]),
                  ...FIELD_VALIDATION_SCENARIOS.map(([key, label]) => [
                    label,
                    model.status === "已部署" ? "已覆盖" : "待验证",
                    validations.some((record) =>
                      record.tests?.some(
                        (test) => test.key === key && test.result === "通过",
                      ),
                    )
                      ? "通过"
                      : "待验证",
                    "以工位现场记录为准",
                  ]),
                ]}
                statusColumns={[1, 2]}
              />
            </section>
          )}
        </>
      )}

      {tab === "validation" && (
        <>
          <section className="panel ai-workstation-picker">
            <PanelTitle title="工位现场验证" />
            <label className="field">
              目标工位
              <select
                value={selectedWorkstation?.id || ""}
                onChange={(event) =>
                  setSelectedWorkstationId(event.target.value)
                }
              >
                {selectableWorkstations.map((workstation) => (
                  <option key={workstation.id} value={workstation.id}>
                    {workstationOptionLabel(workstation)} · {workstation.status}
                  </option>
                ))}
              </select>
            </label>
          </section>
          {selectedWorkstation && (
            <div className="ai-validation-layout">
              <section className="panel">
                <PanelTitle
                  title="画面与 ROI"
                  action={
                    <Button onClick={editImplementation}>
                      配置摄像头与 ROI
                    </Button>
                  }
                />
                <RoiPreview
                  implementation={selectedWorkstation.implementation}
                />
                <div className="definition-list ai-implementation-facts">
                  <span>
                    <small>工位配置</small>
                    <strong>{selectedProfile?.version || "未配置"}</strong>
                  </span>
                  <span>
                    <small>机位</small>
                    <strong>
                      {selectedWorkstation.implementation?.cameraPosition ||
                        "未确认"}
                    </strong>
                  </span>
                  <span>
                    <small>光照</small>
                    <strong>
                      {selectedWorkstation.implementation?.lighting || "未确认"}
                    </strong>
                  </span>
                  <span>
                    <small>遮挡</small>
                    <strong>
                      {selectedWorkstation.implementation?.occlusion ||
                        "未确认"}
                    </strong>
                  </span>
                  <span>
                    <small>摄像头配置</small>
                    <strong>
                      {selectedWorkstation.implementation
                        ?.cameraConfigVersion || "未配置"}
                    </strong>
                  </span>
                  <span>
                    <small>ROI 版本</small>
                    <strong>
                      {selectedWorkstation.implementation?.roiVersion ||
                        "未配置"}
                    </strong>
                  </span>
                  <span>
                    <small>主摄像头</small>
                    <strong>
                      {selectedProfile?.cameras?.find(
                        (camera) =>
                          camera.id === selectedProfile.primaryCameraId,
                      )?.name || "未配置"}
                    </strong>
                  </span>
                  <span>
                    <small>备用摄像头</small>
                    <strong>
                      {selectedProfile?.cameras?.find(
                        (camera) =>
                          camera.id === selectedProfile.fallbackCameraId,
                      )?.name || "—"}
                    </strong>
                  </span>
                </div>
              </section>
              <section className="panel">
                <PanelTitle
                  title="自动评价启用检查"
                  action={
                    <Status
                      tone={selectedGate?.enabled ? "success" : "warning"}
                    >
                      {selectedGate?.status || "未检查"}
                    </Status>
                  }
                />
                <div className="ai-gate-reasons">
                  {selectedGate?.reasons.length ? (
                    selectedGate.reasons.map((reason) => (
                      <span key={reason}>
                        <AlertOutlined />
                        <b>{displayBusinessText(reason)}</b>
                      </span>
                    ))
                  ) : (
                    <span className="success">
                      <CheckCircleFilled />
                      <b>当前工位允许启用自动评价</b>
                    </span>
                  )}
                </div>
                <div className="version-binding">
                  <span>
                    <small>SOP</small>
                    <b>{sop.name}</b>
                  </span>
                  <span>
                    <small>AI能力包</small>
                    <b>{model?.version || "未部署"}</b>
                  </span>
                  <span>
                    <small>工位配置</small>
                    <b>{selectedProfile?.version || "未配置"}</b>
                  </span>
                  <span>
                    <small>摄像头</small>
                    <b>
                      {selectedWorkstation.implementation
                        ?.cameraConfigVersion || "未配置"}
                    </b>
                  </span>
                </div>
                <Button type="primary" onClick={runFieldValidation}>
                  执行 8 场景验证
                </Button>
              </section>
            </div>
          )}
          <section className="panel panel--table">
            <PanelTitle title="现场验证记录" />
            <DataTable
              pagination
              columns={[
                "工位",
                "结果",
                "SOP",
                "AI能力包",
                "工位配置",
                "Coverage",
                "验证人",
                "时间",
              ]}
              rows={validations.map((record) => {
                const workstation = store.data.workstations.find(
                  (item) => item.id === record.workstationId,
                );
                return [
                  workstation?.name || record.workstationId,
                  record.status,
                  store.data.sops.find((s) => s.id === record.sopId)?.name ||
                    "历史实训标准",
                  record.modelVersion,
                  record.workstationProfileVersion || "未记录",
                  record.coverage?.passed
                    ? `${record.coverage.coveredItemCount}/${record.coverage.totalItemCount} 已覆盖`
                    : `${record.coverage?.coveredItemCount || 0}/${record.coverage?.totalItemCount || 0} 未覆盖完整`,
                  record.operator,
                  record.createdAt,
                ];
              })}
              statusColumns={[1]}
              emptyText="当前 SOP 暂无现场验证记录"
            />
          </section>
        </>
      )}

      {tab === "compatibility" && (
        <div className="compatibility-page-grid">
          <section className="panel">
            <PanelTitle
              title="AI适配影响评估"
              action={
                <span>{impactAssessments.length} 条历史内容变更记录</span>
              }
            />
            <p className="hint">
              此处保留历史标准内容变更的兼容核对记录。当前标准更新后需重新核对AI配置和现场验证，旧记录不会自动放行当前配置。
            </p>
            <div className="compatibility-assessment-list">
              {impactAssessments.map((assessment) => {
                const decision = compatibilityDecisions.find(
                  (item) => item.assessmentId === assessment.id,
                );
                return (
                  <article key={assessment.id}>
                    <header>
                      <span>
                        <small>历史标准内容变更</small>
                        <strong>{assessment.summary}</strong>
                      </span>
                      <Status tone={decision ? "success" : "warning"}>
                        {decision
                          ? COMPATIBILITY_DECISIONS[decision.decision]
                          : "待确认"}
                      </Status>
                    </header>
                    <div className="compatibility-layer-grid">
                      {Object.entries(assessment.layers || {}).map(
                        ([layer, status]) => (
                          <span key={layer}>
                            <small>{layer}</small>
                            <strong>
                              {COMPATIBILITY_LAYER_STATUSES[status] || status}
                            </strong>
                          </span>
                        ),
                      )}
                    </div>
                    <footer>
                      <small>
                        数据要求：
                        {assessment.dataRequirement || "保持现有数据基线"}
                      </small>
                      {!decision && (
                        <span>历史记录待核对；当前配置请重新适配验证</span>
                      )}
                    </footer>
                  </article>
                );
              })}
              {!impactAssessments.length && (
                <div className="empty-inline">
                  <HistoryOutlined />
                  <b>暂无历史内容变更记录</b>
                  <p>
                    当前标准直接覆盖更新；相关AI配置会转入待核对状态，并要求重新现场验证。
                  </p>
                </div>
              )}
            </div>
          </section>
          <section className="panel panel--table">
            <PanelTitle title="兼容性结论记录" />
            <DataTable
              pagination
              columns={["依据", "结论", "判断依据", "确认人", "时间"]}
              rows={compatibilityDecisions.map((decision) => [
                "历史标准内容变更",
                COMPATIBILITY_DECISIONS[decision.decision] || decision.decision,
                decision.reason,
                decision.operator,
                decision.createdAt,
              ])}
              statusColumns={[1]}
              emptyText="尚无兼容性结论"
            />
          </section>
        </div>
      )}

      {tab === "history" && (
        <div className="ai-history-grid">
          <section className="panel panel--table">
            <PanelTitle title="数据集版本" />
            <DataTable
              pagination
              columns={["版本", "状态", "样本", "基于", "更新时间"]}
              rows={datasets.map((item) => [
                item.version,
                item.status,
                item.sampleCount || 0,
                item.basedOn || "首次创建",
                item.updatedAt,
              ])}
              statusColumns={[1]}
            />
          </section>
          <section className="panel panel--table">
            <PanelTitle title="AI能力包版本" />
            <DataTable
              pagination
              columns={["版本", "状态", "SOP", "数据集", "更新时间"]}
              rows={models.map((item) => [
                item.version,
                item.status,
                store.data.sops.find((s) => s.id === item.sopId)?.name ||
                  "历史实训标准",
                item.datasetVersion,
                item.updatedAt,
              ])}
              statusColumns={[1]}
            />
          </section>
          <section className="panel panel--table ai-history-wide">
            <PanelTitle title="适配操作记录" />
            <DataTable
              pagination
              columns={["时间", "操作人", "动作", "对象", "结果"]}
              rows={store.data.auditLogs
                .filter(
                  (log) =>
                    `${log.target}`.includes(sop.name) ||
                    `${log.target}`.includes(sop.id),
                )
                .map((log) => [
                  log.time,
                  log.actor,
                  log.action,
                  log.target,
                  log.result,
                ])}
              statusColumns={[4]}
              emptyText="暂无与当前 SOP 关联的适配记录"
            />
          </section>
        </div>
      )}
    </>
  );
}

function AdminOverview() {
  const nav = useNavigate();
  const { data } = usePrototypeData();
  const [refreshedAt, setRefreshedAt] = useState("刚刚");
  const [arrangementPage, setArrangementPage] = useState(0);
  const [todoPage, setTodoPage] = useState(1);
  const [todoPageSize, setTodoPageSize] = useState(10);
  const [servicePage, setServicePage] = useState(1);
  const [servicePageSize, setServicePageSize] = useState(10);
  const activeArrangements = (data.arrangements || []).filter(
    (item) =>
      !item.archivedRecord && ["进行中", "已暂停"].includes(item.status),
  );
  const displayedCurrentArrangements = adminCurrentArrangements(data);
  const arrangementPageSize = 3;
  const arrangementPageCount = Math.max(
    1,
    Math.ceil(displayedCurrentArrangements.length / arrangementPageSize),
  );
  const safeArrangementPage = Math.min(
    arrangementPage,
    arrangementPageCount - 1,
  );
  const pagedCurrentArrangements = displayedCurrentArrangements.slice(
    safeArrangementPage * arrangementPageSize,
    (safeArrangementPage + 1) * arrangementPageSize,
  );
  const openIssues = (data.issues || []).filter(
    (item) => item.status !== "已关闭",
  );
  const onlineWorkstations = (data.workstations || []).filter(
    (item) => !["故障", "维护中", "停用"].includes(item.status),
  ).length;
  const configurableSops = getConfigurableSops(data.sops);
  const sopAiSummaries = configurableSops.map((sop) => ({
    sop,
    summary: getSopAiConfigurationSummary(data, sop),
  }));
  const workstationAiStates = sopAiSummaries.flatMap(({ sop, summary }) =>
    (summary.runtimeStates || []).map((item) => ({ ...item, sop })),
  );
  const runnableAiCount = workstationAiStates.filter(
    (item) => item.runtime.runnable,
  ).length;
  const pendingValidationCount = workstationAiStates.filter(
    (item) =>
      !["passed", "pending_revalidation"].includes(
        item.relation.validationStatus,
      ),
  ).length;
  const pendingRevalidationCount = workstationAiStates.filter(
    (item) => item.runtime.code === "pending_revalidation",
  ).length;
  const notEnabledCount = workstationAiStates.filter(
    (item) =>
      ["passed"].includes(item.relation.validationStatus) &&
      ["not_enabled", "disabled"].includes(item.runtime.code),
  ).length;
  const publishedCapabilities = (data.aiCapabilities || []).filter(
    (item) => item.status === "已发布",
  ).length;
  const trainingTasks = data.aiTrainingTasks || [];
  const trainingCount = trainingTasks.filter((item) =>
    ACTIVE_TRAINING_STATUSES.includes(item.status),
  ).length;
  const pendingModelTasks = trainingTasks.filter((task) => {
    if (task.status !== "completed") return false;
    const capability = (data.aiCapabilities || []).find(
      (item) => item.id === task.capabilityId,
    );
    return capability?.status !== "已发布";
  });
  const failedTrainingTasks = trainingTasks.filter(
    (item) => item.status === "failed",
  );
  const sopStatusCounts = sopAiSummaries.reduce(
    (counts, item) => {
      const status = item.summary.status;
      if (status === "已启用") counts.enabled += 1;
      else if (status === "待验证") counts.pending += 1;
      else if (status === "未配置") counts.unconfigured += 1;
      else counts.configuring += 1;
      return counts;
    },
    { enabled: 0, pending: 0, configuring: 0, unconfigured: 0 },
  );
  const faceRecaptureCount = (data.students || []).filter(
    (item) => getStudentFaceStatus(item) === "待重采",
  ).length;
  const issueRows = (data.issues || []).map((item) => [
    item.occurredAt,
    item.type,
    (item.workstationIds || []).length
      ? `${item.workstationIds.map((id) => data.workstations.find((entry) => entry.id === id)?.name || id).join("、")} / ${(item.sessionIds || []).length}个会话`
      : item.nodeId,
    item.status,
    item.handlingStatus,
  ]);
  const latestBackup = [...(data.backups || [])]
    .filter((item) => item.status === "成功")
    .sort((left, right) =>
      String(right.createdAt || right.time || "").localeCompare(
        String(left.createdAt || left.time || ""),
      ),
    )[0];
  const adminTodos = [
    ...openIssues.map((issue) => ({
      id: `issue-${issue.id}`,
      icon: <AlertOutlined />,
      title: issue.title || "系统异常待处理",
      detail: (issue.workstationIds || []).length
        ? `${issue.workstationIds.map((id) => data.workstations.find((item) => item.id === id)?.name || id).join("、")} · ${issue.handlingStatus}`
        : issue.handlingStatus || issue.status,
      action: "查看",
      onClick: () => nav(`/admin/issues/${issue.id}`),
    })),
    ...workstationAiStates
      .filter((item) => item.runtime.code === "pending_revalidation")
      .map((item) => ({
        id: `revalidation-${item.relation.id}`,
        icon: <ReloadOutlined />,
        title: "工位AI待重新验证",
        detail: `${item.sop.name} · ${item.workstation?.name || "工位"}`,
        action: "去验证",
        onClick: () => nav(`${AI_CONFIG_PATH}/${item.sop.id}`),
      })),
    ...workstationAiStates
      .filter(
        (item) =>
          !["passed", "pending_revalidation"].includes(
            item.relation.validationStatus,
          ),
      )
      .map((item) => ({
        id: `validation-${item.relation.id}`,
        icon: <SafetyCertificateOutlined />,
        title: "工位AI待现场验证",
        detail: `${item.sop.name} · ${item.workstation?.name || "工位"}`,
        action: "去验证",
        onClick: () => nav(`${AI_CONFIG_PATH}/${item.sop.id}`),
      })),
    ...sopAiSummaries
      .filter(({ summary }) =>
        ["未配置", "配置中", "配置不完整"].includes(summary.status),
      )
      .map(({ sop }) => ({
        id: `config-${sop.id}`,
        icon: <ApartmentOutlined />,
        title: "AI能力配置未完成",
        detail: sop.name,
        action: "继续配置",
        onClick: () => nav(`${AI_CONFIG_PATH}/${sop.id}`),
      })),
    ...failedTrainingTasks.map((task) => {
      const capability = (data.aiCapabilities || []).find(
        (item) => item.id === task.capabilityId,
      );
      return {
        id: `training-failed-${task.id}`,
        icon: <ExclamationCircleFilled />,
        title: "模型训练失败",
        detail: capability?.name || "AI能力训练任务",
        action: "查看",
        onClick: () => nav(`${AI_LIBRARY_PATH}/training`),
      };
    }),
    ...pendingModelTasks.map((task) => {
      const capability = (data.aiCapabilities || []).find(
        (item) => item.id === task.capabilityId,
      );
      return {
        id: `model-publish-${task.id}`,
        icon: <CloudDownloadOutlined />,
        title: "训练完成待发布",
        detail: capability?.name || "AI能力模型",
        action: "去发布",
        onClick: () => nav(`${AI_LIBRARY_PATH}/publishing`),
      };
    }),
    ...(faceRecaptureCount
      ? [
          {
            id: "face-recapture",
            icon: <UserOutlined />,
            title: "学生人脸待重采",
            detail: `${faceRecaptureCount} 名学生需要重新采集人脸`,
            action: "查看学生",
            onClick: () => nav("/admin/students"),
          },
        ]
      : []),
  ];
  const todoPageCount = Math.max(
    1,
    Math.ceil(adminTodos.length / todoPageSize),
  );
  const pagedAdminTodos = adminTodos.slice(
    (todoPage - 1) * todoPageSize,
    todoPage * todoPageSize,
  );
  const systemServices = [
    {
      id: "management",
      icon: <CheckCircleFilled />,
      name: "中心管理服务",
      detail: `正常 · ${refreshedAt} 更新`,
      status: "正常",
    },
    {
      id: "video",
      icon: <CheckCircleFilled />,
      name: "视频接入与集中存储",
      detail: "视频服务正常",
      status: "正常",
    },
    {
      id: "edge",
      icon: openIssues.length ? <AlertOutlined /> : <CheckCircleFilled />,
      name: "工位边缘节点",
      detail: openIssues[0]?.title || "当前无异常",
      status: openIssues.length ? `${openIssues.length}项异常` : "正常",
      warning: Boolean(openIssues.length),
    },
    {
      id: "backup",
      icon: <CheckCircleFilled />,
      name: "自动备份",
      detail: latestBackup
        ? `最近成功：${latestBackup.createdAt || latestBackup.time}`
        : "暂无成功备份记录",
      status: latestBackup ? "正常" : "待检查",
    },
  ];
  const servicePageCount = Math.max(
    1,
    Math.ceil(systemServices.length / servicePageSize),
  );
  const pagedSystemServices = systemServices.slice(
    (servicePage - 1) * servicePageSize,
    servicePage * servicePageSize,
  );
  useEffect(
    () => setTodoPage((current) => Math.min(current, todoPageCount)),
    [todoPageCount],
  );
  useEffect(
    () => setServicePage((current) => Math.min(current, servicePageCount)),
    [servicePageCount],
  );
  return (
    <>
      <PageHeader
        title="运行概览"
        subtitle="平台运行、AI能力与工位状态总览"
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              setRefreshedAt(
                new Date().toLocaleTimeString("zh-CN", { hour12: false }),
              )
            }
          >
            刷新状态
          </Button>
        }
      />
      <div className="metric-grid">
        <Metric
          label="工位运行"
          value={`${onlineWorkstations}/${data.workstations.length}`}
          hint={`正常 ${onlineWorkstations} · 异常 ${data.workstations.length - onlineWorkstations}`}
          icon={<DesktopOutlined />}
          tone="blue"
          onClick={() => nav("/admin/workstations")}
        />
        <Metric
          label="当前安排"
          value={displayedCurrentArrangements.length}
          hint={`练习 ${displayedCurrentArrangements.filter((item) => item.type === "practice").length} · 考试 ${displayedCurrentArrangements.filter((item) => item.type === "exam").length}`}
          icon={<PlayCircleFilled />}
          tone="green"
        />
        <Metric
          label="AI运行就绪"
          value={runnableAiCount}
          hint={`待验证 ${pendingValidationCount} · 待重新验证 ${pendingRevalidationCount}`}
          icon={<SafetyCertificateOutlined />}
          tone="green"
        />
        <Metric
          label="待处理事项"
          value={adminTodos.length}
          hint={`系统异常 ${openIssues.length} · AI相关 ${adminTodos.length - openIssues.length - (faceRecaptureCount ? 1 : 0)}`}
          icon={<AlertOutlined />}
          tone="amber"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel admin-ai-overview">
          <PanelTitle
            title="AI运行与建设状态"
            action={
              <span className="panel-title__actions">
                <button onClick={() => nav(AI_CONFIG_PATH)}>AI能力配置</button>
                <button onClick={() => nav(AI_LIBRARY_PATH)}>AI能力库</button>
              </span>
            }
          />
          <div className="overview-status-grid">
            <article>
              <strong>AI能力</strong>
              <span>
                已发布 <b>{publishedCapabilities}</b>
              </span>
              <span>
                训练中 <b>{trainingCount}</b>
              </span>
              <span>
                待发布 <b>{pendingModelTasks.length}</b>
              </span>
            </article>
            <article>
              <strong>实训标准 AI能力配置</strong>
              <span>
                已启用 <b>{sopStatusCounts.enabled}</b>
              </span>
              <span>
                待验证 <b>{sopStatusCounts.pending}</b>
              </span>
              <span>
                配置中 <b>{sopStatusCounts.configuring}</b>
              </span>
              <span>
                未配置 <b>{sopStatusCounts.unconfigured}</b>
              </span>
            </article>
            <article>
              <strong>工位AI验证</strong>
              <span>
                可运行 <b>{runnableAiCount}</b>
              </span>
              <span>
                待验证 <b>{pendingValidationCount}</b>
              </span>
              <span>
                待重新验证 <b>{pendingRevalidationCount}</b>
              </span>
              <span>
                未启用 <b>{notEnabledCount}</b>
              </span>
            </article>
          </div>
        </section>
        <section className="panel">
          <PanelTitle
            title="当前安排"
            action={
              <DashboardCardPager
                page={safeArrangementPage}
                totalPages={arrangementPageCount}
                onChange={setArrangementPage}
              />
            }
          />
          <div className="current-sessions">
            {pagedCurrentArrangements.map((item) => {
              const teacher = (data.teachers || []).find(
                (entry) => entry.id === item.teacherId,
              );
              const content = (
                <>
                  <b>{item.name}</b>
                  <small>
                    {item.type === "exam" ? "考试" : "练习"}
                    {item.teacherName || teacher
                      ? ` · ${item.teacherName || teacher?.name}`
                      : ""}{" "}
                    ·{" "}
                    {item.workstationCount ??
                      (item.workstationIds || []).length}
                    个工位
                  </small>
                  <Status>{item.status}</Status>
                </>
              );

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    nav(
                      `/admin/${item.type === "exam" ? "exams" : "practices"}/${item.id}`,
                    )
                  }
                >
                  {content}
                </button>
              );
            })}
            {!displayedCurrentArrangements.length && (
              <p className="hint">当前没有进行中、已暂停或可入场的安排。</p>
            )}
          </div>
        </section>
      </div>
      <section className="panel admin-overview-todos">
        <PanelTitle title="待处理事项" />
        <div className="todo-list">
          {pagedAdminTodos.map((item) => (
            <button key={item.id} onClick={item.onClick}>
              {item.icon}
              <span>
                <strong>{displayBusinessText(item.title)}</strong>
                <small>{displayBusinessText(item.detail)}</small>
              </span>
              <b>{item.action}</b>
            </button>
          ))}
          {!adminTodos.length && (
            <p className="hint">当前没有需要管理员处理的事项。</p>
          )}
        </div>
        <TablePagination
          total={adminTodos.length}
          page={todoPage}
          pageSize={todoPageSize}
          onPageChange={setTodoPage}
          onPageSizeChange={(nextPageSize) => {
            setTodoPageSize(nextPageSize);
            setTodoPage(1);
          }}
        />
      </section>
      <section className="panel panel--table">
        <PanelTitle title="系统异常" />
        <DataTable
          pagination
          columns={["发生时间", "异常类型", "影响范围", "事实状态", "人工处理"]}
          rows={issueRows}
          statusColumns={[3, 4]}
          rowKey={(_, index) => data.issues[index].id}
          onRow={(_, index) => nav(`/admin/issues/${data.issues[index].id}`)}
        />
      </section>
      <section className="panel admin-system-services">
        <PanelTitle title="系统服务" />
        <div className="service-list">
          {pagedSystemServices.map((service) => (
            <span className={service.warning ? "warning" : ""} key={service.id}>
              {service.icon}
              <div>
                <b>{service.name}</b>
                <small>{service.detail}</small>
              </div>
              <Status>{service.status}</Status>
            </span>
          ))}
        </div>
        <TablePagination
          total={systemServices.length}
          page={servicePage}
          pageSize={servicePageSize}
          onPageChange={setServicePage}
          onPageSizeChange={(nextPageSize) => {
            setServicePageSize(nextPageSize);
            setServicePage(1);
          }}
        />
      </section>
    </>
  );
}
const ClassForm = forwardRef(function ClassForm({ initial }, ref) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    major: classMajors[0],
    department: departments[0],
    entryYear: "2026",
    duration: "3年",
    headTeacher: "",
    notes: "",
    ...initial,
  });
  const [errors, setErrors] = useState({});
  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  useImperativeHandle(ref, () => ({
    validate() {
      const nextErrors = {};
      if (!form.name.trim()) nextErrors.name = "请输入班级名称";
      if (!form.code.trim()) nextErrors.code = "请输入班级标识";
      else if (!/^[A-Za-z0-9-]{3,30}$/.test(form.code.trim())) {
        nextErrors.code = "使用3—30位字母、数字或连字符";
      }
      if (!form.major) nextErrors.major = "请选择所属专业";
      if (!form.department) nextErrors.department = "请选择所属院系";
      if (!/^20\d{2}$/.test(form.entryYear))
        nextErrors.entryYear = "请输入四位入学年份";
      if (!form.duration) nextErrors.duration = "请选择学制";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length)
        throw new Error("请完成标红的必填信息后再保存。");
      return {
        ...form,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        notes: form.notes.trim(),
      };
    },
  }));

  const fieldError = (key) =>
    errors[key] ? (
      <small className="field-error" role="alert">
        {errors[key]}
      </small>
    ) : null;

  return (
    <div className="class-form">
      <div className="form-row">
        <label className={`field ${errors.name ? "field--error" : ""}`}>
          <FieldLabel required>班级名称</FieldLabel>
          <input
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="例如：新能源2601班"
          />
          {fieldError("name")}
        </label>
        <label className={`field ${errors.code ? "field--error" : ""}`}>
          <FieldLabel required>班级标识</FieldLabel>
          <input
            value={form.code}
            onChange={(event) => setField("code", event.target.value)}
            placeholder="例如：NEV-2601"
          />
          {fieldError("code")}
        </label>
      </div>
      <div className="form-row">
        <label className={`field ${errors.department ? "field--error" : ""}`}>
          <FieldLabel required>所属院系</FieldLabel>
          <select
            value={form.department}
            onChange={(event) => setField("department", event.target.value)}
          >
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {fieldError("department")}
        </label>
        <label className={`field ${errors.major ? "field--error" : ""}`}>
          <FieldLabel required>所属专业</FieldLabel>
          <select
            value={form.major}
            onChange={(event) => setField("major", event.target.value)}
          >
            {classMajors.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {fieldError("major")}
        </label>
      </div>
      <div className="form-row">
        <label className={`field ${errors.entryYear ? "field--error" : ""}`}>
          <FieldLabel required>入学年份</FieldLabel>
          <input
            inputMode="numeric"
            value={form.entryYear}
            onChange={(event) => setField("entryYear", event.target.value)}
          />
          {fieldError("entryYear")}
        </label>
        <label className={`field ${errors.duration ? "field--error" : ""}`}>
          <FieldLabel required>学制</FieldLabel>
          <select
            value={form.duration}
            onChange={(event) => setField("duration", event.target.value)}
          >
            <option>2年</option>
            <option>3年</option>
            <option>5年</option>
          </select>
          {fieldError("duration")}
        </label>
      </div>
      <label className="field">
        <FieldLabel>班主任 / 负责教师</FieldLabel>
        <input
          value={form.headTeacher}
          onChange={(event) => setField("headTeacher", event.target.value)}
          placeholder="可在教师资料补齐后关联"
        />
      </label>
      <label className="field">
        <FieldLabel>备注</FieldLabel>
        <textarea
          maxLength={200}
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="最多200字"
        />
      </label>
      <p className="form-hint">
        学生数量、创建时间和系统内部ID由系统维护，无需手工填写。
      </p>
    </div>
  );
});

function ClassManagement({ setModal }) {
  const nav = useNavigate();
  const formRef = useRef(null);
  const { data, createClass } = usePrototypeData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const filtered = data.classes.filter((item) => {
    const text = [
      item.name,
      item.code,
      item.major,
      item.department,
      item.headTeacher,
    ]
      .join(" ")
      .toLowerCase();
    return (
      text.includes(query.trim().toLowerCase()) &&
      (statusFilter === "全部状态" || item.status === statusFilter)
    );
  });
  const openCreate = () =>
    setModal({
      eyebrow: "基础资料",
      title: "新建班级",
      size: "large",
      confirmText: "保存班级",
      content: <ClassForm ref={formRef} />,
      onConfirm: () => {
        const created = createClass(formRef.current.validate());
        return `已新建班级：${created.name}`;
      },
    });
  return (
    <>
      <PageHeader
        title="班级管理"
        subtitle="维护教学组织、专业归属和学生关联；归档不会影响历史记录"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建班级
          </Button>
        }
      />
      <section className="panel panel--table">
        <Toolbar
          placeholder="搜索班级名称、标识、专业或教师"
          filters={["全部状态", "启用", "已归档"]}
          value={query}
          filterValue={statusFilter}
          onChange={setQuery}
          onFilterChange={setStatusFilter}
          onRefresh={() => {
            setQuery("");
            setStatusFilter("全部状态");
          }}
        />
        <DataTable
          pagination
          columns={[
            "班级名称",
            "班级标识",
            "专业",
            "学生数量",
            "状态",
            "更新时间",
          ]}
          rows={filtered.map((item) => [
            item.name,
            item.code,
            item.major,
            String(item.studentCount),
            item.status,
            item.updatedAt,
          ])}
          rowKey={(row) => row[1]}
          onView={(row) => {
            const target = data.classes.find((item) => item.code === row[1]);
            if (target) nav(`/admin/classes/${target.id}`);
          }}
        />
      </section>
    </>
  );
}

function ClassDetail({ setModal }) {
  const { id } = useParams();
  const nav = useNavigate();
  const formRef = useRef(null);
  const { data, updateClass, archiveClass, restoreClass } = usePrototypeData();
  const item = data.classes.find((candidate) => candidate.id === id);
  if (!item) {
    return (
      <section className="empty-page">
        <ExclamationCircleFilled />
        <h1>班级不存在或已失效</h1>
        <p>该记录可能已被重置，请返回班级列表重新选择。</p>
        <Button onClick={() => nav("/admin/classes")}>返回班级列表</Button>
      </section>
    );
  }
  const studentsInClass = data.students.filter(
    (student) => student.classId === item.id,
  );
  const openEdit = () =>
    setModal({
      eyebrow: "基础资料",
      title: `编辑班级：${item.name}`,
      size: "large",
      confirmText: "保存修改",
      content: <ClassForm ref={formRef} initial={item} />,
      onConfirm: () => {
        const updated = updateClass(item.id, formRef.current.validate());
        return `已更新班级：${updated.name}`;
      },
    });
  const toggleArchive = () =>
    setModal({
      title: item.status === "已归档" ? "恢复班级" : "归档班级",
      className: "class-archive-modal",
      content: (
        <p>
          {item.status === "已归档"
            ? "恢复后可重新用于学生归班和新建安排。"
            : `归档后不再出现在新建业务的可选范围内；${item.studentCount}名学生及历史安排不会被删除。`}
        </p>
      ),
      confirmText: item.status === "已归档" ? "确认恢复" : "确认归档",
      onConfirm: () => {
        if (item.status === "已归档") restoreClass(item.id);
        else archiveClass(item.id);
        return item.status === "已归档"
          ? "班级已恢复"
          : "班级已归档，历史记录保持不变";
      },
    });
  const details = [
    ["班级标识", item.code],
    ["所属院系", item.department],
    ["所属专业", item.major],
    ["入学年份", item.entryYear],
    ["学制", item.duration],
    ["负责教师", item.headTeacher || "未设置"],
    ["学生数量", `${item.studentCount} 人`],
    ["更新时间", item.updatedAt],
  ];
  return (
    <>
      <PageHeader
        back
        title={`班级详情 · ${item.name}`}
        subtitle={`${item.code} · ${item.department}`}
        actions={
          <>
            <Button onClick={toggleArchive}>
              {item.status === "已归档" ? "恢复班级" : "归档班级"}
            </Button>
            <Button type="primary" onClick={openEdit}>
              编辑资料
            </Button>
          </>
        }
      />
      <div className="identity-card">
        <span>
          <AppstoreOutlined />
        </span>
        <div>
          <h2>{item.name}</h2>
          <p>
            {item.major} · {item.entryYear}级 · {item.duration}
          </p>
        </div>
        <Status>{item.status}</Status>
      </div>
      <div className="detail-grid class-detail-grid">
        {details.map(([label, value]) => (
          <section className="panel" key={label}>
            <small>{label}</small>
            <h2>{displayBusinessText(value)}</h2>
          </section>
        ))}
      </div>
      {item.notes && (
        <section className="panel class-notes">
          <PanelTitle title="备注" />
          <p>{item.notes}</p>
        </section>
      )}
      <section className="panel panel--table">
        <PanelTitle
          title={`班级学生（已加载示例 ${studentsInClass.length} / 班级人数 ${item.studentCount}）`}
        />
        <DataTable
          pagination
          columns={["学生", "学号", "账号状态", "人脸资料"]}
          rows={studentsInClass.map((student) => [
            student.name,
            student.no,
            student.status,
            getStudentFaceStatus(student),
          ])}
          emptyText="当前班级尚未关联学生，可在学生管理中完成归班。"
        />
      </section>
    </>
  );
}

function FacePhotoPicker({
  value = "",
  actionLabel = "选择照片",
  onChange,
  onStateChange,
}) {
  const [preview, setPreview] = useState(value);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const chooseFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    onStateChange?.({ busy: true, error: "" });
    try {
      const result = await compressImageForPrototype(file);
      setPreview(result.dataUrl);
      setFileInfo(result);
      onChange?.(result);
      onStateChange?.({ busy: false, error: "" });
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "图片处理失败，请重新选择。";
      setError(message);
      onStateChange?.({ busy: false, error: message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="face-photo-picker">
      <div
        className={`face-photo-picker__preview ${preview ? "has-photo" : ""}`}
      >
        {preview ? (
          <img src={preview} alt="学生人脸照片预览" />
        ) : (
          <span>
            <UserOutlined />
            <small>暂无照片</small>
          </span>
        )}
      </div>
      <div className="face-photo-picker__body">
        <strong>人脸照片</strong>
        <p>支持 JPG、PNG、WebP，原图不超过 5MB；保存前自动压缩至 512px 内。</p>
        <label
          className={`button button--default ${busy ? "is-disabled" : ""}`}
        >
          <UploadOutlined />{" "}
          {busy ? "正在压缩…" : preview ? "重新选择照片" : actionLabel}
          <input
            type="file"
            accept={STUDENT_FACE_ACCEPT}
            disabled={busy}
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {fileInfo && (
          <small className="face-photo-picker__meta">
            {fileInfo.fileName} · 压缩后{" "}
            {formatFaceImageSize(fileInfo.approxBytes)} · {fileInfo.width} ×{" "}
            {fileInfo.height}
          </small>
        )}
        {error && (
          <small className="field-error" role="alert">
            {displayBusinessText(error)}
          </small>
        )}
      </div>
    </section>
  );
}

const StudentFaceUploadForm = forwardRef(function StudentFaceUploadForm(
  { student },
  ref,
) {
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ busy: false, error: "" });
  useImperativeHandle(ref, () => ({
    validate() {
      if (state.busy) throw new Error("照片仍在压缩，请稍候再保存。");
      if (state.error) throw new Error(state.error);
      if (!result?.dataUrl) throw new Error("请先选择一张新的学生人脸照片。");
      return result;
    },
  }));
  return (
    <div className="student-face-upload-form">
      <p>
        上传成功后，{student.name}
        的人脸资料状态将更新为“已采集”，可用于原型刷脸登录。
      </p>
      <FacePhotoPicker
        value={student.facePhotoDataUrl}
        actionLabel="选择人脸照片"
        onChange={setResult}
        onStateChange={setState}
      />
      <p className="form-hint">
        原型只保存压缩后的单张照片，不进行人脸检测、活体检测或质量评分。
      </p>
    </div>
  );
});

const MasterDataForm = forwardRef(function MasterDataForm(
  { type, initial },
  ref,
) {
  const { data } = usePrototypeData();
  const location = useLocation();
  const requestedWorkstation = new URLSearchParams(location.search).get(
    "workstationId",
  );
  const defaults = {
    teacher: {
      name: "",
      employeeNo: "",
      account: "",
      department: departments[0],
      major: classMajors[0],
      phone: "",
      notes: "",
    },
    student: {
      name: "",
      no: "",
      classId: data.classes.find((item) => item.status === "启用")?.id || "",
      gender: "未填写",
      admissionYear: "2026",
      face: "未采集",
      faceStatus: "未采集",
      facePhotoDataUrl: "",
      faceUpdatedAt: "",
      facePhotoChanged: false,
      notes: "",
    },
    workstation: {
      name: "",
      code: "",
      location: "",
      notes: "",
    },
    device: {
      name: "",
      serial: "",
      type: deviceTypes[0],
      workstationId: data.workstations.some(
        (w) => w.id === requestedWorkstation,
      )
        ? requestedWorkstation
        : "",
      address: "",
      version: "",
      notes: "",
    },
  };
  const [form, setForm] = useState(() => ({
    ...defaults[type],
    ...initial,
    ...(type === "student"
      ? {
          faceStatus: getStudentFaceStatus(initial || {}),
          facePhotoDataUrl: initial?.facePhotoDataUrl || "",
          faceUpdatedAt: initial?.faceUpdatedAt || "",
          facePhotoChanged: false,
        }
      : {}),
  }));
  const [errors, setErrors] = useState({});
  const [faceUploadState, setFaceUploadState] = useState({
    busy: false,
    error: "",
  });
  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const error = (key) =>
    errors[key] ? (
      <small className="field-error" role="alert">
        {errors[key]}
      </small>
    ) : null;

  useImperativeHandle(ref, () => ({
    validate() {
      const next = {};
      if (!form.name?.trim())
        next.name =
          type === "teacher"
            ? "请输入教师姓名"
            : type === "student"
              ? "请输入学生姓名"
              : type === "workstation"
                ? "请输入工位名称"
                : "请输入设备标识";
      if (type === "teacher") {
        if (!/^[A-Za-z0-9-]{3,30}$/.test(form.employeeNo?.trim()))
          next.employeeNo = "使用3—30位字母、数字或连字符";
        if (!/^[a-zA-Z][a-zA-Z0-9._-]{3,29}$/.test(form.account?.trim()))
          next.account = "账号需以字母开头，长度4—30位";
        if (form.phone && !/^1\d{10}$/.test(form.phone.trim()))
          next.phone = "请输入11位手机号或留空";
      }
      if (type === "student") {
        if (!/^\d{6,20}$/.test(form.no?.trim())) next.no = "学号应为6—20位数字";
        if (!form.classId) next.classId = "请选择班级";
        if (!/^20\d{2}$/.test(form.admissionYear))
          next.admissionYear = "请输入四位入学年份";
        if (faceUploadState.busy)
          next.facePhotoDataUrl = "照片仍在压缩，请稍候再保存";
        else if (faceUploadState.error)
          next.facePhotoDataUrl = faceUploadState.error;
      }
      if (type === "workstation") {
        if (!/^[A-Za-z0-9-]{3,30}$/.test(form.code?.trim()))
          next.code = "使用3—30位字母、数字或连字符";
        if (!form.location?.trim()) next.location = "请输入实训室位置";
      }
      if (type === "device") {
        if (!/^[A-Za-z0-9-]{3,40}$/.test(form.name?.trim()))
          next.name = "使用3—40位字母、数字或连字符";
        if (!/^[A-Za-z0-9-]{3,50}$/.test(form.serial?.trim()))
          next.serial = "请输入有效设备序列号";
        if (!form.address?.trim()) next.address = "请输入连接地址或接入方式";
        if (!form.version?.trim())
          next.version = "请输入固件或设备代理程序版本";
      }
      setErrors(next);
      if (Object.keys(next).length)
        throw new Error("请完成标红的信息后再保存。");
      return Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() : value,
        ]),
      );
    },
  }));

  if (type === "teacher")
    return (
      <div className="class-form">
        <div className="form-row">
          <label className={`field ${errors.name ? "field--error" : ""}`}>
            <span className="field__label">
              <b className="field__required" aria-hidden="true">
                *
              </b>
              教师姓名
            </span>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="例如：赵敏"
            />
            {error("name")}
          </label>
          <label className={`field ${errors.employeeNo ? "field--error" : ""}`}>
            <span className="field__label">
              <b className="field__required" aria-hidden="true">
                *
              </b>
              教师工号
            </span>
            <input
              value={form.employeeNo}
              onChange={(e) => setField("employeeNo", e.target.value)}
              placeholder="例如：T-0021"
            />
            {error("employeeNo")}
          </label>
        </div>
        <div className="form-row">
          <label className={`field ${errors.account ? "field--error" : ""}`}>
            <span className="field__label">
              <b className="field__required" aria-hidden="true">
                *
              </b>
              登录账号
            </span>
            <input
              value={form.account}
              onChange={(e) => setField("account", e.target.value)}
              placeholder="例如：zhaomin"
            />
            {error("account")}
          </label>
          <label className={`field ${errors.phone ? "field--error" : ""}`}>
            <span className="field__label">联系电话</span>
            <input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="不默认强制收集"
            />
            {error("phone")}
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            <span className="field__label">
              <b className="field__required" aria-hidden="true">
                *
              </b>
              所属院系
            </span>
            <select
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
            >
              {departments.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">
              <b className="field__required" aria-hidden="true">
                *
              </b>
              所属专业
            </span>
            <select
              value={form.major}
              onChange={(e) => setField("major", e.target.value)}
            >
              {classMajors.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field__label">备注</span>
          <textarea
            maxLength={200}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </label>
        <p className="form-hint">
          {initial
            ? "编辑资料不会修改密码；忘记密码时请使用教师列表或详情中的“重置密码”。"
            : "保存后系统生成临时密码，在成功窗口显示一次。教师首次登录须先修改密码。"}
        </p>
      </div>
    );
  if (type === "student")
    return (
      <div className="class-form">
        <div className="form-row">
          <label className={`field ${errors.name ? "field--error" : ""}`}>
            <FieldLabel required>学生姓名</FieldLabel>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="例如：赵一"
            />
            {error("name")}
          </label>
          <label className={`field ${errors.no ? "field--error" : ""}`}>
            <FieldLabel required>学号</FieldLabel>
            <input
              inputMode="numeric"
              value={form.no}
              onChange={(e) => setField("no", e.target.value)}
              placeholder="例如：20261001"
            />
            {error("no")}
          </label>
        </div>
        <div className="form-row">
          <label className={`field ${errors.classId ? "field--error" : ""}`}>
            <FieldLabel required>所属班级</FieldLabel>
            <select
              value={form.classId}
              onChange={(e) => setField("classId", e.target.value)}
            >
              <option value="">请选择班级</option>
              {data.classes
                .filter(
                  (item) => item.status === "启用" || item.id === form.classId,
                )
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · {item.code}
                  </option>
                ))}
            </select>
            {error("classId")}
          </label>
          <label className="field">
            <FieldLabel>性别</FieldLabel>
            <select
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
            >
              <option>未填写</option>
              <option>男</option>
              <option>女</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label
            className={`field ${errors.admissionYear ? "field--error" : ""}`}
          >
            <FieldLabel required>入学年份</FieldLabel>
            <input
              inputMode="numeric"
              value={form.admissionYear}
              onChange={(e) => setField("admissionYear", e.target.value)}
            />
            {error("admissionYear")}
          </label>
          <div className="field face-status-readonly">
            人脸资料状态
            <Status>{getStudentFaceStatus(form)}</Status>
            <small>状态由照片上传和“发起重采”自动维护</small>
          </div>
        </div>
        <FacePhotoPicker
          value={form.facePhotoDataUrl}
          actionLabel="选择人脸照片"
          onStateChange={setFaceUploadState}
          onChange={(result) => {
            setForm((current) => ({
              ...current,
              facePhotoDataUrl: result.dataUrl,
              facePhotoChanged: true,
            }));
            setErrors((current) => ({ ...current, facePhotoDataUrl: "" }));
          }}
        />
        {error("facePhotoDataUrl")}
        <label className="field">
          <FieldLabel>备注</FieldLabel>
          <textarea
            maxLength={200}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </label>
        <p className="form-hint">
          转班只更新当前归属；既有练习和考试仍保留原班级快照。
        </p>
      </div>
    );
  if (type === "workstation")
    return (
      <div className="class-form">
        <div className="form-row">
          <label className={`field ${errors.name ? "field--error" : ""}`}>
            <FieldLabel required>工位名称</FieldLabel>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="例如：5号工位"
            />
            {error("name")}
          </label>
          <label className={`field ${errors.code ? "field--error" : ""}`}>
            <FieldLabel required>工位标识</FieldLabel>
            <input
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
              placeholder="例如：WS-A05"
            />
            {error("code")}
          </label>
        </div>
        <div className="form-row">
          <label className={`field ${errors.location ? "field--error" : ""}`}>
            <FieldLabel required>实训室位置</FieldLabel>
            <input
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="例如：A区-05"
            />
            {error("location")}
          </label>
        </div>
        <label className="field">
          <FieldLabel>备注</FieldLabel>
          <textarea
            maxLength={200}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </label>
        <p className="form-hint">
          新工位默认“可入场”，设备需在设备管理中单独登记并绑定。
        </p>
      </div>
    );
  return (
    <div className="class-form">
      <div className="form-row">
        <label className={`field ${errors.name ? "field--error" : ""}`}>
          <FieldLabel required>设备标识</FieldLabel>
          <input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="例如：CAM-005-A"
          />
          {error("name")}
        </label>
        <label className={`field ${errors.serial ? "field--error" : ""}`}>
          <FieldLabel required>设备序列号</FieldLabel>
          <input
            value={form.serial}
            onChange={(e) => setField("serial", e.target.value)}
            placeholder="例如：CAM-SN-005-A"
          />
          {error("serial")}
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <FieldLabel required>设备类型</FieldLabel>
          <select
            value={form.type}
            onChange={(e) => setField("type", e.target.value)}
          >
            {deviceTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <FieldLabel>绑定工位</FieldLabel>
          <select
            value={form.workstationId}
            onChange={(e) => setField("workstationId", e.target.value)}
          >
            <option value="">未绑定</option>
            {data.workstations.map((item) => (
              <option value={item.id} key={item.id}>
                {workstationOptionLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className={`field ${errors.address ? "field--error" : ""}`}>
          <FieldLabel required>
            {form.type.includes("摄像头")
              ? "视频流地址"
              : "连接地址 / 接入方式"}
          </FieldLabel>
          <input
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder={
              form.type.includes("摄像头") ? "rtsp://..." : "IP、USB或节点通道"
            }
          />
          {error("address")}
        </label>
        <label className={`field ${errors.version ? "field--error" : ""}`}>
          <FieldLabel required>当前版本</FieldLabel>
          <input
            value={form.version}
            onChange={(e) => setField("version", e.target.value)}
            placeholder={form.type === "边缘工作站" ? "Agent 3.2.1" : "FW 2.4"}
          />
          {error("version")}
        </label>
      </div>
      <label className="field">
        <FieldLabel>备注</FieldLabel>
        <textarea
          maxLength={200}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </label>
      <p className="form-hint">
        摄像头和边缘工作站可绑定多台备用设备；运行配置只选一台边缘设备。其他设备类型每工位仅一台启用设备。保存后需执行连接测试。
      </p>
    </div>
  );
});

export const TeacherImportForm = forwardRef(function TeacherImportForm(
  { initialRaw = "" },
  ref,
) {
  const { data } = usePrototypeData();
  const [raw, setRaw] = useState(initialRaw);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const fileReadId = useRef(0);
  let rows = [],
    parseError = "";
  try {
    rows = teacherImportPreview(raw, data.teachers);
  } catch (error) {
    parseError = error.message;
  }
  const errors = rows.filter((row) => row.result !== "可导入").length;
  useImperativeHandle(ref, () => ({
    validate() {
      if (reading) throw new Error("文件仍在读取，请稍后再导入。");
      if (fileError || parseError) throw new Error(fileError || parseError);
      if (!rows.length)
        throw new Error("请选择CSV文件或粘贴至少一条教师数据。");
      if (errors)
        throw new Error("预览中存在错误行，请修正后重新导入；整批未导入。");
      return rows;
    },
  }));
  return (
    <div className="import-form teacher-import-form">
      <p className="form-hint">
        请按模板填写，每次最多导入{ACCOUNT_IMPORT_LIMIT}
        位教师。工号和登录账号不能重复，前五列必填，联系电话和备注可留空。导入只新增教师，不覆盖已有资料。
      </p>
      <div className="import-actions">
        <a
          className="button button--default"
          download="教师导入模板.csv"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent("\uFEFF" + TEACHER_IMPORT_TEMPLATE)}`}
        >
          下载CSV模板
        </a>
        <label className="button button--default import-file">
          {reading ? "正在读取…" : "选择CSV文件"}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const readId = ++fileReadId.current;
              setReading(true);
              setFileError("");
              try {
                if (file.size > 2 * 1024 * 1024)
                  throw new Error("文件过大，请使用2MB以内的UTF-8 CSV文件。");
                const text = await file.text();
                if (text.includes("\uFFFD"))
                  throw new Error("文件编码无法识别，请另存为CSV UTF-8格式。");
                if (readId === fileReadId.current) setRaw(text);
              } catch (error) {
                if (readId === fileReadId.current) {
                  setRaw("");
                  setFileError(error.message || "文件读取失败，请重新选择。");
                }
              } finally {
                if (readId === fileReadId.current) setReading(false);
              }
            }}
          />
        </label>
      </div>
      <label className="field">
        <span className="field__label">
          导入内容
          <small className="field__label-hint">
            姓名,工号,登录账号,所属院系,所属专业,联系电话,备注
          </small>
        </span>
        <textarea
          rows={6}
          value={raw}
          placeholder={TEACHER_IMPORT_TEMPLATE}
          onChange={(event) => {
            fileReadId.current++;
            setReading(false);
            setFileError("");
            setRaw(event.target.value);
          }}
        />
      </label>
      {(fileError || parseError) && (
        <p className="form-error" role="alert">
          {fileError || parseError}
        </p>
      )}
      <section className="import-preview">
        <PanelTitle
          title={
            <>
              导入预览{" "}
              <span className="import-preview__count">· {rows.length} 行</span>
            </>
          }
        />
        <p className="form-hint">
          可导入 {rows.length - errors} 行 · 待修正 {errors}{" "}
          行。确认后将整批保存，并显示每位教师的初始登录信息。
        </p>
        <DataTable
          pagination
          statusColumns={[8]}
          columns={[
            "行号",
            "姓名",
            "工号",
            "登录账号",
            "所属院系",
            "所属专业",
            "联系电话",
            "备注",
            "校验结果",
          ]}
          rows={rows.map((row) => [
            row.index,
            row.name || "—",
            row.employeeNo || "—",
            row.account || "—",
            row.department || "—",
            row.major || "—",
            row.phone || "—",
            row.notes || "—",
            row.result,
          ])}
        />
      </section>
      <p className="form-hint">
        每位教师自动分配独立临时密码，首次登录须修改；成功后可一次性下载或复制登录信息。
      </p>
    </div>
  );
});

const StudentImportForm = forwardRef(function StudentImportForm(_, ref) {
  const { data } = usePrototypeData();
  const [raw, setRaw] = useState(
    "赵一,20261001,NEV-2401\n孙二,20261002,NEV-2402",
  );
  const [attempted, setAttempted] = useState(false);
  const sourceLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const dataLines = sourceLines[0]?.replaceAll(" ", "").startsWith("姓名,学号,")
    ? sourceLines.slice(1)
    : sourceLines;
  const rows = dataLines.map((line, index) => {
    const [name = "", no = "", classCode = ""] = line
      .split(",")
      .map((item) => item.trim());
    const classItem = data.classes.find(
      (item) => item.code.toUpperCase() === classCode.toUpperCase(),
    );
    let result = "可导入";
    if (!name || !/^\d{6,20}$/.test(no) || !classItem) result = "字段错误";
    else if (data.students.some((item) => item.no === no)) result = "学号重复";
    else if (
      dataLines.filter((candidate) => candidate.split(",")[1]?.trim() === no)
        .length > 1
    )
      result = "批次内重复";
    else if (classItem.status !== "启用") result = "班级不可用";
    return {
      index: index + 1,
      name,
      no,
      classCode,
      classId: classItem?.id,
      result,
    };
  });
  useImperativeHandle(ref, () => ({
    validate() {
      setAttempted(true);
      if (!rows.length) throw new Error("请粘贴或选择至少一条学生数据。");
      if (rows.some((row) => row.result !== "可导入"))
        throw new Error("预览中存在错误行，请修正后重新导入。");
      return rows.map((row) => ({
        name: row.name,
        no: row.no,
        classId: row.classId,
        gender: "未填写",
        admissionYear: row.no.slice(0, 4),
      }));
    },
  }));
  return (
    <div className="import-form">
      <div className="import-actions">
        <a
          className="button button--default"
          download="学生导入模板.csv"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent("姓名,学号,班级标识\n赵一,20261001,NEV-2401")}`}
        >
          下载CSV模板
        </a>
        <label className="button button--default import-file">
          选择CSV文件
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) setRaw(await file.text());
            }}
          />
        </label>
      </div>
      <label className="field">
        <span className="field__label">
          导入内容
          <small className="field__label-hint">每行：姓名,学号,班级标识</small>
        </span>
        <textarea
          rows={5}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setAttempted(false);
          }}
        />
      </label>
      <section className="import-preview">
        <PanelTitle
          title={
            <>
              导入预览{" "}
              <span className="import-preview__count">· {rows.length} 行</span>
            </>
          }
        />
        <DataTable
          pagination
          columns={["姓名", "学号", "班级标识", "校验结果"]}
          rows={rows.map((row) => [
            row.name || "--",
            row.no || "--",
            row.classCode || "--",
            row.result,
          ])}
        />
      </section>
      {attempted && rows.some((row) => row.result !== "可导入") && (
        <p className="form-error" role="alert">
          <ExclamationCircleFilled /> 请先修正“字段错误”或“学号重复”的行。
        </p>
      )}
    </div>
  );
});

function AdminList({ type, setModal }) {
  const nav = useNavigate();
  const location = useLocation();
  const workstationFilter =
    type === "devices"
      ? new URLSearchParams(location.search).get("workstationId")
      : "";
  const formRef = useRef(null);
  const importRef = useRef(null);
  const store = usePrototypeData();
  const { data } = store;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [faceFilter, setFaceFilter] = useState("全部人脸状态");
  const configs = {
    teachers: {
      title: "教师管理",
      subtitle: "维护教师账号、专业归属与教学资格",
      singular: "教师",
      createText: "新建教师",
      formType: "teacher",
      collection: "teachers",
      columns: [
        "教师",
        "工号",
        "登录账号",
        "状态",
        "密码状态",
        "院系 / 专业",
        "更新时间",
      ],
      row: (item) => [
        item.name,
        item.employeeNo,
        item.account,
        item.status,
        teacherPasswordStatus(item),
        `${item.department} / ${item.major}`,
        item.updatedAt,
      ],
      key: "employeeNo",
      create: store.createTeacher,
    },
    students: {
      title: "学生管理",
      subtitle: "维护学生身份、班级归属、账号和人脸资料",
      singular: "学生",
      createText: "新增学生",
      formType: "student",
      collection: "students",
      columns: ["学生", "学号", "班级", "状态", "人脸资料", "更新时间"],
      row: (item) => [
        item.name,
        item.no,
        data.classes.find((c) => c.id === item.classId)?.name || "未归班",
        item.status,
        getStudentFaceStatus(item),
        item.updatedAt,
      ],
      key: "no",
      create: store.createStudent,
    },
    workstations: {
      title: "工位管理",
      subtitle: "维护物理工位、设备绑定与AI基础运行条件",
      singular: "工位",
      createText: "新建工位",
      formType: "workstation",
      collection: "workstations",
      columns: [
        "工位",
        "标识 / 位置",
        "业务状态",
        "主摄像头",
        "摄像头状态",
        "AI就绪",
        "绑定设备",
        "更新时间",
      ],
      row: (item) => {
        const aiConfig = normalizeWorkstationAiBaseConfig(item);
        const camera = data.devices.find(
          (device) => device.id === aiConfig.primaryCameraId,
        );
        const readiness = deriveWorkstationAiReadiness({
          workstation: item,
          devices: data.devices,
          edgeRequired: true,
        });
        return [
          item.name,
          workstationCaption(item),
          item.status,
          camera?.name || "未配置",
          camera
            ? `${camera.status} / ${camera.streamStatus || "流状态未知"}`
            : "--",
          readiness.label,
          `${data.devices.filter((d) => d.workstationId === item.id).length} 台`,
          item.updatedAt,
        ];
      },
      key: "code",
      create: store.createWorkstation,
    },
    devices: {
      title: "设备管理",
      subtitle: "分类型登记设备并维护连接、版本与工位绑定",
      singular: "设备",
      createText: "登记设备",
      formType: "device",
      collection: "devices",
      columns: ["设备", "序列号", "类型", "状态", "所属工位", "版本"],
      row: (item) => [
        deviceDisplayName(item),
        deviceSerialLabel(item),
        item.type,
        item.status,
        data.workstations.find((w) => w.id === item.workstationId)?.name ||
          "未绑定",
        item.version,
      ],
      key: "name",
      create: store.createDevice,
    },
  };
  const config = configs[type];
  const items = data[config.collection];
  const filtered = items.filter(
    (item) =>
      Object.entries(item)
        .filter(([key]) => key !== "facePhotoDataUrl")
        .map(([, value]) => value)
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!workstationFilter || item.workstationId === workstationFilter) &&
      (statusFilter === "全部状态" || item.status === statusFilter) &&
      (type !== "students" ||
        faceFilter === "全部人脸状态" ||
        getStudentFaceStatus(item) === faceFilter),
  );
  const openCreate = () =>
    setModal({
      eyebrow: "基础资料",
      title: config.createText,
      size: "large",
      confirmText: `保存${config.singular}`,
      content: <MasterDataForm ref={formRef} type={config.formType} />,
      onSuccess:
        type === "teachers"
          ? (receipt) => setModal(teacherPasswordReceiptModal(receipt, true))
          : undefined,
      onConfirm: async () => {
        const created = await config.create(formRef.current.validate());
        if (type === "teachers") return created;
        return `已${config.createText}：${created.name}`;
      },
    });
  const openImport = () =>
    setModal({
      eyebrow: "批量导入",
      title: type === "teachers" ? "导入教师" : "导入学生",
      size: "large",
      confirmText: "确认导入",
      content:
        type === "teachers" ? (
          <TeacherImportForm ref={importRef} />
        ) : (
          <StudentImportForm ref={importRef} />
        ),
      onSuccess:
        type === "teachers"
          ? (receipts) => setModal(teacherImportReceiptModal(receipts))
          : undefined,
      onConfirm: () => {
        if (type === "teachers")
          return store.importTeachers(importRef.current.validate());
        const created = store.importStudents(importRef.current.validate());
        return `已导入 ${created.length} 名学生`;
      },
    });
  const actions = ["students", "teachers"].includes(type) ? (
    <>
      <Button icon={<UploadOutlined />} onClick={openImport}>
        {type === "teachers" ? "导入教师" : "导入学生"}
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        {config.createText}
      </Button>
    </>
  ) : (
    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
      {config.createText}
    </Button>
  );
  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={actions}
      />
      <section className="panel panel--table">
        <Toolbar
          placeholder={`搜索${config.singular}名称、标识或关联信息`}
          filters={["全部状态", ...new Set(items.map((item) => item.status))]}
          value={query}
          filterValue={statusFilter}
          onChange={setQuery}
          onFilterChange={setStatusFilter}
          onRefresh={() => {
            setQuery("");
            setStatusFilter("全部状态");
            setFaceFilter("全部人脸状态");
          }}
        >
          {workstationFilter && (
            <>
              <span>
                当前工位：
                {data.workstations.find((w) => w.id === workstationFilter)
                  ?.name || "工位已失效"}
              </span>
              <Button onClick={() => nav("/admin/devices")}>
                查看全部设备
              </Button>
            </>
          )}
          {type === "students" && (
            <select
              aria-label="筛选人脸资料状态"
              value={faceFilter}
              onChange={(event) => setFaceFilter(event.target.value)}
            >
              <option>全部人脸状态</option>
              <option>已采集</option>
              <option>未采集</option>
              <option>待重采</option>
            </select>
          )}
        </Toolbar>
        <DataTable
          pagination
          columns={config.columns}
          rows={filtered.map(config.row)}
          rowKey={(_, index) => filtered[index].id}
          renderActions={
            type === "teachers"
              ? (_, index) => (
                  <button
                    className="table-action"
                    onClick={() =>
                      openTeacherPasswordReset(setModal, store, filtered[index])
                    }
                  >
                    重置密码
                  </button>
                )
              : undefined
          }
          onView={(_, index) => {
            const target = filtered[index];
            if (target) nav(`/admin/${type}/${target.id}`);
          }}
        />
      </section>
    </>
  );
}

function RoiPreview({
  implementation,
  image = "/assets/workstation-male.png",
}) {
  return (
    <div className="roi-preview">
      <img src={image} alt="工位当前画面与 ROI 预览" />
      {(implementation?.rois || []).map((roi) => (
        <span
          key={roi.key}
          className={`roi-box roi-box--${roi.tone}`}
          style={{
            left: `${roi.x}%`,
            top: `${roi.y}%`,
            width: `${roi.width}%`,
            height: `${roi.height}%`,
          }}
        >
          {roi.label}
        </span>
      ))}
    </div>
  );
}

const ImplementationCheckForm = forwardRef(function ImplementationCheckForm(
  { workstation, evaluationItems = [] },
  ref,
) {
  const [form, setForm] = useState(() => ({
    ...workstation.implementation,
  }));
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateCamera = (id, field, value) =>
    setForm((current) => ({
      ...current,
      cameras: (current.cameras || []).map((camera) =>
        camera.id === id ? { ...camera, [field]: value } : camera,
      ),
    }));
  const updateEvidenceBinding = (evaluationItemId, field, value) =>
    setForm((current) => {
      const existing = (current.evidenceBindings || []).find(
        (item) => item.evaluationItemId === evaluationItemId,
      ) || { evaluationItemId, primaryCameraId: "", fallbackCameraId: "" };
      return {
        ...current,
        evidenceBindings: [
          ...(current.evidenceBindings || []).filter(
            (item) => item.evaluationItemId !== evaluationItemId,
          ),
          { ...existing, [field]: value },
        ],
      };
    });
  useImperativeHandle(ref, () => ({ getValue: () => form }));
  return (
    <div className="implementation-form">
      <RoiPreview implementation={form} />
      <p className="hint">
        矩形 ROI
        仅标记操作区、工具区和危险区，不引入额外传感器。调整版本后，既有现场验证自动失效并需重新测试。
      </p>
      <div className="form-row">
        <label className="field">
          摄像头配置版本
          <input
            value={form.cameraConfigVersion}
            onChange={(event) =>
              change("cameraConfigVersion", event.target.value)
            }
          />
        </label>
        <label className="field">
          ROI 版本
          <input
            value={form.roiVersion}
            onChange={(event) => change("roiVersion", event.target.value)}
          />
        </label>
      </div>
      <section className="profile-camera-section">
        <h3>摄像头配置与证据来源</h3>
        <div className="form-row">
          {(form.cameras || []).map((camera) => (
            <label className="field" key={camera.id}>
              {camera.id}
              <input
                value={camera.name}
                onChange={(event) =>
                  updateCamera(camera.id, "name", event.target.value)
                }
              />
              <select
                value={camera.status || "在线"}
                onChange={(event) =>
                  updateCamera(camera.id, "status", event.target.value)
                }
              >
                <option>在线</option>
                <option>待检查</option>
                <option>离线</option>
              </select>
            </label>
          ))}
        </div>
        <div className="form-row">
          <label className="field">
            默认主摄像头
            <select
              value={form.primaryCameraId || ""}
              onChange={(event) =>
                change("primaryCameraId", event.target.value)
              }
            >
              {(form.cameras || []).map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            默认备用摄像头
            <select
              value={form.fallbackCameraId || ""}
              onChange={(event) =>
                change("fallbackCameraId", event.target.value)
              }
            >
              <option value="">不设置</option>
              {(form.cameras || [])
                .filter((camera) => camera.id !== form.primaryCameraId)
                .map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {!!evaluationItems.length && (
          <div className="evidence-binding-list">
            {evaluationItems.map((item) => {
              const binding =
                (form.evidenceBindings || []).find(
                  (entry) => entry.evaluationItemId === item.id,
                ) || {};
              const primary =
                binding.primaryCameraId || form.primaryCameraId || "";
              const fallback =
                binding.fallbackCameraId || form.fallbackCameraId || "";
              return (
                <article key={item.id}>
                  <strong>
                    {item.id} · {item.name}
                  </strong>
                  <label>
                    主摄像头
                    <select
                      value={primary}
                      onChange={(event) =>
                        updateEvidenceBinding(
                          item.id,
                          "primaryCameraId",
                          event.target.value,
                        )
                      }
                    >
                      {(form.cameras || []).map((camera) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    备用摄像头
                    <select
                      value={fallback}
                      onChange={(event) =>
                        updateEvidenceBinding(
                          item.id,
                          "fallbackCameraId",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">不设置</option>
                      {(form.cameras || [])
                        .filter((camera) => camera.id !== primary)
                        .map((camera) => (
                          <option key={camera.id} value={camera.id}>
                            {camera.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </article>
              );
            })}
          </div>
        )}
        <p className="hint">
          主摄像头不可用时才尝试备用摄像头；当前不合并多路摄像头的识别结果，避免同一动作重复计数。
        </p>
      </section>
      <div className="form-row implementation-confirm-grid">
        {[
          ["cameraPosition", "机位条件"],
          ["lighting", "光照条件"],
          ["occlusion", "遮挡条件"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <select
              value={form[key] || ""}
              onChange={(event) => change(key, event.target.value)}
            >
              <option value="">请选择</option>
              <option>已确认</option>
              <option>需调整</option>
            </select>
          </label>
        ))}
      </div>
      <label className="field">
        关键设备与环境摘要
        <textarea
          value={form.environmentSummary || form.note || ""}
          onChange={(event) => change("environmentSummary", event.target.value)}
        />
      </label>
    </div>
  );
});

const FieldValidationForm = forwardRef(function FieldValidationForm(
  { workstation, sops, evaluationItems = [] },
  ref,
) {
  const [sopId, setSopId] = useState(sops[0]?.id || "");
  const [operator, setOperator] = useState("刘工");
  const [note, setNote] = useState("");
  const [testCases, setTestCases] = useState(() =>
    FIELD_VALIDATION_SCENARIOS.map(([key, label], index) => ({
      id: `case-${key}`,
      name: `${label}验证`,
      scenarioTypes: [key],
      evaluationItemIds:
        index === 0 ? evaluationItems.map((item) => item.id) : [],
      result: "",
      note: "",
    })),
  );
  const updateCase = (id, field, value) =>
    setTestCases((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  const toggleCoverage = (caseId, itemId) =>
    setTestCases((current) =>
      current.map((item) =>
        item.id !== caseId
          ? item
          : {
              ...item,
              evaluationItemIds: item.evaluationItemIds.includes(itemId)
                ? item.evaluationItemIds.filter((id) => id !== itemId)
                : [...item.evaluationItemIds, itemId],
            },
      ),
    );
  useImperativeHandle(ref, () => ({
    getValue: () => ({
      workstationId: workstation.id,
      sopId,
      operator,
      note,
      testCases,
    }),
  }));
  return (
    <div className="field-validation-form">
      <div className="form-row">
        <label className="field">
          待验证实训标准
          <select
            value={sopId}
            onChange={(event) => setSopId(event.target.value)}
          >
            {sops.map((sop) => (
              <option key={sop.id} value={sop.id}>
                {sop.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          现场验证人
          <input
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
          />
        </label>
      </div>
      <div className="validation-scenario-list">
        {testCases.map((testCase, index) => (
          <article key={testCase.id} className="validation-test-case">
            <b>{index + 1}</b>
            <div>
              <strong>{testCase.name}</strong>
              <small>
                场景：
                {testCase.scenarioTypes
                  .map(
                    (key) =>
                      FIELD_VALIDATION_SCENARIOS.find(
                        (item) => item[0] === key,
                      )?.[1],
                  )
                  .filter(Boolean)
                  .join("、")}
              </small>
            </div>
            <select
              aria-label={`${testCase.name}结果`}
              value={testCase.result}
              onChange={(event) =>
                updateCase(testCase.id, "result", event.target.value)
              }
            >
              <option value="">请选择结果</option>
              <option>通过</option>
              <option>失败</option>
              <option>不适用</option>
            </select>
            <input
              aria-label={`${testCase.name}说明`}
              value={testCase.note}
              onChange={(event) =>
                updateCase(testCase.id, "note", event.target.value)
              }
              placeholder="现场现象或失败原因"
            />
            <div className="validation-item-coverage">
              {evaluationItems.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={testCase.evaluationItemIds.includes(item.id)}
                    onChange={() => toggleCoverage(testCase.id, item.id)}
                  />
                  {item.id} · {item.name}
                </label>
              ))}
              {!evaluationItems.length && (
                <span className="hint">当前评价映射无AI 评价项</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <label className="field">
        验证总结
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <p className="hint">
        一个现场验证用例可以覆盖多个评价项，无需为每种组合单独建用例。全部评价项均有验证通过的用例覆盖后，当前工位才允许自动评价。
      </p>
    </div>
  );
});

function AdminDetail({ type, setModal }) {
  const { id } = useParams();
  const nav = useNavigate();
  const formRef = useRef(null);
  const workstationRecoveryRef = useRef(null);
  const faceUploadRef = useRef(null);
  const workstationAiRef = useRef(null);
  const store = usePrototypeData();
  const { data } = store;
  const plural = {
    teacher: "teachers",
    student: "students",
    workstation: "workstations",
    device: "devices",
  }[type];
  const item = data[plural].find((candidate) => candidate.id === id);
  const classItem =
    type === "student"
      ? data.classes.find((candidate) => candidate.id === item?.classId)
      : null;
  const workstation =
    type === "device"
      ? data.workstations.find(
          (candidate) => candidate.id === item?.workstationId,
        )
      : null;
  if (!item)
    return (
      <section className="empty-page">
        <ExclamationCircleFilled />
        <h1>资料不存在或已失效</h1>
        <p>该记录可能已被重置，请返回列表重新选择。</p>
        <Button onClick={() => nav(`/admin/${plural}`)}>返回列表</Button>
      </section>
    );
  const workstationUse =
    type === "workstation" ? workstationArrangementState(data, item.id) : null;
  const currentWorkstationArrangement = workstationUse?.arrangement;
  const currentArrangementLabel =
    currentWorkstationArrangement?.name ||
    (workstationUse?.status === "conflict"
      ? "存在多条占用记录"
      : workstationUse?.status === "unresolved"
        ? "占用信息待核对"
        : "无");
  const configs = {
    teacher: {
      singular: "教师",
      formType: "teacher",
      icon: <TeamOutlined />,
      subtitle: `${item.employeeNo} · ${item.department}`,
      identity: `${item.account} · ${item.major}`,
      details: [
        ["教师工号", item.employeeNo],
        ["登录账号", item.account],
        ["联系电话", item.phone || "未填写"],
        ["所属院系", item.department],
        ["所属专业", item.major],
        ["负责标准", `${item.sopCount} 个`],
        ["历史安排", `${item.arrangementCount} 次`],
        ["密码状态", teacherPasswordStatus(item)],
        ["最近密码重置", item.accountResetAt || "未重置"],
        ["最近密码设置", item.passwordCredential?.changedAt || "未设置"],
        ["更新时间", item.updatedAt],
      ],
      update: store.updateTeacher,
    },
    student: {
      singular: "学生",
      formType: "student",
      icon: <UserOutlined />,
      subtitle: `${item.no} · ${classItem?.name || "未归班"}`,
      identity: `${item.gender} · ${item.admissionYear}级`,
      details: [
        ["学号", item.no],
        ["所属班级", classItem?.name || "未归班"],
        ["所属专业", classItem?.major || "--"],
        ["账号状态", item.status],
        ["入学年份", item.admissionYear],
        ["练习记录", "12 次"],
        ["考试记录", "3 次"],
      ],
      update: store.updateStudent,
    },
    workstation: {
      singular: "工位",
      formType: "workstation",
      icon: <DesktopOutlined />,
      subtitle: workstationCaption(item),
      identity: `已关联 ${workstationLinkedStandards(data, item.id).length} 个实训标准`,
      details: [
        ["工位标识", workstationBusinessCode(item) || "演示工位"],
        ["实训室位置", item.location],
        ["管理状态", item.status],
        ["使用限制", workstationUsageRestriction(item) || "无"],
        [
          "关联实训标准",
          `${workstationLinkedStandards(data, item.id).length} 个`,
        ],
        [
          "绑定设备",
          `${data.devices.filter((device) => device.workstationId === item.id).length} 台`,
        ],
        ["当前安排", currentArrangementLabel],
        ["更新时间", item.updatedAt || "未记录"],
      ],
      update: store.updateWorkstation,
    },
    device: {
      singular: "设备",
      formType: "device",
      icon: <HddOutlined />,
      subtitle: `${item.type} · ${workstation?.name || "未绑定工位"}`,
      identity: [
        hiddenDeviceSerial(item) ? "演示设备" : item.serial,
        item.version,
      ]
        .filter(Boolean)
        .join(" · "),
      details: [
        ["设备序列号", deviceSerialLabel(item)],
        ["设备类型", item.type],
        ["在线状态", item.status],
        ["所属工位", workstation?.name || "未绑定"],
        ["连接地址", item.address],
        ["当前版本", item.version],
        ["最后心跳", item.lastHeartbeat],
        ["最近连接测试", item.lastTestAt],
      ],
      update: store.updateDevice,
    },
  };
  const config = configs[type];
  const openEdit = () =>
    setModal({
      eyebrow: "基础资料",
      title: `编辑${config.singular}：${item.name}`,
      size: "large",
      confirmText: "保存修改",
      content: (
        <MasterDataForm ref={formRef} type={config.formType} initial={item} />
      ),
      onConfirm: () => {
        const updated = config.update(item.id, formRef.current.validate());
        return `已更新${config.singular}：${updated.name}`;
      },
    });
  const statusConfig = {
    teacher: {
      next: item.status === "停用" ? "启用" : "停用",
      actionLabel: item.status === "停用" ? "启用教师" : "停用教师",
      method: store.setTeacherStatus,
      warning:
        item.status === "停用"
          ? "启用后可重新登录并参与新安排。"
          : `停用后账号不能登录，也不会出现在新建安排的教师选项中；${item.arrangementCount}条历史安排仍保留。`,
    },
    student: {
      next: item.status === "停用" ? "启用" : "停用",
      actionLabel: item.status === "停用" ? "启用学生" : "停用学生",
      method: store.setStudentStatus,
      warning:
        item.status === "停用"
          ? "启用后可重新参加新的练习和考试。"
          : "停用后不能参加新安排，历史成绩和证据仍完整保留。",
    },
    workstation: {
      next: item.status === "维护中" ? "可入场" : "维护中",
      actionLabel: item.status === "维护中" ? "恢复工位" : "进入维护",
      method: store.setWorkstationStatus,
      warning:
        item.status === "维护中"
          ? "恢复前请确认设备和现场检查均已完成。"
          : "进入维护后不再允许分配新学生；当前记录和设备绑定保持不变。",
    },
    device: {
      next: item.status === "停用" ? "待检测" : "停用",
      actionLabel: item.status === "停用" ? "启用设备" : "停用设备",
      method: store.setDeviceStatus,
      warning:
        item.status === "停用"
          ? "启用后状态为待检测，连接测试通过后才显示在线。"
          : "停用后不再用于新会话，既有录像和历史绑定记录仍保留。",
    },
  }[type];
  const toggleStatus = () =>
    setModal({
      title: statusConfig.actionLabel,
      className:
        type === "teacher"
          ? "teacher-status-modal"
          : type === "student"
            ? "student-status-modal"
            : type === "workstation"
              ? "workstation-status-modal"
              : "device-status-modal",
      content: <p>{statusConfig.warning}</p>,
      confirmText: `确认${statusConfig.actionLabel}`,
      onConfirm: () => {
        statusConfig.method(item.id, statusConfig.next);
        return `${config.singular}状态已更新为${statusConfig.next}`;
      },
    });
  const secondary = {
    teacher: {
      label: "重置密码",
    },
    student: {
      label: "人脸重采",
      title: "发起人脸资料重采",
      text: "原人脸资料不会用于新的身份确认；学生需在受控采集点重新完成采集。",
      confirm: "确认发起",
      run: () => {
        store.resetStudentFace(item.id);
        return "人脸资料状态已更新为待重采";
      },
    },
    workstation: {
      label: "处理使用限制",
      title: "处理异常并解除工位使用限制",
      text: "请先处理具体故障或安全隐患，并执行相关设备检测。此操作只记录处理结果并解除使用限制，不修复离线设备、不启用AI。下次使用仍需教师开放检查。",
      confirm: "确认处理并解除限制",
      run: () => {
        store.resolveWorkstationRestriction(item.id, {
          expectedHoldId: item.releaseHold?.id || "",
          note: workstationRecoveryRef.current?.value || "",
        });
        return "工位使用限制已解除，下次使用前请检查并开放";
      },
    },
    device: {
      label: "连接测试",
      title: "设备连接测试",
      text: `检测设备连接状态，连接地址：${item.address}。`,
      confirm: "开始测试",
      run: () => {
        const when = store.testDeviceConnection(item.id);
        return `连接测试成功：${when}`;
      },
    },
  }[type];
  // Historical audit entries may have no textual target. Keep those records in
  // storage, but do not let unrelated / incomplete logs break a master detail.
  const relatedLogs = (data.auditLogs || [])
    .filter(
      (log) =>
        typeof log?.target === "string" && log.target.includes(item.name),
    )
    .slice(0, 5);
  const openWorkstationAiConfig = () =>
    setModal({
      eyebrow: "工位AI基础配置",
      title: `${item.name} · 配置设备与视角`,
      className: "workstation-ai-config-modal",
      size: "large",
      content: (
        <WorkstationAiBaseConfigForm
          ref={workstationAiRef}
          workstation={item}
        />
      ),
      confirmText: "保存配置",
      onSuccess: (saved) =>
        setModal({
          title: "设备与视角配置已保存",
          dismissOnly: true,
          hideCancel: true,
          confirmText: "返回工位详情",
          content: (
            <div className="form-stack">
              <p>配置已保存，请检测设备。</p>
              {!saved.workstation.aiBaseConfig.edgeDeviceId && (
                <p>
                  未配置边缘设备：录像与人工确认配置已保存，AI仍为待完善，不会启用自动评价。
                </p>
              )}
              <p>
                {saved.criticalChange
                  ? `运行条件已变化，${saved.affectedCount}条现场验证状态待重新验证。`
                  : "本次未改变采集条件，已有现场验证状态保留。"}
              </p>
              <button
                className="button button--primary"
                onClick={() =>
                  openWorkstationInspection(setModal, store, saved.workstation)
                }
              >
                下一步：设备检测
              </button>
              <p className="form-hint">
                检测后可在“关联标准与AI运行状态”中完成对应标准的现场验证。
              </p>
            </div>
          ),
        }),
      onConfirm: () => {
        const saved = store.saveWorkstationAiBaseConfig(
          item.id,
          workstationAiRef.current.validate(),
          workstationAiRef.current.expectedConfig,
        );
        return saved;
      },
    });
  const studentFaceStatus =
    type === "student" ? getStudentFaceStatus(item) : "";
  const openStudentFaceUpload = () =>
    setModal({
      eyebrow: "学生人脸资料",
      title: `${item.name} · ${item.facePhotoDataUrl ? "重新上传" : "上传照片"}`,
      className: "student-face-upload-modal",
      size: "large",
      confirmText: "保存人脸照片",
      content: <StudentFaceUploadForm ref={faceUploadRef} student={item} />,
      onConfirm: () => {
        const result = faceUploadRef.current.validate();
        store.updateStudentFacePhoto(item.id, result.dataUrl);
        return `已更新${item.name}的人脸资料`;
      },
    });
  const openStudentFaceReset = () =>
    setModal({
      eyebrow: "学生人脸资料",
      title: "确认发起人脸重采？",
      className: "student-face-reset-modal",
      content: (
        <div className="student-face-reset-warning">
          <ExclamationCircleFilled />
          <p>
            发起后，当前人脸资料将停止用于新的学生身份确认。学生需重新上传有效照片后才能刷脸登录。
          </p>
        </div>
      ),
      confirmText: "确认发起重采",
      onConfirm: () => {
        store.resetStudentFace(item.id);
        return "人脸资料状态已更新为待重采";
      },
    });
  return (
    <>
      <PageHeader
        back
        title={`${config.singular}详情 · ${type === "device" ? deviceDisplayName(item) : item.name}`}
        subtitle={config.subtitle}
        actions={
          <>
            {type === "workstation" && (
              <Button
                icon={<VideoCameraOutlined />}
                onClick={openWorkstationAiConfig}
              >
                配置设备与视角
              </Button>
            )}
            {type !== "student" &&
              (type !== "workstation" ||
                item.releaseHold ||
                item.status === "故障") && (
                <Button
                  onClick={() =>
                    type === "teacher"
                      ? openTeacherPasswordReset(setModal, store, item)
                      : setModal({
                          title: secondary.title,
                          className:
                            type === "teacher"
                              ? "teacher-account-reset-modal"
                              : type === "workstation"
                                ? "workstation-reset-modal"
                                : "device-connection-test-modal",
                          content:
                            type === "workstation" ? (
                              <div className="form-stack">
                                <p>{secondary.text}</p>
                                {item.releaseHold && (
                                  <p className="hint">
                                    {item.releaseHold.reasons.join("；")}
                                  </p>
                                )}
                                <label className="field">
                                  异常处理及现场检查结果
                                  <textarea
                                    ref={workstationRecoveryRef}
                                    rows={3}
                                    placeholder="填写故障或安全隐患的处理情况及检查结果"
                                  />
                                </label>
                              </div>
                            ) : (
                              <p>{secondary.text}</p>
                            ),
                          confirmText: secondary.confirm,
                          onConfirm: secondary.run,
                        })
                  }
                >
                  {secondary.label}
                </Button>
              )}
            <Button
              onClick={toggleStatus}
              disabled={
                type === "workstation" && activeWorkstationUse(data, item.id)
              }
            >
              {statusConfig.actionLabel}
            </Button>
            <Button type="primary" onClick={openEdit}>
              编辑资料
            </Button>
          </>
        }
      />
      {type === "workstation" && (
        <div className="equipment-overview-heading">
          <h2>工位概况与使用状态</h2>
          {currentWorkstationArrangement && (
            <Link
              className="table-action"
              to={`/admin/${currentWorkstationArrangement.type === "exam" ? "exams" : "practices"}/${encodeURIComponent(currentWorkstationArrangement.id)}`}
            >
              查看当前安排
            </Link>
          )}
        </div>
      )}
      {type === "workstation" &&
        ["conflict", "unresolved"].includes(workstationUse.status) && (
          <p className="hint">
            {workstationUse.status === "conflict"
              ? "该工位存在多条未结束占用，请核对相关安排。"
              : "工位占用记录无法关联到有效安排，请核对占用信息。"}
          </p>
        )}
      <div className="identity-card">
        <span>{config.icon}</span>
        <div>
          <h2>{type === "device" ? deviceDisplayName(item) : item.name}</h2>
          <p>{config.identity}</p>
        </div>
        <Status>{item.status}</Status>
      </div>
      {type === "workstation" && activeWorkstationUse(data, item.id) && (
        <p className="hint">
          工位有活动会话或仍被占用。结束相关会话后才能进入维护、更换运行设备或解除使用限制。
        </p>
      )}
      <div className="detail-grid class-detail-grid">
        {config.details.map(([label, value]) => (
          <section className="panel" key={label}>
            <small>{label}</small>
            <h2>{displayBusinessText(value)}</h2>
          </section>
        ))}
        {type === "teacher" && item.notes && (
          <section className="panel class-notes teacher-detail-notes">
            <PanelTitle title="备注" />
            <p>{item.notes}</p>
          </section>
        )}
      </div>
      {type === "student" && (
        <section className="panel student-face-card">
          <PanelTitle
            title="人脸资料"
            action={<Status>{studentFaceStatus}</Status>}
          />
          <div className="student-face-card__content">
            <div
              className={`student-face-card__photo ${studentFaceStatus === "待重采" ? "is-invalid" : ""}`}
            >
              {item.facePhotoDataUrl ? (
                <img
                  src={item.facePhotoDataUrl}
                  alt={`${item.name}的人脸资料照片`}
                />
              ) : (
                <span>
                  <UserOutlined />
                  <small>暂无有效人脸照片</small>
                </span>
              )}
              {studentFaceStatus === "待重采" && item.facePhotoDataUrl && (
                <b>已失效</b>
              )}
            </div>
            <div className="student-face-card__details">
              <dl>
                <div>
                  <dt>当前状态</dt>
                  <dd>
                    <Status>{studentFaceStatus}</Status>
                  </dd>
                </div>
                <div>
                  <dt>最近采集时间</dt>
                  <dd>
                    {displayBusinessText(item.faceUpdatedAt || "尚未采集")}
                  </dd>
                </div>
                <div>
                  <dt>资料用途</dt>
                  <dd>学生端身份确认</dd>
                </div>
              </dl>
              <p>
                {studentFaceStatus === "待重采"
                  ? "当前照片仅供管理员参考，已经不能用于学生刷脸登录。"
                  : studentFaceStatus === "未采集"
                    ? "上传一张有效照片后，学生即可使用原型刷脸登录。"
                    : "当前照片可用于学生端的原型身份确认。"}
              </p>
              <div className="student-face-card__actions">
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={openStudentFaceUpload}
                >
                  {studentFaceStatus === "已采集"
                    ? "重新上传"
                    : studentFaceStatus === "待重采"
                      ? "上传新照片"
                      : "上传照片"}
                </Button>
                {studentFaceStatus === "已采集" && (
                  <Button onClick={openStudentFaceReset}>发起重采</Button>
                )}
              </div>
            </div>
          </div>
          <div className="student-face-card__privacy">
            原型照片仅保存在当前浏览器本地存储
            中；正式系统需改用受控对象存储与访问审计。
          </div>
        </section>
      )}
      {type !== "teacher" && item.notes && (
        <section className="panel class-notes">
          <PanelTitle title="备注" />
          <p>{item.notes}</p>
        </section>
      )}
      {type === "workstation" && (
        <>
          <WorkstationEquipmentPanel
            workstation={item}
            setModal={setModal}
            onConfigure={openWorkstationAiConfig}
          />
          <WorkstationStandardsPanel workstation={item} />
        </>
      )}
      {type === "teacher" && (
        <section className="panel panel--table">
          <PanelTitle title="负责班级与教学范围" />
          <DataTable
            pagination
            columns={["班级", "专业", "学生人数", "状态"]}
            rows={data.classes
              .filter((candidate) => candidate.headTeacher === item.name)
              .map((candidate) => [
                candidate.name,
                candidate.major,
                `${candidate.studentCount} 人`,
                candidate.status,
              ])}
            emptyText="当前教师尚未关联负责班级。"
          />
        </section>
      )}
      {type === "student" && (
        <section className="panel panel--table">
          <PanelTitle title="最近参与记录" />
          <DataTable
            pagination
            columns={["时间", "类型", "项目", "结果"]}
            rows={[
              ["2026-09-16", "考试", "新能源汽车高压安全操作", "待发布"],
              ["2026-09-12", "练习", "高压安全操作练习", "78分"],
            ]}
          />
        </section>
      )}
      {type === "device" && (
        <section className="panel device-binding-note">
          <PanelTitle title="绑定与健康说明" />
          <p>
            {workstation
              ? `当前绑定 ${workstationOptionLabel(workstation)}。关联实训标准：${
                  workstationLinkedStandards(data, workstation.id)
                    .map((sop) => sop.name)
                    .join("、") || "尚未关联"
                }。`
              : "当前未绑定工位，不会参与任何实训会话。"}
          </p>
          <p className="form-hint">
            设备健康和业务会话状态分开记录；连接测试通过不代表工位已经开放。
          </p>
        </section>
      )}
      <section className="panel panel--table admin-detail-audit-table">
        <PanelTitle title="最近审计记录" />
        <DataTable
          pagination
          columns={["时间", "操作者", "操作", "说明", "结果"]}
          rows={relatedLogs.map((log) => [
            log.time,
            `${log.actor}（${log.role}）`,
            log.action,
            log.detail || log.changedFields || "—",
            log.result,
          ])}
          emptyText="当前对象还没有新的审计记录。"
        />
      </section>
    </>
  );
}
function AdminRecords({ exam = false, setModal }) {
  const nav = useNavigate();
  const store = usePrototypeData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const sourceItems = store.data.arrangements.filter(
    (item) =>
      item.type === (exam ? "exam" : "practice") && !item.archivedRecord,
  );
  const filters = [
    "全部状态",
    ...new Set(sourceItems.map((item) => item.status)),
  ];
  const records = sourceItems.map((item) => {
    const sop = store.data.sops.find((entry) => entry.id === item.sopId);
    return [
      item.name,
      item.teacherName || "王老师",
      sop?.name || "标准已失效",
      `${item.studentIds.length}人`,
      item.status,
      item.scheduleStart
        ? displayBusinessText(item.scheduleStart).replace("T", " ")
        : "待定",
      item.id,
    ];
  });
  const filteredRecords = records.filter(
    (row) =>
      row
        .slice(0, 6)
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (statusFilter === "全部状态" || row[4] === statusFilter),
  );
  const exportRecords = () =>
    setModal({
      title: `导出当前${exam ? "考试" : "练习"}记录`,
      className: "admin-record-export-modal",
      content: (
        <p>
          将按当前搜索与状态筛选导出 {filteredRecords.length} 条只读记录，格式为
          CSV。
        </p>
      ),
      confirmText: "生成并下载 CSV",
      onConfirm: () => {
        const fileName = `全校${exam ? "考试" : "练习"}记录-${timestampForFile()}.csv`;
        const content = [
          ["安排名称", "负责教师", "实训标准", "人数", "状态", "日期"],
          ...filteredRecords.map((row) => row.slice(0, 6)),
        ]
          .map((row) => row.map(csvCell).join(","))
          .join("\n");
        store.createExportJob({
          scope: `管理员${exam ? "考试" : "练习"}记录`,
          targetId: `admin-${exam ? "exams" : "practices"}`,
          fileName,
          format: "CSV",
          dataScope: "导出时当前记录",
          content: `\uFEFF${content}`,
        });
        downloadTextFile(
          fileName,
          `\uFEFF${content}`,
          "text/csv;charset=utf-8",
        );
        return `${fileName} 已生成并开始下载`;
      },
    });
  return (
    <>
      <PageHeader
        title={`${exam ? "考试" : "练习"}记录`}
        subtitle="跨教师只读查看全校教学数据，视频访问将留痕"
        actions={
          <Button icon={<ExportOutlined />} onClick={exportRecords}>
            导出当前筛选
          </Button>
        }
      />
      <section className="panel panel--table">
        <Toolbar
          filters={filters}
          value={query}
          filterValue={statusFilter}
          onChange={setQuery}
          onFilterChange={setStatusFilter}
          onRefresh={() => {
            setQuery("");
            setStatusFilter("全部状态");
          }}
        />
        <DataTable
          pagination
          columns={["安排名称", "负责教师", "实训标准", "人数", "状态", "日期"]}
          rows={filteredRecords.map((row) => row.slice(0, 6))}
          onView={(row) => {
            const record = records.find((candidate) => candidate[0] === row[0]);
            if (record)
              nav(`/admin/${exam ? "exams" : "practices"}/${record[6]}`);
          }}
        />
      </section>
    </>
  );
}

function SessionDiagnosticPanel({ record, store }) {
  const sessions = record.sessions || [];
  const [sessionId, setSessionId] = useState(sessions[0]?.id || "");
  const selectedSession =
    sessions.find((session) => session.id === sessionId) || sessions[0];
  const [stepId, setStepId] = useState(
    selectedSession?.currentStepId || selectedSession?.steps?.[0]?.id || "",
  );
  const selectedStep =
    selectedSession?.steps?.find((step) => step.id === stepId) ||
    selectedSession?.steps?.[0];
  const [rootCause, setRootCause] = useState(
    selectedStep?.diagnostic?.rootCause || "",
  );
  const [note, setNote] = useState(
    selectedStep?.diagnostic?.rootCauseNote || "",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const diagnostic = stepDiagnostic(selectedStep, selectedSession);
  const checks = diagnostic.checks;
  const checkLabels = [
    ["objectVisible", "目标对象可见"],
    ["actionSufficient", "动作持续充分"],
    ["roiMatched", "所需区域映射完整"],
    ["evidenceContinuous", "证据连续"],
    ["configComplete", "本次AI运行配置依据"],
  ];
  useEffect(() => {
    if (!selectedSession) return;
    if (!selectedSession.steps.some((step) => step.id === stepId)) {
      setStepId(
        selectedSession.currentStepId || selectedSession.steps[0]?.id || "",
      );
    }
  }, [selectedSession?.id]);
  useEffect(() => {
    setRootCause(selectedStep?.diagnostic?.rootCause || "");
    setNote(selectedStep?.diagnostic?.rootCauseNote || "");
    setMessage("");
    setError("");
  }, [selectedSession?.id, selectedStep?.id]);
  if (!selectedSession || !selectedStep)
    return (
      <details className="panel diagnostic-panel">
        <summary className="diagnostic-summary"><strong>实施诊断</strong><span>暂无可诊断记录</span></summary>
        <p className="hint">当前安排尚未产生可诊断的实训记录。</p>
      </details>
    );
  const hasFallbackCamera = Boolean(
    selectedSession.evaluationSnapshot?.workstationAiBaseConfigSnapshot
      ?.fallbackCameraId,
  );
  const saveRootCause = () => {
    try {
      store.saveDiagnosticRootCause(
        record.id,
        selectedSession.id,
        selectedStep.id,
        {
          rootCause,
          note,
        },
      );
      setError("");
      setMessage("根因标记已保存；设备或配置问题仍需到对应管理页面处理。");
    } catch (reason) {
      setMessage("");
      setError(reason instanceof Error ? reason.message : "保存失败，请重试。");
    }
  };
  return (
    <details className="panel diagnostic-panel">
      <summary className="diagnostic-summary"><strong>实施诊断</strong><span>查看诊断、证据与根因记录</span></summary>
      <div className="diagnostic-content">
      <div className="diagnostic-selectors">
        <label className="field">
          实训记录 / 学生 / 工位
          <select
            value={selectedSession.id}
            onChange={(event) => setSessionId(event.target.value)}
          >
            {sessions.map((session) => {
              const sessionStudent = store.data.students.find(
                (item) => item.id === session.studentId,
              );
              const sessionWorkstation = store.data.workstations.find(
                (item) => item.id === session.workstationId,
              );
              return (
                <option key={session.id} value={session.id}>
                  {sessionStudent?.name || "学生已失效"} ·{" "}
                  {sessionWorkstation?.name || session.workstationId}
                </option>
              );
            })}
          </select>
        </label>
        <label className="field">
          诊断步骤
          <select
            value={selectedStep.id}
            onChange={(event) => setStepId(event.target.value)}
          >
            {selectedSession.steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.id} · {step.name} · {step.result}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="diagnostic-reason">
        <AlertOutlined />
        <div>
          <small>当前诊断结论</small>
          <strong>
            {displayBusinessText(
              diagnostic.noTriggerReason,
            )}
          </strong>
          <p>
            {selectedStep.evidenceMetadata?.scoringPolicy ||
              "诊断结果只用于定位问题，不直接影响成绩。"}
          </p>
        </div>
      </div>
      <div className="diagnostic-entry-actions">
        {diagnosticLinks(record, selectedSession, selectedStep, store.data, store.dataSource).map(link => <Link className="button button--default" key={link.label} to={link.path}>{link.label}</Link>)}
      </div>
      <div className="recording-health-grid">
        <span>
          <small>实训记录录像</small>
          <Status>{selectedSession.recording?.status || "不可用"}</Status>
        </span>
        <span>
          <small>覆盖率</small>
          <strong>{selectedSession.recording?.coveragePercent ?? 0}%</strong>
        </span>
        <span>
          <small>{hasFallbackCamera ? "主 / 辅视角" : "主视角"}</small>
          <strong>
            {selectedSession.recording?.mainCamera || "未产生"}
            {hasFallbackCamera &&
              ` / ${selectedSession.recording?.assistCamera || "未产生"}`}
          </strong>
        </span>
        <span>
          <small>保留策略</small>
          <strong>
            {displayBusinessText(
              selectedSession.recording?.retentionLabel || "未配置",
            )}
          </strong>
        </span>
      </div>
      <div className="diagnostic-layout">
        <div className="diagnostic-checks">
          <h3>完成条件逐项检查</h3>
          {checkLabels.map(([key, label]) => (
            <article className={checks[key] === true ? "is-ok" : checks[key] === false ? "is-fail" : "is-unknown"} key={key}>
              {checks[key] === true ? (
                <CheckCircleFilled />
              ) : (
                <ExclamationCircleFilled />
              )}
              <span>
                <strong>{label}</strong>
                <small>{diagnosticCheckLabel(checks[key])}</small>
              </span>
            </article>
          ))}
        </div>
        <div className="diagnostic-facts">
          <h3>最近观察事实与时间线</h3>
          {diagnostic.recentFacts.map((fact, index) => (
            <article key={`${displayBusinessText(fact)}-${index}`}>
              <time>
                {displayBusinessText(
                  index
                    ? selectedSession.recording?.lastSegmentAt
                    : selectedStep.timeRange,
                )}
              </time>
              <p>{displayBusinessText(fact)}</p>
            </article>
          ))}
          {(selectedSession.events || []).slice(0, 2).map((event, index) => (
            <article key={`${event.time}-${index}`}>
              <time>{displayBusinessText(event.time)}</time>
              <p>
                {displayBusinessText(event.title)}：
                {displayBusinessText(event.detail)}
              </p>
            </article>
          ))}
        </div>
      </div>
      <details className="diagnostic-technical-details"><summary>本次锁定配置与技术标识</summary>
      <div className="diagnostic-versions">
        {[
          ["本次标准标识", selectedSession.evaluationSnapshot?.sopId || record.snapshot?.sopId || record.sopId || "未记录"],
          [
            "AI能力配置",
            selectedStep.evidenceMetadata?.aiCapabilityConfigId || "未配置",
          ],
          [
            "已锁定AI能力",
            selectedStep.evidenceMetadata?.capabilityIds?.length
              ? `${selectedStep.evidenceMetadata.capabilityIds.length} 个`
              : "未启用",
          ],
          [
            "工位AI配置",
            selectedStep.evidenceMetadata?.sopWorkstationAiConfigId || "未记录",
          ],
          ["现场验证", selectedStep.evidenceMetadata?.validationId],
        ].map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value || "未配置"}</strong>
          </span>
        ))}
      </div>
      </details>
      {(selectedSession.recording?.incidents || []).length > 0 && (
        <div className="recording-incident-list">
          <h3>录像异常</h3>
          {selectedSession.recording.incidents.map((incident, index) => (
            <article key={`${incident.time}-${index}`}>
              <Status>{incident.type}</Status>
              <strong>
                {incident.affectedStepId} · {incident.camera}
              </strong>
              <p>{displayBusinessText(incident.detail)}</p>
            </article>
          ))}
        </div>
      )}
      <section className="diagnostic-root-cause">
        <h3>根因记录</h3>
        <p>用于记录排查结论；保存标记不会解除工位限制或确认故障已修复。</p>
      <div className="root-cause-form">
        <label className="field">
          根因分类
          <select
            value={rootCause}
            onChange={(event) => setRootCause(event.target.value)}
          >
            <option value="">请选择根因</option>
            {DIAGNOSTIC_ROOT_CAUSES.map((cause) => (
              <option key={cause}>{cause}</option>
            ))}
          </select>
        </label>
        <label className="field root-cause-form__note">
          判断依据
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="说明画面、配置或系统事实"
          />
        </label>
        <Button type="primary" onClick={saveRootCause}>
          保存根因标记
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {displayBusinessText(message)}
        </p>
      )}
      {selectedStep.diagnostic?.confirmedAt && (
        <small className="diagnostic-confirmed">
          最近标记：{displayBusinessText(selectedStep.diagnostic.confirmedAt)} ·{" "}
          {selectedStep.diagnostic.confirmedBy} ·{" "}
          {selectedStep.diagnostic.rootCause}
        </small>
      )}
      </section>
      </div>
    </details>
  );
}

function AdminRecordDetail({ exam = false }) {
  const nav = useNavigate();
  const { id } = useParams();
  const store = usePrototypeData();
  const record = store.data.arrangements.find(
    (item) => item.id === id && item.type === (exam ? "exam" : "practice"),
  );
  const accessLogged = useRef("");
  useEffect(() => {
    if (!record || !store.dataWriteReady) return;
    const key = `${store.dataSource}:${record.id}`;
    if (accessLogged.current === key) return;
    if (
      store.recordAuditAccess("查看教学记录", `${record.name} / ${record.id}`, {
        reason: "管理员跨教师只读查看",
        sopId: record.snapshot?.sopId || record.sopId,
        snapshotLockedAt: record.snapshot?.lockedAt || "尚未锁定快照",
      })
    )
      accessLogged.current = key;
  }, [record?.id, store.dataWriteReady, store.dataSource]);
  if (!record)
    return (
      <section className="empty-page">
        <ExclamationCircleFilled />
        <h1>记录不存在</h1>
        <p>该安排可能已失效，请返回记录列表重新选择。</p>
      </section>
    );
  return (
    <div className="admin-record-detail">
      <PageHeader
        back
        title={`${exam ? "考试" : "练习"}记录 · ${record.name}`}
        subtitle={`状态 ${record.status} · 结束时间 ${record.endedAt || "尚未结束"} · 本次标准快照已锁定`}
        actions={
          <ArrangementAttendanceEntry arrangement={record} adminReadOnly />
        }
      />
      <p className="readonly-note readonly-note--prominent">
        <EyeOutlined />{" "}
        当前页面不提供开始、暂停、改分或发布；管理员仅可查看证据并记录技术根因。
      </p>
      <div className="detail-grid admin-record-summary">
        {[
          ["负责教师", record.teacherName || "王老师"],
          [
            "实训标准",
            record.snapshot?.sopSnapshot?.name ||
              store.data.sops.find((item) => item.id === record.sopId)?.name ||
              "标准已失效",
          ],
          ["参与人数", `${record.studentIds.length}人`],
          ["状态", record.status],
          [
            "日期",
            record.scheduleStart
              ? displayBusinessText(record.scheduleStart).replace("T", " ")
              : "待定",
          ],
        ].map(([label, value]) => (
          <section className="panel" key={label}>
            <small>{label}</small>
            <h2>{displayBusinessText(value)}</h2>
          </section>
        ))}
      </div>
      <ArrangementResultMetrics arrangement={record} exam={exam} />
      <WorkstationRestrictionPanel
        arrangement={record}
        store={store}
        adminReadOnly
      />
      <section className="panel panel--table admin-student-results">
        <PanelTitle title="学生结果（只读）" />
        <DataTable
          pagination
          columns={[
            "学生",
            "学号",
            "班级",
            "当前得分",
            "结果状态",
            "录像状态",
            "主要问题",
          ]}
          rows={record.studentIds.map((studentId) => {
            const student = store.data.students.find(
              (item) => item.id === studentId,
            );
            const studentClass = store.data.classes.find(
              (item) => item.id === student?.classId,
            );
            const session = (record.sessions || []).find(
              (item) => item.studentId === studentId,
            );
            return [
              student?.name || "学生已失效",
              student?.no || studentId,
              studentClass?.name || student?.className || "历史班级快照",
              session?.resultStatus === "未参加"
                ? "—"
                : session
                  ? `${session.score}分`
                  : "尚未开始",
              session?.resultStatus || session?.status || "尚未开始",
              session?.recording?.status || "不可用",
              sessionPrimaryIssue(session),
            ];
          })}
          statusColumns={[4, 5]}
          emptyText="当前安排没有学生记录。"
          onRow={(row) => {
            const student = store.data.students.find(
              (item) => item.no === row[1],
            );
            if (student)
              nav(
                `/admin/${exam ? "exams" : "practices"}/${record.id}/students/${student.id}`,
              );
          }}
        />
      </section>
      <SessionDiagnosticPanel record={record} store={store} />
    </div>
  );
}
function SettingsPage({ setModal }) {
  const store = usePrototypeData();
  const settings = store.data.systemSettings;
  const [form, setForm] = useState(() => ({
    ...(settings.pending || settings.current),
  }));
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const settingRows = [
    [
      "练习完整录像保存期限",
      `${settings.current.practiceRecordingDays} 天`,
      settings.pending ? `${settings.pending.practiceRecordingDays} 天` : "无",
    ],
    [
      "考试完整录像保存期限",
      `${settings.current.examRecordingDays} 天`,
      settings.pending ? `${settings.pending.examRecordingDays} 天` : "无",
    ],
    [
      "导出下载期限",
      `${settings.current.downloadDays} 天`,
      settings.pending ? `${settings.pending.downloadDays} 天` : "无",
    ],
    [
      "备份保留周期",
      `${settings.current.backupRetentionDays} 天`,
      settings.pending ? `${settings.pending.backupRetentionDays} 天` : "无",
    ],
    [
      "缓存水位阈值",
      `${settings.current.cacheThreshold}%`,
      settings.pending ? `${settings.pending.cacheThreshold}%` : "无",
    ],
  ];
  return (
    <>
      <PageHeader
        title="系统运行配置"
        subtitle={`默认值来源：${settings.source} · 生效策略：${settings.activationPolicy}`}
        actions={
          <Button
            type="primary"
            onClick={() =>
              setModal({
                title: "保存运行配置",
                content: (
                  <>
                    <p>
                      当前仍有进行中安排，本次修改将保存为待生效值，不会热更新正在运行的会话。
                    </p>
                    <p className="hint">
                      保存后会记录参数前后值、影响范围和操作者。
                    </p>
                  </>
                ),
                confirmText: "保存为待生效",
                onConfirm: () => {
                  store.saveSystemSettings(form);
                  return "配置已保存为待生效版本";
                },
              })
            }
          >
            保存配置
          </Button>
        }
      />
      {settings.pending && (
        <p className="readonly-note readonly-note--prominent">
          <ClockCircleOutlined /> 已存在待生效配置；当前运行会话仍使用原值。
        </p>
      )}
      <section className="panel settings-summary">
        <PanelTitle title="当前值与待生效值" />
        <DataTable
          columns={["参数", "当前值", "待生效值"]}
          rows={settingRows}
        />
        <p className="hint">
          最近保存：{displayBusinessText(settings.updatedAt)} ·{" "}
          {settings.updatedBy}
        </p>
      </section>
      <section className="panel settings-form">
        <h2>媒体与导出</h2>
        <div className="form-row">
          <label className="field">
            练习录像保存期限（天）
            <input
              type="number"
              min="30"
              max="730"
              value={form.practiceRecordingDays}
              onChange={(event) =>
                change("practiceRecordingDays", event.target.value)
              }
            />
            <small>范围 30–730 天；影响新增练习实训记录。</small>
          </label>
          <label className="field">
            考试录像保存期限（天）
            <input
              type="number"
              min="30"
              max="730"
              value={form.examRecordingDays}
              onChange={(event) =>
                change("examRecordingDays", event.target.value)
              }
            />
            <small>范围 30–730 天；可独立于练习设置。</small>
          </label>
        </div>
        <p className="hint">
          完整录像到期清理后，步骤结果、成绩、教师修改和审计记录继续保留。
        </p>
        <div className="form-row">
          <label className="field">
            导出文件下载期限（天）
            <input
              type="number"
              min="1"
              max="30"
              value={form.downloadDays}
              onChange={(event) => change("downloadDays", event.target.value)}
            />
            <small>范围 1–30 天；过期后需重新生成。</small>
          </label>
        </div>
        <h2>备份策略</h2>
        <div className="form-row">
          <label className="field">
            自动备份频率
            <select
              value={form.backupFrequency}
              onChange={(event) =>
                change("backupFrequency", event.target.value)
              }
            >
              <option>每日 02:00</option>
              <option>每日 03:00</option>
              <option>每周日 02:00</option>
            </select>
            <small>时间按北京时间解释。</small>
          </label>
          <label className="field">
            备份保留周期（天）
            <input
              type="number"
              min="7"
              max="180"
              value={form.backupRetentionDays}
              onChange={(event) =>
                change("backupRetentionDays", event.target.value)
              }
            />
            <small>范围 7–180 天；不会自动恢复数据。</small>
          </label>
        </div>
        <h2>运行告警</h2>
        <div className="form-row">
          <label className="field">
            缓存剩余空间阈值（%）
            <input
              type="number"
              min="5"
              max="40"
              value={form.cacheThreshold}
              onChange={(event) => change("cacheThreshold", event.target.value)}
            />
            <small>低于该阈值时通知管理员。</small>
          </label>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={form.cacheAlertEnabled}
            onChange={(event) =>
              change("cacheAlertEnabled", event.target.checked)
            }
          />
          <span>
            <strong>缓存水位预警</strong>
            <small>告警包含节点、当前值与阈值。</small>
          </span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={form.aiConfigurationInvalidationAlertEnabled}
            onChange={(event) =>
              change(
                "aiConfigurationInvalidationAlertEnabled",
                event.target.checked,
              )
            }
          />
          <span>
            <strong>AI配置有效性异常告警</strong>
            <small>
              AI能力重新发布或启用、工位关键配置变化、现场验证失效时告警。
            </small>
          </span>
        </label>
      </section>
    </>
  );
}

function BackupPage({ setModal }) {
  const store = usePrototypeData();
  const { backups, exportJobs } = store.data;
  const [activeRecordTab, setActiveRecordTab] = useState("backups");
  const latest = backups.find((item) => item.status === "成功");
  const downloadManifest = (backup) => {
    const fileName = `${backup.id}-校验清单.json`;
    const content = JSON.stringify(
      {
        id: backup.id,
        createdAt: backup.createdAt,
        scope: backup.scope,
        size: backup.size,
        checksum: backup.checksum,
        verification: backup.verification,
        storage: backup.storage,
        expiresAt: backup.expiresAt,
        note: "该文件是备份校验与交付清单，不执行平台内恢复。",
      },
      null,
      2,
    );
    store.createExportJob({
      scope: "备份校验清单",
      targetId: backup.id,
      fileName,
      format: "JSON",
      dataScope: backup.checksum,
      content,
    });
    downloadTextFile(fileName, content, "application/json;charset=utf-8");
    return `${fileName} 已生成并开始下载`;
  };
  const openBackup = (backup) =>
    setModal({
      title: `备份详情 · ${backup.createdAt}`,
      size: "large",
      content: (
        <div className="definition-list backup-detail-grid">
          <div>
            <small>范围</small>
            <strong>{backup.scope}</strong>
          </div>
          <div>
            <small>状态</small>
            <Status>{backup.status}</Status>
          </div>
          <div>
            <small>大小</small>
            <strong>{backup.size}</strong>
          </div>
          <div>
            <small>校验</small>
            <strong>{backup.checksum}</strong>
          </div>
          <div>
            <small>存储位置</small>
            <strong>{backup.storage}</strong>
          </div>
          <div>
            <small>可用期限</small>
            <strong>{displayBusinessText(backup.expiresAt)}</strong>
          </div>
          {backup.failureReason && (
            <div className="definition-list__wide">
              <small>失败原因</small>
              <strong>{backup.failureReason}</strong>
            </div>
          )}
        </div>
      ),
      confirmText: backup.status === "成功" ? "下载校验清单" : "清理后重试备份",
      onConfirm: () =>
        backup.status === "成功"
          ? downloadManifest(backup)
          : (store.retryBackup(backup.id), "备份重试完成，已生成新的成功记录"),
    });
  return (
    <>
      <PageHeader
        title="备份与恢复"
        subtitle="平台提供备份查看、校验与下载；实际恢复由运维在平台外按变更流程执行"
      />
      <div className="backup-notice">
        <DatabaseOutlined />
        <div>
          <strong>最近一次自动备份成功</strong>
          <p>
            {displayBusinessText(latest.createdAt)} · {latest.scope} ·{" "}
            {latest.size}
          </p>
        </div>
        <Button
          icon={<CloudDownloadOutlined />}
          onClick={() => openBackup(latest)}
        >
          查看与下载
        </Button>
      </div>
      <section className="panel panel--table backup-records-panel">
        <div
          className="tabs backup-record-tabs"
          role="tablist"
          aria-label="备份与下载记录"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeRecordTab === "backups"}
            aria-controls="backup-records-pane"
            className={activeRecordTab === "backups" ? "active" : ""}
            onClick={() => setActiveRecordTab("backups")}
          >
            备份记录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeRecordTab === "downloads"}
            aria-controls="backup-downloads-pane"
            className={activeRecordTab === "downloads" ? "active" : ""}
            onClick={() => setActiveRecordTab("downloads")}
          >
            下载记录
          </button>
        </div>
        {activeRecordTab === "backups" ? (
          <div id="backup-records-pane" role="tabpanel">
            <DataTable
              pagination
              columns={["备份时间", "范围", "状态", "大小", "校验结果"]}
              rows={backups.map((item) => [
                item.createdAt,
                item.scope,
                item.status,
                item.size,
                item.status === "失败" ? item.failureReason : item.verification,
              ])}
              statusColumns={[2, 4]}
              rowKey={(_, index) => backups[index].id}
              onView={(_, index) => openBackup(backups[index])}
            />
          </div>
        ) : (
          <div
            id="backup-downloads-pane"
            className="backup-downloads-pane"
            role="tabpanel"
          >
            <div className="export-list">
              {exportJobs
                .filter((item) => item.scope === "备份校验清单")
                .map((item) => (
                  <article key={item.id}>
                    <FileTextOutlined />
                    <div>
                      <strong>{item.fileName}</strong>
                      <small>
                        {displayBusinessText(item.createdAt)} ·{" "}
                        {item.dataScope || "导出时当前数据"}
                      </small>
                    </div>
                    <Status>{item.status}</Status>
                  </article>
                ))}
              {!exportJobs.some((item) => item.scope === "备份校验清单") && (
                <p className="hint">尚未下载备份校验清单。</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Logs({ setModal }) {
  const store = usePrototypeData();
  const { data } = store;
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("全部结果");
  const filteredLogs = data.auditLogs.filter(
    (item) =>
      [item.time, item.actor, item.role, item.action, item.target, item.result]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (resultFilter === "全部结果" || item.result === resultFilter),
  );
  const filteredRows = filteredLogs.map((item) => [
    item.time,
    item.actor,
    item.role,
    item.action,
    item.target,
    item.result,
  ]);
  const exportLogs = () =>
    setModal({
      title: "导出当前日志",
      content: (
        <p>
          将按当前搜索和结果筛选导出 {filteredRows.length}{" "}
          条审计日志；导出动作本身也会写入日志。
        </p>
      ),
      confirmText: "生成并下载 CSV",
      onConfirm: () => {
        const fileName = `操作日志-${timestampForFile()}.csv`;
        const content = [
          ["时间", "操作者", "角色", "操作", "对象", "结果"],
          ...filteredRows,
        ]
          .map((row) => row.map(csvCell).join(","))
          .join("\n");
        store.createExportJob({
          scope: "操作日志",
          targetId: "admin-logs",
          fileName,
          format: "CSV",
          dataScope: "导出时筛选结果",
          content: `\uFEFF${content}`,
        });
        downloadTextFile(
          fileName,
          `\uFEFF${content}`,
          "text/csv;charset=utf-8",
        );
        return `${fileName} 已生成并开始下载`;
      },
    });
  return (
    <>
      <PageHeader
        title="操作日志"
        subtitle="审计关键访问、业务控制和数据变更"
        actions={
          <Button icon={<ExportOutlined />} onClick={exportLogs}>
            导出当前日志
          </Button>
        }
      />
      <section className="panel panel--table">
        <Toolbar
          placeholder="搜索操作者、操作或对象"
          filters={[
            "全部结果",
            ...new Set(data.auditLogs.map((item) => item.result)),
          ]}
          value={query}
          filterValue={resultFilter}
          onChange={setQuery}
          onFilterChange={setResultFilter}
          onRefresh={() => {
            setQuery("");
            setResultFilter("全部结果");
          }}
        />
        <DataTable
          pagination
          columns={["时间", "操作者", "角色", "操作", "对象", "结果"]}
          rows={filteredRows}
          statusColumns={[5]}
          rowKey={(_, index) => filteredLogs[index].id}
          onView={(_, index) => {
            const item = filteredLogs[index];
            setModal({
              title: `日志详情 · ${item.action}`,
              size: "large",
              dismissOnly: true,
              hideCancel: true,
              content: (
                <div className="audit-detail">
                  <div className="definition-list">
                    <div>
                      <small>时间</small>
                      <strong>{displayBusinessText(item.time)}</strong>
                    </div>
                    <div>
                      <small>操作者 / 角色</small>
                      <strong>
                        {item.actor} · {item.role}
                      </strong>
                    </div>
                    <div>
                      <small>业务对象</small>
                      <strong>{item.target}</strong>
                    </div>
                    {!(
                      Object.hasOwn(item, "scoreChanged") ||
                      /成绩|步骤复核|人工调整步骤分|补证|补测/.test(
                        item.action || "",
                      )
                    ) && (
                      <div>
                        <small>业务版本</small>
                        <strong>
                          {item.businessVersion || "当前有效版本"}
                        </strong>
                      </div>
                    )}
                    <div>
                      <small>处理结果</small>
                      <Status>{item.result}</Status>
                    </div>
                    <div>
                      <small>原因</small>
                      <strong>{item.reason || "常规业务操作"}</strong>
                    </div>
                  </div>
                  <h3>变更前</h3>
                  <pre>
                    {JSON.stringify(item.before ?? "未记录结构化前值", null, 2)}
                  </pre>
                  <h3>变更后</h3>
                  <pre>
                    {JSON.stringify(
                      item.after ?? "操作结果见业务对象",
                      null,
                      2,
                    )}
                  </pre>
                  <h3>关联证据</h3>
                  <p>{item.evidence?.join("、") || "无单独证据附件"}</p>
                </div>
              ),
            });
          }}
        />
      </section>
    </>
  );
}

const IssueNoteForm = forwardRef(function IssueNoteForm({ issue }, ref) {
  const [owner, setOwner] = useState(issue.owner);
  const [note, setNote] = useState("");
  useImperativeHandle(ref, () => ({ value: () => ({ owner, note }) }));
  return (
    <div className="form-stack">
      <label className="field">
        当前负责人
        <input
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        />
      </label>
      <label className="field">
        处理说明
        <textarea
          autoFocus
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="说明本次检查、处理结果或下一步计划"
        />
      </label>
    </div>
  );
});
const ReopenIssueForm = forwardRef(function ReopenIssueForm(_, ref) {
  const [reason, setReason] = useState("");
  useImperativeHandle(ref, () => ({ value: () => reason }));
  return (
    <label className="field">
      重开原因
      <textarea
        autoFocus
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="说明复发事实或复查不通过项"
      />
    </label>
  );
});

function Issue({ setModal }) {
  const nav = useNavigate();
  const { id } = useParams();
  const store = usePrototypeData();
  const issue = store.data.issues.find((item) => item.id === id);
  const noteRef = useRef(null);
  const reopenRef = useRef(null);
  if (!issue)
    return <MissingState title="异常记录不存在" backTo="/admin/overview" />;
  const workstation = store.data.workstations.find(
    (item) => item.id === issue.workstationIds[0],
  );
  const arrangement = store.data.arrangements.find(
    (item) => item.id === issue.arrangementId,
  );
  const readyToClose = canCloseIssue(issue);
  const openNote = () =>
    setModal({
      title: "追加处置说明",
      content: <IssueNoteForm ref={noteRef} issue={issue} />,
      confirmText: "保存说明",
      onConfirm: () => {
        store.addIssueNote(issue.id, noteRef.current.value());
        return "处置说明已写入时间线";
      },
    });
  return (
    <>
      <PageHeader
        back
        title={`系统异常 · ${issue.title}`}
        subtitle={`异常编号 ${issue.code} · 发生于 ${issue.occurredAt}`}
        actions={
          issue.status === "已关闭" ? (
            <Button
              type="primary"
              onClick={() =>
                setModal({
                  title: "重新打开异常",
                  content: <ReopenIssueForm ref={reopenRef} />,
                  confirmText: "确认重开",
                  onConfirm: () => {
                    store.reopenIssue(issue.id, reopenRef.current.value());
                    return "异常已重新打开并进入处理中";
                  },
                })
              }
            >
              重新打开
            </Button>
          ) : (
            <Button type="primary" onClick={openNote}>
              填写处理说明
            </Button>
          )
        }
      />
      <div
        className={`issue-hero ${issue.status === "已关闭" ? "issue-hero--closed" : ""}`}
      >
        <AlertOutlined />
        <div>
          <Status>{issue.status}</Status>
          <h2>
            {workstation ? `${workstation.name}实时评价已受控暂停` : issue.fact}
          </h2>
          <p>
            {issue.status === "已关闭"
              ? "异常已关闭；历史处置、证据与复查结论保持可追溯。"
              : "系统已尽可能继续录像；技术与业务条件满足前不能恢复评价。"}
          </p>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <small>影响范围</small>
          <h2>
            {issue.workstationIds.length}个工位 / {issue.sessionIds.length}
            个会话
          </h2>
        </section>
        <section className="panel">
          <small>故障事实</small>
          <h2>{issue.fact}</h2>
        </section>
        <section className="panel">
          <small>人工处理</small>
          <h2>{issue.handlingStatus}</h2>
        </section>
        <section className="panel">
          <small>最后更新</small>
          <h2>{displayBusinessText(issue.updatedAt)}</h2>
        </section>
      </div>
      <div className="issue-layout">
        <section className="panel">
          <PanelTitle title="处理时间线" />
          <div className="issue-timeline">
            {issue.timeline.map((event, index) => (
              <article key={`${event.time}-${index}`}>
                <time>{displayBusinessText(event.time)}</time>
                <span
                  className={`issue-timeline__dot ${event.tone === "danger" ? "issue-timeline__dot--danger" : event.tone === "pending" ? "issue-timeline__dot--pending" : ""}`}
                />
                <div>
                  <strong>{displayBusinessText(event.title)}</strong>
                  <p>{displayBusinessText(event.detail)}</p>
                  <small>{event.actor}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="panel issue-actions">
          <PanelTitle title="恢复门槛" />
          <div className="recovery-check">
            <div>
              <Status>{issue.technicalCheck.status}</Status>
              <strong>技术复查</strong>
              <p>{displayBusinessText(issue.technicalCheck.detail)}</p>
              {issue.status !== "已关闭" &&
                issue.technicalCheck.status !== "已通过" && (
                  <Button
                    onClick={() =>
                      setModal({
                        title: "执行技术复查",
                        content: (
                          <p>
                            将检查节点温度、推理服务和连续自检结果。通过后仍需现场业务确认。
                          </p>
                        ),
                        confirmText: "运行复查",
                        onConfirm: () => {
                          store.verifyIssueTechnical(issue.id);
                          return "技术复查通过，仍需现场确认";
                        },
                      })
                    }
                  >
                    运行技术复查
                  </Button>
                )}
            </div>
            <div>
              <Status>{issue.businessCheck.status}</Status>
              <strong>现场业务确认</strong>
              <p>{displayBusinessText(issue.businessCheck.detail)}</p>
              {issue.status !== "已关闭" &&
                !["已确认", "无需确认"].includes(
                  issue.businessCheck.status,
                ) && (
                  <Button
                    onClick={() =>
                      setModal({
                        title: "记录现场安全确认",
                        content: (
                          <p>
                            确认学生已停止操作、设备断电且操作区域安全。该确认不会自动恢复评价。
                          </p>
                        ),
                        confirmText: "记录确认",
                        onConfirm: () => {
                          store.confirmIssueBusiness(issue.id);
                          return "现场安全确认已记录";
                        },
                      })
                    }
                  >
                    记录教师确认
                  </Button>
                )}
            </div>
          </div>
          {issue.status !== "已关闭" && (
            <Button
              type="primary"
              disabled={!readyToClose}
              onClick={() =>
                setModal({
                  title: "关闭系统异常",
                  content: (
                    <p>
                      关闭后工位转为可入场，但受影响会话保持暂停，仍需教师在监控页主动恢复。
                    </p>
                  ),
                  confirmText: "确认关闭",
                  onConfirm: () => {
                    store.closeIssue(issue.id);
                    return "异常已关闭；会话仍保持暂停";
                  },
                })
              }
            >
              关闭异常
            </Button>
          )}
          <div className="issue-owner">
            <small>当前负责人</small>
            <strong>{issue.owner}</strong>
            <span>
              {issue.handlingStatus} · 最近更新{" "}
              {displayBusinessText(issue.updatedAt)}
            </span>
          </div>
          <div className="issue-related">
            {workstation && (
              <Button
                onClick={() => nav(`/admin/workstations/${workstation.id}`)}
              >
                查看 {workstation.name}
              </Button>
            )}
            {arrangement && (
              <Button
                onClick={() =>
                  nav(
                    `/admin/${arrangement.type === "exam" ? "exams" : "practices"}/${arrangement.id}`,
                  )
                }
              >
                查看受影响安排
              </Button>
            )}
            <Button onClick={() => nav("/admin/logs")}>查看操作日志</Button>
          </div>
        </aside>
      </div>
    </>
  );
}
function NotFound() {
  const nav = useNavigate();
  return (
    <div className="empty-page">
      <FileTextOutlined />
      <h1>页面暂未找到</h1>
      <p>请从左侧导航重新进入。</p>
      <Button type="primary" onClick={() => nav("/teacher/dashboard")}>
        返回工作台
      </Button>
    </div>
  );
}

function AccountShell(props) {
  const store = usePrototypeData(),
    location = useLocation();
  const target = teacherAccountRedirect(
    store.data,
    store.accountSession,
    store.dataSource,
    location.pathname,
  );
  if (target)
    return (
      <Navigate
        to={target}
        replace
        state={
          target === "/login"
            ? { message: "登录已失效，账号可能已被重置或停用，请重新登录。" }
            : undefined
        }
      />
    );
  return <Shell {...props} />;
}

export function RoutedApp() {
  const [modal, setModal] = useState(null),
    [toast, setToast] = useState("");
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account/password" element={<TeacherChangePasswordPage />} />
      <Route path="/data-screen" element={<DataScreen />} />
      <Route
        path="/student/login"
        element={
          <StudentShell>
            <StudentLoginPage />
          </StudentShell>
        }
      />
      <Route
        path="/student/current"
        element={
          <StudentShell>
            <StudentCurrentPage />
          </StudentShell>
        }
      />
      <Route
        path="/student/results/:id/:sessionId"
        element={
          <StudentShell>
            <StudentResultPage />
          </StudentShell>
        }
      />
      <Route
        path="/student/session/:id/:stationId"
        element={
          <StudentShell>
            <StudentSessionPage />
          </StudentShell>
        }
      />
      <Route
        path="/workstation/:id/:stationId"
        element={<LegacyWorkstationRedirect />}
      />
      <Route
        path="/*"
        element={
          <AccountShell
            modal={modal}
            setModal={setModal}
            toast={toast}
            setToast={setToast}
          >
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/teacher/dashboard" replace />}
              />
              <Route path="/teacher/dashboard" element={<Dashboard />} />
              <Route
                path="/teacher/statistics"
                element={<TeachingStatisticsPage />}
              />
              <Route
                path="/teacher/support-tasks/:taskId"
                element={<SupportTaskPage />}
              />
              <Route
                path="/teacher/evidence-tasks/:taskId"
                element={<EvidenceTaskPage />}
              />
              <Route path="/teacher/sop" element={<SopList />} />
              <Route
                path="/teacher/sop/learning"
                element={<Navigate to="/teacher/sop" replace />}
              />
              <Route
                path="/teacher/sop/new"
                element={<SopEditor setModal={setModal} />}
              />
              <Route
                path="/teacher/sop/edit/:id"
                element={<SopEditor setModal={setModal} />}
              />
              {/* 旧版教师 Mapping 调试路由保留；正式 SOP 页面不再提供入口。 */}
              <Route
                path="/teacher/sop/:id/ai-mapping/:mappingId"
                element={<TeacherMappingReview setModal={setModal} />}
              />
              <Route
                path="/teacher/sop/:id"
                element={<SopDetail setModal={setModal} />}
              />
              <Route
                path="/teacher/practices"
                element={<ArrangementList setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/new"
                element={<ArrangementForm setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/edit"
                element={<ArrangementForm setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/prep"
                element={<PrepPage setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/live"
                element={<MonitorPage setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/stations/:stationId"
                element={<StudentMonitorPage setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/results"
                element={<ResultsPage setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/students/:studentId"
                element={<Report setModal={setModal} />}
              />
              <Route
                path="/teacher/practices/:id/history"
                element={<HistoryCompare />}
              />
              <Route
                path="/teacher/exams"
                element={<ArrangementList exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/new"
                element={<ArrangementForm exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/:id/edit"
                element={<ArrangementForm exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/:id/prep"
                element={<PrepPage exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/:id/live"
                element={<MonitorPage exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/:id/stations/:stationId"
                element={<StudentMonitorPage exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/:id/results"
                element={<ResultsPage exam setModal={setModal} />}
              />
              <Route
                path="/teacher/exams/:id/students/:studentId"
                element={<Report exam setModal={setModal} />}
              />
              <Route path="/admin/overview" element={<AdminOverview />} />
              <Route
                path="/admin/teachers"
                element={<AdminList type="teachers" setModal={setModal} />}
              />
              <Route
                path="/admin/teachers/:id"
                element={<AdminDetail type="teacher" setModal={setModal} />}
              />
              <Route
                path="/admin/classes"
                element={<ClassManagement setModal={setModal} />}
              />
              <Route
                path="/admin/classes/:id"
                element={<ClassDetail setModal={setModal} />}
              />
              <Route
                path="/admin/students"
                element={<AdminList type="students" setModal={setModal} />}
              />
              <Route
                path="/admin/students/:id"
                element={<AdminDetail type="student" setModal={setModal} />}
              />
              <Route
                path="/admin/workstations"
                element={<AdminList type="workstations" setModal={setModal} />}
              />
              <Route
                path="/admin/workstations/:id"
                element={<AdminDetail type="workstation" setModal={setModal} />}
              />
              <Route
                path="/admin/devices"
                element={<AdminList type="devices" setModal={setModal} />}
              />
              <Route
                path="/admin/devices/:id"
                element={<AdminDetail type="device" setModal={setModal} />}
              />
              <Route
                path={AI_CONFIG_PATH}
                element={<AiCapabilityConfigList />}
              />
              <Route
                path={`${AI_CONFIG_PATH}/:sopId`}
                element={<AiCapabilityConfigDetailModes setModal={setModal} />}
              />
              <Route
                path={AI_LIBRARY_PATH}
                element={
                  <Navigate to={`${AI_LIBRARY_PATH}/capabilities`} replace />
                }
              />
              <Route
                path={`${AI_CAPABILITIES_PATH}/new`}
                element={<AiCapabilityForm />}
              />
              <Route
                path={`${AI_CAPABILITIES_PATH}/:capabilityId/edit`}
                element={<AiCapabilityForm />}
              />
              <Route
                path={`${AI_CAPABILITIES_PATH}/:capabilityId`}
                element={<AiCapabilityDetail setModal={setModal} />}
              />
              <Route
                path={`${AI_LIBRARY_PATH}/:section`}
                element={<AiCapabilityLibrary setModal={setModal} />}
              />
              {/* 旧AI评价管理调试路由保留；正式菜单入口已屏蔽。 */}
              <Route
                path="/admin/ai-evaluation"
                element={<AiEvaluationList />}
              />
              <Route
                path="/admin/ai-evaluation/:id"
                element={<AiEvaluationDetail setModal={setModal} />}
              />
              <Route
                path="/admin/practices"
                element={<AdminRecords setModal={setModal} />}
              />
              <Route
                path="/admin/practices/:id"
                element={<ResultsPage adminReadOnly setModal={setModal} />}
              />
              <Route
                path="/admin/practices/:id/students/:studentId"
                element={<Report adminReadOnly setModal={setModal} />}
              />
              <Route
                path="/admin/exams"
                element={<AdminRecords exam setModal={setModal} />}
              />
              <Route
                path="/admin/exams/:id"
                element={<ResultsPage exam adminReadOnly setModal={setModal} />}
              />
              <Route
                path="/admin/exams/:id/students/:studentId"
                element={<Report exam adminReadOnly setModal={setModal} />}
              />
              <Route
                path="/admin/settings"
                element={<SettingsPage setModal={setModal} />}
              />
              <Route
                path="/admin/backups"
                element={<BackupPage setModal={setModal} />}
              />
              <Route
                path="/admin/logs"
                element={<Logs setModal={setModal} />}
              />
              <Route
                path="/admin/issues/:id"
                element={<Issue setModal={setModal} />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AccountShell>
        }
      />
    </Routes>
  );
}
export function App() {
  return (
    <PrototypeDataProvider>
      <BrowserRouter>
        <RoutedApp />
      </BrowserRouter>
    </PrototypeDataProvider>
  );
}
