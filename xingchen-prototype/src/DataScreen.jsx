import { useEffect, useMemo, useRef, useState } from "react";
import { DesktopOutlined, FullscreenOutlined, FullscreenExitOutlined, PauseOutlined, PlayCircleOutlined, SettingOutlined, SafetyCertificateOutlined, VideoCameraOutlined, ApartmentOutlined, BookOutlined, TeamOutlined, ExperimentOutlined, FileDoneOutlined, CheckCircleOutlined, CloseOutlined } from "@ant-design/icons";
import { usePrototypeData } from "./prototypeData.jsx";
import { buildDataScreenSnapshot, createDataScreenDemo, schoolDay } from "./dataScreenRules.js";
import "./data-screen.css";

const number = (value) => Number(value || 0).toLocaleString("zh-CN");
const time = (value) => {
  if (!value) return "—";
  const normalized = String(value).replace(" ", "T");
  const date = value instanceof Date ? value : new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
};
const tone = (status) => status === "实训中" ? "mint" : ["故障", "停用"].includes(status) ? "red" : ["已暂停", "维护中"].includes(status) ? "gold" : "blue";
const colors = { mint: "#3de4cd", red: "#ff7c8c", gold: "#efbb66", blue: "#4d9fff" };
const heatStops = [[18, 45, 62], [27, 60, 80], [40, 75, 94], [53, 90, 108], [65, 104, 121]];
const heatGradient = `linear-gradient(90deg, ${heatStops.map((rgb, i) => `rgb(${rgb.join(",")}) ${i * 25}%`).join(", ")})`;
const heatColor = (rate) => {
  if (rate == null || !Number.isFinite(Number(rate))) return "#132233";
  const position = Math.max(0, Math.min(100, Number(rate))) / 25;
  const index = Math.min(heatStops.length - 2, Math.floor(position));
  const rgb = heatStops[index].map((value, channel) => Math.round(value + (heatStops[index + 1][channel] - value) * (position - index)));
  return `rgb(${rgb.join(",")})`;
};
const empty = <div className="ds-empty">尚无有效数据</div>;

function Panel({ title, label, children, className = "", meta }) {
  return <section className={`ds-panel ${className}`}>
    <header><h2><i />{title}</h2><span>{meta || label}</span></header>
    <div className="ds-panel-body">{children}</div>
  </section>;
}

function Trend({ points, total }) {
  const width = 320, height = 64;
  const maximum = Math.max(1, ...points.map((p) => p.count));
  const coords = points.map((p, i) => [10 + i * (width - 20) / Math.max(1, points.length - 1), height - 10 - p.count / maximum * 40]);
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return <><div className="ds-chart-stat"><strong>{number(total)}<small>参与人次</small></strong></div>
    <svg viewBox="0 0 320 84" className="ds-trend" role="img" aria-label={`实训参与趋势，合计${total}人次`}>
      <defs><linearGradient id="ds-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3de4cd" stopOpacity=".38" /><stop offset="1" stopColor="#3de4cd" stopOpacity="0" /></linearGradient></defs>
      {[14, 34, 54].map((y) => <line key={y} x1="10" x2="310" y1={y} y2={y} stroke="#284454" strokeDasharray="3 5" />)}
      <path d={`${line} L310,60 L10,60 Z`} fill="url(#ds-area)" /><path d={line} fill="none" stroke="#3de4cd" strokeWidth="2.5" />
      {[0, Math.floor(points.length / 2), points.length - 1].map((i) => <text key={i} x={coords[i]?.[0]} y="82" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{points[i]?.label}</text>)}
    </svg></>;
}

function Distribution({ buckets, average, count }) {
  const maximum = Math.max(1, ...buckets.map((b) => b.count));
  return <><div className="ds-chart-stat"><strong>{average || "—"}<small>平均分</small></strong><span>{number(count)} 份已发布成绩</span></div>
    <svg viewBox="0 0 320 84" className="ds-distribution" role="img" aria-label="已发布考试成绩分布">
      {buckets.map((b, i) => { const h = b.count / maximum * 34; return <g key={b.label}>
        <rect x={12 + i * 63} y={58 - h} width="36" height={Math.max(h, 1)} rx="3" fill={i < 2 ? "#efbb66" : i === 4 ? "#3de4cd" : "#4d9fff"} opacity={b.count ? 0.85 : 0.18} />
        <text x={30 + i * 63} y={Math.max(18, 52 - h)} textAnchor="middle" className="ds-bar-number">{b.count}</text>
        <text x={30 + i * 63} y="82" textAnchor="middle">{b.label}</text>
      </g>; })}
    </svg></>;
}

