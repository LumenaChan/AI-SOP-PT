import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultValidationCases,
  buildValidationCoverage,
  validationCaseInputIssues,
  normalizeSopWorkstationAiConfig,
  deriveSopWorkstationRuntimeStatus,
  validationScenariosFor,
  completeValidationCases,
  validationPlan,
  evaluateValidationCompletion,
} from "../src/sopWorkstationAiRules.js";
import {
  createWorkstationValidationActions,
  assertFieldEnablement,
  validationResult,
} from "../src/workstationValidationActions.js";
import {
  validationEvidenceUrl,
  fieldModelIssues,
} from "../src/fieldValidationEvidenceRules.js";
import { persistWorkingData } from "../src/storageMigrationRules.js";
import { createEnhancementActions } from "../src/enhancementStore.js";
const at = "2026-10-25T08:00:00.000Z";
const config = {
  id: "config",
  stepConfigs: [{ stepId: "step", actualEvaluationMode: "visual_auto" }],
  judgementItems: ["a", "b"].map((id) => ({
    id,
    stepId: "step",
    name: `判断项${id}`,
    purposes: ["completion", "safety"],
    conditions: [{ capabilityId: "cap" }],
  })),
};
const capabilities = [
  {
    id: "cap",
    name: "动作识别能力",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: {
      modelArtifactId: "model",
      resultSource: "real",
      integrationStatus: "connected_verified",
      independentReport: {
        id: "report",
        modelArtifactId: "model",
        capabilityId: "cap",
        resultSource: "real",
        passed: true,
        datasetRef: "independent-test",
        eventMetrics: { f1: 0.95 },
        reportUrl: "https://evidence.example.test/report",
      },
    },
  },
];
const description = "系统完整记录了当前场景下各判断项的识别输出";
const reviewNote = "已核对各项系统输出和预期状态一致且没有误报";
const good = (c) => ({
  ...c,
  result: "passed",
  judgementItemIds: ["a", "b"],
  actualResult: description,
  reviewNote,
  executor: "实施工程师",
  evidenceUrl: "https://evidence.example.test/clip.mp4",
});
function fixture(purpose = "real", source = "browser") {
  let data = {
    sops: [{ id: "sop", name: "实训标准" }],
    aiCapabilityConfigs: [structuredClone(config)],
    aiCapabilities: structuredClone(capabilities),
    workstations: [
      {
        id: "w",
        status: "可入场",
        aiBaseConfig: { primaryCameraId: "camera", edgeDeviceId: "edge" },
      },
    ],
    sopWorkstationAiConfigs: [
      normalizeSopWorkstationAiConfig({
        id: "relation",
        sopAiConfigId: "config",
        workstationId: "w",
        validationPurpose: purpose,
      }),
    ],
    aiFieldValidationExecutions: [],
    arrangements: [
      {
        id: "history",
        snapshot: { original: true },
        sessions: [{ score: 85 }],
      },
    ],
    auditLogs: [],
  };
  let counter = 0,
    fail = false,
    currentSource = source;
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => {
        if (fail) throw new Error("storage full");
        values.set(k, v);
      },
      removeItem: (k) => values.delete(k),
    };
  const getContext = () => ({
    relation: normalizeSopWorkstationAiConfig(data.sopWorkstationAiConfigs[0]),
    aiConfig: data.aiCapabilityConfigs[0],
    sop: data.sops[0],
    workstation: data.workstations[0],
    checks: {
      ready: !["故障", "维护中", "停用"].includes(data.workstations[0].status),
      issues: ["工位不可用"],
      readiness: { code: "available" },
      activeJudgementItems: config.judgementItems,
    },
  });
  const actions = createWorkstationValidationActions({
    getData: () => data,
    getContext,
    setData: (fn) => {
      if (currentSource !== source) throw new Error("来源已切换");
      const next = fn(data);
      persistWorkingData(storage, source, "test", next);
      data = next;
    },
    now: () => at,
    makeId: (p) => `${p}-${++counter}`,
    audit: (d, action) =>
      d.auditLogs.unshift({ id: `log-${++counter}`, action }),
  });
  const f = {
    get data() {
      return data;
    },
    actions,
    getContext: () => ({ ...getContext(), data }),
    values,
    set fail(v) {
      fail = v;
    },
    set source(v) {
      currentSource = v;
    },
  };
  f.start = () =>
    actions.startSopWorkstationValidation("relation", {
      tester: "现场工程师",
      lighting: "正常",
      occlusion: "无遮挡",
      tools: "标准工具",
    });
  f.receipt = (c) => {
    const r = data.sopWorkstationAiConfigs[0],
      execution = {
        id: `execution-${c.id}`,
        relationId: r.id,
        validationRunId: r.validationRunId,
        contextKey: r.validationContextKey,
        caseId: c.id,
        scenarioType: c.scenarioType,
        resultSource: "real",
        integrationStatus: "connected_verified",
        actualResult: description,
        executor: "服务执行人",
        completedAt: at,
        evidenceUrl: `https://evidence.example.test/${c.id}.mp4`,
        judgementItemIds: ["a", "b"],
        modelArtifacts: [{ capabilityId: "cap", modelArtifactId: "model" }],
        expectationMatched: true,
      };
    data.aiFieldValidationExecutions.push(execution);
    return execution;
  };
  f.finish = () => {
    const cases = structuredClone(
      data.sopWorkstationAiConfigs[0].validationCases,
    );
    for (const c of cases) {
      const input = good(c);
      if (purpose === "real") input.executionRecordId = f.receipt(c).id;
      actions.saveSopWorkstationValidationCase("relation", c.id, input);
    }
    return actions.completeSopWorkstationValidation("relation");
  };
  return f;
}

