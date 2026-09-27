import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AI_CONFIG_PATH,
  AI_LIBRARY_PATH,
  AI_LIBRARY_SECTIONS,
  deriveSopAiConfigurationSummary,
  getConfigurableSops,
} from "../src/aiEntry.js";

const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8",
);

test("administrator AI navigation exposes the two new entries and hides the legacy entry", () => {
  const adminNav = appSource.match(/const adminNav = \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(adminNav);
  assert.match(adminNav, /"AI能力配置", AI_CONFIG_PATH/);
  assert.match(adminNav, /"AI能力库", AI_LIBRARY_PATH/);
  assert.doesNotMatch(adminNav, /AI评价管理|\/admin\/ai-evaluation/);
});

test("AI capability configuration only lists published SOPs with real IDs", () => {
  const published = { id: "s1", status: "已发布" };
  assert.deepEqual(
    getConfigurableSops([
      published,
      { id: "s2", status: "草稿" },
      { id: "s3", status: "已停用" },
      { status: "已发布" },
      null,
    ]),
    [published],
  );
  assert.deepEqual(getConfigurableSops(null), []);
});

test("new entry routes, all nine library pages, and legacy routes remain wired", () => {
  assert.equal(AI_CONFIG_PATH, "/admin/ai-capability-config");
  assert.equal(AI_LIBRARY_PATH, "/admin/ai-capability-library");
  assert.deepEqual(
    AI_LIBRARY_SECTIONS.map(({ path, title }) => [path, title]),
    [
      ["capabilities", "能力管理"],
      ["videos", "视频管理"],
      ["extraction", "抽帧/切片"],
      ["auto-cleaning", "自动清洗"],
      ["manual-cleaning", "人工清洗"],
      ["annotation", "数据标注"],
      ["training-data", "训练数据"],
      ["training", "模型训练"],
      ["publishing", "模型发布"],
    ],
  );
  assert.equal(new Set(AI_LIBRARY_SECTIONS.map(({ path }) => path)).size, 9);
  assert.match(appSource, /path=\{AI_CONFIG_PATH\}/);
  assert.match(appSource, /path=\{`\$\{AI_CONFIG_PATH\}\/\:sopId`\}/);
  assert.match(appSource, /path=\{AI_LIBRARY_PATH\}/);
  assert.match(appSource, /path=\{`\$\{AI_LIBRARY_PATH\}\/\:section`\}/);
  assert.match(appSource, /path="\/admin\/ai-evaluation"/);
  assert.match(appSource, /path="\/admin\/ai-evaluation\/\:id"/);
});

test("library sections expand below the main sidebar entry without a page-level sidebar", () => {
  const shell = appSource.split("function Shell(")[1]?.split("function ")[0];
  const libraryPage = appSource
    .split("function AiCapabilityLibrary({ setModal })")[1]
    ?.split("// 旧版AI评价管理")[0];
  assert.ok(shell);
  assert.ok(libraryPage);
  assert.match(shell, /className="sidebar__subnav"/);
  assert.match(shell, /AI_LIBRARY_SECTIONS\.map/);
  assert.match(shell, /aria-expanded=/);
  assert.doesNotMatch(libraryPage, /ai-library-nav|ai-library-layout/);
});

test("capability detail and edit routes retain a real capability ID in later workflow links", () => {
  assert.match(appSource, /path=\{`\$\{AI_CAPABILITIES_PATH\}\/new`\}/);
  assert.match(
    appSource,
    /path=\{`\$\{AI_CAPABILITIES_PATH\}\/\:capabilityId\/edit`\}/,
  );
  assert.match(
    appSource,
    /path=\{`\$\{AI_CAPABILITIES_PATH\}\/\:capabilityId`\}/,
  );
  assert.match(
    appSource,
    /\?capabilityId=\$\{encodeURIComponent\(capability\.id\)\}/,
  );
});

function summaryFixture() {
  const sop = {
    id: "sop-1",
    status: "已发布",
    steps: [
      {
        id: "step-1",
        expectedJudgementMode: "visual_auto",
        completionCondition: "确认手套已佩戴",
      },
    ],
    scoreRules: [],
    safetyRules: [],
  };
  const capability = {
    id: "cap-1",
    type: "object_detection",
    status: "已发布",
    currentModelStatus: "已发布",
    currentPublishedModel: { modelArtifactId: "artifact-1" },
  };
  const config = {
    id: "config-1",
    sopId: sop.id,
    status: "pending_validation",
    logicalAreas: [],
    stepConfigs: [{ stepId: "step-1", actualEvaluationMode: "visual_auto" }],
    judgementItems: [
      {
        id: "item-1",
        stepId: "step-1",
        name: "手套佩戴成立",
        purposes: ["completion"],
        scoreRuleIds: [],
        safetyRuleIds: [],
        combination: "all",
        conditions: [
          {
            id: "condition-1",
            capabilityId: capability.id,
            operator: "appears",
            logicalAreaId: "",
            minTargetCount: 1,
            minDurationSeconds: 1,
            minOccurrences: 1,
          },
        ],
      },
    ],
  };
  const workstation = {
    id: "w1",
    status: "可入场",
    aiBaseConfig: { primaryCameraId: "cam-1", edgeDeviceId: "edge-1" },
  };
  const devices = [
    {
      id: "cam-1",
      workstationId: "w1",
      type: "全景摄像头",
      status: "在线",
      streamStatus: "可用",
    },
    {
      id: "edge-1",
      workstationId: "w1",
      type: "边缘工作站",
      status: "在线",
    },
  ];
  const relation = {
    id: "relation-1",
    sopAiConfigId: config.id,
    workstationId: workstation.id,
    judgementCameraBindings: [{ judgementItemId: "item-1", cameraId: "cam-1" }],
    logicalAreaMappings: [],
    validationStatus: "passed",
    enableStatus: "enabled",
  };
  return { sop, capability, config, workstation, devices, relation };
}

test("teacher SOP AI status derives from new config and workstation validation IDs", () => {
  const { sop, capability, config, workstation, devices, relation } =
    summaryFixture();
  const enabled = deriveSopAiConfigurationSummary({
    sop,
    config,
    workstationConfigs: [relation],
    workstations: [workstation],
    devices,
    capabilities: [capability],
  });
  assert.equal(enabled.status, "已启用");
  assert.equal(enabled.judgementItemCount, 1);
  assert.equal(enabled.capabilityCount, 1);
  assert.equal(enabled.runnableWorkstationCount, 1);

  const pending = deriveSopAiConfigurationSummary({
    sop,
    config,
    workstationConfigs: [
      { ...relation, validationStatus: "pending_revalidation" },
    ],
    workstations: [workstation],
    devices,
    capabilities: [capability],
  });
  assert.equal(pending.status, "待验证");
  assert.equal(pending.runnableWorkstationCount, 0);
});

test("teacher SOP AI status is defensive for drafts, missing config and invalid references", () => {
  const { sop, capability, config, devices, relation } = summaryFixture();
  assert.equal(
    deriveSopAiConfigurationSummary({ sop: { ...sop, status: "草稿" } }).status,
    "—",
  );
  assert.equal(deriveSopAiConfigurationSummary({ sop }).status, "未配置");
  const missingWorkstation = deriveSopAiConfigurationSummary({
    sop,
    config,
    workstationConfigs: [relation],
    workstations: [],
    devices,
    capabilities: [capability],
  });
  assert.equal(missingWorkstation.status, "待验证");
  assert.equal(missingWorkstation.runtimeStates[0].runtime.label, "工位异常");
});

test("formal teacher SOP pages no longer read or link the legacy mapping model", () => {
  const formalTeacherPages = appSource
    .split("function SopList()")[1]
    ?.split("function SopEditor(")[0];
  assert.ok(formalTeacherPages);
  assert.match(formalTeacherPages, /getSopAiConfigurationSummary/);
  assert.match(formalTeacherPages, /judgementItems/);
  assert.doesNotMatch(formalTeacherPages, /getSopAiEvaluationStatus/);
  assert.doesNotMatch(formalTeacherPages, /evaluationMappings/);
  assert.doesNotMatch(formalTeacherPages, /\/ai-mapping\//);
});
