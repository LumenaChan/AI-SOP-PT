import { displayBusinessText } from "./businessTextRules.js";
import { dateTimeInputValue } from "./dateTimeRules.js";
import { useStatisticsNavigate as useNavigate } from "./StatisticsNavigation.jsx";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import { taskOperationId } from "./EvidenceTaskPanels.jsx";
import {
  SUPPORT_TASK_STATUSES,
  supportTaskGradeContext,
  supportTaskSourceContext,
  supportTasksForSession,
  studentSupportTasks,
  candidateSupportResults,
} from "./supportTaskRules.js";
import {
  formalResultRows,
  latestStudentResultRows,
} from "./teacherDashboardMetrics.js";

const button = "button button--default";
const primary = "button button--primary";
function safeContext(data, task) {
  try {
    return supportTaskGradeContext(data, task);
  } catch {
    return null;
  }
}
export function SupportTaskCreate({
  row,
  filters,
  onCreated,
  onCancel,
  initiallyOpen = false,
  onDirtyChange,
}) {
  const store = usePrototypeData(),
    nav = useNavigate();
  const [draft, setDraft] = useState(() => {
      if (!initiallyOpen || !row) return null;
      try {
        return {
          ...supportTaskGradeContext(store.data, row),
          operationId: taskOperationId(),
          filters: filters ? { ...filters } : undefined,
          reason: row.reason || "最近一次有效正式结果低于80分（百分制）",
          studentInstruction: "",
        };
      } catch {
        return null;
      }
    }),
    [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    onDirtyChange?.(
      Boolean(
        draft &&
          (draft.studentInstruction ||
            draft.reason !==
              (row?.reason || "最近一次有效正式结果低于80分（百分制）")),
      ),
    );
  }, [draft?.reason, draft?.studentInstruction]);
  if (!row) return null;
  return (
    <div className="support-create">
      {!draft ? (
        <button
          className={button}
          onClick={() => {
            try {
              setDraft({
                ...supportTaskGradeContext(store.data, row),
                operationId: taskOperationId(),
                filters: filters ? { ...filters } : undefined,
                reason: row.reason || "最近一次有效正式结果低于80分（百分制）",
                studentInstruction: "",
              });
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          安排辅导
        </button>
      ) : (
        <form
          className="evidence-task-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy.current) return;
            busy.current = true;
            try {
              const task = store.changeSupportTask({
                ...draft,
                action: "create",
                arrangementId: row.arrangementId,
                sessionId: row.sessionId,
              });
              setDraft(null);
              setError("");
              if (onCreated) onCreated(task);
              else nav(`/teacher/support-tasks/${task.id}`);
            } catch (e) {
              setError(e.message);
            } finally {
              busy.current = false;
            }
          }}
        >
          <h3>安排辅导</h3>
          <p>
            源结果 {row.score}/{row.maxScore} 分
            。已有同一辅导目标的未结任务时会关联原任务。
          </p>
          <label>
            发起原因
            <textarea
              required
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            />
          </label>
          <label>
            学生需要完成的辅导要求
            <textarea
              required
              value={draft.studentInstruction}
              onChange={(e) =>
                setDraft({ ...draft, studentInstruction: e.target.value })
              }
            />
          </label>
          <div className="dashboard-actions">
            <button className={primary} type="submit">
              保存辅导任务
            </button>
            <button
              type="button"
              className={button}
              onClick={() => {
                if (onCancel?.() === false) return;
                setDraft(null);
              }}
            >
              收起
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
    </div>
  );
}

export function SupportTaskPage() {
  const { taskId } = useParams(),
    store = usePrototypeData(),
    nav = useNavigate();
  const task = (store.data.supportTasks || []).find((t) => t.id === taskId);
  return (
    <>
      <div className="page-header">
        <div>
          <h1>学生辅导任务</h1>
          <p>记录指导与复查，保留原成绩事实。</p>
        </div>
        <button className={button} onClick={() => nav("/teacher/dashboard")}>
          返回教师工作台
        </button>
      </div>
      {task ? (
        <SupportTaskDetails key={task.id} task={task} />
      ) : (
        <section className="panel">
          <p>任务不存在或已失效，请返回工作台查看。</p>
        </section>
      )}
    </>
  );
}
function SupportTaskDetails({ task }) {
  const store = usePrototypeData(),
    nav = useNavigate();
  const [context, setContext] = useState(() => safeContext(store.data, task));
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [guidance, setGuidance] = useState({
    performedAt: "",
    performer: store.teacherName,
    process: "",
    outcome: "",
  });
  const [review, setReview] = useState({
    verificationMode: "manual",
    performedAt: "",
    performer: store.teacherName,
    basis: "",
    studentConclusion: "",
  });
  const [refId, setRefId] = useState(""),
    [refContext, setRefContext] = useState(null),
    [reason, setReason] = useState("");
  const ids = useRef({}),
    busy = useRef(false);
  const source = supportTaskSourceContext(store.data, task);
  const references = candidateSupportResults(store.data, task);
  const chosen = references.find(
    (r) => `${r.arrangementId}/${r.sessionId}` === refId,
  );
  const mutable = task.teacherId === store.teacherId && source.available;
  const open = ["pending", "coaching", "awaiting_review"].includes(task.status);
  const act = (action) => {
    if (busy.current || !context) return;
    busy.current = true;
    ids.current[action] ||= taskOperationId();
    try {
      const payload = {
        ...context,
        taskId: task.id,
        action,
        operationId: ids.current[action],
        reason,
      };
      if (action === "record") Object.assign(payload, guidance);
      if (action === "review")
        Object.assign(payload, review, {
          resultRef:
            review.verificationMode === "session_ref" ? refContext : undefined,
        });
      const saved = store.changeSupportTask(payload);
      setContext(safeContext(store.data, saved));
      setError("");
      setMessage("辅导办理记录已保存");
      ids.current = {};
    } catch (e) {
      setError(e.message);
      setMessage("");
    } finally {
      busy.current = false;
    }
  };
  return (
    <section className="evidence-task-details support-task-details">
      <header>
        <h2>
          {task.studentName || task.studentId} ·{" "}
          {SUPPORT_TASK_STATUSES[task.status]}
        </h2>
        <span>{task.id}</span>
      </header>
      <p>
        {task.arrangementName} · {task.sopName || "历史实训标准"}
      </p>
      <dl>
        <div>
          <dt>发起时结果</dt>
          <dd>
            {task.sourceScore}/{task.sourceMaxScore} 分 · 折合{" "}
            {task.sourceNormalizedScore} 分
          </dd>
        </div>
        <div>
          <dt>发起原因</dt>
          <dd>{displayBusinessText(task.reason)}</dd>
        </div>
        <div>
          <dt>学生辅导要求</dt>
          <dd>{task.studentInstruction}</dd>
        </div>
        <div>
          <dt>负责教师</dt>
          <dd>{task.teacherName || "王老师"}</dd>
        </div>
      </dl>
      {source.available ? (
        <button className={button} onClick={() => nav(source.reportPath)}>
          查看源结果报告
        </button>
      ) : (
        <p className="hint">源结果已失效，仅保留历史记录。</p>
      )}
      {source.changed && (
        <p className="hint">
          源结果已更新，当前为 {source.score ?? "待核定"} 分
          ；发起时的辅导依据仍保留。
        </p>
      )}
      <p className="hint">
        完成辅导会关闭待办，原成绩和低分记录保持原有事实；后续正式练习由现有练习流程安排。
      </p>
      {mutable && open && (
        <button
          className={button}
          onClick={() => {
            setContext(safeContext(store.data, task));
            ids.current = {};
            setError("");
          }}
        >
          刷新办理状态
        </button>
      )}
      {context?.expectedTaskRevision !== task.revision && mutable && open && (
        <p className="form-error">
          任务已更新，请刷新办理状态后再提交；已填写内容保留。
        </p>
      )}
      {mutable && task.status === "pending" && (
        <button className={primary} onClick={() => act("start")}>
          开始辅导
        </button>
      )}
      {mutable && ["coaching", "awaiting_review"].includes(task.status) && (
        <form
          className="evidence-task-form"
          onSubmit={(e) => {
            e.preventDefault();
            act("record");
          }}
        >
          <h3>登记指导内容</h3>
          <label>
            指导时间
            <input
              required
              type="datetime-local"
              step="1"
              value={dateTimeInputValue(guidance.performedAt)}
              onChange={(e) =>
                setGuidance({ ...guidance, performedAt: e.target.value })
              }
            />
          </label>
          <label>
            指导教师
            <input
              required
              value={guidance.performer}
              onChange={(e) =>
                setGuidance({ ...guidance, performer: e.target.value })
              }
            />
          </label>
          <label>
            指导过程
            <textarea
              required
              value={guidance.process}
              onChange={(e) =>
                setGuidance({ ...guidance, process: e.target.value })
              }
            />
          </label>
          <label>
            指导情况
            <textarea
              required
              value={guidance.outcome}
              onChange={(e) =>
                setGuidance({ ...guidance, outcome: e.target.value })
              }
            />
          </label>
          <button className={primary} type="submit">
            保存指导记录并待复查
          </button>
        </form>
      )}
      {mutable && task.status === "awaiting_review" && (
        <form
          className="evidence-task-form"
          onSubmit={(e) => {
            e.preventDefault();
            act("review");
          }}
        >
          <h3>复查并完成辅导</h3>
          <label>
            复查依据
            <select
              value={review.verificationMode}
              onChange={(e) =>
                setReview({ ...review, verificationMode: e.target.value })
              }
            >
              <option value="manual">教师线下核验</option>
              <option value="session_ref">关联后续正式练习结果</option>
            </select>
          </label>
          {review.verificationMode === "session_ref" && (
            <label>
              后续练习结果
              <select
                required
                value={refId}
                onChange={(e) => {
                  setRefId(e.target.value);
                  const captured = references.find(
                    (r) =>
                      `${r.arrangementId}/${r.sessionId}` === e.target.value,
                  );
                  setRefContext(
                    captured
                      ? {
                          arrangementId: captured.arrangementId,
                          sessionId: captured.sessionId,
                          expectedState: captured.gradeState,
                        }
                      : null,
                  );
                }}
              >
                <option value="">
                  请选择同一学生、同实训标准且评分依据一致的后续有效练习
                </option>
                {references.map((r) => (
                  <option
                    key={`${r.arrangementId}/${r.sessionId}`}
                    value={`${r.arrangementId}/${r.sessionId}`}
                  >
                    {r.arrangement.name} · {r.score}/{r.maxScore} 分
                  </option>
                ))}
              </select>
            </label>
          )}
          {review.verificationMode === "session_ref" &&
            refContext &&
            (!chosen || chosen.gradeState !== refContext.expectedState) && (
              <p className="form-error">
                所选练习结果已修订或不再有效，请重新选择后再提交。
              </p>
            )}
          <label>
            复查时间
            <input
              required
              type="datetime-local"
              step="1"
              value={dateTimeInputValue(review.performedAt)}
              onChange={(e) =>
                setReview({ ...review, performedAt: e.target.value })
              }
            />
          </label>
          <label>
            复查教师
            <input
              required
              value={review.performer}
              onChange={(e) =>
                setReview({ ...review, performer: e.target.value })
              }
            />
          </label>
          <label>
            核验依据
            <textarea
              required
              value={review.basis}
              onChange={(e) => setReview({ ...review, basis: e.target.value })}
            />
          </label>
          <label>
            给学生的复查结论
            <textarea
              required
              value={review.studentConclusion}
              onChange={(e) =>
                setReview({ ...review, studentConclusion: e.target.value })
              }
            />
          </label>
          <button className={primary} type="submit">
            确认完成辅导
          </button>
        </form>
      )}
      {mutable && open && (
        <details>
          <summary>取消辅导任务</summary>
          <label>
            取消原因
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className={button} onClick={() => act("cancel")}>
            确认取消
          </button>
        </details>
      )}
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
      {message && <p role="status">{displayBusinessText(message)}</p>}
      <section>
        <h3>指导记录</h3>
        {!(task.guidanceRecords || []).length && (
          <p className="hint">尚未登记指导内容。</p>
        )}
        {(task.guidanceRecords || []).map((r, i) => (
          <article className="support-history" key={r.id || i}>
            <p>
              {displayBusinessText(r.performedAt)} · {r.performer}
            </p>
            <p>{r.process}</p>
            <p>{r.outcome}</p>
          </article>
        ))}
      </section>
      {task.verification && (
        <section>
          <h3>复查记录</h3>
          <p>
            {task.verification.verificationMode === "session_ref"
              ? "后续正式练习结果"
              : "教师线下核验"}{" "}
            · {displayBusinessText(task.verification.performedAt)} ·{" "}
            {task.verification.performer}
          </p>
          <p>{task.verification.basis}</p>
          <p>{task.verification.studentConclusion}</p>
          {task.verification.resultRef && (
            <button
              className={button}
              onClick={() => {
                const r = task.verification.resultRef;
                nav(
                  `/teacher/practices/${r.arrangementId}/students/${task.studentId}?sessionId=${r.sessionId}`,
                );
              }}
            >
              查看关联练习结果
            </button>
          )}
        </section>
      )}
      <details>
        <summary>办理历史 · {(task.history || []).length} 条</summary>
        {(task.history || []).map((h, i) => (
          <p key={h.id || i}>
            {displayBusinessText(h.at)} ·{" "}
            {{
              create: "发起",
              start: "开始辅导",
              record: "登记指导",
              review: "复查完成",
              cancel: "取消",
            }[h.action] || h.action}{" "}
            · {h.actorName || h.actorId} {h.note || h.reason || ""}
          </p>
        ))}
      </details>
    </section>
  );
}

export function SupportTaskSourcePanel({
  arrangement,
  session,
  readOnly = false,
}) {
  const store = usePrototypeData(),
    nav = useNavigate();
  const tasks = supportTasksForSession(store.data, session.id, arrangement.id);
  const source = formalResultRows(store.data, {
    teacherId: store.teacherId,
    studentId: session.studentId,
  }).find(
    (r) => r.arrangementId === arrangement.id && r.sessionId === session.id,
  );
  const candidate = source
    ? latestStudentResultRows(store.data, {
        teacherId: store.teacherId,
        studentId: source.studentId,
        sopId: source.sopId,
        standardBasisKey: source.standardBasisKey,
        type: source.type,
      }).find(
        (r) =>
          r.arrangementId === source.arrangementId &&
          r.sessionId === source.sessionId &&
          r.normalizedScore < 80,
      )
    : null;
  if (!tasks.length && (!candidate || readOnly)) return null;
  return (
    <section className="evidence-task-session">
      <h3>学生辅导</h3>
      {tasks.map((t) => (
        <p key={t.id}>
          {SUPPORT_TASK_STATUSES[t.status]} · {t.studentInstruction}
          {!readOnly && (
            <button
              className={button}
              onClick={() => nav(`/teacher/support-tasks/${t.id}`)}
            >
              查看辅导任务
            </button>
          )}
        </p>
      ))}
      {!readOnly && candidate && <SupportTaskCreate row={candidate} />}
    </section>
  );
}
export function StudentSupportTaskList({
  studentId,
  arrangementId,
  sessionId,
}) {
  const store = usePrototypeData();
  const tasks = studentSupportTasks(store.data, studentId, {
    arrangementId,
    sessionId,
  });
  if (!tasks.length) return null;
  return (
    <section className="student-evidence-tasks">
      <h2>辅导任务与记录</h2>
      {tasks.map((t) => (
        <article key={t.id}>
          <h3>{SUPPORT_TASK_STATUSES[t.status]}</h3>
          <p>{t.studentInstruction}</p>
          <p>负责教师：{t.teacherName || "教师"}</p>
          {t.studentConclusion && <p>复查结论：{t.studentConclusion}</p>}
          {!t.sourceResultVisible && (
            <p>考试结果尚未发布，请按教师要求参加辅导。</p>
          )}
          <p>最近更新：{displayBusinessText(t.updatedAt || t.createdAt)}</p>
        </article>
      ))}
    </section>
  );
}
