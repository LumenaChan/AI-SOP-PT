import { deriveSopAiConfigurationSummary } from "./aiEntry.js";

export const SCREEN_COLORS = ["#3de4cd", "#4d9fff", "#efbb66", "#a7a9ff"];

function workstationPreview(workstation, devices, { demo, isExam, status }) {
  if (isExam) return { state: "private", message: "考试画面保护", detail: "仅展示工位运行状态" };
  if (["故障", "维护中", "停用"].includes(status)) {
    return { state: "unavailable", message: `${status} · 画面不可用`, detail: "恢复后继续展示" };
  }
  if (demo) {
    const index = Number(workstation.id.replace("ds-w-", "")) || 0;
    const idle = status === "待命";
    return { state: "demo", poster: idle ? "/assets/workstation-empty.png" : index % 2 ? "/assets/workstation-female.png" : "/assets/workstation-male.png", hasAuxiliary: !idle };
  }
  const base = workstation.aiBaseConfig;
  const cameras = workstation.implementation?.cameras || [];
  const primary = base?.primaryCameraId
    ? devices.find((d) => d.id === base.primaryCameraId)
    : cameras.find((c) => c.id === workstation.implementation?.primaryCameraId);
  const auxiliary = base?.fallbackCameraId
    ? devices.find((d) => d.id === base.fallbackCameraId)
    : cameras.find((c) => c.id === workstation.implementation?.fallbackCameraId);
  const online = (camera) => camera?.status === "在线" && !["不可用", "异常", "离线"].includes(camera.streamStatus);
  return { state: "unavailable", message: !primary ? "主视角未配置" : online(primary) ? "视频预览待接入" : "主视角离线", detail: "摄像头画面尚未接入原型", hasAuxiliary: Boolean(auxiliary), auxiliaryMessage: online(auxiliary) ? "辅助预览待接入" : "辅助视角离线" };
}

const schoolDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});
export const schoolDay = (value = new Date()) => schoolDayFormatter.format(value);

