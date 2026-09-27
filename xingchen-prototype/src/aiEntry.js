import { isSopAvailableForNewArrangement } from "./domainRules.js";
import { evaluateAiCapabilityConfig } from "./aiCapabilityConfigRules.js";
import {
  checkSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
} from "./sopWorkstationAiRules.js";

export const AI_CONFIG_PATH = "/admin/ai-capability-config";
export const AI_LIBRARY_PATH = "/admin/ai-capability-library";

export const AI_LIBRARY_SECTIONS = [
  {
    path: "capabilities",
    title: "能力管理",
    description: "管理平台可复用的目标检测和动作识别能力。",
  },
  {
    path: "videos",
    title: "视频管理",
    description: "管理AI能力训练所需的原始视频数据。",
  },
  {
    path: "extraction",
    title: "抽帧/切片",
    description: "目标检测任务进行抽帧，动作识别任务进行视频切片。",
  },
  {
    path: "auto-cleaning",
    title: "自动清洗",
    description: "自动识别模糊、重复、黑屏等低质量数据。",
  },
  {
    path: "manual-cleaning",
    title: "人工清洗",
    description: "人工复核并保留或剔除训练数据。",
  },
  {
    path: "annotation",
    title: "数据标注",
    description: "对目标检测图片或动作片段进行训练标注。",
  },
  {
    path: "training-data",
    title: "训练数据",
    description: "管理当前有效训练数据并划分训练集、验证集和测试集。",
  },
  {
    path: "training",
    title: "模型训练",
    description: "创建并查看AI能力模型训练任务。",
  },
  {
    path: "publishing",
    title: "模型发布",
    description: "发布训练完成的当前模型，使AI能力可被AI能力配置引用。",
  },
];

export function getConfigurableSops(sops) {
  return Array.isArray(sops)
    ? sops.filter((sop) => sop?.id && isSopAvailableForNewArrangement(sop))
    : [];
}

export function deriveSopAiConfigurationSummary({
  sop,
  config,
  workstationConfigs = [],
  workstations = [],
  devices = [],
  capabilities = [],
} = {}) {
  const empty = {
    status: sop?.status === "草稿" ? "—" : "未配置",
    config: null,
    evaluation: null,
    workstationCount: 0,
    runnableWorkstationCount: 0,
    enabledWorkstationCount: 0,
    judgementItemCount: 0,
    capabilityCount: 0,
  };
  if (!sop?.id || !config || config.sopId !== sop.id) return empty;

  const evaluation = evaluateAiCapabilityConfig({
    sop,
    config,
    capabilities,
  });
  const relations = (
    Array.isArray(workstationConfigs) ? workstationConfigs : []
  ).filter((item) => item?.sopAiConfigId === config.id);
  const runtimeStates = relations.map((relation) => {
    const workstation = (Array.isArray(workstations) ? workstations : []).find(
      (item) => item?.id === relation.workstationId,
    );
    if (!workstation)
      return {
        relation,
        workstation: null,
        runtime: {
          code: "workstation_abnormal",
          label: "工位异常",
          runnable: false,
        },
      };
    const checks = checkSopWorkstationAiConfig({
      config: relation,
      aiConfig: config,
      aiConfigReady: evaluation.ready,
      workstation,
      devices,
      capabilities,
    });
    return {
      relation,
      workstation,
      checks,
      runtime: deriveSopWorkstationRuntimeStatus({
        config: relation,
        checks,
        readiness: checks.readiness,
      }),
    };
  });
  const runnableWorkstationCount = runtimeStates.filter(
    (item) => item.runtime.runnable,
  ).length;
  const enabledWorkstationCount = relations.filter(
    (item) => item.enableStatus === "enabled",
  ).length;
  const status = !evaluation.ready
    ? evaluation.statusLabel
    : runnableWorkstationCount > 0
      ? "已启用"
      : "待验证";
  return {
    status,
    config,
    evaluation,
    runtimeStates,
    workstationCount: relations.length,
    runnableWorkstationCount,
    enabledWorkstationCount,
    judgementItemCount: evaluation.judgementItemCount,
    capabilityCount: evaluation.distinctCapabilityIds.length,
  };
}
