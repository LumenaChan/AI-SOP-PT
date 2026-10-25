import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrateEnhancementData } from "../src/enhancementDataRules.js";
import {
  cameraViews,
  withCameraAliases,
  validateCameraCollection,
} from "../src/cameraRules.js";
import {
  createPreannotationTask,
  finishPreannotationDemo,
  validateSuggestion,
  confirmSuggestionSaved,
  sourceDurationMs,
} from "../src/preannotationRules.js";
import {
  simulateAiConditionOnSession,
  deriveAiRuntimeGate,
} from "../src/aiRuntimeRules.js";
import { createEnhancementActions } from "../src/enhancementStore.js";
import {
  evaluationCoverage,
  stepEvaluationMeaning,
  finalizeSubmittedStep,
  visualRequirementIssues,
} from "../src/visualEvaluationRules.js";
import { applyDefaultPassPolicy } from "../src/domainRules.js";
import { buildDataScreenSnapshot } from "../src/dataScreenRules.js";
import {
  groupTrainingCandidates,
  assignSourceGroup,
  buildTrainingReadiness,
} from "../src/aiTrainingDataRules.js";
import {
  evaluateValidationCompletion,
  setLogicalAreaMapping,
  setJudgementCameraBinding,
} from "../src/sopWorkstationAiRules.js";
import {
  backupWorkingStorage,
  persistWorkingData,
  PROTOTYPE_STORAGE_KEYS,
} from "../src/storageMigrationRules.js";
import { validateExistingModelReport } from "../src/modelProvenanceRules.js";
const original = JSON.parse(
  readFileSync(
    new URL("../src/data/currentPrototypeData.json", import.meta.url),
  ),
);
const clone = (x) => structuredClone(x),
  now = "2026-10-15 10:01";
let id = 0;
const makeId = (prefix) => `${prefix}-${++id}`;
const demo = () =>
  clone(
    original.arrangements.find((a) => a.id === "practice-demo-20261015")
      .sessions[0],
  );
function simulate(session, payload = {}, itemIndex = 0) {
  const item =
    session.evaluationSnapshot.aiCapabilityConfigSnapshot.judgementItems[
      itemIndex
    ];
  return simulateAiConditionOnSession({
    session,
    judgementItemId: item.id,
    conditionId: item.conditions[0].id,
    observationPayload: {
      id: makeId("obs"),
      phase: "complete",
      visibility: "visible",
      observedTargetCount: 2,
      startedAtMs: 1000,
      endedAtMs: 4000,
      ...payload,
    },
    when: now,
    makeId,
  });
}
function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    map,
  };
}
function annotationFixture() {
  return {
    items: [
      {
        id: "f",
        capabilityId: "c",
        sourceVideoId: "v",
        manualCleaningStatus: "kept",
        annotationStatus: "not_started",
        boxes: [],
      },
    ],
    sourceVideos: [{ id: "v", duration: "00:10" }],
    categories: [{ id: "label", capabilityId: "c", name: "手套" }],
    capabilityId: "c",
    id: "task",
    now,
  };
}

