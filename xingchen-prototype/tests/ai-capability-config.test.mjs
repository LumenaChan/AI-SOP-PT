import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedActualEvaluationModes,
  applyAiConfigMutation,
  capabilityConfigReferenceIds,
  completeAiCapabilityConfig,
  createEmptyAiCapabilityConfig,
  evaluateAiCapabilityConfig,
  validateAiJudgementItem,
} from "../src/aiCapabilityConfigRules.js";

const capabilities = [
  {
    id: "cap-object",
    name: "手套检测",
    type: "object_detection",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "model-object" },
  },
  {
    id: "cap-action",
    name: "验电动作识别",
    type: "action_recognition",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "model-action" },
  },
];

const sop = {
  id: "sop-1",
  status: "已发布",
  steps: [
    {
      id: "Step 01",
      name: "安全检查",
      expectedJudgementMode: "visual_auto",
      completionCondition: "确认手套已佩戴",
    },
    {
      id: "Step 02",
      name: "扭矩确认",
      expectedJudgementMode: "visual_assist_default_pass",
      completionCondition: "确认扭矩达标",
    },
  ],
  scoreRules: [
    { id: "score-1", stepId: "Step 01", name: "未佩戴手套" },
    { id: "score-2", stepId: "Step 02", name: "扭矩不合格" },
  ],
  safetyRules: [{ id: "safety-1", stepId: "Step 01", name: "带电操作" }],
};

function readyConfig() {
  return {
    id: "config-1",
    sopId: sop.id,
    status: "configuring",
    logicalAreas: [],
    workstationValidationStates: [],
    stepConfigs: [
      {
        stepId: "Step 01",
        actualEvaluationMode: "visual_auto",
        downgradeReason: "",
        scoreRuleTreatments: [
          {
            ruleId: "score-1",
            mode: "ai",
            reason: "",
            judgementItemId: "item-1",
          },
        ],
        safetyRuleTreatments: [
          {
            ruleId: "safety-1",
            mode: "ai",
            reason: "",
            judgementItemId: "item-1",
          },
        ],
      },
      {
        stepId: "Step 02",
        actualEvaluationMode: "default_pass_manual_deduction",
        downgradeReason: "扭矩数值无法通过画面可靠读取",
        scoreRuleTreatments: [
          {
            ruleId: "score-2",
            mode: "teacher",
            reason: "由教师读取扭矩工具数值",
            judgementItemId: "",
          },
        ],
        safetyRuleTreatments: [],
      },
    ],
    judgementItems: [
      {
        id: "item-1",
        stepId: "Step 01",
        name: "手套佩戴成立",
        purposes: ["completion", "scoring", "safety"],
        scoreRuleIds: ["score-1"],
        safetyRuleIds: ["safety-1"],
        combination: "all",
        conditions: [
          {
            id: "condition-1",
            capabilityId: "cap-object",
            operator: "appears",
            logicalAreaId: "",
            minTargetCount: 2,
            minDurationSeconds: 1,
            minOccurrences: 1,
          },
        ],
      },
    ],
  };
}

test("actual evaluation mode only permits keeping or downgrading teacher expectation", () => {
  assert.deepEqual(allowedActualEvaluationModes("visual_auto"), [
    "visual_auto",
    "visual_assist_default_pass",
    "default_pass_manual_deduction",
  ]);
  assert.deepEqual(allowedActualEvaluationModes("visual_assist_default_pass"), [
    "visual_assist_default_pass",
    "default_pass_manual_deduction",
  ]);
  assert.deepEqual(
    allowedActualEvaluationModes("default_pass_manual_deduction"),
    ["default_pass_manual_deduction"],
  );
});

test("empty config binds only SOP ID and has no version concepts", () => {
  const config = createEmptyAiCapabilityConfig("sop-1", {
    id: "config-1",
    now: "2026-09-24 10:00",
  });
  assert.equal(config.sopId, "sop-1");
  assert.equal(config.status, "unconfigured");
  assert.equal("sopVersion" in config, false);
  assert.equal("mappingVersion" in config, false);
  assert.equal("packageVersion" in config, false);
});

test("complete configuration passes all step, rule, item and capability checks", () => {
  const result = evaluateAiCapabilityConfig({
    sop,
    config: readyConfig(),
    capabilities,
  });
  assert.equal(result.ready, true);
  assert.equal(result.configuredStepCount, 2);
  assert.equal(result.judgementItemCount, 1);
  assert.deepEqual(result.distinctCapabilityIds, ["cap-object"]);
  assert.equal(result.stepResults[1].status, "no_ai");
});

test("automatic step requires a completion judgement item", () => {
  const config = readyConfig();
  config.judgementItems[0].purposes = ["scoring", "safety"];
  const result = evaluateAiCapabilityConfig({ sop, config, capabilities });
  assert.equal(result.ready, false);
  assert.match(result.issues.join("；"), /至少需要一个完成判断项/);
});

test("assisted step still needs at least one judgement item as AI evidence", () => {
  const config = readyConfig();
  config.stepConfigs[0].actualEvaluationMode = "visual_assist_default_pass";
  config.stepConfigs[0].downgradeReason = "只提供辅助证据";
  config.judgementItems = [];
  config.stepConfigs[0].scoreRuleTreatments = [
    {
      ruleId: "score-1",
      mode: "teacher",
      reason: "由教师确认",
      judgementItemId: "",
    },
  ];
  config.stepConfigs[0].safetyRuleTreatments = [
    {
      ruleId: "safety-1",
      mode: "teacher",
      reason: "由教师确认",
      judgementItemId: "",
    },
  ];
  const result = evaluateAiCapabilityConfig({ sop, config, capabilities });
  assert.equal(result.ready, false);
  assert.match(result.issues.join("；"), /至少需要一个AI判断项提供辅助证据/);
});

