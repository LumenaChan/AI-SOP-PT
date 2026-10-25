import { displayDateTime } from "./dateTimeRules.js";
import { sessionReportPath } from "./arrangementPreparationRules.js";
import { arrangementDestination } from "./domainRules.js";
import {
  statisticsCsv,
  withStatisticsReturn,
} from "./statisticsCommonRules.js";

export function arrangementAttendancePath(arrangement) {
  return `/teacher/${arrangement.type === "exam" ? "exams" : "practices"}/${encodeURIComponent(arrangement.id)}/${arrangementDestination(arrangement)}?attendance=1`;
}

export function legacyAttendanceTarget(data, params, source, teacherId = "t1") {
  const id = params.get("attendance");
  const arrangement = (data.arrangements || []).find(
    (a) => a.id === id && a.teacherId === teacherId,
  );
  if (!arrangement) return "";
  const back = new URLSearchParams(params);
  for (const key of ["attendance", "apage", "asize", "aq", "courseId"])
    back.delete(key);
  back.set("source", source);
  return withStatisticsReturn(
    arrangementAttendancePath(arrangement),
    `/teacher/statistics?${back}`,
    source,
  );
}

export function validAttendanceReturn(path) {
  if (typeof path !== "string" || path.length > 12000 || !path.startsWith("/"))
    return "";
  try {
    const u = new URL(path, "http://prototype.local");
    if (
      u.origin !== "http://prototype.local" ||
      u.searchParams.get("attendance") !== "1" ||
      !/^\/(?:teacher\/(?:practices|exams)\/[^/]+\/(?:prep|live|results|edit)|admin\/(?:practices|exams)\/[^/]+(?:\/results)?)$/.test(
        u.pathname,
      )
    )
      return "";
    u.searchParams.delete("attendanceReturn");
    u.searchParams.delete("attendanceSource");
    return u.pathname + u.search;
  } catch {
    return "";
  }
}

export function attendanceReturnTarget(params, source, pathname) {
  if (params.get("attendanceSource") !== source) return "";
  const back = validAttendanceReturn(params.get("attendanceReturn"));
  if (!back) return "";
  const parts = pathname.split("/"),
    parent = new URL(back, "http://prototype.local").pathname.split("/");
  return parts.slice(1, 4).join("/") === parent.slice(1, 4).join("/")
    ? back
    : "";
}

export function withAttendanceReturn(path, back, source) {
  back = validAttendanceReturn(back);
  if (
    !back ||
    !/^\/(?:teacher|admin)\/(?:practices|exams)\/[^/]+\/(?:students|stations)\/[^/?#]+(?:[?#]|$)/.test(
      path,
    )
  )
    return path;
  const u = new URL(path, "http://prototype.local");
  u.searchParams.set("attendanceReturn", back);
  u.searchParams.set("attendanceSource", source);
  return u.pathname + u.search;
}

