import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_SOP_RECOVERY_MARKER,
  recoverMissingLegacySops,
} from "../src/storageMigrationRules.js";

test("older storage cannot be hidden by a newer store that lacks a user-created SOP", () => {
  const current = {
    version: 19,
    sops: [{ id: "s1", name: "内置SOP", status: "已发布" }],
  };
  const newestLegacy = {
    version: 19,
    sops: [{ id: "s1", name: "旧名称不应覆盖当前数据" }],
  };
  const olderLegacy = {
    version: 17,
    sops: [
      {
        id: "sop-user-created",
        name: "新能源汽车高压系统下电与验电综合实训",
        status: "草稿",
      },
      { id: "", name: "无效记录" },
    ],
  };

  const recovered = recoverMissingLegacySops(current, [
    newestLegacy,
    olderLegacy,
  ]);
  assert.deepEqual(
    recovered.sops.map((item) => item.id),
    ["sop-user-created", "s1"],
  );
  assert.equal(recovered.sops[1].name, "内置SOP");
  assert.equal(recovered.storageMigrations[LEGACY_SOP_RECOVERY_MARKER], true);
});

test("legacy SOP recovery runs once so later intentional deletion stays deleted", () => {
  const migrated = {
    version: 19,
    sops: [{ id: "s1", name: "内置SOP" }],
    storageMigrations: { [LEGACY_SOP_RECOVERY_MARKER]: true },
  };
  const result = recoverMissingLegacySops(migrated, [
    { sops: [{ id: "sop-deleted", name: "已删除SOP" }] },
  ]);
  assert.equal(result, migrated);
  assert.deepEqual(
    result.sops.map((item) => item.id),
    ["s1"],
  );
});
