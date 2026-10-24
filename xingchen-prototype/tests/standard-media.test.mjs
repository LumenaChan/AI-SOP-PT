import { confirmOpeningCheck } from "./opening-check-fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  standardMediaItems,
  validateStandardMediaFiles,
  addStandardMediaFiles,
  mediaKind,
} from "../src/standardMediaRules.js";
import { loadStandardMediaFile } from "../src/standardMediaStorage.js";
import {
  normalizeSopStep,
  createSopStepDraft,
  createIndependentSopCopy,
  assessSopAiImpact,
} from "../src/domainRules.js";
import {
  studentRuntimeFixture,
  createStudentRuntimeStore,
} from "./student-e2e-fixture.mjs";
const MB = 1024 * 1024;
const file = (name, size = 100, type = "") => ({
  name,
  size,
  type,
  lastModified: 123,
});
const refs = [
  {
    id: "image-one",
    assetId: "persisted-image",
    name: "操作图.png",
    kind: "image",
    size: 100,
  },
  {
    id: "pdf-two",
    assetId: "persisted-pdf",
    name: "要求.pdf",
    kind: "pdf",
    size: 120,
  },
];

test("旧单资料可追加，显式空数组优先，删除后重读不恢复旧示例图", () => {
  const old = {
    standardMediaType: "示教视频",
    standardMediaName: "示教.mp4",
    standardMediaUrl: "/assets/example.mp4",
  };
  assert.equal(standardMediaItems(old)[0].kind, "video");
  assert.equal(standardMediaItems(old)[0].url, old.standardMediaUrl);
  assert.deepEqual(
    standardMediaItems(normalizeSopStep({ ...old, standardMedia: [] })),
    [],
  );
  assert.deepEqual(standardMediaItems(createSopStepDraft()), []);
  assert.equal(mediaKind({ name: "PDF说明.PDF" }), "pdf");
});
test("支持图片、浏览器视频、PDF与Office格式，按各自大小上限校验", () => {
  const files = [
    file("one.JPG", 10 * MB, "image/jpeg"),
    file("two.webm", 100 * MB, "video/webm"),
    file("three.pdf", 20 * MB, "application/pdf"),
    file("four.docx"),
    file("five.ppt"),
    file("six.xlsx"),
  ];
  const metadata = validateStandardMediaFiles([], files);
  assert.deepEqual(
    metadata.map((m) => m.kind),
    ["image", "video", "pdf", "document", "document", "document"],
  );
  for (const [name, max] of [
    ["a.png", 10],
    ["b.mp4", 100],
    ["c.doc", 20],
  ]) {
    assert.throws(
      () => validateStandardMediaFiles([], [file(name, max * MB + 1)]),
      new RegExp(`${max}MB`),
    );
  }
});
test("拒绝未支持格式、伪装类型、空文件、重复文件、超数量及超总量", () => {
  for (const bad of [
    file("unsafe.html"),
    file("a.svg"),
    file("a.png", 0),
    file("a.png", 100, "text/html"),
  ])
    assert.throws(() => validateStandardMediaFiles([], [bad]));
  assert.throws(
    () => validateStandardMediaFiles([], [file("a.png"), file("a.png")]),
    /重复/,
  );
  const one = validateStandardMediaFiles([], [file("a.png")]);
  assert.throws(() => validateStandardMediaFiles(one, [file("a.png")]), /重复/);
  assert.throws(
    () =>
      validateStandardMediaFiles(
        Array.from({ length: 10 }, () => ({})),
        [file("a.pdf")],
      ),
    /最多10/,
  );
  assert.throws(
    () =>
      validateStandardMediaFiles(
        [{ size: 101 * MB }],
        [file("a.mp4", 100 * MB)],
      ),
    /200MB/,
  );
});
test("多次追加先保存二进制再返回JSON引用，失败不会部分追加", async () => {
  const existing = standardMediaItems({
    standardMediaUrl: "/assets/original.png",
  });
  const original = structuredClone(existing);
  const binaries = new Map();
  const save = async (files, metadata) =>
    files.map((f, i) => {
      const id = `asset-${binaries.size}`;
      binaries.set(id, { f, mime: metadata[i].mime });
      return id;
    });
  const first = await addStandardMediaFiles(
    existing,
    [file("a.png"), file("b.pdf")],
    save,
  );
  const second = await addStandardMediaFiles(first, [file("c.mp4")], save);
  assert.equal(second.length, 4);
  assert.deepEqual(existing, original);
  assert.equal(binaries.size, 3);
  assert.deepEqual(second[0], existing[0]);
  for (const item of second.slice(1)) {
    assert.ok(binaries.has(item.assetId));
    assert.equal(item.url, undefined);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(second)), second);
  const before = structuredClone(second);
  await assert.rejects(
    () =>
      addStandardMediaFiles(second, [file("d.doc")], async () => {
        throw new Error("存储失败");
      }),
    /存储失败/,
  );
  assert.deepEqual(second, before);
});
test("不支持本地存储时明确失败，不返回无法持久化的临时链接", async () => {
  assert.equal(globalThis.indexedDB, undefined);
  await assert.rejects(() => loadStandardMediaFile("missing"), /无法保存资料/);
});
test("保存重读及复制SOP保留全部附件，副本移除不会改动原标准", () => {
  const step = normalizeSopStep(
    JSON.parse(
      JSON.stringify({ id: "Step 01", name: "检查", standardMedia: refs }),
    ),
  );
  assert.deepEqual(standardMediaItems(step), refs);
  const sop = { id: "original", name: "标准", status: "已发布", steps: [step] };
  const copy = createIndependentSopCopy(sop, { id: "copy", name: "新草稿" });
  copy.steps[0].standardMedia.splice(0, 1);
  assert.equal(standardMediaItems(copy.steps[0]).length, 1);
  assert.equal(standardMediaItems(sop.steps[0]).length, 2);
  assert.equal(
    assessSopAiImpact({
      fromSop: sop,
      toSop: { ...sop, steps: [{ ...step, standardMedia: [] }] },
    }).changeType,
    "non_ai",
  );
});
for (const type of ["practice", "exam"]) {
  test(`${type}开放时锁定多资料快照，后续SOP变化不影响原Session`, () => {
    const data = studentRuntimeFixture();
    data.sops[0].steps[0].standardMedia = structuredClone(refs);
    const { store } = createStudentRuntimeStore(data);
    const saved = store.saveArrangement(
      {
        type,
        name: "附件快照验证",
        sopId: data.sops[0].id,
        teacherId: "teacher-e2e",
        scheduleStart: "2026-10-23T10:00:00",
        studentIds: [data.students[0].id],
        workstationIds: [data.workstations[0].id],
        ...(type === "exam" ? { examDurationMinutes: 30 } : {}),
      },
      true,
    );
    const result = store.openArrangementWorkstation(
      saved.id,
      data.workstations[0].id,
      confirmOpeningCheck(store, saved.id, data.workstations[0].id),
    );
    assert.deepEqual(result.snapshot.sopSnapshot.steps[0].standardMedia, refs);
    const stored = JSON.parse(JSON.stringify(store.getData()));
    stored.sops[0].steps[0].standardMedia = [];
    const reloadedStore = createStudentRuntimeStore(stored).store;
    const reopened = reloadedStore
      .getData()
      .arrangements.find((a) => a.id === saved.id);
    assert.deepEqual(
      reopened.snapshot.sopSnapshot.steps[0].standardMedia,
      refs,
    );
  });
}
