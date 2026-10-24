import { displayBusinessText } from "./businessTextRules.js";
import { dateTimeInputValue } from "./dateTimeRules.js";
import { useStatisticsNavigate as useNavigate } from "./StatisticsNavigation.jsx";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { usePrototypeData } from "./prototypeData.jsx";
import {
  evidenceTaskGradeContext,
  evidenceTasksForSession,
  studentEvidenceTasks,
} from "./evidenceTaskRules.js";

export const EVIDENCE_TASK_LABELS = {
  pending: "待办理",
  handling: "办理中",
  awaiting_confirmation: "待教师确认",
  completed: "已完成",
  cancelled: "已取消",
};
function safeGradeContext(data, task) {
  try {
    return evidenceTaskGradeContext(data, task);
  } catch {
    return null;
  }
}
export const taskOperationId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const kindLabel = (kind) => (kind === "retest" ? "补测" : "补充证据");
export function EvidenceTaskDetails({ task, readOnly = false }) {
  const store = usePrototypeData(),
    nav = useNavigate();
  const [context, setContext] = useState(() =>
    safeGradeContext(store.data, task),
  );
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [registration, setRegistration] = useState(() => ({
    ...task.registration,
    performedAt: task.registration?.performedAt || "",
    performer: task.registration?.performer || "王老师",
    verificationMode: task.registration?.verificationMode || "manual",
  }));
  const [score, setScore] = useState(""),
    [reason, setReason] = useState(""),
    [studentConclusion, setStudentConclusion] = useState("");
  const [refSession, setRefSession] = useState(""),
    [refStep, setRefStep] = useState("");
  const operationIds = useRef({}),
    busy = useRef(false);
  useEffect(() => {
    if (!context) setContext(safeGradeContext(store.data, task));
  }, [context, store.data, task]);
  const arrangement = store.data.arrangements.find(
    (a) => a.id === task.arrangementId,
  );
  const session = arrangement?.sessions.find((s) => s.id === task.sessionId);
  const step = session?.steps.find((s) => s.id === task.stepId);
  const frozen =
    arrangement?.status === "已发布" ||
    session?.resultStatus === "已发布" ||
    session?.scoreFrozen;
  const mutable = !readOnly && task.teacherId === "t1" && Boolean(step);
  const references = store.data.arrangements.flatMap((a) =>
    (a.sessions || [])
      .filter((s) => s.studentId === task.studentId)
      .map((s) => ({ arrangement: a, session: s })),
  );
  const chosen = references.find((r) => r.session.id === refSession);
  const act = (action) => {
    if (busy.current || !context) return;
    busy.current = true;
    operationIds.current[action] ||= taskOperationId();
    try {
      const payload = {
        action,
        taskId: task.id,
        ...context,
        operationId: operationIds.current[action],
        actorId: "t1",
        reason,
        studentConclusion,
        score: score === "" ? undefined : score,
      };
      if (action === "register")
        Object.assign(payload, registration, {
          evidenceRefs:
            registration.verificationMode === "session_ref" && chosen && refStep
              ? [
                  {
                    arrangementId: chosen.arrangement.id,
                    sessionId: refSession,
                    stepId: refStep,
                  },
                ]
              : [],
        });
      store.changeEvidenceTask(payload);
      setError("");
      setMessage("办理记录已保存");
      setContext(null);
      operationIds.current = {};
    } catch (e) {
      setError(e.message);
      setMessage("");
    } finally {
      busy.current = false;
    }
  };
  return (
    <section className="evidence-task-details">
      <header>
        <h2>
          {kindLabel(task.kind)}任务 · {EVIDENCE_TASK_LABELS[task.status]}
        </h2>
        <span>{task.id}</span>
      </header>
      <p>
        {arrangement?.name} ·{" "}
        {store.data.students.find((s) => s.id === task.studentId)?.name ||
          task.studentId}{" "}
        · {step?.name || task.stepId}
      </p>
      {!step && (
        <p className="hint">
          原会话或步骤已失效，仅保留办理历史。{task.cancelReason}
        </p>
      )}
      <dl>
        <div>
          <dt>发起原因</dt>
          <dd>{displayBusinessText(task.reason)}</dd>
        </div>
        <div>
          <dt>学生办理要求</dt>
          <dd>{task.studentInstruction}</dd>
        </div>
        <div>
          <dt>负责教师</dt>
          <dd>{task.teacherName || "王老师"}</dd>
        </div>
      </dl>
      <button
        className="button button--default"
        onClick={() =>
          nav(
            `/${readOnly ? "admin" : "teacher"}/${arrangement?.type === "exam" ? "exams" : "practices"}/${task.arrangementId}/students/${task.studentId}?sessionId=${task.sessionId}&stepId=${encodeURIComponent(task.stepId)}`,
          )
        }
      >
        查看原步骤报告
      </button>
      {context && context.expectedTaskRevision !== task.revision && (
        <p className="form-error">
          任务已更新，请刷新办理状态后再提交，已填写内容保留。
        </p>
      )}
      {mutable && (
        <button
          className="button button--default"
          onClick={() => {
            setContext(safeGradeContext(store.data, task));
            operationIds.current = {};
            setError("");
          }}
        >
          刷新办理状态
        </button>
      )}
      {frozen && (
        <p className="hint">
          成绩已发布，已有任务保留处理记录。如需更正当前成绩，请进入报告修改。
        </p>
      )}
      {mutable && !frozen && task.status === "pending" && (
        <button
          className="button button--primary"
          onClick={() => act("accept")}
        >
          接手办理
        </button>
      )}
      {mutable && !frozen && task.status === "handling" && (
        <div className="evidence-task-form">
          <h3>登记线下办理过程</h3>
          <label>
            线下办理时间
            <input
              type="datetime-local"
              step="1"
              value={dateTimeInputValue(registration.performedAt)}
              onChange={(e) =>
                setRegistration({
                  ...registration,
                  performedAt: e.target.value,
                })
              }
            />
          </label>
          {["performer", "process", "outcome", "basis"].map((field, i) => (
            <label key={field}>
              {["核验教师", "办理过程", "现场结果", "现场核验依据"][i]}
              {field === "performer" ? (
                <input
                  value={registration[field] || ""}
                  onChange={(e) =>
                    setRegistration({
                      ...registration,
                      [field]: e.target.value,
                    })
                  }
                />
              ) : (
                <textarea
                  value={registration[field] || ""}
                  onChange={(e) =>
                    setRegistration({
                      ...registration,
                      [field]: e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
          <label>
            依据类型
            <select
              value={registration.verificationMode}
              onChange={(e) =>
                setRegistration({
                  ...registration,
                  verificationMode: e.target.value,
                })
              }
            >
              <option value="manual">教师现场核验（无视频附件）</option>
              <option value="session_ref">引用已有会话步骤记录</option>
            </select>
          </label>
          {registration.verificationMode === "session_ref" && (
            <>
              <label>
                本人已有会话
                <select
                  value={refSession}
                  onChange={(e) => {
                    setRefSession(e.target.value);
                    setRefStep("");
                  }}
                >
                  <option value="">选择会话</option>
                  {references.map((r) => (
                    <option key={r.session.id} value={r.session.id}>
                      {r.arrangement.name} · {r.session.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                引用步骤
                <select
                  value={refStep}
                  onChange={(e) => setRefStep(e.target.value)}
                >
                  <option value="">选择步骤</option>
                  {chosen?.session.steps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} · {s.name} · {s.timeRange || "无片段"}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <p className="hint">
            引用记录不代表已上传视频；无可用视频时请登记人工现场核验依据。
          </p>
          <button
            className="button button--primary"
            onClick={() => act("register")}
          >
            保存登记并提交教师确认
          </button>
        </div>
      )}
      {task.registration && (
        <details open>
          <summary>已登记的线下依据</summary>
          <dl>
            {[
              "performedAt",
              "performer",
              "process",
              "outcome",
              "basis",
              "verificationMode",
            ].map((field, i) => (
              <div key={field}>
                <dt>
                  {
                    [
                      "办理时间",
                      "核验教师",
                      "办理过程",
                      "现场结果",
                      "核验依据",
                      "依据类型",
                    ][i]
                  }
                </dt>
                <dd>
                  {field === "verificationMode"
                    ? task.registration[field] === "manual"
                      ? "教师现场核验"
                      : "已有会话步骤记录"
                    : displayBusinessText(task.registration[field])}
                </dd>
              </div>
            ))}
          </dl>
          {task.registration.evidenceRefs?.map((ref, i) => (
            <p key={i}>
              {ref.arrangementId} / {ref.sessionId} / {ref.stepId}
              {ref.clipRange ? " / " + ref.clipRange : ""}
              <button
                className="button button--default"
                onClick={() => {
                  const source = store.data.arrangements.find(
                    (a) => a.id === ref.arrangementId,
                  );
                  nav(
                    `/${readOnly ? "admin" : "teacher"}/${source?.type === "exam" ? "exams" : "practices"}/${ref.arrangementId}/students/${task.studentId}?sessionId=${ref.sessionId}&stepId=${encodeURIComponent(ref.stepId)}`,
                  );
                }}
              >
                查看引用记录
              </button>
            </p>
          ))}
        </details>
      )}
      {mutable && !frozen && task.status === "awaiting_confirmation" && (
        <div className="evidence-task-form">
          <h3>教师确认结果并回写原成绩</h3>
          <p>
            当前步骤有效分 {step?.effectiveScore ?? step?.score} /{" "}
            {step?.maxScore}。
          </p>
          <label>
            确认后的步骤有效分
            <input
              type="number"
              min="0"
              max={step?.maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </label>
          <label>
            成绩确认依据
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label>
            学生可见结论
            <textarea
              value={studentConclusion}
              onChange={(e) => setStudentConclusion(e.target.value)}
              placeholder="说明本次办理结论；未发布考试将按保密规则隐藏评价结论"
            />
          </label>
          <p className="hint">
            保存后直接更新当前成绩；人工核验不写成AI确认，不创建录像附件。
          </p>
          <button
            className="button button--primary"
            onClick={() => act("confirm")}
          >
            确认办理完成并更新原记录
          </button>
        </div>
      )}
      {mutable &&
        ["pending", "handling", "awaiting_confirmation"].includes(
          task.status,
        ) && (
          <details>
            <summary>取消此任务</summary>
            <label>
              取消原因
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="取消不改写已有有效分，不把缺少证据视为学生错误"
              />
            </label>
            <button
              className="button button--danger"
              onClick={() => act("cancel")}
            >
              记录原因并取消
            </button>
          </details>
        )}
      {task.confirmation && (
        <p>
          <strong>完成结论：</strong>
          {task.confirmation.studentConclusion}
        </p>
      )}
      {task.status === "cancelled" && (
        <p>
          取消原因：
          {displayBusinessText(
            task.cancelReason || task.cancellation?.reason || task.closeReason,
          )}
        </p>
      )}
      <details>
        <summary>办理历史 · {(task.history || []).length} 条</summary>
        {task.history?.map((h, i) => (
          <p key={i}>
            {displayBusinessText(h.at)} · {h.actorId} ·{" "}
            {{
              create: "发起任务",
              accept: "接手办理",
              register: "登记依据",
              confirm: "确认完成",
              cancel: "取消任务",
            }[h.action] || h.action}{" "}
            · {displayBusinessText(h.note)}
          </p>
        ))}
      </details>
      {error && (
        <p className="form-error" role="alert">
          {displayBusinessText(error)}
        </p>
      )}
      {message && <p role="status">{displayBusinessText(message)}</p>}
    </section>
  );
}
export function EvidenceTaskSessionPanel({
  session,
  arrangement,
  readOnly = false,
}) {
  const store = usePrototypeData(),
    nav = useNavigate();
  const tasks = evidenceTasksForSession(store.data, session.id, arrangement.id);
  if (!tasks.length) return null;
  return (
    <section className="evidence-task-session">
      <h3>补证与补测任务</h3>
      {tasks.map((task) => (
        <details
          key={task.id}
          open={task.status !== "completed" && task.status !== "cancelled"}
        >
          <summary>
            {kindLabel(task.kind)} · {EVIDENCE_TASK_LABELS[task.status]} ·{" "}
            {task.stepId}
          </summary>
          {readOnly ? (
            <EvidenceTaskDetails task={task} readOnly />
          ) : (
            <>
              <p>{task.studentInstruction}</p>
              <button
                className="button button--primary"
                onClick={() => nav(`/teacher/evidence-tasks/${task.id}`)}
              >
                查看与办理任务
              </button>
            </>
          )}
        </details>
      ))}
    </section>
  );
}
export function StudentEvidenceTaskList({
  studentId,
  sessionId = "",
  arrangementId = "",
}) {
  const store = usePrototypeData();
  const tasks = studentEvidenceTasks(store.data, studentId, {
    ...(sessionId ? { sessionId } : {}),
    ...(arrangementId ? { arrangementId } : {}),
  });
  if (!tasks.length) return null;
  return (
    <section className="student-evidence-tasks">
      <h2>补证与补测办理</h2>
      {tasks.map((task) => (
        <article key={task.id}>
          <h3>
            {kindLabel(task.kind)} · {EVIDENCE_TASK_LABELS[task.status]}
          </h3>
          <p>{task.studentInstruction}</p>
          <p>
            负责教师：{task.teacherName || "教师"} · 发起时间：
            {displayBusinessText(task.createdAt)}
          </p>
          {task.studentConclusion && <p>办理结论：{task.studentConclusion}</p>}
          {task.status === "completed" && !task.studentConclusion && (
            <p>办理已完成，请等待教师统一发布结果。</p>
          )}
          {task.status === "cancelled" && (
            <p>任务已取消，请按教师现场安排操作。</p>
          )}
        </article>
      ))}
    </section>
  );
}
export function EvidenceTaskPage() {
  const { taskId } = useParams(),
    store = usePrototypeData(),
    nav = useNavigate();
  const task = store.data.evidenceTasks?.find(
    (t) => t.id === taskId && t.teacherId === "t1",
  );
  return (
    <>
      <button
        className="button button--default"
        onClick={() => nav("/teacher/dashboard")}
      >
        返回教师工作台
      </button>
      {task ? (
        <EvidenceTaskDetails key={task.id} task={task} />
      ) : (
        <section className="panel">
          <h2>任务不存在或不属于当前教师</h2>
        </section>
      )}
    </>
  );
}
