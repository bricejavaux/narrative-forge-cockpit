# Structural Iteration — Plan

This iteration covers 16 sections. I'll execute it as a single large migration + multi-file code update, in clear phases.

## Phase A — Security
- Add Settings warning text exactly as specified (".env was previously tracked…").
- Note: I cannot run `git rm --cached .env` (no stateful git allowed). I'll instruct the user to run it themselves and surface that prominently in Settings + chat.
- Verify `.env.example` (already exists) and `.gitignore` already excludes `.env`.

## Phase B — Database migration (single migration)

New tables / columns:
- `agents` — add columns: `description`, `default_model`, `selected_model`, `quality_profile`, `persistence_status`, `vector_context_status`, `is_active` (keep existing structure).
- `agent_versions` (new, with `is_current`, `version_number`, prompts, scripts, schemas).
- `agent_index_bindings` (new).
- `vector_indexes`, `vector_documents`, `vector_chunks` (with `embedding vector(1536)` if extension available; fallback to `jsonb` if not), `retrieval_logs`.
- `impact_analysis` (new).
- Enable `vector` extension (idempotent).
- No RLS yet (matches existing tables — none have RLS). Document for user.

## Phase C — Edge Functions
- `vector-ingest-package` (modes: metadata_only | embed_and_store, dry_run).
- `vector-search` (embeds query, cosine top-k, logs retrieval).
- Update `openai-agent-run` to: load agent config from Supabase, resolve index bindings, optionally call vector-search, return rich output with `vector_context_used`, `indexes_active`, `indexes_pending`, `retrieved_chunks`, warnings.
- New `agents-bootstrap` function: idempotently insert default agents + versions into Supabase from the existing dummy catalog.

## Phase D — Services
- `src/services/agentsService.ts` (new): list/load/save agents + versions + bindings; bootstrap.
- `src/services/vectorIngestionService.ts` (new): ingest, search, list indexes.
- `src/services/impactAnalysisService.ts` (new): list, create, validate.
- Extend `supabaseService.getReadiness()` capability map (audio pipeline, run persistence, pgvector activeness flags).

## Phase E — UI changes

Dashboard (`DashboardPage.tsx`):
- Remove static date `2026-04-14 10:30`; use `readiness.checked_at` / `new Date()`.
- Dynamic title: Live / Hybride / À finaliser based on readiness.
- Capability count excludes OneDrive/OpenAI/Supabase when live; excludes notifications/profile/auth.
- Clickable details panel listing real pending capabilities.
- Label dummy KPIs / activity / runs as `mock fallback`, `activité exemple`, `historique mock`.

Settings (`SettingsPage.tsx`):
- Capability-level cards driven by `connection-status`.
- Add explicit `.env` warning message.
- Chroma → `archived_not_active` (not "simulé").
- Pipeline indexation → `prepared_pgvector_pending`.
- Whisper logic: don't say "OpenAI requis" when live.
- Disable deep rewrite toggle with tooltip.

Agents (`AgentsPage.tsx`):
- Load from Supabase first via `agentsService`, fallback to dummy.
- "Initialize default agents" button → calls `agents-bootstrap`.
- Editable detail panel: objective, system prompt, operating script (JSON), inputs/outputs schemas, model selection, vector bindings, top_k, similarity threshold, permission policy.
- Save new version / Restore / Compare / Test buttons.
- Model adequacy block + Data sources block + Current vs future context note.

Indexes (`IndexesPage.tsx`):
- Add ingestion actions per vector package: metadata-only, sample embeddings, full embeddings, search test, bind to agents.
- Cautions for `follett`, `sf_portals_fiction`. Recommend `science_portals` first.
- Future index cards with `future` / `pending_pgvector` / `active` labels driven by chunk counts.

Canon (`CanonPage.tsx`):
- Add "Impacts potentiels" panel reading `impact_analysis` table.
- On canon edit (existing form), enqueue an impact analysis row, set `needs_index_refresh=true`.
- Validate / Ignore / Create rewrite_task buttons.

Architecture (`ArchitecturePage.tsx`):
- Replace "future connection required" with Supabase-first / mock-fallback logic.
- Add "Import from articulation.txt" + "Generate proposal from canon" actions (wire to existing import-source where possible; otherwise stub with clear status).

NoteComposer:
- Already mostly correct. Tighten copy: never say "OpenAI requis" when OpenAI live. Audio tab message: "Audio transcription pending — use text note or upload audio file."

Header:
- Tooltip on project/tome dropdowns. Mark notifications + profile as `future` if no notification system / no auth.

## Phase F — Mock data policy
- Add `MOCK_LABEL` utility to label fallback regions consistently. Audit each dummy-driven block to use it.

## Phase G — Acceptance verification
- Build check via harness.
- Smoke check Settings, Dashboard, Agents detail, Indexes ingestion controls visible.

## Out of scope (explicit)
- Do not run ingestion automatically.
- Do not enable autonomous rewrite.
- Do not modify chapters/characters automatically.
- Do not migrate Chroma.
- Do not remove mock mode.
- No RLS added (current schema has none; introducing it now would break the app — user can request a dedicated security pass later).

## Approval needed
The DB migration is large (3 new domains: agent versioning, vector RAG, impact analysis) and enables the `vector` extension. Approve to proceed.
