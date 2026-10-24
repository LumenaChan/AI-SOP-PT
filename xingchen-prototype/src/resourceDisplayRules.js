const internalCode = /^(?:DEMO(?:-|$)|WS-DEMO(?:-|$))/i;
const knownStationId =
  /^ws-(?:closure-.+-20261022|allocation-demo-[ab]-20261022|demo-20261015)$/;
const closureNames = {
  "DEMO-CLOSURE-manual": "三步操作工位",
  "DEMO-CLOSURE-teacher": "教师确认工位",
  "DEMO-CLOSURE-fault": "故障演示工位",
  "DEMO-CLOSURE-practice-result": "练习回看工位",
  "DEMO-CLOSURE-exam-wait": "考试待发布工位",
  "DEMO-CLOSURE-exam-result": "考试回看工位",
  "DEMO-CLOSURE-exam-running": "考试确认工位",
};
export function hiddenWorkstationCode(item) {
  return Boolean(
    item &&
      internalCode.test(item.code || "") &&
      (item.demoPackageId || knownStationId.test(item.id || "")),
  );
}
export function workstationBusinessCode(item) {
  return hiddenWorkstationCode(item) ? "" : item?.code || "";
}
export function workstationCaption(item) {
  return [item?.location, workstationBusinessCode(item)]
    .filter(Boolean)
    .join(" · ");
}
export function workstationOptionLabel(item) {
  return [item?.name || "工位信息缺失", workstationBusinessCode(item)]
    .filter(Boolean)
    .join(" · ");
}
export function compactWorkstationLabel(item) {
  if (!item) return "工位信息缺失";
  if (/^\d+\s*号工位$/.test(item.name || "")) return item.name;
  if (hiddenWorkstationCode(item))
    return (
      closureNames[item.code] ||
      item.name?.replace(/^【演示】\s*/, "") ||
      "演示工位"
    );
  return item.code || item.name || "未命名工位";
}
export function hiddenDeviceSerial(item) {
  return Boolean(
    item &&
      internalCode.test(item.serial || "") &&
      (item.demoPackageId ||
        knownStationId.test(item.workstationId || "") ||
        /^DEMO-(?:CAM-\d+|EDGE)$/.test(item.name || "") ||
        /^(?:camera-demo-|edge-demo-)/.test(item.id || "")),
  );
}
export function deviceSerialLabel(item) {
  return hiddenDeviceSerial(item) ? "演示设备" : item?.serial || "未记录";
}
export function deviceDisplayName(item) {
  if (!item) return "未配置";
  if (hiddenDeviceSerial(item)) {
    const camera = /^DEMO-CAM-(\d+)$/.exec(item.name || "");
    if (camera) return `演示摄像头 ${camera[1]}`;
    if (item.name === "DEMO-EDGE") return "演示边缘节点";
  }
  return item.name || "未命名设备";
}
