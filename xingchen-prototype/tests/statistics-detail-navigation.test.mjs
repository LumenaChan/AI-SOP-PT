import test from "node:test";
import assert from "node:assert/strict";
import {
  openStatisticsDetail,
  statisticsDetailParent,
} from "../src/statisticsDetailNavigation.js";

for (const source of ["browser", "cpd"]) {
  test(`${source}学生列表查看结果后返回，恢复筛选、搜索、两层页码和每页数量`, () => {
    const parent = new URLSearchParams({
      source,
      tab: "classes",
      classId: "class-1",
      sopId: "sop-1",
      sopVersion: "版本未记录",
      type: "practice",
      from: "2026-10-01",
      to: "2026-10-24",
      student: "s3",
      detail: "students",
      q: "陈宇",
      page: "2",
      size: "50",
      dpage: "1",
      dsize: "20",
    });
    const before = parent.toString();
    const child = openStatisticsDetail(parent, "student:s3", source);
    assert.equal(child.get("detail"), "student:s3");
    assert.equal(child.get("q"), null);
    assert.equal(child.get("dpage"), null);
    child.set("q", "随堂练习");
    child.set("dpage", "3");
    child.set("dsize", "50");
    const restored = statisticsDetailParent(
      new URLSearchParams(child.toString()),
      source,
    );
    assert.equal(
      restored.toString(),
      (() => {
        const clean = new URLSearchParams(before);
        clean.delete("sopVersion");
        return clean.toString();
      })(),
      "刷新子明细后仍可恢复原弹窗全部条件",
    );
    assert.equal(restored.has("detailReturn"), false);
    assert.equal(parent.toString(), before, "进入子明细不修改来源对象");
  });
}

test("直接进入结果无伪造父级；新顶层明细不沿用旧返回地址", () => {
  assert.equal(
    statisticsDetailParent(
      new URLSearchParams("source=browser&detail=student:s3"),
      "browser",
    ),
    null,
  );
  const child = openStatisticsDetail(
    new URLSearchParams("detail=students&source=browser"),
    "student:s3",
    "browser",
  );
  const root = openStatisticsDetail(child, "all", "browser");
  assert.equal(root.has("detailReturn"), false);
  assert.equal(statisticsDetailParent(root, "browser"), null);
});

test("跨来源、统计范围变化、异常或递归返回地址不恢复，课程条件不复活", () => {
  const child = openStatisticsDetail(
    new URLSearchParams(
      "source=cpd&tab=classes&detail=students&courseId=old-course",
    ),
    "student:s3",
    "cpd",
  );
  assert.equal(statisticsDetailParent(child, "cpd").has("courseId"), false);
  assert.equal(statisticsDetailParent(child, "browser"), null);
  const changed = new URLSearchParams(child);
  changed.set("classId", "another");
  assert.equal(statisticsDetailParent(changed, "cpd"), null);
  for (const target of [
    "https://example.com",
    "source=cpd&detail=all",
    "source=cpd&tab=classes&detail=students&detailReturn=recursive",
  ]) {
    const invalid = new URLSearchParams(child);
    invalid.set("detailReturn", target);
    assert.equal(statisticsDetailParent(invalid, "cpd"), null);
  }
});

