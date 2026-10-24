import { LeftOutlined, RightOutlined } from "@ant-design/icons";

export function DashboardCardPager({ page, totalPages, onChange }) {
  return (
    <span className="dashboard-card-pager">
      <button
        type="button"
        aria-label="上一页"
        title="上一页"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <LeftOutlined />
      </button>
      <button
        type="button"
        aria-label="下一页"
        title="下一页"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        <RightOutlined />
      </button>
    </span>
  );
}