test("保存验证设置保留16类用例，缺少扩展标记的旧数据重新开始也不缩减范围", () => {
  const f = fixture("prototype_demo");
  const relation = f.data.sopWorkstationAiConfigs[0];
  relation.validationCases = createDefaultValidationCases({
    ...config,
    validationScenarioSet: "extended",
  });
  relation.validationCases[0] = good(relation.validationCases[0]);
  delete relation.validationScenarioSet;
  const savedCases = structuredClone(relation.validationCases);
  let settingsData = structuredClone(f.data);
  const settings = createEnhancementActions({
    setData: (fn) => {
      settingsData = fn(settingsData);
    },
    now: () => at,
    makeId: (prefix) => `${prefix}-settings`,
  });
  settings.saveValidationPurpose("relation", {
    validationPurpose: "prototype_demo",
  });
  assert.deepEqual(
    settingsData.sopWorkstationAiConfigs[0].validationCases,
    savedCases,
  );
  assert.equal(
    validationScenariosFor(settingsData.sopWorkstationAiConfigs[0]).length,
    16,
  );
  const restarted = f.start();
  assert.equal(restarted.validationScenarioSet, "extended");
  assert.equal(restarted.validationCases.length, 16);
  assert.equal(
    new Set(restarted.validationCases.map((c) => c.scenarioType)).size,
    16,
  );
  assert.ok(restarted.validationCases.every((c) => c.result === "pending"));
  assert.deepEqual(restarted.validationRecords[0].cases, savedCases);
  const fromHistory = normalizeSopWorkstationAiConfig({
    validationRecords: [{ cases: savedCases }],
  });
  assert.equal(validationScenariosFor(fromHistory).length, 16);
});

test("空配置和只有8类且无历史的旧配置均使用16类，补齐不覆盖已有结果", () => {
  assert.equal(validationScenariosFor({}).length, 16);
  const f = fixture("prototype_demo");
  const relation = f.data.sopWorkstationAiConfigs[0];
  const oldCases = createDefaultValidationCases(config).slice(0, 8).map(good);
  relation.validationCases = structuredClone(oldCases);
  delete relation.validationScenarioSet;
  assert.deepEqual(relation.validationRecords, []);
  const complete = completeValidationCases(config, oldCases);
  assert.equal(complete.length, 16);
  assert.deepEqual(complete.slice(0, 8), oldCases);
  assert.ok(
    complete.slice(8).every((c) => c.result === "pending" && !c.actualResult),
  );
  assert.deepEqual(completeValidationCases(config, complete), complete);
  assert.equal(f.start().validationCases.length, 16);
  assert.deepEqual(
    f.data.sopWorkstationAiConfigs[0].validationRecords[0].cases,
    oldCases,
  );
});

