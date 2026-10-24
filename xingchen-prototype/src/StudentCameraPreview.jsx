import { useState } from "react";
import { VideoCameraOutlined } from "@ant-design/icons";
import {
  resolveStudentCameraViews,
  selectStudentCamera,
} from "./studentPracticeRules.js";

export function StudentCameraPreview({ data, session, workstation, student }) {
  const [selectedId, setSelectedId] = useState("");
  const views = resolveStudentCameraViews(data, session, workstation);
  const camera = selectStudentCamera(views, selectedId);
  const hasDemoImage =
    camera?.role === "primary" ||
    camera?.detailView ||
    !camera?.areaIds?.length ||
    camera.areaIds.every((area) => area === "工作台");
  const poster = `/assets/workstation-${student?.gender === "女" ? "female" : "male"}.png`;
  return (
    <section className="student-live-card">
      <header>
        <div>
          <VideoCameraOutlined />
          <strong>当前工位画面</strong>
        </div>
        {views.length > 1 ? (
          <label
            className="student-camera-select"
            title={
              camera?.previewOnly
                ? `${camera.name} · 补充视角，仅供查看；评价和录像仍按本次任务设置运行。`
                : "切换仅影响查看画面，不改变任务进度和评价。"
            }
          >
            <select
              aria-label="选择工位摄像头"
              value={camera?.id || ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {views.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.label}
                  {view.previewOnly ? "（补充预览）" : ""}
                  {!view.available ? "（不可用）" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <small>{camera?.label || "摄像头未配置"}</small>
        )}
      </header>
      {camera?.available && hasDemoImage ? (
        <div className="student-live-view">
          <img
            className={camera.detailView ? "student-live-view__detail" : ""}
            src={poster}
            alt={`${workstation.name} · ${camera.label}演示图${camera.detailView ? "，局部裁切示意" : ""}，非实时摄像头画面`}
          />
          <span>
            {camera.detailView
              ? "细节示意 · 局部裁切"
              : "演示画面 · 非实时视频"}
          </span>
          <small>
            {workstation.name} · {camera.label}
            {camera.previewOnly ? " · 补充预览" : ""}
          </small>
        </div>
      ) : (
        <div className="student-live-unavailable">
          <VideoCameraOutlined />
          <strong>
            {camera?.available ? "该视角画面待接入" : "当前视角暂不可用"}
          </strong>
          <p>
            {camera?.available
              ? "当前为视角切换演示，尚未接入该摄像头视频。"
              : camera?.reason || "当前工位尚未配置可查看的摄像头。"}
          </p>
        </div>
      )}
    </section>
  );
}