test("升级幂等且不重算旧成绩；追加包可从旧CPD完整生成", () => {
  const data = clone(original);
  delete data.enhancementMigrations;
  for (const key of [
    "sops",
    "workstations",
    "devices",
    "aiCapabilities",
    "arrangements",
    "aiCapabilityConfigs",
    "sopWorkstationAiConfigs",
    "students",
    "aiSourceVideos",
    "aiFrames",
    "aiClips",
    "aiAnnotationCategories",
  ])
    data[key] = (data[key] || []).filter(
      (x) => !x.demoPackageId && !String(x.id).includes("cap-demo-"),
    );
  const historical = JSON.stringify(data.arrangements);
  migrateEnhancementData(data);
  assert.equal(
    JSON.stringify(data.arrangements.filter((a) => !a.demoPackageId)),
    historical,
  );
  const once = JSON.stringify(data);
  migrateEnhancementData(data);
  assert.equal(JSON.stringify(data), once);
  assert.equal(
    data.arrangements.find((a) => a.id === "practice-demo-20261015").sessions[0]
      .evaluationProfile.aiRuntimeEnabled,
    true,
  );
});
test("新版工作数据不会向非当前来源写入，升级备份保留第一次的原始字节", async () => {
  const keys = PROTOTYPE_STORAGE_KEYS,
    storage = memoryStorage({
      [keys.browser]: '{"original":1}',
      [keys.cpd]: '{"fingerprint":"old","data":{"original":2}}',
    });
  await backupWorkingStorage(storage, null);
  persistWorkingData(storage, "browser", "new", { changed: 1 });
  assert.equal(
    storage.getItem(keys.cpd),
    '{"fingerprint":"old","data":{"original":2}}',
  );
  await backupWorkingStorage(storage, null);
  assert.equal(
    storage.getItem(`xingchen-backup-before-sop-20261015:${keys.browser}`),
    '{"original":1}',
  );
});
test("备份失败会报告错误且不覆盖原始记录", async () => {
  const storage = memoryStorage({
    [PROTOTYPE_STORAGE_KEYS.browser]: "original",
  });
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  await assert.rejects(backupWorkingStorage(storage, null), /Quota/);
  assert.equal(storage.getItem(PROTOTYPE_STORAGE_KEYS.browser), "original");
});
test("旧双镜头保留第二视角身份；新集合同步默认预览别名", () => {
  const legacy = cameraViews({ primaryCameraId: "a", fallbackCameraId: "b" });
  assert.equal(legacy[1].role, "legacy_secondary");
  const next = withCameraAliases({
    cameras: [
      { deviceId: "a", role: "auxiliary", enabled: true },
      { deviceId: "b", role: "primary", defaultPreview: true, enabled: true },
    ],
  });
  assert.equal(next.primaryCameraId, "b");
  assert.equal(next.fallbackCameraId, "a");
});
test("多相机不能抢占其他工位，且默认预览唯一", () => {
  const workstation = { id: "w" },
    devices = [{ id: "a", workstationId: "other", type: "全景摄像头" }];
  assert.throws(
    () =>
      validateCameraCollection(
        {
          cameras: [
            { deviceId: "a", name: "a", role: "primary", defaultPreview: true },
          ],
        },
        workstation,
        devices,
      ),
    /当前工位/,
  );
  assert.throws(
    () =>
      validateCameraCollection(
        {
          cameras: [
            {
              deviceId: "a",
              name: "a",
              role: "primary",
              defaultPreview: false,
            },
          ],
        },
        workstation,
        devices,
      ),
    /一个默认预览/,
  );
});
test("同一逻辑区域可存多个相机矩形，修改不删除别的视角", () => {
  const workstation = {
    id: "w",
    aiBaseConfig: { primaryCameraId: "a", fallbackCameraId: "b" },
  };
  let config = setLogicalAreaMapping({
    config: {},
    logicalAreaId: "area",
    cameraId: "a",
    rectangle: { x: 1, y: 2, width: 20, height: 20 },
    workstation,
    now,
  });
  config = setLogicalAreaMapping({
    config,
    logicalAreaId: "area",
    cameraId: "b",
    rectangle: { x: 10, y: 10, width: 30, height: 30 },
    workstation,
    now,
  });
  assert.equal(config.logicalAreaMappings.length, 2);
  config = setLogicalAreaMapping({
    config,
    logicalAreaId: "area",
    cameraId: "a",
    rectangle: { x: 5, y: 5, width: 20, height: 20 },
    workstation,
    now,
  });
  assert.equal(
    config.logicalAreaMappings.find((m) => m.cameraId === "b").x,
    10,
  );
});
test("预标注跳过已完成与封存测试，只产生建议不修改正式标注", () => {
  const f = annotationFixture();
  f.items.push(
    { ...f.items[0], id: "completed", annotationStatus: "completed" },
    { ...f.items[0], id: "sealed", sourceVideoId: "sealed" },
  );
  f.sourceVideos.push({ id: "sealed", sampleUse: "sealed_test" });
  const task = createPreannotationTask(f);
  assert.equal(task.items.length, 1);
  const result = finishPreannotationDemo(task, { ...f, now });
  assert.equal(result.status, "completed");
  assert.equal(f.items[0].annotationStatus, "not_started");
  assert.deepEqual(f.items[0].boxes, []);
  assert.equal(result.suggestions[0].status, "pending_confirmation");
});
test("来源变化与人工先改标注时建议过期；错误时间段不能采用", () => {
  const f = annotationFixture(),
    task = finishPreannotationDemo(createPreannotationTask(f), { ...f, now });
  const s = task.suggestions[0];
  assert.throws(
    () =>
      validateSuggestion(
        s,
        { ...f.items[0], annotationUpdatedAt: now },
        f.sourceVideos[0],
        f.categories,
      ),
    /过期/,
  );
  assert.throws(
    () =>
      validateSuggestion(
        {
          ...s,
          boxes: undefined,
          actionCategoryId: "label",
          refinedStartMs: 0,
          refinedEndMs: 12000,
        },
        f.items[0],
        f.sourceVideos[0],
        f.categories,
      ),
    /时间范围/,
  );
  assert.equal(sourceDurationMs({ duration: "00:01:02" }), 62000);
  assert.equal(sourceDurationMs({ durationMs: 4500 }), 4500);
});
test("建议采用记录仅在人工保存时写入；重试不重置已保存结果", () => {
  const f = annotationFixture(),
    task = finishPreannotationDemo(createPreannotationTask(f), { ...f, now });
  const data = { aiPreannotationTasks: [task] };
  const rows = confirmSuggestionSaved(
    data,
    { taskId: "task" },
    f.items[0],
    f.sourceVideos[0],
    f.categories,
    now,
  );
  assert.equal(rows[0].suggestions[0].status, "adopted");
  assert.equal(
    data.aiPreannotationTasks[0].suggestions[0].status,
    "pending_confirmation",
  );
  const retry = finishPreannotationDemo(
    { ...rows[0], status: "partial_failed" },
    { ...f, now },
  );
  assert.equal(retry.suggestions[0].status, "adopted");
});
test("采集组跨视频合并，分组保存覆盖同组全部视频，封存不能移进训练", () => {
  const capability = { id: "c", type: "action_recognition" },
    sources = [
      { id: "v1", sourceGroupId: "group", participantId: "person" },
      { id: "v2", sourceGroupId: "group", participantId: "person" },
    ],
    candidates = [
      { id: "a", sourceVideoId: "v1", actionCategoryId: "label" },
      { id: "b", sourceVideoId: "v2", actionCategoryId: "label" },
    ];
  const groups = groupTrainingCandidates({
    candidates,
    sourceVideos: sources,
    capability,
    categories: [],
    config: {},
  });
  assert.equal(groups.length, 1);
  const config = assignSourceGroup({}, groups[0], "train");
  assert.equal(config.sourceAssignments.v1.split, "train");
  assert.equal(config.sourceAssignments.v2.split, "train");
  assert.throws(
    () => assignSourceGroup({}, { ...groups[0], sealed: true }, "train"),
    /封存/,
  );
});
test("同一操作人跨集合会阻止数据就绪", () => {
  const groups = [
    {
      sourceVideoId: "v1",
      participantIds: ["p"],
      split: "train",
      items: [],
      itemCount: 1,
    },
    {
      sourceVideoId: "v2",
      participantIds: ["p"],
      split: "test",
      items: [],
      itemCount: 1,
    },
  ];
  const result = buildTrainingReadiness({
    capability: { id: "c", type: "action_recognition" },
    groups,
    candidates: [],
    categories: [],
    config: {},
  });
  assert.equal(result.checks.noParticipantLeakage, false);
  assert.match(result.blockers.join(","), /操作人/);
});
test("重叠窗口合并为一次动作，重复观察幂等，未达到持续时长不推进", () => {
  let session = demo();
  const item =
    session.evaluationSnapshot.aiCapabilityConfigSnapshot.judgementItems[0];
  item.conditions[0].minDurationSeconds = 6;
  let r = simulate(session, {
    id: "same",
    eventId: "action",
    startedAtMs: 1000,
    endedAtMs: 4000,
  });
  assert.equal(r.completed, false);
  assert.equal(r.updatedSession.runtime.actionEvents.length, 1);
  r = simulate(r.updatedSession, {
    id: "same",
    eventId: "action",
    startedAtMs: 1000,
    endedAtMs: 4000,
  });
  assert.equal(r.duplicate, true);
  assert.equal(r.updatedSession.runtime.aiObservations.length, 1);
  r = simulate(r.updatedSession, {
    eventId: "action",
    startedAtMs: 3000,
    endedAtMs: 7000,
  });
  assert.equal(r.completed, true);
  assert.equal(r.updatedSession.runtime.actionEvents.length, 1);
  assert.equal(r.updatedSession.currentStepId, "Step 02");
  assert.equal(r.updatedSession.steps[0].resultSource, "prototype_demo");
});
test("中断或遮挡后的时间不能跨缺失区间拼接", () => {
  let session = demo();
  session.evaluationSnapshot.aiCapabilityConfigSnapshot.judgementItems[0].conditions[0].minDurationSeconds = 6;
  session = simulate(session, {
    eventId: "action",
    phase: "start",
    startedAtMs: 0,
    endedAtMs: 3000,
  }).updatedSession;
  session = simulate(session, {
    eventId: "action",
    phase: "interrupted",
    startedAtMs: 3000,
    endedAtMs: 3000,
  }).updatedSession;
  const r = simulate(session, {
    eventId: "action",
    startedAtMs: 5000,
    endedAtMs: 8000,
  });
  assert.equal(r.completed, false);
  assert.ok(r.updatedSession.runtime.actionEvents.length >= 2);
});
test("提前动作保留审计但不关闭当前或后续步骤", () => {
  const r = simulate(demo(), {}, 1);
  assert.equal(r.completed, false);
  assert.equal(r.updatedSession.currentStepId, "Step 01");
  assert.equal(
    r.updatedSession.runtime.aiObservations[0].captureStepId,
    "Step 01",
  );
  assert.equal(r.updatedSession.runtime.aiObservations[0].stepId, "Step 02");
});
test("错Session、错模型、身份不明与必需视角缺失不会推进或扣分", () => {
  for (const payload of [
    { sessionId: "other" },
    { modelArtifactId: "wrong" },
    { actorId: "other" },
    { visibility: "occluded" },
    { observedTargetCount: 0 },
  ]) {
    const r = simulate(demo(), payload);
    assert.equal(r.confirmed, false);
    assert.equal(r.updatedSession.currentStepId, "Step 01");
    assert.equal(r.updatedSession.runtime.aiObservations[0].result, "unknown");
    assert.equal(r.updatedSession.steps[0].effectiveScore, 30);
  }
});
test("多视角共同满足需每个相机完整事实，交接不明返回未知", () => {
  let session = demo();
  const binding =
    session.evaluationSnapshot.sopWorkstationAiConfigSnapshot
      .judgementCameraBindings[0];
  binding.cameraIds = ["cam-demo-main", "cam-demo-detail"];
  binding.strategy = "all";
  let r = simulate(session, { cameraId: "cam-demo-main" });
  assert.equal(r.confirmed, false);
  r = simulate(r.updatedSession, { cameraId: "cam-demo-detail" });
  assert.equal(r.confirmed, false);
  session = r.updatedSession;
  session.runtime.cameraActorBindings = {
    "cam-demo-detail": { status: "confirmed", actorId: session.studentId },
  };
  r = simulate(session, { cameraId: "cam-demo-detail" });
  assert.equal(r.confirmed, true);
  assert.equal(r.updatedSession.steps[0].evidenceCameraIds.length, 2);
});
test("任一视角可在主视角故障时使用已验证辅助，不受无关相机离线拖累", () => {
  const d = clone(original),
    relation = d.sopWorkstationAiConfigs.find(
      (r) => r.id === "relation-demo-bench-20261015",
    );
  relation.judgementCameraBindings.forEach((b) => {
    b.strategy = "any";
    b.cameraIds = ["cam-demo-main", "cam-demo-detail"];
  });
  d.devices.find((d) => d.id === "cam-demo-main").status = "离线";
  const gate = deriveAiRuntimeGate({
    sopId: "sop-demo-bench-20261015",
    workstationId: "ws-demo-20261015",
    ...d,
  });
  assert.equal(gate.enabled, true);
  assert.equal(gate.runtimeStatus, "partial_runnable");
});
test("持续手套要求失效后保留原完成记录，当前状态单独标未知，不自动扣分", () => {
  let session = simulate(demo()).updatedSession;
  const before = session.steps[0].score,
    r = simulate(session, {
      phase: "invalid",
      startedAtMs: 5000,
      endedAtMs: 5000,
    });
  assert.equal(r.updatedSession.steps[0].state, "pass");
  assert.equal(r.updatedSession.steps[0].score, before);
  assert.equal(
    r.updatedSession.runtime.sustainedStates["req-demo-glove"].status,
    "invalid",
  );
});
test("保分、学生提交与AI完成分离，历史通过不能反推AI确认", () => {
  const active = applyDefaultPassPolicy({
    id: "s",
    state: "active",
    evidenceSemantics: "observations_v1",
    maxScore: 10,
    aiDecision: "uncertain",
  });
  assert.equal(active.state, "active");
  assert.equal(active.score, 10);
  assert.equal(evaluationCoverage([active]).confirmed, 0);
  const submitted = finalizeSubmittedStep(active, now);
  assert.equal(submitted.completionSource, "student");
  assert.equal(submitted.completionResult, "uncertain");
  assert.equal(
    stepEvaluationMeaning({ state: "pass", result: "通过" }).key,
    "legacy",
  );
});
test("真实验证不能用演示案例或手填百分比放行，缺少服务核验不能发布已有模型", () => {
  const session = demo(),
    cases =
      session.evaluationSnapshot.sopWorkstationAiConfigSnapshot.validationCases,
    result = evaluateValidationCompletion({
      aiConfig: session.evaluationSnapshot.aiCapabilityConfigSnapshot,
      cases,
      checks: { ready: true },
      validationPurpose: "real",
      independentReport: {
        id: "r",
        passed: true,
        resultSource: "real",
        datasetRef: "d",
      },
      capabilities: session.evaluationSnapshot.capabilitySnapshots,
    });
  assert.equal(result.passed, false);
  assert.match(result.issues.join(","), /执行记录|模型接入/);
  const candidate = { id: "c", capabilityId: "cap", modelArtifactId: "m" };
  assert.equal(
    validateExistingModelReport(candidate, {
      id: "r",
      candidateId: "c",
      capabilityId: "wrong",
      modelArtifactId: "m",
      datasetRef: "d",
      passed: true,
    }).ready,
    false,
  );
  assert.equal(
    validateExistingModelReport(
      candidate,
      {
        id: "r",
        candidateId: "c",
        capabilityId: "cap",
        modelArtifactId: "m",
        datasetRef: "d",
        passed: true,
        resultSource: "real",
      },
      "real",
    ).ready,
    false,
  );
});
test("已有模型演示可独立验证发布，无需伪造训练任务，并使相关工位待重验", () => {
  let data = clone(original);
  const count = data.aiTrainingTasks.length,
    store = createEnhancementActions({
      setData: (fn) => {
        data = fn(data);
      },
      now: () => now,
      makeId,
    });
  const candidate = store.saveExistingModelCandidate(
    "cap-demo-meter-20261015",
    { modelArtifactId: "external-demo", description: "演示模型" },
  );
  store.evaluateExistingModel(candidate.id);
  store.publishExistingModel(candidate.id);
  assert.equal(data.aiTrainingTasks.length, count);
  assert.equal(
    data.aiCapabilities.find((c) => c.id === "cap-demo-meter-20261015")
      .currentPublishedModel.source,
    "existing_model",
  );
  assert.equal(
    data.sopWorkstationAiConfigs.find(
      (r) => r.id === "relation-demo-bench-20261015",
    ).validationStatus,
    "pending_revalidation",
  );
  assert.throws(() => store.publishExistingModel(candidate.id), /验证|发布/);
});
test("新演示包不污染业务大屏统计，考试隐私规则继续生效", () => {
  const snapshot = buildDataScreenSnapshot(original);
  assert.equal(
    snapshot.workstations.some((w) => w.id === "ws-demo-20261015"),
    false,
  );
  assert.equal(
    snapshot.workstations
      .filter((w) => w.isExam)
      .every((w) => w.steps.length === 0),
    true,
  );
});
test("持续检查不能指向不存在或更早的步骤", () => {
  const step = {
    id: "b",
    expectedJudgementMode: "visual_auto",
    visualRequirements: [
      {
        id: "r",
        name: "手套",
        target: "state",
        definition: "戴好",
        evidence: "可见",
        unknownWhen: "遮挡",
        continuous: "specified",
        endStepId: "missing",
      },
    ],
  };
  assert.match(
    visualRequirementIssues(step, [{ id: "a" }, { id: "b" }]).join(","),
    /结束步骤/,
  );
});

