import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  assertCapabilityDeletable,
  createCapability,
  deactivateCapability,
  reactivateCapability,
  updateCapability,
} from "./aiCapabilityRules.js";
import {
  assertAiSourceVideosDeletable,
  batchUpdateAiSourceVideos as applyAiSourceVideoBatchUpdate,
  capabilityStatusAfterVideoUpload,
  createAiSourceVideos,
  updateAiSourceVideo as applyAiSourceVideoUpdate,
} from "./aiVideoRules.js";
import {
  assertDerivedItemsDeletable,
  buildFrameExtractionTask,
  buildVideoSlicingTask,
  mockFrameStorageRef,
} from "./aiExtractionRules.js";
import {
  buildAutoCleaningTask,
  restoreAutoRejectedItems,
} from "./aiCleaningRules.js";
import { getStudentCurrentSessions } from "./studentIdentityRules.js";
import {
  appendStudentHelpRequestToSession,
  appendStudentHintRequestToSession,
  attachStudentVerificationToSession,
} from "./studentPracticeRules.js";
import { normalizeStoredStudentEvent } from "./studentTeacherLinkRules.js";
import {
  appendExamIncidentHelpRequest,
  buildExamIncidentPayload,
  createExamTiming,
  normalizeExamDuration,
  normalizeExamTiming,
  transitionExamTiming,
  validateExamDuration,
} from "./studentExamRules.js";
import { applyManualCleaningDecision } from "./aiManualCleaningRules.js";
import {
  batchAssignActionCategory,
  batchMarkFramesNoTarget,
  createAnnotationCategory,
  defaultAnnotationCategories,
  deleteAnnotationCategory,
  saveClipAnnotation,
  saveFrameAnnotation,
  updateAnnotationCategory,
} from "./aiAnnotationRules.js";
import {
  DEFAULT_TRAINING_RATIOS,
  assignSourceGroup,
  autoAssignSourceGroups,
  buildTrainingReadiness,
  collectTrainingCandidates,
  groupTrainingCandidates,
  targetCategoryIdsFor,
  validateTrainingRatios,
} from "./aiTrainingDataRules.js";
import {
  advanceTrainingTask,
  cancelTrainingTask,
  capabilityPatchAfterTrainingTask,
  createTrainingTask,
  retryTrainingTask,
} from "./aiModelTrainingRules.js";
import { publishCandidateModel } from "./aiModelPublishingRules.js";
import {
  applyAiConfigMutation,
  capabilityConfigReferenceIds,
  completeAiCapabilityConfig,
  createDefaultStepConfig,
  createEmptyAiCapabilityConfig,
  evaluateAiCapabilityConfig,
  normalizeAiCapabilityConfig,
  validateAiJudgementItem,
} from "./aiCapabilityConfigRules.js";
import {
  applyWorkstationAiBaseConfig,
  deriveWorkstationAiReadiness,
  isCameraDevice,
  normalizeWorkstationAiBaseConfig,
} from "./workstationAiRules.js";
import {
  activeJudgementItems,
  checkSopWorkstationAiConfig,
  createDefaultValidationCases,
  createSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
  evaluateValidationCompletion,
  invalidateSopWorkstationConfigs,
  normalizeSopWorkstationAiConfig,
  setJudgementCameraBinding,
  setLogicalAreaMapping,
} from "./sopWorkstationAiRules.js";
import {
  createAiEvaluationSnapshot,
  createOpenedAiSession,
  deriveAiRuntimeGate,
  deriveSopAiCapabilityStatus,
  evaluationProfileFromGate,
  resolveAiSafetyCandidate,
  simulateAiConditionOnSession,
  startAiRuntimeSession,
  updateAiCorrectionContext,
} from "./aiRuntimeRules.js";
import {
  applyDefaultPassPolicy,
  advanceEvaluationClock,
  automaticEvaluationGate,
  calculateScoreEngine,
  canCloseIssue,
  createIndependentSopCopy,
  deactivatePublishedSop,
  createSessionStepsFromSop,
  createEvaluationClock,
  DIAGNOSTIC_ROOT_CAUSES,
  diagnoseNoTrigger,
  deriveDataRequirements,
  deriveTechnicalIncidentDisposition,
  assignSourceVideosToSplits,
  buildValidationCoverage,
  FIELD_VALIDATION_SCENARIOS,
  getSopAiEvaluationStatus as calculateSopAiEvaluationStatus,
  getMappingStatusForSop,
  getPublishBlockers,
  getAiPackageCreationReadiness,
  isSopAvailableForNewArrangement,
  normalizeEvaluationMapping,
  normalizeCompatibilityDecision,
  normalizeRuntimeStep,
  normalizeSystemAlertSettings,
  normalizeWorkstationProfile,
  normalizeSafetyRule,
  normalizeScoreRule,
  normalizeSopStep,
  recordModelValidationResult,
  requiresMandatoryReview,
  scoreOf,
  setEvaluationClockPaused,
  validateEvaluationMapping,
  validateSopDefinition,
  validateDatasetSplitIsolation,
  validateSystemSettings,
} from "./domainRules.js";
import { recoverMissingLegacySops } from "./storageMigrationRules.js";
import {
  applyStudentFaceUpload,
  markStudentFaceForRecapture,
  normalizeStudentFaceData,
  persistPrototypeData,
} from "./studentFaceRules.js";

const STORAGE_KEY = "xingchen-prototype-data-v22";
const LEGACY_STORAGE_KEYS = [
  "xingchen-prototype-data-v21",
  "xingchen-prototype-data-v20",
  "xingchen-prototype-data-v19",
  "xingchen-prototype-data-v18",
  "xingchen-prototype-data-v17",
  "xingchen-prototype-data-v16",
  "xingchen-prototype-data-v15",
  "xingchen-prototype-data-v14",
  "xingchen-prototype-data-v13",
  "xingchen-prototype-data-v12",
  "xingchen-prototype-data-v11",
  "xingchen-prototype-data-v10",
  "xingchen-prototype-data-v9",
  "xingchen-prototype-data-v8",
  "xingchen-prototype-data-v7",
  "xingchen-prototype-data-v6",
  "xingchen-prototype-data-v5",
  "xingchen-prototype-data-v4",
  "xingchen-prototype-data-v3",
  "xingchen-prototype-data-v2",
];
function makeExecutionSteps(mode = "running") {
  const base = [
    ["Step 01", "作业前安全检查", "02:14", 15],
    ["Step 02", "车辆下电与验电", "04:32", 20],
    ["Step 03", "高压电池包断电", "03:41", 15],
    ["Step 04", "拆卸高压接插件", "01:26", 20],
    ["Step 05", "高压部件拆装", "00:00", 20],
    ["Step 06", "复位与场地恢复", "00:00", 10],
  ];
  return base.map(([id, name, duration, score], index) => {
    let state = "pending";
    let result = "未进行";
    if (
      mode === "completed" ||
      (mode === "running" && index < 3) ||
      (mode === "fault" && index < 2)
    ) {
      state = "pass";
      result = "通过";
    } else if (mode === "fault" && index === 2) {
      state = "blocked";
      result = "安全阻断";
    } else if (mode === "running" && index === 3) {
      state = "active";
      result = "进行中";
    }
    return normalizeSopStep(
      {
        id,
        name,
        state,
        result,
        duration: state === "pending" ? "--" : duration,
        maxScore: score,
        rawScore: state === "pass" ? score : 0,
        effectiveScore: state === "pass" ? score : 0,
        score: state === "pass" ? score : state === "active" ? "计分中" : 0,
        reviewStatus: state === "blocked" ? "待复核" : "无需复核",
        ruleId: `RULE-${String(index + 1).padStart(3, "0")}`,
        timeRange:
          state === "pending"
            ? "尚未产生"
            : `${String(index * 3).padStart(2, "0")}:00–${String(index * 3 + 2).padStart(2, "0")}:30`,
        evidenceStatus: state === "pending" ? "未产生" : "已归档",
        evidenceSources:
          state === "pending" ? [] : ["主视角片段", "辅助视角片段"],
        evidence:
          state === "pending" ? "尚未产生证据" : "主视角与辅助视角证据已归档",
        observation:
          state === "pending"
            ? "等待进入步骤"
            : `识别到 ${name} 的连续动作片段`,
        judgementMode:
          id === "Step 05"
            ? "default_pass_manual_deduction"
            : id === "Step 03"
              ? "visual_assist_default_pass"
              : "visual_auto",
      },
      index,
    );
  });
}

function makeCompletedSteps(deductions = {}, pendingReviewStep = "") {
  return makeExecutionSteps("completed").map((step) => {
    const deduction = Number(deductions[step.id] || 0);
    const needsReview = step.id === pendingReviewStep;
    return applyDefaultPassPolicy({
      ...step,
      state: needsReview ? "blocked" : "pass",
      result: needsReview ? "证据不足" : deduction ? "通过（扣分）" : "通过",
      rawScore: Math.max(0, step.maxScore - deduction),
      effectiveScore: Math.max(0, step.maxScore - deduction),
      score: Math.max(0, step.maxScore - deduction),
      reviewStatus: needsReview ? "待复核" : "无需复核",
      evidenceStatus: needsReview ? "证据不足" : "已归档",
      observation: needsReview
        ? `已识别 ${step.name}，但辅助视角关键区间存在遮挡`
        : deduction
          ? `${step.name} 已完成，存在可追溯的规范性扣分`
          : `${step.name} 已完成，主辅视角证据一致`,
    });
  });
}

function defaultWorkstationImplementation(workstation = {}) {
  const needsAdjustment = ["w3", "w6"].includes(workstation.id);
  return {
    cameraConfigVersion: `CAM-${workstation.code || workstation.id || "NEW"}-V1`,
    roiVersion: `ROI-${workstation.code || workstation.id || "NEW"}-V1`,
    cameraPosition: needsAdjustment ? "需调整" : "已确认",
    lighting: workstation.id === "w6" ? "需调整" : "已确认",
    occlusion: needsAdjustment ? "需调整" : "已确认",
    updatedAt: workstation.updatedAt || "2026-09-18 09:50",
    updatedBy: "刘工",
    note: needsAdjustment
      ? "需重新调整辅助视角并完成现场验证。"
      : "固定机位、稳定光照，操作区无遮挡。",
    rois: [
      {
        key: "operation",
        label: "操作区",
        x: 18,
        y: 20,
        width: 56,
        height: 58,
        tone: "blue",
      },
      {
        key: "tool",
        label: "工具区",
        x: 4,
        y: 58,
        width: 28,
        height: 34,
        tone: "green",
      },
      {
        key: "danger",
        label: "危险区",
        x: 70,
        y: 12,
        width: 25,
        height: 45,
        tone: "red",
      },
    ],
  };
}

function defaultSessionRecording(
  session = {},
  arrangement = {},
  settings = {},
) {
  const waiting = ["待开始", "可入场"].includes(session.status);
  const absent = session.resultStatus === "未参加";
  const partialSteps = {
    "session-p1-w1": "Step 03",
    "session-e1-w1": "Step 03",
    "session-e1-w3": "Step 04",
  };
  const affectedStepId = partialSteps[session.id];
  const status =
    waiting || absent ? "不可用" : affectedStepId ? "部分缺失" : "完整";
  const retentionDays = Number(
    arrangement.type === "exam"
      ? (settings.examRecordingDays ?? settings.recordingDays ?? 180)
      : (settings.practiceRecordingDays ?? settings.recordingDays ?? 90),
  );
  const incidents = affectedStepId
    ? [
        {
          time: session.events?.[0]?.time || "--:--",
          affectedStepId,
          camera: "辅助视角",
          type: "片段中断",
          detail: "辅助视角短时中断；主视角和结构化评价记录仍保留。",
        },
      ]
    : waiting || absent
      ? [
          {
            time: "--:--",
            affectedStepId: "全部步骤",
            camera: "主视角 / 辅助视角",
            type: absent ? "未参加" : "尚未开始",
            detail: absent
              ? "学生未参加，本 Session 未产生录像。"
              : "会话尚未开始，当前没有录像片段。",
          },
        ]
      : [];
  return {
    status,
    coveragePercent: status === "完整" ? 100 : status === "部分缺失" ? 93 : 0,
    mainCamera: status === "不可用" ? "未产生" : "正常",
    assistCamera:
      status === "部分缺失"
        ? "存在缺口"
        : status === "不可用"
          ? "未产生"
          : "正常",
    startedAt: session.startedAt || arrangement.startedAt || "尚未开始",
    lastSegmentAt:
      status === "不可用"
        ? "未产生"
        : session.endedAt || arrangement.endedAt || "持续写入中",
    retentionDays,
    retentionLabel: `${retentionDays} 天（${arrangement.type === "exam" ? "考试" : "练习"}策略）`,
    storageStatus: "保留中",
    fullVideoAvailable: status !== "不可用",
    ...(session.recording || {}),
    incidents: session.recording?.incidents || incidents,
  };
}

function enrichStepEvidence(
  step,
  session,
  arrangement,
  workstation,
  recording,
  gate,
) {
  const lockedProfile = session.evaluationProfile;
  const lockedSnapshot = session.evaluationSnapshot || {};
  const aiConfigSnapshot = lockedSnapshot.aiCapabilityConfigSnapshot;
  const workstationConfigSnapshot =
    lockedSnapshot.sopWorkstationAiConfigSnapshot;
  const aiRuntimeEnabled =
    lockedProfile?.aiRuntimeEnabled ??
    lockedProfile?.automaticEvaluationEnabled ??
    gate.enabled;
  const hasFallbackCamera = Boolean(
    lockedSnapshot.workstationAiBaseConfigSnapshot?.fallbackCameraId,
  );
  const incident = recording.incidents.find(
    (item) => item.affectedStepId === step.id,
  );
  const pending = step.state === "pending";
  const clipStatus = pending
    ? "未产生"
    : incident
      ? recording.status
      : recording.status === "不可用"
        ? "不可用"
        : "有效";
  const metadata = {
    clipStatus,
    timeRange: step.timeRange || "尚未产生",
    cameras:
      pending || recording.status === "不可用"
        ? []
        : incident
          ? ["主视角"]
          : hasFallbackCamera
            ? ["主视角", "辅助视角"]
            : ["主视角"],
    sopId: lockedSnapshot.sopId || arrangement.sopId,
    aiCapabilityConfigId: aiConfigSnapshot?.id || "未配置",
    sopWorkstationAiConfigId: workstationConfigSnapshot?.id || "未配置",
    capabilityIds: (lockedSnapshot.capabilitySnapshots || []).map(
      (item) => item.id,
    ),
    validationId: lockedProfile?.validationId || "未验证",
    lockedAt: lockedSnapshot.lockedAt || arrangement.snapshot?.lockedAt || "",
    systemAnomaly: Boolean(incident),
    scoringPolicy: incident
      ? step.result === "安全阻断" || step.redlineConfirmed
        ? "录像缺失不追加扣分；已确认安全红线仍保持阻断并进入强制复核"
        : "系统异常不产生学生扣分，按默认通过规则处理"
      : "按当前 SOP 判定方式处理",
  };
  const checks = {
    configComplete: step.judgementMode !== "visual_auto" || aiRuntimeEnabled,
    objectVisible: pending
      ? false
      : !/未看到|丢失/.test(step.observation || ""),
    actionSufficient: ["pass", "blocked"].includes(step.state),
    roiMatched: (() => {
      const requiredAreaIds = new Set(
        (aiConfigSnapshot?.judgementItems || []).flatMap((item) =>
          (item.conditions || [])
            .map((condition) => condition.logicalAreaId)
            .filter(Boolean),
        ),
      );
      if (!requiredAreaIds.size) return true;
      const mappedIds = new Set(
        (workstationConfigSnapshot?.logicalAreaMappings || []).map(
          (item) => item.logicalAreaId,
        ),
      );
      return [...requiredAreaIds].every((id) => mappedIds.has(id));
    })(),
    evidenceContinuous: !incident && recording.status !== "不可用",
  };
  const diagnostic = {
    triggerStatus:
      step.state === "pass"
        ? "已触发"
        : step.state === "blocked"
          ? "安全阻断已触发"
          : "未触发",
    checks,
    noTriggerReason:
      step.state === "pass" || step.state === "blocked"
        ? "已满足触发条件"
        : diagnoseNoTrigger(checks),
    recentFacts: [
      step.observation || "尚无观察事实",
      incident?.detail || step.evidence || "尚无证据说明",
    ],
    rootCause: step.diagnostic?.rootCause || "",
    rootCauseNote: step.diagnostic?.rootCauseNote || "",
    confirmedAt: step.diagnostic?.confirmedAt || "",
    confirmedBy: step.diagnostic?.confirmedBy || "",
  };
  return {
    ...step,
    evidenceMetadata: metadata,
    diagnostic,
  };
}

