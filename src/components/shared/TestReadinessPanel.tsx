import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

type CheckState = 'ok' | 'pending' | 'blocked' | 'unknown' | 'manual';

type ReadinessCheck = {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
  phase: 'production_test' | 'chapter_production' | 'future';
};

export default function TestReadinessPanel() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [counts, setCounts] = useState<{ canon: number; chars: number; chapters: number; beats: number; packages: number } | null>(null);

  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    (async () => {
      const [c1, c2, c3, c4, c5] = await Promise.all([
        supabase.from('canon_objects').select('id', { count: 'exact', head: true }),
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('beats').select('id', { count: 'exact', head: true }),
        supabase.from('vector_source_packages').select('id', { count: 'exact', head: true }),
      ]);
      setCounts({
        canon: c1.count ?? 0, chars: c2.count ?? 0,
        chapters: c3.count ?? 0, beats: c4.count ?? 0,
        packages: c5.count ?? 0,
      });
    })();
  }, []);

  const openai = !!readiness?.openai?.api_key_configured;
  const onedrive = !!readiness?.onedrive?.oauth_configured;
  const supaOk = !!readiness?.supabase?.tables_created;
  const storageOk = !!readiness?.supabase?.storage_buckets_created;
  const filesOk = !!readiness?.onedrive?.expected_files_found;
  const fullText = (counts?.chapters ?? 0) > 0;
  const beatsOk = (counts?.beats ?? 0) > 0;

  const checks: ReadinessCheck[] = [
    // Production Test phase
    { id: 'env', label: '.env retiré du dépôt GitHub', state: 'manual', detail: 'Lovable ne peut pas le faire — exécutez git rm --cached .env localement.', phase: 'production_test' },
    { id: 'openai', label: 'OpenAI runtime live', state: openai ? 'ok' : 'blocked', phase: 'production_test' },
    { id: 'onedrive', label: 'OneDrive listing live', state: onedrive ? 'ok' : 'blocked', phase: 'production_test' },
    { id: 'supabase_db', label: 'Supabase DB active', state: supaOk ? 'ok' : 'blocked', phase: 'production_test' },
    { id: 'supabase_storage', label: 'Supabase Storage actif', state: storageOk ? 'ok' : 'pending', phase: 'production_test' },
    { id: 'articulation_file', label: 'articulation.txt trouvé', state: filesOk ? 'ok' : 'pending', phase: 'production_test' },
    { id: 'personnages_file', label: 'personnages.txt trouvé', state: filesOk ? 'ok' : 'pending', phase: 'production_test' },
    { id: 'canon_supa', label: 'Canon lit Supabase', state: counts === null ? 'unknown' : counts.canon > 0 ? 'ok' : 'pending', detail: counts && counts.canon === 0 ? 'fallback mock — lancez import articulation.txt' : undefined, phase: 'production_test' },
    { id: 'chars_supa', label: 'Personnages lit Supabase', state: counts === null ? 'unknown' : counts.chars > 0 ? 'ok' : 'pending', detail: counts && counts.chars === 0 ? 'fallback mock — lancez import personnages.txt' : undefined, phase: 'production_test' },
    { id: 'structure_note', label: 'Structuration note texte (OpenAI)', state: openai ? 'ok' : 'pending', phase: 'production_test' },
    { id: 'export_text', label: 'Export txt / md / json', state: 'ok', phase: 'production_test' },
    { id: 'vector_pkg_sync', label: 'Vector packages synchronisés (metadata)', state: counts === null ? 'unknown' : counts.packages >= 3 ? 'ok' : 'pending', detail: counts && counts.packages < 3 ? 'cliquer Sync depuis OneDrive' : undefined, phase: 'production_test' },

    // Chapter production phase (blocks chapter generation only)
    { id: 'run_persistence', label: 'Persistance des runs (runs/run_outputs)', state: 'pending', phase: 'chapter_production' },
    { id: 'chapter_fulltext', label: 'Chapter full_text importé', state: fullText ? 'ok' : 'pending', phase: 'chapter_production' },
    { id: 'beats_persisted', label: 'Beats validés persistés', state: beatsOk ? 'ok' : 'pending', phase: 'chapter_production' },
    { id: 'pgvector', label: 'pgvector activé (retrieval sémantique)', state: 'pending', phase: 'chapter_production' },

    // Future / intentionally disabled
    { id: 'autonomous_rewrite', label: 'Réécriture autonome', state: 'pending', detail: 'désactivé intentionnellement', phase: 'future' },
    { id: 'pdf_docx_epub', label: 'Exports PDF / DOCX / EPUB', state: 'pending', detail: 'futur', phase: 'future' },
  ];

  const ptBlocked = checks.filter(c => c.phase === 'production_test' && (c.state === 'blocked' || c.state === 'manual')).length;
  const ptPending = checks.filter(c => c.phase === 'production_test' && c.state === 'pending').length;
  const chBlocked = checks.filter(c => c.phase === 'chapter_production' && c.state !== 'ok').length;

  const overall: 'ready' | 'partial' | 'blocked' = ptBlocked > 0 ? 'blocked' : ptPending > 3 ? 'partial' : 'ready';
  const overallStyle = overall === 'ready'
    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
    : overall === 'partial'
      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-700 border-rose-500/30';
  const overallLabel = overall === 'ready' ? 'Ready for Production Test'
    : overall === 'partial' ? 'Partially Ready' : 'Blocked';

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">Production Test Readiness</h3>
          <p className="text-[11px] text-muted-foreground">
            Checklist séparant : prêt pour tests réels · prêt pour production chapitre · futur.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className={`px-2 py-0.5 rounded-full border ${overallStyle}`}>{overallLabel}</span>
          <span className="px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-700 border-amber-500/30">
            chapitre : {chBlocked} blocage(s)
          </span>
        </div>
      </div>

      {(['production_test', 'chapter_production', 'future'] as const).map((phase) => {
        const title = phase === 'production_test' ? 'Bloque Production Test'
          : phase === 'chapter_production' ? 'Bloque production chapitre uniquement'
          : 'Futur / intentionnellement désactivé';
        return (
          <div key={phase} className="space-y-1">
            <p className="editorial-eyebrow">{title}</p>
            <ul className="divide-y divide-border">
              {checks.filter(c => c.phase === phase).map(c => (
                <li key={c.id} className="flex items-start gap-2 py-1.5 text-xs">
                  <span className="mt-0.5">
                    {c.state === 'ok' && <CheckCircle2 size={12} className="text-emerald-600" />}
                    {c.state === 'pending' && <AlertCircle size={12} className="text-amber-600" />}
                    {c.state === 'blocked' && <XCircle size={12} className="text-rose-600" />}
                    {c.state === 'manual' && <Wrench size={12} className="text-rose-600" />}
                    {c.state === 'unknown' && <AlertCircle size={12} className="text-muted-foreground" />}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground/90">{c.label}</p>
                    {c.detail && <p className="text-[10px] text-muted-foreground">{c.detail}</p>}
                  </div>
                  {c.state === 'manual' && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-rose-500/10 text-rose-700 border-rose-500/30">
                      manuel
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground italic">
        pgvector pending et réécriture autonome désactivée ne bloquent pas le Production Test.
      </p>
    </div>
  );
}