test("共同视角的事实时间必须接近，不能拼接两个不同时间的操作", () => {
  let session = demo();
  const binding =
    session.evaluationSnapshot.sopWorkstationAiConfigSnapshot
      .judgementCameraBindings[0];
  binding.strategy = "all";
  binding.cameraIds = ["cam-demo-main", "cam-demo-detail"];
  session.runtime.cameraActorBindings = {
    "cam-demo-detail": { status: "confirmed", actorId: session.studentId },
  };
  session = simulate(session, {
    cameraId: "cam-demo-main",
    startedAtMs: 0,
    endedAtMs: 3000,
  }).updatedSession;
  const r = simulate(session, {
    cameraId: "cam-demo-detail",
    startedAtMs: 20000,
    endedAtMs: 23000,
  });
  assert.equal(r.confirmed, false);
});
test("持续状态结束范围外只记录观察，不改变已经结束的要求", () => {
  let session = demo();
  session.evaluationSnapshot.sopSnapshot.steps[0].visualRequirements[0].endStepId =
    "Step 01";
  session = simulate(session).updatedSession;
  const before = clone(session.steps[0]),
    r = simulate(session, {
      phase: "invalid",
      startedAtMs: 8000,
      endedAtMs: 8000,
    });
  assert.equal(
    r.updatedSession.runtime.aiObservations.at(-1).outsideRequirementWindow,
    true,
  );
  assert.deepEqual(r.updatedSession.steps[0], before);
  assert.equal(
    r.updatedSession.runtime.sustainedStates["req-demo-glove"].status,
    "valid",
  );
});
test("真实用途会话拒绝模拟入口；未知观察不会重复生成同原因提醒", () => {
  const real = demo();
  real.evaluationSnapshot.executionPurpose = "real";
  assert.throws(() => simulate(real), /真实现场会话/);
  let session = simulate(demo(), { visibility: "occluded" }).updatedSession;
  const count = session.events.filter((e) => e.type === "ai_uncertain").length;
  session = simulate(session, {
    visibility: "occluded",
    startedAtMs: 7000,
    endedAtMs: 8000,
  }).updatedSession;
  assert.equal(
    session.events.filter((e) => e.type === "ai_uncertain").length,
    count,
  );
});

