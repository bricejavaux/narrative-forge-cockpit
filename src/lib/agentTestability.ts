import type { AgentRow, AgentBindingRow } from '@/services/agentsService';

export type Testability =
  | 'testable_now'
  | 'requires_canon'
  | 'requires_characters'
  | 'requires_chapters'
  | 'requires_planned_beats'
  | 'requires_validated_beats'
  | 'requires_full_text'
  | 'requires_pgvector'
  | 'requires_openai'
  | 'future_disabled'
  | 'error';

export type TestabilityResult = {
  status: Testability;
  label: string;
  reason: string;
  blockers: string[];
  next_action: string | null;
  can_run_now: boolean;
  can_run_in_production: boolean;
};

export type TestabilityCtx = {
  hasChapters: boolean;
  hasCanon: boolean;
  hasCharacters: boolean;
  hasPlannedBeats: boolean;
  hasValidatedBeats: boolean;
  hasFullText: boolean;
  pgvectorActive: boolean;
  openaiReady: boolean;
  bindings?: AgentBindingRow[];
};

const FUTURE_EXTERNAL_IDS = new Set([
  'generate_chapter_draft',
  'extract_observed_beats',
  'audit_chapter_vs_beats',
  'targeted_rewrite',
  'style_polish',
  'meta_tome_audit',
  'export_preparation',
]);

export function classifyAgentTestability(agent: AgentRow, ctx: Partial<TestabilityCtx>): TestabilityResult {
  const c: TestabilityCtx = {
    hasChapters: false, hasCanon: false, hasCharacters: false,
    hasPlannedBeats: false, hasValidatedBeats: false, hasFullText: false,
    pgvectorActive: false, openaiReady: true, bindings: [],
    ...ctx,
  };
  const ext = (agent.external_id ?? '').toLowerCase();
  const cat = (agent.category ?? '').toLowerCase();
  const blockers: string[] = [];

  if (!agent.is_active || agent.status === 'future' || FUTURE_EXTERNAL_IDS.has(ext)) {
    return mk('future_disabled', 'future / disabled', 'Agent désactivé pour cette itération.',
      ['feature_disabled'], 'Activer dans une itération future.', false, false);
  }
  if (!c.openaiReady) blockers.push('openai_key_missing');

  // requirement matrix
  const req = (() => {
    if (ext.includes('generate_planned_beats')) return { canon: true, characters: true, chapters: true };
    if (ext.includes('audit_planned_beats') || ext.includes('validate_beat_quality')) return { plannedBeats: true };
    if (ext.includes('extract_canon')) return {};
    if (ext.includes('extract_characters')) return {};
    if (ext.includes('chapter_plan_from_articulation')) return {};
    if (ext.includes('audit_chapter_plan') || ext.includes('audit_arc_distribution') || ext.includes('audit_macro_micro')) return { chapters: true };
    if (ext.includes('audit_canon_consistency')) return { canon: true };
    if (ext.includes('audit_character_consistency')) return { characters: true };
    if (ext.includes('audit_revelation_distribution')) return { chapters: true };
    if (ext.includes('audit_scientific_density')) return { chapters: true, pgvectorRecommended: true };
    if (ext.includes('diagnostic_chapter')) return { chapters: true };
    if (ext.includes('diagnostic_beats')) return { plannedBeats: true };
    if (ext.includes('diagnostic_tome') || ext.includes('audit_tome')) return { canon: true, chapters: true };
    if (cat === 'rewrite' || cat === 'réécriture') return { chapters: true };
    return {};
  })() as { canon?: boolean; characters?: boolean; chapters?: boolean; plannedBeats?: boolean; validatedBeats?: boolean; fullText?: boolean; pgvectorRecommended?: boolean };

  if (req.canon && !c.hasCanon) blockers.push('canon_empty');
  if (req.characters && !c.hasCharacters) blockers.push('characters_empty');
  if (req.chapters && !c.hasChapters) blockers.push('chapters_missing');
  if (req.plannedBeats && !c.hasPlannedBeats) blockers.push('planned_beats_missing');
  if (req.validatedBeats && !c.hasValidatedBeats) blockers.push('validated_beats_missing');
  if (req.fullText && !c.hasFullText) blockers.push('full_text_missing');

  const requiredBindings = (c.bindings ?? []).filter((b) => b.required);
  if (requiredBindings.length > 0 && !c.pgvectorActive) blockers.push('pgvector_required');

  if (blockers.length === 0) {
    return mk('testable_now', 'testable now', 'OpenAI suffit pour un test live.', [], 'Lancer un test maintenant.', true, true);
  }
  // map first blocker to a status
  const first = blockers[0];
  const map: Record<string, Testability> = {
    openai_key_missing: 'requires_openai',
    canon_empty: 'requires_canon',
    characters_empty: 'requires_characters',
    chapters_missing: 'requires_chapters',
    planned_beats_missing: 'requires_planned_beats',
    validated_beats_missing: 'requires_validated_beats',
    full_text_missing: 'requires_full_text',
    pgvector_required: 'requires_pgvector',
  };
  const status = map[first] ?? 'error';
  return mk(status, TESTABILITY_LABEL[status]?.label ?? status, `Bloqué : ${blockers.join(', ')}`, blockers, nextAction(first), false, true);

  function mk(status: Testability, label: string, reason: string, blockers: string[], next: string | null, can_now: boolean, can_prod: boolean): TestabilityResult {
    return { status, label, reason, blockers, next_action: next, can_run_now: can_now, can_run_in_production: can_prod };
  }
}

function nextAction(blocker: string): string {
  switch (blocker) {
    case 'openai_key_missing': return 'Configurer OPENAI_API_KEY dans les secrets.';
    case 'canon_empty': return 'Importer le canon (Architecture → Canon).';
    case 'characters_empty': return 'Importer les personnages.';
    case 'chapters_missing': return 'Importer le plan chapitres depuis articulation.txt.';
    case 'planned_beats_missing': return 'Générer/enregistrer des beats prévus en Production.';
    case 'validated_beats_missing': return 'Valider les beats prévus en Production.';
    case 'full_text_missing': return 'Générer le texte du chapitre (étape future).';
    case 'pgvector_required': return 'Activer pgvector (roadmap).';
    default: return 'Voir détails.';
  }
}

export const TESTABILITY_LABEL: Record<Testability, { label: string; classes: string }> = {
  testable_now: { label: 'testable now', classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  requires_openai: { label: 'requires OpenAI', classes: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
  requires_canon: { label: 'requires canon', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_characters: { label: 'requires characters', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_chapters: { label: 'requires chapters', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_planned_beats: { label: 'requires planned beats', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_validated_beats: { label: 'requires validated beats', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_full_text: { label: 'requires full_text', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_pgvector: { label: 'requires pgvector', classes: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  future_disabled: { label: 'future / disabled', classes: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  error: { label: 'error', classes: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
};
