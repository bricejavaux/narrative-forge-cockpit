// Single source of truth for per-chapter stage statuses used by:
// - Production page (Chapter Production Board)
// - Dashboard (synthetic flow)
// - Any other surface that displays per-chapter progress.
//
// Stages match the IDs rendered by ChapterProductionBoard and the production doctrine.

import type { ProductionStatus } from '@/lib/productionDoctrine';

export type StageMap = Partial<Record<string, ProductionStatus>>;

export type ChapterStatusContext = {
  planned: { total: number; complete: number; validated: number };
  observed: number;
  findings: { total: number; closed: number; critical?: number };
  rewriteTasks: { total: number; done: number; open: number; critical?: number };
  exported?: boolean;
};

export function getChapterProductionStatus(
  chapter: { id: string; full_text?: string | null; locked?: boolean | null; production_status?: string | null } | null | undefined,
  ctx: ChapterStatusContext,
): StageMap {
  const m: StageMap = {};

  // Architecture: green as soon as a chapter row exists.
  m.architecture = chapter ? 'validated' : 'not_started';

  // Planned beats
  if (ctx.planned.total === 0) m.planned_beats = 'not_started';
  else if (ctx.planned.complete === ctx.planned.total) m.planned_beats = 'validated';
  else m.planned_beats = 'draft';

  // Validation
  if (ctx.planned.total === 0) m.beat_validation = 'not_started';
  else if (ctx.planned.validated === ctx.planned.total) m.beat_validation = 'validated';
  else if (ctx.planned.validated > 0) m.beat_validation = 'ready_for_review';
  else m.beat_validation = 'ready_for_review';

  // Generation
  if (chapter?.full_text && chapter.full_text.trim().length > 0) m.chapter_generation = 'validated';
  else if (ctx.planned.total > 0 && ctx.planned.validated === ctx.planned.total) m.chapter_generation = 'ready_for_review';
  else m.chapter_generation = 'not_started';

  // Audit
  if (ctx.findings.total === 0) m.chapter_audit = chapter?.full_text ? 'ready_for_review' : 'not_started';
  else if (ctx.findings.closed === ctx.findings.total) m.chapter_audit = 'validated';
  else m.chapter_audit = 'draft';

  // Targeted rewrite
  if (ctx.rewriteTasks.total === 0) m.targeted_rewrite = 'not_started';
  else if (ctx.rewriteTasks.critical && ctx.rewriteTasks.critical > 0) m.targeted_rewrite = 'rewrite_required';
  else if (ctx.rewriteTasks.done === ctx.rewriteTasks.total) m.targeted_rewrite = 'validated';
  else m.targeted_rewrite = 'draft';

  // Lock
  if (chapter?.locked) m.chapter_lock = 'locked';
  else if (chapter?.full_text) m.chapter_lock = 'ready_for_review';
  else m.chapter_lock = 'not_started';

  // Export
  m.export = ctx.exported ? 'export_ready' : (chapter?.locked ? 'ready_for_review' : 'not_started');

  return m;
}

/** Default fallback so a chapter card is never fully grey if a chapter row exists. */
export function defaultStageMap(chapter?: { id?: string } | null): StageMap {
  return getChapterProductionStatus(chapter ?? null, {
    planned: { total: 0, complete: 0, validated: 0 },
    observed: 0,
    findings: { total: 0, closed: 0 },
    rewriteTasks: { total: 0, done: 0, open: 0 },
  });
}