const iso = (x, z, elevation = 0) => [510 + (x - z) * 0.86, 14 + (x + z) * 0.34 - elevation];
const polygon = (...points) => points.map((p) => p.join(",")).join(" ");

function IsoBox({ x, z, width, depth, height, elevation = 0, color, opacity = 1 }) {
  const a = iso(x, z, elevation + height), b = iso(x + width, z, elevation + height), c = iso(x + width, z + depth, elevation + height), d = iso(x, z + depth, elevation + height);
  const ba = iso(x, z + depth, elevation), bb = iso(x + width, z + depth, elevation), bc = iso(x + width, z, elevation);
  return <g opacity={opacity}>
    <polygon points={polygon(d, c, bb, ba)} fill={color} fillOpacity=".18" stroke={color} strokeOpacity=".45" />
    <polygon points={polygon(b, c, bb, bc)} fill={color} fillOpacity=".1" stroke={color} strokeOpacity=".4" />
    <polygon points={polygon(a, b, c, d)} fill={color} fillOpacity=".3" stroke={color} strokeWidth="1.2" />
  </g>;
}

function WorkstationScene({ stations, selectedId, onSelect }) {
  return <svg viewBox="28 -100 1020 460" className="ds-scene" role="img" aria-label="工位运行空间示意，非建筑实际平面">
    <defs>
      <radialGradient id="ds-floor-glow"><stop stopColor="#1f7682" stopOpacity=".27" /><stop offset="1" stopColor="#092334" stopOpacity="0" /></radialGradient>
      <linearGradient id="ds-floor" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#153e54" stopOpacity=".45" /><stop offset="1" stopColor="#0a2332" /></linearGradient>
      <filter id="ds-glow"><feGaussianBlur stdDeviation="2.5" /></filter>
    </defs>
    <ellipse cx="510" cy="185" rx="445" ry="165" fill="url(#ds-floor-glow)" />
    <polygon points={polygon(iso(-45, -45), iso(505, -45), iso(505, 440), iso(-45, 440))} fill="url(#ds-floor)" stroke="#326e83" strokeWidth="1.3" />
    <polygon points={polygon(iso(-45, 440), iso(505, 440), iso(505, 440, -14), iso(-45, 440, -14))} fill="#0b2336" stroke="#285569" />
    <polygon points={polygon(iso(505, -45), iso(505, 440), iso(505, 440, -14), iso(505, -45, -14))} fill="#071c2b" stroke="#285569" />
    {Array.from({ length: 12 }, (_, i) => i * 45 - 25).map((v) => <g key={v} opacity=".2">
      <line x1={iso(v, -45)[0]} y1={iso(v, -45)[1]} x2={iso(v, 440)[0]} y2={iso(v, 440)[1]} stroke="#50a8b5" />
      <line x1={iso(-45, v)[0]} y1={iso(-45, v)[1]} x2={iso(505, v)[0]} y2={iso(505, v)[1]} stroke="#50a8b5" />
    </g>)}
    <polyline points={polygon(iso(-30, 180, 1), iso(490, 180, 1))} fill="none" stroke="#3de4cd" strokeOpacity=".45" strokeWidth="2" strokeDasharray="8 12" className="ds-flowline" />
    {stations.map((w, i) => {
      const col = i % 3, row = Math.floor(i / 3), x = col * 155, z = row * 205;
      const color = colors[tone(w.status)], selected = w.id === selectedId;
      const label = iso(x + 55, z + 48, 78);
      const marker = w.name.match(/\d+/)?.[0] || String(i + 1);
      return <g key={w.id} className={`ds-scene-station ${selected ? "is-selected" : ""}`} tabIndex="0" role="button" aria-label={`${w.name}，${w.status}，${w.project}`} aria-pressed={selected}
        onClick={() => onSelect(w.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(w.id); } }}>
        <polygon points={polygon(iso(x - 6, z - 6, 2), iso(x + 116, z - 6, 2), iso(x + 116, z + 116, 2), iso(x - 6, z + 116, 2))} fill={color} fillOpacity={selected ? ".15" : ".03"} stroke={color} strokeOpacity={selected ? "1" : ".3"} strokeWidth={selected ? "2" : "1"} />
        {selected && <polygon points={polygon(iso(x - 12, z - 12, 0), iso(x + 122, z - 12, 0), iso(x + 122, z + 122, 0), iso(x - 12, z + 122, 0))} fill="none" stroke={color} strokeOpacity=".25" strokeWidth="6" filter="url(#ds-glow)" />}
        <IsoBox x={x + 14} z={z + 20} width={76} depth={60} height={28} color="#3b6b86" />
        <IsoBox x={x + 14} z={z + 20} width={76} depth={60} height={7} elevation={28} color={color} />
        <IsoBox x={x + 33} z={z + 31} width={37} depth={29} height={14} elevation={35} color="#8bb7cf" />
        <IsoBox x={x + 85} z={z + 10} width={5} depth={24} height={54} color="#335d76" />
        <IsoBox x={x + 84} z={z + 8} width={8} depth={29} height={22} elevation={41} color={color} />
        <circle cx={iso(x + 52, z + 44, 64)[0]} cy={iso(x + 52, z + 44, 64)[1]} r="3" fill={color} />
        <path d={`M${iso(x + 20, z + 12, 66).join(",")} l0,-12 l20,0`} fill="none" stroke={color} opacity=".7" />
        <circle cx={label[0]} cy={label[1] - 12} r="30" fill="#0b2437" stroke={color} strokeOpacity={selected ? "1" : ".5"} />
        <text x={label[0]} y={label[1]} textAnchor="middle" fill={selected ? "#efffff" : "#a9c6d7"} className="ds-station-number">{marker.padStart(2, "0")}</text>
      </g>;
    })}
    {!stations.length && <text x="510" y="165" textAnchor="middle" fill="#8da8bd">尚未配置实训工位</text>}
  </svg>;
}

