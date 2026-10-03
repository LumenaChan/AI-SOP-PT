import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getStudentCurrentSessions,
  getStudentIdentityError,
} from "../src/studentIdentityRules.js";
import {
  getStudentSessionAccess,
  resolveStudentPrimaryCamera,
} from "../src/studentPracticeRules.js";
import { examEntryStatus } from "../src/studentExamRules.js";

const data = JSON.parse(
  readFileSync(
    new URL("../src/data/currentPrototypeData.json", import.meta.url),
  ),
);

test("default prototype data includes a usable student exam demonstration", () => {
  const student = data.students.find((item) => item.id === "s-demo-exam");
  assert.equal(student?.name, "周明轩");
  assert.equal(getStudentIdentityError(student), "");

  const tasks = getStudentCurrentSessions(data, student.id);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].type, "exam");
  const access = getStudentSessionAccess(
    data,
    student.id,
    tasks[0].arrangementId,
    tasks[0].workstationId,
  );
  assert.equal(access.allowed, true);
  assert.equal(access.arrangement.status, "进行中");
  assert.equal(access.session.status, "可入场");
  assert.equal(
    examEntryStatus(
      access.arrangement.scheduleStart,
      access.arrangement.entryEnd,
    ),
    "可入场",
  );
  assert.equal(access.arrangement.sopId, access.arrangement.snapshot.sopId);
  assert.equal(
    access.session.evaluationSnapshot.sopId,
    access.arrangement.sopId,
  );

  const workstation = data.workstations.find(
    (item) => item.id === tasks[0].workstationId,
  );
  assert.equal(workstation.currentArrangement, access.arrangement.name);
  assert.equal(
    resolveStudentPrimaryCamera(data, access.session, workstation).available,
    true,
  );
});
