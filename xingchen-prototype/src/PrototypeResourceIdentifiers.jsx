import React from "react";
import {
  hiddenDeviceSerial,
  hiddenWorkstationCode,
} from "./resourceDisplayRules.js";

export function PrototypeResourceIdentifiers({ item, type }) {
  const hidden =
    type === "workstation"
      ? hiddenWorkstationCode(item)
      : type === "device" && hiddenDeviceSerial(item);
  if (!hidden) return null;
  return (
    <details className="prototype-resource-identifiers">
      <summary>原型内部信息</summary>
      <dl>
        <div>
          <dt>资源 ID</dt>
          <dd>{item.id}</dd>
        </div>
        <div>
          <dt>{type === "workstation" ? "内部工位编号" : "内部设备序列号"}</dt>
          <dd>{type === "workstation" ? item.code : item.serial}</dd>
        </div>
      </dl>
    </details>
  );
}
