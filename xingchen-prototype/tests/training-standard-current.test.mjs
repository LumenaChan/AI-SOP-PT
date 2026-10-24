import test from "node:test";
import assert from "node:assert/strict";
import {
  overwriteCurrentStandard,
  applyCurrentStandardUpdate,
  historicalStandardBasis,
  standardDefinitionKey,
  standardReferenceMatches,
} from "../src/trainingStandardRules.js";
import {
  teachingStatistics,
  statisticsStandardOptions,
  statisticsSteps,
  statisticsProgress,
} from "../src/teachingStatisticsRules.js";
import {
  automaticEvaluationGate,
  isMappingApplicableToSop,
  createIndependentSopCopy,
} from "../src/domainRules.js";
import { deriveAiRuntimeGate } from "../src/aiRuntimeRules.js";
const at = "2026-10-24 19:00:00";
const standard = () => ({
  id: "standard",
  name: "安全工具操作",
  version: "legacy-label",
  familyId: "legacy-family",
  status: "已发布",
  frozen: true,
  updatedAt: "2026-10-23 12:00:00",
  publishedAt: "2026-10-01 10:00:00",
  signedBy: "王老师",
  usedStepIds: ["Step 01"],
  steps: [
    {
      id: "Step 01",
      name: "工具检查",
      score: 100,
      completionCondition: "确认工具绝缘完整无破损",
      judgementMode: "visual_auto",
    },
  ],
  scoreRules: [
    {
      id: "deduct",
      stepId: "Step 01",
      deduction: 10,
      description: "确认未检查扣10分",
    },
  ],
  safetyRules: [],
  history: [{ id: "old-audit" }],
});
const arrangement = (id, sop = standard(), score = 90) => ({
  id,
  name: id,
  type: "practice",
  teacherId: "t1",
  sopId: sop.id,
  status: "已结束",
  snapshot: { sopSnapshot: structuredClone(sop) },
  sessions: [
    {
      id: "session-" + id,
      studentId: "s1",
      status: "已完成",
      resultStatus: "正式成绩",
      score,
      scoreVersion: 3,
      endedAt: id === "one" ? "2026-10-21 12:00:00" : "2026-10-22 12:00:00",
      scoreRevisions: [{ id: "unchanged-revision", after: { score } }],
      steps: [
        {
          id: "Step 01",
          name: "工具检查",
          maxScore: 100,
          score,
          effectiveScore: score,
          state: "pass",
          result: "通过（扣分）",
          reviewStatus: "无需复核",
        },
      ],
    },
  ],
});
const fixture = () => ({
  sops: [standard()],
  arrangements: [arrangement("one"), arrangement("two")],
  students: [{ id: "s1", name: "学生", no: "123" }],
  aiCapabilityConfigs: [
    {
      id: "config",
      sopId: "standard",
      status: "completed",
      standardDefinitionKey: standardDefinitionKey(standard()),
    },
    { id: "other", sopId: "other", status: "completed" },
  ],
  sopWorkstationAiConfigs: [
    {
      id: "relation",
      sopAiConfigId: "config",
      workstationId: "w1",
      validationStatus: "passed",
      enableStatus: "enabled",
    },
    {
      id: "other-relation",
      sopAiConfigId: "other",
      validationStatus: "passed",
    },
  ],
  models: [{ id: "model", version: "M3" }],
  datasets: [{ id: "dataset", version: "D2" }],
  auditLogs: [{ id: "audit" }],
});
const filters = { sopId: "standard", type: "practice" };

