import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

export type CapabilityStatus =
  | 'live' | 'degraded' | 'dry_run' | 'mock_fallback'
  | 'design_example' | 'stubbed' | 'pending' | 'future' | 'inactive';

export type CapabilityPhase = 'production_test' | 'chapter_production' | 'future';

export type Capability = {
  key: string;
  name: string;
  status: CapabilityStatus;
  phase: CapabilityPhase;
  blocker?: string;
  nextAction?: string;
  relatedRoute?: string;
  notes?: string;
};

const STATUS_STYLE: Record<CapabilityStatus, string> = {
  live: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  degraded: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  dry_run: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  mock_fallback: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  design_example: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  stubbed: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  future: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  inactive: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
};

export function buildCapabilities(r: ConnectionReadiness | null, counts?: { canon: number; characters: number } | null): Capability[] {
  const idx = (r as any)?.indexes ?? {};
  const runs = (r as any)?.runs ?? {};
  const pgvOk = !!idx.pgvector_ready;
  const scienceActive = !!idx.science_index_active;
  const embeddings = Number(idx.science_portals_embeddings_count ?? 0);
  const audioPipelineOk = r?.openai?.transcription_pipeline_status === 'transcription_live';
  const exportsPersist = !!r?.exports?.supabase_export_persistence_available;
  const pdfFuture = r?.exports?.pdf_epub_future ?? true;
  const canonCount = counts?.canon ?? 0;
  const charCount = counts?.characters ?? 0;
  const openaiOk = !!r?.openai?.api_key_configured;
  const runsLive = !!runs.pipeline_live;

  return [
    // -- Production Test blockers (only) --
    {
      key: 'import_canon',
      name: 'Import articulation.txt → canon_objects',
      status: canonCount > 0 ? 'live' : 'pending',
      phase: 'production_test',
      blocker: canonCount > 0 ? undefined : 'Aucun canon_object Supabase. Import à tester.',
      nextAction: canonCount > 0 ? undefined : 'Lancer preview puis persister depuis le Dashboard.',
      relatedRoute: '/',
    },
    {
      key: 'import_characters',
      name: 'Import personnages.txt → characters',
      status: charCount > 0 ? 'live' : 'pending',
      phase: 'production_test',
      blocker: charCount > 0 ? undefined : 'Aucun personnage Supabase. Import à tester.',
      nextAction: charCount > 0 ? undefined : 'Lancer preview puis persister depuis le Dashboard.',
      relatedRoute: '/',
    },
    {
      key: 'note_structuring',
      name: 'Structuration de note texte (OpenAI)',
      status: openaiOk ? 'pending' : 'pending',
      phase: 'production_test',
      blocker: openaiOk ? 'À tester via NoteComposer.' : 'OPENAI_API_KEY non confirmée.',
      relatedRoute: '/canon',
    },
    {
      key: 'exports_txt',
      name: 'Export txt/md/json',
      status: 'pending',
      phase: 'production_test',
      blocker: 'À tester via /exports.',
      relatedRoute: '/exports',
    },
    {
      key: 'vector_sync',
      name: 'Sync paquets vectoriels (metadata)',
      status: 'pending',
      phase: 'production_test',
      blocker: 'Vérifier cohérence Assets ↔ Indexes.',
      relatedRoute: '/indexes',
    },
    // -- Chapter Production blockers --
    {
      key: 'run_persistence',
      name: 'Persistance des runs',
      status: runsLive ? 'live' : 'pending',
      phase: 'chapter_production',
      blocker: runsLive ? undefined : 'runs/run_outputs non lisibles ou run-execute injoignable.',
      relatedRoute: '/runs',
    },
    {
      key: 'chapter_full_text',
      name: 'Import chapter full_text',
      status: 'pending',
      phase: 'chapter_production',
      blocker: 'Aucun full_text chapitre importé.',
      relatedRoute: '/architecture',
    },
    {
      key: 'pgvector',
      name: 'pgvector ingestion (science_portals)',
      status: scienceActive && embeddings > 0 ? 'live' : pgvOk ? 'degraded' : 'pending',
      phase: 'chapter_production',
      blocker: scienceActive && embeddings > 0 ? undefined : `science_index ${scienceActive ? 'actif' : 'inactif'} · embeddings=${embeddings}`,
      relatedRoute: '/indexes',
    },
    // -- Future / intentional --
    {
      key: 'audio_pipeline',
      name: 'Pipeline audio (Whisper)',
      status: audioPipelineOk ? 'live' : 'future',
      phase: audioPipelineOk ? 'production_test' : 'future',
      relatedRoute: '/audio',
    },
    {
      key: 'autonomous_rewrite',
      name: 'Réécriture autonome',
      status: 'inactive',
      phase: 'future',
      blocker: 'Désactivé intentionnellement — validation humaine.',
    },
    {
      key: 'pdf_docx_epub',
      name: 'Exports PDF / DOCX / EPUB',
      status: pdfFuture ? 'future' : 'live',
      phase: 'future',
      relatedRoute: '/exports',
    },
    {
      key: 'export_persistence',
      name: 'Persistance des exports',
      status: exportsPersist ? 'live' : 'future',
      phase: 'future',
      relatedRoute: '/exports',
    },
  ];
}

