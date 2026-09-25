export const AI_CAPABILITY_TYPES = {
  object_detection: "目标检测",
  action_recognition: "动作识别",
};

export const AI_CAPABILITY_STATUSES = [
  "草稿",
  "数据准备中",
  "待训练",
  "训练中",
  "待发布",
  "已发布",
  "已停用",
];

export function capabilityReferenceCount(capability) {
  const count = Number(capability?.referenceCount);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function isPublishedCapability(capability) {
  return capability?.status === "已发布";
}

export function canEditCapability(capability) {
  return (
    Boolean(capability) && !["训练中", "待发布"].includes(capability.status)
  );
}

export function canEditCapabilityMeaning(capability) {
  return ["草稿", "数据准备中", "待训练"].includes(capability?.status);
}

export function validateCapabilityInput(
  input,
  capabilities = [],
  editingId = "",
) {
  const name = String(input?.name || "").trim();
  const description = String(input?.description || "").trim();
  const targetName = String(input?.targetName || "").trim();
  if (!name) throw new Error("请填写能力名称。");
  if (name.length > 50) throw new Error("能力名称不能超过50个字符。");
  if (/\bSOP\b|Step\s*\d+|第\s*\d+\s*步|扣分|得分/i.test(name))
    throw new Error(
      "能力名称应描述可复用的识别能力，不应包含具体SOP步骤或评分。",
    );
  if (!AI_CAPABILITY_TYPES[input?.type])
    throw new Error("请选择目标检测或动作识别能力类型。");
  if (!description) throw new Error("请填写能力说明。");
  if (!targetName)
    throw new Error(
      `请填写${input.type === "object_detection" ? "识别对象" : "动作名称"}。`,
    );
  if (
    capabilities.some(
      (item) =>
        item?.id !== editingId &&
        String(item?.name || "")
          .trim()
          .toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    throw new Error("能力名称已存在，请使用不同名称。");
  return {
    name,
    type: input.type,
    description,
    targetName,
    note: String(input?.note || "").trim(),
  };
}

export function createCapability(input, capabilities, { id, now, actor }) {
  const fields = validateCapabilityInput(input, capabilities);
  if (!id) throw new Error("创建能力失败：缺少独立ID。");
  return {
    id,
    ...fields,
    status: "草稿",
    currentModelStatus: "未训练",
    referenceCount: 0,
    createdBy: actor || "系统管理员",
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCapability(capability, input, capabilities, now) {
  if (!canEditCapability(capability))
    throw new Error("当前能力状态不允许编辑基础信息。");
  if (!canEditCapabilityMeaning(capability)) {
    for (const key of ["name", "type", "description", "targetName"]) {
      if (input?.[key] !== capability[key])
        throw new Error(
          "已发布能力的识别含义已锁定；如需改变，请创建新的AI能力。",
        );
    }
    return {
      ...capability,
      note: String(input?.note || "").trim(),
      updatedAt: now,
    };
  }
  if (input?.type !== capability.type)
    throw new Error("能力类型创建后不可修改；请删除未发布能力后重新创建。");
  const fields = validateCapabilityInput(input, capabilities, capability.id);
  return { ...capability, ...fields, updatedAt: now };
}

export function deactivateCapability(capability, now) {
  if (!isPublishedCapability(capability))
    throw new Error("只有已发布的AI能力可以停用。");
  return { ...capability, status: "已停用", updatedAt: now };
}

export function reactivateCapability(capability, now) {
  if (capability?.status !== "已停用")
    throw new Error("只有已停用的AI能力可以重新启用。");
  if (
    capability.currentModelStatus !== "已发布" ||
    !capability.currentPublishedModel?.modelArtifactId ||
    ["missing", "invalid"].includes(
      capability.currentPublishedModel?.fileStatus,
    )
  )
    throw new Error("当前能力没有已发布模型，不能重新启用。");
  return { ...capability, status: "已发布", updatedAt: now };
}

export function assertCapabilityDeletable(capability) {
  if (!capability) throw new Error("AI能力不存在或已删除。");
  const count = capabilityReferenceCount(capability);
  if (count)
    throw new Error(
      `当前AI能力正在被 ${count} 个AI能力配置引用，请先解除引用后再删除。`,
    );
  if (capability.status === "已发布")
    throw new Error("已发布能力请先停用，再执行删除。");
  if (capability.status === "训练中")
    throw new Error("训练中的能力不能删除，请等待训练任务结束。");
}
