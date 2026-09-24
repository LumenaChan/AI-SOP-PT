import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AI_CONFIG_PATH,
  AI_LIBRARY_PATH,
  AI_LIBRARY_SECTIONS,
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
