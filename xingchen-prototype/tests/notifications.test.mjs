import test from "node:test";
import assert from "node:assert/strict";
import {
  notificationPage,
  notificationTime,
} from "../src/notificationRules.js";

test("通知UTC/偏移时间统一显示北京时间，跨日正确且不暴露ISO毫秒", () => {
  assert.equal(
    notificationTime("2026-10-22T05:50:00.000Z"),
    "2026-10-22 13:50:00",
  );
  assert.equal(
    notificationTime("2026-10-22T13:50:00+08:00"),
    "2026-10-22 13:50:00",
  );
  assert.equal(
    notificationTime("2026-10-22T22:30:01.123Z"),
    "2026-10-23 06:30:01",
  );
  assert.equal(
    notificationTime("2026-10-23T00:00:00+0800"),
    "2026-10-23 00:00:00",
  );
});
test("旧通知保持已知本地时间，不猜日期；空值、残片及无效日期有明确回退", () => {
  assert.equal(notificationTime("2026-10-22 10:18"), "2026-10-22 10:18:00");
  assert.equal(notificationTime("2026-10-22T10:18:00"), "2026-10-22 10:18:00");
  assert.equal(notificationTime("10:18"), "10:18:00");
  assert.equal(notificationTime("07:04:05"), "07:04:05");
  assert.equal(notificationTime("刚刚"), "刚刚");
  for (const value of [
    null,
    "",
    ".000Z",
    "invalid",
    "2026-02-30T01:00:00Z",
    "24:00",
    "08:60",
    "2026-10-22T25:00:00Z",
  ])
    assert.equal(notificationTime(value), "时间未知");
});
test("通知按十条分页，不丢失或重复，保留原顺序、已读状态和办理地址", () => {
  const items = Array.from({ length: 23 }, (_, index) => ({
    id: `n${index}`,
    read: index % 2 === 0,
    path: `/teacher/support-tasks/t${index}`,
    time: "2026-10-22T05:50:00Z",
  }));
  const original = structuredClone(items);
  const pages = [0, 1, 2].map((page) => notificationPage(items, page));
  assert.deepEqual(
    pages.map((page) => page.rows.length),
    [10, 10, 3],
  );
  assert.deepEqual(
    pages.flatMap((page) => page.rows),
    original,
  );
  assert.ok(pages.every((page) => page.total === 23 && page.pages === 3));
  assert.deepEqual(items, original);
});
test("通知分页处理空列表和缩减后的越界页，不产生空白失效页", () => {
  assert.deepEqual(notificationPage([], 4), {
    rows: [],
    page: 0,
    pages: 1,
    total: 0,
  });
  const items = [{ id: "one" }];
  assert.equal(notificationPage(items, 100).page, 0);
  assert.equal(notificationPage(items, -1).page, 0);
  assert.deepEqual(notificationPage(items, NaN).rows, items);
});