test("一次正常流程通过不能覆盖全部场景，数字和空泛结论不能作为验收依据", () => {
  const cases = createDefaultValidationCases(config);
  cases[0] = good(cases[0]);
  assert.equal(buildValidationCoverage(config, cases).covered, 0);
  const all = cases.map(good);
  assert.equal(buildValidationCoverage(config, all).complete, true);
  assert.ok(
    validationCaseInputIssues(
      { ...all[0], actualResult: "1" },
      config.judgementItems,
    ).length,
  );
  assert.ok(
    validationCaseInputIssues(
      { ...all[0], reviewNote: "通过" },
      config.judgementItems,
    ).length,
  );
  assert.ok(
    validationCaseInputIssues(
      { ...all[0], evidenceUrl: "javascript:alert(1)" },
      config.judgementItems,
    ).length,
  );
});
test("不适用需具体理由，核心场景不可免测，所有异常动作都免测不能验收", () => {
  const cases = createDefaultValidationCases(config).map(good);
  const index = cases.findIndex((c) => c.scenarioType === "wrong_order");
  cases[index] = {
    ...cases[index],
    result: "not_applicable",
    notApplicableReason: "该判断项仅检查持续状态，不涉及动作先后顺序",
  };
  assert.equal(buildValidationCoverage(config, cases).complete, true);
  assert.equal(
    validationCaseInputIssues(
      { ...cases[index], notApplicableReason: "无" },
      config.judgementItems,
    ).length > 0,
    true,
  );
  assert.equal(
    validationCaseInputIssues(
      {
        ...cases[0],
        result: "not_applicable",
        notApplicableReason: "该场景对当前工位不适用，需要不进行验证",
      },
      config.judgementItems,
    ).length > 0,
    true,
  );
  for (const c of cases)
    if (
      [
        "omission",
        "wrong_order",
        "wrong_object",
        "correction",
        "pseudo_completion",
        "interrupted_action",
        "background",
      ].includes(c.scenarioType)
    ) {
      c.result = "not_applicable";
      c.notApplicableReason = "该场景在此工位不适用并且已经人工说明理由";
    }
  assert.equal(buildValidationCoverage(config, cases).complete, false);
});
test("配置检查可完成并留档，但不能启用AI；正式验收与启用分别提交", () => {
  const f = fixture("prototype_demo");
  f.start();
  const done = f.finish();
  assert.equal(done.result.passed, true);
  assert.equal(done.updated.fieldAcceptance.status, "configuration_checked");
  assert.throws(() => f.actions.enableSopWorkstationAi("relation"), /配置检查/);
  const state = deriveSopWorkstationRuntimeStatus({
    config: { ...done.updated, enableStatus: "enabled" },
    checks: { ready: true },
    readiness: { code: "available" },
  });
  assert.equal(state.runnable, false);
});
test("关联服务执行自动带出结果与证据，全部场景通过后可正式启用，历史成绩不变", () => {
  for (const source of ["browser", "cpd"]) {
    const f = fixture("real", source),
      history = structuredClone(f.data.arrangements);
    f.start();
    const done = f.finish();
    assert.equal(done.result.passed, true, done.result.issues.join("；"));
    assert.equal(done.updated.enableStatus, "disabled");
    assert.equal(done.record.modelReports[0].report.id, "report");
    f.actions.enableSopWorkstationAi("relation");
    assert.equal(f.data.sopWorkstationAiConfigs[0].enableStatus, "enabled");
    assert.equal(f.data.aiCapabilityConfigs[0].status, "enabled");
    assert.deepEqual(f.data.arrangements, history);
    const state = deriveSopWorkstationRuntimeStatus({
      config: f.data.sopWorkstationAiConfigs[0],
      checks: { ready: true },
      readiness: { code: "available" },
    });
    assert.equal(state.runnable, true);
    assert.ok(
      f.data.sopWorkstationAiConfigs[0].validationCases.every(
        (c) => c.executor === "服务执行人" && c.executionRecordSnapshot?.id,
      ),
    );
  }
});
test("手填真实来源不能替代执行记录，跨工位／轮次／用例／模型记录不允许复用", () => {
  for (const mutate of [
    (r) => (r.relationId = "other"),
    (r) => (r.validationRunId = "old"),
    (r) => (r.caseId = "other"),
    (r) => (r.contextKey = "old"),
    (r) => (r.modelArtifacts[0].modelArtifactId = "old"),
    (r) => (r.completedAt = "2020-01-01T00:00:00Z"),
    (r) => (r.integrationStatus = "unverified"),
  ]) {
    const f = fixture();
    f.start();
    const c = f.data.sopWorkstationAiConfigs[0].validationCases[0],
      r = f.receipt(c);
    mutate(r);
    const before = structuredClone(f.data);
    assert.throws(() =>
      f.actions.saveSopWorkstationValidationCase("relation", c.id, {
        ...good(c),
        executionRecordId: r.id,
        resultSource: "real",
      }),
    );
    assert.deepEqual(f.data, before);
  }
  const f = fixture();
  f.start();
  const c = f.data.sopWorkstationAiConfigs[0].validationCases[0];
  assert.throws(
    () =>
      f.actions.saveSopWorkstationValidationCase("relation", c.id, {
        ...good(c),
        resultSource: "real",
      }),
    /执行记录/,
  );
});
test("系统未确认符合期望不能登记通过，可保存失败并形成失败结论", () => {
  const f = fixture();
  f.start();
  const c = f.data.sopWorkstationAiConfigs[0].validationCases[0],
    r = f.receipt(c);
  r.expectationMatched = false;
  assert.throws(
    () =>
      f.actions.saveSopWorkstationValidationCase("relation", c.id, {
        ...good(c),
        executionRecordId: r.id,
      }),
    /不能登记为通过/,
  );
  f.actions.saveSopWorkstationValidationCase("relation", c.id, {
    ...good(c),
    result: "failed",
    executionRecordId: r.id,
  });
  const done = f.actions.completeSopWorkstationValidation("relation");
  assert.equal(done.result.passed, false);
  assert.equal(done.updated.fieldAcceptance.status, "failed");
  assert.equal(done.record.cases[0].result, "failed");
});
test("正式验收后再次启用仍复查当前模型、独立报告和执行证据，变动不放行", () => {
  for (const mutate of [
    (f) => f.data.aiFieldValidationExecutions.splice(0, 1),
    (f) => {
      f.data.workstations[0].status = "故障";
    },
    (f) => {
      f.data.workstations[0].aiBaseConfig.primaryCameraId =
        "replacement-camera";
    },
    (f) =>
      (f.data.aiCapabilities[0].currentPublishedModel.modelArtifactId =
        "replacement"),
    (f) =>
      (f.data.aiCapabilities[0].currentPublishedModel.independentReport.passed = false),
    (f) =>
      (f.data.aiFieldValidationExecutions[0].actualResult =
        "变更后的输出与原验收不再对应"),
  ]) {
    const f = fixture();
    f.start();
    f.finish();
    mutate(f);
    const before = structuredClone(f.data);
    assert.throws(() => f.actions.enableSopWorkstationAi("relation"));
    assert.deepEqual(f.data, before);
  }
});
test("重新开始保留已保存过程与环境，旧轮次执行记录不能用于新轮次", () => {
  const f = fixture();
  f.start();
  const c = f.data.sopWorkstationAiConfigs[0].validationCases[0],
    r = f.receipt(c);
  f.actions.saveSopWorkstationValidationCase("relation", c.id, {
    ...good(c),
    executionRecordId: r.id,
  });
  const previous = structuredClone(f.data.sopWorkstationAiConfigs[0]);
  f.actions.startSopWorkstationValidation(
    "relation",
    { tester: "另一工程师", lighting: "偏暗" },
    { restart: true },
  );
  const current = f.data.sopWorkstationAiConfigs[0];
  assert.notEqual(current.validationRunId, previous.validationRunId);
  assert.deepEqual(
    current.validationRecords[0].cases,
    previous.validationCases,
  );
  assert.equal(current.validationEnvironment.lighting, "偏暗");
  assert.throws(
    () =>
      f.actions.saveSopWorkstationValidationCase(
        "relation",
        current.validationCases[0].id,
        { ...good(current.validationCases[0]), executionRecordId: r.id },
      ),
    /本轮验证/,
  );
});
test("保存失败或来源切换不能写入半份验收数据，也不能产生成功记录", () => {
  for (const source of ["browser", "cpd"]) {
    const f = fixture("real", source);
    f.start();
    const before = structuredClone(f.data);
    f.fail = true;
    assert.throws(
      () =>
        f.actions.startSopWorkstationValidation(
          "relation",
          { tester: "工程师" },
          { restart: true },
        ),
      /storage full/,
    );
    assert.deepEqual(f.data, before);
    f.fail = false;
    f.source = source === "cpd" ? "browser" : "cpd";
    assert.throws(
      () => f.actions.completeSopWorkstationValidation("relation"),
      /来源已切换/,
    );
    assert.deepEqual(f.data, before);
  }
});
test("证据地址限制协议，独立报告必须匹配当前模型", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "//other.test/x",
    "https://user:pass@host.test/secret",
    "1",
  ])
    assert.equal(validationEvidenceUrl(url), "");
  assert.equal(
    validationEvidenceUrl("/assets/record.mp4"),
    "/assets/record.mp4",
  );
  assert.equal(fieldModelIssues(capabilities).length, 0);
  const changed = structuredClone(capabilities);
  changed[0].currentPublishedModel.independentReport.modelArtifactId = "old";
  assert.ok(fieldModelIssues(changed).length);
});

