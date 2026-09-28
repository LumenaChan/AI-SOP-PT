import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";

export function studentRuntimeFixture() {
  const sop = {
    id: "sop-student-e2e",
    name: "学生端联调SOP",
    status: "已发布",
    steps: [
      {
        id: "step-01",
        name: "完成现场操作",
        score: 100,
        maxScore: 100,
        expectedJudgementMode: "visual_auto",
        completionCondition: "动作完成",
        teachingInstruction: "按教师定义的标准完成当前动作",
        keyPoints: "保持操作区域清晰可见",
      },
    ],
    scoreRules: [],
    safetyRules: [],
  };
  const capability = {
    id: "cap-student-e2e",
    name: "学生端动作识别",
    targetName: "现场操作",
    type: "action_recognition",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "artifact-student-e2e" },
  };
  const judgementItem = {
    id: "judgement-student-e2e",
    stepId: "step-01",
    name: "现场操作已完成",
    purposes: ["completion"],
    scoreRuleIds: [],
    safetyRuleIds: [],
    combination: "all",
    conditions: [
      {
        id: "condition-student-e2e",
        capabilityId: capability.id,
        operator: "recognized",
        minOccurrences: 1,
        withinCurrentStep: true,
      },
    ],
  };
  const aiConfig = {
    id: "config-student-e2e",
    sopId: sop.id,
    status: "enabled",
    logicalAreas: [],
    stepConfigs: [
      {
        stepId: "step-01",
        actualEvaluationMode: "visual_auto",
        scoreRuleTreatments: [],
        safetyRuleTreatments: [],
      },
    ],
    judgementItems: [judgementItem],
  };
  const workstation = {
    id: "workstation-student-e2e",
    name: "联调工位",
    status: "可入场",
    currentArrangement: "无",
    aiBaseConfig: {
      primaryCameraId: "camera-student-e2e",
      fallbackCameraId: "",
      edgeDeviceId: "edge-student-e2e",
    },
  };
  return {
    sops: [sop],
    aiCapabilities: [capability],
    aiCapabilityConfigs: [aiConfig],
    sopWorkstationAiConfigs: [
      {
        id: "relation-student-e2e",
        sopAiConfigId: aiConfig.id,
        workstationId: workstation.id,
        judgementCameraBindings: [
          {
            judgementItemId: judgementItem.id,
            cameraId: "camera-student-e2e",
            source: "primary",
          },
        ],
        logicalAreaMappings: [],
        validationStatus: "passed",
        enableStatus: "enabled",
        validationCases: [],
        validationRecords: [{ id: "validation-student-e2e" }],
      },
    ],
    workstations: [workstation],
    devices: [
      {
        id: "camera-student-e2e",
        workstationId: workstation.id,
        name: "联调主摄像头",
        type: "全景摄像头",
        status: "在线",
        streamStatus: "可用",
      },
      {
        id: "edge-student-e2e",
        workstationId: workstation.id,
        type: "边缘工作站",
        status: "在线",
      },
    ],
    students: [
      {
        id: "student-e2e",
        no: "20260001",
        name: "联调学生",
        status: "启用",
        faceStatus: "已采集",
      },
    ],
    teachers: [{ id: "teacher-e2e", name: "联调教师" }],
    arrangements: [],
    notifications: [],
    evaluationMappings: [],
    machineEvents: [],
    datasets: [],
    models: [],
    workstationProfiles: [],
    compatibilityDecisions: [],
    fieldValidations: [],
  };
}

export function createStudentRuntimeStore(data) {
  let current = Date.parse("2026-09-28T06:00:00.000Z");
  let sequence = 0;
  const clock = {
    now: () => new Date(current).toISOString(),
    advance(seconds) {
      current += seconds * 1000;
      return current;
    },
    value: () => current,
  };
  const store = createAiRuntimeStore(data, {
    now: clock.now,
    makeId: (prefix) => `${prefix}-${++sequence}`,
  });
  return { store, clock };
}

export function createOpenArrangement(store, data, type) {
  const arrangement = store.saveArrangement(
    {
      name: type === "exam" ? "学生端联调考试" : "学生端联调练习",
      type,
      teacherId: "teacher-e2e",
      scheduleStart: "2026-09-28T14:00:00",
      sopId: data.sops[0].id,
      studentIds: ["student-e2e"],
      workstationIds: [data.workstations[0].id],
      ...(type === "exam" ? { examDurationMinutes: 5 } : {}),
    },
    true,
  );
  store.openArrangementWorkstation(arrangement.id, data.workstations[0].id, {
    node: true,
    mainCamera: true,
    cache: true,
  });
  store.startArrangement(arrangement.id);
  return arrangement;
}
