import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  teachingStatistics,
  statisticsProgress,
  statisticsSteps,
  statisticsStandardOptions,
  taskStatistics,
  statisticsAttendance,
  validateStatisticsFilters,
} from "../src/teachingStatisticsRules.js";
import {
  migrateTeachingStatisticsDemoData,
  TEACHING_STATISTICS_DEMO_PACKAGE,
  TEACHING_STATISTICS_DEMO_VERSION,
} from "../src/teachingStatisticsDemoData.js";
import {
  statisticsTime,
  trustedResultTime,
  classAttribution,
  captureStudentSnapshot,
  statisticsCsv,
  validStatisticsReturn,
  withStatisticsReturn,
  legacyStatisticsTarget,
} from "../src/statisticsCommonRules.js";
import { teacherDashboardMetrics } from "../src/teacherDashboardMetrics.js";
import { createAiRuntimeStore } from "../src/aiRuntimeStore.js";
import { gradeStateToken } from "../src/gradeRevisionRules.js";
const raw = () =>
  JSON.parse(
    fs.readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
const cohort = {
  sopId: "sop-demo-bench-20261015",
  type: "practice",
};
const a = (d, key) =>
  d.arrangements.find((a) => a.id === `practice-statistics-${key}-20261023`);
const row = (m, key) =>
  m.metrics.rows.find(
    (r) => r.arrangementId === `practice-statistics-${key}-20261023`,
  );
test("完整历史快照没有版本号也能分析，不推断或补写当前标准", () => {
  const d = raw(),
    before = structuredClone(d),
    filters = { sopId: "sop-session-closure-demo-20261022", type: "practice" },
    model = teachingStatistics(d, filters),
    options = statisticsStandardOptions(model);
  assert.equal(options.length, 1);
  assert.equal(options[0].total, 5);
  assert.equal(options[0].count, 1);
  assert.equal(options[0].ready, true);
  assert.equal(options[0].stepCount, 3);
  assert.equal(options[0].sopVersion, undefined);
  assert.equal(statisticsSteps(model, filters).length, 3);
  assert.deepEqual(d, before);
});
test("按实际历史评分口径与类型分组，旧版本标签不拆散相同依据", () => {
  const d = raw(),
    model = teachingStatistics(d, { sopId: cohort.sopId }),
    options = statisticsStandardOptions(model),
    example = options.find((g) => g.type === "practice");
  assert.equal(example.count, 18, "旧版本未记录与演示标签的相同快照应合并");
  assert.equal(example.stepCount, 2);
  assert.equal(example.ready, true);
  assert.equal(example.sopVersion, undefined);
  const selected = teachingStatistics(d, example);
  assert.equal(selected.summary.count, example.count);
  assert.equal(statisticsSteps(selected, example).length, 2);
  const first = model.summary.valid[0];
  const merged = statisticsStandardOptions({
    metrics: {
      rows: [first, { ...first, id: "other-label", sopVersion: "旧标签不同" }],
    },
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].count, 2);
  const separated = statisticsStandardOptions({
    metrics: { rows: [first, { ...first, type: "exam" }] },
  });
  assert.equal(separated.length, 2);
  assert.equal(
    statisticsStandardOptions(
      teachingStatistics(d, { ...cohort, from: "2099-01-01" }),
    ).length,
    0,
  );
});
const statisticsFixture = () => {
  const d = raw();
  d.arrangements = d.arrangements.filter(
    (a) =>
      a.sopId !== cohort.sopId ||
      a.demoPackageId === TEACHING_STATISTICS_DEMO_PACKAGE,
  );
  return d;
};
test("步骤标准入口不把待复核、缺失分和未执行步骤当作可分析样本", () => {
  const d = raw(),
    original = teachingStatistics(d, cohort),
    pending = original.metrics.rows.filter((r) => !r.valid),
    option = statisticsStandardOptions({ metrics: { rows: pending } })[0];
  assert.equal(option.count, 0);
  assert.equal(option.ready, false);
  assert.match(option.reason, /尚无有效正式结果/);
  const valid = original.summary.valid[0],
    unexecuted = {
      ...valid,
      session: {
        ...valid.session,
        steps: valid.session.steps.map((step) => ({
          ...step,
          state: "pending",
          result: "待开始",
        })),
      },
    },
    noSteps = statisticsStandardOptions({ metrics: { rows: [unexecuted] } })[0];
  assert.equal(noSteps.count, 1);
  assert.equal(noSteps.ready, false);
  assert.match(noSteps.reason, /尚无已完成/);
});
test("共享迁移只追加十个关联示例，不改旧对象和资源，不恢复已删除示例", () => {
  const d = raw(),
    original = {
      ...d,
      arrangements: d.arrangements.filter(
        (a) => a.demoPackageId !== TEACHING_STATISTICS_DEMO_PACKAGE,
      ),
      enhancementMigrations: d.enhancementMigrations.filter(
        (x) => x !== TEACHING_STATISTICS_DEMO_PACKAGE,
      ),
    };
  const before = structuredClone(original),
    n = migrateTeachingStatisticsDemoData(original);
  assert.deepEqual(original, before);
  assert.equal(n.arrangements.length, before.arrangements.length + 10);
  for (const old of before.arrangements)
    assert.deepEqual(
      n.arrangements.find((a) => a.id === old.id),
      old,
    );
  for (const key of [
    "students",
    "classes",
    "workstations",
    "devices",
    "supportTasks",
    "evidenceTasks",
  ])
    assert.deepEqual(n[key], before[key]);
  assert.deepEqual(migrateTeachingStatisticsDemoData(n), n);
  n.arrangements = n.arrangements.filter((x) => x.id !== a(n, "a1").id);
  assert.deepEqual(migrateTeachingStatisticsDemoData(n), n);
});
test("三次同标准结果均值/分布/人数及首末变化可复算", () => {
  const d = statisticsFixture(),
    m = teachingStatistics(d, { ...cohort, studentId: "s1" }),
    p = statisticsProgress(m, "s1", cohort);
  assert.equal(m.summary.count, 3);
  assert.equal(m.summary.students, 1);
  assert.ok(Math.abs(m.summary.average - 220 / 3) < 1e-9);
  assert.equal(m.summary.pass, 2);
  assert.deepEqual(
    m.distribution.map((g) => g.rows.length),
    [1, 0, 1, 1],
  );
  assert.equal(p.delta, 40);
  assert.equal(p.ready, true);
});
test("班级对比来自两个现有班级，保留归属来源与样本数", () => {
  const m = teachingStatistics(raw(), cohort);
  assert.ok(m.classes.some((c) => c.id === "class-nev-2401"));
  assert.ok(m.classes.some((c) => c.id === "class-nev-2402"));
  assert.ok(m.classes.every((c) => c.source));
  assert.equal(
    m.classes.reduce((n, c) => n + c.count, 0),
    m.summary.count,
  );
});
test("零分参与、空分与待复核排除，未知时间不伪装计划时间", () => {
  const d = raw(),
    m = teachingStatistics(d, cohort);
  assert.equal(row(m, "zero").valid, true);
  assert.equal(row(m, "empty").valid, false);
  assert.equal(row(m, "pending").valid, false);
  assert.equal(row(m, "unknown-time").resultAt, "");
  assert.equal(row(m, "unknown-time").timestamp, null);
  const filtered = teachingStatistics(d, {
    ...cohort,
    from: "2026-10-01",
    to: "2026-10-31",
  });
  assert.ok(!row(filtered, "unknown-time"));
  assert.ok(filtered.unknownDates > 0);
  assert.deepEqual(d, raw(), "只读查询不修改业务数据");
});
test("可信日期不取计划时间，上海自然日边界完整包含", () => {
  assert.equal(
    trustedResultTime(
      { scheduleStart: "2026-10-20", scheduleEnd: "2026-10-21" },
      {},
    ),
    "",
  );
  assert.equal(
    statisticsTime("2026-10-20"),
    Date.parse("2026-10-19T16:00:00Z"),
  );
  assert.equal(
    statisticsTime("2026-10-20", true),
    Date.parse("2026-10-20T15:59:59.999Z"),
  );
  assert.ok(
    validateStatisticsFilters({ from: "2026-10-24", to: "2026-10-20" }),
  );
});
test("一次结果、缺失历史依据与同时间歧义不生成假提升", () => {
  const d = statisticsFixture(),
    m = teachingStatistics(d, cohort);
  assert.equal(statisticsProgress(m, "s-demo-exam", cohort).delta, null);
  const unknown = teachingStatistics(d, {
    ...cohort,
    sopVersion: "版本未记录",
  });
  assert.equal(
    statisticsProgress(unknown, "s1", cohort).ready,
    true,
    "缺旧版本号不再阻断完整快照",
  );
  const incomplete = structuredClone(d);
  for (const ar of incomplete.arrangements) {
    delete ar.snapshot;
    for (const session of ar.sessions || []) {
      delete session.evaluationSnapshot;
      delete session.snapshot;
    }
  }
  assert.equal(
    statisticsProgress(teachingStatistics(incomplete, cohort), "s3", cohort)
      .ready,
    false,
  );
  a(d, "a2").sessions[0].endedAt = a(d, "a1").sessions[0].endedAt;
  const tied = statisticsProgress(teachingStatistics(d, cohort), "s1", cohort);
  assert.equal(tied.ready, false);
  assert.match(tied.reason, /相同/);
});
test("不同标准不能算步骤比较；确认扣分按Session-Step去重", () => {
  const d = statisticsFixture(),
    m = teachingStatistics(d, { ...cohort, studentId: "s1" });
  assert.deepEqual(statisticsSteps(m, {}), []);
  const steps = statisticsSteps(m, cohort);
  assert.equal(steps.length, 2);
  assert.equal(
    steps.reduce((n, g) => n + g.errorCount, 0),
    3,
  );
  assert.ok(steps.every((g) => g.errorCount <= g.count));
  const s = a(d, "a1").sessions[0];
  s.gradeAuditHistory = [
    ...(s.gradeAuditHistory || []),
    ...(s.scoreRevisions || []),
  ];
  const again = statisticsSteps(
    teachingStatistics(d, { ...cohort, studentId: "s1" }),
    cohort,
  );
  assert.equal(
    again.reduce((n, g) => n + g.errorCount, 0),
    3,
  );
});
test("当前有效分修订后统计/来源同步，次数不增加", () => {
  const store = createAiRuntimeStore(statisticsFixture()),
    d = store.getData(),
    ar = a(d, "a1"),
    s = ar.sessions[0],
    step = s.steps[1];
  store.reviseSessionGrade({
    arrangementId: ar.id,
    sessionId: s.id,
    stepId: step.id,
    action: "adjust",
    score: step.maxScore,
    reason: "复核演示事实修订",
    expectedState: gradeStateToken(s),
    operationId: "statistics-grade-test",
    actorId: "t1",
  });
  const m = teachingStatistics(store.getData(), { ...cohort, studentId: "s1" });
  assert.equal(m.summary.count, 3);
  assert.equal(row(m, "a1").scoreVersion, undefined);
  assert.ok(row(m, "a1").score > s.score);
  assert.ok(m.summary.average > 220 / 3);
});
test("跟进取消/关闭单列，状态分布与办结分母不混用", () => {
  const rows = [
    "pending",
    "pending",
    "handling",
    "completed",
    "completed",
    "completed",
    "cancelled",
    "closed",
  ].map((status, i) => ({ id: i, status }));
  const m = taskStatistics(rows);
  assert.equal(m.total, 8);
  assert.equal(m.denominator, 6);
  assert.equal(m.rate, 50);
  assert.equal(taskStatistics([]).rate, null);
  assert.equal(taskStatistics([{ status: "mystery" }]).unknown.length, 1);
});
test("求助独立ID不被Session覆盖；历史请求与当前任务集合分开", () => {
  const d = raw(),
    ar = a(d, "a1"),
    s = ar.sessions[0];
  s.helpRequests = [
    { id: "h1", status: "completed", createdAt: "2026-10-22T01:00:00Z" },
    { id: "h2", status: "cancelled", createdAt: "2026-10-22T02:00:00Z" },
  ];
  const m = teachingStatistics(d, cohort),
    help = m.history.filter((r) => r.sessionId === s.id);
  assert.equal(new Set(help.map((t) => t.id)).size, 2);
  assert.deepEqual(help.map((h) => h.status).sort(), [
    "cancelled",
    "completed",
  ]);
});
test("跟进日期按创建时间而非成绩日期，当前待办不受日期裁剪", () => {
  const d = raw(),
    m = teachingStatistics(d, { from: "2099-01-01", to: "2099-01-02" }),
    all = teachingStatistics(d);
  assert.equal(m.history.length, 0);
  assert.deepEqual(m.current, all.current);
  assert.ok(all.history.length > 0);
  assert.ok(all.current.length > 0);
});
test("整场发布不伪装为学生姓名，个人待办准确关联学生且不改原数据", () => {
  const data = raw(),
    original = structuredClone(data);
  const model = teachingStatistics(data);
  const publications = model.current.filter((r) => r.type === "publish");
  const individuals = model.current.filter((r) =>
    ["review", "step"].includes(r.type),
  );
  assert.ok(publications.length && individuals.length);
  for (const row of publications) {
    assert.equal(row.studentName, "");
    assert.equal(row.sessionId, "");
    assert.match(row.instruction, /整场考试/);
  }
  for (const row of individuals) {
    const source = model.base.find(
      (r) =>
        r.arrangementId === row.arrangementId && r.sessionId === row.sessionId,
    );
    assert.equal(row.studentName, source.studentName);
    assert.notEqual(row.studentName, "整场考试");
  }
  const csv = statisticsCsv(
    [
      { key: "studentName", label: "学生", value: (r) => r.studentName || "—" },
      { key: "instruction", label: "事项" },
    ],
    publications,
    {},
  );
  assert.ok(
    csv
      .split("\r\n")
      .slice(1)
      .every((line) => line.startsWith('"—",')),
  );
  assert.deepEqual(data, original);
});
test("教师范围过滤后不能读其他教师任务或成绩", () => {
  const d = raw();
  a(d, "a1").teacherId = "t2";
  const m = teachingStatistics(d, cohort);
  assert.equal(row(m, "a1"), undefined);
  assert.ok(m.metrics.rows.every((r) => r.teacherId === "t1"));
});
test("归属优先当次来源，不用当前班级冒充历史；新Session记录只知事实", () => {
  const d = raw(),
    ar = a(d, "a1"),
    s = ar.sessions[0],
    old = s.studentSnapshot.classId;
  d.students.find((x) => x.id === s.studentId).classId = "class-mec-2401";
  assert.equal(classAttribution(d, ar, s).id, old);
  delete s.studentSnapshot;
  assert.match(classAttribution(d, ar, s).source, /当前/);
  assert.equal(
    captureStudentSnapshot(d, s.studentId, "now").classId,
    "class-mec-2401",
  );
});
test("单场参加完整名单、待核对与历史多Session不假报缺考", () => {
  const d = raw(),
    ar = a(d, "a1");
  ar.studentIds.push("s2");
  ar.stationAssignments.push({
    studentId: "s2",
    workstationId: "unknown-station",
  });
  let result = statisticsAttendance(d, ar.id);
  assert.equal(result.rows.length, 2);
  assert.equal(
    result.rows.find((r) => r.studentId === "s2").status,
    "记录待核对",
  );
  assert.equal(statisticsAttendance(d, ar.id, "t2"), null);
  ar.sessions.push({
    ...structuredClone(ar.sessions[0]),
    id: "history-ambiguous",
  });
  result = statisticsAttendance(d, ar.id);
  assert.equal(result.rows[0].status, "历史会话待选择");
  assert.equal(result.rows[0].reportPath, "");
});
test("参加记录在进行中定位同Session工位，旧无分配记录不凭点击次序补学生", () => {
  const d = raw(),
    ar = a(d, "a1");
  ar.sessions[0].status = "进行中";
  const r = statisticsAttendance(d, ar.id).rows[0];
  assert.match(r.reportPath, /stations/);
  assert.ok(r.reportPath.includes(r.sessionId));
  delete ar.stationAssignments;
  ar.sessions = [];
  assert.equal(statisticsAttendance(d, ar.id).reliable, false);
});
test("CSV包含全明细与版本/范围，正确处理文本、引号、换行和公式", () => {
  const rows = Array.from({ length: 23 }, (_, i) => ({
    id: i,
    text: i === 0 ? "=SUM(1,2)" : i === 1 ? '姓名,"备注"\n下一行' : "00123",
    version: "V2",
  }));
  const csv = statisticsCsv(
    [
      { key: "id", label: "ID" },
      { key: "text", label: "内容" },
      { key: "version", label: "版本" },
    ],
    rows,
    { 查询范围: "本教师", 统计单位: "人次" },
  );
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("'=SUM(1,2)"));
  assert.ok(csv.includes('姓名,""备注""\n下一行'));
  assert.ok(csv.includes("00123"));
  assert.equal((csv.match(/"V2"/g) || []).length, 23);
  assert.throws(() => statisticsCsv([], [], {}), /没有/);
  assert.equal(rows[0].text, "=SUM(1,2)");
});
test("返回只接受站内统计路径，保留源Session和hash，非办理页不串上下文", () => {
  for (const path of [
    "https://evil.test/teacher/statistics",
    "//evil.test/teacher/statistics",
    "/teacher/statistics-fake",
    "/admin/overview",
  ])
    assert.equal(validStatisticsReturn(path), "");
  const path = "/teacher/practices/p1/stations/w2?sessionId=s#help-h1",
    back = "/teacher/statistics?tab=followup&kind=help";
  const wrapped = withStatisticsReturn(path, back, "browser"),
    u = new URL(wrapped, "https://test");
  assert.equal(u.searchParams.get("sessionId"), "s");
  assert.equal(u.searchParams.get("statisticsReturn"), back);
  assert.equal(u.hash, "#help-h1");
  assert.equal(
    withStatisticsReturn("/teacher/practices", back, "browser"),
    "/teacher/practices",
  );
  for (const metric of ["average", "publishing", "support", "errors"])
    assert.ok(
      legacyStatisticsTarget(metric).startsWith("/teacher/statistics?"),
    );
});