test("基础场景完成可验收，配置依赖的高级场景必须完成，隐藏选项不影响规则", () => {
  const cases = createDefaultValidationCases(config).map((c, i) =>
    i < 8 ? good(c) : c,
  );
  assert.equal(validationPlan(config).filter((s) => s.required).length, 8);
  assert.equal(
    evaluateValidationCompletion({
      aiConfig: config,
      cases,
      checks: { ready: true },
    }).passed,
    true,
  );
  const actionConfig = structuredClone(config);
  actionConfig.judgementItems[1].completionBasis = "action";
  actionConfig.judgementItems[1].conditions[0].minDurationSeconds = 2;
  const relation = {
    judgementCameraBindings: [
      { judgementItemId: "b", strategy: "all", cameraIds: ["left", "right"] },
    ],
  };
  const required = validationPlan(actionConfig, relation).filter(
    (s) => s.advanced && s.required,
  );
  assert.equal(required.length, 8);
  assert.ok(required.every((s) => s.requiredItemIds.includes("b")));
  assert.equal(
    evaluateValidationCompletion({
      aiConfig: actionConfig,
      relation,
      cases,
      checks: { ready: true },
    }).passed,
    false,
  );
  const skipped = cases.map((c, i) =>
    i < 8
      ? c
      : {
          ...c,
          result: "not_applicable",
          notApplicableReason: "希望省略全部高级场景而不执行任何高级测试",
        },
  );
  assert.equal(
    evaluateValidationCompletion({
      aiConfig: actionConfig,
      relation,
      cases: skipped,
      checks: { ready: true },
    }).passed,
    false,
  );
  cases[8] = { ...good(cases[8]), result: "failed" };
  assert.equal(
    evaluateValidationCompletion({
      aiConfig: config,
      cases,
      checks: { ready: true },
    }).passed,
    false,
  );
});

