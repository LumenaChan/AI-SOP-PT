import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudentIdentityVerification,
  createStudentIdentitySession,
  getStudentCurrentSessions,
  getStudentIdentityError,
} from "../src/studentIdentityRules.js";
import { teacherSessionEvents } from "../src/studentTeacherLinkRules.js";
import {
  createOpenArrangement,
  createStudentRuntimeStore,
  studentRuntimeFixture,
} from "./student-e2e-fixture.mjs";

test("练习 E2E 从刷脸入场到提示、求助和完成使用同一个 Session", () => {
  const data = studentRuntimeFixture();
  const { store } = createStudentRuntimeStore(data);
  const arrangement = createOpenArrangement(store, data, "practice");
  const workstationId = data.workstations[0].id;

  assert.equal(getStudentIdentityError(data.students[0]), "");
  assert.equal(
    getStudentCurrentSessions(store.getData(), "student-e2e")[0].sessionStatus,
    "待开始",
  );
  const browserIdentity = createStudentIdentitySession(
    "student-e2e",
    "2026-09-28T06:01:00.000Z",
  );
  store.attachStudentIdentityVerification(
    arrangement.id,
    workstationId,
    buildStudentIdentityVerification(browserIdentity),
  );
  store.startWorkstationSession(arrangement.id, workstationId);
  store.recordStudentHintRequest(arrangement.id, workstationId, "step-01");
  store.requestTeacherHelp(arrangement.id, workstationId, {
    reasonCode: "operation_help",
    reasonLabel: "操作不会",
    note: "",
  });

  const runningSession = store
    .getData()
    .arrangements[0].sessions.find(
      (item) => item.workstationId === workstationId,
    );
  assert.equal(runningSession.status, "进行中");
  assert.equal(runningSession.identityVerification.studentId, "student-e2e");
  assert.deepEqual(
    teacherSessionEvents(runningSession)
      .map((event) => event.category)
      .filter((category) =>
        ["identity", "hint", "practice_help"].includes(category),
      )
      .sort(),
    ["hint", "identity", "practice_help"],
  );

  store.finishWorkstationSession(arrangement.id, workstationId, {
    reason: "student_finished",
  });
  assert.equal(
    getStudentCurrentSessions(store.getData(), "student-e2e").length,
    0,
  );
  for (const legacy of [
    "evaluationMappings",
    "machineEvents",
    "datasets",
    "workstationProfiles",
    "compatibilityDecisions",
  ])
    assert.deepEqual(store.getData()[legacy], []);
});
