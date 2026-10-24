import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
const btn = "button button--default";
export function StatisticsLayer({
  title,
  onClose,
  onBack,
  backLabel = "返回上一层明细",
  children,
  wide = false,
}) {
  const ref = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href]",
          ),
        ];
        if (!nodes.length) {
          e.preventDefault();
          return;
        }
        const a = nodes[0],
          b = nodes.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === a ||
            document.activeElement === ref.current)
        ) {
          b.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === b) {
          a.focus();
          e.preventDefault();
        }
      }
    };
    ref.current.addEventListener("keydown", handler);
    const node = ref.current;
    return () => {
      node.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);
  const content = (
    <div
      className="statistics-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`statistics-drawer ${wide ? "statistics-drawer--wide" : ""}`}
      >
        <header>
          <h2>{title}</h2>
          <div className="statistics-row-actions">
            {onBack && (
              <button
                type="button"
                className={btn}
                onClick={onBack}
                aria-label={backLabel}
              >
                {backLabel === "返回上一层明细" ? "← 返回" : `← ${backLabel}`}
              </button>
            )}
            <button
              type="button"
              className={btn}
              onClick={onClose}
              aria-label="关闭"
            >
              关闭 ×
            </button>
          </div>
        </header>
        <div className="statistics-drawer-body">{children}</div>
      </section>
    </div>
  );
  return typeof document === "undefined"
    ? content
    : createPortal(content, document.body);
}
