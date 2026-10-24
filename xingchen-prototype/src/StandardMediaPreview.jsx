import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseOutlined } from "@ant-design/icons";
import { mediaKind, mediaSize, mediaTypeLabel } from "./standardMediaRules.js";

export function officeApplication(item) {
  const ext = String(item.name || "")
    .split(".")
    .at(-1)
    .toLowerCase();
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["ppt", "pptx"].includes(ext)) return "PowerPoint";
  if (["xls", "xlsx"].includes(ext)) return "Excel";
  return "对应办公软件";
}

export function StandardMediaPreviewContent({ item, url }) {
  const kind = mediaKind(item);
  const [error, setError] = useState("");
  if (!url || error)
    return (
      <p className="standard-media-preview__message" role="status">
        {error || "资料暂不可读取，请关闭后重试。"}
      </p>
    );
  if (kind === "image")
    return (
      <img
        src={url}
        alt={item.name}
        onError={() => setError("图片无法显示，请下载查看或联系教师重新添加。")}
      />
    );
  if (kind === "video")
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={`播放视频：${item.name}`}
        onError={() =>
          setError(
            "视频无法播放，可能是编码不受支持。请下载后使用视频播放器查看。",
          )
        }
      />
    );
  if (kind === "pdf")
    return (
      <object
        className="standard-media-preview__pdf"
        data={url}
        type="application/pdf"
        aria-label={`PDF预览：${item.name}`}
      >
        <p className="standard-media-preview__message">
          当前浏览器无法显示 PDF，请使用下方“下载资料”后查看。
        </p>
      </object>
    );
  return (
    <p className="standard-media-preview__message">
      此格式暂不支持在线预览，请下载后使用{officeApplication(item)}打开。
    </p>
  );
}

export function StandardMediaPreviewDialog({ item, url, onClose }) {
  const ref = useRef(null),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      // Removing the video also stops playback; object URLs belong to the card.
      dialog.querySelector("video")?.pause();
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus?.();
    };
  }, []);
  const dialog = (
    <dialog
      ref={ref}
      className={`standard-media-preview standard-media-preview--${mediaKind(item)}`}
      aria-labelledby={titleId}
      aria-modal="true"
      onKeyDown={(event) => {
        // Portalled previews may be inside another teaching/form dialog.
        // Keep that parent open and let the native dialog trap focus.
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <header className="standard-media-preview__header">
        <div>
          <h2 id={titleId}>{item.name}</h2>
          <p>
            {mediaTypeLabel(item)}
            {item.size ? ` · ${mediaSize(item.size)}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="standard-media-preview__close"
          aria-label="关闭资料预览"
          onClick={onClose}
          autoFocus
        >
          <CloseOutlined />
        </button>
      </header>
      <div className="standard-media-preview__body">
        <StandardMediaPreviewContent
          key={`${item.id}-${url}`}
          item={item}
          url={url}
        />
      </div>
      <footer className="standard-media-preview__footer">
        <a className="button" href={url} download={item.name}>
          下载资料
        </a>
        <button
          className="button button--primary"
          type="button"
          onClick={onClose}
        >
          关闭预览
        </button>
      </footer>
    </dialog>
  );
  return typeof document === "undefined"
    ? dialog
    : createPortal(dialog, document.body);
}