for (const source of ["browser", "cpd"]) {
  test(`${source}查看不完整历史快照的原始记录不改变主页面范围，关闭后仍能选择可分析标准`, async () => {
    const { readFileSync } = await import("node:fs");
    const { teachingStatistics, statisticsStandardOptions, statisticsSteps } =
      await import("../src/teachingStatisticsRules.js");
    const { openStatisticsStandardRecords, statisticsRecordFilters } =
      await import("../src/statisticsDetailNavigation.js");
    const data = JSON.parse(
      readFileSync(
        new URL("../src/data/currentPrototypeData.json", import.meta.url),
        "utf8",
      ),
    );
    const filters = { teacherId: "t1", from: "2026-09-01", to: "2026-10-24" };
    const main = teachingStatistics(data, filters);
    const groups = statisticsStandardOptions(main);
    const unknown = groups.find(
      (g) => g.sopId === "s3" && !g.ready && g.type === "practice",
    );
    const available = groups.find(
      (g) =>
        g.sopId === "sop-demo-bench-20261015" &&
        g.ready &&
        g.type === "practice",
    );
    assert.ok(!unknown.ready && available.ready);
    const params = new URLSearchParams({
      source,
      tab: "steps",
      from: filters.from,
      to: filters.to,
      page: "1",
      size: "20",
      sort: "count",
      desc: "1",
    });
    const before = params.toString();
    const opened = openStatisticsStandardRecords(params, unknown, source);
    assert.equal(params.toString(), before);
    for (const key of [
      "source",
      "tab",
      "classId",
      "sopId",
      "sopVersion",
      "type",
      "from",
      "to",
      "page",
      "size",
      "sort",
      "desc",
    ])
      assert.equal(
        opened.get(key),
        params.get(key),
        `${key}属于主页面，查看明细不能改写`,
      );
    const refresh = new URLSearchParams(opened.toString());
    const detailFilters = statisticsRecordFilters(refresh, filters);
    assert.equal(detailFilters.basisArrangementId, unknown.basisArrangementId);
    assert.equal(detailFilters.basisSessionId, unknown.basisSessionId);
    assert.equal(detailFilters.teacherId, "t1");
    assert.equal(detailFilters.from, filters.from);
    const detailModel = teachingStatistics(data, detailFilters);
    assert.ok(detailModel.metrics.rows.length > 0);
    assert.ok(
      detailModel.metrics.rows.every(
        (r) =>
          r.sopId === unknown.sopId &&
          !r.standardBasisComplete &&
          r.type === "practice",
      ),
    );
    assert.deepEqual(statisticsSteps(detailModel, detailFilters), []);
    assert.equal(
      statisticsStandardOptions(main).find((g) => g.id === available.id).count,
      available.count,
    );
    const analysisFilters = {
      ...filters,
      sopId: available.sopId,
      basisArrangementId: available.basisArrangementId,
      basisSessionId: available.basisSessionId,
      type: available.type,
    };
    const analysis = teachingStatistics(data, analysisFilters);
    assert.equal(analysis.summary.count, available.count);
    assert.equal(
      teachingStatistics(data, {
        teacherId: "t1",
        sopId: available.sopId,
        basisArrangementId: available.basisArrangementId,
        basisSessionId: available.basisSessionId,
        type: available.type,
      }).summary.count,
      18,
      "相同快照依据的全部记录均可进入核心分析",
    );
    const steps = statisticsSteps(analysis, analysisFilters);
    assert.equal(steps.length, 2);
    assert.deepEqual(
      steps.map((s) => s.name),
      ["绝缘手套状态检查", "万用表测量动作"],
    );
  });
}

test("选中未知版本或分析详情后可返回标准列表，保留班级日期及数据来源，不推荐跨范围样例", async () => {
  const { statisticsStandardListParams } = await import(
    "../src/statisticsDetailNavigation.js"
  );
  const current = new URLSearchParams({
    source: "cpd",
    tab: "steps",
    classId: "c1",
    from: "2026-10-01",
    to: "2026-10-24",
    sopId: "bench",
    sopVersion: "版本未记录",
    type: "practice",
    detail: "records",
    recordSopId: "bench",
    recordSopVersion: "版本未记录",
    recordType: "practice",
    page: "2",
    size: "20",
    sort: "count",
    desc: "1",
    q: "学生",
    courseId: "removed",
  });
  const before = current.toString();
  const list = statisticsStandardListParams(current, "cpd");
  for (const key of ["source", "tab", "classId", "from", "to", "size"])
    assert.equal(list.get(key), current.get(key));
  for (const key of [
    "sopId",
    "sopVersion",
    "type",
    "detail",
    "recordSopId",
    "recordSopVersion",
    "recordType",
    "page",
    "sort",
    "desc",
    "q",
    "courseId",
  ])
    assert.equal(list.has(key), false);
  assert.equal(current.toString(), before);
});

test("新原始记录范围必须完整；旧深链兼容，其他明细不沿用上一个标准的记录范围", async () => {
  const { openStatisticsStandardRecords, statisticsRecordFilters } =
    await import("../src/statisticsDetailNavigation.js");
  const filters = {
    teacherId: "t1",
    sopId: "old",
    sopVersion: "版本未记录",
    type: "exam",
  };
  assert.deepEqual(
    statisticsRecordFilters(new URLSearchParams("detail=records"), filters),
    filters,
  );
  for (const query of [
    "recordSopId=x",
    "recordSopId=x&recordType=practice&recordBasisSessionId=partial",
    "recordSopId=x&recordSopVersion=v&recordType=unknown",
  ])
    assert.equal(
      statisticsRecordFilters(new URLSearchParams(query), filters),
      null,
    );
  const legacy = statisticsRecordFilters(
    new URLSearchParams(
      "recordSopId=x&recordType=practice&recordSopVersion=old-label",
    ),
    filters,
  );
  assert.equal(legacy.sopId, "x");
  assert.equal(legacy.basisArrangementId, "");
  const opened = openStatisticsStandardRecords(
    new URLSearchParams("source=cpd&detail=all"),
    { sopId: "x", sopVersion: "v", type: "exam" },
    "cpd",
  );
  const other = openStatisticsDetail(opened, "all", "cpd");
  assert.equal(other.has("recordSopId"), false);
  assert.equal(other.has("recordSopVersion"), false);
  assert.equal(other.has("recordType"), false);
});

