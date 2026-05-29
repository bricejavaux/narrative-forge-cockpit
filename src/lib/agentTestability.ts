import type { AgentRow, AgentBindingRow } from '@/services/agentsService';

export type Testability = 'testable_now' | 'requires_chapters' | 'requires_pgvector' | 'requires_canon';

export function classifyAgentTestability(
  agent: AgentRow,
  ctx: { hasChapters: boolean; hasCanon: boolean; pgvectorActive: boolean; bindings?: AgentBindingRow[] }
): { status: Testability; reason: string } {
  const requiredBindings = (ctx.bindings ?? []).filter((b) => b.required);
  if (requiredBindings.length > 0 && !ctx.pgvectorActive) {
    return { status: 'requires_pgvector', reason: `${requiredBindings.length} index requis (pgvector inactif)` };
  }
  const cat = (agent.category ?? '').toLowerCase();
  if (cat === 'génération' || cat === 'generation' || cat === 'réécriture' || cat === 'reecriture') {
    if (!ctx.hasChapters) return { status: 'requires_chapters', reason: 'Plan chapitres requis (articulation.txt)' };
  }
  if (cat === 'audit' || cat === 'diagnostic') {
    if (!ctx.hasCanon) return { status: 'requires_canon', reason: 'Canon vide — importer articulation.txt' };
  }
  return { status: 'testable_now', reason: 'OpenAI seul suffit pour un test stub/live' };
}

export const TESTABILITY_LABEL: Record<Testability, { label: string; classes: string }> = {
  testable_now: { label: 'testable now', classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  requires_canon: { label: 'requires canon', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_chapters: { label: 'requires chapters', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  requires_pgvector: { label: 'requires pgvector', classes: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
};
