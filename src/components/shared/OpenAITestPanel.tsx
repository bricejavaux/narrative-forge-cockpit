import { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type FnKey = 'openai-summarize-source' | 'openai-extract-canon' | 'openai-generate-diagnostic' | 'openai-structure-note';

const TESTS: Array<{ key: FnKey; label: string; body: Record<string, unknown> }> = [
  {
    key: 'openai-summarize-source',
    label: 'Résumé (summarize-source)',
    body: { text: 'Brice Javaux, ingénieur veille L4, observe à 04:17 une signature ΔS non bruitée et choisit le silence. Lagrange-4 commande, Walvis Bay exécute.' },
  },
  {
    key: 'openai-extract-canon',
    label: 'Extraction canon (JSON)',
    body: { text: 'Règle : la Trace n’est jamais anthropomorphisée. Contrainte : chaque ouverture a un coût mesurable. Lieu : Lagrange-4. Lieu : Walvis Bay.' },
  },
  {
    key: 'openai-generate-diagnostic',
    label: 'Diagnostic global',
    body: { scope: 'global' },
  },
  {
    key: 'openai-structure-note',
    label: 'Structurer une note',
    body: { text: 'Vérifier alignement canon ch.4 sur la Trace. Penser à la phrase-couteau.' },
  },
];

type Result = {
  fn: FnKey;
  ok: boolean;
  ms: number;
  mode?: string;
  provider?: string;
  model?: string;
  reason?: string;
  error?: string;
  raw: unknown;
};

const MODEL_OPTIONS = [
  { value: '', label: 'Défaut Edge Function (OPENAI_MODEL)' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'o4-mini', label: 'o4-mini' },
  { value: '__custom__', label: 'Personnalisé…' },
];

export default function OpenAITestPanel() {
  const [running, setRunning] = useState<FnKey | null>(null);
  const [results, setResults] = useState<Record<FnKey, Result | undefined>>({} as any);
  const [modelChoice, setModelChoice] = useState<string>(() => localStorage.getItem('openai_test_model') ?? '');
  const [customModel, setCustomModel] = useState<string>(() => localStorage.getItem('openai_test_model_custom') ?? '');

  const effectiveModel = (modelChoice === '__custom__' ? customModel : modelChoice).trim();

  const handleModelChange = (v: string) => {
    setModelChoice(v);
    localStorage.setItem('openai_test_model', v);
  };
  const handleCustomChange = (v: string) => {
    setCustomModel(v);
    localStorage.setItem('openai_test_model_custom', v);
  };

  const run = async (t: typeof TESTS[number]) => {
    setRunning(t.key);
    const t0 = performance.now();
    try {
      const body = { ...t.body, ...(effectiveModel ? { model: effectiveModel } : {}) };
      const { data, error } = await supabase.functions.invoke(t.key, { body });
      const ms = Math.round(performance.now() - t0);
      const d = (data ?? {}) as any;
      const res: Result = {
        fn: t.key,
        ok: !error,
        ms,
        mode: d.mode,
        provider: d.provider,
        model: d.model,
        reason: d.reason,
        error: error?.message ?? d.error,
        raw: data ?? error,
      };
      setResults((prev) => ({ ...prev, [t.key]: res }));
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      setResults((prev) => ({
        ...prev,
        [t.key]: { fn: t.key, ok: false, ms, error: e instanceof Error ? e.message : 'unknown', raw: null },
      }));
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    for (const t of TESTS) await run(t);
  };

  const badgeFor = (r?: Result) => {
    if (!r) return null;
    const live = r.mode === 'live';
    const cls = live
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      : r.mode === 'mock'
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-600 border-rose-500/30';
    return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>{r.mode ?? 'error'}</span>;
  };

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-eyebrow">Test runtime</p>
          <h3 className="text-base editorial-heading text-foreground">Appel OpenAI depuis les Edge Functions</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Vérifie que le provider runtime est bien OpenAI. Mode <code>live</code> = clé détectée et appel réussi.
            Mode <code>mock</code> = secret manquant ou input absent.
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={!!running}
          className="text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 flex items-center gap-1.5"
        >
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Tout tester
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <span className="text-[11px] font-medium text-muted-foreground">Modèle OpenAI</span>
        <select
          value={modelChoice}
          onChange={(e) => handleModelChange(e.target.value)}
          className="text-xs bg-card border border-border rounded px-2 py-1 font-mono"
        >
          {MODEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {modelChoice === '__custom__' && (
          <input
            value={customModel}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="ex: gpt-4.1-nano"
            className="text-xs bg-card border border-border rounded px-2 py-1 font-mono w-44"
          />
        )}
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          envoyé : <code>{effectiveModel || '(défaut Edge Function)'}</code>
        </span>
      </div>

      <div className="divide-y divide-border/40">
        {TESTS.map((t) => {
          const r = results[t.key];
          const isRunning = running === t.key;
          return (
            <div key={t.key} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{t.label}</span>
                  {badgeFor(r)}
                  {r && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {r.ms} ms{r.model ? ` · ${r.model}` : ''}{r.provider ? ` · ${r.provider}` : ''}
                    </span>
                  )}
                </div>
                {r?.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{r.reason}</p>}
                {r?.error && (
                  <p className="text-[11px] text-rose-600 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {r.error}
                  </p>
                )}
                {r?.ok && r.mode === 'live' && (
                  <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Réponse OpenAI reçue.
                  </p>
                )}
                {r && (
                  <details className="mt-1">
                    <summary className="text-[10px] text-muted-foreground cursor-pointer">payload</summary>
                    <pre className="text-[10px] font-mono bg-muted/40 p-2 rounded mt-1 overflow-auto max-h-48">
                      {JSON.stringify(r.raw, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <button
                onClick={() => run(t)}
                disabled={!!running}
                className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Tester
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
