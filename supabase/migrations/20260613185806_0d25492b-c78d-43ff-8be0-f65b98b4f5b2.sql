-- Allow anonymous read on the agent registry/configuration tables so the Agent Studio panel
-- can display its catalogue in the single-operator workspace (no public sign-up).
GRANT SELECT ON public.agents TO anon;
GRANT SELECT ON public.agent_versions TO anon;
GRANT SELECT ON public.agent_index_bindings TO anon;
GRANT SELECT ON public.app_settings TO anon;

CREATE POLICY "Anon can read agent registry" ON public.agents
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read agent versions" ON public.agent_versions
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read agent bindings" ON public.agent_index_bindings
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read app settings" ON public.app_settings
  FOR SELECT TO anon USING (true);