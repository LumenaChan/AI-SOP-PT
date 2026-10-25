import { validateExistingModelReport } from "./modelProvenanceRules.js";
import {
  createDefaultValidationCases,
  setJudgementCameraBinding,
} from "./sopWorkstationAiRules.js";
import {
  createPreannotationTask,
  finishPreannotationDemo,
} from "./preannotationRules.js";
export function createEnhancementActions({ setData, now, makeId }) {
  const change = (action, fn) => {
    let result;
    setData((current) => {
      const next = structuredClone(current);
      result = fn(next);
      next.auditLogs = [
        ...(next.auditLogs || []),
        {
          id: makeId("enhancement-log"),
          time: now(),
          actor: "admin",
          role: "管理员",
          action,
          target: result?.id || "当前记录",
          result: "成功",
        },
      ];
      return next;
    });
    return result;
  };
  return {
    restorePublishedModel(capabilityId, recordId, reason) {
      return change("恢复上次模型并要求重新验证", (d) => {
        if (!String(reason || "").trim()) throw new Error("请填写恢复原因");
        const record = d.aiModelPublicationRecords.find(
          (r) => r.id === recordId && r.capabilityId === capabilityId,
        );
        if (!record?.previousModel?.modelArtifactId)
          throw new Error("该记录未保留可恢复的模型");
        const cap = d.aiCapabilities.find((c) => c.id === capabilityId);
        if (!cap) throw new Error("能力不存在");
        const previousModel = structuredClone(cap.currentPublishedModel),
          restored = structuredClone(record.previousModel);
        cap.currentPublishedModel = {
          ...restored,
          publishedAt: now(),
          publishedBy: "系统管理员",
        };
        cap.status = "已发布";
        cap.currentModelStatus = "已发布";
        const affectedConfigIds = d.aiCapabilityConfigs
          .filter((c) =>
            c.judgementItems.some((i) =>
              i.conditions.some((k) => k.capabilityId === capabilityId),
            ),
          )
          .map((c) => c.id);
        const recovery = {
          id: makeId("model-recovery"),
          capabilityId,
          candidateId:
            restored.candidateId || "recovery-" + restored.modelArtifactId,
          trainingTaskId: restored.trainingTaskId || "",
          modelArtifactId: restored.modelArtifactId,
          resultSource: restored.resultSource || "legacy_unverified",
          previousModel,
          restoreReason: reason.trim(),
          publicationType: "restore",
          replacedExistingModel: true,
          publishedBy: "系统管理员",
          publishedAt: now(),
          metricSummary: restored.metricSummary || {},
          affectedConfigIds,
          affectedConfigCount: affectedConfigIds.length,
        };
        d.aiModelPublicationRecords.unshift(recovery);
        for (const r of d.sopWorkstationAiConfigs)
          if (affectedConfigIds.includes(r.sopAiConfigId)) {
            r.validationStatus = "pending_revalidation";
            r.validationInvalidationReason =
              "当前模型恢复到历史产物，需重新现场验证";
          }
        return recovery;
      });
    },
    expandValidationScenarios(id) {
      return change("扩展现场验证场景", (d) => {
        const r = d.sopWorkstationAiConfigs.find((r) => r.id === id);
        if (!r) throw new Error("工位配置不存在");
        r.validationScenarioSet = "extended";
        const config = d.aiCapabilityConfigs.find(
            (c) => c.id === r.sopAiConfigId,
          ),
          cases = createDefaultValidationCases(
            { ...config, validationScenarioSet: "extended" },
            (key) => makeId(key),
          );
        r.validationCases = [
          ...(r.validationCases || []),
          ...cases.filter(
            (c) =>
              !(r.validationCases || []).some(
                (x) => x.scenarioType === c.scenarioType,
              ),
          ),
        ];
        r.validationStatus =
          r.validationStatus === "validating"
            ? "validating"
            : "pending_revalidation";
        r.acceptancePolicy = "field_evidence_v1";
        r.fieldAcceptance = {
          status: "pending",
          runId: r.validationRunId || "",
        };
        r.enableStatus = "disabled";
        return r;
      });
    },
    evaluateExistingModel(id, purpose = "prototype_demo", inputReport) {
      return change("验证已有模型候选", (d) => {
        const candidate = d.aiExistingModelCandidates.find((c) => c.id === id);
        if (!candidate) throw new Error("候选不存在");
        const report =
          purpose === "prototype_demo"
            ? {
                id: makeId("demo-report"),
                candidateId: id,
                capabilityId: candidate.capabilityId,
                modelArtifactId: candidate.modelArtifactId,
                datasetRef: "prototype-demo-independent-fixture",
                passed: true,
                resultSource: "prototype_demo",
                note: "演示检查，未运行真实算法",
              }
            : inputReport;
        const check = validateExistingModelReport(candidate, report, purpose);
        if (!check.ready) throw new Error(check.issues.join("；"));
        candidate.independentReport = report;
        candidate.status = "validated";
        candidate.executionPurpose = purpose;
        candidate.resultSource = report.resultSource;
        return candidate;
      });
    },
    publishExistingModel(id) {
      return change("发布已有模型演示候选", (d) => {
        const candidate = d.aiExistingModelCandidates.find((c) => c.id === id);
        if (!candidate || candidate.status !== "validated")
          throw new Error("请先完成候选验证");
        const check = validateExistingModelReport(
          candidate,
          candidate.independentReport,
          candidate.executionPurpose,
        );
        if (!check.ready) throw new Error(check.issues.join("；"));
        if (d.aiModelPublicationRecords.some((r) => r.candidateId === id))
          throw new Error("该候选已经发布");
        const cap = d.aiCapabilities.find(
          (c) => c.id === candidate.capabilityId,
        );
        const previousModel = cap.currentPublishedModel
          ? structuredClone(cap.currentPublishedModel)
          : null;
        cap.currentPublishedModel = {
          candidateId: id,
          modelArtifactId: candidate.modelArtifactId,
          resultSource: candidate.resultSource,
          executionPurpose: candidate.executionPurpose,
          integrationStatus: candidate.integrationStatus || "unverified",
          source: "existing_model",
          publishedAt: now(),
          independentReport: candidate.independentReport,
        };
        cap.status = "已发布";
        cap.currentModelStatus = "已发布";
        candidate.status = "published";
        d.aiModelPublicationRecords.unshift({
          id: makeId("publication"),
          previousModel,
          replacedExistingModel: !!previousModel,
          candidateId: id,
          capabilityId: cap.id,
          modelArtifactId: candidate.modelArtifactId,
          resultSource: candidate.resultSource,
          publishedAt: now(),
          publishedBy: "系统管理员",
          metricSummary: {},
          affectedConfigIds: (d.aiCapabilityConfigs || [])
            .filter((c) =>
              c.judgementItems.some((j) =>
                j.conditions.some((k) => k.capabilityId === cap.id),
              ),
            )
            .map((c) => c.id),
        });
        const affected = new Set(
          d.aiModelPublicationRecords[0].affectedConfigIds,
        );
        for (const r of d.sopWorkstationAiConfigs)
          if (affected.has(r.sopAiConfigId)) {
            r.validationStatus = "pending_revalidation";
            r.validationInvalidationReason = "当前能力模型已替换，需要重新验证";
          }
        return candidate;
      });
    },
    setCameraActorBinding(arrangementId, workstationId, cameraId, status) {
      return change("确认跨镜头人物归属", (d) => {
        const session = d.arrangements
          .find((a) => a.id === arrangementId)
          ?.sessions.find((s) => s.workstationId === workstationId);
        if (!session) throw new Error("会话不存在");
        if (!["confirmed", "uncertain"].includes(status))
          throw new Error("归属状态无效");
        session.runtime.cameraActorBindings = {
          ...session.runtime.cameraActorBindings,
          [cameraId]: {
            cameraId,
            status,
            actorId: session.studentId,
            trackId: makeId("demo-track"),
            resultSource: "prototype_demo",
            confirmedAt: now(),
          },
        };
        session.runtime.actorHandoffHistory = [
          ...(session.runtime.actorHandoffHistory || []),
          {
            cameraId,
            status,
            actorId: session.studentId,
            time: now(),
            resultSource: "prototype_demo",
          },
        ];
        return session;
      });
    },
    saveMultiCameraBinding(relationId, judgementItemId, input) {
      return change("保存多视角策略", (d) => {
        const index = d.sopWorkstationAiConfigs.findIndex(
          (r) => r.id === relationId,
        );
        if (index < 0) throw new Error("工位配置不存在");
        const config = d.sopWorkstationAiConfigs[index],
          workstation = d.workstations.find(
            (w) => w.id === config.workstationId,
          );
        const updated = setJudgementCameraBinding({
          config,
          judgementItemId,
          ...input,
          workstation,
          now: now(),
        });
        d.sopWorkstationAiConfigs[index] = updated;
        return updated;
      });
    },
    updateSampleMetadata(kind, id, patch) {
      return change("保存样本属性", (d) => {
        const key =
          kind === "video"
            ? "aiSourceVideos"
            : kind === "frames"
              ? "aiFrames"
              : "aiClips";
        const item = d[key]?.find((x) => x.id === id);
        if (!item) throw new Error("样本不存在");
        if (
          kind === "video" &&
          item.sampleUse === "sealed_test" &&
          patch.sampleUse &&
          patch.sampleUse !== "sealed_test"
        )
          throw new Error(
            "封存测试素材不能直接改为训练用途，请另行采集独立开发素材。",
          );
        const fields =
          kind === "video"
            ? [
                "sourceGroupId",
                "participantId",
                "captureBatch",
                "sampleUse",
                "sampleType",
                "captureConditions",
              ]
            : [
                "sampleType",
                "sampleCompleteness",
                "visibility",
                "samplePurpose",
              ];
        for (const k of fields) if (k in patch) item[k] = patch[k];
        if (kind === "video")
          for (const config of d.aiTrainingDataConfigs || [])
            if (config.capabilityId === item.capabilityId) {
              config.readinessStatus = "pending";
              config.preparedAt = "";
            }
        return item;
      });
    },
    startPreannotation(capabilityId) {
      return change("创建预标注演示任务", (d) => {
        const cap = d.aiCapabilities.find((x) => x.id === capabilityId);
        if (!cap) throw new Error("能力不存在");
        const task = createPreannotationTask({
          capabilityId,
          items: (cap.type === "object_detection"
            ? d.aiFrames
            : d.aiClips
          ).filter((x) => x.capabilityId === capabilityId),
          sourceVideos: d.aiSourceVideos,
          categories: d.aiAnnotationCategories.filter(
            (x) => x.capabilityId === capabilityId,
          ),
          id: makeId("preannotation"),
          now: now(),
        });
        d.aiPreannotationTasks = [task, ...(d.aiPreannotationTasks || [])];
        return task;
      });
    },
    runPreannotation(id, failOne = false) {
      return change("运行预标注演示", (d) => {
        const task = d.aiPreannotationTasks?.find((x) => x.id === id);
        if (!task) throw new Error("任务不存在");
        const updated = finishPreannotationDemo(task, {
          items: [...(d.aiFrames || []), ...(d.aiClips || [])],
          sourceVideos: d.aiSourceVideos,
          categories: d.aiAnnotationCategories.filter(
            (x) => x.capabilityId === task.capabilityId,
          ),
          now: now(),
          failOne,
        });
        Object.assign(task, updated);
        return task;
      });
    },
    cancelPreannotation(id) {
      return change("取消预标注任务", (d) => {
        const task = d.aiPreannotationTasks?.find((x) => x.id === id);
        if (!task || !["pending", "processing"].includes(task.status))
          throw new Error("任务已结束");
        task.status = "canceled";
        return task;
      });
    },
    dismissSuggestion(taskId, itemId) {
      return change("不采用预标注建议", (d) => {
        const s = d.aiPreannotationTasks
          ?.find((t) => t.id === taskId)
          ?.suggestions.find((x) => x.itemId === itemId);
        if (!s) throw new Error("建议不存在");
        s.status = "rejected";
        return { id: itemId };
      });
    },
    saveValidationPurpose(id, patch) {
      return change("保存验证用途与证据", (d) => {
        const r = d.sopWorkstationAiConfigs.find((x) => x.id === id);
        if (!r) throw new Error("工位配置不存在");
        if (!["prototype_demo", "real"].includes(patch.validationPurpose))
          throw new Error("请选择有效的验证用途");
        r.validationPurpose = patch.validationPurpose;
        r.acceptancePolicy = "field_evidence_v1";
        r.fieldAcceptance = {
          status: "pending",
          runId: r.validationRunId || "",
        };
        r.validationStatus = "pending_revalidation";
        r.enableStatus = "disabled";
        return r;
      });
    },
    saveExistingModelCandidate(capabilityId, input) {
      return change("登记已有模型候选", (d) => {
        const cap = d.aiCapabilities.find((x) => x.id === capabilityId);
        if (!cap) throw new Error("能力不存在");
        if (!input.modelArtifactId?.trim() || !input.description?.trim())
          throw new Error("请填写模型产物标识和适用说明");
        const candidate = {
          ...input,
          id: makeId("existing-model"),
          capabilityId,
          source: "existing_model",
          resultSource: "prototype_demo",
          status: "pending_validation",
          createdAt: now(),
        };
        d.aiExistingModelCandidates = [
          candidate,
          ...(d.aiExistingModelCandidates || []),
        ];
        return candidate;
      });
    },
  };
}
