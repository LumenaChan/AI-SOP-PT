import {
  createOpenedAiSession,
  deriveAiRuntimeGate,
} from "./aiRuntimeRules.js";
import { createSessionStepsFromSop } from "./domainRules.js";
import { finalizeSubmittedStep } from "./visualEvaluationRules.js";

const DEMO_PACKAGE = "dashboard-schedule-20261015";
const DEMO_DAY = "2026-10-15";
function minutesLater(time, offset) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + offset;
  return (
    String(Math.floor(total / 60)).padStart(2, "0") +
    ":" +
    String(total % 60).padStart(2, "0")
  );
}

// The prototype's “today” schedule is a stable showcase, independent of the wall clock.
export function teacherPrototypeSchedule(arrangements = []) {
  const priority = (item) =>
    ["进行中", "已暂停"].includes(item.status)
      ? 0
      : ["待开始", "准备中"].includes(item.status)
        ? 1
        : 2;
  const time = (item) => String(item.scheduleStart || "").slice(11) || "99:99";
  return arrangements
    .filter(
      (item) =>
        !item.archivedRecord && !["草稿", "已取消"].includes(item.status),
    )
    .sort(
      (left, right) =>
        priority(left) - priority(right) ||
        time(left).localeCompare(time(right)) ||
        left.id.localeCompare(right.id),
    );
}

// Append genuine, navigable prototype records once; never move an existing lesson to today.
export function migrateDashboardDemoData(data) {
  data.enhancementMigrations ||= [];
  if (data.enhancementMigrations.includes(DEMO_PACKAGE)) return data;
  const sop = (data.sops || []).find((s) => s.id === "sop-demo-bench-20261015");
  const bench = (data.workstations || []).find(
    (w) => w.id === "ws-demo-20261015",
  );
  const student = (data.students || []).find(
    (s) => s.id === "student-demo-20261015",
  );
  if (!sop || !bench || !student) return data;
  const examples = [
    {
      key: "protection",
      time: "08:30",
      name: "绝缘防护与工具检查复盘",
      type: "practice",
      status: "已结束",
      workstationId: "w1",
    },
    {
      key: "meter-exam",
      time: "09:15",
      name: "万用表操作随堂考核",
      type: "exam",
      status: "待发布",
      workstationId: "w2",
    },
    {
      key: "bench-afternoon",
      time: "13:30",
      name: "手套与万用表规范操作练习",
      type: "practice",
      status: "待开始",
    },
    {
      key: "bench-exam",
      time: "14:30",
      name: "固定工作台操作考核",
      type: "exam",
      status: "待开始",
    },
    {
      key: "variation",
      time: "16:00",
      name: "合法变化与遮挡处理练习",
      type: "practice",
      status: "待开始",
    },
  ];
  data.arrangements ||= [];
  for (const example of examples) {
    const id = `${example.type}-demo-${example.key}-20261015`;
    if (data.arrangements.some((a) => a.id === id)) continue;
    const workstation =
      data.workstations.find((w) => w.id === example.workstationId) || bench;
    const scheduleStart = `${DEMO_DAY}T${example.time}:00`;
    const when = scheduleStart.replace("T", " ");
    const finished = example.status !== "待开始";
    const endedAt = `${DEMO_DAY} ${minutesLater(example.time, 1)}:00`;
    const sessions = [];
    if (finished) {
      const gate = deriveAiRuntimeGate({
        ...data,
        sopId: sop.id,
        workstationId: workstation.id,
      });
      const session = createOpenedAiSession({
        id: `session-${id}`,
        workstationId: workstation.id,
        studentId: student.id,
        gate,
        lockedAt: when,
        steps: createSessionStepsFromSop(sop.steps),
        recording: {
          status: "不可用",
          note: "演示复盘记录，无真实学生录像",
          fullVideoAvailable: false,
        },
      });
      session.steps = session.steps.map((step) => ({
        ...finalizeSubmittedStep(step, endedAt),
        state: "pass",
        duration: "00:30",
        resultSource: "prototype_demo",
      }));
      Object.assign(session, {
        status: "已完成",
        currentStepId: "",
        score: session.steps.reduce(
          (sum, step) => sum + Number(step.score || 0),
          0,
        ),
        elapsed: "00:01:00",
        resultStatus: "正式成绩",
        startedAt: when,
        endedAt,
        resultSource: "prototype_demo",
        demoPackageId: DEMO_PACKAGE,
        events: [
          {
            id: `event-${id}`,
            time: example.time,
            createdAt: when,
            level: "blue",
            title: "演示复盘记录",
            detail:
              "用于体验结果、报告与锁定相机配置；分数按缺证保分规则展示，不代表真实AI识别。",
          },
        ],
      });
      session.runtime.evaluationClock = {
        ...session.runtime.evaluationClock,
        status: "stopped",
        elapsedSeconds: 60,
        wallSeconds: 60,
      };
      sessions.push(session);
    }
    data.arrangements.push({
      id,
      type: example.type,
      name: `【演示】${example.name}`,
      sopId: sop.id,
      status: example.status,
      teacherId: data.teachers?.[0]?.id || "t1",
      studentIds: [student.id],
      workstationIds: [workstation.id],
      openWorkstationIds: finished ? [workstation.id] : [],
      scheduleStart,
      ...(finished ? { startedAt: when, endedAt } : {}),
      updatedAt: when,
      paused: false,
      snapshot: { sopId: sop.id, sopSnapshot: structuredClone(sop) },
      sessions,
      demoPackageId: DEMO_PACKAGE,
      ...(example.type === "exam"
        ? {
            examDurationMinutes: 30,
            entryEnd: `${DEMO_DAY}T${minutesLater(example.time, 15)}:00`,
          }
        : {}),
    });
  }
  data.enhancementMigrations.push(DEMO_PACKAGE);
  return data;
}
