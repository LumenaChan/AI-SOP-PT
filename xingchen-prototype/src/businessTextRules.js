import { displayDateTime } from "./dateTimeRules.js";

// Presentation only. Historical messages keep their original bytes and IDs;
// readable pages/exports translate known system terminology, never enum keys.
const TERMS = [
  ["Automatic evaluation gate", "自动评价启用检查"],
  ["Completion Scoring Coverage", "完成条件与评分规则覆盖情况"],
  ["Validation Test Case", "现场验证用例"],
  ["Difficult Sample Feedback", "困难样本反馈"],
  ["Compatibility Decision", "兼容性结论"],
  ["AI Impact Assessment", "AI适配影响评估"],
  ["Time Range Annotation", "时间片段标注"],
  ["Evaluation Mapping", "评价映射"],
  ["Existing Capability", "复用已有能力"],
  ["Configuration Only", "仅需配置"],
  ["Training Required", "需要训练"],
  ["Workstation Profile", "工位配置"],
  ["Evaluation Item", "评价项"],
  ["Machine Event", "机器事实"],
  ["Incomplete Policy", "未完成处理规则"],
  ["Primary Camera", "主摄像头"],
  ["Fallback Camera", "备用摄像头"],
  ["Primary Actor", "主操作人"],
  ["Observation Window", "观察窗口"],
  ["Evaluation Clock", "评价计时"],
  ["Technical Incident", "技术异常"],
  ["Safety Candidate", "安全待确认事项"],
  ["Score Disposition", "成绩处理状态"],
  ["Session-Step", "单次实训中的步骤"],
  ["Score Rule", "评分规则"],
  ["Safety Rule", "安全规则"],
  ["Source Video", "源视频"],
  ["AI Package", "AI能力包"],
  ["Step ID", "步骤编号"],
  ["Annotation", "标注"],
  ["Dataset", "数据集"],
  ["Mapping", "评价映射"],
  ["Session", "实训记录"],
].map(([term, label]) => [
  // Do not translate substrings of identifiers, filenames or resource paths.
  new RegExp(
    `(?<![A-Za-z0-9_./-])${term.replaceAll(" ", "\\s+")}(?![A-Za-z0-9_./-])`,
    "g",
  ),
  label,
]);

export function displayBusinessText(value) {
  const text = displayDateTime(value);
  if (typeof text !== "string") return text;
  const readable = TERMS.reduce(
    (result, [term, label]) => result.replace(term, label),
    text,
  );
  return readable.replace(
    /人员绑定：(confirmed|uncertain|lost|rebind_required)(?![A-Za-z0-9_])/g,
    (_, state) =>
      `人员绑定：${
        {
          confirmed: "已确认",
          uncertain: "不确定",
          lost: "已丢失",
          rebind_required: "需要重新绑定",
        }[state]
      }`,
  );
}

export function displayStepLabel(id) {
  return typeof id === "string" ? id.replace(/^Step\s+(\d+)$/, "步骤 $1") : id;
}
