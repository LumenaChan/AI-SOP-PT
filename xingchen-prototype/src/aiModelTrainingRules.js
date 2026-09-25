export const TRAINING_TASK_STATUSES = {
  pending: "待开始",
  training: "训练中",
  validating: "验证中",
  testing: "测试中",
  completed: "训练完成",
  failed: "训练失败",
  canceled: "已取消",
};

export const ACTIVE_TRAINING_STATUSES = [
  "pending",
  "training",
  "validating",
  "testing",
];

export const OBJECT_MODEL_PRESETS = [
  { value: "lightweight", label: "轻量模型", note: "推理速度优先" },
  { value: "standard", label: "标准模型", note: "精度与速度均衡" },
  { value: "high_accuracy", label: "高精度模型", note: "识别精度优先" },
];

export const ACTION_MODEL_PRESETS = [
  {
    value: "short_action",
    label: "短动作模型",
    note: "适合短时、边界清晰的动作",
  },
  { value: "standard_action", label: "标准动作模型", note: "适合常规操作过程" },
  {
    value: "long_action",
    label: "长时动作模型",
    note: "适合持续时间较长的动作",
  },
];

export function defaultTrainingParams(type) {
  return type === "action_recognition"
    ? {
        baseModel: "standard_action",
        epochs: 50,
        batchSize: 8,
        clipSampleLength: 16,
        sampleInterval: 2,
      }
    : {
        baseModel: "standard",
        epochs: 80,
        batchSize: 16,
        imageSize: 640,
        initialLearningRate: 0.001,
      };
}

function integerInRange(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max)
    throw new Error(`${label}必须是 ${min}–${max} 之间的整数。`);
  return number;
}

