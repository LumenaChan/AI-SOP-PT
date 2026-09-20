import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDefaultPassPolicy,
  automaticEvaluationGate,
  arrangementDestination,
  canCloseIssue,
  createSopStepDraft,
  createSessionStepsFromSop,
  diagnoseNoTrigger,
  getEffectiveJudgementMode,
  getPublishBlockers,
  getSopAiEvaluationStatus,
  nextStableStepId,
  normalizeSopStep,
  recordedDeductionOf,
  requiresMandatoryReview,
  scoreOf,
  sessionPrimaryIssue,
  validateSystemSettings,
  workstationFeedbackPolicy,
} from "../src/domainRules.js";

const validatedImplementation = {
  cameraPosition: "已确认",
  lighting: "已确认",
  occlusion: "已确认",
  roiVersion: "ROI-V1",
  cameraConfigVersion: "CAM-V1",
};

const automaticSop = {
  id: "sop-auto",
  name: "高压系统检修",
  version: "V3.2",
  status: "已发布",
  steps: [
    { id: "Step 01", judgementMode: "visual_auto" },
    { id: "Step 02", judgementMode: "default_pass_manual_deduction" },
  ],
};

const deployedModel = {
  sopId: "sop-auto",
  status: "已部署",
  version: "M1",
  datasetVersion: "D1",
  sopVersion: "V3.2",
};

const passingValidation = {
  status: "通过",
  sopVersion: "V3.2",
  modelVersion: "M1",
  roiVersion: "ROI-V1",
  cameraConfigVersion: "CAM-V1",
};

test("scores use effective review values and tolerate numeric strings", () => {
  assert.equal(
    scoreOf([
      { score: 15 },
      { score: 20, effectiveScore: 8 },
      { effectiveScore: "12" },
    ]),
    35,
  );
});

test("ongoing reports exclude active and unstarted steps from deductions", () => {
  assert.equal(
    recordedDeductionOf([
      {
        state: "pass",
        result: "通过",
        maxScore: 15,
        effectiveScore: 15,
      },
      {
        state: "pass",
        result: "通过（扣分）",
        maxScore: 20,
        effectiveScore: "15",
      },
      {
        state: "active",
        result: "进行中",
        maxScore: 20,
        effectiveScore: 0,
      },
      {
        state: "pending",
        result: "未进行",
        maxScore: 45,
        effectiveScore: 0,
      },
    ]),
    5,
  );
});

test("teacher and admin result views use the same primary issue rule", () => {
  const session = {
    steps: [
      {
        id: "Step 01",
        name: "安全检查",
        reviewStatus: "无需复核",
        maxScore: 20,
        effectiveScore: 15,
      },
    ],
    events: [],
  };
  assert.equal(sessionPrimaryIssue(session), "Step 01 · 安全检查");
  assert.equal(sessionPrimaryIssue(null), "尚未开始");
});

test("draft arrangements always reopen in editing", () => {
  assert.equal(arrangementDestination({ status: "草稿" }), "edit");
});

test("not-started and preparing arrangements enter readiness checks", () => {
  assert.equal(arrangementDestination({ status: "待开始" }), "prep");
  assert.equal(arrangementDestination({ status: "准备中" }), "prep");
});

test("running and paused arrangements enter monitoring", () => {
  assert.equal(arrangementDestination({ status: "进行中" }), "live");
  assert.equal(arrangementDestination({ status: "已暂停" }), "live");
});

test("ended and published arrangements enter results", () => {
  assert.equal(arrangementDestination({ status: "已结束" }), "results");
  assert.equal(arrangementDestination({ status: "已发布" }), "results");
});

test("publishing accepts only formal scores and absences", () => {
  assert.equal(
    getPublishBlockers([
      { resultStatus: "正式成绩" },
      { resultStatus: "未参加" },
    ]).length,
    0,
  );
});

test("publishing is blocked by pending review or evidence", () => {
  assert.deepEqual(
    getPublishBlockers([
      { id: "a", resultStatus: "待复核" },
      { id: "b", resultStatus: "待补充证据" },
      { id: "c", resultStatus: "正式成绩" },
    ]).map((item) => item.id),
    ["a", "b"],
  );
});

test("camera uncertainty defaults to full score without mandatory review", () => {
  const resolved = applyDefaultPassPolicy({
    id: "Step 03",
    name: "确认安装扭矩",
    judgementMode: "default_pass_manual_deduction",
    result: "证据不足",
    evidenceStatus: "画面遮挡",
    reviewStatus: "待复核",
    maxScore: 20,
    effectiveScore: 0,
  });
  assert.equal(resolved.result, "默认通过");
  assert.equal(resolved.effectiveScore, 20);
  assert.equal(resolved.reviewStatus, "建议抽查");
  assert.equal(requiresMandatoryReview(resolved), false);
});

