import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

export type CapabilityStatus =
  | 'live' | 'degraded' | 'dry_run' | 'mock_fallback'
  | 'design_example' | 'stubbed' | 'pending' | 'future' | 'inactive';

export type Capability = {
  key: string;
  name: string;
  status: CapabilityStatus;
  blocker?: string;
  nextAction?: string;
  relatedRoute?: string;
  blocksTesting: boolean;
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

export function buildCapabilities(r: ConnectionReadiness | null): Capability[] {
  const pgvOk = !!r?.indexes?.pgvector_ready;
  const audioPipelineOk = r?.openai?.transcription_pipeline_status === 'transcription_live';
  const exportsPersist = !!r?.exports?.supabase_export_persistence_available;
  const pdfFuture = r?.exports?.pdf_epub_future ?? true;

  return [
    {
      key: 'pgvector',
      name: 'pgvector ingestion',
      status: pgvOk ? 'live' : 'pending',
      blocker: pgvOk ? undefined : 'pgvector extension non activée — paquets vectoriels prêts.',
      nextAction: pgvOk ? undefined : 'Activer pgvector + lancer vector-ingest-package.',
      relatedRoute: '/indexes',
      blocksTesting: false,
    },
    {
      key: 'embeddings',
      name: 'Embeddings vectoriels',
      status: pgvOk ? 'live' : 'pending',
      blocker: pgvOk ? undefined : 'Embeddings non générés tant que pgvector pending.',
      relatedRoute: '/indexes',
      blocksTesting: false,
    },
    {
      key: 'audio_pipeline',
      name: 'Pipeline audio (Whisper)',
      status: audioPipelineOk ? 'live' : 'pending',
      blocker: audioPipelineOk ? undefined : 'Upload audio + edge function transcription pas câblés bout-en-bout.',
      nextAction: audioPipelineOk ? undefined : 'Brancher audio_notes + storage + openai-transcribe-audio.',
      relatedRoute: '/audio',
      blocksTesting: false,
      notes: 'Notes texte fonctionnent sans Whisper.',
    },
    {
      key: 'run_persistence',
      name: 'Persistance des runs',
      status: 'pending',
      blocker: 'Edge function de run live + écriture dans runs/run_outputs non implémentée.',
      nextAction: 'Implémenter orchestrateur + écritures.',
      relatedRoute: '/runs',
      blocksTesting: true,
    },
    {
      key: 'chapter_full_text',
      name: 'Import chapter full_text',
      status: 'pending',
      blocker: 'Aucun full_text chapitre importé en Supabase.',
      nextAction: 'Importer depuis OneDrive ou coller le texte.',
      relatedRoute: '/architecture',
      blocksTesting: true,
    },
    {
      key: 'autonomous_rewrite',
      name: 'Réécriture autonome',
      status: 'inactive',
      blocker: 'Désactivé intentionnellement — validation humaine requise.',
      blocksTesting: false,
    },
    {
      key: 'pdf_docx_epub',
      name: 'Exports PDF / DOCX / EPUB',
      status: pdfFuture ? 'future' : 'live',
      blocker: pdfFuture ? 'Moteurs PDF/DOCX/EPUB non implémentés (txt/md/json OK).' : undefined,
      relatedRoute: '/exports',
      blocksTesting: false,
    },
    {
      key: 'export_persistence',
      name: 'Persistance des exports',
      status: exportsPersist ? 'live' : 'pending',
      relatedRoute: '/exports',
      blocksTesting: false,
    },
  ];
}

export default function CapabilitiesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => {
    if (open) supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, [open]);

  const caps = buildCapabilities(readiness);
  const blocking = caps.filter(c => c.blocksTesting && c.status !== 'live');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capacités à finaliser</DialogTitle>
          <DialogDescription>
            État réel de chaque capacité. Les capacités marquées « bloque les tests » empêchent
            une utilisation complète de la chaîne de production.
          </DialogDescription>
        </DialogHeader>

        {blocking.length > 0 && (
          <div className="rounded border border-amber/40 bg-amber/10 p-2 text-xs text-amber-700">
            {blocking.length} capacité(s) bloquante(s) pour les tests : {blocking.map(b => b.name).join(', ')}.
          </div>
        )}

        <div className="space-y-2 mt-2">
          {caps.map(c => (
            <div key={c.key} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-display font-semibold text-foreground">{c.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${STATUS_STYLE[c.status]}`}>
                    {c.status}
                  </span>
                  {c.blocksTesting && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-rose-500/10 text-rose-700 border-rose-500/30">
                      bloque les tests
                    </span>
                  )}
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

        <p className="text-[10px] text-muted-foreground mt-2">
          Auth, notifications, profil ne sont pas comptés comme bloquants pour la phase solo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
