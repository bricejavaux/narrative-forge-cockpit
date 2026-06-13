CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.match_vector_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 8,
  index_names text[] DEFAULT NULL,
  similarity_threshold float DEFAULT 0.0
)
RETURNS TABLE (
  id uuid,
  index_name text,
  corpus_name text,
  chunk_id text,
  source_file text,
  chunk_number int,
  text text,
  text_excerpt text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.index_name,
    c.corpus_name,
    c.chunk_id,
    c.source_file,
    c.chunk_number,
    c.text,
    c.text_excerpt,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.vector_chunks c
  WHERE c.embedding IS NOT NULL
    AND c.embedding_status = 'done'
    AND (index_names IS NULL OR c.index_name = ANY(index_names))
    AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_vector_chunks(vector, int, text[], float) TO authenticated, anon, service_role;