test("恢复保留的历史模型需要原因，保留原会话快照并进入待重验", () => {
  let data = clone(original);
  const sessionSnapshot = JSON.stringify(
      data.arrangements.find((a) => a.id === "practice-demo-20261015")
        .sessions[0].evaluationSnapshot,
    ),
    store = createEnhancementActions({
      setData: (fn) => {
        data = fn(data);
      },
      now: () => now,
      makeId,
    });
  const candidate = store.saveExistingModelCandidate(
    "cap-demo-meter-20261015",
    { modelArtifactId: "external-new", description: "示例" },
  );
  store.evaluateExistingModel(candidate.id);
  store.publishExistingModel(candidate.id);
  const record = data.aiModelPublicationRecords[0];
  assert.throws(
    () => store.restorePublishedModel(candidate.capabilityId, record.id, ""),
    /原因/,
  );
  store.restorePublishedModel(
    candidate.capabilityId,
    record.id,
    "事件漏检，恢复演示原产物",
  );
  assert.equal(
    data.aiCapabilities.find((c) => c.id === candidate.capabilityId)
      .currentPublishedModel.modelArtifactId,
    "demo-meter-artifact",
  );
  assert.equal(data.aiModelPublicationRecords[0].publicationType, "restore");
  assert.equal(
    JSON.stringify(
      data.arrangements.find((a) => a.id === "practice-demo-20261015")
        .sessions[0].evaluationSnapshot,
    ),
    sessionSnapshot,
  );
});
