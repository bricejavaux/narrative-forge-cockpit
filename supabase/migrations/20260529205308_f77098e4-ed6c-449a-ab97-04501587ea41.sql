-- Production Test: allow anon/authenticated to read core narrative tables
-- so the frontend can verify writes done by service-role edge functions.
-- Tightened later when project-scoped auth is added.

ALTER TABLE public.canon_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs   ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.canon_objects TO anon, authenticated;
GRANT SELECT ON public.characters    TO anon, authenticated;
GRANT SELECT ON public.import_jobs   TO anon, authenticated;

DROP POLICY IF EXISTS "production_test_read_canon_objects" ON public.canon_objects;
CREATE POLICY "production_test_read_canon_objects"
  ON public.canon_objects FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_characters" ON public.characters;
CREATE POLICY "production_test_read_characters"
  ON public.characters FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_import_jobs" ON public.import_jobs;
CREATE POLICY "production_test_read_import_jobs"
  ON public.import_jobs FOR SELECT TO anon, authenticated USING (true);