test("partial or unavailable recording never creates an automatic deduction", () => {
  for (const evidenceStatus of ["部分缺失", "不可用"]) {
    const resolved = applyDefaultPassPolicy({
      name: "拆卸接插件",
      judgementMode: "visual_auto",
      result: "无法判定",
      evidenceStatus,
      maxScore: 20,
      effectiveScore: 0,
    });
    assert.equal(resolved.result, "默认通过");
    assert.equal(resolved.effectiveScore, 20);
    assert.equal(resolved.reviewStatus, "建议抽查");
  }
});

test("confirmed safety redlines are never changed to default pass", () => {
  const resolved = applyDefaultPassPolicy({
    id: "Step 01",
    name: "安全检查",
    judgementMode: "visual_assist_default_pass",
    result: "安全阻断",
    evidenceStatus: "证据不足",
    redlineConfirmed: true,
    reviewStatus: "待复核",
    maxScore: 15,
    effectiveScore: 0,
  });
  assert.equal(resolved.result, "安全阻断");
  assert.equal(resolved.effectiveScore, 0);
  assert.equal(requiresMandatoryReview(resolved), true);
});

test("torque criteria are normalized as teacher-check default-pass steps", () => {
  const step = normalizeSopStep({
    name: "按规定扭矩完成紧固",
    completionCondition: "完成扭矩确认",
  });
  assert.equal(step.judgementMode, "default_pass_manual_deduction");
  assert.match(step.knownLimit, /默认通过/);
  assert.ok(step.teachingInstruction);
});

test("a fully scored default-pass result does not block publishing", () => {
  const resolved = applyDefaultPassPolicy({
    name: "扭矩确认",
    judgementMode: "default_pass_manual_deduction",
    result: "无法判定",
    evidenceStatus: "录像缺失",
    reviewStatus: "待复核",
    maxScore: 20,
    effectiveScore: 0,
  });
  assert.equal(
    getPublishBlockers([{ resultStatus: "待复核", steps: [resolved] }]).length,
    0,
  );
});

test("practice workstation exposes guidance, correction and live score", () => {
  const policy = workstationFeedbackPolicy("practice", false);
  assert.equal(policy.showTeachingContent, true);
  assert.equal(policy.showCorrectionHints, true);
  assert.equal(policy.showRealtimeScore, true);
  assert.equal(policy.showFinalReport, true);
});

test("exam workstation hides answers and scores until publication", () => {
  const active = workstationFeedbackPolicy("exam", false);
  assert.equal(active.showTeachingContent, false);
  assert.equal(active.showRealtimeResult, false);
  assert.equal(active.showRealtimeScore, false);
  assert.equal(active.showFinalReport, false);

  const published = workstationFeedbackPolicy("exam", true);
  assert.equal(published.showFinalReport, true);
  assert.equal(published.showRealtimeScore, false);
});

test("automatic evaluation opens only after implementation and version-matched field validation", () => {
  const gate = automaticEvaluationGate({
    workstation: { implementation: validatedImplementation },
    sop: automaticSop,
    model: deployedModel,
    validation: passingValidation,
  });
  assert.equal(gate.enabled, true);
  assert.equal(gate.enabledStepCount, 1);
  assert.equal(gate.effectiveMode(automaticSop.steps[0]), "visual_auto");
});

test("automatic steps degrade to default pass when field validation is missing", () => {
  const gate = automaticEvaluationGate({
    workstation: { implementation: validatedImplementation },
    sop: automaticSop,
    model: deployedModel,
  });
  assert.equal(gate.enabled, false);
  assert.match(gate.reasons.join("；"), /尚无现场验证记录/);
  assert.equal(
    gate.effectiveMode(automaticSop.steps[0]),
    "visual_assist_default_pass",
  );
  assert.equal(
    gate.effectiveMode(automaticSop.steps[1]),
    "default_pass_manual_deduction",
  );
});