function WorkstationPreview({ station, onInteract }) {
  const preview = station?.preview;
  const [imageFailed, setImageFailed] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const dialog = useRef(null);
  const available = preview?.state === "demo" && !imageFailed;
  const mainLabel = swapped ? "辅助视角" : "主视角";
  const insetLabel = swapped ? "主视角" : "辅助视角";
  useEffect(() => {
    const element = dialog.current;
    if (enlarged && available) {
      if (!element.open) element.showModal();
    } else if (element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [enlarged, available]);
  const swapViews = () => { onInteract(); setSwapped((value) => !value); };
  const enlarge = () => { onInteract(); setEnlarged(true); };
  return <section className="ds-video-preview" aria-label={`${station?.name || "工位"}视频预览`}>
    <header><strong><VideoCameraOutlined />{station?.name || "工位画面"}</strong><span>{available ? "演示画面" : preview?.state === "private" ? "考试保护" : "暂无画面"}</span></header>
    <div className={`ds-video-stage ${available ? "has-picture" : ""}`}>
      <figure className="ds-video-main">
        {available ? <><img className={swapped ? "is-detail" : ""} src={preview.poster} alt={`${station.name}${mainLabel}演示画面`} onError={() => setImageFailed(true)} /><button type="button" className="ds-video-hitarea" aria-label={`放大${station.name}${mainLabel}画面`} aria-haspopup="dialog" onClick={enlarge} /></>
          : <div className="ds-video-empty"><VideoCameraOutlined /><strong>{imageFailed ? "画面暂不可用" : preview?.message || "尚未配置工位"}</strong><span>{imageFailed ? "演示素材加载失败" : preview?.detail || "等待实训工位配置"}</span></div>}
        <figcaption>{mainLabel}{available && <span>{swapped ? "示意" : "操作区"}</span>}</figcaption>
      </figure>
      {preview?.hasAuxiliary && <figure className="ds-video-auxiliary">
        {available ? <><img className={swapped ? "" : "is-detail"} src={preview.poster} alt={`${station.name}${insetLabel}演示画面`} /><button type="button" className="ds-video-hitarea" aria-label={`切换${insetLabel}到大图`} onClick={swapViews} /></>
          : <div className="ds-video-auxiliary-empty"><VideoCameraOutlined /><span>{preview.auxiliaryMessage || "辅助画面不可用"}</span></div>}
        <figcaption>{insetLabel}{available && <span>{swapped ? "操作区" : "示意"}</span>}</figcaption>
      </figure>}
    </div>
    <div className="ds-video-caption"><span title={station?.project}>{station?.project || "等待实训开始"}</span><i style={{ color: colors[tone(station?.status)] }}>{station?.status || "待命"}</i></div>
    <dialog ref={dialog} className="ds-video-dialog" aria-label={`${station?.name || "工位"} · ${mainLabel}放大预览`} onClose={() => setEnlarged(false)} onCancel={(event) => { event.preventDefault(); setEnlarged(false); }} onClick={(event) => { if (event.target === event.currentTarget) setEnlarged(false); }}>
      <header><div><h2>{station?.name} · {mainLabel}</h2><span>演示画面</span></div><button type="button" aria-label="关闭放大预览" onClick={() => setEnlarged(false)}><CloseOutlined />关闭</button></header>
      {available && <div className="ds-video-expanded-frame"><img className={swapped ? "is-detail" : ""} src={preview.poster} alt={`${station.name}${mainLabel}放大演示画面`} onError={() => setImageFailed(true)} /></div>}
      <footer>{station?.project}</footer>
    </dialog>
  </section>;
}

export default function DataScreen() {
  const { data, dataSource, dataSyncError } = usePrototypeData();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const [demo, setDemo] = useState(query.get("mode") !== "live");
  const [days, setDays] = useState(30);
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [rotation, setRotation] = useState(0);
  const [chosenId, setChosenId] = useState(null);
  const [stepPage, setStepPage] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [scale, setScale] = useState(1);
  const [controls, setControls] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const root = useRef(null), lastSnapshot = useRef(null);
  const demoDay = schoolDay(refreshTime);
  const sample = useMemo(() => createDataScreenDemo(refreshTime), [demo, demoDay]);
  const teacherId = query.get("scope") === "teacher" ? "t1" : null;
  const result = useMemo(() => {
    try {
      if (!demo && dataSyncError) throw new Error(dataSyncError);
      const snapshot = buildDataScreenSnapshot(demo ? sample : data, { now: refreshTime, days, teacherId: demo ? null : teacherId });
      const next = { snapshot, refreshedAt: refreshTime, error: false, demo };
      lastSnapshot.current = next;
      return next;
    } catch {
      const previous = lastSnapshot.current?.demo === demo ? lastSnapshot.current : null;
      return { snapshot: previous?.snapshot || buildDataScreenSnapshot({}, { now: refreshTime, days }), refreshedAt: previous?.refreshedAt, error: true, demo };
    }
  }, [demo, sample, data, dataSyncError, days, teacherId, refreshTime]);
  const { snapshot } = result;
  useEffect(() => {
    const resize = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    resize(); window.addEventListener("resize", resize);
    const tick = window.setInterval(() => setClock(new Date()), 1000);
    const refresh = window.setInterval(() => setRefreshTime(new Date()), 15000);
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => { window.removeEventListener("resize", resize); window.clearInterval(tick); window.clearInterval(refresh); document.removeEventListener("fullscreenchange", changed); };
  }, []);
  useEffect(() => { setRefreshTime(new Date()); }, [data]);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => { setRotation((n) => n + 1); setChosenId(null); setStepPage(null); }, 10000);
    return () => window.clearInterval(timer);
  }, [paused]);
  const setMode = (value) => { setDemo(value); setRotation(0); setChosenId(null); setStepPage(null); const url = new URL(window.location.href); url.searchParams.set("mode", value ? "demo" : "live"); window.history.replaceState(null, "", url); };
  const selectStation = (id) => { setChosenId(id); setStepPage(null); setPaused(true); };
  const toggleFull = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current.requestFullscreen(); setNotice(""); }
    catch { setNotice("浏览器暂不支持全屏，请使用浏览器的全屏功能。"); }
  };
  const stationPageCount = Math.max(1, Math.ceil(snapshot.workstations.length / 6));
  const selectedIndex = chosenId ? snapshot.workstations.findIndex((w) => w.id === chosenId) : rotation % Math.max(1, snapshot.workstations.length);
  const page = Math.floor(Math.max(0, selectedIndex) / 6);
  const stations = snapshot.workstations.slice(page * 6, page * 6 + 6);
  const focused = snapshot.workstations[Math.max(0, selectedIndex)];
  const programPages = Math.max(1, Math.ceil(snapshot.programs.length / 2));
  const programs = snapshot.programs.slice((rotation % programPages) * 2, (rotation % programPages) * 2 + 2);
  const eventPages = Math.max(1, Math.ceil(snapshot.events.length / 2));
  const events = snapshot.events.slice((rotation % eventPages) * 2, (rotation % eventPages) * 2 + 2);
  const heatPages = Math.max(1, Math.ceil(snapshot.heat.length / 3));
  const heat = snapshot.heat.slice((rotation % heatPages) * 3, (rotation % heatPages) * 3 + 3);
  const metrics = [
    ["覆盖班级", "个", <ApartmentOutlined />], ["覆盖学生", "人", <TeamOutlined />], ["SOP标准", "项", <BookOutlined />],
    ["累计实训", "人次", <ExperimentOutlined />], ["完成练习", "场", <CheckCircleOutlined />], ["发布考试", "场", <FileDoneOutlined />],
  ];
  const stepCount = Math.max(1, ...heat.map((r) => r.cells.length));
  const processPages = Math.max(1, Math.ceil((focused?.steps.length || 0) / 3));
  const currentStepIndex = Math.max(0, focused?.steps.findIndex((s) => s.current) ?? 0);
  const processPage = stepPage == null ? (Math.floor(currentStepIndex / 3) + (chosenId ? 0 : rotation)) % processPages : stepPage % processPages;
  const processOffset = processPage * 3;
  const moveSteps = (direction) => { setStepPage((processPage + direction + processPages) % processPages); setPaused(true); };
  return <main ref={root} className={`data-screen ${paused ? "is-paused" : ""}`}>
    <div className="ds-ambient ds-ambient--left" /><div className="ds-ambient ds-ambient--right" />
    <div className="ds-stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
      <header className="ds-header">
        <div className="ds-brand"><span className="ds-brand-mark"><span className="ds-brain-icon" role="img" aria-label="AI智能大脑" /></span><div><strong>{snapshot.schoolName}</strong><span className={demo ? "ds-demo-badge" : ""}>{demo ? "演示数据" : teacherId ? "教师范围" : "校级业务数据"} · 规模累计</span></div></div>
        <div className="ds-title"><h1>AI视觉实训操作流程智能评测系统</h1><p>实训运行与教学成果数据大屏</p></div>
        <div className="ds-clock"><strong>{clock.toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</strong><span>{clock.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long" }).replaceAll("/", ".")}</span></div>
      </header>
      <div className="ds-metrics" aria-label="累计至今的业务规模">
        {metrics.map(([label, unit, icon], i) => <section key={label} title="累计至今"><span className={`ds-metric-icon ds-metric-icon--${i}`}>{icon}</span><div><span>{label}</span><strong>{number(snapshot.metrics[i])}<em>{unit}</em></strong></div></section>)}
      </div>
      <div className="ds-main-grid">
        <aside className="ds-side">
          <Panel title="专业与课程覆盖" label={`${rotation % programPages + 1}/${programPages}`}>
            {programs.length ? <div className="ds-programs">{programs.map((p, i) => <div key={p.name}><span className="ds-rank">{String((rotation % programPages) * 2 + i + 1).padStart(2, "0")}</span><div><strong title={p.name}>{p.name}</strong><span>{p.courses} 门课程 · {number(p.students)} 位学生</span></div><b>{number(p.count)}<small>人次</small></b></div>)}</div> : empty}
          </Panel>
          <Panel title="实训开展节奏" label={`近${days}日`}><Trend points={snapshot.trend} total={snapshot.periodParticipants} /></Panel>
          <Panel title="教学成果分布" label={`近${days}日`}><Distribution buckets={snapshot.scoreBuckets} average={snapshot.averageScore} count={snapshot.publishedCount} /></Panel>
        </aside>
        <div className="ds-center">
          <Panel title="实训工位运行全景" label="工位与视频预览" className="ds-panorama">
            <div className="ds-panorama-stats"><span><i />当前实训<strong>{snapshot.running}<small>个工位</small></strong></span><span>设备健康<strong>{snapshot.healthy}<small>/ {snapshot.workstations.length}</small></strong></span><span>AI可用<strong>{snapshot.aiReady}<small>个工位</small></strong></span></div>
            <div className="ds-scene-layout">
              <WorkstationPreview key={`${demo}-${focused?.id}`} station={focused} onInteract={() => setPaused(true)} />
              <WorkstationScene stations={stations} selectedId={focused?.id} onSelect={selectStation} />
              <div className="ds-station-list" aria-label="本组工位状态">{stations.map((w) => <button type="button" key={w.id} className={w.id === focused?.id ? "is-selected" : ""} aria-pressed={w.id === focused?.id} onClick={() => selectStation(w.id)}><strong title={w.name}>{w.name}</strong><span style={{ color: colors[tone(w.status)] }}><i />{w.status}</span></button>)}</div>
            </div>
            <div className="ds-scene-caption"><span>点击工位可暂停轮播</span><nav aria-label="工位区域切换">{Array.from({ length: stationPageCount }, (_, i) => <button type="button" key={i} aria-label={`第${i + 1}组工位`} aria-pressed={page === i} className={page === i ? "active" : ""} onClick={() => selectStation(snapshot.workstations[i * 6]?.id)} />)}</nav><span>第 {page + 1} / {stationPageCount} 组</span></div>
          </Panel>
          <Panel title="操作流程智能评测" meta={<span className="ds-process-meta"><span>{focused ? `${focused.name} · ${focused.isExam ? "考试过程保密" : focused.steps.length ? `步骤 ${processOffset + 1}–${Math.min(processOffset + 3, focused.steps.length)} / ${focused.steps.length}` : focused.status}` : "等待实训"}</span>{processPages > 1 && <span className="ds-step-pager"><button type="button" aria-label="上一组操作步骤" onClick={() => moveSteps(-1)}>‹</button><button type="button" aria-label="下一组操作步骤" onClick={() => moveSteps(1)}>›</button></span>}</span>} className="ds-process-panel">
            <div className="ds-process-label"><strong title={focused?.project}>{focused?.project || "等待实训开始"}</strong><span><VideoCameraOutlined /> {focused?.steps.length ? `已完成 ${focused.steps.filter((s) => s.complete).length}/${focused.steps.length} · 证据归档 ${focused.steps.filter((s) => s.evidence).length}/${focused.steps.length}` : "过程证据可追溯"}</span></div>
            {focused?.steps.length ? <div className="ds-steps">{focused.steps.slice(processOffset, processOffset + 3).map((s, i) => <div key={s.id} className={s.current ? "is-current" : s.complete ? "is-complete" : ""}><span>{s.complete ? <CheckCircleOutlined /> : String(processOffset + i + 1).padStart(2, "0")}</span><strong title={s.name}>{s.name}</strong><small>{s.complete ? "已完成" : s.current ? "当前步骤" : "待进行"}</small></div>)}</div>
              : <div className="ds-process-empty">{focused?.isExam ? "考试运行状态可见 · 实时成绩与操作结果保护" : "工位准备就绪后，展示实训操作流程"}</div>}
          </Panel>
        </div>
        <aside className="ds-side">
          <Panel title="AI判断覆盖" label="实际配置步骤">
            <div className="ds-coverage-heading"><strong>{snapshot.modeTotal}<small>标准步骤</small></strong></div>
            <div className="ds-composition" role="img" aria-label="实际评价方式构成">{snapshot.modes.map((m) => m.count > 0 && <span key={m.key} style={{ flex: m.count, background: m.color }} title={`${m.name} ${m.count} 步`} />)}{!snapshot.modeTotal && <span className="ds-no-data-bar" />}</div>
            <div className="ds-mode-legend">{snapshot.modes.map((m) => <span key={m.key}><i style={{ background: m.color }} />{m.name}<b>{m.count}</b></span>)}</div>
          </Panel>
          <Panel title="安全与异常闭环" label="已确认事件" className="ds-events-panel">
            {events.length ? <div className="ds-events">{events.map((e) => <article key={e.id}><i className={e.closed ? "closed" : ""} /><div><strong>{e.title}</strong><span>{time(e.time)} · {e.kind}</span></div><b className={e.closed ? "closed" : ""}>{e.status}</b></article>)}</div> : <div className="ds-clear"><SafetyCertificateOutlined /><strong>当前没有已记录事件</strong><span>安全候选不计入确认事件</span></div>}
          </Panel>
          <Panel title="录像证据保障" label={`近${days}日`} className="ds-evidence-panel">
            <div className="ds-evidence-heading"><strong>{snapshot.recordingRate ?? "—"}<small>{snapshot.recordingRate == null ? "" : "%"}</small></strong><div><b>录像完整率</b><span>{number(snapshot.recordingTotal)} 份录像记录</span></div></div>
            <div className="ds-evidence-strip" role="img" aria-label="录像完整性构成">{snapshot.recording.map((r) => r.count > 0 && <span key={r.name} style={{ flex: r.count, background: r.color }} />)}{!snapshot.recordingTotal && <span style={{ flex: 1, background: "#34475b" }} />}</div>
            <div className="ds-evidence-legend">{snapshot.recording.map((r) => <span key={r.name}><i style={{ background: r.color }} />{r.name}<b>{number(r.count)}</b></span>)}</div>
          </Panel>
        </aside>
      </div>
      <div className="ds-bottom-grid">
        <Panel title="操作薄弱点分析" label="已发布考试 · 扣分发生率" className="ds-heat-panel">
          <div className="ds-heat-legend"><span>低</span><i style={{ background: heatGradient }} /><span>高</span><b>— 无样本</b></div>
          {heat.length ? <div className="ds-heat" style={{ "--ds-heat-cols": stepCount }}><span>课程 / 步骤</span>{Array.from({ length: stepCount }, (_, i) => <span key={i}>Step {String(i + 1).padStart(2, "0")}</span>)}
            {heat.map((row) => <div className="ds-heat-row" key={row.id}><strong>{row.name}</strong>{Array.from({ length: stepCount }, (_, i) => { const cell = row.cells[i]; return <span key={i} title={cell ? `${cell.name} · ${cell.samples}个样本` : "不适用"} style={{ background: heatColor(cell?.rate), color: cell?.rate == null ? "#7291a5" : undefined }}>{cell?.rate == null ? "—" : `${cell.rate}%`}</span>; })}</div>)}
          </div> : empty}
        </Panel>
        <Panel title="标准与能力建设" label="校级能力沉淀" className="ds-construction-panel">
          <div className="ds-construction">{[["SOP标准", "项", <BookOutlined />], ["AI能力", "项", <ExperimentOutlined />], ["验证通过", "组", <SafetyCertificateOutlined />], ["可运行配置", "组", <DesktopOutlined />]].map(([label, unit, icon], i) => <div key={label}>{icon}<strong>{number(snapshot.construction[i])}<small>{unit}</small></strong><span>{label}</span>{i < 3 && <b>›</b>}</div>)}</div>
          <p>标准 <i>→</i> 操作 <i>→</i> 评价 <i>→</i> 证据</p>
        </Panel>
      </div>
      <footer className={`ds-footer ${result.error ? "has-error" : ""}`}><span><i />{demo ? "演示数据" : `${teacherId ? "教师范围" : "校级范围"} · ${dataSource === "cpd" ? "CPD数据" : "本地业务数据"}`} · {result.error ? "更新暂缓 · 最后成功 " : "统计更新于 "}{time(result.refreshedAt)}</span><strong>每一次评价都有依据</strong><span><button type="button" className="ds-controls-toggle" aria-label={controls ? "隐藏展示设置" : "显示展示设置"} aria-expanded={controls} aria-controls="data-screen-controls" onClick={() => setControls((visible) => !visible)}>{paused ? "已暂停轮播" : "自动轮播"}</button> · 兴辰智能</span></footer>
    </div>
    {controls && <div id="data-screen-controls" className="ds-controls is-visible">
      <span><SettingOutlined /> 展示设置</span>
      <select aria-label="数据模式" value={demo ? "demo" : "live"} onChange={(e) => setMode(e.target.value === "demo")}><option value="demo">演示数据</option><option value="live">当前业务数据</option></select>
      <select aria-label="统计周期" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value="7">近7日</option><option value="30">近30日</option></select>
      <button type="button" onClick={() => setPaused(!paused)}>{paused ? <PlayCircleOutlined /> : <PauseOutlined />}{paused ? "继续轮播" : "暂停轮播"}</button>
      <button type="button" onClick={toggleFull}>{fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}{fullscreen ? "退出全屏" : "全屏展示"}</button>
    </div>}
    {notice && <div className="ds-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}
  </main>;
}
