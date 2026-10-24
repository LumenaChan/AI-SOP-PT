import test from "node:test";
import assert from "node:assert/strict";
import {
  sessionStandardMediaStep,
  standardMediaItems,
} from "../src/standardMediaRules.js";
import {
  collectStandardMediaAssets,
  createMediaZip,
  standardMediaWorkingBackup,
} from "../src/standardMediaBackup.js";
import { workstationFeedbackPolicy } from "../src/domainRules.js";
const attachment = (id, name = `${id}.pdf`) => ({
  id,
  assetId: id,
  name,
  kind: "pdf",
  mime: "application/pdf",
});
const step = (id, assets) => ({ id, standardMedia: assets });
const sop = (...steps) => ({ steps });

test("示教资料按会话锁定标准取值，空数组或缺失步骤不借用最新版", () => {
  const current = sop(step("Step 01", [attachment("live")]));
  const arrangement = {
    snapshot: {
      sopSnapshot: sop(step("Step 01", [attachment("arrangement")])),
    },
  };
  const session = {
    steps: [step("Step 01", [attachment("runtime")])],
    evaluationSnapshot: { sopSnapshot: sop(step("Step 01", [])) },
  };
  const resolve = (extra = {}) =>
    sessionStandardMediaStep({
      sop: current,
      arrangement,
      session,
      stepId: "Step 01",
      ...extra,
    });
  assert.deepEqual(standardMediaItems(resolve()), []);
  assert.equal(resolve({ session: {} }).standardMedia[0].id, "arrangement");
  assert.equal(
    resolve({ arrangement: {}, session: { steps: session.steps } })
      .standardMedia[0].id,
    "runtime",
  );
  assert.equal(
    resolve({ arrangement: {}, session: {} }).standardMedia[0].id,
    "live",
  );
  assert.equal(
    resolve({
      session: { evaluationSnapshot: { sopSnapshot: { steps: [] } } },
    }),
    null,
  );
  assert.equal(
    resolve({
      session: {
        snapshot: {
          sopSnapshot: sop(step("Step 01", [attachment("session-snapshot")])),
        },
      },
    }).standardMedia[0].id,
    "session-snapshot",
  );
  assert.deepEqual(
    standardMediaItems(
      resolve({
        session: {
          evaluationSnapshot: { sopSnapshot: { steps: [{ id: "Step 01" }] } },
        },
      }),
    ),
    [],
  );
});
test("学生练习可展示示教，考试在成绩发布前后都不展示标准示教", () => {
  assert.equal(workstationFeedbackPolicy("practice").showStandardMedia, true);
  for (const published of [false, true]) {
    const policy = workstationFeedbackPolicy("exam", published);
    assert.equal(policy.showStandardMedia, false);
    assert.equal(policy.allowHint, false);
  }
});
test("资料备份遍历标准及历史快照、按assetId去重，显式空数组不回退旧字段", () => {
  const data = {
    sops: [sop(step("Step 01", [attachment("same")]))],
    arrangements: [
      {
        snapshot: {
          sopSnapshot: sop(
            step("Step 01", [attachment("same"), attachment("historical")]),
          ),
        },
      },
    ],
    empty: { standardMedia: [], standardMediaUrl: "blob:removed" },
  };
  assert.deepEqual(
    collectStandardMediaAssets(data).map((a) => a.assetId),
    ["same", "historical"],
  );
});
function unzipStored(bytes) {
  const files = new Map(),
    decoder = new TextDecoder();
  let position = 0;
  while (
    new DataView(bytes.buffer, bytes.byteOffset + position).getUint32(
      0,
      true,
    ) === 0x04034b50
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + position);
    assert.equal(view.getUint16(6, true), 0x800);
    assert.equal(view.getUint16(8, true), 0);
    const size = view.getUint32(18, true),
      length = view.getUint16(26, true);
    const name = decoder.decode(
      bytes.subarray(position + 30, position + 30 + length),
    );
    files.set(name, {
      crc: view.getUint32(14, true),
      bytes: bytes.subarray(
        position + 30 + length,
        position + 30 + length + size,
      ),
    });
    position += 30 + length + size;
  }
  const end = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 22);
  assert.equal(end.getUint32(0, true), 0x06054b50);
  assert.equal(end.getUint16(8, true), files.size);
  assert.equal(end.getUint32(16, true), position);
  assert.equal(end.getUint32(12, true), bytes.length - 22 - position);
  return files;
}
test("ZIP保留二进制、UTF-8名称和CRC，中央目录偏移可读取", async () => {
  const zip = await createMediaZip([
    { name: "资料/检查.pdf", blob: new Blob(["123456789"]) },
  ]);
  const files = unzipStored(new Uint8Array(await zip.arrayBuffer()));
  assert.equal(files.get("资料/检查.pdf").crc, 0xcbf43926);
  assert.equal(
    new TextDecoder().decode(files.get("资料/检查.pdf").bytes),
    "123456789",
  );
});
test("当前源数据和全部可读上传文件一起备份，缺失文件保留清单并明确计数", async () => {
  const snapshot = JSON.stringify({
    source: "browser",
    exportedAt: "2026-10-23",
    data: {
      sops: [sop(step("Step 01", [attachment("ok"), attachment("missing")]))],
      history: { standardMedia: [attachment("ok")] },
    },
  });
  const reads = [];
  const result = await standardMediaWorkingBackup(snapshot, async (id) => {
    reads.push(id);
    if (id === "missing") throw new Error("文件已丢失");
    return new Blob([new Uint8Array([0, 255, 17])], {
      type: "application/pdf",
    });
  });
  assert.deepEqual(reads, ["ok", "missing"]);
  assert.equal(result.missing, 1);
  assert.match(result.name, /\.zip$/);
  const files = unzipStored(new Uint8Array(await result.blob.arrayBuffer()));
  assert.equal(
    new TextDecoder().decode(files.get("工作数据.json").bytes),
    snapshot,
  );
  assert.deepEqual([...files.get("示教资料/1-ok.pdf").bytes], [0, 255, 17]);
  const manifest = JSON.parse(
    new TextDecoder().decode(files.get("资料清单.json").bytes),
  );
  assert.equal(manifest.source, "browser");
  assert.deepEqual(
    manifest.assets.map((item) => item.status),
    ["included", "missing"],
  );
  assert.equal(manifest.assets[1].reason, "文件已丢失");
});
test("无上传文件时保持原JSON备份，旧临时链接会标记为缺失而不伪装成功", async () => {
  const json = JSON.stringify({ source: "cpd", data: { sops: [] } });
  const plain = await standardMediaWorkingBackup(json);
  assert.equal(plain.name, "兴辰工作数据.json");
  assert.equal(await plain.blob.text(), json);
  const old = await standardMediaWorkingBackup(
    JSON.stringify({
      source: "cpd",
      data: { standardMediaName: "old.mp4", standardMediaUrl: "blob:old" },
    }),
    async () => {
      throw new Error("不应调用");
    },
  );
  assert.equal(old.missing, 1);
  assert.equal(old.blob.type, "application/zip");
});
