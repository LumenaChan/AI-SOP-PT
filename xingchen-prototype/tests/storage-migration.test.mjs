import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_SOP_RECOVERY_MARKER,
  normalizePrototypeDataSource,
  prototypeDataFingerprint,
  recoverMissingLegacySops,
  selectCpdWorkingData,
  selectPrototypeDataSource,
} from "../src/storageMigrationRules.js";

const snapshot = (name = "JSON默认SOP") => ({
  version: 19,
  sops: [{ id: "default-sop", name }],
  classes: [],
  students: [],
  workstations: [],
});

const storageWith = (records = {}) => ({
  getItem(key) {
    return Object.hasOwn(records, key) ? records[key] : null;
  },
});

test("current browser storage wins over the JSON default snapshot", () => {
  const current = snapshot("浏览器现有SOP");
  const selected = selectPrototypeDataSource({
    storage: storageWith({ current: JSON.stringify(current) }),
    storageKey: "current",
    legacyStorageKeys: ["legacy"],
    expectedVersion: 19,
    currentPrototypeData: snapshot(),
  });
  assert.equal(selected.kind, "current-storage");
  assert.equal(selected.data.sops[0].name, "浏览器现有SOP");
});

test("legacy browser storage still wins over the JSON default snapshot", () => {
  const legacy = { ...snapshot("旧版浏览器SOP"), version: 18 };
  const selected = selectPrototypeDataSource({
    storage: storageWith({ legacy: JSON.stringify(legacy) }),
    storageKey: "current",
    legacyStorageKeys: ["legacy"],
    expectedVersion: 19,
    currentPrototypeData: snapshot(),
  });
  assert.equal(selected.kind, "legacy-storage");
  assert.equal(selected.data.sops[0].name, "旧版浏览器SOP");
});

test("a browser without storage receives an isolated clone of the JSON default", () => {
  const currentDefault = snapshot();
  const selected = selectPrototypeDataSource({
    storage: storageWith(),
    storageKey: "current",
    legacyStorageKeys: ["legacy"],
    expectedVersion: 19,
    currentPrototypeData: currentDefault,
  });
  assert.equal(selected.kind, "current-default");
  selected.data.sops[0].name = "标准化过程中的修改";
  assert.equal(currentDefault.sops[0].name, "JSON默认SOP");
});

test("an unusable JSON default falls through to the seed source", () => {
  const selected = selectPrototypeDataSource({
    storage: storageWith(),
    storageKey: "current",
    legacyStorageKeys: [],
    expectedVersion: 19,
    currentPrototypeData: { version: 19, sops: [] },
  });
  assert.equal(selected.kind, "seed");
  assert.equal(selected.data, null);
});

test("data source selection accepts CPD and defaults unknown values to browser", () => {
  assert.equal(normalizePrototypeDataSource("cpd"), "cpd");
  assert.equal(normalizePrototypeDataSource("browser"), "browser");
  assert.equal(normalizePrototypeDataSource("unknown"), "browser");
  assert.equal(normalizePrototypeDataSource(null), "browser");
});

test("CPD mode starts from an isolated clone of the source-controlled snapshot", () => {
  const currentDefault = snapshot("CPD源数据");
  const selected = selectCpdWorkingData({
    storage: storageWith(),
    storageKey: "cpd",
    fingerprint: prototypeDataFingerprint(currentDefault),
    currentPrototypeData: currentDefault,
  });
  assert.equal(selected.kind, "cpd-default");
  selected.data.sops[0].name = "CPD工作副本修改";
  assert.equal(currentDefault.sops[0].name, "CPD源数据");
});

test("CPD working data persists only while its source fingerprint is current", () => {
  const currentDefault = snapshot("新版CPD源数据");
  const workingData = snapshot("CPD本地工作副本");
  const currentFingerprint = prototypeDataFingerprint(currentDefault);
  const storage = storageWith({
    cpd: JSON.stringify({
      fingerprint: currentFingerprint,
      data: workingData,
    }),
  });
  const existing = selectCpdWorkingData({
    storage,
    storageKey: "cpd",
    fingerprint: currentFingerprint,
    currentPrototypeData: currentDefault,
  });
  assert.equal(existing.kind, "cpd-storage");
  assert.equal(existing.data.sops[0].name, "CPD本地工作副本");

  const refreshed = selectCpdWorkingData({
    storage,
    storageKey: "cpd",
    fingerprint: `${currentFingerprint}-changed`,
    currentPrototypeData: currentDefault,
  });
  assert.equal(refreshed.kind, "cpd-default");
  assert.equal(refreshed.data.sops[0].name, "新版CPD源数据");
});

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