test("已发布标准覆盖同一对象，保留标识/状态/签名而不生成业务版本", () => {
  const before = standard(),
    input = {
      ...structuredClone(before),
      id: "injected",
      version: "V999",
      familyId: "new-family",
      status: "草稿",
      name: "更新名称",
    };
  const { standard: next, criticalChange } = overwriteCurrentStandard(
    before,
    input,
    at,
  );
  assert.equal(next.id, before.id);
  assert.equal(next.version, before.version);
  assert.equal(next.familyId, before.familyId);
  assert.equal(next.status, "已发布");
  assert.equal(next.frozen, false);
  assert.equal(next.signedBy, before.signedBy);
  assert.equal(next.publishedAt, before.publishedAt);
  assert.equal(next.name, "更新名称");
  assert.equal(next.updatedAt, at);
  assert.equal(criticalChange, false);
  assert.equal(before.name, "安全工具操作");
  assert.throws(
    () =>
      overwriteCurrentStandard(before, { ...input, updatedAt: "stale" }, at),
    /已被更新/,
  );
  assert.throws(
    () => overwriteCurrentStandard(before, { ...input, name: " " }, at),
    /名称/,
  );
  const copy = createIndependentSopCopy(before, {
    id: "independent",
    name: "独立标准",
  });
  assert.notEqual(copy.id, before.id);
  assert.equal(copy.status, "草稿");
});
test("关键内容修改只影响当前AI适配，不回写历史快照/成绩/模型与数据发布", () => {
  const data = fixture(),
    before = structuredClone(data),
    current = data.sops[0],
    input = structuredClone(current);
  input.steps[0].completionCondition = "先外观检查，再确认绝缘标识";
  const change = overwriteCurrentStandard(current, input, at),
    next = applyCurrentStandardUpdate(
      data,
      current,
      change.standard,
      change.criticalChange,
      at,
    );
  assert.equal(next.sops.length, 1);
  assert.equal(next.sops[0].id, current.id);
  assert.equal(next.sops[0].standardContentChangedAt, at);
  assert.deepEqual(next.arrangements, before.arrangements);
  assert.equal(next.arrangements[0], data.arrangements[0]);
  assert.equal(next.aiCapabilityConfigs[0].status, "configuring");
  assert.equal(next.aiCapabilityConfigs[0].standardReviewRequired, true);
  assert.equal(
    next.sopWorkstationAiConfigs[0].validationStatus,
    "pending_revalidation",
  );
  assert.deepEqual(next.aiCapabilityConfigs[1], before.aiCapabilityConfigs[1]);
  assert.deepEqual(
    next.sopWorkstationAiConfigs[1],
    before.sopWorkstationAiConfigs[1],
  );
  assert.deepEqual(next.models, before.models);
  assert.deepEqual(next.datasets, before.datasets);
  assert.deepEqual(next.auditLogs, before.auditLogs);
  assert.deepEqual(data, before);
  const historyModel = teachingStatistics(next, filters);
  assert.equal(statisticsSteps(historyModel, filters)[0].count, 2);
  assert.equal(
    historicalStandardBasis(
      next.arrangements[0],
      next.arrangements[0].sessions[0],
    ).key,
    standardDefinitionKey(current),
  );
  const future = arrangement("future", next.sops[0]);
  assert.notEqual(
    historicalStandardBasis(future, future.sessions[0]).key,
    standardDefinitionKey(current),
  );
});
test("名称与示教媒体编辑不使现有AI配置和现场验证失效", () => {
  const data = fixture(),
    current = data.sops[0],
    input = structuredClone(current);
  input.name = "新的标准名称";
  input.steps[0].teachingContent = "新的教学说明";
  input.steps[0].standardMedia = [{ id: "new-video" }];
  const change = overwriteCurrentStandard(current, input, at),
    next = applyCurrentStandardUpdate(
      data,
      current,
      change.standard,
      change.criticalChange,
      at,
    );
  assert.equal(change.criticalChange, false);
  assert.deepEqual(next.aiCapabilityConfigs, data.aiCapabilityConfigs);
  assert.deepEqual(next.sopWorkstationAiConfigs, data.sopWorkstationAiConfigs);
});
test("未保存的历史标准不得以当前内容补成可分析记录，真实当时快照优先于兼容展示副本", () => {
  const data = fixture(),
    ar = data.arrangements[0];
  delete ar.snapshot;
  const current = data.sops[0],
    input = structuredClone(current);
  input.steps[0].score = 80;
  const change = overwriteCurrentStandard(current, input, at),
    next = applyCurrentStandardUpdate(
      data,
      current,
      change.standard,
      change.criticalChange,
      at,
    ),
    old = next.arrangements[0];
  assert.equal(
    old.snapshot.standardSnapshotProvenance,
    "legacy_preserved_display",
  );
  assert.equal(old.snapshot.sopSnapshot.steps[0].score, 100);
  assert.equal(historicalStandardBasis(old, old.sessions[0]).complete, false);
  const real = arrangement("real");
  real.sessions[0].evaluationSnapshot = {
    sopSnapshot: {
      ...standard(),
      steps: [{ ...standard().steps[0], score: 5 }],
    },
    standardSnapshotProvenance: "legacy_current_fallback",
  };
  assert.equal(
    historicalStandardBasis(real, real.sessions[0]).key,
    standardDefinitionKey(real.snapshot.sopSnapshot),
  );
});
test("无版本号的完整快照可分析；标签不同的相同评分口径合并", () => {
  const data = fixture();
  delete data.arrangements[0].snapshot.sopSnapshot.version;
  data.arrangements[1].snapshot.sopSnapshot.version = "另一个旧标签";
  const before = structuredClone(data),
    model = teachingStatistics(data, filters),
    groups = statisticsStandardOptions(model);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].ready, true);
  assert.equal(statisticsSteps(model, filters).length, 1);
  assert.equal(statisticsProgress(model, "s1", filters).ready, true);
  assert.deepEqual(data, before);
});
test("同标准ID/步骤ID/旧标签下完成条件、扣分、安全规则变化必须分开分析", () => {
  for (const mutate of [
    (s) => (s.steps[0].completionCondition = "其他完成条件"),
    (s) => (s.steps[0].score = 80),
    (s) => (s.scoreRules[0].deduction = 20),
    (s) =>
      s.safetyRules.push({ id: "redline", stepId: "Step 01", action: "block" }),
  ]) {
    const data = fixture();
    mutate(data.arrangements[1].snapshot.sopSnapshot);
    const model = teachingStatistics(data, filters),
      groups = statisticsStandardOptions(model);
    assert.equal(groups.length, 2);
    assert.deepEqual(statisticsSteps(model, filters), []);
    assert.equal(statisticsProgress(model, "s1", filters).ready, false);
    for (const group of groups)
      assert.equal(
        teachingStatistics(data, {
          ...filters,
          basisArrangementId: group.basisArrangementId,
          basisSessionId: group.basisSessionId,
        }).metrics.rows.length,
        1,
      );
  }
});
test("缺完成条件/非法满分/缺步骤/无历史快照只保留原始结果入口，不推断当前标准", () => {
  for (const mutate of [
    (s) => delete s.steps[0].completionCondition,
    (s) => (s.steps[0].score = null),
    (s) => (s.steps[0].score = ""),
    (s) => (s.steps[0].score = true),
    (s) => (s.steps = []),
  ]) {
    const data = fixture();
    mutate(data.arrangements[0].snapshot.sopSnapshot);
    const ar = data.arrangements[0];
    assert.equal(historicalStandardBasis(ar, ar.sessions[0]).complete, false);
    assert.ok(
      statisticsStandardOptions(teachingStatistics(data, filters)).some(
        (g) => !g.ready,
      ),
    );
  }
  const data = fixture();
  data.arrangements.forEach((a) => delete a.snapshot);
  assert.deepEqual(
    statisticsSteps(teachingStatistics(data, filters), filters),
    [],
  );
});
test("AI引用按内容绑定；标准变更后旧版本兼容确认不能绕过验证", () => {
  const before = standard(),
    legacy = { sopId: before.id, sopVersion: before.version },
    changed = structuredClone(before);
  changed.steps[0].completionCondition = "新增检查";
  changed.standardContentChangedAt = at;
  assert.equal(standardReferenceMatches(legacy, before), true);
  assert.equal(standardReferenceMatches(legacy, changed), false);
  const reference = {
    sopId: changed.id,
    standardDefinitionKey: standardDefinitionKey(changed),
    sopVersion: "ignored-label",
  };
  assert.equal(standardReferenceMatches(reference, changed), true);
  assert.equal(
    isMappingApplicableToSop({ authoredFor: reference }, changed),
    true,
  );
  assert.equal(
    isMappingApplicableToSop({}, before),
    false,
    "未绑定标准的Mapping不能跨标准应用",
  );
  const gate = automaticEvaluationGate({
    sop: changed,
    workstation: {
      implementation: {
        cameraPosition: "已确认",
        lighting: "已确认",
        occlusion: "已确认",
        roiVersion: "R1",
        cameraConfigVersion: "C1",
      },
    },
    model: { ...legacy, status: "已部署", version: "M1" },
    validation: {
      ...legacy,
      status: "通过",
      modelVersion: "M1",
      roiVersion: "R1",
      cameraConfigVersion: "C1",
    },
    compatibilityDecision: {
      decision: "compatible",
      affectedLayers: {
        aiPackage: "compatible",
        validation: "compatible",
        workstationProfile: "compatible",
      },
    },
  });
  assert.equal(gate.enabled, false);
  assert.ok(gate.reasons.some((r) => r.includes("标准内容")));
  const pending = deriveAiRuntimeGate({
    sopId: before.id,
    workstationId: "w1",
    sops: [before],
    workstations: [{ id: "w1" }],
    aiCapabilityConfigs: [
      { id: "config", sopId: before.id, standardReviewRequired: true },
    ],
  });
  assert.equal(pending.enabled, false);
  assert.ok(pending.reasons.some((r) => r.includes("尚待核对")));
});