export function validateTrainingParams(capability, input = {}) {
  if (!capability?.id) throw new Error("所选AI能力不存在，请重新选择。");
  const type = capability.type;
  const defaults = defaultTrainingParams(type);
  const params = { ...defaults, ...input };
  if (type === "object_detection") {
    if (!OBJECT_MODEL_PRESETS.some((item) => item.value === params.baseModel))
      throw new Error("请选择有效的目标检测基础模型。");
    const rate = Number(params.initialLearningRate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1)
      throw new Error("初始学习率必须大于0且不超过1。");
    return {
      baseModel: params.baseModel,
      epochs: integerInRange(params.epochs, 1, 500, "训练轮数"),
      batchSize: integerInRange(params.batchSize, 1, 128, "批次大小"),
      imageSize: integerInRange(params.imageSize, 128, 2048, "输入图片尺寸"),
      initialLearningRate: rate,
    };
  }
  if (type === "action_recognition") {
    if (!ACTION_MODEL_PRESETS.some((item) => item.value === params.baseModel))
      throw new Error("请选择有效的动作识别基础模型。");
    return {
      baseModel: params.baseModel,
      epochs: integerInRange(params.epochs, 1, 500, "训练轮数"),
      batchSize: integerInRange(params.batchSize, 1, 64, "批次大小"),
      clipSampleLength: integerInRange(
        params.clipSampleLength,
        4,
        128,
        "片段采样长度",
      ),
      sampleInterval: integerInRange(params.sampleInterval, 1, 16, "采样间隔"),
    };
  }
  throw new Error("当前AI能力类型不支持模型训练。");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function itemSplit(groups, itemId) {
  return (groups || []).find((group) =>
    (group.items || []).some((item) => item.id === itemId),
  )?.split;
}

function snapshotItem(item, capability) {
  const common = {
    id: item.id,
    sourceVideoId: item.sourceVideoId,
    storageRef: item.storageRef || "",
    annotationStatus: item.annotationStatus,
  };
  return capability.type === "object_detection"
    ? {
        ...common,
        sourceTimeMs: item.sourceTimeMs,
        width: item.width,
        height: item.height,
        noTargetConfirmed: !!item.noTargetConfirmed,
        boxes: clone(item.boxes || []),
      }
    : {
        ...common,
        startMs: item.refinedStartMs ?? item.startMs,
        endMs: item.refinedEndMs ?? item.endMs,
        actionCategoryId: item.actionCategoryId,
      };
}

export function assertTrainingCanStart({ capability, readiness, tasks }) {
  if (!capability?.id) throw new Error("所选AI能力不存在，请重新选择。");
  if (!readiness?.ready)
    throw new Error(
      readiness?.blockers?.[0] || "当前训练数据未通过训练前检查。",
    );
  if (
    (tasks || []).some(
      (task) =>
        task.capabilityId === capability.id &&
        ACTIVE_TRAINING_STATUSES.includes(task.status),
    )
  )
    throw new Error("当前AI能力已有进行中的训练任务，请等待任务结束后再试。");
}

export function createTrainingTask(
  { capability, readiness, candidates, groups, categories, params, tasks },
  meta = {},
) {
  assertTrainingCanStart({ capability, readiness, tasks });
  const now = meta.now || new Date().toISOString();
  const id = meta.id || `ai-training-${Date.now()}`;
  const trainingParams = validateTrainingParams(capability, params);
  const items = (candidates || []).map((item) => ({
    ...snapshotItem(item, capability),
    split: itemSplit(groups, item.id),
  }));
  const categoryIds = new Set(
    items.flatMap((item) =>
      capability.type === "object_detection"
        ? (item.boxes || []).map((box) => box.categoryId)
        : [item.actionCategoryId],
    ),
  );
  const splitIds = (split) =>
    items.filter((item) => item.split === split).map((item) => item.id);
  const snapshot = {
    capability: {
      id: capability.id,
      name: capability.name,
      type: capability.type,
      targetName: capability.targetName || "",
    },
    trainItemIds: splitIds("train"),
    validationItemIds: splitIds("validation"),
    testItemIds: splitIds("test"),
    items,
    categories: clone(
      (categories || []).filter(
        (category) =>
          category.capabilityId === capability.id &&
          categoryIds.has(category.id),
      ),
    ),
    capturedAt: now,
  };
  return {
    id,
    capabilityId: capability.id,
    capabilityName: capability.name,
    capabilityType: capability.type,
    status: "training",
    progress: 8,
    currentEpoch: 0,
    simulationStep: 0,
    trainingParams: clone(trainingParams),
    dataSnapshot: clone(snapshot),
    snapshotSummary: {
      train: snapshot.trainItemIds.length,
      validation: snapshot.validationItemIds.length,
      test: snapshot.testItemIds.length,
      categoryCount: snapshot.categories.length,
    },
    hadPublishedModel:
      capability.status === "已发布" ||
      capability.currentModelStatus === "已发布",
    capabilityStatusBeforeTraining: capability.status,
    currentModelStatusBeforeTraining: capability.currentModelStatus,
    logs: [
      { time: now, stage: "准备", message: "训练数据与参数快照已锁定。" },
      { time: now, stage: "训练", message: "训练资源就绪，开始加载训练数据。" },
    ],
    createdBy: meta.actor || "系统管理员",
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  };
}

function resultFor(task) {
  const categories = task.dataSnapshot?.categories || [];
  const testCount = task.dataSnapshot?.testItemIds?.length || 0;
  if (task.capabilityType === "action_recognition") {
    const rows = categories.map((category, index) => ({
      categoryId: category.id,
      name: category.name,
      accuracy: Number((0.91 - index * 0.025).toFixed(3)),
    }));
    return {
      trainingTaskId: task.id,
      overallAccuracy: 0.902,
      perCategory: rows,
      testSampleCount: testCount,
      confusionMatrix: rows.map((row, rowIndex) => ({
        categoryId: row.categoryId,
        values: rows.map((_, columnIndex) =>
          rowIndex === columnIndex ? Math.max(1, testCount - rowIndex) : 0,
        ),
      })),
      predictions: (task.dataSnapshot?.items || [])
        .filter((item) => item.split === "test")
        .slice(0, 6)
        .map((item) => ({
          itemId: item.id,
          sourceVideoId: item.sourceVideoId,
          startMs: item.startMs,
          endMs: item.endMs,
          expectedCategoryId: item.actionCategoryId,
          predictedCategoryId: item.actionCategoryId,
          confidence: 0.9,
          storageRef: item.storageRef,
        })),
    };
  }
  return {
    trainingTaskId: task.id,
    precision: 0.923,
    recall: 0.887,
    compositeMetric: 0.905,
    perCategory: categories.map((category, index) => ({
      categoryId: category.id,
      name: category.name,
      precision: Number((0.93 - index * 0.018).toFixed(3)),
      recall: Number((0.89 - index * 0.016).toFixed(3)),
    })),
    testSampleCount: testCount,
    predictions: (task.dataSnapshot?.items || [])
      .filter((item) => item.split === "test")
      .slice(0, 6)
      .map((item) => ({
        itemId: item.id,
        sourceVideoId: item.sourceVideoId,
        sourceTimeMs: item.sourceTimeMs,
        storageRef: item.storageRef,
        boxes: clone(item.boxes || []),
        confidence: 0.92,
      })),
  };
}

export function advanceTrainingTask(task, meta = {}) {
  if (!task?.id) throw new Error("训练任务不存在或已失效。");
  if (!ACTIVE_TRAINING_STATUSES.includes(task.status))
    throw new Error("当前任务状态不能继续推进。");
  const now = meta.now || new Date().toISOString();
  const next = clone(task);
  next.simulationStep = Number(next.simulationStep || 0) + 1;
  if (task.status === "training" && next.simulationStep < 2) {
    next.progress = 48;
    next.currentEpoch = Math.max(
      1,
      Math.round(task.trainingParams.epochs * 0.55),
    );
    next.logs.push({
      time: now,
      stage: "训练",
      message: "模型训练稳定进行中。",
    });
  } else if (task.status === "training") {
    next.status = "validating";
    next.progress = 82;
    next.currentEpoch = task.trainingParams.epochs;
    next.logs.push({
      time: now,
      stage: "验证",
      message: "训练完成，开始验证模型表现。",
    });
  } else if (task.status === "validating") {
    next.status = "testing";
    next.progress = 94;
    next.logs.push({
      time: now,
      stage: "测试",
      message: "验证完成，开始独立测试集评估。",
    });
  } else {
    next.status = "completed";
    next.progress = 100;
    next.validationResult = {
      sampleCount: task.dataSnapshot?.validationItemIds?.length || 0,
      completedAt: now,
      status: "completed",
    };
    next.result = resultFor(next);
    next.modelArtifactId = meta.modelArtifactId || `candidate-${task.id}`;
    next.completedAt = now;
    next.logs.push({
      time: now,
      stage: "完成",
      message: "训练任务完成，已生成候选模型。",
    });
  }
  next.updatedAt = now;
  return next;
}

export function failTrainingTask(task, reason, meta = {}) {
  if (!task?.id || !ACTIVE_TRAINING_STATUSES.includes(task.status))
    throw new Error("当前任务状态不能标记为训练失败。");
  const now = meta.now || new Date().toISOString();
  return {
    ...clone(task),
    status: "failed",
    failureReason: String(reason || "训练服务异常，请检查后重试。"),
    failedAt: now,
    updatedAt: now,
    logs: [
      ...(task.logs || []),
      {
        time: now,
        stage: "失败",
        message: String(reason || "训练服务异常，请检查后重试。"),
      },
    ],
  };
}

export function cancelTrainingTask(task, meta = {}) {
  if (!task?.id || !["pending", "training"].includes(task.status))
    throw new Error("仅待开始或训练中的任务可以取消。");
  const now = meta.now || new Date().toISOString();
  return {
    ...clone(task),
    status: "canceled",
    canceledAt: now,
    updatedAt: now,
    logs: [
      ...(task.logs || []),
      { time: now, stage: "取消", message: "训练任务已由管理员取消。" },
    ],
  };
}

export function retryTrainingTask(task, tasks = [], meta = {}) {
  if (!task?.id || task.status !== "failed")
    throw new Error("仅训练失败的任务可以使用原参数重试。");
  if (
    (tasks || []).some(
      (item) =>
        item.capabilityId === task.capabilityId &&
        ACTIVE_TRAINING_STATUSES.includes(item.status),
    )
  )
    throw new Error("当前AI能力已有进行中的训练任务，请等待任务结束后再试。");
  const now = meta.now || new Date().toISOString();
  return {
    ...clone(task),
    id: meta.id || `ai-training-retry-${Date.now()}`,
    status: "training",
    progress: 8,
    currentEpoch: 0,
    simulationStep: 0,
    modelArtifactId: undefined,
    result: undefined,
    failureReason: "",
    failedAt: undefined,
    completedAt: undefined,
    retriedFromTaskId: task.id,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    createdBy: meta.actor || "系统管理员",
    logs: [
      {
        time: now,
        stage: "重试",
        message: `使用任务 ${task.id} 的数据快照与参数重新训练。`,
      },
    ],
  };
}

export function capabilityPatchAfterTrainingTask(capability, task) {
  if (task.hadPublishedModel) {
    return {
      status: capability.status,
      currentModelStatus: capability.currentModelStatus,
      candidateTrainingTaskId:
        task.status === "completed"
          ? task.id
          : capability.candidateTrainingTaskId,
      candidateModelStatus:
        task.status === "completed"
          ? "待发布"
          : capability.candidateModelStatus,
    };
  }
  if (ACTIVE_TRAINING_STATUSES.includes(task.status))
    return { status: "训练中", currentModelStatus: "训练中" };
  if (task.status === "completed")
    return {
      status: "待发布",
      currentModelStatus: "待发布",
      candidateTrainingTaskId: task.id,
      candidateModelStatus: "待发布",
    };
  if (["failed", "canceled"].includes(task.status))
    return { status: "待训练", currentModelStatus: "未训练" };
  return {};
}
