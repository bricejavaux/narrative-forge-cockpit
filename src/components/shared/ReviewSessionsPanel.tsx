import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

type SessionRow = {
  id: string;
  project_id: string | null;
  scope: string | null;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
};

const SCOPES = [
  'chapter_v1', 'chapter_v2', 'chapter_after_rewrite',
  'beats', 'canon', 'character', 'diagnostic', 'meta_tome', 'run',
];

export default function ReviewSessionsPanel() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<string>(SCOPES[0]);
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.from('review_sessions')
      .select('*').order('created_at', { ascending: false }).limit(100);
    if (error) setErr(error.message);
    else setRows((data ?? []) as SessionRow[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.from('review_sessions').insert({
        scope,
        status: 'open',
        metadata: {
          target_type: targetType || null,
          target_id: targetId || null,
          note: note || null,
          created_via: 'audio_page',
        },
      });
      if (error) throw error;
      setNote(''); setTargetId(''); setTargetType('');
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('review_sessions')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) setErr(error.message);
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="cockpit-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">Nouvelle session de relecture</h3>
            <p className="text-[11px] text-muted-foreground">Persistée dans <code>review_sessions</code>. Validation humaine — pas d'effet automatique sur les autres tables.</p>
          </div>
          <button onClick={reload} className="text-[11px] px-2 py-1 rounded border border-border inline-flex items-center gap-1">
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Rafraîchir
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="px-2 py-1 rounded border border-border bg-background font-mono">
            {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="target_type (ex: chapter)"
            className="px-2 py-1 rounded border border-border bg-background font-mono" />
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="target_id (uuid optionnel)"
            className="px-2 py-1 rounded border border-border bg-background font-mono" />
          <button onClick={create} disabled={busy}
            className="px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary inline-flex items-center justify-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Créer session
          </button>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note d'ouverture (optionnel)"
          className="w-full px-2 py-1 text-xs rounded border border-border bg-background" />
        {err && <p className="text-[11px] text-rose-700">{err}</p>}
      </div>

      <div className="cockpit-card overflow-x-auto">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="editorial-eyebrow">Sessions persistées ({rows.length})</h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Aucune session pour l'instant.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3">Scope</th>
                <th className="text-left py-2 px-3">Cible</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Créée</th>
                <th className="text-left py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = (r.metadata ?? {}) as any;
                return (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono">{r.scope ?? '—'}</td>
                    <td className="py-2 px-3 font-mono text-[10px]">{m.target_type ?? '—'} {m.target_id ? `· ${String(m.target_id).slice(0, 8)}…` : ''}</td>
                    <td className="py-2 px-3 font-mono">{r.status}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      {r.status === 'open' && (
                        <>
                          <button onClick={() => setStatus(r.id, 'closed')} className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-700 mr-1">Clôturer</button>
                          <button onClick={() => setStatus(r.id, 'cancelled')} className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-700">Annuler</button>
                        </>
                      )}
                      {r.status !== 'open' && (
                        <button onClick={() => setStatus(r.id, 'open')} className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">Réouvrir</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-[10px] text-muted-foreground italic px-3 py-2">
          Écriture nécessite une session authentifiée (RLS). En mode preview anonyme la création échoue avec un message clair.
        </p>
      </div>
    </div>
  );
}