test("单项执行、结束、保存、重试与取消保留记录且阻止同时执行", () => {
  const f = fixture("prototype_demo");
  f.start();
  const [first, second] = f.data.sopWorkstationAiConfigs[0].validationCases;
  const started = f.actions.startValidationCase("relation", first.id, {
    judgementItemIds: ["a", "b"],
  });
  assert.equal(started.executionState, "running");
  assert.equal(
    f.data.aiFieldValidationRequests[0].id,
    started.executionAttemptId,
  );
  assert.throws(
    () => f.actions.startValidationCase("relation", second.id),
    /先结束/,
  );
  assert.throws(
    () =>
      f.actions.saveSopWorkstationValidationCase(
        "relation",
        first.id,
        good(started),
      ),
    /先结束/,
  );
  const ended = f.actions.endValidationCase("relation", first.id);
  assert.equal(ended.executionState, "awaiting_review");
  assert.equal(ended.result, "pending");
  f.actions.saveSopWorkstationValidationCase("relation", first.id, good(ended));
  const restarted = f.actions.startValidationCase("relation", first.id);
  assert.notEqual(restarted.executionAttemptId, started.executionAttemptId);
  assert.equal(restarted.executionHistory[0].result, "passed");
  f.actions.cancelValidationCase("relation", first.id);
  assert.equal(f.data.aiFieldValidationRequests[1].state, "cancelled");
  assert.throws(
    () =>
      f.actions.saveSopWorkstationValidationCase(
        "relation",
        first.id,
        good(restarted),
      ),
    /完成本次执行/,
  );
  const before = structuredClone(f.data);
  f.fail = true;
  assert.throws(
    () => f.actions.startValidationCase("relation", second.id),
    /storage full/,
  );
  assert.deepEqual(f.data, before);
});

