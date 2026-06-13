DROP POLICY IF EXISTS "production_test_read_review_sessions" ON public.review_sessions;
CREATE POLICY "production_test_read_review_sessions" ON public.review_sessions FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.review_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_sessions TO authenticated;
GRANT ALL ON public.review_sessions TO service_role;