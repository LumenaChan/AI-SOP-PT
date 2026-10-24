import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  displayDateTime,
  dateTimeInputValue,
  displayClockTime,
} from "../src/dateTimeRules.js";
import { statisticsCsv } from "../src/statisticsCommonRules.js";
import { formatExamEntryWindow } from "../src/studentExamRules.js";

test("ISO及偏移时间按北京时间展示年月日时分秒，正确跨日且不二次偏移", () => {
  for (const [input, expected] of [
    ["2026-10-22T06:35:00.000Z", "2026-10-22 14:35:00"],
    ["2026-10-22T23:35:09.123Z", "2026-10-23 07:35:09"],
    ["2026-10-22T06:35:09+08:00", "2026-10-22 06:35:09"],
    ["2026-10-22T20:35:09-0500", "2026-10-23 09:35:09"],
    ["2026-10-22T06:35", "2026-10-22 06:35:00"],
    ["2026-10-22 06:35:09", "2026-10-22 06:35:09"],
  ]) {
    assert.equal(displayDateTime(input), expected);
    assert.equal(displayDateTime(expected), expected);
  }
  assert.equal(
    displayDateTime(new Date("2026-10-22T06:35:00Z")),
    "2026-10-22 14:35:00",
  );
});

test("详情及历史说明中多个时间均格式化，不改日期、用时、片段时码及未知占位", () => {
  assert.equal(
    displayDateTime(
      "锁定 2026-10-22T06:35:00.000Z；更新 2026-10-22T15:36:01+08:00。",
    ),
    "锁定 2026-10-22 14:35:00；更新 2026-10-22 15:36:01。",
  );
  for (const value of [
    "2026-10-22",
    "00:18:27",
    "25:00:00",
    "00:05.120 – 00:09.500",
    "未记录",
    "尚未开始",
    "刚刚",
    "",
    null,
    undefined,
    0,
    123,
  ])
    assert.equal(displayDateTime(value), value);
  assert.equal(displayDateTime("2026-02-30T12:30:00Z"), "时间未知");
  assert.equal(displayDateTime(new Date(NaN)), "时间未知");
  const object = { createdAt: "2026-10-22T06:35:00.000Z" };
  assert.equal(displayDateTime(object), object);
  assert.equal(object.createdAt, "2026-10-22T06:35:00.000Z");
});

test("展示不依赖电脑时区；不改底层时间数据或排序依据", () => {
  const moduleUrl = new URL("../src/dateTimeRules.js", import.meta.url).href;
  const code = `import {displayDateTime} from ${JSON.stringify(moduleUrl)}; console.log(displayDateTime("2026-10-22T06:35:00.000Z"));`;
  for (const TZ of ["UTC", "America/Los_Angeles", "Asia/Shanghai"])
    assert.equal(
      execFileSync(process.execPath, ["--input-type=module", "-e", code], {
        env: { ...process.env, TZ },
        encoding: "utf8",
      }).trim(),
      "2026-10-22 14:35:00",
    );
  const rows = [
    { at: "2026-10-22T06:35:00.000Z" },
    { at: "2026-10-21T23:30:00.000Z" },
  ];
  const before = JSON.stringify(rows);
  rows.map((row) => displayDateTime(row.at));
  assert.equal(JSON.stringify(rows), before);
  assert.equal(
    [...rows].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0],
    rows[1],
  );
});

test("统计与名单CSV时间与页面一致，保留CSV转义及公式保护", () => {
  const rows = [{ name: "=1+1", at: "2026-10-22T06:35:00.000Z" }];
  const csv = statisticsCsv(
    [
      { key: "name", label: "学生" },
      { key: "at", label: "时间" },
    ],
    rows,
    { 生成时间: "2026-10-22T07:00:00Z" },
  );
  assert.ok(
    csv.includes("2026-10-22 14:35:00") && csv.includes("2026-10-22 15:00:00"),
  );
  assert.ok(csv.includes("'=1+1") && !csv.includes(".000Z"));
  assert.equal(rows[0].at, "2026-10-22T06:35:00.000Z");
});

test("时间输入框适配本地格式；考试入场与时钟展示使用同一时区", () => {
  assert.equal(
    dateTimeInputValue("2026-10-22T06:35:00.000Z"),
    "2026-10-22T14:35:00",
  );
  assert.equal(dateTimeInputValue("2026-10-22T14:35"), "2026-10-22T14:35:00");
  assert.equal(dateTimeInputValue(""), "");
  assert.equal(dateTimeInputValue("时间未知"), "");
  assert.equal(
    formatExamEntryWindow("2026-10-22T06:35:00Z", "2026-10-22T06:45:00Z"),
    "2026-10-22 14:35:00 - 14:45:00",
  );
  assert.equal(displayClockTime("2026-10-22T06:35:00Z"), "14:35:00");
});