function seedFacePhotoDataUrl(label, background) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="440" viewBox="0 0 360 440"><rect width="360" height="440" rx="24" fill="${background}"/><circle cx="180" cy="150" r="70" fill="#dce9f7"/><path d="M70 390c10-105 68-155 110-155s100 50 110 155" fill="#dce9f7"/><text x="180" y="420" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#ffffff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const seedData = {
  version: 19,
  classes: [
    {
      id: "class-nev-2401",
      name: "新能源2401班",
      code: "NEV-2401",
      major: "新能源汽车技术",
      department: "新能源车辆学院",
      entryYear: "2024",
      duration: "3年",
      headTeacher: "王伟",
      status: "启用",
      studentCount: 28,
      updatedAt: "2026-09-16 15:20",
      notes: "",
    },
    {
      id: "class-nev-2402",
      name: "新能源2402班",
      code: "NEV-2402",
      major: "新能源汽车技术",
      department: "新能源车辆学院",
      entryYear: "2024",
      duration: "3年",
      headTeacher: "李晓敏",
      status: "启用",
      studentCount: 24,
      updatedAt: "2026-09-15 11:08",
      notes: "",
    },
    {
      id: "class-mec-2401",
      name: "机电2401班",
      code: "MEC-2401",
      major: "机电一体化",
      department: "智能制造学院",
      entryYear: "2024",
      duration: "3年",
      headTeacher: "周宁",
      status: "启用",
      studentCount: 32,
      updatedAt: "2026-09-13 09:42",
      notes: "",
    },
  ],
  teachers: [
    {
      id: "t1",
      name: "王伟",
      employeeNo: "T-0001",
      account: "wangwei",
      department: "新能源车辆学院",
      major: "新能源汽车技术",
      status: "启用",
      phone: "",
      sopCount: 8,
      arrangementCount: 32,
      accountResetAt: "未重置",
      updatedAt: "2026-09-16 14:20",
      notes: "负责新能源汽车高压安全实训",
    },
    {
      id: "t2",
      name: "李晓敏",
      employeeNo: "T-0002",
      account: "lixiaomin",
      department: "新能源车辆学院",
      major: "新能源汽车技术",
      status: "启用",
      phone: "",
      sopCount: 5,
      arrangementCount: 18,
      accountResetAt: "未重置",
      updatedAt: "2026-09-15 10:18",
      notes: "",
    },
    {
      id: "t3",
      name: "周宁",
      employeeNo: "T-0003",
      account: "zhouning",
      department: "智能制造学院",
      major: "机电一体化",
      status: "待停用",
      phone: "",
      sopCount: 3,
      arrangementCount: 12,
      accountResetAt: "未重置",
      updatedAt: "2026-09-13 09:42",
      notes: "停用申请待管理员确认",
    },
    {
      id: "t4",
      name: "陈立",
      employeeNo: "T-0004",
      account: "chenli",
      department: "机电工程学院",
      major: "数控技术",
      status: "停用",
      phone: "",
      sopCount: 2,
      arrangementCount: 9,
      accountResetAt: "2026-08-12 09:10",
      updatedAt: "2026-09-01 08:30",
      notes: "",
    },
  ],
  students: [
    {
      id: "s1",
      name: "张浩",
      no: "20241001",
      classId: "class-nev-2401",
      status: "启用",
      face: "已采集",
      faceStatus: "已采集",
      facePhotoDataUrl: seedFacePhotoDataUrl("张浩", "#315b88"),
      faceUpdatedAt: "2026-09-16 15:20",
      gender: "男",
      admissionYear: "2024",
      updatedAt: "2026-09-16 15:20",
      notes: "",
    },
    {
      id: "s2",
      name: "李思雨",
      no: "20241002",
      classId: "class-nev-2401",
      status: "启用",
      face: "已采集",
      faceStatus: "已采集",
      facePhotoDataUrl: seedFacePhotoDataUrl("李思雨", "#80627f"),
      faceUpdatedAt: "2026-09-16 15:18",
      gender: "女",
      admissionYear: "2024",
      updatedAt: "2026-09-16 15:18",
      notes: "",
    },
    {
      id: "s3",
      name: "陈宇",
      no: "20241003",
      classId: "class-nev-2401",
      status: "启用",
      face: "待重采",
      faceStatus: "待重采",
      facePhotoDataUrl: seedFacePhotoDataUrl("陈宇", "#716850"),
      faceUpdatedAt: "2026-08-20 10:10",
      gender: "男",
      admissionYear: "2024",
      updatedAt: "2026-09-15 11:05",
      notes: "需要重新采集正面人脸资料",
    },
    {
      id: "s4",
      name: "刘佳怡",
      no: "20241005",
      classId: "class-nev-2402",
      status: "待停用",
      face: "未采集",
      faceStatus: "未采集",
      facePhotoDataUrl: "",
      faceUpdatedAt: "",
      gender: "女",
      admissionYear: "2024",
      updatedAt: "2026-09-14 16:30",
      notes: "",
    },
  ],
  workstations: [
    {
      id: "w1",
      name: "1号工位",
      code: "WS-A01",
      location: "A区-01",
      status: "故障",
      supportedProject: "新能源汽车高压安全操作",
      currentArrangement: "高压安全操作练习",
      updatedAt: "2026-09-18 10:18",
      notes: "边缘推理服务异常，评价受控暂停",
      aiBaseConfig: {
        workstationId: "w1",
        primaryCameraId: "d2",
        fallbackCameraId: "d3",
        edgeDeviceId: "d1",
        lastCheckedAt: "2026-09-18 10:18",
        updatedAt: "2026-09-18 10:18",
        updatedBy: "系统管理员",
        lastAiCriticalChangeAt: "2026-09-12 16:20",
      },
    },
    {
      id: "w2",
      name: "2号工位",
      code: "WS-A02",
      location: "A区-02",
      status: "使用中",
      supportedProject: "新能源汽车高压安全操作",
      currentArrangement: "高压安全操作练习",
      updatedAt: "2026-09-18 10:12",
      notes: "",
      aiBaseConfig: {
        workstationId: "w2",
        primaryCameraId: "d10",
        fallbackCameraId: "",
        edgeDeviceId: "d11",
        lastCheckedAt: "2026-09-18 10:12",
        updatedAt: "2026-09-18 10:12",
        updatedBy: "系统管理员",
        lastAiCriticalChangeAt: "2026-09-09 15:40",
      },
    },
    {
      id: "w3",
      name: "3号工位",
      code: "WS-A03",
      location: "A区-03",
      status: "暂停中",
      supportedProject: "新能源汽车高压安全操作",
      currentArrangement: "高压安全操作练习",
      updatedAt: "2026-09-18 10:06",
      notes: "教师人工暂停",
      aiBaseConfig: {
        workstationId: "w3",
        primaryCameraId: "d5",
        fallbackCameraId: "",
        edgeDeviceId: "d6",
        lastCheckedAt: "2026-09-18 10:06",
        updatedAt: "2026-09-18 10:06",
        updatedBy: "系统管理员",
        lastAiCriticalChangeAt: "2026-09-10 14:30",
      },
    },
    {
      id: "w4",
      name: "4号工位",
      code: "WS-A04",
      location: "A区-04",
      status: "可入场",
      supportedProject: "新能源汽车高压安全操作",
      currentArrangement: "高压安全操作练习",
      updatedAt: "2026-09-18 09:58",
      notes: "",
      aiBaseConfig: {
        workstationId: "w4",
        primaryCameraId: "d7",
        fallbackCameraId: "",
        edgeDeviceId: "",
        lastCheckedAt: "2026-09-18 09:58",
        updatedAt: "2026-09-18 09:58",
        updatedBy: "系统管理员",
        lastAiCriticalChangeAt: "2026-09-18 09:58",
      },
    },
    {
      id: "w5",
      name: "5号工位",
      code: "WS-A05",
      location: "A区-05",
      status: "可入场",
      supportedProject: "新能源汽车高压安全操作",
      currentArrangement: "无",
      updatedAt: "2026-09-18 09:56",
      notes: "",
      aiBaseConfig: {
        workstationId: "w5",
        primaryCameraId: "d8",
        fallbackCameraId: "",
        edgeDeviceId: "d9",
        lastCheckedAt: "2026-09-18 09:56",
        updatedAt: "2026-09-18 09:56",
        updatedBy: "系统管理员",
        lastAiCriticalChangeAt: "2026-09-11 11:10",
      },
    },
    {
      id: "w6",
      name: "6号工位",
      code: "WS-A06",
      location: "A区-06",
      status: "维护中",
      supportedProject: "新能源汽车高压安全操作",
      currentArrangement: "无",
      updatedAt: "2026-09-18 09:50",
      notes: "辅助摄像头离线，等待检修",
    },
  ],
  devices: [
    {
      id: "d1",
      name: "EDGE-001",
      serial: "EDGE-SN-001",
      type: "边缘工作站",
      status: "异常",
      workstationId: "w1",
      address: "10.20.1.11",
      version: "Agent 3.2.1",
      lastHeartbeat: "2026-09-18 10:18",
      lastTestAt: "2026-09-18 10:18",
      updatedAt: "2026-09-18 10:18",
      notes: "推理服务异常",
    },
    {
      id: "d2",
      name: "CAM-001-A",
      serial: "CAM-SN-001-A",
      type: "全景摄像头",
      status: "在线",
      workstationId: "w1",
      address: "rtsp://10.20.1.21/main",
      version: "FW 2.4",
      streamStatus: "可用",
      resolution: "1920 × 1080",
      lastHeartbeat: "2026-09-18 10:24",
      lastTestAt: "2026-09-17 16:20",
      updatedAt: "2026-09-18 10:24",
      notes: "",
    },
    {
      id: "d3",
      name: "CAM-001-B",
      serial: "CAM-SN-001-B",
      type: "细节摄像头",
      status: "在线",
      workstationId: "w1",
      address: "rtsp://10.20.1.22/main",
      version: "FW 2.4",
      streamStatus: "可用",
      resolution: "1920 × 1080",
      lastHeartbeat: "2026-09-18 10:24",
      lastTestAt: "2026-09-17 16:20",
      updatedAt: "2026-09-18 10:24",
      notes: "",
    },
    {
      id: "d4",
      name: "AUDIO-002",
      serial: "AUD-SN-002",
      type: "定向麦克风",
      status: "在线",
      workstationId: "w2",
      address: "USB / EDGE-002",
      version: "FW 1.9",
      lastHeartbeat: "2026-09-18 10:23",
      lastTestAt: "2026-09-16 14:10",
      updatedAt: "2026-09-18 10:23",
      notes: "",
    },
    {
      id: "d5",
      name: "CAM-003-A",
      serial: "CAM-SN-003-A",
      type: "全景摄像头",
      status: "在线",
      workstationId: "w3",
      address: "rtsp://10.20.3.21/main",
      version: "FW 2.4",
      streamStatus: "可用",
      resolution: "1920 × 1080",
      lastHeartbeat: "2026-09-18 10:22",
      lastTestAt: "2026-09-18 10:06",
      updatedAt: "2026-09-18 10:22",
      notes: "",
    },
    {
      id: "d10",
      name: "CAM-002-A",
      serial: "CAM-SN-002-A",
      type: "全景摄像头",
      status: "在线",
      workstationId: "w2",
      address: "rtsp://10.20.2.21/main",
      version: "FW 2.4",
      streamStatus: "可用",
      resolution: "1920 × 1080",
      lastHeartbeat: "2026-09-18 10:23",
      lastTestAt: "2026-09-18 10:12",
      updatedAt: "2026-09-18 10:23",
      notes: "",
    },
    {
      id: "d11",
      name: "EDGE-002",
      serial: "EDGE-SN-002",
      type: "边缘工作站",
      status: "在线",
      workstationId: "w2",
      address: "10.20.2.11",
      version: "Agent 3.2.1",
      lastHeartbeat: "2026-09-18 10:23",
      lastTestAt: "2026-09-18 10:12",
      updatedAt: "2026-09-18 10:23",
      notes: "",
    },
    {
      id: "d6",
      name: "EDGE-003",
      serial: "EDGE-SN-003",
      type: "边缘工作站",
      status: "在线",
      workstationId: "w3",
      address: "10.20.3.11",
      version: "Agent 3.2.1",
      lastHeartbeat: "2026-09-18 10:22",
      lastTestAt: "2026-09-18 10:06",
      updatedAt: "2026-09-18 10:22",
      notes: "",
    },
    {
      id: "d7",
      name: "CAM-004-A",
      serial: "CAM-SN-004-A",
      type: "全景摄像头",
      status: "在线",
      workstationId: "w4",
      address: "rtsp://10.20.4.21/main",
      version: "FW 2.4",
      streamStatus: "可用",
      resolution: "2560 × 1440",
      lastHeartbeat: "2026-09-18 10:20",
      lastTestAt: "2026-09-18 09:58",
      updatedAt: "2026-09-18 10:20",
      notes: "等待配置边缘设备",
    },
    {
      id: "d8",
      name: "CAM-005-A",
      serial: "CAM-SN-005-A",
      type: "全景摄像头",
      status: "离线",
      workstationId: "w5",
      address: "rtsp://10.20.5.21/main",
      version: "FW 2.3",
      streamStatus: "不可用",
      resolution: "1920 × 1080",
      lastHeartbeat: "2026-09-18 08:42",
      lastTestAt: "2026-09-18 09:56",
      updatedAt: "2026-09-18 09:56",
      notes: "等待检查网络连接",
    },
    {
      id: "d9",
      name: "EDGE-005",
      serial: "EDGE-SN-005",
      type: "边缘工作站",
      status: "在线",
      workstationId: "w5",
      address: "10.20.5.11",
      version: "Agent 3.2.1",
      lastHeartbeat: "2026-09-18 10:19",
      lastTestAt: "2026-09-18 09:56",
      updatedAt: "2026-09-18 10:19",
      notes: "",
    },
  ],
  aiCapabilityConfigs: [
    {
      id: "ai-config-s1",
      sopId: "s1",
      status: "pending_validation",
      stepConfigs: [
        {
          stepId: "Step 01",
          actualEvaluationMode: "visual_auto",
          downgradeReason: "",
          scoreRuleTreatments: [],
          safetyRuleTreatments: [],
        },
        ...["Step 02", "Step 03", "Step 04", "Step 05", "Step 06"].map(
          (stepId) => ({
            stepId,
            actualEvaluationMode: "default_pass_manual_deduction",
            downgradeReason:
              "当前示例仅对作业前绝缘手套进行AI判断，其余步骤由教师评价。",
            scoreRuleTreatments: [],
            safetyRuleTreatments: [],
          }),
        ),
      ],
      judgementItems: [
        {
          id: "ai-judgement-s1-step1-gloves",
          stepId: "Step 01",
          name: "确认绝缘手套已佩戴",
          purposes: ["completion"],
          scoreRuleIds: [],
          safetyRuleIds: [],
          combination: "all",
          conditions: [
            {
              id: "ai-condition-s1-step1-gloves",
              capabilityId: "cap-insulating-gloves",
              operator: "in_area",
              logicalAreaId: "logical-area-s1-safety-check",
              minTargetCount: 2,
              minDurationSeconds: 1,
              minOccurrences: 1,
            },
          ],
          fallback:
            "AI结果不可靠、摄像头异常或证据不足时，标记为不确定并转人工确认，不直接形成学生负向结果。",
        },
      ],
      logicalAreas: [
        {
          id: "logical-area-s1-safety-check",
          name: "作业检查区域",
          description: "学生进入工位后进行绝缘防护用品检查的固定画面区域。",
          createdAt: "2026-09-24 10:00",
        },
      ],
      workstationValidationStates: [],
      createdBy: "系统管理员",
      createdAt: "2026-09-24 10:00",
      updatedAt: "2026-09-24 10:00",
      completedAt: "2026-09-24 10:00",
    },
  ],
  sopWorkstationAiConfigs: [
    {
      id: "sop-workstation-ai-s1-w2",
      sopAiConfigId: "ai-config-s1",
      workstationId: "w2",
      judgementCameraBindings: [
        {
          judgementItemId: "ai-judgement-s1-step1-gloves",
          cameraId: "d10",
          source: "primary",
        },
      ],
      logicalAreaMappings: [],
      validationStatus: "unvalidated",
      enableStatus: "not_enabled",
      validationCases: [],
      validationRecords: [],
      createdAt: "2026-09-24 10:10",
      updatedAt: "2026-09-24 10:10",
      lastCriticalConfigChangeAt: "2026-09-24 10:10",
    },
  ],
  aiCapabilities: [
    {
      id: "cap-insulating-gloves",
      name: "绝缘手套检测",
      type: "object_detection",
      description: "识别画面中的绝缘手套并返回目标位置。",
      targetName: "绝缘手套",
      status: "已发布",
      currentModelStatus: "已发布",
      referenceCount: 1,
      referencingConfigIds: ["ai-config-s1"],
      currentPublishedModel: {
        trainingTaskId: "ai-training-gloves-published",
        modelArtifactId: "model-gloves-current",
        publishedBy: "系统管理员",
        publishedAt: "2026-09-20 15:30",
        metricSummary: {
          precision: 0.901,
          recall: 0.872,
          compositeMetric: 0.886,
          testSampleCount: 18,
        },
      },
      createdBy: "系统管理员",
      createdAt: "2026-09-16 10:00",
      updatedAt: "2026-09-20 15:30",
      note: "",
    },
    {
      id: "cap-voltage-tester",
      name: "验电笔检测",
      type: "object_detection",
      description: "识别画面中的验电笔并返回目标位置。",
      targetName: "验电笔",
      status: "已发布",
      currentModelStatus: "已发布",
      referenceCount: 0,
      currentPublishedModel: {
        trainingTaskId: "ai-training-tester-published",
        modelArtifactId: "model-tester-current",
        publishedBy: "系统管理员",
        publishedAt: "2026-09-21 11:40",
        metricSummary: {
          precision: 0.918,
          recall: 0.894,
          compositeMetric: 0.906,
          testSampleCount: 16,
        },
      },
      createdBy: "系统管理员",
      createdAt: "2026-09-17 09:20",
      updatedAt: "2026-09-21 11:40",
      note: "",
    },
    {
      id: "cap-secondary-voltage-check",
      name: "二次验电动作识别",
      type: "action_recognition",
      description: "识别操作者是否完成完整的二次验电动作过程。",
      targetName: "二次验电",
      status: "数据准备中",
      currentModelStatus: "未训练",
      referenceCount: 0,
      createdBy: "系统管理员",
      createdAt: "2026-09-22 14:10",
      updatedAt: "2026-09-23 16:00",
      note: "待采集不同视角的动作视频。",
    },
    {
      id: "cap-workpiece-clamping",
      name: "工件夹紧动作识别",
      type: "action_recognition",
      description: "识别操作者完成工件夹紧的动作过程。",
      targetName: "工件夹紧",
      status: "草稿",
      currentModelStatus: "未训练",
      referenceCount: 0,
      createdBy: "系统管理员",
      createdAt: "2026-09-24 09:00",
      updatedAt: "2026-09-24 09:00",
      note: "",
    },
  ],
  aiSourceVideos: [
    {
      id: "ai-video-gloves-01",
      capabilityId: "cap-insulating-gloves",
      fileName: "绝缘手套-标准展示.mp4",
      displayName: "绝缘手套标准展示",
      storageRef: "",
      mimeType: "video/mp4",
      codec: "H.264",
      duration: "00:24",
      width: 1920,
      height: 1080,
      frameRate: 30,
      fileSize: 16777216,
      dataCategory: "normal",
      sourceType: "standard_demo",
      workstationId: "w1",
      capturedAt: "2026-09-20",
      note: "双手正反面展示，画面清晰。",
      processingStatus: "derived",
      uploadedBy: "系统管理员",
      uploadedAt: "2026-09-20 10:20",
      updatedAt: "2026-09-20 10:45",
    },
    {
      id: "ai-video-gloves-02",
      capabilityId: "cap-insulating-gloves",
      fileName: "绝缘手套-侧面弱光.mov",
      displayName: "侧面弱光手套展示",
      storageRef: "",
      mimeType: "video/quicktime",
      codec: "H.264",
      duration: "00:18",
      width: 1280,
      height: 720,
      frameRate: 25,
      fileSize: 10485760,
      dataCategory: "normal",
      sourceType: "supplemental_capture",
      workstationId: "w2",
      capturedAt: "2026-09-21",
      note: "专项补采侧面弱光场景。",
      processingStatus: "unprocessed",
      uploadedBy: "系统管理员",
      uploadedAt: "2026-09-21 16:10",
      updatedAt: "2026-09-21 16:10",
    },
    {
      id: "ai-video-secondary-check-01",
      capabilityId: "cap-secondary-voltage-check",
      fileName: "二次验电-教师标准示范.mp4",
      displayName: "二次验电教师标准示范",
      storageRef: "",
      mimeType: "video/mp4",
      codec: "H.264",
      duration: "00:42",
      width: 1920,
      height: 1080,
      fileSize: 38482944,
      dataCategory: "normal",
      sourceType: "standard_demo",
      workstationId: "w2",
      capturedAt: "2026-09-22",
      note: "正面主机位，动作完整，光照稳定。",
      processingStatus: "derived",
      uploadedBy: "系统管理员",
      uploadedAt: "2026-09-22 14:20",
      updatedAt: "2026-09-23 15:40",
    },
    {
      id: "ai-video-secondary-check-02",
      capabilityId: "cap-secondary-voltage-check",
      fileName: "二次验电-遗漏复检.mov",
      displayName: "遗漏复检错误示范",
      storageRef: "",
      mimeType: "video/quicktime",
      codec: "H.264",
      duration: "00:31",
      width: 1920,
      height: 1080,
      fileSize: 29884416,
      dataCategory: "error",
      sourceType: "supplemental_capture",
      workstationId: "w2",
      capturedAt: "2026-09-23",
      note: "专项补采，遗漏第二验电点。",
      processingStatus: "unprocessed",
      uploadedBy: "系统管理员",
      uploadedAt: "2026-09-23 15:45",
      updatedAt: "2026-09-23 15:45",
    },
    {
      id: "ai-video-secondary-check-03",
      capabilityId: "cap-secondary-voltage-check",
      fileName: "工位待机背景-01.mp4",
      displayName: "验电工位待机背景",
      storageRef: "",
      mimeType: "video/mp4",
      codec: "H.264",
      duration: "01:10",
      width: 1280,
      height: 720,
      fileSize: 21872640,
      dataCategory: "background",
      sourceType: "historical_recording",
      workstationId: "w3",
      capturedAt: "2026-09-18",
      note: "无目标动作，用于区分环境背景。",
      processingStatus: "unprocessed",
      uploadedBy: "系统管理员",
      uploadedAt: "2026-09-23 16:00",
      updatedAt: "2026-09-23 16:00",
    },
  ],
  aiExtractionTasks: [
    {
      id: "extract-task-gloves-01",
      capabilityId: "cap-insulating-gloves",
      taskType: "frame_extraction",
      method: "interval",
      sourceVideoIds: ["ai-video-gloves-01"],
      parameters: {
        samplingMode: "interval",
        sampleValue: 4,
        rangeMode: "entire",
        startTime: "00:00",
        endTime: "",
        maxFrames: 500,
        outputResolution: "original",
      },
      status: "completed",
      progress: 100,
      completedVideoIds: ["ai-video-gloves-01"],
      generatedCount: 3,
      failures: [],
      createdBy: "系统管理员",
      createdAt: "2026-09-20 10:45",
      updatedAt: "2026-09-20 10:45",
    },
    {
      id: "slice-task-secondary-01",
      capabilityId: "cap-secondary-voltage-check",
      taskType: "video_slicing",
      method: "manual",
      sourceVideoIds: ["ai-video-secondary-check-01"],
      parameters: {
        startTime: "00:06",
        endTime: "00:25",
        note: "完整验电动作",
      },
      status: "completed",
      progress: 100,
      completedVideoIds: ["ai-video-secondary-check-01"],
      generatedCount: 1,
      failures: [],
      createdBy: "系统管理员",
      createdAt: "2026-09-22 15:10",
      updatedAt: "2026-09-22 15:10",
    },
    {
      id: "slice-task-secondary-failed",
      capabilityId: "cap-secondary-voltage-check",
      taskType: "video_slicing",
      method: "fixed_length",
      sourceVideoIds: ["ai-video-secondary-check-02"],
      parameters: { clipLength: 5, step: 5, startTime: "", endTime: "" },
      status: "failed",
      progress: 100,
      completedVideoIds: [],
      generatedCount: 0,
      failures: [
        {
          sourceVideoId: "ai-video-secondary-check-02",
          reason: "视频解码服务临时异常，可重试处理。",
        },
      ],
      createdBy: "系统管理员",
      createdAt: "2026-09-23 16:10",
      updatedAt: "2026-09-23 16:10",
    },
  ],
  aiCleaningTasks: [],
  aiAnnotationCategories: [],
  aiTrainingDataConfigs: [],
  aiTrainingTasks: [
    {
      id: "ai-training-gloves-20260924",
      capabilityId: "cap-insulating-gloves",
      capabilityName: "绝缘手套检测",
      capabilityType: "object_detection",
      status: "completed",
      progress: 100,
      currentEpoch: 80,
      simulationStep: 4,
      trainingParams: {
        baseModel: "standard",
        epochs: 80,
        batchSize: 16,
        imageSize: 640,
        initialLearningRate: 0.001,
      },
      snapshotSummary: { train: 18, validation: 4, test: 4, categoryCount: 1 },
      dataSnapshot: {
        capability: {
          id: "cap-insulating-gloves",
          name: "绝缘手套检测",
          type: "object_detection",
          targetName: "绝缘手套",
        },
        trainItemIds: Array.from(
          { length: 18 },
          (_, index) => `glove-train-${index + 1}`,
        ),
        validationItemIds: Array.from(
          { length: 4 },
          (_, index) => `glove-validation-${index + 1}`,
        ),
        testItemIds: [
          "ai-frame-gloves-001",
          "ai-frame-gloves-002",
          "glove-test-3",
          "glove-test-4",
        ],
        items: [
          {
            id: "ai-frame-gloves-001",
            sourceVideoId: "ai-video-gloves-01",
            storageRef: "",
            sourceTimeMs: 4000,
            split: "test",
            boxes: [
              {
                categoryId: "seed-cat-gloves",
                x: 0.24,
                y: 0.2,
                width: 0.32,
                height: 0.46,
              },
            ],
          },
          {
            id: "ai-frame-gloves-002",
            sourceVideoId: "ai-video-gloves-01",
            storageRef: "",
            sourceTimeMs: 8000,
            split: "test",
            boxes: [
              {
                categoryId: "seed-cat-gloves",
                x: 0.31,
                y: 0.23,
                width: 0.29,
                height: 0.43,
              },
            ],
          },
        ],
        categories: [
          {
            id: "seed-cat-gloves",
            capabilityId: "cap-insulating-gloves",
            name: "绝缘手套",
          },
        ],
        capturedAt: "2026-09-24 09:10",
      },
      hadPublishedModel: true,
      capabilityStatusBeforeTraining: "已发布",
      currentModelStatusBeforeTraining: "已发布",
      modelArtifactId: "candidate-ai-training-gloves-20260924",
      validationResult: {
        sampleCount: 4,
        completedAt: "2026-09-24 10:31",
        status: "completed",
      },
      result: {
        trainingTaskId: "ai-training-gloves-20260924",
        precision: 0.923,
        recall: 0.887,
        compositeMetric: 0.905,
        testSampleCount: 4,
        perCategory: [
          {
            categoryId: "seed-cat-gloves",
            name: "绝缘手套",
            precision: 0.923,
            recall: 0.887,
          },
        ],
        predictions: [
          {
            itemId: "ai-frame-gloves-001",
            sourceVideoId: "ai-video-gloves-01",
            sourceTimeMs: 4000,
            confidence: 0.93,
          },
          {
            itemId: "ai-frame-gloves-002",
            sourceVideoId: "ai-video-gloves-01",
            sourceTimeMs: 8000,
            confidence: 0.9,
          },
        ],
      },
      logs: [
        {
          time: "2026-09-24 09:10",
          stage: "准备",
          message: "训练数据与参数快照已锁定。",
        },
        { time: "2026-09-24 09:12", stage: "训练", message: "开始模型训练。" },
        {
          time: "2026-09-24 10:20",
          stage: "验证",
          message: "开始验证模型表现。",
        },
        {
          time: "2026-09-24 10:31",
          stage: "测试",
          message: "开始独立测试集评估。",
        },
        {
          time: "2026-09-24 10:38",
          stage: "完成",
          message: "训练任务完成，已生成候选模型。",
        },
      ],
      createdBy: "系统管理员",
      createdAt: "2026-09-24 09:10",
      startedAt: "2026-09-24 09:10",
      completedAt: "2026-09-24 10:38",
      updatedAt: "2026-09-24 10:38",
    },
    {
      id: "ai-training-secondary-failed",
      capabilityId: "cap-secondary-voltage-check",
      capabilityName: "二次验电动作识别",
      capabilityType: "action_recognition",
      status: "failed",
      progress: 31,
      currentEpoch: 14,
      simulationStep: 1,
      trainingParams: {
        baseModel: "standard_action",
        epochs: 50,
        batchSize: 8,
        clipSampleLength: 16,
        sampleInterval: 2,
      },
      snapshotSummary: { train: 12, validation: 3, test: 3, categoryCount: 2 },
      dataSnapshot: {
        capability: {
          id: "cap-secondary-voltage-check",
          name: "二次验电动作识别",
          type: "action_recognition",
          targetName: "二次验电",
        },
        trainItemIds: Array.from(
          { length: 12 },
          (_, index) => `secondary-train-${index + 1}`,
        ),
        validationItemIds: [
          "secondary-validation-1",
          "secondary-validation-2",
          "secondary-validation-3",
        ],
        testItemIds: [
          "secondary-test-1",
          "secondary-test-2",
          "secondary-test-3",
        ],
        items: [],
        categories: [
          {
            id: "seed-cat-secondary",
            capabilityId: "cap-secondary-voltage-check",
            name: "二次验电",
          },
          {
            id: "seed-cat-secondary-background",
            capabilityId: "cap-secondary-voltage-check",
            name: "背景/非目标动作",
            isBackground: true,
          },
        ],
        capturedAt: "2026-09-23 16:30",
      },
      hadPublishedModel: false,
      capabilityStatusBeforeTraining: "数据准备中",
      currentModelStatusBeforeTraining: "未训练",
      failureReason: "训练节点读取视频片段超时，请检查数据存储连接后重试。",
      logs: [
        {
          time: "2026-09-23 16:30",
          stage: "准备",
          message: "训练数据与参数快照已锁定。",
        },
        { time: "2026-09-23 16:31", stage: "训练", message: "开始模型训练。" },
        {
          time: "2026-09-23 16:47",
          stage: "失败",
          message: "训练节点读取视频片段超时，请检查数据存储连接后重试。",
        },
      ],
      createdBy: "系统管理员",
      createdAt: "2026-09-23 16:30",
      startedAt: "2026-09-23 16:30",
      failedAt: "2026-09-23 16:47",
      updatedAt: "2026-09-23 16:47",
    },
  ],
  aiModelPublicationRecords: [
    {
      id: "model-publication-gloves-current",
      capabilityId: "cap-insulating-gloves",
      trainingTaskId: "ai-training-gloves-published",
      modelArtifactId: "model-gloves-current",
      publishedBy: "系统管理员",
      publishedAt: "2026-09-20 15:30",
      metricSummary: {
        precision: 0.901,
        recall: 0.872,
        compositeMetric: 0.886,
        testSampleCount: 18,
      },
      replacedExistingModel: false,
      previousTrainingTaskId: "",
      affectedConfigCount: 0,
      affectedConfigIds: [],
    },
    {
      id: "model-publication-tester-current",
      capabilityId: "cap-voltage-tester",
      trainingTaskId: "ai-training-tester-published",
      modelArtifactId: "model-tester-current",
      publishedBy: "系统管理员",
      publishedAt: "2026-09-21 11:40",
      metricSummary: {
        precision: 0.918,
        recall: 0.894,
        compositeMetric: 0.906,
        testSampleCount: 16,
      },
      replacedExistingModel: false,
      previousTrainingTaskId: "",
      affectedConfigCount: 0,
      affectedConfigIds: [],
    },
  ],
  aiCapabilityModelEvents: [],
  aiFrames: [
    {
      id: "ai-frame-gloves-001",
      capabilityId: "cap-insulating-gloves",
      sourceVideoId: "ai-video-gloves-01",
      taskId: "extract-task-gloves-01",
      sourceTimeMs: 4000,
      fileName: "ai-video-gloves-01_00m04.000.jpg",
      storageRef: "",
      width: 1920,
      height: 1080,
      generationStatus: "success",
      processingStatus: "derived",
      createdAt: "2026-09-20 10:45",
    },
    {
      id: "ai-frame-gloves-002",
      capabilityId: "cap-insulating-gloves",
      sourceVideoId: "ai-video-gloves-01",
      taskId: "extract-task-gloves-01",
      sourceTimeMs: 8000,
      fileName: "ai-video-gloves-01_00m08.000.jpg",
      storageRef: "",
      width: 1920,
      height: 1080,
      generationStatus: "success",
      processingStatus: "pending_cleaning",
      createdAt: "2026-09-20 10:45",
    },
    {
      id: "ai-frame-gloves-003",
      capabilityId: "cap-insulating-gloves",
      sourceVideoId: "ai-video-gloves-01",
      taskId: "extract-task-gloves-01",
      sourceTimeMs: 12000,
      fileName: "ai-video-gloves-01_00m12.000.jpg",
      storageRef: "",
      width: 1920,
      height: 1080,
      generationStatus: "success",
      processingStatus: "pending_cleaning",
      createdAt: "2026-09-20 10:45",
    },
  ],
  aiClips: [
    {
      id: "ai-clip-secondary-001",
      capabilityId: "cap-secondary-voltage-check",
      sourceVideoId: "ai-video-secondary-check-01",
      taskId: "slice-task-secondary-01",
      startMs: 6000,
      endMs: 25000,
      durationMs: 19000,
      storageRef: "",
      generationMethod: "manual",
      note: "完整验电动作",
      generationStatus: "success",
      processingStatus: "pending_cleaning",
      createdAt: "2026-09-22 15:10",
    },
  ],
  sops: [
    {
      id: "s1",
      familyId: "sop-family-hv",
      name: "新能源汽车高压安全操作",
      owner: "王老师",
      version: "V3.2",
      status: "已发布",
      frozen: true,
      operation: "新能源汽车高压系统检修与拆装",
      basis: "新能源汽车高压作业安全规范（校内实训版）",
      conditions: "固定工位、双摄像头、绝缘防护用品及经校验工具",
      standardDuration: "25 分钟",
      publishedAt: "2026-09-15 14:30",
      signedBy: "王伟",
      updatedAt: "2026-09-15 14:30",
      steps: [
        {
          id: "Step 01",
          name: "作业前安全检查",
          attribute: "必做",
          predecessor: "无",
          timeout: "02:00",
          score: 15,
          completionCondition: "确认工位隔离、工具完好并佩戴完整防护用品。",
          evidence: "全景画面与防护用品特写同时可见。",
          deductionRule: "每缺少一项扣 5 分。",
          redline: "未佩戴绝缘手套禁止继续作业。",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
        {
          id: "Step 02",
          name: "车辆下电与验电",
          attribute: "必做",
          predecessor: "Step 01",
          timeout: "05:00",
          score: 20,
          completionCondition: "按规定顺序完成下电、等待和二次验电。",
          evidence: "仪表读数、验电位置及人员动作完整可见。",
          deductionRule: "顺序错误扣 10 分，未二次验电不得分。",
          redline: "带电拆装触发立即终止。",
          confirmFrames: 5,
          minConfidence: "0.82",
        },
        {
          id: "Step 03",
          name: "高压电池包断电",
          attribute: "必做",
          predecessor: "Step 02",
          timeout: "04:00",
          score: 15,
          completionCondition: "维修开关拆除并放置在指定安全区。",
          evidence: "维修开关和安全区标识清晰可见。",
          deductionRule: "放置区域错误扣 5 分。",
          redline: "未验电不得进入本步骤。",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
        {
          id: "Step 04",
          name: "拆卸高压接插件",
          attribute: "必做",
          predecessor: "Step 03",
          timeout: "05:00",
          score: 20,
          completionCondition: "按解锁结构完整拆卸并完成端口防护。",
          evidence: "双手动作、锁止结构和端口防护均可见。",
          deductionRule: "暴力拆卸扣 10 分，未防护扣 5 分。",
          redline: "禁止使用非绝缘金属工具撬动。",
          confirmFrames: 6,
          minConfidence: "0.84",
        },
        {
          id: "Step 05",
          name: "高压部件拆装",
          attribute: "必做",
          predecessor: "Step 04",
          timeout: "06:00",
          score: 20,
          completionCondition: "规范完成部件拆装与扭矩确认。",
          evidence: "工具、扭矩值和部件安装状态清晰可见。",
          deductionRule: "遗漏紧固点每处扣 5 分。",
          redline: "零部件跌落需停止并检查。",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
        {
          id: "Step 06",
          name: "复位与场地恢复",
          attribute: "必做",
          predecessor: "Step 05",
          timeout: "03:00",
          score: 10,
          completionCondition: "完成复位、工具清点和场地清洁。",
          evidence: "工具盘、设备状态与场地全景可见。",
          deductionRule: "工具遗漏或场地未恢复扣 5 分。",
          redline: "",
          confirmFrames: 5,
          minConfidence: "0.78",
        },
      ],
      history: [
        {
          version: "V3.2",
          status: "已发布",
          time: "2026-09-15 14:30",
          actor: "王伟",
          note: "更新二次验电证据要求并完成教师签名",
        },
        {
          version: "V3.1",
          status: "已归档",
          time: "2026-06-20 10:10",
          actor: "王伟",
          note: "增加端口防护规则",
        },
      ],
    },
    {
      id: "s2",
      familyId: "sop-family-gripper",
      name: "工业机器人末端夹具更换",
      owner: "王老师",
      version: "V1.5",
      status: "草稿",
      frozen: false,
      operation: "工业机器人末端夹具拆卸、安装与安全确认",
      basis: "工业机器人实训安全操作规程（校内版）",
      conditions: "固定工位、主摄像头、标准夹具及经校验工具",
      standardDuration: "12 分钟",
      updatedAt: "2026-09-18 10:22",
      signedBy: "",
      steps: [
        {
          id: "Step 01",
          name: "断电并确认安全状态",
          attribute: "必做",
          predecessor: "无",
          timeout: "00:45",
          score: 15,
          completionCondition: "关闭电源并确认机器人处于安全停机状态。",
          evidence: "急停、电源状态与人员动作清晰可见。",
          deductionRule: "未确认停机扣 15 分。",
          redline: "带电操作立即终止。",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
        {
          id: "Step 02",
          name: "拆卸原夹具",
          attribute: "必做",
          predecessor: "Step 01",
          timeout: "02:30",
          score: 20,
          completionCondition: "按对角顺序拆卸紧固件并托稳夹具。",
          evidence: "工具、紧固件和夹具均可见。",
          deductionRule: "顺序错误扣 5 分。",
          redline: "夹具未托稳禁止继续。",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
        {
          id: "Step 03",
          name: "清洁安装面",
          attribute: "必做",
          predecessor: "Step 02",
          timeout: "01:30",
          score: 15,
          completionCondition: "清除异物并确认安装面无损伤。",
          evidence: "安装面特写可见。",
          deductionRule: "清洁不完整扣 5 分。",
          redline: "",
          confirmFrames: 5,
          minConfidence: "0.78",
        },
        {
          id: "Step 04",
          name: "安装新夹具",
          attribute: "必做",
          predecessor: "Step 03",
          timeout: "04:00",
          score: 30,
          completionCondition: "定位到位并按规定顺序、扭矩完成紧固。",
          evidence: "定位销、扭矩工具和紧固顺序清晰可见。",
          deductionRule: "扭矩或顺序错误每项扣 10 分。",
          redline: "使用错误规格夹具立即终止。",
          confirmFrames: 6,
          minConfidence: "0.84",
        },
        {
          id: "Step 05",
          name: "校准与复位",
          attribute: "必做",
          predecessor: "Step 04",
          timeout: "03:00",
          score: 20,
          completionCondition: "完成零点校准、低速试运行与工具归位。",
          evidence: "示教器、夹具运行和工具盘可见。",
          deductionRule: "未试运行扣 10 分。",
          redline: "人员进入运行区域禁止启动。",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
      ],
      history: [
        {
          version: "V1.4",
          status: "已发布",
          time: "2026-06-08 11:20",
          actor: "王伟",
          note: "上一发布版本",
        },
      ],
    },
    {
      id: "s3",
      familyId: "sop-family-cnc",
      name: "数控机床工件装夹",
      owner: "李老师",
      version: "V2.1",
      status: "已发布",
      frozen: true,
      operation: "数控机床工件装夹",
      basis: "数控加工实训规范",
      conditions: "数控实训工位",
      standardDuration: "15 分钟",
      publishedAt: "2026-09-10 09:10",
      signedBy: "李晓敏",
      updatedAt: "2026-09-10 09:10",
      steps: [
        {
          id: "Step 01",
          name: "装夹前检查",
          attribute: "必做",
          predecessor: "无",
          timeout: "03:00",
          score: 100,
          completionCondition: "完成检查和装夹确认。",
          evidence: "工件与夹具可见。",
          deductionRule: "不符合不得分。",
          redline: "",
          confirmFrames: 5,
          minConfidence: "0.80",
        },
      ],
      history: [],
    },
  ],
  aiImpactAssessments: [],
  compatibilityDecisions: [],
  workstationProfiles: [],
  evaluationMappings: [
    {
      id: "mapping-s1-map1",
      sopFamilyId: "sop-family-hv",
      version: "MAP1",
      status: "pending_teacher_confirmation",
      authoredFor: { sopId: "s1", sopVersion: "V3.2" },
      compatibleSopVersions: [],
      evaluationItems: [
        {
          id: "EI-S1-001",
          stepId: "Step 01",
          name: "安全防护检查完成",
          type: "业务判断项",
          roles: ["completion"],
          sourceCompletion: "确认工位隔离、工具完好并佩戴完整防护用品。",
          sourceScoreRuleIds: [],
          sourceSafetyRuleIds: [],
          machineEventIds: ["ME-S1-001", "ME-S1-002"],
          scoreTreatment: { type: "", note: "" },
          fallback: "no_negative_auto_decision",
        },
        {
          id: "EI-S1-002",
          stepId: "Step 02",
          name: "下电与二次验电完成",
          type: "业务判断项",
          roles: ["completion"],
          sourceCompletion: "按规定顺序完成下电、等待和二次验电。",
          sourceScoreRuleIds: [],
          sourceSafetyRuleIds: [],
          machineEventIds: ["ME-S1-003", "ME-S1-004"],
          scoreTreatment: { type: "", note: "" },
          fallback: "no_negative_auto_decision",
        },
      ],
      machineEvents: [
        {
          id: "ME-S1-001",
          name: "绝缘手套出现",
          factDefinition: "画面中确认双手均佩戴绝缘手套。",
          capabilityMode: "existing_capability",
          existingCapabilityRef: "防护用品检测",
          implementationNote: "复用现有目标检测能力。",
        },
        {
          id: "ME-S1-002",
          name: "工具检查动作成立",
          factDefinition: "工具依次进入检查区域并形成持续可见证据。",
          capabilityMode: "configuration_only",
          existingCapabilityRef: "工具检测",
          implementationNote: "配置工具区与停留时长。",
        },
        {
          id: "ME-S1-003",
          name: "车辆下电动作发生",
          factDefinition: "点火开关关闭且钥匙离开车辆操作区域。",
          capabilityMode: "existing_capability",
          existingCapabilityRef: "下电动作识别",
          implementationNote: "复用既有动作能力。",
        },
        {
          id: "ME-S1-004",
          name: "二次验电动作成立",
          factDefinition: "验电工具依次进入两个高压端点区域并满足有效停留。",
          capabilityMode: "training_required",
          existingCapabilityRef: "",
          implementationNote: "需补充双端点验电动作样本。",
        },
      ],
      teacherConfirmation: {
        status: "待确认",
        teacher: "",
        comment: "",
        confirmedAt: "",
      },
      createdBy: "刘工",
      createdAt: "2026-09-20 16:10",
      updatedAt: "2026-09-20 16:10",
    },
  ],
  sourceVideos: [
    {
      id: "source-video-s1-01",
      sopId: "s1",
      mappingVersion: "MAP1",
      fileName: "station-a02-standard-flow.mp4",
      duration: "03:20",
      source: "标准示教采集",
      note: "覆盖作业前安全检查与车辆下电动作。",
      status: "加工中",
      createdAt: "2026-09-20 14:20",
    },
  ],
  timeRangeAnnotations: [
    {
      id: "time-range-s1-01",
      sopId: "s1",
      sourceVideoId: "source-video-s1-01",
      startTime: "00:12",
      endTime: "00:28",
      evaluationItemId: "EI-S1-001",
      machineEventId: "ME-S1-001",
      label: "绝缘手套出现",
      annotationType: "detect",
      status: "已通过",
      createdAt: "2026-09-20 14:35",
    },
  ],
  annotations: [
    {
      id: "annotation-s1-01",
      sopId: "s1",
      timeRangeId: "time-range-s1-01",
      sourceVideoId: "source-video-s1-01",
      type: "detect",
      label: "绝缘手套出现",
      bboxSummary: "抽取8帧，双手区域已完成框选。",
      note: "画面清晰，可进入Dataset。",
      status: "已通过",
      reviewedBy: "刘工",
      reviewedAt: "2026-09-20 15:10",
    },
  ],
  datasets: [
    {
      id: "ds-hv-d5",
      sopId: "s1",
      name: "高压安全 D5",
      version: "D5",
      status: "已锁定",
      sampleCount: 612,
      acceptedCount: 612,
      candidateCount: 2,
      sourceVideoIds: ["source-video-s1-01"],
      splits: {
        train: ["source-video-s1-01"],
        validation: [],
        test: [],
      },
      labels: {
        "Step 01": 92,
        "Step 02": 110,
        "Step 03": 86,
        "Step 04": 105,
        "Step 05": 91,
        "Step 06": 72,
        Other: 56,
      },
      updatedAt: "2026-09-12 16:20",
    },
    {
      id: "ds-gripper-d3",
      sopId: "s2",
      name: "夹具更换 D3",
      version: "D3",
      nextVersion: "D4",
      status: "已锁定",
      sampleCount: 533,
      acceptedCount: 533,
      candidateCount: 2,
      labels: {
        "Step 01": 86,
        "Step 02": 74,
        "Step 03": 61,
        "Step 04": 105,
        "Step 05": 79,
        Other: 128,
      },
      updatedAt: "2026-09-16 18:10",
    },
  ],
  models: [
    {
      id: "model-hv-18",
      sopId: "s1",
      name: "高压动作模型",
      version: "V1.8",
      status: "已部署",
      datasetVersion: "D5",
      sopVersion: "V3.2",
      progress: 100,
      f1: "94.2%",
      sequenceAccuracy: "90.1%",
      otherRecall: "95.0%",
      evaluatedAt: "2026-09-15 18:40",
      deploymentTarget: "A区 1–4号工位",
      updatedAt: "2026-09-16 09:20",
    },
    {
      id: "model-gripper-13",
      sopId: "s2",
      name: "夹具动作模型",
      version: "V1.3",
      status: "训练中",
      datasetVersion: "D3",
      sopVersion: "V1.4",
      progress: 64,
      f1: "91.6%",
      sequenceAccuracy: "86.4%",
      otherRecall: "93.1%",
      evaluatedAt: "待训练完成",
      deploymentTarget: "尚未部署",
      updatedAt: "2026-09-18 10:20",
    },
  ],
  fieldValidations: [
    {
      id: "validation-s1-w2-v32",
      workstationId: "w2",
      sopId: "s1",
      sopVersion: "V3.2",
      modelVersion: "V1.8",
      roiVersion: "ROI-WS-A02-V1",
      cameraConfigVersion: "CAM-WS-A02-V1",
      status: "通过",
      operator: "刘工",
      createdAt: "2026-09-18 16:30",
      note: "标准流程、异常分支和安全红线均已在2号工位完成验证。",
      tests: FIELD_VALIDATION_SCENARIOS.map(([key, label]) => ({
        key,
        label,
        result: "通过",
        note:
          key === "uncertain_or_occluded"
            ? "遮挡时降级为默认通过并产生建议抽查。"
            : "现场测试符合预期。",
      })),
    },
    {
      id: "validation-s1-w4-v32",
      workstationId: "w4",
      sopId: "s1",
      sopVersion: "V3.2",
      modelVersion: "V1.8",
      roiVersion: "ROI-WS-A04-V1",
      cameraConfigVersion: "CAM-WS-A04-V1",
      status: "失败",
      operator: "刘工",
      createdAt: "2026-09-18 15:20",
      note: "错工具测试未稳定触发，自动判定暂不启用。",
      tests: FIELD_VALIDATION_SCENARIOS.map(([key, label]) => ({
        key,
        label,
        result: key === "wrong_tool" ? "失败" : "通过",
        note:
          key === "wrong_tool"
            ? "工具区边缘存在遮挡，需调整 ROI 后复测。"
            : "现场测试符合预期。",
      })),
    },
  ],
  learningSamples: [
    {
      id: "sample-1",
      sopId: "s2",
      source: "机器人夹具更换练习",
      student: "张浩",
      fileName: "station-01-101822.mp4",
      timeRange: "00:18–00:31",
      aiPrediction: "Step 04 · 62%",
      reason: "夹具遮挡导致低置信度",
      label: "Step 04",
      status: "待审核",
      note: "",
      createdAt: "2026-09-18 10:19",
    },
    {
      id: "sample-2",
      sopId: "s2",
      source: "机器人夹具更换练习",
      student: "李思雨",
      fileName: "station-02-101507.mp4",
      timeRange: "00:42–00:55",
      aiPrediction: "Other · 71%",
      reason: "清洁动作与停顿边界冲突",
      label: "Step 03",
      status: "待审核",
      note: "",
      createdAt: "2026-09-18 10:16",
    },
    {
      id: "sample-3",
      sopId: "s1",
      source: "高压安全操作练习",
      student: "陈宇",
      fileName: "station-03-095544.mp4",
      timeRange: "01:10–01:24",
      aiPrediction: "Step 02 · 89%",
      reason: "教师确认辅助视角证据充分",
      label: "Step 02",
      status: "已纳入",
      targetDataset: "D6",
      note: "已复核双视角证据",
      createdAt: "2026-09-18 09:56",
      reviewedAt: "2026-09-18 10:05",
    },
  ],
  exportJobs: [],
  systemSettings: {
    current: {
      recordingDays: 90,
      practiceRecordingDays: 90,
      examRecordingDays: 180,
      downloadDays: 7,
      backupFrequency: "每日 02:00",
      backupRetentionDays: 30,
      cacheAlertEnabled: true,
      cacheThreshold: 20,
      aiConfigurationInvalidationAlertEnabled: true,
    },
    pending: null,
    source: "校级运行基线 V2.0",
    updatedAt: "2026-09-17 16:20",
    updatedBy: "admin",
    activationPolicy: "无进行中安排时由管理员确认生效",
  },
  backups: [
    {
      id: "backup-20260917",
      createdAt: "2026-09-17 02:00",
      scope: "结构化数据 + SOP + 完整录像",
      status: "成功",
      size: "1.28 TB",
      checksum: "SHA256 · 9b82…c71a",
      verification: "通过",
      storage: "校内对象存储 / backup-a",
      expiresAt: "2026-10-17 02:00",
      failureReason: "",
    },
    {
      id: "backup-20260916",
      createdAt: "2026-09-16 02:00",
      scope: "结构化数据 + SOP + 完整录像",
      status: "成功",
      size: "1.24 TB",
      checksum: "SHA256 · f20d…8a44",
      verification: "通过",
      storage: "校内对象存储 / backup-a",
      expiresAt: "2026-10-16 02:00",
      failureReason: "",
    },
    {
      id: "backup-20260915",
      createdAt: "2026-09-15 02:00",
      scope: "结构化数据 + SOP + 完整录像",
      status: "失败",
      size: "—",
      checksum: "未生成",
      verification: "未执行",
      storage: "校内对象存储 / backup-a",
      expiresAt: "—",
      failureReason: "目标存储剩余空间低于 5%，写入前检查未通过。",
    },
  ],
  issues: [
    {
      id: "i1",
      code: "SYS-20260917-018",
      title: "EDGE-001 推理服务异常",
      type: "边缘推理服务异常",
      level: "严重",
      status: "持续中",
      handlingStatus: "待处理",
      occurredAt: "2026-09-17 10:18:12",
      updatedAt: "2026-09-17 10:23:41",
      owner: "陈工 · 信息中心",
      nodeId: "EDGE-001",
      workstationIds: ["w1"],
      arrangementId: "p1",
      sessionIds: ["session-p1-w1"],
      fact: "GPU 过热，推理进程退出",
      technicalCheck: {
        status: "待验证",
        detail: "温度需低于 75°C 且推理服务自检通过",
      },
      businessCheck: {
        status: "待确认",
        detail: "现场教师确认学生、设备及区域安全",
      },
      timeline: [
        {
          time: "10:18:12",
          tone: "danger",
          title: "边缘推理进程退出",
          detail:
            "EDGE-001 检测到 GPU 温度 91°C，系统自动暂停实时评价并继续录像。",
          actor: "系统",
        },
        {
          time: "10:18:19",
          tone: "normal",
          title: "现场教师已收到告警",
          detail: "王老师确认 1号工位保持暂停，学生停止高压操作。",
          actor: "王老师",
        },
        {
          time: "10:21:06",
          tone: "normal",
          title: "管理员开始处理",
          detail: "检查散热状态并接手当前异常。",
          actor: "陈工",
        },
        {
          time: "10:23:41",
          tone: "pending",
          title: "等待恢复条件",
          detail: "技术自检与现场安全确认均完成后，才能关闭异常。",
          actor: "系统",
        },
      ],
    },
    {
      id: "i2",
      code: "SYS-20260917-014",
      title: "中心上传延迟",
      type: "中心上传延迟",
      level: "一般",
      status: "已关闭",
      handlingStatus: "已处理",
      occurredAt: "2026-09-17 09:42:31",
      updatedAt: "2026-09-17 09:55:20",
      owner: "刘工 · 信息中心",
      nodeId: "UPLOAD-01",
      workstationIds: ["w2", "w3", "w4"],
      arrangementId: "p1",
      sessionIds: ["session-p1-w2", "session-p1-w3"],
      fact: "中心链路抖动导致上传延迟峰值 42 秒",
      technicalCheck: { status: "已通过", detail: "连续 10 分钟延迟低于 3 秒" },
      businessCheck: { status: "已确认", detail: "录像片段完整，无证据丢失" },
      timeline: [
        {
          time: "09:55:20",
          tone: "normal",
          title: "异常已关闭",
          detail: "链路恢复且业务证据完整。",
          actor: "刘工",
        },
      ],
    },
    {
      id: "i3",
      code: "SYS-20260917-009",
      title: "备份空间预警",
      type: "备份空间预警",
      level: "提醒",
      status: "持续中",
      handlingStatus: "处理中",
      occurredAt: "2026-09-17 08:55:08",
      updatedAt: "2026-09-17 09:05:00",
      owner: "赵工 · 运维组",
      nodeId: "BACKUP-A",
      workstationIds: [],
      arrangementId: "",
      sessionIds: [],
      fact: "备份存储剩余空间 4.8%",
      technicalCheck: { status: "待验证", detail: "清理后剩余空间需高于 15%" },
      businessCheck: { status: "无需确认", detail: "不影响当前评价会话" },
      timeline: [
        {
          time: "09:05:00",
          tone: "pending",
          title: "已分配处置责任人",
          detail: "正在核对过期备份清理范围。",
          actor: "赵工",
        },
      ],
    },
  ],
  notifications: [
    {
      id: "n1",
      title: "EDGE-001 推理服务异常",
      detail: "1号工位自动评价已受控暂停",
      path: "/admin/issues/i1",
      time: "10:18",
      read: false,
      tone: "danger",
    },
    {
      id: "n2",
      title: "备份空间低于阈值",
      detail: "BACKUP-A 剩余空间 4.8%",
      path: "/admin/issues/i3",
      time: "08:55",
      read: false,
      tone: "warning",
    },
    {
      id: "n3",
      title: "期中考试成绩已发布",
      detail: "3 条正式成绩，1 人未参加",
      path: "/teacher/exams/e1/results",
      time: "07:04",
      read: false,
      tone: "success",
    },
  ],
  arrangements: [
    {
      id: "p1",
      type: "practice",
      name: "新能源汽车高压安全操作练习",
      sopId: "s1",
      status: "进行中",
      scheduleStart: "2026-09-19T10:00",
      entryEnd: "",
      studentIds: ["s1", "s2", "s3", "s4"],
      workstationIds: ["w1", "w2", "w3", "w4"],
      openWorkstationIds: ["w1", "w2", "w3", "w4"],
      snapshot: {
        lockedAt: "2026-09-19 10:00",
        sopVersion: "V3.2",
        datasetVersion: "D5",
        modelVersion: "V1.8",
      },
      paused: false,
      startedAt: "2026-09-19 10:00",
      endedAt: "",
      updatedAt: "2026-09-19 10:24",
      sessions: [
        {
          id: "session-p1-w1",
          workstationId: "w1",
          studentId: "s1",
          status: "故障",
          elapsed: "00:18:27",
          currentStepId: "Step 03",
          score: 35,
          steps: makeExecutionSteps("fault"),
          events: [
            {
              time: "10:18",
              level: "danger",
              title: "边缘推理服务异常",
              detail: "自动评价已受控暂停，等待管理员修复",
            },
          ],
        },
        {
          id: "session-p1-w2",
          workstationId: "w2",
          studentId: "s2",
          status: "进行中",
          elapsed: "00:16:05",
          currentStepId: "Step 04",
          score: 50,
          steps: makeExecutionSteps("running"),
          events: [
            {
              time: "10:12",
              level: "green",
              title: "完成 Step 03",
              detail: "双视角证据一致",
            },
          ],
        },
        {
          id: "session-p1-w3",
          workstationId: "w3",
          studentId: "s3",
          status: "已暂停",
          elapsed: "00:12:14",
          currentStepId: "Step 03",
          score: 35,
          steps: makeExecutionSteps("running"),
          events: [
            {
              time: "10:15",
              level: "warning",
              title: "教师暂停会话",
              detail: "计时和自动判定已暂停",
            },
          ],
        },
        {
          id: "session-p1-w4",
          workstationId: "w4",
          studentId: "s4",
          status: "待开始",
          elapsed: "00:00:00",
          currentStepId: "",
          score: 0,
          steps: makeExecutionSteps("waiting"),
          events: [],
        },
      ],
    },
    {
      id: "p2",
      type: "practice",
      name: "2402班高压安全强化练习",
      sopId: "s1",
      status: "待开始",
      scheduleStart: "2026-09-19T14:00",
      entryEnd: "",
      studentIds: ["s4", "s2", "s3"],
      workstationIds: ["w2", "w4", "w5"],
      openWorkstationIds: [],
      snapshot: null,
      paused: false,
      startedAt: "",
      endedAt: "",
      updatedAt: "2026-09-19 09:30",
      sessions: [],
    },
    {
      id: "p3",
      type: "practice",
      name: "机器人夹具更换练习",
      sopId: "s2",
      status: "草稿",
      scheduleStart: "2026-09-20T09:00",
      entryEnd: "",
      studentIds: ["s1", "s2"],
      workstationIds: ["w4", "w5"],
      openWorkstationIds: [],
      snapshot: null,
      paused: false,
      startedAt: "",
      endedAt: "",
      updatedAt: "2026-09-18 17:20",
      sessions: [],
    },
    {
      id: "p4",
      type: "practice",
      name: "数控装夹阶段练习",
      sopId: "s3",
      status: "已结束",
      scheduleStart: "2026-09-12T13:30",
      entryEnd: "",
      studentIds: ["s1", "s2"],
      workstationIds: ["w4", "w5"],
      openWorkstationIds: ["w4", "w5"],
      snapshot: {
        lockedAt: "2026-09-12 13:25",
        sopVersion: "V2.1",
        datasetVersion: "D2",
        modelVersion: "V1.2",
      },
      paused: false,
      startedAt: "2026-09-12 13:30",
      endedAt: "2026-09-12 14:20",
      updatedAt: "2026-09-12 14:20",
      sessions: [
        {
          id: "session-p4-w4",
          workstationId: "w4",
          studentId: "s1",
          status: "待复位",
          elapsed: "00:42:10",
          currentStepId: "Step 06",
          score: 88,
          resultStatus: "正式成绩",
          scoreVersion: 2,
          steps: makeCompletedSteps({ "Step 03": 7, "Step 04": 5 }),
          reviewHistory: [
            {
              time: "2026-09-12 14:32",
              operator: "王老师",
              action: "确认规范性扣分",
              stepId: "Step 03",
              before: 15,
              after: 8,
              reason: "验电动作完整，但第二端点停留时间不足。",
            },
          ],
          events: [],
        },
        {
          id: "session-p4-w5",
          workstationId: "w5",
          studentId: "s2",
          status: "已复位",
          elapsed: "00:39:32",
          currentStepId: "Step 06",
          score: 91,
          resultStatus: "正式成绩",
          scoreVersion: 1,
          steps: makeCompletedSteps({ "Step 02": 4, "Step 04": 5 }),
          reviewHistory: [],
          events: [],
        },
      ],
    },
    {
      id: "e1",
      type: "exam",
      name: "新能源汽车高压安全操作期中考试",
      sopId: "s1",
      status: "待发布",
      scheduleStart: "2026-09-16T09:00",
      entryEnd: "2026-09-16T09:30",
      studentIds: ["s1", "s2", "s3", "s4"],
      workstationIds: ["w1", "w2", "w3", "w4"],
      openWorkstationIds: ["w1", "w2", "w3", "w4"],
      snapshot: {
        lockedAt: "2026-09-16 08:50",
        sopVersion: "V3.2",
        datasetVersion: "D5",
        modelVersion: "V1.8",
      },
      paused: false,
      startedAt: "2026-09-16 09:00",
      endedAt: "2026-09-16 10:15",
      updatedAt: "2026-09-16 10:15",
      sessions: [
        {
          id: "session-e1-w1",
          workstationId: "w1",
          studentId: "s1",
          status: "已复位",
          elapsed: "00:31:18",
          currentStepId: "Step 06",
          score: 78,
          resultStatus: "待复核",
          scoreVersion: 1,
          steps: makeCompletedSteps(
            { "Step 02": 5, "Step 03": 7, "Step 04": 10 },
            "Step 03",
          ),
          reviewHistory: [],
          events: [
            {
              time: "09:42",
              level: "warning",
              title: "Step 03 证据不足",
              detail: "辅助视角存在短暂遮挡，等待教师复核",
            },
          ],
        },
        {
          id: "session-e1-w2",
          workstationId: "w2",
          studentId: "s2",
          status: "已复位",
          elapsed: "00:28:43",
          currentStepId: "Step 06",
          score: 92,
          resultStatus: "正式成绩",
          scoreVersion: 1,
          steps: makeCompletedSteps({ "Step 04": 8 }),
          reviewHistory: [],
          events: [],
        },
        {
          id: "session-e1-w3",
          workstationId: "w3",
          studentId: "s3",
          status: "已复位",
          elapsed: "00:35:06",
          currentStepId: "Step 06",
          score: 84,
          resultStatus: "待复核",
          scoreVersion: 1,
          steps: makeCompletedSteps({ "Step 04": 16 }, "Step 04"),
          reviewHistory: [],
          events: [
            {
              time: "10:02",
              level: "warning",
              title: "Step 04 证据不足",
              detail: "手部关键点短时丢失，等待教师复核",
            },
          ],
        },
        {
          id: "session-e1-w4",
          workstationId: "w4",
          studentId: "s4",
          status: "已复位",
          elapsed: "00:00:00",
          currentStepId: "",
          score: 0,
          resultStatus: "未参加",
          scoreVersion: 0,
          steps: makeExecutionSteps("waiting"),
          reviewHistory: [],
          events: [],
        },
      ],
    },
    {
      id: "e2",
      type: "exam",
      name: "2402班高压安全操作考试",
      sopId: "s1",
      status: "待开始",
      scheduleStart: "2026-09-22T14:00",
      entryEnd: "2026-09-22T14:30",
      studentIds: ["s2", "s3", "s4"],
      workstationIds: ["w2", "w4", "w5"],
      openWorkstationIds: [],
      snapshot: null,
      paused: false,
      startedAt: "",
      endedAt: "",
      updatedAt: "2026-09-18 16:10",
      sessions: [],
    },
    {
      id: "e3",
      type: "exam",
      name: "数控装夹技能考试",
      sopId: "s3",
      status: "已发布",
      scheduleStart: "2026-09-10T08:30",
      entryEnd: "2026-09-10T09:00",
      studentIds: ["s1", "s2"],
      workstationIds: ["w4", "w5"],
      openWorkstationIds: ["w4", "w5"],
      snapshot: {
        lockedAt: "2026-09-10 08:20",
        sopVersion: "V2.1",
        datasetVersion: "D2",
        modelVersion: "V1.2",
      },
      paused: false,
      startedAt: "2026-09-10 08:30",
      endedAt: "2026-09-10 09:45",
      updatedAt: "2026-09-10 10:10",
      publishedAt: "2026-09-10 10:10",
      publishedBy: "王老师",
      sessions: [
        {
          id: "session-e3-w4",
          workstationId: "w4",
          studentId: "s1",
          status: "已复位",
          elapsed: "00:37:18",
          currentStepId: "Step 06",
          score: 90,
          resultStatus: "已发布",
          scoreVersion: 2,
          steps: makeCompletedSteps({ "Step 03": 10 }),
          reviewHistory: [],
          events: [],
        },
        {
          id: "session-e3-w5",
          workstationId: "w5",
          studentId: "s2",
          status: "已复位",
          elapsed: "00:35:42",
          currentStepId: "Step 06",
          score: 96,
          resultStatus: "已发布",
          scoreVersion: 1,
          steps: makeCompletedSteps({ "Step 04": 4 }),
          reviewHistory: [],
          events: [],
        },
      ],
    },
    {
      id: "history-s1-v31",
      type: "practice",
      archivedRecord: true,
      name: "高压安全基础练习（历史）",
      sopId: "s1",
      status: "已结束",
      scheduleStart: "2026-09-03T09:00",
      studentIds: ["s1"],
      workstationIds: ["w5"],
      openWorkstationIds: ["w5"],
      snapshot: {
        lockedAt: "2026-09-03 08:55",
        sopVersion: "V3.1",
        datasetVersion: "D4",
        modelVersion: "V1.7",
      },
      startedAt: "2026-09-03 09:00",
      endedAt: "2026-09-03 09:36",
      sessions: [
        {
          id: "session-history-s1-v31",
          workstationId: "w5",
          studentId: "s1",
          status: "已复位",
          elapsed: "00:36:02",
          currentStepId: "Step 06",
          score: 72,
          resultStatus: "正式成绩",
          scoreVersion: 1,
          steps: makeCompletedSteps({
            "Step 01": 2,
            "Step 02": 5,
            "Step 03": 8,
            "Step 04": 7,
            "Step 05": 6,
          }),
          reviewHistory: [],
          events: [],
        },
      ],
    },
    {
      id: "history-s1-v32",
      type: "practice",
      archivedRecord: true,
      name: "高压安全提升练习（历史）",
      sopId: "s1",
      status: "已结束",
      scheduleStart: "2026-09-17T14:00",
      studentIds: ["s1"],
      workstationIds: ["w5"],
      openWorkstationIds: ["w5"],
      snapshot: {
        lockedAt: "2026-09-17 13:55",
        sopVersion: "V3.2",
        datasetVersion: "D5",
        modelVersion: "V1.8",
      },
      startedAt: "2026-09-17 14:00",
      endedAt: "2026-09-17 14:31",
      sessions: [
        {
          id: "session-history-s1-v32",
          workstationId: "w5",
          studentId: "s1",
          status: "已复位",
          elapsed: "00:31:18",
          currentStepId: "Step 06",
          score: 78,
          resultStatus: "正式成绩",
          scoreVersion: 2,
          steps: makeCompletedSteps({
            "Step 02": 5,
            "Step 03": 7,
            "Step 04": 10,
          }),
          reviewHistory: [],
          events: [],
        },
      ],
    },
  ],
  auditLogs: [
    {
      id: "log-seed-1",
      time: "2026-09-18 10:22:18",
      actor: "王伟",
      role: "教师",
      action: "撤销误判",
      target: "张浩 / EV-0932",
      result: "成功",
    },
    {
      id: "log-seed-2",
      time: "2026-09-18 10:18:55",
      actor: "admin",
      role: "管理员",
      action: "查看视频",
      target: "1号工位",
      result: "成功",
    },
  ],
};

function cloneSeed() {
  return normalizePrototypeData(JSON.parse(JSON.stringify(seedData)));
}

function normalizePrototypeData(input) {
  const next = input;
  const sourceVersion = Number(next.version || 0);
  const hasAiExtractionData =
    Array.isArray(next.aiExtractionTasks) ||
    Array.isArray(next.aiFrames) ||
    Array.isArray(next.aiClips);
  next.version = seedData.version;
  next.students = (Array.isArray(next.students) ? next.students : []).map(
    normalizeStudentFaceData,
  );
  const storedDevices = Array.isArray(next.devices)
    ? next.devices.filter((item) => item?.id)
    : [];
  const storedDeviceIds = new Set(storedDevices.map((item) => item.id));
  next.devices = [
    ...storedDevices,
    ...(sourceVersion < 18
      ? JSON.parse(JSON.stringify(seedData.devices || [])).filter(
          (item) => !storedDeviceIds.has(item.id),
        )
      : []),
  ].map((device) => {
    if (!isCameraDevice(device)) return device;
    const seeded = (seedData.devices || []).find(
      (item) => item.id === device.id,
    );
    return {
      ...device,
      streamStatus:
        device.streamStatus ||
        seeded?.streamStatus ||
        (device.status === "在线" ? "可用" : "不可用"),
      resolution: device.resolution || seeded?.resolution || "1920 × 1080",
    };
  });
  next.aiCapabilities = Array.isArray(next.aiCapabilities)
    ? next.aiCapabilities
        .filter((item) => item?.id)
        .map((item) => {
          const seeded = (seedData.aiCapabilities || []).find(
            (candidate) => candidate.id === item.id,
          );
          return {
            ...item,
            currentPublishedModel:
              item.currentPublishedModel || seeded?.currentPublishedModel,
            referencingConfigIds:
              item.referencingConfigIds || seeded?.referencingConfigIds || [],
            referenceCount:
              item.referencingConfigIds == null && seeded?.referencingConfigIds
                ? seeded.referencingConfigIds.length
                : item.referenceCount || 0,
          };
        })
    : JSON.parse(JSON.stringify(seedData.aiCapabilities));
  next.aiSourceVideos = Array.isArray(next.aiSourceVideos)
    ? next.aiSourceVideos.filter(
        (item) => item?.id && item?.capabilityId && item?.fileName,
      )
    : JSON.parse(JSON.stringify(seedData.aiSourceVideos || []));
  if (!hasAiExtractionData) {
    const currentVideoIds = new Set(next.aiSourceVideos.map((item) => item.id));
    next.aiSourceVideos = [
      ...next.aiSourceVideos,
      ...JSON.parse(JSON.stringify(seedData.aiSourceVideos || [])).filter(
        (item) => !currentVideoIds.has(item.id),
      ),
    ];
  }
  next.aiExtractionTasks = Array.isArray(next.aiExtractionTasks)
    ? next.aiExtractionTasks.filter((item) => item?.id && item?.capabilityId)
    : JSON.parse(JSON.stringify(seedData.aiExtractionTasks || []));
  next.aiCleaningTasks = Array.isArray(next.aiCleaningTasks)
    ? next.aiCleaningTasks.filter((item) => item?.id && item?.capabilityId)
    : [];
  next.aiFrames = (
    Array.isArray(next.aiFrames)
      ? next.aiFrames
      : JSON.parse(JSON.stringify(seedData.aiFrames || []))
  )
    .filter((item) => item?.id && item?.capabilityId && item?.sourceVideoId)
    .map((item) => ({
      ...item,
      storageRef:
        item.storageRef ||
        mockFrameStorageRef(item.sourceVideoId, item.sourceTimeMs),
      manualCleaningStatus:
        item.cleaningStatus === "auto_cleaned"
          ? item.manualCleaningStatus || "pending"
          : item.manualCleaningStatus,
    }));
  next.aiClips = Array.isArray(next.aiClips)
    ? next.aiClips
        .filter((item) => item?.id && item?.capabilityId && item?.sourceVideoId)
        .map((item) => ({
          ...item,
          manualCleaningStatus:
            item.cleaningStatus === "auto_cleaned"
              ? item.manualCleaningStatus || "pending"
              : item.manualCleaningStatus,
        }))
    : JSON.parse(JSON.stringify(seedData.aiClips || []));
  const storedAnnotationCategories = Array.isArray(next.aiAnnotationCategories)
    ? next.aiAnnotationCategories.filter(
        (item) => item?.id && item?.capabilityId && item?.name,
      )
    : [];
  const categoryIds = new Set(
    storedAnnotationCategories.map((item) => item.id),
  );
  next.aiAnnotationCategories = [
    ...storedAnnotationCategories,
    ...next.aiCapabilities
      .flatMap(defaultAnnotationCategories)
      .filter((item) => !categoryIds.has(item.id)),
  ];
  next.aiTrainingDataConfigs = Array.isArray(next.aiTrainingDataConfigs)
    ? next.aiTrainingDataConfigs
        .filter((item) => item?.capabilityId)
        .map((item) => ({
          ...item,
          capabilityId: item.capabilityId,
          ratios: {
            ...DEFAULT_TRAINING_RATIOS,
            ...(item.ratios || {}),
          },
          sourceAssignments:
            item.sourceAssignments && typeof item.sourceAssignments === "object"
              ? item.sourceAssignments
              : {},
          lastSavedCandidateIds: Array.isArray(item.lastSavedCandidateIds)
            ? item.lastSavedCandidateIds
            : [],
          readinessStatus: item.readinessStatus || "pending",
        }))
    : [];
  next.aiTrainingTasks = Array.isArray(next.aiTrainingTasks)
    ? next.aiTrainingTasks
        .filter((item) => item?.id && item?.capabilityId && item?.status)
        .map((item) =>
          item.status === "completed" && item.result
            ? {
                ...item,
                validationResult: item.validationResult || {
                  sampleCount:
                    item.dataSnapshot?.validationItemIds?.length || 0,
                  completedAt: item.completedAt || item.updatedAt,
                  status: "completed",
                },
                result: {
                  ...item.result,
                  trainingTaskId: item.result.trainingTaskId || item.id,
                },
              }
            : item,
        )
    : JSON.parse(JSON.stringify(seedData.aiTrainingTasks || []));
  next.aiModelPublicationRecords = Array.isArray(next.aiModelPublicationRecords)
    ? next.aiModelPublicationRecords.filter(
        (item) => item?.id && item?.capabilityId && item?.trainingTaskId,
      )
    : JSON.parse(JSON.stringify(seedData.aiModelPublicationRecords || []));
  next.aiCapabilityModelEvents = Array.isArray(next.aiCapabilityModelEvents)
    ? next.aiCapabilityModelEvents.filter(
        (item) => item?.id && item?.capabilityId && item?.type,
      )
    : [];
  next.aiCapabilityConfigs = Array.isArray(next.aiCapabilityConfigs)
    ? next.aiCapabilityConfigs
        .filter((item) => item?.id && item?.sopId)
        .map(normalizeAiCapabilityConfig)
        .filter(
          (item, index, entries) =>
            entries.findIndex((candidate) => candidate.sopId === item.sopId) ===
            index,
        )
    : JSON.parse(JSON.stringify(seedData.aiCapabilityConfigs || [])).map(
        normalizeAiCapabilityConfig,
      );
  next.aiCapabilities = next.aiCapabilities.map((capability) => {
    const referencingConfigIds = capabilityConfigReferenceIds(
      next.aiCapabilityConfigs,
      capability.id,
    );
    return {
      ...capability,
      referencingConfigIds,
      referenceCount: referencingConfigIds.length,
    };
  });
  next.workstations = (next.workstations || []).map((workstation) => {
    const seeded = (seedData.workstations || []).find(
      (item) => item.id === workstation.id,
    );
    const aiBaseSource = workstation.aiBaseConfig || seeded?.aiBaseConfig || {};
    return {
      ...workstation,
      aiBaseConfig: normalizeWorkstationAiBaseConfig({
        ...workstation,
        aiBaseConfig: aiBaseSource,
      }),
      implementation: {
        ...defaultWorkstationImplementation(workstation),
        ...(workstation.implementation || {}),
        rois:
          workstation.implementation?.rois ||
          defaultWorkstationImplementation(workstation).rois,
      },
    };
  });
  next.sopWorkstationAiConfigs = (
    Array.isArray(next.sopWorkstationAiConfigs)
      ? next.sopWorkstationAiConfigs
      : JSON.parse(JSON.stringify(seedData.sopWorkstationAiConfigs || []))
  )
    .filter(
      (item) =>
        item?.id &&
        item?.sopAiConfigId &&
        item?.workstationId &&
        next.aiCapabilityConfigs.some(
          (config) => config.id === item.sopAiConfigId,
        ) &&
        next.workstations.some(
          (workstation) => workstation.id === item.workstationId,
        ),
    )
    .map(normalizeSopWorkstationAiConfig)
    .filter(
      (item, index, entries) =>
        entries.findIndex(
          (candidate) =>
            candidate.sopAiConfigId === item.sopAiConfigId &&
            candidate.workstationId === item.workstationId,
        ) === index,
    );
  const sourceProfiles = Array.isArray(next.workstationProfiles)
    ? next.workstationProfiles.map(normalizeWorkstationProfile)
    : [];
  next.workstationProfiles = next.workstations.flatMap((workstation) => {
    const existing = sourceProfiles.filter(
      (profile) => profile.workstationId === workstation.id,
    );
    if (existing.length) return existing;
    const implementation = workstation.implementation || {};
    return [
      normalizeWorkstationProfile({
        id: `wp-${workstation.id}-1`,
        workstationId: workstation.id,
        version: "WP1",
        status: "已发布",
        cameraConfigVersion: implementation.cameraConfigVersion,
        roiVersion: implementation.roiVersion,
        cameraPosition: implementation.cameraPosition,
        lighting: implementation.lighting,
        occlusion: implementation.occlusion,
        rois: implementation.rois,
        environmentSummary: implementation.note,
        note: implementation.note,
        updatedAt: implementation.updatedAt || workstation.updatedAt,
        updatedBy: implementation.updatedBy || "迁移",
      }),
    ];
  });
  next.workstations = next.workstations.map((workstation) => {
    const profiles = next.workstationProfiles.filter(
      (profile) => profile.workstationId === workstation.id,
    );
    const current =
      profiles.find((profile) => profile.id === workstation.currentProfileId) ||
      profiles.at(-1);
    return {
      ...workstation,
      currentProfileId: current?.id || "",
      implementation: current
        ? { ...workstation.implementation, ...current }
        : workstation.implementation,
    };
  });
  next.aiImpactAssessments = Array.isArray(next.aiImpactAssessments)
    ? next.aiImpactAssessments
    : [];
  next.compatibilityDecisions = Array.isArray(next.compatibilityDecisions)
    ? next.compatibilityDecisions.map(normalizeCompatibilityDecision)
    : [];
  next.fieldValidations = Array.isArray(next.fieldValidations)
    ? next.fieldValidations
    : JSON.parse(JSON.stringify(seedData.fieldValidations || []));
  const currentSettings = next.systemSettings?.current || {};
  const pendingSettings = next.systemSettings?.pending;
  next.systemSettings = {
    ...seedData.systemSettings,
    ...(next.systemSettings || {}),
    current: {
      ...seedData.systemSettings.current,
      ...normalizeSystemAlertSettings(currentSettings),
      practiceRecordingDays: Number(
        currentSettings.practiceRecordingDays ??
          currentSettings.recordingDays ??
          seedData.systemSettings.current.practiceRecordingDays,
      ),
      examRecordingDays: Number(
        currentSettings.examRecordingDays ??
          currentSettings.recordingDays ??
          seedData.systemSettings.current.examRecordingDays,
      ),
    },
    pending: pendingSettings
      ? {
          ...normalizeSystemAlertSettings(pendingSettings),
          practiceRecordingDays: Number(
            pendingSettings.practiceRecordingDays ??
              pendingSettings.recordingDays ??
              seedData.systemSettings.current.practiceRecordingDays,
          ),
          examRecordingDays: Number(
            pendingSettings.examRecordingDays ??
              pendingSettings.recordingDays ??
              seedData.systemSettings.current.examRecordingDays,
          ),
        }
      : null,
  };
  const normalizedSops = (next.sops || []).map((sop) => ({
    ...sop,
    major:
      sop.major ||
      (/机器人/.test(sop.name)
        ? "工业机器人技术"
        : /数控/.test(sop.name)
          ? "数控技术"
          : "新能源汽车技术"),
    course: sop.course || sop.operation || "专业实训课程",
    steps: (sop.steps || []).map(normalizeSopStep),
    scoreRules: (sop.scoreRules || []).map(normalizeScoreRule),
    safetyRules: (sop.safetyRules || []).map(normalizeSafetyRule),
  }));
  next.sops = normalizedSops.map((sop) => ({
    ...sop,
    stepIdScope: "sop",
    usedStepIds: [
      ...new Set([
        // Old records stored IDs from the whole version family; discard that legacy scope once.
        ...(sop.stepIdScope === "sop" ? sop.usedStepIds || [] : []),
        ...(sop.steps || []).map((step) => step.id),
      ]),
    ],
  }));
  next.evaluationMappings = Array.isArray(next.evaluationMappings)
    ? next.evaluationMappings.map(normalizeEvaluationMapping)
    : [];
  next.fieldValidations = next.fieldValidations.map((record) => {
    const mapping = next.evaluationMappings.find(
      (item) =>
        item.authoredFor?.sopId === record.sopId &&
        item.authoredFor?.sopVersion === record.sopVersion,
    );
    const evaluationItemIds = (mapping?.evaluationItems || []).map(
      (item) => item.id,
    );
    const workstationProfile = next.workstationProfiles.find(
      (item) =>
        item.workstationId === record.workstationId &&
        (item.version === record.workstationProfileVersion ||
          item.id ===
            next.workstations.find(
              (workstation) => workstation.id === record.workstationId,
            )?.currentProfileId),
    );
    const testCases =
      record.testCases ||
      (record.tests || []).map((test, index) => ({
        id: `${record.id || "validation"}-case-${index + 1}`,
        name: test.label,
        scenarioTypes: [test.key],
        evaluationItemIds:
          test.result === "通过" && index === 0 ? evaluationItemIds : [],
        result: test.result,
        note: test.note || "",
      }));
    return {
      ...record,
      workstationProfileVersion:
        record.workstationProfileVersion ||
        workstationProfile?.version ||
        "WP1",
      primaryCameraId:
        record.primaryCameraId || workstationProfile?.primaryCameraId || "",
      fallbackCameraId:
        record.fallbackCameraId || workstationProfile?.fallbackCameraId || "",
      testCases,
      coverage:
        record.coverage ||
        buildValidationCoverage({
          evaluationItems: mapping?.evaluationItems || [],
          testCases,
        }),
    };
  });
  next.sourceVideos = Array.isArray(next.sourceVideos)
    ? next.sourceVideos.map((item) => ({
        status: "待加工",
        mappingVersion: "",
        duration: "00:00",
        source: "人工上传",
        note: "",
        ...item,
      }))
    : [];
  next.timeRangeAnnotations = Array.isArray(next.timeRangeAnnotations)
    ? next.timeRangeAnnotations.map((item) => ({
        annotationType: "action",
        status: "待标注",
        label: "",
        ...item,
      }))
    : [];
  next.annotations = Array.isArray(next.annotations)
    ? next.annotations.map((item) => ({
        status: "待审核",
        bboxSummary: "",
        note: "",
        ...item,
      }))
    : [];
  next.datasets = (next.datasets || []).map((item) => {
    const sourceVideoIds = [...new Set(item.sourceVideoIds || [])];
    return {
      ...item,
      sourceVideoIds,
      splits: item.splits || assignSourceVideosToSplits(sourceVideoIds),
    };
  });
  next.models = (next.models || []).map((item) => ({
    ...item,
    kind: "ai_package",
    name: String(item.name || "AI能力包").replace("动作模型", "AI能力包"),
    mappingVersion: item.mappingVersion || "历史Mapping",
    requiresTraining:
      item.requiresTraining === undefined
        ? Boolean(item.datasetVersion && item.datasetVersion !== "无需训练")
        : item.requiresTraining,
    components: item.components || {
      existingCapabilities: [],
      configuredCapabilities: [],
      trainedCapabilities: item.datasetVersion ? ["历史动作模型"] : [],
    },
  }));
  next.arrangements = (
    Array.isArray(next.arrangements) ? next.arrangements : []
  ).map((arrangement) => {
    const sop = next.sops.find((item) => item.id === arrangement.sopId);
    const sessions = (
      Array.isArray(arrangement.sessions) ? arrangement.sessions : []
    ).map((session) => {
      const workstation = next.workstations.find(
        (item) => item.id === session.workstationId,
      );
      const gate = deriveAiRuntimeGate({
        sopId: sop?.id,
        workstationId: workstation?.id,
        sops: next.sops,
        aiCapabilityConfigs: next.aiCapabilityConfigs,
        sopWorkstationAiConfigs: next.sopWorkstationAiConfigs,
        aiCapabilities: next.aiCapabilities,
        workstations: next.workstations,
        devices: next.devices,
      });
      const recording = defaultSessionRecording(
        session,
        arrangement,
        next.systemSettings.current,
      );
      const evaluationSnapshot =
        session.evaluationSnapshot?.aiCapabilityConfigSnapshot ||
        !gate.sop ||
        !gate.workstation
          ? session.evaluationSnapshot
          : createAiEvaluationSnapshot(
              gate,
              session.evaluationSnapshot?.lockedAt ||
                arrangement.snapshot?.lockedAt ||
                session.startedAt ||
                arrangement.startedAt ||
                "历史记录",
            );
      const evaluationProfile = {
        ...evaluationProfileFromGate(gate),
        aiRuntimeEnabled: evaluationSnapshot?.aiEnabled ?? gate.enabled,
        automaticEvaluationEnabled:
          evaluationSnapshot?.aiEnabled ?? gate.enabled,
      };
      const sessionWithProfile = {
        ...session,
        evaluationProfile,
        evaluationSnapshot,
      };
      const normalizedSteps = (
        Array.isArray(session.steps) ? session.steps : []
      ).map((step, index) => {
        const sopStep = sop?.steps.find((item) => item.id === step.id);
        return applyDefaultPassPolicy({ ...sopStep, ...step }, index);
      });
      const stateNormalizedSteps = normalizedSteps.map((step) =>
        normalizeRuntimeStep(
          session.status === "进行中" &&
            step.id === session.currentStepId &&
            step.state === "pending"
            ? {
                ...step,
                state: "active",
                executionState: "active",
                result: "进行中",
                duration: "00:00",
                observation: "已进入当前步骤，等待连续动作判定",
              }
            : step,
        ),
      );
      const steps = stateNormalizedSteps.map((step) =>
        enrichStepEvidence(
          step,
          sessionWithProfile,
          arrangement,
          workstation,
          recording,
          gate,
        ),
      );
      const mandatoryReview = steps.some(requiresMandatoryReview);
      const wasDefaultPassOnly =
        session.resultStatus === "待复核" &&
        !mandatoryReview &&
        steps.some((step) => step.reviewStatus === "建议抽查");
      const runtime = normalizeSessionRuntime(session);
      const scoreEngine = calculateScoreEngine({
        steps,
        manualAdjustments: session.manualAdjustments || [],
      });
      const examDurationMinutes =
        arrangement.type === "exam"
          ? normalizeExamDuration(
              session.examDurationMinutes ??
                session.examTiming?.durationMinutes ??
                arrangement.examDurationMinutes,
            )
          : undefined;
      const examTiming =
        arrangement.type === "exam" &&
        !["待开始", "可入场"].includes(session.status)
          ? normalizeExamTiming(
              session,
              examDurationMinutes,
              new Date().toISOString(),
            )
          : session.examTiming;
      return {
        ...session,
        ...(arrangement.type === "exam"
          ? { examDurationMinutes, examTiming }
          : {}),
        evaluationSnapshot,
        steps,
        runtime,
        scoreEngine,
        recording,
        score:
          session.resultStatus === "未参加"
            ? 0
            : scoreEngine.scoreStatus === "pending"
              ? session.score
              : scoreEngine.effectiveScore,
        elapsed: secondsToElapsed(runtime.evaluationClock.elapsedSeconds),
        resultStatus: wasDefaultPassOnly ? "正式成绩" : session.resultStatus,
        evaluationProfile,
        events: (Array.isArray(session.events) ? session.events : []).map(
          (event) => {
            const normalized = normalizeStoredStudentEvent(event, session);
            return wasDefaultPassOnly && normalized.title?.includes("证据不足")
              ? {
                  ...normalized,
                  level: "warning",
                  title: normalized.title.replace(
                    "证据不足",
                    "默认通过·建议抽查",
                  ),
                  detail:
                    "视频证据不足，已按 SOP 评分策略给满分，建议教师抽查。",
                }
              : normalized;
          },
        ),
      };
    });
    const snapshot = arrangement.snapshot?.sopSnapshot
      ? arrangement.snapshot
      : sop
        ? {
            sopId: sop.id,
            sopSnapshot: JSON.parse(JSON.stringify(sop)),
            lockedAt:
              arrangement.snapshot?.lockedAt ||
              arrangement.startedAt ||
              "历史记录",
          }
        : arrangement.snapshot;
    return {
      ...arrangement,
      teacherId: arrangement.teacherId || "t1",
      ...(arrangement.type === "exam"
        ? {
            examDurationMinutes: normalizeExamDuration(
              arrangement.examDurationMinutes,
            ),
          }
        : {}),
      snapshot,
      sessions,
    };
  });
  return next;
}

function timestamp() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replaceAll("/", "-");
}

function refreshAiCapabilityReferences(source) {
  const configs = Array.isArray(source.aiCapabilityConfigs)
    ? source.aiCapabilityConfigs
    : [];
  const activeConfigIds = new Set(configs.map((config) => config.id));
  let workstationConfigs = (source.sopWorkstationAiConfigs || []).filter(
    (config) => activeConfigIds.has(config.sopAiConfigId),
  );
  configs
    .filter((config) => config.status === "configuring")
    .forEach((config) => {
      workstationConfigs = invalidateSopWorkstationConfigs(
        workstationConfigs,
        (item) => item.sopAiConfigId === config.id,
        config.updatedAt || timestamp(),
        "SOP AI判断逻辑发生变化",
      ).configs;
    });
  return {
    ...source,
    sopWorkstationAiConfigs: workstationConfigs,
    aiCapabilities: (source.aiCapabilities || []).map((capability) => {
      const referencingConfigIds = capabilityConfigReferenceIds(
        configs,
        capability.id,
      );
      return {
        ...capability,
        referencingConfigIds,
        referenceCount: referencingConfigIds.length,
      };
    }),
  };
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function timeToSeconds(value = "") {
  const parts = String(value).split(":").map(Number);
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part)))
    return NaN;
  return parts[0] * 60 + parts[1];
}

function elapsedToSeconds(value = "") {
  const parts = String(value).split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function secondsToElapsed(value = 0) {
  const total = Math.max(0, Math.floor(Number(value || 0)));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function normalizeSessionRuntime(session = {}) {
  const elapsedSeconds = elapsedToSeconds(session.elapsed);
  const running = session.status === "进行中";
  const paused = session.status === "已暂停";
  const runtime = session.runtime || {};
  return {
    actorBinding: {
      status: running ? "confirmed" : "uncertain",
      primaryActorId: session.studentId || "",
      trackId: running ? `track-${session.id}` : "",
      history: [],
      ...(runtime.actorBinding || {}),
    },
    evaluationClock: createEvaluationClock({
      status: running ? "running" : paused ? "paused" : "idle",
      elapsedSeconds,
      wallSeconds: elapsedSeconds,
      ...(runtime.evaluationClock || {}),
    }),
    machineEvents: runtime.machineEvents || [],
    evaluationItemResults: runtime.evaluationItemResults || [],
    aiObservations: runtime.aiObservations || [],
    aiJudgementResults: runtime.aiJudgementResults || [],
    aiScoringApplications: runtime.aiScoringApplications || [],
    technicalIncidents: runtime.technicalIncidents || [],
    safetyCandidates: runtime.safetyCandidates || [],
    assistanceWarnings: runtime.assistanceWarnings || [],
    correctionContext: {
      status: "inactive",
      relatedRuleId: "",
      relatedStepId: "",
      startedAt: "",
      completedAt: "",
      ...(runtime.correctionContext || {}),
    },
  };
}

function collectUsedStepIds(...sources) {
  const ids = new Set();
  for (const source of sources) {
    for (const item of source || []) {
      const id = typeof item === "string" ? item : item?.id;
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function mergeLegacy(legacy) {
  const next = cloneSeed();
  if (
    !legacy ||
    ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(
      legacy.version,
    )
  )
    return next;
  const identityKeys = {
    classes: "code",
    teachers: "employeeNo",
    students: "no",
    workstations: "code",
    devices: "serial",
    auditLogs: "id",
  };
  for (const [key, identity] of Object.entries(identityKeys)) {
    if (!legacy[key]?.length) continue;
    const existing = new Set(legacy[key].map((item) => item[identity]));
    next[key] = [
      ...legacy[key],
      ...next[key].filter((item) => !existing.has(item[identity])),
    ];
  }
  if (
    [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(
      legacy.version,
    ) &&
    Array.isArray(legacy.arrangements)
  ) {
    const legacyIds = new Set(legacy.arrangements.map((item) => item.id));
    next.arrangements = [
      ...legacy.arrangements.map((arrangement) => {
        const baseline = seedData.arrangements.find(
          (item) => item.id === arrangement.id,
        );
        const sessions = arrangement.sessions?.length
          ? arrangement.sessions.map((session) => {
              const baselineSession = baseline?.sessions?.find(
                (item) => item.id === session.id,
              );
              const reviewHistory =
                session.reviewHistory || baselineSession?.reviewHistory || [];
              const reconstructedSteps = baselineSession?.steps
                ? baselineSession.steps.map((baselineStep) => {
                    const currentStep = session.steps?.find(
                      (item) => item.id === baselineStep.id,
                    );
                    const revisions = reviewHistory.filter(
                      (item) => item.stepId === baselineStep.id,
                    );
                    const latestRevision = revisions.at(-1);
                    return latestRevision
                      ? {
                          ...baselineStep,
                          result: currentStep?.result || baselineStep.result,
                          reviewStatus: currentStep?.reviewStatus || "人工调整",
                          reviewNote: currentStep?.reviewNote,
                          reviewedAt: currentStep?.reviewedAt,
                          reviewer: currentStep?.reviewer,
                          effectiveScore: Number(latestRevision.after),
                          score: Number(latestRevision.after),
                        }
                      : baselineStep;
                  })
                : session.steps || [];
              return {
                ...(baselineSession || {}),
                ...session,
                steps: reconstructedSteps,
                score: scoreOf(reconstructedSteps),
                reviewHistory,
              };
            })
          : baseline?.sessions || [];
        return { ...(baseline || {}), ...arrangement, sessions };
      }),
      ...next.arrangements.filter((item) => !legacyIds.has(item.id)),
    ];
  }
  const workstationIdMap = Object.fromEntries(
    seedData.workstations.map((seed) => [
      seed.id,
      next.workstations.find((item) => item.code === seed.code)?.id || seed.id,
    ]),
  );
  next.arrangements = next.arrangements.map((arrangement) => ({
    ...arrangement,
    type: arrangement.type || "practice",
    studentIds: Array.isArray(arrangement.studentIds)
      ? arrangement.studentIds
      : [],
    workstationIds: (arrangement.workstationIds || []).map(
      (id) => workstationIdMap[id] || id,
    ),
    openWorkstationIds: (arrangement.openWorkstationIds || []).map(
      (id) => workstationIdMap[id] || id,
    ),
    sessions: (arrangement.sessions || []).map((session) => ({
      ...session,
      steps: Array.isArray(session.steps) ? session.steps : [],
      events: Array.isArray(session.events) ? session.events : [],
      workstationId:
        workstationIdMap[session.workstationId] || session.workstationId,
    })),
  }));
  if (
    [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].includes(
      legacy.version,
    )
  ) {
    for (const key of ["sops", "datasets", "models", "learningSamples"]) {
      if (legacy[key]?.length) next[key] = legacy[key];
    }
  }
  if (Array.isArray(legacy.evaluationMappings))
    next.evaluationMappings = legacy.evaluationMappings;
  for (const key of [
    "aiCapabilityConfigs",
    "sopWorkstationAiConfigs",
    "aiCapabilities",
    "aiSourceVideos",
    "aiExtractionTasks",
    "aiCleaningTasks",
    "aiAnnotationCategories",
    "aiTrainingDataConfigs",
    "aiTrainingTasks",
    "aiModelPublicationRecords",
    "aiCapabilityModelEvents",
    "aiFrames",
    "aiClips",
  ]) {
    if (Array.isArray(legacy[key])) next[key] = legacy[key];
  }
  for (const key of [
    "workstationProfiles",
    "aiImpactAssessments",
    "compatibilityDecisions",
  ]) {
    if (Array.isArray(legacy[key])) next[key] = legacy[key];
  }
  for (const key of ["sourceVideos", "timeRangeAnnotations", "annotations"]) {
    next[key] = Array.isArray(legacy[key]) ? legacy[key] : [];
  }
  if (legacy.version === 12) {
    next.datasets = next.datasets.map((item) =>
      item.basedOn && item.status === "待审核"
        ? { ...item, status: "采集中" }
        : item,
    );
  }
  if (
    [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(
      legacy.version,
    ) &&
    Array.isArray(legacy.exportJobs)
  )
    next.exportJobs = legacy.exportJobs;
  if (Array.isArray(legacy.fieldValidations))
    next.fieldValidations = legacy.fieldValidations;
  for (const key of ["systemSettings", "backups", "issues", "notifications"]) {
    if (legacy[key]) next[key] = legacy[key];
  }
  return normalizePrototypeData(next);
}

function loadData() {
  if (typeof window === "undefined") return cloneSeed();
  try {
    const parseStored = (key) => {
      try {
        return JSON.parse(window.localStorage.getItem(key));
      } catch {
        return null;
      }
    };
    const parsed = parseStored(STORAGE_KEY);
    const legacyRecords = LEGACY_STORAGE_KEYS.map(parseStored).filter(Boolean);
    if (parsed?.version === seedData.version)
      return normalizePrototypeData(
        recoverMissingLegacySops(parsed, legacyRecords),
      );
    if (legacyRecords.length)
      return normalizePrototypeData(
        recoverMissingLegacySops(mergeLegacy(legacyRecords[0]), legacyRecords),
      );
    return cloneSeed();
  } catch {
    return cloneSeed();
  }
}

const PrototypeDataContext = createContext(null);

export function PrototypeDataProvider({ children }) {
  const [storedData, setData] = useState(loadData);
  const data =
    storedData?.version === seedData.version ? storedData : loadData();

  useEffect(() => {
    if (storedData?.version !== seedData.version) {
      setData(data);
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("原型数据写入浏览器本地存储失败：", error);
    }
  }, [data, storedData]);

  useEffect(() => {
    const syncFromAnotherTab = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue);
        if (incoming?.version !== seedData.version) return;
        setData((current) =>
          JSON.stringify(current) === event.newValue ? current : incoming,
        );
      } catch {
        // Ignore malformed external storage updates and keep the current valid data.
      }
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const value = useMemo(() => {
    const addAuditLog = (
      draft,
      action,
      target,
      result = "成功",
      details = {},
    ) => {
      draft.auditLogs.unshift({
        id: uid("log"),
        time: timestamp(),
        actor: "admin",
        role: "管理员",
        action,
        target,
        result,
        ...details,
      });
    };
    const ensureUnique = (items, key, value, id, label) => {
      if (
        items.some(
          (item) =>
            item.id !== id &&
            String(item[key]).toLowerCase() === String(value).toLowerCase(),
        )
      ) {
        throw new Error(`${label} ${value} 已存在，请更换后再保存。`);
      }
    };
    const getAiTrainingContext = (capabilityId, configOverride) => {
      const capability = (data.aiCapabilities || []).find(
        (item) => item.id === capabilityId,
      );
      if (!capability) throw new Error("所选AI能力不存在，请重新选择。");
      if (!["object_detection", "action_recognition"].includes(capability.type))
        throw new Error("当前AI能力类型不支持训练数据整理。");
      const items =
        capability.type === "object_detection"
          ? data.aiFrames || []
          : data.aiClips || [];
      const config = configOverride ||
        (data.aiTrainingDataConfigs || []).find(
          (item) => item.capabilityId === capability.id,
        ) || {
          capabilityId: capability.id,
          ratios: { ...DEFAULT_TRAINING_RATIOS },
          sourceAssignments: {},
          lastSavedCandidateIds: [],
          readinessStatus: "pending",
        };
      const result = collectTrainingCandidates({
        capability,
        items,
        sourceVideos: data.aiSourceVideos || [],
        categories: data.aiAnnotationCategories || [],
      });
      const groups = groupTrainingCandidates({
        candidates: result.candidates,
        sourceVideos: data.aiSourceVideos || [],
        categories: data.aiAnnotationCategories || [],
        capability,
        config,
      });
      const readiness = buildTrainingReadiness({
        capability,
        candidates: result.candidates,
        groups,
        categories: data.aiAnnotationCategories || [],
        config,
      });
      return { capability, config, groups, readiness, ...result };
    };
    const getSopWorkstationContext = (relationId, configOverride) => {
      const relation = normalizeSopWorkstationAiConfig(
        configOverride ||
          (data.sopWorkstationAiConfigs || []).find(
            (item) => item.id === relationId,
          ) ||
          {},
      );
      if (!relation.id) throw new Error("SOP工位AI配置不存在或已失效。");
      const aiConfig = (data.aiCapabilityConfigs || []).find(
        (item) => item.id === relation.sopAiConfigId,
      );
      const sop = (data.sops || []).find((item) => item.id === aiConfig?.sopId);
      const workstation = (data.workstations || []).find(
        (item) => item.id === relation.workstationId,
      );
      if (!aiConfig || !sop || !workstation)
        throw new Error("SOP、AI配置或工位引用已失效。");
      const evaluation = evaluateAiCapabilityConfig({
        sop,
        config: aiConfig,
        capabilities: data.aiCapabilities || [],
      });
      const checks = checkSopWorkstationAiConfig({
        config: relation,
        aiConfig,
        aiConfigReady: evaluation.ready,
        workstation,
        devices: data.devices || [],
        capabilities: data.aiCapabilities || [],
      });
      const runtimeStatus = deriveSopWorkstationRuntimeStatus({
        config: relation,
        checks,
        readiness: checks.readiness,
      });
      return {
        relation,
        aiConfig,
        sop,
        workstation,
        evaluation,
        checks,
        runtimeStatus,
      };
    };
    const updateStatus = (collection, id, status, action, label) => {
      const existing = data[collection].find((item) => item.id === id);
      if (!existing)
        throw new Error(`${label}不存在或已失效，请返回列表刷新。`);
      setData((current) => {
        const updated = { ...existing, status, updatedAt: timestamp() };
        const next = {
          ...current,
          [collection]: current[collection].map((item) =>
            item.id === id ? updated : item,
          ),
          auditLogs: [...current.auditLogs],
        };
        addAuditLog(next, action, existing.name);
        return next;
      });
      return { ...existing, status };
    };

    return {
      data,
      getStudentCurrentSessions(studentId) {
        return getStudentCurrentSessions(data, studentId);
      },
      createClass(input) {
        const code = input.code.trim().toUpperCase();
        ensureUnique(data.classes, "code", code, null, "班级标识");
        const created = {
          ...input,
          id: uid("class"),
          code,
          name: input.name.trim(),
          studentCount: 0,
          status: "启用",
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            classes: [created, ...current.classes],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "新建班级", `${created.name} / ${created.code}`);
          return next;
        });
        return created;
      },
      updateClass(id, input) {
        const code = input.code.trim().toUpperCase();
        ensureUnique(data.classes, "code", code, id, "班级标识");
        const existing = data.classes.find((item) => item.id === id);
        if (!existing)
          throw new Error("当前班级不存在或已失效，请返回列表刷新。");
        const updated = {
          ...existing,
          ...input,
          code,
          name: input.name.trim(),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            classes: current.classes.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "编辑班级", `${updated.name} / ${updated.code}`);
          return next;
        });
        return updated;
      },
      archiveClass(id) {
        return updateStatus("classes", id, "已归档", "归档班级", "班级");
      },
      restoreClass(id) {
        return updateStatus("classes", id, "启用", "恢复班级", "班级");
      },

      createTeacher(input) {
        const employeeNo = input.employeeNo.trim().toUpperCase();
        const account = input.account.trim().toLowerCase();
        ensureUnique(data.teachers, "employeeNo", employeeNo, null, "教师工号");
        ensureUnique(data.teachers, "account", account, null, "登录账号");
        const created = {
          ...input,
          id: uid("teacher"),
          employeeNo,
          account,
          name: input.name.trim(),
          status: "启用",
          sopCount: 0,
          arrangementCount: 0,
          accountResetAt: "未重置",
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            teachers: [created, ...current.teachers],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "新建教师",
            `${created.name} / ${created.employeeNo}`,
          );
          return next;
        });
        return created;
      },
      updateTeacher(id, input) {
        const existing = data.teachers.find((item) => item.id === id);
        if (!existing) throw new Error("教师不存在或已失效，请返回列表刷新。");
        const employeeNo = input.employeeNo.trim().toUpperCase();
        const account = input.account.trim().toLowerCase();
        ensureUnique(data.teachers, "employeeNo", employeeNo, id, "教师工号");
        ensureUnique(data.teachers, "account", account, id, "登录账号");
        const updated = {
          ...existing,
          ...input,
          employeeNo,
          account,
          name: input.name.trim(),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            teachers: current.teachers.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "编辑教师",
            `${updated.name} / ${updated.employeeNo}`,
          );
          return next;
        });
        return updated;
      },
      setTeacherStatus(id, status) {
        return updateStatus(
          "teachers",
          id,
          status,
          status === "停用" ? "停用教师" : "启用教师",
          "教师",
        );
      },
      resetTeacherAccount(id) {
        const existing = data.teachers.find((item) => item.id === id);
        if (!existing) throw new Error("教师不存在或已失效，请返回列表刷新。");
        const when = timestamp();
        setData((current) => {
          const next = {
            ...current,
            teachers: current.teachers.map((item) =>
              item.id === id
                ? { ...item, accountResetAt: when, updatedAt: when }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "生成账号重置任务",
            `${existing.name} / ${existing.account}`,
          );
          return next;
        });
        return when;
      },

      createStudent(input) {
        const no = input.no.trim();
        ensureUnique(data.students, "no", no, null, "学号");
        const {
          facePhotoChanged,
          facePhotoDataUrl,
          faceStatus: _faceStatus,
          face: _legacyFace,
          faceUpdatedAt: _faceUpdatedAt,
          ...basicInput
        } = input;
        let created = normalizeStudentFaceData({
          ...basicInput,
          id: uid("student"),
          no,
          name: input.name.trim(),
          status: "启用",
          faceStatus: "未采集",
          face: "未采集",
          facePhotoDataUrl: "",
          faceUpdatedAt: "",
          updatedAt: timestamp(),
        });
        if (facePhotoChanged && facePhotoDataUrl)
          created = applyStudentFaceUpload(
            created,
            facePhotoDataUrl,
            timestamp(),
          );
        if (created.facePhotoDataUrl && typeof window !== "undefined")
          persistPrototypeData(window.localStorage, STORAGE_KEY, {
            ...data,
            students: [created, ...data.students],
          });
        setData((current) => {
          const next = {
            ...current,
            students: [created, ...current.students],
            classes: current.classes.map((item) =>
              item.id === created.classId
                ? {
                    ...item,
                    studentCount: item.studentCount + 1,
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "新增学生", `${created.name} / ${created.no}`);
          if (created.facePhotoDataUrl)
            addAuditLog(
              next,
              "上传学生人脸照片",
              `${created.name} / ${created.no}`,
            );
          return next;
        });
        return created;
      },
      importStudents(inputs) {
        const seen = new Set(data.students.map((item) => item.no));
        for (const input of inputs) {
          if (seen.has(input.no))
            throw new Error(`学号 ${input.no} 已存在，请修正预览中的错误行。`);
          seen.add(input.no);
        }
        const created = inputs.map((input) => ({
          ...input,
          id: uid("student"),
          status: "启用",
          face: "未采集",
          faceStatus: "未采集",
          facePhotoDataUrl: "",
          faceUpdatedAt: "",
          updatedAt: timestamp(),
          notes: "批量导入",
        }));
        setData((current) => {
          const increments = created.reduce(
            (map, item) => ({
              ...map,
              [item.classId]: (map[item.classId] || 0) + 1,
            }),
            {},
          );
          const next = {
            ...current,
            students: [...created, ...current.students],
            classes: current.classes.map((item) =>
              increments[item.id]
                ? {
                    ...item,
                    studentCount: item.studentCount + increments[item.id],
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "批量导入学生", `${created.length} 人`);
          return next;
        });
        return created;
      },
      updateStudent(id, input) {
        const existing = data.students.find((item) => item.id === id);
        if (!existing) throw new Error("学生不存在或已失效，请返回列表刷新。");
        const no = input.no.trim();
        ensureUnique(data.students, "no", no, id, "学号");
        const {
          facePhotoChanged,
          facePhotoDataUrl,
          faceStatus: _faceStatus,
          face: _legacyFace,
          faceUpdatedAt: _faceUpdatedAt,
          ...basicInput
        } = input;
        let updated = {
          ...normalizeStudentFaceData(existing),
          ...basicInput,
          no,
          name: input.name.trim(),
          updatedAt: timestamp(),
        };
        if (facePhotoChanged && facePhotoDataUrl)
          updated = applyStudentFaceUpload(
            updated,
            facePhotoDataUrl,
            timestamp(),
          );
        if (facePhotoChanged && typeof window !== "undefined")
          persistPrototypeData(window.localStorage, STORAGE_KEY, {
            ...data,
            students: data.students.map((item) =>
              item.id === id ? updated : item,
            ),
          });
        setData((current) => {
          let classes = current.classes;
          if (existing.classId !== updated.classId) {
            classes = current.classes.map((item) => {
              if (item.id === existing.classId)
                return {
                  ...item,
                  studentCount: Math.max(0, item.studentCount - 1),
                  updatedAt: timestamp(),
                };
              if (item.id === updated.classId)
                return {
                  ...item,
                  studentCount: item.studentCount + 1,
                  updatedAt: timestamp(),
                };
              return item;
            });
          }
          const next = {
            ...current,
            students: current.students.map((item) =>
              item.id === id ? updated : item,
            ),
            classes,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "编辑学生", `${updated.name} / ${updated.no}`);
          if (facePhotoChanged)
            addAuditLog(
              next,
              existing.facePhotoDataUrl
                ? "重新上传学生人脸照片"
                : "上传学生人脸照片",
              `${updated.name} / ${updated.no}`,
            );
          return next;
        });
        return updated;
      },
      updateStudentFacePhoto(id, dataUrl) {
        const existing = data.students.find((item) => item.id === id);
        if (!existing) throw new Error("学生不存在或已失效，请返回列表刷新。");
        const when = timestamp();
        const updated = {
          ...applyStudentFaceUpload(existing, dataUrl, when),
          updatedAt: when,
        };
        const nextStudents = data.students.map((item) =>
          item.id === id ? updated : item,
        );
        if (typeof window !== "undefined")
          persistPrototypeData(window.localStorage, STORAGE_KEY, {
            ...data,
            students: nextStudents,
          });
        setData((current) => {
          const next = {
            ...current,
            students: current.students.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            existing.facePhotoDataUrl
              ? "重新上传学生人脸照片"
              : "上传学生人脸照片",
            `${existing.name} / ${existing.no}`,
          );
          return next;
        });
        return updated;
      },
      setStudentStatus(id, status) {
        return updateStatus(
          "students",
          id,
          status,
          status === "停用" ? "停用学生账号" : "启用学生账号",
          "学生",
        );
      },
      resetStudentFace(id) {
        const existing = data.students.find((item) => item.id === id);
        if (!existing) throw new Error("学生不存在或已失效，请返回列表刷新。");
        const when = timestamp();
        setData((current) => {
          const next = {
            ...current,
            students: current.students.map((item) =>
              item.id === id
                ? {
                    ...markStudentFaceForRecapture(item),
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "发起人脸重采",
            `${existing.name} / ${existing.no}`,
          );
          return next;
        });
      },

      createWorkstation(input) {
        const code = input.code.trim().toUpperCase();
        ensureUnique(data.workstations, "code", code, null, "工位标识");
        const created = {
          ...input,
          id: uid("workstation"),
          code,
          name: input.name.trim(),
          status: "可入场",
          currentArrangement: "无",
          updatedAt: timestamp(),
        };
        created.implementation = defaultWorkstationImplementation(created);
        created.aiBaseConfig = normalizeWorkstationAiBaseConfig(created);
        setData((current) => {
          const next = {
            ...current,
            workstations: [created, ...current.workstations],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "新建工位", `${created.name} / ${created.code}`);
          return next;
        });
        return created;
      },
      updateWorkstation(id, input) {
        const existing = data.workstations.find((item) => item.id === id);
        if (!existing) throw new Error("工位不存在或已失效，请返回列表刷新。");
        const code = input.code.trim().toUpperCase();
        ensureUnique(data.workstations, "code", code, id, "工位标识");
        const updated = {
          ...existing,
          ...input,
          code,
          name: input.name.trim(),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            workstations: current.workstations.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "编辑工位", `${updated.name} / ${updated.code}`);
          return next;
        });
        return updated;
      },
      getWorkstationAiReadiness(id) {
        const workstation = data.workstations.find((item) => item.id === id);
        return deriveWorkstationAiReadiness({
          workstation,
          devices: data.devices,
          edgeRequired: true,
        });
      },
      saveWorkstationAiBaseConfig(id, input) {
        const workstation = data.workstations.find((item) => item.id === id);
        if (!workstation)
          throw new Error("工位不存在或已失效，请返回列表刷新。");
        const now = timestamp();
        const applied = applyWorkstationAiBaseConfig({
          workstation,
          input,
          devices: data.devices,
          now,
          updatedBy: "系统管理员",
        });
        const previewSopInvalidation = applied.criticalChange
          ? invalidateSopWorkstationConfigs(
              data.sopWorkstationAiConfigs,
              (item) => item.workstationId === id,
              now,
              "工位AI基础配置发生关键变化",
            )
          : { affectedCount: 0 };
        const affectedCount = previewSopInvalidation.affectedCount;
        setData((current) => {
          const invalidatedSopConfigs = applied.criticalChange
            ? invalidateSopWorkstationConfigs(
                current.sopWorkstationAiConfigs,
                (item) => item.workstationId === id,
                now,
                "工位AI基础配置发生关键变化",
              ).configs
            : current.sopWorkstationAiConfigs;
          const updatedWorkstation = {
            ...workstation,
            aiBaseConfig: applied.config,
            updatedAt: now,
          };
          const next = {
            ...current,
            workstations: current.workstations.map((item) =>
              item.id === id ? updatedWorkstation : item,
            ),
            sopWorkstationAiConfigs: invalidatedSopConfigs,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            applied.criticalChange
              ? "变更工位AI基础配置"
              : "检查工位AI基础配置",
            `${workstation.name} / ${workstation.code}`,
            "成功",
            { affectedAiConfigCount: affectedCount },
          );
          return next;
        });
        const updatedWorkstation = {
          ...workstation,
          aiBaseConfig: applied.config,
          updatedAt: now,
        };
        return {
          workstation: updatedWorkstation,
          readiness: deriveWorkstationAiReadiness({
            workstation: updatedWorkstation,
            devices: data.devices,
            edgeRequired: true,
          }),
          criticalChange: applied.criticalChange,
          affectedCount,
        };
      },
      setWorkstationStatus(id, status) {
        return updateStatus(
          "workstations",
          id,
          status,
          status === "维护中" ? "工位进入维护" : "工位恢复可用",
          "工位",
        );
      },
      resetWorkstation(id) {
        const existing = data.workstations.find((item) => item.id === id);
        if (!existing) throw new Error("工位不存在或已失效，请返回列表刷新。");
        setData((current) => {
          const next = {
            ...current,
            workstations: current.workstations.map((item) =>
              item.id === id
                ? {
                    ...item,
                    currentArrangement: "无",
                    status: "可入场",
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "确认工位复位",
            `${existing.name} / ${existing.code}`,
          );
          return next;
        });
      },
      saveWorkstationImplementation(id, input) {
        const existing = data.workstations.find((item) => item.id === id);
        if (!existing) throw new Error("工位不存在或已失效，请返回列表刷新。");
        if (!input.cameraConfigVersion?.trim())
          throw new Error("请填写摄像头配置版本。");
        if (!input.roiVersion?.trim()) throw new Error("请填写 ROI 版本。");
        for (const key of ["cameraPosition", "lighting", "occlusion"]) {
          if (!input[key]) throw new Error("请逐项确认机位、光照和遮挡条件。");
        }
        const cameras = (input.cameras || []).filter((item) => item.id);
        if (!cameras.length)
          throw new Error("Workstation Profile 至少需要一个摄像头。");
        if (!input.primaryCameraId) throw new Error("请选择 Primary Camera。");
        if (!cameras.some((item) => item.id === input.primaryCameraId))
          throw new Error("Primary Camera 不属于当前工位配置。");
        if (
          input.fallbackCameraId &&
          input.fallbackCameraId === input.primaryCameraId
        )
          throw new Error("Fallback Camera 不能与 Primary Camera 相同。");
        const when = timestamp();
        const profileVersions = (data.workstationProfiles || []).filter(
          (item) => item.workstationId === id,
        );
        const nextVersion =
          profileVersions.reduce(
            (max, item) =>
              Math.max(
                max,
                Number(String(item.version).match(/\d+/)?.[0] || 0),
              ),
            0,
          ) + 1;
        const profile = normalizeWorkstationProfile({
          ...existing.implementation,
          ...input,
          id: uid("workstation-profile"),
          workstationId: id,
          version: `WP${nextVersion}`,
          status: "已发布",
          cameraConfigVersion: input.cameraConfigVersion.trim(),
          roiVersion: input.roiVersion.trim(),
          cameras,
          primaryCameraId: input.primaryCameraId,
          fallbackCameraId: input.fallbackCameraId || "",
          evidenceBindings: input.evidenceBindings || [],
          environmentSummary:
            input.environmentSummary?.trim() || input.note?.trim() || "",
          note: input.note?.trim() || "",
          updatedAt: when,
          updatedBy: "admin",
        });
        setData((current) => {
          const next = {
            ...current,
            workstationProfiles: [
              profile,
              ...(current.workstationProfiles || []),
            ],
            workstations: current.workstations.map((item) =>
              item.id === id
                ? {
                    ...item,
                    currentProfileId: profile.id,
                    implementation: { ...item.implementation, ...profile },
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "发布 Workstation Profile",
            `${existing.name} / ${profile.version} / ${profile.roiVersion} / ${profile.cameraConfigVersion}`,
          );
          return next;
        });
        return profile;
      },
      saveFieldValidation(input) {
        const workstation = data.workstations.find(
          (item) => item.id === input.workstationId,
        );
        const sop = data.sops.find((item) => item.id === input.sopId);
        if (!workstation || !sop)
          throw new Error("工位或 SOP 版本不存在，请刷新后重试。");
        const mappingStatus = getMappingStatusForSop({
          sop,
          mappings: data.evaluationMappings || [],
        });
        const evaluationItems = mappingStatus.mapping?.evaluationItems || [];
        const sourceCases =
          input.testCases ||
          FIELD_VALIDATION_SCENARIOS.map(([key, label]) => {
            const legacy = input.tests?.find((test) => test.key === key);
            return {
              id: uid("validation-case"),
              name: label,
              scenarioTypes: [key],
              evaluationItemIds: legacy?.evaluationItemIds || [],
              result: legacy?.result || "",
              note: legacy?.note || "",
            };
          });
        if (!sourceCases.length)
          throw new Error("至少需要一个 Validation Test Case。");
        const testCases = sourceCases.map((item, index) => {
          if (!item.result)
            throw new Error(
              `请选择“${item.name || `Case ${index + 1}`}”的测试结果。`,
            );
          if (item.result === "失败" && !item.note?.trim())
            throw new Error(
              `“${item.name || `Case ${index + 1}`}”失败时必须填写说明。`,
            );
          return {
            id: item.id || uid("validation-case"),
            name: item.name?.trim() || `Validation Case ${index + 1}`,
            scenarioTypes: item.scenarioTypes || [],
            evaluationItemIds: [...new Set(item.evaluationItemIds || [])],
            result: item.result,
            note: item.note?.trim() || "",
          };
        });
        const coverage = buildValidationCoverage({
          evaluationItems,
          testCases,
        });
        const tests = FIELD_VALIDATION_SCENARIOS.map(([key, label]) => {
          const related = testCases.filter((item) =>
            item.scenarioTypes.includes(key),
          );
          return {
            key,
            label,
            result: related.some((item) => item.result === "失败")
              ? "失败"
              : related.some((item) => item.result === "通过")
                ? "通过"
                : "不适用",
            note: related
              .map((item) => item.note)
              .filter(Boolean)
              .join("；"),
          };
        });
        const model = data.models.find(
          (item) => item.sopId === sop.id && item.status === "已部署",
        );
        const workstationProfile = (data.workstationProfiles || []).find(
          (item) => item.id === workstation.currentProfileId,
        );
        const status =
          testCases.some((item) => item.result === "失败") || !coverage.passed
            ? "失败"
            : "通过";
        const when = timestamp();
        const record = {
          id: uid("validation"),
          workstationId: workstation.id,
          sopId: sop.id,
          sopVersion: sop.version,
          modelVersion: model?.version || "未启用",
          roiVersion: workstation.implementation?.roiVersion || "未配置",
          cameraConfigVersion:
            workstation.implementation?.cameraConfigVersion || "未配置",
          workstationProfileVersion:
            workstationProfile?.version ||
            workstation.implementation?.version ||
            "WP1",
          primaryCameraId:
            workstationProfile?.primaryCameraId ||
            workstation.implementation?.primaryCameraId ||
            "",
          fallbackCameraId:
            workstationProfile?.fallbackCameraId ||
            workstation.implementation?.fallbackCameraId ||
            "",
          status,
          operator: input.operator?.trim() || "admin",
          createdAt: when,
          note: input.note?.trim() || "",
          tests,
          testCases,
          coverage,
        };
        setData((current) => {
          const next = {
            ...current,
            fieldValidations: [record, ...(current.fieldValidations || [])],
            workstations: current.workstations.map((item) =>
              item.id === workstation.id
                ? {
                    ...item,
                    implementation: {
                      ...item.implementation,
                      lastTest: {
                        status,
                        time: when,
                        validationId: record.id,
                        sopVersion: sop.version,
                      },
                    },
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "提交 SOP 现场验证",
            `${workstation.name} / ${sop.name} ${sop.version} / ${status}`,
          );
          return next;
        });
        return record;
      },
      getWorkstationEvaluationGate(workstationId, sopId) {
        return deriveAiRuntimeGate({
          sopId,
          workstationId,
          sops: data.sops,
          aiCapabilityConfigs: data.aiCapabilityConfigs,
          sopWorkstationAiConfigs: data.sopWorkstationAiConfigs,
          aiCapabilities: data.aiCapabilities,
          workstations: data.workstations,
          devices: data.devices,
        });
      },
      getSopAiCapabilityStatus(sopId, options = {}) {
        return deriveSopAiCapabilityStatus({
          sopId,
          targetWorkstationIds: options.targetWorkstationIds,
          sops: data.sops,
          aiCapabilityConfigs: data.aiCapabilityConfigs,
          sopWorkstationAiConfigs: data.sopWorkstationAiConfigs,
          aiCapabilities: data.aiCapabilities,
          workstations: data.workstations,
          devices: data.devices,
        });
      },
      getSopMappingStatus(sopId) {
        const sop = data.sops.find((item) => item.id === sopId);
        return getMappingStatusForSop({
          sop,
          mappings: data.evaluationMappings || [],
        });
      },
      getSopAiEvaluationStatus(sopId, options = {}) {
        const sop = data.sops.find((item) => item.id === sopId);
        return calculateSopAiEvaluationStatus({
          sop,
          datasets: data.datasets,
          models: data.models,
          workstations: data.workstations,
          fieldValidations: data.fieldValidations,
          evaluationMappings: data.evaluationMappings || [],
          workstationProfiles: data.workstationProfiles || [],
          compatibilityDecisions: data.compatibilityDecisions || [],
          targetWorkstationIds: options.targetWorkstationIds,
        });
      },

      saveAiStepConfig(sopId, input) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop || !isSopAvailableForNewArrangement(sop))
          throw new Error("只能为已发布且未停用的SOP配置AI能力。");
        const step = (sop.steps || []).find(
          (item) => item.id === input?.stepId,
        );
        if (!step) throw new Error("所选SOP步骤不存在，请刷新后重试。");
        const when = timestamp();
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        const base = existing
          ? normalizeAiCapabilityConfig(existing)
          : createEmptyAiCapabilityConfig(sopId, {
              id: uid("ai-config"),
              now: when,
              actor: "系统管理员",
            });
        const currentStep =
          base.stepConfigs.find((item) => item.stepId === step.id) ||
          createDefaultStepConfig(step.id);
        const updatedStep = {
          ...currentStep,
          actualEvaluationMode: input.actualEvaluationMode || "",
          downgradeReason: String(input.downgradeReason || "").trim(),
        };
        const updated = applyAiConfigMutation(
          base,
          {
            stepConfigs: [
              ...base.stepConfigs.filter((item) => item.stepId !== step.id),
              updatedStep,
            ],
          },
          when,
        );
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (item) => item.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "保存AI步骤评价方式", `${sop.name} / ${step.name}`);
          return refreshAiCapabilityReferences(next);
        });
        return updated;
      },
      saveAiRuleTreatment(sopId, input) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop || !isSopAvailableForNewArrangement(sop))
          throw new Error("当前SOP不可配置。");
        const kind = input?.kind === "safety" ? "safety" : "score";
        const rules =
          kind === "score" ? sop.scoreRules || [] : sop.safetyRules || [];
        const rule = rules.find(
          (item) => item.id === input?.ruleId && item.stepId === input?.stepId,
        );
        if (!rule) throw new Error("教师规则不存在或不属于当前步骤。");
        if (!["ai", "teacher"].includes(input?.mode))
          throw new Error("请选择规则处理方式。");
        const when = timestamp();
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        const base = existing
          ? normalizeAiCapabilityConfig(existing)
          : createEmptyAiCapabilityConfig(sopId, {
              id: uid("ai-config"),
              now: when,
              actor: "系统管理员",
            });
        const currentStep =
          base.stepConfigs.find((item) => item.stepId === input.stepId) ||
          createDefaultStepConfig(input.stepId);
        const field =
          kind === "score" ? "scoreRuleTreatments" : "safetyRuleTreatments";
        const treatment = {
          ruleId: rule.id,
          mode: input.mode,
          reason: String(input.reason || "").trim(),
          judgementItemId: input.judgementItemId || "",
        };
        const updatedStep = {
          ...currentStep,
          [field]: [
            ...(currentStep[field] || []).filter(
              (item) => item.ruleId !== rule.id,
            ),
            treatment,
          ],
        };
        const updated = applyAiConfigMutation(
          base,
          {
            stepConfigs: [
              ...base.stepConfigs.filter(
                (item) => item.stepId !== input.stepId,
              ),
              updatedStep,
            ],
          },
          when,
        );
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (item) => item.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "保存AI规则处理", `${sop.name} / ${rule.name}`);
          return refreshAiCapabilityReferences(next);
        });
        return updated;
      },
      createAiLogicalArea(sopId, input) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop || !isSopAvailableForNewArrangement(sop))
          throw new Error("当前SOP不可配置。");
        const name = String(input?.name || "").trim();
        if (!name) throw new Error("请填写逻辑区域名称。");
        const when = timestamp();
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        const base = existing
          ? normalizeAiCapabilityConfig(existing)
          : createEmptyAiCapabilityConfig(sopId, {
              id: uid("ai-config"),
              now: when,
              actor: "系统管理员",
            });
        if (
          base.logicalAreas.some(
            (item) =>
              item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
          )
        )
          throw new Error("逻辑区域名称已存在。");
        const area = {
          id: uid("logical-area"),
          name,
          description: String(input?.description || "").trim(),
          createdAt: when,
        };
        const updated = applyAiConfigMutation(
          base,
          { logicalAreas: [...base.logicalAreas, area] },
          when,
        );
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (item) => item.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "新增AI逻辑区域", `${sopId} / ${name}`);
          return refreshAiCapabilityReferences(next);
        });
        return area;
      },
      deleteAiLogicalArea(sopId, areaId) {
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        if (!existing) throw new Error("AI能力配置不存在。");
        const base = normalizeAiCapabilityConfig(existing);
        const area = base.logicalAreas.find((item) => item.id === areaId);
        if (!area) throw new Error("逻辑区域不存在。");
        if (
          base.judgementItems.some((item) =>
            (item.conditions || []).some(
              (condition) => condition.logicalAreaId === areaId,
            ),
          )
        )
          throw new Error("该逻辑区域正在被判断条件引用，无法删除。");
        const updated = applyAiConfigMutation(
          base,
          {
            logicalAreas: base.logicalAreas.filter(
              (item) => item.id !== areaId,
            ),
          },
          timestamp(),
        );
        setData((current) =>
          refreshAiCapabilityReferences({
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (item) => item.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          }),
        );
        return area;
      },
      saveAiJudgementItem(sopId, input) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop || !isSopAvailableForNewArrangement(sop))
          throw new Error("当前SOP不可配置。");
        const when = timestamp();
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        const base = existing
          ? normalizeAiCapabilityConfig(existing)
          : createEmptyAiCapabilityConfig(sopId, {
              id: uid("ai-config"),
              now: when,
              actor: "系统管理员",
            });
        const item = {
          ...input,
          id: input?.id || uid("ai-judgement"),
          name: String(input?.name || "").trim(),
          purposes: [...new Set(input?.purposes || [])],
          scoreRuleIds: [...new Set(input?.scoreRuleIds || [])],
          safetyRuleIds: [...new Set(input?.safetyRuleIds || [])],
          combination: input?.combination || "all",
          conditions: (input?.conditions || []).map((condition) => ({
            ...condition,
            id: condition.id || uid("ai-condition"),
            minTargetCount: Math.max(1, Number(condition.minTargetCount || 1)),
            minDurationSeconds: Math.max(
              0,
              Number(condition.minDurationSeconds || 0),
            ),
            minOccurrences: Math.max(1, Number(condition.minOccurrences || 1)),
          })),
          fallback:
            "AI结果不可靠、摄像头异常或证据不足时，标记为不确定并转人工确认，不直接形成学生负向结果。",
          updatedAt: when,
        };
        const issues = validateAiJudgementItem({
          item,
          sop,
          capabilities: data.aiCapabilities || [],
          logicalAreas: base.logicalAreas,
        });
        if (issues.length) throw new Error(issues[0]);
        const updated = applyAiConfigMutation(
          base,
          {
            judgementItems: [
              ...base.judgementItems.filter((entry) => entry.id !== item.id),
              item,
            ],
          },
          when,
        );
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (entry) => entry.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            input?.id ? "编辑AI判断项" : "新增AI判断项",
            item.name,
          );
          return refreshAiCapabilityReferences(next);
        });
        return item;
      },
      deleteAiJudgementItem(sopId, itemId) {
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        if (!existing) throw new Error("AI能力配置不存在。");
        const base = normalizeAiCapabilityConfig(existing);
        const item = base.judgementItems.find((entry) => entry.id === itemId);
        if (!item) throw new Error("AI判断项不存在。");
        const stepConfigs = base.stepConfigs.map((step) => ({
          ...step,
          scoreRuleTreatments: (step.scoreRuleTreatments || []).map((entry) =>
            entry.judgementItemId === itemId
              ? { ...entry, judgementItemId: "" }
              : entry,
          ),
          safetyRuleTreatments: (step.safetyRuleTreatments || []).map(
            (entry) =>
              entry.judgementItemId === itemId
                ? { ...entry, judgementItemId: "" }
                : entry,
          ),
        }));
        const updated = applyAiConfigMutation(
          base,
          {
            stepConfigs,
            judgementItems: base.judgementItems.filter(
              (entry) => entry.id !== itemId,
            ),
          },
          timestamp(),
        );
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (entry) => entry.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "删除AI判断项", item.name);
          return refreshAiCapabilityReferences(next);
        });
        return item;
      },
      completeAiCapabilityConfig(sopId) {
        const sop = data.sops.find((item) => item.id === sopId);
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        if (!sop || !existing) throw new Error("AI能力配置尚未开始。");
        const updated = completeAiCapabilityConfig({
          sop,
          config: existing,
          capabilities: data.aiCapabilities || [],
          now: timestamp(),
        });
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: [
              updated,
              ...(current.aiCapabilityConfigs || []).filter(
                (item) => item.sopId !== sopId,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "完成AI能力配置", sop.name);
          return refreshAiCapabilityReferences(next);
        });
        return updated;
      },
      getSopWorkstationAiState(relationId) {
        return getSopWorkstationContext(relationId);
      },
      addSopWorkstationAiConfig(sopId, workstationId) {
        const aiConfig = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        const sop = (data.sops || []).find((item) => item.id === sopId);
        const workstation = (data.workstations || []).find(
          (item) => item.id === workstationId,
        );
        if (!aiConfig || !sop) throw new Error("请先完成当前SOP的AI能力配置。");
        const evaluation = evaluateAiCapabilityConfig({
          sop,
          config: aiConfig,
          capabilities: data.aiCapabilities || [],
        });
        if (!evaluation.ready || aiConfig.status === "configuring")
          throw new Error("当前SOP的AI能力配置尚未完成。");
        if (!workstation) throw new Error("所选工位不存在或已失效。");
        if (
          (data.sopWorkstationAiConfigs || []).some(
            (item) =>
              item.sopAiConfigId === aiConfig.id &&
              item.workstationId === workstation.id,
          )
        )
          throw new Error("当前SOP已经添加该工位。");
        const now = timestamp();
        const created = createSopWorkstationAiConfig({
          id: uid("sop-workstation-ai"),
          aiConfig,
          workstation,
          now,
        });
        setData((current) => {
          const next = {
            ...current,
            sopWorkstationAiConfigs: [
              created,
              ...(current.sopWorkstationAiConfigs || []),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "添加SOP工位AI配置",
            `${sop.name} / ${workstation.name}`,
          );
          return next;
        });
        return created;
      },
      saveSopWorkstationCameraBinding(relationId, judgementItemId, cameraId) {
        const context = getSopWorkstationContext(relationId);
        const updated = setJudgementCameraBinding({
          config: context.relation,
          judgementItemId,
          cameraId,
          workstation: context.workstation,
          now: timestamp(),
        });
        setData((current) => {
          const next = {
            ...current,
            sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
              (item) => (item.id === relationId ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "调整判断项摄像头",
            `${context.sop.name} / ${context.workstation.name}`,
          );
          return next;
        });
        return updated;
      },
      saveSopWorkstationAreaMapping(relationId, input) {
        const context = getSopWorkstationContext(relationId);
        if (
          !context.aiConfig.logicalAreas.some(
            (area) => area.id === input?.logicalAreaId,
          )
        )
          throw new Error("逻辑区域不存在或已删除。");
        const updated = setLogicalAreaMapping({
          config: context.relation,
          logicalAreaId: input.logicalAreaId,
          cameraId: input.cameraId,
          rectangle: input.rectangle,
          workstation: context.workstation,
          now: timestamp(),
        });
        setData((current) => {
          const next = {
            ...current,
            sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
              (item) => (item.id === relationId ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "配置工位实际区域",
            `${context.sop.name} / ${context.workstation.name}`,
          );
          return next;
        });
        return updated;
      },
      startSopWorkstationValidation(relationId, environment) {
        const context = getSopWorkstationContext(relationId);
        if (!context.checks.ready)
          throw new Error(context.checks.issues[0] || "工位配置检查尚未通过。");
        const now = timestamp();
        const cases = createDefaultValidationCases(
          context.aiConfig,
          (scenario) => uid(`validation-${scenario}`),
        );
        const updated = {
          ...context.relation,
          validationStatus: "validating",
          validationStartedAt: now,
          validationCases: cases,
          validationEnvironment: {
            lighting: String(environment?.lighting || "正常").trim(),
            occlusion: String(environment?.occlusion || "无遮挡").trim(),
            tester: String(environment?.tester || "系统管理员").trim(),
            tools: String(environment?.tools || "").trim(),
            note: String(environment?.note || "").trim(),
          },
          validationInvalidationReason: "",
          updatedAt: now,
        };
        setData((current) => {
          const next = {
            ...current,
            sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
              (item) => (item.id === relationId ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "开始工位现场验证",
            `${context.sop.name} / ${context.workstation.name}`,
          );
          return next;
        });
        return updated;
      },
      saveSopWorkstationValidationCase(relationId, caseId, input) {
        const context = getSopWorkstationContext(relationId);
        if (context.relation.validationStatus !== "validating")
          throw new Error("当前不在现场验证执行中。");
        const existingCase = context.relation.validationCases.find(
          (item) => item.id === caseId,
        );
        if (!existingCase) throw new Error("验证案例不存在。");
        if (!String(input?.actualResult || "").trim())
          throw new Error("请记录系统实际结果。");
        if (!["passed", "failed"].includes(input?.result))
          throw new Error("请选择案例通过或不通过。");
        const validItemIds = new Set(
          context.checks.activeJudgementItems.map((item) => item.id),
        );
        const judgementItemIds = [
          ...new Set(input.judgementItemIds || []),
        ].filter((id) => validItemIds.has(id));
        if (!judgementItemIds.length)
          throw new Error("验证案例至少覆盖一个AI判断项。");
        const updatedCase = {
          ...existingCase,
          judgementItemIds,
          actualResult: String(input.actualResult).trim(),
          result: input.result,
          note: String(input.note || "").trim(),
          executedAt: timestamp(),
        };
        const updated = {
          ...context.relation,
          validationCases: context.relation.validationCases.map((item) =>
            item.id === caseId ? updatedCase : item,
          ),
          updatedAt: timestamp(),
        };
        setData((current) => ({
          ...current,
          sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
            (item) => (item.id === relationId ? updated : item),
          ),
        }));
        return updatedCase;
      },
      completeSopWorkstationValidation(relationId) {
        const context = getSopWorkstationContext(relationId);
        if (context.relation.validationStatus !== "validating")
          throw new Error("请先开始现场验证并执行验证案例。");
        const result = evaluateValidationCompletion({
          aiConfig: context.aiConfig,
          cases: context.relation.validationCases,
          checks: context.checks,
        });
        const now = timestamp();
        const record = {
          id: uid("validation-record"),
          sopWorkstationConfigId: relationId,
          validatedBy:
            context.relation.validationEnvironment.tester || "系统管理员",
          startedAt: context.relation.validationStartedAt || now,
          completedAt: now,
          overallResult: result.passed ? "passed" : "failed",
          environment: { ...context.relation.validationEnvironment },
          cases: context.relation.validationCases.map((item) => ({ ...item })),
          coverage: result.coverage,
          summary: {
            caseCount: context.relation.validationCases.length,
            passedCount: result.passedCount,
            failedCount: result.failedCount,
          },
        };
        const updated = {
          ...context.relation,
          validationStatus: result.passed ? "passed" : "failed",
          lastValidatedAt: now,
          lastValidatedBy: record.validatedBy,
          validationRecords: [
            record,
            ...(context.relation.validationRecords || []),
          ],
          updatedAt: now,
        };
        setData((current) => {
          const next = {
            ...current,
            sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
              (item) => (item.id === relationId ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            result.passed ? "工位现场验证通过" : "工位现场验证不通过",
            `${context.sop.name} / ${context.workstation.name}`,
          );
          return next;
        });
        if (!result.passed)
          throw new Error(result.issues[0] || "现场验证未通过。");
        return { updated, record, result };
      },
      enableSopWorkstationAi(relationId) {
        const context = getSopWorkstationContext(relationId);
        if (context.relation.validationStatus !== "passed")
          throw new Error("只有现场验证通过后才能启用AI评价。");
        if (!context.checks.ready)
          throw new Error(context.checks.issues[0] || "当前配置不可启用。");
        const updated = {
          ...context.relation,
          enableStatus: "enabled",
          enabledAt: timestamp(),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
              (item) => (item.id === relationId ? updated : item),
            ),
            aiCapabilityConfigs: current.aiCapabilityConfigs.map((config) =>
              config.id === context.aiConfig.id
                ? {
                    ...config,
                    status: "enabled",
                  }
                : config,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "启用工位AI评价",
            `${context.sop.name} / ${context.workstation.name}`,
          );
          return next;
        });
        return updated;
      },
      disableSopWorkstationAi(relationId) {
        const context = getSopWorkstationContext(relationId);
        const updated = {
          ...context.relation,
          enableStatus: "disabled",
          disabledAt: timestamp(),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const remainingEnabled = current.sopWorkstationAiConfigs.some(
            (item) =>
              item.id !== relationId &&
              item.sopAiConfigId === context.aiConfig.id &&
              item.enableStatus === "enabled",
          );
          const next = {
            ...current,
            sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map(
              (item) => (item.id === relationId ? updated : item),
            ),
            aiCapabilityConfigs: current.aiCapabilityConfigs.map((config) =>
              config.id === context.aiConfig.id
                ? {
                    ...config,
                    status: remainingEnabled ? "enabled" : "pending_validation",
                  }
                : config,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "停用工位AI评价",
            `${context.sop.name} / ${context.workstation.name}`,
          );
          return next;
        });
        return updated;
      },
      clearAiCapabilityConfig(sopId) {
        const existing = (data.aiCapabilityConfigs || []).find(
          (item) => item.sopId === sopId,
        );
        if (!existing) throw new Error("当前SOP尚未创建AI能力配置。");
        const sop = data.sops.find((item) => item.id === sopId);
        setData((current) => {
          const next = {
            ...current,
            aiCapabilityConfigs: (current.aiCapabilityConfigs || []).filter(
              (item) => item.sopId !== sopId,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "清空AI能力配置", sop?.name || sopId);
          return refreshAiCapabilityReferences(next);
        });
        return existing;
      },

      createAiCapability(input) {
        const created = createCapability(input, data.aiCapabilities || [], {
          id: uid("capability"),
          now: timestamp(),
          actor: "系统管理员",
        });
        setData((current) => {
          const next = {
            ...current,
            aiCapabilities: [created, ...(current.aiCapabilities || [])],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "新建AI能力", created.name);
          return next;
        });
        return created;
      },
      updateAiCapability(id, input) {
        const existing = (data.aiCapabilities || []).find(
          (item) => item.id === id,
        );
        if (!existing) throw new Error("AI能力不存在或已删除。");
        const updated = updateCapability(
          existing,
          input,
          data.aiCapabilities || [],
          timestamp(),
        );
        setData((current) => {
          const next = {
            ...current,
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "编辑AI能力", updated.name);
          return next;
        });
        return updated;
      },
      deactivateAiCapability(id) {
        const existing = (data.aiCapabilities || []).find(
          (item) => item.id === id,
        );
        const updated = deactivateCapability(existing, timestamp());
        setData((current) => {
          const next = {
            ...current,
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "停用AI能力", updated.name);
          return next;
        });
        return updated;
      },
      reactivateAiCapability(id) {
        const existing = (data.aiCapabilities || []).find(
          (item) => item.id === id,
        );
        const updated = reactivateCapability(existing, timestamp());
        setData((current) => {
          const now = timestamp();
          const affectedConfigIds = capabilityConfigReferenceIds(
            current.aiCapabilityConfigs || [],
            id,
          );
          const invalidated = invalidateSopWorkstationConfigs(
            current.sopWorkstationAiConfigs || [],
            (item) => affectedConfigIds.includes(item.sopAiConfigId),
            now,
            "AI能力重新启用，需要重新完成现场验证",
          );
          const next = {
            ...current,
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === id ? updated : item,
            ),
            sopWorkstationAiConfigs: invalidated.configs,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "重新启用AI能力", updated.name, "成功", {
            affectedConfigIds,
            affectedWorkstationCount: invalidated.affectedCount,
          });
          return next;
        });
        return updated;
      },
      deleteAiCapability(id) {
        const existing = (data.aiCapabilities || []).find(
          (item) => item.id === id,
        );
        assertCapabilityDeletable(existing);
        if (
          (data.aiSourceVideos || []).some((video) => video.capabilityId === id)
        )
          throw new Error("当前能力仍有原始视频，请先清理视频数据。");
        setData((current) => {
          const next = {
            ...current,
            aiCapabilities: (current.aiCapabilities || []).filter(
              (item) => item.id !== id,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "删除AI能力", existing.name);
          return next;
        });
        return existing;
      },

      uploadAiSourceVideos(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability) throw new Error("所选AI能力不存在，请重新选择。");
        const files = Array.isArray(input?.files) ? input.files : [];
        const now = timestamp();
        const created = createAiSourceVideos(input, data.aiSourceVideos || [], {
          ids: files.map(() => uid("ai-video")),
          now,
          actor: "系统管理员",
        });
        setData((current) => {
          const next = {
            ...current,
            aiSourceVideos: [...created, ...(current.aiSourceVideos || [])],
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === capability.id
                ? {
                    ...item,
                    status: capabilityStatusAfterVideoUpload(item.status),
                    updatedAt: now,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "上传原始视频",
            `${capability.name} / ${created.length} 个文件`,
          );
          return next;
        });
        return created;
      },
      updateAiSourceVideo(id, input) {
        const existing = (data.aiSourceVideos || []).find(
          (item) => item.id === id,
        );
        const updated = applyAiSourceVideoUpdate(existing, input, timestamp());
        setData((current) => {
          const next = {
            ...current,
            aiSourceVideos: (current.aiSourceVideos || []).map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "编辑视频信息", updated.displayName);
          return next;
        });
        return updated;
      },
      batchUpdateAiSourceVideos(ids, patch) {
        const now = timestamp();
        const updated = applyAiSourceVideoBatchUpdate(
          data.aiSourceVideos || [],
          ids,
          patch,
          now,
        );
        setData((current) => {
          const next = {
            ...current,
            aiSourceVideos: updated,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "批量编辑视频信息", `${ids.length} 个原始视频`);
          return next;
        });
        return updated.filter((item) => ids.includes(item.id));
      },
      deleteAiSourceVideos(ids) {
        const selected = (data.aiSourceVideos || []).filter((item) =>
          ids.includes(item.id),
        );
        assertAiSourceVideosDeletable(selected);
        setData((current) => {
          const next = {
            ...current,
            aiSourceVideos: (current.aiSourceVideos || []).filter(
              (item) => !ids.includes(item.id),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "删除原始视频", `${selected.length} 个文件`);
          return next;
        });
        return selected;
      },
      startFrameExtraction(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability || capability.type !== "object_detection")
          throw new Error("当前能力不支持抽帧，请重新选择目标检测能力。");
        const videos = (data.aiSourceVideos || []).filter((item) =>
          (input.sourceVideoIds || []).includes(item.id),
        );
        if (
          videos.length !== (input.sourceVideoIds || []).length ||
          videos.some((item) => item.capabilityId !== capability.id)
        )
          throw new Error("所选原始视频不存在或不属于当前AI能力。");
        const existingFrames = (data.aiFrames || []).filter((frame) =>
          videos.some((video) => video.id === frame.sourceVideoId),
        );
        if (existingFrames.some((item) => item.processingStatus === "derived"))
          throw new Error(
            "部分抽帧结果已进入后续数据处理，不能直接重新生成。请先清理相关后续数据。",
          );
        if (existingFrames.length)
          throw new Error("所选视频已有图片帧，请先删除现有结果后再重新抽帧。");
        const now = timestamp();
        const taskId = uid("frame-task");
        const result = buildFrameExtractionTask(
          {
            ...input,
            videos,
          },
          {
            taskId,
            frameId: () => uid("frame"),
            now,
            actor: "系统管理员",
          },
        );
        setData((current) => {
          const next = {
            ...current,
            aiExtractionTasks: [
              result.task,
              ...(current.aiExtractionTasks || []),
            ],
            aiFrames: [...result.frames, ...(current.aiFrames || [])],
            aiSourceVideos: (current.aiSourceVideos || []).map((video) =>
              result.task.completedVideoIds.includes(video.id)
                ? { ...video, processingStatus: "derived", updatedAt: now }
                : video,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "执行抽帧",
            `${capability.name} / ${result.frames.length} 张图片`,
          );
          return next;
        });
        return result;
      },
      startVideoSlicing(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability || capability.type !== "action_recognition")
          throw new Error("当前能力不支持视频切片，请重新选择动作识别能力。");
        const videos = (data.aiSourceVideos || []).filter((item) =>
          (input.sourceVideoIds || []).includes(item.id),
        );
        if (
          videos.length !== (input.sourceVideoIds || []).length ||
          videos.some((item) => item.capabilityId !== capability.id)
        )
          throw new Error("所选原始视频不存在或不属于当前AI能力。");
        const now = timestamp();
        const result = buildVideoSlicingTask(
          { ...input, videos },
          {
            taskId: uid("slice-task"),
            clipId: () => uid("clip"),
            now,
            actor: "系统管理员",
          },
        );
        const duplicateClip = result.clips.find((candidate) =>
          (data.aiClips || []).some(
            (existing) =>
              existing.sourceVideoId === candidate.sourceVideoId &&
              existing.startMs === candidate.startMs &&
              existing.endMs === candidate.endMs,
          ),
        );
        if (duplicateClip)
          throw new Error(
            "相同时间范围的视频片段已经存在。请先删除原结果或调整切片范围。",
          );
        setData((current) => {
          const next = {
            ...current,
            aiExtractionTasks: [
              result.task,
              ...(current.aiExtractionTasks || []),
            ],
            aiClips: [...result.clips, ...(current.aiClips || [])],
            aiSourceVideos: (current.aiSourceVideos || []).map((video) =>
              result.task.completedVideoIds.includes(video.id)
                ? { ...video, processingStatus: "derived", updatedAt: now }
                : video,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "执行视频切片",
            `${capability.name} / ${result.clips.length} 个片段`,
          );
          return next;
        });
        return result;
      },
      deleteAiDerivedItems(kind, ids) {
        const collection = kind === "frames" ? "aiFrames" : "aiClips";
        const selected = (data[collection] || []).filter((item) =>
          ids.includes(item.id),
        );
        assertDerivedItemsDeletable(selected);
        const affectedVideoIds = [
          ...new Set(selected.map((item) => item.sourceVideoId)),
        ];
        setData((current) => {
          const remaining = (current[collection] || []).filter(
            (item) => !ids.includes(item.id),
          );
          const otherCollection =
            kind === "frames" ? current.aiClips || [] : current.aiFrames || [];
          const next = {
            ...current,
            [collection]: remaining,
            aiSourceVideos: (current.aiSourceVideos || []).map((video) =>
              affectedVideoIds.includes(video.id) &&
              !remaining.some((item) => item.sourceVideoId === video.id) &&
              !otherCollection.some((item) => item.sourceVideoId === video.id)
                ? {
                    ...video,
                    processingStatus: "unprocessed",
                    updatedAt: timestamp(),
                  }
                : video,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            kind === "frames" ? "删除图片帧" : "删除视频片段",
            `${selected.length} 条生成结果`,
          );
          return next;
        });
        return selected;
      },
      retryExtractionTask(taskId) {
        const task = (data.aiExtractionTasks || []).find(
          (item) => item.id === taskId,
        );
        if (!task?.failures?.length)
          throw new Error("当前任务没有可重试的失败项。");
        const sourceVideoIds = task.failures.map((item) => item.sourceVideoId);
        const videos = (data.aiSourceVideos || []).filter((item) =>
          sourceVideoIds.includes(item.id),
        );
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === task.capabilityId,
        );
        if (!capability || videos.length !== sourceVideoIds.length)
          throw new Error("失败项的原始视频已不存在，无法重试。");
        const now = timestamp();
        const retryId = uid(
          task.taskType === "frame_extraction" ? "frame-task" : "slice-task",
        );
        const result =
          task.taskType === "frame_extraction"
            ? buildFrameExtractionTask(
                {
                  capabilityId: task.capabilityId,
                  videos,
                  parameters: task.parameters,
                },
                {
                  taskId: retryId,
                  frameId: () => uid("frame"),
                  now,
                  actor: "系统管理员",
                },
              )
            : buildVideoSlicingTask(
                {
                  capabilityId: task.capabilityId,
                  videos,
                  method: task.method,
                  parameters: task.parameters,
                },
                {
                  taskId: retryId,
                  clipId: () => uid("clip"),
                  now,
                  actor: "系统管理员",
                },
              );
        result.task.retryOfTaskId = task.id;
        setData((current) => {
          const next = {
            ...current,
            aiExtractionTasks: [
              result.task,
              ...(current.aiExtractionTasks || []).map((item) =>
                item.id === task.id
                  ? {
                      ...item,
                      retryStatus: "resolved",
                      retryTaskId: result.task.id,
                      updatedAt: now,
                    }
                  : item,
              ),
            ],
            aiFrames:
              task.taskType === "frame_extraction"
                ? [...result.frames, ...(current.aiFrames || [])]
                : current.aiFrames || [],
            aiClips:
              task.taskType === "video_slicing"
                ? [...result.clips, ...(current.aiClips || [])]
                : current.aiClips || [],
            aiSourceVideos: (current.aiSourceVideos || []).map((video) =>
              result.task.completedVideoIds.includes(video.id)
                ? { ...video, processingStatus: "derived", updatedAt: now }
                : video,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "重试数据生成任务",
            `${capability.name} / ${task.id}`,
          );
          return next;
        });
        return result;
      },
      runAutoCleaning(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability) throw new Error("所选AI能力不存在，请重新选择。");
        const mode =
          capability.type === "object_detection"
            ? "frames"
            : capability.type === "action_recognition"
              ? "clips"
              : "";
        if (!mode) throw new Error("当前AI能力类型不支持自动清洗。");
        const collection = mode === "frames" ? "aiFrames" : "aiClips";
        const items = (data[collection] || []).filter(
          (item) => item.capabilityId === capability.id,
        );
        const now = timestamp();
        const result = buildAutoCleaningTask(
          {
            capabilityId: capability.id,
            mode,
            items,
            rules: input.rules,
          },
          {
            taskId: uid("clean-task"),
            now,
            actor: "系统管理员",
          },
        );
        const updatedById = new Map(
          result.items.map((item) => [item.id, item]),
        );
        setData((current) => {
          const next = {
            ...current,
            aiCleaningTasks: [result.task, ...(current.aiCleaningTasks || [])],
            [collection]: (current[collection] || []).map(
              (item) => updatedById.get(item.id) || item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "执行自动清洗",
            `${capability.name} / 保留 ${result.task.keepCount} 条 / 剔除 ${result.task.rejectCount} 条`,
          );
          return next;
        });
        return result;
      },
      restoreAutoCleaningItems(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability) throw new Error("所选AI能力不存在，请重新选择。");
        const mode =
          capability.type === "object_detection" ? "frames" : "clips";
        const collection = mode === "frames" ? "aiFrames" : "aiClips";
        const ids = Array.isArray(input?.ids) ? input.ids : [];
        const now = timestamp();
        const scopedItems = (data[collection] || []).filter(
          (item) => item.capabilityId === capability.id,
        );
        const restored = restoreAutoRejectedItems(scopedItems, ids, {
          actor: "系统管理员",
          now,
        });
        const updatedById = new Map(restored.map((item) => [item.id, item]));
        setData((current) => {
          const next = {
            ...current,
            [collection]: (current[collection] || []).map(
              (item) => updatedById.get(item.id) || item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "恢复自动剔除数据",
            `${capability.name} / ${ids.length} 条`,
          );
          return next;
        });
        return restored.filter((item) => ids.includes(item.id));
      },
      applyManualCleaningDecision(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability) throw new Error("所选AI能力不存在，请重新选择。");
        const mode =
          capability.type === "object_detection" ? "frames" : "clips";
        const collection = mode === "frames" ? "aiFrames" : "aiClips";
        const scopedItems = (data[collection] || []).filter(
          (item) => item.capabilityId === capability.id,
        );
        const updated = applyManualCleaningDecision(scopedItems, input, {
          actor: "系统管理员",
          now: timestamp(),
        });
        const updatedById = new Map(updated.map((item) => [item.id, item]));
        setData((current) => {
          const next = {
            ...current,
            [collection]: (current[collection] || []).map(
              (item) => updatedById.get(item.id) || item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            input.decision === "kept" ? "人工清洗保留" : "人工清洗剔除",
            `${capability.name} / ${(input.ids || []).length} 条`,
          );
          return next;
        });
        return updated.filter((item) => (input.ids || []).includes(item.id));
      },

      createAiAnnotationCategory(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability) throw new Error("所选AI能力不存在，请重新选择。");
        const type =
          capability.type === "object_detection" ? "object" : "action";
        const created = createAnnotationCategory(
          data.aiAnnotationCategories || [],
          { ...input, capabilityId: capability.id, type },
          { id: uid("annotation-category"), now: timestamp() },
        );
        setData((current) => {
          const next = {
            ...current,
            aiAnnotationCategories: [
              ...(current.aiAnnotationCategories || []),
              created,
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "新建标注类别",
            `${capability.name} / ${created.name}`,
          );
          return next;
        });
        return created;
      },
      updateAiAnnotationCategory(id, name) {
        const updated = updateAnnotationCategory(
          data.aiAnnotationCategories || [],
          { id, name },
          {
            frames: data.aiFrames || [],
            clips: data.aiClips || [],
            now: timestamp(),
          },
        );
        const category = updated.find((item) => item.id === id);
        setData((current) => {
          const next = {
            ...current,
            aiAnnotationCategories: updated,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "修改标注类别", category?.name || id);
          return next;
        });
        return category;
      },
      deleteAiAnnotationCategory(id) {
        const existing = (data.aiAnnotationCategories || []).find(
          (item) => item.id === id,
        );
        const updated = deleteAnnotationCategory(
          data.aiAnnotationCategories || [],
          id,
          { frames: data.aiFrames || [], clips: data.aiClips || [] },
        );
        setData((current) => {
          const next = {
            ...current,
            aiAnnotationCategories: updated,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "删除标注类别", existing?.name || id);
          return next;
        });
        return existing;
      },
      saveAiFrameAnnotation(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability || capability.type !== "object_detection")
          throw new Error("请选择有效的目标检测能力。");
        const existing = (data.aiFrames || []).find(
          (item) =>
            item.id === input.frameId && item.capabilityId === capability.id,
        );
        const now = timestamp();
        const updated = saveFrameAnnotation(
          existing,
          input,
          data.aiAnnotationCategories || [],
          {
            actor: "系统管理员",
            now,
            boxId: () => uid("annotation-box"),
          },
        );
        setData((current) => {
          const next = {
            ...current,
            aiFrames: (current.aiFrames || []).map((item) =>
              item.id === updated.id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "保存图片标注",
            `${capability.name} / ${updated.fileName || updated.id}`,
          );
          return next;
        });
        return updated;
      },
      batchMarkAiFramesNoTarget(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability || capability.type !== "object_detection")
          throw new Error("请选择有效的目标检测能力。");
        const scoped = (data.aiFrames || []).filter(
          (item) => item.capabilityId === capability.id,
        );
        const updated = batchMarkFramesNoTarget(scoped, input.ids, {
          actor: "系统管理员",
          now: timestamp(),
        });
        const byId = new Map(updated.map((item) => [item.id, item]));
        setData((current) => {
          const next = {
            ...current,
            aiFrames: (current.aiFrames || []).map(
              (item) => byId.get(item.id) || item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "批量标记无目标",
            `${capability.name} / ${input.ids.length} 张`,
          );
          return next;
        });
        return updated.filter((item) => input.ids.includes(item.id));
      },
      saveAiClipAnnotation(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability || capability.type !== "action_recognition")
          throw new Error("请选择有效的动作识别能力。");
        const existing = (data.aiClips || []).find(
          (item) =>
            item.id === input.clipId && item.capabilityId === capability.id,
        );
        const source = (data.aiSourceVideos || []).find(
          (item) => item.id === existing?.sourceVideoId,
        );
        const updated = saveClipAnnotation(
          existing,
          input,
          data.aiAnnotationCategories || [],
          { ...source, durationMs: timeToSeconds(source?.duration) * 1000 },
          { actor: "系统管理员", now: timestamp() },
        );
        setData((current) => {
          const next = {
            ...current,
            aiClips: (current.aiClips || []).map((item) =>
              item.id === updated.id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "保存动作标注",
            `${capability.name} / ${updated.id}`,
          );
          return next;
        });
        return updated;
      },
      batchAssignAiClipCategory(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        if (!capability || capability.type !== "action_recognition")
          throw new Error("请选择有效的动作识别能力。");
        const scoped = (data.aiClips || []).filter(
          (item) => item.capabilityId === capability.id,
        );
        const sources = (data.aiSourceVideos || [])
          .filter((item) => item.capabilityId === capability.id)
          .map((item) => ({
            ...item,
            durationMs: timeToSeconds(item.duration) * 1000,
          }));
        const updated = batchAssignActionCategory(
          scoped,
          input.ids,
          input.actionCategoryId,
          data.aiAnnotationCategories || [],
          sources,
          { actor: "系统管理员", now: timestamp() },
        );
        const byId = new Map(updated.map((item) => [item.id, item]));
        setData((current) => {
          const next = {
            ...current,
            aiClips: (current.aiClips || []).map(
              (item) => byId.get(item.id) || item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "批量分配动作类别",
            `${capability.name} / ${input.ids.length} 个`,
          );
          return next;
        });
        return updated.filter((item) => input.ids.includes(item.id));
      },
      autoSplitAiTrainingData(input) {
        const context = getAiTrainingContext(input?.capabilityId);
        const ratios = validateTrainingRatios(
          input?.ratios || context.config.ratios || DEFAULT_TRAINING_RATIOS,
        );
        if (!context.candidates.length)
          throw new Error("当前没有已清洗且已标注的数据。");
        const targetCategoryIds = targetCategoryIdsFor(
          context.capability,
          context.candidates,
          data.aiAnnotationCategories || [],
        );
        const sourceAssignments = autoAssignSourceGroups(
          context.groups,
          ratios,
          targetCategoryIds,
        );
        const now = timestamp();
        const updated = {
          ...context.config,
          capabilityId: context.capability.id,
          ratios,
          sourceAssignments,
          lastSplitAt: now,
          lastSplitBy: "系统管理员",
          readinessStatus: "pending",
          preparedAt: "",
        };
        setData((current) => {
          const others = (current.aiTrainingDataConfigs || []).filter(
            (item) => item.capabilityId !== context.capability.id,
          );
          const next = {
            ...current,
            aiTrainingDataConfigs: [updated, ...others],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "自动划分训练数据",
            `${context.capability.name} / ${context.groups.length} 个来源视频`,
          );
          return next;
        });
        return updated;
      },
      assignAiTrainingSourceGroup(input) {
        const context = getAiTrainingContext(input?.capabilityId);
        const group = context.groups.find(
          (item) => item.sourceVideoId === input.sourceVideoId,
        );
        const updated = {
          ...assignSourceGroup(context.config, group, input.split),
          capabilityId: context.capability.id,
          ratios: {
            ...DEFAULT_TRAINING_RATIOS,
            ...(context.config.ratios || {}),
          },
          updatedAt: timestamp(),
        };
        setData((current) => {
          const others = (current.aiTrainingDataConfigs || []).filter(
            (item) => item.capabilityId !== context.capability.id,
          );
          const next = {
            ...current,
            aiTrainingDataConfigs: [updated, ...others],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "调整训练数据集合",
            `${context.capability.name} / ${group.sourceVideo?.displayName || group.sourceVideoId}`,
          );
          return next;
        });
        return updated;
      },
      saveAiTrainingData(input) {
        const initial = getAiTrainingContext(input?.capabilityId);
        const ratios = validateTrainingRatios(
          input?.ratios || initial.config.ratios || DEFAULT_TRAINING_RATIOS,
        );
        const now = timestamp();
        const savedBase = {
          ...initial.config,
          capabilityId: initial.capability.id,
          ratios,
          lastSavedCandidateIds: initial.candidates.map((item) => item.id),
          lastSavedAt: now,
          lastSavedBy: "系统管理员",
          preparedAt: "",
        };
        const checked = getAiTrainingContext(initial.capability.id, savedBase);
        const updated = {
          ...savedBase,
          readinessStatus: checked.readiness.ready ? "ready" : "pending",
          readinessChecks: checked.readiness.checks,
          readinessBlockers: checked.readiness.blockers,
          readinessWarnings: checked.readiness.warnings,
        };
        setData((current) => {
          const others = (current.aiTrainingDataConfigs || []).filter(
            (item) => item.capabilityId !== initial.capability.id,
          );
          const next = {
            ...current,
            aiTrainingDataConfigs: [updated, ...others],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "保存训练数据划分",
            `${initial.capability.name} / ${initial.candidates.length} 条数据`,
          );
          return next;
        });
        return { config: updated, readiness: checked.readiness };
      },
      prepareAiTrainingData(capabilityId) {
        const context = getAiTrainingContext(capabilityId);
        if (!context.readiness.ready)
          throw new Error(
            context.readiness.blockers[0] || "当前训练数据未通过训练前检查。",
          );
        const now = timestamp();
        const updated = {
          ...context.config,
          readinessStatus: "ready",
          preparedAt: now,
          preparedBy: "系统管理员",
        };
        setData((current) => {
          const others = (current.aiTrainingDataConfigs || []).filter(
            (item) => item.capabilityId !== context.capability.id,
          );
          const next = {
            ...current,
            aiTrainingDataConfigs: [updated, ...others],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "准备模型训练", context.capability.name);
          return next;
        });
        return updated;
      },
      startAiModelTraining(input) {
        const context = getAiTrainingContext(input?.capabilityId);
        if (context.config?.readinessStatus !== "ready")
          throw new Error("请先保存训练数据划分并通过训练前检查。");
        const now = timestamp();
        const created = createTrainingTask(
          {
            capability: context.capability,
            readiness: context.readiness,
            candidates: context.candidates,
            groups: context.groups,
            categories: data.aiAnnotationCategories || [],
            params: input?.params,
            tasks: data.aiTrainingTasks || [],
          },
          { id: uid("ai-training"), now, actor: "系统管理员" },
        );
        setData((current) => {
          const currentCapability = (current.aiCapabilities || []).find(
            (item) => item.id === created.capabilityId,
          );
          const capabilityPatch = capabilityPatchAfterTrainingTask(
            currentCapability,
            created,
          );
          const next = {
            ...current,
            aiTrainingTasks: [created, ...(current.aiTrainingTasks || [])],
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === created.capabilityId
                ? { ...item, ...capabilityPatch, updatedAt: now }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "开始模型训练", context.capability.name, "成功", {
            trainingTaskId: created.id,
            snapshotSummary: created.snapshotSummary,
          });
          return next;
        });
        return created;
      },
      advanceAiModelTraining(taskId) {
        const task = (data.aiTrainingTasks || []).find(
          (item) => item.id === taskId,
        );
        if (!task) throw new Error("训练任务不存在或已失效。");
        const now = timestamp();
        const updated = advanceTrainingTask(task, {
          now,
          modelArtifactId: `candidate-${uid("model")}`,
        });
        setData((current) => {
          const capability = (current.aiCapabilities || []).find(
            (item) => item.id === updated.capabilityId,
          );
          const capabilityPatch = capabilityPatchAfterTrainingTask(
            capability,
            updated,
          );
          const next = {
            ...current,
            aiTrainingTasks: (current.aiTrainingTasks || []).map((item) =>
              item.id === updated.id ? updated : item,
            ),
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === updated.capabilityId
                ? { ...item, ...capabilityPatch, updatedAt: now }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          if (updated.status === "completed")
            addAuditLog(next, "完成模型训练", updated.capabilityName, "成功", {
              trainingTaskId: updated.id,
              modelArtifactId: updated.modelArtifactId,
            });
          return next;
        });
        return updated;
      },
      cancelAiModelTraining(taskId) {
        const task = (data.aiTrainingTasks || []).find(
          (item) => item.id === taskId,
        );
        if (!task) throw new Error("训练任务不存在或已失效。");
        const now = timestamp();
        const updated = cancelTrainingTask(task, { now });
        setData((current) => {
          const capability = (current.aiCapabilities || []).find(
            (item) => item.id === updated.capabilityId,
          );
          const capabilityPatch = capabilityPatchAfterTrainingTask(
            capability,
            updated,
          );
          const next = {
            ...current,
            aiTrainingTasks: (current.aiTrainingTasks || []).map((item) =>
              item.id === updated.id ? updated : item,
            ),
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === updated.capabilityId
                ? { ...item, ...capabilityPatch, updatedAt: now }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "取消模型训练", updated.capabilityName);
          return next;
        });
        return updated;
      },
      retryAiModelTraining(taskId) {
        const task = (data.aiTrainingTasks || []).find(
          (item) => item.id === taskId,
        );
        if (!task) throw new Error("训练任务不存在或已失效。");
        const now = timestamp();
        const created = retryTrainingTask(task, data.aiTrainingTasks || [], {
          id: uid("ai-training"),
          now,
          actor: "系统管理员",
        });
        setData((current) => {
          const capability = (current.aiCapabilities || []).find(
            (item) => item.id === created.capabilityId,
          );
          const capabilityPatch = capabilityPatchAfterTrainingTask(
            capability,
            created,
          );
          const next = {
            ...current,
            aiTrainingTasks: [created, ...(current.aiTrainingTasks || [])],
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === created.capabilityId
                ? { ...item, ...capabilityPatch, updatedAt: now }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "重试模型训练", created.capabilityName, "成功", {
            trainingTaskId: created.id,
            retriedFromTaskId: created.retriedFromTaskId,
          });
          return next;
        });
        return created;
      },
      publishAiCapabilityModel(input) {
        const capability = (data.aiCapabilities || []).find(
          (item) => item.id === input?.capabilityId,
        );
        const task = (data.aiTrainingTasks || []).find(
          (item) => item.id === input?.trainingTaskId,
        );
        if (!capability) throw new Error("AI能力不存在或已删除。");
        const now = timestamp();
        const affectedConfigIds = Array.isArray(capability.referencingConfigIds)
          ? capability.referencingConfigIds
          : Array.from(
              { length: Number(capability.referenceCount) || 0 },
              (_, index) => `reserved-ai-config-${index + 1}`,
            );
        const published = publishCandidateModel(
          {
            capability,
            task,
            publicationRecords: data.aiModelPublicationRecords || [],
            affectedConfigIds,
          },
          {
            recordId: uid("model-publication"),
            eventId: uid("capability-model-event"),
            now,
            actor: "系统管理员",
          },
        );
        setData((current) => {
          const invalidatedWorkstations = published.record.replacedExistingModel
            ? invalidateSopWorkstationConfigs(
                current.sopWorkstationAiConfigs,
                (item) => affectedConfigIds.includes(item.sopAiConfigId),
                now,
                `引用的AI能力“${capability.name}”已重新发布当前模型`,
              )
            : { configs: current.sopWorkstationAiConfigs };
          const next = {
            ...current,
            aiCapabilities: (current.aiCapabilities || []).map((item) =>
              item.id === capability.id ? published.capability : item,
            ),
            aiTrainingTasks: (current.aiTrainingTasks || []).map((item) =>
              item.id === task.id ? published.task : item,
            ),
            aiModelPublicationRecords: [
              published.record,
              ...(current.aiModelPublicationRecords || []),
            ],
            aiCapabilityModelEvents: [
              published.event,
              ...(current.aiCapabilityModelEvents || []),
            ],
            sopWorkstationAiConfigs: invalidatedWorkstations.configs,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            published.record.replacedExistingModel
              ? "替换当前模型"
              : "发布模型",
            capability.name,
            "成功",
            {
              trainingTaskId: task.id,
              modelArtifactId: task.modelArtifactId,
              affectedConfigCount: published.record.affectedConfigCount,
            },
          );
          return next;
        });
        return published;
      },

      createDevice(input) {
        const name = input.name.trim().toUpperCase();
        const serial = input.serial.trim().toUpperCase();
        ensureUnique(data.devices, "name", name, null, "设备标识");
        ensureUnique(data.devices, "serial", serial, null, "设备序列号");
        if (
          input.workstationId &&
          data.devices.some(
            (item) =>
              item.workstationId === input.workstationId &&
              item.type === input.type &&
              item.status !== "停用",
          )
        )
          throw new Error("该工位已绑定同类型设备，请先解绑或选择其他工位。");
        const created = {
          ...input,
          id: uid("device"),
          name,
          serial,
          status: "待检测",
          lastHeartbeat: "尚未连接",
          lastTestAt: "未检测",
          updatedAt: timestamp(),
        };
        if (isCameraDevice(created)) {
          created.streamStatus = "不可用";
          created.resolution = input.resolution || "1920 × 1080";
        }
        setData((current) => {
          const next = {
            ...current,
            devices: [created, ...current.devices],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "登记设备", `${created.name} / ${created.type}`);
          return next;
        });
        return created;
      },
      updateDevice(id, input) {
        const existing = data.devices.find((item) => item.id === id);
        if (!existing) throw new Error("设备不存在或已失效，请返回列表刷新。");
        const name = input.name.trim().toUpperCase();
        const serial = input.serial.trim().toUpperCase();
        ensureUnique(data.devices, "name", name, id, "设备标识");
        ensureUnique(data.devices, "serial", serial, id, "设备序列号");
        if (
          input.workstationId &&
          data.devices.some(
            (item) =>
              item.id !== id &&
              item.workstationId === input.workstationId &&
              item.type === input.type &&
              item.status !== "停用",
          )
        )
          throw new Error("该工位已绑定同类型设备，请先解绑或选择其他工位。");
        const updated = {
          ...existing,
          ...input,
          name,
          serial,
          updatedAt: timestamp(),
        };
        const criticalDeviceChange = [
          "serial",
          "type",
          "workstationId",
          "address",
          "resolution",
        ].some((key) => (existing[key] || "") !== (updated[key] || ""));
        const affectedWorkstationIds = criticalDeviceChange
          ? data.workstations
              .filter((workstation) => {
                const config = normalizeWorkstationAiBaseConfig(workstation);
                return [
                  config.primaryCameraId,
                  config.fallbackCameraId,
                  config.edgeDeviceId,
                ].includes(existing.id);
              })
              .map((workstation) => workstation.id)
          : [];
        setData((current) => {
          const now = timestamp();
          let sopWorkstationAiConfigs = current.sopWorkstationAiConfigs;
          let affectedCount = 0;
          for (const workstationId of affectedWorkstationIds) {
            const invalidatedSopConfigs = invalidateSopWorkstationConfigs(
              sopWorkstationAiConfigs,
              (item) => item.workstationId === workstationId,
              now,
              "工位摄像头或边缘设备关键信息发生变化",
            );
            sopWorkstationAiConfigs = invalidatedSopConfigs.configs;
            affectedCount += invalidatedSopConfigs.affectedCount;
          }
          const next = {
            ...current,
            devices: current.devices.map((item) =>
              item.id === id ? updated : item,
            ),
            workstations: current.workstations.map((workstation) =>
              affectedWorkstationIds.includes(workstation.id)
                ? {
                    ...workstation,
                    aiBaseConfig: {
                      ...normalizeWorkstationAiBaseConfig(workstation),
                      lastCheckedAt: now,
                      updatedAt: now,
                      lastAiCriticalChangeAt: now,
                    },
                    updatedAt: now,
                  }
                : workstation,
            ),
            sopWorkstationAiConfigs,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            affectedWorkstationIds.length
              ? "编辑设备并触发工位复核"
              : "编辑设备",
            `${updated.name} / ${updated.type}`,
            "成功",
            { affectedWorkstationIds, affectedAiConfigCount: affectedCount },
          );
          return next;
        });
        return updated;
      },
      setDeviceStatus(id, status) {
        return updateStatus(
          "devices",
          id,
          status,
          status === "停用" ? "停用设备" : "启用设备",
          "设备",
        );
      },
      testDeviceConnection(id) {
        const existing = data.devices.find((item) => item.id === id);
        if (!existing) throw new Error("设备不存在或已失效，请返回列表刷新。");
        const when = timestamp();
        setData((current) => {
          const next = {
            ...current,
            devices: current.devices.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "在线",
                    ...(isCameraDevice(item) ? { streamStatus: "可用" } : {}),
                    lastHeartbeat: when,
                    lastTestAt: when,
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "设备连接测试", `${existing.name} / 连接成功`);
          return next;
        });
        return when;
      },
      createSopDraft(input) {
        if (!input.name?.trim()) throw new Error("请填写 SOP 标准名称。");
        const steps = (input.steps || []).map(normalizeSopStep);
        const scoreRules = (input.scoreRules || []).map(normalizeScoreRule);
        const safetyRules = (input.safetyRules || []).map(normalizeSafetyRule);
        const created = {
          ...input,
          id: uid("sop"),
          familyId: uid("sop-family"), // Retained for legacy AI data only.
          name: input.name.trim(),
          owner: input.owner || "王老师",
          version: "V1.0", // Legacy AI compatibility only.
          status: "草稿",
          frozen: false,
          signedBy: "",
          publishedAt: "",
          updatedAt: timestamp(),
          history: [],
          steps,
          scoreRules,
          safetyRules,
          usedStepIds: collectUsedStepIds(input.usedStepIds, steps),
          stepIdScope: "sop",
        };
        setData((current) => {
          const next = {
            ...current,
            sops: [created, ...current.sops],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "创建 SOP 草稿",
            `${created.name} / ${created.version}`,
          );
          return next;
        });
        return created;
      },
      updateSopDraft(id, input) {
        const existing = data.sops.find((item) => item.id === id);
        if (!existing) throw new Error("SOP 不存在或已失效。");
        if (existing.status !== "草稿" || existing.frozen)
          throw new Error("只有草稿可以编辑；请复制创建新的 SOP 草稿。");
        if (!input.name?.trim()) throw new Error("请填写 SOP 标准名称。");
        const updated = {
          ...existing,
          ...input,
          id,
          name: input.name.trim(),
          status: "草稿",
          frozen: false,
          updatedAt: timestamp(),
          steps: (input.steps || existing.steps || []).map(normalizeSopStep),
          scoreRules: (input.scoreRules || existing.scoreRules || []).map(
            normalizeScoreRule,
          ),
          safetyRules: (input.safetyRules || existing.safetyRules || []).map(
            normalizeSafetyRule,
          ),
          usedStepIds: collectUsedStepIds(
            existing.usedStepIds,
            existing.steps,
            input.usedStepIds,
            input.steps,
          ),
        };
        setData((current) => {
          const next = {
            ...current,
            sops: current.sops.map((item) => (item.id === id ? updated : item)),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "保存 SOP 草稿",
            `${updated.name} / ${updated.version}`,
          );
          return next;
        });
        return updated;
      },
      publishSop(id, input, signature) {
        const existing = data.sops.find((item) => item.id === id);
        if (!existing) throw new Error("SOP 不存在或已失效。");
        if (existing.status !== "草稿" || existing.frozen)
          throw new Error("只有草稿可以发布。");
        if (!signature?.trim()) throw new Error("请填写专业教师签名。");
        const validationIssues = validateSopDefinition(input);
        if (validationIssues.length)
          throw new Error(`仍有 ${validationIssues.length} 项业务标准未完善。`);
        const published = {
          ...existing,
          ...input,
          id,
          status: "已发布",
          frozen: true,
          signedBy: signature.trim(),
          publishedAt: timestamp(),
          updatedAt: timestamp(),
          steps: (input.steps || existing.steps || []).map(normalizeSopStep),
          scoreRules: (input.scoreRules || existing.scoreRules || []).map(
            normalizeScoreRule,
          ),
          safetyRules: (input.safetyRules || existing.safetyRules || []).map(
            normalizeSafetyRule,
          ),
          usedStepIds: collectUsedStepIds(
            existing.usedStepIds,
            existing.steps,
            input.usedStepIds,
            input.steps,
          ),
          history: existing.history || [], // Legacy history is hidden from the teacher UI.
        };
        setData((current) => {
          const next = {
            ...current,
            sops: current.sops.map((item) =>
              item.id === id ? published : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "发布并冻结 SOP", published.name);
          return next;
        });
        return published;
      },
      confirmCompatibilityDecision(assessmentId, input) {
        const assessment = (data.aiImpactAssessments || []).find(
          (item) => item.id === assessmentId,
        );
        if (!assessment) throw new Error("AI Impact Assessment 不存在。");
        if (!String(input.reason || "").trim())
          throw new Error("请填写 Compatibility Decision 依据。");
        if (!input.decision || input.decision === "pending")
          throw new Error("请选择明确的兼容性结论。");
        const when = timestamp();
        const decision = normalizeCompatibilityDecision({
          id: uid("compatibility"),
          assessmentId,
          sopFamilyId: assessment.sopFamilyId,
          fromSopId: assessment.fromSopId,
          fromVersion: assessment.fromVersion,
          toSopId: assessment.toSopId,
          toVersion: assessment.toVersion,
          decision: input.decision,
          affectedLayers: {
            ...assessment.layers,
            ...(input.affectedLayers || {}),
          },
          reason: input.reason.trim(),
          operator: input.operator?.trim() || "admin",
          time: when,
        });
        setData((current) => {
          const next = {
            ...current,
            aiImpactAssessments: (current.aiImpactAssessments || []).map(
              (item) =>
                item.id === assessmentId
                  ? {
                      ...item,
                      status: "已确认",
                      decisionId: decision.id,
                      confirmedAt: when,
                    }
                  : item,
            ),
            compatibilityDecisions: [
              decision,
              ...(current.compatibilityDecisions || []),
            ],
            evaluationMappings: (current.evaluationMappings || []).map(
              (mapping) => {
                if (
                  mapping.authoredFor?.sopId !== assessment.fromSopId ||
                  mapping.authoredFor?.sopVersion !== assessment.fromVersion ||
                  !["compatible", "conditional"].includes(decision.decision) ||
                  decision.affectedLayers.mapping !== "compatible"
                )
                  return mapping;
                return {
                  ...mapping,
                  compatibleSopVersions: [
                    ...(mapping.compatibleSopVersions || []).filter(
                      (item) =>
                        !(
                          item.sopId === assessment.toSopId &&
                          item.sopVersion === assessment.toVersion
                        ),
                    ),
                    {
                      sopId: assessment.toSopId,
                      sopFamilyId: assessment.sopFamilyId,
                      sopVersion: assessment.toVersion,
                      decision: decision.decision,
                      decisionId: decision.id,
                    },
                  ],
                };
              },
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "确认 Compatibility Decision",
            `${assessment.fromVersion} → ${assessment.toVersion} / ${decision.decision}`,
          );
          return next;
        });
        return decision;
      },
      copySop(id, name) {
        const existing = data.sops.find((item) => item.id === id);
        if (!existing) throw new Error("SOP 不存在或已失效。");
        const created = createIndependentSopCopy(existing, {
          id: uid("sop"),
          name,
          at: timestamp(),
        });
        setData((current) => {
          const next = {
            ...current,
            sops: [created, ...current.sops],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "复制创建 SOP",
            `${existing.name} → ${created.name}`,
          );
          return next;
        });
        return created;
      },
      deactivateSop(id) {
        const existing = data.sops.find((item) => item.id === id);
        const updated = deactivatePublishedSop(existing, timestamp());
        setData((current) => {
          const next = {
            ...current,
            sops: current.sops.map((item) => (item.id === id ? updated : item)),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "停用 SOP", existing.name);
          return next;
        });
        return updated;
      },
      deleteSopDraft(id) {
        const existing = data.sops.find((item) => item.id === id);
        if (!existing || existing.status !== "草稿")
          throw new Error("只有 SOP 草稿可以删除。");
        if (data.arrangements.some((item) => item.sopId === id))
          throw new Error("此 SOP 已被安排引用，不能删除。");
        if (
          [
            "evaluationMappings",
            "sourceVideos",
            "timeRangeAnnotations",
            "annotations",
            "datasets",
            "models",
            "learningSamples",
            "fieldValidations",
          ].some((key) =>
            (data[key] || []).some(
              (item) => item.sopId === id || item.authoredFor?.sopId === id,
            ),
          ) ||
          (data.aiImpactAssessments || []).some(
            (item) => item.fromSopId === id || item.toSopId === id,
          ) ||
          (data.compatibilityDecisions || []).some(
            (item) => item.fromSopId === id || item.toSopId === id,
          )
        )
          throw new Error("此历史草稿已有 AI 数据引用，不能直接删除。");
        setData((current) => {
          const next = {
            ...current,
            sops: current.sops.filter((item) => item.id !== id),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "删除 SOP 草稿", existing.name);
          return next;
        });
      },
      createEvaluationMapping(sopId) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop || sop.status !== "已发布")
          throw new Error("只有已发布的 SOP 才能创建 Evaluation Mapping。");
        const applicable = (data.evaluationMappings || [])
          .map(normalizeEvaluationMapping)
          .filter(
            (mapping) =>
              mapping.authoredFor.sopId === sop.id &&
              mapping.authoredFor.sopVersion === sop.version,
          );
        const editable = applicable.find(
          (mapping) => mapping.status !== "confirmed",
        );
        if (editable) return editable;
        const familyMappings = (data.evaluationMappings || []).filter(
          (mapping) => mapping.sopFamilyId === (sop.familyId || sop.id),
        );
        const nextNumber =
          familyMappings.reduce(
            (max, mapping) =>
              Math.max(
                max,
                Number(String(mapping.version).match(/\d+/)?.[0] || 0),
              ),
            0,
          ) + 1;
        const when = timestamp();
        const created = normalizeEvaluationMapping({
          id: uid("mapping"),
          sopFamilyId: sop.familyId || sop.id,
          version: `MAP${nextNumber}`,
          status: "draft",
          authoredFor: { sopId: sop.id, sopVersion: sop.version },
          compatibleSopVersions: [],
          evaluationItems: [],
          machineEvents: [],
          teacherConfirmation: { status: "未确认" },
          createdBy: "AI实施工程师",
          createdAt: when,
          updatedAt: when,
        });
        setData((current) => {
          const next = {
            ...current,
            evaluationMappings: [
              created,
              ...(current.evaluationMappings || []),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "创建 Evaluation Mapping",
            `${sop.name} / ${created.version}`,
          );
          return next;
        });
        return created;
      },
      saveEvaluationMapping(id, input) {
        const existing = (data.evaluationMappings || []).find(
          (item) => item.id === id,
        );
        if (!existing) throw new Error("Evaluation Mapping 不存在或已失效。");
        if (existing.status === "confirmed")
          throw new Error("已确认 Mapping 已冻结，请创建新版本后再调整。");
        const updated = normalizeEvaluationMapping({
          ...existing,
          ...input,
          id,
          status: "draft",
          teacherConfirmation: {
            status: "未确认",
            teacher: "",
            comment: "",
            confirmedAt: "",
          },
          updatedAt: timestamp(),
        });
        setData((current) => {
          const next = {
            ...current,
            evaluationMappings: (current.evaluationMappings || []).map(
              (item) => (item.id === id ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "保存 Evaluation Mapping",
            `${updated.version} / ${updated.id}`,
          );
          return next;
        });
        return updated;
      },
      submitEvaluationMapping(id) {
        const existing = (data.evaluationMappings || []).find(
          (item) => item.id === id,
        );
        if (!existing) throw new Error("Evaluation Mapping 不存在或已失效。");
        if (existing.status === "confirmed")
          throw new Error("当前 Mapping 已完成教师确认。");
        const sop = data.sops.find(
          (item) =>
            item.id === existing.authoredFor?.sopId &&
            item.version === existing.authoredFor?.sopVersion,
        );
        if (!sop) throw new Error("Mapping 对应的 SOP 版本不存在。");
        const validation = validateEvaluationMapping({
          sop,
          mapping: existing,
        });
        if (!validation.passed) {
          const blocked = {
            ...existing,
            status: "coverage_blocked",
            coverage: validation.coverage,
            validationIssues: validation.issues,
            updatedAt: timestamp(),
          };
          setData((current) => ({
            ...current,
            evaluationMappings: (current.evaluationMappings || []).map(
              (item) => (item.id === id ? blocked : item),
            ),
          }));
          throw new Error(validation.issues[0] || "Mapping 尚未满足提交条件。");
        }
        const updated = {
          ...existing,
          status: "pending_teacher_confirmation",
          coverage: validation.coverage,
          validationIssues: [],
          teacherConfirmation: {
            status: "待确认",
            teacher: "",
            comment: "",
            confirmedAt: "",
          },
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            evaluationMappings: (current.evaluationMappings || []).map(
              (item) => (item.id === id ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "提交教师业务口径确认",
            `${sop.name} / ${updated.version}`,
          );
          return next;
        });
        return updated;
      },
      reviewEvaluationMapping(id, confirmed, comment = "") {
        const existing = (data.evaluationMappings || []).find(
          (item) => item.id === id,
        );
        if (!existing || existing.status !== "pending_teacher_confirmation")
          throw new Error("只有待教师确认的 Mapping 可以提交确认结论。");
        const cleanComment = comment.trim();
        if (!confirmed && !cleanComment)
          throw new Error("退回时必须填写修改意见。");
        const when = timestamp();
        const updated = {
          ...existing,
          status: confirmed ? "confirmed" : "changes_requested",
          teacherConfirmation: {
            status: confirmed ? "已确认" : "已退回",
            teacher: "王老师",
            comment: cleanComment || "业务判断口径与当前 SOP 一致。",
            confirmedAt: when,
          },
          updatedAt: when,
        };
        setData((current) => {
          const next = {
            ...current,
            evaluationMappings: (current.evaluationMappings || []).map(
              (item) => (item.id === id ? updated : item),
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            confirmed ? "确认 AI 业务口径" : "退回 AI 业务口径",
            `${updated.version} / ${cleanComment || "确认通过"}`,
            "成功",
            { actor: "王老师", role: "教师" },
          );
          return next;
        });
        return updated;
      },
      startAiAdaptation(sopId) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop) throw new Error("SOP 不存在或已失效。");
        if (sop.status !== "已发布")
          throw new Error("只有已发布的 SOP 才能开始 AI 适配。");
        const mappingStatus = getMappingStatusForSop({
          sop,
          mappings: data.evaluationMappings || [],
        });
        if (!mappingStatus.confirmed)
          throw new Error("请先完成 Evaluation Mapping 并由教师确认业务口径。");
        const existing = data.datasets.find((item) => item.sopId === sopId);
        if (existing) return existing;
        const when = timestamp();
        const created = {
          id: uid("dataset"),
          sopId,
          name: `${sop.name} D1`,
          version: "D1",
          nextVersion: "D2",
          status: "采集中",
          sampleCount: 0,
          acceptedCount: 0,
          candidateCount: 0,
          labels: Object.fromEntries([
            ...(sop.steps || []).map((step) => [step.id, 0]),
            ["Other", 0],
          ]),
          sourceVideoIds: [],
          splits: { train: [], validation: [], test: [] },
          basedOn: "首次 AI 适配",
          updatedAt: when,
        };
        setData((current) => {
          const next = {
            ...current,
            datasets: [created, ...current.datasets],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "开始 AI 适配", `${sop.name} ${sop.version} / D1`);
          return next;
        });
        return created;
      },
      addSourceVideo(input) {
        const sop = data.sops.find((item) => item.id === input.sopId);
        const mappingStatus = getMappingStatusForSop({
          sop,
          mappings: data.evaluationMappings || [],
        });
        if (!sop || !mappingStatus.confirmed)
          throw new Error("请先完成教师业务口径确认。");
        if (!input.fileName?.trim())
          throw new Error("请填写 Source Video 文件名。");
        if (!/^\d{2}:\d{2}$/.test(input.duration || ""))
          throw new Error("视频时长格式应为 mm:ss。");
        const created = {
          id: uid("source-video"),
          sopId: sop.id,
          mappingVersion: mappingStatus.mapping.version,
          fileName: input.fileName.trim(),
          duration: input.duration,
          source: input.source || "人工上传",
          note: input.note?.trim() || "",
          status: "待加工",
          createdAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            sourceVideos: [created, ...(current.sourceVideos || [])],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "上传 Source Video",
            `${sop.name} / ${created.fileName}`,
          );
          return next;
        });
        return created;
      },
      addTimeRangeAnnotation(input) {
        const sourceVideo = (data.sourceVideos || []).find(
          (item) => item.id === input.sourceVideoId,
        );
        if (!sourceVideo) throw new Error("Source Video 不存在或已失效。");
        if (
          !Number.isFinite(timeToSeconds(input.startTime)) ||
          !Number.isFinite(timeToSeconds(input.endTime)) ||
          timeToSeconds(input.startTime) >= timeToSeconds(input.endTime)
        )
          throw new Error("动作片段开始时间必须早于结束时间，格式为 mm:ss。");
        const sop = data.sops.find((item) => item.id === sourceVideo.sopId);
        const mapping = getMappingStatusForSop({
          sop,
          mappings: data.evaluationMappings || [],
        }).mapping;
        const evaluationItem = mapping?.evaluationItems.find(
          (item) => item.id === input.evaluationItemId,
        );
        const machineEvent = mapping?.machineEvents.find(
          (item) => item.id === input.machineEventId,
        );
        if (!evaluationItem || !machineEvent)
          throw new Error(
            "动作片段必须关联当前 Mapping 的评价项与 Machine Event。",
          );
        if (!evaluationItem.machineEventIds.includes(machineEvent.id))
          throw new Error("所选 Machine Event 未关联到该评价项。");
        const created = {
          id: uid("time-range"),
          sopId: sourceVideo.sopId,
          sourceVideoId: sourceVideo.id,
          startTime: input.startTime,
          endTime: input.endTime,
          evaluationItemId: evaluationItem.id,
          machineEventId: machineEvent.id,
          label: machineEvent.name,
          annotationType: input.annotationType || "action",
          status: "待标注",
          createdAt: timestamp(),
        };
        setData((current) => ({
          ...current,
          sourceVideos: (current.sourceVideos || []).map((item) =>
            item.id === sourceVideo.id ? { ...item, status: "加工中" } : item,
          ),
          timeRangeAnnotations: [
            created,
            ...(current.timeRangeAnnotations || []),
          ],
        }));
        return created;
      },
      saveAnnotation(input) {
        const range = (data.timeRangeAnnotations || []).find(
          (item) => item.id === input.timeRangeId,
        );
        if (!range) throw new Error("动作片段不存在或已失效。");
        if (!input.label?.trim()) throw new Error("请填写标注标签。");
        const existing = (data.annotations || []).find(
          (item) => item.timeRangeId === range.id,
        );
        const annotation = {
          ...existing,
          id: existing?.id || uid("annotation"),
          sopId: range.sopId,
          timeRangeId: range.id,
          sourceVideoId: range.sourceVideoId,
          type: input.type || range.annotationType,
          label: input.label.trim(),
          bboxSummary: input.bboxSummary?.trim() || "",
          note: input.note?.trim() || "",
          status: "待审核",
          updatedAt: timestamp(),
        };
        setData((current) => ({
          ...current,
          annotations: existing
            ? (current.annotations || []).map((item) =>
                item.id === existing.id ? annotation : item,
              )
            : [annotation, ...(current.annotations || [])],
          timeRangeAnnotations: (current.timeRangeAnnotations || []).map(
            (item) =>
              item.id === range.id ? { ...item, status: "待审核" } : item,
          ),
        }));
        return annotation;
      },
      reviewAnnotation(id, passed, note = "") {
        const existing = (data.annotations || []).find(
          (item) => item.id === id,
        );
        if (!existing) throw new Error("Annotation 不存在或已失效。");
        const status = passed ? "已通过" : "已退回";
        const updated = {
          ...existing,
          status,
          reviewNote: note.trim(),
          reviewedBy: "刘工",
          reviewedAt: timestamp(),
        };
        setData((current) => ({
          ...current,
          annotations: (current.annotations || []).map((item) =>
            item.id === id ? updated : item,
          ),
          timeRangeAnnotations: (current.timeRangeAnnotations || []).map(
            (item) =>
              item.id === existing.timeRangeId ? { ...item, status } : item,
          ),
        }));
        return updated;
      },
      addApprovedAnnotationsToDataset(sopId, datasetId) {
        const dataset = data.datasets.find((item) => item.id === datasetId);
        if (!dataset || dataset.sopId !== sopId)
          throw new Error("Dataset 不存在或不属于当前 SOP。");
        if (dataset.status !== "采集中")
          throw new Error("只有采集中的 Dataset 可以纳入新数据。");
        const candidates = (data.annotations || []).filter(
          (item) =>
            item.sopId === sopId && item.status === "已通过" && !item.datasetId,
        );
        if (!candidates.length)
          throw new Error("当前没有待纳入的已审核 Annotation。");
        const sourceVideoIds = [
          ...new Set([
            ...(dataset.sourceVideoIds || []),
            ...candidates.map((item) => item.sourceVideoId),
          ]),
        ];
        const splits = assignSourceVideosToSplits(sourceVideoIds);
        const isolation = validateDatasetSplitIsolation(splits);
        if (!isolation.passed) throw new Error(isolation.issues[0]);
        const mapping = getMappingStatusForSop({
          sop: data.sops.find((item) => item.id === sopId),
          mappings: data.evaluationMappings || [],
        }).mapping;
        const labels = { ...(dataset.labels || {}) };
        for (const annotation of candidates) {
          const range = (data.timeRangeAnnotations || []).find(
            (item) => item.id === annotation.timeRangeId,
          );
          const evaluationItem = mapping?.evaluationItems.find(
            (item) => item.id === range?.evaluationItemId,
          );
          const label = evaluationItem?.stepId || "Other";
          labels[label] = (labels[label] || 0) + 1;
        }
        const updated = {
          ...dataset,
          sourceVideoIds,
          splits,
          sampleCount: (dataset.sampleCount || 0) + candidates.length,
          acceptedCount: (dataset.acceptedCount || 0) + candidates.length,
          candidateCount: Math.max(
            0,
            (dataset.candidateCount || 0) - candidates.length,
          ),
          labels,
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            datasets: current.datasets.map((item) =>
              item.id === dataset.id ? updated : item,
            ),
            annotations: (current.annotations || []).map((item) =>
              candidates.some((candidate) => candidate.id === item.id)
                ? {
                    ...item,
                    datasetId: dataset.id,
                    datasetVersion: dataset.version,
                  }
                : item,
            ),
            sourceVideos: (current.sourceVideos || []).map((item) =>
              sourceVideoIds.includes(item.id)
                ? { ...item, status: "已入库" }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "纳入 Dataset",
            `${dataset.version} / ${candidates.length} 条 Annotation / ${sourceVideoIds.length} 个 Source Video`,
          );
          return next;
        });
        return updated;
      },
      addDatasetSample(input) {
        const sop = data.sops.find((item) => item.id === input.sopId);
        if (!sop) throw new Error("关联 SOP 不存在。");
        const allowed = new Set([
          ...(sop.steps || []).map((step) => step.id),
          "Other",
        ]);
        if (!allowed.has(input.label))
          throw new Error("样本必须绑定既有 Step ID 或 Other。");
        if (!input.fileName?.trim()) throw new Error("请填写视频文件名。");
        const activeDataset = data.datasets.find(
          (item) => item.sopId === input.sopId,
        );
        const sample = {
          ...input,
          id: uid("sample"),
          fileName: input.fileName.trim(),
          source: input.source || "教师上传",
          student: input.student || "—",
          aiPrediction: "待推理",
          reason: input.reason || "人工上传标注",
          status: "采集中",
          createdAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            learningSamples: [sample, ...current.learningSamples],
            datasets: current.datasets.map((item) =>
              item.id === activeDataset?.id
                ? {
                    ...item,
                    candidateCount: (item.candidateCount || 0) + 1,
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "上传标注样本",
            `${sample.fileName} / ${sample.label}`,
          );
          return next;
        });
        return sample;
      },
      promoteDifficultSample(id) {
        const sample = data.learningSamples.find((item) => item.id === id);
        if (!sample) throw new Error("困难样本候选不存在。");
        if (sample.status !== "待加工")
          throw new Error("只有待加工候选可以进入数据生产链。");
        const when = timestamp();
        const sourceVideo = {
          id: uid("source-video"),
          sopId: sample.sopId,
          fileName: sample.fileName,
          source: "Difficult Sample Feedback",
          sourceSampleId: sample.id,
          duration: sample.duration || "00:30",
          status: "待加工",
          mappingVersion: "",
          note: sample.reason || "运行评价困难样本回流",
          createdAt: when,
        };
        setData((current) => {
          const next = {
            ...current,
            sourceVideos: [sourceVideo, ...(current.sourceVideos || [])],
            learningSamples: current.learningSamples.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "已转数据生产",
                    sourceVideoId: sourceVideo.id,
                    transferredAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "困难样本转入数据生产",
            `${sample.fileName} / ${sourceVideo.id}`,
          );
          return next;
        });
        return sourceVideo;
      },
      reviewLearningSample(id, decision, label, note = "") {
        const sample = data.learningSamples.find((item) => item.id === id);
        if (!sample) throw new Error("样本不存在或已失效。");
        if (sample.status === "待加工")
          throw new Error(
            "困难样本必须先进入数据生产链，不能直接纳入 Dataset。",
          );
        const sop = data.sops.find((item) => item.id === sample.sopId);
        if (
          ![...(sop?.steps || []).map((step) => step.id), "Other"].includes(
            label,
          )
        )
          throw new Error("复核标签必须是既有 Step ID 或 Other。");
        const status = decision === "accept" ? "已纳入" : "已拒绝";
        const dataset = data.datasets.find(
          (item) => item.sopId === sample.sopId,
        );
        if (!dataset) throw new Error("请先为当前 SOP 开始 AI 适配。");
        const targetDataset =
          dataset.status === "已锁定"
            ? dataset.nextVersion ||
              `D${Number(dataset.version.replace("D", "")) + 1}`
            : dataset.version;
        setData((current) => {
          const next = {
            ...current,
            learningSamples: current.learningSamples.map((item) =>
              item.id === id
                ? {
                    ...item,
                    label,
                    status,
                    note,
                    reviewedAt: timestamp(),
                    targetDataset: decision === "accept" ? targetDataset : "",
                  }
                : item,
            ),
            datasets: current.datasets.map((item) =>
              item.id === dataset?.id
                ? {
                    ...item,
                    candidateCount: Math.max(0, (item.candidateCount || 0) - 1),
                    acceptedCount:
                      decision === "accept" && item.status !== "已锁定"
                        ? (item.acceptedCount || item.sampleCount || 0) + 1
                        : item.acceptedCount,
                    sampleCount:
                      decision === "accept" && item.status !== "已锁定"
                        ? (item.sampleCount || 0) + 1
                        : item.sampleCount,
                    labels:
                      decision === "accept" && item.status !== "已锁定"
                        ? {
                            ...(item.labels || {}),
                            [label]: (item.labels?.[label] || 0) + 1,
                          }
                        : item.labels,
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            decision === "accept" ? "纳入 Dataset" : "拒绝训练样本",
            `${sample.fileName} / ${label}${decision === "accept" ? ` / ${targetDataset}` : ""}`,
          );
          return next;
        });
        return status;
      },
      createDatasetVersion(sopId) {
        const currentDataset = data.datasets.find(
          (item) => item.sopId === sopId,
        );
        const sop = data.sops.find((item) => item.id === sopId);
        if (!currentDataset || !sop)
          throw new Error("请先保存 SOP 并建立首个 Dataset。");
        if (
          !getMappingStatusForSop({
            sop,
            mappings: data.evaluationMappings || [],
          }).confirmed
        )
          throw new Error("请先完成教师业务口径确认。");
        if (currentDataset.status !== "已锁定")
          throw new Error("当前 Dataset 尚未锁定，请先完成审核或锁定。");
        const version =
          currentDataset.nextVersion ||
          `D${Number(currentDataset.version.replace("D", "")) + 1}`;
        const nextVersion = `D${Number(version.replace("D", "")) + 1}`;
        const accepted = data.learningSamples.filter(
          (item) =>
            item.sopId === sopId &&
            item.status === "已纳入" &&
            item.targetDataset === version,
        );
        const labels = { ...(currentDataset.labels || {}) };
        for (const sample of accepted)
          labels[sample.label] = (labels[sample.label] || 0) + 1;
        const created = {
          id: uid("dataset"),
          sopId,
          name: `${sop.name} ${version}`,
          version,
          nextVersion,
          status: "采集中",
          sampleCount: (currentDataset.sampleCount || 0) + accepted.length,
          acceptedCount: (currentDataset.sampleCount || 0) + accepted.length,
          candidateCount: 0,
          labels,
          sourceVideoIds: [...(currentDataset.sourceVideoIds || [])],
          splits: {
            train: [...(currentDataset.splits?.train || [])],
            validation: [...(currentDataset.splits?.validation || [])],
            test: [...(currentDataset.splits?.test || [])],
          },
          basedOn: currentDataset.version,
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            datasets: [
              created,
              ...current.datasets.map((item) =>
                item.id === currentDataset.id
                  ? { ...item, nextVersion: version }
                  : item,
              ),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "创建 Dataset 版本",
            `${created.name} / ${accepted.length} 条已复核样本`,
          );
          return next;
        });
        return created;
      },
      advanceDatasetLifecycle(id) {
        const existing = data.datasets.find((item) => item.id === id);
        if (!existing) throw new Error("Dataset 不存在或已失效。");
        const sop = data.sops.find((item) => item.id === existing.sopId);
        if (
          !getMappingStatusForSop({
            sop,
            mappings: data.evaluationMappings || [],
          }).confirmed
        )
          throw new Error("请先完成教师业务口径确认。");
        if (existing.status === "采集中") {
          const mapping = getMappingStatusForSop({
            sop,
            mappings: data.evaluationMappings || [],
          }).mapping;
          const requirements = deriveDataRequirements(mapping);
          if (requirements.requiresTraining) {
            const isolation = validateDatasetSplitIsolation(
              existing.splits || {},
            );
            if (!isolation.passed) throw new Error(isolation.issues[0]);
            if (!isolation.sourceVideoCount)
              throw new Error(
                "Training Required 能力必须先纳入已审核的 Source Video。",
              );
          }
        }
        const transitions = { 采集中: "待审核", 待审核: "已锁定" };
        const status = transitions[existing.status];
        if (!status)
          throw new Error("当前 Dataset 已锁定，新增样本请创建下一版本。");
        const updated = { ...existing, status, updatedAt: timestamp() };
        setData((current) => {
          const next = {
            ...current,
            datasets: current.datasets.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            status === "已锁定" ? "锁定 Dataset" : "提交 Dataset 审核",
            `${updated.name} / ${updated.version}`,
          );
          return next;
        });
        return updated;
      },
      createModelCandidate(sopId, datasetId) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop || sop.status !== "已发布")
          throw new Error("只有已发布的 SOP 才能创建 AI Package。");
        const mapping = getMappingStatusForSop({
          sop,
          mappings: data.evaluationMappings || [],
        }).mapping;
        const dataset = data.datasets.find(
          (item) =>
            item.sopId === sopId && (!datasetId || item.id === datasetId),
        );
        const readiness = getAiPackageCreationReadiness({
          sop,
          mapping,
          dataset,
        });
        if (!readiness.passed) throw new Error(readiness.issues[0]);
        const datasetVersion = readiness.requirements.requiresTraining
          ? dataset.version
          : "无需训练";
        const existingCandidate = data.models.find(
          (item) =>
            item.sopId === sopId &&
            item.mappingVersion === mapping.version &&
            item.datasetVersion === datasetVersion &&
            !["已部署", "已回滚"].includes(item.status),
        );
        if (existingCandidate) return existingCandidate;
        const maxMinor = data.models
          .filter((item) => item.sopId === sopId)
          .reduce((max, item) => {
            const matched = String(item.version).match(/^V1\.(\d+)$/);
            return Math.max(max, Number(matched?.[1] || 0));
          }, 0);
        const version = `V1.${maxMinor + 1}`;
        const when = timestamp();
        const created = {
          id: uid("model"),
          sopId,
          kind: "ai_package",
          name: `${sop.name} AI能力包`,
          version,
          status: readiness.requirements.requiresTraining ? "待训练" : "待验证",
          datasetVersion,
          sopVersion: sop.version,
          mappingVersion: mapping.version,
          requiresTraining: readiness.requirements.requiresTraining,
          components: {
            existingCapabilities: readiness.requirements.existingCapability.map(
              (item) => item.name,
            ),
            configuredCapabilities:
              readiness.requirements.configurationOnly.map((item) => item.name),
            trainedCapabilities: readiness.requirements.trainingRequired.map(
              (item) => item.name,
            ),
          },
          progress: 0,
          f1: "待评测",
          sequenceAccuracy: "待评测",
          otherRecall: "待评测",
          evaluatedAt: readiness.requirements.requiresTraining
            ? "待训练"
            : "待验证",
          deploymentTarget: "尚未部署",
          updatedAt: when,
        };
        setData((current) => {
          const next = {
            ...current,
            models: [created, ...current.models],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "创建 AI Package",
            `${sop.name} ${sop.version} / ${mapping.version} / ${datasetVersion} / ${version}`,
          );
          return next;
        });
        return created;
      },
      advanceModelLifecycle(id) {
        const existing = data.models.find((item) => item.id === id);
        if (!existing) throw new Error("模型版本不存在。");
        const transitions = {
          待训练: "训练中",
          训练中: "待验证",
          可部署: "已部署",
          已回滚: "已部署",
          失败: "训练中",
          验证未通过: "训练中",
        };
        const status = transitions[existing.status];
        if (existing.status === "待验证")
          throw new Error("请选择验证通过或验证不通过。");
        if (!status) throw new Error("当前模型已部署，可使用回滚操作。");
        const updated = {
          ...existing,
          status,
          progress:
            status === "训练中"
              ? Math.max(35, Number(existing.progress || 0))
              : status === "待验证"
                ? 100
                : existing.progress,
          f1:
            status === "可部署" && existing.f1 === "待评测"
              ? "92.0%"
              : existing.f1,
          sequenceAccuracy:
            status === "可部署" && existing.sequenceAccuracy === "待评测"
              ? "88.0%"
              : existing.sequenceAccuracy,
          otherRecall:
            status === "可部署" && existing.otherRecall === "待评测"
              ? "93.0%"
              : existing.otherRecall,
          evaluatedAt: status === "可部署" ? timestamp() : existing.evaluatedAt,
          deploymentTarget:
            status === "已部署" ? "A区兼容工位" : existing.deploymentTarget,
          updatedAt: timestamp(),
        };
        setData((current) => {
          const models = current.models.map((item) =>
            item.id === id
              ? updated
              : status === "已部署" &&
                  item.sopId === existing.sopId &&
                  item.status === "已部署"
                ? { ...item, status: "已回滚" }
                : item,
          );
          const next = {
            ...current,
            models,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            `模型${status}`,
            `${updated.name} / ${updated.version}`,
          );
          return next;
        });
        return updated;
      },
      recordModelValidation(id, passed, reason = "") {
        const existing = data.models.find((item) => item.id === id);
        if (!existing) throw new Error("模型版本不存在。");
        const updated = recordModelValidationResult(existing, {
          passed,
          reason,
          operator: "系统管理员",
          time: timestamp(),
        });
        setData((current) => {
          const next = {
            ...current,
            models: current.models.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            passed ? "模型验证通过" : "模型验证未通过",
            passed
              ? `${updated.name} / ${updated.version}`
              : `${updated.name} / ${updated.version} / ${reason.trim()}`,
          );
          return next;
        });
        return updated;
      },
      rollbackModel(id) {
        const existing = data.models.find((item) => item.id === id);
        if (!existing || existing.status !== "已部署")
          throw new Error("只有已部署模型可以回滚。");
        const previous = data.models
          .filter(
            (item) =>
              item.id !== id &&
              item.sopId === existing.sopId &&
              item.sopVersion === existing.sopVersion &&
              item.status === "已回滚",
          )
          .sort((a, b) => {
            const numberOf = (value) => {
              const parts = String(value).match(/\d+/g)?.map(Number) || [];
              return parts.reduce((total, part) => total * 10000 + part, 0);
            };
            return numberOf(b.version) - numberOf(a.version);
          })[0];
        if (!previous) throw new Error("当前没有可恢复的上一生产模型版本。");
        const when = timestamp();
        setData((current) => {
          const next = {
            ...current,
            models: current.models.map((item) =>
              item.id === id
                ? { ...item, status: "已回滚", updatedAt: when }
                : item.id === previous.id
                  ? {
                      ...item,
                      status: "已部署",
                      deploymentTarget:
                        existing.deploymentTarget || item.deploymentTarget,
                      updatedAt: when,
                    }
                  : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "回滚生产模型",
            `${existing.name} ${existing.version} → ${previous.version}`,
          );
          return next;
        });
        return {
          rolledBack: { ...existing, status: "已回滚", updatedAt: when },
          restored: { ...previous, status: "已部署", updatedAt: when },
        };
      },
      saveArrangement(input, finalize = false) {
        const existing = input.id
          ? data.arrangements.find((item) => item.id === input.id)
          : null;
        if (input.id && !existing)
          throw new Error("安排不存在或已失效，请返回列表刷新。");
        if (existing && !["草稿", "待开始"].includes(existing.status))
          throw new Error("进行中或已结束的安排不能再修改配置。");
        const name = input.name?.trim();
        if (!name) throw new Error("请填写安排名称。");
        if (
          data.arrangements.some(
            (item) =>
              item.id !== input.id &&
              item.type === input.type &&
              item.name.trim().toLowerCase() === name.toLowerCase(),
          )
        )
          throw new Error("同类型安排名称已存在，请更换名称。");
        if (!input.scheduleStart) throw new Error("请选择计划开始时间。");
        if (
          input.type === "exam" &&
          input.entryEnd &&
          new Date(input.entryEnd) <= new Date(input.scheduleStart)
        )
          throw new Error("允许入场截止时间必须晚于开始时间。");
        const examDurationMinutes =
          input.type === "exam"
            ? validateExamDuration(input.examDurationMinutes)
            : undefined;
        const sop = data.sops.find((item) => item.id === input.sopId);
        if (!isSopAvailableForNewArrangement(sop))
          throw new Error("只能选择已发布且未停用的 SOP。");
        if (finalize && !input.studentIds?.length)
          throw new Error("至少选择一名参与学生。");
        if (finalize && !input.workstationIds?.length)
          throw new Error("至少选择一个可用工位。");
        if (finalize) {
          const unavailable = input.workstationIds
            .map((id) => data.workstations.find((item) => item.id === id))
            .find(
              (workstation) =>
                !workstation ||
                ["故障", "维护中", "停用"].includes(workstation.status) ||
                (workstation.currentArrangement !== "无" &&
                  workstation.currentArrangement !== existing?.name),
            );
          if (unavailable)
            throw new Error(
              `${unavailable.name || "所选工位"}当前不可用，请移除后再完成配置。`,
            );
        }
        const saved = {
          ...(existing || {}),
          ...input,
          id: existing?.id || uid(input.type === "exam" ? "exam" : "practice"),
          name,
          teacherId: input.teacherId || existing?.teacherId || "t1",
          ...(input.type === "exam" ? { examDurationMinutes } : {}),
          status: finalize ? "待开始" : "草稿",
          openWorkstationIds: existing?.openWorkstationIds || [],
          snapshot: existing?.snapshot || null,
          paused: false,
          startedAt: existing?.startedAt || "",
          endedAt: existing?.endedAt || "",
          sessions: existing?.sessions || [],
          updatedAt: timestamp(),
        };
        setData((current) => {
          const arrangements = existing
            ? current.arrangements.map((item) =>
                item.id === saved.id ? saved : item,
              )
            : [saved, ...current.arrangements];
          const next = {
            ...current,
            arrangements,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            finalize ? "完成安排配置" : "保存安排草稿",
            `${saved.name} / ${saved.id}`,
          );
          return next;
        });
        return saved;
      },
      getWorkstationReadiness(arrangementId, workstationId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const workstation = data.workstations.find(
          (item) => item.id === workstationId,
        );
        const errors = [];
        const warnings = [];
        if (!arrangement || !workstation) errors.push("安排或工位不存在");
        if (arrangement && !arrangement.workstationIds.includes(workstationId))
          errors.push("该工位不在本次安排的已选范围内");
        if (["故障", "维护中", "停用"].includes(workstation?.status))
          errors.push(
            workstation.notes || `工位当前状态为${workstation.status}`,
          );
        if (
          workstation?.currentArrangement &&
          workstation.currentArrangement !== "无" &&
          workstation.currentArrangement !== arrangement?.name
        )
          errors.push(`当前被“${workstation.currentArrangement}”占用`);
        const gate = arrangement
          ? this.getWorkstationEvaluationGate(workstationId, arrangement.sopId)
          : { enabled: false, reasons: ["安排不存在"] };
        warnings.push(...gate.reasons);
        const baseConfig = normalizeWorkstationAiBaseConfig(workstation || {});
        const checks = ["node", "mainCamera", "cache"];
        if (baseConfig.fallbackCameraId) checks.splice(2, 0, "assistCamera");
        return {
          ok: errors.length === 0,
          errors,
          warnings: [...new Set(warnings)],
          gate,
          checks,
        };
      },
      openArrangementWorkstation(arrangementId, workstationId, checklist) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        if (!arrangement) throw new Error("安排不存在或已失效。");
        if (
          !["待开始", "准备中", "进行中", "已暂停"].includes(arrangement.status)
        )
          throw new Error("当前安排状态不允许再开放工位。");
        if (arrangement.openWorkstationIds.includes(workstationId))
          throw new Error("该工位已开放，无需重复检查。");
        const readiness = this.getWorkstationReadiness(
          arrangementId,
          workstationId,
        );
        if (!readiness.ok) throw new Error(readiness.errors.join("；"));
        if (
          !checklist ||
          readiness.checks.some((key) => checklist[key] !== true)
        )
          throw new Error("请逐项确认设备、画面和本地缓存。");
        const sop = data.sops.find((item) => item.id === arrangement.sopId);
        if (!sop) throw new Error("当前安排引用的SOP不存在或已失效。");
        const lockedAt = timestamp();
        const snapshot = arrangement.snapshot?.sopSnapshot
          ? arrangement.snapshot
          : {
              sopId: sop.id,
              sopSnapshot: JSON.parse(JSON.stringify(sop)),
              lockedAt,
            };
        const workstation = data.workstations.find(
          (item) => item.id === workstationId,
        );
        const assigned = new Set(
          arrangement.sessions.map((session) => session.studentId),
        );
        const studentId =
          arrangement.studentIds.find((id) => !assigned.has(id)) ||
          arrangement.studentIds[0];
        const sessionId = uid("session");
        const openedSession = createOpenedAiSession({
          id: sessionId,
          workstationId,
          studentId,
          gate: readiness.gate,
          lockedAt,
          recording: defaultSessionRecording(
            { id: sessionId, status: "可入场" },
            arrangement,
            data.systemSettings.current,
          ),
          steps: createSessionStepsFromSop(sop.steps),
        });
        const session =
          arrangement.type === "exam"
            ? {
                ...openedSession,
                examDurationMinutes: normalizeExamDuration(
                  arrangement.examDurationMinutes,
                ),
              }
            : openedSession;
        setData((current) => {
          const updatedArrangement = {
            ...arrangement,
            status:
              arrangement.status === "待开始" ? "准备中" : arrangement.status,
            snapshot,
            openWorkstationIds: [
              ...new Set([...arrangement.openWorkstationIds, workstationId]),
            ],
            sessions: arrangement.sessions.some(
              (item) => item.workstationId === workstationId,
            )
              ? arrangement.sessions
              : [...arrangement.sessions, session],
            updatedAt: timestamp(),
          };
          const workstation = current.workstations.find(
            (item) => item.id === workstationId,
          );
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId ? updatedArrangement : item,
            ),
            workstations: current.workstations.map((item) =>
              item.id === workstationId
                ? {
                    ...item,
                    status: "可入场",
                    currentArrangement: arrangement.name,
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            arrangement.snapshot ? "新增开放工位" : "锁定运行快照并开放工位",
            `${workstation?.name || workstationId} / ${arrangement.name}`,
          );
          return next;
        });
        return { snapshot, session };
      },
      startArrangement(id) {
        const arrangement = data.arrangements.find((item) => item.id === id);
        if (!arrangement) throw new Error("安排不存在或已失效。");
        if (!["待开始", "准备中"].includes(arrangement.status))
          throw new Error("当前安排已开始或已结束，不能重复开始。");
        if (!arrangement.snapshot || !arrangement.openWorkstationIds.length)
          throw new Error("至少检查并开放一个工位后才能开始安排。");
        const startedAt = timestamp();
        const sessions = arrangement.sessions.map((session) =>
          session.status === "可入场"
            ? { ...session, status: "待开始" }
            : session,
        );
        const updated = {
          ...arrangement,
          status: "进行中",
          paused: false,
          startedAt: arrangement.startedAt || startedAt,
          sessions,
          updatedAt: startedAt,
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === id ? updated : item,
            ),
            workstations: current.workstations.map((item) =>
              arrangement.openWorkstationIds.includes(item.id)
                ? {
                    ...item,
                    status: "使用中",
                    currentArrangement: arrangement.name,
                    updatedAt: startedAt,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "开始安排", `${arrangement.name} / ${id}`);
          return next;
        });
        return updated;
      },
      setArrangementPaused(id, paused) {
        const arrangement = data.arrangements.find((item) => item.id === id);
        if (!arrangement || !["进行中", "已暂停"].includes(arrangement.status))
          throw new Error("只有进行中的安排可以暂停或恢复。");
        const examTransitionAt = new Date().toISOString();
        const updated = {
          ...arrangement,
          status: paused ? "已暂停" : "进行中",
          paused,
          sessions: arrangement.sessions.map((session) => {
            if (paused && session.status === "进行中")
              return {
                ...session,
                status: "已暂停",
                ...(arrangement.type === "exam"
                  ? {
                      examTiming: transitionExamTiming(
                        session,
                        true,
                        examTransitionAt,
                      ),
                    }
                  : {}),
                runtime: {
                  ...normalizeSessionRuntime(session),
                  evaluationClock: setEvaluationClockPaused(
                    normalizeSessionRuntime(session).evaluationClock,
                    true,
                    { reason: "教师暂停整场安排", at: timestamp() },
                  ),
                },
                steps: session.steps.map((step) =>
                  step.executionState === "active"
                    ? { ...step, executionState: "paused" }
                    : step,
                ),
              };
            if (!paused && session.status === "已暂停")
              return {
                ...session,
                status: "进行中",
                ...(arrangement.type === "exam"
                  ? {
                      examTiming: transitionExamTiming(
                        session,
                        false,
                        examTransitionAt,
                      ),
                    }
                  : {}),
                runtime: {
                  ...normalizeSessionRuntime(session),
                  evaluationClock: setEvaluationClockPaused(
                    normalizeSessionRuntime(session).evaluationClock,
                    false,
                    { reason: "教师恢复整场安排", at: timestamp() },
                  ),
                },
                steps: session.steps.map((step) =>
                  step.executionState === "paused"
                    ? { ...step, executionState: "active" }
                    : step,
                ),
              };
            return session;
          }),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, paused ? "暂停安排" : "恢复安排", arrangement.name);
          return next;
        });
        return updated;
      },
      setArrangementSessionPaused(arrangementId, workstationId, paused) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!session || !["进行中", "已暂停"].includes(session.status))
          throw new Error("当前学生会话不能暂停或恢复。");
        const status = paused ? "已暂停" : "进行中";
        const runtime = normalizeSessionRuntime(session);
        const examTransitionAt = new Date().toISOString();
        const updatedSession = {
          ...session,
          status,
          ...(arrangement.type === "exam"
            ? {
                examTiming: transitionExamTiming(
                  session,
                  paused,
                  examTransitionAt,
                ),
              }
            : {}),
          runtime: {
            ...runtime,
            evaluationClock: setEvaluationClockPaused(
              runtime.evaluationClock,
              paused,
              {
                reason: paused ? "教师暂停当前会话" : "教师恢复当前会话",
                at: timestamp(),
              },
            ),
          },
          steps: session.steps.map((step) =>
            step.executionState === (paused ? "active" : "paused")
              ? { ...step, executionState: paused ? "paused" : "active" }
              : step,
          ),
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? updatedSession
                        : entry,
                    ),
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            paused ? "暂停学生会话" : "恢复学生会话",
            `${arrangement.name} / ${workstationId}`,
          );
          return next;
        });
        return status;
      },
      startWorkstationSession(arrangementId, workstationId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        if (arrangement.status !== "进行中")
          throw new Error("教师尚未开始安排或当前安排已暂停，暂不能开始。");
        if (!["待开始", "可入场"].includes(session.status))
          throw new Error("当前会话已经开始或结束，不能重复开始。");
        const startedAt = timestamp();
        const startedAtExact = new Date().toISOString();
        const startedRuntimeSession = startAiRuntimeSession(session, startedAt);
        const updatedSession =
          arrangement.type === "exam"
            ? {
                ...startedRuntimeSession,
                examDurationMinutes: normalizeExamDuration(
                  session.examDurationMinutes ??
                    arrangement.examDurationMinutes,
                ),
                examTiming: createExamTiming({
                  durationMinutes:
                    session.examDurationMinutes ??
                    arrangement.examDurationMinutes,
                  startedAt: startedAtExact,
                  now: startedAtExact,
                }),
                events: [
                  {
                    id: uid("exam-event"),
                    type: "exam_started",
                    title: "考试开始",
                    detail: "考试计时已开始，时长已按本次安排锁定。",
                    createdAt: startedAtExact,
                    time: startedAt.slice(-5),
                    level: "info",
                    scoreImpact: "none",
                  },
                  ...(startedRuntimeSession.events || []),
                ],
              }
            : startedRuntimeSession;
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? updatedSession
                        : entry,
                    ),
                    updatedAt: startedAt,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "学生开始工位会话",
            `${arrangement.name} / ${workstationId} / ${session.id}`,
          );
          return next;
        });
        return updatedSession;
      },
      attachStudentIdentityVerification(
        arrangementId,
        workstationId,
        verification,
      ) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        const verifiedAt = verification?.verifiedAt || timestamp();
        const updatedSession = attachStudentVerificationToSession(
          session,
          { ...verification, verifiedAt },
          {
            id: uid("student-identity"),
            createdAt: verifiedAt,
          },
        );
        if (updatedSession === session) return session.identityVerification;
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                }
              : item,
          ),
        }));
        return updatedSession.identityVerification;
      },
      recordStudentHintRequest(arrangementId, workstationId, stepId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        const when = timestamp();
        const updatedSession = appendStudentHintRequestToSession(
          session,
          stepId,
          { id: uid("student-hint"), createdAt: when },
        );
        const event = updatedSession.events[0];
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                }
              : item,
          ),
        }));
        return event;
      },
      advanceRuntimeClock(arrangementId, workstationId, seconds = 30) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!session) throw new Error("工位会话不存在。");
        const runtime = normalizeSessionRuntime(session);
        const evaluationClock = advanceEvaluationClock(
          runtime.evaluationClock,
          seconds,
        );
        const updatedSession = {
          ...session,
          elapsed: secondsToElapsed(evaluationClock.elapsedSeconds),
          runtime: { ...runtime, evaluationClock },
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                }
              : item,
          ),
        }));
        return evaluationClock;
      },
      setActorBindingStatus(arrangementId, workstationId, status, note = "") {
        if (
          !["confirmed", "uncertain", "lost", "rebind_required"].includes(
            status,
          )
        )
          throw new Error("无效的人员绑定状态。");
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!session) throw new Error("工位会话不存在。");
        const when = timestamp();
        const examTransitionAt = new Date().toISOString();
        const runtime = normalizeSessionRuntime(session);
        const actorBinding = {
          ...runtime.actorBinding,
          status,
          primaryActorId: session.studentId,
          trackId: status === "confirmed" ? `track-${session.id}` : "",
          history: [
            ...(runtime.actorBinding.history || []),
            { status, at: when, note },
          ],
        };
        const mustPause = ["lost", "rebind_required"].includes(status);
        const technicalIncidents =
          status === "lost"
            ? [
                ...runtime.technicalIncidents,
                {
                  id: uid("incident"),
                  type: "tracking_lost",
                  stepId: session.currentStepId,
                  note: note || "Primary Actor跟踪丢失",
                  occurredAt: when,
                  affectsContinuation: true,
                },
              ]
            : runtime.technicalIncidents;
        const actorSteps = session.steps.map((step) => {
          if (step.id !== session.currentStepId) return step;
          if (arrangement.type === "exam" && status === "lost")
            return {
              ...step,
              executionState: "paused",
              completionResult: "not_evaluable",
              result: "人员跟踪丢失·待处置",
              rawScore: null,
              effectiveScore: null,
              score: null,
              reviewStatus: "待复核",
              scoreDisposition: deriveTechnicalIncidentDisposition({
                arrangementType: "exam",
                incident: { type: "tracking_lost" },
              }),
            };
          return {
            ...step,
            executionState: mustPause
              ? "paused"
              : status === "confirmed"
                ? "active"
                : step.executionState,
          };
        });
        const updatedSession = {
          ...session,
          status: mustPause
            ? "已暂停"
            : status === "confirmed" && session.status === "已暂停"
              ? "进行中"
              : session.status,
          ...(arrangement.type === "exam" &&
          (mustPause || (status === "confirmed" && session.status === "已暂停"))
            ? {
                examTiming: transitionExamTiming(
                  session,
                  mustPause,
                  examTransitionAt,
                ),
              }
            : {}),
          runtime: {
            ...runtime,
            actorBinding,
            technicalIncidents,
            evaluationClock: mustPause
              ? setEvaluationClockPaused(runtime.evaluationClock, true, {
                  reason: "等待Primary Actor重新绑定",
                  at: when,
                })
              : status === "confirmed"
                ? setEvaluationClockPaused(runtime.evaluationClock, false, {
                    reason: "Primary Actor已重新确认",
                    at: when,
                  })
                : runtime.evaluationClock,
          },
          steps: actorSteps,
          resultStatus:
            arrangement.type === "exam" && status === "lost"
              ? "待复核"
              : session.resultStatus,
          events: [
            {
              time: when.slice(-5),
              level: mustPause
                ? "danger"
                : status === "confirmed"
                  ? "green"
                  : "warning",
              title: `人员绑定：${status}`,
              detail: note || "运行身份状态已更新",
            },
            ...(session.events || []),
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? updatedSession
                        : entry,
                    ),
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "更新人员绑定",
            `${arrangement.name} / ${workstationId} / ${status}`,
          );
          return next;
        });
        return updatedSession;
      },
      simulateAiCondition(
        arrangementId,
        workstationId,
        judgementItemId,
        conditionId,
      ) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        const when = timestamp();
        const result = simulateAiConditionOnSession({
          session,
          judgementItemId,
          conditionId,
          sopSnapshot:
            session.evaluationSnapshot?.sopSnapshot ||
            data.sops.find((item) => item.id === arrangement.sopId),
          when,
          makeId: uid,
        });
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? result.updatedSession
                        : entry,
                    ),
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "模拟AI判断条件",
            `${arrangement.name} / ${result.judgementResult.judgementItemName}`,
          );
          return next;
        });
        return result;
      },
      // 旧版运行模拟保留给遗留AI评价页面；一期正式运行不再调用。
      simulateMachineEvent(arrangementId, workstationId, machineEventId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        const sop = data.sops.find((item) => item.id === arrangement?.sopId);
        const mapping = (data.evaluationMappings || []).find(
          (item) =>
            item.status === "confirmed" &&
            item.authoredFor?.sopId === sop?.id &&
            item.authoredFor?.sopVersion === sop?.version,
        );
        const machineEvent = mapping?.machineEvents.find(
          (item) => item.id === machineEventId,
        );
        const currentStep = session?.steps.find(
          (item) => item.id === session.currentStepId,
        );
        if (!session || !currentStep || !machineEvent)
          throw new Error("当前步骤没有可模拟的机器事实。");
        if (session.status !== "进行中")
          throw new Error("会话未运行，不能产生机器事实。");
        const runtime = normalizeSessionRuntime(session);
        if (runtime.actorBinding.status !== "confirmed")
          throw new Error("Primary Actor未确认，机器事实不能用于自动评价。");
        if (currentStep.observationWindow?.status !== "open")
          throw new Error("当前Observation Window未开启。");
        const items = mapping.evaluationItems.filter(
          (item) =>
            item.stepId === currentStep.id &&
            item.machineEventIds.includes(machineEventId),
        );
        if (!items.length)
          throw new Error("该机器事实未映射到当前步骤的Evaluation Item。");
        const when = timestamp();
        const machineRecord = {
          id: uid("machine-event"),
          machineEventId,
          stepId: currentStep.id,
          actorId: session.studentId,
          occurredAt: when,
          fact: machineEvent.factDefinition,
        };
        const nextResults = [...runtime.evaluationItemResults];
        for (const item of items) {
          const existing = nextResults.find(
            (entry) =>
              entry.evaluationItemId === item.id &&
              entry.stepId === currentStep.id,
          );
          if (!existing)
            nextResults.push({
              id: uid("evaluation-result"),
              evaluationItemId: item.id,
              stepId: currentStep.id,
              result: "confirmed",
              machineEventIds: [machineEventId],
              observedAt: when,
            });
          else
            existing.machineEventIds = [
              ...new Set([...(existing.machineEventIds || []), machineEventId]),
            ];
        }
        const completionItems = mapping.evaluationItems.filter(
          (item) =>
            item.stepId === currentStep.id && item.roles.includes("completion"),
        );
        const completed =
          completionItems.length > 0 &&
          completionItems.every((item) =>
            nextResults.some(
              (result) =>
                result.evaluationItemId === item.id &&
                result.result === "confirmed",
            ),
          );
        let steps = session.steps;
        let currentStepId = session.currentStepId;
        if (completed) {
          const currentIndex = session.steps.findIndex(
            (item) => item.id === currentStep.id,
          );
          const nextStep = session.steps[currentIndex + 1];
          steps = session.steps.map((step) =>
            step.id === currentStep.id
              ? {
                  ...step,
                  state: "pass",
                  executionState: "closed",
                  completionResult: "complete",
                  result: "通过",
                  rawScore: Number(step.maxScore || 0),
                  effectiveScore: Number(step.maxScore || 0),
                  score: Number(step.maxScore || 0),
                  observationWindow: {
                    ...step.observationWindow,
                    status: "closed",
                    closedAt: when,
                    closeReason: "完成条件已满足",
                  },
                }
              : step.id === nextStep?.id
                ? {
                    ...step,
                    state: "active",
                    executionState: "active",
                    result: "进行中",
                    observationWindow: {
                      status: "open",
                      openedAt: when,
                      closedAt: "",
                      closeReason: "",
                    },
                  }
                : step,
          );
          currentStepId = nextStep?.id || "";
        }
        const scoreEngine = calculateScoreEngine({ steps });
        const updatedSession = {
          ...session,
          steps,
          currentStepId,
          score: scoreEngine.effectiveScore,
          scoreEngine,
          runtime: {
            ...runtime,
            machineEvents: [...runtime.machineEvents, machineRecord],
            evaluationItemResults: nextResults,
            correctionContext:
              completed && runtime.correctionContext.status === "active"
                ? {
                    ...runtime.correctionContext,
                    status: "closed",
                    completedAt: when,
                    closeReason: "Step关闭",
                  }
                : runtime.correctionContext,
          },
          events: [
            {
              time: when.slice(-5),
              level: "blue",
              title: machineEvent.name,
              detail: `机器事实已映射到 ${items.map((item) => item.name).join("、")}`,
            },
            ...(session.events || []),
          ],
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return { completed, updatedSession };
      },
      setCorrectionContext(arrangementId, workstationId, action, ruleId = "") {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        const when = timestamp();
        const updatedSession = updateAiCorrectionContext({
          session,
          action,
          ruleId,
          sopSnapshot:
            session?.evaluationSnapshot?.sopSnapshot ||
            data.sops.find((item) => item.id === arrangement?.sopId),
          when,
        });
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return updatedSession;
      },
      createAssistanceWarning(arrangementId, workstationId, note = "") {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!session) throw new Error("工位会话不存在。");
        const when = timestamp();
        const runtime = normalizeSessionRuntime(session);
        const warning = {
          id: uid("assistance"),
          stepId: session.currentStepId,
          type: "sustained_secondary_actor_interaction",
          note: note || "第二人员持续进入关键ROI或操作工具",
          occurredAt: when,
          scoreImpact: "none",
        };
        const updatedSession = {
          ...session,
          runtime: {
            ...runtime,
            assistanceWarnings: [...runtime.assistanceWarnings, warning],
          },
          events: [
            {
              time: when.slice(-5),
              level: "warning",
              title: "协助行为提醒",
              detail: "第二人员持续介入，仅提醒教师，不参与学生自动计分",
            },
            ...(session.events || []),
          ],
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return warning;
      },
      reportTechnicalIncident(arrangementId, workstationId, input) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        const step = session?.steps.find(
          (item) => item.id === session.currentStepId,
        );
        if (!session || !step) throw new Error("当前没有可记录异常的步骤。");
        const when = timestamp();
        const examTransitionAt = new Date().toISOString();
        const runtime = normalizeSessionRuntime(session);
        const incident = {
          id: uid("incident"),
          type: input.type,
          stepId: step.id,
          note: input.note || "",
          affectsContinuation: Boolean(input.affectsContinuation),
          occurredAt: when,
          status: "active",
          resolvedAt: "",
          resolvedBy: "",
        };
        const disposition = deriveTechnicalIncidentDisposition({
          arrangementType: arrangement.type,
          incident,
        });
        const currentIndex = session.steps.findIndex(
          (item) => item.id === step.id,
        );
        const nextStep = session.steps[currentIndex + 1];
        const canAdvance = !input.affectsContinuation && Boolean(nextStep);
        const steps = session.steps.map((item) =>
          item.id === step.id
            ? arrangement.type === "practice"
              ? {
                  ...item,
                  state: "pass",
                  executionState: input.affectsContinuation
                    ? "paused"
                    : "closed",
                  completionResult: "uncertain",
                  result: "技术异常·默认通过",
                  rawScore: Number(item.maxScore || 0),
                  effectiveScore: Number(item.maxScore || 0),
                  score: Number(item.maxScore || 0),
                  scoreDisposition: disposition,
                  observationWindow: input.affectsContinuation
                    ? item.observationWindow
                    : {
                        ...item.observationWindow,
                        status: "closed",
                        closedAt: when,
                        closeReason: "技术异常，按练习策略默认通过",
                      },
                }
              : {
                  ...item,
                  executionState: input.affectsContinuation
                    ? "paused"
                    : item.executionState,
                  completionResult: "not_evaluable",
                  result: "技术异常待处置",
                  rawScore: null,
                  effectiveScore: null,
                  score: null,
                  reviewStatus: "待复核",
                  scoreDisposition: disposition,
                }
            : canAdvance && item.id === nextStep.id
              ? {
                  ...item,
                  state: "active",
                  executionState: "active",
                  result: "进行中",
                  observationWindow: {
                    status: "open",
                    openedAt: when,
                    closedAt: "",
                    closeReason: "",
                  },
                }
              : item,
        );
        const scoreEngine = calculateScoreEngine({ steps });
        const updatedSession = {
          ...session,
          status: input.affectsContinuation ? "已暂停" : session.status,
          ...(arrangement.type === "exam" && input.affectsContinuation
            ? {
                examTiming: transitionExamTiming(
                  session,
                  true,
                  examTransitionAt,
                ),
              }
            : {}),
          currentStepId: canAdvance ? nextStep.id : session.currentStepId,
          steps,
          score:
            scoreEngine.scoreStatus === "pending"
              ? session.score
              : scoreEngine.effectiveScore,
          scoreEngine,
          resultStatus:
            arrangement.type === "exam" ? "待复核" : session.resultStatus,
          runtime: {
            ...runtime,
            technicalIncidents: [...runtime.technicalIncidents, incident],
            correctionContext:
              runtime.correctionContext.status === "active"
                ? {
                    ...runtime.correctionContext,
                    status: "closed",
                    completedAt: when,
                    closeReason: "Technical Incident",
                  }
                : runtime.correctionContext,
            evaluationClock: input.affectsContinuation
              ? setEvaluationClockPaused(runtime.evaluationClock, true, {
                  reason: "技术异常阻断继续操作",
                  at: when,
                })
              : runtime.evaluationClock,
          },
          events: [
            {
              time: when.slice(-5),
              level: "danger",
              title: "技术异常",
              detail: input.note || input.type,
            },
            ...(session.events || []),
          ],
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return updatedSession;
      },
      resolveTechnicalIncident(arrangementId, workstationId, incidentId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        const runtime = normalizeSessionRuntime(session || {});
        const incident = runtime.technicalIncidents.find(
          (item) => item.id === incidentId && item.status !== "resolved",
        );
        if (!session || !incident) throw new Error("待恢复技术异常不存在。");
        const when = timestamp();
        const examTransitionAt = new Date().toISOString();
        const incidentIndex = session.steps.findIndex(
          (item) => item.id === incident.stepId,
        );
        const nextStep = session.steps[incidentIndex + 1];
        const steps = session.steps.map((step) =>
          step.id === incident.stepId
            ? {
                ...step,
                executionState: "closed",
                observationWindow: {
                  ...step.observationWindow,
                  status: "closed",
                  closedAt: when,
                  closeReason: "Technical Incident已恢复",
                },
              }
            : step.id === nextStep?.id
              ? {
                  ...step,
                  state: "active",
                  executionState: "active",
                  result: "进行中",
                  observationWindow: {
                    status: "open",
                    openedAt: when,
                    closedAt: "",
                    closeReason: "",
                  },
                }
              : step,
        );
        const updatedSession = {
          ...session,
          status: "进行中",
          ...(arrangement.type === "exam"
            ? {
                examTiming: transitionExamTiming(
                  session,
                  false,
                  examTransitionAt,
                ),
              }
            : {}),
          currentStepId: nextStep?.id || "",
          steps,
          runtime: {
            ...runtime,
            technicalIncidents: runtime.technicalIncidents.map((item) =>
              item.id === incidentId
                ? {
                    ...item,
                    status: "resolved",
                    resolvedAt: when,
                    resolvedBy: "王老师",
                  }
                : item,
            ),
            evaluationClock: setEvaluationClockPaused(
              runtime.evaluationClock,
              false,
              { reason: "Technical Incident已恢复", at: when },
            ),
          },
          events: [
            {
              time: when.slice(-5),
              level: "green",
              title: "技术异常已恢复",
              detail: "运行继续；考试中的待处置成绩仍需教师闭环",
            },
            ...(session.events || []),
          ],
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return updatedSession;
      },
      createSafetyCandidate(arrangementId, workstationId, safetyRuleId = "") {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        const step = session?.steps.find(
          (item) => item.id === session.currentStepId,
        );
        if (!session || !step)
          throw new Error("当前没有可记录安全候选的步骤。");
        const when = timestamp();
        const examTransitionAt = new Date().toISOString();
        const runtime = normalizeSessionRuntime(session);
        const candidate = {
          id: uid("safety"),
          safetyRuleId,
          stepId: step.id,
          status: "pending",
          occurredAt: when,
          resolvedAt: "",
          resolvedBy: "",
        };
        const updatedSession = {
          ...session,
          status: "已暂停",
          ...(arrangement.type === "exam"
            ? {
                examTiming: transitionExamTiming(
                  session,
                  true,
                  examTransitionAt,
                ),
              }
            : {}),
          steps: session.steps.map((item) =>
            item.id === step.id
              ? { ...item, executionState: "safety_blocked" }
              : item,
          ),
          runtime: {
            ...runtime,
            safetyCandidates: [...runtime.safetyCandidates, candidate],
            correctionContext:
              runtime.correctionContext.status === "active"
                ? {
                    ...runtime.correctionContext,
                    status: "closed",
                    completedAt: when,
                    closeReason: "Safety Candidate",
                  }
                : runtime.correctionContext,
            evaluationClock: setEvaluationClockPaused(
              runtime.evaluationClock,
              true,
              { reason: "安全候选等待教师确认", at: when },
            ),
          },
          events: [
            {
              time: when.slice(-5),
              level: "danger",
              title: "安全候选待确认",
              detail: "已暂停Session与Evaluation Clock，尚未形成处罚结论",
            },
            ...(session.events || []),
          ],
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return candidate;
      },
      resolveSafetyCandidate(
        arrangementId,
        workstationId,
        candidateId,
        resolution,
      ) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        const when = timestamp();
        const safetyResolvedSession = resolveAiSafetyCandidate({
          session,
          candidateId,
          resolution,
          sopSnapshot:
            session.evaluationSnapshot?.sopSnapshot ||
            data.sops.find((item) => item.id === arrangement.sopId),
          when,
          resolvedBy: "王老师",
        });
        const updatedSession =
          arrangement.type === "exam" &&
          session.status === "已暂停" &&
          safetyResolvedSession.status === "进行中"
            ? {
                ...safetyResolvedSession,
                examTiming: transitionExamTiming(
                  session,
                  false,
                  new Date().toISOString(),
                ),
              }
            : safetyResolvedSession;
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.workstationId === workstationId
                      ? updatedSession
                      : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return updatedSession;
      },
      resolveScoreDisposition(arrangementId, sessionId, stepId, input) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.id === sessionId,
        );
        const step = session?.steps.find((item) => item.id === stepId);
        if (!session || !step) throw new Error("待处置步骤不存在。");
        const when = timestamp();
        const status = input.status;
        if (
          ![
            "teacher_resolved",
            "retest_required",
            "retest_resolved",
            "policy_protected",
          ].includes(status)
        )
          throw new Error("请选择有效的成绩处置结果。");
        if (!String(input.reason || "").trim())
          throw new Error("处置说明不能为空。");
        const needsScore = [
          "teacher_resolved",
          "retest_resolved",
          "policy_protected",
        ].includes(status);
        const score = Number(input.score);
        if (
          needsScore &&
          (!Number.isFinite(score) ||
            score < 0 ||
            score > Number(step.maxScore || 0))
        )
          throw new Error(`步骤得分必须在0–${step.maxScore}分之间。`);
        const steps = session.steps.map((item) =>
          item.id === stepId
            ? {
                ...item,
                effectiveScore: needsScore ? score : item.effectiveScore,
                score: needsScore ? score : item.score,
                result:
                  status === "retest_required" ? "需要补测" : "教师已处置",
                reviewStatus:
                  status === "retest_required" ? "待复核" : "复核通过",
                scoreDisposition: {
                  status,
                  reason: input.reason.trim(),
                  resolvedBy: "王老师",
                  resolvedAt: when,
                },
              }
            : item,
        );
        const scoreEngine = calculateScoreEngine({ steps });
        const pending =
          scoreEngine.scoreStatus === "pending" ||
          steps.some(requiresMandatoryReview);
        const updatedSession = {
          ...session,
          steps,
          score: scoreEngine.effectiveScore,
          scoreEngine,
          resultStatus: pending ? "待复核" : "正式成绩",
          reviewHistory: [
            ...(session.reviewHistory || []),
            {
              time: when,
              operator: "王老师",
              action: `成绩处置：${status}`,
              stepId,
              before: step.effectiveScore,
              after: needsScore ? score : step.effectiveScore,
              reason: input.reason.trim(),
              evidence: step.evidenceSources || [],
            },
          ],
        };
        setData((current) => ({
          ...current,
          arrangements: current.arrangements.map((item) =>
            item.id === arrangementId
              ? {
                  ...item,
                  sessions: item.sessions.map((entry) =>
                    entry.id === sessionId ? updatedSession : entry,
                  ),
                  updatedAt: when,
                }
              : item,
          ),
        }));
        return updatedSession;
      },
      requestTeacherHelp(arrangementId, workstationId, reason = "") {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        if (!["进行中", "已暂停", "故障"].includes(session.status))
          throw new Error("当前会话状态不能请求帮助。");
        if (session.helpRequestedAt) return session.helpRequestedAt;
        const when = timestamp();
        const payload =
          reason && typeof reason === "object"
            ? reason
            : {
                reasonCode: "other",
                reasonLabel: "其他",
                note: String(reason || "").trim(),
              };
        const updatedSession = appendStudentHelpRequestToSession(
          session,
          payload,
          { id: uid("student-help"), createdAt: when },
        );
        const event = updatedSession.events[0];
        const detail = event.detail;
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? updatedSession
                        : entry,
                    ),
                    updatedAt: when,
                  }
                : item,
            ),
            notifications: [
              {
                id: uid("notification"),
                title: `${workstationId} 学生请求帮助`,
                detail,
                path: `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}/${arrangementId}/stations/${workstationId}`,
                time: when.slice(-5),
                read: false,
                tone: "warning",
              },
              ...(current.notifications || []),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "学生请求帮助",
            `${arrangement.name} / ${workstationId} / ${detail}`,
          );
          return next;
        });
        return when;
      },
      requestExamIncidentHelp(arrangementId, workstationId, input = {}) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        if (arrangement.type !== "exam")
          throw new Error("只有考试会话可以提交考试异常求助。");
        if (!["进行中", "已暂停", "故障"].includes(session.status))
          throw new Error("当前考试状态不能提交异常求助。");
        if (session.examIncidentHelpRequestedAt)
          return session.examIncidentHelpRequestedAt;
        const payload = buildExamIncidentPayload(input.reasonCode, input.note);
        const when = timestamp();
        const updatedSession = appendExamIncidentHelpRequest(
          session,
          workstationId,
          payload,
          { id: uid("exam-incident"), createdAt: when },
        );
        const detail = updatedSession.events[0]?.detail || payload.reasonLabel;
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? updatedSession
                        : entry,
                    ),
                    updatedAt: when,
                  }
                : item,
            ),
            notifications: [
              {
                id: uid("notification"),
                title: `${workstationId} 考试异常求助`,
                detail,
                path: `/teacher/exams/${arrangementId}/stations/${workstationId}`,
                time: when.slice(-5),
                read: false,
                tone: "warning",
              },
              ...(current.notifications || []),
            ],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "学生提交考试异常求助",
            `${arrangement.name} / ${workstationId} / ${detail}`,
          );
          return next;
        });
        return when;
      },
      finishWorkstationSession(arrangementId, workstationId, options = {}) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        const exam = arrangement.type === "exam";
        const submitReason = exam
          ? options.reason === "time_expired"
            ? "time_expired"
            : "manual_submit"
          : "student_finished";
        if (
          exam &&
          submitReason === "time_expired" &&
          session.status === "已完成"
        )
          return { session, unfinishedCount: 0, idempotent: true };
        if (!["进行中", "已暂停"].includes(session.status))
          throw new Error("当前会话不能重复结束。");
        const endedAt = timestamp();
        const endedAtExact = new Date().toISOString();
        const unfinishedCount = session.steps.filter(
          (step) => step.state === "pending" || step.state === "active",
        ).length;
        const finishedSteps = session.steps.map((step) =>
          ["waiting", "active", "paused"].includes(step.executionState)
            ? {
                ...step,
                executionState: "closed",
                completionResult:
                  step.completionResult === "complete"
                    ? "complete"
                    : step.incompletePolicy === "teacher_review"
                      ? "uncertain"
                      : "not_completed",
                observationWindow: {
                  ...step.observationWindow,
                  status: "closed",
                  closedAt: endedAt,
                  closeReason: "Session结束",
                },
              }
            : step,
        );
        const runtime = normalizeSessionRuntime(session);
        const scoreEngine = calculateScoreEngine({ steps: finishedSteps });
        const updatedSession = {
          ...session,
          status: "已完成",
          currentStepId: "",
          endedAt,
          ...(exam
            ? {
                submitReason,
                submittedAt: endedAtExact,
                ...(submitReason === "time_expired"
                  ? { autoSubmittedAt: endedAtExact }
                  : {}),
                examTiming: transitionExamTiming(session, true, endedAtExact),
              }
            : {}),
          steps: finishedSteps,
          score:
            scoreEngine.scoreStatus === "pending"
              ? session.score
              : scoreEngine.effectiveScore,
          scoreEngine,
          runtime: {
            ...runtime,
            correctionContext:
              runtime.correctionContext.status === "active"
                ? {
                    ...runtime.correctionContext,
                    status: "closed",
                    completedAt: endedAt,
                    closeReason: "Session结束",
                  }
                : runtime.correctionContext,
            evaluationClock: {
              ...runtime.evaluationClock,
              status: "stopped",
              pauseReason: "",
            },
          },
          scoreVersion: Number(session.scoreVersion || 0) + 1,
          resultStatus: exam ? "待发布" : "正式成绩",
          reviewHistory: session.reviewHistory || [],
          recording: {
            ...session.recording,
            lastSegmentAt: endedAt,
          },
          events: [
            {
              id: uid("session-event"),
              type: exam
                ? submitReason === "time_expired"
                  ? "exam_auto_submitted"
                  : "exam_manual_submitted"
                : "student_finished",
              createdAt: endedAtExact,
              time: endedAt.slice(-5),
              level: unfinishedCount ? "warning" : "green",
              title: exam
                ? submitReason === "time_expired"
                  ? "考试时间到，系统自动交卷"
                  : "学生主动交卷"
                : "学生主动结束会话",
              detail:
                exam && submitReason === "time_expired"
                  ? `考试倒计时结束，系统已自动提交；${unfinishedCount} 个步骤未完成`
                  : unfinishedCount
                    ? `仍有 ${unfinishedCount} 个步骤未完成，已按当前记录生成结果`
                    : "全部步骤已完成，已生成个人结果",
              scoreImpact: "none",
            },
            ...(session.events || []),
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? updatedSession
                        : entry,
                    ),
                    updatedAt: endedAt,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            exam && submitReason === "time_expired"
              ? "考试超时自动交卷"
              : exam
                ? "学生主动交卷"
                : "学生结束工位会话",
            `${arrangement.name} / ${workstationId} / 未完成 ${unfinishedCount} 步`,
          );
          return next;
        });
        return { session: updatedSession, unfinishedCount };
      },
      endArrangement(id, note = "") {
        const arrangement = data.arrangements.find((item) => item.id === id);
        if (!arrangement || !["进行中", "已暂停"].includes(arrangement.status))
          throw new Error("只有进行中或已暂停的安排可以结束。");
        const status = arrangement.type === "exam" ? "待发布" : "已结束";
        const endedAt = timestamp();
        const endedAtExact = new Date().toISOString();
        const sessions = arrangement.sessions.map((session) =>
          session.status === "故障"
            ? session
            : (() => {
                const runtime = normalizeSessionRuntime(session);
                const wasActive = ["进行中", "已暂停"].includes(session.status);
                return {
                  ...session,
                  endedBy: "teacher",
                  endedAt,
                  submitReason: "teacher_end",
                  ...(arrangement.type === "exam" && wasActive
                    ? {
                        submittedAt: endedAtExact,
                        examTiming: transitionExamTiming(
                          session,
                          true,
                          endedAtExact,
                        ),
                      }
                    : {}),
                  resultStatus: ["待开始", "可入场"].includes(session.status)
                    ? "未参加"
                    : session.steps.some(
                          (step) =>
                            ["待复核", "待补充证据"].includes(
                              step.reviewStatus,
                            ) ||
                            ["pending", "retest_required"].includes(
                              step.scoreDisposition?.status || "normal",
                            ),
                        ) ||
                        (session.runtime?.safetyCandidates || []).some(
                          (candidate) => candidate.status === "pending",
                        )
                      ? "待复核"
                      : "正式成绩",
                  score: scoreOf(session.steps),
                  scoreVersion: Number(session.scoreVersion || 0) + 1,
                  reviewHistory: session.reviewHistory || [],
                  status: "待复位",
                  runtime: {
                    ...runtime,
                    evaluationClock: {
                      ...runtime.evaluationClock,
                      status: "stopped",
                      pauseReason: "教师结束整场安排",
                    },
                  },
                  events: [
                    {
                      id: uid("session-event"),
                      type: "teacher_ended_session",
                      source: "teacher",
                      createdAt: endedAtExact,
                      time: endedAt.slice(-5),
                      level: "info",
                      title:
                        arrangement.type === "exam"
                          ? "教师结束本次考试"
                          : "教师结束本次练习",
                      detail: note || "本次安排已由教师统一结束。",
                      scoreImpact: "none",
                    },
                    ...(session.events || []),
                  ],
                };
              })(),
        );
        const updated = {
          ...arrangement,
          status,
          paused: false,
          endedAt,
          endNote: note,
          sessions,
          updatedAt: endedAt,
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === id ? updated : item,
            ),
            workstations: current.workstations.map((item) =>
              arrangement.openWorkstationIds.includes(item.id) &&
              item.status !== "故障"
                ? { ...item, status: "待复位", updatedAt: timestamp() }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "结束安排",
            `${arrangement.name} / ${note || "无说明"}`,
          );
          return next;
        });
        return updated;
      },
      resetArrangementWorkstation(arrangementId, workstationId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("对应工位会话不存在或已失效。");
        if (session.status !== "待复位")
          throw new Error("当前工位不处于待复位状态。");
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? { ...entry, status: "已复位" }
                        : entry,
                    ),
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            workstations: current.workstations.map((item) =>
              item.id === workstationId
                ? {
                    ...item,
                    status: "可入场",
                    currentArrangement: "无",
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "确认工位复位",
            `${arrangement.name} / ${workstationId}`,
          );
          return next;
        });
        return "已复位";
      },
      saveDiagnosticRootCause(arrangementId, sessionId, stepId, input) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.id === sessionId,
        );
        const step = session?.steps.find((item) => item.id === stepId);
        if (!arrangement || !session || !step)
          throw new Error("对应 Session 或步骤不存在，请刷新后重试。");
        if (!DIAGNOSTIC_ROOT_CAUSES.includes(input.rootCause))
          throw new Error("请选择明确的根因分类。");
        const note = input.note?.trim();
        if (!note) throw new Error("请填写根因判断依据。");
        const when = timestamp();
        const updatedStep = {
          ...step,
          diagnostic: {
            ...step.diagnostic,
            rootCause: input.rootCause,
            rootCauseNote: note,
            confirmedAt: when,
            confirmedBy: "admin",
          },
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.id === sessionId
                        ? {
                            ...entry,
                            steps: entry.steps.map((entryStep) =>
                              entryStep.id === stepId ? updatedStep : entryStep,
                            ),
                          }
                        : entry,
                    ),
                    updatedAt: when,
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "确认未触发根因",
            `${arrangement.name} / ${session.id} / ${stepId} / ${input.rootCause}`,
            "成功",
            {
              reason: note,
              sopId: arrangement.snapshot?.sopId || arrangement.sopId,
              snapshotLockedAt: arrangement.snapshot?.lockedAt || "未锁定",
              evidence: step.evidenceSources || [],
            },
          );
          return next;
        });
        return updatedStep;
      },
      reviewSessionStep(arrangementId, sessionId, stepId, input) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.id === sessionId,
        );
        const step = session?.steps.find((item) => item.id === stepId);
        if (!arrangement || !session || !step)
          throw new Error("对应评价记录或步骤不存在。");
        const note = input.note?.trim();
        if (!note) throw new Error("复核依据与说明不能为空或只包含空格。");
        if (!input.archiveEvidence)
          throw new Error("请至少归档当前步骤证据后再保存复核结论。");
        if (!input.conclusion) throw new Error("请选择明确的人工复核结论。");
        const before = Number(step.effectiveScore ?? step.rawScore ?? 0);
        const after =
          input.conclusion === "pass"
            ? Number(step.maxScore || 0)
            : Number(step.rawScore ?? 0);
        const reviewStatus =
          input.conclusion === "insufficient"
            ? "待补充证据"
            : input.conclusion === "pass"
              ? "复核通过"
              : "已确认扣分";
        const updatedSteps = session.steps.map((item) =>
          item.id === stepId
            ? {
                ...item,
                effectiveScore: after,
                score: after,
                result:
                  input.conclusion === "pass"
                    ? "人工确认通过"
                    : input.conclusion === "fail"
                      ? "人工确认未完成"
                      : "等待补充证据",
                reviewStatus,
                reviewNote: note,
                reviewedAt: timestamp(),
                reviewer: "王老师",
                evidenceArchived: true,
                scoreDisposition:
                  item.scoreDisposition?.status === "pending" &&
                  input.conclusion !== "insufficient"
                    ? {
                        status: "teacher_resolved",
                        reason: note,
                        resolvedBy: "王老师",
                        resolvedAt: timestamp(),
                      }
                    : item.scoreDisposition,
              }
            : item,
        );
        const pending =
          updatedSteps.some((item) =>
            ["待复核", "待补充证据"].includes(item.reviewStatus),
          ) ||
          updatedSteps.some((item) =>
            ["pending", "retest_required"].includes(
              item.scoreDisposition?.status || "normal",
            ),
          );
        const scoreEngine = calculateScoreEngine({ steps: updatedSteps });
        const updatedSession = {
          ...session,
          steps: updatedSteps,
          score: scoreEngine.effectiveScore,
          scoreEngine,
          scoreVersion: Number(session.scoreVersion || 0) + 1,
          resultStatus: pending ? "待复核" : "正式成绩",
          reviewHistory: [
            ...(session.reviewHistory || []),
            {
              time: timestamp(),
              operator: "王老师",
              action: reviewStatus,
              stepId,
              before,
              after,
              reason: note,
              evidence: step.evidenceSources || [],
            },
          ],
        };
        setData((current) => {
          const student = current.students.find(
            (item) => item.id === session.studentId,
          );
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.id === sessionId ? updatedSession : entry,
                    ),
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            learningSamples:
              input.returnToLearning && input.conclusion !== "insufficient"
                ? [
                    {
                      id: uid("sample"),
                      sopId: arrangement.sopId,
                      source: arrangement.name,
                      student: student?.name || "学生已失效",
                      fileName: `${session.id}-${stepId.replace(" ", "-")}.mp4`,
                      timeRange: step.timeRange,
                      aiPrediction: `${stepId} · 待重新推理`,
                      reason: `教师复核：${note}`,
                      label: stepId,
                      status: "待加工",
                      sourceType: "difficult_sample_candidate",
                      sourceSessionId: session.id,
                      sourceStepId: stepId,
                      note: "由正式评价复核形成困难样本候选，需先进入数据生产链",
                      createdAt: timestamp(),
                    },
                    ...current.learningSamples,
                  ]
                : current.learningSamples,
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "复核步骤评价",
            `${arrangement.name} / ${session.id} / ${stepId} / ${before}→${after}`,
          );
          return next;
        });
        return updatedSession;
      },
      adjustSessionStepScore(arrangementId, sessionId, stepId, input) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.id === sessionId,
        );
        const step = session?.steps.find((item) => item.id === stepId);
        if (!arrangement || !session || !step)
          throw new Error("对应评价记录或步骤不存在。");
        const reason = input.reason?.trim();
        const score = Number(input.score);
        if (!reason) throw new Error("修改原因不能为空或只包含空格。");
        if (!Number.isFinite(score) || score < 0 || score > step.maxScore)
          throw new Error(`步骤得分必须在 0–${step.maxScore} 分之间。`);
        const before = Number(step.effectiveScore ?? step.rawScore ?? 0);
        const updatedSteps = session.steps.map((item) =>
          item.id === stepId
            ? {
                ...item,
                effectiveScore: score,
                score,
                result: score === step.maxScore ? "人工确认通过" : "人工调整",
                reviewStatus: "人工调整",
                reviewNote: reason,
                reviewedAt: timestamp(),
                reviewer: "王老师",
              }
            : item,
        );
        const pending = updatedSteps.some((item) =>
          ["待复核", "待补充证据"].includes(item.reviewStatus),
        );
        const updatedSession = {
          ...session,
          steps: updatedSteps,
          score: scoreOf(updatedSteps),
          scoreVersion: Number(session.scoreVersion || 0) + 1,
          resultStatus: pending ? "待复核" : "正式成绩",
          reviewHistory: [
            ...(session.reviewHistory || []),
            {
              time: timestamp(),
              operator: "王老师",
              action: "人工调整步骤分",
              stepId,
              before,
              after: score,
              reason,
              evidence: step.evidenceSources || [],
            },
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.id === sessionId ? updatedSession : entry,
                    ),
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "调整步骤得分",
            `${arrangement.name} / ${session.id} / ${stepId} / ${before}→${score}`,
          );
          return next;
        });
        return updatedSession;
      },
      publishExamResults(arrangementId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        if (!arrangement || arrangement.type !== "exam")
          throw new Error("对应考试不存在或已失效。");
        if (arrangement.status !== "待发布")
          throw new Error("只有待发布考试可以统一发布成绩。");
        if (!arrangement.sessions.length)
          throw new Error("没有任何学生会话记录，不能发布成绩。");
        const blockers = getPublishBlockers(arrangement.sessions);
        if (blockers.length)
          throw new Error(`还有 ${blockers.length} 条成绩未完成复核。`);
        const updated = {
          ...arrangement,
          status: "已发布",
          publishedAt: timestamp(),
          publishedBy: "王老师",
          sessions: arrangement.sessions.map((session) =>
            session.resultStatus === "未参加"
              ? session
              : {
                  ...session,
                  resultStatus: "已发布",
                  scoreFrozen: true,
                  frozenAt: timestamp(),
                },
          ),
          updatedAt: timestamp(),
        };
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "发布考试成绩",
            `${arrangement.name} / ${updated.sessions.filter((item) => item.resultStatus === "已发布").length} 人`,
          );
          return next;
        });
        return updated;
      },
      createExportJob(input) {
        const created = {
          id: uid("export"),
          scope: input.scope,
          targetId: input.targetId,
          fileName: input.fileName,
          format: input.format,
          scoreVersion: input.scoreVersion || "当前有效版本",
          status: "可下载",
          createdAt: timestamp(),
          expiresAt: "生成后 7 天",
        };
        setData((current) => {
          const next = {
            ...current,
            exportJobs: [created, ...(current.exportJobs || [])],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "生成导出文件",
            `${created.fileName} / ${created.scope}`,
          );
          return next;
        });
        return created;
      },
      recordAuditAccess(action, target, details = {}) {
        setData((current) => {
          const next = { ...current, auditLogs: [...current.auditLogs] };
          addAuditLog(next, action, target, "成功", details);
          return next;
        });
      },
      saveSystemSettings(input) {
        const nextValues = validateSystemSettings(input);
        const before = data.systemSettings.current;
        setData((current) => {
          const next = {
            ...current,
            systemSettings: {
              ...current.systemSettings,
              pending: nextValues,
              updatedAt: timestamp(),
              updatedBy: "admin",
            },
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "保存运行配置", "系统运行配置", "成功", {
            before,
            after: nextValues,
            reason: "运行中安排存在，配置进入待生效状态",
            businessVersion: "运行配置 V2.1（待生效）",
          });
          return next;
        });
        return nextValues;
      },
      addIssueNote(issueId, input) {
        const note = input.note?.trim();
        if (!note) throw new Error("处理说明不能为空或只包含空格。");
        const issue = data.issues.find((item) => item.id === issueId);
        if (!issue) throw new Error("异常记录不存在或已失效。");
        const updated = {
          ...issue,
          owner: input.owner?.trim() || issue.owner,
          handlingStatus: issue.status === "已关闭" ? "已处理" : "处理中",
          updatedAt: timestamp(),
          timeline: [
            ...issue.timeline,
            {
              time: timestamp().slice(11),
              tone: "normal",
              title: "追加处置说明",
              detail: note,
              actor: "admin",
            },
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            issues: current.issues.map((item) =>
              item.id === issueId ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "更新异常处置",
            `${issue.code} / ${issue.title}`,
            "成功",
            {
              reason: note,
              before: { owner: issue.owner, status: issue.handlingStatus },
              after: { owner: updated.owner, status: updated.handlingStatus },
              evidence: [issue.nodeId, ...issue.sessionIds],
            },
          );
          return next;
        });
        return updated;
      },
      verifyIssueTechnical(issueId) {
        const issue = data.issues.find((item) => item.id === issueId);
        if (!issue || issue.status === "已关闭")
          throw new Error("当前异常不可执行技术复查。");
        const checkDetail = issue.nodeId.startsWith("EDGE")
          ? "GPU 72°C；推理服务连续自检 3 次通过"
          : "存储剩余空间 16.8%；连续写入与校验检查通过";
        const updated = {
          ...issue,
          handlingStatus: "处理中",
          technicalCheck: {
            status: "已通过",
            detail: checkDetail,
          },
          updatedAt: timestamp(),
          timeline: [
            ...issue.timeline,
            {
              time: timestamp().slice(11),
              tone: "normal",
              title: "技术复查通过",
              detail: `${checkDetail}。`,
              actor: "陈工",
            },
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            issues: current.issues.map((item) =>
              item.id === issueId ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "异常技术复查",
            `${issue.code} / ${issue.nodeId}`,
            "成功",
            {
              before: issue.technicalCheck,
              after: updated.technicalCheck,
              evidence: ["EDGE-001 自检记录"],
            },
          );
          return next;
        });
        return updated;
      },
      confirmIssueBusiness(issueId) {
        const issue = data.issues.find((item) => item.id === issueId);
        if (!issue || issue.status === "已关闭")
          throw new Error("当前异常不可执行现场确认。");
        const updated = {
          ...issue,
          handlingStatus: "处理中",
          businessCheck: {
            status: "已确认",
            detail: "王老师确认学生已停止操作、设备断电且区域安全",
          },
          updatedAt: timestamp(),
          timeline: [
            ...issue.timeline,
            {
              time: timestamp().slice(11),
              tone: "normal",
              title: "现场安全已确认",
              detail: "教师确认学生、设备与操作区域均满足恢复前置条件。",
              actor: "王老师",
            },
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            issues: current.issues.map((item) =>
              item.id === issueId ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "异常业务确认",
            `${issue.code} / 现场安全`,
            "成功",
            {
              before: issue.businessCheck,
              after: updated.businessCheck,
              evidence: issue.sessionIds,
            },
          );
          return next;
        });
        return updated;
      },
      closeIssue(issueId) {
        const issue = data.issues.find((item) => item.id === issueId);
        if (!issue || issue.status === "已关闭")
          throw new Error("当前异常已经关闭或不存在。");
        if (!canCloseIssue(issue))
          throw new Error("技术复查和现场业务确认尚未全部完成，不能关闭异常。");
        const updated = {
          ...issue,
          status: "已关闭",
          handlingStatus: "已处理",
          updatedAt: timestamp(),
          timeline: [
            ...issue.timeline,
            {
              time: timestamp().slice(11),
              tone: "normal",
              title: "异常关闭，评价仍保持暂停",
              detail: "技术与现场条件均已满足；由教师决定是否恢复学生会话。",
              actor: "admin",
            },
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            issues: current.issues.map((item) =>
              item.id === issueId ? updated : item,
            ),
            workstations: current.workstations.map((item) =>
              issue.workstationIds.includes(item.id)
                ? {
                    ...item,
                    status: "可入场",
                    notes: "技术故障已恢复，等待教师恢复会话",
                    updatedAt: timestamp(),
                  }
                : item,
            ),
            arrangements: current.arrangements.map((arrangement) =>
              arrangement.id === issue.arrangementId
                ? {
                    ...arrangement,
                    sessions: arrangement.sessions.map((session) =>
                      issue.sessionIds.includes(session.id)
                        ? {
                            ...session,
                            status: "已暂停",
                            events: [
                              ...session.events,
                              {
                                time: timestamp().slice(11),
                                level: "green",
                                title: "技术故障已恢复",
                                detail: "会话保持暂停，等待教师确认恢复评价",
                              },
                            ],
                          }
                        : session,
                    ),
                  }
                : arrangement,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "关闭系统异常",
            `${issue.code} / ${issue.title}`,
            "成功",
            {
              before: { status: issue.status },
              after: { status: "已关闭", sessionStatus: "已暂停" },
              reason: "技术复查和现场确认均完成",
              evidence: [issue.nodeId, ...issue.sessionIds],
            },
          );
          return next;
        });
        return updated;
      },
      reopenIssue(issueId, reason) {
        const issue = data.issues.find((item) => item.id === issueId);
        const cleanReason = reason?.trim();
        if (!issue || issue.status !== "已关闭")
          throw new Error("只有已关闭异常可以重开。");
        if (!cleanReason) throw new Error("请填写重开原因。");
        const updated = {
          ...issue,
          status: "持续中",
          handlingStatus: "处理中",
          technicalCheck: { ...issue.technicalCheck, status: "待验证" },
          updatedAt: timestamp(),
          timeline: [
            ...issue.timeline,
            {
              time: timestamp().slice(11),
              tone: "danger",
              title: "异常重新打开",
              detail: cleanReason,
              actor: "admin",
            },
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            issues: current.issues.map((item) =>
              item.id === issueId ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "重开系统异常",
            `${issue.code} / ${issue.title}`,
            "成功",
            {
              before: { status: "已关闭" },
              after: { status: "持续中" },
              reason: cleanReason,
            },
          );
          return next;
        });
        return updated;
      },
      retryBackup(backupId) {
        const backup = data.backups.find((item) => item.id === backupId);
        if (!backup || backup.status !== "失败")
          throw new Error("只有失败备份可以重试。");
        const created = {
          id: uid("backup"),
          createdAt: timestamp(),
          scope: backup.scope,
          status: "成功",
          size: "1.29 TB",
          checksum: "SHA256 · 31af…091d",
          verification: "通过",
          storage: backup.storage,
          expiresAt: "生成后 30 天",
          failureReason: "",
          retryOf: backup.id,
        };
        setData((current) => {
          const next = {
            ...current,
            backups: [created, ...current.backups],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "重试备份",
            `${backup.createdAt} / ${backup.scope}`,
            "成功",
            {
              before: {
                status: backup.status,
                failureReason: backup.failureReason,
              },
              after: { status: created.status, checksum: created.checksum },
              reason: "空间清理后人工重试",
            },
          );
          return next;
        });
        return created;
      },
      markNotificationRead(notificationId) {
        setData((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === notificationId ? { ...item, read: true } : item,
          ),
        }));
      },
      markAllNotificationsRead() {
        setData((current) => ({
          ...current,
          notifications: current.notifications.map((item) => ({
            ...item,
            read: true,
          })),
        }));
      },
      resetDemoData() {
        setData(cloneSeed());
      },
    };
  }, [data]);

  return (
    <PrototypeDataContext.Provider value={value}>
      {children}
    </PrototypeDataContext.Provider>
  );
}

export function usePrototypeData() {
  const context = useContext(PrototypeDataContext);
  if (!context)
    throw new Error(
      "usePrototypeData must be used inside PrototypeDataProvider",
    );
  return context;
}

export const classMajors = [
  "新能源汽车技术",
  "机电一体化",
  "工业机器人技术",
  "数控技术",
];
export const departments = ["新能源车辆学院", "智能制造学院", "机电工程学院"];
export const deviceTypes = [
  "边缘工作站",
  "全景摄像头",
  "细节摄像头",
  "定向麦克风",
];
