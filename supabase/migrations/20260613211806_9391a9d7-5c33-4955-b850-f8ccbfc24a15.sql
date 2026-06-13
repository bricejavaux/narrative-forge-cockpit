-- Batch 1: pgvector hardening (idempotent)

CREATE EXTENSION IF NOT EXISTS vector;

-- Add missing columns
ALTER TABLE public.vector_chunks
  ADD COLUMN IF NOT EXISTS chunk_hash text,
  ADD COLUMN IF NOT EXISTS source_package_id uuid,
  ADD COLUMN IF NOT EXISTS source_title text;

-- FK to vector_source_packages (best effort, skip if invalid)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vector_chunks_source_package_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.vector_chunks
        ADD CONSTRAINT vector_chunks_source_package_id_fkey
        FOREIGN KEY (source_package_id) REFERENCES public.vector_source_packages(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- Unique (corpus_name, source_file, chunk_hash) — partial to allow nulls during transition
CREATE UNIQUE INDEX IF NOT EXISTS vector_chunks_corpus_source_hash_uidx
  ON public.vector_chunks (corpus_name, source_file, chunk_hash)
  WHERE chunk_hash IS NOT NULL;

-- Btree on source_package_id
CREATE INDEX IF NOT EXISTS vector_chunks_source_package_idx
  ON public.vector_chunks (source_package_id);

-- HNSW vector index (cosine). Try hnsw, fall back to ivfflat.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='vector_chunks_embedding_idx'
  ) THEN
    BEGIN
      EXECUTE 'CREATE INDEX vector_chunks_embedding_idx ON public.vector_chunks USING hnsw (embedding vector_cosine_ops)';
    EXCEPTION WHEN others THEN
      BEGIN
        EXECUTE 'CREATE INDEX vector_chunks_embedding_idx ON public.vector_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists=100)';
      EXCEPTION WHEN others THEN NULL;
      END;
    END;
  END IF;
END $$;

-- Replace RPC with new signature including corpus + min_similarity
DROP FUNCTION IF EXISTS public.match_vector_chunks(vector, integer, text[], double precision);
DROP FUNCTION IF EXISTS public.match_vector_chunks(vector, text, text, integer, double precision);

CREATE OR REPLACE FUNCTION public.match_vector_chunks(
  query_embedding vector,
  match_index_name text DEFAULT NULL,
  match_corpus text DEFAULT NULL,
  match_count integer DEFAULT 8,
  min_similarity double precision DEFAULT 0.20
)
RETURNS TABLE (
  id uuid,
  corpus text,
  index_name text,
  source_title text,
  source_path text,
  chunk_ordinal integer,
  chunk_text text,
  similarity double precision,
  metadata jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.corpus_name AS corpus,
    c.index_name,
    COALESCE(c.source_title, c.source_file) AS source_title,
    c.source_file AS source_path,
    c.chunk_number AS chunk_ordinal,
    c.text AS chunk_text,
    (1 - (c.embedding <=> query_embedding))::double precision AS similarity,
    c.metadata
  FROM public.vector_chunks c
  WHERE c.embedding IS NOT NULL
    AND c.embedding_status = 'done'
    AND (match_index_name IS NULL OR c.index_name = match_index_name)
    AND (match_corpus IS NULL OR c.corpus_name = match_corpus)
    AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_vector_chunks(vector, text, text, integer, double precision) TO authenticated, anon, service_role;
