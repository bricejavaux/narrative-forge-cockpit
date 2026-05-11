
-- pgvector extension
create extension if not exists vector;

-- AGENTS: extend
alter table public.agents
  add column if not exists description text,
  add column if not exists default_model text,
  add column if not exists selected_model text,
  add column if not exists quality_profile text,
  add column if not exists persistence_status text default 'suggestions_only',
  add column if not exists vector_context_status text default 'pending_pgvector',
  add column if not exists is_active boolean not null default true;

-- AGENT VERSIONS
create table if not exists public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  version_number int not null,
  objective text,
  system_prompt text,
  operating_script jsonb not null default '[]'::jsonb,
  inputs_schema jsonb not null default '{}'::jsonb,
  outputs_schema jsonb not null default '{}'::jsonb,
  model_recommendations jsonb not null default '{}'::jsonb,
  index_bindings jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  permission_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  change_reason text,
  is_current boolean not null default false
);
create index if not exists agent_versions_agent_idx on public.agent_versions(agent_id, version_number desc);
create unique index if not exists agent_versions_current_uq on public.agent_versions(agent_id) where is_current;

-- AGENT INDEX BINDINGS
create table if not exists public.agent_index_bindings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  index_name text not null,
  corpus_name text,
  required boolean not null default false,
  top_k int not null default 8,
  similarity_threshold numeric not null default 0.72,
  status text not null default 'pending_pgvector',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, index_name)
);
create trigger agent_index_bindings_set_updated_at
  before update on public.agent_index_bindings
  for each row execute function public.set_updated_at();

-- VECTOR INDEXES
create table if not exists public.vector_indexes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  status text not null default 'pending',
  embedding_model text,
  dimensions int,
  source_package_count int not null default 0,
  chunk_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger vector_indexes_set_updated_at
  before update on public.vector_indexes
  for each row execute function public.set_updated_at();

-- VECTOR DOCUMENTS
create table if not exists public.vector_documents (
  id uuid primary key default gen_random_uuid(),
  corpus_name text,
  source_file text,
  source_path text,
  source_type text,
  rights text,
  usage text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists vector_documents_corpus_idx on public.vector_documents(corpus_name);

-- VECTOR CHUNKS
create table if not exists public.vector_chunks (
  id uuid primary key default gen_random_uuid(),
  index_name text,
  corpus_name text,
  chunk_id text unique,
  document_id uuid references public.vector_documents(id) on delete cascade,
  source_file text,
  source_id text,
  chunk_number int,
  target_index text,
  usage text,
  rights text,
  text text,
  text_excerpt text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  embedding_model text,
  embedding_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vector_chunks_index_idx on public.vector_chunks(index_name);
create index if not exists vector_chunks_corpus_idx on public.vector_chunks(corpus_name);
create trigger vector_chunks_set_updated_at
  before update on public.vector_chunks
  for each row execute function public.set_updated_at();

-- RETRIEVAL LOGS
create table if not exists public.retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid,
  run_id uuid,
  query text,
  index_names text[],
  top_k int,
  similarity_threshold numeric,
  result_count int,
  model text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- IMPACT ANALYSIS
create table if not exists public.impact_analysis (
  id uuid primary key default gen_random_uuid(),
  source_object_type text not null,
  source_object_id uuid,
  source_change_summary text,
  impact_type text,
  severity text,
  affected_object_type text,
  affected_object_id uuid,
  proposed_action text,
  proposed_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists impact_analysis_source_idx on public.impact_analysis(source_object_type, source_object_id);
create index if not exists impact_analysis_status_idx on public.impact_analysis(status);

-- Seed canonical future indexes (idempotent)
insert into public.vector_indexes (name, description, status, embedding_model, dimensions)
values
  ('science_index', 'Science portals: factual references for verification', 'pending', 'text-embedding-3-small', 1536),
  ('world_index', 'Canon (lore, rules, exceptions)', 'pending', 'text-embedding-3-small', 1536),
  ('character_index', 'Character cards and arcs', 'pending', 'text-embedding-3-small', 1536),
  ('arc_index', 'Global arcs, payoffs, revelations', 'pending', 'text-embedding-3-small', 1536),
  ('draft_index', 'Chapter drafts (full_text)', 'pending', 'text-embedding-3-small', 1536),
  ('review_index', 'Findings, recommendations, scores', 'pending', 'text-embedding-3-small', 1536),
  ('audio_memory_index', 'Structured audio notes', 'pending', 'text-embedding-3-small', 1536),
  ('style_index', 'Private style reference (follett) — caution', 'pending', 'text-embedding-3-small', 1536),
  ('fiction_reference_index', 'Private SF references — caution', 'pending', 'text-embedding-3-small', 1536)
on conflict (name) do nothing;