for (const type of ["practice", "exam"])
  test(`${type}已锁定安排后开放的工位仍用原步骤，新安排使用覆盖后的当前标准`, async () => {
    const { studentRuntimeFixture } = await import("./student-e2e-fixture.mjs");
    const { createAiRuntimeStore } = await import("../src/aiRuntimeStore.js");
    const { confirmOpeningCheck } = await import("./opening-check-fixture.mjs");
    const seed = studentRuntimeFixture(),
      w = seed.workstations[0].id,
      original = structuredClone(seed.sops[0]);
    const store = createAiRuntimeStore(seed, { now: () => at });
    const a = store.saveArrangement(
      {
        type,
        name: "已锁定安排",
        sopId: original.id,
        teacherId: seed.teachers[0].id,
        studentIds: [seed.students[0].id],
        workstationIds: [w],
        ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
      },
      true,
    );
    const data = store.getData(),
      locked = data.arrangements.find((x) => x.id === a.id);
    locked.snapshot = {
      sopId: original.id,
      sopSnapshot: original,
      lockedAt: "2026-10-23 12:00:00",
    };
    data.sops[0].steps[0].score = data.sops[0].steps[0].maxScore = 20;
    data.sops[0].steps[0].completionCondition = "修改后的动作";
    const edited = createAiRuntimeStore(data, { now: () => at }),
      check = confirmOpeningCheck(edited, a.id, w);
    const opened = edited.openArrangementWorkstation(a.id, w, check).session;
    assert.equal(opened.evaluationSnapshot.sopSnapshot.steps[0].score, 100);
    assert.equal(opened.steps[0].maxScore, 100);
    assert.equal(opened.steps[0].completionCondition, "动作完成");
    const newSeed = studentRuntimeFixture();
    newSeed.sops = data.sops;
    const future = createAiRuntimeStore(newSeed, { now: () => at }),
      fresh = future.saveArrangement(
        {
          type,
          name: "新安排",
          sopId: original.id,
          teacherId: seed.teachers[0].id,
          studentIds: [seed.students[0].id],
          workstationIds: [w],
          ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
        },
        true,
      );
    const next = future.openArrangementWorkstation(
      fresh.id,
      w,
      confirmOpeningCheck(future, fresh.id, w),
    ).session;
    assert.equal(next.evaluationSnapshot.sopSnapshot.steps[0].score, 20);
    assert.equal(next.steps[0].maxScore, 20);
  });