function timestamp(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null;
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized.length === 10 ? `${normalized}T00:00:00+08:00` : /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
    ? normalized : `${normalized}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sessionStartedAt(session, arrangement) {
  if (["未参加", "已取消"].includes(session.resultStatus) || ["已取消", "可入场", "未开始", "待开始"].includes(session.status)) return null;
  return timestamp(session.startedAt || session.runtime?.evaluationClock?.startedAt || session.recording?.startedAt)
    || (Number(session.runtime?.evaluationClock?.elapsedSeconds) > 0 ? timestamp(arrangement.startedAt) : null);
}

const finiteScore = (value) => value !== "" && value != null && Number.isFinite(Number(value));
const percent = (value, total) => total ? Math.round(value / total * 100) : null;

// The public screen consumes aggregates and anonymous workstation records only.
// Scheduled dates are never substituted for actual participation dates.
export function buildDataScreenSnapshot(data = {}, { now = new Date(), days = 30, teacherId = null } = {}) {
  const allArrangements = [...new Map((data.arrangements || [])
    .filter((a) => a.id && !a.archivedRecord && a.status !== "已取消" && (!teacherId || a.teacherId === teacherId))
    .map((a) => [a.id, a])).values()];
  const sopsById = new Map((data.sops || []).map((s) => [s.id, s]));
  const studentsById = new Map((data.students || []).map((s) => [s.id, s]));
  const start = new Date(`${schoolDay(now)}T00:00:00+08:00`);
  start.setTime(start.getTime() - (days - 1) * 86400000);
  const seen = new Set();
  const sessions = allArrangements.flatMap((arrangement) => (arrangement.sessions || []).flatMap((session) => {
    if (!session.id || seen.has(session.id)) return [];
    const date = sessionStartedAt(session, arrangement);
    if (!date || date > now) return [];
    seen.add(session.id);
    return [{ session, arrangement, date, sop: arrangement.snapshot?.sopSnapshot || sopsById.get(arrangement.sopId) }];
  }));
  const period = sessions.filter((s) => s.date >= start);
  const published = period.filter(({ session, arrangement }) => arrangement.type === "exam"
    && arrangement.status === "已发布" && session.resultStatus === "已发布" && finiteScore(session.score)
    && Number(session.score) >= 0 && Number(session.score) <= 100);
  const scoreBuckets = [
    { label: "<60", min: 0, max: 60 }, { label: "60–69", min: 60, max: 70 },
    { label: "70–79", min: 70, max: 80 }, { label: "80–89", min: 80, max: 90 },
    { label: "90–100", min: 90, max: 101 },
  ].map((b) => ({ ...b, count: published.filter(({ session }) => Number(session.score) >= b.min && Number(session.score) < b.max).length }));
  const uniqueStudents = new Set(sessions.map(({ session }) => session.studentId).filter(Boolean));
  const classIds = new Set([...uniqueStudents].map((id) => studentsById.get(id)?.classId).filter(Boolean));
  const relevantSopIds = teacherId ? new Set(allArrangements.map((a) => a.sopId)) : null;
  const sopVersions = (data.sops || [])
    .filter((s) => s.status === "已发布" && (!relevantSopIds || relevantSopIds.has(s.id)))
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  const latestSops = new Map();
  for (const sop of sopVersions) {
    const key = sop.familyId || sop.id;
    if (!latestSops.has(key)) latestSops.set(key, sop);
  }
  const publishedSops = [...latestSops.values()];
  const programs = new Map();
  for (const record of sessions) {
    const name = record.sop?.major || "未分类专业";
    if (!programs.has(name)) programs.set(name, { name, count: 0, courses: new Set(), students: new Set() });
    const group = programs.get(name);
    group.count += 1; group.courses.add(record.sop?.course || record.sop?.name || "未分类课程");
    if (record.session.studentId) group.students.add(record.session.studentId);
  }
  const participationByDay = new Map();
  for (const record of period) {
    const day = schoolDay(record.date);
    participationByDay.set(day, (participationByDay.get(day) || 0) + 1);
  }
  const trend = Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * 86400000);
    const day = schoolDay(date);
    return { day, label: `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`, count: participationByDay.get(day) || 0 };
  });
  const modes = [
    { key: "visual_auto", name: "自动评价", count: 0, color: SCREEN_COLORS[0] },
    { key: "visual_assist_default_pass", name: "辅助评价", count: 0, color: SCREEN_COLORS[1] },
    { key: "default_pass_manual_deduction", name: "教师评价", count: 0, color: SCREEN_COLORS[2] },
    { key: "unconfigured", name: "未配置", count: 0, color: "#61738c" },
  ];
  const configurations = (data.aiCapabilityConfigs || []).filter((c) => publishedSops.some((s) => s.id === c.sopId));
  const summaries = data.dataScreenDemo ? [] : publishedSops.map((sop) => deriveSopAiConfigurationSummary({
    sop, config: configurations.find((c) => c.sopId === sop.id),
    workstationConfigs: data.sopWorkstationAiConfigs, workstations: data.workstations,
    devices: data.devices, capabilities: data.aiCapabilities,
  }));
  for (const sop of publishedSops) {
    const config = configurations.find((c) => c.sopId === sop.id);
    for (const step of sop.steps || []) {
      const mode = config?.stepConfigs?.find((s) => s.stepId === step.id)?.actualEvaluationMode;
      (modes.find((m) => m.key === mode) || modes[3]).count += 1;
    }
  }
  const relatedWorkstations = teacherId ? new Set(allArrangements.flatMap((a) => a.workstationIds || [])) : null;
  const active = allArrangements.filter((a) => ["进行中", "已暂停"].includes(a.status));
  const workstations = (data.workstations || []).filter((w) => !relatedWorkstations || relatedWorkstations.has(w.id)).map((w) => {
    const arrangement = active.find((a) => (a.sessions || []).some((s) => s.workstationId === w.id && ["进行中", "已暂停", "故障", "可入场"].includes(s.status)));
    const session = arrangement?.sessions?.find((s) => s.workstationId === w.id && ["进行中", "已暂停", "故障", "可入场"].includes(s.status));
    const isExam = arrangement?.type === "exam";
    const status = ["故障", "维护中", "停用"].includes(w.status) ? w.status
      : session?.status === "故障" ? "故障" : arrangement?.status === "已暂停" || session?.status === "已暂停" ? "已暂停" : session?.status === "进行中" ? "实训中" : "待命";
    const steps = isExam ? [] : (session?.steps || []).map((s) => ({ id: s.id, name: s.name,
      complete: ["已完成", "完成", "通过", "pass"].includes(s.state) || s.executionState === "completed" || ["passed", "complete"].includes(s.completionResult),
      current: s.id === session.currentStepId,
      evidence: s.evidenceStatus === "已归档" || s.evidenceStatus === "完整",
    }));
    const configRelations = (data.sopWorkstationAiConfigs || []).filter((r) => r.workstationId === w.id);
    let ready = false;
    if (data.dataScreenDemo) ready = configRelations.some((r) => r.validationStatus === "passed" && r.enableStatus === "enabled");
    else ready = summaries.some((summary) => summary.runtimeStates?.some((r) => r.relation.workstationId === w.id && r.runtime?.runnable));
    const devices = (data.devices || []).filter((d) => d.workstationId === w.id);
    const healthy = !["故障", "维护中", "停用"].includes(status)
      && (data.dataScreenDemo || (devices.length > 0 && devices.every((d) => d.status === "在线")));
    return { id: w.id, name: w.name, code: w.code, location: w.location, status, healthy,
      project: arrangement?.name || w.supportedProject || "待命工位", isExam, steps, aiReady: ready,
      preview: workstationPreview(w, devices, { demo: Boolean(data.dataScreenDemo), isExam, status }),
      currentStep: steps.find((s) => s.current)?.name || (isExam ? "考试进行中 · 过程保密" : "等待实训开始"),
    };
  });
  const recording = ["完整", "部分缺失", "不可用"].map((name, i) => ({ name, color: [SCREEN_COLORS[0], SCREEN_COLORS[2], "#ff7c8c"][i],
    count: period.filter(({ session }) => session.recording?.status === name).length }));
  const recordingTotal = recording.reduce((n, item) => n + item.count, 0);
  const heat = publishedSops.map((sop) => ({ id: sop.id, name: sop.course || sop.name, cells: (sop.steps || []).slice(0, 8).map((step) => {
    const evaluations = published.filter((r) => r.arrangement.sopId === sop.id).flatMap(({ session }) => (session.steps || []).filter((s) => s.id === step.id && finiteScore(s.maxScore) && Number(s.maxScore) > 0 && finiteScore(s.effectiveScore ?? s.score)
      && Number(s.effectiveScore ?? s.score) >= 0 && Number(s.effectiveScore ?? s.score) <= Number(s.maxScore)));
    const deductions = evaluations.filter((s) => Number(s.effectiveScore ?? s.score) < Number(s.maxScore)).length;
    return { id: step.id, name: step.name, rate: percent(deductions, evaluations.length), samples: evaluations.length };
  }) }));
  const allowedIds = new Set(allArrangements.map((a) => a.id));
  const events = (data.issues || []).filter((i) => !teacherId || allowedIds.has(i.arrangementId)).map((i) => ({
    id: i.id, title: i.title || i.type || "系统异常", status: i.status === "已关闭" ? "已闭环" : (i.handlingStatus || "待处理"),
    time: i.occurredAt, kind: "系统异常", closed: i.status === "已关闭",
  }));
  for (const { session, arrangement } of period) {
    for (const c of session.runtime?.safetyCandidates || []) {
      if (c.status === "confirmed" || c.confirmed === true) {
        // Resolving an AI candidate confirms the violation; it does not close the safety incident.
        const closed = Boolean(c.closedAt || c.recoveryConfirmedAt);
        events.push({ id: `${session.id}-${c.id}`, title: c.title || "已确认安全事件", kind: "安全事件", status: closed ? "已闭环" : "已确认", closed, time: c.confirmedAt || c.resolvedAt || c.createdAt || arrangement.startedAt });
      }
    }
  }
  events.sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
  const referencedCapabilityIds = new Set(configurations.flatMap((c) => (c.judgementItems || []).flatMap((j) => [...(j.conditions || []), ...(j.capabilityBindings || [])].map((b) => b.capabilityId))));
  const publishedCapabilities = (data.aiCapabilities || []).filter((c) => c.status === "已发布" && (!teacherId || referencedCapabilityIds.has(c.id)));
  const relevantRelations = (data.sopWorkstationAiConfigs || []).filter((r) => configurations.some((c) => c.id === r.sopAiConfigId));
  const validated = relevantRelations.filter((r) => r.validationStatus === "passed").length;
  const enabled = data.dataScreenDemo ? relevantRelations.filter((r) => r.validationStatus === "passed" && r.enableStatus === "enabled").length
    : summaries.reduce((n, summary) => n + (summary.runnableWorkstationCount || 0), 0);
  return {
    metrics: [classIds.size, uniqueStudents.size, publishedSops.length, sessions.length,
      allArrangements.filter((a) => a.type === "practice" && a.status === "已结束").length,
      allArrangements.filter((a) => a.type === "exam" && a.status === "已发布").length],
    programs: [...programs.values()].sort((a, b) => b.count - a.count).map((p) => ({ name: p.name, count: p.count, courses: p.courses.size, students: p.students.size })),
    trend, periodParticipants: period.length, publishedCount: published.length, scoreBuckets,
    averageScore: published.length ? (published.reduce((n, r) => n + Number(r.session.score), 0) / published.length).toFixed(1) : null,
    modes, modeTotal: modes.reduce((n, m) => n + m.count, 0), workstations,
    running: workstations.filter((w) => w.status === "实训中").length,
    healthy: workstations.filter((w) => w.healthy).length,
    aiReady: workstations.filter((w) => w.aiReady).length,
    recording, recordingTotal, recordingRate: percent(recording[0].count, recordingTotal), heat, events,
    construction: [publishedSops.length, publishedCapabilities.length, validated, enabled],
    schoolName: data.systemSettings?.current?.schoolName || data.schoolName || "智慧实训 · 数字校园",
  };
}

// A separate coherent demonstration dataset. It never enters the application store.
export function createDataScreenDemo(now = new Date()) {
  const courses = [
    ["新能源汽车技术", "高压安全操作"], ["工业机器人技术", "机器人夹具更换"],
    ["机械制造技术", "精密零件装配"], ["电气自动化技术", "电气安装与接线"],
    ["新能源汽车技术", "动力电池检修"], ["工业机器人技术", "机器人安全示教"],
  ];
  const stepNames = ["安全防护检查", "作业区域确认", "工具规范使用", "核心操作实施", "完成状态检查", "复位与场地恢复"];
  const sops = courses.map(([major, course], i) => ({ id: `ds-sop-${i}`, familyId: `ds-family-${i}`, major, course,
    name: course, status: "已发布", publishedAt: `${schoolDay(now)}T00:00:00`,
    steps: stepNames.map((name, s) => ({ id: `Step ${String(s + 1).padStart(2, "0")}`, name })) }));
  const classes = Array.from({ length: 18 }, (_, i) => ({ id: `ds-class-${i}`, name: `${courses[i % 6][0]}${i + 1}班`, major: courses[i % 6][0] }));
  const students = classes.flatMap((c, i) => Array.from({ length: 24 }, (_, j) => ({ id: `ds-student-${i}-${j}`, classId: c.id })));
  const configurations = sops.map((sop) => ({ id: `ds-config-${sop.id}`, sopId: sop.id, status: "enabled",
    stepConfigs: sop.steps.map((s, i) => ({ stepId: s.id, actualEvaluationMode: i < 4 ? "visual_auto" : i === 4 ? "visual_assist_default_pass" : "default_pass_manual_deduction" })) }));
  const workstations = Array.from({ length: 18 }, (_, i) => ({ id: `ds-w-${i}`, name: `${String(i + 1).padStart(2, "0")}号工位`, code: `WS-${String(i + 1).padStart(2, "0")}`, location: `${i < 9 ? "A" : "B"}区`, supportedProject: courses[Math.floor(i / 3)][1], status: i === 16 ? "维护中" : i === 17 ? "故障" : "启用" }));
  const relations = workstations.map((w, i) => ({ id: `ds-rel-${i}`, workstationId: w.id, sopAiConfigId: configurations[Math.floor(i / 3)].id,
    validationStatus: i < 16 ? "passed" : "pending_revalidation", enableStatus: i < 16 ? "enabled" : "disabled" }));
  const arrangements = [];
  for (let day = 30; day > 0; day--) {
    const date = schoolDay(new Date(now.getTime() - day * 86400000));
    for (let course = 0; course < 6; course++) {
      const classIndex = (day % 3) * 6 + course;
      const type = (day + course) % 3 === 0 ? "exam" : "practice";
      const id = `ds-history-${day}-${course}`;
      arrangements.push({ id, teacherId: "t1", sopId: sops[course].id, type, name: courses[course][1], status: type === "exam" ? "已发布" : "已结束", startedAt: `${date}T09:00:00`,
        sessions: Array.from({ length: 16 + (day * 5 + course * 3) % 9 }, (_, j) => {
          const score = 57 + ((day * 7 + course * 11 + j * 3) % 44);
          const complete = (day * 24 + course * 6 + j) % 23 !== 0;
          let remainingDeduction = 100 - score;
          const maxScores = [15, 15, 20, 20, 15, 15];
          const steps = sops[course].steps.map((s, k) => {
            const remainingCapacity = maxScores.slice(k + 1).reduce((n, value) => n + value, 0);
            const deduction = Math.max(remainingDeduction - remainingCapacity,
              Math.min(maxScores[k], remainingDeduction, ((day + j * 2 + course + k * 3) % 4) * 5));
            remainingDeduction -= deduction;
            return { ...s, maxScore: maxScores[k], effectiveScore: maxScores[k] - deduction };
          });
          return { id: `${id}-${j}`, studentId: `ds-student-${classIndex}-${j}`, startedAt: `${date}T09:00:00`, status: "已复位", score,
            resultStatus: type === "exam" ? "已发布" : "正式成绩",
            recording: { status: complete ? "完整" : j % 5 === 0 ? "不可用" : "部分缺失", startedAt: `${date}T09:00:00` },
            steps,
          };
        }),
      });
    }
  }
  courses.forEach(([, course], i) => {
    const exam = i === 4;
    arrangements.push({ id: `ds-live-${i}`, teacherId: "t1", type: exam ? "exam" : "practice", sopId: sops[i].id, name: course, status: "进行中",
      workstationIds: workstations.slice(i * 3, i * 3 + 3).map((w) => w.id),
      sessions: workstations.slice(i * 3, i * 3 + 3).filter((_, j) => i * 3 + j < 16).map((w, j) => ({ id: `ds-live-session-${i}-${j}`, studentId: `ds-student-${i}-${j}`, workstationId: w.id,
        startedAt: now.toISOString(), status: i * 3 + j < 12 ? "进行中" : "已暂停", currentStepId: "Step 04",
        steps: sops[i].steps.map((s, k) => ({ ...s, state: k < 3 ? "已完成" : "待开始", evidenceStatus: k < 3 ? "已归档" : "待采集" })),
        recording: { status: "完整", startedAt: now.toISOString() },
      })),
    });
  });
  const issues = [
    { id: "ds-issue-1", title: "B区工位设备巡检完成", status: "已关闭", handlingStatus: "已关闭", occurredAt: new Date(now.getTime() - 8 * 60000).toISOString() },
    { id: "ds-issue-2", title: "17号工位计划维护", status: "持续中", handlingStatus: "处理中", occurredAt: new Date(now.getTime() - 22 * 60000).toISOString() },
    { id: "ds-issue-3", title: "辅助视角录像片段恢复", status: "已关闭", handlingStatus: "已关闭", occurredAt: new Date(now.getTime() - 38 * 60000).toISOString() },
    { id: "ds-issue-4", title: "18号工位边缘服务异常", status: "持续中", handlingStatus: "待处理", occurredAt: new Date(now.getTime() - 53 * 60000).toISOString() },
  ];
  const safetySession = arrangements.find((a) => a.id === "ds-live-0").sessions[0];
  safetySession.runtime = { safetyCandidates: [{ id: "ds-safety-1", title: "作业区域防护已确认恢复", status: "confirmed", confirmedAt: new Date(now.getTime() - 16 * 60000).toISOString(), closedAt: now.toISOString() }] };
  return { dataScreenDemo: true, classes, students, sops, arrangements, workstations, issues,
    aiCapabilityConfigs: configurations, sopWorkstationAiConfigs: relations,
    aiCapabilities: Array.from({ length: 12 }, (_, i) => ({ id: `ds-cap-${i}`, status: "已发布" })),
  };
}
