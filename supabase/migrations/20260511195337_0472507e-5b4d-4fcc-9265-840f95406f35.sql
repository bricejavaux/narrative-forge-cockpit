-- Vector source packages: a corpus prepared in OneDrive 06_vector_sources
CREATE TABLE IF NOT EXISTS public.vector_source_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  corpus_name TEXT NOT NULL,
  onedrive_path TEXT,
  manifest_path TEXT,
  chunks_path TEXT,
  inventory_path TEXT,
  target_index TEXT,
  produced_chunk_count INTEGER,
  source_file_count INTEGER,
  chunk_strategy TEXT,
  rights TEXT,
  usage TEXT,
  embeddings_created BOOLEAN NOT NULL DEFAULT false,
  ingestion_status TEXT NOT NULL DEFAULT 'pending',
  last_generated TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (corpus_name)
);

CREATE TRIGGER trg_vector_source_packages_updated_at
BEFORE UPDATE ON public.vector_source_packages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vector source chunks: metadata + excerpts only, no embeddings yet
CREATE TABLE IF NOT EXISTS public.vector_source_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES public.vector_source_packages(id) ON DELETE CASCADE,
  chunk_id TEXT,
  corpus TEXT,
  source_file TEXT,
  source_id TEXT,
  chunk_number INTEGER,
  target_index TEXT,
  usage TEXT,
  rights TEXT,
  text_excerpt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingestion_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vsc_package ON public.vector_source_chunks(package_id);
CREATE INDEX IF NOT EXISTS idx_vsc_corpus ON public.vector_source_chunks(corpus);

-- Per-item rows for an import_job (one row per extracted object)
CREATE TABLE IF NOT EXISTS public.import_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  proposed_action TEXT NOT NULL DEFAULT 'create',
  target_table TEXT,
  target_record_id UUID,
  extracted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  validation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_import_job_items_updated_at
BEFORE UPDATE ON public.import_job_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_iji_job ON public.import_job_items(import_job_id);

-- Extend import_jobs with import-pipeline metadata (idempotent)
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS source_file_id UUID;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS import_type TEXT;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS extraction_provider TEXT;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS result_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Extend source_files
ALTER TABLE public.source_files ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE public.source_files ADD COLUMN IF NOT EXISTS hash TEXT;
ALTER TABLE public.source_files ADD COLUMN IF NOT EXISTS repository TEXT;

-- Seed the three known corpora (idempotent)
INSERT INTO public.vector_source_packages
  (corpus_name, onedrive_path, manifest_path, chunks_path, inventory_path, target_index, usage, rights, ingestion_status)
VALUES
  ('follett',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/follett',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/follett/05_manifest/manifest.json',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/follett/04_chunks/chunks.jsonl',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/follett/05_manifest/source_inventory.csv',
   'style_index',
   'private reference only — no direct imitation',
   'private',
   'pending'),
  ('sf_portals_fiction',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/sf_portals_fiction',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/sf_portals_fiction/05_manifest/manifest.json',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/sf_portals_fiction/04_chunks/chunks.jsonl',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/sf_portals_fiction/05_manifest/source_inventory.csv',
   'fiction_reference_index',
   'private reference only — no direct reuse',
   'private',
   'pending'),
  ('science_portals',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/science_portals',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/science_portals/04_manifest/manifest.json',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/science_portals/03_chunks/chunks.jsonl',
   'Documents/Projet Roman/Les_Arches/06_vector_sources/science_portals/04_manifest/source_inventory.csv',
   'science_index',
   'preferred first candidate for pgvector ingestion',
   'reference',
   'pending')
ON CONFLICT (corpus_name) DO NOTHING;