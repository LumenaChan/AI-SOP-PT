import { rememberedStatisticsPath } from "./statisticsFilterMemory.js";
import { useNavigate, useLocation } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import {
  attendanceReturnTarget,
  withAttendanceReturn,
} from "./arrangementAttendanceRules.js";
import {
  validStatisticsReturn,
  withStatisticsReturn,
  statisticsBusinessPath,
} from "./statisticsCommonRules.js";
export function useStatisticsNavigate() {
  const nav = useNavigate(),
    loc = useLocation(),
    { dataSource, teacherId } = usePrototypeData();
  return (path, options) => {
    if (typeof path === "string")
      path = rememberedStatisticsPath(path, dataSource, teacherId);
    const params = new URLSearchParams(loc.search),
      back = validStatisticsReturn(params.get("statisticsReturn"));
    const destination =
      typeof path === "string" && params.get("statisticsSource") === dataSource
        ? withStatisticsReturn(path, back, dataSource)
        : path;
    const attendanceBack = attendanceReturnTarget(
      params,
      dataSource,
      loc.pathname,
    );
    return nav(
      typeof destination === "string" && attendanceBack
        ? withAttendanceReturn(destination, attendanceBack, dataSource)
        : destination,
      options,
    );
  };
}
export function StatisticsReturnLink() {
  const loc = useLocation(),
    nav = useNavigate(),
    { dataSource } = usePrototypeData(),
    params = new URLSearchParams(loc.search);
  const back = validStatisticsReturn(params.get("statisticsReturn"));
  if (
    attendanceReturnTarget(params, dataSource, loc.pathname) ||
    !back ||
    params.get("statisticsSource") !== dataSource ||
    !statisticsBusinessPath(loc.pathname)
  )
    return null;
  return (
    <div className="statistics-return">
      <button className="button button--default" onClick={() => nav(back)}>
        {back.startsWith("/teacher/data-statistics")
          ? "← 返回数据统计"
          : "← 返回教学改进"}
      </button>
      <span>办理后返回原筛选范围，统计按最新记录更新。</span>
    </div>
  );
}
