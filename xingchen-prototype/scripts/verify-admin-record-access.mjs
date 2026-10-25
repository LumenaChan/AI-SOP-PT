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
// Capture actual mount callbacks without a browser. Run the child page effect
// before provider backup, then model React's readiness rerender using the same
// provider actions and refs. This reproduced the original uncaught exception.
const server = await createServer({
  root,
  plugins: [
    {
      name: "admin-audit-lifecycle-test",
      enforce: "pre",
      transform(code, id) {
        const file = id.split("?")[0];
        if (
          ![
            resolve(root, "src/App.jsx"),
            resolve(root, "src/prototypeData.jsx"),
          ].includes(file)
        )
          return;
        const updated = code.replace(
          /\buseEffect(?=\s*[,}])/,
          "useEffect as originalUseEffect",
        );
        assert.notEqual(updated, code);
        return {
          code:
            updated +
            `\nfunction useEffect(effect, deps) {
          if (globalThis.__adminAuditEffects) globalThis.__adminAuditEffects.push(effect);
          else originalUseEffect(effect, deps);
        }\n` +
            (file.endsWith("prototypeData.jsx")
              ? "export { PrototypeDataContext as AuditTestContext };"
              : ""),
          map: null,
        };
      },
    },
  ],
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

const previousWindow = globalThis.window;
const previousIndexedDB = globalThis.indexedDB;
try {
  const { MemoryRouter } = await server.ssrLoadModule(routerDomEntry);
  const {
    PrototypeDataProvider,
    usePrototypeData,
    normalizePrototypeData,
    AuditTestContext,
  } = await server.ssrLoadModule("/src/prototypeData.jsx");
  const { RoutedApp } = await server.ssrLoadModule("/src/App.jsx");
  const raw = JSON.parse(
    readFileSync(resolve(root, "src/data/currentPrototypeData.json"), "utf8"),
  );
  const normalized = normalizePrototypeData(structuredClone(raw));
  globalThis.indexedDB = undefined;
  let checks = 0;
  for (const source of ["browser", "cpd"]) {
    const key =
      source === "cpd"
        ? "xingchen-prototype-cpd-working-data-v1"
        : "xingchen-prototype-data-v22";
    const values = new Map([
      ["xingchen-prototype-data-source-v1", source],
      [
        key,
        JSON.stringify(
          source === "cpd"
            ? { fingerprint: "test", data: normalized }
            : normalized,
        ),
      ],
    ]);
    const inactiveKey =
      source === "cpd"
        ? "xingchen-prototype-data-v22"
        : "xingchen-prototype-cpd-working-data-v1";
    const inactiveBytes = JSON.stringify(
      source === "cpd"
        ? normalized
        : { fingerprint: "inactive", data: normalized },
    );
    values.set(inactiveKey, inactiveBytes);
    let failWrites = false;
    globalThis.window = {
      localStorage: {
        getItem: (k) => values.get(k) || null,
        setItem: (k, v) => {
          if (failWrites) throw new Error("test storage full");
          values.set(k, String(v));
        },
        removeItem: (k) => values.delete(k),
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    const readData = () => {
      const value = JSON.parse(values.get(key));
      return source === "cpd" ? value.data : value;
    };
    let captured;
    function Probe() {
      captured = usePrototypeData();
      return null;
    }
    globalThis.__adminAuditEffects = [];
    renderToString(
      React.createElement(
        PrototypeDataProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/admin/practices/p1"] },
          React.createElement(
            React.Fragment,
            null,
            React.createElement(Probe),
            React.createElement(RoutedApp),
          ),
        ),
      ),
    );
    const initialEffects = globalThis.__adminAuditEffects;
    const auditEffect = initialEffects.find((fn) =>
      String(fn).includes("recordAuditAccess"),
    );
    const backupEffect = initialEffects.find((fn) =>
      String(fn).includes("before-arrangement-status-demo-20261024"),
    );
    assert.ok(
      auditEffect && backupEffect,
      "加载真实页面与数据提供者的效果回调",
    );
    const initialBytes = values.get(key);
    assert.doesNotThrow(() => auditEffect(), "备份未完成时页面加载不能崩溃");
    assert.equal(values.get(key), initialBytes, "等待备份时不得写入工作数据");
    assert.equal(captured.dataWriteReady, false);
    assert.equal(
      captured.recordAuditAccess("查看教学记录", "startup pending"),
      false,
    );
    assert.equal(values.get(key), initialBytes);
    const cleanup = backupEffect();
    await new Promise((resolve) => setImmediate(resolve));
    const readyStore = { ...captured, dataWriteReady: true };
    const renderReady = (path) => {
      globalThis.__adminAuditEffects = [];
      const html = renderToString(
        React.createElement(
          AuditTestContext.Provider,
          { value: readyStore },
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(RoutedApp),
          ),
        ),
      );
      assert.ok(html.includes("管理员只读查看同一份教学结果"));
      const effect = globalThis.__adminAuditEffects.find((fn) =>
        String(fn).includes("recordAuditAccess"),
      );
      assert.ok(effect);
      return effect;
    };
    for (const path of ["/admin/practices/p1", "/admin/exams/e1"]) {
      const before = readData();
      const effect = renderReady(path);
      assert.doesNotThrow(() => effect());
      const after = readData();
      assert.equal(
        after.auditLogs.length,
        before.auditLogs.length + 1,
        "备份完成后补记一次访问",
      );
      assert.equal(after.auditLogs[0].action, "查看教学记录");
      assert.deepEqual(
        after.arrangements,
        before.arrangements,
        "访问不改变成绩与会话",
      );
      effect();
      assert.equal(
        readData().auditLogs.length,
        after.auditLogs.length,
        "同一次页面访问不重复留痕",
      );
      checks++;
    }
    const { examReviewVisibility } = await server.ssrLoadModule("/src/studentReviewAccessRules.js");
    const visibilityOptions = { feedback: true, recording: true, standard: false };
    const beforeVisibility = readData();
    readyStore.saveExamReviewVisibility("e1", visibilityOptions, JSON.stringify(examReviewVisibility(beforeVisibility.arrangements.find(a => a.id === "e1"))));
    const afterVisibility = readData();
    assert.deepEqual(afterVisibility.arrangements.find(a => a.id === "e1").sessions, beforeVisibility.arrangements.find(a => a.id === "e1").sessions);
    assert.deepEqual(afterVisibility.arrangements.find(a => a.id === "e1").studentReviewVisibility, visibilityOptions);
    assert.equal(values.get(inactiveKey), inactiveBytes, "复盘设置只写当前来源");
    const beforeVisibilityFailure = values.get(key);
    failWrites = true;
    assert.throws(() => readyStore.saveExamReviewVisibility("e1", { feedback: false, recording: false, standard: false }, JSON.stringify(visibilityOptions)));
    failWrites = false;
    assert.equal(values.get(key), beforeVisibilityFailure, "复盘设置存储失败不能生效");
    const beforeExport = readData();
    const exportJob = readyStore.createExportJob({ scope: "个人报告", targetId: "p1", sessionId: "session-p1-w1", format: "HTML", fileName: "报告.html", content: "<h1>原始导出内容</h1>" });
    assert.equal(readData().exportJobs.find(j => j.id === exportJob.id).file.content, "<h1>原始导出内容</h1>");
    assert.deepEqual(readData().arrangements, beforeExport.arrangements, "保存导出原文件不修改教学记录");
    assert.equal(values.get(inactiveKey), inactiveBytes, "导出只写当前来源");
    const beforeExportFailure = values.get(key);
    failWrites = true;
    assert.throws(() => readyStore.createExportJob({ format: "CSV", fileName: "失败.csv", content: "不可丢失的数据" }));
    failWrites = false;
    assert.equal(values.get(key), beforeExportFailure, "文件保存失败不得产生可下载记录");
    const retry = renderReady("/admin/practices/p1");
    const beforeFailure = values.get(key);
    const failureCount = readData().auditLogs.length;
    failWrites = true;
    assert.doesNotThrow(() => retry(), "审计保存失败也不能使只读页空白");
    assert.equal(values.get(key), beforeFailure);
    failWrites = false;
    retry();
    assert.equal(readData().auditLogs.length, failureCount + 1);
    checks++;
    assert.equal(
      values.get(inactiveKey),
      inactiveBytes,
      "审计只保存当前来源，不覆盖另一份数据",
    );
    cleanup?.();
  }
  console.log(
    `PASS ${checks} 个管理员练习／考试加载审计时序、单次留痕及失败重试场景；未调用浏览器。`,
  );
} finally {
  delete globalThis.__adminAuditEffects;
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
  if (previousIndexedDB === undefined) delete globalThis.indexedDB;
  else globalThis.indexedDB = previousIndexedDB;
  await server.close();
  hmr.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
