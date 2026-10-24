import { useEffect, useId, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { arrangementParticipantModel } from "./arrangementParticipantRules.js";

function ClassCheckbox({ partial, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial;
  }, [partial]);
  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      aria-checked={partial ? "mixed" : props.checked}
    />
  );
}

export function ArrangementStudentPicker({
  students,
  classes,
  selectedIds,
  onSelectionChange,
  Pagination,
}) {
  const pickerId = useId();
  const [method, setMethod] = useState("classes");
  const [classQuery, setClassQuery] = useState("");
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(10);
  const [studentQuery, setStudentQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);
  const model = arrangementParticipantModel({
    students,
    classes,
    selectedIds,
    classQuery,
    classPage,
    classPageSize,
    studentQuery,
    classId,
    onlySelected,
    studentPage,
    studentPageSize,
  });
  const page = model.studentPage;
  const canAddPage = page.rows.some(
    (student) => !student.selected && student.status === "启用",
  );
  const canRemovePage = page.rows.some((student) => student.selected);
  return (
    <section className="participant-picker" aria-label="选择参与学生">
      <h2 aria-live="polite">参与学生 · 已选 {model.selectedCount} 人</h2>
      <p className="hint">
        可先选择班级，再切换到学生列表补选或取消个别学生。自动去重，切换、搜索和翻页不清除选择。
      </p>
      <div
        className="tabs participant-picker__tabs"
        role="tablist"
        aria-label="参与学生选择方式"
      >
        {[
          ["classes", "按班级批量选择"],
          ["students", "按学生选择"],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`${pickerId}-tab-${id}`}
            type="button"
            role="tab"
            className={method === id ? "active" : undefined}
            aria-selected={method === id}
            aria-controls={`${pickerId}-panel-${id}`}
            tabIndex={method === id ? 0 : -1}
            onClick={() => setMethod(id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "classes"
                  : event.key === "End"
                    ? "students"
                    : id === "classes"
                      ? "students"
                      : "classes";
              setMethod(next);
              document.getElementById(`${pickerId}-tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        className="participant-picker__section"
        aria-label="按班级批量选择"
        role="tabpanel"
        id={`${pickerId}-panel-classes`}
        aria-labelledby={`${pickerId}-tab-classes`}
        hidden={method !== "classes"}
      >
        <div className="list-toolbar participant-picker__toolbar">
          <div className="search">
            <SearchOutlined aria-hidden="true" />
            <input
              aria-label="搜索班级名称或编号"
              placeholder="搜索班级名称、编号"
              value={classQuery}
              onChange={(event) => {
                setClassQuery(event.target.value);
                setClassPage(1);
              }}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table aria-label="参与班级列表">
            <thead>
              <tr>
                <th>选择</th>
                <th>班级</th>
                <th>可选学生</th>
                <th>已选学生</th>
              </tr>
            </thead>
            <tbody>
              {model.classPage.rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <ClassCheckbox
                      aria-label={`选择班级：${item.name}`}
                      checked={item.checked}
                      partial={item.partial}
                      disabled={item.disabled}
                      onChange={(event) =>
                        onSelectionChange(item.memberIds, event.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.code || "未记录班级编号"}</small>
                  </td>
                  <td>
                    {item.eligibleCount} 人
                    {!item.eligibleCount && <small>暂无启用学生</small>}
                  </td>
                  <td>{item.selectedCount} 人</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!model.classPage.total && (
            <p className="participant-picker__empty">没有符合条件的班级。</p>
          )}
        </div>
        <Pagination
          total={model.classPage.total}
          page={model.classPage.page}
          pageSize={model.classPage.pageSize}
          onPageChange={setClassPage}
          onPageSizeChange={(size) => {
            setClassPageSize(size);
            setClassPage(1);
          }}
        />
      </section>
      <section
        className="participant-picker__section"
        aria-label="按学生选择"
        role="tabpanel"
        id={`${pickerId}-panel-students`}
        aria-labelledby={`${pickerId}-tab-students`}
        hidden={method !== "students"}
      >
        <div className="list-toolbar participant-picker__toolbar">
          <div className="search">
            <SearchOutlined aria-hidden="true" />
            <input
              aria-label="搜索学生姓名或学号"
              placeholder="搜索学生姓名、学号"
              value={studentQuery}
              onChange={(event) => {
                setStudentQuery(event.target.value);
                setStudentPage(1);
              }}
            />
          </div>
          <select
            aria-label="筛选学生班级"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setStudentPage(1);
            }}
          >
            <option value="">全部班级</option>
            {model.classOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            aria-label="筛选已选学生"
            value={onlySelected ? "selected" : "all"}
            onChange={(event) => {
              setOnlySelected(event.target.value === "selected");
              setStudentPage(1);
            }}
          >
            <option value="all">全部可选与已选</option>
            <option value="selected">仅看已选</option>
          </select>
        </div>
        <div className="participant-picker__actions">
          <button
            className="button"
            type="button"
            disabled={!canAddPage}
            onClick={() =>
              onSelectionChange(
                page.rows.map((student) => student.id),
                true,
              )
            }
          >
            选中本页
          </button>
          <button
            className="button"
            type="button"
            disabled={!canRemovePage}
            onClick={() =>
              onSelectionChange(
                page.rows.map((student) => student.id),
                false,
              )
            }
          >
            取消本页
          </button>
          <button
            className="button"
            type="button"
            disabled={!model.selectedCount}
            onClick={() => onSelectionChange(model.selectedIds, false)}
          >
            清空已选
          </button>
        </div>
        {model.unavailableSelected > 0 && (
          <p className="participant-picker__warning" role="status">
            已选中 {model.unavailableSelected}{" "}
            名停用或失效学生，请移除后完成配置。可切换“仅看已选”查看。
          </p>
        )}
        <div className="table-wrap">
          <table aria-label="参与学生列表">
            <thead>
              <tr>
                <th>选择</th>
                <th>姓名</th>
                <th>学号</th>
                <th>班级</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((student) => (
                <tr
                  key={student.id}
                  className={
                    student.selected
                      ? "participant-picker__selected"
                      : undefined
                  }
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`选择学生：${student.name} ${student.no || student.id}`}
                      checked={student.selected}
                      disabled={!student.selected && student.status !== "启用"}
                      onChange={(event) =>
                        onSelectionChange([student.id], event.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <strong>{student.name}</strong>
                  </td>
                  <td>{student.no || "未记录"}</td>
                  <td>{student.className}</td>
                  <td>{student.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page.total && (
            <p className="participant-picker__empty">
              没有符合条件的学生，调整搜索或班级筛选即可继续选择。
            </p>
          )}
        </div>
        <Pagination
          total={page.total}
          page={page.page}
          pageSize={page.pageSize}
          onPageChange={setStudentPage}
          onPageSizeChange={(size) => {
            setStudentPageSize(size);
            setStudentPage(1);
          }}
        />
      </section>
      <p className="hint">
        班级批量操作只新增当前启用学生；保存的是本次明确选择的名单，之后班级成员变化不会自动改动本次安排。
      </p>
    </section>
  );
}
