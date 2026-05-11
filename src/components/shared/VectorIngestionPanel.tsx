import { useEffect, useState } from 'react';
import { Loader2, FlaskConical, Database as DbIcon, AlertTriangle, Search, Check } from 'lucide-react';
import { indexingService, type VectorPackageRow } from '@/services/indexingService';
import { vectorIngestionService, type VectorIndexRow } from '@/services/vectorIngestionService';

const CAUTION_CORPORA = new Set(['follett', 'sf_portals_fiction']);
const RECOMMENDED_FIRST = 'science_portals';

const CORPUS_TO_INDEX: Record<string, string> = {
  science_portals: 'science_index',
  follett: 'style_index',
  sf_portals_fiction: 'fiction_reference_index',
  world: 'world_index',
  characters: 'character_index',
  drafts: 'draft_index',
};

export default function VectorIngestionPanel() {
  const [packages, setPackages] = useState<VectorPackageRow[]>([]);
  const [indexes, setIndexes] = useState<VectorIndexRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [searchTarget, setSearchTarget] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setPackages(await indexingService.listVectorPackages());
    setIndexes(await vectorIngestionService.listIndexes());
  };
  useEffect(() => { load(); }, []);

  const runIngest = async (corpus: string, mode: 'metadata_only' | 'embed_and_store', limit?: number) => {
    setBusy(`${corpus}:${mode}`); setErr(null); setResult(null);
    try {
      const target_index = CORPUS_TO_INDEX[corpus] ?? `${corpus}_index`;
      const data = await vectorIngestionService.ingestPackage({ corpus_name: corpus, target_index, mode, limit });
      setResult({ corpus, mode, data });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  };

  const runSearch = async () => {
    if (!searchQuery.trim() || !searchTarget) return;
    setBusy('search'); setErr(null); setResult(null);
    try {
      const data = await vectorIngestionService.search({ query: searchQuery, index_names: [searchTarget], top_k: 5 });
      setResult({ kind: 'search', data });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  };

  const indexByName = (n: string) => indexes.find((i) => i.name === n);

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="editorial-heading text-foreground text-lg">Ingestion vectorielle (pgvector)</h3>
          <p className="text-xs text-muted-foreground">
            Préparé. Aucune ingestion automatique. Recommandé en premier : <span className="font-mono text-foreground">{RECOMMENDED_FIRST}</span>.
          </p>
        </div>
        <button onClick={load} className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground">Rafraîchir</button>
      </div>

      <div className="overflow-x-auto -mx-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Corpus</th>
              <th className="px-3 py-2">Index cible</th>
              <th className="px-3 py-2">Chunks dans paquet</th>
              <th className="px-3 py-2">pgvector</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => {
              const targetIdx = CORPUS_TO_INDEX[p.corpus_name] ?? `${p.corpus_name}_index`;
              const idx = indexByName(targetIdx);
              const isCaution = CAUTION_CORPORA.has(p.corpus_name);
              const isRecommended = p.corpus_name === RECOMMENDED_FIRST;
              return (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-foreground">{p.corpus_name}</span>
                      {isRecommended && <span className="text-[9px] font-mono px-1 rounded border border-emerald/40 bg-emerald/10 text-emerald">recommandé</span>}
                      {isCaution && <span className="text-[9px] font-mono px-1 rounded border border-amber/40 bg-amber/10 text-amber" title="Référence privée — pas d'imitation directe.">privé</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-foreground/80">{targetIdx}</td>
                  <td className="px-3 py-2 font-mono">{p.produced_chunk_count ?? 0}</td>
                  <td className="px-3 py-2">
                    {idx ? (
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                        idx.status === 'active' ? 'border-emerald/40 bg-emerald/10 text-emerald' :
                        idx.status === 'metadata_only' ? 'border-violet/40 bg-violet/10 text-violet' :
                        'border-amber/40 bg-amber/10 text-amber'
                      }`}>
                        {idx.status} · {idx.chunk_count} chunks
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        disabled={!!busy}
                        onClick={() => runIngest(p.corpus_name, 'metadata_only')}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:border-primary/40 disabled:opacity-30"
                        title="Insère vector_documents + vector_chunks sans embeddings"
                      >
                        {busy === `${p.corpus_name}:metadata_only` && <Loader2 size={9} className="animate-spin" />}
                        <DbIcon size={10} /> Métadonnées
                      </button>
                      <button
                        disabled={!!busy}
                        onClick={() => runIngest(p.corpus_name, 'embed_and_store', 8)}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:border-primary/40 disabled:opacity-30"
                        title="Embeddings OpenAI sur un échantillon de 8 chunks"
                      >
                        {busy === `${p.corpus_name}:embed_and_store` && <Loader2 size={9} className="animate-spin" />}
                        <FlaskConical size={10} /> Échantillon
                      </button>
                      <button
                        disabled={!!busy || isCaution}
                        onClick={() => runIngest(p.corpus_name, 'embed_and_store')}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-30"
                        title={isCaution ? 'Caution: privé — validation requise' : 'Embeddings complets'}
                      >
                        <Check size={10} /> Corpus complet
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {packages.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Aucun paquet — lancer la synchro vector packages d'abord.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
        <div className="flex-1 min-w-[200px]">
          <p className="editorial-eyebrow mb-1">Test de recherche</p>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Requête à embedder…"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
        <select
          value={searchTarget}
          onChange={(e) => setSearchTarget(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="">Index cible…</option>
          {indexes.map((i) => <option key={i.name} value={i.name}>{i.name} ({i.status})</option>)}
        </select>
        <button
          disabled={!searchQuery.trim() || !searchTarget || !!busy}
          onClick={runSearch}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-30"
        >
          {busy === 'search' && <Loader2 size={10} className="animate-spin" />}
          <Search size={11} /> Rechercher
        </button>
      </div>

      {err && (
        <div className="text-[11px] text-rose flex items-center gap-1"><AlertTriangle size={11} /> {err}</div>
      )}
      {result && (
        <details className="text-[11px]" open>
          <summary className="text-muted-foreground cursor-pointer">Résultat</summary>
          <pre className="text-[10px] font-mono bg-muted/40 p-2 rounded mt-1 overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
