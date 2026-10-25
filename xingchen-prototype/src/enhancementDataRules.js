import { normalizeSopStep } from "./domainRules.js";
import { createDefaultValidationCases } from "./sopWorkstationAiRules.js";
import {
  createOpenedAiSession,
  deriveAiRuntimeGate,
  startAiRuntimeSession,
} from "./aiRuntimeRules.js";
import { createSessionStepsFromSop } from "./domainRules.js";
import { withCameraAliases } from "./cameraRules.js";
const PACKAGE = "sop-enhancement-20261015",
  at = "2026-10-15 10:00";
const clone = (x) => JSON.parse(JSON.stringify(x));
function append(data, key, items) {
  data[key] ||= [];
  const ids = new Set(data[key].map((x) => x.id));
  data[key].push(...items.filter((x) => !ids.has(x.id)));
}
function requirement(id, name, target, definition, extra = {}) {
  return {
    id,
    name,
    target,
    definition,
    object: "绝缘手套 / 万用表 / 指定训练工件",
    variations: "允许不同速度、左右手习惯及合法握持姿势",
    mistakes: "仅拿起工具、悬空接近、未完成接触保持",
    unknownWhen: "手部/关键接触点遮挡、出画或视频中断",
    evidence: "动作起止、双手、工具与接触点连续可见",
    continuous: "current_step",
    endStepId: "",
    assessDonning: false,
    ...extra,
  };
}
function step(id, name, score, req, mode = "visual_auto") {
  return normalizeSopStep({
    id,
    name,
    score,
    predecessor: id === "Step 01" ? "无" : "Step 01",
    timeout: "02:00",
    completionCondition: req.definition,
    evidence: req.evidence,
    teachingInstruction: req.definition,
    keyPoints: req.evidence,
    commonMistakes: req.mistakes,
    knownLimit: req.unknownWhen,
    expectedJudgementMode: mode,
    judgementMode: mode,
    judgementModeSource: "teacher_defined",
    incompletePolicy: "teacher_review",
    visualRequirements: [req],
    standardMediaType: "无",
    standardMediaUrl: "",
  });
}
export function migrateEnhancementData(input) {
  const data = input;
  // Add missing provenance without claiming old simulated values are measured results.
  for (const key of ["aiTrainingTasks", "aiModelPublicationRecords"])
    for (const item of data[key] || [])
      item.resultSource ||= "legacy_unverified";
  for (const cap of data.aiCapabilities || [])
    if (cap.currentPublishedModel)
      cap.currentPublishedModel.resultSource ||= "legacy_unverified";
  for (const w of data.workstations || [])
    w.aiBaseConfig = withCameraAliases(w.aiBaseConfig || {});
  const capabilityTypes = new Map(
    (data.aiCapabilities || []).map((c) => [c.id, c.type]),
  );
  for (const category of data.aiAnnotationCategories || []) {
    if (category.type) continue;
    const type = capabilityTypes.get(category.capabilityId);
    if (type === "object_detection") category.type = "object";
    else if (type === "action_recognition") category.type = "action";
  }
  data.enhancementMigrations ||= [];
  if (data.enhancementMigrations.includes(PACKAGE)) return data;
  for (const key of ["aiPreannotationTasks", "aiExistingModelCandidates"])
    data[key] ||= [];
  const benchId = "sop-demo-bench-20261015",
    largeId = "sop-demo-large-20261015",
    wid = "ws-demo-20261015",
    cid = "ai-config-demo-bench-20261015",
    rid = "relation-demo-bench-20261015";
  const gloveCap = "cap-demo-glove-20261015",
    meterCap = "cap-demo-meter-20261015";
  const r1 = requirement(
      "req-demo-glove",
      "双手绝缘手套佩戴状态",
      "state",
      "双手已正确佩戴绝缘手套并持续可见；不要求重新演示穿戴过程。",
      { continuous: "specified", endStepId: "Step 02" },
    ),
    r2 = requirement(
      "req-demo-meter",
      "电阻测量操作过程",
      "process",
      "选择电阻测量位置并让两支表笔接触指定工件，保持后移开；本项不判断读数。",
    );
  const steps = [
    step("Step 01", "绝缘手套状态检查", 30, r1),
    step("Step 02", "万用表测量动作", 70, r2),
  ];
  const bench = {
    id: benchId,
    familyId: benchId,
    name: "【演示】固定工作台：手套与万用表",
    owner: "王老师",
    major: "新能源汽车技术",
    course: "新能源汽车高压安全实训",
    operation: "固定工作台视觉评价验证",
    basis: "教师可见操作要求示例，非真实检测结论",
    conditions: "单名主操作人、固定镜头、稳定光照，原型演示",
    standardDuration: "5 分钟",
    status: "已发布",
    frozen: true,
    signedBy: "王老师（演示）",
    publishedAt: at,
    updatedAt: at,
    steps,
    scoreRules: [],
    safetyRules: [],
    usedStepIds: steps.map((s) => s.id),
    demoPackageId: PACKAGE,
  };
  const largeNames = [
    "入口摆放安全锥桶",
    "工作台检查绝缘防护",
    "环车检查一圈",
    "驾驶舱内操作",
    "车底底盘检查",
  ];
  const large = {
    ...clone(bench),
    id: largeId,
    familyId: largeId,
    name: "【演示草稿】高压换电池多区域流程",
    status: "草稿",
    frozen: false,
    publishedAt: "",
    signedBy: "",
    conditions: "入口、工作台、车周、驾驶舱、车底分区观察；尚待现场验证",
    steps: largeNames.map((name, i) =>
      step(
        `Step 0${i + 1}`,
        name,
        20,
        requirement(
          `req-large-${i}`,
          name,
          i === 0 ? "state" : "process",
          `${name}的具体操作与检查证据由教师确认；仅进入区域不能代表完成。`,
        ),
        "visual_assist_default_pass",
      ),
    ),
    scoreRules: [],
    safetyRules: [],
    usedStepIds: largeNames.map((_, i) => `Step 0${i + 1}`),
  };
  large.steps = large.steps.map((s, i) => ({
    ...s,
    predecessor: i ? large.steps[i - 1].id : "无",
  }));
  append(data, "sops", [bench, large]);
  append(data, "aiCapabilities", [
    {
      id: gloveCap,
      name: "【演示】双手绝缘手套状态",
      type: "object_detection",
      targetName: "绝缘手套",
      description: "结果状态，不判断穿戴过程",
      status: "已发布",
      currentModelStatus: "已发布",
      currentPublishedModel: {
        modelArtifactId: "demo-glove-artifact",
        resultSource: "prototype_demo",
        publishedAt: at,
      },
      createdAt: at,
      updatedAt: at,
      demoPackageId: PACKAGE,
    },
    {
      id: meterCap,
      name: "【演示】万用表电阻测量动作",
      type: "action_recognition",
      targetName: "电阻测量动作",
      description: "RGB动作示例，不识别测量读数，关键点为可选增强",
      status: "已发布",
      currentModelStatus: "已发布",
      currentPublishedModel: {
        modelArtifactId: "demo-meter-artifact",
        resultSource: "prototype_demo",
        publishedAt: at,
      },
      createdAt: at,
      updatedAt: at,
      demoPackageId: PACKAGE,
    },
  ]);
  const views = [
    {
      deviceId: "cam-demo-main",
      name: "工作台全景",
      role: "primary",
      defaultPreview: true,
      enabled: true,
      areaIds: ["工作台"],
    },
    {
      deviceId: "cam-demo-detail",
      name: "手部与工件特写",
      role: "auxiliary",
      enabled: true,
      areaIds: ["工作台"],
    },
    {
      deviceId: "cam-demo-entry",
      name: "入口与车周",
      role: "auxiliary",
      enabled: true,
      areaIds: ["入口", "车周"],
    },
    {
      deviceId: "cam-demo-cabin",
      name: "驾驶舱",
      role: "auxiliary",
      enabled: true,
      areaIds: ["驾驶舱"],
    },
    {
      deviceId: "cam-demo-under",
      name: "车底",
      role: "auxiliary",
      enabled: true,
      areaIds: ["车底"],
    },
  ];
  append(data, "workstations", [
    {
      id: wid,
      name: "【演示】多区域实训工位",
      code: "WS-DEMO-1015",
      location: "演示区",
      status: "可入场",
      currentArrangement: "演示练习",
      notes: "五视角数据结构演示，未连接真实摄像头。",
      updatedAt: at,
      demoPackageId: PACKAGE,
      aiBaseConfig: withCameraAliases({
        workstationId: wid,
        cameras: views,
        edgeDeviceId: "edge-demo-20261015",
        regionDescription: "入口、工作台、车周、驾驶舱、车底",
        lastCheckedAt: at,
        lastAiCriticalChangeAt: at,
      }),
    },
  ]);
  append(data, "devices", [
    ...views.map((v, i) => ({
      id: v.deviceId,
      name: `DEMO-CAM-${i + 1}`,
      serial: `DEMO-CAM-SERIAL-${i + 1}`,
      type: i === 1 ? "细节摄像头" : "全景摄像头",
      workstationId: wid,
      status: "在线",
      streamStatus: "可用",
      resolution: "1920 × 1080",
      notes: "原型状态演示，实际视频流未接入",
      updatedAt: at,
      demoPackageId: PACKAGE,
    })),
    {
      id: "edge-demo-20261015",
      name: "DEMO-EDGE",
      serial: "DEMO-EDGE-SERIAL",
      type: "边缘工作站",
      workstationId: wid,
      status: "在线",
      updatedAt: at,
      demoPackageId: PACKAGE,
    },
  ]);
  const conditions = [
    {
      id: "condition-demo-glove",
      capabilityId: gloveCap,
      operator: "appears",
      logicalAreaId: "area-demo-workbench",
      minTargetCount: 2,
      minDurationSeconds: 2,
      minOccurrences: 1,
      withinCurrentStep: true,
    },
    {
      id: "condition-demo-meter",
      capabilityId: meterCap,
      operator: "recognized",
      logicalAreaId: "area-demo-workbench",
      minDurationSeconds: 3,
      minOccurrences: 1,
      withinCurrentStep: true,
    },
  ];
  const config = {
    id: cid,
    sopId: benchId,
    status: "configured",
    logicalAreas: [
      {
        id: "area-demo-workbench",
        name: "工作台操作区",
        description: "手部、表笔、工件需同时可见",
      },
    ],
    stepConfigs: steps.map((s) => ({
      stepId: s.id,
      actualEvaluationMode: "visual_auto",
      scoreRuleTreatments: [],
      safetyRuleTreatments: [],
    })),
    judgementItems: steps.map((s, i) => ({
      id: `judgement-demo-${i + 1}`,
      stepId: s.id,
      name: s.visualRequirements[0].name,
      requirementId: s.visualRequirements[0].id,
      completionBasis: i ? "action" : "state",
      observationScope: "current_step",
      sameActorRequired: true,
      purposes: ["completion"],
      scoreRuleIds: [],
      safetyRuleIds: [],
      combination: "all",
      conditions: [conditions[i]],
      fallback: "证据不足返回未知，按规则保分，不自动确认完成。",
    })),
    createdAt: at,
    updatedAt: at,
    demoPackageId: PACKAGE,
  };
  append(data, "aiCapabilityConfigs", [config]);
  const cases = createDefaultValidationCases(config).map((c) => ({
    ...c,
    actualResult: "原型演示案例，尚未真实执行",
    result: "passed",
    resultSource: "prototype_demo",
    executor: "演示管理员",
    evidenceRef: "prototype-placeholder",
    executedAt: at,
  }));
  const relation = {
    id: rid,
    sopAiConfigId: cid,
    workstationId: wid,
    judgementCameraBindings: config.judgementItems.map((j) => ({
      judgementItemId: j.id,
      cameraId: views[0].deviceId,
      cameraIds: [views[0].deviceId],
      strategy: "single",
      sameActorRequired: true,
    })),
    logicalAreaMappings: views.slice(0, 2).map((v) => ({
      logicalAreaId: "area-demo-workbench",
      cameraId: v.deviceId,
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    })),
    validationPurpose: "prototype_demo",
    validationStatus: "passed",
    enableStatus: "enabled",
    validationCases: cases,
    validationRecords: [],
    lastValidatedAt: at,
    lastValidatedBy: "演示管理员",
    createdAt: at,
    updatedAt: at,
    demoPackageId: PACKAGE,
  };
  append(data, "sopWorkstationAiConfigs", [relation]);
  for (const [capId, type] of [
    [gloveCap, "frames"],
    [meterCap, "clips"],
  ]) {
    append(data, "aiAnnotationCategories", [
      {
        id: `category-${capId}`,
        capabilityId: capId,
        type: type === "frames" ? "object" : "action",
        name: type === "frames" ? "绝缘手套" : "电阻测量动作",
        isBackground: false,
        color: "#3478cc",
        createdAt: at,
      },
      ...(type === "clips"
        ? [
            {
              id: `background-${capId}`,
              capabilityId: capId,
              type: "action",
              name: "背景/非目标动作",
              isBackground: true,
              createdAt: at,
            },
          ]
        : []),
    ]);
    for (let i = 0; i < 7; i++) {
      const vid = `video-${capId}-${i}`,
        sampleTypes = [
          "standard",
          "variation",
          "error",
          "incomplete",
          "lookalike",
          "background",
          "uncertain",
        ];
      append(data, "aiSourceVideos", [
        {
          id: vid,
          capabilityId: capId,
          fileName: `演示素材-${sampleTypes[i]}.mp4`,
          displayName: `【占位】${sampleTypes[i]}样本`,
          storageRef: "",
          duration: "00:12",
          durationMs: 12000,
          width: 1920,
          height: 1080,
          fileSize: 0,
          dataCategory: i < 2 ? "normal" : i === 5 ? "background" : "error",
          sourceType: i < 2 ? "standard_demo" : "supplemental_capture",
          sourceGroupId: `group-${capId}-${i}`,
          participantId: `demo-person-${i}`,
          captureBatch: "DEMO-1015",
          sampleUse: i === 6 ? "sealed_test" : "development",
          sampleType: sampleTypes[i],
          captureConditions: "原型占位，无真实媒体；用于展示数据工作流",
          workstationId: wid,
          processingStatus: "derived",
          uploadedAt: at,
          updatedAt: at,
          demoPackageId: PACKAGE,
        },
      ]);
      const common = {
        id: `sample-${capId}-${i}`,
        capabilityId: capId,
        sourceVideoId: vid,
        storageRef: type === "frames" ? `mock-frame://${vid}/0` : "",
        generationStatus: "success",
        manualCleaningStatus: "kept",
        sampleType: sampleTypes[i],
        visibility: i === 6 ? "occluded" : "visible",
        annotationStatus: i < 2 ? "completed" : "not_started",
        createdAt: at,
        demoPackageId: PACKAGE,
      };
      append(data, type === "frames" ? "aiFrames" : "aiClips", [
        type === "frames"
          ? {
              ...common,
              sourceTimeMs: 0,
              width: 1920,
              height: 1080,
              boxes:
                i < 2
                  ? [
                      {
                        id: `demo-box-${i}`,
                        categoryId: `category-${capId}`,
                        x: 0.2,
                        y: 0.2,
                        width: 0.2,
                        height: 0.3,
                      },
                    ]
                  : [],
              noTargetConfirmed: false,
            }
          : {
              ...common,
              startMs: 0,
              endMs: 5000,
              durationMs: 5000,
              actionCategoryId: i < 2 ? `category-${capId}` : "",
              refinedStartMs: 0,
              refinedEndMs: 5000,
            },
      ]);
    }
  }
  append(data, "aiExistingModelCandidates", [
    {
      id: "existing-model-demo-20261015",
      capabilityId: meterCap,
      modelArtifactId: "待接入已有动作模型",
      description: "验证万用表测量过程；未实测，不代表特定模型可用",
      source: "existing_model",
      resultSource: "prototype_demo",
      status: "pending_validation",
      createdAt: at,
    },
  ]);
  const studentId = "student-demo-20261015",
    classId = data.classes?.[0]?.id || "";
  append(data, "students", [
    {
      id: studentId,
      name: "演示学生",
      no: "DEMO-20261015",
      classId,
      status: "启用",
      face: "已采集",
      faceStatus: "已采集",
      gender: "未记录",
      updatedAt: at,
      demoPackageId: PACKAGE,
    },
  ]);
  const gate = deriveAiRuntimeGate({
    sopId: benchId,
    workstationId: wid,
    ...data,
  });
  let session = createOpenedAiSession({
    id: "session-demo-20261015",
    workstationId: wid,
    studentId,
    gate,
    lockedAt: at,
    steps: createSessionStepsFromSop(steps),
    recording: { status: "不可用", note: "原型占位，实际媒体未接入" },
  });
  session = startAiRuntimeSession(session, at);
  append(data, "arrangements", [
    {
      id: "practice-demo-20261015",
      type: "practice",
      name: "【演示】固定工作台动作识别验证",
      sopId: benchId,
      status: "进行中",
      teacherId: data.teachers?.[0]?.id || "t1",
      studentIds: [studentId],
      workstationIds: [wid],
      openWorkstationIds: [wid],
      scheduleStart: "2026-10-15T10:00",
      startedAt: at,
      updatedAt: at,
      paused: false,
      snapshot: { sopId: benchId, sopSnapshot: clone(bench) },
      sessions: [session],
      demoPackageId: PACKAGE,
    },
  ]);
  data.enhancementMigrations.push(PACKAGE);
  return data;
}
