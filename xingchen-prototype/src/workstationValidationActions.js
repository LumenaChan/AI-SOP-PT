import {
  activeJudgementItems,
  createDefaultValidationCases,
  evaluateValidationCompletion,
  validationCaseInputIssues,
  normalizeSopWorkstationAiConfig,
  validationPlan,
} from "./sopWorkstationAiRules.js";
import {
  executionRecordIssues,
  validationEvidenceUrl,
  referencedValidationCapabilities,
  currentModelReport,
  fieldModelIssues,
} from "./fieldValidationEvidenceRules.js";

export function validationContextKey({
  relation,
  aiConfig,
  workstation,
  data,
}) {
  const base = workstation.aiBaseConfig || {};
  const capIds = new Set(
    (aiConfig.judgementItems || [])
      .flatMap((i) => (i.conditions || []).map((c) => c.capabilityId))
      .filter(Boolean),
  );
  return JSON.stringify({
    config: [aiConfig.id, aiConfig.stepConfigs, aiConfig.judgementItems],
    workstation: workstation.id,
    cameras: base.cameras?.map((c) => [
      c.deviceId,
      c.role,
      c.enabled,
      c.areaIds,
    ]),
    primary: base.primaryCameraId,
    fallback: base.fallbackCameraId,
    edge: base.edgeDeviceId,
    bindings: relation.judgementCameraBindings,
    areas: relation.logicalAreaMappings,
    models: [...capIds]
      .sort()
      .map((id) => [
        id,
        (data.aiCapabilities || []).find((c) => c.id === id)
          ?.currentPublishedModel?.modelArtifactId,
      ]),
  });
}
export function validationResult(context) {
  const { relation, aiConfig, checks, data } = context;
  const result = evaluateValidationCompletion({
    aiConfig: {
      ...aiConfig,
      validationScenarioSet: relation.validationScenarioSet,
    },
    cases: relation.validationCases,
    checks,
    validationPurpose: relation.validationPurpose,
    relation,
    data,
    capabilities: data.aiCapabilities || [],
  });
  if (
    !relation.validationContextKey ||
    relation.validationContextKey !== validationContextKey(context)
  ) {
    result.issues.push("配置或模型已变化，请重新开始验证");
    result.passed = false;
  }
  return result;
}
export function assertFieldEnablement(context) {
  if (context.relation.validationPurpose !== "real")
    throw new Error("配置检查不能替代现场验收，请先完成现场验证。");
  if (
    context.relation.validationStatus !== "passed" ||
    context.relation.fieldAcceptance?.status !== "passed" ||
    context.relation.fieldAcceptance.runId !== context.relation.validationRunId
  )
    throw new Error("请先完成当前工位的现场验收。");
  const result = validationResult(context);
  if (!result.passed) throw new Error(result.issues[0]);
  return result;
}
export function createWorkstationValidationActions({
  getData,
  setData,
  getContext,
  now,
  makeId,
  audit,
}) {
  const context = (id) => {
    const data = getData(),
      current = (data.sopWorkstationAiConfigs || []).find((r) => r.id === id),
      c = getContext(id);
    if (
      JSON.stringify(normalizeSopWorkstationAiConfig(current)) !==
      JSON.stringify(normalizeSopWorkstationAiConfig(c.relation))
    )
      throw new Error("验证记录已更新，请刷新后重试。");
    return { ...c, data, originalRelation: current };
  };
  function commit(c, updated, action) {
    setData((current) => {
      if (
        (current.sopWorkstationAiConfigs || []).find(
          (r) => r.id === c.relation.id,
        ) !== c.originalRelation
      )
        throw new Error("验证记录已更新，请刷新后重试。");
      const next = {
        ...current,
        sopWorkstationAiConfigs: current.sopWorkstationAiConfigs.map((r) =>
          r.id === updated.id ? updated : r,
        ),
        auditLogs: [...(current.auditLogs || [])],
      };
      const requests = [...(current.aiFieldValidationRequests || [])];
      for (const item of updated.validationCases || []) {
        if (!item.executionAttemptId) continue;
        const request = {
          id: item.executionAttemptId,
          relationId: updated.id,
          validationRunId: updated.validationRunId,
          contextKey: updated.validationContextKey,
          caseId: item.id,
          scenarioType: item.scenarioType,
          judgementItemIds: item.judgementItemIds,
          requestedAt: item.executionStartedAt,
          purpose: updated.validationPurpose,
          state: item.executionState,
          modelArtifacts: referencedValidationCapabilities(
            c.aiConfig,
            current.aiCapabilities,
          ).map((cap) => ({
            capabilityId: cap.id,
            modelArtifactId: cap.currentPublishedModel?.modelArtifactId,
          })),
        };
        const index = requests.findIndex((r) => r.id === request.id);
        if (index < 0) requests.push(request);
        else requests[index] = { ...requests[index], state: request.state };
      }
      next.aiFieldValidationRequests = requests;
      if (updated.enableStatus === "enabled")
        next.aiCapabilityConfigs = (current.aiCapabilityConfigs || []).map(
          (config) =>
            config.id === updated.sopAiConfigId
              ? { ...config, status: "enabled" }
              : config,
        );
      audit(next, action, `${c.sop.name} / ${c.workstation.name}`);
      return next;
    });
    return updated;
  }
  const actions = {
    cancelValidationCase(id, caseId) {
      const c = context(id);
      const item = c.relation.validationCases.find((x) => x.id === caseId);
      if (
        c.relation.validationStatus !== "validating" ||
        item?.executionState !== "running"
      )
        throw new Error("当前没有正在执行的用例。");
      return commit(
        c,
        {
          ...c.relation,
          validationCases: c.relation.validationCases.map((x) =>
            x.id === caseId
              ? { ...x, executionState: "cancelled", executionEndedAt: now() }
              : x,
          ),
        },
        "取消验证用例执行",
      );
    },
    startValidationCase(id, caseId, input = {}) {
      const c = context(id);
      const item = c.relation.validationCases.find((x) => x.id === caseId);
      if (c.relation.validationStatus !== "validating" || !item)
        throw new Error("请先开始本轮验证。");
      if (
        !c.checks.ready ||
        c.relation.validationContextKey !== validationContextKey(c)
      )
        throw new Error("配置已变化，请重新开始本轮验证。");
      if (
        c.relation.validationCases.some((x) => x.executionState === "running")
      )
        throw new Error("请先结束正在执行的用例。");
      const at = now();
      const attemptId = makeId("case-execution");
      const selected = [
        ...new Set(input.judgementItemIds || item.judgementItemIds || []),
      ];
      if (
        !selected.length ||
        selected.some(
          (id) => !c.checks.activeJudgementItems.some((j) => j.id === id),
        )
      )
        throw new Error("请选择当前用例涉及的有效判断项。");
      const updatedCase = {
        ...item,
        judgementItemIds: selected,
        executionState: "running",
        executionAttemptId: attemptId,
        executionStartedAt: at,
        executionEndedAt: "",
        result: "pending",
        actualResult: "",
        reviewNote: "",
        evidenceUrl: "",
        evidenceRef: "",
        executionRecordId: "",
        executionRecordSnapshot: null,
        executedAt: "",
        executionHistory: [
          ...(item.executionHistory || []),
          ...(item.executionAttemptId || item.executedAt
            ? [structuredClone({ ...item, executionHistory: undefined })]
            : []),
        ],
      };
      commit(
        c,
        {
          ...c.relation,
          fieldAcceptance: {
            status: "pending",
            runId: c.relation.validationRunId,
          },
          enableStatus: "disabled",
          validationCases: c.relation.validationCases.map((x) =>
            x.id === caseId ? updatedCase : x,
          ),
        },
        "开始执行验证用例",
      );
      return updatedCase;
    },
    endValidationCase(id, caseId, executionRecordId) {
      const c = context(id);
      const item = c.relation.validationCases.find((x) => x.id === caseId);
      if (
        c.relation.validationStatus !== "validating" ||
        item?.executionState !== "running"
      )
        throw new Error("请先开始执行当前用例。");
      let result = {};
      if (c.relation.validationPurpose === "real") {
        const record = (c.data.aiFieldValidationExecutions || []).find(
          (r) => r.id === executionRecordId,
        );
        const errors = executionRecordIssues(
          record,
          c.relation,
          item,
          c.aiConfig,
          c.data.aiCapabilities,
        );
        if (errors.length) throw new Error(errors[0]);
        if (record.executionAttemptId !== item.executionAttemptId)
          throw new Error("执行记录不属于本次执行，请等待本次测试结果。");
        result = {
          executionRecordId: record.id,
          executionRecordSnapshot: structuredClone(record),
          actualResult: record.actualResult,
          executor: record.executor,
          evidenceUrl: record.evidenceUrl,
        };
      }
      const updatedCase = {
        ...item,
        ...result,
        executionState: "awaiting_review",
        executionEndedAt: now(),
      };
      commit(
        c,
        {
          ...c.relation,
          validationCases: c.relation.validationCases.map((x) =>
            x.id === caseId ? updatedCase : x,
          ),
        },
        "结束验证用例执行",
      );
      return updatedCase;
    },
    startSopWorkstationValidation(id, environment, { restart = false, field = false } = {}) {
      const c = context(id);
      if (!c.checks.ready)
        throw new Error(c.checks.issues[0] || "工位配置检查尚未通过。");
      if (field) {
        const issues = fieldModelIssues(referencedValidationCapabilities(c.aiConfig, c.data.aiCapabilities), c.data);
        if (issues.length) throw new Error(issues.join("；"));
      }
      if (c.relation.validationStatus === "validating" && !restart)
        throw new Error(
          "本轮验证正在执行，请继续办理用例，或选择重新开始验证。",
        );
      if (!String(environment?.tester || "").trim())
        throw new Error("请填写本轮验证负责人。");
      const at = now(),
        runId = makeId("field-validation");
      const records = [...(c.relation.validationRecords || [])];
      if (
        c.relation.validationCases?.some((x) => x.result !== "pending") &&
        !records.some((r) => r.runId && r.runId === c.relation.validationRunId)
      )
        records.unshift({
          id: makeId("validation-record"),
          runId: c.relation.validationRunId || "",
          overallResult: "interrupted",
          completedAt: at,
          environment: structuredClone(c.relation.validationEnvironment),
          cases: structuredClone(c.relation.validationCases),
          validatedBy: c.relation.validationEnvironment?.tester || "未记录",
        });
      const updated = {
        ...c.relation,
        ...(field ? { validationPurpose: "real" } : {}),
        acceptancePolicy: "field_evidence_v1",
        fieldAcceptance: { status: "pending", runId },
        validationRunId: runId,
        validationContextKey: validationContextKey(c),
        validationStatus: "validating",
        enableStatus: "disabled",
        validationStartedAt: at,
        validationCases: createDefaultValidationCases(
          {
            ...c.aiConfig,
            validationScenarioSet: c.relation.validationScenarioSet,
          },
          () => makeId("validation-case"),
        ),
        validationRecords: records,
        validationEnvironment: {
          lighting: "正常",
          occlusion: "无遮挡",
          tools: "",
          note: "",
          ...environment,
          tester: environment.tester.trim(),
        },
        validationInvalidationReason: "",
        updatedAt: at,
      };
      return commit(c, updated, "开始工位现场验证");
    },
    saveSopWorkstationValidationCase(id, caseId, input) {
      const c = context(id),
        original = c.relation.validationCases?.find((x) => x.id === caseId);
      if (c.relation.validationStatus !== "validating" || !original)
        throw new Error("当前用例已失效或不在验证中。");
      if (original.executionState === "running")
        throw new Error("请先结束执行，再保存验收结果。");
      if (
        input.result !== "not_applicable" &&
        original.executionAttemptId &&
        !["awaiting_review", "saved"].includes(original.executionState)
      )
        throw new Error("请完成本次执行后再保存结果。");
      const scenario = validationPlan(c.aiConfig, c.relation).find(
        (s) => s.key === original.scenarioType,
      );
      if (
        input.result === "not_applicable" &&
        scenario?.advanced &&
        scenario.required
      )
        throw new Error("当前配置依赖此高级场景，必须完成验证。");
      if (original.executedAt && input.executedAt !== original.executedAt)
        throw new Error("用例结果已更新，请刷新后重试。");
      const validIds = new Set(c.checks.activeJudgementItems.map((i) => i.id));
      if ((input.judgementItemIds || []).some((id) => !validIds.has(id)))
        throw new Error("所选判断项已经变化。");
      let updatedCase = {
        ...original,
        judgementItemIds: [...new Set(input.judgementItemIds || [])],
        actualResult: String(input.actualResult || "").trim(),
        reviewNote: String(input.reviewNote || "").trim(),
        result: input.result,
        executionState: "saved",
        notApplicableReason: String(input.notApplicableReason || "").trim(),
        excludedJudgementItems: Object.fromEntries(
          Object.entries(input.excludedJudgementItems || {}).filter(([id]) =>
            validIds.has(id),
          ),
        ),
        note: String(input.note || "").trim(),
        executor: String(
          input.executor || c.relation.validationEnvironment?.tester || "",
        ).trim(),
        evidenceUrl: validationEvidenceUrl(input.evidenceUrl),
        evidenceRef: validationEvidenceUrl(input.evidenceUrl),
        resultSource: "manual",
        executionRecordId: "",
        executedAt: now(),
      };
      if (
        c.relation.validationPurpose === "real" &&
        input.result !== "not_applicable"
      ) {
        const execution = (c.data.aiFieldValidationExecutions || []).find(
          (r) => r.id === input.executionRecordId,
        );
        const errors = executionRecordIssues(
          execution,
          c.relation,
          updatedCase,
          c.aiConfig,
          c.data.aiCapabilities,
        );
        if (errors.length) throw new Error(errors[0]);
        if (
          original.executionAttemptId &&
          execution.executionAttemptId !== original.executionAttemptId
        )
          throw new Error("执行记录不属于本次执行。");
        if (input.result === "passed" && execution.expectationMatched !== true)
          throw new Error("执行记录未确认符合期望，不能登记为通过。");
        updatedCase = {
          ...updatedCase,
          executionRecordId: execution.id,
          executionRecordSnapshot: structuredClone(execution),
          actualResult: execution.actualResult,
          executor: execution.executor,
          executedAt: execution.completedAt,
          evidenceUrl: execution.evidenceUrl,
          evidenceRef: execution.evidenceUrl,
          resultSource: "real",
        };
      }
      const errors = validationCaseInputIssues(
        updatedCase,
        activeJudgementItems(c.aiConfig),
      );
      if (errors.length) throw new Error(errors[0]);
      const updated = {
        ...c.relation,
        fieldAcceptance: {
          status: "pending",
          runId: c.relation.validationRunId,
        },
        validationCases: c.relation.validationCases.map((x) =>
          x.id === caseId ? updatedCase : x,
        ),
        updatedAt: now(),
      };
      commit(c, updated, "保存现场验证用例");
      return updatedCase;
    },
    completeSopWorkstationValidation(id) {
      const c = context(id);
      if (c.relation.validationStatus !== "validating")
        throw new Error("请先开始现场验证。");
      const result = validationResult(c),
        at = now(),
        formal = c.relation.validationPurpose === "real";
      const record = {
        id: makeId("validation-record"),
        runId: c.relation.validationRunId,
        scope: formal ? "field" : "configuration",
        validatedBy: c.relation.validationEnvironment.tester,
        startedAt: c.relation.validationStartedAt,
        completedAt: at,
        overallResult: result.passed ? "passed" : "failed",
        environment: structuredClone(c.relation.validationEnvironment),
        modelReports: referencedValidationCapabilities(
          { ...c.aiConfig, judgementItems: activeJudgementItems(c.aiConfig) },
          c.data.aiCapabilities,
        ).map((cap) => ({
          capabilityId: cap.id,
          report: structuredClone(currentModelReport(cap, c.data)),
        })),
        cases: structuredClone(c.relation.validationCases),
        coverage: result.coverage,
        issues: result.issues,
        summary: {
          caseCount: c.relation.validationCases.length,
          passedCount: result.passedCount,
          failedCount: result.failedCount,
          notApplicableCount: result.notApplicableCount,
        },
      };
      const updated = {
        ...c.relation,
        validationStatus: result.passed ? "passed" : "failed",
        enableStatus: "disabled",
        fieldAcceptance: {
          status:
            formal && result.passed
              ? "passed"
              : result.passed
                ? "configuration_checked"
                : "failed",
          runId: c.relation.validationRunId,
          at,
        },
        lastValidatedAt: at,
        lastValidatedBy: record.validatedBy,
        validationRecords: [record, ...(c.relation.validationRecords || [])],
        updatedAt: at,
      };
      commit(
        c,
        updated,
        result.passed
          ? formal
            ? "现场验收通过"
            : "配置检查通过"
          : "验证不通过",
      );
      return { updated, record, result };
    },
    enableSopWorkstationAi(id) {
      const c = context(id);
      assertFieldEnablement(c);
      return commit(
        c,
        {
          ...c.relation,
          enableStatus: "enabled",
          enabledAt: now(),
          updatedAt: now(),
        },
        "启用工位AI评价",
      );
    },
  };
  actions.startSopWorkstationFieldValidation = (id, environment, options = {}) => actions.startSopWorkstationValidation(id, environment, { ...options, field: true });
  return actions;
}
