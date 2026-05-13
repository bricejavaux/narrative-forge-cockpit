// Central enforcement helpers for the production pipeline.
// Pipeline: Canon → Architecture → Plan → Planned beats → Validation →
//           Generation → Observed beats → Audit → Targeted rewrite →
//           Lock → Meta-tome audit → Export.

export type ProductionStatus =
  | 'not_started'
  | 'draft'
  | 'ready_for_review'
  | 'validated'
  | 'locked'
  | 'reopened'
  | 'stale_due_to_canon_change'
  | 'stale_due_to_character_change'
  | 'audit_required'
  | 'rewrite_required'
  | 'export_ready';

export const STATUS_LABEL_FR: Record<ProductionStatus, string> = {
  not_started: 'Non démarré',
  draft: 'Brouillon',
  ready_for_review: 'À relire',
  validated: 'Validé',
  locked: 'Verrouillé',
  reopened: 'Réouvert',
  stale_due_to_canon_change: 'Obsolète — canon modifié',
  stale_due_to_character_change: 'Obsolète — personnage modifié',
  audit_required: 'Audit requis',
  rewrite_required: 'Réécriture requise',
  export_ready: 'Prêt export',
};

export type StageId =
  | 'canon'
  | 'architecture'
  | 'chapter_plan'
  | 'planned_beats'
  | 'beat_validation'
  | 'chapter_generation'
  | 'observed_beats'
  | 'chapter_audit'
  | 'targeted_rewrite'
  | 'chapter_lock'
  | 'meta_audit'
  | 'export';

export const STAGE_ORDER: { id: StageId; label: string }[] = [
  { id: 'canon', label: 'Canon actif' },
  { id: 'architecture', label: 'Architecture Tome' },
  { id: 'chapter_plan', label: 'Plan Chapitre' },
  { id: 'planned_beats', label: 'Beats prévus' },
  { id: 'beat_validation', label: 'Validation beats' },
  { id: 'chapter_generation', label: 'Génération Chapitre' },
  { id: 'observed_beats', label: 'Beats observés' },
  { id: 'chapter_audit', label: 'Audit chapitre' },
  { id: 'targeted_rewrite', label: 'Réécriture ciblée' },
  { id: 'chapter_lock', label: 'Verrouillage chapitre' },
  { id: 'meta_audit', label: 'Audit méta-tome' },
  { id: 'export', label: 'Export' },
];

export function statusColor(status: ProductionStatus): 'green' | 'amber' | 'red' | 'blue' | 'grey' {
  switch (status) {
    case 'validated':
    case 'locked':
    case 'export_ready':
      return 'green';
    case 'draft':
    case 'ready_for_review':
    case 'reopened':
      return 'amber';
    case 'stale_due_to_canon_change':
    case 'stale_due_to_character_change':
    case 'audit_required':
    case 'rewrite_required':
      return 'red';
    case 'not_started':
      return 'grey';
    default:
      return 'blue';
  }
}

export type GateContext = {
  hasArchitecture: boolean;
  hasPlannedBeats: boolean;
  beatsValidated: boolean;
  canonStale: boolean;
  charactersAvailable: boolean;
};

export function canGenerateChapter(ctx: GateContext): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!ctx.hasArchitecture) reasons.push("L'architecture du chapitre est manquante.");
  if (!ctx.hasPlannedBeats) reasons.push('Aucun beat prévu pour ce chapitre.');
  if (!ctx.beatsValidated) reasons.push('Les beats prévus doivent être validés.');
  if (ctx.canonStale) reasons.push('Le canon associé est obsolète.');
  if (!ctx.charactersAvailable) reasons.push('Les personnages requis ne sont pas disponibles.');
  return { ok: reasons.length === 0, reasons };
}

export function canExport(chapters: { locked: boolean }[]): { ok: boolean; reason?: string } {
  if (chapters.length === 0) return { ok: false, reason: 'Aucun chapitre à exporter.' };
  const unlocked = chapters.filter((c) => !c.locked).length;
  if (unlocked > 0) return { ok: false, reason: `${unlocked} chapitre(s) non verrouillé(s).` };
  return { ok: true };
}

export function nextRecommendedAction(s: ProductionStatus): string {
  switch (s) {
    case 'not_started': return 'Démarrer';
    case 'draft': return 'Compléter et passer en relecture';
    case 'ready_for_review': return 'Valider';
    case 'validated': return 'Verrouiller ou enchaîner';
    case 'locked': return 'Étape suivante';
    case 'reopened': return 'Réviser';
    case 'stale_due_to_canon_change': return 'Lancer impact canon';
    case 'stale_due_to_character_change': return 'Vérifier arc personnage';
    case 'audit_required': return 'Lancer audit';
    case 'rewrite_required': return 'Créer tâches de réécriture ciblée';
    case 'export_ready': return 'Générer export';
  }
}
