UPDATE public.agent_index_bindings b
SET status = 'active', updated_at = now()
FROM public.vector_indexes i
WHERE b.index_name = i.name
  AND i.status = 'active'
  AND b.status <> 'active';