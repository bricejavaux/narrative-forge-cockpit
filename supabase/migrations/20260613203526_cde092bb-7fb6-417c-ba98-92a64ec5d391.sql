-- Production Test read access for traces.
-- Idempotent: drop then create. SELECT only for anon; authenticated keeps existing ALL policy.

DROP POLICY IF EXISTS "production_test_read_runs" ON public.runs;
CREATE POLICY "production_test_read_runs" ON public.runs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_run_outputs" ON public.run_outputs;
CREATE POLICY "production_test_read_run_outputs" ON public.run_outputs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_audit_findings" ON public.audit_findings;
CREATE POLICY "production_test_read_audit_findings" ON public.audit_findings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_rewrite_tasks" ON public.rewrite_tasks;
CREATE POLICY "production_test_read_rewrite_tasks" ON public.rewrite_tasks FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_production_events" ON public.production_events;
CREATE POLICY "production_test_read_production_events" ON public.production_events FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_production_units" ON public.production_units;
CREATE POLICY "production_test_read_production_units" ON public.production_units FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_production_validations" ON public.production_validations;
CREATE POLICY "production_test_read_production_validations" ON public.production_validations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "production_test_read_retrieval_logs" ON public.retrieval_logs;
CREATE POLICY "production_test_read_retrieval_logs" ON public.retrieval_logs FOR SELECT TO anon, authenticated USING (true);

-- Ensure anon role has the GRANT (authenticated already does via existing ALL policy GRANTs)
GRANT SELECT ON public.runs, public.run_outputs, public.audit_findings, public.rewrite_tasks,
                public.production_events, public.production_units, public.production_validations,
                public.retrieval_logs TO anon;