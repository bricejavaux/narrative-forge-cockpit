# Iteration plan — Audio + pgvector (science_portals) + scientific agent retrieval

Three independent workstreams, shipped in order. Each one is gated by its own
acceptance tests. Nothing in the "Do not" list is touched: no Follett / SF
ingestion, no chapter generation, no autonomous rewrite, no silent canon/beat
mutation, no Chroma migration, no new mock data.

---

## Phase 1 — Audio RLS / Whisper / microphone

### 1.1 Storage + RLS fix (root cause of "row-level security policy" error)

- Confirm `audio` bucket exists (it already does per project state) and keep it private.
- Migration: add `storage.objects` policies for the `audio` bucket only.
  Authenticated role: insert/select/update/delete restricted to
  `bucket_id = 'audio'`. No anon write.
- Migration: add an INSERT policy on `public.audio_notes` for the
  `service_role` path used by the upload Edge Function; reads stay as today.
  (audio_notes already has SELECT for anon — unchanged.)
- Path convention enforced server-side:
  `audio/{target_type}/{target_id}/{yyyyMMdd-HHmmss}-{uuid}.webm`.

### 1.2 Edge Function `audio-upload` (preferred option A in the spec)

- Accepts: `{ target_type, target_id, target_label, mime_type, duration_seconds, file_size, audio_base64 }`.
- Validates with Zod, decodes base64, writes to Storage with
  `SUPABASE_SERVICE_ROLE_KEY`, inserts `public.audio_notes` row with
  `status = 'uploaded'`, returns `{ audio_note_id, storage_path }`.
- CORS headers on every response, including errors.

### 1.3 Edge Function `openai-transcribe-audio` (fix/replace)

- Input: `{ audio_note_id, storage_path, language? }`.
- Downloads from Storage (service role) → POSTs to OpenAI `audio/transcriptions`
  (model `whisper-1` from `app_settings.openai`).
- Persists transcript in `public.audio_transcripts`, updates `audio_notes.status`
  to `transcript_ready` (or `transcription_failed` on error, file preserved).
- Returns the exact envelope from your spec (`mode`, `transcript`, `model`,
  `provider: 'openai'`, `status`, `warnings`, `errors`).

### 1.4 Component `AudioOrTextNoteComposer`

- New shared component in `src/components/shared/AudioOrTextNoteComposer.tsx`.
- Props: `target_type`, `target_id`, `target_label`, `context?`,
  `default_mode: 'text' | 'microphone' | 'upload'`.
- State machine matches your status list exactly (`idle`…`failed`).
- Microphone: real `MediaRecorder` (no fake waveform), webm preferred, timer,
  in-browser playback before submit, explicit error if `MediaRecorder`
  unavailable or permission denied.
- Text path is fully independent: stays "live" even if mic/Whisper are blocked.
- Calls `audio-upload` → `openai-transcribe-audio` → existing
  `openai-structure-note`. Structured proposal renders inline with **explicit
  human validation** (Apply patch / Comment / Rewrite task / Useful no-change
  / Reject / Edit). No auto-apply.
- Wired into Production, Architecture, Canon, Characters, Diagnostics, and
  Audio & Reviews pages — replacing the legacy `NoteComposer` call sites.
  Runs page stays text-only unless you want it added.

### 1.5 Truthful status badges

- New `src/lib/audioCapabilities.ts` resolves five flags independently:
  text-structure, mic-capture, audio-upload, whisper, patch-apply.
- Badge surface in the composer + Audio page shows each one as
  `live / blocked / unsupported` with the actual reason — never aggregates.

---

## Phase 2 — Minimal pgvector for `science_portals` only

`vector` extension is already installed (operators in db functions list confirm
it). Existing tables `vector_documents`, `vector_indexes`,
`vector_source_packages`, `vector_chunks`, `vector_source_chunks` are present
but don't match the minimal shape your spec asks for; rather than reshape them
(risk of breaking existing UI), I will:

- **Reuse** `vector_documents` (already has `embedding vector`, `corpus_name`,
  `content`, `metadata`).
- **Add** the missing `public.vector_embeddings` table exactly per spec
  (id, document_id FK cascade, corpus_name, embedding_model, embedding
  vector(1536), metadata, created_at) — chosen 1536 to match
  `text-embedding-3-small`.
- Indexes: `ivfflat (embedding vector_cosine_ops)`, btree on `corpus_name`,
  btree on `document_id`.
- GRANT: SELECT to anon (read-only retrieval visibility), full to
  authenticated + service_role. RLS enabled, SELECT policy `using (true)`,
  write policies restricted to authenticated + service_role.
- A no-op migration `create extension if not exists vector` for idempotency
  + audit trail.

### 2.1 Edge Function `vector-ingest-science-portals`

- Service-role only. Locates the `science_portals` package row in
  `vector_source_packages`.
- Reads `chunks.jsonl` from the OneDrive mirror via the existing connector
  (gateway path), or from a Supabase `source-files` mirror if already
  ingested as a source — chosen at runtime by checking what's available;
  warnings returned if neither is reachable.
- Generates embeddings via OpenAI `text-embedding-3-small`, batched (e.g.,
  64 chunks per request).
- Upserts `vector_documents` (by `(corpus_name, chunk_id)`), upserts
  `vector_embeddings`, marks package `ingestion_status = 'ingested'` with
  `embedding_model` + `ingested_at`.
- Hard refusal for `follett` / `sf_portals_fiction` (returns 400 with reason).

### 2.2 Edge Function `vector-search`

