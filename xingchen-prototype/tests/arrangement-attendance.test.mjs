import test from "node:test";
import assert from "node:assert/strict";
import {
  arrangementAttendance as roster,
  arrangementAttendanceCsv,
  arrangementAttendancePath,
  attendanceReturnTarget,
  validAttendanceReturn,
  withAttendanceReturn,
  legacyAttendanceTarget,
} from "../src/arrangementAttendanceRules.js";
import { withStatisticsReturn } from "../src/statisticsCommonRules.js";

function fixture(type = "practice", status = "已结束") {
  return {
    students: [1, 2, 3, 4].map((n) => ({
      id: `s${n}`,
      name: `学生${n}`,
      no: `2026000${n}`,
      classId: n === 4 ? "c2" : "c1",
    })),
    classes: [
      { id: "c1", name: "一班" },
      { id: "c2", name: "二班" },
    ],
    workstations: [1, 2, 3, 4].map((n) => ({
      id: `w${n}`,
      name: `${n}号工位`,
    })),
    arrangements: [
      {
        id: "a",
        name: "完整名单练习",
        type,
        status,
        teacherId: "t1",
        studentIds: ["s1", "s2", "s3", "s4"],
        workstationIds: ["w1", "w2", "w3", "w4"],
        stationAssignments: [1, 2, 3, 4].map((n) => ({
          studentId: `s${n}`,
          workstationId: `w${n}`,
        })),
        sessions: [
          {
            id: "session1",
            studentId: "s1",
            workstationId: "w1",
            status: "已完成",
            resultStatus: "正式成绩",
            startedAt: "2026-10-20 10:00:00",
          },
          {
            id: "session2",
            studentId: "s2",
            workstationId: "w2",
            status: "已完成",
            resultStatus: "未参加",
          },
          {
            id: "session3",
            studentId: "s3",
            workstationId: "w3",
            status: "可入场",
          },
        ],
      },
    ],
  };
}

for (const type of ["practice", "exam"]) {
  test(`${type}完整名单包括未参加、尚未开始和缺记录，不受成绩／日期／班级筛选裁剪`, () => {
    const data = fixture(type),
      before = structuredClone(data),
      model = roster(data, "a");
    assert.equal(model.rows.length, 4);
    assert.deepEqual(
      model.rows.map((r) => r.status),
      ["已参加", "明确未参加", "尚未开始", "记录待核对"],
    );
    assert.deepEqual(model.counts, {
      expected: 4,
      listed: 4,
      participated: 1,
      absent: 1,
      waiting: 1,
      pending: 1,
      cancelled: 0,
    });
    assert.equal(model.rows[3].className, "二班");
    assert.equal(model.reliable, true);
    assert.deepEqual(data, before);
    assert.equal(roster(data, "a", "t2"), null);
    assert.equal(
      roster(data, "a", null).rows.length,
      4,
      "管理员显式只读查看其他教师名单",
    );
    assert.equal(roster(data, "missing"), null);
  });
}

test("未开始安排没有会话属于尚未开始；取消不产生缺考或应参加分母", () => {
  for (const status of ["草稿", "待开始", "准备中"]) {
    const d = fixture("practice", status);
    d.arrangements[0].sessions = [];
    const model = roster(d, "a");
    assert.equal(model.counts.waiting, 4);
    assert.equal(model.counts.absent, 0);
    assert.equal(model.counts.pending, 0);
  }
  const d = fixture("exam", "已取消");
  d.arrangements[0].sessions = [];
  assert.equal(roster(d, "a").counts.expected, 0);
  assert.equal(roster(d, "a").counts.cancelled, 4);
  assert.equal(roster(d, "a").counts.absent, 0);
});

test("名单外会话／分配不能扩大分母；多历史会话不猜测参加结论", () => {
  const d = fixture();
  d.arrangements[0].stationAssignments.push({
    studentId: "extra",
    workstationId: "other",
  });
  d.arrangements[0].sessions.push(
    {
      id: "extra-s",
      studentId: "extra",
      workstationId: "other",
      status: "已完成",
    },
    { ...d.arrangements[0].sessions[0], id: "duplicate" },
  );
  const model = roster(d, "a");
  assert.equal(model.rows.length, 4);
  assert.equal(model.counts.expected, 4);
  assert.equal(model.rows[0].status, "历史会话待选择");
  assert.equal(model.rows[0].reportPath, "");
  assert.equal(model.rows[0].recordOptions.length, 2);
  assert.ok(
    model.rows[0].recordOptions.every((r) => r.path.includes("sessionId=")),
  );
  assert.equal(model.extras.length, 1);
  assert.equal(model.extraAssignments.length, 1);
  assert.equal(model.reliable, false);
});

