import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Users, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Circle, XCircle, MinusCircle } from 'lucide-react';
import { importService, type ImportTarget, type ImportPreview } from '@/services/importService';
import { supabaseService, type ActiveCanonObject, type ActiveCharacter } from '@/services/supabaseService';

const TARGETS: { id: ImportTarget; label: string; path: string; icon: typeof FileText; kind: 'canon' | 'characters' }[] = [
  { id: 'articulation', label: 'articulation.txt → canon', path: '01_sources/articulation.txt', icon: FileText, kind: 'canon' },
  { id: 'personnages', label: 'personnages.txt → personnages', path: '01_sources/personnages.txt', icon: Users, kind: 'characters' },
];

const CANON_KEYS = ['world_rules','constraints','failure_modes','technologies','organizations','locations','glossary','sources','chapters','arcs','revelations','payoffs'];

function countExtracted(target: ImportTarget, extracted: any): number {
  if (!extracted) return 0;
  if (target === 'personnages') return (extracted.characters ?? []).length;
  return CANON_KEYS.reduce((acc, k) => acc + ((extracted[k] ?? []).length || 0), 0);
}

type StepStatus = 'pending' | 'running' | 'ok' | 'failed' | 'skipped';
type Step = { id: string; label: string; status: StepStatus; error?: string; source?: string; cause?: string; next?: string };

const STEP_IDS = [
  { id: 'locate', label: 'OneDrive — fichier localisé' },
  { id: 'download', label: 'OneDrive — fichier téléchargé' },
  { id: 'extract_call', label: 'OpenAI — extraction appelée' },
  { id: 'extract_json', label: 'Extraction — JSON structuré retourné' },
  { id: 'extract_nonempty', label: 'Extraction — objets extraits > 0' },
  { id: 'human_validation', label: 'Validation humaine confirmée' },
  { id: 'persist_call', label: 'Supabase — persist appelé' },
  { id: 'persist_rows', label: 'Supabase — lignes insérées/mises à jour' },
  { id: 'refresh_event', label: 'Événement de refresh émis' },
  { id: 'records_visible', label: 'Page cible lit les records Supabase' },
] as const;

function freshSteps(): Step[] { return STEP_IDS.map(s => ({ id: s.id, label: s.label, status: 'pending' as StepStatus })); }

function StepRow({ s }: { s: Step }) {
  const Icon = s.status === 'ok' ? CheckCircle2 : s.status === 'failed' ? XCircle : s.status === 'running' ? Loader2 : s.status === 'skipped' ? MinusCircle : Circle;
  const color = s.status === 'ok' ? 'text-emerald-500' : s.status === 'failed' ? 'text-rose-500' : s.status === 'running' ? 'text-blue-500' : s.status === 'skipped' ? 'text-muted-foreground' : 'text-muted-foreground/50';
  return (
    <div className="text-[11px]">
      <div className="flex items-center gap-2">
        <Icon className={`w-3 h-3 ${color} ${s.status === 'running' ? 'animate-spin' : ''}`} />
        <span className={s.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}>{s.label}</span>
      </div>
      {s.status === 'failed' && (
        <div className="ml-5 mt-0.5 text-[10px] text-rose-600 leading-snug">
          {s.error && <div>· {s.error}</div>}
          {s.source && <div className="text-muted-foreground">source : <span className="font-mono">{s.source}</span></div>}
          {s.cause && <div className="text-muted-foreground">cause probable : {s.cause}</div>}
          {s.next && <div className="text-muted-foreground">action : {s.next}</div>}
        </div>
      )}
    </div>
  );
}

type ExistingState =
  | { kind: 'loading' }
  | { kind: 'error'; error: string }
  | { kind: 'ok'; titles: Set<string>; names: Set<string> };

