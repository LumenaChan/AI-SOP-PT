import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveStudentCameraViews,
  selectStudentCamera,
  resolveStudentPrimaryCamera,
} from "../src/studentPracticeRules.js";
const raw = JSON.parse(
  readFileSync(
    new URL("../src/data/currentPrototypeData.json", import.meta.url),
  ),
);
function fixture() {
  const data = structuredClone(raw);
  const session = data.arrangements
    .find((a) => a.id === "p1")
    .sessions.find((s) => s.workstationId === "w2");
  const workstation = data.workstations.find((w) => w.id === "w2");
  return { data, session, workstation };
}
test("学生p1/w2可查看后来补配的细节镜头，原会话单镜头快照和数据保持不变", () => {
  const { data, session, workstation } = fixture(),
    before = structuredClone(data);
  const views = resolveStudentCameraViews(data, session, workstation);
  assert.equal(views.length, 2);
  assert.equal(views[0].label, "主视角");
  const detail = views.find((v) => v.detailView);
  assert.equal(detail.label, "细节视角");
  assert.equal(detail.previewOnly, true);
  assert.equal(detail.available, true);
  assert.equal(selectStudentCamera(views, detail.id).id, detail.id);
  assert.deepEqual(data, before);
});
test("新多区域会话列出五个锁定视角，切换预览不改变原主镜头可用性", () => {
  const data = structuredClone(raw),
    a = data.arrangements.find((a) => a.id === "practice-demo-20261015"),
    session = a.sessions[0],
    workstation = data.workstations.find((w) => w.id === session.workstationId);
  const before = resolveStudentPrimaryCamera(data, session, workstation);
  const views = resolveStudentCameraViews(data, session, workstation);
  assert.equal(views.length, 5);
  assert.ok(views.every((v) => !v.previewOnly));
  for (const v of views)
    assert.equal(selectStudentCamera(views, v.id).id, v.id);
  assert.deepEqual(
    resolveStudentPrimaryCamera(data, session, workstation),
    before,
  );
});
test("仅有一个镜头时不虚构辅助视角，无镜头时返回明确空状态", () => {
  const { data, session, workstation } = fixture();
  workstation.aiBaseConfig = { primaryCameraId: "d10" };
  const views = resolveStudentCameraViews(data, session, workstation);
  assert.equal(views.length, 1);
  assert.equal(selectStudentCamera(views, "removed-camera").id, "d10");
  workstation.aiBaseConfig = { cameras: [] };
  session.evaluationSnapshot.workstationAiBaseConfigSnapshot = { cameras: [] };
  assert.deepEqual(resolveStudentCameraViews(data, session, workstation), []);
  assert.equal(selectStudentCamera([], ""), null);
});
test("离线的细节镜头仍能选择查看异常状态，但不影响主视角的任务准备检查", () => {
  const { data, session, workstation } = fixture();
  const detail = resolveStudentCameraViews(data, session, workstation).find(
    (v) => v.detailView,
  );
  data.devices.find((d) => d.id === detail.id).status = "离线";
  const selected = selectStudentCamera(
    resolveStudentCameraViews(data, session, workstation),
    detail.id,
  );
  assert.equal(selected.available, false);
  assert.match(selected.reason, /离线|不可用/);
  assert.equal(
    resolveStudentPrimaryCamera(data, session, workstation).available,
    true,
  );
});
test("禁止跨工位预览，停用的补充镜头不列入，去重时保留锁定视角名称", () => {
  const { data, session, workstation } = fixture();
  const primary = {
    deviceId: "d10",
    role: "primary",
    name: "任务锁定主视角",
    enabled: true,
    defaultPreview: true,
  };
  session.evaluationSnapshot.workstationAiBaseConfigSnapshot = {
    cameras: [primary],
  };
  workstation.aiBaseConfig.cameras.push({
    deviceId: "d2",
    role: "auxiliary",
    name: "另一工位相机",
    enabled: true,
  });
  workstation.aiBaseConfig.cameras.find(
    (c) => c.deviceId !== "d10" && c.deviceId !== "d2",
  ).enabled = false;
  const views = resolveStudentCameraViews(data, session, workstation);
  assert.equal(views.length, 1);
  assert.equal(views[0].name, "任务锁定主视角");
  assert.ok(!views.some((v) => v.id === "d2"));
});
