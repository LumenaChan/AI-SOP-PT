import test from "node:test";
import assert from "node:assert/strict";
import {
  teacherDashboardTasks,
  adminCurrentArrangements,
} from "../src/teacherDashboardTasks.js";

function fixture() {
  return {
    students: [{ id: "student", name: "张浩" }],
    workstations: [{ id: "w", name: "1号工位" }],
    notifications: [{ id: "n", read: true }],
    arrangements: [
      {
        id: "a",
        type: "practice",
        teacherId: "t1",
        name: "工作台实训",
        status: "进行中",
        sessions: [
          {
            id: "s",
            studentId: "student",
            workstationId: "w",
            status: "进行中",
            currentStepId: "step-1",
            resultStatus: "待复核",
            steps: [
              { id: "step-1", name: "手套", reviewStatus: "待复核" },
              { id: "step-2", name: "万用表", reviewStatus: "待补充证据" },
            ],
            stepConfirmation: {
              id: "confirm",
              status: "pending",
              stepId: "step-1",
            },
            helpRequests: [
              {
                id: "help",
                teacherId: "t1",
                stepId: "step-1",
                status: "pending",
                kind: "practice",
                reasonLabel: "操作指导",
              },
            ],
            events: [],
            runtime: {
              safetyCandidates: [
                { id: "safety", stepId: "step-1", status: "pending" },
              ],
              technicalIncidents: [
                {
                  id: "fault",
                  stepId: "step-1",
                  status: "open",
                  reason: "相机离线",
                },
              ],
            },
          },
        ],
      },
      {
        id: "exam",
        type: "exam",
        teacherId: "t1",
        name: "待发布考试",
        status: "待发布",
        sessions: [
          {
            id: "exam-s",
            studentId: "student",
            workstationId: "w",
            status: "已完成",
            resultStatus: "正式成绩",
            score: 80,
            steps: [],
          },
        ],
      },
    ],
    evidenceTasks: [
      {
        id: "evidence",
        kind: "evidence",
        teacherId: "t1",
        arrangementId: "a",
        sessionId: "s",
        studentId: "student",
        stepId: "step-2",
        status: "handling",
      },
    ],
    supportTasks: [
      {
        id: "support",
        teacherId: "t1",
        arrangementId: "a",
        sessionId: "s",
        studentId: "student",
        status: "pending",
      },
    ],
  };
}

test("待办数字、分页和目标使用唯一集合并涵盖全部实际类型", () => {
  const data = fixture(),
    before = structuredClone(data);
  const tasks = teacherDashboardTasks(data);
  assert.equal(tasks.length, 8);
  assert.deepEqual(
    new Set(tasks.map((t) => t.type)),
    new Set([
      "step",
      "help",
      "evidence",
      "support",
      "review",
      "publish",
      "safety",
      "technical",
    ]),
  );
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
  assert.equal(
    tasks.slice(0, 3).length + tasks.slice(3, 6).length + tasks.slice(6).length,
    tasks.length,
  );
  for (const task of tasks) {
    const a = data.arrangements.find(
      (a) => a.id === task.sourceIds.arrangementId,
    );
    assert.ok(a);
    assert.equal(a.teacherId, "t1");
    assert.ok(
      task.title && task.detail && task.actionLabel && task.path && task.status,
    );
    if (task.sourceIds.sessionId) {
      const s = a.sessions.find((s) => s.id === task.sourceIds.sessionId);
      assert.ok(s);
      if (task.sourceIds.stepId)
        assert.ok(s.steps.some((step) => step.id === task.sourceIds.stepId));
    }
  }
  assert.deepEqual(data, before);
  assert.deepEqual(teacherDashboardTasks(data), tasks);
});

test("已读不等于已办；完成和取消移出待办，源历史不丢失", () => {
  const data = fixture();
  assert.equal(
    teacherDashboardTasks(data).filter((t) => t.type === "help").length,
    1,
  );
  const s = data.arrangements[0].sessions[0];
  s.helpRequests[0].status = "completed";
  s.helpRequests[0].receipt = "已到场指导";
  data.evidenceTasks[0].status = "cancelled";
  data.supportTasks[0].status = "completed";
  s.stepConfirmation.status = "confirmed";
  const tasks = teacherDashboardTasks(data);
  assert.equal(
    tasks.filter((t) =>
      ["help", "evidence", "support", "step"].includes(t.type),
    ).length,
    0,
  );
  assert.equal(s.helpRequests[0].receipt, "已到场指导");
  assert.equal(data.evidenceTasks[0].id, "evidence");
});

