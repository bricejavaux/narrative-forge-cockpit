-- P1-A Fix: restrict ALL RLS read policies from anon to authenticated only.
-- Covers 5 migrations that opened narrative and trace tables to anon:
--   20260529205308 (canon_objects, characters, import_jobs)
--   20260529214436 (chapters, beats)
--   20260613185806 (agents, agent_versions, agent_index_bindings, app_settings)
--   20260613194652 (audio_notes, audio_transcripts, vector tables, retrieval_logs)
--   20260613203526 (runs, run_outputs, audit_findings, rewrite_tasks, production_events, ...)
--   20260613205838 (review_sessions)

-- ── 20260529205308 : canon_objects, characters, import_jobs ──────────────────
DROP POLICY IF EXISTS "production_test_read_canon_objects" ON public.canon_objects;
CREATE POLICY "production_test_read_canon_objects"
  ON public.canon_objects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_characters" ON public.characters;
CREATE POLICY "production_test_read_characters"
  ON public.characters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_import_jobs" ON public.import_jobs;
CREATE POLICY "production_test_read_import_jobs"
  ON public.import_jobs FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.canon_objects FROM anon;
REVOKE SELECT ON public.characters    FROM anon;
REVOKE SELECT ON public.import_jobs   FROM anon;

-- ── 20260529214436 : chapters, beats ─────────────────────────────────────────
DROP POLICY IF EXISTS "production_test_read_chapters" ON public.chapters;
CREATE POLICY "production_test_read_chapters"
  ON public.chapters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_beats" ON public.beats;
CREATE POLICY "production_test_read_beats"
  ON public.beats FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.chapters FROM anon;
REVOKE SELECT ON public.beats    FROM anon;

-- ── 20260613185806 : agents, agent_versions, agent_index_bindings, app_settings
DROP POLICY IF EXISTS "Anon can read agent registry" ON public.agents;
CREATE POLICY "authenticated_read_agents"
  ON public.agents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read agent versions" ON public.agent_versions;
CREATE POLICY "authenticated_read_agent_versions"
  ON public.agent_versions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read agent bindings" ON public.agent_index_bindings;
CREATE POLICY "authenticated_read_agent_index_bindings"
  ON public.agent_index_bindings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read app settings" ON public.app_settings;
CREATE POLICY "authenticated_read_app_settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.agents               FROM anon;
REVOKE SELECT ON public.agent_versions       FROM anon;
REVOKE SELECT ON public.agent_index_bindings FROM anon;
REVOKE SELECT ON public.app_settings         FROM anon;

-- ── 20260613194652 : audio, vector tables, retrieval_logs ────────────────────
DROP POLICY IF EXISTS "Anon can read audio notes" ON public.audio_notes;
CREATE POLICY "authenticated_read_audio_notes"
  ON public.audio_notes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read audio transcripts" ON public.audio_transcripts;
CREATE POLICY "authenticated_read_audio_transcripts"
  ON public.audio_transcripts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read vector documents" ON public.vector_documents;
CREATE POLICY "authenticated_read_vector_documents"
  ON public.vector_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read vector chunks" ON public.vector_chunks;
CREATE POLICY "authenticated_read_vector_chunks"
  ON public.vector_chunks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read vector indexes" ON public.vector_indexes;
CREATE POLICY "authenticated_read_vector_indexes"
  ON public.vector_indexes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read vector source packages" ON public.vector_source_packages;
CREATE POLICY "authenticated_read_vector_source_packages"
  ON public.vector_source_packages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read vector source chunks" ON public.vector_source_chunks;
CREATE POLICY "authenticated_read_vector_source_chunks"
  ON public.vector_source_chunks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read retrieval logs" ON public.retrieval_logs;
CREATE POLICY "authenticated_read_retrieval_logs"
  ON public.retrieval_logs FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.audio_notes             FROM anon;
REVOKE SELECT ON public.audio_transcripts       FROM anon;
REVOKE SELECT ON public.vector_documents        FROM anon;
REVOKE SELECT ON public.vector_chunks           FROM anon;
REVOKE SELECT ON public.vector_indexes          FROM anon;
REVOKE SELECT ON public.vector_source_packages  FROM anon;
REVOKE SELECT ON public.vector_source_chunks    FROM anon;
REVOKE SELECT ON public.retrieval_logs          FROM anon;

-- ── 20260613203526 : runs, run_outputs, audit_findings, rewrite_tasks, … ─────
DROP POLICY IF EXISTS "production_test_read_runs" ON public.runs;
CREATE POLICY "production_test_read_runs"
  ON public.runs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_run_outputs" ON public.run_outputs;
CREATE POLICY "production_test_read_run_outputs"
  ON public.run_outputs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_audit_findings" ON public.audit_findings;
CREATE POLICY "production_test_read_audit_findings"
  ON public.audit_findings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_rewrite_tasks" ON public.rewrite_tasks;
CREATE POLICY "production_test_read_rewrite_tasks"
  ON public.rewrite_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_production_events" ON public.production_events;
CREATE POLICY "production_test_read_production_events"
  ON public.production_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_production_units" ON public.production_units;
CREATE POLICY "production_test_read_production_units"
  ON public.production_units FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_production_validations" ON public.production_validations;
CREATE POLICY "production_test_read_production_validations"
  ON public.production_validations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_retrieval_logs" ON public.retrieval_logs;
-- Note: policy "authenticated_read_retrieval_logs" already created above.

REVOKE SELECT ON public.runs                     FROM anon;
REVOKE SELECT ON public.run_outputs              FROM anon;
REVOKE SELECT ON public.audit_findings           FROM anon;
REVOKE SELECT ON public.rewrite_tasks            FROM anon;
REVOKE SELECT ON public.production_events        FROM anon;
REVOKE SELECT ON public.production_units         FROM anon;
REVOKE SELECT ON public.production_validations   FROM anon;

-- ── 20260613205838 : review_sessions ─────────────────────────────────────────
DROP POLICY IF EXISTS "production_test_read_review_sessions" ON public.review_sessions;
CREATE POLICY "production_test_read_review_sessions"
  ON public.review_sessions FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.review_sessions FROM anon;
