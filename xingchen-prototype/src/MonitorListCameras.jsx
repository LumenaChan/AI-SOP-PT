import { monitorListCameras } from "./cameraRules.js";

export function MonitorListCameras({
  workstation,
  session,
  devices = [],
  status,
  index = 0,
}) {
  const cameras = monitorListCameras(workstation, devices, session);
  return (
    <div className="station-card__visual station-card__visual--multi">
      {cameras.length ? (
        cameras.map((camera, cameraIndex) => (
          <div
            className="station-card__camera-frame"
            data-camera-id={camera.id}
            key={camera.id}
            title={`${camera.label} · ${camera.available ? "占位演示画面，非实时视频" : "摄像头或视频流不可用"}`}
          >
            {camera.available ? (
              <img
                src={
                  cameraIndex
                    ? "/assets/student-monitor-hand-tracking.png"
                    : index % 2
                      ? "/assets/workstation-female.png"
                      : "/assets/workstation-male.png"
                }
                alt={`${workstation?.name || "工位"} · ${camera.label}占位演示画面，非实时视频`}
              />
            ) : (
              <span className="station-card__camera-empty">画面不可用</span>
            )}
            <span className="station-card__camera-caption">
              {camera.label}
              {!camera.available && " · 不可用"}
            </span>
            {cameraIndex === 0 && status === "故障" && (
              <span className="blocked-pill">已阻断</span>
            )}
            {cameraIndex === 0 && camera.available && status === "进行中" && (
              <span className="live">
                <i />
                进行中
              </span>
            )}
          </div>
        ))
      ) : (
        <div className="station-card__camera-frame">
          <span className="station-card__camera-empty">未配置摄像头</span>
        </div>
      )}
    </div>
  );
}
