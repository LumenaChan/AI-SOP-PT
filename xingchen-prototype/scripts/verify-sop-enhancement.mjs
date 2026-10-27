import { createServer } from "vite";
import { createServer as createHttpServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import React from "react";
import { renderToString } from "react-dom/server";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "package.json"));
const routerDomRoot = dirname(require.resolve("react-router-dom/package.json"));
const routerRequire = createRequire(resolve(routerDomRoot, "package.json"));
const routerRoot = dirname(routerRequire.resolve("react-router/package.json"));
const routerDomEntry = resolve(routerDomRoot, "dist/index.mjs");
// SSR must not replace the running preview server's optimized dependency cache.
const cacheDir = mkdtempSync(resolve(tmpdir(), "sop-page-verification-"));
const hmr = createHttpServer();
const server = await createServer({
  root,
  plugins: [{
    name: "validation-tab-state-test",
    enforce: "pre",
    transform(code, id) {
      if (id.split("?")[0] !== resolve(root, "src/FieldValidationPanels.jsx")) return;
      return { code: code.replace("useEffect, useState", "useEffect, useState as originalUseState") + "\nfunction useState(initial) { return globalThis.__validationTabState ? globalThis.__validationTabState(initial) : originalUseState(initial); }", map: null };
    },
  }],
  cacheDir,
  appType: "custom",
  logLevel: "error",
  resolve: {
    alias: [
      { find: "react-router-dom", replacement: routerDomEntry },
      {
        find: /^react-router$/,
        replacement: resolve(routerRoot, "dist/development/index.mjs"),
      },
      {
        find: "react-router/dom",
        replacement: resolve(routerRoot, "dist/development/dom-export.mjs"),
      },
    ],
  },
  server: {
    middlewareMode: true,
    hmr: { server: hmr },
    warmup: { clientFiles: [] },
  },
  optimizeDeps: { noDiscovery: true, include: [] },
  ssr: { noExternal: ["react-router-dom", "react-router"] },
});
try {
  const { MemoryRouter } = await server.ssrLoadModule(routerDomEntry);
  const { PrototypeDataProvider, normalizePrototypeData } =
    await server.ssrLoadModule("/src/prototypeData.jsx");
  const {
    RoutedApp,
    AiConfigStepCard,
    AiJudgementItemForm,
    StudentHintContent,
    TeacherImportForm,
    AiWorkstationConfigWorkspace,
  } = await server.ssrLoadModule("/src/App.jsx");
  const raw = JSON.parse(
    readFileSync(resolve(root, "src/data/currentPrototypeData.json"), "utf8"),
  );
  const normalized = normalizePrototypeData(structuredClone(raw));
  const { arrangementStatusOptions } = await server.ssrLoadModule(
    "/src/arrangementStatusRules.js",
  );
  const { MonitorListCameras } = await server.ssrLoadModule(
    "/src/MonitorListCameras.jsx",
  );
  const listCameraWorkstation = {
    id: "list-camera-w",
    name: "多视角工位",
    aiBaseConfig: {
      cameras: [
        {
          deviceId: "list-main",
          name: "主视角",
          role: "primary",
          defaultPreview: true,
        },
        { deviceId: "list-aux", name: "辅助视角", role: "auxiliary" },
        { deviceId: "list-third", name: "第三视角", role: "auxiliary" },
      ],
    },
  };
  const listCameraDevices = ["list-main", "list-aux", "list-third"].map(
    (id) => ({
      id,
      workstationId: "list-camera-w",
      status: "在线",
      streamStatus: "可用",
    }),
  );
  for (const status of ["进行中", "故障"]) {
    const html = renderToString(
      React.createElement(MonitorListCameras, {
        workstation: listCameraWorkstation,
        devices: listCameraDevices,
        status,
      }),
    );
    assert.equal((html.match(/<img /g) || []).length, 2);
    assert.ok(
      html.includes('data-camera-id="list-main"') &&
        html.includes('data-camera-id="list-aux"'),
    );
    assert.ok(!html.includes("list-third") && html.includes("非实时视频"));
  }
  listCameraDevices[1].status = "离线";
  const offlineListCameraHtml = renderToString(
    React.createElement(MonitorListCameras, {
      workstation: listCameraWorkstation,
      devices: listCameraDevices,
      status: "已暂停",
    }),
  );
  assert.equal((offlineListCameraHtml.match(/<img /g) || []).length, 1);
  assert.ok(
    offlineListCameraHtml.includes("画面不可用") &&
      !offlineListCameraHtml.includes("list-third"),
  );
  const singleListCameraHtml = renderToString(
    React.createElement(MonitorListCameras, {
      workstation: {
        ...listCameraWorkstation,
        aiBaseConfig: {
          cameras: [listCameraWorkstation.aiBaseConfig.cameras[0]],
        },
      },
      devices: listCameraDevices,
    }),
  );
  assert.equal(
    (singleListCameraHtml.match(/class="station-card__camera-frame"/g) || [])
      .length,
    1,
  );
  console.log("PASS 监控列表最多上下两路画面、单路不复制及离线占位");

  const {
    StationCheckForm,
    OpeningCameraPreview,
    OpeningInspectionResults,
    OpeningInspectionRecord,
  } = await server.ssrLoadModule("/src/OpeningInspection.jsx");
  const { studentRuntimeFixture, createStudentRuntimeStore } = await import(
    "../tests/student-e2e-fixture.mjs"
  );
  const inspectionInput = studentRuntimeFixture();
  const { store: inspectionStore } = createStudentRuntimeStore(inspectionInput);
  const inspectionArrangement = inspectionStore.saveArrangement(
    {
      name: "开放检查SSR",
      type: "practice",
      sopId: inspectionInput.sops[0].id,
      teacherId: "teacher-e2e",
      studentIds: [inspectionInput.students[0].id],
      workstationIds: [inspectionInput.workstations[0].id],
    },
    true,
  );
  const inspect = () =>
    inspectionStore.runWorkstationOpeningCheck(
      inspectionArrangement.id,
      inspectionInput.workstations[0].id,
    );
  const inspectionReport = inspect();
  const pendingInspectionHtml = renderToString(
    React.createElement(StationCheckForm, {
      workstation: inspectionInput.workstations[0],
      readiness: inspectionStore.getWorkstationReadiness(
        inspectionArrangement.id,
        inspectionInput.workstations[0].id,
      ),
      runCheck: inspect,
    }),
  );
  assert.ok(
    pendingInspectionHtml.includes("正在检测设备") &&
      pendingInspectionHtml.includes('disabled=""'),
  );
  assert.ok(
    !pendingInspectionHtml.includes("09:58:21") &&
      !pendingInspectionHtml.includes('type="checkbox"'),
  );
  const oneCameraHtml = renderToString(
    React.createElement(OpeningCameraPreview, { report: inspectionReport }),
  );
  assert.equal(
    (oneCameraHtml.match(/class="opening-camera-pane"/g) || []).length,
    2,
  );
  assert.ok(
    oneCameraHtml.includes("未配置辅助摄像头") &&
      oneCameraHtml.includes("配置其他摄像头后可在此切换查看"),
  );
  const multiCameraHtml = renderToString(
    React.createElement(OpeningCameraPreview, {
      report: {
        ...inspectionReport,
        items: [
          ...inspectionReport.items,
          {
            cameraId: "ssr-aux-two",
            label: "手部细节",
            primary: false,
            status: "passed",
          },
          {
            cameraId: "ssr-aux-three",
            label: "侧面操作区",
            primary: false,
            status: "failed",
          },
        ],
      },
    }),
  );
  assert.equal(
    (multiCameraHtml.match(/class="opening-camera-pane"/g) || []).length,
    2,
  );
  assert.equal((multiCameraHtml.match(/<option /g) || []).length, 2);
  assert.ok(
    multiCameraHtml.includes('aria-label="切换辅助视角摄像头"') &&
      multiCameraHtml.includes('data-camera-id="ssr-aux-two"') &&
      multiCameraHtml
        .replace(/<!--.*?-->/g, "")
        .includes("侧面操作区（不可用）"),
  );
  assert.ok(
    !multiCameraHtml.includes(
      'value="' +
        inspectionInput.workstations[0].aiBaseConfig.primaryCameraId +
        '"',
    ),
  );
  console.log("PASS 固定主视角、可切换辅助视角、单摄像头空态及不可用状态");
  const passedInspectionHtml = renderToString(
    React.createElement(OpeningInspectionResults, { report: inspectionReport }),
  );
  assert.ok(
    passedInspectionHtml.includes("原型模拟检测") &&
      passedInspectionHtml.includes("录像存储") &&
      passedInspectionHtml.includes("模拟取帧成功"),
  );
  const inspectionSession = inspectionStore.openArrangementWorkstation(
    inspectionArrangement.id,
    inspectionInput.workstations[0].id,
    {
      inspectionId: inspectionReport.id,
      siteResetConfirmed: true,
      cameraConfirmations: Object.fromEntries(
        inspectionReport.manualChecks.map((c) => [c.key, true]),
      ),
      fallbackAccepted: true,
    },
  ).session;
  const recordHtml = renderToString(
    React.createElement(OpeningInspectionRecord, {
      session: inspectionSession,
      teachers: [{ id: "teacher-e2e", name: "测试教师" }],
    }),
  );
  assert.ok(
    recordHtml.includes('<details class="opening-check-record">') &&
      recordHtml.includes("测试教师") &&
      recordHtml.includes("画面确认"),
  );
  const preservationInput = structuredClone(normalized);
  preservationInput.arrangements.find(
    (a) => a.sessions?.length,
  ).sessions[0].openingCheck = inspectionSession.openingCheck;
  const preservationOutput = normalizePrototypeData(preservationInput);
  assert.deepEqual(
    preservationOutput.arrangements.find((a) => a.sessions?.length).sessions[0]
      .openingCheck,
    inspectionSession.openingCheck,
  );
  console.log("PASS 工位自动检测、检测中禁用、只读开放记录和规范化保存检查");

  // R01/R02: exercise the same normalized snapshots loaded by the real provider.
  const { changeEvidenceTask } = await server.ssrLoadModule(
    "/src/evidenceTaskRules.js",
  );
  const { gradeStateToken } = await server.ssrLoadModule(
    "/src/gradeRevisionRules.js",
  );
  const { getExamPublishGate, getPublishBlockers } = await server.ssrLoadModule(
    "/src/domainRules.js",
  );
  let reviewData = structuredClone(normalized);
  const reviewId = "practice-dashboard-empty-20261022";
  const reviewSession = () =>
    reviewData.arrangements.find((a) => a.id === reviewId).sessions[0];
  const originalEmptyVersion = reviewSession().scoreVersion;
  let reviewTask,
    reviewSeq = 0;
  for (const action of ["create", "cancel"]) {
    const session = reviewSession();
    const changed = changeEvidenceTask(reviewData, {
      action,
      arrangementId: reviewId,
      sessionId: session.id,
      stepId: session.steps[0].id,
      kind: "evidence",
      reason: "核对空成绩办理",
      studentInstruction: "联系教师核对",
      actorId: "t1",
      at: "2026-10-23T01:00:00Z",
      operationId: `r01-ssr-${action}`,
      makeId: (p) => `${p}-r01-${++reviewSeq}`,
      expectedState: gradeStateToken(session),
      ...(reviewTask
        ? { taskId: reviewTask.id, expectedTaskRevision: reviewTask.revision }
        : {}),
    });
    reviewData = normalizePrototypeData(changed.data);
    reviewTask = changed.result;
    assert.equal(
      reviewSession().score,
      null,
      "补证创建/取消/刷新保留明确空总分",
    );
    assert.equal(reviewSession().scoreVersion, originalEmptyVersion);
  }
  const invalidExam = structuredClone(
    normalized.arrangements.find(
      (a) => a.id === "exam-dashboard-unpublished-20261022",
    ),
  );
  for (const score of [null, "", -1, 101, false]) {
    invalidExam.sessions[0].score = score;
    assert.equal(getExamPublishGate(invalidExam.sessions).passed, false);
    assert.equal(getPublishBlockers(invalidExam.sessions).length, 1);
  }
  console.log(
    "PASS R01补证与刷新不补写空成绩；R02页面及发布命令共用守卫拒绝非法总分",
  );
  for (const capabilityId of [
    "cap-demo-glove-20261015",
    "cap-demo-meter-20261015",
  ]) {
    const expected = raw.aiAnnotationCategories
      .filter((c) => c.capabilityId === capabilityId)
      .map((c) => c.id);
    assert.deepEqual(
      normalized.aiAnnotationCategories
        .filter((c) => c.capabilityId === capabilityId)
        .map((c) => c.id),
      expected,
      "已有同语义标注类别时不重复追加默认类别",
    );
  }
  const demoSession = normalized.arrangements.find(
    (a) => a.id === "practice-demo-20261015",
  ).sessions[0];
  const step = demoSession.steps[0];
  Object.assign(step, {
    score: 25,
    effectiveScore: 25,
    rawScore: 30,
    aiDecision: "uncertain",
    result: "画面遮挡",
  });
  demoSession.runtime.aiScoringApplications = [
    {
      id: "reload-score",
      stepId: step.id,
      status: "applied",
      appliedDeduction: 5,
    },
  ];
  const reloaded = normalizePrototypeData(
    structuredClone(normalized),
  ).arrangements.find((a) => a.id === "practice-demo-20261015").sessions[0];
  assert.equal(reloaded.steps[0].score, 25, "刷新未知会话仍保留有效扣分");
  assert.deepEqual(
    reloaded.evaluationSnapshot,
    demoSession.evaluationSnapshot,
    "刷新不改变锁定快照",
  );
  console.log("PASS 标注类别无重复追加、刷新保留有效扣分与锁定快照");
  const revisedDemo = normalized.arrangements.find(
    (a) => a.id === "practice-grade-evidence-completed-20261022",
  ).sessions[0];
  assert.equal(revisedDemo.score, 98, "统一修订分加载后不被默认通过覆盖");
  assert.equal(
    revisedDemo.scoreVersion,
    raw.arrangements.find(
      (a) => a.id === "practice-grade-evidence-completed-20261022",
    ).sessions[0].scoreVersion,
  );
  const reloadRevision = normalizePrototypeData(
    structuredClone(normalized),
  ).arrangements.find(
    (a) => a.id === "practice-grade-evidence-completed-20261022",
  ).sessions[0];
  assert.equal(reloadRevision.score, 98);
  assert.equal(reloadRevision.scoreVersion, revisedDemo.scoreVersion);
  assert.deepEqual(
    reloadRevision.originalScoreRecord,
    revisedDemo.originalScoreRecord,
  );
  const frozenInput = structuredClone(normalized),
    frozenSession = frozenInput.arrangements.find(
      (a) => a.id === "exam-grade-evidence-frozen-20261022",
    ).sessions[0];
  frozenSession.score = 81;
  frozenSession.steps[0].effectiveScore = 11;
  frozenSession.steps[0].score = 11;
  frozenSession.scoreVersion = 9;
  const frozenReload = normalizePrototypeData(frozenInput).arrangements.find(
    (a) => a.id === "exam-grade-evidence-frozen-20261022",
  ).sessions[0];
  assert.equal(frozenReload.score, 81);
  assert.equal(frozenReload.steps[0].effectiveScore, 11);
  assert.equal(frozenReload.scoreVersion, 9);
  const pendingDemo = normalized.arrangements.find(
    (a) => a.id === "practice-grade-evidence-pending-20261022",
  ).sessions[0];
  assert.equal(pendingDemo.resultStatus, "待复核");
  assert.equal(pendingDemo.steps[0].scoreDisposition.status, "pending");
  console.log(
    "PASS 第三批已修订分、版本、原判、任务阻断及冻结成绩加载保持一致",
  );

  const { teacherDashboardMetrics } = await server.ssrLoadModule(
    "/src/teacherDashboardMetrics.js",
  );
  const { changeSupportTask, supportTaskGradeContext } =
    await server.ssrLoadModule("/src/supportTaskRules.js");
  const fourth = normalized.arrangements.filter(
    (a) => a.demoPackageId === "dashboard-closure-20261022",
  );
  const isolated = { ...normalized, arrangements: fourth };
  const fourthMetrics = teacherDashboardMetrics(isolated);
  assert.equal(fourth.length, 10);
  assert.equal(fourthMetrics.average.value, 64);
  assert.equal(fourthMetrics.average.count, 8);
  assert.equal(fourthMetrics.publishing.numerator, 1);
  assert.equal(fourthMetrics.publishing.denominator, 2);
  assert.equal(fourthMetrics.publishing.pendingCount, 1);
  const invalidOrigin = normalized.arrangements.find(
    (a) => a.id === "practice-dashboard-empty-20261022",
  );
  assert.equal(
    invalidOrigin.sessions[0].score,
    null,
    "空分加载后不能变成满分或0分",
  );
  for (const value of [null, "", true, "非法分", -1, 999]) {
    const malformed = structuredClone(normalized),
      a = malformed.arrangements.find(
        (a) => a.id === "practice-dashboard-completed-20261022",
      );
    a.sessions[0].score = 100;
    a.sessions[0].steps[0].effectiveScore = value;
    const after = normalizePrototypeData(malformed),
      row = teacherDashboardMetrics(after).rows.find(
        (r) => r.arrangementId === a.id,
      );
    assert.equal(
      row.valid,
      false,
      `非法步骤分 ${String(value)} 加载后仍需排除`,
    );
    assert.equal(
      after.arrangements.find((x) => x.id === a.id).sessions[0].steps[0]
        .effectiveScore,
      value,
    );
  }
  const oldSnapshot = structuredClone(normalized),
    oldA = oldSnapshot.arrangements.find(
      (a) => a.id === "practice-dashboard-completed-20261022",
    );
  delete oldA.sessions[0].evaluationSnapshot;
  oldA.snapshot = { sopVersion: "V旧快照-只存版本", lockedAt: oldA.startedAt };
  const oldReload = normalizePrototypeData(oldSnapshot);
  assert.equal(
    oldReload.arrangements.find((a) => a.id === oldA.id).snapshot.sopVersion,
    "V旧快照-只存版本",
  );
  assert.equal(
    teacherDashboardMetrics(oldReload).rows.find(
      (r) => r.arrangementId === oldA.id,
    ).sopVersion,
    "V旧快照-只存版本",
  );
  console.log(
    "PASS 第四批均分64/8人次、发布1/2及待复核1可复算，非法总分/步骤分加载仍排除",
  );

  const { StepEvaluationExplanation, stepJudgementProcessId } =
    await server.ssrLoadModule("/src/VisualEvaluation.jsx");
  const longStep = {
    id: "Step 长文本业务样例",
    name: "双手绝缘防护及万用表检测过程完整检查".repeat(5),
    state: "active",
    executionState: "active",
    observation:
      "已进入当前步骤，工具、双手与工件接触过程需要连续观察。".repeat(20),
    completionCondition:
      "教师要求在规定工位完成安全检查和测量操作，允许合理的动作差异。".repeat(
        20,
      ),
    result: "进行中，尚未形成完整证据",
    visualRequirements: [],
  };
  const longHtml = renderToString(
    React.createElement(StepEvaluationExplanation, { step: longStep }),
  );
  assert.ok(
    longHtml.includes(longStep.observation) &&
      longHtml.includes(longStep.completionCondition) &&
      longHtml.includes(longStep.name),
    "长业务文本在完整详情中保留",
  );
  assert.ok(
    longHtml.includes(
      'id="' +
        stepJudgementProcessId(longStep) +
        '" class="step-evaluation-process"',
    ),
    "长文本详情默认折叠，定位标识稳定",
  );
  assert.ok(
    longHtml.includes('class="step-judgement-process"'),
    "判定过程使用纵向布局容器",
  );
  console.log("PASS 长步骤名、长观察及长标准的完整详情与默认折叠");
  const { StudentCameraPreview } = await server.ssrLoadModule(
    "/src/StudentCameraPreview.jsx",
  );
  for (const [arrangementId, stationId, expectedCount] of [
    ["p1", "w2", 2],
    ["e-demo-exam", "w5", 1],
    ["practice-demo-20261015", "ws-demo-20261015", 5],
  ]) {
    const session = normalized.arrangements
      .find((a) => a.id === arrangementId)
      .sessions.find((s) => s.workstationId === stationId);
    const props = {
      data: normalized,
      session,
      workstation: normalized.workstations.find((w) => w.id === stationId),
      student: normalized.students.find((s) => s.id === session.studentId),
    };
    const cameraHtml = renderToString(
      React.createElement(StudentCameraPreview, props),
    );
    if (expectedCount === 2)
      assert.ok(
        cameraHtml.includes('aria-label="选择工位摄像头"') &&
          cameraHtml.includes("细节视角") &&
          (cameraHtml.match(/<option /g) || []).length === 2,
        "学生双镜头在标题行提供下拉切换",
      );
    if (expectedCount > 1) {
      const header =
        cameraHtml.match(/<header>([\s\S]*?)<\/header>/)?.[1] || "";
      assert.ok(
        header.includes('aria-label="选择工位摄像头"'),
        "切换控件位于卡片右上角标题行",
      );
      assert.ok(
        !cameraHtml.includes('class="student-camera-switcher"') &&
          !cameraHtml.includes('role="tablist"'),
        "不再占用单独按钮行和说明行",
      );
    }
    if (expectedCount === 1)
      assert.ok(
        !cameraHtml.includes('role="tablist"') &&
          !cameraHtml.includes("<select"),
        "单镜头不添加虚构视角",
      );
    if (expectedCount === 5)
      assert.equal(
        (cameraHtml.match(/<option /g) || []).length,
        5,
        "多镜头下拉提供全部五个视角",
      );
    assert.ok(
      cameraHtml.includes("演示画面") && !cameraHtml.includes("实时得分"),
      "画面切换无评分信息，不泄露考试结果",
    );
  }
  console.log("PASS 学生单、双、五镜头预览组件及考试信息边界");
  const { SupportTaskCreate } = await server.ssrLoadModule(
    "/src/SupportTaskPanels.jsx",
  );
  const {
    teachingStatistics,
    statisticsStandardOptions,
    taskStatistics,
    HISTORY_KINDS,
  } = await server.ssrLoadModule("/src/teachingStatisticsRules.js");
  const supportRow = teachingStatistics(normalized, {
    sopId: "sop-demo-bench-20261015",
    sopVersion: "教学统计演示V1",
    type: "practice",
  }).metrics.rows.find(
    (r) => r.arrangementId === "practice-statistics-b1-20261023",
  );
  const supportHtml = renderToString(
    React.createElement(
      PrototypeDataProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/teacher/statistics"] },
        React.createElement(SupportTaskCreate, {
          row: supportRow,
          filters: {
            sopId: supportRow.sopId,
            sopVersion: supportRow.sopVersion,
            type: "practice",
          },
          initiallyOpen: true,
        }),
      ),
    ),
  );
  assert.ok(
    supportHtml.includes("学生需要完成的辅导要求") &&
      supportHtml.includes("保存辅导任务"),
  );
  console.log("PASS 教学统计直接展开正式辅导表单，源分与发起依据可见");

  const { StandardMediaList, StandardMediaEditor } = await server.ssrLoadModule(
    "/src/StandardMedia.jsx",
  );
  const mixedMedia = [
    {
      id: "image",
      name: "操作图.png",
      url: "/assets/student-monitor-hand-tracking.png",
      kind: "image",
    },
    {
      id: "video",
      name: "操作视频.mp4",
      url: "/assets/demo.mp4",
      kind: "video",
    },
    { id: "pdf", name: "标准.pdf", url: "/assets/standard.pdf", kind: "pdf" },
    {
      id: "office",
      name: "动作要点.docx",
      url: "/assets/standard.docx",
      kind: "document",
    },
  ];
  const mediaHtml = renderToString(
    React.createElement(StandardMediaList, {
      step: { standardMedia: mixedMedia },
    }),
  );
  assert.equal(
    (mediaHtml.match(/class="standard-media-item"/g) || []).length,
    4,
  );
  const mediaText = mediaHtml.replace(/<!--.*?-->/g, "");
  assert.ok(
    mediaText.includes("预览 PDF") &&
      mediaText.includes("查看图片") &&
      mediaText.includes("下载查看 DOCX") &&
      mediaHtml.includes("<video"),
  );
  const editorHtml = renderToString(
    React.createElement(StandardMediaEditor, {
      step: { standardMedia: mixedMedia },
      onChange() {},
      onBusyChange() {},
    }),
  );
  assert.ok(
    editorHtml.includes("multiple") &&
      editorHtml.includes("10MB") &&
      editorHtml.includes("200MB"),
  );
  assert.equal((editorHtml.match(/aria-label="移除资料：/g) || []).length, 4);
  const removedHtml = renderToString(
    React.createElement(StandardMediaList, {
      step: { standardMedia: [], standardMediaUrl: "/assets/old.png" },
    }),
  );
  assert.ok(
    removedHtml.includes("暂无示教资料") && !removedHtml.includes("old.png"),
  );
  console.log(
    "PASS 多示教资料：图片/视频/PDF/Office分型、格式限制、逐项移除与显式空态",
  );

  const { StandardMediaPreviewDialog, StandardMediaPreviewContent } =
    await server.ssrLoadModule("/src/StandardMediaPreview.jsx");
  for (const item of mixedMedia) {
    const html = renderToString(
      React.createElement(StandardMediaPreviewDialog, {
        item,
        url: item.url,
        onClose() {},
      }),
    );
    assert.ok(
      html.includes("<dialog") &&
        html.includes('aria-label="关闭资料预览"') &&
        html.includes("关闭预览") &&
        !html.includes('target="_blank"'),
    );
    if (item.kind === "image")
      assert.ok(html.includes("<img") && !html.includes("<object"));
    if (item.kind === "video")
      assert.ok(html.includes("<video") && html.includes('controls=""'));
    if (item.kind === "pdf")
      assert.ok(
        html.includes('type="application/pdf"') &&
          html.includes("当前浏览器无法显示 PDF"),
      );
    if (item.kind === "document")
      assert.ok(
        html.includes("此格式暂不支持在线预览") &&
          html.includes("Word") &&
          !html.includes("<object") &&
          !html.includes("<iframe"),
      );
  }
  const brokenMediaHtml = renderToString(
    React.createElement(StandardMediaPreviewContent, {
      item: mixedMedia[0],
      url: "",
    }),
  );
  assert.ok(
    brokenMediaHtml.includes("资料暂不可读取") &&
      !brokenMediaHtml.includes("<img"),
  );
  assert.ok(
    !mediaHtml.includes('target="_blank"') &&
      mediaHtml.includes("播放视频") &&
      mediaHtml.includes('class="standard-media-thumbnail__open"'),
  );
  console.log(
    "PASS 示教图片/视频/PDF弹窗、关闭及下载入口、Office明确下载查看、读取失败提示",
  );

  const { normalizeAiCapabilityConfig } = await server.ssrLoadModule(
    "/src/aiCapabilityConfigRules.js",
  );
  const linkedSop = structuredClone(
    normalized.sops.find((s) => s.id === "sop-demo-bench-20261015"),
  );
  linkedSop.steps[0].standardMedia = mixedMedia;
  const linkedConfig = normalizeAiCapabilityConfig({ sopId: linkedSop.id });
  const configHtml = renderToString(
    React.createElement(AiConfigStepCard, {
      sop: linkedSop,
      step: linkedSop.steps[0],
      index: 0,
      config: linkedConfig,
      evaluation: { stepResults: [] },
      capabilities: [],
      store: { data: normalized },
      setModal() {},
      nav() {},
    }),
  ).replace(/<!--.*?-->/g, "");
  assert.ok(
    configHtml.includes("教师标准（只读）") &&
      configHtml.includes("4 个资料") &&
      !configHtml.includes("移除资料"),
  );
  const judgementHtml = renderToString(
    React.createElement(AiJudgementItemForm, {
      step: linkedSop.steps[0],
      capabilities: [],
      logicalAreas: [],
    }),
  ).replace(/<!--.*?-->/g, "");
  assert.ok(
    judgementHtml.includes("标准示教资料") &&
      judgementHtml.includes("4 个资料") &&
      !judgementHtml.includes("移除资料"),
  );
  const hintHtml = renderToString(
    React.createElement(StudentHintContent, { step: linkedSop.steps[0] }),
  );
  assert.ok(hintHtml.includes("查看标准示教"));
  console.log(
    "PASS AI配置Tab/瀑布流共用步骤卡及判断项表单引用多资料，保持教师标准只读",
  );

  const { NotificationPopover } = await server.ssrLoadModule(
    "/src/NotificationPopover.jsx",
  );
  for (const count of [0, 1, 25]) {
    const items = Array.from({ length: count }, (_, i) => ({
      id: `notification-render-${i}`,
      title: `通知${i}`,
      detail: "完整通知内容可在整行宽度内自然换行，不被右侧时间挤压。",
      time: "2026-10-22T05:50:00.000Z",
      read: i % 2 === 0,
      tone: "warning",
    }));
    const html = renderToString(
      React.createElement(NotificationPopover, {
        items,
        onSelect() {},
        onMarkAllRead() {},
        onClose() {},
      }),
    );
    assert.ok(
      html.includes('class="notification-list"') &&
        html.includes('aria-label="通知分页"'),
    );
    assert.equal(
      (html.match(/class="notification-content"/g) || []).length,
      Math.min(count, 10),
    );
    assert.ok(
      html.includes('aria-label="上一页"') &&
        html.includes('aria-label="下一页"'),
    );
    if (count)
      assert.ok(
        html.includes("2026-10-22 13:50:00") && !html.includes("05:50:00.000Z"),
      );
    else assert.ok(html.includes("暂无通知"));
  }
  console.log("PASS 通知空、单条、多页渲染，十条分页与北京时间显示");

  const {
    openStatisticsDetail,
    openStatisticsStandardRecords,
    openStatisticsStepAnalysis,
    statisticsStandardListParams,
  } = await server.ssrLoadModule("/src/statisticsDetailNavigation.js");
  const studentListParams = new URLSearchParams({
    source: "browser",
    tab: "classes",
    sopId: "sop-demo-bench-20261015",
    sopVersion: "版本未记录",
    type: "practice",
    student: "s3",
    detail: "students",
    q: "陈宇",
    dsize: "20",
  });
  const incompleteGroup = statisticsStandardOptions(
    teachingStatistics(normalized, {}),
  ).find((g) => g.sopId === "s3" && g.type === "practice" && !g.ready);
  assert.ok(incompleteGroup, "历史依据不完整记录仍有原始记录入口");
  const standardRecordsPath = `/teacher/statistics?${openStatisticsStandardRecords(new URLSearchParams("source=browser&tab=steps&page=0&size=20&sort=count&desc=1"), incompleteGroup, "browser")}`;
  const analysisGroup = statisticsStandardOptions(
    teachingStatistics(normalized, {}),
  ).find(
    (g) =>
      g.sopId === "sop-demo-bench-20261015" && g.type === "practice" && g.ready,
  );
  const analysisMainParams = new URLSearchParams(
    "source=browser&tab=steps&page=0&size=20&sort=count&desc=1",
  );
  const analysisMainPath = `/teacher/statistics?${analysisMainParams}`;
  const analysisParams = openStatisticsStepAnalysis(
    analysisMainParams,
    analysisGroup,
    "browser",
  );
  const stepAnalysisPath = `/teacher/statistics?${analysisParams}`;
  const stepSamplesPath = `/teacher/statistics?${openStatisticsDetail(analysisParams, "stepall:Step 01", "browser")}`;
  const stepErrorsPath = `/teacher/statistics?${openStatisticsDetail(analysisParams, "steperrors:Step 01", "browser")}`;
  const invalidAnalysisPath = `${stepAnalysisPath}&classId=nonexistent-class`;
  const standardListPath = `/teacher/statistics?${statisticsStandardListParams(new URLSearchParams("source=browser&tab=steps&sopId=sop-demo-bench-20261015&sopVersion=版本未记录&type=practice"), "browser")}`;
  const studentResultPath = `/teacher/statistics?${openStatisticsDetail(studentListParams, "student:s3", "browser")}`;
  const { withStatisticsReturn } = await server.ssrLoadModule(
    "/src/statisticsCommonRules.js",
  );
  const { withAttendanceReturn, legacyAttendanceTarget } =
    await server.ssrLoadModule("/src/arrangementAttendanceRules.js");
  const attendanceFromStatistics = withStatisticsReturn(
    "/teacher/practices/practice-statistics-a1-20261023/results?attendance=1&aq=张浩&asize=20",
    `/teacher/statistics?${studentListParams}`,
    "browser",
  );
  const recordFromAttendance = withAttendanceReturn(
    withStatisticsReturn(
      "/teacher/practices/practice-statistics-a1-20261023/students/s1?sessionId=session-statistics-a1-20261023",
      `/teacher/statistics?${studentListParams}`,
      "browser",
    ),
    attendanceFromStatistics,
    "browser",
  );
  const attendancePaths = [
    "/teacher/practices/p2/prep?attendance=1",
    "/teacher/practices/p1/live?attendance=1",
    "/teacher/practices/p4/results?attendance=1",
    "/teacher/exams/e2/prep?attendance=1",
    "/teacher/exams/exam-paused-status-20261024/live?attendance=1",
    "/teacher/exams/e1/results?attendance=1",
    "/teacher/exams/exam-draft-status-20261024/edit?attendance=1",
    "/teacher/practices/practice-cancelled-status-20261024/prep?attendance=1",
    "/admin/exams/e1?attendance=1",
    attendanceFromStatistics,
  ];
  const paths = [
    "/admin/users",
    "/admin/teachers",
    ...normalized.teachers.map((teacher) => `/admin/teachers/${teacher.id}`),
    analysisMainPath,
    stepAnalysisPath,
    stepSamplesPath,
    stepErrorsPath,
    invalidAnalysisPath,
    standardRecordsPath,
    standardListPath,
    ...attendancePaths,
    recordFromAttendance,
    `/teacher/statistics?${studentListParams}`,
    studentResultPath,
    "/teacher/exams/exam-dashboard-unpublished-20261022/results?sessionId=session-dashboard-unpublished-20261022&statisticsReturn=%2Fteacher%2Fstatistics%3Ftab%3Dfollowup&statisticsSource=browser",
    "/teacher/practices/p1/stations/w2?sessionId=session-p1-w2&statisticsReturn=%2Fteacher%2Fstatistics%3Ftab%3Dfollowup&statisticsSource=browser",
    "/teacher/evidence-tasks/task-grade-evidence-pending-20261022?statisticsReturn=%2Fteacher%2Fstatistics%3Ftab%3Dfollowup&statisticsSource=browser",
    "/teacher/support-tasks/task-dashboard-support-low-pending-20261022?statisticsReturn=%2Fteacher%2Fstatistics%3Ftab%3Dfollowup&statisticsSource=browser",
    "/admin/practices/p1/students/s1",
    "/admin/exams/e1/students/s1",
    "/teacher/dashboard",
    "/teacher/statistics?tab=classes&detail=all",
    "/teacher/statistics?tab=followup&work=publish",
    "/teacher/statistics?tab=followup&kind=support&status=open",
    "/teacher/statistics?tab=followup",
    "/teacher/statistics?tab=followup&kind=all&status=completed",
    "/teacher/statistics?tab=followup&work=all",
    "/teacher/statistics",
    "/teacher/statistics?courseId=removed-course-does-not-exist",
    "/teacher/statistics?tab=progress",
    "/teacher/statistics?tab=progress&source=browser&student=s3",
    {
      pathname: "/teacher/statistics",
      search: "?tab=progress&source=browser&student=s3",
      state: { statisticsReturned: true },
    },
    `/teacher/practices/p4/results?statisticsReturn=${encodeURIComponent("/teacher/data-statistics?range=all&detail=coverage&source=browser")}&statisticsSource=browser`,
    "/teacher/data-statistics",
    "/teacher/data-statistics?range=all",
    "/teacher/data-statistics?range=all&detail=coverage",
    "/teacher/data-statistics?range=all&detail=grades",
    "/teacher/data-statistics?range=all&dimension=standard",
    "/teacher/data-statistics?range=term&from=2026-09-01&to=2027-01-31",
    "/teacher/data-statistics?range=custom&from=2026-12-31&to=2026-01-01",
    "/teacher/statistics?tab=progress&student=s1&sopId=sop-demo-bench-20261015&sopVersion=教学统计演示V1&type=practice",
    "/teacher/statistics?tab=steps",
    "/teacher/sop/edit/s1",
    { pathname: "/teacher/sop/edit/s1", state: { stage: 3 } },
    "/teacher/statistics?tab=steps&sopId=sop-demo-bench-20261015&sopVersion=版本未记录&type=practice",
    "/teacher/statistics?tab=steps&sopId=sop-demo-bench-20261015&sopVersion=版本未记录&type=exam",
    "/teacher/statistics?sopId=sop-session-closure-demo-20261022&type=practice&tab=steps&source=browser&student=student-demo-20261015",
    "/teacher/statistics?sopId=sop-session-closure-demo-20261022&sopVersion=版本未记录&type=practice&tab=steps&source=browser&detail=records",
    "/teacher/statistics?tab=steps&sopId=sop-demo-bench-20261015&sopVersion=教学统计演示V1&type=practice&from=2099-01-01",
    "/teacher/statistics?tab=steps&sopId=sop-demo-bench-20261015&sopVersion=教学统计演示V1&type=practice",
    "/teacher/statistics?tab=steps&detail=errors",
    "/teacher/statistics?tab=classes&detail=students",
    "/teacher/statistics?tab=classes&detail=excluded",
    "/teacher/statistics?tab=classes&detail=band:1",
    "/teacher/statistics?tab=classes&attendance=practice-statistics-a1-20261023",
    "/teacher/statistics?tab=followup&kind=help",
    "/teacher/statistics?tab=followup&kind=evidence",
    "/teacher/statistics?tab=followup&work=review",
    "/teacher/statistics?tab=followup&work=step",
    "/teacher/statistics?tab=followup&work=publish&detail=publication:ready",
    "/teacher/practices/practice-statistics-a1-20261023/students/s1?sessionId=session-statistics-a1-20261023&statisticsReturn=%2Fteacher%2Fstatistics%3Ftab%3Dclasses&statisticsSource=browser",

    "/teacher/support-tasks/task-dashboard-support-low-pending-20261022",
    "/teacher/support-tasks/task-dashboard-support-coaching-20261022",
    "/teacher/support-tasks/task-dashboard-support-awaiting-review-20261022",
    "/teacher/support-tasks/task-dashboard-support-completed-20261022",
    "/teacher/practices/practice-dashboard-completed-20261022/students/s3?sessionId=session-dashboard-completed-20261022",
    "/teacher/evidence-tasks/task-grade-evidence-pending-20261022",
    "/teacher/evidence-tasks/task-grade-evidence-handling-20261022",
    "/teacher/evidence-tasks/task-grade-evidence-awaiting-20261022",
    "/teacher/evidence-tasks/task-grade-evidence-completed-20261022",
    "/teacher/evidence-tasks/task-grade-evidence-cancelled-20261022",
    "/teacher/evidence-tasks/task-grade-evidence-frozen-20261022",
    "/teacher/practices/practice-grade-evidence-completed-20261022/students/student-demo-20261015?sessionId=session-grade-evidence-completed-20261022",
    "/teacher/exams/exam-grade-evidence-awaiting-20261022/students/student-demo-20261015?sessionId=session-grade-evidence-awaiting-20261022",
    "/admin/exams/exam-grade-evidence-awaiting-20261022/students/student-demo-20261015?sessionId=session-grade-evidence-awaiting-20261022",
    "/admin/practices/practice-grade-evidence-completed-20261022/students/student-demo-20261015?sessionId=session-grade-evidence-completed-20261022",

    "/teacher/practices/practice-closure-manual-20261022/stations/ws-closure-manual-20261022",
    "/teacher/practices/practice-closure-teacher-20261022/stations/ws-closure-teacher-20261022",
    "/teacher/practices/practice-closure-fault-20261022/stations/ws-closure-fault-20261022",
    "/teacher/practices/practice-closure-auto-20261022/students/student-demo-20261015?sessionId=session-closure-auto-20261022",
    "/teacher/exams/exam-closure-exam-running-20261022/stations/ws-closure-exam-running-20261022",
    "/teacher/sop",
    "/teacher/practices",
    "/teacher/exams",
    "/teacher/practices/new",
    "/teacher/exams/new",
    "/teacher/exams/e2/edit",
    "/teacher/exams/e1/results",
    "/teacher/exams/e3/results",
    "/teacher/exams/exam-dashboard-review-20261022/results",
    "/teacher/exams/exam-draft-status-20261024/edit",
    "/teacher/exams/exam-preparing-status-20261024/prep",
    "/teacher/exams/exam-paused-status-20261024/live",
    "/teacher/practices/practice-paused-status-20261024/live",
    "/teacher/practices/practice-cancelled-status-20261024/prep",
    "/teacher/practices/practice-allocation-draft-20261022/edit",
    "/teacher/practices/practice-allocation-ready-20261022/prep",
    "/teacher/practices/practice-preparation-open-20261022/prep",
    "/teacher/exams/exam-preparation-cancelled-20261022/prep",
    "/admin/exams/exam-preparation-cancelled-20261022",
    "/teacher/practices/p4/students/s1?sessionId=session-p4-w4",
    "/teacher/practices/p1/live",
    "/teacher/exams/exam-closure-exam-running-20261022/live",
    "/teacher/practices/p1/stations/w1",
    "/teacher/exams/e-demo-exam/stations/w5",
    "/teacher/practices/practice-demo-protection-20261015/results",
    "/teacher/practices/practice-demo-protection-20261015/stations/w1",
    "/teacher/exams/exam-demo-meter-exam-20261015/results",
    "/teacher/exams/exam-demo-meter-exam-20261015/stations/w2",
    "/teacher/practices/practice-demo-bench-afternoon-20261015/prep",
    "/teacher/exams/exam-demo-bench-exam-20261015/prep",
    "/teacher/practices/practice-demo-variation-20261015/prep",
    "/teacher/practices/practice-demo-20261015/stations/ws-demo-20261015",
    "/teacher/practices/practice-demo-20261015/students/student-demo-20261015",
    "/teacher/practices/practice-demo-20261015/results",
    "/admin/ai-capability-config/sop-demo-bench-20261015",
    "/admin/ai-capability-library/annotation?capabilityId=cap-demo-meter-20261015",
    "/admin/ai-capability-library/annotation?capabilityId=cap-demo-glove-20261015",
    "/admin/ai-capability-library/videos?capabilityId=cap-demo-meter-20261015",
    "/admin/ai-capability-library/training-data?capabilityId=cap-demo-meter-20261015",
    "/admin/ai-capability-library/training?capabilityId=cap-demo-meter-20261015",
    "/admin/ai-capability-library/publishing?capabilityId=cap-demo-meter-20261015",
    "/admin/workstations/ws-demo-20261015",
    "/teacher/sop/sop-demo-bench-20261015",
    "/teacher/sop/edit/sop-demo-large-20261015",
    {
      pathname: "/teacher/sop/edit/sop-demo-large-20261015",
      state: { stage: 1 },
    },
  ];
  let unfilteredStatisticsMetrics = "";
  const timeDisplayFailures = [];
  for (const entry of paths) {
    const html = renderToString(
      React.createElement(
        PrototypeDataProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [entry] },
          React.createElement(RoutedApp),
        ),
      ),
    );
    assert.ok(html.length > 100);
    const visibleText = html.replace(/<[^>]*>/g, "");
    const rawTime = visibleText.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})/,
    );
    if (rawTime)
      timeDisplayFailures.push({
        path: typeof entry === "string" ? entry : entry.pathname,
        text: visibleText.slice(
          Math.max(0, rawTime.index - 60),
          rawTime.index + 100,
        ),
      });
    assert.ok(!html.includes("页面暂未找到"));
    assert.ok(
      !/成绩版本|结果版本|基线成绩 V|办理记录版本/.test(visibleText),
      `不应显示成绩版本：${typeof entry === "string" ? entry : entry.pathname}`,
    );
    const copyPath = typeof entry === "string" ? entry : entry.pathname;
    assert.ok(
      !/Session-Step|Score Disposition|Evaluation Mapping|Evaluation Item|Machine Event|Workstation Profile|Primary Actor|Observation Window|Evaluation Clock|Technical Incident|Compatibility Decision|AI Impact Assessment|Automatic evaluation gate|Training Required|Existing Capability|Configuration Only|Source Video|AI Package|Step ID/.test(
        visibleText,
      ),
      `业务页面应显示中文术语：${copyPath}`,
    );
    if (copyPath === "/teacher/sop/edit/s1") {
      assert.ok(
        html.includes("保存修改") && !html.includes("专业教师签名"),
        "已发布标准可原地编辑，不再复制新版本",
      );
    }
    if (copyPath.startsWith("/teacher/statistics")) {
      assert.ok(
        !html.includes("全部版本") &&
          !html.includes("明确版本") &&
          !html.includes(">版本</"),
        "统计不暴露标准版本字段",
      );
    }
    if (
      entry ===
      "/teacher/exams/exam-grade-evidence-frozen-20261022/students/student-demo-20261015?sessionId=session-grade-evidence-frozen-20261022"
    ) {
      assert.ok(
        /<button(?![^>]*disabled)[^>]*>调整有效得分<\/button>/.test(html),
        "已发布成绩提供直接修改入口",
      );
    }
    if (
      [
        stepAnalysisPath,
        stepSamplesPath,
        stepErrorsPath,
        invalidAnalysisPath,
      ].includes(entry)
    ) {
      const main = html.split('<div class="statistics-overlay"')[0];
      assert.ok(
        main.includes("同标准步骤分析") &&
          !main.includes("statistics-step-bars"),
      );
      assert.ok(
        !main.includes("评分依据：所选历史快照"),
        "所选分析依据不混入主页面已应用筛选",
      );
      assert.ok(
        html.includes('class="statistics-drawer statistics-drawer--wide"'),
      );
      if (entry === stepAnalysisPath) {
        assert.ok(
          html.includes('aria-label="步骤分析"') &&
            html.includes("statistics-step-bars"),
        );
        assert.ok(
          html.includes("绝缘手套状态检查") &&
            html.includes("万用表测量动作") &&
            html.includes("确认扣分人次"),
        );
        assert.ok(html.includes("样本") && html.includes("扣分来源"));
        assert.ok(
          html.includes("同一学生在同一次实训中的同一步骤") &&
            html.includes("步骤编号") &&
            html.includes("步骤 01"),
          "步骤统计说明、表头及显示编号使用中文，关联仍使用原始步骤ID",
        );
      } else if (entry === invalidAnalysisPath) {
        assert.ok(html.includes("所选分析范围已失效"));
        assert.ok(!html.includes("确认错误扣"), "失效范围不改用其他样本");
      } else {
        assert.ok(
          html.includes('aria-label="返回上一层明细"') &&
            html.includes("← 返回"),
        );
        assert.ok(html.includes("查看源报告"));
        const previews = [
          ...html.matchAll(
            /<span class="statistics-cell-preview" title="([^"]*)">([^<]*)<\/span>/g,
          ),
        ];
        assert.ok(previews.length > 0, "样本及扣分来源使用受限高度的长文预览");
        for (const [, fullText, visibleText] of previews)
          assert.equal(
            fullText,
            visibleText,
            "截断仅作用于布局，悬停保留完整原文",
          );
      }
    }
    if (entry === standardRecordsPath) {
      const main = html.split('<div class="statistics-overlay"')[0];
      assert.ok(
        html.includes("当前标准的原始记录") && html.includes("本明细标准"),
      );
      assert.ok(
        main.includes("标准依据") && main.includes("查看步骤分析"),
        "查看原始记录时底层标准列表仍有核心分析入口",
      );
      assert.ok(
        !main.includes("确认扣分人次"),
        "打开明细不自动替主页面选中分析范围",
      );
    }
    if (entry === standardListPath)
      assert.ok(html.includes("标准依据") && html.includes("查看步骤分析"));
    if (entry === studentResultPath) {
      assert.ok(
        html.includes('aria-label="返回上一层明细"') &&
          html.includes("← 返回") &&
          html.includes('aria-label="关闭"'),
      );
      assert.ok(html.includes("学生有效结果"));
    }
    if (entry === `/teacher/statistics?${studentListParams}`) {
      assert.ok(
        html.includes("有有效结果的学生") &&
          !html.includes('aria-label="返回上一层明细"'),
      );
    }
    if (attendancePaths.includes(entry)) {
      assert.ok(
        html.includes('role="dialog"') && html.includes("本安排完整名单"),
      );
      assert.ok(
        html.includes("搜索参加名单姓名或学号") && html.includes("导出名单"),
      );
      assert.ok(html.includes("参加状态") && html.includes("结果状态"));
      assert.ok(html.includes("参加名单每页人数"));
    }
    if (entry === attendanceFromStatistics)
      assert.ok(html.includes('aria-label="返回统计明细"'));
    if (entry === recordFromAttendance) {
      assert.ok(
        html.includes("返回参加名单") && !html.includes("返回教学改进"),
      );
      assert.ok(html.includes("张浩"));
    }
    if (copyPath.startsWith("/teacher/statistics")) {
      assert.ok(
        !html.includes("可分析的演示数据") && !html.includes("打开演示分析"),
        "不在当前范围之外追加演示数据推荐或重置筛选入口",
      );
      assert.ok(
        !html.includes("已返回原统计范围"),
        "返回统计不显示常驻顶部提示，即使旧导航状态仍存在",
      );
      assert.ok(
        !html.includes("单场参加情况"),
        "统计概览不再嵌入单场名单选择器",
      );
      assert.ok(
        !html.includes('aria-label="课程"') && !html.includes("全部课程"),
      );
      if (copyPath === "/teacher/statistics")
        unfilteredStatisticsMetrics =
          html.match(/<div class="statistics-metrics">[\s\S]*?<\/div>/)?.[0] ||
          "";
      if (copyPath.includes("courseId=removed-course")) {
        assert.ok(unfilteredStatisticsMetrics);
        assert.equal(
          html.match(/<div class="statistics-metrics">[\s\S]*?<\/div>/)?.[0],
          unfilteredStatisticsMetrics,
          "旧课程参数不能隐式缩小教学统计范围",
        );
      }
    }
    if (
      [
        "/teacher/exams/e1/results",
        "/teacher/exams/e3/results",
        "/teacher/exams/exam-dashboard-review-20261022/results",
      ].includes(copyPath)
    ) {
      const gateHtml =
        html.match(
          /<section class="panel publish-gate[^\"]*">([\s\S]*?)<\/section>/,
        )?.[1] || "";
      assert.ok(
        gateHtml.includes("考试发布门槛") && !gateHtml.includes("Disposition"),
      );
      if (copyPath.includes("/e3/"))
        assert.ok(gateHtml.includes("已发布") && !gateHtml.includes("可发布"));
      else if (copyPath.includes("/e1/"))
        assert.ok(
          gateHtml.includes("可发布") && !gateHtml.includes("暂不可发布"),
        );
      else
        assert.ok(
          gateHtml.includes("暂不可发布") && gateHtml.includes("人待处理"),
        );
    }
    if (["/teacher/practices", "/teacher/exams"].includes(copyPath)) {
      const type = copyPath.endsWith("exams") ? "exam" : "practice";
      const statusSelect =
        html.match(
          /<select aria-label="筛选状态"[^>]*>([\s\S]*?)<\/select>/,
        )?.[1] || "";
      for (const status of arrangementStatusOptions(type).slice(1)) {
        assert.ok(
          new RegExp(`<option[^>]*>${status}</option>`).test(statusSelect),
          `${type}状态筛选缺失${status}`,
        );
        assert.ok(
          normalized.arrangements.some(
            (a) => a.type === type && a.status === status && !a.archivedRecord,
          ),
          `${type}状态缺少数据${status}`,
        );
      }
    }
    if (
      /\/(practices|exams)\/[^/]+\/results$/.test(copyPath) ||
      /^\/admin\/(practice|exam)-records\/[^/]+$/.test(copyPath)
    ) {
      assert.ok(!html.includes("工位复位与释放") && !html.includes("确认复位"));
      assert.ok(!html.includes("会话 session-"));
    }
    if (/^\/teacher\/(practices|exams)\/[^/]+\/live$/.test(copyPath)) {
      const summaryHtml =
        html.match(
          /<div class="monitor-summary__statuses"[^>]*>([\s\S]*?)<\/div>/,
        )?.[1] || "";
      assert.equal((summaryHtml.match(/<button /g) || []).length, 6);
      assert.ok(
        summaryHtml.includes("本次工位") && summaryHtml.includes("已结束"),
      );
      assert.equal((summaryHtml.match(/aria-pressed="true"/g) || []).length, 1);
      assert.equal(
        (summaryHtml.match(/aria-controls="monitor-station-grid"/g) || [])
          .length,
        6,
      );
      assert.ok(html.includes('id="monitor-station-grid"'));
      assert.ok(/\d+\/\d+ 已通过/.test(html));
      assert.ok(!html.includes("个步骤已通过"));
      const eventPanelHtml =
        html.match(/<aside class="event-panel">([\s\S]*?)<\/aside>/)?.[1] || "";
      for (const [, clock] of eventPanelHtml.matchAll(
        /<time[^>]*>([^<]*)<\/time>/g,
      )) {
        assert.ok(
          clock === "时间未知" || /^\d{2}:\d{2}:\d{2}$/.test(clock),
          `异常事件时间：${clock}`,
        );
      }
    }

    if (copyPath.startsWith("/teacher/")) {
      assert.ok(html.includes("实训标准库") && !html.includes(">SOP 标准库<"));
    }
    if (copyPath === "/teacher/sop") {
      assert.ok(
        html.includes("创建实训标准") && html.includes("标准操作流程（SOP）"),
      );
      assert.ok(html.includes("搜索标准名称") && !html.includes("搜索 SOP"));
    }
    if (copyPath.includes("/sop/edit/")) {
      assert.ok(
        html.includes("编辑实训标准：") && !html.includes("编辑 SOP："),
      );
    }
    if (/^\/teacher\/(practices|exams)\/new$/.test(copyPath)) {
      assert.ok(
        html.includes("已发布实训标准") && !html.includes("未选择 SOP"),
      );
    }
    if (copyPath === "/admin/ai-capability-config/sop-demo-bench-20261015") {
      assert.ok(html.includes("标准名称") && html.includes("返回标准列表"));
    }
    if (entry === "/teacher/exams/exam-closure-exam-running-20261022/live") {
      const card =
        html.match(
          /<button class="station-card [^\"]*"[^>]*>([\s\S]*?)<\/button>/,
        )?.[1] || "";
      assert.ok(/<strong[^>]*>考试确认工位<\/strong>/.test(card));
      assert.ok(
        card.includes('class="station-card__student-number"') &&
          card.includes("DEMO-20261015"),
      );
      assert.ok(!html.includes(">.000Z</time>") && html.includes("时间未知"));
    }
    if (
      typeof entry === "string" &&
      /^\/teacher\/(?:practices|exams)\/(?:new|[^/]+\/edit)$/.test(entry)
    ) {
      assert.ok(
        html.includes('aria-label="参与班级列表"') &&
          html.includes('aria-label="参与学生列表"'),
      );
      assert.ok(
        html.includes('aria-label="搜索学生姓名或学号"') &&
          html.includes('aria-label="搜索班级名称或编号"'),
      );
      assert.ok(
        html.includes("仅看已选") &&
          html.includes("选中本页") &&
          html.includes("取消本页"),
      );
      assert.ok(
        (html.match(/aria-label="列表分页"/g) || []).length >= 2,
        "班级和学生列表均提供分页",
      );
      assert.ok(
        !html.includes('class="entity-check-grid"'),
        "不再平铺全部学生",
      );
      assert.ok(
        html.includes('title="') && html.includes(">随机分配</button>"),
        "练习与考试编辑页提供随机分配入口",
      );
    }
    if (
      typeof entry === "string" &&
      entry.includes("statisticsReturn=") &&
      entry.includes("statisticsSource=browser")
    )
      assert.ok(
        html.includes(
          entry === recordFromAttendance ? "返回参加名单" : decodeURIComponent(entry).includes("/teacher/data-statistics") ? "返回数据统计" : "返回教学改进",
        ),
      );
    if (
      typeof entry === "string" &&
      (entry.endsWith("/new") ||
        entry.includes("practice-allocation-") ||
        entry.includes("practice-preparation-open-20261022") ||
        entry.includes("exam-preparation-cancelled-20261022"))
    ) {
      assert.ok(
        html.includes('aria-label="学生与工位分配"'),
        "第一批页面展示同一分配表",
      );
    }
    if (
      typeof entry === "string" &&
      entry.includes("practice-allocation-draft-20261022")
    ) {
      assert.ok(
        html.includes("删除草稿") &&
          html.includes("所选工位不可用") &&
          /<button[^>]*disabled=""[^>]*>随机分配<\/button>/.test(html),
        "不可用工位草稿可删除，随机入口禁用并显示具体原因",
      );
    }
    if (
      typeof entry === "string" &&
      entry.includes("practice-preparation-open-20261022")
    ) {
      assert.equal(
        (html.match(/>撤销准备<\/button>/g) || []).length,
        2,
        "归一化后的两个未开始工位均可撤销",
      );
      assert.ok(html.includes("取消安排"));
    }
    if (
      typeof entry === "string" &&
      entry.includes("exam-preparation-cancelled-20261022")
    ) {
      assert.ok(
        html.includes("已取消") && !html.includes("开始并进入实时监控"),
      );
      assert.equal(
        html.includes("复制为新草稿"),
        entry.startsWith("/teacher/"),
        "取消历史只允许教师复制，管理结果保持只读",
      );
    }
    if (
      typeof entry === "object" &&
      entry.pathname.startsWith("/teacher/sop/edit/") &&
      entry.state?.stage === 1
    )
      assert.ok(html.includes("可见操作要求"));
    if (typeof entry === "string" && entry.includes("/stations/ws-closure-")) {
      assert.ok(
        html.includes("步骤流程确认") && html.includes("学生求助办理"),
        "第二批工位提供正式办理入口",
      );
      if (entry.includes("closure-manual"))
        assert.ok(
          html.includes("接手处理") &&
            html.includes("教师回执") &&
            html.includes("学生已撤销"),
        );
      if (entry.includes("closure-teacher"))
        assert.ok(
          html.includes("确认本步流程并推进") &&
            html.includes("处理完成并发送回执"),
        );
      assert.ok(!html.includes("运行状态模拟（原型）"), "不恢复废弃模拟区");
    }
    if (
      typeof entry === "string" &&
      entry.startsWith("/teacher/evidence-tasks/")
    ) {
      assert.ok(html.includes("学生办理要求") && html.includes("负责教师"));
      if (entry.includes("-pending-")) assert.ok(html.includes("接手办理"));
      if (entry.includes("-handling-"))
        assert.ok(html.includes("保存登记并提交教师确认"));
      if (entry.includes("-awaiting-"))
        assert.ok(
          html.includes("确认办理完成并更新原记录") &&
            html.includes("查看引用记录"),
        );
      if (entry.includes("-completed-"))
        assert.ok(
          html.includes("完成结论") &&
            !html.includes("确认办理完成并更新原记录"),
        );
      if (entry.includes("-cancelled-"))
        assert.ok(
          html.includes("取消原因") && !html.includes(">接手办理</button>"),
        );
      if (entry.includes("-frozen-"))
        assert.ok(
          html.includes("成绩已发布") &&
            !html.includes("确认办理完成并更新原记录"),
        );
    }
    if (
      typeof entry === "string" &&
      entry.includes("/admin/") &&
      entry.includes("grade-evidence")
    )
      assert.ok(
        !html.includes("查看与办理任务") &&
          !html.includes(">接手办理</button>") &&
          !html.includes("查看关联办理任务"),
      );
    if (
      typeof entry === "string" &&
      entry.includes("practice-grade-evidence-completed") &&
      entry.includes("/students/")
    )
      assert.ok(
        html.includes("成绩修改记录") &&
          !html.includes("成绩版本") &&
          !html.includes("基线成绩"),
      );
    if (
      typeof entry === "string" &&
      entry.includes("/teacher/support-tasks/")
    ) {
      assert.ok(html.includes("学生辅导任务") && html.includes("源结果报告"));
      if (entry.includes("low-pending"))
        assert.ok(html.includes(">开始辅导</button>"));
      if (entry.includes("coaching"))
        assert.ok(html.includes("保存指导记录并待复查"));
      if (entry.includes("awaiting-review"))
        assert.ok(html.includes("确认完成辅导"));
      if (entry.includes("completed"))
        assert.ok(
          html.includes("复查记录") && !html.includes(">确认完成辅导</button>"),
        );
    }
    if (typeof entry === "string" && entry.startsWith("/teacher/data-statistics")) {
      assert.ok(html.includes("<h1>数据统计</h1>") && html.includes('aria-label="数据统计筛选"'));
      assert.ok(!html.includes('aria-label="教学改进筛选"'));
      if (!entry.includes("from=2026-12-31")) {
        for (const text of ["开展场次", "参与学生数", "参与人次", "完成率", "平均分", "参考及格率", "实训开展趋势", "班级参与与完成", "实训项目开展", "统计汇总", "导出统计汇总"]) assert.ok(html.replace(/<!--.*?-->/g, "").includes(text), `数据统计缺少${text}`);
        if (entry.includes("detail=")) assert.ok(html.includes('role="dialog"') && html.includes("导出"));
      } else assert.ok(html.includes("开始日期不能晚于结束日期"));
    }
    if (typeof entry === "string" && entry.startsWith("/teacher/statistics")) {
      assert.ok(html.includes("教学改进分类") && html.includes("应用筛选"));
      assert.ok(!html.includes('class="panel runtime-simulator"'));
      if (entry.includes("tab=followup")) {
        const query = new URL(entry, "http://localhost").searchParams,
          kind = Object.hasOwn(HISTORY_KINDS, query.get("kind"))
            ? query.get("kind")
            : "all",
          history = teachingStatistics(normalized).history.filter(
            (row) => kind === "all" || row.kind === kind,
          ),
          summary = taskStatistics(history),
          status = query.get("status") || "all",
          rows = status === "all" ? history : summary[status] || [],
          plain = html.replace(/<!--.*?-->/g, ""),
          selector =
            html.match(
              /<select aria-label="跟进记录类型"[^>]*>([\s\S]*?)<\/select>/,
            )?.[1] || "";
        assert.ok(selector.includes(`<option value="${kind}" selected="">`));
        assert.ok(
          plain.includes(`导出当前明细（${rows.length}条）`),
          "类型、状态筛选与导出条数保持一致",
        );
        assert.ok(
          html.includes(">记录类型<"),
          "混合列表与导出保留每条记录的类型",
        );
        if (kind === "all") {
          assert.equal(history.length, 18);
          assert.equal(summary.denominator, 13);
          assert.ok(plain.includes("全部类型成功办结率 30.8%（4/13）"));
        }
        const work = ["all", "review", "step", "publish"].includes(
            query.get("work"),
          )
            ? query.get("work")
            : "all",
          workRows = teachingStatistics(normalized).current.filter(
            (row) => work === "all" || row.type === work,
          ),
          workSection = plain.slice(plain.indexOf(">当前待处理工作</h2>")),
          workSelector =
            workSection.match(
              /<select aria-label="待处理工作类别"[^>]*>([\s\S]*?)<\/select>/,
            )?.[1] || "";
        assert.ok(
          workSelector.includes(`<option value="${work}" selected="">`),
        );
        assert.ok(
          workSection.includes(`导出当前明细（${workRows.length}条）`),
          "混合待办的列表、导出保持同一集合",
        );
        const workBody =
          workSection.match(
            /<table class="statistics-table statistics-table--work">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/,
          )?.[1] || "";
        for (const [, rowHtml] of workBody.matchAll(
          /<tr[^>]*>([\s\S]*?)<\/tr>/g,
        )) {
          const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
            (m) => m[1],
          );
          if (cells[0]?.includes("考试发布")) {
            assert.equal(cells[2], "—", "整场发布的学生列无个人姓名");
            assert.ok(cells[3].includes("整场考试"), "整场发布范围放在事项中");
          }
        }
        if (work === "all") {
          assert.deepEqual(
            [...new Set(workRows.map((row) => row.type))].sort(),
            ["publish", "review", "step"],
          );
          for (const row of workRows)
            assert.ok(
              workSection.includes(row.actionLabel),
              "各类待办保留原办理动作",
            );
        }
      }
      if (entry.includes("tab=steps") && !entry.includes("detail=")) {
        assert.ok(
          !html.includes("statistics-step-bars"),
          "主页面只显示标准列表，不内嵌分析详情",
        );
        if (!entry.includes("2099"))
          assert.ok(
            html.includes("查看步骤分析") || html.includes("查看原始记录"),
          );
        else assert.ok(html.includes("当前查询范围没有来源记录"));
      }
      if (
        entry.includes("tab=steps") &&
        entry.includes("sop-session-closure-demo")
      ) {
        assert.ok(
          !html.includes("可分析的演示数据") && !html.includes("打开演示分析"),
        );
        if (entry.includes("detail=records"))
          assert.ok(
            html.includes("当前标准的原始记录") &&
              html.includes("尚未结束或提交"),
          );
      }
      if (entry.includes("detail="))
        assert.ok(
          html.includes('role="dialog"') && html.includes("导出当前明细"),
        );
      if (entry.includes("attendance=")) {
        const target = legacyAttendanceTarget(
          normalized,
          new URL(entry, "http://prototype.local").searchParams,
          "browser",
        );
        assert.ok(
          target.startsWith(
            "/teacher/practices/practice-statistics-a1-20261023/results?attendance=1",
          ),
        );
        assert.ok(
          target.includes("statisticsReturn="),
          "旧名单链接转到安排并保留统计返回范围",
        );
      }
    }
    if (entry === "/teacher/dashboard") {
      const schedule =
        html.match(/<div class="schedule-list">([\s\S]*?)<\/div>/)?.[1] || "";
      assert.equal(
        (schedule.match(/<button(?:\s|>)/g) || []).length,
        3,
        "教师工作台跨日期仍显示演示安排首屏",
      );
      assert.ok(!html.includes("今日暂无安排"));
    }

    if (typeof entry === "string" && entry.includes("/stations/")) {
      assert.ok(
        !html.includes('class="panel runtime-simulator"') &&
          !html.includes("运行状态模拟（原型）"),
        "已废弃的运行状态模拟区域不再展示",
      );
      assert.ok(
        html.includes('aria-label="查看工位相机"'),
        "所有工位详情统一相机选择器",
      );
      assert.ok(!html.includes('aria-label="视频视角"'), "不再使用旧主辅分支");
      assert.ok(
        !html.includes('class="decision-chain"') &&
          !html.includes('class="confidence-block"'),
        "侧栏没有横排判定链或固定满格状态条",
      );
      assert.ok(
        html.includes('<details id="step-judgement-process-') &&
          html.includes('class="step-evaluation-process"'),
        "纵向判定过程默认折叠",
      );
      assert.ok(
        html.includes('aria-controls="step-judgement-process-'),
        "右侧摘要可以定位并展开完整过程",
      );

      const beforeVideoLayout = html.slice(
        0,
        html.indexOf('class="student-monitor-layout"'),
      );
      assert.ok(
        !beforeVideoLayout.includes('class="enhancement-summary"') &&
          !beforeVideoLayout.includes("步骤证据视角"),
        "视频前不再插入辅助信息卡片",
      );
      assert.ok(
        html.includes('<details class="monitor-evidence-overview">'),
        "统计区概览默认折叠",
      );
      assert.ok(
        html.indexOf('class="enhancement-summary"') >
          html.indexOf('class="student-monitor-side"'),
        "覆盖概览位于右侧统计区",
      );
      assert.ok(
        html.includes('<details class="step-evaluation-evidence">'),
        "步骤证据视角在判定依据内按需展开",
      );
      const tiles =
        html.match(/<div class="step-result-grid">([\s\S]*?)<\/div>/)?.[1] ||
        "";
      assert.ok(
        tiles.includes("评价结果") &&
          tiles.includes("本步骤用时") &&
          tiles.includes("当前得分"),
      );
      assert.ok(
        !tiles.includes("enhancement-requirements") &&
          !tiles.includes("evaluation-meaning"),
        "长说明不再嵌入指标格",
      );
      const explanationIndex = html.indexOf(
        'class="panel step-evaluation-explanation"',
      );
      assert.ok(
        explanationIndex >
          html.indexOf('class="panel action-progress-panel"') &&
          explanationIndex < html.indexOf('class="student-monitor-side"'),
        "说明独立于右侧指标卡，放在动作列表下方",
      );
      const eventCardIndex = html.indexOf('class="panel monitor-event-card"');
      assert.ok(
        eventCardIndex > explanationIndex &&
          eventCardIndex < html.indexOf('class="student-monitor-side"'),
        "当前会话事件位于判定依据卡片下方的主列",
      );
      if (entry.includes("practice-demo-20261015")) {
        assert.ok(
          html.includes('<details class="step-evaluation-requirements">'),
          "可见要求默认折叠且可以展开",
        );
      }
      const stationUrl = new URL(entry, "http://prototype.local");
      const parts = stationUrl.pathname.split("/");
      const arrangement = normalized.arrangements.find(
        (a) => a.id === parts[3],
      );
      const session = arrangement.sessions.find(
        (s) =>
          s.workstationId === parts[5] &&
          (!stationUrl.searchParams.get("sessionId") ||
            s.id === stationUrl.searchParams.get("sessionId")),
      );
      const snapshot =
        session.evaluationSnapshot.workstationAiBaseConfigSnapshot;
      for (const camera of snapshot.cameras || []) {
        if (camera.enabled !== false)
          assert.ok(
            html.includes('value="' + camera.deviceId + '"'),
            "镜头取自会话快照",
          );
      }
    }

    if (typeof entry === "string" && entry.includes("/students/")) {
      assert.ok(
        html.includes('class="report-observation-summary"'),
        "报告统计与下方卡片使用独立间距容器",
      );
      const evidenceGrid =
        html.match(/<div class="evidence-explain">([\s\S]*?)<\/div>/)?.[1] ||
        "";
      assert.ok(
        !evidenceGrid.includes("enhancement-requirements"),
        "报告证据格也不嵌入长要求",
      );
      assert.ok(html.includes('class="panel step-evaluation-explanation"'));
    }
    console.log(
      "PASS " +
        (typeof entry === "string" ? entry : entry.pathname + " [操作步骤]"),
    );
  }
  assert.equal(
    timeDisplayFailures.length,
    0,
    JSON.stringify(timeDisplayFailures, null, 2),
  );
  console.log(
    paths.length + " 个页面/阶段渲染通过；此检查不执行浏览器视觉验收。",
  );
  // Isolated in-memory identity/storage only. Never read or write the user's browser.
  const previousWindow = globalThis.window;
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  values.set(
    "xingchen-student-session",
    JSON.stringify({
      studentId: "student-demo-20261015",
      method: "face",
      status: "passed",
      verifiedAt: "2026-10-22T02:00:00Z",
    }),
  );
  globalThis.window = { localStorage: storage, sessionStorage: storage };
  try {
    const { SampleMetadataPanel, SourceMetadataFields } = await server.ssrLoadModule("/src/EnhancementPanels.jsx");
    const metadataData = structuredClone(normalized);
    const metadataCapability = metadataData.aiCapabilities[0];
    const metadataSource = { id: "metadata-exact-video", capabilityId: metadataCapability.id, displayName: "指定来源视频", fileName: "source.mp4", sourceGroupId: "采集组A", participantId: "人员A", sampleUse: "sealed_test", dataCategory: "normal", sourceType: "standard_demo", processingStatus: "unprocessed" };
    metadataData.aiSourceVideos.push(metadataSource);
    values.set("xingchen-prototype-data-source-v1", "browser");
    values.set("xingchen-prototype-data-v22", JSON.stringify(metadataData));
    const renderMetadata = (node, path = "/admin/ai-capability-library/annotation") => renderToString(React.createElement(PrototypeDataProvider, null,
      React.createElement(MemoryRouter, { initialEntries: [path] }, node)));
    const metadataSample = { id: "metadata-sample", sourceVideoId: metadataSource.id, sampleType: "uncertain", visibility: "occluded" };
    const summaryHtml = renderMetadata(React.createElement(SampleMetadataPanel, { capabilityId: metadataCapability.id, current: metadataSample, kind: "frames" }));
    assert.ok(summaryHtml.includes("指定来源视频") && summaryHtml.includes("封存测试"));
    assert.ok(summaryHtml.includes(`capabilityId=${metadataCapability.id}&amp;videoId=metadata-exact-video&amp;source=browser`));
    assert.equal((summaryHtml.match(/<select/g) || []).length, 2);
    assert.ok(!summaryHtml.includes("<input") && !summaryHtml.includes("保存视频属性"));
    assert.ok(!summaryHtml.includes("<details class=\"sample-metadata-details\" open"));
    for (const sourceVideoId of ["missing-source", metadataData.aiSourceVideos.find(v => v.capabilityId !== metadataCapability.id)?.id].filter(Boolean)) {
      const missingHtml = renderMetadata(React.createElement(SampleMetadataPanel, { capabilityId: metadataCapability.id, current: { ...metadataSample, sourceVideoId }, kind: "frames" }));
      assert.ok(missingHtml.includes("来源视频已失效") && !missingHtml.includes("管理来源视频"));
    }
    const editorHtml = renderToString(React.createElement(SourceMetadataFields, { value: metadataSource, onChange() {}, lockedUse: true }));
    assert.ok(editorHtml.includes("补充采集说明（选填）") && editorHtml.includes("已封存的测试素材不能转回训练用途"));
    assert.ok(/<select disabled=""/.test(editorHtml));
    const targetPath = `/admin/ai-capability-library/videos?capabilityId=${metadataCapability.id}&videoId=${metadataSource.id}&source=browser`;
    const targetHtml = renderMetadata(React.createElement(RoutedApp), targetPath);
    assert.ok(targetHtml.includes("当前标注的来源视频") && targetHtml.includes("编辑采集属性"));
    assert.ok(!targetHtml.includes("保存视频属性"));
    const missingTargetHtml = renderMetadata(React.createElement(RoutedApp), targetPath.replace(metadataSource.id, "missing-source"));
    assert.ok(missingTargetHtml.includes("来源视频不存在或不属于当前AI能力"));
    assert.ok(!missingTargetHtml.includes("编辑采集属性"));
    console.log("PASS 标注样本属性精简、来源视频准确定位、失效关联无回退及封存用途只读");
    const { AdminUserForm } = await server.ssrLoadModule("/src/AdminUsersPage.jsx");
    const { teacherPasswordCredential: adminCredential, authenticatePrototypeAccount: adminAuthenticate } = await server.ssrLoadModule("/src/teacherAccountRules.js");
    const { TEACHER_LOGIN_SESSION_KEY: adminSessionKey } = await server.ssrLoadModule("/src/teacherAccountRules.js");
    const accountData = structuredClone(normalized);
    const restrictedUser = { id: "restricted-engineer", name: "授权实施人员", account: "limited-engineer", identity: "AI实施工程师", status: "启用", accessId: "access-only-ai", permissions: ["ai-config"], passwordCredential: await adminCredential("AccountTest123!") };
    accountData.adminUsers = [restrictedUser];
    const userFormHtml = renderToString(React.createElement(AdminUserForm, {}));
    assert.ok(userFormHtml.includes("身份") && userFormHtml.includes("功能菜单权限") && userFormHtml.includes("AI能力库") && userFormHtml.includes('required=""'));
    assert.ok(userFormHtml.includes('role="combobox"') && userFormHtml.includes('aria-expanded="false"') && !userFormHtml.includes("<datalist"));
    for (const source of ["browser", "cpd"]) {
      values.set("xingchen-prototype-data-source-v1", source);
      values.set(source === "cpd" ? "xingchen-prototype-cpd-working-data-v1" : "xingchen-prototype-data-v22", JSON.stringify(source === "cpd" ? { fingerprint: "accounts", data: accountData } : accountData));
      const login = { ...await adminAuthenticate(accountData, restrictedUser.account, "AccountTest123!"), source };
      values.set(adminSessionKey, JSON.stringify(login));
      const restrictedRender = path => renderToString(React.createElement(PrototypeDataProvider, null, React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(RoutedApp))));
      const allowed = restrictedRender("/admin/ai-capability-config");
      assert.ok(allowed.includes("授权实施人员") && allowed.includes("AI实施工程师"));
      assert.ok(!allowed.includes('aria-label="用户管理"') && !allowed.includes('aria-label="教师管理"') && !allowed.includes('aria-label="AI能力库"'));
      for (const path of ["/admin/users", "/admin/teachers", "/admin/ai-capability-library/annotation", "/teacher/dashboard"]) {
        const denied = restrictedRender(path); assert.ok(denied.includes("此功能尚未授权"), `未阻止${source} ${path}`);
        assert.ok(!denied.includes("新建用户") && !denied.includes("新建教师"));
      }
      const libraryData = structuredClone(accountData);
      libraryData.adminUsers = [{...restrictedUser,id:"admin1-user",account:"admin1",identity:"AI能力工程师",accessId:"admin1-access",permissions:["overview","ai-config","library.videos","library.annotation"]}];
      values.set(source === "cpd" ? "xingchen-prototype-cpd-working-data-v1" : "xingchen-prototype-data-v22", JSON.stringify(source === "cpd" ? { fingerprint:"library-nav",data:libraryData } : libraryData));
      const libraryLogin = {...await adminAuthenticate(libraryData,"admin1","AccountTest123!"),source};
      values.set(adminSessionKey,JSON.stringify(libraryLogin));
      const {adminAccountRedirect: libraryRedirect} = await server.ssrLoadModule("/src/adminAccessRules.js");
      const libraryTarget = libraryRedirect(libraryData,libraryLogin,source,"/admin/ai-capability-library");
      assert.equal(libraryTarget,"/admin/ai-capability-library/videos");
      const librarySidebar = restrictedRender(libraryTarget).split("</aside>")[0];
      assert.ok(librarySidebar.includes('aria-label="AI能力库二级菜单"') && librarySidebar.includes('aria-expanded="true"'));
      assert.ok(librarySidebar.includes('title="视频管理"') && librarySidebar.includes('title="数据标注"'));
      assert.ok(!librarySidebar.includes('title="能力管理"') && !librarySidebar.includes('title="模型训练"'));
      values.set(adminSessionKey,JSON.stringify(login));
      const disabled = structuredClone(accountData); disabled.adminUsers[0].status = "停用";
      values.set(source === "cpd" ? "xingchen-prototype-cpd-working-data-v1" : "xingchen-prototype-data-v22", JSON.stringify(source === "cpd" ? { fingerprint: "disabled", data: disabled } : disabled));
      assert.ok(!restrictedRender("/admin/ai-capability-config").includes("AI能力配置</h1>"));
      const writeProfileData = data => values.set(source === "cpd" ? "xingchen-prototype-cpd-working-data-v1" : "xingchen-prototype-data-v22", JSON.stringify(source === "cpd" ? { fingerprint: "profile", data } : data));
      writeProfileData(accountData);
      values.set(adminSessionKey, JSON.stringify(login));
      const engineerProfile = restrictedRender("/account/profile");
      assert.ok(engineerProfile.includes("<h1>个人资料</h1>") && engineerProfile.includes("授权实施人员") && engineerProfile.includes("AI实施工程师"));
      assert.ok(engineerProfile.includes("编辑资料") && engineerProfile.includes("修改密码") && !engineerProfile.includes("教师工号"));
      const teacherProfileData = structuredClone(accountData);
      teacherProfileData.teachers[0].passwordCredential = restrictedUser.passwordCredential;
      writeProfileData(teacherProfileData);
      const teacherLogin = { ...await adminAuthenticate(teacherProfileData, teacherProfileData.teachers[0].account, "AccountTest123!"), source };
      values.set(adminSessionKey, JSON.stringify(teacherLogin));
      const teacherProfileHtml = restrictedRender("/account/profile");
      assert.ok(teacherProfileHtml.includes("<h1>个人资料</h1>") && teacherProfileHtml.includes("教师工号") && teacherProfileHtml.includes("所属院系") && teacherProfileHtml.includes("所属专业"));
      assert.ok(!teacherProfileHtml.includes("功能菜单权限") && !teacherProfileHtml.includes("passwordCredential"));
      values.set(adminSessionKey, JSON.stringify({role:"admin",account:"admin",source}));
      const { switchWorkIdentitySession } = await server.ssrLoadModule("/src/accountIdentityRules.js");
      const switchedTeacherSession = switchWorkIdentitySession(teacherProfileData, {role:"admin",account:"admin",source}, source, "teacher");
      values.set(adminSessionKey, JSON.stringify(switchedTeacherSession));
      const switchedTeacherProfileHtml = restrictedRender("/account/profile");
      assert.ok(switchedTeacherProfileHtml.includes("教师工号") && !switchedTeacherProfileHtml.includes("全部管理功能（含用户管理）"));
      values.set(adminSessionKey, JSON.stringify(switchWorkIdentitySession(teacherProfileData,switchedTeacherSession,source,"admin")));
      const rootProfileHtml = restrictedRender("/account/profile");
      assert.ok(rootProfileHtml.includes("<h1>个人资料</h1>") && rootProfileHtml.includes("全部管理功能（含用户管理）"));
      const rootPasswordHtml = restrictedRender("/account/password");
      assert.ok(rootPasswordHtml.includes("修改登录密码") && rootPasswordHtml.includes("保存新密码"));
      assert.ok(!rootProfileHtml.includes('href="/account/password?from=profile"'));
      const { AccountPasswordFields } = await server.ssrLoadModule("/src/TeacherPasswordPanels.jsx");
      const passwordFieldsHtml = renderToString(React.createElement(AccountPasswordFields,{name:"当前用户",account:"admin"}));
      assert.equal((passwordFieldsHtml.match(/type="password"/g)||[]).length,3);
      assert.ok(passwordFieldsHtml.includes("当前密码") && passwordFieldsHtml.includes("确认新密码"));
      const privateRootData = structuredClone(teacherProfileData);
      privateRootData.adminUsers = [];
      privateRootData.systemAdminAccount = {name:"自定义管理员",passwordCredential:await adminCredential("RootPrivate123!")};
      writeProfileData(privateRootData);
      assert.ok(!restrictedRender("/account/profile").includes("<h1>个人资料</h1>"), "修改密码后旧admin登录失效");
      values.delete(adminSessionKey);
      assert.ok(!restrictedRender("/account/profile").includes("<h1>个人资料</h1>"), "已设置私人密码后禁止自动启动为admin");
      values.set(adminSessionKey, JSON.stringify({...await adminAuthenticate(privateRootData,"admin","RootPrivate123!"),source}));
      assert.ok(restrictedRender("/account/profile").includes("自定义管理员"));
      values.delete(adminSessionKey);
    }
    console.log("PASS 双来源教师／普通管理员／内置admin个人资料、改密页面与旧admin密码失效保护");
    values.set("xingchen-prototype-data-source-v1", "browser");
    values.set("xingchen-prototype-data-v22", JSON.stringify(normalized));
    values.set("xingchen-prototype-cpd-working-data-v1", JSON.stringify({ fingerprint: "reset-test-context", data: normalized }));
    values.delete(adminSessionKey);
    console.log("PASS 双来源管理端普通账号身份、授权菜单、直达网址阻断及停用登录失效；身份表单必填");
    const detailData = structuredClone(normalized);
    detailData.auditLogs.unshift(
      { id: "missing-target", action: "缺少对象的历史日志" },
      { id: "null-target", target: null, action: "空对象日志" },
      { id: "number-target", target: 123, action: "旧格式对象日志" },
      { id: "object-target", target: { id: "t1" }, action: "结构化旧对象日志" },
      {
        id: "teacher-valid",
        target: detailData.teachers[0].name,
        action: "合法教师关联审计",
        actor: "管理员",
        role: "管理员",
        result: "成功",
      },
      {
        id: "unrelated-target",
        target: "无关资料对象",
        action: "UNRELATED_AUDIT_SHOULD_NOT_APPEAR",
      },
    );
    const detailCases = [
      ...detailData.teachers.map((teacher) => [
        `/admin/teachers/${teacher.id}`,
        teacher.name,
      ]),
      [
        `/admin/students/${detailData.students[0].id}`,
        detailData.students[0].name,
      ],
      [
        `/admin/workstations/${detailData.workstations[0].id}`,
        detailData.workstations[0].name,
      ],
      [
        `/admin/devices/${detailData.devices[0].id}`,
        detailData.devices[0].name,
      ],
      ["/admin/teachers/nonexistent-teacher", "资料不存在或已失效"],
    ];
    let adminDetailChecks = 0;
    for (const source of ["browser", "cpd"]) {
      values.set("xingchen-prototype-data-source-v1", source);
      const key =
        source === "cpd"
          ? "xingchen-prototype-cpd-working-data-v1"
          : "xingchen-prototype-data-v22";
      const bytes = JSON.stringify(
        source === "cpd"
          ? { fingerprint: "existing-working-copy", data: detailData }
          : detailData,
      );
      values.set(key, bytes);
      for (const [path, name] of detailCases) {
        const html = renderToString(
          React.createElement(
            PrototypeDataProvider,
            null,
            React.createElement(
              MemoryRouter,
              { initialEntries: [path] },
              React.createElement(RoutedApp),
            ),
          ),
        );
        assert.ok(
          html.includes(name),
          `缺失审计对象时详情仍可显示：${source} ${path}`,
        );
        assert.ok(!html.includes("UNRELATED_AUDIT_SHOULD_NOT_APPEAR"));
        if (path === `/admin/teachers/${detailData.teachers[0].id}`) {
          assert.ok(
            html.includes("合法教师关联审计") &&
              html.includes("负责班级与教学范围"),
          );
          assert.ok(html.includes("重置密码") && html.includes("编辑资料"));
        }
        assert.equal(
          values.get(key),
          bytes,
          "查看详情不删除或改写原始审计工作数据",
        );
        adminDetailChecks++;
      }
      console.log(
        `PASS ${source} 教师及共用资料详情兼容缺失／空／非文本审计对象，合法关联及失效提示保留`,
      );
    }
    values.set("xingchen-prototype-data-source-v1", "browser");
    values.set("xingchen-prototype-data-v22", JSON.stringify(normalized));
    values.delete("xingchen-prototype-cpd-working-data-v1");
    const { teacherPasswordCredential, TEACHER_LOGIN_SESSION_KEY } =
      await server.ssrLoadModule("/src/teacherAccountRules.js");
    const { TeacherPasswordReceipt, TeacherImportReceipt } =
      await server.ssrLoadModule("/src/TeacherPasswordPanels.jsx");
    const passwordData = structuredClone(normalized);
    const passwordTeacher = {
      id: "teacher-password-flow-test",
      account: "passwordflow",
      name: "密码流程教师",
      status: "启用",
      passwordCredential: await teacherPasswordCredential("TestOnlyPass889", {
        temporary: true,
      }),
    };
    passwordData.teachers.push(passwordTeacher);
    passwordData.arrangements[0].name = "PRIVATE_OTHER_TEACHER_TASK";
    const ownArrangement = structuredClone(passwordData.arrangements[0]);
    ownArrangement.id = "password-flow-arrangement";
    ownArrangement.name = "当前教师专属安排";
    ownArrangement.teacherId = passwordTeacher.id;
    passwordData.arrangements.push(ownArrangement);
    values.set("xingchen-prototype-data-v22", JSON.stringify(passwordData));
    const passwordSession = {
      role: "teacher",
      teacherId: passwordTeacher.id,
      account: passwordTeacher.account,
      credentialId: passwordTeacher.passwordCredential.id,
      source: "browser",
    };
    values.set(TEACHER_LOGIN_SESSION_KEY, JSON.stringify(passwordSession));
    const renderAccountPath = (path) =>
      renderToString(
        React.createElement(
          PrototypeDataProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(RoutedApp),
          ),
        ),
      );
    const { RecordExportHistory } = await server.ssrLoadModule("/src/RecordExportHistory.jsx");
    const { createStoredExport } = await server.ssrLoadModule("/src/exportFileRules.js");
    const historyHtml = renderToString(React.createElement(RecordExportHistory, {
      jobs: [createStoredExport({ fileName: "原始报告.html", format: "HTML", content: "<p>原始成绩</p>" }, "new"), { id: "old", fileName: "旧报告.html", format: "HTML" }],
      onDownload() {}, onExport() {},
    }));
    assert.equal((historyHtml.match(/下载原文件/g) || []).length, 1);
    assert.ok(historyHtml.includes("原文件不可用") && historyHtml.includes("重新导出安排结果"));
    const requiredPasswordHtml = renderAccountPath("/account/password");
    assert.ok(
      requiredPasswordHtml.includes("设置自己的登录密码") &&
        requiredPasswordHtml.includes("当前临时密码"),
    );
    assert.ok(
      !requiredPasswordHtml.includes("TestOnlyPass889") &&
        !requiredPasswordHtml.includes("返回工作台"),
    );
    passwordTeacher.passwordCredential.mustChange = false;
    values.set("xingchen-prototype-data-v22", JSON.stringify(passwordData));
    for (const path of [
      "/teacher/dashboard",
      "/teacher/practices",
      "/teacher/statistics?tab=followup",
      "/account/password",
    ]) {
      const html = renderAccountPath(path);
      assert.ok(
        html.includes(passwordTeacher.name),
        "新教师登录后显示实际身份",
      );
      assert.ok(
        !html.includes("PRIVATE_OTHER_TEACHER_TASK"),
        "新账号不能读取演示教师的安排",
      );
      if (path === "/teacher/dashboard" || path === "/teacher/practices")
        assert.ok(html.includes(ownArrangement.name));
      if (path === "/account/password")
        assert.ok(html.includes("修改登录密码") && html.includes("当前密码"));
    }
    const receiptHtml = renderToString(
      React.createElement(TeacherPasswordReceipt, {
        receipt: {
          teacher: passwordTeacher,
          temporaryPassword: "TEST-ONE-TIME-PASSWORD",
        },
      }),
    );
    assert.ok(
      receiptHtml.includes("TEST-ONE-TIME-PASSWORD") &&
        receiptHtml.includes("复制登录信息") &&
        receiptHtml.includes("显示一次"),
    );
    values.delete(TEACHER_LOGIN_SESSION_KEY);
    values.set("xingchen-prototype-data-v22", JSON.stringify(normalized));
    assert.ok(renderAccountPath("/admin/teachers").includes("导入教师"));
    const renderImport = (initialRaw = "") =>
      renderToString(
        React.createElement(
          PrototypeDataProvider,
          null,
          React.createElement(TeacherImportForm, { initialRaw }),
        ),
      );
    const emptyImport = renderImport();
    assert.ok(
      emptyImport.includes("下载CSV模板") &&
        emptyImport.includes("选择CSV文件") &&
        emptyImport.includes("独立临时密码"),
    );
    const conflictImport = renderImport(
      `导入教师,${normalized.teachers[0].employeeNo},importtest,院系,专业`,
    );
    assert.ok(conflictImport.includes("教师工号已存在"));
    const importReceipt = renderToString(
      React.createElement(TeacherImportReceipt, {
        receipts: [
          {
            teacher: {
              id: "test-import",
              name: "导入教师",
              account: "importtest",
            },
            temporaryPassword: "Test-Import-Only889",
          },
        ],
      }),
    );
    assert.ok(
      importReceipt.includes("Test-Import-Only889") &&
        importReceipt.includes("下载登录信息CSV") &&
        importReceipt.includes("复制全部登录信息") &&
        importReceipt.includes("关闭后无法再次查看"),
    );
    console.log(
      "PASS 教师导入入口、模板与空预览、重复工号提示、整批初始登录信息回执（4场景）",
    );
    console.log(
      "PASS 初始／重置密码一次性回执、强制改密页面、教师真实身份与安排范围、主动改密入口（6场景）",
    );
    const { WorkstationAiBaseConfigForm, WorkstationInspectionContent } =
      await server.ssrLoadModule("/src/WorkstationEquipmentPanels.jsx");
    const { buildWorkstationInspection } = await server.ssrLoadModule(
      "/src/workstationConfigActions.js",
    );
    const { workstationArrangementState } = await server.ssrLoadModule(
      "/src/workstationReleaseRules.js",
    );
    const { FieldValidationCaseCard, ValidationRunDetails, ValidationCaseTabs } =
      await server.ssrLoadModule("/src/FieldValidationPanels.jsx");
    const { createDefaultValidationCases: validationCasesFor } =
      await server.ssrLoadModule("/src/sopWorkstationAiRules.js");
    const { FieldModelPreparation, focusFieldSection } = await server.ssrLoadModule("/src/FieldPreparationPanel.jsx");
    const previousDocument = globalThis.document;
    const parentDetails = { tagName: "DETAILS", open: false, parentElement: null };
    let focused = false, scrolled = false;
    globalThis.document = { getElementById: () => ({ parentElement: parentDetails, scrollIntoView() { assert.equal(parentDetails.open, true); scrolled = true; }, querySelector: () => ({ focus() { focused = true; } }) }) };
    try { focusFieldSection("field-cameras-target"); assert.ok(focused && scrolled); } finally { globalThis.document = previousDocument; }
    let workstationManagementChecks = 0;
    for (const source of ["browser", "cpd"]) {
      values.set("xingchen-prototype-data-source-v1", source);
      const key =
        source === "cpd"
          ? "xingchen-prototype-cpd-working-data-v1"
          : "xingchen-prototype-data-v22";
      values.set(
        key,
        JSON.stringify(
          source === "cpd"
            ? { fingerprint: "existing-working-copy", data: normalized }
            : normalized,
        ),
      );
      const practiceRecordHtml = renderAccountPath("/admin/practices/p1");
      assert.ok(practiceRecordHtml.includes("含暂计分") && practiceRecordHtml.includes("当前异常工位") && practiceRecordHtml.includes("关联工位当前异常"));
      assert.ok(practiceRecordHtml.includes("会话状态") && practiceRecordHtml.includes("成绩状态") && practiceRecordHtml.includes("尚未形成"));
      assert.ok(practiceRecordHtml.includes("未取得证据") && practiceRecordHtml.includes("安全阻断已触发，不代表动作完成条件已满足"));
      assert.ok(!practiceRecordHtml.includes("为什么没有判定") && !practiceRecordHtml.includes("已满足触发条件"));
      assert.ok(practiceRecordHtml.includes('<details class="panel diagnostic-panel"><summary'));
      assert.ok(practiceRecordHtml.includes("负责教师") && practiceRecordHtml.includes("本次实训标准") && practiceRecordHtml.includes("尚未结束"));
      assert.ok(practiceRecordHtml.includes('<details class="diagnostic-technical-details">'));
      assert.ok(practiceRecordHtml.includes("查看本步骤证据") && practiceRecordHtml.includes("不会解除工位限制"));
      const diagnosticTarget = practiceRecordHtml.match(/href="([^"]+)"[^>]*>查看本步骤证据/)[1].replaceAll("&amp;", "&");
      const diagnosticTargetHtml = renderAccountPath(diagnosticTarget);
      assert.ok(!diagnosticTargetHtml.includes("指定结果已失效") && !diagnosticTargetHtml.includes("资料不存在或已失效"));
      workstationManagementChecks++;
      for (const station of normalized.workstations) {
        const html = renderAccountPath(`/admin/workstations/${station.id}`);
        const current = workstationArrangementState(normalized, station.id);
        assert.equal(
          html.includes("查看当前安排"),
          Boolean(current.arrangement),
          `${source} ${station.id} 当前安排入口按实际占用显示`,
        );
        if (current.arrangement) {
          const a = current.arrangement;
          assert.ok(
            html.includes(
              `/admin/${a.type === "exam" ? "exams" : "practices"}/${a.id}`,
            ),
          );
          assert.ok(html.includes(a.name));
          assert.equal(station.currentArrangementId, a.id);
          assert.equal(station.currentArrangement, a.name);
          const targetPath = `/admin/${a.type === "exam" ? "exams" : "practices"}/${a.id}`;
          const targetHtml = renderAccountPath(targetPath);
          assert.ok(
            targetHtml.includes(a.name),
            `${source} ${targetPath} 安排页可渲染`,
          );
          assert.ok(targetHtml.includes("管理员只读查看同一份教学结果"));
          assert.ok(!targetHtml.includes("安排不存在或已失效"));
        }
        assert.ok(!html.includes("资料不存在或已失效"));
        workstationManagementChecks++;
      }
      const validationCase = {
        id: "field-case",
        name: "标准流程",
        scenarioType: "standard",
        judgementItemIds: ["field-item"],
        instruction: "按标准进行现场测试",
        expectedResult: "系统正确识别",
        actualResult: "",
        result: "pending",
      };
      const validationRelation = {
        id: "field-relation",
        sopAiConfigId: "field-config",
        validationRunId: "field-run",
        validationPurpose: "real",
        validationEnvironment: { tester: "现场工程师" },
      };
      const execution = {
        id: "execution",
        relationId: "field-relation",
        validationRunId: "field-run",
        caseId: "field-case",
        scenarioType: "standard",
        actualResult: "系统已完成本次测试并输出完整的识别结果",
        executor: "执行工程师",
        completedAt: "2026-10-25T08:00:00Z",
        evidenceUrl: "https://evidence.example.test/clip",
        expectationMatched: true,
      };
      const fieldProps = {
        validationCase: { ...validationCase, executionRecordId: execution.id },
        judgementItems: [{ id: "field-item", name: "防护用品穿戴" }],
        relationId: validationRelation.id,
        relation: validationRelation,
        data: { aiFieldValidationExecutions: [execution] },
        store: {},
        setModal() {},
      };
      // Exercise real Tab/toggle handlers without a browser or screenshots.
      const hookState = [];
      let hookIndex = 0;
      globalThis.__validationTabState = (initial) => {
        const i = hookIndex++;
        if (!(i in hookState)) hookState[i] = typeof initial === "function" ? initial() : initial;
        return [hookState[i], (value) => { hookState[i] = typeof value === "function" ? value(hookState[i]) : value; }];
      };
      const collect = (node, predicate) => {
        if (!React.isValidElement(node)) return [];
        return [...(predicate(node) ? [node] : []), ...React.Children.toArray(node.props.children).flatMap((child) => collect(child, predicate))];
      };
      try {
        const aiConfig = { stepConfigs: [{ stepId: "step", actualEvaluationMode: "visual_auto" }], judgementItems: [{ id: "field-item", stepId: "step", name: "防护用品", conditions: [] }] };
        const tabProps = { ...fieldProps, aiConfig, relation: { ...validationRelation, validationCases: validationCasesFor(aiConfig) } };
        const renderTabs = () => { hookIndex = 0; return ValidationCaseTabs(tabProps); };
        let tree = renderTabs();
        let guidance;
        tabProps.setModal = (value) => { guidance = value; };
        tree = renderTabs();
        collect(tree, (n) => n.type === "button" && n.props.children === "验证说明")[0].props.onClick();
        assert.equal(guidance.title, "验证说明");
        assert.ok(renderToString(guidance.content).includes("验收要求"));
        assert.equal(collect(tree, (n) => n.props.role === "tab").length, 8);
        collect(tree, (n) => n.type === "input" && n.props.type === "checkbox")[0].props.onChange({ target: { checked: true } });
        tree = renderTabs();
        const tabs = collect(tree, (n) => n.props.role === "tab");
        assert.equal(tabs.length, 16);
        tabs[15].props.onClick();
        tree = renderTabs();
        assert.equal(collect(tree, (n) => n.props.role === "tabpanel" && !n.props.hidden)[0].props.id, tabs[15].props["aria-controls"]);
        collect(tree, (n) => n.type === "input" && n.props.type === "checkbox")[0].props.onChange({ target: { checked: false } });
        tree = renderTabs();
        assert.equal(collect(tree, (n) => n.props.role === "tab").length, 8);
        assert.equal(collect(tree, (n) => n.props.role === "tabpanel").length, 16);
        aiConfig.judgementItems[0].completionBasis = "action";
        tree = renderTabs();
        assert.equal(collect(tree, (n) => n.props.role === "tab").length, 12, "配置依赖的高级场景不能被开关隐藏");
      } finally { delete globalThis.__validationTabState; }
      workstationManagementChecks++;
      const fieldHtml = renderToString(
        React.createElement(FieldValidationCaseCard, fieldProps),
      );
      assert.ok(
        fieldHtml.includes(execution.actualResult) &&
          fieldHtml.includes('readOnly=""') &&
          fieldHtml.includes("查看执行记录") &&
          fieldHtml.includes("查看证据"),
      );
      assert.ok(
        !fieldHtml.includes("执行结果来源") && !fieldHtml.includes("原型模拟"),
      );
      // Capture the real component's event handlers while React owns its hooks.
      let caseTree, rerunModal;
      const starts = [];
      const caseProps = {
        ...fieldProps,
        validationCase: { ...fieldProps.validationCase, result: "passed", executionState: "saved", executionAttemptId: "previous-attempt" },
        store: { startValidationCase: (...args) => starts.push(args) },
        setModal: (value) => { rerunModal = value; },
      };
      const captureCase = () => renderToString(React.createElement(function CaptureCase() {
        caseTree = FieldValidationCaseCard(caseProps);
        return caseTree;
      }));
      const savedHtml = captureCase();
      const rerunButton = collect(caseTree, (n) => n.type === "button" && n.props.children === "重新执行本用例")[0];
      assert.equal(rerunButton.props.className, "button button--default");
      assert.ok(savedHtml.indexOf("重新执行本用例") < savedHtml.indexOf("操作说明"));
      rerunButton.props.onClick();
      assert.equal(starts.length, 0, "重测必须确认后才改变用例");
      assert.equal(rerunModal.confirmText, "确认重新执行");
      rerunModal.onConfirm();
      assert.equal(starts.length, 1);
      assert.equal(starts[0][1], caseProps.validationCase.id);
      assert.deepEqual(starts[0][2].judgementItemIds, caseProps.validationCase.judgementItemIds);
      for (const state of ["pending", "running", "awaiting_review"]) {
        caseProps.validationCase = { ...fieldProps.validationCase, result: "pending", executionState: state, executionAttemptId: state === "pending" ? "" : "attempt", executedAt: "" };
        const html = captureCase();
        if (state === "pending") {
          assert.ok(html.indexOf("涉及AI判断项") < html.indexOf("开始执行"));
          assert.ok(!html.includes("重新执行本用例"));
        } else if (state === "running") {
          assert.ok(html.indexOf("涉及AI判断项") < html.indexOf("结束执行"));
          assert.ok(html.includes("取消执行") && !html.includes("重新执行本用例"));
        } else {
          const saveButton = collect(caseTree, (n) => n.type === "button" && n.props.children === "保存用例结果")[0];
          assert.equal(saveButton.props.className, "button button--primary");
          assert.ok(html.includes("待核对并保存") && !html.includes(">开始执行<"));
        }
      }
      caseProps.editable = false;
      assert.ok(!captureCase().includes("重新执行本用例"));
      workstationManagementChecks++;
      const regressionConfig = normalized.aiCapabilityConfigs.find((c) => c.sopId === "sop-muj8yyn3-x3ed0");
      const regressionRelation = normalized.sopWorkstationAiConfigs.find((r) => r.sopAiConfigId === regressionConfig.id);
      // Reproduce the user's actual old shape: eight cases, no expansion flag or history.
      const regressionCases = validationCasesFor(regressionConfig).slice(0, 8);
      regressionCases[0].actualResult = "先前已保存的现场验证结果应当继续保留供核对";
      for (const status of ["unvalidated", "pending_revalidation", "validating", "passed"]) {
        const regressionData = structuredClone(normalized);
        const storedRelation = regressionData.sopWorkstationAiConfigs.find((r) => r.id === regressionRelation.id);
        Object.assign(storedRelation, { validationStatus: status, validationCases: structuredClone(regressionCases), validationRecords: [] });
        delete storedRelation.validationScenarioSet;
        const loadedData = normalizePrototypeData(regressionData);
        const loadedRelation = loadedData.sopWorkstationAiConfigs.find((r) => r.id === regressionRelation.id);
        assert.deepEqual(loadedRelation.validationCases.slice(0, 8), regressionCases);
        assert.deepEqual(loadedRelation.validationRecords, []);
        assert.equal(loadedRelation.validationCases.length, status === "validating" ? 16 : 8);
        assert.deepEqual(normalizePrototypeData(loadedData).sopWorkstationAiConfigs.find((r) => r.id === regressionRelation.id).validationCases, loadedRelation.validationCases);
        const html = renderToString(React.createElement(AiWorkstationConfigWorkspace, {
          relation: loadedRelation,
          aiConfig: regressionConfig,
          evaluation: { ready: true },
          data: loadedData,
          store: { data: loadedData },
          setModal() {},
        }));
        assert.equal((html.match(/class="ai-validation-case"/g) || []).length, 16, `${source} ${status} 显示全部16张验证卡片`);
        assert.equal((html.match(/role="tabpanel"/g) || []).length, 16);
        assert.equal((html.match(/role="tabpanel"[^>]*hidden=""/g) || []).length, 15, "一次只展示一个用例，隐藏面板保留输入");
        assert.ok(html.includes("显示高级验证") && html.includes("共16类场景"));
        assert.ok(html.includes("1. 准备检查") && html.includes("2. 现场验证") && html.includes("3. 启用AI评价"));
        assert.ok(html.includes("查看设备配置") && html.includes("配置摄像头视角") && html.includes("查看模型与评测"));
        assert.ok(!html.includes("本次验证用途") && !html.includes("保存验证设置") && !html.includes("开始配置检查"));
        assert.equal((html.match(/class="validation-tabs-toolbar"/g) || []).length, 1);
        assert.ok(!html.includes('class="ai-validation-summary-strip"'));
        assert.ok(!html.includes("基础验证默认显示；"));
        const formalRunning = status === "validating" && loadedRelation.validationPurpose === "real";
        if (formalRunning) {
          assert.match(html, /class="validation-environment-summary"><details><summary>/);
          assert.match(html, /<details class="validation-acceptance-details"><summary>验收覆盖/);
          assert.ok(html.indexOf('class="validation-environment-summary"') < html.indexOf('class="validation-tabs-toolbar"'));
          assert.ok(html.indexOf('class="validation-acceptance-details"') > html.lastIndexOf('role="tabpanel"'));
        }
        assert.equal(html.includes("开始执行"), formalRunning);
        assert.ok(html.includes(regressionCases[0].actualResult));
        assert.equal(html.includes("保存用例结果"), formalRunning);
        if (!formalRunning) {
          assert.ok(html.includes("验证人") && html.includes("使用工具") && html.includes("光照情况"));
          assert.equal((html.match(/class="validation-case-fields" disabled=""/g) || []).length, 16);
        }
        if (status === "validating") {
          const formalHtml = renderToString(React.createElement(AiWorkstationConfigWorkspace, { relation: { ...loadedRelation, validationPurpose: "real" }, aiConfig: regressionConfig, evaluation: { ready: true }, data: loadedData, store: { data: loadedData }, setModal() {} }));
          assert.ok(formalHtml.includes("开始执行") && formalHtml.includes("保存用例结果"));
          assert.ok(formalHtml.includes("validation-environment-summary") && formalHtml.includes("验收覆盖"));
        }
        workstationManagementChecks++;
      }
      const excludedHtml = renderToString(
        React.createElement(FieldValidationCaseCard, {
          ...fieldProps,
          validationCase: {
            ...validationCase,
            scenarioType: "wrong_order",
            result: "not_applicable",
            notApplicableReason: "当前判断项只检查持续状态，不依赖动作先后顺序",
          },
        }),
      );
      assert.ok(
        excludedHtml.includes("不适用原因") &&
          !excludedHtml.includes("系统实际结果"),
      );
      workstationManagementChecks++;
      const settingsHtml = renderToString(
        React.createElement(FieldModelPreparation, {
          relation: validationRelation,
          store: { data: { aiCapabilityConfigs: [], aiCapabilities: [] } },
          setModal() {},
        }),
      );
      assert.ok(
        settingsHtml.includes("当前模型独立评测") &&
          !settingsHtml.includes("JSON") &&
          !settingsHtml.includes("待模型服务接入"),
      );
      workstationManagementChecks++;
      const historyHtml = renderToString(
        React.createElement(ValidationRunDetails, {
          record: {
            validatedBy: "现场工程师",
            completedAt: "2026-10-25T08:00:00Z",
            environment: { lighting: "正常" },
            cases: [
              {
                ...validationCase,
                evidenceUrl: execution.evidenceUrl,
                actualResult: execution.actualResult,
                result: "passed",
              },
            ],
          },
        }),
      );
      assert.ok(
        historyHtml.includes("查看证据") &&
          historyHtml.includes(execution.actualResult),
      );
      workstationManagementChecks++;
      const demoStation = normalized.workstations.find(
        (station) => station.id === "ws-allocation-demo-b-20261022",
      );
      const demoDevice = normalized.devices.find(
        (device) => device.workstationId === demoStation?.id,
      );
      assert.ok(demoStation && demoDevice);
      for (const path of [
        `/admin/workstations/${demoStation.id}`,
        `/admin/devices/${demoDevice.id}`,
      ]) {
        const html = renderAccountPath(path);
        assert.ok(!html.includes("资料不存在或已失效"));
        assert.ok(
          !/原型内部信息|prototype-resource-identifiers|内部工位编号|内部设备序列号|资源 ID/.test(
            html,
          ),
        );
        workstationManagementChecks++;
      }
      const w = normalized.workstations.find((w) => w.id === "w1");
      const details = renderAccountPath(`/admin/workstations/${w.id}`);
      assert.ok(
        details.includes("工位概况与使用状态") &&
          details.includes("设备与视角") &&
          details.includes("关联标准与AI运行状态"),
      );
      assert.ok(!details.includes("AI基础运行配置"));
      assert.ok(details.includes("设备检测"));
      assert.ok(details.includes("关联实训标准"));
      assert.ok(!details.includes("支持项目"));
      assert.ok(
        !/设备模拟检测|以上为原型保存的设备状态|非实时在线证明/.test(details),
      );
      assert.match(details, /class="table-action" href="\/admin\/devices\//);
      if (w.status === "故障") assert.ok(details.includes("工位当前故障"));
      workstationManagementChecks++;
      const renderEquipmentForm = (workstation) =>
        renderToString(
          React.createElement(
            PrototypeDataProvider,
            null,
            React.createElement(
              MemoryRouter,
              null,
              React.createElement(WorkstationAiBaseConfigForm, { workstation }),
            ),
          ),
        );
      const form = renderEquipmentForm(w);
      assert.ok(
        form.includes('type="radio"') &&
          form.includes("默认显示") &&
          form.includes("采集用途"),
      );
      assert.ok(
        !form.includes("兼容入口") &&
          !form.includes("保存并检查") &&
          !form.includes("覆盖区域（逗号分隔）"),
      );
      assert.ok(
        form.includes('target="_blank"') && form.includes("workstationId=w1"),
      );
      workstationManagementChecks++;
      const report = buildWorkstationInspection(
        w,
        normalized.devices,
        "2026-10-25 12:00:00",
      );
      const inspected = renderToString(
        React.createElement(WorkstationInspectionContent, {
          report,
          workstationId: w.id,
        }),
      );
      assert.ok(
        inspected.includes("检测时间") &&
          inspected.includes("处理设备") &&
          inspected.includes('class="table-action"') &&
          !/原型|模拟|真实硬件|非实时在线证明/.test(inspected),
      );
      workstationManagementChecks++;
      const inventory = renderAccountPath("/admin/devices?workstationId=w1");
      assert.ok(
        inventory.includes("当前工位") && inventory.includes("查看全部设备"),
      );
      assert.ok(!inventory.includes("CAM-002-A"));
      workstationManagementChecks++;
      const empty = renderEquipmentForm({
        id: "empty-station",
        name: "空工位",
        aiBaseConfig: { cameras: [] },
      });
      assert.ok(
        empty.includes("尚未配置采集视角") &&
          empty.includes("AI状态保持待完善") &&
          empty.includes("管理本工位设备"),
      );
      workstationManagementChecks++;
      const aiPage = renderAccountPath(
        "/admin/ai-capability-config/sop-demo-bench-20261015?tab=workstation&workstationId=ws-demo-20261015",
      );
      assert.ok(
        aiPage.includes("返回工位详情") && aiPage.includes("判断项摄像头配置"),
        "从工位定位到对应标准的工位验证，不停留在概览",
      );
      workstationManagementChecks++;
      const expiredTarget = renderAccountPath(
        "/admin/ai-capability-config/sop-demo-bench-20261015?tab=workstation&workstationId=missing-workstation",
      );
      assert.ok(
        expiredTarget.includes("目标工位的关联已失效") &&
          !expiredTarget.includes("判断项摄像头配置"),
        "失效工位链接不能静默进入另一工位的编辑区",
      );
      workstationManagementChecks++;
    }
    values.set("xingchen-prototype-data-source-v1", "browser");
    values.set("xingchen-prototype-data-v22", JSON.stringify(normalized));
    values.delete("xingchen-prototype-cpd-working-data-v1");
    console.log(
      `PASS ${workstationManagementChecks}个双来源工位配置、状态、设备检测、设备筛选、空态与现场验证定位场景`,
    );
    const { StepPlaybackVideo, StudentStepPlayback } = await server.ssrLoadModule("/src/StudentStepPlayback.jsx");
    let playbackError = "", pauses = 0;
    const testClip = { id: "clip", label: "主视角", url: "/test-only-recording.mp4", start: 12, end: 25 };
    const player = { duration: 60, currentTime: 0, playbackRate: 1, pause() { pauses++; } };
    const videoElement = StepPlaybackVideo({ clip: testClip, speed: 1.5, verify: () => true, onError: value => { playbackError = value; } });
    videoElement.props.onLoadedMetadata({ currentTarget: player });
    assert.equal(player.currentTime, 12);
    assert.equal(player.playbackRate, 1.5);
    player.currentTime = 26;
    videoElement.props.onTimeUpdate({ currentTarget: player });
    assert.equal(pauses, 1, "片段结束暂停");
    videoElement.props.onPlay({ currentTarget: player });
    assert.equal(player.currentTime, 12, "重播从本步骤开始");
    player.currentTime = 2;
    videoElement.props.onSeeking({ currentTarget: player });
    assert.equal(player.currentTime, 12);
    videoElement.props.onError();
    assert.ok(playbackError.includes("暂时无法播放"));
    const expiredVideo = StepPlaybackVideo({ clip: testClip, speed: 1, verify: p => { p.pause(); return false; }, onError() {} });
    player.currentTime = 40;
    expiredVideo.props.onPlay({ currentTarget: player });
    assert.equal(player.currentTime, 40, "失效片段不继续定位播放");
    const collapsedPlaybackHtml = renderToString(React.createElement(StudentStepPlayback, { playback: { message: "回放片段", clips: [testClip] } }));
    assert.ok(collapsedPlaybackHtml.includes("查看操作片段") && !collapsedPlaybackHtml.includes("<video"), "展开前不加载录像");
    const { ExamReviewVisibilityPanel } = await server.ssrLoadModule("/src/ExamReviewVisibilityPanel.jsx");
    const visibilityHtml = renderToString(React.createElement(ExamReviewVisibilityPanel, { arrangement: { id: "exam" }, store: {} }));
    assert.equal((visibilityHtml.match(/type="checkbox"/g) || []).length, 3);
    assert.ok(!visibilityHtml.includes('checked=""'));
    const studentPaths = [
      "/student/current",
      "/student/results/practice-dashboard-low-pending-20261022/session-dashboard-low-pending-20261022",
      "/student/results/practice-dashboard-low-repeat-20261022/session-dashboard-low-repeat-20261022",
      "/student/results/exam-dashboard-published-20261022/session-dashboard-published-20261022",
      "/student/results/practice-grade-evidence-completed-20261022/session-grade-evidence-completed-20261022",
      "/student/results/exam-grade-evidence-awaiting-20261022/session-grade-evidence-awaiting-20261022",
      "/student/results/exam-grade-evidence-frozen-20261022/session-grade-evidence-frozen-20261022",

      "/student/session/practice-closure-fault-20261022/ws-closure-fault-20261022?sessionId=session-closure-fault-20261022",
      "/student/session/practice-closure-manual-20261022/ws-closure-manual-20261022?sessionId=session-closure-manual-20261022",
      "/student/results/practice-closure-practice-result-20261022/session-closure-practice-result-20261022",
      "/student/results/exam-closure-exam-wait-20261022/session-closure-exam-wait-20261022",
      "/student/results/exam-closure-exam-result-20261022/session-closure-exam-result-20261022",
      "/student/results/p1/session-p1-w1",
    ];
    const openedReviewData = structuredClone(normalized);
    const openedExam = openedReviewData.arrangements.find(a => a.id === "exam-dashboard-published-20261022");
    const openedSession = openedExam.sessions.find(s => s.id === "session-dashboard-published-20261022");
    openedExam.studentReviewVisibility = { feedback: true, recording: true, standard: true };
    openedSession.recording = { status: "完整", expiresAt: "2099-01-01T00:00:00Z", clips: [{ id: "own-clip", stepId: openedSession.steps[0].id, sessionId: openedSession.id, studentId: openedSession.studentId, url: "/test-only-own-recording.mp4" }] };
    openedSession.steps[0].reviewNote = "公开给学生的教师反馈";
    openedSession.evaluationSnapshot = { ...openedSession.evaluationSnapshot, sopSnapshot: { ...openedSession.evaluationSnapshot?.sopSnapshot, steps: [{ id: openedSession.steps[0].id, completionCondition: "本次公开的正确操作要求", standardMedia: [{ id: "own-standard", name: "本次示范视频.mp4", url: "/test-only-standard.mp4", kind: "video" }] }] } };
    for (const source of ["browser", "cpd"]) {
      values.set("xingchen-prototype-data-source-v1", source);
      const key = source === "cpd" ? "xingchen-prototype-cpd-working-data-v1" : "xingchen-prototype-data-v22";
      values.set(key, JSON.stringify(source === "cpd" ? { fingerprint: "test", data: openedReviewData } : openedReviewData));
      const openedHtml = renderAccountPath("/student/results/exam-dashboard-published-20261022/session-dashboard-published-20261022");
      assert.ok(openedHtml.includes("查看操作片段") && openedHtml.includes("查看正确示范") && openedHtml.includes("本次公开的正确操作要求") && openedHtml.includes("公开给学生的教师反馈"));
      const teacherHtml = renderAccountPath("/teacher/exams/e1/results");
      const adminHtml = renderAccountPath("/admin/exams/e1");
      assert.ok(teacherHtml.includes("学生复盘开放范围") && !adminHtml.includes("学生复盘开放范围"));
      values.set(key, JSON.stringify(source === "cpd" ? { fingerprint: "test", data: normalized } : normalized));
    }
    values.set("xingchen-prototype-data-source-v1", "browser");
    for (const path of studentPaths) {
      const html = renderToString(
        React.createElement(
          PrototypeDataProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(RoutedApp),
          ),
        ),
      );
      assert.ok(!html.includes("页面暂未找到"));
      assert.ok(
        !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(
          html.replace(/<[^>]*>/g, ""),
        ),
        `学生页时间应按北京时间展示：${path}`,
      );
      if (path === "/student/current")
        assert.ok(
          html.includes("最近完成") &&
            html.includes("查看本人结果") &&
            html.includes("查看提交状态") &&
            html.includes("查看异常与求助"),
        );
      if (path.includes("/student/session/"))
        assert.ok(
          html.includes("教师帮助与回执") && html.includes("步骤流程确认"),
        );
      if (path.includes("closure-fault"))
        assert.ok(
          html.includes("系统评价暂不可用") &&
            !html.includes("确认并开始训练") &&
            !html.includes("从断点恢复"),
        );
      if (path.includes("/student/results/practice-dashboard-low-repeat-20261022/")) {
        assert.ok(html.includes("重点改进") && html.includes("步骤复盘") && html.includes("教师反馈与评分说明") && html.includes("本次正确要求"));
        assert.ok(html.includes("扣30分") && html.includes("万用表测量动作"));
        const cards = [...html.matchAll(/<details[^>]*class="student-review-step"[^>]*>/g)].map(m => m[0]);
        assert.equal(cards.length, 2);
        assert.equal(cards.filter(c => c.includes('open=""')).length, 1, "只有需要关注的步骤默认展开");
        assert.ok(!html.includes("量程选错") && !html.includes("接线错误"), "没有依据时不编造操作错误");
      }
      if (path.includes("/student/results/exam-dashboard-published-20261022/")) {
        assert.ok(html.includes('src="/assets/student-review-preview.mp4"') && html.includes('poster="/assets/student-monitor-hand-tracking.png"'));
        assert.ok(html.includes("播放速度"), "用户指定的已发布展示结果默认展开实际视频播放器");
      }
      if (path.includes("/student/results/exam-closure-exam-wait"))
        assert.ok(
          html.includes("待发布") &&
            !html.includes("有效得分") &&
            !html.includes("结果版本") &&
            !html.includes("双手绝缘手套"),
        );
      if (
        path.includes("/student/results/practice-closure") ||
        path.includes("/student/results/exam-closure-exam-result")
      )
        assert.ok(html.includes("有效得分") && !html.includes("结果版本"));
      if (
        path.includes("/student/results/") &&
        path.includes("grade-evidence")
      ) {
        assert.ok(html.includes("补证与补测办理"));
        if (path.includes("exam-grade-evidence-awaiting"))
          assert.ok(
            !html.includes("有效得分") &&
              !html.includes("核验依据") &&
              !html.includes("现场结果") &&
              html.includes("待教师确认"),
          );
        if (path.includes("practice-grade-evidence-completed"))
          assert.ok(
            html.includes("有效得分") &&
              !html.includes("结果版本") &&
              html.includes("办理结论"),
          );
      }
      if (path === "/student/results/p1/session-p1-w1")
        assert.ok(html.includes("结果暂不可查看") && !html.includes("35 分"));
      console.log("PASS " + path);
    }
    const mediaData = structuredClone(normalized);
    const mediaArrangement = mediaData.arrangements.find(
      (a) => a.id === "practice-closure-manual-20261022",
    );
    const mediaSession = mediaArrangement.sessions[0];
    const liveMediaSop = mediaData.sops.find(
      (s) => s.id === mediaArrangement.sopId,
    );
    for (const s of liveMediaSop.steps)
      s.standardMedia = structuredClone(mixedMedia);
    const lockedMediaSop = structuredClone(liveMediaSop);
    for (const s of lockedMediaSop.steps)
      s.standardMedia = structuredClone(mixedMedia.slice(0, 2));
    mediaArrangement.snapshot = {
      ...mediaArrangement.snapshot,
      sopSnapshot: lockedMediaSop,
    };
    mediaSession.evaluationSnapshot = {
      ...mediaSession.evaluationSnapshot,
      sopSnapshot: lockedMediaSop,
    };
    values.set("xingchen-prototype-data-v22", JSON.stringify(mediaData));
    const mediaPaths = [
      `/student/session/${mediaArrangement.id}/${mediaSession.workstationId}?sessionId=${mediaSession.id}`,
      `/teacher/practices/${mediaArrangement.id}/stations/${mediaSession.workstationId}?sessionId=${mediaSession.id}`,
      `/teacher/practices/${mediaArrangement.id}/students/${mediaSession.studentId}?sessionId=${mediaSession.id}`,
      `/admin/practices/${mediaArrangement.id}/students/${mediaSession.studentId}?sessionId=${mediaSession.id}`,
    ];
    for (const path of mediaPaths) {
      const html = renderToString(
        React.createElement(
          PrototypeDataProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(RoutedApp),
          ),
        ),
      ).replace(/<!--.*?-->/g, "");
      assert.ok(
        html.includes("标准示教资料") &&
          html.includes("2 个资料") &&
          !html.includes("4 个资料"),
        path,
      );
      console.log("PASS 多资料锁定快照 " + path);
    }
    const examMediaArrangement = structuredClone(mediaArrangement);
    examMediaArrangement.id = "exam-media-protection-check";
    examMediaArrangement.type = "exam";
    examMediaArrangement.status = "进行中";
    examMediaArrangement.sessions[0].status = "进行中";
    mediaData.arrangements.push(examMediaArrangement);
    values.set("xingchen-prototype-data-v22", JSON.stringify(mediaData));
    const examMediaPath = `/student/session/${examMediaArrangement.id}/${mediaSession.workstationId}?sessionId=${mediaSession.id}`;
    const examMediaHtml = renderToString(
      React.createElement(
        PrototypeDataProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [examMediaPath] },
          React.createElement(RoutedApp),
        ),
      ),
    );
    assert.ok(
      examMediaHtml.includes("考试状态") &&
        !examMediaHtml.includes("标准示教资料") &&
        !examMediaHtml.includes("查看标准示教"),
    );
    console.log("PASS 考试界面无示教资料入口或内容");

    // Teacher/receiving-role forms and student-safe receipt are checked against
    // the same isolated working data; no browser storage is accessed.
    const supportData = structuredClone(normalized),
      supportTask = supportData.supportTasks.find(
        (t) => t.id === "task-dashboard-support-low-pending-20261022",
      );
    const source = supportData.arrangements.find(
      (a) => a.id === supportTask.arrangementId,
    );
    source.type = "exam";
    source.status = "待发布";
    supportTask.arrangementType = "exam";
    supportTask.reason = "INTERNAL_SUPPORT_REASON";
    supportTask.verification = { basis: "INTERNAL_REVIEW_BASIS" };
    supportTask.studentConclusion = "HIDDEN_EXAM_CONCLUSION";
    values.set("xingchen-prototype-data-v22", JSON.stringify(supportData));
    const protectedHtml = renderToString(
      React.createElement(
        PrototypeDataProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/student/current"] },
          React.createElement(RoutedApp),
        ),
      ),
    );
    assert.ok(
      protectedHtml.includes("辅导任务与记录") &&
        protectedHtml.includes("考试结果尚未发布"),
    );
    for (const secret of [
      "INTERNAL_SUPPORT_REASON",
      "INTERNAL_REVIEW_BASIS",
      "HIDDEN_EXAM_CONCLUSION",
    ])
      assert.ok(!protectedHtml.includes(secret));
    console.log(
      "PASS 学生辅导要求可见，未发布考试的成绩结论和教师内部依据不投影",
    );
    const invalidData = structuredClone(normalized);
    invalidData.evidenceTasks.push({
      id: "task-invalid-history",
      teacherId: "t1",
      studentId: "student-demo-20261015",
      arrangementId: "missing-arrangement",
      sessionId: "missing-session",
      stepId: "missing-step",
      kind: "evidence",
      status: "pending",
      revision: 1,
      studentInstruction: "历史关联失效",
      history: [],
    });
    values.set("xingchen-prototype-data-v22", JSON.stringify(invalidData));
    const invalidHtml = renderToString(
      React.createElement(
        PrototypeDataProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/teacher/evidence-tasks/task-invalid-history"] },
          React.createElement(RoutedApp),
        ),
      ),
    );
    assert.ok(
      invalidHtml.includes("原会话或步骤已失效") &&
        !invalidHtml.includes(">接手办理</button>"),
    );
    console.log("PASS 失效关联任务只读历史，不导致页面抛错");
    console.log(
      `${paths.length + studentPaths.length + 7 + adminDetailChecks + 6 + 4 + workstationManagementChecks} 个页面/阶段合计通过（含${workstationManagementChecks}个工位管理场景、4个教师导入场景、6个密码流程场景、${adminDetailChecks}个双来源管理员详情兼容场景、12个隔离学生身份页面、1个辅导考试保护场景和1个失效历史任务及5个多资料关联/考试保护场景），未执行浏览器视觉验收。`,
    );
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
} finally {
  await server.close();
  hmr.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
