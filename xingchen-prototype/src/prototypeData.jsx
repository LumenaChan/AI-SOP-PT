import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  applyDefaultPassPolicy,
  automaticEvaluationGate,
  canCloseIssue,
  createSessionStepsFromSop,
  DIAGNOSTIC_ROOT_CAUSES,
  diagnoseNoTrigger,
  FIELD_VALIDATION_SCENARIOS,
  getSopAiEvaluationStatus as calculateSopAiEvaluationStatus,
  getPublishBlockers,
  normalizeSopStep,
  recordModelValidationResult,
  requiresMandatoryReview,
  scoreOf,
  validateSystemSettings,
} from "./domainRules.js";

const STORAGE_KEY = "xingchen-prototype-data-v13";
const LEGACY_STORAGE_KEYS = [
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
  const automaticEvaluationEnabled =
    lockedProfile?.automaticEvaluationEnabled ?? gate.enabled;
  const lockedRoiVersion =
    lockedProfile?.roiVersion || workstation?.implementation?.roiVersion;
  const lockedCameraConfigVersion =
    lockedProfile?.cameraConfigVersion ||
    workstation?.implementation?.cameraConfigVersion;
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
          : ["主视角", "辅助视角"],
    sopVersion: arrangement.snapshot?.sopVersion || "未锁定",
    modelVersion: arrangement.snapshot?.modelVersion || "未启用",
    roiVersion: lockedRoiVersion || "未配置",
    cameraConfigVersion: lockedCameraConfigVersion || "未配置",
    systemAnomaly: Boolean(incident),
    scoringPolicy: incident
      ? step.result === "安全阻断" || step.redlineConfirmed
        ? "录像缺失不追加扣分；已确认安全红线仍保持阻断并进入强制复核"
        : "系统异常不产生学生扣分，按默认通过规则处理"
      : "按当前 SOP 判定方式处理",
  };
  const checks = {
    configComplete:
      step.judgementMode !== "visual_auto" || automaticEvaluationEnabled,
    objectVisible: pending
      ? false
      : !/未看到|丢失/.test(step.observation || ""),
    actionSufficient: ["pass", "blocked"].includes(step.state),
    roiMatched: lockedProfile
      ? lockedRoiVersion !== "未配置" &&
        lockedCameraConfigVersion !== "未配置"
      : Boolean(workstation?.implementation?.roiVersion) &&
        workstation?.implementation?.cameraPosition === "已确认",
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

const seedData = {
  version: 13,
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
      face: "待更新",
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
      face: "已采集",
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
      versionMismatchAlertEnabled: true,
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
  next.version = seedData.version;
  next.workstations = (next.workstations || []).map((workstation) => ({
    ...workstation,
    implementation: {
      ...defaultWorkstationImplementation(workstation),
      ...(workstation.implementation || {}),
      rois:
        workstation.implementation?.rois ||
        defaultWorkstationImplementation(workstation).rois,
    },
  }));
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
      ...currentSettings,
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
          ...pendingSettings,
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
      (/机器人/.test(sop.name) ? "工业机器人技术" : /数控/.test(sop.name) ? "数控技术" : "新能源汽车技术"),
    course: sop.course || sop.operation || "专业实训课程",
    steps: (sop.steps || []).map(normalizeSopStep),
  }));
  const usedIdsByFamily = new Map();
  for (const sop of normalizedSops) {
    const familyKey = sop.familyId || sop.id;
    const usedIds = usedIdsByFamily.get(familyKey) || new Set();
    for (const id of sop.usedStepIds || []) usedIds.add(id);
    for (const step of sop.steps || []) usedIds.add(step.id);
    usedIdsByFamily.set(familyKey, usedIds);
  }
  next.sops = normalizedSops.map((sop) => ({
    ...sop,
    usedStepIds: [
      ...(usedIdsByFamily.get(sop.familyId || sop.id) || new Set()),
    ],
  }));
  next.arrangements = (next.arrangements || []).map((arrangement) => {
    const sop = next.sops.find((item) => item.id === arrangement.sopId);
    const sessions = (arrangement.sessions || []).map((session) => {
      const workstation = next.workstations.find(
        (item) => item.id === session.workstationId,
      );
      const model = next.models?.find(
        (item) => item.sopId === sop?.id && item.status === "已部署",
      );
      const validation = (next.fieldValidations || []).find(
        (item) =>
          item.workstationId === session.workstationId &&
          item.sopId === sop?.id &&
          item.sopVersion === sop?.version,
      );
      const gate = automaticEvaluationGate({
        workstation,
        sop,
        model,
        validation,
      });
      const recording = defaultSessionRecording(
        session,
        arrangement,
        next.systemSettings.current,
      );
      const evaluationProfile = session.evaluationProfile || {
        automaticEvaluationEnabled: gate.enabled,
        enabledStepCount: gate.enabledStepCount,
        automaticStepCount: gate.automaticStepCount,
        roiVersion: workstation?.implementation?.roiVersion || "未配置",
        cameraConfigVersion:
          workstation?.implementation?.cameraConfigVersion || "未配置",
        validationId: validation?.id || "未验证",
        validationStatus: validation?.status || "未验证",
        fallbackPolicy: "未启用步骤默认通过，教师发现问题后留痕扣分",
      };
      const sessionWithProfile = { ...session, evaluationProfile };
      const normalizedSteps = (session.steps || []).map((step, index) => {
        const sopStep = sop?.steps.find((item) => item.id === step.id);
        return applyDefaultPassPolicy({ ...sopStep, ...step }, index);
      });
      const stateNormalizedSteps = normalizedSteps.map((step) =>
        session.status === "进行中" &&
        step.id === session.currentStepId &&
        step.state === "pending"
          ? {
              ...step,
              state: "active",
              result: "进行中",
              duration: "00:00",
              observation: "已进入当前步骤，等待连续动作判定",
            }
          : step,
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
      return {
        ...session,
        steps,
        recording,
        score: session.resultStatus === "未参加" ? 0 : scoreOf(steps),
        resultStatus: wasDefaultPassOnly ? "正式成绩" : session.resultStatus,
        evaluationProfile,
        events: (session.events || []).map((event) =>
          wasDefaultPassOnly && event.title?.includes("证据不足")
            ? {
                ...event,
                level: "warning",
                title: event.title.replace("证据不足", "默认通过·建议抽查"),
                detail: "视频证据不足，已按 SOP 评分策略给满分，建议教师抽查。",
              }
            : event,
        ),
      };
    });
    return { ...arrangement, sessions };
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

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
  if (!legacy || ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(legacy.version))
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
    [5, 6, 7, 8, 9, 10, 11, 12].includes(legacy.version) &&
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
  if ([4, 5, 6, 7, 8, 9, 10, 11, 12].includes(legacy.version)) {
    for (const key of ["sops", "datasets", "models", "learningSamples"]) {
      if (legacy[key]?.length) next[key] = legacy[key];
    }
  }
  if (legacy.version === 12) {
    next.datasets = next.datasets.map((item) =>
      item.basedOn && item.status === "待审核"
        ? { ...item, status: "采集中" }
        : item,
    );
  }
  if (
    [5, 6, 7, 8, 9, 10, 11, 12].includes(legacy.version) &&
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
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (parsed?.version === seedData.version)
      return normalizePrototypeData(parsed);
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = JSON.parse(window.localStorage.getItem(key));
      if (legacy) return mergeLegacy(legacy);
    }
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        const created = {
          ...input,
          id: uid("student"),
          no,
          name: input.name.trim(),
          status: "启用",
          face: input.face || "未采集",
          updatedAt: timestamp(),
        };
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
        const updated = {
          ...existing,
          ...input,
          no,
          name: input.name.trim(),
          updatedAt: timestamp(),
        };
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
        setData((current) => {
          const next = {
            ...current,
            students: current.students.map((item) =>
              item.id === id
                ? { ...item, face: "待重采", updatedAt: timestamp() }
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
        const when = timestamp();
        const implementation = {
          ...existing.implementation,
          ...input,
          cameraConfigVersion: input.cameraConfigVersion.trim(),
          roiVersion: input.roiVersion.trim(),
          note: input.note?.trim() || "",
          updatedAt: when,
          updatedBy: "admin",
        };
        setData((current) => {
          const next = {
            ...current,
            workstations: current.workstations.map((item) =>
              item.id === id
                ? { ...item, implementation, updatedAt: when }
                : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "保存工位实施检查",
            `${existing.name} / ${implementation.roiVersion} / ${implementation.cameraConfigVersion}`,
          );
          return next;
        });
        return implementation;
      },
      saveFieldValidation(input) {
        const workstation = data.workstations.find(
          (item) => item.id === input.workstationId,
        );
        const sop = data.sops.find((item) => item.id === input.sopId);
        if (!workstation || !sop)
          throw new Error("工位或 SOP 版本不存在，请刷新后重试。");
        const tests = FIELD_VALIDATION_SCENARIOS.map(([key, label]) => {
          const item = input.tests?.find((test) => test.key === key);
          if (!item?.result) throw new Error(`请选择“${label}”的测试结果。`);
          if (item.result === "失败" && !item.note?.trim())
            throw new Error(`“${label}”失败时必须填写说明。`);
          return {
            key,
            label,
            result: item.result,
            note: item.note?.trim() || "",
          };
        });
        const model = data.models.find(
          (item) => item.sopId === sop.id && item.status === "已部署",
        );
        const status = tests.some((item) => item.result === "失败")
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
          status,
          operator: input.operator?.trim() || "admin",
          createdAt: when,
          note: input.note?.trim() || "",
          tests,
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
        const workstation = data.workstations.find(
          (item) => item.id === workstationId,
        );
        const sop = data.sops.find((item) => item.id === sopId);
        const model = data.models.find(
          (item) => item.sopId === sopId && item.status === "已部署",
        );
        const validation = (data.fieldValidations || []).find(
          (item) =>
            item.workstationId === workstationId &&
            item.sopId === sopId &&
            item.sopVersion === sop?.version,
        );
        return automaticEvaluationGate({ workstation, sop, model, validation });
      },
      getSopAiEvaluationStatus(sopId, options = {}) {
        const sop = data.sops.find((item) => item.id === sopId);
        return calculateSopAiEvaluationStatus({
          sop,
          datasets: data.datasets,
          models: data.models,
          workstations: data.workstations,
          fieldValidations: data.fieldValidations,
          targetWorkstationIds: options.targetWorkstationIds,
        });
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
        setData((current) => {
          const next = {
            ...current,
            devices: current.devices.map((item) =>
              item.id === id ? updated : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "编辑设备", `${updated.name} / ${updated.type}`);
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
        const created = {
          ...input,
          id: uid("sop"),
          familyId: input.familyId || uid("sop-family"),
          name: input.name.trim(),
          owner: input.owner || "王老师",
          version: input.version || "V1.0",
          status: "草稿",
          frozen: false,
          signedBy: "",
          publishedAt: "",
          updatedAt: timestamp(),
          history: input.history || [],
          steps,
          usedStepIds: collectUsedStepIds(input.usedStepIds, steps),
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
        if (existing.frozen || existing.status === "已发布")
          throw new Error("已发布版本已冻结，请创建新版本后再修改。");
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
        if (existing.frozen) throw new Error("当前版本已经冻结发布。");
        if (!signature?.trim()) throw new Error("请填写专业教师签名。");
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
          usedStepIds: collectUsedStepIds(
            existing.usedStepIds,
            existing.steps,
            input.usedStepIds,
            input.steps,
          ),
          history: [
            {
              version: input.version,
              status: "已发布",
              time: timestamp(),
              actor: signature.trim(),
              note: "教师完成校验、签名并冻结发布",
            },
            ...(existing.history || []),
          ],
        };
        setData((current) => {
          const next = {
            ...current,
            sops: current.sops.map((item) =>
              item.id === id ? published : item,
            ),
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "发布并冻结 SOP",
            `${published.name} / ${published.version}`,
          );
          return next;
        });
        return published;
      },
      createSopVersion(id) {
        const existing = data.sops.find((item) => item.id === id);
        if (!existing) throw new Error("SOP 不存在或已失效。");
        const match = String(existing.version).match(/V(\d+)\.(\d+)/);
        const version = match ? `V${match[1]}.${Number(match[2]) + 1}` : "V1.1";
        const created = {
          ...JSON.parse(JSON.stringify(existing)),
          id: uid("sop"),
          version,
          status: "草稿",
          frozen: false,
          basedOn: `${existing.id} / ${existing.version}`,
          signedBy: "",
          publishedAt: "",
          updatedAt: timestamp(),
          history: [...(existing.history || [])],
          usedStepIds: collectUsedStepIds(
            existing.usedStepIds,
            existing.steps,
          ),
        };
        setData((current) => {
          const next = {
            ...current,
            sops: [created, ...current.sops],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(
            next,
            "创建 SOP 新版本",
            `${created.name} / ${created.version}`,
          );
          return next;
        });
        return created;
      },
      copySop(id, name) {
        const existing = data.sops.find((item) => item.id === id);
        if (!existing) throw new Error("SOP 不存在或已失效。");
        if (!name?.trim()) throw new Error("请填写副本名称。");
        const created = {
          ...JSON.parse(JSON.stringify(existing)),
          id: uid("sop"),
          familyId: uid("sop-family"),
          name: name.trim(),
          version: "V1.0",
          status: "草稿",
          frozen: false,
          basedOn: `${existing.id} / ${existing.version}`,
          signedBy: "",
          publishedAt: "",
          updatedAt: timestamp(),
          history: [],
          usedStepIds: collectUsedStepIds(existing.steps),
        };
        setData((current) => {
          const next = {
            ...current,
            sops: [created, ...current.sops],
            auditLogs: [...current.auditLogs],
          };
          addAuditLog(next, "复制 SOP", `${created.name} / V1.0`);
          return next;
        });
        return created;
      },
      startAiAdaptation(sopId) {
        const sop = data.sops.find((item) => item.id === sopId);
        if (!sop) throw new Error("SOP 不存在或已失效。");
        if (sop.status !== "已发布")
          throw new Error("只有已发布的 SOP 才能开始 AI 适配。");
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
      reviewLearningSample(id, decision, label, note = "") {
        const sample = data.learningSamples.find((item) => item.id === id);
        if (!sample) throw new Error("样本不存在或已失效。");
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
                    targetDataset:
                      decision === "accept" ? targetDataset : "",
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
          throw new Error("只有已发布的 SOP 才能创建模型候选版本。");
        const dataset = data.datasets.find(
          (item) =>
            item.sopId === sopId && (!datasetId || item.id === datasetId),
        );
        if (!dataset) throw new Error("请先创建 Dataset。");
        if (dataset.status !== "已锁定")
          throw new Error("Dataset 锁定后才能创建模型候选版本。");
        const existingCandidate = data.models.find(
          (item) =>
            item.sopId === sopId &&
            item.datasetVersion === dataset.version &&
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
          name: `${sop.name}动作模型`,
          version,
          status: "待训练",
          datasetVersion: dataset.version,
          sopVersion: sop.version,
          progress: 0,
          f1: "待评测",
          sequenceAccuracy: "待评测",
          otherRecall: "待评测",
          evaluatedAt: "待训练",
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
            "创建模型候选版本",
            `${sop.name} ${sop.version} / ${dataset.version} / ${version}`,
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
        if (!previous)
          throw new Error("当前没有可恢复的上一生产模型版本。");
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
        const sop = data.sops.find((item) => item.id === input.sopId);
        if (!sop || sop.status !== "已发布")
          throw new Error("只能选择已发布的 SOP 版本。");
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
        const sop = data.sops.find((item) => item.id === arrangement?.sopId);
        const model = data.models.find(
          (item) => item.sopId === sop?.id && item.status === "已部署",
        );
        const validation = (data.fieldValidations || []).find(
          (item) =>
            item.workstationId === workstationId &&
            item.sopId === sop?.id &&
            item.sopVersion === sop?.version,
        );
        const gate = automaticEvaluationGate({
          workstation,
          sop,
          model,
          validation,
        });
        warnings.push(...gate.reasons);
        return {
          ok: errors.length === 0,
          errors,
          warnings: [...new Set(warnings)],
          gate,
          checks: [
            "边缘节点在线",
            "主视角清晰",
            "辅助视角清晰",
            "本地缓存可写",
          ],
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
        if (!checklist || Object.values(checklist).some((value) => !value))
          throw new Error("请逐项确认主辅画面、设备状态和本地缓存。");
        const sop = data.sops.find((item) => item.id === arrangement.sopId);
        const dataset = data.datasets.find(
          (item) => item.sopId === sop.id && item.status === "已锁定",
        );
        const model = data.models.find(
          (item) => item.sopId === sop.id && item.status === "已部署",
        );
        const snapshot = arrangement.snapshot || {
          lockedAt: timestamp(),
          sopVersion: sop.version,
          datasetVersion: dataset?.version || "未绑定",
          modelVersion: model?.version || "未启用",
        };
        const workstation = data.workstations.find(
          (item) => item.id === workstationId,
        );
        const validation = (data.fieldValidations || []).find(
          (item) =>
            item.workstationId === workstationId &&
            item.sopId === sop.id &&
            item.sopVersion === sop.version,
        );
        const evaluationProfile = {
          automaticEvaluationEnabled: readiness.gate.enabled,
          enabledStepCount: readiness.gate.enabledStepCount,
          automaticStepCount: readiness.gate.automaticStepCount,
          roiVersion: workstation?.implementation?.roiVersion || "未配置",
          cameraConfigVersion:
            workstation?.implementation?.cameraConfigVersion || "未配置",
          validationId: validation?.id || "未验证",
          validationStatus: validation?.status || "未验证",
          fallbackPolicy: "未启用步骤默认通过，教师发现问题后留痕扣分",
        };
        const assigned = new Set(
          arrangement.sessions.map((session) => session.studentId),
        );
        const studentId =
          arrangement.studentIds.find((id) => !assigned.has(id)) ||
          arrangement.studentIds[0];
        const session = {
          id: uid("session"),
          workstationId,
          studentId,
          status: "可入场",
          elapsed: "00:00:00",
          currentStepId: "",
          score: 0,
          evaluationProfile,
          recording: defaultSessionRecording(
            { id: "new-session", status: "可入场" },
            arrangement,
            data.systemSettings.current,
          ),
          steps: createSessionStepsFromSop(sop.steps),
          events: [
            {
              time: timestamp().slice(-5),
              level: "blue",
              title: "工位检查通过",
              detail: readiness.gate.enabled
                ? `锁定 SOP ${snapshot.sopVersion} 与本次AI能力快照，自动评价已启用`
                : `锁定 SOP ${snapshot.sopVersion}，自动评价降级为默认通过`,
            },
          ],
        };
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
            arrangement.snapshot ? "新增开放工位" : "锁定版本并开放工位",
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
        const sessions = arrangement.sessions.map((session, index) => {
          const firstStep =
            session.steps.find((step) => step.state === "pending") ||
            session.steps[0];
          return session.status === "可入场" && index === 0
            ? {
                ...session,
                status: "进行中",
                currentStepId: firstStep?.id || "",
                steps: session.steps.map((step) =>
                  step.id === firstStep?.id
                    ? {
                        ...step,
                        state: "active",
                        result: "进行中",
                        duration: "00:00",
                        observation: "已进入当前步骤，等待连续动作判定",
                      }
                    : step,
                ),
                events: [
                  {
                    time: timestamp().slice(-5),
                    level: "green",
                    title: "学生已入场",
                    detail: "会话计时与自动评价已开始",
                  },
                  ...session.events,
                ],
              }
            : session.status === "可入场"
              ? { ...session, status: "待开始" }
              : session;
        });
        const updated = {
          ...arrangement,
          status: "进行中",
          paused: false,
          startedAt: arrangement.startedAt || timestamp(),
          sessions,
          updatedAt: timestamp(),
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
                    updatedAt: timestamp(),
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
        const updated = {
          ...arrangement,
          status: paused ? "已暂停" : "进行中",
          paused,
          sessions: arrangement.sessions.map((session) =>
            paused && session.status === "进行中"
              ? { ...session, status: "已暂停" }
              : !paused && session.status === "已暂停"
                ? { ...session, status: "进行中" }
                : session,
          ),
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
        setData((current) => {
          const next = {
            ...current,
            arrangements: current.arrangements.map((item) =>
              item.id === arrangementId
                ? {
                    ...item,
                    sessions: item.sessions.map((entry) =>
                      entry.workstationId === workstationId
                        ? { ...entry, status }
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
        const firstStep = session.steps.find(
          (step) => step.state === "pending",
        );
        const startedAt = timestamp();
        const updatedSession = {
          ...session,
          status: "进行中",
          currentStepId: firstStep?.id || session.steps[0]?.id || "",
          steps: session.steps.map((step) =>
            step.id === firstStep?.id
              ? {
                  ...step,
                  state: "active",
                  result: "进行中",
                  duration: "00:00",
                  observation: "已进入当前步骤，等待连续动作判定",
                }
              : step,
          ),
          startedAt: session.startedAt || startedAt,
          lastActiveAt: startedAt,
          recording: {
            ...session.recording,
            status: "完整",
            coveragePercent: 100,
            mainCamera: "正常",
            assistCamera: "正常",
            startedAt:
              session.recording?.startedAt === "尚未开始"
                ? startedAt
                : session.recording?.startedAt || startedAt,
            lastSegmentAt: "持续写入中",
            fullVideoAvailable: true,
            incidents: [],
          },
          events: [
            {
              time: startedAt.slice(-5),
              level: "green",
              title: "学生确认并开始",
              detail: "身份、任务和工位已确认，会话计时与评价开始",
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
        const when = timestamp();
        const detail = reason.trim() || "学生在当前步骤请求教师到场协助";
        const event = {
          time: when.slice(-5),
          level: "warning",
          title: "学生请求帮助",
          detail,
          source: "student_help",
          requiresAttention: true,
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
                        ? {
                            ...entry,
                            helpRequestedAt: when,
                            events: [event, ...(entry.events || [])],
                          }
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
      finishWorkstationSession(arrangementId, workstationId) {
        const arrangement = data.arrangements.find(
          (item) => item.id === arrangementId,
        );
        const session = arrangement?.sessions.find(
          (item) => item.workstationId === workstationId,
        );
        if (!arrangement || !session)
          throw new Error("工位会话不存在或尚未开放。");
        if (!["进行中", "已暂停"].includes(session.status))
          throw new Error("当前会话不能重复结束。");
        const endedAt = timestamp();
        const unfinishedCount = session.steps.filter(
          (step) => step.state === "pending" || step.state === "active",
        ).length;
        const updatedSession = {
          ...session,
          status: "已完成",
          currentStepId: "",
          endedAt,
          score: scoreOf(session.steps),
          scoreVersion: Number(session.scoreVersion || 0) + 1,
          resultStatus: arrangement.type === "exam" ? "待发布" : "正式成绩",
          reviewHistory: session.reviewHistory || [],
          recording: {
            ...session.recording,
            lastSegmentAt: endedAt,
          },
          events: [
            {
              time: endedAt.slice(-5),
              level: unfinishedCount ? "warning" : "green",
              title: "学生主动结束会话",
              detail: unfinishedCount
                ? `仍有 ${unfinishedCount} 个步骤未完成，已按当前记录生成结果`
                : "全部步骤已完成，已生成个人结果",
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
            "学生结束工位会话",
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
        const sessions = arrangement.sessions.map((session) =>
          session.status === "故障"
            ? session
            : {
                ...session,
                resultStatus: ["待开始", "可入场"].includes(session.status)
                  ? "未参加"
                  : session.steps.some((step) => step.reviewStatus === "待复核")
                    ? "待复核"
                    : "正式成绩",
                score: scoreOf(session.steps),
                scoreVersion: Number(session.scoreVersion || 0) + 1,
                reviewHistory: session.reviewHistory || [],
                status: "待复位",
              },
        );
        const updated = {
          ...arrangement,
          status,
          paused: false,
          endedAt: timestamp(),
          endNote: note,
          sessions,
          updatedAt: timestamp(),
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
              businessVersion: `${arrangement.snapshot?.sopVersion || "未锁定"} / ${arrangement.snapshot?.modelVersion || "未启用"}`,
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
                      status: "待审核",
                      note: "由正式评价复核回流，等待进入下一版 Dataset",
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
              : { ...session, resultStatus: "已发布" },
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