for (const source of ["browser", "cpd"]) {
  test(`${source}步骤分析侧栏不改变页面筛选、标准列表及分页，刷新后仍使用所选历史评分依据`, async () => {
    const fs = await import("node:fs");
    const { teachingStatistics, statisticsStandardOptions, statisticsSteps } =
      await import("../src/teachingStatisticsRules.js");
    const {
      openStatisticsStepAnalysis,
      statisticsAnalysisFilters,
      closeStatisticsDetail,
    } = await import("../src/statisticsDetailNavigation.js");
    const data = JSON.parse(
      fs.readFileSync(
        new URL("../src/data/currentPrototypeData.json", import.meta.url),
      ),
    );
    const before = structuredClone(data),
      filters = {
        teacherId: "t1",
        classId: "class-nev-2401",
        from: "2026-09-01",
        to: "2026-10-24",
      };
    const model = teachingStatistics(data, filters),
      groups = statisticsStandardOptions(model),
      group = groups.find(
        (g) =>
          g.ready &&
          g.type === "practice" &&
          g.sopId === "sop-demo-bench-20261015",
      );
    assert.ok(group);
    const params = new URLSearchParams({
      source,
      tab: "steps",
      classId: filters.classId,
      from: filters.from,
      to: filters.to,
      page: "1",
      size: "20",
      sort: "count",
      desc: "1",
    });
    const original = params.toString(),
      opened = openStatisticsStepAnalysis(params, group, source);
    for (const [key, value] of params)
      assert.equal(opened.get(key), value, `${key}主页面状态保持原样`);
    assert.equal(opened.has("sopId"), false);
    assert.equal(opened.has("type"), false);
    assert.equal(opened.has("basisSessionId"), false);
    assert.equal(params.toString(), original);
    const analysisFilters = statisticsAnalysisFilters(
        new URLSearchParams(opened.toString()),
        filters,
      ),
      analysis = teachingStatistics(data, analysisFilters);
    assert.equal(analysis.summary.count, group.count);
    assert.equal(statisticsSteps(analysis, analysisFilters).length, 2);
    assert.deepEqual(
      statisticsStandardOptions(teachingStatistics(data, filters)),
      groups,
    );
    assert.equal(closeStatisticsDetail(opened, source).toString(), original);
    assert.deepEqual(data, before);
  });
  test(`${source}样本与扣分来源可返回原步骤分析，保留分析页码并关闭回到原列表`, async () => {
    const { openStatisticsStepAnalysis, closeStatisticsDetail } = await import(
      "../src/statisticsDetailNavigation.js"
    );
    const main = new URLSearchParams({
      source,
      tab: "steps",
      sopId: "standard",
      type: "practice",
      page: "2",
      size: "50",
      sort: "sopName",
    });
    const analysis = openStatisticsStepAnalysis(
      main,
      {
        sopId: "standard",
        type: "practice",
        basisArrangementId: "arr",
        basisSessionId: "session",
      },
      source,
    );
    analysis.set("apage", "1");
    analysis.set("asize", "20");
    analysis.set("asort", "rate");
    analysis.set("adesc", "1");
    const before = analysis.toString();
    for (const kind of ["stepall", "steperrors"]) {
      const child = openStatisticsDetail(analysis, `${kind}:Step 01`, source);
      child.set("q", "学生");
      child.set("dpage", "2");
      child.set("dsize", "50");
      assert.equal(child.get("analysisBasisSessionId"), "session");
      assert.equal(
        statisticsDetailParent(
          new URLSearchParams(child.toString()),
          source,
        ).toString(),
        before,
      );
      assert.equal(
        closeStatisticsDetail(child, source).toString(),
        main.toString(),
      );
      assert.equal(
        statisticsDetailParent(child, source === "cpd" ? "browser" : "cpd"),
        null,
      );
      const tampered = new URLSearchParams(child);
      tampered.set("analysisBasisSessionId", "different");
      assert.equal(statisticsDetailParent(tampered, source), null);
    }
    const other = openStatisticsDetail(analysis, "all", source);
    assert.equal(other.has("analysisSopId"), false);
    assert.equal(other.has("apage"), false);
    assert.equal(other.has("detailReturn"), false);
  });
}
test("分析侧栏范围不完整或与主页面标准／结果类型冲突时不扩大查询", async () => {
  const { statisticsAnalysisFilters } = await import(
    "../src/statisticsDetailNavigation.js"
  );
  const complete = new URLSearchParams(
    "analysisSopId=s1&analysisType=practice&analysisBasisArrangementId=a&analysisBasisSessionId=s",
  );
  assert.equal(statisticsAnalysisFilters(complete, { sopId: "s2" }), null);
  assert.equal(statisticsAnalysisFilters(complete, { type: "exam" }), null);
  for (const key of [
    "analysisSopId",
    "analysisType",
    "analysisBasisArrangementId",
    "analysisBasisSessionId",
  ]) {
    const partial = new URLSearchParams(complete);
    partial.delete(key);
    assert.equal(statisticsAnalysisFilters(partial, {}), null);
  }
});