test("downgrade and teacher handled rules both require reasons", () => {
  const config = readyConfig();
  config.stepConfigs[1].downgradeReason = "";
  config.stepConfigs[1].scoreRuleTreatments[0].reason = "";
  const result = evaluateAiCapabilityConfig({ sop, config, capabilities });
  assert.equal(result.ready, false);
  assert.match(result.issues.join("；"), /评价方式降级时必须填写原因/);
  assert.match(result.issues.join("；"), /由教师处理时必须填写原因/);
});

test("AI handled teacher rule must link an item with the matching purpose and rule ID", () => {
  const config = readyConfig();
  config.judgementItems[0].scoreRuleIds = [];
  const result = evaluateAiCapabilityConfig({ sop, config, capabilities });
  assert.equal(result.ready, false);
  assert.match(result.issues.join("；"), /评分用途必须关联/);
  assert.match(result.issues.join("；"), /由AI处理时必须关联匹配用途/);
});

test("disabled or model-less capabilities invalidate existing references", () => {
  const disabled = capabilities.map((item) =>
    item.id === "cap-object" ? { ...item, status: "已停用" } : item,
  );
  const result = evaluateAiCapabilityConfig({
    sop,
    config: readyConfig(),
    capabilities: disabled,
  });
  assert.equal(result.ready, false);
  assert.match(result.issues.join("；"), /未发布或当前没有可用模型/);
});

test("area based object condition requires an existing named logical area", () => {
  const item = readyConfig().judgementItems[0];
  item.conditions[0].operator = "in_area";
  item.conditions[0].logicalAreaId = "area-missing";
  const issues = validateAiJudgementItem({
    item,
    sop,
    capabilities,
    logicalAreas: [],
  });
  assert.match(issues.join("；"), /必须选择有效区域/);
  const passed = validateAiJudgementItem({
    item,
    sop,
    capabilities,
    logicalAreas: [{ id: "area-missing", name: "工具区" }],
  });
  assert.equal(passed.length, 0);
});

test("sequence combination requires at least two conditions", () => {
  const item = readyConfig().judgementItems[0];
  item.combination = "sequence";
  const issues = validateAiJudgementItem({
    item,
    sop,
    capabilities,
    logicalAreas: [],
  });
  assert.match(issues.join("；"), /至少需要两个条件/);
});

test("completing config enters pending validation without fabricating enabled workstations", () => {
  const completed = completeAiCapabilityConfig({
    sop,
    config: readyConfig(),
    capabilities,
    now: "2026-09-24 11:00",
  });
  assert.equal(completed.status, "pending_validation");
  assert.deepEqual(completed.workstationValidationStates, []);
});

test("editing a config resets its completion state without writing legacy validation state", () => {
  const changed = applyAiConfigMutation(
    {
      ...readyConfig(),
      status: "enabled",
      completedAt: "2026-09-24 11:00",
      workstationValidationStates: [{ workstationId: "w1", status: "enabled" }],
    },
    { logicalAreas: [{ id: "area-1", name: "工具区" }] },
    "2026-09-24 12:00",
  );
  assert.equal(changed.status, "configuring");
  assert.equal(changed.completedAt, "");
  assert.deepEqual(changed.workstationValidationStates, [
    { workstationId: "w1", status: "enabled" },
  ]);
});

test("teacher evaluation step accepts safety reminders only", () => {
  const config = readyConfig();
  const teacherSop = {
    ...sop,
    safetyRules: [
      ...sop.safetyRules,
      { id: "safety-2", stepId: "Step 02", name: "危险动作" },
    ],
  };
  config.stepConfigs[1].safetyRuleTreatments = [
    {
      ruleId: "safety-2",
      mode: "ai",
      reason: "",
      judgementItemId: "item-teacher-safety",
    },
  ];
  config.judgementItems.push({
    id: "item-teacher-safety",
    stepId: "Step 02",
    name: "危险动作提醒",
    purposes: ["safety"],
    scoreRuleIds: [],
    safetyRuleIds: ["safety-2"],
    combination: "all",
    conditions: [
      {
        id: "condition-teacher-safety",
        capabilityId: "cap-action",
        operator: "recognized",
        minOccurrences: 1,
        withinCurrentStep: true,
      },
    ],
  });
  assert.equal(
    evaluateAiCapabilityConfig({ sop: teacherSop, config, capabilities }).ready,
    true,
  );
  config.judgementItems.at(-1).purposes = ["completion"];
  const rejected = evaluateAiCapabilityConfig({
    sop: teacherSop,
    config,
    capabilities,
  });
  assert.equal(rejected.ready, false);
  assert.match(
    rejected.issues.join("；"),
    /教师评价步骤的AI判断项只能用于安全提醒/,
  );
});

test("capability reference IDs are calculated from real judgement conditions", () => {
  const one = readyConfig();
  const another = {
    ...readyConfig(),
    id: "config-2",
    sopId: "sop-2",
    judgementItems: [
      {
        ...readyConfig().judgementItems[0],
        id: "item-2",
        conditions: [
          {
            id: "condition-2",
            capabilityId: "cap-action",
            operator: "recognized",
            minOccurrences: 1,
            withinCurrentStep: true,
          },
        ],
      },
    ],
  };
  assert.deepEqual(capabilityConfigReferenceIds([one, another], "cap-object"), [
    "config-1",
  ]);
  assert.deepEqual(capabilityConfigReferenceIds([one, another], "cap-action"), [
    "config-2",
  ]);
});
