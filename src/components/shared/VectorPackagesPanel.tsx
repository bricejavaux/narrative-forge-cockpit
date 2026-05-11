import { useEffect, useState } from 'react';
import { Database, FileText, Loader2, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, ShieldAlert, Archive, ExternalLink } from 'lucide-react';
import { indexingService, type VectorPackageRead, type VectorPackageRow } from '@/services/indexingService';
import type { VectorCorpus } from '@/lib/runtimeMode';

const CORPUS_LABELS: Record<VectorCorpus, string> = {
  follett: 'follett',
  sf_portals_fiction: 'sf_portals_fiction',
  science_portals: 'science_portals',
};

function ModeBadge({ mode }: { mode?: string }) {
  const m = mode ?? 'unknown';
  const cls =
    m === 'live'
      ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
      : m === 'degraded'
      ? 'border-amber-500/40 text-amber-600 bg-amber-500/5'
      : 'border-border text-muted-foreground bg-secondary/40';
  return <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cls}`}>{m}</span>;
}

export default function VectorPackagesPanel({ compact = false }: { compact?: boolean }) {
  const [packages, setPackages] = useState<VectorPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCorpus, setOpenCorpus] = useState<VectorCorpus | null>(null);
  const [reading, setReading] = useState<VectorCorpus | null>(null);
  const [reads, setReads] = useState<Partial<Record<VectorCorpus, VectorPackageRead>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await indexingService.listVectorPackages();
        setPackages(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (corpus: VectorCorpus) => {
    const isOpen = openCorpus === corpus;
    setOpenCorpus(isOpen ? null : corpus);
    if (!isOpen && !reads[corpus]) {
      setReading(corpus);
      setError(null);
      try {
        const data = await indexingService.readVectorPackage(corpus, 5);
        setReads((s) => ({ ...s, [corpus]: data }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'erreur');
      } finally {
        setReading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="cockpit-card flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" /> Chargement des paquets vectoriels…
      </div>
    );
  }

  if (!packages.length) {
    return (
      <div className="cockpit-card text-xs text-muted-foreground">
        Aucun paquet enregistré. Lance la migration pour seed follett / sf_portals_fiction / science_portals.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => {
        const corpus = pkg.corpus_name as VectorCorpus;
        const isOpen = openCorpus === corpus;
        const r = reads[corpus];
        return (
          <div key={pkg.id} className="cockpit-card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => toggle(corpus)} className="flex items-start gap-2 text-left flex-1">
                {isOpen ? <ChevronDown size={14} className="mt-0.5 text-muted-foreground" /> : <ChevronRight size={14} className="mt-0.5 text-muted-foreground" />}
                <Archive size={14} className="mt-0.5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">{CORPUS_LABELS[corpus] ?? pkg.corpus_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{pkg.target_index}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{pkg.onedrive_path}</p>
                </div>
              </button>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber/40 text-amber bg-amber/5">
                  pgvector : {pkg.ingestion_status}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {pkg.embeddings_created ? 'embeddings ok' : 'embeddings non créés'}
                </span>
              </div>
            </div>

            {!compact && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <Stat label="usage" value={pkg.usage ?? '—'} />
                <Stat label="rights" value={pkg.rights ?? '—'} />
                <Stat label="chunks produits" value={pkg.produced_chunk_count?.toLocaleString() ?? '—'} />
                <Stat label="dernière génération" value={pkg.last_generated ? new Date(pkg.last_generated).toLocaleDateString() : '—'} />
              </div>
            )}

            {pkg.rights === 'private' && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber bg-amber/5 border border-amber/20 rounded px-2 py-1.5">
                <ShieldAlert size={11} className="mt-0.5 shrink-0" />
                {pkg.usage}
              </div>
            )}

            {isOpen && (
              <div className="space-y-3 pt-2 border-t border-border">
                {reading === corpus && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" /> Lecture manifest + inventaire + échantillon de chunks…
                  </div>
                )}
                {error && <div className="text-xs text-amber">Erreur : {error}</div>}
                {r && (
                  <>
                    <div className="flex items-center gap-2 text-[11px]">
                      <ModeBadge mode={r.mode} />
                      <span className="text-muted-foreground">manifest · inventory · chunks</span>
                    </div>
                    {r.message && <p className="text-[11px] text-muted-foreground italic">{r.message}</p>}

                    <Section title="Manifest" icon={<FileText size={11} />}>
                      {r.manifest_error ? (
                        <p className="text-[11px] text-amber flex items-center gap-1"><AlertTriangle size={10} /> {r.manifest_error}</p>
                      ) : r.manifest ? (
                        <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(r.manifest, null, 2).slice(0, 1200)}</pre>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">Aucun manifeste disponible.</p>
                      )}
                    </Section>

                    <Section title={`Inventaire des sources · ${r.inventory.total} entrées`} icon={<Database size={11} />}>
                      {r.inventory.error ? (
                        <p className="text-[11px] text-amber">{r.inventory.error}</p>
                      ) : r.inventory.rows.length ? (
                        <div className="overflow-x-auto">
                          <table className="text-[10px] font-mono w-full">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border">
                                {r.inventory.columns.slice(0, 6).map((c) => (
                                  <th key={c} className="text-left py-1 pr-3">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {r.inventory.rows.slice(0, 8).map((row, i) => (
                                <tr key={i} className="border-b border-border/40">
                                  {row.slice(0, 6).map((cell, j) => (
                                    <td key={j} className="py-1 pr-3 text-foreground truncate max-w-[180px]">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">Inventaire vide.</p>
                      )}
                    </Section>

                    <Section title={`Échantillon de chunks · ${r.chunks.total} total`} icon={<FileText size={11} />}>
                      {r.chunks.error ? (
                        <p className="text-[11px] text-amber">{r.chunks.error}</p>
                      ) : r.chunks.sample.length ? (
                        <div className="space-y-2">
                          {r.chunks.sample.map((c: any, i: number) => (
                            <div key={i} className="rounded border border-border/40 p-2 text-[10px] space-y-1">
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-muted-foreground">
                                {c.chunk_id && <span>id: {String(c.chunk_id).slice(0, 24)}</span>}
                                {c.source_file && <span>src: {String(c.source_file).slice(-32)}</span>}
                                {c.target_index && <span>idx: {c.target_index}</span>}
                                {c.usage && <span>use: {c.usage}</span>}
                                {c.rights && <span>rights: {c.rights}</span>}
                              </div>
                              <p className="text-foreground leading-snug line-clamp-3">{typeof c.text === 'string' ? c.text.slice(0, 260) : '—'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">Aucun échantillon (fichier introuvable ou OneDrive non autorisé).</p>
                      )}
                    </Section>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => toggle(corpus)}
                        className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw size={10} /> Recharger
                      </button>
                      <button
                        disabled
                        className="text-[11px] flex items-center gap-1 px-2 py-1 rounded border border-dashed border-border text-muted-foreground/60 cursor-not-allowed"
                        title="Disponible quand pgvector est activé"
                      >
                        <ExternalLink size={10} /> Préparer ingestion pgvector
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-secondary/30 p-2">
      <p className="editorial-eyebrow mb-0.5">{label}</p>
      <p className="text-foreground font-mono truncate">{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="editorial-eyebrow flex items-center gap-1.5 mb-1.5">{icon}{title}</p>
      {children}
    </div>
  );
}
