import { displayBusinessText, displayStepLabel } from "./businessTextRules.js";
import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { usePrototypeData } from "./prototypeData.jsx";
import {
  sessionHelpRequests,
  OPEN_HELP,
  HELP_LABELS,
  progressionBlocker,
  stepFlowLabel,
} from "./sessionClosureRules.js";

export function HelpLifecycle({
  arrangement,
  session,
  studentMode = false,
  onRequest,
}) {
  const location = useLocation();
  useEffect(() => {
    if (location.hash.startsWith("#help-"))
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView({ block: "center" });
  }, [location.hash, session.id]);
  const store = usePrototypeData();
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const busy = useRef(false);
  const requests = sessionHelpRequests(session, arrangement);
  const open = requests.find((r) => OPEN_HELP.includes(r.status));
  const terminal =
    ["已取消", "已结束", "待发布", "已发布", "已归档"].includes(
      arrangement.status,
    ) || ["已完成", "待复位", "已复位", "已取消"].includes(session.status);
  const act = (action, r) => {
    if (busy.current) return;
    busy.current = true;
    try {
      store.changeSessionClosure({
        arrangementId: arrangement.id,
        sessionId: session.id,
        requestId: r.id,
        action,
        actor: studentMode ? "student" : "teacher",
        actorId: studentMode ? session.studentId : store.teacherId,
        note: notes[r.id] || "",
      });
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      busy.current = false;
    }
  };
  return (
    <section
      className={`session-closure-panel ${studentMode ? "session-closure-panel--student" : ""}`}
      aria-label="教师求助办理"
    >
      <h3>{studentMode ? "教师帮助与回执" : "学生求助办理"}</h3>
      {!requests.length && <p>暂无求助记录</p>}
      {requests.map((r, index) => (
        <details
          id={`help-${r.id}`}
          key={r.id}
          open={Boolean(OPEN_HELP.includes(r.status) || index === 0)}
        >
          <summary>
            {HELP_LABELS[r.status] || r.status} · {r.reasonLabel}
          </summary>
          <p>{r.note || "未附加说明"}</p>
          <small>
            提交：{displayBusinessText(r.createdAt)} · {r.stepId || "会话"}
          </small>
          {r.acceptedAt && (
            <p>教师已接手：{displayBusinessText(r.acceptedAt)}</p>
          )}
          {r.receipt && (
            <p>
              <strong>教师回执：</strong>
              {r.receipt}
            </p>
          )}
          {r.closedAt && (
            <small>
              {displayBusinessText(r.closeReason)} ·{" "}
              {displayBusinessText(r.closedAt)}
            </small>
          )}
          {!terminal && !studentMode && r.status === "pending" && (
            <button
              className="button button--primary"
              onClick={() => act("accept_help", r)}
            >
              接手处理
            </button>
          )}
          {!terminal && !studentMode && r.status === "handling" && (
            <div className="closure-receipt">
              <label>
                处理说明（学生可见）
                <textarea
                  value={notes[r.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [r.id]: e.target.value })
                  }
                  placeholder="说明已提供的指导或处理结果；不填写考试答案"
                />
              </label>
              <button
                className="button button--primary"
                onClick={() => act("complete_help", r)}
              >
                处理完成并发送回执
              </button>
            </div>
          )}
          {!terminal && studentMode && r.status === "pending" && (
            <button
              className="button button--default"
              onClick={() => act("cancel_help", r)}
            >
              撤销本次求助
            </button>
          )}
        </details>
      ))}
      {studentMode && !terminal && onRequest && (
        <button
          className="button button--default"
          disabled={Boolean(open)}
          onClick={onRequest}
        >
          {open
            ? HELP_LABELS[open.status]
            : arrangement.type === "exam"
              ? "考试异常求助"
              : "请求教师帮助"}
        </button>
      )}
      {error && (
        <p role="alert" className="form-error">
          {displayBusinessText(error)}
        </p>
      )}
    </section>
  );
}
export function StepProgression({ arrangement, session, studentMode = false }) {
  const store = usePrototypeData();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const step = session.steps?.find((s) => s.id === session.currentStepId);
  const allFlowDone =
    Boolean(session.steps?.length) &&
    session.steps.every(
      (s) =>
        s.flowCompletion || s.state === "pass" || s.completionSource === "ai",
    );
  const blocker = progressionBlocker(arrangement, session);
  const pending =
    session.stepConfirmation?.status === "pending" &&
    session.stepConfirmation.stepId === step?.id;
  const exam = arrangement.type === "exam";
  const act = () => {
    if (busy.current) return;
    busy.current = true;
    try {
      store.changeSessionClosure({
        arrangementId: arrangement.id,
        sessionId: session.id,
        stepId: step.id,
        action: studentMode ? "submit_step" : "confirm_step",
        actor: studentMode ? "student" : "teacher",
        actorId: studentMode ? session.studentId : store.teacherId,
        note,
      });
      setNote("");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      busy.current = false;
    }
  };
  return (
    <section
      className={`session-closure-panel ${studentMode ? "session-closure-panel--student" : ""}`}
      aria-label="步骤流程确认"
      id={`step-confirmation-${encodeURIComponent(session.stepConfirmation?.id || session.currentStepId)}`}
    >
      <h3>步骤流程确认</h3>
      <p>
        {allFlowDone
          ? session.status === "进行中"
            ? "全部步骤流程已走完，可结束本次操作。"
            : "全部步骤流程已走完，确认记录已保留。"
          : step
            ? `当前：${displayStepLabel(step.id)} · ${step.name}`
            : ["待开始", "可入场"].includes(session.status)
              ? "会话尚未开始，开始后可确认本步流程。"
              : "当前无可推进步骤，请核对会话状态或查看已保存的结果。"}
      </p>
      {studentMode && exam ? (
        <p>请独立完成操作；需要人工推进时由教师确认。此处不展示评价结果。</p>
      ) : (
        <p>流程确认记录本步已操作；AI证据和成绩单独记录。</p>
      )}
      {pending && <p>本步已提交，等待教师确认。</p>}
      {blocker && <p>{blocker}</p>}
      {!studentMode && step && (
        <label>
          流程确认说明
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="说明现场确认的流程事实，不将人工推进作为AI证据"
          />
        </label>
      )}
      {step && !(studentMode && exam) && (
        <button
          className="button button--primary"
          disabled={Boolean(
            blocker ||
              step.flowCompletion ||
              step.completionSource === "ai" ||
              (studentMode && pending),
          )}
          onClick={act}
        >
          {studentMode
            ? "本步操作完成"
            : pending
              ? "确认本步流程并推进"
              : "人工确认本步流程"}
        </button>
      )}
      {error && (
        <p role="alert" className="form-error">
          {displayBusinessText(error)}
        </p>
      )}
    </section>
  );
}
export function StepFlowRecord({ step }) {
  return (
    <p className="step-flow-record">
      {stepFlowLabel(step)}
      {step.flowCompletion && (
        <>
          {" "}
          · {displayBusinessText(step.flowCompletion.at)}
          <br />
          {displayBusinessText(step.flowCompletion.note)}
        </>
      )}
    </p>
  );
}
