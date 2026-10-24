import React, { useEffect, useRef, useState } from "react";
import {
  FileOutlined,
  FilePdfOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import {
  addStandardMediaFiles,
  mediaFormat,
  mediaKind,
  mediaSize,
  mediaTypeLabel,
  standardMediaItems,
  STANDARD_MEDIA_ACCEPT,
  STANDARD_MEDIA_HELP,
} from "./standardMediaRules.js";
import {
  StandardMediaPreviewDialog,
  officeApplication,
} from "./StandardMediaPreview.jsx";
import {
  loadStandardMediaFile,
  saveStandardMediaFiles,
} from "./standardMediaStorage.js";

function MediaAttachment({ item, onRemove, disabled }) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const kind = mediaKind(item);
  const Icon =
    {
      image: PictureOutlined,
      video: VideoCameraOutlined,
      pdf: FilePdfOutlined,
    }[kind] || FileOutlined;
  useEffect(() => {
    let active = true,
      objectUrl;
    setError("");
    setPreview(false);
    setLoaded(null);
    if (item.assetId) {
      loadStandardMediaFile(item.assetId)
        .then((blob) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          setLoaded({ id: item.id, url: objectUrl });
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.assetId, item.url]);
  const url = item.assetId
    ? loaded?.id === item.id
      ? loaded.url
      : ""
    : item.url;
  const unavailable = !url && !item.assetId;
  return (
    <li className="standard-media-item">
      <div
        className={`standard-media-thumbnail standard-media-thumbnail--${kind}`}
      >
        {url && ["image", "video", "pdf"].includes(kind) ? (
          <button
            type="button"
            className="standard-media-thumbnail__open"
            aria-label={`${kind === "image" ? "预览图片" : kind === "video" ? "播放视频" : "预览PDF"}：${item.name}`}
            onClick={() => setPreview(true)}
          >
            {kind === "image" && !error ? (
              <img
                src={url}
                alt={item.name}
                onError={() =>
                  setError("图片无法显示，请下载查看或重新添加资料。")
                }
              />
            ) : kind === "video" ? (
              <>
                <video
                  muted
                  playsInline
                  preload="metadata"
                  src={url}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <PlayCircleOutlined className="standard-media-thumbnail__play" />
              </>
            ) : (
              <Icon aria-hidden="true" />
            )}
          </button>
        ) : (
          <Icon aria-hidden="true" />
        )}
      </div>
      <div className="standard-media-meta">
        <strong title={item.name}>{item.name}</strong>
        <span>
          {mediaTypeLabel(item)}
          {item.size ? ` · ${mediaSize(item.size)}` : ""}
        </span>
        <div className="standard-media-actions">
          {url && ["image", "video", "pdf"].includes(kind) && (
            <button type="button" onClick={() => setPreview(true)}>
              {kind === "pdf"
                ? "预览 PDF"
                : kind === "video"
                  ? "播放视频"
                  : "查看图片"}
            </button>
          )}
          {url && (
            <a href={url} download={item.name}>
              {kind === "document"
                ? `下载查看 ${mediaFormat(item.name).toUpperCase()}`
                : "下载"}
            </a>
          )}
          {onRemove && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(item.id)}
              aria-label={`移除资料：${item.name}`}
            >
              <DeleteOutlined /> 移除
            </button>
          )}
        </div>
        {(error || unavailable) && (
          <p className="standard-media-error" role="status">
            {error || "资料地址缺失，请重新添加。"}
          </p>
        )}
        {item.assetId && !url && !error && (
          <p className="standard-media-loading" role="status">
            正在读取资料…
          </p>
        )}
        {kind === "document" && !error && (
          <small>
            此格式暂不支持在线预览，下载后使用{officeApplication(item)}打开
          </small>
        )}
      </div>
      {preview && url && (
        <StandardMediaPreviewDialog
          item={item}
          url={url}
          onClose={() => setPreview(false)}
        />
      )}
    </li>
  );
}

export function StandardMediaList({
  step,
  onRemove,
  disabled = false,
  showEmpty = true,
}) {
  const items = standardMediaItems(step);
  if (!items.length)
    return showEmpty ? (
      <p className="standard-media-empty">暂无示教资料</p>
    ) : null;
  return (
    <ul className="standard-media-list" aria-label="标准示教资料列表">
      {items.map((item) => (
        <MediaAttachment
          key={item.id}
          item={item}
          onRemove={onRemove}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}

export function StandardMediaSection({
  step,
  note,
  hideEmpty = false,
  title = "标准示教资料",
}) {
  const count = standardMediaItems(step).length;
  const [expanded, setExpanded] = useState(false);
  if (hideEmpty && !count) return null;
  return (
    <details
      className="standard-media-section"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        {title}
        <span>{count} 个资料</span>
      </summary>
      {expanded && (
        <>
          {note && <p className="standard-media-help">{note}</p>}
          <StandardMediaList step={step} />
        </>
      )}
    </details>
  );
}

export function StandardMediaEditor({ step, onChange, onBusyChange }) {
  const input = useRef(null),
    working = useRef(false),
    mounted = useRef(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const items = standardMediaItems(step);
  const addFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    onBusyChange(true);
    try {
      const next = await addStandardMediaFiles(
        items,
        files,
        saveStandardMediaFiles,
      );
      // The parent callback targets the captured Step ID, even if selection changes.
      onChange(next);
    } catch (failure) {
      if (mounted.current)
        setError(failure.message || "资料添加失败，请重试。");
    } finally {
      working.current = false;
      onBusyChange(false);
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <section
      className="standard-media-editor"
      aria-label="编辑标准示教资料"
      aria-busy={busy}
    >
      <div className="standard-media-heading">
        <span>
          标准示教资料 <small>{items.length} / 10</small>
        </span>
        <button
          className="button"
          type="button"
          disabled={busy || items.length >= 10}
          onClick={() => input.current?.click()}
        >
          <PlusOutlined />
          {busy ? "正在添加…" : "添加资料"}
        </button>
        <input
          ref={input}
          className="standard-media-input"
          type="file"
          multiple
          accept={STANDARD_MEDIA_ACCEPT}
          onChange={addFiles}
          aria-label="选择示教资料文件"
          disabled={busy || items.length >= 10}
        />
      </div>
      <p className="standard-media-help">{STANDARD_MEDIA_HELP}</p>
      {error && (
        <p className="standard-media-error" role="alert">
          {error}
        </p>
      )}
      <StandardMediaList
        step={step}
        disabled={busy}
        onRemove={(id) => {
          setError("");
          onChange(items.filter((item) => item.id !== id));
        }}
      />
    </section>
  );
}
