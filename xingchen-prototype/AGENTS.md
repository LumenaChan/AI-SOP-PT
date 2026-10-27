# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

User preference confirmed on 2026-10-04: do not perform visual browser inspection, screenshot capture, or visual browser verification unless the user explicitly requests it. Continue implementing authorized changes with builds and necessary code checks; keeping or opening the preview for the user does not authorize inspecting it. This preference overrides automatic visual QA guidance in design skills.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

Before adding or modifying any UI, read `docs/typography-standard.md` and apply its content-role typography rules. Reuse the defined hierarchy instead of introducing page-specific font sizes. If newer explicit user feedback changes a typography decision, update that document in the same change.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Product decisions for this prototype

- Naming decision confirmed on 2026-10-23: the teacher business module is “实训标准库”. User-facing standard creation/edit/copy/publish, arrangement selection, statistics, reports, exports and future operation messages use “实训标准” (or “标准名称／标准状态／本次标准快照” where context is explicit). “实训” alone still means an activity, not the standard object. Describe the underlying standard operating process as “标准操作流程（SOP）” in the existing library introduction and editor authority explanation.
- Preserve SOP where it conveys technical meaning: SOP/Step mapping, technical version bindings/diagnostics, SOP IDs, internal sopId/sopSnapshot fields, routes, storage/migration keys and compatibility screens. Do not globally replace every SOP, rename existing teacher-authored standard names or rewrite stored audit/history descriptions. Newly generated business operation messages use the current terminology. This naming change does not add course/curriculum standards, optional/branching steps or change publication/scoring/AI rules. Canonical terminology: docs/training-standard-terminology.md.