export function arrangementAttendanceCsv(model, rows, source, query = "") {
  return statisticsCsv(
    [
      { key: "studentName", label: "学生" },
      { key: "studentNumber", label: "学号" },
      { key: "className", label: "班级" },
      { key: "workstationName", label: "工位" },
      { key: "status", label: "参加状态" },
      { key: "resultStatus", label: "结果状态" },
      {
        key: "recordCount",
        label: "关联记录数",
        value: (r) => r.sessions.length,
      },
    ],
    rows,
    {
      安排: model.arrangement.name,
      安排状态: model.arrangement.status,
      数据源: source === "cpd" ? "CPD工作数据" : "浏览器工作数据",
      名单范围:
        "本安排完整名单；不受统计班级、日期或有效成绩范围裁剪；导出当前搜索结果的全部行",
      搜索条件: query.trim() || "无",
      人数口径:
        model.reliable && model.arrangement.status !== "已取消"
          ? `应参加${model.counts.expected}人`
          : `原安排学生${model.counts.listed}人，不推断可靠应参加人数`,
    },
  );
}
export function arrangementAttendance(data, arrangementId, teacherId = "t1") {
  const a = (data.arrangements || []).find(
    (a) =>
      a.id === arrangementId &&
      (teacherId === null || a.teacherId === teacherId),
  );
  if (!a) return null;
  const assigned = Array.isArray(a.stationAssignments)
      ? a.stationAssignments
      : (a.workstationIds || []).map((workstationId) => {
          const ss = (a.sessions || []).filter(
            (s) => s.workstationId === workstationId,
          );
          return {
            workstationId,
            studentId: ss.length === 1 ? ss[0].studentId : "",
          };
        }),
    // The declared participant list is the denominator. Stray assignments and
    // sessions are review evidence, never extra expected students.
    ids = [
      ...new Set(
        Array.isArray(a.studentIds)
          ? a.studentIds
          : assigned.map((p) => p.studentId).filter(Boolean),
      ),
    ];
  const notStarted = ["草稿", "待开始", "准备中"].includes(a.status);
  const rows = ids.map((id) => {
    const sessions = (a.sessions || []).filter((s) => s.studentId === id),
      pair = assigned.find((p) => p.studentId === id),
      s = sessions.length === 1 ? sessions[0] : null;
    const status =
      sessions.length > 1
        ? "历史会话待选择"
        : a.status === "已取消" && !s?.startedAt && !s?.submittedAt
          ? "已取消"
          : !s
            ? notStarted
              ? "尚未开始"
              : "记录待核对"
            : s.resultStatus === "未参加"
              ? "明确未参加"
              : s.startedAt ||
                  s.submittedAt ||
                  ["进行中", "已暂停", "已完成", "待复位", "已复位"].includes(
                    s.status,
                  )
                ? "已参加"
                : "尚未开始";
    const student = (data.students || []).find((s) => s.id === id);
    const snapshot = s?.studentSnapshot?.id === id ? s.studentSnapshot : null;
    const workstationId = pair?.workstationId || s?.workstationId || "";
    const classId = snapshot?.classId || student?.classId;
    return {
      id,
      studentId: id,
      studentName: snapshot?.name || student?.name || "学生信息缺失",
      studentNumber:
        snapshot?.number ||
        student?.no ||
        student?.number ||
        student?.studentNo ||
        "未记录",
      className:
        data.classes?.find((c) => c.id === classId)?.name || "班级未记录",
      workstationId,
      workstationName:
        data.workstations?.find((w) => w.id === workstationId)?.name ||
        (workstationId ? "工位信息待核对" : "未分配工位"),
      sessions,
      status,
      sessionId: s?.id || "",
      arrangementId: a.id,
      arrangementName: a.name,
      resultStatus: s?.resultStatus || "未形成明确结果",
      reportPath: s
        ? ["进行中", "已暂停", "故障", "待开始", "可入场"].includes(s.status)
          ? `/teacher/${a.type === "exam" ? "exams" : "practices"}/${a.id}/stations/${s.workstationId}?sessionId=${encodeURIComponent(s.id)}`
          : sessionReportPath(a, s)
        : "",
      recordOptions: sessions.map((entry, index) => ({
        id: entry.id,
        label: `记录${index + 1} · ${entry.status || "状态未记录"} · ${displayDateTime(entry.startedAt || entry.endedAt || "时间未记录")}`,
        path: ["进行中", "已暂停", "故障", "待开始", "可入场"].includes(
          entry.status,
        )
          ? `/teacher/${a.type === "exam" ? "exams" : "practices"}/${a.id}/stations/${entry.workstationId}?sessionId=${encodeURIComponent(entry.id)}`
          : sessionReportPath(a, entry),
      })),
    };
  });
  return {
    arrangement: a,
    rows,
    extras: (a.sessions || []).filter((s) => !ids.includes(s.studentId)),
    extraAssignments: assigned.filter(
      (p) => p.studentId && !ids.includes(p.studentId),
    ),
    counts: {
      expected: a.status === "已取消" ? 0 : ids.length,
      listed: ids.length,
      participated: rows.filter((r) => r.status === "已参加").length,
      absent: rows.filter((r) => r.status === "明确未参加").length,
      waiting: rows.filter((r) => r.status === "尚未开始").length,
      pending: rows.filter((r) =>
        ["记录待核对", "历史会话待选择"].includes(r.status),
      ).length,
      cancelled: rows.filter((r) => r.status === "已取消").length,
    },
    reliable:
      ids.length > 0 &&
      Array.isArray(a.studentIds) &&
      new Set(a.studentIds).size === a.studentIds.length &&
      assigned.length === ids.length &&
      assigned.every(
        (p) =>
          p.studentId &&
          p.workstationId &&
          ids.includes(p.studentId) &&
          (a.workstationIds || []).includes(p.workstationId),
      ) &&
      new Set(assigned.map((p) => p.studentId)).size === ids.length &&
      new Set(assigned.map((p) => p.workstationId)).size === assigned.length,
  };
}
