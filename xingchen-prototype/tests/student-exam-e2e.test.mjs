import assert from "node:assert/strict";
import test from "node:test";
import { workstationFeedbackPolicy } from "../src/domainRules.js";
import {
  buildStudentIdentityVerification,
  createStudentIdentitySession,
  getStudentCurrentSessions,
} from "../src/studentIdentityRules.js";
import { examRemainingSeconds } from "../src/studentExamRules.js";
import { teacherSessionEvents } from "../src/studentTeacherLinkRules.js";
import {
  createOpenArrangement,
  createStudentRuntimeStore,
  studentRuntimeFixture,
} from "./student-e2e-fixture.mjs";

test("考试 E2E 隐藏教学信息并联动求助、暂停、恢复与超时交卷", () => {
  const data = studentRuntimeFixture();
  const { store, clock } = createStudentRuntimeStore(data);
  const arrangement = createOpenArrangement(store, data, "exam");
  const workstationId = data.workstations[0].id;
  store.attachStudentIdentityVerification(
    arrangement.id,
    workstationId,
    buildStudentIdentityVerification(
      createStudentIdentitySession("student-e2e", clock.now()),
    ),
  );
  store.startWorkstationSession(arrangement.id, workstationId);

  const policy = workstationFeedbackPolicy("exam", false);
  assert.equal(policy.showTeachingContent, false);
  assert.equal(policy.allowHint, false);
  assert.equal(policy.showAiFeedback, false);
  assert.equal(policy.showRealtimeScore, false);
  assert.equal(policy.allowIncidentHelp, true);

  store.requestExamIncidentHelp(arrangement.id, workstationId, {
    reasonCode: "device_failure",
  });
  let session = store.getData().arrangements[0].sessions[0];
  assert.equal(teacherSessionEvents(session)[0].category, "exam_incident");
  const beforePause = examRemainingSeconds(session, clock.value());
  store.setArrangementSessionPaused(arrangement.id, workstationId, true);
  clock.advance(90);
  session = store.getData().arrangements[0].sessions[0];
  assert.equal(examRemainingSeconds(session, clock.value()), beforePause);

  store.setArrangementSessionPaused(arrangement.id, workstationId, false);
  clock.advance(20);
  session = store.getData().arrangements[0].sessions[0];
  assert.equal(examRemainingSeconds(session, clock.value()), beforePause - 20);

  const submitted = store.finishWorkstationSession(
    arrangement.id,
    workstationId,
    { reason: "time_expired" },
  );
  assert.equal(submitted.session.submitReason, "time_expired");
  assert.equal(submitted.session.resultStatus, "待发布");
  assert.equal(
    store.finishWorkstationSession(arrangement.id, workstationId, {
      reason: "time_expired",
    }).idempotent,
    true,
  );
  assert.equal(
    getStudentCurrentSessions(store.getData(), "student-e2e").length,
    0,
  );
  assert.deepEqual(store.getData().evaluationMappings, []);
  assert.deepEqual(store.getData().datasets, []);
  assert.deepEqual(store.getData().workstationProfiles, []);
});
