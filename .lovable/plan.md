# Production Flow Iteration — Plan

This iteration adds a **production pipeline layer** on top of the existing app: Canon → Architecture → Plan → Planned Beats → Validation → Generation → Observed Beats → Audit → Targeted Rewrite → Lock → Meta-audit → Export. Beats become first-class objects, planned **before** generation and observed **after**.

The current design, routes, and pastel layout stay intact. A new `/production` route is added, plus a Chapter Production Board, beat validation flow, and lock/reopen logic. Mock fallback is preserved but never shown as real production state.

## Phase A — Database migration (single migration, requires approval)

New tables:
- `production_units` (canon | tome_architecture | chapter | beat_set | beat | audit | rewrite_task | export, with status, locked, version, parent_unit_id, dependency_hash, stale_reason)
- `production_dependencies` (requires | informs | blocks | invalidates | audits | rewrites)
- `production_validations` (human | agent | audit | lock validation)
- `production_events` (audit log of stage transitions)

Extensions:
- Extend `beats` with: `tome_id`, `beat_type` (planned/observed/revised), `objective`, `narrative_function`, `characters jsonb`, `arcs jsonb`, `canon_links jsonb`, `tension_start/end`, `scientific_density`, `emotional_density`, `decision_made`, `consequence`, `revelation`, `payoff`, `required_detail`, `validation_status`, `source`, `version`, `locked`, `beat_number`. Keep existing columns.
- Extend `chapters.metadata` is already JSONB — store production sub-statuses there to avoid breaking existing structure: `planning_status`, `beats_status`, `generation_status`, `audit_status`, `rewrite_status`, `lock_status`, `export_status`, `planned_beat_count`, `observed_beat_count`, `revised_beat_count`, `last_audit_score`, `needs_rewrite`, `needs_meta_audit`, `stale_due_to_canon`, `stale_due_to_character`. Add real columns only for `full_text`, `active_version`, `locked`, `production_status`.
- Extend `rewrite_tasks` with: `chapter_id`, `beat_id`, `issue_type`, `severity`, `target_section`, `instruction`, `proposed_change`, `created_by_agent`. Keep existing.
- Add `chapter_versions` table (id, chapter_id, version, full_text, generation_log, model, inputs jsonb, planned_beat_coverage numeric, warnings jsonb, created_at).

No RLS yet (consistent with existing schema).

## Phase B — Edge Functions

- `production-state` — returns full pipeline state for a tome (stages, statuses, blockers, counts).
- `beats-plan` — generates planned beats from chapter plan + canon + characters via OpenAI.
- `beats-validate` — marks beat set as validated, creates `production_validations` row.
- `beats-extract-observed` — analyzes chapter `full_text` and extracts observed beats via OpenAI.
- `beats-compare` — produces planned-vs-observed coverage report (covered/partial/missing/distorted/overdeveloped + unplanned).
- `chapter-generate` — gated function. Refuses if planned beats not validated, canon stale, or architecture missing. Creates new `chapter_versions` row.
- `chapter-audit` — runs canon/character/rhythm/density audits, writes findings, creates targeted `rewrite_tasks`.
- `chapter-lock` / `chapter-reopen` — lock/unlock with reason, propagates `stale_*` flags to dependents.
- `meta-tome-audit` — periodic cross-chapter audit, proposes architecture changes.
- `canon-impact-analysis` — extends existing `impact_analysis` table to enumerate affected chapters/beats/characters.

All functions use OpenAI only (no Lovable AI Gateway), respect existing `_shared/openai.ts` and `_shared/cors.ts`.

## Phase C — Frontend services

- `src/services/productionFlowService.ts` — read pipeline state, list stages, fetch blockers.
- `src/services/beatsService.ts` — CRUD + validation + comparison.
- `src/services/chapterProductionService.ts` — generate/audit/lock/reopen + version history.
- Extend `impactAnalysisService` with affected-objects enumeration.

## Phase D — UI

New page **`src/pages/ProductionPage.tsx`** route `/production`:
- Schematic flow visualization (11 stages with color states: green validated, amber pending, red blocked/stale, blue live, grey future). Click → relevant page.
- Stage cards: status, owner, inputs, outputs, validation requirement, last updated, blockers, "Open" + "Validate/Reopen" buttons.
- French status badges as specified.

New components:
- `src/components/production/ProductionFlowDiagram.tsx` — schematic node graph.
- `src/components/production/StageCard.tsx` — per-stage detail card.
- `src/components/production/ChapterProductionBoard.tsx` — per-chapter horizontal progress strip with clickable segments.
- `src/components/production/BeatValidationPanel.tsx` — list planned beats, edit/split/merge/reorder/validate, missing-field highlighting.
- `src/components/production/BeatComparisonPanel.tsx` — planned vs observed coverage matrix with severity & recommendations.
- `src/components/production/RewriteTasksPanel.tsx` — targeted rewrite list with accept/reject/escalate.
- `src/components/production/LockReopenButton.tsx` — reusable lock/reopen with reason capture.
- `src/components/production/ProductionStatusBadge.tsx` — French status badges.

Page integrations:
- **CanonPage**: after edit, surface "Cette modification peut impacter l'architecture du tome" + actions (Run impact / View affected / Create proposals / Validate / Ignore).
- **ArchitecturePage**: link to `/production` and per-chapter board.
- **ChaptersPage / per-chapter detail** (or new chapter detail panel inside Architecture): Chapter Production Board with all 8 stages, beats panels (planned/observed/revised tabs), audit results, rewrite tasks, lock/reopen.
- **RunsPage / Run Designer**: new production run types: `generate_planned_beats`, `audit_planned_beats`, `generate_chapter_from_validated_beats`, `extract_observed_beats`, `audit_chapter_against_beats`, `targeted_rewrite`, `meta_tome_audit`, `canon_impact_analysis`, `export_readiness_audit`. Each shows required inputs, blockers, agents, models, persistence policy, validation requirement. Block invalid sequences (no chapter gen without validated beats; no full rewrite without snapshot; no export with unlocked chapters; no vector-retrieval claim while pgvector pending).
- **AgentsPage**: add `production_stage` mapping field to each agent card (Génération Beats, Audit Beats, Génération Chapitre, Audit Canon/Personnages/Rythme/Révélations, Réécriture ciblée, Style pass).
- **Sidebar/Header**: add "Production" nav entry.

## Phase E — Doctrine & guardrails

- New `src/lib/productionDoctrine.ts` — central enforcement helpers (`canGenerateChapter`, `canExport`, `propagateStaleness`, status→French label).
- All gating happens both server-side (edge functions refuse) and client-side (buttons disabled with explanatory tooltip).
- Mock fallback labelled "Design target — not active yet." Never show OK/validated unless a real row exists.

## Phase F — Out of scope

- No automatic structural changes (chapter add/remove/split, character merge).
- No autonomous full rewrites.
- pgvector activation untouched (still pending).
- No Chroma migration.
- No RLS pass.
- No removal of mock mode.

## Approval needed

The DB migration adds 4 new tables + extends `beats`, `chapters`, `rewrite_tasks`, plus a new `chapter_versions` table. Approve to proceed with the full implementation in one shot.
