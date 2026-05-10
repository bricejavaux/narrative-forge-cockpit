import { useState } from 'react';
import { Download, FileText, Users, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { importService, type ImportTarget, type ImportPreview } from '@/services/importService';
import { canonRules, characters } from '@/data/dummyData';

const TARGETS: { id: ImportTarget; label: string; path: string; icon: typeof FileText; kind: 'canon' | 'characters' }[] = [
  { id: 'articulation', label: 'articulation.txt → canon', path: '01_sources/articulation.txt', icon: FileText, kind: 'canon' },
  { id: 'personnages', label: 'personnages.txt → personnages', path: '01_sources/personnages.txt', icon: Users, kind: 'characters' },
];

function CanonDiff({ extracted }: { extracted: any }) {
  const existing = new Set(canonRules.map((r) => r.title.toLowerCase().trim()));
  const buckets: { key: string; label: string }[] = [
    { key: 'world_rules', label: 'Règles du monde' },
    { key: 'constraints', label: 'Contraintes' },
    { key: 'failure_modes', label: 'Modes de défaillance' },
    { key: 'technologies', label: 'Technologies' },
    { key: 'organizations', label: 'Organisations' },
    { key: 'locations', label: 'Lieux' },
    { key: 'glossary', label: 'Glossaire' },
  ];
  return (
    <div className="space-y-3">
      {buckets.map((b) => {
        const items = (extracted?.[b.key] ?? []) as any[];
        if (!items.length) return null;
        return (
          <div key={b.key} className="rounded-md border border-border/40 p-3">
            <p className="editorial-eyebrow mb-2">{b.label} · {items.length}</p>
            <ul className="space-y-1">
              {items.slice(0, 12).map((it, i) => {
                const title = it.title ?? it.term ?? `Item ${i + 1}`;
                const seen = existing.has(String(title).toLowerCase().trim());
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    {seen ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30">nouveau</span>
                    )}
                    <span className="font-mono text-foreground truncate">{title}</span>
                    {it.criticality && <span className="text-[10px] text-muted-foreground">· {it.criticality}</span>}
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

function CharacterDiff({ extracted }: { extracted: any }) {
  const existing = new Set(characters.map((c) => c.name.toLowerCase().trim()));
  const items = (extracted?.characters ?? []) as any[];
  if (!items.length) return <p className="text-xs text-muted-foreground italic">Aucun personnage extrait.</p>;
  return (
    <div className="rounded-md border border-border/40 p-3">
      <p className="editorial-eyebrow mb-2">Personnages extraits · {items.length}</p>
      <ul className="space-y-1">
        {items.map((c, i) => {
          const seen = existing.has(String(c.name ?? '').toLowerCase().trim());
          return (
            <li key={i} className="flex items-center gap-2 text-xs">
              {seen ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30">nouveau</span>
              )}
              <span className="font-mono text-foreground">{c.name}</span>
              {c.role && <span className="text-[10px] text-muted-foreground">· {c.role}</span>}
              {c.function && <span className="text-[10px] text-muted-foreground italic truncate">— {c.function}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type PersistResult = Awaited<ReturnType<typeof importService.persist>>;

export default function ImportReconcilePanel() {
  const [busy, setBusy] = useState<ImportTarget | null>(null);
  const [persisting, setPersisting] = useState<ImportTarget | null>(null);
  const [previews, setPreviews] = useState<Record<ImportTarget, ImportPreview | null>>({
    articulation: null,
    personnages: null,
  });
  const [errors, setErrors] = useState<Record<ImportTarget, string | null>>({
    articulation: null,
    personnages: null,
  });
  const [persisted, setPersisted] = useState<Record<ImportTarget, PersistResult | null>>({
    articulation: null,
    personnages: null,
  });

  const run = async (target: ImportTarget) => {
    setBusy(target);
    setErrors((e) => ({ ...e, [target]: null }));
    setPersisted((s) => ({ ...s, [target]: null }));
    try {
      const p = await importService.previewImport(target);
      setPreviews((s) => ({ ...s, [target]: p }));
    } catch (e) {
      setErrors((s) => ({ ...s, [target]: e instanceof Error ? e.message : 'erreur' }));
    } finally {
      setBusy(null);
    }
  };

  const persist = async (target: ImportTarget) => {
    const preview = previews[target];
    if (!preview?.extracted) return;
    const label = target === 'articulation' ? 'le canon' : 'les personnages';
    if (!window.confirm(`Persister ${label} dans Supabase ?\n\nLes objets seront marqués "needs_review = true" et "validation_status = pending".`)) return;
    setPersisting(target);
    setErrors((s) => ({ ...s, [target]: null }));
    try {
      const r = await importService.persist(target, preview.extracted);
      setPersisted((s) => ({ ...s, [target]: r }));
    } catch (e) {
      setErrors((s) => ({ ...s, [target]: e instanceof Error ? e.message : 'erreur' }));
    } finally {
      setPersisting(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="editorial-eyebrow">Import & Réconciliation</p>
          <h3 className="text-lg editorial-heading text-foreground">OneDrive → Lovable AI → Supabase</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Téléchargement réel, extraction structurée, puis persistance encadrée par validation humaine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TARGETS.map((t) => {
          const preview = previews[t.id];
          const err = errors[t.id];
          const Icon = t.icon;
          const isBusy = busy === t.id;
          const isPersisting = persisting === t.id;
          const result = persisted[t.id];
          return (
            <div key={t.id} className="rounded-md border border-border/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{t.label}</span>
                </div>
                <button
                  onClick={() => run(t.id)}
                  disabled={isBusy || isPersisting}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-border/60 hover:bg-secondary/40 disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : preview ? <RefreshCw className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                  {preview ? 'Relancer' : 'Lancer preview'}
                </button>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground">{t.path}</p>

              {err && (
                <div className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {err}
                </div>
              )}

              {preview && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full border ${
                        preview.mode === 'live'
                          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                          : preview.mode === 'degraded'
                          ? 'border-amber-500/40 text-amber-600 bg-amber-500/5'
                          : 'border-border text-muted-foreground bg-secondary/40'
                      }`}
                    >
                      {preview.mode}
                    </span>
                    {preview.source_size && <span className="text-muted-foreground">{preview.source_size.toLocaleString()} car.</span>}
                    {preview.model && <span className="text-muted-foreground">· {preview.model}</span>}
                  </div>

                  {preview.error && <p className="text-xs text-amber-700">{preview.error}</p>}

                  {preview.extracted &&
                    (t.kind === 'canon' ? (
                      <CanonDiff extracted={preview.extracted} />
                    ) : (
                      <CharacterDiff extracted={preview.extracted} />
                    ))}

                  {!preview.extracted && preview.raw_preview && (
                    <pre className="text-[10px] bg-secondary/30 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">{preview.raw_preview}</pre>
                  )}

                  {result ? (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="font-medium">Persisté dans Supabase</span>
                      </div>
                      <div className="font-mono text-foreground">
                        {result.inserted ?? 0} ajouts · {result.updated ?? 0} mises à jour · {result.skipped ?? 0} ignorés
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="text-amber-700">{result.errors.length} erreur(s)</div>
                      )}
                      {result.job_id && <div className="text-muted-foreground">job · {result.job_id.slice(0, 8)}</div>}
                      <p className="text-muted-foreground italic">Objets marqués needs_review = true.</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => persist(t.id)}
                      disabled={!preview.extracted || isPersisting || preview.mode !== 'live'}
                      className="text-[11px] flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-primary/40 bg-primary/5 hover:bg-primary/10 text-foreground disabled:opacity-50 w-full"
                    >
                      {isPersisting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Valider & persister dans Supabase
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        L'écriture nécessite une validation humaine explicite. Chaque persistance crée une entrée dans <span className="font-mono">import_jobs</span>,
        marque les objets <span className="font-mono">needs_review = true</span> et trace l'opération dans <span className="font-mono">logs</span>.
      </p>
    </div>
  );
}
