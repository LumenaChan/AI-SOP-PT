import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  teacherDataStatistics,
  dataStatisticsRange,
  dataStatisticsBucket,
  validateDataStatisticsFilters,
  dataStatisticsGradeSummary,
  dataStatisticsCsv,
  dataStatisticsImprovementPath,
} from "../src/teacherDataStatisticsRules.js";
import { teacherDashboardScopeRows } from "../src/teacherDashboardMetrics.js";
import {
  rememberStatisticsFilters,
  rememberedStatisticsPath,
} from "../src/statisticsFilterMemory.js";
import {
  validStatisticsReturn,
  withStatisticsReturn,
} from "../src/statisticsCommonRules.js";
const raw = () =>
  JSON.parse(
    fs.readFileSync(
      new URL("../src/data/currentPrototypeData.json", import.meta.url),
    ),
  );
function session(id, studentId, status = "进行中", patch = {}) {
  return {
    id,
    studentId,
    status,
    startedAt: "2026-10-05 10:00",
    steps: [],
    ...patch,
  };
}
function arrangement(id, sessions, patch = {}) {
  return {
    id,
    name: id,
    type: "practice",
    teacherId: "t1",
    status: "进行中",
    sopId: "sop",
    startedAt: "2026-10-05 09:00",
    studentIds: sessions.map((s) => s.studentId),
    sessions,
    ...patch,
  };
}
function fixture(arrangements) {
  return {
    arrangements,
    students: [
      { id: "s1", name: "学生一", classId: "c1" },
      { id: "s2", name: "学生二", classId: "c2" },
    ],
    classes: [
      { id: "c1", name: "一班" },
      { id: "c2", name: "二班" },
    ],
    sops: [],
    teachers: [],
  };
}
const dateFilters = { teacherId: "t1", from: "2026-10-01", to: "2026-10-31" };
test("counts actual participation before grades exist; cancellation, absence, future and foreign teacher do not inflate it", () => {
  const d = fixture([
    arrangement("active", [
      session("active-s", "s1"),
      session("waiting", "s2", "待开始", { startedAt: "" }),
    ]),
    arrangement("again", [session("again-s", "s1")]),
    arrangement("other-teacher", [session("foreign", "s2")], {
      teacherId: "t2",
    }),
    arrangement("draft", [session("draft-s", "s1")], { status: "草稿" }),
    arrangement("cancelled", [session("cancelled-s", "s1")], {
      status: "已取消",
    }),
    arrangement("absent", [
      session("absent-s", "s2", "已完成", {
        resultStatus: "未参加",
        endedAt: "2026-10-05 11:00",
      }),
    ]),
  ]);
  const before = structuredClone(d),
    m = teacherDataStatistics(d, dateFilters);
  assert.equal(m.summary.activityCount, 3);
  assert.equal(m.summary.participationCount, 2);
  assert.equal(m.summary.studentCount, 1);
  assert.equal(m.summary.count, 0);
  assert.equal(m.summary.average, null);
  assert.equal(m.summary.expectedCount, 0);
  assert.equal(m.summary.completionRate, null);
  assert.ok(!JSON.stringify(m).includes("other-teacher"));
  assert.deepEqual(d, before);
});
test("completion rate uses ended arrangement roster; active tasks and ambiguous rosters are separate", () => {
  const ended = arrangement(
    "ended",
    [
      session("done", "s1", "已完成", { endedAt: "2026-10-08 11:00" }),
      session("absent", "s2", "待开始", {
        startedAt: "",
        resultStatus: "未参加",
      }),
    ],
    { status: "已结束", endedAt: "2026-10-08 11:00" },
  );
  const active = arrangement("active", [session("active-s", "s2")]);
  const invalid = arrangement(
    "invalid-roster",
    [session("invalid-s", "s1", "已完成", { endedAt: "2026-10-08 11:00" })],
    { status: "已结束", endedAt: "2026-10-08 11:00", studentIds: ["s1", "s1"] },
  );
  const m = teacherDataStatistics(
    fixture([ended, active, invalid]),
    dateFilters,
  );
  assert.equal(m.summary.expectedCount, 2);
  assert.equal(m.summary.completedCount, 1);
  assert.equal(m.summary.expectedParticipatedCount, 1);
  assert.equal(m.summary.completionRate, 50);
  assert.equal(m.summary.completionCount, 2);
  assert.equal(m.missing.rosters, 1);
  assert.equal(
    m.expected.find((r) => r.studentId === "s2").status,
    "明确未参加",
  );
});
test("start, completion and result periods remain distinct across months; unknown dates are not substituted", () => {
  const a = arrangement(
    "cross-month",
    [
      session("s", "s1", "已完成", {
        startedAt: "2026-09-30 23:59",
        endedAt: "2026-10-01 00:01",
      }),
    ],
    {
      status: "已结束",
      startedAt: "2026-09-30 23:59",
      endedAt: "2026-10-01 00:01",
    },
  );
  const d = fixture([
    a,
    arrangement(
      "unknown",
      [session("unknown-s", "s2", "进行中", { startedAt: "" })],
      { startedAt: "" },
    ),
  ]);
  const m = teacherDataStatistics(d, dateFilters);
  assert.equal(m.summary.participationCount, 0);
  assert.equal(m.summary.activityCount, 0);
  assert.equal(m.summary.completionCount, 1);
  assert.equal(m.summary.completedCount, 1);
  assert.equal(m.classes[0].completionCount, 1);
  assert.equal(m.missing.starts, 1);
  const all = teacherDataStatistics(d);
  assert.equal(all.summary.participationCount, 2);
  assert.equal(
    all.series.rows.reduce((n, r) => n + r.practice + r.exam, 0),
    1,
  );
});
test("historical class attribution, class-specific denominator and missing-session roster entries remain visible", () => {
  const a = arrangement(
    "ended",
    [
      session("s", "s1", "已完成", {
        studentSnapshot: { id: "s1", classId: "c2" },
        endedAt: "2026-10-08",
      }),
    ],
    { status: "已结束", endedAt: "2026-10-08", studentIds: ["s1", "s2"] },
  );
  const m = teacherDataStatistics(fixture([a]), {
    ...dateFilters,
    classId: "c2",
  });
  assert.equal(m.summary.studentCount, 1);
  assert.equal(m.summary.expectedCount, 2);
  assert.equal(m.summary.completedCount, 1);
  assert.equal(
    m.expected.find((r) => r.studentId === "s2").status,
    "尚未完成／待核对",
  );
  assert.equal(
    teacherDataStatistics(fixture([a]), { ...dateFilters, classId: "c1" })
      .summary.expectedCount,
    0,
  );
});
test("formal grade cohort exactly matches existing teaching improvement rules; real zero remains valid", () => {
  const d = raw(),
    filters = {
      teacherId: "t1",
      sopId: "sop-demo-bench-20261015",
      type: "practice",
    };
  const existing = teacherDashboardScopeRows(d, filters).filter((r) => r.valid),
    m = teacherDataStatistics(d, filters);
  assert.deepEqual(
    m.grades.map((r) => r.id).sort(),
    existing.map((r) => r.id).sort(),
  );
  assert.equal(m.summary.count, existing.length);
  assert.equal(m.summary.comparable, true);
  assert.equal(
    m.summary.average,
    existing.reduce((n, r) => n + r.normalizedScore, 0) / existing.length,
  );
  const simple = {
    sopId: "x",
    type: "practice",
    standardBasisComplete: true,
    standardBasisKey: "same",
    normalizedScore: 0,
  };
  assert.equal(dataStatisticsGradeSummary([simple]).average, 0);
  assert.equal(dataStatisticsGradeSummary([simple]).passRate, 0);
  assert.equal(
    dataStatisticsGradeSummary([
      simple,
      { ...simple, type: "exam", normalizedScore: 100 },
    ]).average,
    null,
  );
  assert.equal(
    dataStatisticsGradeSummary([{ ...simple, standardBasisComplete: false }])
      .average,
    null,
  );
});
test("trend buckets use Beijing day, Monday week and calendar month, fill gaps and preserve counts", () => {
  assert.equal(
    dataStatisticsBucket("2026-10-04T16:01:00Z", "day"),
    "2026-10-05",
  );
  assert.equal(dataStatisticsBucket("2026-10-11 23:59", "week"), "2026-10-05");
  assert.equal(dataStatisticsBucket("2026-10-11 23:59", "month"), "2026-10");
  const m = teacherDataStatistics(
    fixture([
      arrangement("first", [session("s1", "s1")]),
      arrangement(
        "third",
        [session("s2", "s2", "进行中", { startedAt: "2026-10-07 10:00" })],
        { type: "exam" },
      ),
    ]),
    dateFilters,
  );
  assert.equal(m.series.rows.length, 3);
  assert.equal(m.series.rows[1].practice + m.series.rows[1].exam, 0);
  assert.equal(
    m.series.rows.reduce((n, r) => n + r.practice + r.exam, 0),
    m.summary.participationCount,
  );
});
test("preset dates are inclusive and term dates require explicit school boundaries", () => {
  const now = new Date("2026-10-27T08:00:00Z");
  assert.deepEqual(dataStatisticsRange("7d", now), {
    from: "2026-10-21",
    to: "2026-10-27",
  });
  assert.deepEqual(dataStatisticsRange("30d", now), {
    from: "2026-09-28",
    to: "2026-10-27",
  });
  assert.deepEqual(dataStatisticsRange("month", now), {
    from: "2026-10-01",
    to: "2026-10-27",
  });
  assert.match(validateDataStatisticsFilters({ range: "term" }), /学期/);
  assert.match(
    validateDataStatisticsFilters({ from: "2026-10-32" }),
    /有效日期/,
  );
  assert.match(
    validateDataStatisticsFilters({ from: "2026-10-10", to: "2026-10-01" }),
    /开始日期/,
  );
});
test("CSV exports retain source and filter metadata, escape formulas and reject empty data", () => {
  const text = dataStatisticsCsv(
    [{ id: "1", name: '=formula,"quoted"' }],
    [{ key: "name", label: "名称" }],
    dateFilters,
    "cpd",
    "汇总",
  );
  assert.ok(text.includes("日期口径"));
  assert.ok(text.includes("CPD工作数据"));
  assert.ok(text.includes("'=formula"));
  assert.ok(text.includes('""quoted""'));
  assert.throws(
    () => dataStatisticsCsv([], [], dateFilters, "browser", "空"),
    /没有可导出/,
  );
});
test("filter memory is isolated per page, teacher and source; detail and return state never leak into the other module", () => {
  const saved = new Map(),
    storage = {
      getItem: (k) => saved.get(k),
      setItem: (k, v) => saved.set(k, v),
    };
  rememberStatisticsFilters(
    "/teacher/statistics",
    new URLSearchParams("classId=c1&tab=steps&detail=errors"),
    "cpd",
    "t1",
    storage,
  );
  rememberStatisticsFilters(
    "/teacher/data-statistics",
    new URLSearchParams("classId=c2&range=all&detail=coverage&group=x"),
    "cpd",
    "t1",
    storage,
  );
  assert.match(
    rememberedStatisticsPath("/teacher/statistics", "cpd", "t1", storage),
    /classId=c1/,
  );
  assert.match(
    rememberedStatisticsPath("/teacher/data-statistics", "cpd", "t1", storage),
    /classId=c2/,
  );
  assert.equal(
    rememberedStatisticsPath(
      "/teacher/data-statistics",
      "browser",
      "t1",
      storage,
    ),
    "/teacher/data-statistics?source=browser",
  );
  assert.equal(
    rememberedStatisticsPath("/teacher/data-statistics", "cpd", "t2", storage),
    "/teacher/data-statistics?source=cpd",
  );
  assert.ok(
    !rememberedStatisticsPath(
      "/teacher/statistics",
      "cpd",
      "t1",
      storage,
    ).includes("detail"),
  );
  const broken = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
  };
  assert.doesNotThrow(() =>
    rememberStatisticsFilters(
      "/teacher/statistics",
      new URLSearchParams(),
      "cpd",
      "t1",
      broken,
    ),
  );
  assert.equal(
    rememberedStatisticsPath("/teacher/data-statistics", "cpd", "t1", broken),
    "/teacher/data-statistics?source=cpd",
  );
});
test("cross-module analysis links transfer only compatible filters and record return links retain exact statistics context", () => {
  const path = dataStatisticsImprovementPath(
    {
      ...dateFilters,
      classId: "c1",
      grain: "week",
      dimension: "standard",
      detail: "coverage",
    },
    "cpd",
  );
  assert.ok(path.startsWith("/teacher/statistics?"));
  assert.ok(path.includes("classId=c1"));
  assert.ok(!path.includes("grain"));
  assert.ok(!path.includes("detail"));
  const back = "/teacher/data-statistics?range=all&detail=coverage&source=cpd";
  assert.equal(validStatisticsReturn(back), back);
  assert.ok(
    withStatisticsReturn("/teacher/practices/p/results", back, "cpd").includes(
      "statisticsReturn=",
    ),
  );
  assert.equal(
    validStatisticsReturn("//evil.test/teacher/data-statistics"),
    "",
  );
  assert.equal(validStatisticsReturn("/teacher/data-statistics-extra"), "");
});
