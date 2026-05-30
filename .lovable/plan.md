# Phase 2D — UX role clarification & workflow correction

Scope: enforce page-role doctrine, kill duplicate UI, make Production the single workshop, fix audio truthfulness, seed the agent registry, improve planned-beats UX. **No pgvector, no chapter text generation, no autonomous rewrite, no Chroma migration.**

Work is split into 5 waves so each can be reviewed independently. I will execute them sequentially, posting a short progress note between waves.

---

## Wave A — Dashboard + Supabase Repository + Capabilities consistency

Targets: `DashboardPage.tsx`, `SupabaseRepositoryPanel.tsx`, `CapabilitiesModal.tsx`, `Header.tsx`.

- Dashboard: remove any remaining profile icon / "next best action" / fake activity / fake health / fake recent runs / weak chapters / cost-latency mocks. Keep readiness, OneDrive panel, Supabase panel, compact `ProductionFlowPanel`, `ImportReconcilePanel`, capabilities/blockers.
- Merge "Sources" + "État des connexions" if duplicated.
- `SupabaseRepositoryPanel`: add a prominent green **"Supabase live"** badge when core tables (`canon_objects`, `characters`, `import_jobs`, `chapters` if started) are readable, regardless of optional/phase-2 table state. Move raw JSON diagnostic into a collapsed "Diagnostic technique avancé" block (hidden by default when core OK).
- Capabilities: ensure compact card and modal share one source of truth (single helper computing the 3 groups) so counts always match.

## Wave B — Production page: single chain, board legend, lock tooltip

Targets: `ProductionPage.tsx`, `ProductionFlowDiagram.tsx`, `ChapterProductionBoard.tsx`, `LockReopenButton.tsx`, `StageCard.tsx`.

- Remove the duplicated 12-stage grid (`stages.map(StageCard)`). Keep only `ProductionFlowDiagram` as the single clickable chain. Clicking a stage scrolls to + highlights the corresponding section below (chapter board / beats workshop / validation panels).
- `ChapterProductionBoard`: add color legend (green validated, amber pending, red blocked, blue active, grey future). Each card shows: number, title, plan/beats/validation/audit/lock status, next allowed action. Card click selects chapter (already wired) — confirm visual feedback.
- Add tooltip on every "verrouillé" badge with the doctrine wording about lock semantics + reopen consequence.

## Wave C — Planned beats workshop: guided modes + model dropdown + batch

Targets: `BeatsPlanPanel.tsx`, `beatsService.ts`, `supabase/functions/beats-plan/index.ts` (light, only to accept mode key if needed).

- Replace free-text mode input with a card grid of 8 recommended modes (default: **Balanced narrative beats**). Each card shows description, when to use, detail level, recommended model, cost/latency hint, requires-pgvector flag, can-run-now flag.
- Replace free-text model input with a `Select` dropdown (gpt-4.1-nano / mini / 4.1, o4-mini, gpt-5 configurable, gpt-5.4, gpt-5.5, custom). Show warning for "configurable" models.
- Add batch actions: "Generate beats for all chapters" (sequential with progress `Chapter i/N`, stop button, per-chapter success/fail), "Persist all reviewed", "Validate all" (always behind confirm dialog).
- Never auto-validate.

## Wave D — Audio truthfulness + shared composer + Architecture role

Targets: `AudioPage.tsx`, `MicButton.tsx`, new `AudioOrTextNoteComposer.tsx`, `ArchitecturePage.tsx`.

- `AudioOrTextNoteComposer` shared component exposing 4 capability rows (text / upload / mic / transcription) each with live|pending badge. Mic button disabled with explicit reason until MediaRecorder is implemented.
- Replace ad-hoc audio entry points in Canon / Characters / Architecture / Production / Audio with this composer.
- `ArchitecturePage`: any button that performs production work becomes "Open in Production" (route to /production with chapter id).

## Wave E — Agent registry seed + Runs simplification + Exports auto + Settings

Targets: `AgentsPage.tsx`, `PersistedAgentsPanel.tsx`, `agentsService.ts`, `supabase/functions/agents-bootstrap/index.ts`, `RunsPage.tsx`, `ExportsPage.tsx`, `SettingsPage.tsx`, `DiagnosticsPage.tsx`.

- Agents: when list is empty show empty state + **"Initialiser les agents par défaut"** button calling `agents-bootstrap`. Bootstrap function seeds the 20 default agents with `is_active`, description, operating script stub, selected/recommended models, IO schemas, required-data flags, testable-now flag, persistence policy, human-validation rule. Current 6 marked active; future 7 marked inactive.
- Runs: reorganize into 4 sections — Real run history / Available advanced runs / Blocked-or-future runs / Technical payload preview. Each run click shows progress, model, started_at, status, logs, result. Remove the second "production cockpit" framing.
- Diagnostics: each recommendation gets actions (accept / reject / mark acceptable / create rewrite task / create beat adjustment / create canon impact / ignore-with-reason). No auto-apply.
- Exports: standard export tiles (Canon / Characters / Chapter plan / Beats / Production state / Full JSON) load from Supabase and produce txt/md/json preview + download + optional OneDrive push. Keep manual paste only under "Custom manual export". Chroma stays archive-only.
- Settings: remove obsolete `.env` warning, keep one-line note about runtime secrets. Make narrative sliders persistent (Supabase `project_settings` row or localStorage fallback) and reused later by beats generation.

---

## Technical notes

- No DB migration required for waves A–D. Wave E may add a tiny `project_settings` table (single-row, no auth) for the narrative sliders — I will request approval via the migration tool when we reach it.
- `agents-bootstrap` already exists; I will extend its seed list rather than rewriting it.
- Sequential batch beat generation uses existing `beats-plan` edge function in a JS loop; no edge changes needed.
- All color tokens via existing semantic Tailwind tokens.

I'll start with **Wave A** as soon as you approve.
