import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCapabilityDeletable,
  canEditCapabilityMeaning,
  createCapability,
  deactivateCapability,
  isPublishedCapability,
  reactivateCapability,
  updateCapability,
} from "../src/aiCapabilityRules.js";

const detection = {
  name: "绝缘手套检测",
  type: "object_detection",
  description: "识别画面中的绝缘手套。",
  targetName: "绝缘手套",
  note: "",
};
const action = {
  name: "二次验电动作识别",
  type: "action_recognition",
  description: "识别完整的二次验电动作过程。",
  targetName: "二次验电",
};
const meta = { id: "cap-1", now: "2026-09-24 10:00", actor: "系统管理员" };

test("creates two independent capability types as untrained drafts", () => {
  const first = createCapability(detection, [], meta);
  const second = createCapability(action, [first], { ...meta, id: "cap-2" });
  assert.deepEqual(
    [first.type, second.type],
    ["object_detection", "action_recognition"],
  );
  assert.equal(first.id, "cap-1");
  assert.equal(first.status, "草稿");
  assert.equal(first.currentModelStatus, "未训练");
  assert.equal(first.referenceCount, 0);
});

test("rejects incomplete or duplicate capability definitions", () => {
  const first = createCapability(detection, [], meta);
  assert.throws(
    () => createCapability({ ...detection, name: "  " }, [], meta),
    /能力名称/,
  );
  assert.throws(
    () => createCapability({ ...detection, type: "" }, [], meta),
    /能力类型/,
  );
  assert.throws(
    () => createCapability({ ...detection, description: "" }, [], meta),
    /能力说明/,
  );
  assert.throws(
    () => createCapability({ ...detection, targetName: "" }, [], meta),
    /识别对象/,
  );
  assert.throws(
    () =>
      createCapability({ ...detection, name: "绝缘手套检测" }, [first], {
        ...meta,
        id: "cap-2",
      }),
    /已存在/,
  );
  assert.throws(
    () => createCapability({ ...detection, name: "SOP Step03 模型" }, [], meta),
    /可复用/,
  );
});

test("draft meaning is editable but capability type is immutable", () => {
  const first = createCapability(detection, [], meta);
  const changed = updateCapability(
    first,
    { ...detection, name: "防护手套检测" },
    [first],
    "2026-09-24 11:00",
  );
  assert.equal(changed.name, "防护手套检测");
  assert.equal(changed.type, "object_detection");
  assert.equal(canEditCapabilityMeaning(first), true);
  assert.throws(
    () =>
      updateCapability(
        first,
        { ...detection, type: "action_recognition" },
        [first],
        meta.now,
      ),
    /不可修改/,
  );
});

test("published capability meaning is locked while notes remain editable", () => {
  const published = {
    ...createCapability(detection, [], meta),
    status: "已发布",
    currentModelStatus: "已发布",
  };
  assert.equal(canEditCapabilityMeaning(published), false);
  assert.throws(
    () =>
      updateCapability(
        published,
        { ...detection, targetName: "安全帽" },
        [published],
        meta.now,
      ),
    /识别含义已锁定/,
  );
  const updated = updateCapability(
    published,
    { ...detection, note: "补充侧视角样本" },
    [published],
    "2026-09-24 12:00",
  );
  assert.equal(updated.note, "补充侧视角样本");
  assert.equal(updated.targetName, "绝缘手套");
});

test("published capability can be deactivated and stops being selectable", () => {
  const published = {
    ...createCapability(detection, [], meta),
    status: "已发布",
    currentModelStatus: "已发布",
  };
  const stopped = deactivateCapability(published, "2026-09-24 12:00");
  assert.equal(stopped.status, "已停用");
  assert.equal(isPublishedCapability(stopped), false);
  assert.equal(stopped.currentModelStatus, "已发布");
  assert.throws(() => deactivateCapability(stopped, meta.now), /只有已发布/);
});

test("reactivation requires an already published current model", () => {
  const stopped = {
    ...createCapability(detection, [], meta),
    status: "已停用",
    currentModelStatus: "已发布",
  };
  assert.equal(
    reactivateCapability(stopped, "2026-09-24 13:00").status,
    "已发布",
  );
  assert.throws(
    () =>
      reactivateCapability(
        { ...stopped, currentModelStatus: "未训练" },
        meta.now,
      ),
    /没有已发布模型/,
  );
});

test("deletion protects references, published models and active training", () => {
  const draft = createCapability(detection, [], meta);
  assert.doesNotThrow(() => assertCapabilityDeletable(draft));
  assert.throws(
    () => assertCapabilityDeletable({ ...draft, referenceCount: 2 }),
    /2 个AI能力配置引用/,
  );
  assert.throws(
    () => assertCapabilityDeletable({ ...draft, status: "已发布" }),
    /先停用/,
  );
  assert.throws(
    () => assertCapabilityDeletable({ ...draft, status: "训练中" }),
    /不能删除/,
  );
  assert.doesNotThrow(() =>
    assertCapabilityDeletable({ ...draft, status: "已停用" }),
  );
});
