import { displayBusinessText } from "./businessTextRules.js";
import { useEffect, useRef, useState } from "react";
import { DashboardCardPager } from "./DashboardCardPager.jsx";
import { notificationPage, notificationTime } from "./notificationRules.js";

export function NotificationPopover({
  items,
  onSelect,
  onMarkAllRead,
  onClose,
}) {
  const [page, setPage] = useState(0),
    [error, setError] = useState("");
  const list = useRef(null);
  const current = notificationPage(items, page);
  useEffect(() => {
    if (list.current) list.current.scrollTop = 0;
  }, [current.page]);
  const act = (action) => {
    try {
      action();
      setError("");
    } catch (failure) {
      setError(failure.message || "操作未完成，请重试。");
    }
  };
  return (
    <section
      id="header-notification-popover"
      className="notification-popover"
      role="dialog"
      aria-label="通知列表"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <strong>通知</strong>
        <button
          type="button"
          disabled={!items.some((item) => !item.read)}
          onClick={() => act(onMarkAllRead)}
        >
          全部标为已读
        </button>
      </header>
      {error && (
        <p className="notification-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
      <div
        className="notification-list"
        ref={list}
        tabIndex={0}
        aria-label="当前页通知，可上下滚动"
      >
        {current.rows.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.read ? "read" : ""}
            onClick={() => act(() => onSelect(item))}
          >
            <span
              className={`notification-dot notification-dot--${item.tone}`}
              aria-hidden="true"
            />
            <span className="notification-content">
              <strong>{displayBusinessText(item.title)}</strong>
              <small>{displayBusinessText(item.detail)}</small>
              <time title="北京时间">{notificationTime(item.time)}</time>
            </span>
          </button>
        ))}
        {!current.total && <p className="notification-empty">暂无通知</p>}
      </div>
      <footer aria-label="通知分页">
        <span aria-live="polite">
          共 {current.total} 条 · 第 {current.page + 1}/{current.pages} 页
        </span>
        <DashboardCardPager
          page={current.page}
          totalPages={current.pages}
          onChange={setPage}
        />
      </footer>
    </section>
  );
}
