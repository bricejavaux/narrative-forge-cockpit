-- =========================================================
-- PHASE 1.1 — audio_notes / audio_transcripts: anon SELECT
-- =========================================================
GRANT SELECT ON public.audio_notes TO anon;
GRANT SELECT ON public.audio_transcripts TO anon;

DROP POLICY IF EXISTS "Anon can read audio notes" ON public.audio_notes;
CREATE POLICY "Anon can read audio notes" ON public.audio_notes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read audio transcripts" ON public.audio_transcripts;
CREATE POLICY "Anon can read audio transcripts" ON public.audio_transcripts
  FOR SELECT TO anon USING (true);

-- =========================================================
-- PHASE 2 — vector tables: anon SELECT for readiness UI
-- =========================================================
GRANT SELECT ON public.vector_documents TO anon;
GRANT SELECT ON public.vector_chunks TO anon;
GRANT SELECT ON public.vector_indexes TO anon;
GRANT SELECT ON public.vector_source_packages TO anon;
GRANT SELECT ON public.vector_source_chunks TO anon;
GRANT SELECT ON public.retrieval_logs TO anon;

DROP POLICY IF EXISTS "Anon can read vector documents" ON public.vector_documents;
CREATE POLICY "Anon can read vector documents" ON public.vector_documents
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read vector chunks" ON public.vector_chunks;
CREATE POLICY "Anon can read vector chunks" ON public.vector_chunks
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read vector indexes" ON public.vector_indexes;
CREATE POLICY "Anon can read vector indexes" ON public.vector_indexes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read vector source packages" ON public.vector_source_packages;
CREATE POLICY "Anon can read vector source packages" ON public.vector_source_packages
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read vector source chunks" ON public.vector_source_chunks;
CREATE POLICY "Anon can read vector source chunks" ON public.vector_source_chunks
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read retrieval logs" ON public.retrieval_logs;
CREATE POLICY "Anon can read retrieval logs" ON public.retrieval_logs
  FOR SELECT TO anon USING (true);

-- =========================================================
-- PHASE 3.1 — Bind science_portals to scientific/audit agents
-- top_k=5, similarity_threshold=0.2, required=false (degraded mode allowed)
-- Idempotent upsert by (agent_id, index_name).
-- =========================================================
WITH target_agents AS (
  SELECT id, external_id FROM public.agents
  WHERE external_id IN (
    'agent_audit_scientific_density',
    'agent_audit_canon_consistency',
    'agent_audit_planned_beats',
    'agent_validate_beat_quality'
  )
)
INSERT INTO public.agent_index_bindings
  (agent_id, index_name, corpus_name, required, top_k, similarity_threshold, status, metadata)
SELECT
  id, 'science_index', 'science_portals', false, 5, 0.2, 'pending_pgvector',
  jsonb_build_object('bound_for', external_id, 'reason', 'science_portals controlled binding')
FROM target_agents
ON CONFLICT (agent_id, index_name) DO UPDATE
SET
  corpus_name = EXCLUDED.corpus_name,
  required = EXCLUDED.required,
  top_k = EXCLUDED.top_k,
  similarity_threshold = EXCLUDED.similarity_threshold,
  metadata = public.agent_index_bindings.metadata || EXCLUDED.metadata,
  updated_at = now();

-- Tune verification_science existing binding to match (top_k=5, threshold=0.2)
UPDATE public.agent_index_bindings b
SET top_k = 5, similarity_threshold = 0.2, updated_at = now()
FROM public.agents a
WHERE b.agent_id = a.id
  AND a.external_id = 'agent_verification_science'
  AND b.index_name = 'science_index';