test("非法自然日不通过；学生学号与新开会话班级来源有真实字段", () => {
  assert.ok(validateStatisticsFilters({ from: "2026-02-30" }));
  assert.equal(validateStatisticsFilters({ from: "2024-02-29" }), "");
  const d = raw(),
    model = teachingStatistics(d, { ...cohort, studentId: "s1" });
  assert.equal(
    model.summary.valid[0].studentNumber,
    d.students.find((s) => s.id === "s1").no,
  );
  assert.equal(
    captureStudentSnapshot(d, "s1", "now").number,
    d.students.find((s) => s.id === "s1").no,
  );
});

test("求助办理后跟进状态与成功办结率同步，不修改成绩", () => {
  const d = raw(),
    ar =
      d.arrangements.find(
        (a) => a.id === "practice-closure-help-pending-20261022",
      ) ||
      d.arrangements.find(
        (a) =>
          a.status === "进行中" &&
          a.sessions.some((s) =>
            s.helpRequests?.some((r) => r.status === "pending"),
          ),
      );
  assert.ok(ar, "存在真实待办理演示");
  const original = ar.sessions.find((s) =>
      s.helpRequests?.some((r) => r.status === "pending"),
    ),
    request = original.helpRequests.find((r) => r.status === "pending");
  const store = createAiRuntimeStore(d, { now: () => "2026-10-23T03:00:00Z" });
  for (const action of ["accept_help", "complete_help"])
    store.changeSessionClosure({
      arrangementId: ar.id,
      sessionId: original.id,
      requestId: request.id,
      action,
      actor: "teacher",
      actorId: "t1",
      note: "已现场指导并反馈学生",
    });
  const model = teachingStatistics(store.getData()),
    task = model.history.find(
      (t) => t.taskId === request.id && t.sessionId === original.id,
    );
  assert.equal(task.status, "completed");
  assert.match(task.conclusion, /现场指导/);
  const after = store
    .getData()
    .arrangements.find((a) => a.id === ar.id)
    .sessions.find((s) => s.id === original.id);
  assert.equal(after.score, original.score);
  assert.ok(
    taskStatistics(
      model.history.filter((t) => t.kind === "help"),
    ).completed.some((t) => t.taskId === request.id),
  );
});

