# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Product decisions for this prototype

- Brand name: 兴辰智能. A placeholder logo is acceptable.
- Visual source of truth: the first generated direction, the bright navy-and-blue “清晰教学台” monitoring dashboard saved at `public/assets/reference-monitor.png`.
- Scope: implement all 34 primary pages from PRD V1.1 with working navigation and the core teacher/admin interactions; use realistic mock data rather than backend services.
- The prototype must support desktop teaching workstations and wider classroom monitoring displays.
- Fixed voice commands and spoken prompts may be product-designed in the prototype.
- The user is a product manager and expects a directly accessible, interactive React prototype—not additional visual concept images.

## Audit remediation decisions

- The prototype must remain usable in an 827px-wide split-view or embedded browser: the page itself must not overflow horizontally, while wide tables may scroll inside their own container.
- SOP step detail must show real standard actions, evidence requirements, deduction rules, and safety redlines rather than a generic confirmation placeholder.
- Manual score review must preserve an audit chain: conclusion, required rationale, referenced evidence, score-impact preview, operator, and save time.
- Teacher/admin switching must use an explicit identity menu and named switch action; clicking the avatar must not immediately change roles.
- Monitoring event feeds must remain scannable, and historical comparisons must expose exact values plus SOP-version differences.
- Each student/workstation must open a dedicated monitoring page. Its desktop layout uses a large live video area with action-detection marks in the upper left, all SOP action states directly below it, and a right-side column for compact statistics plus selected-step result, duration, evidence, and rule details. Ignore subtitles or branding baked into supplied video references.
- SOP is a teacher-owned, versioned business ground truth and must never be generated or rewritten by the model. The product flow is teacher-defined SOP → action dataset labels mapped to fixed Step IDs plus mandatory Other → model candidate output → deterministic state-machine judgment. SOP versions, dataset versions, and model versions are independently reviewed, locked, deployed, and auditable.
- Camera-only MVP boundary: the prototype must not depend on torque sensors, PLC/IoT, ASR, or other non-video signals. Camera-unjudgeable criteria, AI uncertainty, occlusion, and missing video evidence default to full score and may be teacher-audited; they do not block grade publishing. A teacher deduction requires a reason and audit record. A confirmed safety redline still pauses/blocks the session and requires review.
- Every SOP step must explicitly declare one of three judgement modes (video automatic, video-assisted with default pass, or video-unreliable with default pass/manual deduction) and include teacher-owned student teaching content, operating points, common mistakes, known video limits, and an optional standard media reference.
- The eight P0 minimum-operability additions accepted on 2026-09-19 are delivered in four batches: judgement/scoring plus teaching content; lightweight student workstation plus practice/exam feedback; implementation readiness plus SOP field validation; recording integrity plus minimal technical diagnostics.
- The student workstation is a standalone, session-bound surface at `/workstation/:arrangementId/:workstationId`, not a general student portal. It covers identity/task/workstation confirmation, readiness, start, teacher help, safe finish, and same-Session refresh recovery. Practice shows teacher-authored guidance, ordinary error/correction feedback, progress and live score; exams hide standard content, real-time correctness, deductions, confidence and score until teacher publication. Student help, AI uncertainty and system faults must surface in the teacher attention feed.
- Automatic evaluation is enabled per workstation and SOP version only after an implementation baseline (camera position, lighting, occlusion, rectangular operation/tool/danger ROIs) and a passing eight-scenario field validation are recorded against matching SOP, model, ROI, and camera-config versions. Publishing or using an SOP never depends on this gate: any unavailable or invalidated automatic step degrades to the default-pass policy until the workstation is revalidated.
- Every Session has a formal recording-integrity state (`完整`, `部分缺失`, or `不可用`). Each step keeps its clip range, available cameras, and locked SOP/model/ROI/camera-config versions. Recording gaps are system anomalies and never create an automatic student deduction; confirmed safety redlines remain blocking. Practice and exam recordings have separate retention periods, while scores, step records, teacher revisions, and audit logs survive full-video expiry.
- “Why no judgment” diagnostics are admin/implementation-only. They expose condition checks, recent observed facts, versions, one actionable no-trigger reason, and an audited root-cause category (`模型`, `ROI`, `SOP配置`, `系统`, `非AI问题`, or `未知`). Teacher views show business availability, coverage, evidence status, and known limitations but do not expose or edit model thresholds, frame counts, deployment, or rollback controls.
- Execute the 2026-09-18 audit remediation in numbered batches. Establish shared mock state, real submission, stable object IDs, role-safe read-only routes, and browser-verifiable acceptance before filling later modules. The class-management flow is the complete reference implementation for other master-data modules; never use a success toast for an operation that did not change data.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
