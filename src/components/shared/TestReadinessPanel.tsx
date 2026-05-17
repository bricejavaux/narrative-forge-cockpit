import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

type CheckState = 'ok' | 'pending' | 'blocked' | 'unknown';

type ReadinessCheck = {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
  blocksTesting?: boolean;
};

export default function TestReadinessPanel() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [counts, setCounts] = useState<{ canon: number; chars: number; chapters: number; beats: number } | null>(null);

  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    (async () => {
      const [c1, c2, c3, c4] = await Promise.all([
        supabase.from('canon_objects').select('id', { count: 'exact', head: true }),
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('beats').select('id', { count: 'exact', head: true }),
      ]);
      setCounts({
        canon: c1.count ?? 0, chars: c2.count ?? 0,
        chapters: c3.count ?? 0, beats: c4.count ?? 0,
      });
    })();
  }, []);

  const openai = !!readiness?.openai?.api_key_configured;
  const onedrive = !!readiness?.onedrive?.oauth_configured;
  const supaOk = !!readiness?.supabase?.tables_created;
  const audioLive = readiness?.openai?.transcription_pipeline_status === 'transcription_live';

  const checks: ReadinessCheck[] = [
    { id: 'onedrive', label: 'OneDrive — fichiers sources visibles', state: onedrive ? 'ok' : 'blocked', blocksTesting: !onedrive },
    { id: 'openai', label: 'OpenAI runtime — clé détectée', state: openai ? 'ok' : 'blocked', blocksTesting: !openai },
    { id: 'supabase', label: 'Supabase — tables actives', state: supaOk ? 'ok' : 'blocked', blocksTesting: !supaOk },
    { id: 'structure_note', label: 'Structuration note texte (OpenAI)', state: openai ? 'ok' : 'pending' },
    { id: 'export_txt', label: 'Export txt / md / json', state: 'ok' },
    { id: 'vector_packages', label: 'Vector packages visibles (metadata)', state: 'ok' },
    {
      id: 'canon_active',
      label: 'Canon actif ou fallback explicite',
      state: counts === null ? 'unknown' : counts.canon > 0 ? 'ok' : 'pending',
      detail: counts && counts.canon === 0 ? 'aucun canon_object — fallback mock affiché explicitement' : undefined,
    },
    {
      id: 'characters_active',
      label: 'Personnages actifs ou fallback explicite',
      state: counts === null ? 'unknown' : counts.chars > 0 ? 'ok' : 'pending',
      detail: counts && counts.chars === 0 ? 'aucun character — fallback mock affiché explicitement' : undefined,
    },
    { id: 'audio_text_note', label: 'Note texte audio (sans Whisper)', state: openai ? 'ok' : 'pending' },
    { id: 'audio_voice', label: 'Pipeline voix complet', state: audioLive ? 'ok' : 'pending' },
    { id: 'production_flow', label: 'Production flow visible', state: 'ok' },
  ];

  const blocking = checks.filter(c => c.blocksTesting && c.state !== 'ok').length;
  const pending = checks.filter(c => c.state === 'pending').length;

  const overall: 'ready' | 'partial' | 'blocked' = blocking > 0 ? 'blocked' : pending > 3 ? 'partial' : 'ready';
  const overallStyle = overall === 'ready'
    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
    : overall === 'partial'
      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-700 border-rose-500/30';
  const overallLabel = overall === 'ready' ? 'Prêt pour tests safe'
    : overall === 'partial' ? 'Partiellement prêt' : 'Bloqué';

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">Prêt pour premiers tests ?</h3>
          <p className="text-[11px] text-muted-foreground">
            Checklist combinant readiness des connecteurs et présence de données en base.
          </p>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${overallStyle}`}>{overallLabel}</span>
      </div>
      <ul className="divide-y divide-border">
        {checks.map(c => (
          <li key={c.id} className="flex items-start gap-2 py-1.5 text-xs">
            <span className="mt-0.5">
              {c.state === 'ok' && <CheckCircle2 size={12} className="text-emerald-600" />}
              {c.state === 'pending' && <AlertCircle size={12} className="text-amber-600" />}
              {c.state === 'blocked' && <XCircle size={12} className="text-rose-600" />}
              {c.state === 'unknown' && <AlertCircle size={12} className="text-muted-foreground" />}
            </span>
            <div className="flex-1">
              <p className="text-foreground/90">{c.label}</p>
              {c.detail && <p className="text-[10px] text-muted-foreground">{c.detail}</p>}
            </div>
            {c.blocksTesting && c.state !== 'ok' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-rose-500/10 text-rose-700 border-rose-500/30">
                bloque
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