test("现场执行必须关联本次服务回执才能结束，重试不能沿用上一次回执", () => {
  const f = fixture("real");
  f.start();
  const c = f.data.sopWorkstationAiConfigs[0].validationCases[0];
  const started = f.actions.startValidationCase("relation", c.id);
  assert.throws(
    () => f.actions.endValidationCase("relation", c.id),
    /执行记录/,
  );
  const record = f.receipt(c);
  record.executionAttemptId = "old-attempt";
  assert.throws(
    () => f.actions.endValidationCase("relation", c.id, record.id),
    /本次/,
  );
  record.executionAttemptId = started.executionAttemptId;
  const ended = f.actions.endValidationCase("relation", c.id, record.id);
  assert.equal(ended.actualResult, record.actualResult);
  f.actions.saveSopWorkstationValidationCase("relation", c.id, {
    ...good(ended),
    executionRecordId: record.id,
  });
  f.actions.startValidationCase("relation", c.id);
  assert.throws(
    () => f.actions.endValidationCase("relation", c.id, record.id),
    /本次/,
  );
});

test('阶段式流程从历史配置检查直接建立正式轮次，原记录保留且不要求先保存用途', () => {
  const f = fixture('prototype_demo');
  const relation = f.data.sopWorkstationAiConfigs[0];
  Object.assign(relation, { validationStatus: 'passed', enableStatus: 'enabled', validationCases: [good({ id: 'old', scenarioType: 'standard' })] });
  const history = structuredClone(f.data.arrangements);
  const started = f.actions.startSopWorkstationFieldValidation('relation', { tester: '实施工程师' });
  assert.equal(started.validationPurpose, 'real');
  assert.equal(started.validationStatus, 'validating');
  assert.equal(started.enableStatus, 'disabled');
  assert.equal(started.validationCases.length, 16);
  assert.equal(started.validationRecords[0].cases[0].id, 'old');
  assert.deepEqual(f.data.arrangements, history);
});
test('正式开始前复查模型报告；准备不足或保存失败不得停用原配置或丢失旧轮次', () => {
  const f = fixture('prototype_demo', 'cpd');
  const relation = f.data.sopWorkstationAiConfigs[0];
  Object.assign(relation, { validationStatus: 'passed', enableStatus: 'enabled' });
  f.data.aiCapabilities[0].currentPublishedModel.independentReport.passed = false;
  const before = structuredClone(f.data);
  assert.throws(() => f.actions.startSopWorkstationFieldValidation('relation', { tester: '实施工程师' }), /独立评测/);
  assert.deepEqual(f.data, before);
  f.data.aiCapabilities[0].currentPublishedModel.independentReport.passed = true;
  const ready = structuredClone(f.data);
  f.fail = true;
  assert.throws(() => f.actions.startSopWorkstationFieldValidation('relation', { tester: '实施工程师' }), /storage/);
  assert.deepEqual(f.data, ready);
});

test('兼容用途保存重复相同值时不重置验收和启用状态', () => {
  const f = fixture('real');
  let data = structuredClone(f.data);
  Object.assign(data.sopWorkstationAiConfigs[0], { validationStatus: 'passed', enableStatus: 'enabled', fieldAcceptance: { status: 'passed', runId: 'run' } });
  const before = structuredClone(data.sopWorkstationAiConfigs[0]);
  const actions = createEnhancementActions({ setData(fn) { data = fn(data); }, now: () => at, makeId: p => p });
  actions.saveValidationPurpose('relation', { validationPurpose: 'real' });
  assert.deepEqual(data.sopWorkstationAiConfigs[0], before);
});
