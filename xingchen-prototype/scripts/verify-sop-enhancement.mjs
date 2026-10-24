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
        html.includes("返回参加名单") && !html.includes("返回教学统计"),
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
          entry === recordFromAttendance ? "返回参加名单" : "返回教学统计",
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
    if (typeof entry === "string" && entry.startsWith("/teacher/statistics")) {
      assert.ok(html.includes("教学统计分类") && html.includes("应用筛选"));
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
    const studentPaths = [
      "/student/current",
      "/student/results/practice-dashboard-low-pending-20261022/session-dashboard-low-pending-20261022",
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
      `${paths.length + studentPaths.length + 7} 个页面/阶段合计通过（含12个隔离学生身份页面、1个辅导考试保护场景和1个失效历史任务及5个多资料关联/考试保护场景），未执行浏览器视觉验收。`,
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
