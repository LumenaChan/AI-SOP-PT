import test from "node:test";
import assert from "node:assert/strict";
import {
  displayBusinessText,
  displayStepLabel,
} from "../src/businessTextRules.js";
import { statisticsCsv } from "../src/statisticsCommonRules.js";

test("历史系统提示中文展示，原始记录和人员状态编码不变", () => {
  const record = {
    id: "session-original-01",
    title: "人员绑定：uncertain",
    detail: "已暂停Session与Evaluation Clock，尚未形成处罚结论",
    status: "uncertain",
  };
  const original = structuredClone(record);
  assert.equal(displayBusinessText(record.title), "人员绑定：不确定");
  assert.equal(
    displayBusinessText(record.detail),
    "已暂停实训记录与评价计时，尚未形成处罚结论",
  );
  assert.deepEqual(record, original);
  assert.equal(displayBusinessText(record.status), "uncertain");
});

test("术语转换不截断标识符、资源路径和文件名，保留技术缩写", () => {
  for (const value of [
    "session-demo-20261015",
    "Session-01",
    "Dataset.json",
    "Dataset_v1",
    "/admin/Session/01",
    "https://example.test/Session",
    "AI / ROI / SOP / CSV",
    "analysisBasisSessionId",
    "MyDataset",
    "Evaluation Mapping.json",
  ])
    assert.equal(displayBusinessText(value), value);
  const element = { type: "strong", value: "Dataset" };
  assert.equal(displayBusinessText(element), element);
  assert.equal(displayBusinessText(null), null);
  assert.equal(displayBusinessText(0), 0);
  assert.equal(displayStepLabel("Step 01"), "步骤 01");
  assert.equal(displayStepLabel("custom-step-01"), "custom-step-01");
});

test("可读CSV与页面采用同一术语和北京时间，保留可定位编号及CSV防护", () => {
  const row = {
    id: "session-demo-01",
    note: "Technical Incident已恢复，Primary Actor已重新确认",
    at: "2026-10-22T06:35:00.000Z",
    unsafe: "=HYPERLINK(1)",
  };
  const original = structuredClone(row);
  const csv = statisticsCsv(
    [
      { key: "id", label: "记录编号" },
      { key: "note", label: "说明" },
      { key: "at", label: "时间" },
      { key: "unsafe", label: "原始备注" },
    ],
    [row],
    { 统计单位: "Session-Step（去重）" },
  );
  assert.ok(csv.includes("单次实训中的步骤（去重）"));
  assert.ok(csv.includes("技术异常已恢复，主操作人已重新确认"));
  assert.ok(
    csv.includes("session-demo-01") && csv.includes("2026-10-22 14:35:00"),
  );
  assert.ok(csv.includes("'=HYPERLINK(1)"));
  assert.deepEqual(row, original);
});
