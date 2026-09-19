# Design QA — SOP 业务真源与模型边界改造

- Source visual truth: `/Users/chenxuguang/Documents/ChatGPT/AI SOP 实训评价/xingchen-prototype/public/assets/reference-monitor.png`
- Product-rule source: `/Users/chenxuguang/Documents/ChatGPT/AI SOP 实训评价/【基于3个开源项目】高职实训_SOP智能识别技术方案_V1.0.md`，重点为 §3.1、§10–14、§29、§45。
- Implementation routes: `/teacher/sop`、`/teacher/sop/edit/s2`、`/teacher/sop/s1`、`/teacher/practices/p1/stations/1`。
- Desktop implementation evidence: `audit-2026-09-18/25-sop-ground-truth-editor.png`、`26-sop-model-mapping.png`、`27-monitor-decision-chain.png`、`28-sop-governance-list.png`。
- Responsive evidence: `audit-2026-09-18/30-sop-editor-827-fixed.png`。
- Shared visual comparison: `audit-2026-09-18/31-sop-governance-comparison.png`。
- State: 教师编辑“工业机器人末端夹具更换”草稿，分别查看教师定义步骤、数据与模型映射、状态机与评分、审核发布；实时监控使用 SOP V3.2 与动作模型 V1.8。

## Capture normalization

- Source image: 1487 × 1058 pixels.
- Desktop viewport and screenshots: 1280 × 720 CSS px; the in-app browser normalized screenshot output to 1280 × 720 pixels while reporting device pixel ratio 2.
- Responsive viewport and screenshot: 827 × 704 CSS px and 827 × 704 pixels.
- Shared comparison: 1280 × 991 pixels. The source and three desktop implementation captures were rendered at equal column widths without browser chrome.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3 follow-up only: the data/model mapping page could later add a confusion-matrix drill-down once the product has real evaluation data. It is not necessary for the current prototype decision.

## Required fidelity surfaces

- Fonts and typography: the new five-stage flow, authority callouts, mapping rows, metrics, and state labels reuse the existing Chinese system-font hierarchy. The 827 px hard-wrap issue found in the first pass was fixed by switching the compact stepper to vertically stacked number/label controls.
- Spacing and layout rhythm: desktop preserves the 196 px sidebar, 18 px content inset, 16 px section gaps, 8–10 px radii, and the existing panel density. The teacher-step editor and model-mapping page use the same two-column content rhythm as adjacent prototype pages.
- Colors and visual tokens: navy navigation, blue active/primary states, light blue governance surfaces, green validated states, and amber review states match the established prototype. No gradients or new visual language were introduced.
- Image quality and assets: the change does not introduce new decorative/product imagery. Existing monitor imagery remains sharp and correctly cropped; icons come from the existing Ant Design icon family.
- Copy and content: copy consistently separates teacher-owned SOP, Dataset labels, action-model candidates, mandatory Other, and state-machine decisions. No UI claims that video upload can generate or rewrite SOP steps.
- Accessibility: workflow stages and step rows are buttons, camera view remains tabs with `aria-selected`, governance and decision-chain information is available as text rather than color alone, and the checked 827 px viewport has no page-level horizontal overflow.

## Full-view comparison evidence

- The shared comparison confirms that the new pages retain the visual source's navy/blue enterprise structure, left navigation, white data surfaces, dense but scannable information hierarchy, small semantic tags, and restrained borders.
- The governance banner adds one horizontal explanatory layer without displacing the primary SOP table below the fold at 1280 × 720.
- The teacher-definition and model-mapping states keep the editor's existing header and stepper, so the new product boundary reads as an evolution of the current prototype rather than a separate tool.

## Focused region evidence

- `25-sop-ground-truth-editor.png` shows the teacher-owned business truth callout, fixed Step ID, completion condition, dependency, required/optional property, timeout, score, and functional add/reorder controls.
- `26-sop-model-mapping.png` shows each fixed Step label, sample count, model validation state, mandatory Other category, Dataset version, Sequence Accuracy, and conflict-review path.
- `27-monitor-decision-chain.png` shows locked SOP/model versions, model-candidate wording, confidence, and state-machine legality status on the live video screen. The lower decision-chain and Top-3 candidate controls were verified through the semantic DOM because they fall below the 720 px first viewport.
- `30-sop-editor-827-fixed.png` demonstrates the repaired compact stepper and zero horizontal overflow at the product's required embedded-browser width.

## Primary interactions tested

- Added a sixth teacher-defined step: step count changed from 5 to 6 and the new Step 06 became visible.
- Switched to “数据与模型映射”: mandatory Other and “不会自动扩展或改名” guidance rendered.
- Switched to “状态机与评分”: PENDING/ACTIVE/COMPLETED plus SKIPPED, Sequence Break, Repeated, TIMEOUT, and Other states rendered.
- Switched to “审核发布” and opened the release confirmation: the dialog states that SOP V1.5 is frozen while the model iterates independently.
- Verified live-monitor model/SOP version lock, candidate output, Top-3 actions, and deterministic state-machine result.
- Browser console checked after navigation and interactions: 0 errors and 0 warnings.

## Comparison history

- Pass 1 finding [P2]: at 827 px, the five-stage workflow labels wrapped awkwardly inside horizontal controls, splitting “教师定义步骤” and “状态机与评分” across lines and reducing scanability.
- Fix: under 900 px, the stepper switches to a vertical number-over-label layout with smaller type and no label wrapping.
- Post-fix evidence: `audit-2026-09-18/30-sop-editor-827-fixed.png`; viewport `scrollWidth` equals 827 px and all five labels are readable.
- Pass 2: no actionable P0/P1/P2 differences remain.

## Implementation checklist

- [x] Teacher-owned SOP definition precedes any model work.
- [x] SOP, Dataset, and model versions are visibly independent.
- [x] Model output is constrained to fixed Step IDs plus mandatory Other.
- [x] State machine owns order, skip, repeat, timeout, and unknown judgments.
- [x] Learning corrections update training data only, never the published SOP.
- [x] Practice setup locks both SOP and action-model versions.
- [x] Live monitor exposes model candidate, confidence, SOP mapping, and state-machine decision.
- [x] Desktop and 827 px responsive states verified.
- [x] Core interactions and console checked.

final result: passed