- “数据大屏” opens `/data-screen` in a new tab from teacher/admin topbars. It is a standalone menu-free public presentation surface, with a central workstation illustration, teaching results, AI coverage, safety/incident handling, and recording evidence. Use the wall-screen typography profile in `docs/typography-standard.md`. Keep demonstration data isolated from the application store and visibly identify demo mode; never mix demo records into real analytics. Exam operation results and unpublished scores must not appear on the public screen.
- Data-screen density feedback on 2026-10-04: keep a clear typography hierarchy and generous gaps; remove repeated explanatory text. Show numbered markers on the 2.5D scene and place workstation names/statuses in a separate aligned list. Display three SOP steps and three heatmap courses per group with rotation, and allow manual step paging while paused. The later explicit feedback says all card text is too large: use 18px card titles, 16px primary content, 14px body/chart labels and 12px metadata; headline metrics use 40px and card figures 24–32px. Preserve card dimensions, spacing, the 36px page heading and proportional 4K scaling. These compact card sizes override the earlier wall-screen typography profile.
- Data-screen display settings are hidden by default and toggle only when clicking the bottom-right rotation-status text (“自动轮播” or “已暂停轮播”). Preserve its normal text appearance; do not add a visible switch, hover emphasis, or automatically reveal/hide settings on pointer movement, focus, keyboard activity, or timers. Clicking the text only toggles settings visibility; the settings panel retains the separate pause/resume action.
- Data-screen vertical spacing feedback on 2026-10-04: keep the title itself in place, extend its row to 72px so the lower separator and all following content move down 8px. Keep the footer at 18px high with 12px side text and 13px center copy; reduce canvas bottom padding from 24px to 12px and assign the remaining recovered space to the main content row.
- Data-screen workstation group pagination uses thin 5px indicator bars; the active bar may be wider but must not be taller than inactive bars.
- The panorama footer row (click hint, group indicators and page count) moves down together by 16px on the 1920px canvas, leaving approximately 12px below it inside the card.
- The workstation scene moves left 18px on the canvas, with SVG viewBox x-origin set to 28 to correct its internal right bias. Keep its size and the adjacent video/list positions; only workstation shapes receive pointer events so empty SVG space cannot obstruct video controls.
- The operation-process card body moves down by 8px by increasing its header-to-body gap from 8px to 16px; retain the card height, title position and existing content typography.
- The safety/incident card body also moves down by 8px, increasing its header-to-body gap from 12px to 20px while keeping the title and card dimensions fixed.
- Professional/course coverage entries and safety/incident entries use a 6px gap between the primary name and its secondary description/time line; retain their existing font sizes and row gaps.
- The recording-evidence card body uses the same 20px header-to-body gap, moving its content down by 8px while keeping the title and card dimensions fixed.
- The standards/capability-construction card body also uses a 20px header-to-body gap, moving its metrics and process caption down together by 8px.
- The weakness heatmap uses a subdued continuous navy-to-muted-blue/teal scale (#122d3e → #1b3c50 → #284b5e → #355a6c → #416879) across 0–100%, sharing its scale with the legend. Avoid bright yellow/gold heat cells that dominate the screen. No-sample cells remain darker neutral navy with a dash, and percentage labels remain readable.
- Data-screen camera interactions: clicking the inset swaps main and auxiliary views, and clicking it again restores the default. Clicking the large view opens that displayed view in a closable enlarged preview; close button, Escape and backdrop dismiss it. Camera interaction pauses rotation, and selecting a different workstation resets to its main view. Unavailable and exam-protected frames cannot be enlarged or swapped.
- Data-screen panorama feedback on 2026-10-04: add a main camera preview with a small auxiliary inset on the left, soften the picture edges into the navy background, shrink and move the workstation scene to the right, and narrow the status list to 148px with 14px workstation names, 12px statuses and a 6px name/status gap. Clicking a station updates its preview and SOP details and pauses rotation. Existing raster assets are explicitly labeled demonstration frames; the auxiliary sample is a detail crop of the same frame. Do not claim live video when there is no connected stream. Business mode uses configured camera availability and an honest pending/offline state; exams hide camera imagery and step details.

- Brand name: 兴辰智能. A placeholder logo is acceptable.
- Browser tab title: AI视觉实训操作流程智能评测系统. Use this system name in the shared HTML entry so every route has the same title.
- Remember-password sizing feedback on 2026-10-04: use 12px text and a 14×14px checkbox with a 6px gap, keeping both visually compact and vertically centered.
- Login secondary entries: below the submit button, show 学生登录 on the left and 数据大屏 on the right in two equal-width columns with centered 12px text. Student login stays in the current tab; 数据大屏 opens `/data-screen?scope=school` in a new tab.
- Login company name: place 兴辰智能（北京）科技有限公司 at the bottom, centered across the entire page width rather than aligned with the login card.
- Login footer slogan: show “每一次评价都有依据，用AI、标准、过程与证据，帮助教师更轻松地管理实训现场。” in one centered line above the company name, with a leading SafetyCertificateOutlined icon. Use the brand subtitle's 14px type and #d3dfeb text color; retain 12px company text and a 12px gap between the lines.
- Login layout feedback on 2026-10-04, latest composition correction: the center is most important, then the right-side monitor; the left-side car is least important. Clip the original panorama's leftmost 27% using a CSS viewport and proportionally fit the remaining 73% to the page width. Keep the high-voltage warning sign at the left edge and part of the right-side monitor visible beside the login card. Use the resulting 1447.59:793 image ratio, narrower top/bottom navy gradients, and softly faded image edges. Keep only the 360px floating white login card on the right and adapt to a single column on narrow screens.
- Login feedback on 2026-10-04: remove the "校内业务入口" eyebrow and automatic-role explanatory copy; add a refreshable four-character graphic captcha checked before login and a remember-password checkbox. Remember only successfully validated public prototype credentials, restore them on return, and clear the saved record when unchecked. This is a frontend prototype; backend authentication/captcha enforcement remains outside its scope.
- The data-screen brand mark uses Lucide's outline Brain icon to convey AI, as explicitly preferred over the robot icon. Its local SVG and ISC license live in public/assets; retain the blue-cyan color and 30px size.
- The top-left demonstration-data caption uses muted blue-cyan (#85b6c7), not yellow/gold.
- Visual source of truth: the first generated direction, the bright navy-and-blue “清晰教学台” monitoring dashboard saved at `public/assets/reference-monitor.png`.
- Scope: implement all 34 primary pages from PRD V1.1 with working navigation and the core teacher/admin interactions; use realistic mock data rather than backend services.
- The prototype must support desktop teaching workstations and wider classroom monitoring displays.
- Fixed voice commands and spoken prompts may be product-designed in the prototype.
- The user is a product manager and expects a directly accessible, interactive React prototype—not additional visual concept images.
- Data screen approved on 2026-10-04: replace the topbar “大屏模式” with “数据大屏”, open `/data-screen` in a new tab, and use a standalone 1920×1080 canvas with proportional 4K scaling. Use navy, electric blue, mint, and restrained gold with a central 2.5D workstation schematic, six headline metrics, and ten diverse business panels. Keep demo samples independent from the application store, label the mode, aggregate actual business records, and hide student identity, unpublished grades, and exam step details. Support automatic refresh, pausable rotation, and user-triggered fullscreen; use the data-screen typography rules in `docs/typography-standard.md`.

## Audit remediation decisions

- The prototype must remain usable in an 827px-wide split-view or embedded browser: the page itself must not overflow horizontally, while wide tables may scroll inside their own container.
- SOP step detail must show real standard actions, evidence requirements, deduction rules, and safety redlines rather than a generic confirmation placeholder.
- Manual score review must preserve an audit chain: conclusion, required rationale, referenced evidence, score-impact preview, operator, and save time.
- Teacher/admin switching must use an explicit identity menu and named switch action; clicking the avatar must not immediately change roles.
- The identity menu also provides an explicit data-source switch between the source-controlled CPD snapshot (`src/data/currentPrototypeData.json`) and this browser's local prototype data. The two working data sets persist independently and switching must never overwrite the inactive source.
- Monitoring event feeds must remain scannable, and historical comparisons expose exact values and differences in captured standard content; standard versions are not a business dimension.
- Each student/workstation must open a dedicated monitoring page. Its desktop layout uses a large live video area with action-detection marks in the upper left, all SOP action states directly below it, and a right-side column for compact statistics plus selected-step result, duration, evidence, and rule details. Ignore subtitles or branding baked into supplied video references.
- The monitoring page's SOP action cards use a fixed width in a single horizontal row at all viewport sizes; extra steps scroll within the action panel rather than shrinking cards or widening the page.
- AI capability configuration detail pages use the same compact typography in both Tab and waterfall modes: panel headings remain prominent, content titles use 13px, body and form text use 12px, secondary text uses 11px, and compact tags use 10px.
- In Tab mode, AI judgement configuration places SOP steps in a single horizontally scrolling row above the selected step. Teacher standards and AI configuration use the full content width below it. Preserve the waterfall layout when changing this Tab navigation.
- The standard is teacher-owned business ground truth and must never be generated or rewritten by the model. Maintain one current standard, overwritten on teacher edits; existing arrangements/sessions retain immutable captured content. The product flow is teacher-defined standard → action dataset labels mapped to fixed Step IDs plus mandatory Other → model candidate output → deterministic state-machine judgment. Dataset/model versions remain independently reviewed, deployed and auditable.
- Camera-only MVP boundary: the prototype must not depend on torque sensors, PLC/IoT, ASR, or other non-video signals. Camera-unjudgeable criteria, AI uncertainty, occlusion, and missing video evidence default to full score and may be teacher-audited; they do not block grade publishing. A teacher deduction requires a reason and audit record. A confirmed safety redline still pauses/blocks the session and requires review.
- Every SOP step must explicitly declare one of three judgement modes (video automatic, video-assisted with default pass, or video-unreliable with default pass/manual deduction) and include teacher-owned student teaching content, operating points, common mistakes, known video limits, and an optional standard media reference.
- The eight P0 minimum-operability additions accepted on 2026-09-19 are delivered in four batches: judgement/scoring plus teaching content; lightweight student workstation plus practice/exam feedback; implementation readiness plus SOP field validation; recording integrity plus minimal technical diagnostics.
- The student workstation is a standalone, session-bound surface at `/workstation/:arrangementId/:workstationId`, not a general student portal. It covers identity/task/workstation confirmation, readiness, start, teacher help, safe finish, and same-Session refresh recovery. Practice shows teacher-authored guidance, ordinary error/correction feedback, progress and live score; exams hide standard content, real-time correctness, deductions, confidence and score until teacher publication. Student help, AI uncertainty and system faults must surface in the teacher attention feed.
- Automatic evaluation is enabled per workstation and captured standard content only after an implementation baseline (camera position, lighting, occlusion, rectangular operation/tool/danger ROIs) and a passing eight-scenario field validation are recorded against matching standard content plus model, ROI and camera-config versions. Publishing or using an SOP never depends on this gate: any unavailable or invalidated automatic step degrades to the default-pass policy until the workstation is revalidated.
- Every Session has a formal recording-integrity state (`完整`, `部分缺失`, or `不可用`). Each step keeps its clip range, available cameras, and locked standard content plus model/ROI/camera-config versions. Recording gaps are system anomalies and never create an automatic student deduction; confirmed safety redlines remain blocking. Practice and exam recordings have separate retention periods, while scores, step records, teacher revisions, and audit logs survive full-video expiry.
- “Why no judgment” diagnostics are admin/implementation-only. They expose condition checks, recent observed facts, versions, one actionable no-trigger reason, and an audited root-cause category (`模型`, `ROI`, `SOP配置`, `系统`, `非AI问题`, or `未知`). Teacher views show business availability, coverage, evidence status, and known limitations but do not expose or edit model thresholds, frame counts, deployment, or rollback controls.
- Execute the 2026-09-18 audit remediation in numbered batches. Establish shared mock state, real submission, stable object IDs, role-safe read-only routes, and browser-verifiable acceptance before filling later modules. The class-management flow is the complete reference implementation for other master-data modules; never use a success toast for an operation that did not change data.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 2026-10-15 SOP prototype enhancement decisions

- Browser working data remains the preferred user work source. Preserve the current storage keys and source selection; a changed CPD file fingerprint must not reset a valid CPD working copy.
- Back up original storage bytes before persisting an upgrade. Route every write (including student face data) through the active source; failed storage writes must not update the in-memory business state. Source switches remount editing contexts so old drafts and dialogs cannot write into the other source.
- Follow the four-batch specifications in ../后续行动方案-2026-10-15/四批原型修改说明/. Their implementation ledger records coverage and verification. Keep original SOPs, IDs, annotations, historical scores and locked snapshots; append clearly identified examples through the shared, idempotent migration factory.
- Teacher visual requirements distinguish actions, states and processes. Default full score, flow completion and AI evidence confirmation are separate facts. Legacy pass records have unrecorded evidence provenance; never relabel them as real AI success.
- Preannotation proposals become editor drafts only, followed by human checking and normal save. Current proposal generation, model training and observation simulation are explicitly prototype demonstrations; real execution gates require independently traceable model/service and field evidence.
- Cameras use a shared collection adapter. Legacy second cameras retain a role-to-confirm label; ROI uniqueness is logical area plus camera. Multi-camera evidence requires the same confirmed actor and compatible time windows. New demonstration examples stay outside business wall-screen aggregates.
- Continue respecting the existing no-visual-browser-inspection preference. Builds, rule tests and server-rendered route checks are allowed. The command node scripts/verify-sop-enhancement.mjs verifies relevant page rendering without opening or inspecting browser content.

## 2026-10-15 Dashboard demonstration and camera consistency

- The teacher dashboard must contain sufficient navigable demonstration arrangements, including practice, exam, completed and preparation states. Append clearly identified demo records through an idempotent migration shared by CPD and browser working copies. Do not alter original lesson dates, sessions, scores or snapshots to populate today. Dashboard metrics and rows use the same actual schedule records; do not hide all samples merely because one lesson exists.
- Dashboard and practice/exam management lead to the same station monitoring page. All camera counts use the same selector and shared adapter, preserving each session's locked camera snapshot. Different camera counts across different workstations are expected; do not invent cameras or replace historical snapshots to force equal counts.

- Server-rendered verification must use an isolated temporary Vite cacheDir. Never share the preview server's dependency optimizer cache (including through a symlinked node_modules); doing so can invalidate dependency URLs and leave the preview blank with HTTP 504. Keep the original localhost origin and business storage intact when repairing preview availability.

- Dashboard typography feedback on 2026-10-15: schedule “进入 →” and teacher todo actions use the same compact 12px, 500-weight blue action style; never inherit body sizing and bold weight for these labels. Keep their action columns wide enough to avoid wrapping.

- Monitoring timeline alignment feedback on 2026-10-15: align timestamps, event-category badges and timeline dots on the first row; use top-aligned grid cells and a flex content column so wrapped event titles do not shift the badge downward.

- Station monitoring layout feedback on 2026-10-15: keep result/duration/score tiles compact. Put evaluation meaning and visual requirements in a separate full-width card below the SOP action strip in the main column, with requirements collapsed by default and following the selected step. Never place long requirements inside metric tiles or status tags. Apply the same separation to report evidence grids.

- Monitoring visual-priority feedback on 2026-10-15: the station page header leads directly into the video and live-status layout. Keep coverage totals in a collapsed disclosure within the right-side statistics; put selected-step camera evidence in a collapsed disclosure within the lower judgement explanation card. Do not insert full-width auxiliary summaries above the video.

- Station monitoring event placement feedback on 2026-10-15: place the current-session events card in the main column immediately below judgement explanation and visual requirements, retaining the complete-evidence link. Keep the right column focused on identity, statistics, student activity and current-step status.

- Long business-data layout feedback on 2026-10-15: never place a three-column judgement chain in the station sidebar. Show a compact evidence status and two-line standard/observation previews there; a named detail action opens and scrolls to the lower, default-collapsed vertical judgement process. Use recorded observation, locked step standard and actual result instead of fixed “candidate stable / allowed to enter” text or a decorative 100% capture bar.

- Current-session event spacing feedback on 2026-10-15: keep 12px between adjacent event cards so their borders never touch; preserve the outer panel padding and action-row spacing.

- Report observation-summary spacing feedback on 2026-10-15: separate the observation/event summary from the upper coverage summary by 12px and from the lower step/evidence card pair by 16px. Keep this row secondary, with the same spacing across teacher and administrator practice/exam records.

- Report evidence-row spacing feedback on 2026-10-15: keep a 16px gap above the evidence status/clip/camera/snapshot row so it is separated from the judgement explanation card across teacher/admin practice/exam reports.

- Student workstation camera feedback on 2026-10-15: provide a dropdown in the video card header at the top right for all multi-camera configurations, using student-readable 15–16px controls. Do not add a separate switch-button or explanatory-text row; preserve supplemental-preview context in option labels and the picture caption. Preview switching is local UI state and must not change progression, evaluation, recording or snapshots. Include later-added cameras from the same workstation as clearly marked supplemental previews while preserving the session's original evaluation camera scope. Offline views show an unavailable state; never offer another workstation's camera. Static images and detail crops must be labeled as demonstrations.

- System-service status feedback on 2026-10-15: service-row status backgrounds fit their text width and align to the right edge; the fixed grid action column must not stretch the badge background.

- Admin overview spacing feedback on 2026-10-15: leave 16px between the system-incidents panel and the following system-services panel.

- Identity-menu feedback on 2026-10-15: keep prototype data-source switching and export tools inside a default-collapsed, muted “原型数据与备份” disclosure. Only show a compact current-source label while collapsed; every menu opening starts collapsed and leaves the chosen source unchanged.

## 2026-10-17 Prototype schedule date policy

- Explicit user decision: the teacher dashboard “今日安排” is a prototype demonstration list and must not filter by the real calendar date. Show existing non-draft, non-cancelled, non-archived arrangements regardless of their saved date, with running sessions first and stable time ordering. Metrics and pagination consume this same list. Preserve all saved dates, scores, snapshots and source preferences; never rewrite records merely to keep the dashboard populated. This supersedes the earlier date-based dashboard display policy.

## 2026-10-22 Runtime simulator deprecation

- User decision: comment out the shared station-detail RuntimeSimulatorPanel render call and mark it “此部分为原型演示阶段使用，已废弃”. Do not display this prototype-only simulator on practice or exam station pages. Retain its implementation and underlying runtime rules; do not re-enable it when following earlier demonstration documentation.

## 2026-10-22 Functional closure and implementability

- User requires complete product flows and implementable metrics. An operation is not closed merely because a rule/API or notification exists: trace the initiating UI, saved stable object, receiving role, permitted processing action, receipt, terminal state and later query. Read/unread notification state is distinct from task resolution. Demonstration tasks must be shared, navigable records rather than page-local filler.
- Read-only findings and proposed remediation are recorded in audit-2026-10-22/产品原型功能闭环与可落地性审查报告.md. These findings are not implemented fixes or an approved change specification. Keep the simulator deprecated; future remediation must move necessary business processing into formal flows. Passing existing command tests or server-rendered pages alone does not establish cross-role closure or real AI readiness.

## 2026-10-22 User-selected remediation scope, awaiting confirmation

- User selected only B01, B02, B06, B07, B08, B11, B12, B15 and B16 for the next prototype changes; the other fourteen audit items are deferred. The user explicitly requires a complete issue checklist for confirmation before implementation. The checklist is audit-2026-10-22/完整待修改问题清单-待确认.md. Do not modify prototype functionality until the user confirms the checklist and starts implementation. B02 includes student-to-teacher help; B16 includes all three dashboard metrics from chapter 4 of the original audit. Preserve original B identifiers and do not duplicate these as new findings.
- The original audit's four-batch plan and thirty full-scope scenarios do not authorize deferred items. Any necessary expansion into a deferred item must be documented and returned for explicit scope selection; do not silently expand. Keep B07 allocation, B11 retest handling and B16 support-task choices visibly proposed until confirmed.

## 2026-10-22 First batch authorized and implemented

- Subsequent user instruction “开始修改第一批” authorizes B07 and B08, adopting one student per workstation, one batch per arrangement, with explicit editable allocations; no automatic rotation. This supersedes the pending-confirmation hold for B07/B08 only. B01/B02/B06 and subsequent batches are not started; the other fourteen findings remain deferred.
- First-batch rules live in arrangementPreparationRules.js and are shared by the provider and domain adapter. New completed configurations require a unique complete mapping; open commands use the saved mapping, never click order or a fallback first student. Historical mappings are inferred without rewriting sessions; report links and comparisons use Session IDs, with a chooser for ambiguous legacy links.
- Draft deletion, cancellation, withdrawal of unstarted preparation and copy-to-new-draft are real transactions with guards, audit and notification/task cleanup. Only release this arrangement's own resources. Withdrawn session snapshots remain in preparation history; cancelled sessions never become formal grades. Genuine locked SOP snapshots stay frozen when preparation is withdrawn; legacy synthetic “历史记录” snapshots must not lock an otherwise empty draft.
- Migration package arrangement-closure-20261022 appends four linked examples and dedicated demonstration resources exactly once to both data sources, without resetting existing records. It remains excluded from business wall-screen statistics. First-batch evidence and demonstration entries: audit-2026-10-22/第一批实施记录/第一批实施说明.md. Do not automatically begin the next batch.


## 2026-10-22 Second batch authorized and implemented

- User instruction “开始下一批” after the first-batch completion authorizes B01/B02/B06. These are implemented; B11/B12/B15/B16 are not started, and the other fourteen findings remain deferred. This supersedes the earlier pending hold for these three findings only.
- Formal step progression uses sessionClosureRules.js and SessionClosurePanels.jsx. Practice defaults to student flow submission, with per-step teacher-confirmation policy configurable in SOP editing and frozen into the Session. Exams require teacher manual flow confirmation. Manual flow (`manual_flow`) must never manufacture AI evidence or remove independently confirmed deductions; preserve actor/time/note and report the flow separately from evidence and score.
- Help requests are stable Session-owned records with pending/handling/completed/cancelled/closed states, receipt and history. A read notification is not resolution. Only open requests count as tasks; closed history remains queryable, and another request is allowed after closure. End/cancel/withdraw closes outstanding help with a reason. Legacy events/timestamps migrate without assuming completion.
- Student current tasks now include fault access and a recent-results group. Student results use student plus Session ID, independent of workstation reset. Unpublished exams expose a strict allowlist without scores, steps, standard answers or teacher internal notes. Student-visible help receipts may be re-read after completion. Keep entry/action targeting exact Session IDs when workstation histories exist.
- Shared append migrations session-closure-20261022 and session-closure-auto-20261022 provide eight linked demonstrations. Preserve original data, current source, browser backup and failed-write protections; no automatic restoration of processed/deleted demo tasks. Automatic replay is explicitly prototype-only and must never be described as real inference or video evidence. The runtime simulator remains deprecated and hidden.
- Coverage, demonstration entries and limitations are recorded in audit-2026-10-22/第二批实施记录/第二批实施说明.md. Do not automatically start the next batch.


## 2026-10-22 Third batch authorized and implemented

- User instruction “继续下一批” after the second-batch completion authorizes B11/B12. Both are implemented, adopting offline evidence/retest registration with teacher confirmation and result writeback. B15/B16 are not started; the other fourteen findings remain deferred. This supersedes the earlier hold for B11/B12 only.
- Evidence tasks live in data.evidenceTasks and evidenceTaskRules.js, with stable original arrangement/student/Session/Step references. Use pending → handling → awaiting_confirmation → completed/cancelled, explicit student instructions, recorded offline process and either manual verification or validated same-student references. A recorded reference must be navigable; never fabricate an uploaded clip or AI confirmation. Students see only the dedicated safe projection; unpublished exams hide result conclusions, scores and internal registration facts.
- gradeRevisionRules.js is the shared transaction for formal review, adjustment, disposition and task confirmation. Preserve rawScore and existing historical evidence. Directly overwrite the current score without numbered grade versions or a new baseline copy. Ordinary modification records retain actor, time, reason and score changes. Forms capture transient gradeStateToken as expectedState plus operationId to reject stale or duplicated submissions; this is not a business grade version. Task open/cancel must invalidate old grade contexts even if fields later return to the same state.
- Open tasks block publishing and ordinary step modification; retest_resolved is available only through a registered task confirmation. Cancellation preserves current valid scores, later safety facts and audit. Frozen legacy task cancellation may close metadata only.
- The provider performs final frozenGradeWriteRules.js integrity checks before persistence so old runtime commands cannot overwrite published scores, original judgments or audit chains through automatic/runtime writes; responsible teachers may correct the current published score in place. Loading frozen records must not reapply fallback scoring. Submission/end uses applyGradeLifecycle, preserves manualAdjustments, and rejects stale end/publish dialogs.
- Shared migration grade-evidence-closure-20261022 adds six navigable historical examples without changing existing arrangements, scores, snapshots, identities, devices or occupancy. Processed/deleted demonstrations stay processed/deleted. Evidence: audit-2026-10-22/第三批实施记录/第三批实施说明.md. The runtime simulator stays hidden; continue honoring the no-visual-browser-inspection preference. Do not automatically begin the fourth batch.


## 2026-10-22 Fourth batch authorized and implemented

- User's subsequent “继续下一批 / 继续” authorizes B15/B16. All nine selected findings B01/B02/B06/B07/B08/B11/B12/B15/B16 are now implemented. The other fourteen remain deferred; no automatic scope expansion. The original pending-confirmation and earlier per-batch holds above are historical and superseded for these nine only.
- teacherDashboardTasks.js supplies one stable source for teacher dashboard counts, paging and destinations; administrator current arrangements use actual records. No page-local fake todos/errors or fallback arrangements. Existing safety/technical state remains unresolved where appropriate; teacher status links must not silently enter administrator mutation screens. Historical valid source records can own support/evidence work; archived records do not create live help or step confirmation.
- teacherDashboardMetrics.js uses one teacher/class/course/standard/captured-scoring-basis/type/date cohort (course is internal only, absent from teaching-statistics filters). Default all selected-source demonstration records, without calendar filtering or date rewriting. Average is percentage-normalized valid final result person-times with N and source rows. Exam publication denominator includes valid published results plus reviewed formal results whose parent exam is waiting for publication; pending review is separate. Excluded rows expose reasons. Errors require confirmed current deduction sources keyed by standard/captured-scoring-basis/Step; ordinary session-lifecycle audit is not teacher confirmation or an error.
- “待辅导学生” counts distinct students on open data.supportTasks; the latest valid low-result candidate list is separate. supportTaskRules.js owns pending → coaching → awaiting_review → completed/cancelled, captured grade/source scope, idempotent operations and task revisions. SupportTaskPanels.jsx provides teacher creation/guidance/review/cancellation and student safe projections. Review references lock the later same-student/standard/captured-scoring-basis formal practice result at selection time. Completion closes tasks but never alters original grades; source later revisions retain original support evidence.
- Loading final grades preserves explicitly stored total and step scores, including invalid/null values; never manufacture eligible statistics by normalizing them into full scores. Legacy upgrades preserve existing final/frozen scores and explicit snapshot version metadata. Unknown historical technical labels remain unknown; completeness and comparability use actual captured scoring content.
- Shared once-only migration dashboard-closure-20261022 appends ten linked historical examples and four support tasks, without replacing the prior 34 arrangements or changing identities, SOPs, scores, snapshots, workstation/device occupancy. Already processed/deleted demonstrations stay processed/deleted. Both selected-source workcopies remain independent with original backup/failure protection.
- Fourth-batch evidence, demo entries, reproducible metrics and the remaining fourteen-item boundary are recorded in audit-2026-10-22/第四批实施记录/第四批实施说明.md. 484 rule/store tests, 74 SSR page/stage/protection checks, build and structure preparation passed. Continue honoring no browser visual inspection/capture/click verification unless explicitly requested. RuntimeSimulatorPanel remains commented: “此部分为原型演示阶段使用，已废弃”.

## 2026-10-23 Review fixes R01/R02

- User authorized only the first two review findings. R01: evidence-task bookkeeping preserves stored total scores, including null/blank/zero; it must not infer a grade or increment a grade version as a side effect. R02: gradeScoreValidityRules.js supplies score/max/step validity shared by dashboard statistics, exam preflight and the actual publish command; explicit invalid fields never fall back to older score values. Publication also requires a formal/published result, with absences exempt.
- The R03 multiple-task cancellation residual review state remains deferred by user selection. Do not silently include its fix. Preserve all original CPD/browser work data and frozen historical scores; do not guess historical corrections from this defect.
- Evidence and regression results: audit-2026-10-22/四批九项复核-2026-10-23/前两项修复记录/. No browser visual inspection was performed.

## 2026-10-23 Dashboard statistics placement

- Latest copy feedback: the teacher dashboard header shows only “教师工作台”; remove the greeting/demo-date explanation subtitle. Keep internal demonstration/date behavior in implementation documentation rather than adding it to this header.

- User prefers the teacher workbench without the “学生表现 · 全部演示记录” statistics-scope/filter panel. Remove that panel; keep compact student metrics, source details and actionable support links available. Default remains all selected-source records for the current teacher, independent of the real calendar. Do not delete shared metric rules, historical results or task workflows when simplifying the home page.
- A dedicated teacher statistics module is currently a product discussion, not yet authorization to build a new module or expand deferred findings.

## 2026-10-23 Teacher statistics confirmed requirements

- User confirmed the business scope, all thirteen functions and the complete page proposal in three rounds. Canonical pre-implementation requirements: ../教学统计需求-2026-10-23/04-教学统计原型修改需求说明-V1.0.md; handoff and acceptance: ../教学统计需求-2026-10-23/05-原型实施交接与验收清单.md. Earlier 01/02/03 drafts are confirmation history, superseded by the consolidated specification.
- One new teacher statistics menu and one standalone page with four tabs (班级成绩/学生进步/步骤分析/教学跟进), two drawers, a reused support-creation form dialog and six existing page integration changes. Current filtered CSV export, source tracing, return-context restoration, trustworthy dates and historical unknowns are in scope. No new AI diagnosis, school BI, real identity integration or deferred issue remediation.
- Latest user page confirmation proceeded to requirements consolidation, as explicitly proposed in the preceding response. This turn completed documentation, not implementation. The statistics route and module have not yet been built; do not treat the approved future design as current product functionality.

## 2026-10-23 Teacher statistics implementation authorized and delivered

- Subsequent user instruction “方案没问题，开始产品原型修改吧” authorizes the full confirmed statistics scope, superseding the documentation-only hold above. Implemented route /teacher/statistics with four tabs, two drawers, reused support form, CSV generation, dashboard/legacy-link migration and source return across six existing business surfaces.
- Shared statisticsCommonRules.js owns trustworthy dates, class attribution, new-Session student snapshots, CSV safety and internal return validation. teachingStatisticsRules.js reads existing grade/task rules; statistics never edits grade/state to make a metric look complete. Return contexts bind the active data source and preserve precise Session/Step/request targeting. Default still all records; 60 is only the reference passing threshold and 80 remains the separate support threshold.
- teaching-statistics-20261023 appends ten clearly marked historical examples to both source types exactly once; original44 arrangements and all prior master data/tasks/occupancy stay intact. Provider now creates a separate original-byte backup namespace before this statistics upgrade, preserving the older SOP backup. Do not restore processed/deleted examples.
- Evidence: audit-2026-10-23/教学统计实施记录/实施说明.md. 517 rule/store tests, 94 SSR pages/stages/protection checks plus expanded support-form rendering, build and data comparison passed. No browser visual/click/capture QA was performed. Continue respecting the existing no-visual-browser-inspection preference. R03 and the original fourteen deferred findings remain out of scope; the runtime simulator remains deprecated.

## 2026-10-23 Step analysis empty-state correction

- User found the steps tab unhelpfully empty under the three-step closure demo. A missing legacy version label alone does not prevent analysis when captured steps and scoring rules are complete; never backfill missing historical criteria from the current standard.
- When a comparable standard or usable steps are missing, show actual standard/captured-scoring-basis/type groups with valid-result and usable-step counts. Each ready group applies its own standard; unknown or incomplete groups open original records, including exclusions. Do not append a recommended-demo section or reset the teacher’s filters to unrelated examples. Never invent or restore data to populate this view.
- Keep all original records, grade calculations and source selection unchanged. The new current-standard records drawer follows the existing source/report/CSV/return behavior.

## 2026-10-23 Statistics filter toolbar feedback

- Remove the visible “查询范围 · 王老师” row and all field captions above the main statistics filters. Use the existing list-toolbar control appearance and default “全部…” options, preserving accessible names with aria-label. Dates form an unlabeled start/end pair separated by “至”, with accessible names and tooltips.
- Align selects, date inputs, Apply and Reset to the same 38px control height. Wrap complete controls/paired actions naturally on narrower screens; keep the applied-scope summary and all filter/return semantics.
- The progress tab's student selector also omits its visible “学生” caption; retain the “请选择学生” option and an accessible “选择学生” name.
- Followup history omits the visible “类型” caption, adds “全部” as the default type, and combines help/evidence/support under that choice. Keep type visible per table/export record and compute status counts, completion numerator/denominator and CSV from the same selected type scope. Explicit single-type URL filters and source returns still preserve the user's choice.
- Current pending work likewise omits the visible “类别” caption and defaults to “全部” (review/step/publish). Each mixed table/CSV row retains its category and original action, exact source and return context. CSV identifies the category scope and mixed units; only the dedicated exam-publication selection shows the publication-rate summary. Explicit category URLs remain supported.

## 2026-10-23 Collapsed navigation icons

- Teacher and admin collapsed sidebars must retain the existing centered menu icons, active highlighting, title tooltips and accessible names. Only menu text (`sidebar__label`) is hidden; never hide all spans because Ant Design icons use a span wrapper. Apply the same distinction to responsive collapse and expanded overrides.
- Keep existing navigation and AI-library behavior: clicking the collapsed AI-library icon expands the sidebar and reveals its secondary navigation. No new menu hierarchy or separate icon set is needed.

## 2026-10-23 Practice/exam participant selection at school scale

- Both arrangement create/edit pages use the same class-bulk plus student-list selector. Support multiple classes together with individual additions/removals; use a single deduplicated studentIds list. Classes show full/partial selection based on current explicit IDs; there is no separate conflicting selection mode.
- Student list supports name/student-number search, class filtering, selected-only view, paging, per-page select/remove, and clear selection. Class list also supports name/code search and paging. Search/page/filter changes never change selected IDs. Only enabled students can be newly selected; old inactive/missing selections remain visible and removable, and existing finalization guards still apply.
- Class selection expands the currently enabled roster at the time of the action. Save the explicit studentIds via the existing source-aware arrangement command, not a live class rule; later enrollment changes must not silently rewrite drafts or historical arrangements. No seed/master-data migration is required.
- Reconcile workstation assignments after every membership change, retain valid existing pairs, deduplicate and refill removed mappings. Keep the accepted one-student/one-station rule and allow incomplete drafts; never truncate a whole-class selection to fit workstation capacity. Limit long unassigned-name summaries while retaining the full selected list above.
- Latest layout feedback: class bulk selection and individual student selection are two horizontally arranged, clickable tabs, defaulting to class selection. Show only the active panel. Switching preserves the shared roster and both panels' search, filters and pagination; this applies to practice/exam create/edit alike. Support accessible tab roles and keyboard left/right switching.
- Allocation notices below the title are mutually exclusive: show actionable allocation issues when present, otherwise show the standard one-student/one-station operating guidance. Do not stack the generic hint and validation notice; all underlying validation rules remain unchanged across practice/exam and read-only views.
- User approved explicit random allocation and manual swapping for both practice and exam, and explicitly declined automatic rotation/batching. When students exceed stations, the teacher creates multiple separate arrangements; never auto-generate batches, truncate the roster or reuse a station in the same arrangement.
- The editable allocation header provides “随机分配” / “重新随机”. Randomization changes only the draft, validates equal nonzero counts, enabled students, selected available stations and edit lifecycle, and persists the resulting explicit pairs via normal save. It never runs during rendering, source switching, refreshing, saving or opening sessions. An optional allocationRandomizedAt marks prior explicit use; no migration or rewriting old pairs is needed.
- Candidate selection, randomization and transactional final-save checks share workstation availability (explicit owner ID before legacy name). Manual selection exchanges two students; roster/station edits retain valid pairs and only refill vacancies. Established/opened sessions and historical/read-only surfaces never expose a randomize action. Show one contextual setup message instead of stacking missing-count/pair warnings.

## 2026-10-23 Live monitoring card identity and long content

- Practice/exam live cards retain existing numeric station names such as “1号工位”; other stations use their actual workstation code as the compact identifier. Do not render long demonstration scenario descriptions as the card title or invent physical station numbers. Full master names/codes remain in tooltips, and the event feed uses the same identifier. No master data, snapshots or IDs are renamed.
- Reserve fixed space for the status badge and score. Keep student name and score on one row, with student number on a separate full-width row; long content truncates with full tooltips in image and list layouts. Null/empty scores display a dash, never a fabricated score.
- Historical malformed event times containing only a millisecond suffix (e.g. .000Z) show “时间未知”; preserve original bytes and do not infer a timestamp from unrelated session activity.
- Overall step progress aligns the bar and completed-step count vertically on the same row. Use 12px/1.5 nonwrapping auxiliary count text with a flexible remaining-width bar, consistently across practice and exam monitoring.
- Teacher dashboard high-frequency errors use 12px vertical row padding and at least 72px row height. Step names and standard/historical-scoring-basis descriptions each stay on a single ellipsized line with full tooltips, 6px apart. Keep rank and count/view in separate fixed-content columns even in narrow layouts; do not change the error statistics or drill-down scope.
- Dashboard card pagination must use the same shared DashboardCardPager arrow buttons for teacher schedules, todos, high-frequency errors and admin current arrangements. Do not introduce a separate text “上一页 / 页码 / 下一页” variant for one card. Keep existing first/last-page disabled behavior and three-row paging.

## 2026-10-23 Shared notification popover

- Teacher/admin notifications share a 520px-height popover capped to the viewport, with fixed header/footer and an independently scrollable list. Render ten records per page, show total/current page and use the shared arrow pager; page changes return the list to its top. Reopening starts from page one; clock re-renders and marking read must not reset pagination.
- Each notification uses its full content width for title and wrapping body. Put the timestamp below the body instead of reserving a right-hand column. Use 14px title, 12px body, 11px timestamp; keep full text, no ellipsis.
- Format ISO/offset notification times in Asia/Shanghai without raw T/Z/milliseconds. Preserve known naive local times and legacy time-only values without guessing dates; invalid values show 时间未知. Do not rewrite stored time strings.
- Preserve the original source-aware mark-one/mark-all and navigation commands; “全部标为已读” applies across all pages. Source-switch remount protection remains; identity and notification popovers close each other. This remains client-side pagination over the prototype's current store, with no invented backend loading service.

## 2026-10-23 SOP step add button spacing

- The “操作步骤” header's “新增” action uses the shared inline-flex button with a 7px icon/text gap. Scope step-row grid styling to direct child buttons of rule-steps so it cannot spread the header action's plus icon and label apart.
- In the SOP step editor, leave 20px above the “建议完成时间（mm:ss）” field after the predecessor/step-type facts. Keep the input and label together and avoid changing global form-field spacing.
- SOP evaluation-rule explanation “最终是否能启用自动评价……” uses the standard notice-body typography: 12px, 1.6 line-height, 400 weight. Scope this to sop-evaluation-note so it cannot inherit oversized page body text or change unrelated notices.
- “历史评分补充说明” and “历史安全红线说明” share explicit typography in editable and read-only standard views: 13px/1.5/600 titles, 12px/1.6/400 note text, and 11px/1.5/400 auxiliary disclaimers. Preserve warning/danger colors and historical content; never inherit page-heading sizes for these notices.
- Practice/exam workstation check-and-open dialogs use explicit evaluation-gate-callout typography: status heading13px/1.5/600, participation/count explanation12px/1.6/400, and warning reasons11px/1.5/400. Enabled and fallback variants share the hierarchy; keep availability logic, counts and status colors unchanged.

## 2026-10-23 Multiple standard teaching attachments

- Each SOP step supports multiple teaching attachments, shown consistently in the editor, read-only standard and student practice hint. Images use clickable thumbnails, MP4/WebM use native playback controls, PDFs offer preview/download, and Office documents show a file-type icon plus download. Preserve full filenames through wrapping/tooltips and offer individual removal in drafts only.
- Limits are explicit and enforced before writing: JPG/JPEG/PNG/GIF/WebP up to10MB each, MP4/WebM up to100MB each, PDF/DOC/DOCX/PPT/PPTX/XLS/XLSX up to20MB each; ten files and200MB total per step. Multiple successive selections append; invalid, repeated or oversized batches do not partially add files.
- standardMedia is the authoritative attachment array, including an empty list after removal. Read legacy single standardMediaUrl/Name/Type without rewriting source data. New steps start empty; removing all attachments must not resurrect the old default demonstration image during normalization.
- Persist binary uploads atomically in IndexedDB and keep immutable assetId references in source-aware SOP JSON and locked snapshots. Temporary object URLs are only for mounted previews and are revoked on cleanup. An upload failure never reports an attachment as added; block save/stage/step changes until upload finishes. SOP saves still use existing active-source commands.
- Attachments remain local to the current browser/origin in this frontend prototype. Current working-data export now bundles uploaded binaries and JSON in a ZIP when needed; historical pre-upgrade backups remain original bytes. There is no new archive-import or cloud file-sharing service. Do not delete binary files on draft removal because published or session snapshots may still reference them. Missing files show an explicit unavailable state rather than a broken image or fabricated content.

## 2026-10-23 Teaching attachment dependency synchronization

- User explicitly requested checking all related features, including administrator AI capability configuration and student practice. AI configuration's shared Tab/waterfall step card and judgement-item form expose teacher attachments as a read-only collapsible section. These are teaching references; they must not automatically become labelled training samples, AI conditions, scoring evidence or deductions. The capability library keeps its separate sample collection/annotation workflow.
- Student practice's current-step panel has a collapsible multi-attachment entry in addition to the existing hint dialog. Both use the same session-bound resources. Exam student views, including after publication, retain the existing no-standard-media policy. Viewing materials does not create a teacher-help request or alter evaluation state.
- Teacher monitoring and teacher/admin personal evidence records expose teaching references separately from actual recorded evidence. sessionStandardMediaStep resolves session evaluation snapshot, session snapshot, then arrangement snapshot; a locked empty/missing step never borrows a later SOP's attachments. Runtime-recorded material metadata is preferred over a live SOP when no snapshot exists.
- Work-data export captures the selected-source JSON before asynchronous reads. Include all unique uploaded assets referenced by SOPs or historical snapshots in a UTF-8 ZIP with a manifest; keep original JSON-only output when there are no uploads. Missing binaries and legacy temporary URLs are explicitly recorded and counted in the export feedback. Stream ZIP CRC reads in bounded chunks rather than base64-encoding videos. Existing data-source selection, original backups, frozen scores, snapshot contents and deferred findings remain unchanged.

## 2026-10-23 Teaching material preview interaction

- User explicitly rejected opening an image in a new tab. Shared attachment image thumbnails and “查看图片” open an in-page enlarged preview; video thumbnails/“播放视频” open a controlled player in the same preview, and PDF uses an embedded PDF viewer. Every preview has a top-right close button, footer close/download actions, Escape and backdrop dismissal. No preview link uses target=_blank.
- Use a body-portalled native modal dialog so the preview can appear above an existing student hint or AI judgement dialog without closing its parent. Stop Escape propagation, preserve focus in the preview, restore opener focus/scroll on close, and stop video playback on cleanup. Preview URLs remain owned by the mounted attachment and are not persisted into SOP data.
- Office documents keep an explicit “下载查看 DOC/DOCX/PPT/PPTX/XLS/XLSX” action and identify the corresponding local software; clearly state that these formats do not have online rendering in this prototype. Do not send local files to an external Office viewer or show a misleading online-preview action. Unreadable media has an explicit message and download fallback.
- The shared component applies consistently to the SOP editor/read-only standard, AI configuration, teacher/admin records and student practice. Exam protection, attachment limits, snapshots and backup behavior remain unchanged.

## 2026-10-23 工位检查与开放

- 练习／考试共用“系统自动检测＋教师画面确认”。节点、推理服务、录像存储不再由教师勾选；主／辅助等本次启用视角由教师查看画面后确认。
- 检测中禁用开放，摄像头／视频／取帧／录像空间／试写入失败阻止开放。AI不可用保持既有默认通过降级政策，需明确确认，不能把AI降级伪装成检测通过；已确认安全红线的阻断不变。
- 当前检测是原型模拟适配器，必须标记模拟检测和非实时占位画面；不宣称连接了硬件或真实存储探针。模拟本地录像独立于边缘AI节点，节点异常可降级AI，但录像检测失败不能降级绕过。
- 系统签发的本次检测结果5分钟有效，重新检测使旧结果失效；提交时复核当前安排、学生、工位、设备及AI配置。取消或仅检测不改变业务数据。开放成功才把检测、画面确认、确认教师与时间保存到Session及审计记录；监控详情／个人报告默认收起查看。旧Session不补造检测历史。
- 教师异常处理指引留在教师弹窗中，提示联系管理员；不通过链接隐式切换管理员身份。
- AI开放状态提示保留左侧图标，正文明确放在第二个自适应列，标题／说明／确认项共享可用宽度；禁止正文误落入22px图标列而形成竖排。
- 2026-10-23 开放检查画面：固定左右两个预览，左侧主视角不随选择变化，右侧辅助视角右上角下拉切换其余已配置且启用的摄像头；支持3台以上。不把主视角复制成辅助、不新增虚构设备。无辅助摄像头显示空态，不可用视角显示故障占位；切换只影响预览，不改变检测、启用范围、画面确认或快照。

- 2026-10-24 学生身份提示：教师练习／考试监控只保留“身份确认信息缺失”状态，删除“兼容旧 Session，不作为学生违规依据”说明，不留空的辅助文字行；保留其他身份状态的确认时间或异常说明。
- 2026-10-24 工位监控页：“判定依据与可见要求”与下方“步骤流程确认／学生求助办理”卡片之间保留16px间距，与该页其余卡片一致；练习与考试共用。
- 2026-10-24 工位监控列表模式：左侧摄像头预览上下排列，按本次会话锁定视角（无快照时参考当前配置）优先主视角，最多展示两路，不显示第三路。仅一台时显示一路；离线／缺失设备保留对应不可用占位，不复制主视角、不自动用第三路替换。图像模式保持原单画面，共用于练习和考试。
- 2026-10-24 监控列表画面批注：缩略图下方去掉“演示画面”文字，只保留摄像头名称；异常视角保留“不可用”状态。
- 2026-10-24 监控列表密度：工位名称标题行固定32px，学生信息区域上内边距3px，缩小工位名称与学生姓名之间的纵向间隔；双摄像头高度由信息区其余行承接，不将空余高度摊到标题行。图像模式保持原间距。
- 2026-10-24 仅监控列表模式：将“自动评价已受控暂停／查看阻断”融合到右上角故障状态，单行显示“故障 · 评价暂停｜查看阻断 →”，保留完整悬停说明和原工位详情入口；不再在进度条下方占用提示行。
- 2026-10-24 监控视图切换文案：“图像模式”改为“卡片模式”，与“列表模式”对应，练习和考试共用；内部grid/list状态不变。
- 2026-10-24 监控列表／卡片时间：时钟图标与数字采用inline-flex垂直居中，间距4px。右侧“异常与关键事件”标题13px/1.5、600字重，灰色说明12px/1.6、400字重，辅助文字不得大于标题；练习与考试共用。

- 2026-10-24 卡片模式故障提示同样融合到右上角，使用紧凑“故障 →”，悬停显示“自动评价已受控暂停，点击查看阻断原因”，沿用原工位详情入口。列表模式保留较完整的单行提示；两种模式均不再在进度条下方展示故障提示行。
- 2026-10-24 监控总览的身份提示统一单行，仅显示状态名称，长名称截断；确认时间和异常补充信息放入悬停说明，避免成功／缺失等状态造成卡片内容高度不同。练习／考试及卡片／列表模式共用；独立工位详情保留完整第二行。
- 2026-10-24 监控顶部六个状态指标支持点击单选筛选工位，选中项高亮；“开放工位”恢复全部，再点当前状态也恢复全部。仅筛选下方卡片／列表，切换视图保留筛选，切换安排重置；右侧事件与整体进度不随筛选缩减。
- 监控状态数量与显示工位共用实际已开放且有会话的工位集合，“待开始”包含“可入场”；统计不随选中条件缩减。零结果显示空态及恢复全部入口，状态变化后实时重新匹配。未开放候选不冒充开放工位，旧记录无开放字段时以会话为依据；不修改会话、成绩或工位状态。
- 2026-10-24 监控工位卡片信息：将“现场当前”统一简写为“现场”；时钟图标和有效用时移到学号同一行右侧，保持图标与数字4px间距。现场步骤独占下一行宽度，超长截断并提供完整悬停说明；卡片／列表、练习／考试共用。
- 2026-10-24 监控进度文案简化为“8/24 已通过”。事件时刻统一北京时间HH:mm:ss，时间列58px；新会话事件保存完整createdAt，不再对时间戳slice(-5)。旧“协助行为提醒／人员绑定”分秒片段只从同Session唯一匹配的原始记录恢复展示，不能确认则显示“时间未知”，不修改原始事件时间、不使用当前小时补造。ISO／本地时刻统一转换后排序。
- 2026-10-24 监控进度标题改为“整体实训进度”，保留当前4人4工位及8/24等实际数量，不扩大演示数据。卡片／列表模式切换按钮12px/1.5、常态500字重、选中600字重，图标14px，低于左侧“工位会话状态”标题字号；仅作用于监控视图切换，练习与考试共用。
- 2026-10-24 工位准备状态列表：“分配学生”从工位信息中拆出独立一列，置于工位信息和状态之间；基础准备、自动评价模式、锁定／待检查三项状态纵向逐行显示，保持内容宽度。练习与考试共用，窄屏操作按钮可移到下一行，避免横向溢出。
- 2026-10-24 工位释放规则取代原“结束后逐个确认复位再释放”：练习个人结束、考试主动／超时交卷和教师整场结束均自动释放正常工位的安排占用，成绩核定／发布独立，保留成绩、录像、快照与历史记录。不得因旧安排结束或操作历史记录释放新安排占用，显式安排ID优先于同名。
- 正常结果页不再展示“工位复位与释放”；仅当前仍受该安排限制的异常工位显示“待处理工位异常”，教师查看异常并联系管理员。故障／维护／停用、未处理安全事件或安全阻断、影响继续使用的技术异常不自动恢复可用。管理员在工位详情填写处理及现场检查结果后解除使用限制，禁止解除未结束会话或用旧弹窗解除新限制，不改写历史安全证据或成绩；正常工位无手动释放入口。
- 现场复位在下次“检查并开放”中与画面确认一起完成：确认工具、设备及操作区域已复位、前一学生已离场、具备本次使用条件；前后端规则均校验并保存到开放检查记录，不能仅凭结束推断现场已复位。自动节点／录像检测保持原样，不恢复旧人工技术检查。监控第一项“本次工位”保留本次记录，原“待复位”筛选改为“已结束”，包含自动释放完成会话和旧终态；整体进度口径不变。历史正常待复位仅在确认占用归属后迁移释放，原始数据先备份，两数据来源保持隔离。
- 2026-10-24 管理列表状态覆盖：练习固定提供草稿、待开始、准备中、进行中、已暂停、已结束、已取消；考试固定提供草稿、待开始、准备中、进行中、已暂停、待发布、已发布、已取消，不将考试结束后待发布伪造为额外“已结束”。筛选不再依赖当前样例是否存在，未知历史状态仍可筛选。
- 状态示例持久化到 `src/data/currentPrototypeData.json`，共追加考试草稿／准备中／暂停、练习暂停／取消5条，独立演示学生／工位／设备，原安排、成绩、快照和占用不改写。两数据来源分别通过 `arrangement-status-20261024` 一次性追加，保留已有工作副本，不因源指纹变化重置数据；不还原教师后续修改或删除的示例。每种状态均有实际记录和正确详情路由，暂停示例可恢复整场且考试倒计时暂停。脚本 `scripts/sync-arrangement-status-demo.mjs` 幂等更新源CPD，写入前备份原字节；浏览器升级使用独立备份标识 `before-arrangement-status-demo-20261024`。
- 2026-10-24 考试发布说明使用教师可理解的中文：Score Disposition显示为“成绩处理状态”，发布检查说明使用“异常成绩处理”，明细使用“待复核／成绩待处理／安全待确认”。卡片展示暂不可发布（待处理人数）、可发布、已发布；发布后的卡片不再显示可发布。发布表述为“发布后学生可查看当前成绩，教师更正后同步更新”，不生成成绩版本或以发布阻止教师改分；保留原有发布校验与默认通过政策。
- 2026-10-24 教学统计移除“课程”过滤器及其已应用范围说明，实训标准候选不再受课程限制。旧链接的courseId在读取和URL规范化时移除，分页、导出及返回统计链接不继续携带隐含课程条件；班级、实训标准、结果类型及日期筛选保持原逻辑（标准版本筛选由下述当前标准决策移除），不删除底层课程数据或改变其他模块的课程统计能力。
- 2026-10-24 教学统计“有有效结果的学生”明细中点击“查看结果”，学生结果子明细的标题栏增加“返回”，恢复原学生列表的统计范围、搜索、页码及每页数量，关闭仍退出整层明细。通过同页URL参数detailReturn保存来源，刷新或查看源报告后返回仍保留；只恢复同数据来源、同统计范围的学生列表，不依赖浏览器后退，不恢复已移除的课程条件。直接打开无来源的学生结果不伪造返回目标，关闭或切换筛选清理返回参数。
- 2026-10-24 教学统计表格的单元格统一垂直居中，让姓名、学号、数量等文字与同一行操作按钮对齐，应用于页面与明细弹窗共用表格。
- 2026-10-24 参加名单归属具体练习／考试安排：从班级结果概览移除“单场参加情况”下拉，不新增统计卡片。练习／考试准备、监控、结果及草稿／已取消详情提供“查看参加名单”；管理员记录使用同一只读名单。统计结果明细中的安排名称可打开对应安排的名单，支持返回原统计明细并保留筛选、搜索及分页。
- 名单独立于成绩统计：使用安排保存的参与学生列表，不受统计班级、日期或有效成绩范围裁剪；名单外会话／分配单列核对，不加入应参加分母。明确未参加只认明确记录；未开始安排无会话显示尚未开始，已开始／已结束安排缺记录显示待核对，多历史会话需选具体记录，不猜测缺考。已取消显示原安排学生，不当作应参加或未参加。采用同一规则驱动展示、人数汇总与CSV导出，保留姓名／学号／班级／工位／参加状态／结果状态；历史记录优先当次学生快照，不展示内部会话编号作为业务名称。
- 参加名单使用attendance=1深链，名单搜索及分页随URL保留；查看本次记录后支持返回参加名单，再返回统计明细，校验同数据来源及同安排，失效／跨来源目标不复用。旧统计attendance=安排ID链接转到新主入口并保留统计返回范围；名单查看、筛选、导出不修改安排、评分、占用或审计事实。
- 2026-10-24 教学统计表格正文允许自然换行，覆盖全局单元格不换行样式，避免长文字跨列重叠。“学生事项／结果与关闭说明”等长正文列预留独立宽度并保留原换行；关联辅导记录及教学跟进列表共用此规则，保持12px正文和垂直居中，宽表仅在容器内横向滚动。
- 2026-10-24 系统业务日期时间统一按北京时间显示为`YYYY-MM-DD HH:mm:ss`，ISO Z／带时区偏移的绝对时刻需真实转换时区，不可仅删除T、Z或毫秒。无时区完整日期时间按原北京时间补秒，不重复加8小时；说明中的时间、表格、详情、弹窗、历史及CSV／可读报告共用displayDateTime。日期轴／纯日期保留日期，视频时码、持续时长、倒计时保留其语义；事件时钟沿用HH:mm:ss。datetime-local控件仅用dateTimeInputValue适配展示。保留原始数据、时间排序／筛选、审计时间、ID与JSON备份，不全局改写存储或迁移CPD。
- 2026-10-24 从报告、办理页或参加名单返回教学统计时，不显示“已返回原统计范围……”常驻提示，不挤占页面标题上方空间；返回仍恢复原筛选、搜索、分页并按当前已保存数据重算。移除仅服务此提示的statisticsReturned导航状态，保留步骤分析／当前待办中各自必要的统计口径说明。
- 2026-10-24 教学统计的关联辅导记录及共用历史／教学跟进表格移除“任务/请求ID”列，CSV同样不包含此列；内部taskId／requestId继续用于关联、去重、办理和审计，不删除底层数据或改变查看入口。
- 2026-10-24 步骤分析的筛选条件提示与标准列表使用说明合并为一处简短提示，显示尚缺条件或当前无可分析步骤的原因，并在有标准列表时说明“查看步骤”可直接选择、历史评分依据不完整仅能查看原始记录；不连续堆叠两个说明条，也不强制文字单行溢出。
- 2026-10-24 移除步骤分析中的“可分析的演示数据”推荐区块及“打开演示分析”重置筛选入口，不迁移到其他业务页面；当前范围无法分析时只显示实际原因与正常的标准／原始记录入口，不跨当前筛选追加样例推荐。保留CPD和浏览器来源中已有样例、历史成绩及快照，它们仍通过正常筛选和标准列表访问。
- 2026-10-24 “同标准步骤分析”的步骤表格、平均得分率图、样本和扣分来源持续保留。步骤明细通过右侧抽屉查看，不再在主页面内展开或提供自动改写筛选的“返回标准列表”流程，保留班级、日期与数据来源；旧版本深链清理废弃条件，正常进入当前范围。点击“查看原始记录”使用独立recordSopId／recordType／recordBasisArrangementId／recordBasisSessionId明细参数，主列表不受影响，刷新、源报告返回和CSV沿用此范围；关闭或切换清理明细范围。
- 2026-10-24 当前标准统一口径：每个实训标准仅一份当前内容，教师对草稿／已发布／已停用标准原地编辑、覆盖保存，不创建业务版本。复制创建独立标准。既有真实安排／会话快照、成绩、成绩修订及审计保留，不被当前内容更新覆盖；缺失的历史依据不得用当前标准补造为可分析样本。
- 教学统计移除标准版本筛选／列，按快照中的步骤、完成条件、评价方式、分值、扣分与安全规则判断可比性；相同依据合并，不同依据分组。旧版本号缺失不影响完整快照分析，相同sopId／Step ID也不能合并不同评分口径。高频错误、学生进步、独立成绩比较、辅导复练引用、CSV和详情返回共用此口径。“标准依据”展示步骤数／总分或“历史标准信息不完整”。
- 标准关键内容变更时，当前AI配置待核对，关联工位现场验证失效；核对配置并重新验证后启用。模型／Mapping／现场验证以实际标准内容绑定，历史兼容结论不可跳过已变更内容；已锁定会话继续使用原快照。名称／示教资料等不影响评分的编辑不使AI失效。旧sopVersion／familyId可保留为历史兼容字段；AI模型／训练数据独立版本继续保留；成绩仅维护当前值与普通修改记录。

- 本轮验证：654项规则／store测试、138个SSR页面／阶段及保护场景、生产构建通过。未执行浏览器视觉检查。实施记录：docs/2026-10-24-当前实训标准与历史快照.md。

## 2026-10-24 成绩只维护当前值

- 用户明确不要成绩版本：教师改分直接覆盖当前步骤分、总分与评分引擎结果，不创建版本号／版本链，不生成新的scoreVersion／scoreRevisions／fromVersion／toVersion／gradeRevisionSeq，也不把修改前完整成绩另存为一份基线版本。
- 教师、学生、管理员报告、统计、辅导、补证补测、导出说明／文件名／CSV／导出记录均不展示成绩版本、结果版本或办理记录版本。报告只保留一处普通成绩修改记录，包含修改人、时间、理由和前后分数；原判、AI证据、成绩修改与补证事实不能混同。
- 已发布成绩可由负责教师在个人报告直接更正，保留发布状态，学生和统计同步读取最新分数；管理员仍只读，自动运行和旧表单不得覆盖已核定成绩。发布前复核、安全和有效分检查保持原样，不新增补发版本或版本选择流程。
- 补证补测及辅导操作不再按成绩版本号校验或引用，只校验操作时所选当前数据和任务状态。辅导保留发起时的分数依据和普通处理记录，复练引用精确定位安排／会话，提交时变化则提示重新选择。
- 既有数据、原始备份和历史记录不破坏。旧序列化编号仅保留兼容读取，不再显示、递增、排序或参与业务判断；不会因更新CPD指纹重置任一来源的工作副本。AI模型、训练数据与设备等独立版本保持原功能。
- 本轮成绩简化验证：658项规则／store测试、138个SSR页面／阶段及保护场景、生产构建通过。实施记录：docs/2026-10-24-成绩直接修改.md；未执行浏览器视觉检查。

- 2026-10-24 步骤分析入口改为右侧抽屉：点击标准列表“查看步骤分析”不改上方筛选、已应用范围、列表排序／分页／每页数量，也不在列表下追加详情。主页面始终保留标准列表，抽屉沿用StatisticsLayer现有宽度、关闭／遮罩／Escape及焦点行为。
- 抽屉使用独立analysisSopId／analysisType／analysisBasisArrangementId／analysisBasisSessionId范围及a前缀分页，按当前教师／班级／日期和主页面范围验证所选来源；刷新或源报告返回保留分析范围，失效／跨来源引用不改用其他样本。步骤表、得分率图及CSV使用同一分析集合。
- “样本／扣分来源”在同一侧栏进入二级明细，提供返回步骤分析，恢复其分页排序；关闭退出侧栏并清理分析参数，主列表和筛选保持原样。旧直接筛选深链仍显示筛选后的正常标准列表，不自动在页内展开详情；原始记录入口保持独立范围。

## 2026-10-24 面向使用者的中文表述

- 教师、学生及管理员业务页面的提示、表头、统计单位、弹窗和可读导出尽量使用直接易懂的中文，不展示Session-Step等内部组合术语。步骤分析说明为“同一学生在同一次实训中的同一步骤，最多统计一次已确认扣分；证据不足时保留分数、人工确认流程完成，均不计为AI确认成功。”
- 展示名称统一使用步骤编号、实训结果记录、评价映射、评价项、机器事实、数据集、源视频、AI能力包、工位配置、主／备用摄像头、观察窗口、评价计时和兼容性结论。保留AI、ROI、SOP等必要缩写，以及技术页面所需的真实编号、文件名、路径、接口字段和结构化数据示例；技术编号不能因中文展示而改写。
- 已保存的系统英文消息通过businessTextRules.js在展示／可读CSV时转换，原始历史、审计、状态编码、关联ID、JSON备份与数据源工作副本保持原样；不为文案调整执行CPD数据迁移。新生成的系统提示直接写中文。
- 本次验证：666项规则／store测试、143个SSR页面／阶段及保护场景、生产构建通过；未执行浏览器视觉检查。

- 2026-10-24 教学统计长文本列（确认依据、结果依据、学生事项、结果／关闭说明）使用约280px独立列宽，正文最多展示两行并截断，悬停显示全文，不因一条冗长说明撑高整行。保留正文12px、垂直居中、容器内横向滚动；原始内容、排序、搜索和CSV均保留全文，不按显示长度裁切数据。适用于步骤样本、扣分来源及共用统计／历史表格；短文本列继续自然换行。
- 2026-10-24 统计结果共用表格加宽“安排／结果时间／标准依据／班级来源”四列，最小内容宽度分别为220／160／144／190px；结果时间保持年月日时分秒单行，表格在自身容器横向滚动，不挤压其他列或缩小字号。
- 2026-10-24 教学跟进“当前待处理工作”表格的操作列收紧为110px、表头和按钮右对齐；事项列吸收剩余空间，长文本预览随列宽展开，不再固定280px。安排保留30%宽度、类别112px、学生130px；窄屏只在表格容器内滚动，其他统计表格不受此专用布局影响。
- 2026-10-24 “学生”列只承载学生姓名：整场考试发布待办没有个人学生，页面和CSV均显示“—”，在“事项”说明整场考试范围。个人复核／流程确认按安排ID与会话ID共同定位学生；信息缺失明确提示，不再把“整场考试”用作查不到姓名时的兜底。教师工作台共用发布待办说明保留整场考试范围，不拆成逐个学生发布。

- 2026-10-25 管理员教师“查看”空白页修复：共用资料详情筛选最近审计时，必须先确认日志target为文本，缺失／空／非文本对象不能直接调用includes。只排除无法关联的条目，不删除、补造或改写审计与工作数据；教师、学生、工位、设备详情共用。回归覆盖两数据来源的全部教师、共用资料及失效详情，合法关联日志与编辑／重置入口保持可用。164个SSR页面／阶段及构建通过；仅用无截图的页面文本与运行日志复现、确认恢复，未执行视觉验收。

## 2026-10-25 教师密码完整流程

- 用户再次明确：从本次起不进行视觉检查、截图或视觉验收，除非特别要求。本次仅做代码、规则、SSR与构建检查，不调用浏览器。
- 教师新建成功后自动分配12位随机临时密码；管理员教师列表和详情均提供“重置密码”，替代仅生成任务的“重置账号”。成功后显示一次账号／临时密码回执，支持用户主动复制；关闭后不能查看原密码，遗失须重新重置。保存失败不出成功回执，重置不改变启用／停用状态。
- 管理端显示密码状态、最近重置和设置时间，不在列表／详情、审计、通知、URL或常规导出中展示密码。原始密码不可找回；工作数据只保存随机盐及PBKDF2-SHA256校验值，不保存新建、重置或教师自设密码明文。回执仅保留在本次弹窗内存，不自动发送、下载或写入剪贴板。
- 教师登录校验当前所选数据来源中登记的账号与密码；临时密码登录必须先改密，再用新密码重新登录。自主修改密码从教师身份菜单进入，校验当前密码、两次新密码、8—32位字母加数字且无空格，不可与当前密码相同。重置／改密后旧密码和旧登录状态失效，停用不能登录，来源切换须重新登录；不存在／未分配密码不借用全局演示密码。
- 保留旧公共演示入口admin／12345678，以及未设置独立密码的t1演示入口wanglaoshi。t1一旦重置／改密，其旧公共密码立即失效，别名也按同一新校验值登录。其他教师无默认公共密码；admin、disabled-demo和演示别名不可分配给新教师。私人教师仅记住账号；旧公共演示账号的记住密码行为保持兼容。
- 实际教师登录身份用于顶部身份、个人安排、待办、统计、学生辅导／补证及成绩处理；新账号不冒充t1，不以“王老师”办理他人记录。原有未登录原型预览及管理员角色预览保留，管理员实际教师登录不能通过菜单切入管理端；这仍是本地前端原型，不宣称已接后端认证服务。
- 密码写入继续沿用当前来源的备份、写入失败保护及工作副本隔离，不因本次功能修改CPD指纹、批量重置密码或改写历史数据。异步密码处理在提交时再次核对当前来源、账号与凭据状态，拒绝陈旧／并发覆盖；基本资料与状态更新必须保留最新密码校验值。
- 验证：674项规则测试、170个SSR页面／阶段及生产构建通过；其中覆盖新建／重置／改密、旧密码与旧登录状态失效、停用、并发与保存失败、实际教师身份范围及临时密码回执。按用户要求未调用浏览器、未进行视觉检查。
- 2026-10-25 教师详情“备注”独占一行，从详情网格第一列起横跨全部四列；窄屏仍占满当前网格。仅调整教师专用样式，不改变其他资料详情的备注布局。

## 2026-10-25 教师批量导入

- 教师管理增加“导入教师”，采用CSV模板、文件上传或内容粘贴、逐行预览与分页；每次最多500位。列为姓名、工号、登录账号、所属院系、所属专业、联系电话、备注，前五列必填。兼容UTF-8 BOM、引号内逗号／换行与双引号转义。
- 导入仅新增，不覆盖已有教师。按忽略大小写的账号及工号检查已有数据与批内重复，检查保留账号、必填项、手机号及列数；任一错误阻止整批保存。提交时再次校验，防止预览后或异步密码生成期间其他操作插入冲突数据。来源切换、凭据生成失败、存储失败均不部分写入或发成功回执。
- 每位导入教师分配独立临时密码、首次登录必须改密，继续使用既有密码校验与来源隔离。成功后弹窗一次性显示全部登录信息，支持主动下载CSV和复制，关闭后原密码不可再次读取。密码不写入审计、通知、URL或业务明文字段；CSV对名称的公式前缀作转义，生成密码以字母或数字开头，确保导出内容仍能直接登录。
- 用户已明确撤回学生密码需求：学生继续刷脸登录，不添加学生密码分配、登录、修改或重置。本次不改变学生导入、人脸资料和身份核验规则，不迁移CPD数据、不调用浏览器或执行视觉检查。
- 验证：680项测试、174个SSR页面／阶段与生产构建通过；新增覆盖100位教师整批导入、CSV格式与重复校验、并发冲突、存储失败、来源隔离、临时密码可登录及一次性回执。未执行视觉检查。
- 2026-10-25 导入预览标题缩为13px/1.5、600字重，行数拆成12px/1.5、400字重次要文字；教师／学生导入保持一致，不使用页面面板标题字号。仅调整展示，不改变导入校验和数据。

## 2026-10-25 工位产品走查修复

- 工位详情按概况与使用状态、设备与视角、关联标准AI状态、审计记录组织。移除重复摄像头兼容编辑入口与重复资产卡片；兼容字段仍保留在内部，不删除已有数据或更改快照。使用限制统一读取workstationUsageRestriction，故障／维护／停用不再显示无限制。
- 摄像头集合为唯一编辑来源。默认显示为单选，只影响预览，不派生AI主采集或使现场验证失效；主采集角色唯一。更换主采集保留其他视角名称和覆盖字段。备用待命不参与采集、录像与开放检查，投入运行须改为采集用途并重新检查／验证。历史第二视角保持原数据，编辑时提示管理员确认实际用途，不提供新增待确认角色。
- 所有本次启用视角均按绑定、类型、在线和视频流状态检查，与开放检查一致；AI判断项是否部分可用仍遵守原有规则。新保存必须有有效主采集；边缘设备未配置时明确AI待完善，允许先配置录像与人工确认，不用AI配置门槛阻断非AI业务。
- 名称、用途文字说明、视角顺序及默认显示不是关键变更；运行设备、参与采集的视角／角色及物理覆盖条件变化才使对应已验证／验证中标准待重新验证。弹窗列出受影响标准，详情列出实际验证与启用状态并定位既有AI配置中的目标工位；支持返回工位详情，不增加标准或成绩版本。
- “保存配置”仅做引用／完整性校验，不伪造设备检测时间；lastConfigValidatedAt与明确标注来源的设备模拟检测分开。模拟检测只读取原型记录，不把异常设备改成在线、不写心跳、不解除使用限制或启用AI。检测关联实际采集条件及设备记录，后续变化显示待重新检测；历史未注明来源的lastCheckedAt原样保留，不冒充新检测证明。
- 运行配置变更、工位维护、设备关键属性／绑定变化、摄像头与边缘设备停用统一检查活动会话及快照引用，包含待开始、可入场、进行中、暂停和故障；阻止破坏活动设备的操作。纯显示调整可保存。正常结束自动释放、安全限制与成绩／历史处理规则保持原样。
- 摄像头及边缘工作站允许绑定多台资产，运行配置只选一台边缘设备，支持先绑定替代设备再更换运行配置，避免无法解绑原设备的死循环；未选用设备不参与运行。其他类型的每工位唯一约束继续保留。设备管理提供工位筛选与登记默认值；从配置弹窗在新窗口管理设备，保留原表单并同步同来源数据。
- 写入仍走当前数据来源的备份与失败保护；提交重新检查当前配置和占用，陈旧表单不得覆盖其他操作的新配置／检测。原CPD文件、存储键、旧会话快照、成绩及历史证据不迁移或重置。全程不调用浏览器、不进行视觉检查。
- 验证：688项规则／store测试、188个SSR页面／阶段与生产构建通过。新增14个双来源工位管理渲染场景，覆盖唯一配置入口、状态／空态、模拟检测结果、按工位管理设备、现场验证定位及失效目标不自动改选其他工位；规则测试覆盖活动状态、快照引用、显示调整、待命视角、无边缘人工模式、失败回滚和来源隔离。未执行视觉检查。


## 2026-10-25 工位与设备业务文案纠正（优先于此前模拟检测展示约定）

- 用户明确要求：正常业务页面、按钮、弹窗、结果和审计使用产品业务语言，设备检测不显示“模拟”“原型保存”“未接接口”“不连接真实硬件”等实现说明，不追加此类免责声明。删除工位设备表格下原型状态说明，检测统一称“设备检测”，设备详情为“连接测试”。
- 内部适配器、来源标识和存储兼容字段保留；不因文案修复更改设备状态、心跳、使用限制、AI启用或检测失效规则。历史检测／审计文案仅在展示时转换，不改写历史数据。
- 设备查看、异常处理及工位验证入口复用系统12px蓝色操作样式，访问后仍保持蓝色、无下划线；业务所需的异常原因、处理入口和现场验证提示保留。
- 遵守用户持续要求：不调用浏览器、不进行视觉检查，使用规则测试、SSR检查及构建验证。
- 本次验证：689项规则／store测试、188个SSR页面／阶段及生产构建通过；覆盖旧检测／审计文案展示兼容、设备故障仍保留、入口蓝色操作样式及业务界面无原型说明。未更改CPD数据文件。

- 2026-10-25 工位细节反馈：关联标准提示与表格间留16px；设备检测确认／结果弹窗复用设备连接测试的紧凑样式，正文12px/1.6；摄像头卡片“移除视角”使用12px/1.5、400字重。配置表单顶部只显示一条提示，有活动会话时显示编辑限制，无活动会话时显示保存后的检测／验证要求，避免叠加重复说明。继续不进行视觉检查。


## 2026-10-25 取消工位“支持项目”手填字段

- 新建／编辑工位仅维护名称、标识、位置和备注，移除“支持项目”的默认值、输入与必填校验；保存基础资料不接受该旧字段。已有工作数据中的旧字段原样兼容保留，不自动按旧文本创建关联、不迁移或改写CPD及历史快照。
- 工位详情改为自动展示“关联实训标准”，设备绑定信息及数据大屏同步从当前实训标准AI配置与工位关联按ID读取，可关联多个标准；无关联显示空态。既有“关联标准与AI运行状态”提供逐项验证、启用状态与管理入口。
- 名称不参与任何工位关联判断，标准重命名不会断开关联；旧现场验证历史不自动建立当前关联。旧AI适配页面／汇总也改为读取现有关联ID；明确选择的目标工位仍按选择检查，实际AI启用继续受现场验证和运行条件控制，关联本身不代表可运行。实训安排仍按可用工位及教师选择分配，不新增关联门槛。
- 大屏以当前安排名称优先，无安排时展示关联标准；无关联显示待命。独立大屏演示及新增业务演示工位不再生成旧支持项目文本，既有设备、会话、成绩保持原状。继续使用非视觉验证。
- 验证：692项规则／store测试、188个SSR页面／阶段及生产构建通过。新增覆盖多标准关联去重、标准改名、失效关联、旧文本及历史验证不生成关联、显式目标范围、大屏当前安排优先和无关联空态；详情双来源均不再展示“支持项目”。未修改CPD文件、未进行视觉检查。

- 2026-10-25 用户再次纠正：工位／设备详情不显示“原型内部信息”折叠区，资源ID和内部演示编号不作为业务信息展示。删除共用PrototypeResourceIdentifiers组件及详情调用，覆盖全部工位和设备详情；内部ID、设备序列号与数据保持原状，正常业务编号仍按原规则显示。不要把该区改名或移到别处继续展示，也不要另加“这是原型”的说明。继续不进行视觉检查。

- 2026-10-25 工位详情“关联实训标准”概况卡片仅显示去重后的关联数量（含“0 个”），不展示标准名称或无关联长文案；具体标准及验证／启用状态保留在下方“关联标准与AI运行状态”列表，避免多关联撑高概况卡片。继续不进行视觉检查。


## 2026-10-25 工位当前安排统一

- 全部工位共用当前占用解析，不按“【演示】”、demoPackageId或编号区分业务行为。“查看当前安排”与概况“当前安排”使用同一解析结果，仅有未结束的实际会话／已开放预留或可确认的当前指针时显示；结束、取消或仅在草稿中选择不显示当前安排。
- 旧数据缺少currentArrangementId、简称与实际名称不符时，根据唯一的未结束会话／开放预留补全ID与名称；标准化幂等，不改成绩、会话快照或时间。新开始安排同时写入ID和名称。空更新时间显示“未记录”，不编造时间。
- 多条活动占用、有冲突的有效ID或重名旧记录不任意跳转／覆盖，显示占用待核对。结束后的限制来源仍保留，不能冒充当前会话；故障／暂停／待开始的未结束会话均属于占用。实训安排名称变更不影响ID定位。
- 此次代码核查21个工位：原1～4号及多区域工位有实际会话，但无安排ID且简称不匹配，导致旧跳转入口缺失；已统一兼容修复。所有页面继续遵守无视觉检查偏好。
- 占用保护与详情入口共用workstationArrangementState，避免开放预留、冲突占用在详情和维护操作中的判断分叉。验证：697项规则／store测试、234个SSR页面／阶段及构建通过；新增全部21工位在浏览器／CPD双来源下的42个详情一致性检查。CPD原文件未修改，未进行视觉检查。

- 2026-10-25 工位配置顶部提示间距：弹窗正文距标题栏12px，首条提示清除默认段落上下margin，与下方“采集视角”只保留表单16px网格间距，取消该节额外16px上边距，避免空白叠加；不改变文字、字号或其他弹窗。未进行视觉检查。


## 2026-10-25 管理员当前安排跳转空白页

- 根因：工位详情的原生链接触发整页加载，管理员安排结果页加载效果立即调用recordAuditAccess，先于数据备份完成，setData的写入保护抛出异常，导致白屏。SSR只渲染不执行效果，必须另做加载时序验证，不能仅检查链接或页面静态渲染。
- “查看当前安排”使用站内Link。提供者的dataWriteReady在备份并持久化成功后响应更新；结果页及旧管理员记录页等待就绪后记录访问，成功后才标记已记录，按来源与安排ID去重。访问审计在未就绪／来源切换时不写入，保存失败返回false并沿用全局错误提示，不让只读页面加载抛错。不能绕过备份保护、吞掉业务写入错误或假报审计成功。
- 回归命令npm run test:admin-record-access：无需浏览器，捕获真实加载效果，先执行子页审计再完成提供者备份，复现修复前的异常；覆盖浏览器／CPD来源、练习／考试、完成备份后单次留痕、保存失败与重试、另一来源数据及成绩／会话不变。主SSR检查同时实际渲染全部工位当前安排链接的目标页。
- 验证：697项规则／store测试、234个SSR页面／阶段、6个真实加载效果时序场景及生产构建通过。修复前时序脚本明确复现“工作数据正在备份”未捕获异常，修复后通过；未调用浏览器、未进行视觉检查、未修改CPD原文件。

- 2026-10-25 逻辑区域管理“新增区域”与左侧输入框底部对齐：网格表单内.field清除通用15px下边距，保留align-items:end，避免标签容器的外边距把按钮压低；仅作用于该新增区域表单，窄屏仍按原单列布局。未进行视觉检查。

- 2026-10-25 工位启用与现场验证：“本次验证用途”标签与下拉框使用同一弹性行、12px间距、垂直居中；窄屏允许自然换行。保留原有验证用途及验证逻辑，不改变其他表单间距。未进行视觉检查。

- 2026-10-25 工位现场验证用途卡片三行统一业务文案：选项为“配置检查／现场验证”，说明只表达核对配置及启用所需评测、现场证据，按钮为“补充动作与跨镜头验证用例／保存验证设置”。移除原型、演示、待模型服务接入等展示，不把仅保存并置为待验证的动作描述成已执行验证。内部validationPurpose枚举及来源标记保持兼容，现场验证／AI启用证据校验不变；继续不进行视觉检查。

- 2026-10-25 判断项摄像头配置样式：标题13px、说明11px、策略标签／选项／按钮12px，单选／复选14px；卡片按左侧判断项与摄像头、右侧策略与保存操作的双列排列，按钮复用系统紧凑默认按钮，不使用原生灰色满宽按钮。状态与摄像头名称分隔，长文本可换行；760px以下单列、操作靠左。保存、单视角与多视角选择逻辑保持原样；未进行视觉检查。

## 2026-10-25 工位现场验证验收闭环

- 配置检查不能替代现场验收或直接启用AI。当前模型独立评测自动关联；正式用例关联同工位、同轮次、同用例、同配置及当前模型的服务执行记录，自动带出输出、执行人、时间和证据，不允许手选来源或手填技术JSON冒充服务结果。没有服务执行记录时不能正式启用，不编造已接通模型API。
- 覆盖按判断项与场景矩阵检查；可选项允许有具体理由的不适用，标准流程、不确定与摄像头异常必验，每个判断项还须有负向场景通过。输出与复核说明必须具体，拒绝数字或空泛结论；不适用单独统计，不充作已执行。
- 启用前重新核查当前设备、配置、模型、报告及执行记录。重新开始建立新轮次并归档已保存的未完成过程；查看记录提供环境、用例、覆盖、报告快照与证据入口。既有会话、成绩、锁定快照、历史记录和CPD原文件保持原状，不新增标准／成绩版本。继续不进行视觉检查。
- 规则、操作流程及服务记录契约见 docs/2026-10-25-现场验证闭环.md。新增验收规则／动作测试、双来源渲染检查，并保留现有备份、写入失败及来源隔离保护。

- 2026-10-25 现场验证卡片显示纠正：环境表单不能取代验证用例清单。未开始、保存设置后待重新验证、验证中和完成后均展示当前范围的全部用例卡片；开始本轮前只读预览，开始后可填写保存，已保存结果不得因页面状态切换而隐藏。已扩展的16类场景从当前用例或历史记录兼容识别，缺少旧标记时重新开始不能缩减为8类；只读预览不创建用例、不改写结果或历史。

- 2026-10-25 用户再次明确现场验证固定16类：默认8类加手动扩展的分支取消，新建、预览、开始、重新开始和验收覆盖统一使用完整16类，不依赖validationScenarioSet或历史记录推断。移除“补充动作与跨镜头验证用例”按钮。只有8项的正在验证记录加载时幂等追加缺少的待执行项，已有ID、结果、证据及历史记录保留；未开始／已完成记录只补齐只读预览，新一轮开始生成16项。回归必须使用无扩展标记、无历史记录且仅8项的旧数据，不能只测预先生成的16项。

- 2026-10-25 用户确认用例操作与Tab方案（覆盖前述全部平铺及全部必验要求）：保留完整16类用例，基础8类默认显示，高级8类通过“显示高级验证”展开；动作类判断要求动作变化／伪完成／中断重复／背景验证，持续时间条件要求持续状态验证，多摄像头联合判断要求交接／身份不明／相机缺失验证。这些配置依赖项自动显示为高级必验，不受开关影响。未执行的可选高级项不阻止验收，已经失败的可选项仍需处理；必验高级项不可用“不适用”跳过。
- 用例改为横向可滚动Tab，一次展示一个面板，切换保留草稿，提供状态、必验完成计数、下一项及键盘左右/Home/End操作。开始本轮后，每项可开始执行、结束执行、保存结果、重新执行或取消；同一工位验证轮次一次执行一项。重新执行留存旧结果并生成新执行标识，正式现场测试须关联同次服务回执才能结束，不能生成假回执或点击后自动通过。执行请求保存在aiFieldValidationRequests，服务回执须携带executionAttemptId；既有服务接入边界保持明确。非视觉验证覆盖实际开关／Tab事件、执行命令、取消、重试、存储失败及配置必验范围。

- 2026-10-25 现场验证信息层级：验证中依次展示可展开的本轮环境摘要、单一用例进度／高级筛选工具栏、横向用例Tab和当前用例。环境详情默认收起；多条常驻提示合并进“验证说明”，执行信息缺失仍在环境区显示可操作提醒。取消重复四格统计卡；判断项覆盖明细移至用例下方默认收起的验收覆盖区。保留全部16类、配置必验规则、草稿、执行／保存及历史数据，不做视觉检查。

- 2026-10-25 用例执行按钮按状态分层：初次开始／执行中结束与取消置于判断项选择之后；待核对以底部“保存用例结果”为主按钮。已执行／已保存用例的“重新执行本用例”置于卡片右上角，使用次要按钮，确认后才调用重测动作；明确保存历史、清空本次结果证据和丢弃未保存填写内容，仅影响当前用例。卡片标题状态优先显示执行中／待核对，继续保留原有规则及数据保护，不进行视觉检查。

## 2026-10-25 管理员教学记录走查整改（两批）

- 第一批已实现：教师／管理员共用结果口径。均分排除未开始、未参加、取消和空／无效分数，保留真实零分，标注含暂计分；待复核按实际复核／成绩处置／安全确认去重统计，不使用考试发布阻断人数替代。发布门槛仍独立保留。学生表分会话状态与成绩状态，未开始不展示零分，不把尚未执行或执行中的暂计分当作主要问题，安全问题优先。
- 当前异常工位包含关联工位当前故障、采集设备异常及本安排使用限制；数量与下方明细使用同一规则，指标可定位明细，管理员可进入工位处理。当前工位健康与历史会话证据分开呈现。
- 实施诊断改为中性标题；从锁定配置和录像记录派生，缺少条件实证显示“未取得证据”，无对应要求显示“不适用”，禁止根据步骤通过／阻断推断对象可见或动作持续充分。区域项只说明当前步骤映射是否完整，不声称已检测到学生位于区域。安全阻断、完成状态与录像缺失独立表达，保留原根因标记与审计。不得改写成绩、会话执行状态、锁定快照或CPD源文件；不做视觉检查。
- 第二批已实现：安排结果CSV、个人HTML报告及记录列表导出保存生成时文件正文与MIME，下载原文件只读取该正文，不按当前成绩重建旧文件。记录保存绝对生成／到期时间，7天到期后阻止下载，点击时再次核查；旧记录没有正文则显示原文件不可用，不从文件名推断学生或伪造旧文件，可另行按当前数据导出新安排结果。写入失败不发起下载，不更新记录；沿用双来源和备份写保护。个人HTML输出转义用户文字，优先使用会话锁定标准。
- 第二批页面背景：负责教师、开始时间、结束时间与本次标准名称使用紧凑详情栏；进行中为尚未结束、已结束缺少时间为未记录。标准优先会话／安排快照，缺失时明确标记，不把当前标准当作历史快照。
- 第二批诊断层级：默认收起，展开后为学生／步骤选择、结论、证据与当前管理入口、条件与录像信息、折叠的锁定技术标识和根因记录。证据链接带当前学生、会话、步骤及来源，配置／工位入口标明查看当前配置；失效关联不生成跳转。根因保存只表明排查标记，不声明故障修复或解除使用限制。验证覆盖原文件稳定性、到期边界、历史缺失文件、上下文跳转、双来源存储失败及页面渲染；不进行视觉检查。

- 2026-10-25 教学记录详情的“导出记录”与上方学生结果保持16px区块间距，与页面其他相邻面板一致；教师／管理员共用导出记录组件一并生效。不进行视觉检查。

## 2026-10-25 学生历史结果复盘（两批）

- 用户明确不需要历史趋势、排名或自动生成长篇学习报告。按两批实施，每批结束后等待用户“继续”。
- 第一批已实现练习文字复盘：显示总分与满分、重点关注摘要、全部／重点关注筛选、按步骤的教师反馈与评分说明、本次正确要求、操作要点及下次注意。扣分、安全问题、待复核或有教师反馈的步骤默认展开，其他步骤收起；摘要可定位并展开对应步骤。复核中的扣分明确为当前数值；缺少具体原因只说明未记录，不编造错误；证据不足但保分不作为错误。教师反馈从当前步骤复核说明／本步骤评分记录投影，仅公开必要文字，不输出原始审计、内部备注或其他学生结果。
- 正确要求只使用会话／安排锁定标准；缺少快照时只用本会话步骤已记录内容，不借用今天的标准。学生字号沿用正文16px、标题20／24px、辅助13px、按钮48px高。纯只读展示，不改成绩、会话、历史快照或CPD原文件，不做视觉检查。
- 第二批已完成：练习与已发布考试共用步骤复盘。考试负责教师在结果页独立设置评分说明与教师反馈、本人录像、正确要求与示范，默认全部关闭；待发布可预设，学生成绩已发布才生效。保存校验教师所有权、考试结束状态及设置并发变化，沿用来源和存储写保护；不改变成绩、会话、快照或发布门槛。管理员只读。
- 本人录像读取recording.clips或完整会话playbackUrl加步骤时间范围，核查归属、地址、区间与保留期限；缺失、删除、过期及加载失败不展示无效播放器。展开后加载，支持视角、倍速、片段定位、结束暂停和重播复位；收起或隐藏时停止，播放时复查到期。不编造录像，不使用直播地址替代历史录像。
- 正确示范复用站内多资料预览，仅取本次锁定内容或会话已记录资料。考试按字段白名单投影，未公开内容不输出URL或assetId。契约与非视觉验证说明见docs/student-result-review.md。不进行视觉检查。

- 2026-10-25 用户明确要求给“【演示】已发布考试纳入发布分子”的本人结果提供视频画面以查看效果，允许不按录像缺失／公开开关判断。仅对exam-dashboard-published-20261022与session-dashboard-published-20261022这一确切已发布本人结果追加只读展示视频，使用现有实训图片制作12秒H.264短片并默认展开播放器；不改变录像证据、分数、发布设置、CPD源文件或其他会话规则。未发布／非本人仍不可访问。不进行视觉检查。

## 2026-10-27 工位AI启用流程整理

- 2026-10-27 抽帧结果卡片多余时间图标：状态文案为空时不渲染状态标签，避免旧数据的未映射处理状态生成孤立时钟图标；保留“未清洗”等有效状态的原有展示。不进行视觉检查。

- 用户明确取消抽象的“本次验证用途”下拉框及“保存验证设置”，管理端统一按准备检查、现场验证、启用AI评价三个阶段组织。准备检查只读取设备、视角、区域、能力配置、当前模型核验与独立评测，不因查看或重复保存而停用；列出缺失原因和准确的处理入口，视角／区域入口展开本页配置并定位，设备和判断项／模型入口定位对应管理页面。配置保存后自动重算准备状态。
- 新UI的开始／重新开始统一调用startSopWorkstationFieldValidation，一次事务校验准备条件及模型报告、建立real现场轮次并归档旧过程；不再先保存用途再开始。对已启用或已有轮次的配置，开始前说明会暂停新会话使用并保留历史记录。失败不得改变旧启用状态或记录，正式用例及启用仍校验服务回执与完整证据。内部旧API保留兼容；重复保存同一用途不重置验收。
- 旧配置检查用例只读保留，不冒充现场验收；旧passed／enabled组合在当前管理页显示历史检查待验收及启用记录待核验，只有符合当前正式验收要求才显示现场验收通过。展示修正不改写CPD、历史会话或锁定成绩，不新增标准／成绩版本。模型接入不完整时列缺项，不编造通过或声称新接入了模型服务。继续不进行视觉检查。

## 2026-10-27 标注样本与来源属性整理

- 标注页取消重复的视频级采集属性编辑表单，改为紧凑的来源视频／数据用途摘要，采集组、操作人、批次和拍摄条件默认折叠只读；常驻编辑仅保留当前图片／片段的样本类型和可见性。来源视频入口携带准确的能力、视频和数据来源，失效或跨能力关联不得回退至第一条视频。
- 采集组、操作人和数据用途统一在视频上传／编辑维护，补充说明与默认样本类型折叠选填；封存测试不能转回训练用途。视频管理移除独立重复属性面板，带videoId进入时提供对应视频的明确编辑入口。
- 训练前检查明确显示操作人隔离和封存测试保护，并提供视频管理修正入口。采集属性或样本属性变化使当前训练准备状态待检查，保留划分及历史训练任务；新候选数据从当前来源读取采集组、操作人和用途，不沿用抽帧时过期的继承字段，不改写已有标注或历史训练快照。不进行视觉检查。
- 2026-10-27 标注页区域顺序：当前样本属性放在视频／图片预览、动作／目标标注及保存操作的下方；动作标注页属性区占满双列。预标注建议保持独立，仅有建议时显示，不留空面板。不做视觉检查。
- 2026-10-27 动作标注数据队列的播放图标采用16px独立列，与右侧文字保留8px间距；不复用图片缩略图的56px列宽，图片队列保持原缩略图布局。不做视觉检查。
- 2026-10-27 训练前检查的“数据分布提示”与阻断提示使用13px/1.5、600字重标题和12px/1.6、400字重正文，避免继承全局正文大字号；保留提示内容及检查规则，不做视觉检查。
- 2026-10-27 用户要求精简模型训练与发布页：两页均移除非必需的“已有模型适配与验证”登记表单及其未再使用的界面组件，避免混入正常训练／发布流程；保留已有模型候选、报告、发布记录和内部兼容操作，不调整训练启动、发布及现场验收规则。不做视觉检查。

## 2026-10-27 教师数据统计与教学改进分离

- 用户确认新增独立“数据统计”菜单（/teacher/data-statistics），原“教学统计”统一改名“教学改进”，保留/teacher/statistics历史路由和现有班级成绩、学生进步、步骤分析、教学跟进四页；工作台、返回按钮、无障碍标签和导出名称同步更新，不改写旧数据中的演示包标识。
- 数据统计第一期为六项指标（开展场次、参与学生数、参与人次、完成率、平均分、参考及格率）、参与人次趋势／班级参与与完成／项目开展三图、按班级或标准汇总表。明细侧栏提供搜索、排序、分页、全量筛选结果CSV导出、原记录及教学分析入口，保持顶部业务范围不变。原记录返回保留具体统计页面和数据来源。
- 独立筛选支持7／30天、本月、全部日期、自定义、按实际填写学校起止日期的本学期，以及班级、练习／考试、标准、日／周／月；不编造学校学期。两页的已应用筛选分别记在浏览会话中，按教师和数据来源隔离，不保存抽屉／明细状态，不写入业务数据。
- 开展与参与按真实开始时间，完成记录按完成／提交／结束时间，成绩按可信结果形成时间；缺失时间不借用计划或其他阶段日期，有日期范围时排除并说明。未开始、未参加、取消、空值不冒充参与或零分。完成率只用本期已结束安排的可靠学生名单，每个安排／学生最多一次完成；进行中和名单缺失／重复的安排不混入分母。班级参与完成图使用同一结束安排名单口径，避免不同时间群体直接比较。
- 平均分／参考及格率（百分制60分）复用有效正式成绩规则，真实零分保留，暂计／待复核排除；同类、同标准且历史评分依据完整一致才汇总。只读当前教师范围，不增加排名、学习时长、通用拖拽报表、标准或成绩版本，不修改成绩、会话、快照、CPD源文件。不做视觉检查。

## 2026-10-27 管理端普通账号与菜单授权

- 新增“用户管理”(/admin/users)，仅内置admin负责账号与授权。普通账号创建必填姓名、登录账号、身份和至少一个功能菜单；身份为可填写岗位说明（如普通管理员／AI实施工程师／AI能力工程师），与菜单权限独立，不引入角色编辑器或复杂RBAC。AI能力库支持整组选取或勾选现有九个二级菜单，其他管理模块按现有一级菜单分配。
- 支持账号搜索／状态筛选／分页、编辑身份与菜单、启停和重置密码；admin固定全权限且不可通过此页停用、改权限或重置。账号名创建后固定，教师与管理端共用唯一账号名空间，包含教师单建／编辑／导入的重复校验。
- 复用带盐PBKDF2凭据，不保存初始或重置明文密码；临时密码仅在成功弹窗显示并支持复制，首次登录强制改密。普通管理员与教师复用本人改密页面；管理员身份展示实际姓名与身份，普通账号不提供身份切换、数据来源切换或全量数据备份的顶栏快捷入口。
- 菜单、网址和公开操作函数均校验授权；未授权页面在子组件加载前阻断，普通账号不访问教师端和内部调试页，练习／考试链接与导出、诊断再核查真实安排类型，避免换路径绕过。操作按默认拒绝名单映射到菜单，临时密码未修改不允许执行业务操作。
- 每次授权修改／启停更新访问标识，密码修改／重置更新凭据标识；旧登录和已打开的旧操作失效，写入前再校验当前账号、来源与会话，防止异步操作在权限收回后提交。新增审计使用实际姓名与身份。当前浏览器首次单admin体验保留启动身份兼容；一旦配置普通账号，没有登录会话不得自动升为admin。既有启动预览的教师操作语义保留，正式登录仍按账号身份校验。
- 继续沿用双来源隔离、备份就绪后写入及保存失败不更新内存规则；只增adminUsers集合，不改CPD源文件、历史成绩、会话或锁定快照。不进行视觉检查。前端交互和本地凭据沿用现有原型运行方式。
- 2026-10-27 创建／编辑用户的身份字段取消原生datalist，使用与管理端一致的可输入选择框：常用身份下拉同输入框等宽、12px文字、34px选项高，支持自定义身份、搜索、方向键／回车选取、Escape及失焦收起；保持身份必填及菜单权限独立。不进行视觉检查。
- 2026-10-27 用户管理列表的修改入口统一称“编辑”，弹窗标题为“编辑用户”，覆盖基本信息、备注与菜单权限，避免将整个编辑操作称为“编辑权限”。不进行视觉检查。
- 2026-10-27 左侧“AI能力库”展开／收起箭头随菜单名称排列，取消自动推向右边缘的间距，文字与箭头保留12px距离；保持菜单图标、名称和折叠行为不变。不进行视觉检查。

## 2026-10-27 教师与管理员个人资料

- 右上角身份菜单统一增加“个人资料”入口，使用/account/profile按当前登录账号展示本人信息；仅教师、内置admin与用户管理创建的普通管理端账号可用，不向学生增加入口。普通管理端账号访问本人资料无需额外业务菜单授权，不能借此访问其他菜单；资料页沿用对应教师／管理员框架。
- 教师展示账号、身份、状态、教师工号、院系、专业；管理员展示账号、身份、状态及只读菜单权限。本人可修改姓名、联系电话（手机号／办公电话或留空）和个人备注；账号、教师工号、院系／专业、管理端身份和权限只读。个人备注使用personalNotes，与管理员的notes管理备注分开。保存按当前登录主体定位，不接收目标用户ID或授权字段；过期草稿、失效登录、来源切换、停用与存储失败拒绝保存。
- 普通管理员和教师沿用本人改密操作；内置admin新增本人验证旧密码后修改密码，使用相同的带盐PBKDF2凭据。首次设置私人密码前兼容原内置口令；设置后彻底停止原口令回退，旧登录与保留操作回调失效，刷新也不得自动启动为admin。密码明文不写入工作数据、审计或记住密码，私人admin仅记住账号。
- 个人资料的“修改密码”进入/account/password?from=profile，非临时密码时可返回个人资料；改密成功统一退出并要求重新登录，教师／普通管理端临时密码仍须先完成首次改密。profile接口对菜单权限无额外要求，但不能绕过首次改密门槛。已保存成绩、会话、历史快照及CPD源文件不变，不进行视觉检查。

- 2026-10-27 修复从教师端进入个人资料却显示admin：身份切换必须同步当前账号会话，不能只跳转工作台。内置admin显式切换教师端时建立绑定当前来源、当前教师凭据和原admin凭据的教师工作身份，会话刷新仍保留；个人资料、顶部姓名、保存资料和改密均读取当前教师身份。普通教师或普通管理端账号不能借切换取得管理员权限。
- 只有持有有效原admin身份的教师工作会话可返回原管理员；admin改密、来源切换或教师凭据变更均使相应旧会话／旧操作失效。切换只保存登录会话，不改教师、管理员资料或成绩。首次改密门槛继续约束真实教师登录；内置admin的显式教师工作身份可返回管理员并查看教师资料，修改教师密码仍须验证教师当前密码。涉及教师工作身份的个人资料审计记录delegatedBy=admin。旧教师工作台页面遗留的admin会话在点击个人资料时先同步工作身份，避免再误读或误存admin资料。不进行视觉检查。
- 2026-10-27 个人资料中的“修改密码”改为当前页面弹框，复用系统确认弹框的焦点、遮罩、Escape及忙碌状态行为；显示当前账号、旧密码、新密码、确认新密码，取消不离开资料页并丢弃密码草稿。改密弹框与首次改密页面共用账号分派，打开时绑定账号／凭据／权限会话及来源，状态变化必须重新打开，不能误修改另一账号。成功后统一退出并重新登录。旧/account/password?from=profile入口在非强制改密时转为资料页弹框；真实首次登录修改临时密码继续独立页面，不因弹框改造放宽门槛。不进行视觉检查。
- 2026-10-27 个人资料编辑区的“取消／保存资料”按钮采用flex布局，间距12px，窄屏可换行；教师与管理员共用。不进行视觉检查。
- 2026-10-27 修复普通账号admin1点击AI能力库无法展开：能力库父入口必须进入“已授权能力库子菜单”的首项，不得复用账号默认首页（可能为运行概览或AI能力配置）。侧栏点击和旧能力库根路径重定向共用adminLibraryLandingPath；保留二级菜单授权过滤、展开收起及当前能力上下文，未授权子菜单不补权。不进行视觉检查。
- 2026-10-27 登录按钮与下方教师密码找回提示保留16px间距，使用针对按钮后提示的样式覆盖，避免被登录表单通用段落规则清零；其他登录提示与入口间距保持原样。不进行视觉检查。
- 2026-10-27 密码找回提示默认隐藏，同一账号连续3次账号／密码验证失败后展示：教师引导至教师管理，普通管理账号引导至用户管理，内置admin联系系统负责人；未知账号只提示确认账号。验证码、存储及来源变化错误不计数；更换账号或登录成功清空，次数仅保留在当前登录页内存，不持久化。不进行视觉检查。

## 2026-10-27 HTTP 演示兼容

- 用户明确没有域名，现有公网 HTTP 地址须支持账号创建、密码重置及本人改密。`browserCrypto.js`优先使用原生WebCrypto；HTTP缺少subtle时用锁定版本的@noble/hashes异步PBKDF2-HMAC-SHA256，保留210000次迭代、16字节盐、32字节输出和既有凭据格式。随机ID用getRandomValues生成UUID v4，不能退化到Math.random或明文密码。
- 新旧密码凭据在HTTP／HTTPS间互通，不迁移或清空工作数据。所有原crypto.randomUUID业务入口复用randomId。HTTP兼容仅解决浏览器API可用性，不提供HTTPS传输保护。
- 验证：790项测试、生产构建通过；独立无头浏览器在真实HTTP非安全上下文（subtle/randomUUID均不可用）通过普通账号创建、临时密码修改、系统admin改密、新密码登录与旧密码拒绝，数据中未存明文密码。未进行截图或视觉检查。

## 2026-10-27 浏览器工作数据同步CPD

- 用户明确要求将当前浏览器数据同步到部署CPD；使用当前选中的cpd工作数据完整导出，保留admin1及其17项菜单和密码凭据，不仅追加账号。原CPD和完整导出备份位于../数据同步备份/20261027-224342。未重置密码，未切换或清空浏览器工作来源。
- 新CPD的默认双来源首次加载、admin1资料与能力库渲染及全部菜单授权定向检查和构建通过。旧测试有7项依赖原固定样例状态，完整无会话渲染也不适用于已配置账号后要求登录的状态；保留真实当前数据，不为测试恢复旧样例。云端已有浏览器工作副本继续优先，不自动覆盖。不进行视觉检查。