test("ROI, camera or model version changes invalidate automatic evaluation", () => {
  const gate = automaticEvaluationGate({
    workstation: {
      implementation: {
        ...validatedImplementation,
        roiVersion: "ROI-V2",
        cameraConfigVersion: "CAM-V2",
      },
    },
    sop: automaticSop,
    model: { ...deployedModel, version: "M2" },
    validation: passingValidation,
  });
  assert.equal(gate.enabled, false);
  assert.match(gate.reasons.join("；"), /模型版本已变化/);
  assert.match(gate.reasons.join("；"), /ROI 版本已变化/);
  assert.match(gate.reasons.join("；"), /摄像头配置已变化/);
});

test("new SOP steps default to AI-assisted evaluation with conservative policies", () => {
  const step = createSopStepDraft({ id: "Step 07", score: 12 });
  assert.equal(step.id, "Step 07");
  assert.equal(step.score, 12);
  assert.equal(step.judgementMode, "visual_assist_default_pass");
  assert.equal(step.skipPolicy, "进入教师复核");
  assert.equal(step.orderPolicy, "进入教师复核");
  assert.equal(step.timeoutPolicy, "仅记录超时");
});

test("new workstation sessions use the selected SOP steps without renumbering IDs", () => {
  const steps = createSessionStepsFromSop([
    {
      id: "Step 05",
      name: "确认操作区域",
      score: 35,
      judgementMode: "visual_auto",
    },
    {
      id: "Step 09",
      name: "记录扭矩结果",
      score: 65,
      judgementMode: "default_pass_manual_deduction",
    },
  ]);
  assert.deepEqual(
    steps.map((step) => step.id),
    ["Step 05", "Step 09"],
  );
  assert.deepEqual(
    steps.map((step) => step.maxScore),
    [35, 65],
  );
  assert.ok(steps.every((step) => step.state === "pending"));
  assert.equal(steps[1].judgementMode, "default_pass_manual_deduction");
});

test("explicit judgement modes are preserved instead of being inferred from keywords", () => {
  const step = normalizeSopStep({
    name: "读取扭矩结果",
    judgementMode: "visual_auto",
  });
  assert.equal(step.judgementMode, "visual_auto");
});

test("Step IDs remain monotonic after deletion and across SOP family history", () => {
  assert.equal(
    nextStableStepId({
      steps: [{ id: "Step 01" }, { id: "Step 02" }],
      historicalSteps: [{ id: "Step 07" }],
      usedStepIds: ["Step 01", "Step 02", "Step 09"],
    }),
    "Step 10",
  );
});

test("runtime gate may downgrade automatic evaluation but never upgrades teacher evaluation", () => {
  assert.equal(
    getEffectiveJudgementMode({
      sopStep: { judgementMode: "default_pass_manual_deduction" },
      gate: { enabled: true },
    }),
    "default_pass_manual_deduction",
  );
  assert.equal(
    getEffectiveJudgementMode({
      sopStep: { judgementMode: "visual_auto" },
      gate: { enabled: false },
    }),
    "visual_assist_default_pass",
  );
});

test("automatic evaluation requires a published SOP and a camera configuration version", () => {
  const draftGate = automaticEvaluationGate({
    workstation: { implementation: validatedImplementation },
    sop: { ...automaticSop, status: "草稿" },
    model: deployedModel,
    validation: passingValidation,
  });
  assert.equal(draftGate.enabled, false);
  assert.match(draftGate.reasons.join("；"), /SOP 尚未发布/);

  const missingCameraConfigGate = automaticEvaluationGate({
    workstation: {
      implementation: {
        ...validatedImplementation,
        cameraConfigVersion: "",
      },
    },
    sop: automaticSop,
    model: deployedModel,
    validation: passingValidation,
  });
  assert.equal(missingCameraConfigGate.enabled, false);
  assert.match(
    missingCameraConfigGate.reasons.join("；"),
    /尚未确认摄像头配置版本/,
  );
});

