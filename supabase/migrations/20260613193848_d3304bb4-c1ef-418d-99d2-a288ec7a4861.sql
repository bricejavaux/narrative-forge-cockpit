UPDATE public.agents
SET external_id = 'agent_' || external_id
WHERE external_id IS NOT NULL
  AND external_id NOT LIKE 'agent\_%' ESCAPE '\';