test("统计升级另存本轮原始工作字节，不覆盖旧备份或源选择", async () => {
  const { backupWorkingStorage, readWorkingBackups, PROTOTYPE_STORAGE_KEYS } =
    await import("../src/storageMigrationRules.js");
  const key = PROTOTYPE_STORAGE_KEYS.browser,
    selection = PROTOTYPE_STORAGE_KEYS.selection;
  const values = new Map([
    [key, ' {"latest":"用户现有工作"} '],
    [selection, "browser"],
    [`xingchen-backup-before-sop-20261015:${key}`, "旧备份"],
  ]);
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
  await backupWorkingStorage(
    storage,
    null,
    "before-teaching-statistics-20261023",
  );
  assert.equal(
    values.get(`xingchen-backup-before-teaching-statistics-20261023:${key}`),
    ' {"latest":"用户现有工作"} ',
  );
  assert.equal(
    values.get(`xingchen-backup-before-sop-20261015:${key}`),
    "旧备份",
  );
  assert.equal(values.get(key), ' {"latest":"用户现有工作"} ');
  assert.equal(values.get(selection), "browser");
  values.set(key, "后来正常工作更新");
  await backupWorkingStorage(
    storage,
    null,
    "before-teaching-statistics-20261023",
  );
  assert.equal(
    values.get(`xingchen-backup-before-teaching-statistics-20261023:${key}`),
    ' {"latest":"用户现有工作"} ',
  );
  const previous = globalThis.localStorage;
  try {
    globalThis.localStorage = storage;
    const records = await readWorkingBackups(null);
    assert.ok(records.some((r) => r.raw === "旧备份"));
    assert.ok(records.some((r) => r.raw === ' {"latest":"用户现有工作"} '));
  } finally {
    globalThis.localStorage = previous;
  }
});

test("统计升级备份失败不会覆盖用户工作数据", async () => {
  const { backupWorkingStorage, PROTOTYPE_STORAGE_KEYS } = await import(
    "../src/storageMigrationRules.js"
  );
  const original = "原始数据字节";
  const writes = [];
  await assert.rejects(
    () =>
      backupWorkingStorage(
        {
          getItem: (k) =>
            k === PROTOTYPE_STORAGE_KEYS.browser ? original : null,
          setItem: (k) => {
            writes.push(k);
            throw Error("存储空间不足");
          },
        },
        null,
        "before-teaching-statistics-20261023",
      ),
    /不足/,
  );
  assert.ok(writes.every((k) => k.startsWith("xingchen-backup-")));
});