- Input/output exactly per spec.
- Embeds the query with the **same** model used for the documents
  (read from `vector_source_packages` row, fallback `text-embedding-3-small`).
- Pure SQL via RPC or PostgREST: `1 - (embedding <=> query)` as similarity,
  filtered to requested `corpus_names`, top_k.
- Explicit error envelope if extension missing or no embeddings present.

### 2.3 UI surfaces

- New `PgvectorReadinessPanel` (used in Indexes + Dashboard) — reports the
  exact six readiness flags from your spec, plus first-corpus selection
  (`science_portals`) and Chroma marked archive-only.
- Indexes page rows updated:
  - `science_portals`: live row with synced/ingested/embeddings count/last
    ingested + "Tester la recherche" button calling `vector-search`.
  - `follett`, `sf_portals_fiction`: visible but disabled with the exact
    rights/policy text from the spec.
  - Chroma: "archive only / not queried" label.

---

## Phase 3 — Bind scientific agents to `science_portals`

### 3.1 Bindings

- Migration: upsert `agent_index_bindings` rows for the six agents you listed
  (`agent_audit_scientific_density`, `agent_audit_canon_consistency`,
  `agent_audit_planned_beats`, `agent_validate_beat_quality`,
  `agent_diagnostic_chapter`, `agent_diagnostic_beats`). The last two do not
  exist yet under those names — I'll bind by name match if present and report
  "Not implemented yet — agent slug missing" for any that don't resolve,
  rather than inventing new agents.
- `index_name = 'science_portals'`, `corpus_name = 'science_portals'`,
  `required = false` (degraded mode allowed), `top_k = 5`,
  `similarity_threshold = 0.2`, `status` driven by readiness.

### 3.2 `run-execute` retrieval enrichment

- Before calling `openai-agent-run`, if the resolved agent has an active
  `science_portals` binding and pgvector is live, build a retrieval query
  from the available target context (chapter title, beat objectives, canon
  links, scientific_density flags, user instruction), call `vector-search`
  (top_k=5, capped content size), and inject `retrieved_context` into the
  agent payload + persist it on `run_steps.metadata` so the Runs page can
  surface it.
- If retrieval fails or pgvector isn't ready: continue in degraded mode and
  surface a `warning` on the run.
- Agent output prompt is extended (in `openai-agent-run`) to require citation
  of `source_file` + `chunk_id` for any science claim drawn from retrieved
  context.

### 3.3 Agent Studio retrieval section

- In `PersistedAgentsPanel`, for each agent with a `science_portals` binding,
  show: uses pgvector, required, active corpus, last retrieval count (from
  most recent run step), retrieval status (active / degraded / unavailable),
  and a "Tester retrieval science_portals" button (query + top_k inputs,
  shows chunks/similarity/source files).

### 3.4 Production audit badge

- `ProductionBeatsWorkshop` "Audit planned beats" button: before invoking
  `run-execute`, look up the resolved agent's bindings; render
  `Contexte scientifique : science_portals actif` or
  `Contexte scientifique non utilisé` based on actual state, and pass a
  hint into the run payload. Audit prompt updated to discuss density,
  unsupported claims, missing detail, and overloading risk.

### 3.5 Runs trace

- `RunsPage` detail view: read `run_steps.metadata.retrieved_context`
  (corpus_names, top_k, results[]); render a "Vector retrieval" section
  with chunk count, source files, similarity range, and full raw payload
  in the collapsible JSON.

### 3.6 Dashboard readiness

- `pgvector` flag becomes `live` only when extension + tables + search
  function + `science_portals` embeddings_count > 0 all hold.
- Remove `pgvector pending` from "Chapter Production blockers" once the
  above is true. Follett/SF stay archive/disabled, never blockers.

---

## What stays "Not implemented yet" by design

- Follett and `sf_portals_fiction` ingestion (rights/policy pending).
- Chroma migration (archive-only).
- Chapter draft generation, autonomous rewrite, silent canon/beat edits.
- `agent_diagnostic_chapter` / `agent_diagnostic_beats` if they don't exist
  in the registry — surfaced as missing-slug warning rather than fabricated.

## Technical details (review section)

- **Audio MIME**: webm in Chrome/Firefox, mp4/m4a on Safari — both accepted
  by Whisper; component picks the supported `MediaRecorder` mimeType at
  runtime.
- **Edge functions need CORS + Zod validation + service-role downloads**
  per the cloud-edge-config guidance already in scope.
- **Embedding dimension**: 1536 chosen to match `text-embedding-3-small`,
  documented in Settings panel and in the `vector_embeddings.embedding`
  column type. Switching to a different model later requires a migration.
- **Existing tables not deleted**: `vector_chunks`,
  `vector_source_packages`, `vector_indexes`, `vector_source_chunks` stay
  untouched; only `vector_embeddings` is added.
- **Bindings table writes** go through the migration tool (schema-safe
  upsert by `(agent_id, index_name)`).
- **Run payload size cap**: total retrieved content trimmed to ~6k chars
  (≈1.5k tokens) before injection, token estimate surfaced on the run.

---

## Order of execution

1. Phase 1.1–1.5 (audio RLS + edge functions + composer + status badges).
2. Phase 2.1–2.3 (migration, ingest fn, search fn, readiness/indexes UI).
3. Phase 3.1–3.6 (bindings, run-execute enrichment, Studio/Production/Runs UI,
   dashboard readiness).

After each phase I'll run the acceptance tests from your spec for that phase
before moving on, and report any "Not implemented yet" surfaces with the
exact technical reason.