test("补证任务只替代同Session同Step复核，不遮蔽其他待复核步骤", () => {
  const data = fixture();
  const review = teacherDashboardTasks(data).filter((t) => t.type === "review");
  assert.equal(review.length, 1);
  assert.equal(review[0].sourceIds.stepId, "step-1");
  assert.match(review[0].path, /sessionId=s&stepId=step-1$/);
  data.arrangements[0].sessions[0].steps[0].reviewStatus = "已完成";
  assert.equal(
    teacherDashboardTasks(data).filter((t) => t.type === "review").length,
    0,
  );
});

test("同工位历史以Session精确定位，求助和手工确认定位到具体对象", () => {
  const data = fixture();
  const s = structuredClone(data.arrangements[0].sessions[0]);
  s.id = "s-history";
  s.status = "已完成";
  s.resultStatus = "正式成绩";
  s.steps = [];
  data.arrangements[0].sessions.unshift(s);
  const tasks = teacherDashboardTasks(data);
  const help = tasks.find((t) => t.type === "help");
  assert.match(help.path, /sessionId=s#help-help$/);
  const confirmation = tasks.find((t) => t.type === "step");
  assert.match(
    confirmation.path,
    /sessionId=s&stepId=step-1#step-confirmation-confirm$/,
  );
  assert.equal(
    tasks.find((t) => t.type === "evidence").path,
    "/teacher/evidence-tasks/evidence",
  );
  assert.equal(
    tasks.find((t) => t.type === "support").path,
    "/teacher/support-tasks/support",
  );
});

test("孤立任务、已取消源和跨教师记录不能制造待办", () => {
  const data = fixture();
  data.evidenceTasks.push(
    { ...data.evidenceTasks[0], id: "orphan", sessionId: "missing" },
    { ...data.evidenceTasks[0], id: "foreign", teacherId: "t2" },
  );
  data.supportTasks.push({
    ...data.supportTasks[0],
    id: "orphan-support",
    studentId: "other",
  });
  const foreign = structuredClone(data.arrangements[0]);
  foreign.id = "foreign-a";
  foreign.teacherId = "t2";
  data.arrangements.push(foreign);
  assert.equal(teacherDashboardTasks(data).length, 8);
  data.arrangements[0].status = "已取消";
  assert.deepEqual(
    teacherDashboardTasks(data).map((t) => t.type),
    ["publish"],
  );
});

test("安全技术记录保留未处理状态，既有问题可定位且无伪结单动作", () => {
  const data = fixture();
  data.issues = [
    {
      id: "issue",
      arrangementId: "a",
      sessionIds: ["s"],
      title: "边缘节点故障",
      status: "持续中",
      handlingStatus: "处理中",
    },
  ];
  let tasks = teacherDashboardTasks(data).filter((t) =>
    ["safety", "technical"].includes(t.type),
  );
  assert.equal(tasks.length, 3);
  assert.ok(tasks.every((t) => t.readOnly && t.actionLabel === "查看状态"));
  assert.equal(
    tasks.find((t) => t.sourceIds.issueId).path,
    "/teacher/practices/a/stations/w?sessionId=s",
  );
  data.arrangements[0].sessions[0].runtime.technicalIncidents[0].issueId =
    "issue";
  assert.equal(
    teacherDashboardTasks(data).filter((t) => t.type === "technical").length,
    1,
  );
  data.arrangements[0].sessions[0].runtime.technicalIncidents[0].status =
    "resolved";
  assert.equal(
    teacherDashboardTasks(data).filter((t) => t.type === "technical").length,
    1,
  );
});

test("管理员当前安排仅使用实际活动记录，终态会话残留不使安排复活", () => {
  const data = fixture();
  data.arrangements.push(
    {
      id: "entry",
      type: "exam",
      status: "准备中",
      sessions: [{ status: "可入场" }],
    },
    { id: "ended", status: "已结束", sessions: [{ status: "可入场" }] },
    { id: "draft", status: "草稿", sessions: [] },
    { id: "cancelled", status: "已取消", sessions: [] },
  );
  const before = structuredClone(data);
  const current = adminCurrentArrangements(data);
  assert.deepEqual(
    current.map((a) => a.id),
    ["a", "entry"],
  );
  assert.equal(current[1].path, "/admin/exams/entry");
  assert.deepEqual(data, before);
});

test("无数据保留真实空态，没有页面补位对象", () => {
  assert.deepEqual(teacherDashboardTasks(), []);
  assert.deepEqual(
    teacherDashboardTasks({
      arrangements: [],
      evidenceTasks: [{ id: "orphan", teacherId: "t1", status: "pending" }],
    }),
    [],
  );
  assert.deepEqual(adminCurrentArrangements(), []);
});

test("历史正式结果来源仍可办理辅导并进入统一待办，实时流程不因归档显示", () => {
  const data = fixture();
  data.arrangements[0].archivedRecord = true;
  const tasks = teacherDashboardTasks(data);
  assert.ok(tasks.some((t) => t.type === "support"));
  assert.ok(!tasks.some((t) => t.type === "step" || t.type === "help"));
});