const PHASE_TITLE: Record<CapabilityPhase, string> = {
  production_test: 'Bloque Production Test',
  chapter_production: 'Bloque production chapitre',
  future: 'Futur / intentionnellement désactivé',
};

const PHASE_STYLE: Record<CapabilityPhase, string> = {
  production_test: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
  chapter_production: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  future: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
};

export default function CapabilitiesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [counts, setCounts] = useState<{ canon: number; characters: number } | null>(null);
  useEffect(() => {
    if (open) {
      supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
      supabaseService.getProductionCounts()
        .then(c => setCounts({ canon: c.canon_count, characters: c.characters_count }))
        .catch(() => setCounts(null));
    }
  }, [open]);

  const caps = buildCapabilities(readiness, counts);
  const ptBlocking = caps.filter(c => c.phase === 'production_test' && c.status !== 'live');
  const chBlocking = caps.filter(c => c.phase === 'chapter_production' && c.status !== 'live');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capacités à finaliser</DialogTitle>
          <DialogDescription>
            Séparées par phase : ce qui bloque les tests réels, ce qui bloque seulement la production
            chapitre, et ce qui est intentionnellement futur.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-[11px] font-mono mt-1">
          <span className={`px-2 py-0.5 rounded-full border ${ptBlocking.length === 0 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : PHASE_STYLE.production_test}`}>
            {ptBlocking.length} blocage(s) Production Test
          </span>
          <span className={`px-2 py-0.5 rounded-full border ${PHASE_STYLE.chapter_production}`}>
            {chBlocking.length} blocage(s) Chapitre
          </span>
        </div>

        {(['production_test', 'chapter_production', 'future'] as const).map((phase) => {
          const items = caps.filter(c => c.phase === phase);
          if (!items.length) return null;
          return (
            <div key={phase} className="space-y-2 mt-3">
              <p className="editorial-eyebrow">{PHASE_TITLE[phase]}</p>
              {items.map(c => (
                <div key={c.key} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-display font-semibold text-foreground">{c.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.relatedRoute && (
                      <Link
                        to={c.relatedRoute}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Ouvrir <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                  {c.blocker && <p className="text-xs text-muted-foreground">Blocage : <span className="text-foreground/80">{c.blocker}</span></p>}
                  {c.nextAction && <p className="text-xs text-muted-foreground">Prochaine action : <span className="text-foreground/80">{c.nextAction}</span></p>}
                  {c.notes && <p className="text-[11px] text-muted-foreground italic">{c.notes}</p>}
                </div>
              ))}
            </div>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}
