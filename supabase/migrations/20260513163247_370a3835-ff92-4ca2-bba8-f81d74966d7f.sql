
-- Production pipeline tables
CREATE TABLE IF NOT EXISTS public.production_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  tome_id uuid,
  unit_type text NOT NULL,
  unit_id uuid,
  title text,
  status text NOT NULL DEFAULT 'not_started',
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_reason text,
  reopened_at timestamptz,
  reopened_reason text,
  validation_status text NOT NULL DEFAULT 'pending',
  version integer NOT NULL DEFAULT 1,
  parent_unit_id uuid,
  dependency_hash text,
  stale_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_units_tome ON public.production_units(tome_id);
CREATE INDEX IF NOT EXISTS idx_production_units_type ON public.production_units(unit_type);

CREATE TABLE IF NOT EXISTS public.production_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  tome_id uuid,
  source_unit_type text,
  source_unit_id uuid,
  target_unit_type text,
  target_unit_id uuid,
  dependency_type text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  tome_id uuid,
  unit_type text,
  unit_id uuid,
  validation_type text,
  status text NOT NULL DEFAULT 'pending',
  validator text,
  validation_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  tome_id uuid,
  event_type text,
  object_type text,
  object_id uuid,
  event_summary text,
  previous_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_events_tome ON public.production_events(tome_id);

CREATE TABLE IF NOT EXISTS public.chapter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid,
  version integer NOT NULL DEFAULT 1,
  full_text text,
  generation_log text,
  model text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  planned_beat_coverage numeric,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter ON public.chapter_versions(chapter_id);

-- Extend beats
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS tome_id uuid,
  ADD COLUMN IF NOT EXISTS beat_number integer,
  ADD COLUMN IF NOT EXISTS beat_type text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS narrative_function text,
  ADD COLUMN IF NOT EXISTS characters jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS arcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canon_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tension_start integer,
  ADD COLUMN IF NOT EXISTS tension_end integer,
  ADD COLUMN IF NOT EXISTS scientific_density integer,
  ADD COLUMN IF NOT EXISTS emotional_density integer,
  ADD COLUMN IF NOT EXISTS decision_made text,
  ADD COLUMN IF NOT EXISTS consequence text,
  ADD COLUMN IF NOT EXISTS revelation text,
  ADD COLUMN IF NOT EXISTS payoff text,
  ADD COLUMN IF NOT EXISTS required_detail text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_beats_chapter ON public.beats(chapter_id);
CREATE INDEX IF NOT EXISTS idx_beats_type ON public.beats(beat_type);

-- Extend chapters
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS full_text text,
  ADD COLUMN IF NOT EXISTS active_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_status text NOT NULL DEFAULT 'architecture_planned';

-- Extend rewrite_tasks
ALTER TABLE public.rewrite_tasks
  ADD COLUMN IF NOT EXISTS chapter_id uuid,
  ADD COLUMN IF NOT EXISTS beat_id uuid,
  ADD COLUMN IF NOT EXISTS issue_type text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS target_section text,
  ADD COLUMN IF NOT EXISTS instruction text,
  ADD COLUMN IF NOT EXISTS proposed_change text,
  ADD COLUMN IF NOT EXISTS created_by_agent text;

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_production_units_updated ON public.production_units;
CREATE TRIGGER trg_production_units_updated BEFORE UPDATE ON public.production_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