test("SOP AI status follows unpublished, unconfigured, configuring, partial and available states", () => {
  const workstation = (id) => ({
    id,
    name: `${id}工位`,
    implementation: {
      ...validatedImplementation,
      roiVersion: `ROI-${id}`,
      cameraConfigVersion: `CAM-${id}`,
    },
  });
  const validation = (id, status = "通过") => ({
    workstationId: id,
    sopId: automaticSop.id,
    sopVersion: automaticSop.version,
    modelVersion: deployedModel.version,
    roiVersion: `ROI-${id}`,
    cameraConfigVersion: `CAM-${id}`,
    status,
    createdAt: `2026-09-20 10:0${id.at(-1)}`,
  });
  const workstations = [workstation("w1"), workstation("w2")];
  const targetWorkstationIds = ["w1", "w2"];

  assert.equal(
    getSopAiEvaluationStatus({
      sop: { ...automaticSop, status: "草稿" },
    }).status,
    "—",
  );
  assert.equal(
    getSopAiEvaluationStatus({
      sop: automaticSop,
      workstations,
      targetWorkstationIds,
    }).status,
    "未配置",
  );
  assert.equal(
    getSopAiEvaluationStatus({
      sop: automaticSop,
      datasets: [
        { sopId: automaticSop.id, version: "D1", status: "采集中" },
      ],
      workstations,
      targetWorkstationIds,
    }).status,
    "配置中",
  );

  const configured = {
    sop: automaticSop,
    datasets: [
      { sopId: automaticSop.id, version: "D1", status: "已锁定" },
    ],
    models: [deployedModel],
    workstations,
    targetWorkstationIds,
  };
  const partial = getSopAiEvaluationStatus({
    ...configured,
    fieldValidations: [validation("w1"), validation("w2", "失败")],
  });
  assert.equal(partial.status, "部分可用");
  assert.equal(partial.validatedWorkstationCount, 1);

  const selectedReadyWorkstation = getSopAiEvaluationStatus({
    ...configured,
    targetWorkstationIds: ["w1"],
    fieldValidations: [validation("w1"), validation("w2", "失败")],
  });
  assert.equal(selectedReadyWorkstation.status, "可用");
  assert.equal(selectedReadyWorkstation.targetWorkstationCount, 1);
  assert.equal(selectedReadyWorkstation.validatedWorkstationCount, 1);

  const available = getSopAiEvaluationStatus({
    ...configured,
    fieldValidations: [validation("w1"), validation("w2")],
  });
  assert.equal(available.status, "可用");
  assert.equal(available.validatedWorkstationCount, 2);
});

test("a new SOP version does not inherit incompatible Dataset and Model readiness", () => {
  const status = getSopAiEvaluationStatus({
    sop: { ...automaticSop, id: "sop-new", version: "V3.3" },
    datasets: [
      { sopId: automaticSop.id, version: "D1", status: "已锁定" },
    ],
    models: [deployedModel],
  });
  assert.equal(status.status, "未配置");
  assert.equal(status.modelReadyCount, 0);
});

test("technical diagnosis returns one actionable no-trigger reason", () => {
  assert.equal(
    diagnoseNoTrigger({
      configComplete: true,
      evidenceContinuous: false,
      roiMatched: false,
      objectVisible: false,
      actionSufficient: false,
    }),
    "证据中断",
  );
  assert.equal(
    diagnoseNoTrigger({
      configComplete: true,
      evidenceContinuous: true,
      roiMatched: true,
      objectVisible: true,
      actionSufficient: false,
    }),
    "动作不足",
  );
});

test("an issue cannot close before technical verification", () => {
  assert.equal(
    canCloseIssue({
      status: "持续中",
      technicalCheck: { status: "待验证" },
      businessCheck: { status: "已确认" },
    }),
    false,
  );
});

test("an issue cannot close before business confirmation", () => {
  assert.equal(
    canCloseIssue({
      status: "持续中",
      technicalCheck: { status: "已通过" },
      businessCheck: { status: "待确认" },
    }),
    false,
  );
});

test("an issue closes only when both recovery gates pass", () => {
  assert.equal(
    canCloseIssue({
      status: "持续中",
      technicalCheck: { status: "已通过" },
      businessCheck: { status: "已确认" },
    }),
    true,
  );
});

test("non-session infrastructure issues may omit business confirmation", () => {
  assert.equal(
    canCloseIssue({
      status: "持续中",
      technicalCheck: { status: "已通过" },
      businessCheck: { status: "无需确认" },
    }),
    true,
  );
});

test("system settings reject unsafe ranges", () => {
  assert.throws(
    () =>
      validateSystemSettings({
        recordingDays: 2,
        downloadDays: 7,
        backupRetentionDays: 30,
        cacheThreshold: 20,
      }),
    /30–730/,
  );
});

test("system settings normalize valid numeric input", () => {
  const result = validateSystemSettings({
    practiceRecordingDays: "90",
    examRecordingDays: "365",
    downloadDays: "14",
    backupRetentionDays: "60",
    cacheThreshold: "15",
    cacheAlertEnabled: true,
  });
  assert.equal(result.practiceRecordingDays, 90);
  assert.equal(result.examRecordingDays, 365);
  assert.equal(result.downloadDays, 14);
  assert.equal(result.backupRetentionDays, 60);
  assert.equal(result.cacheThreshold, 15);
});