test("历史身份优先快照，工位显示业务名称；导出包含全部搜索行而非当前页", () => {
  const d = fixture();
  d.arrangements[0].sessions[0].studentSnapshot = {
    id: "s1",
    name: "原姓名",
    number: "0001",
    classId: "c2",
  };
  const model = roster(d, "a"),
    csv = arrangementAttendanceCsv(model, model.rows, "cpd", "学号");
  assert.equal(model.rows[0].studentName, "原姓名");
  assert.equal(model.rows[0].className, "二班");
  for (const text of [
    "原姓名",
    "学生4",
    "4号工位",
    "明确未参加",
    "记录待核对",
    "搜索条件",
    "学号",
    "CPD工作数据",
  ])
    assert.ok(csv.includes(text), text);
  assert.ok(!csv.includes("session1"));
  assert.ok(
    arrangementAttendanceCsv(
      model,
      [model.rows[3]],
      "browser",
      "学生4",
    ).includes("学生4"),
  );
  assert.equal(
    model.rows[0].recordOptions[0].path.includes("sessionId=session1"),
    true,
  );
});

test("准备／监控／结果／草稿／取消都定位当前安排名单", () => {
  for (const [status, phase] of [
    ["草稿", "edit"],
    ["待开始", "prep"],
    ["准备中", "prep"],
    ["进行中", "live"],
    ["已暂停", "live"],
    ["已结束", "results"],
    ["待发布", "results"],
    ["已发布", "results"],
    ["已取消", "prep"],
  ]) {
    assert.equal(
      arrangementAttendancePath({ id: "a", type: "exam", status }),
      `/teacher/exams/a/${phase}?attendance=1`,
    );
  }
});

for (const source of ["browser", "cpd"]) {
  test(`${source}统计明细→安排名单→源记录→名单→统计，所有范围／页码保留`, () => {
    const statistics = `/teacher/statistics?source=${source}&tab=classes&type=practice&classId=c1&from=2026-10-01&detail=students&q=学生&dpage=2&dsize=20`;
    const path = withStatisticsReturn(
      "/teacher/practices/a/results?attendance=1&aq=学生&apage=1&asize=20",
      statistics,
      source,
    );
    const record = withAttendanceReturn(
      "/teacher/practices/a/students/s1?sessionId=session1",
      path,
      source,
    );
    const params = new URL(record, "http://prototype.local").searchParams;
    const back = attendanceReturnTarget(
      params,
      source,
      "/teacher/practices/a/students/s1",
    );
    assert.equal(back, path);
    assert.equal(
      new URL(back, "http://prototype.local").searchParams.get(
        "statisticsReturn",
      ),
      new URL(statistics, "http://prototype.local").pathname +
        new URL(statistics, "http://prototype.local").search,
    );
    assert.equal(
      attendanceReturnTarget(
        params,
        source === "browser" ? "cpd" : "browser",
        "/teacher/practices/a/students/s1",
      ),
      "",
    );
    assert.equal(
      attendanceReturnTarget(
        params,
        source,
        "/teacher/practices/another/students/s1",
      ),
      "",
    );
    assert.equal(
      validAttendanceReturn(
        "https://external.example/teacher/practices/a/results?attendance=1",
      ),
      "",
    );
  });
}

test("旧统计名单链接迁移到安排，完整保留统计返回范围；失效或他人安排不跳转", () => {
  const d = fixture(),
    p = new URLSearchParams(
      "tab=classes&source=cpd&detail=students&q=学生&dpage=2&attendance=a&courseId=old",
    );
  const target = new URL(
    legacyAttendanceTarget(d, p, "cpd"),
    "http://prototype.local",
  );
  assert.equal(target.pathname, "/teacher/practices/a/results");
  assert.equal(target.searchParams.get("attendance"), "1");
  const back = new URL(
    target.searchParams.get("statisticsReturn"),
    "http://prototype.local",
  );
  assert.equal(back.searchParams.get("q"), "学生");
  assert.equal(back.searchParams.get("dpage"), "2");
  assert.ok(
    !back.searchParams.has("attendance") && !back.searchParams.has("courseId"),
  );
  d.arrangements[0].teacherId = "t2";
  assert.equal(legacyAttendanceTarget(d, p, "cpd"), "");
});