function CanonDiff({ extracted, existing }: { extracted: any; existing: ExistingState }) {
  const buckets = [
    { key: 'world_rules', label: 'Règles du monde' },
    { key: 'constraints', label: 'Contraintes' },
    { key: 'failure_modes', label: 'Modes de défaillance' },
    { key: 'technologies', label: 'Technologies' },
    { key: 'organizations', label: 'Organisations' },
    { key: 'locations', label: 'Lieux' },
    { key: 'glossary', label: 'Glossaire' },
  ];
  if (existing.kind === 'error') {
    return <div className="text-[11px] text-rose-700 border border-rose-500/30 bg-rose-500/5 p-2 rounded">Diff indisponible : lecture Supabase bloquée — {existing.error}</div>;
  }
  const titles = existing.kind === 'ok' ? existing.titles : new Set<string>();
  return (
    <div className="space-y-3">
      {existing.kind === 'ok' && titles.size === 0 && (
        <p className="text-[11px] text-muted-foreground italic">Supabase vide — tous les objets seront marqués « nouveau ».</p>
      )}
      {buckets.map((b) => {
        const items = (extracted?.[b.key] ?? []) as any[];
        if (!items.length) return null;
        return (
          <div key={b.key} className="rounded-md border border-border/40 p-3">
            <p className="editorial-eyebrow mb-2">{b.label} · {items.length}</p>
            <ul className="space-y-1">
              {items.slice(0, 12).map((it, i) => {
                const title = it.title ?? it.term ?? `Item ${i + 1}`;
                const seen = titles.has(String(title).toLowerCase().trim());
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    {seen ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">existant</span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30">nouveau</span>}
                    <span className="font-mono text-foreground truncate">{title}</span>
                  </li>
                );
              })}
              {items.length > 12 && <li className="text-[11px] text-muted-foreground italic">+ {items.length - 12} autres…</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function CharacterDiff({ extracted, existing }: { extracted: any; existing: ExistingState }) {
  const items = (extracted?.characters ?? []) as any[];
  if (!items.length) return <p className="text-xs text-muted-foreground italic">Aucun personnage extrait.</p>;
  if (existing.kind === 'error') {
    return <div className="text-[11px] text-rose-700 border border-rose-500/30 bg-rose-500/5 p-2 rounded">Diff indisponible : lecture Supabase bloquée — {existing.error}</div>;
  }
  const names = existing.kind === 'ok' ? existing.names : new Set<string>();
  return (
    <div className="rounded-md border border-border/40 p-3">
      <p className="editorial-eyebrow mb-2">Personnages extraits · {items.length}</p>
      {existing.kind === 'ok' && names.size === 0 && (
        <p className="text-[11px] text-muted-foreground italic mb-1">Supabase vide — tous marqués « nouveau ».</p>
      )}
      <ul className="space-y-1">
        {items.map((c, i) => {
          const seen = names.has(String(c.name ?? '').toLowerCase().trim());
          return (
            <li key={i} className="flex items-center gap-2 text-xs">
              {seen ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">existant</span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30">nouveau</span>}
              <span className="font-mono text-foreground">{c.name}</span>
              {c.role && <span className="text-[10px] text-muted-foreground">· {c.role}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type PersistResult = Awaited<ReturnType<typeof importService.persist>>;
type PostVerif = { ok: boolean; count: number; error?: string; sample?: Array<{ title?: string; name?: string }> };

export default function ImportReconcilePanel() {
  const [busy, setBusy] = useState<ImportTarget | null>(null);
  const [persisting, setPersisting] = useState<ImportTarget | null>(null);
  const [previews, setPreviews] = useState<Record<ImportTarget, ImportPreview | null>>({ articulation: null, personnages: null });
  const [persisted, setPersisted] = useState<Record<ImportTarget, PersistResult | null>>({ articulation: null, personnages: null });
  const [steps, setSteps] = useState<Record<ImportTarget, Step[]>>({ articulation: freshSteps(), personnages: freshSteps() });
  const [postVerif, setPostVerif] = useState<Record<ImportTarget, PostVerif | null>>({ articulation: null, personnages: null });
  const [existing, setExisting] = useState<ExistingState>({ kind: 'loading' });

  const loadExisting = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabaseService.getCanonObjectsWithStatus(),
      supabaseService.getCharactersWithStatus(),
    ]);
    if (!c.ok) return setExisting({ kind: 'error', error: c.error || 'unknown' });
    if (!p.ok) return setExisting({ kind: 'error', error: p.error || 'unknown' });
    setExisting({
      kind: 'ok',
      titles: new Set(c.rows.map(r => String(r.title || '').toLowerCase().trim())),
      names: new Set(p.rows.map(r => String(r.name || '').toLowerCase().trim())),
    });
  }, []);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const setStep = (target: ImportTarget, id: string, patch: Partial<Step>) => {
    setSteps(prev => ({ ...prev, [target]: prev[target].map(s => s.id === id ? { ...s, ...patch } : s) }));
  };

  const run = async (target: ImportTarget) => {
    setBusy(target);
    setPersisted(s => ({ ...s, [target]: null }));
    setPostVerif(s => ({ ...s, [target]: null }));
    setSteps(s => ({ ...s, [target]: freshSteps() }));
    setPreviews(s => ({ ...s, [target]: null }));
    setStep(target, 'locate', { status: 'running' });
    setStep(target, 'download', { status: 'running' });
    setStep(target, 'extract_call', { status: 'running' });

    try {
      const p = await importService.previewImport(target);
      setPreviews(s => ({ ...s, [target]: p }));
      if (p.mode === 'live' || p.source_size) {
        setStep(target, 'locate', { status: 'ok' });
        setStep(target, 'download', { status: 'ok' });
      } else {
        setStep(target, 'locate', { status: 'failed', error: p.error || 'fichier non confirmé', source: 'edge: import-source / onedrive-download', cause: 'OneDrive non connecté ou chemin introuvable', next: 'Vérifier OneDrive et le chemin ' + (p.path || '01_sources/…') });
        setStep(target, 'download', { status: 'skipped' });
      }
      setStep(target, 'extract_call', { status: p.mode === 'live' || p.extracted ? 'ok' : 'failed', error: p.mode !== 'live' && !p.extracted ? (p.error || `mode=${p.mode}`) : undefined, source: 'edge: openai-extract-*', cause: 'OPENAI_API_KEY manquante ou edge function indisponible', next: 'Vérifier secret OPENAI_API_KEY et déploiement' });
      if (p.extracted) {
        setStep(target, 'extract_json', { status: 'ok' });
        const n = countExtracted(target, p.extracted);
        if (n > 0) setStep(target, 'extract_nonempty', { status: 'ok', label: `Extraction — ${n} objet(s) extraits` });
        else setStep(target, 'extract_nonempty', { status: 'failed', error: 'extraction vide', source: 'edge: openai-extract-*' });
      } else {
        setStep(target, 'extract_json', { status: 'failed', error: 'aucun JSON structuré', source: 'edge: openai-extract-*' });
        setStep(target, 'extract_nonempty', { status: 'skipped' });
      }
    } catch (e) {
      setStep(target, 'extract_call', { status: 'failed', error: e instanceof Error ? e.message : 'erreur', source: 'supabase.functions.invoke(import-source)' });
    } finally {
      setBusy(null);
    }
  };

  const persist = async (target: ImportTarget) => {
    const preview = previews[target];
    if (!preview?.extracted) return;
    const kind = target === 'articulation' ? 'canon' : 'characters';
    if (!window.confirm(`Persister ${kind === 'canon' ? 'le canon' : 'les personnages'} dans Supabase ?\n\nObjets marqués needs_review=true, validation_status=pending.`)) return;
    setStep(target, 'human_validation', { status: 'ok' });
    setStep(target, 'persist_call', { status: 'running' });
    setPersisting(target);
    try {
      const r = await importService.persist(target, preview.extracted);
      setPersisted(s => ({ ...s, [target]: r }));
      setStep(target, 'persist_call', { status: 'ok' });
      const ins = r.inserted ?? 0, upd = r.updated ?? 0;
      if (ins + upd > 0) {
        setStep(target, 'persist_rows', { status: 'ok', label: `Supabase — ${ins} insert · ${upd} update · ${r.skipped ?? 0} skipped` });
      } else {
        setStep(target, 'persist_rows', { status: 'failed', error: `inserted=${ins} updated=${upd} skipped=${r.skipped ?? 0}`, source: 'edge: import-persist', cause: 'Mapping vide, doublons ou RLS', next: 'Vérifier mapping et policies RLS' });
      }
      try {
        window.dispatchEvent(new CustomEvent(target === 'articulation' ? 'canon-imported' : 'characters-imported', { detail: r }));
        window.dispatchEvent(new CustomEvent('supabase-records-refresh', { detail: { target: kind } }));
        setStep(target, 'refresh_event', { status: 'ok' });
      } catch (e) {
        setStep(target, 'refresh_event', { status: 'failed', error: e instanceof Error ? e.message : 'dispatch error' });
      }
      // Frontend verification — diagnostic (no swallowed errors)
      const res = target === 'articulation'
        ? await supabaseService.getCanonObjectsWithStatus()
        : await supabaseService.getCharactersWithStatus();
      const sample = res.ok
        ? (target === 'articulation'
            ? (res.rows as ActiveCanonObject[]).slice(0, 5).map(r => ({ title: r.title }))
            : (res.rows as ActiveCharacter[]).slice(0, 5).map(r => ({ name: r.name })))
        : undefined;
      setPostVerif(s => ({ ...s, [target]: { ok: res.ok, count: res.count, error: res.error, sample } }));
      if (!res.ok) {
        setStep(target, 'records_visible', { status: 'failed', error: `Lecture frontend impossible : ${res.error}`, source: target === 'articulation' ? 'table canon_objects' : 'table characters', cause: 'RLS SELECT policy manquante ou erreur PostgREST', next: 'Vérifier policies SELECT pour anon/authenticated' });
      } else if (res.count > 0) {
        setStep(target, 'records_visible', { status: 'ok', label: `Page cible — ${res.count} record(s) lus depuis Supabase` });
      } else {
        const srv = r.service_role_visible_count ?? 0;
        setStep(target, 'records_visible', { status: 'failed', error: srv > 0 ? `Edge function voit ${srv} record(s), frontend voit 0` : '0 record écrit et 0 lisible', source: target === 'articulation' ? 'table canon_objects' : 'table characters', cause: srv > 0 ? 'Écriture confirmée par Edge Function, mais lecture frontend impossible — RLS SELECT manquante.' : 'Aucune ligne écrite', next: 'Vérifier policies RLS SELECT et logs de import-persist' });
      }
      loadExisting();
    } catch (e) {
      setStep(target, 'persist_call', { status: 'failed', error: e instanceof Error ? e.message : 'erreur', source: 'supabase.functions.invoke(import-persist)' });
    } finally {
      setPersisting(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div>
        <p className="editorial-eyebrow">Import & Réconciliation</p>
        <h3 className="text-lg editorial-heading text-foreground">OneDrive → OpenAI → Supabase</h3>
        <p className="text-xs text-muted-foreground mt-1">Diff comparé aux records Supabase actifs (anciennement dummyData). Validation humaine explicite requise.</p>
        {existing.kind === 'error' && (
          <div className="mt-2 text-[11px] text-rose-700 border border-rose-500/30 bg-rose-500/5 p-2 rounded">
            Lecture Supabase impossible : {existing.error}. Les diffs marqueront tout comme « nouveau ».
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TARGETS.map((t) => {
          const preview = previews[t.id];
          const Icon = t.icon;
          const isBusy = busy === t.id;
          const isPersisting = persisting === t.id;
          const result = persisted[t.id];
          const verif = postVerif[t.id];
          const extractedCount = preview?.extracted ? countExtracted(t.id, preview.extracted) : 0;
          let disabledReason: string | null = null;
          if (!preview) disabledReason = 'Lancer le preview d\'abord.';
          else if (!preview.extracted) disabledReason = 'Persistance désactivée : aucun JSON structuré.';
          else if (extractedCount === 0) disabledReason = 'Persistance désactivée : extraction vide.';
          else if (preview.mode !== 'live') disabledReason = `Persistance désactivée : preview.mode = ${preview.mode}. Attendu : live.`;

          return (
            <div key={t.id} className="rounded-md border border-border/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-mono">{t.label}</span></div>
                <button onClick={() => run(t.id)} disabled={isBusy || isPersisting} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-border/60 hover:bg-secondary/40 disabled:opacity-50">
                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : preview ? <RefreshCw className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                  {preview ? 'Relancer preview' : 'Lancer preview'}
                </button>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground">{t.path}</p>

              <div className="rounded-md border border-border/40 bg-secondary/20 p-2 space-y-1">
                <p className="editorial-eyebrow mb-1">Diagnostic étape par étape</p>
                {steps[t.id].map(s => <StepRow key={s.id} s={s} />)}
              </div>

              {preview && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className={`px-2 py-0.5 rounded-full border ${preview.mode === 'live' ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5' : preview.mode === 'degraded' ? 'border-amber-500/40 text-amber-600 bg-amber-500/5' : 'border-border text-muted-foreground bg-secondary/40'}`}>{preview.mode}</span>
                    {preview.source_size && <span className="text-muted-foreground">{preview.source_size.toLocaleString()} car.</span>}
                    {preview.model && <span className="text-muted-foreground">· {preview.model}</span>}
                    {preview.extracted && <span className="text-muted-foreground">· {extractedCount} objet(s)</span>}
                  </div>
                  {preview.error && <p className="text-xs text-amber-700">{preview.error}</p>}
                  {preview.extracted && (t.kind === 'canon' ? <CanonDiff extracted={preview.extracted} existing={existing} /> : <CharacterDiff extracted={preview.extracted} existing={existing} />)}
                  {!preview.extracted && preview.raw_preview && (
                    <pre className="text-[10px] bg-secondary/30 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">{preview.raw_preview}</pre>
                  )}

                  {result ? (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /><span className="font-medium">Persisté dans Supabase</span>
                      </div>
                      <div className="font-mono text-foreground">{result.inserted ?? 0} ajouts · {result.updated ?? 0} mises à jour · {result.skipped ?? 0} ignorés</div>
                      <div className="font-mono text-foreground/80">service_role visibles : {result.service_role_visible_count ?? '—'}</div>
                      {verif && (
                        <div className={`font-mono ${verif.ok && verif.count > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          frontend visibles : {verif.ok ? verif.count : `ERR — ${verif.error}`}
                        </div>
                      )}
                      {verif?.ok && verif.count === 0 && (result.service_role_visible_count ?? 0) > 0 && (
                        <div className="text-rose-700 leading-snug">
                          Écriture confirmée par Edge Function ({result.service_role_visible_count}), mais lecture frontend impossible.<br/>
                          Cause probable : RLS SELECT policy manquante.
                        </div>
                      )}
                      {verif?.sample && verif.sample.length > 0 && (
                        <div className="text-foreground/80">
                          Échantillon : {verif.sample.map(s => s.title || s.name).filter(Boolean).join(', ')}
                        </div>
                      )}
                      <Link to={t.kind === 'canon' ? '/canon' : '/characters'} onClick={() => { try { window.dispatchEvent(new CustomEvent('supabase-records-refresh', { detail: { target: t.kind } })); } catch {} }} className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded border border-primary/40 bg-primary/5 hover:bg-primary/10 text-foreground">
                        Voir dans {t.kind === 'canon' ? 'Canon' : 'Personnages'} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => persist(t.id)} disabled={!!disabledReason || isPersisting} className="text-[11px] flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-primary/40 bg-primary/5 hover:bg-primary/10 text-foreground disabled:opacity-50 w-full">
                        {isPersisting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Valider & persister dans Supabase
                      </button>
                      {disabledReason && (
                        <div className="text-[10px] text-amber-700 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /><span>{disabledReason}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Traçabilité : <span className="font-mono">import_jobs</span>, <span className="font-mono">logs</span>, objets <span className="font-mono">needs_review = true</span>.
      </p>
    </div>
  );
}
