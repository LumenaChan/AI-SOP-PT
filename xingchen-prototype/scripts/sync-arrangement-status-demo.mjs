import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateArrangementStatusDemoData } from "../src/arrangementStatusDemoData.js";

const target = new URL(
  "../src/data/currentPrototypeData.json",
  import.meta.url,
);
const bytes = readFileSync(target, "utf8");
const original = JSON.parse(bytes);
const updated = migrateArrangementStatusDemoData(original);
for (const key of ["arrangements", "workstations", "devices", "students"]) {
  assert.deepEqual(
    updated[key].slice(0, original[key].length),
    original[key],
    `${key}原记录不可修改`,
  );
}
if (updated !== original) {
  const backup = join(
    mkdtempSync(join(tmpdir(), "arrangement-status-cpd-")),
    "currentPrototypeData.json",
  );
  writeFileSync(backup, bytes);
  writeFileSync(target, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(
    `CPD已追加 ${updated.arrangements.length - original.arrangements.length} 条状态示例；原文件备份：${backup}`,
  );
} else console.log("CPD已包含状态示例，本次未改写文件。");
