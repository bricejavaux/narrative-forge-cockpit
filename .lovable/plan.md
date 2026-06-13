# Production Test — focused patch plan

The request spans 15 parts touching RLS, edge functions, and 6+ frontend surfaces. To keep changes safe and reviewable I propose shipping in **4 sequenced batches**. Each batch is independently verifiable. Confirm the batching, or tell me which batch to start with (or to do all at once).

## Current state (verified)

- `runs`, `run_outputs`, `audit_findings`, `rewrite_tasks`, `production_*` have **only `authenticated` ALL policies** — anon SELECT is missing, so an unauthenticated preview cannot read traces. `retrieval_logs` already has anon SELECT.
- `audioTranscriptionService.uploadAudio` **already exists** (Part 6 is essentially done).
- `RunsPage` already has finding governance buttons + vector trace block (Part 2 mostly done; needs read-status card + future-types are present).
- `AudioPage` still imports `audioNotes` from `dummyData` (only used inside `isDemoMode()` block) and has no clickable drawer.
- `DiagnosticsPage` imports `chapters, arcs, characters, audioNotes` from dummyData and calls `openaiService.generateDiagnostic` directly (bypasses `run-execute`).
- `connection-status` hardcodes `pgvector_ready=true, migration_pending=false` already (truthier than spec claims) but doesn't return `science_index_active`, chunk counts, etc.
- `ArchitecturePage` already shows the read-only banner and "Ouvrir dans Production" CTA (Part 12 mostly done).
- `run-execute` already covers all listed `run_type`s but lacks structured failure stages and doesn't ensure a `run_outputs` row on exception before the dispatch.

## Batch 1 — Backend truthfulness (RLS + status + run-execute)

**Files**
- `supabase/migrations/<ts>_production_test_read_policies.sql` (new) — anon+authenticated SELECT policies on runs, run_outputs, audit_findings, rewrite_tasks, production_events, production_units, production_validations (retrieval_logs already done). Idempotent: `DROP POLICY IF EXISTS` then `CREATE POLICY ... USING (true)`. No write grants.
- `supabase/functions/connection-status/index.ts` — add real DB checks via service-role REST: count `vector_chunks` where `index_name='science_index' and embedding_status='done'`, look up `vector_indexes.science_index`, package row. Return the full `indexes` shape from spec.
- `supabase/functions/run-execute/index.ts` — wrap each dispatch branch so we always `insert into run_outputs` even on failure with `{ stage, error }`, and always finalize. Return `{ run_id, stage, error }` on failure. Add `diagnostic_tome_live` → convert recommendations into `audit_findings`.

## Batch 2 — Agent Studio model editing + dedup (Parts 4, 5)

**Files**
- `src/components/shared/PersistedAgentsPanel.tsx` — add model `<select>` populated from `openaiModels.ts` + custom-id input + reason textarea + "Enregistrer modèle agent" button. On save: `agentsService.updateAgent(id, { selected_model, metadata: { ...prev, last_model_change: {...} } })`. Show science_index binding status block (active/chunks/embeddings) sourced from new `connection-status.indexes`.
- Confirm `AgentVersionEditorPanel` isn't mounted anywhere; remove import if leftover. Strip any "agent persistence pending" / "édition désactivée" copy.

## Batch 3 — Frontend truthfulness (Parts 7, 9, 11)

**Files**
- `src/pages/AudioPage.tsx` — remove `audioNotes` import + demo block; rows become buttons opening a right-side drawer (sheet) showing audio_note + audio_transcript joined data, copy/structure/mark-treated buttons, and "Lecture audio future — transcript disponible" placeholder (no signed-URL function yet — declared not implemented).
- `src/pages/DiagnosticsPage.tsx` — kill `dummyData` imports outside `isDemoMode()`; route "Générer diagnostic live" through `supabase.functions.invoke('run-execute', { body: { run_type: 'diagnostic_tome_live' } })`; surface returned `findings` with the same governance buttons as RunsPage (Accepter/Rewrite task/Ignorer).
- `src/components/shared/CapabilitiesModal.tsx` — recompute Production Test vs Chapter Production vs Future buckets from `connection-status` shape so badge count == modal count; pgvector only appears once.

## Batch 4 — Optional polish (Parts 8, 13, 14)

**Files**
- `src/components/shared/AudioReviewTypesPanel.tsx` + `AudioPage` sessions tab — minimal `review_sessions` create/list using existing table.
- `src/components/shared/BeatsPlanPanel.tsx` — re-preview replaces (not appends), hide non-implemented move arrows, expose per-beat editor save/delete (uses existing `beatsService` methods if present, else marks "non implémenté").
- `src/components/shared/PersistedAgentsPanel.tsx` — refine binding display to "science_index · active · chunks=n · embeddings=n" vs `pending_pgvector` from the new status payload.

## Items already satisfied (no work needed)

- Part 6 (`audioTranscriptionService.uploadAudio`) — already shipped.
- Part 12 (Architecture banner + CTA) — already shipped.
- Most of Part 2 (governance buttons, future types, vector trace block) — already shipped.
- Part 3 partial — base shape already exists, only failure-stage hardening missing.

## What I'm explicitly NOT doing

- No rebuild, no redesign, no new dummy data.
- No signed-URL audio playback function (Part 7 marks it "non implémenté — service-role signed-URL function manquante").
- No autonomous rewrite, no Follett/SF-fiction ingest, no Chroma migration.
- No beat move-up/down implementation — arrows hidden per spec.

## Recommended order

Batch 1 → reload preview → Batch 2 → Batch 3 → (Batch 4 if you want polish). Each batch ~1 round.

Tell me **"go"** to execute all 4 batches sequentially in one response, or **"batch 1 only"** (etc.) to gate each step.
